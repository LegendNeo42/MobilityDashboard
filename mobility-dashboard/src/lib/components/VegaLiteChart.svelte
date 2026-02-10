<script lang="ts">
  import embed from "vega-embed";
  import { changeset } from "vega";
  import { untrack } from "svelte";

  // ✅ WICHTIG: reaktive Props (nicht const props = $props())
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

  let el: HTMLDivElement | null = null;
  let view: any = null;

  function applySignals(v: any, sigs: Record<string, any> | null) {
    if (!sigs) return;
    for (const [k, val] of Object.entries(sigs)) v.signal(k, val);
  }

  let lastDataFp = "";
  let lastSignalsFp = "";

  const fp = (x: any) => JSON.stringify(x ?? {});

  async function setData(v: any, name: string, vals: any[]) {
    const f = fp(vals ?? []);
    if (f === lastDataFp) return;
    lastDataFp = f;

    const cs = changeset()
      .remove(() => true)
      .insert(vals ?? []);
    await v.change(name, cs).runAsync();
  }

  // 1) Embed nur wenn spec/el/dataName sich ändern (nicht bei data/signals)
  $effect(() => {
    if (!el || !spec) return;

    let cancelled = false;

    (async () => {
      lastDataFp = "";
      lastSignalsFp = "";

      if (view) {
        try {
          view.finalize();
        } catch {}
        view = null;
      }

      // ✅ initiale Daten direkt ins Spec -> keine "Infinite extent" Warnings
      const initVals = untrack(() => dataValues ?? []);
      const initSigs = untrack(() => signals);

      const initSpec = {
        ...spec,
        datasets: {
          ...(spec.datasets ?? {}),
          [dataName]: initVals,
        },
      };

      const result = await embed(el, initSpec, { actions: false });
      if (cancelled) return;

      view = result.view;

      applySignals(view, initSigs);
      await view.runAsync();

      lastDataFp = fp(initVals);
      lastSignalsFp = fp(initSigs ?? {});
    })();

    return () => {
      cancelled = true;
      if (view) {
        try {
          view.finalize();
        } catch {}
        view = null;
      }
    };
  });

  // 2) Datenupdates (Semesterzeit)
  $effect(() => {
    // ✅ wichtig: erst reactive props lesen (damit Svelte Dependencies trackt)
    const v = view;
    const name = dataName;
    const vals = dataValues ?? [];

    if (!v) return;

    (async () => {
      try {
        await setData(v, name, vals);
      } catch (e) {
        console.error(e);
      }
    })();
  });

  // 3) Signalupdates (Fix/Häufigkeit)
  $effect(() => {
    // ✅ wichtig: erst reactive props lesen (damit Svelte Dependencies trackt)
    const v = view;
    const sigs = signals ?? null;

    const f = fp(sigs ?? {});
    if (f === lastSignalsFp) return;
    lastSignalsFp = f;

    if (!v) return;

    (async () => {
      try {
        applySignals(v, sigs);
        await v.runAsync();
      } catch (e) {
        console.error(e);
      }
    })();
  });
</script>

<div bind:this={el} style="width: 100%; min-height: 520px;"></div>
