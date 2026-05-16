<script lang="ts">
  import { onMount } from "svelte";
  import { loadSurveyMetadata } from "../../data/surveyMetadata";
  import type { SurveyMetadata } from "../../data/surveyMetadata";

  let error = $state<string | null>(null);
  let metadata = $state<SurveyMetadata | null>(null);

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
    <article class="panel contextPanel contextPanel--basis">
      <h3>Datengrundlage</h3>
      <p class="contextCardIntro">
        Diese Angaben ordnen ein, welche Umfragebasis im Dashboard ausgewertet wird.
      </p>

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
          <dt>Beteiligung</dt>
          <dd>{metadata.universityParticipationRatePercent} % der UR-Mitglieder</dd>
        </div>
        <div>
          <dt>Freitext-Feedback</dt>
          <dd>rund {formatInteger(metadata.approxFreeTextResponses)} Kommentare</dd>
        </div>
      </dl>
    </article>

    <article class="panel contextPanel contextPanel--values">
      <h3>So sind die Werte zu lesen</h3>
      <p class="contextCardIntro">
        Die Diagramme nutzen je nach Frage unterschiedliche Zählweisen.
      </p>

      <ul class="contextList">
        <li>Die Ansichten zeigen aggregierte Umfragedaten, keine Einzelantworten.</li>
        <li>
          Mehrfachnennungen, fehlende Antworten oder Antworten ohne Meinung können die
          Vergleichbarkeit beeinflussen.
        </li>
        <li>
          Deshalb können sich Fallzahlen und Prozentwerte zwischen Diagrammen bewusst
          unterscheiden.
        </li>
        <li>
          Hinweise direkt bei den Diagrammen erklären jeweils den Nenner.
        </li>
      </ul>
    </article>

    <article class="panel contextPanel contextPanel--limits">
      <h3>Wichtige Grenzen der Daten</h3>
      <p class="contextCardIntro">
        Die Ergebnisse sind als Umfrage-auswertung zu lesen, nicht als
        Messung aller Wege zur Universität.
      </p>

      <ul class="contextList">
        <li>Die Angaben beruhen auf Selbstauskünften der Teilnehmenden.</li>
        <li>
          Die Stichprobe ist nicht repräsentativ für die gesamte Universität.
        </li>
          <li>
          Der aktuelle Wohnort der Teilnehmenden kann veraltet sein.
        </li>
        <li>
          Die Datenqualität ist besonders für die Vorlesungszeit im Wintersemester
          belastbar.
        </li>
        <li>
          Postleitzahlen zeigen regionale Herkunftsbereiche, aber keine exakten Wege,
          Routen oder Adressen.
        </li>
      </ul>
    </article>

    <article class="panel contextPanel contextPanel--display">
      <h3>Darstellung im Dashboard</h3>
      <p class="contextCardIntro">
        Die sichtbaren Gruppen sind bewusst reduziert, damit Vergleiche konsistent
        bleiben.
      </p>

      <ul class="contextList">
        <li>
          Die Vergleichsansichten konzentrieren sich auf Studierende, Mitarbeitende und
          Professor:innen.
        </li>
        <li>
          Die Restgruppe <strong>Andere</strong> wird nicht separat gezeigt. Sie umfasst
          <strong>{formatInteger(metadata.otherGroupResponses)}</strong> gültige
          Antworten.
        </li>
        <li>
          Deshalb kann die Summe sichtbarer Gruppen unter der gesamten Zahl gültiger
          Antworten liegen.
        </li>
        <li>
          Fallzahlen können je nach Frage abweichen, wenn Angaben für eine Auswertung
          fehlen.
        </li>
      </ul>
    </article>
  </div>
{/if}
