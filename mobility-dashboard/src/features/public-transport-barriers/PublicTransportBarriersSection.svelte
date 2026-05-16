<script lang="ts">
  import { onMount } from "svelte";
  import DashboardChartSection from "../../components/charts/DashboardChartSection.svelte";
  import VegaLiteChart from "../../components/charts/VegaLiteChart.svelte";
  import {
    loadPublicTransportBarrierData,
    type PublicTransportBarrierDataset,
  } from "../../data/publicTransportBarriers";
  import {
    dashboardFilters,
    selectedStatusGroupKeys,
  } from "../../stores/dashboardFilters";
  import { createPublicTransportBarrierSpec } from "./charts/publicTransportBarriers";

  type PublicTransportBarrierChartRow = {
    barrier: string;
    barrier_label: string;
    barrier_order: number;
    response_key: "yes" | "no";
    response_label: string;
    response_order: number;
    people: number;
    segment_participants: number;
    segment_context_label: string;
    barrier_sort_rank: number;
  };

  const ALL_SEGMENTS_KEY = "all";
  const chartSpec = createPublicTransportBarrierSpec();

  let error = $state<string | null>(null);
  let dataset = $state<PublicTransportBarrierDataset | null>(null);
  let segmentKey = $state("car-driver");
  let sortMode = $state<"fixed" | "frequency">("frequency");

  let axisTitle = $derived.by(() =>
    $dashboardFilters.measureMode === "absolute"
      ? "Personen, die den Grund genannt haben"
      : "Anteil der gezeigten Personen, die den Grund genannt haben (%)",
  );

  onMount(async () => {
    try {
      const nextDataset = await loadPublicTransportBarrierData();
      dataset = nextDataset;

      const hasCarDrivers = nextDataset.segmentOptions.some(
        (option) => option.key === "car-driver",
      );
      segmentKey = hasCarDrivers
        ? "car-driver"
        : (nextDataset.segmentOptions[0]?.key ?? ALL_SEGMENTS_KEY);
    } catch (loadError) {
      error = loadError instanceof Error ? loadError.message : String(loadError);
    }
  });

  let filteredSegmentSummaries = $derived.by(() => {
    if (!dataset) return [];

    return dataset.segmentSummaries.filter((summary) => {
      const matchesSegment =
        segmentKey === ALL_SEGMENTS_KEY || summary.main_vehicle === segmentKey;

      return (
        matchesSegment &&
        $selectedStatusGroupKeys.includes(summary.employment_status)
      );
    });
  });

  let participantsInSelection = $derived.by(() => {
    return filteredSegmentSummaries.reduce(
      (total, summary) => total + summary.participants,
      0,
    );
  });

  let selectedSegmentLabel = $derived.by(() => {
    if (segmentKey === ALL_SEGMENTS_KEY) return "Alle Hauptverkehrsmittel";

    return (
      dataset?.segmentOptions.find((option) => option.key === segmentKey)
        ?.label ?? segmentKey
    );
  });

  let selectedSegmentContextLabel = $derived.by(() => {
    if (segmentKey === ALL_SEGMENTS_KEY) {
      return "Personen mit beliebigem Hauptverkehrsmittel";
    }

    return `Personen mit Hauptverkehrsmittel ${selectedSegmentLabel}`;
  });

  let visibleValues = $derived.by(() => {
    if (!dataset || participantsInSelection === 0) return [];

    const rowsByKey = new Map<string, PublicTransportBarrierChartRow>();

    for (const row of dataset.rows) {
      const matchesSegment =
        segmentKey === ALL_SEGMENTS_KEY || row.main_vehicle === segmentKey;

      if (
        !matchesSegment ||
        !$selectedStatusGroupKeys.includes(row.employment_status)
      ) {
        continue;
      }

      if (row.response_key !== "yes") continue;

      const aggregationKey = row.barrier;
      const existingRow = rowsByKey.get(aggregationKey);

      if (existingRow) {
        existingRow.people += row.people;
        continue;
      }

      rowsByKey.set(aggregationKey, {
        barrier: row.barrier,
        barrier_label: row.barrier_label,
        barrier_order: row.barrier_order,
        response_key: row.response_key,
        response_label: row.response_label,
        response_order: row.response_order,
        people: row.people,
        segment_participants: participantsInSelection,
        segment_context_label: selectedSegmentContextLabel,
        barrier_sort_rank: row.barrier_order,
      });
    }

    const sortedRows = Array.from(rowsByKey.values()).sort((a, b) => {
      if (sortMode === "frequency") {
        const aMetric =
          $dashboardFilters.measureMode === "absolute"
            ? a.people
            : a.segment_participants > 0
              ? a.people / a.segment_participants
              : 0;
        const bMetric =
          $dashboardFilters.measureMode === "absolute"
            ? b.people
            : b.segment_participants > 0
              ? b.people / b.segment_participants
              : 0;
        const metricDifference = bMetric - aMetric;

        if (metricDifference !== 0) return metricDifference;
      }

      if (a.barrier_order !== b.barrier_order) {
        return a.barrier_order - b.barrier_order;
      }

      return a.barrier_label.localeCompare(b.barrier_label, "de-DE");
    });

    return sortedRows.map((row, index) => ({
      ...row,
      barrier_sort_rank: sortMode === "frequency" ? index + 1 : row.barrier_order,
    }));
  });

  let visibleBarrierCount = $derived.by(() => {
    return new Set(visibleValues.map((row) => row.barrier)).size;
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
    eyebrow="Hürden"
    title="Welche Gründe sprechen gegen Bus und Bahn?"
    description="Die Balken zeigen, wie häufig ein Grund gegen Bus und Bahn in der aktuellen Auswahl genannt wurde."
    note="Gezeigt werden nur genannte Gründe gegen Bus und Bahn. Prozentwerte beziehen sich auf die gezeigten Personen mit dem gewählten Hauptverkehrsmittel und den aktuell sichtbaren Personengruppen."
    axisTitle={axisTitle}
    hasToolbar={true}
    hasMeta={true}
  >
    {#snippet toolbar()}
      <label class="field">
        <span>Antworten von Personen mit Hauptverkehrsmittel</span>
        <select bind:value={segmentKey}>
          <option value={ALL_SEGMENTS_KEY}>Alle Hauptverkehrsmittel</option>
          {#each dataset?.segmentOptions ?? [] as option}
            <option value={option.key}>{option.label}</option>
          {/each}
        </select>
      </label>

      <label class="field">
        <span>Sortierung</span>
        <select bind:value={sortMode}>
          <option value="fixed">Feste Reihenfolge</option>
          <option value="frequency">Nach Häufigkeit/Anteil</option>
        </select>
      </label>
    {/snippet}

    {#snippet meta()}
      <p class="chartMeta">
        Gezeigte Antworten von: <strong>{selectedSegmentContextLabel}</strong>
      </p>
      <p class="chartMeta">
        Gezeigte Personen:
        <strong>n = {formatInteger(participantsInSelection)}</strong>
      </p>
      <p class="chartMeta">
        Hürden mit sichtbaren Werten:
        <strong>{visibleBarrierCount}</strong>
      </p>
    {/snippet}

    {#if participantsInSelection > 0}
      <VegaLiteChart
        spec={chartSpec}
        dataName="table"
        dataValues={visibleValues}
        signals={{
          measureMode: $dashboardFilters.measureMode,
        }}
      />
    {:else}
      <p class="statusMessage">
        Für die aktuelle Kombination aus Personengruppen und Hauptverkehrsmittel
        liegen keine Angaben zu Gründen gegen Bus und Bahn vor.
      </p>
    {/if}
  </DashboardChartSection>
{/if}