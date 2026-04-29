<script lang="ts">
  import { onMount } from "svelte";
  import { loadDashboardOverviewSummary } from "../../data/overview";
  import type { DashboardOverviewSummary } from "../../data/overview";

  let error = $state<string | null>(null);
  let overview = $state<DashboardOverviewSummary | null>(null);

  const dashboardAreas = [
    {
      label: "Überblick",
      text: "Beteiligung und zentrale Kernaussagen.",
      targetId: "overview",
      arrow: "↑",
      theme: "overview",
    },
    {
      label: "Analyse",
      text: "Verkehrsmittel, Distanzen und Hürden.",
      targetId: "analysis",
      arrow: "↓",
      theme: "analysis",
    },
    {
      label: "Freitext",
      text: "Themen aus offenen Antworten.",
      targetId: "qualitative",
      arrow: "↓",
      theme: "analysis",
    },
    {
      label: "Region",
      text: "PLZ-Karte mit regionalen Mustern.",
      targetId: "region",
      arrow: "↓",
      theme: "region",
    },
    {
      label: "Kontext",
      text: "Datengrundlage und Einordnung.",
      targetId: "context",
      arrow: "↓",
      theme: "context",
    },
  ];

  const readingAids = [
    {
      term: "n",
      text: "zeigt, wie viele Personen oder Fälle in der aktuellen Ansicht berücksichtigt werden.",
    },
    {
      term: "Prozentwerte",
      text: "beziehen sich immer auf die gerade sichtbare Auswahl, nicht auf alle Universitätsangehörigen.",
    },
    {
      term: "Zählweise",
      text: "variiert je nach Ansicht: Manche Diagramme zählen Personen, andere Antworten oder vorbereitete Aussagen.",
    },
    {
      term: "Filter",
      text: "ändern die sichtbare Auswahl und damit auch n, Prozentwerte und absolute Werte.",
    },
  ];

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
          <h3>So verteilt sich die Stichprobe</h3>
          <p class="sectionText">
            <strong>{formatInteger(overview.validResponses)} Antworten</strong>
            liegen insgesamt vor. Das entspricht
            <strong>
              {formatWholePercent(overview.universityParticipationRatePercent)} %</strong
            >
            der UR-Mitglieder.
          </p>
          <p class="sectionText">
            Die drei Hauptgruppen (Studierende, Mitarbeitende, Professor:innen)
            decken
            {formatPercent(overview.mainGroupCoverageShare)}% der Antworten ab.
          </p>
          <p class="participationFootnote">
            Die übrigen <strong
              >{formatInteger(overview.otherGroupResponses)}</strong
            >
            Antworten werden in den Kernansichten nicht separat gezeigt.
          </p>
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
                  Beteiligungsquote:
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
                      Beteiligungsquote {rate.label}:
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

    <div class="overviewSupportGrid">
      <article class="panel overviewOrientationPanel">
        <div class="overviewSupportHeader">
          <p class="sectionEyebrow">Orientierung</p>
          <h3>So ist das Dashboard aufgebaut</h3>
          <p class="sectionText">
            Die Bereiche bauen vom schnellen Überblick zu den Detailansichten
            und zur methodischen Einordnung auf.
          </p>
        </div>

        <ul class="dashboardAreaList">
          {#each dashboardAreas as area}
            <li class="dashboardAreaListItem">
              <a
                class="dashboardAreaItem"
                class:theme-overview={area.theme === "overview"}
                class:theme-analysis={area.theme === "analysis"}
                class:theme-region={area.theme === "region"}
                class:theme-context={area.theme === "context"}
                href={`#${area.targetId}`}
              >
                <span class="dashboardAreaTitle">
                  <span>{area.label}</span>
                  <span class="dashboardAreaArrow" aria-hidden="true"
                    >{area.arrow}</span
                  >
                </span>
                <p>{area.text}</p>
              </a>
            </li>
          {/each}
        </ul>
      </article>

      <article class="panel overviewReadingAidPanel">
        <div class="overviewSupportHeader">
          <p class="sectionEyebrow">Lesehilfe</p>
          <h3>Werte richtig einordnen</h3>
          <p class="sectionText">
            Diese Hinweise helfen beim Lesen der Diagramme und der Karte.
          </p>
        </div>

        <div class="readingAidList" role="list">
          {#each readingAids as aid}
            <div class="readingAidItem" role="listitem">
              <strong>{aid.term}</strong>
              <span>{aid.text}</span>
            </div>
          {/each}
        </div>
      </article>
    </div>
  {/if}
</div>
