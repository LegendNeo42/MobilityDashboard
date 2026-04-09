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
  };

  const ALL_SEGMENTS_KEY = "all";
  const chartSpec = createPublicTransportBarrierSpec();

  let error = $state<string | null>(null);
  let dataset = $state<PublicTransportBarrierDataset | null>(null);
  let segmentKey = $state("car-driver");

  let axisTitle = $derived.by(() =>
    $dashboardFilters.measureMode === "absolute"
      ? "Antworten je Hürde (Nein links, Ja rechts)"
      : "Anteil im gewählten Segment (Nein links, Ja rechts)",
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

      const aggregationKey = `${row.barrier}|${row.response_key}`;
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
      });
    }

    return Array.from(rowsByKey.values()).sort((a, b) => {
      if (a.barrier_order !== b.barrier_order) return a.barrier_order - b.barrier_order;
      return a.response_order - b.response_order;
    });
  });

  let visibleBarrierCount = $derived.by(() => {
    return new Set(visibleValues.map((row) => row.barrier)).size;
  });

  let selectedSegmentLabel = $derived.by(() => {
    if (segmentKey === ALL_SEGMENTS_KEY) return "Alle Hauptverkehrsmittel";

    return (
      dataset?.segmentOptions.find((option) => option.key === segmentKey)?.label ??
      segmentKey
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
    eyebrow="Hürden"
    title="Warum ist der ÖPNV nicht praktikabel?"
    description="Die Ansicht zeigt für das gewählte Hauptverkehrsmittel, welche Gründe gegen Bus und Bahn genannt werden. Standardmäßig startet die Ansicht mit aktuellen Autofahrer:innen."
    note="Prozentwerte zeigen den Anteil innerhalb des gewählten Hauptverkehrsmittel-Segments und der aktuell sichtbaren Personengruppen. Ja-Antworten liegen rechts, Nein-Antworten links."
    axisTitle={axisTitle}
    hasToolbar={true}
    hasMeta={true}
  >
    {#snippet toolbar()}
      <label class="field">
        <span>Hauptverkehrsmittel</span>
        <select bind:value={segmentKey}>
          <option value={ALL_SEGMENTS_KEY}>Alle Hauptverkehrsmittel</option>
          {#each dataset.segmentOptions as option}
            <option value={option.key}>{option.label}</option>
          {/each}
        </select>
      </label>
    {/snippet}

    {#snippet meta()}
      <p class="chartMeta">
        Segment: <strong>{selectedSegmentLabel}</strong>
      </p>
      <p class="chartMeta">
        Personen im gewählten Segment:
        <strong>n = {formatInteger(participantsInSelection)}</strong>
      </p>
      <p class="chartMeta">
        Barrieren mit Daten:
        <strong>{visibleBarrierCount}</strong>
      </p>
    {/snippet}

    {#if participantsInSelection > 0}
      <VegaLiteChart
        spec={chartSpec}
        dataName="table"
        dataValues={visibleValues}
        signals={{ measureMode: $dashboardFilters.measureMode }}
      />
    {:else}
      <p class="statusMessage">
        Für die aktuelle Kombination aus Personengruppen und Hauptverkehrsmittel
        liegen keine Antworten vor.
      </p>
    {/if}
  </DashboardChartSection>
{/if}