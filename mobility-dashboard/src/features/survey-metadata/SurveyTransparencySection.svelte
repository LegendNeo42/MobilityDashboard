<script lang="ts">
  import { onMount } from "svelte";
  import { loadSurveyMetadata } from "../../data/surveyMetadata";
  import type { SurveyMetadata } from "../../data/surveyMetadata";
  import { formatSemesterTime } from "../../utils/semester";

  let error = $state<string | null>(null);
  let metadata = $state<SurveyMetadata | null>(null);

  const semesterContextText = $derived.by(() => {
    if (!metadata) return "";
    return metadata.semesterTimes.map(formatSemesterTime).join(" · ");
  });

  function formatInteger(value: number): string {
    return new Intl.NumberFormat("de-DE").format(value);
  }

  onMount(async () => {
    try {
      metadata = await loadSurveyMetadata();
    } catch (loadError) {
      error = loadError instanceof Error ? loadError.message : String(loadError);
    }
  });
</script>

{#if error}
  <div class="panel contextPanel">
    <p class="statusMessage">Fehler: {error}</p>
  </div>
{:else if !metadata}
  <div class="panel contextPanel">
    <p class="statusMessage">Lade Datenbasis…</p>
  </div>
{:else}
  <div class="contextGrid">
    <article class="panel contextPanel">
      <h3>Datengrundlage</h3>
      <dl class="contextFactList">
        <div>
          <dt>Umfrage</dt>
          <dd>{metadata.surveyLabel}</dd>
        </div>
        <div>
          <dt>Umfragezeitraum</dt>
          <dd>{metadata.surveyPeriodLabel}</dd>
        </div>
        <div>
          <dt>Gültige Antworten</dt>
          <dd>{formatInteger(metadata.validResponses)}</dd>
        </div>
        <div>
          <dt>Freitext-Feedback</dt>
          <dd>rund {formatInteger(metadata.approxFreeTextResponses)} Kommentare</dd>
        </div>
        <div>
          <dt>Semesterkontexte</dt>
          <dd>{semesterContextText}</dd>
        </div>
      </dl>
    </article>

    <article class="panel contextPanel">
      <h3>So sind die Werte zu lesen</h3>
      <ul class="contextList">
        <li>Die Ansichten zeigen aggregierte Umfragedaten, keine Einzelantworten.</li>
        <li>Prozentwerte beziehen sich auf die jeweils sichtbare Auswahl.</li>
        <li>
          Das angezeigte <strong>n</strong> beschreibt die Fallzahl der aktuellen Ansicht
          oder Filterung.
        </li>
        <li>
          Je nach Frage können fehlende Antworten, keine Meinung oder
          Mehrfachnennungen die Vergleichbarkeit beeinflussen.
        </li>
      </ul>
    </article>

    <article class="panel contextPanel">
      <h3>Wichtige Grenzen der Daten</h3>
      <ul class="contextList">
        <li>Die Angaben beruhen auf Selbstauskünften der Teilnehmenden.</li>
        <li>
          Die Stichprobe ist nicht repräsentativ für die gesamte Universität.
          Hochgerechnete Werte sind deshalb nur grobe Schätzungen.
        </li>
        <li>
          Die Datenqualität ist besonders für die Vorlesungszeit im Wintersemester
          belastbar.
        </li>
        <li>
          Postleitzahlen zeigen regionale Herkunft, aber keine exakten Wege oder
          Routen.
        </li>
      </ul>
    </article>

    <article class="panel contextPanel">
      <h3>Hinweise zur Darstellung im Dashboard</h3>
      <ul class="contextList">
        <li>
          Die ersten Vergleichsansichten konzentrieren sich auf Studierende,
          Mitarbeitende und Professor:innen.
        </li>
        <li>
          Die kleine Restgruppe <strong>Other</strong> wird dort aus Übersichtsgründen
          nicht separat gezeigt. Sie umfasst
          <strong>{formatInteger(metadata.otherGroupResponses)}</strong> gültige
          Antworten.
        </li>
        <li>
          Deshalb kann die Summe sichtbarer Gruppen in einzelnen Ansichten unter der
          gesamten Zahl gültiger Antworten liegen.
        </li>
        <li>
          Zusätzlich können sich Fallzahlen je nach Frage unterscheiden, wenn für
          eine bestimmte Auswertung nicht von allen Teilnehmenden passende Angaben
          vorliegen.
        </li>
      </ul>
    </article>
  </div>
{/if}