<script lang="ts">
  import { onMount } from "svelte";
  import VegaLiteChart from "./lib/components/VegaLiteChart.svelte";
  import { loadVehicleRows, type VehicleRow } from "./lib/data/vehicle";

  let rows = $state<VehicleRow[] | null>(null);
  let error = $state<string | null>(null);

  const semesterOptions = ["ws_vl", "ws_free", "ss_vl", "ss_free"] as const;
  let semesterTime = $state<(typeof semesterOptions)[number]>("ws_vl");

  onMount(async () => {
    try {
      rows = await loadVehicleRows();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  });

  let spec = $derived.by((): any => {
    if (!rows) return null;

    const filterExpr = `datum.semester_time === '${semesterTime}' && datum.is_main_vehicle === true`;

    return {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      width: "container",
      height: 420,
      autosize: { type: "fit-x", contains: "padding" },
      data: { values: rows },
      transform: [{ filter: filterExpr }],
      mark: "bar",
      encoding: {
        y: {
          field: "vehicle",
          type: "nominal",
          sort: "-x",
          title: "Verkehrsmittel",
        },
        x: {
          aggregate: "count",
          type: "quantitative",
          title: "Anzahl (Main Vehicle)",
        },
        tooltip: [
          { field: "vehicle", type: "nominal" },
          { aggregate: "count", type: "quantitative", title: "Anzahl" },
        ],
      },
    };
  });
</script>

{#if error}
  <div class="page">
    <p>Fehler: {error}</p>
  </div>
{:else if !rows || !spec}
  <div class="page">
    <p>Lade Daten…</p>
  </div>
{:else}
  <div class="page">
    <div class="controls">
      <label>
        Semester-Zeit:
        <select bind:value={semesterTime}>
          {#each semesterOptions as opt}
            <option value={opt}>{opt}</option>
          {/each}
        </select>
      </label>
    </div>

    <div class="card">
      <VegaLiteChart {spec}></VegaLiteChart>
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

  .controls {
    margin-bottom: 12px;
  }

  .card {
    background: white;
    border-radius: 12px;
    padding: 12px;
  }
</style>
