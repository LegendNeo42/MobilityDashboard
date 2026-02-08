<script lang="ts">
  import embed from "vega-embed";
  import { changeset } from "vega";

  let {
    spec,
    dataName = "table",
    dataValues = [],
  } = $props<{ spec: any; dataName?: string; dataValues?: any[] }>();

  let el: HTMLDivElement | null = null;

  // WICHTIG: view NICHT als $state, sonst kann es in einen Loop laufen
  let view: any = null;

  async function patch(v: any, name: string, vals: any[]) {
    const cs = changeset()
      .remove(() => true)
      .insert(vals ?? []);
    await v.change(name, cs).runAsync();
  }

  // Embed nur wenn sich SPEC ändert
  $effect(() => {
    if (!el || !spec) return;

    let cancelled = false;

    (async () => {
      if (view) {
        try {
          view.finalize();
        } catch {}
        view = null;
      }
      if ((dataValues ?? []).length === 0) return;
      const initSpec = {
        ...spec,
        datasets: {
          ...(spec.datasets ?? {}),
          [dataName]: dataValues ?? [],
        },
      };

      const result = await embed(el, initSpec, { actions: false });
      if (cancelled) return;

      view = result.view;

      // initiale Daten rein
      try {
        await patch(view, dataName, dataValues);
      } catch (e) {
        console.error(e);
      }
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

  // Bei Datenwechsel nur Daten patchen (kein Re-Embed)
  $effect(() => {
    const v = view;
    const name = dataName;
    const vals = dataValues; // wichtig: direkt lesen, damit Svelte Änderungen trackt

    if (!v) return;
    patch(v, name, vals).catch(console.error);
  });
</script>

<div bind:this={el} style="width: 100%; min-height: 520px;"></div>
