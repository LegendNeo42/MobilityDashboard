<script lang="ts">
  import { onMount } from "svelte";
  import DashboardChartSection from "../../components/charts/DashboardChartSection.svelte";
  import VegaLiteChart from "../../components/charts/VegaLiteChart.svelte";
  import {
    loadModalSplitByDistanceData,
    type ModalSplitByDistanceDataset,
  } from "../../data/vehicle";
  import {
    dashboardFilters,
    selectedStatusGroupKeys,
  } from "../../stores/dashboardFilters";
  import { formatSemesterTime } from "../../utils/semester";
  import { createModalSplitByDistanceSpec } from "./charts/modalSplitByDistance";

  type ModalSplitChartRow = {
    distance_bucket: string;
    distance_bucket_label: string;
    distance_bucket_order: number;
    vehicle: string;
    vehicle_label: string;
    vehicle_order: number;
    people: number;
    bucket_participants: number;
  };

  const chartSpec = createModalSplitByDistanceSpec();

  let error = $state<string | null>(null);
  let dataset = $state<ModalSplitByDistanceDataset | null>(null);
  let semesterTime = $state("");

  onMount(async () => {
    try {
      const nextDataset = await loadModalSplitByDistanceData();
      dataset = nextDataset;
      semesterTime = nextDataset.semesterOptions[0] ?? "";
    } catch (loadError) {
      error = loadError instanceof Error ? loadError.message : String(loadError);
    }
  });

  let filteredRows = $derived.by(() => {
    if (!dataset || !semesterTime) return [];

    return dataset.rows.filter(
      (row) =>
        row.semester_time === semesterTime &&
        $selectedStatusGroupKeys.includes(row.employment_status),
    );
  });

  let filteredBucketSummaries = $derived.by(() => {
    if (!dataset || !semesterTime) return [];

    return dataset.bucketSummaries.filter(
      (summary) =>
        summary.semester_time === semesterTime &&
        $selectedStatusGroupKeys.includes(summary.employment_status),
    );
  });

  let excludedZeroDistanceCount = $derived.by(() => {
    if (!dataset || !semesterTime) return 0;

    return dataset.zeroDistanceSummaries
      .filter(
        (summary) =>
          summary.semester_time === semesterTime &&
          $selectedStatusGroupKeys.includes(summary.employment_status),
      )
      .reduce((total, summary) => total + summary.participants, 0);
  });

  let excludedLongWalkCount = $derived.by(() => {
    if (!dataset || !semesterTime) return 0;

    return dataset.longWalkSummaries
      .filter(
        (summary) =>
          summary.semester_time === semesterTime &&
          $selectedStatusGroupKeys.includes(summary.employment_status),
      )
      .reduce((total, summary) => total + summary.participants, 0);
  });

  let visibleValues = $derived.by(() => {
    const bucketParticipantsByKey = new Map<string, number>();

    for (const summary of filteredBucketSummaries) {
      const currentValue = bucketParticipantsByKey.get(summary.distance_bucket) ?? 0;
      bucketParticipantsByKey.set(
        summary.distance_bucket,
        currentValue + summary.participants,
      );
    }

    const rowsByKey = new Map<string, ModalSplitChartRow>();

    for (const row of filteredRows) {
      const aggregationKey = `${row.distance_bucket}|${row.vehicle}`;
      const existingRow = rowsByKey.get(aggregationKey);

      if (existingRow) {
        existingRow.people += row.people;
        continue;
      }

      rowsByKey.set(aggregationKey, {
        distance_bucket: row.distance_bucket,
        distance_bucket_label: row.distance_bucket_label,
        distance_bucket_order: row.distance_bucket_order,
        vehicle: row.vehicle,
        vehicle_label: row.vehicle_label,
        vehicle_order: row.vehicle_order,
        people: row.people,
        bucket_participants: bucketParticipantsByKey.get(row.distance_bucket) ?? 0,
      });
    }

    return Array.from(rowsByKey.values()).sort((a, b) => {
      if (a.distance_bucket_order !== b.distance_bucket_order) {
        return a.distance_bucket_order - b.distance_bucket_order;
      }

      return a.vehicle_order - b.vehicle_order;
    });
  });

  let participantsInSelection = $derived.by(() => {
    return filteredBucketSummaries.reduce(
      (total, summary) => total + summary.participants,
      0,
    );
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
    eyebrow="Distanz"
    title="Wie verändert sich der Modal Split mit der Distanz?"
    axisTitle="Distanzklasse beim Hauptverkehrsmittel"
    description="Der Modal Split beschreibt die Verteilung der Hauptverkehrsmittel innerhalb der sichtbaren Distanzklassen. Als Hauptverkehrsmittel gilt das Verkehrsmittel, das eine Person für den Weg zur Universität als wichtigstes angegeben hat."
    note="Die Auswertung verwendet nur das jeweilige Hauptverkehrsmittel pro Person. Prozentwerte zeigen den Anteil innerhalb jeder Distanzklasse. Werte mit 0,0 km sowie Fußwege über 50 km werden nur in dieser Distanzansicht ausgeblendet."
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
    {/snippet}

    {#snippet meta()}
      <p class="chartMeta">
        Zeitraum: <strong>{formatSemesterTime(semesterTime)}</strong>
      </p>
      <p class="chartMeta">
        Fallzahl mit plausibler Distanz:
        <strong>n = {formatInteger(participantsInSelection)}</strong>
      </p>
      <p class="chartMeta">
        Nur hier ausgeblendete Werte:
        <strong>{formatInteger(excludedZeroDistanceCount + excludedLongWalkCount)}</strong>
      </p>
    {/snippet}

    <VegaLiteChart
      spec={chartSpec}
      dataName="table"
      dataValues={visibleValues}
      signals={{ measureMode: $dashboardFilters.measureMode }}
    />
  </DashboardChartSection>
{/if}