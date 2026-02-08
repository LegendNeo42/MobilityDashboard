<script lang="ts">
  import { onMount } from "svelte";
  import VegaLiteChart from "./lib/components/VegaLiteChart.svelte";
  import {
    loadVehicleModalSplitBySemesterTime,
    type VehicleModalSplitRow,
  } from "./lib/data/vehicle";

  let error = $state<string | null>(null);

  let dataBySemester = $state<Map<string, VehicleModalSplitRow[]> | null>(null);
  let semesterOptions = $state<string[]>([]);
  let semesterTime = $state<string>("");
  let measureMode = $state<"absolute" | "percent">("absolute");

  let sortMode = $state<"fixed" | "frequency">("fixed");
  let totalN = $derived.by(() => {
    if (!dataBySemester || !semesterTime) return 0;
    const base = dataBySemester.get(semesterTime) ?? [];
    return base.reduce((sum, r) => sum + r.count, 0);
  });

  onMount(async () => {
    try {
      const m = await loadVehicleModalSplitBySemesterTime();
      dataBySemester = m;

      semesterOptions = Array.from(m.keys()).sort();
      semesterTime = semesterOptions[0] ?? "";
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  });

  let values = $derived.by(() => {
    if (!dataBySemester || !semesterTime) return [];
    const base = dataBySemester.get(semesterTime) ?? [];

    const total = totalN; // aus derived
    const percent = (c: number) => (total > 0 ? (c / total) * 100 : 0);
    const round1 = (x: number) => Math.round(x * 10) / 10;

    return base.map((r) => {
      const p1 = round1(percent(r.count));

      const mvRaw = measureMode === "absolute" ? r.count : p1;
      const metric_value = Number.isFinite(mvRaw) ? mvRaw : 0;

      return {
        ...r,
        percent_1: p1,
        metric_value,
        sort_key:
          sortMode === "fixed"
            ? r.vehicle_order
            : -r.count + r.vehicle_order * 0.001,
      };
    });
  });

  // Spec ist KONSTANT -> kein Re-Embed bei Semester/Sortierung
  const spec: any = {
    $schema: "https://vega.github.io/schema/vega-lite/v6.json",
    width: "container",
    height: 460,
    autosize: { type: "fit-x", contains: "padding" },
    padding: { left: 95, right: 20, top: 10, bottom: 40 },

    data: { name: "table" },

    mark: "bar",
    encoding: {
      y: {
        field: "vehicle_label",
        type: "nominal",
        sort: { field: "sort_key", order: "ascending" },
        title: "Verkehrsmittel",
        axis: { labelLimit: 220 },
      },
      x: {
        field: "metric_value",
        type: "quantitative",
        title: "Wert",
        axis: { grid: true },
        scale: { zero: true },
      },

      tooltip: [
        { field: "vehicle_label", type: "nominal", title: "Verkehrsmittel" },
        { field: "count", type: "quantitative", title: "Anzahl" },
        { field: "percent_1", type: "quantitative", title: "Anteil (%)" },
      ],
    },
  };

  function formatSemesterTime(s: string) {
    const map: Record<string, string> = {
      ws_vl: "WS (Vorlesungszeit)",
      ws_free: "WS (vorlesungsfrei)",
      ss_vl: "SS (Vorlesungszeit)",
      ss_free: "SS (vorlesungsfrei)",
    };
    return map[s] ?? s;
  }
</script>

{#if error}
  <div class="page"><p>Fehler: {error}</p></div>
{:else if !dataBySemester}
  <div class="page"><p>Lade Daten…</p></div>
{:else}
  <div class="page">
    <h2 class="title">Modal Split (Hauptverkehrsmittel)</h2>
    <p class="subtitle">
      Filter: {formatSemesterTime(semesterTime)} • Sortierung: {sortMode ===
      "fixed"
        ? "Fix"
        : "Häufigkeit"}
      • Maß: {measureMode === "absolute" ? "Absolut" : "Prozent"}
      • N: {totalN}
    </p>

    <div class="controls">
      <label>
        Semester-Zeit:
        <select bind:value={semesterTime}>
          {#each semesterOptions as opt}
            <option value={opt}>{formatSemesterTime(opt)}</option>
          {/each}
        </select>
      </label>

      <label style="margin-left: 12px;">
        Sortierung:
        <select bind:value={sortMode}>
          <option value="fixed">Fixe Reihenfolge</option>
          <option value="frequency">Nach Häufigkeit</option>
        </select>
      </label>
      <label style="margin-left: 12px;">
        Maß:
        <select bind:value={measureMode}>
          <option value="absolute">Absolut</option>
          <option value="percent">Prozent</option>
        </select>
      </label>

      <span style="margin-left: 12px; opacity: 0.7;"
        >Zeilen: {values.length}</span
      >
    </div>

    <div class="card">
      <VegaLiteChart {spec} dataName="table" dataValues={values}
      ></VegaLiteChart>
    </div>
  </div>
{/if}

<style>
  .page {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 16px;
  }
  .title {
    margin: 0 0 4px 0;
    font-size: 20px;
  }
  .subtitle {
    margin: 0 0 12px 0;
    font-size: 13px;
    opacity: 0.75;
  }
  .controls {
    margin-bottom: 12px;
  }
  .card {
    background: white;
    border-radius: 12px;
    padding: 12px;
  }
</style>
