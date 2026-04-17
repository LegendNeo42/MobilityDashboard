<script lang="ts">
  import { onMount } from "svelte";
  import DashboardChartSection from "../../components/charts/DashboardChartSection.svelte";
  import VegaLiteChart from "../../components/charts/VegaLiteChart.svelte";
  import {
    loadPublicTransportImprovementData,
    type PublicTransportImprovementDataset,
  } from "../../data/publicTransportImprovements";
  import {
    dashboardFilters,
    selectedStatusGroupKeys,
  } from "../../stores/dashboardFilters";
  import { createPublicTransportImprovementSpec } from "./charts/publicTransportImprovements";

  type AggregatedTopicRow = {
    topic: string;
    topic_label: string;
    topic_order: number;
    response_key: string;
    response_label: string;
    response_order: number;
    response_family: "likert" | "special";
    people: number;
  };

  type PublicTransportImprovementChartRow = {
    topic: string;
    topic_label: string;
    topic_order: number;
    topic_sort_rank: number;
    response_key: string;
    response_label: string;
    response_order: number;
    people: number;
    valid_responses: number;
    valid_share_percent: number;
    no_opinion_responses: number;
    no_answer_responses: number;
    absolute_start: number;
    absolute_end: number;
    percent_start: number;
    percent_end: number;
  };

  const chartSpec = createPublicTransportImprovementSpec();

  let error = $state<string | null>(null);
  let dataset = $state<PublicTransportImprovementDataset | null>(null);
  let sortMode = $state<"fixed" | "positive">("fixed");

  let axisTitle = $derived.by(() =>
    $dashboardFilters.measureMode === "absolute"
      ? "Bewertungen je Thema (links unwichtig, rechts wichtig)"
      : "Anteil innerhalb des Themas (%)",
  );

  onMount(async () => {
    try {
      dataset = await loadPublicTransportImprovementData();
    } catch (loadError) {
      error = loadError instanceof Error ? loadError.message : String(loadError);
    }
  });

  let filteredRows = $derived.by(() => {
    if (!dataset) return [];

    return dataset.rows.filter((row) =>
      $selectedStatusGroupKeys.includes(row.employment_status),
    );
  });

  let participantsInSelection = $derived.by(() => {
    if (!dataset) return 0;

    return dataset.validSummaries
      .filter((summary) => $selectedStatusGroupKeys.includes(summary.employment_status))
      .reduce((total, summary) => total + summary.participants, 0);
  });

  let excludedResponseCount = $derived.by(() => {
    return filteredRows
      .filter((row) => row.response_family === "special")
      .reduce((total, row) => total + row.people, 0);
  });

  let visibleValues = $derived.by(() => {
    const rowsByKey = new Map<string, AggregatedTopicRow>();

    for (const row of filteredRows) {
      const aggregationKey = `${row.topic}|${row.response_key}`;
      const existingRow = rowsByKey.get(aggregationKey);

      if (existingRow) {
        existingRow.people += row.people;
        continue;
      }

      rowsByKey.set(aggregationKey, {
        topic: row.topic,
        topic_label: row.topic_label,
        topic_order: row.topic_order,
        response_key: row.response_key,
        response_label: row.response_label,
        response_order: row.response_order,
        response_family: row.response_family,
        people: row.people,
      });
    }

    const topicRows = new Map<string, PublicTransportImprovementChartRow[]>();
    const positiveShareByTopic = new Map<string, number>();
    const fixedTopicOrder = Array.from(
      new Map(
        Array.from(rowsByKey.values()).map((row) => [
          row.topic,
          {
            topic: row.topic,
            topic_order: row.topic_order,
          },
        ]),
      ).values(),
    ).sort((a, b) => a.topic_order - b.topic_order);

    for (const topicMeta of fixedTopicOrder) {
      const topicEntries = Array.from(rowsByKey.values())
        .filter((row) => row.topic === topicMeta.topic)
        .sort((a, b) => a.response_order - b.response_order);

      const validEntries = topicEntries.filter(
        (row) => row.response_family === "likert",
      );
      const validResponses = validEntries.reduce((total, row) => total + row.people, 0);

      if (validResponses === 0) continue;

      const countsByResponse = new Map(
        validEntries.map((row) => [row.response_key, row.people]),
      );
      const noOpinionResponses =
        topicEntries.find((row) => row.response_key === "no_opinion")?.people ?? 0;
      const noAnswerResponses =
        topicEntries.find((row) => row.response_key === "no_answer")?.people ?? 0;

      const veryUnimportant = countsByResponse.get("very_unimportant") ?? 0;
      const ratherUnimportant = countsByResponse.get("rather_unimportant") ?? 0;
      const neutral = countsByResponse.get("neutral") ?? 0;
      const ratherImportant = countsByResponse.get("rather_important") ?? 0;
      const veryImportant = countsByResponse.get("very_important") ?? 0;

      const shares = {
        very_unimportant: (veryUnimportant / validResponses) * 100,
        rather_unimportant: (ratherUnimportant / validResponses) * 100,
        neutral: (neutral / validResponses) * 100,
        rather_important: (ratherImportant / validResponses) * 100,
        very_important: (veryImportant / validResponses) * 100,
      };

      const absoluteStarts = {
        very_unimportant: -(veryUnimportant + ratherUnimportant + neutral / 2),
        rather_unimportant: -(ratherUnimportant + neutral / 2),
        neutral: -neutral / 2,
        rather_important: neutral / 2,
        very_important: neutral / 2 + ratherImportant,
      };

      const percentStarts = {
        very_unimportant:
          -(shares.very_unimportant + shares.rather_unimportant + shares.neutral / 2),
        rather_unimportant: -(shares.rather_unimportant + shares.neutral / 2),
        neutral: -shares.neutral / 2,
        rather_important: shares.neutral / 2,
        very_important: shares.neutral / 2 + shares.rather_important,
      };

      positiveShareByTopic.set(
        topicMeta.topic,
        shares.rather_important + shares.very_important,
      );

      const chartRows = validEntries.map((row) => {
        const absoluteStart =
          absoluteStarts[row.response_key as keyof typeof absoluteStarts];
        const percentStart = percentStarts[row.response_key as keyof typeof percentStarts];
        const currentShare = shares[row.response_key as keyof typeof shares];

        return {
          topic: row.topic,
          topic_label: row.topic_label,
          topic_order: row.topic_order,
          topic_sort_rank: row.topic_order,
          response_key: row.response_key,
          response_label: row.response_label,
          response_order: row.response_order,
          people: row.people,
          valid_responses: validResponses,
          valid_share_percent: Math.round(currentShare * 10) / 10,
          no_opinion_responses: noOpinionResponses,
          no_answer_responses: noAnswerResponses,
          absolute_start: absoluteStart,
          absolute_end: absoluteStart + row.people,
          percent_start: percentStart,
          percent_end: percentStart + currentShare,
        } satisfies PublicTransportImprovementChartRow;
      });

      topicRows.set(topicMeta.topic, chartRows);
    }

    const sortedTopics = Array.from(topicRows.keys()).sort((a, b) => {
      if (sortMode === "positive") {
        const shareDifference =
          (positiveShareByTopic.get(b) ?? 0) - (positiveShareByTopic.get(a) ?? 0);
        if (shareDifference !== 0) return shareDifference;
      }

      const aOrder = topicRows.get(a)?.[0]?.topic_order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = topicRows.get(b)?.[0]?.topic_order ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });

    return sortedTopics.flatMap((topic, index) => {
      const rows = topicRows.get(topic) ?? [];
      return rows.map((row) => ({
        ...row,
        topic_sort_rank: index + 1,
      }));
    });
  });

  let visibleTopicCount = $derived.by(() => {
    return new Set(visibleValues.map((row) => row.topic)).size;
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
    eyebrow="ÖPNV"
    title="Welche Verbesserungen beim ÖPNV werden als wichtig gesehen?"
    description="Die Ansicht zeigt, wie die sichtbaren Personengruppen einzelne Verbesserungen bei Bus und Bahn bewerten."
    note="Die Balken enthalten nur die fünf geordneten Bewertungen von sehr unwichtig bis sehr wichtig. Antworten ohne Wertung oder ohne Angabe sind nicht Teil der Balken. Prozentwerte zeigen den Anteil innerhalb des jeweiligen Themas."
    axisTitle={axisTitle}
    hasToolbar={true}
    hasMeta={true}
  >
    {#snippet toolbar()}
      <label class="field">
        <span>Sortierung</span>
        <select bind:value={sortMode}>
          <option value="fixed">Feste Themenreihenfolge</option>
          <option value="positive">Nach Anteil wichtig / sehr wichtig</option>
        </select>
      </label>
    {/snippet}

    {#snippet meta()}
      <p class="chartMeta">
        Personen mit mindestens einer gültigen Bewertung:
        <strong>n = {formatInteger(participantsInSelection)}</strong>
      </p>
      <p class="chartMeta">
        Themen mit sichtbaren Bewertungen:
        <strong>{visibleTopicCount}</strong>
      </p>
      <p class="chartMeta">
        Nicht in den Balken enthalten:
        <strong>{formatInteger(excludedResponseCount)}</strong>
      </p>
    {/snippet}

    {#if visibleValues.length > 0}
      <VegaLiteChart
        spec={chartSpec}
        dataName="table"
        dataValues={visibleValues}
        signals={{ measureMode: $dashboardFilters.measureMode }}
      />
    {:else}
      <p class="statusMessage">
        Für die aktuelle Auswahl liegen keine gültigen Bewertungen vor.
      </p>
    {/if}
  </DashboardChartSection>
{/if}