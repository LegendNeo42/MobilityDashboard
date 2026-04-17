<script lang="ts">
  import { onMount } from "svelte";
  import { loadSurveyMetadata } from "../../data/surveyMetadata";
  import type { SurveyMetadata } from "../../data/surveyMetadata";
  import { formatSemesterTime } from "../../utils/semester";

  let error = $state<string | null>(null);
  let metadata = $state<SurveyMetadata | null>(null);

  const semesterContextLabels = $derived.by(() => {
    if (!metadata) return [];
    return metadata.semesterTimes.map(formatSemesterTime);
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
          <dt>Berücksichtigte Semesterkontexte</dt>
          <dd class="surveyContextList">
            {#each semesterContextLabels as label}
              <div>{label}</div>
            {/each}
          </dd>
        </div>
      </dl>
    </article>

    <article class="panel contextPanel">
      <h3>Begriffe und Lesehilfe</h3>
      <dl class="contextFactList">
        <div>
          <dt>Modal Split</dt>
          <dd>
            Der Modal Split beschreibt, wie sich die Wege innerhalb der sichtbaren
            Auswahl auf verschiedene Hauptverkehrsmittel verteilen.
          </dd>
        </div>
        <div>
          <dt>Hauptverkehrsmittel</dt>
          <dd>
            Damit ist das Verkehrsmittel gemeint, das eine Person für ihren Weg zur
            Universität als wichtigstes angegeben hat.
          </dd>
        </div>
        <div>
          <dt>Prozentwerte</dt>
          <dd>
            Prozentwerte beziehen sich immer auf die jeweils sichtbare Auswahl,
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

    <article class="panel contextPanel">
      <h3>So sind die Werte zu lesen</h3>
      <ul class="contextList">
        <li>Die Ansichten zeigen aggregierte Umfragedaten, keine Einzelantworten.</li>
        <li>
          Je nach Frage können Mehrfachnennungen, fehlende Antworten oder
          Antworten ohne Meinung die Vergleichbarkeit beeinflussen.
        </li>
        <li>
          Deshalb können sich Fallzahlen und Prozentwerte zwischen verschiedenen
          Diagrammen bewusst unterscheiden.
        </li>
        <li>
          Hinweise direkt unter den Diagrammen erklären jeweils, was genau gezählt
          oder prozentual verglichen wird.
        </li>
      </ul>
    </article>

    <article class="panel contextPanel">
      <h3>Hinweis zur Distanzdarstellung</h3>
      <ul class="contextList">
        <li>
          Das Distanzdiagramm basiert auf der Distanz, die Teilnehmende für ihr
          jeweiliges Hauptverkehrsmittel angegeben haben.
        </li>
        <li>
          Diese Angabe entspricht deshalb nicht zwingend der gesamten Distanz
          zwischen Wohnort und Universität, sondern der beim Hauptverkehrsmittel
          erfassten Strecke.
        </li>
        <li>
          Exakte <strong>0,0-km-Angaben</strong> werden nur aus der Distanzanalyse
          ausgeschlossen, weil sie keine sinnvoll interpretierbare zurückgelegte
          Distanz darstellen.
        </li>
        <li>
          Zusätzlich werden Angaben mit <strong>Zu Fuß</strong> und einer Distanz von
          <strong>mehr als 50 km</strong> in dieser Distanzansicht nicht gezeigt.
          Solche Werte sind als täglicher Fußweg nicht plausibel und deuten eher auf
          uneinheitliche oder fehlerhafte Eingaben hin.
        </li>
        <li>Die übrigen Auswertungen bleiben davon unberührt.</li>
      </ul>
    </article>

    <article class="panel contextPanel">
      <h3>So ist die qualitative Themenübersicht zu lesen</h3>
      <ul class="contextList">
        <li>
          Die qualitative Übersicht basiert auf offenen Kommentaren aus der
          Mobilitätsumfrage.
        </li>
        <li>
          Die Antworten wurden bereinigt und zu einer kleinen Zahl wiederkehrender
          Themen gebündelt.
        </li>
        <li>
          Jede vorbereitete Aussage wurde in dieser ersten Version genau einem
          Hauptthema zugeordnet.
        </li>
        <li>
          Im absoluten Modus zeigt die Grafik gezählte Aussagen je Thema und
          Personengruppe.
        </li>
        <li>
          Im Prozentmodus zeigt sie den Anteil innerhalb der jeweiligen
          Personengruppe, der zu diesem Thema mindestens eine Aussage gemacht hat.
        </li>
        <li>
          Einzelne Zuordnungen können in seltenen Grenzfällen ungenau sein, da sie
          auf einem einfachen regelbasierten Schema beruhen.
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
          Die Vergleichsansichten konzentrieren sich auf Studierende,
          Mitarbeitende und Professor:innen.
        </li>
        <li>
          Die Restgruppe <strong>Andere</strong> wird aus Übersichtsgründen
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