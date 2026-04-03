<script lang="ts">
  import embed from "vega-embed";
  import { changeset } from "vega";
  import { untrack } from "svelte";

  type SignalChangeHandler = (name: string, value: unknown) => void;

  let {
    spec,
    dataName = "table",
    dataValues = [],
    signals = null,
    watchedSignals = [],
    onSignalChange = null,
  } = $props<{
    spec: any;
    dataName?: string;
    dataValues?: any[];
    signals?: Record<string, any> | null;
    watchedSignals?: string[];
    onSignalChange?: SignalChangeHandler | null;
  }>();

  let element: HTMLDivElement | null = null;
  let view: any = null;
  let registeredSignalListeners: Array<{
    name: string;
    handler: (name: string, value: unknown) => void;
  }> = [];
  let watchedSignalValues: Record<string, unknown> = {};

  let lastDataFingerprint = "";
  let lastSignalsFingerprint = "";

  const fingerprint = (value: unknown) => JSON.stringify(value ?? {});

  function applySignals(currentView: any, signalValues: Record<string, any> | null) {
    if (!signalValues) return;

    for (const [key, value] of Object.entries(signalValues)) {
      currentView.signal(key, value);
    }
  }

  function applyWatchedSignalValues(currentView: any, signalNames: string[]) {
    for (const signalName of signalNames) {
      if (!(signalName in watchedSignalValues)) continue;
      currentView.signal(signalName, watchedSignalValues[signalName]);
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

  function clearSignalListeners(currentView: any) {
    for (const listener of registeredSignalListeners) {
      currentView.removeSignalListener(listener.name, listener.handler);
    }

    registeredSignalListeners = [];
  }

  function registerSignalListeners(
    currentView: any,
    signalNames: string[],
    callback: SignalChangeHandler | null,
  ) {
    clearSignalListeners(currentView);

    if (!callback) return;

    for (const signalName of signalNames) {
      const handler = (_: string, value: unknown) => {
        watchedSignalValues[signalName] = value;
        callback(signalName, value);
      };

      currentView.addSignalListener(signalName, handler);
      registeredSignalListeners.push({ name: signalName, handler });

      const currentValue = currentView.signal(signalName);
      watchedSignalValues[signalName] = currentValue;
      callback(signalName, currentValue);
    }
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
          clearSignalListeners(view);
          view.finalize();
        } catch {
          // Ignore cleanup errors from disposed views.
        }
        view = null;
      }

      const initialValues = untrack(() => dataValues ?? []);
      const initialSignals = untrack(() => signals);
      const initialWatchedSignals = untrack(() => watchedSignals ?? []);
      const initialOnSignalChange = untrack(() => onSignalChange);

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
      applyWatchedSignalValues(view, initialWatchedSignals);
      await view.runAsync();
      registerSignalListeners(view, initialWatchedSignals, initialOnSignalChange);

      lastDataFingerprint = fingerprint(initialValues);
      lastSignalsFingerprint = fingerprint(initialSignals ?? {});
    })();

    return () => {
      cancelled = true;

      if (view) {
        try {
          clearSignalListeners(view);
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

  $effect(() => {
    const currentView = view;
    const signalNames = watchedSignals ?? [];
    const callback = onSignalChange;

    if (!currentView) return;

    registerSignalListeners(currentView, signalNames, callback);
  });
</script>

<div bind:this={element} class="chartHost"></div>