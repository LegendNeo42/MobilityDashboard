<script lang="ts">
  import { onMount } from "svelte";
  import DashboardChartSection from "../../components/charts/DashboardChartSection.svelte";
  import VegaLiteChart from "../../components/charts/VegaLiteChart.svelte";
  import { loadVehicleUsageByGroupData } from "../../data/vehicle";
  import type { VehicleUsageByGroupDataset } from "../../data/vehicle";
  import { dashboardFilters, selectedStatusGroupKeys } from "../../stores/dashboardFilters";
  import { formatSemesterTime } from "../../utils/semester";
  import { createVehicleUsageByGroupSpec } from "./charts/vehicleUsageByGroup";

  const chartSpec = createVehicleUsageByGroupSpec();

  let error = $state<string | null>(null);
  let dataset = $state<VehicleUsageByGroupDataset | null>(null);
  let semesterTime = $state("");
  let sortMode = $state<"fixed" | "frequency">("fixed");

  let xAxisTitle = $derived.by(() =>
    $dashboardFilters.measureMode === "absolute"
      ? "Personen mit Nennung"
      : "Anteil innerhalb der Personengruppe (%)",
  );

  onMount(async () => {
    try {
      const nextDataset = await loadVehicleUsageByGroupData();
      dataset = nextDataset;
      semesterTime = nextDataset.semesterOptions[0] ?? "";
    } catch (loadError) {
      error = loadError instanceof Error ? loadError.message : String(loadError);
    }
  });

  let values = $derived.by(() => {
    if (!dataset || !semesterTime) return [];

    return dataset.rows.filter((row) => row.semester_time === semesterTime);
  });

  let visibleValues = $derived.by(() => {
    return values.filter((row) =>
      $selectedStatusGroupKeys.includes(row.employment_status),
    );
  });

  let participantsInSelection = $derived.by(() => {
    if (!dataset || !semesterTime) return 0;

    return dataset.groupSummaries
      .filter(
        (summary) =>
          summary.semester_time === semesterTime &&
          $selectedStatusGroupKeys.includes(summary.employment_status),
      )
      .reduce((total, summary) => total + summary.participants, 0);
  });

  let visibleVehicleCount = $derived.by(() => {
    const vehicleKeys = new Set(visibleValues.map((row) => row.vehicle));
    return vehicleKeys.size;
  });

  function formatInteger(value: number): string {
    return new Intl.NumberFormat("de-DE").format(value);
  }
</script>

{#if error}
  <p class="statusMessage">Fehler: {error}</p>
{:else if !dataset}
  <p class="statusMessage">Lade Daten…</p>
{:else}
  <DashboardChartSection
    eyebrow="Verkehrsmittel"
    title="Welche Verkehrsmittel werden je Personengruppe genutzt?"
    description="Die Ansicht zeigt, welche Verkehrsmittel die sichtbaren Personengruppen im gewählten Zeitraum genannt haben."
    note="Absolute Werte zeigen, wie viele Personen das jeweilige Verkehrsmittel in der aktuellen Auswahl genannt haben. Prozentwerte zeigen den Anteil innerhalb jeder sichtbaren Personengruppe. Mehrfachnennungen pro Person sind möglich, deshalb addieren sich die Anteile innerhalb einer Personengruppe nicht zu 100 %."
    axisTitle={xAxisTitle}
    hasToolbar={true}
    hasMeta={true}
  >
    {#snippet toolbar()}
      <label class="field">
        <span>Zeitraum</span>
        <select bind:value={semesterTime}>
          {#each dataset.semesterOptions as option}
            <option value={option}>{formatSemesterTime(option)}</option>
          {/each}
        </select>
      </label>

      <label class="field">
        <span>Sortierung</span>
        <select bind:value={sortMode}>
          <option value="fixed">Feste Reihenfolge</option>
          <option value="frequency">Nach Häufigkeit</option>
        </select>
      </label>
    {/snippet}

    {#snippet meta()}
      <p class="chartMeta">
        Zeitraum:
        <strong>{formatSemesterTime(semesterTime)}</strong>
      </p>
      <p class="chartMeta">
        Aktuelle Auswahl:
        <strong>n = {formatInteger(participantsInSelection)}</strong>
      </p>
      <p class="chartMeta">
        Sichtbare Verkehrsmittel:
        <strong>{visibleVehicleCount}</strong>
      </p>
    {/snippet}

    <VegaLiteChart
      spec={chartSpec}
      dataName="table"
      dataValues={visibleValues}
      signals={{ sortMode, measureMode: $dashboardFilters.measureMode }}
    />
  </DashboardChartSection>
{/if}