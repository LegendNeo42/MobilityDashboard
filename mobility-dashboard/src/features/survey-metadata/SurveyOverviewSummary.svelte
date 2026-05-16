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
      error =
        loadError instanceof Error ? loadError.message : String(loadError);
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
          <h3>Datenbasis und Stichprobe</h3>

          <ul class="participationFactList" aria-label="Datenbasis und Beteiligung">
            <li class="participationFactItem">
              <span class="participationFactLabel">Basis</span>
              <strong>{overview.surveyLabel}</strong>
              <span>{overview.surveyPeriodLabel}</span>
            </li>
            <li class="participationFactItem">
              <span class="participationFactLabel">Antworten</span>
              <strong>{formatInteger(overview.validResponses)}</strong>
              <span>in der Stichprobe</span>
            </li>
            <li class="participationFactItem">
              <span class="participationFactLabel">Beteiligung</span>
              <strong
                >{formatWholePercent(overview.universityParticipationRatePercent)} %</strong
              >
              <span>der UR-Mitglieder</span>
            </li>
          </ul>
        </div>

        <div class="participationList" role="list">
          {#each overview.participationGroups as group}
            <article class="participationRow" role="listitem">
              <div class="participationMain">
                <div>
                  <p class="participationLabel">{group.label}</p>
                  <p class="participationMeta">
                    {formatPercent(group.shareOfValidResponses)} % der Antworten
                  </p>
                </div>

                <p class="participationValue">
                  {formatInteger(group.participants)}
                </p>
              </div>

              {#if group.participationRatePercent !== null}
                <p class="participationRate">
                  <span>Beteiligungsquote</span>
                  <strong
                    >{formatWholePercent(group.participationRatePercent)} %</strong
                  >
                </p>
              {:else if group.participationRateBreakdown.length > 0}
                <div
                  class="participationRateList"
                  aria-label="Beteiligungsquoten der Teilgruppen"
                >
                  {#each group.participationRateBreakdown as rate}
                    <p>
                      <span>{rate.label}</span>
                      <strong
                        >{formatWholePercent(rate.participationRatePercent)} %</strong
                      >
                    </p>
                  {/each}
                </div>
              {/if}
            </article>
          {/each}
        </div>
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
              <div class="overviewHighlightMain">
                <h4>{highlight.title}</h4>
                <p class="overviewHighlightValue">{highlight.value}</p>
              </div>
              <p>{highlight.text}</p>
            </article>
          {/each}
        </div>
      </article>
    </div>
  {/if}
</div>
