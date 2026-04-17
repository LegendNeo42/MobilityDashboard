<script lang="ts">
  import { onMount } from "svelte";
  import DashboardChartSection from "../../components/charts/DashboardChartSection.svelte";
  import VegaLiteChart from "../../components/charts/VegaLiteChart.svelte";
  import {
    getStatusGroupByKey,
    statusGroupDefinitions,
    type StatusGroupKey,
  } from "../../data/domain";
  import {
    loadQualitativePreparedDataset,
    type QualitativePreparedDataset,
    type QualitativeThemeQuote,
  } from "../../data/qualitativeFeedback";
  import {
    dashboardFilters,
    selectedStatusGroupKeys,
  } from "../../stores/dashboardFilters";
  import { createQualitativeThemeSummarySpec } from "./charts/qualitativeThemeSummary";

  type QualitativeThemeChartRow = {
    theme_key: string;
    theme_label: string;
    theme_order: number;
    theme_rank: number;
    group_key: StatusGroupKey;
    group_label: string;
    statements: number;
    participants: number;
    participant_total: number;
    participant_share_percent: number;
  };

  const maxVisibleQuotes = 5;

  let error = $state<string | null>(null);
  let dataset = $state<QualitativePreparedDataset | null>(null);
  let selectedThemeKey = $state<string | null>(null);
  let sortMode = $state<"fixed" | "frequency">("fixed");

  onMount(async () => {
    try {
      dataset = await loadQualitativePreparedDataset();
    } catch (loadError) {
      error =
        loadError instanceof Error ? loadError.message : String(loadError);
    }
  });

  let axisTitle = $derived.by(() =>
    $dashboardFilters.measureMode === "absolute"
      ? "Zugeordnete Aussagen je Thema"
      : "Anteil innerhalb der Personengruppe (%)",
  );

  let participantTotalsByGroup = $derived.by(() => {
    if (!dataset) return new Map<StatusGroupKey, number>();

    return new Map(
      dataset.totals.dashboardSelectableStatusGroups.map((group) => [
        group.key,
        group.participants,
      ]),
    );
  });

  let visibleThemes = $derived.by(() => {
    if (!dataset) return [];

    return dataset.themes
      .map((theme) => {
        const statusGroupEntries = statusGroupDefinitions
          .map((groupDefinition) => {
            const groupSummary =
              theme.statusGroups.find(
                (group) => group.key === groupDefinition.key,
              ) ?? null;
            const participantTotal =
              participantTotalsByGroup.get(groupDefinition.key) ?? 0;
            const participants = groupSummary?.participants ?? 0;
            const participantSharePercent =
              participantTotal > 0
                ? Math.round((participants / participantTotal) * 1000) / 10
                : 0;

            return {
              key: groupDefinition.key,
              label: groupDefinition.label,
              statements: groupSummary?.statements ?? 0,
              participants,
              participantTotal,
              participantSharePercent,
            };
          })
          .filter(
            (groupEntry) =>
              $selectedStatusGroupKeys.includes(groupEntry.key) &&
              groupEntry.statements > 0,
          );

        const totalStatements = statusGroupEntries.reduce(
          (total, groupEntry) => total + groupEntry.statements,
          0,
        );

        const totalParticipantSharePercent = statusGroupEntries.reduce(
          (total, groupEntry) => total + groupEntry.participantSharePercent,
          0,
        );

        return {
          key: theme.key,
          label: theme.label,
          order: theme.order,
          totalStatements,
          totalParticipantSharePercent,
          statusGroupEntries,
        };
      })
      .filter((theme) => theme.totalStatements > 0)
      .sort((a, b) => {
        if (sortMode === "frequency") {
          const metricDifference =
            $dashboardFilters.measureMode === "absolute"
              ? b.totalStatements - a.totalStatements
              : b.totalParticipantSharePercent - a.totalParticipantSharePercent;

          if (metricDifference !== 0) {
            return metricDifference;
          }
        }

        if (a.order !== b.order) {
          return a.order - b.order;
        }

        return a.label.localeCompare(b.label, "de-DE");
      })
      .map((theme, index) => ({
        ...theme,
        rank: index + 1,
      }));
  });

  let themeSortOrder = $derived.by(() => {
    return visibleThemes.map((theme) => theme.label);
  });

  let visibleThemeRows = $derived.by(() => {
    return visibleThemes.flatMap((theme) =>
      theme.statusGroupEntries.map((groupEntry) => ({
        theme_key: theme.key,
        theme_label: theme.label,
        theme_order: theme.order,
        theme_rank: theme.rank,
        group_key: groupEntry.key,
        group_label: groupEntry.label,
        statements: groupEntry.statements,
        participants: groupEntry.participants,
        participant_total: groupEntry.participantTotal,
        participant_share_percent: groupEntry.participantSharePercent,
      })),
    ) as QualitativeThemeChartRow[];
  });

  let visibleStatementTotal = $derived.by(() => {
    return visibleThemeRows.reduce((total, row) => total + row.statements, 0);
  });

  let selectedGroupLabel = $derived.by(() => {
    if ($selectedStatusGroupKeys.length === statusGroupDefinitions.length) {
      return "Alle sichtbaren Personengruppen";
    }

    return $selectedStatusGroupKeys
      .map((key) => getStatusGroupByKey(key)?.label ?? key)
      .join(", ");
  });

  let selectedTheme = $derived.by(() => {
    if (!dataset || !selectedThemeKey) return null;
    return (
      dataset.themes.find((theme) => theme.key === selectedThemeKey) ?? null
    );
  });

  let selectedThemeVisibleStatementCount = $derived.by(() => {
    return (
      visibleThemes.find((theme) => theme.key === selectedThemeKey)
        ?.totalStatements ?? 0
    );
  });

  let selectedThemeQuotes = $derived.by(() => {
    if (!selectedTheme) return [] as QualitativeThemeQuote[];

    return pickVisibleQuotes(
      selectedTheme.quotes,
      $selectedStatusGroupKeys,
      maxVisibleQuotes,
    );
  });

  let chartSpec = $derived.by(() => {
    const height = Math.max(500, visibleThemes.length * 52);
    return createQualitativeThemeSummarySpec({
      height,
      themeSortOrder,
    });
  });

  $effect(() => {
    const firstVisibleThemeKey = visibleThemes[0]?.key ?? null;

    if (!firstVisibleThemeKey) {
      selectedThemeKey = null;
      return;
    }

    const themeStillVisible = visibleThemes.some(
      (theme) => theme.key === selectedThemeKey,
    );

    if (!selectedThemeKey || !themeStillVisible) {
      selectedThemeKey = firstVisibleThemeKey;
    }
  });

  function formatInteger(value: number): string {
    return new Intl.NumberFormat("de-DE").format(value);
  }

  function pickVisibleQuotes(
    quotes: QualitativeThemeQuote[],
    selectedGroups: StatusGroupKey[],
    limit: number,
  ): QualitativeThemeQuote[] {
    const quotesByGroup = new Map<StatusGroupKey, QualitativeThemeQuote[]>();

    for (const groupKey of selectedGroups) {
      quotesByGroup.set(groupKey, []);
    }

    for (const quote of quotes) {
      if (!quote.statusGroup) continue;
      if (!selectedGroups.includes(quote.statusGroup)) continue;

      const groupQuotes = quotesByGroup.get(quote.statusGroup);
      if (!groupQuotes) continue;
      groupQuotes.push(quote);
    }

    if (selectedGroups.length === 1) {
      return (quotesByGroup.get(selectedGroups[0]) ?? []).slice(0, limit);
    }

    const result: QualitativeThemeQuote[] = [];
    let quoteIndex = 0;

    while (result.length < limit) {
      let pickedInRound = false;

      for (const groupKey of selectedGroups) {
        const groupQuotes = quotesByGroup.get(groupKey) ?? [];
        const nextQuote = groupQuotes[quoteIndex];

        if (!nextQuote) continue;

        result.push(nextQuote);
        pickedInRound = true;

        if (result.length >= limit) {
          return result;
        }
      }

      if (!pickedInRound) {
        break;
      }

      quoteIndex += 1;
    }

    return result;
  }
</script>

{#if error}
  <p class="statusMessage">Fehler: {error}</p>
{:else if !dataset}
  <p class="statusMessage">Lade qualitative Themen…</p>
{:else}
  <DashboardChartSection
    eyebrow="Qualitative Hinweise"
    title="Welche Themen tauchen in den Freitextantworten besonders häufig auf?"
    description="Die qualitative Übersicht ergänzt die Diagramme zu Hürden und Verbesserungswünschen um wiederkehrende Themen aus offenen Kommentaren zur Mobilität."
    note="Im absoluten Modus zeigen die Balken, wie viele vorbereitete Aussagen dem jeweiligen Thema zugeordnet wurden. Im Prozentmodus zeigen sie den Anteil innerhalb der jeweiligen Personengruppe, der zu diesem Thema mindestens eine Aussage gemacht hat. Die Übersicht basiert auf einer einfachen, regelbasierten Themenzuordnung und kann in seltenen Grenzfällen ungenau sein."
    hasToolbar={true}
    hasMeta={true}
  >
    {#snippet toolbar()}
      <label class="field">
        <span>Sortierung</span>
        <select bind:value={sortMode}>
          <option value="fixed">Feste Themenreihenfolge</option>
          <option value="frequency">Nach Häufigkeit</option>
        </select>
      </label>
    {/snippet}

    {#snippet meta()}
      <p class="chartMeta">
        Sichtbare Personengruppen:
        <strong>{selectedGroupLabel}</strong>
      </p>
      <p class="chartMeta">
        Zugeordnete Aussagen in der Auswahl:
        <strong>{formatInteger(visibleStatementTotal)}</strong>
      </p>
      <p class="chartMeta">
        Sichtbare Themen:
        <strong>{formatInteger(visibleThemes.length)}</strong>
      </p>
    {/snippet}

    {#if visibleThemeRows.length > 0}
      <div class="qualitativeModuleStack">
        <VegaLiteChart
          spec={chartSpec}
          dataName="table"
          dataValues={visibleThemeRows}
          signals={{ measureMode: $dashboardFilters.measureMode }}
        />
        <p class="chartAxisTitle">{axisTitle}</p>
        <div class="quoteSelectorPanel">
          <p class="quoteSelectorLabel">Beispielzitate nach Thema</p>
          <div
            class="quoteThemeList"
            role="tablist"
            aria-label="Qualitative Themen auswählen"
          >
            {#each visibleThemes as theme}
              <button
                class="quoteThemeButton"
                class:is-active={theme.key === selectedThemeKey}
                type="button"
                onclick={() => {
                  selectedThemeKey = theme.key;
                }}
              >
                <span class="quoteThemeButtonLabel">{theme.label}</span>
                <span class="quoteThemeButtonMeta">
                  {formatInteger(theme.totalStatements)} Aussagen
                </span>
              </button>
            {/each}
          </div>
        </div>

        {#if selectedTheme}
          <div class="quotePanel">
            <div class="quotePanelHeader">
              <div>
                <p class="quotePanelEyebrow">Ausgewähltes Thema</p>
                <h3>{selectedTheme.label}</h3>
              </div>
              <p class="quotePanelMeta">
                {formatInteger(selectedThemeVisibleStatementCount)} Aussagen in der
                aktuellen Auswahl
              </p>
            </div>

            {#if selectedThemeQuotes.length > 0}
              <div class="quoteList">
                {#each selectedThemeQuotes as quote}
                  <article class="quoteCard">
                    <p class="quoteText">“{quote.text}”</p>
                    <p class="quoteSource">
                      {quote.sourceFieldLabel}
                      {#if quote.statusGroupLabel}
                        · {quote.statusGroupLabel}
                      {/if}
                    </p>
                  </article>
                {/each}
              </div>
            {:else}
              <p class="statusMessage">
                Für die aktuelle Auswahl ist zu diesem Thema derzeit kein
                Beispielzitat hinterlegt.
              </p>
            {/if}
          </div>
        {/if}
      </div>
    {:else}
      <p class="statusMessage">
        Für die aktuell sichtbaren Personengruppen liegen keine vorbereiteten
        qualitativen Aussagen vor.
      </p>
    {/if}
  </DashboardChartSection>
{/if}

<style>
  .qualitativeModuleStack {
    display: grid;
    gap: 18px;
  }

  .quoteSelectorPanel,
  .quotePanel {
    padding: 16px;
    border: 1px solid #d8e0e8;
    border-radius: 14px;
    background: #f9fbfd;
  }

  .quoteSelectorLabel,
  .quotePanelEyebrow,
  .quotePanelMeta,
  .quoteSource,
  .quoteThemeButtonMeta,
  .quoteThemeButtonLabel,
  .quoteText {
    margin: 0;
  }

  .quoteSelectorLabel,
  .quotePanelEyebrow {
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: #46617c;
  }

  .quoteThemeList {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }

  .quoteThemeButton {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px 14px;
    border: 1px solid #c8d2dc;
    border-radius: 20px;
    background: #ffffff;
    color: #314252;
    text-align: left;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      background-color 0.15s ease,
      box-shadow 0.15s ease;
  }

  .quoteThemeButton:hover,
  .quoteThemeButton:focus-visible {
    border-color: #9fb0c1;
    outline: none;
  }

  .quoteThemeButton.is-active {
    background: #eef4fb;
    border-color: #7b98b7;
    box-shadow: inset 0 0 0 1px rgba(70, 97, 124, 0.12);
  }

  .quoteThemeButtonLabel {
    font-weight: 600;
    color: #18212b;
  }

  .quoteThemeButtonMeta,
  .quotePanelMeta,
  .quoteSource {
    color: #506070;
  }

  .quotePanelHeader {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 10px 16px;
    align-items: end;
  }

  .quotePanelHeader h3 {
    margin: 4px 0 0;
    color: #18212b;
  }

  .quoteList {
    display: grid;
    gap: 12px;
    margin-top: 14px;
  }

  .quoteCard {
    padding: 14px;
    border: 1px solid #d8e0e8;
    border-radius: 12px;
    background: #ffffff;
  }

  .quoteText {
    color: #243446;
  }

  .quoteSource {
    margin-top: 10px;
    font-size: 0.92rem;
  }
</style>
