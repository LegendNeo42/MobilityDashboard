<script lang="ts">
  import embed from "vega-embed";
  import { changeset } from "vega";
  import { untrack } from "svelte";

  let {
    spec,
    dataName = "table",
    dataValues = [],
    signals = null,
  } = $props<{
    spec: any;
    dataName?: string;
    dataValues?: any[];
    signals?: Record<string, any> | null;
  }>();

  let element: HTMLDivElement | null = null;
  let view: any = null;

  let lastDataFingerprint = "";
  let lastSignalsFingerprint = "";

  const fingerprint = (value: unknown) => JSON.stringify(value ?? {});

  function applySignals(currentView: any, signalValues: Record<string, any> | null) {
    if (!signalValues) return;

    for (const [key, value] of Object.entries(signalValues)) {
      currentView.signal(key, value);
    }
  }

  async function setData(currentView: any, name: string, values: any[]) {
    const nextFingerprint = fingerprint(values ?? []);
    if (nextFingerprint === lastDataFingerprint) return;

    lastDataFingerprint = nextFingerprint;

    const datasetChanges = changeset()
      .remove(() => true)
      .insert(values ?? []);

    await currentView.change(name, datasetChanges).runAsync();
  }

  // Recreate the view only when the spec shell changes.
  $effect(() => {
    if (!element || !spec) return;

    let cancelled = false;

    (async () => {
      lastDataFingerprint = "";
      lastSignalsFingerprint = "";

      if (view) {
        try {
          view.finalize();
        } catch {
          // Ignore cleanup errors from disposed views.
        }
        view = null;
      }

      const initialValues = untrack(() => dataValues ?? []);
      const initialSignals = untrack(() => signals);

      const initialSpec = {
        ...spec,
        datasets: {
          ...(spec.datasets ?? {}),
          [dataName]: initialValues,
        },
      };

      const result = await embed(element, initialSpec, { actions: false });
      if (cancelled) return;

      view = result.view;

      applySignals(view, initialSignals);
      await view.runAsync();

      lastDataFingerprint = fingerprint(initialValues);
      lastSignalsFingerprint = fingerprint(initialSignals ?? {});
    })();

    return () => {
      cancelled = true;

      if (view) {
        try {
          view.finalize();
        } catch {
          // Ignore cleanup errors from disposed views.
        }
        view = null;
      }
    };
  });

  $effect(() => {
    const currentView = view;
    const name = dataName;
    const values = dataValues ?? [];

    if (!currentView) return;

    (async () => {
      try {
        await setData(currentView, name, values);
      } catch (error) {
        console.error(error);
      }
    })();
  });

  $effect(() => {
    const currentView = view;
    const signalValues = signals ?? null;

    const nextFingerprint = fingerprint(signalValues ?? {});
    if (nextFingerprint === lastSignalsFingerprint) return;

    lastSignalsFingerprint = nextFingerprint;

    if (!currentView) return;

    (async () => {
      try {
        applySignals(currentView, signalValues);
        await currentView.runAsync();
      } catch (error) {
        console.error(error);
      }
    })();
  });
</script>

<div bind:this={element} class="chartHost"></div>