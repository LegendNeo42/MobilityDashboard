<script lang="ts">
  import embed from "vega-embed";

  let { spec } = $props<{ spec: any }>();

  let el: HTMLDivElement | null = null;
  let view: any = null;
  let ro: ResizeObserver | null = null;

  $effect(() => {
    if (!el || !spec) return;

    let cancelled = false;

    (async () => {
      // cleanup vorheriges Chart + observer
      if (ro) { ro.disconnect(); ro = null; }
      if (view) {
        try { view.finalize(); } catch {}
        view = null;
      }

      const result = await embed(el, spec, { actions: false });
      if (cancelled) return;

      view = result.view;

      // 1) initial: nach Layout einmal "nachziehen"
      requestAnimationFrame(() => {
        try { view.resize().run(); } catch {}
      });

      // 2) robust: bei jeder Container-Größenänderung neu anpassen
      ro = new ResizeObserver(() => {
        if (!view) return;
        try { view.resize().run(); } catch {}
      });
      ro.observe(el);
    })();

    return () => {
      cancelled = true;
      if (ro) { ro.disconnect(); ro = null; }
      if (view) {
        try { view.finalize(); } catch {}
        view = null;
      }
    };
  });
</script>

<div bind:this={el} style="width: 100%; min-height: 520px;"></div>
