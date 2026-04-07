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

<div class="panel surveySummaryPanel">
  <div class="surveySummaryHeader">
    <p class="sectionEyebrow">Datengrundlage</p>
    <h3>Worauf die Auswertungen basieren</h3>
    <p class="sectionText">
      Das Dashboard zeigt aggregierte Ergebnisse der Mobilitätsumfrage der
      Universität Regensburg.
    </p>
  </div>

  {#if error}
    <p class="statusMessage">Fehler: {error}</p>
  {:else if !metadata}
    <p class="statusMessage">Lade Datenbasis…</p>
  {:else}
    <div class="surveySummaryGrid">
      <article class="surveyInfoCard">
        <p class="surveyInfoLabel">Umfragezeitraum</p>
        <p class="surveyInfoValue">{metadata.surveyPeriodLabel}</p>
      </article>

      <article class="surveyInfoCard">
        <p class="surveyInfoLabel">Gültige Antworten</p>
        <p class="surveyInfoValue">{formatInteger(metadata.validResponses)}</p>
      </article>

      <article class="surveyInfoCard">
        <p class="surveyInfoLabel">Semesterkontexte im Datensatz</p>
        <div class="surveyInfoValue surveyInfoValue--small surveyContextList surveyContextList--compact">
          {#each semesterContextLabels as label}
            <div>{label}</div>
          {/each}
        </div>
      </article>
    </div>
  {/if}
</div>