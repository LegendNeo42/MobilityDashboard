<script lang="ts">
  import { onMount } from "svelte";
  import VegaLiteChart from "./lib/components/VegaLiteChart.svelte";
  import {
    loadVehicleUsageByGroup,
    type VehicleUsageByGroupRow,
  } from "./lib/data/vehicle";

  let error = $state<string | null>(null);

  let usageRows = $state<VehicleUsageByGroupRow[] | null>(null);
  let semesterOptions = $state<string[]>([]);
  let semesterTime = $state<string>("");

  onMount(async () => {
    try {
      const rows = await loadVehicleUsageByGroup();
      usageRows = rows;

      semesterOptions = Array.from(
        new Set(rows.map((r) => r.semester_time)),
      ).sort();
      semesterTime = semesterOptions[0] ?? "";
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  });

  let values = $derived.by(() => {
    if (!usageRows || !semesterTime) return [];
    return usageRows
      .filter((r) => r.semester_time === semesterTime)
      .map((r) => ({
        ...r,
        vehicle_sort: r.vehicle_order,
        group_sort: r.group_order,
      }));
  });

  const specUsageByGroup: any = {
    $schema: "https://vega.github.io/schema/vega-lite/v6.json",
    width: "container",
    height: 460,
    autosize: { type: "fit-x", contains: "padding" },
    padding: { left: 5, right: 20, top: 10, bottom: 55 },
    params: [
      {
        name: "groupShow",
        select: {
          type: "point",
          fields: ["group_label"],
          toggle: "true", // <- togglen ohne Shift :contentReference[oaicite:1]{index=1}
        },
        bind: "legend",
        value: [
          { group_label: "Studierende" },
          { group_label: "Mitarbeitende" },
          { group_label: "Professor:innen" },
        ],
      },
    ],

    transform: [{ filter: { param: "groupShow" } }],

    data: { name: "table" },

    mark: { type: "bar" },

    encoding: {
      y: {
        field: "vehicle_label",
        type: "nominal",
        title: null,
        sort: { field: "vehicle_sort", order: "ascending" },
        axis: { labelLimit: 260 },
      },
      yOffset: { field: "group_label" },

      x: {
        field: "people",
        type: "quantitative",
        title: "Anzahl Personen",
        axis: { tickMinStep: 1, grid: true },
        scale: { zero: true },
      },

      color: {
        field: "group_label",
        type: "nominal",
        title: "Personengruppe",
        scale: { domain: ["Studierende", "Mitarbeitende", "Professor:innen"] },
        legend: { title: "Personengruppe (Klick: ein/aus)" },
      },

      tooltip: [
        { field: "vehicle_label", type: "nominal", title: "Verkehrsmittel" },
        { field: "group_label", type: "nominal", title: "Personengruppe" },
        { field: "people", type: "quantitative", title: "Anzahl Personen" },
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
{:else if !usageRows}
  <div class="page"><p>Lade Daten…</p></div>
{:else}
  <div class="page">
    <h2 class="title">Nutzung von Verkehrsmitteln nach Personengruppe</h2>
    <p class="subtitle">Filter: {formatSemesterTime(semesterTime)}</p>


    <div class="card">
      <div class="cardHeader">
        <label>
          Semester-Zeit:
          <select bind:value={semesterTime}>
            {#each semesterOptions as opt}
              <option value={opt}>{formatSemesterTime(opt)}</option>
            {/each}
          </select>
        </label>

        <span class="cardHint">Legende rechts: Klick = ein/ausblenden</span>
      </div>
      <VegaLiteChart
        spec={specUsageByGroup}
        dataName="table"
        dataValues={values}
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

  .card {
    background: white;
    border-radius: 12px;
    padding: 12px;
  }
  .cardHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }
  .cardHint {
    font-size: 12px;
    opacity: 0.7;
    white-space: nowrap;
  }
</style>
