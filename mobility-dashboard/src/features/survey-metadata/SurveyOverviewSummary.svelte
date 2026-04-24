<script lang="ts">
  import { onMount } from "svelte";
  import { loadDashboardOverviewSummary } from "../../data/overview";
  import type { DashboardOverviewSummary } from "../../data/overview";

  let error = $state<string | null>(null);
  let overview = $state<DashboardOverviewSummary | null>(null);

  function formatInteger(value: number): string {
    return new Intl.NumberFormat("de-DE").format(value);
  }

  function formatPercent(value: number): string {
    return new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
  }

  function formatWholePercent(value: number): string {
    return new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  onMount(async () => {
    try {
      overview = await loadDashboardOverviewSummary();
    } catch (loadError) {
      error = loadError instanceof Error ? loadError.message : String(loadError);
    }
  });
</script>

<div class="overviewSummaryStack">
  {#if error}
    <div class="panel surveySummaryPanel">
      <p class="statusMessage">Fehler: {error}</p>
    </div>
  {:else if !overview}
    <div class="panel surveySummaryPanel">
      <p class="statusMessage">Lade Datenbasis…</p>
    </div>
  {:else}
    <div class="overviewDetailGrid">
      <article class="panel participationPanel">
        <div class="participationHeader">
          <p class="sectionEyebrow">Beteiligung</p>
          <h3>So verteilt sich die Stichprobe</h3>
          <p class="sectionText">
            <strong>{formatInteger(overview.validResponses)} gültige Antworten</strong>
            liegen insgesamt vor. Das entspricht
            <strong> {formatWholePercent(overview.universityParticipationRatePercent)} %</strong>
            der UR-Mitglieder.
          </p>
          <p class="sectionText">
            Die drei Hauptgruppen im Dashboard decken
            {formatPercent(overview.mainGroupCoverageShare)} % der gültigen
            Antworten ab.
          </p>
        </div>

        <div class="participationList" role="list">
          {#each overview.participationGroups as group}
            <article class="participationRow" role="listitem">
              <div class="participationMain">
                <div>
                  <p class="participationLabel">{group.label}</p>
                  <p class="participationMeta">
                    {formatPercent(group.shareOfValidResponses)} % der gültigen
                    Antworten
                  </p>
                </div>

                <p class="participationValue">{formatInteger(group.participants)}</p>
              </div>

              {#if group.participationRatePercent !== null}
                <p class="participationRate">
                  Beteiligungsquote:
                  <strong>{formatWholePercent(group.participationRatePercent)} %</strong>
                </p>
              {:else if group.participationRateBreakdown.length > 0}
                <div
                  class="participationRateList"
                  aria-label="Beteiligungsquoten der Teilgruppen"
                >
                  {#each group.participationRateBreakdown as rate}
                    <p>
                      Beteiligungsquote {rate.label}:
                      <strong>{formatWholePercent(rate.participationRatePercent)} %</strong>
                    </p>
                  {/each}
                </div>
              {/if}
            </article>
          {/each}
        </div>

        <p class="participationFootnote">
          Die übrigen <strong>{formatInteger(overview.otherGroupResponses)}</strong>
          gültigen Antworten werden in den Kernansichten nicht separat gezeigt.
        </p>
      </article>

      <article class="panel highlightPanel">
        <div>
          <p class="sectionEyebrow">Kernaussagen</p>
          <h3>Highlights auf einen Blick</h3>
        </div>

        <div class="overviewHighlightGrid" role="list">
          {#each overview.highlights as highlight}
            <article class="overviewHighlightCard" role="listitem">
              <p class="overviewHighlightEyebrow">{highlight.eyebrow}</p>
              <p class="overviewHighlightValue">{highlight.value}</p>
              <h4>{highlight.title}</h4>
              <p>{highlight.text}</p>
            </article>
          {/each}
        </div>
      </article>
    </div>
  {/if}
</div>