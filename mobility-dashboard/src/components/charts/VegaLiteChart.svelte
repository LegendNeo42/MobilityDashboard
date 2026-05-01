<script lang="ts">
  import { tick, untrack } from "svelte";
  import embed from "vega-embed";
  import { changeset } from "vega";

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
  let resizeObserver: ResizeObserver | null = null;
  let resizeFrame: number | null = null;
  let lastObservedWidth = 0;
  let lastObservedHeight = 0;
  let registeredSignalListeners: Array<{
    name: string;
    handler: (name: string, value: unknown) => void;
  }> = [];
  let watchedSignalValues: Record<string, unknown> = {};

  let lastDataFingerprint = "";
  let lastSignalsFingerprint = "";

  const fingerprint = (value: unknown) => JSON.stringify(value ?? {});

  async function runResized(currentView: any) {
    currentView.resize();
    await currentView.runAsync();
  }

  function scheduleResize() {
    if (!view || resizeFrame !== null) return;

    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;

      const currentView = view;
      if (!currentView) return;

      runResized(currentView).catch(console.error);
    });
  }

  function disconnectResizeObserver() {
    resizeObserver?.disconnect();
    resizeObserver = null;
    lastObservedWidth = 0;
    lastObservedHeight = 0;

    if (resizeFrame !== null) {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = null;
    }
  }

  function observeChartSize() {
    disconnectResizeObserver();

    if (!element || !view || typeof ResizeObserver === "undefined") return;

    const observedElement = element.parentElement ?? element;

    resizeObserver = new ResizeObserver((entries) => {
      const nextWidth = Math.round(entries[0]?.contentRect.width ?? 0);
      const nextHeight = Math.round(entries[0]?.contentRect.height ?? 0);

      const widthChanged = Math.abs(nextWidth - lastObservedWidth) > 1;
      const heightChanged = Math.abs(nextHeight - lastObservedHeight) > 1;

      if (nextWidth <= 0 || (!widthChanged && !heightChanged)) return;

      lastObservedWidth = nextWidth;
      lastObservedHeight = nextHeight;
      scheduleResize();
    });

    resizeObserver.observe(observedElement);
  }

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

    currentView.change(name, datasetChanges);
    await runResized(currentView);
    scheduleResize();
  }

  function clearSignalListeners(currentView: any) {
    for (const listener of registeredSignalListeners) {
      try {
        currentView.removeSignalListener(listener.name, listener.handler);
      } catch {
        // Ignore cleanup errors from disposed views.
      }
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

  // Recreate the Vega view only when the spec shell changes.
  $effect(() => {
    if (!element || !spec) return;

    let cancelled = false;

    (async () => {
      lastDataFingerprint = "";
      lastSignalsFingerprint = "";
      disconnectResizeObserver();

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

      await tick();

      const result = await embed(element, initialSpec, { actions: false });
      if (cancelled) return;

      view = result.view;

      applySignals(view, initialSignals);
      applyWatchedSignalValues(view, initialWatchedSignals);
      await runResized(view);
      observeChartSize();
      scheduleResize();
      registerSignalListeners(view, initialWatchedSignals, initialOnSignalChange);

      lastDataFingerprint = fingerprint(initialValues);
      lastSignalsFingerprint = fingerprint(initialSignals ?? {});
    })();

    return () => {
      cancelled = true;
      disconnectResizeObserver();

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
        await runResized(currentView);
        scheduleResize();
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