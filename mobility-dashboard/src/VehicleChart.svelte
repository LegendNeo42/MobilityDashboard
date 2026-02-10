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
  let sortMode = $state<"fixed" | "frequency">("fixed");
  let measureMode = $state<"absolute" | "percent">("absolute");

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
        vehicle_sort: r.vehicle_order, // bleibt fix in den Daten
        group_sort: r.group_order,
      }));
  });

  const specUsageByGroup: any = {
    $schema: "https://vega.github.io/schema/vega-lite/v6.json",
    width: "container",
    height: 460,
    autosize: { type: "fit-x", contains: "padding" },
    padding: { left: 90, right: 20, top: 10, bottom: 55 },
    params: [
      { name: "sortMode", value: "fixed" },
      { name: "measureMode", value: "absolute" },

      {
        name: "groupShow",
        select: { type: "point", fields: ["group_label"], toggle: "true" },
        bind: "legend",
        value: [
          { group_label: "Studierende" },
          { group_label: "Mitarbeitende" },
          { group_label: "Professor:innen" },
        ],
      },
    ],

    transform: [
      { filter: { param: "groupShow" } },
      {
        joinaggregate: [{ op: "sum", field: "people", as: "vehicle_total" }],
        groupby: ["vehicle_label"],
      },
      {
        calculate:
          "sortMode === 'fixed' ? datum.vehicle_order : -datum.vehicle_total + datum.vehicle_order * 0.001",
        as: "vehicle_sort_val",
      },
      {
        joinaggregate: [{ op: "sum", field: "people", as: "group_total" }],
        groupby: ["group_label"],
      },
      {
        calculate:
          "datum.group_total > 0 ? (datum.people / datum.group_total) * 100 : 0",
        as: "people_percent",
      },
      {
        calculate: "round(datum.people_percent * 10) / 10",
        as: "people_percent_1",
      },
      {
        calculate:
          "measureMode === 'absolute' ? datum.people : datum.people_percent_1",
        as: "metric_value",
      },
    ],

    data: { name: "table" },

    mark: { type: "bar" },

    encoding: {
      y: {
        field: "vehicle_label",
        type: "nominal",
        title: null,
        sort: { field: "vehicle_sort_val", order: "ascending" },
        axis: { labelLimit: 260 },
      },
      yOffset: { field: "group_label" },

      x: {
        field: "metric_value",
        type: "quantitative",
        title: "Wert",
        axis: {
          grid: true,
          tickMinStep: 1,
          labelExpr:
            "measureMode === 'absolute' ? format(datum.value, ',d') : format(datum.value, '.0f') + '%'",
        },
        scale: {
          zero: true,
          domainRaw: {
            signal: "measureMode === 'percent' ? [0, 100] : null",
          },
        },
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
        {
          field: "people_percent_1",
          type: "quantitative",
          title: "Anteil in Gruppe (%)",
          format: ".1f",
        },
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

        <span class="cardHint">Legende rechts: Klick = ein/ausblenden</span>
      </div>
      <VegaLiteChart
        spec={specUsageByGroup}
        dataName="table"
        dataValues={values}
        signals={{ sortMode, measureMode }}
      />
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
    justify-content: flex-start;
    flex-wrap: wrap;
  }
  .cardHint {
    margin-left: auto;
  }
</style>
