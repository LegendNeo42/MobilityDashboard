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
    <article class="panel contextPanel contextPanel--general contextPanel--basis">
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

    <article class="panel contextPanel contextPanel--analysis contextPanel--terms">
      <h3>Begriffe und Lesehilfe</h3>
      <p class="contextCardIntro">
        Diese Begriffe werden in mehreren Diagrammen und in der Regionalsicht verwendet.
      </p>

      <dl class="contextFactList">
        <div>
          <dt>Modal Split</dt>
          <dd>
            Der Modal Split beschreibt, wie sich Wege innerhalb der sichtbaren Auswahl
            auf Hauptverkehrsmittel verteilen.
          </dd>
        </div>
        <div>
          <dt>Prozentwerte</dt>
          <dd>
            Prozentwerte beziehen sich auf die jeweils sichtbare Auswahl,
            Distanzklasse, Personengruppe oder das jeweilige Thema.
          </dd>
        </div>
        <div>
          <dt>n / Fallzahl</dt>
          <dd>
            Das angezeigte <strong>n</strong> beschreibt, auf wie vielen Fällen die
            aktuelle Ansicht oder Filterung basiert.
          </dd>
        </div>
      </dl>
    </article>

    <article class="panel contextPanel contextPanel--analysis contextPanel--distance">
      <h3>Hinweis zur Distanzdarstellung</h3>
      <p class="contextCardIntro">
        Die Distanzansicht zeigt Muster entlang von Entfernungsbereichen, keine exakte
        Rekonstruktion einzelner Wege.
      </p>

      <ul class="contextList">
        <li>
          Die Distanz basiert auf der Angabe zum jeweiligen Hauptverkehrsmittel.
        </li>
        <li>
          Sie entspricht nicht zwingend der gesamten Strecke zwischen Wohnort und
          Universität.
        </li>
        <li>
          Exakte <strong>0,0-km-Angaben</strong> werden nur aus der Distanzanalyse
          ausgeschlossen.
        </li>
        <li>
          Angaben mit <strong>Zu Fuß</strong> und <strong>mehr als 50 km</strong>
          werden in dieser Distanzansicht nicht gezeigt.
        </li>
        <li>Die übrigen Auswertungen bleiben davon unberührt.</li>
      </ul>
    </article>

    <article class="panel contextPanel contextPanel--region contextPanel--map">
      <h3>Regionale PLZ-Karte</h3>
      <p class="contextCardIntro">
        Die Karte ist eine vorbereitete Fokusansicht auf die Region um Regensburg.
      </p>

      <ul class="contextList">
        <li>
          Gezeigt werden PLZ-Bereiche mit mindestens einer zuordenbaren Umfrageangabe.
        </li>
        <li>
          Die Formen wurden für eine flüssige Darstellung vereinfacht aufbereitet.
        </li>
        <li>
          Die Karte ist kein vollständiges Bild aller möglichen Wohnorte.
        </li>
        <li>
          Sie zeigt surveybasierte Herkunftsbereiche, keine exakten Wohnorte oder
          Pendelrouten.
        </li>
        <li>
          Werte beziehen sich auf die gewählte Semesterzeit und die aktiven Filter.
        </li>
      </ul>
    </article>

    <article class="panel contextPanel contextPanel--general contextPanel--values">
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
          Hinweise direkt unter den Diagrammen erklären jeweils den Nenner.
        </li>
      </ul>
    </article>

    <article class="panel contextPanel contextPanel--general contextPanel--qualitative">
      <h3>Qualitative Themenübersicht</h3>
      <p class="contextCardIntro">
        Die qualitative Übersicht verdichtet offene Kommentare zu wiederkehrenden
        Themen.
      </p>

      <ul class="contextList">
        <li>Die Übersicht basiert auf offenen Kommentaren aus der Mobilitätsumfrage.</li>
        <li>
          Die Antworten wurden bereinigt und zu einer kleinen Zahl wiederkehrender
          Themen gebündelt.
        </li>
        <li>
          Jede vorbereitete Aussage wurde genau einem Hauptthema zugeordnet.
        </li>
        <li>
          Absolutwerte zeigen gezählte Aussagen; Prozentwerte zeigen Anteile innerhalb
          der jeweiligen Personengruppe.
        </li>
        <li>
          Einzelne Zuordnungen können in seltenen Grenzfällen ungenau sein.
        </li>
      </ul>
    </article>

    <article class="panel contextPanel contextPanel--general contextPanel--limits">
      <h3>Wichtige Grenzen der Daten</h3>
      <p class="contextCardIntro">
        Die Ergebnisse sind als Umfrageauswertung zu lesen, nicht als vollständige
        Messung aller Wege zur Universität.
      </p>

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
          Postleitzahlen zeigen regionale Herkunftsbereiche, aber keine exakten Wege,
          Routen oder Adressen.
        </li>
      </ul>
    </article>

    <article class="panel contextPanel contextPanel--general contextPanel--display">
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