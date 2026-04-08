<script lang="ts">
  import { onMount } from "svelte";
  import { loadDashboardOverviewSummary } from "../../data/overview";
  import type { DashboardOverviewSummary } from "../../data/overview";
  import { formatSemesterTime } from "../../utils/semester";

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
            liegen insgesamt vor. Die drei Hauptgruppen im Dashboard decken
            {formatPercent(overview.mainGroupCoverageShare)} % davon ab.
          </p>
          <p class="sectionText">
            Mitarbeitende fassen wissenschaftsstützende und wissenschaftliche
            Mitarbeitende zusammen.
          </p>
        </div>

        <div class="participationList" role="list">
          {#each overview.participationGroups as group}
            <article class="participationRow" role="listitem">
              <div>
                <p class="participationLabel">{group.label}</p>
                <p class="participationMeta">
                  {formatPercent(group.shareOfValidResponses)} % der gültigen
                  Antworten
                </p>
              </div>

              <p class="participationValue">{formatInteger(group.participants)}</p>
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
          <p class="sectionEyebrow">Highlight</p>
          <h3>Häufigstes Verkehrsmittel</h3>
          <p class="highlightText">
            In {formatSemesterTime(overview.referenceSemesterTime)} wird
            <strong>{overview.topVehicleUsage.label}</strong> in der
            Verkehrsmittelansicht am häufigsten genannt:
            <strong>{formatInteger(overview.topVehicleUsage.people)} Personen</strong>.
            {#if overview.secondVehicleUsage}
              <strong>{overview.secondVehicleUsage.label}</strong> folgt mit
              <strong>{formatInteger(overview.secondVehicleUsage.people)} Personen</strong>.
            {/if}
          </p>
        </div>
      </article>
    </div>

    <div class="panel overviewBridgePanel">
      <div>
        <p class="sectionEyebrow">Weiterführende Ansichten</p>
        <h3>Von den Kennzahlen zu den Detailansichten</h3>
        <p class="sectionText">
          Im nächsten Abschnitt können Sie dieselben Themen nach
          Personengruppen und Darstellungsmaß vergleichen.
        </p>
      </div>

      <a class="overviewBridgeLink" href="#analysis">Zu den Kerncharts</a>
    </div>
  {/if}
</div>