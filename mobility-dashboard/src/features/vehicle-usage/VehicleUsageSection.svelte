<script lang="ts">
  import { onMount } from "svelte";
  import VegaLiteChart from "../../components/charts/VegaLiteChart.svelte";
  import {
    loadVehicleUsageByGroupData,
    type VehicleUsageByGroupDataset,
  } from "../../data/vehicle";
  import { createVehicleUsageByGroupSpec } from "./charts/vehicleUsageByGroup";
  import { formatSemesterTime } from "../../utils/semester";

  const chartSpec = createVehicleUsageByGroupSpec();

  let error = $state<string | null>(null);
  let dataset = $state<VehicleUsageByGroupDataset | null>(null);
  let semesterTime = $state("");
  let sortMode = $state<"fixed" | "frequency">("fixed");
  let measureMode = $state<"absolute" | "percent">("absolute");

  onMount(async () => {
    try {
      const nextDataset = await loadVehicleUsageByGroupData();
      dataset = nextDataset;
      semesterTime = nextDataset.semesterOptions[0] ?? "";
    } catch (loadError) {
      error = loadError instanceof Error ? loadError.message : String(loadError);
    }
  });

  let values = $derived.by(() => {
    if (!dataset || !semesterTime) return [];

    return dataset.rows.filter((row) => row.semester_time === semesterTime);
  });

  let participantsInSelection = $derived.by(() => {
    if (!dataset || !semesterTime) return 0;

    return dataset.groupSummaries
      .filter((summary) => summary.semester_time === semesterTime)
      .reduce((total, summary) => total + summary.participants, 0);
  });

  let visibleVehicleCount = $derived.by(() => {
    const vehicleKeys = new Set(values.map((row) => row.vehicle));
    return vehicleKeys.size;
  });

  function formatInteger(value: number): string {
    return new Intl.NumberFormat("de-DE").format(value);
  }
</script>

<section class="dashboardSection">
  <div class="sectionHeader">
    <div>
      <p class="sectionEyebrow">Verkehrsmittel</p>
      <h2>Nutzung von Verkehrsmitteln nach Personengruppe</h2>
      <p class="sectionText">
        Die Ansicht vergleicht, welche Verkehrsmittel von Studierenden,
        Mitarbeitenden und Professor:innen im gewählten Zeitraum genutzt werden.
      </p>
    </div>
  </div>

  {#if error}
    <div class="panel">
      <p class="statusMessage">Fehler: {error}</p>
    </div>
  {:else if !dataset}
    <div class="panel">
      <p class="statusMessage">Lade Daten…</p>
    </div>
  {:else}
    <div class="panel">
      <div class="toolbar">
        <label class="field">
          <span>Semester-Zeit</span>
          <select bind:value={semesterTime}>
            {#each dataset.semesterOptions as option}
              <option value={option}>{formatSemesterTime(option)}</option>
            {/each}
          </select>
        </label>

        <label class="field">
          <span>Sortierung</span>
          <select bind:value={sortMode}>
            <option value="fixed">Fixe Reihenfolge</option>
            <option value="frequency">Nach Häufigkeit</option>
          </select>
        </label>

        <label class="field">
          <span>Maß</span>
          <select bind:value={measureMode}>
            <option value="absolute">Absolut</option>
            <option value="percent">Prozent</option>
          </select>
        </label>
      </div>

      <div class="chartMetaRow">
        <p class="chartMeta">
          Zeitraum: <strong>{formatSemesterTime(semesterTime)}</strong>
        </p>
        <p class="chartMeta">
          n = <strong>{formatInteger(participantsInSelection)}</strong>
        </p>
        <p class="chartMeta">
          Verkehrsmittel im Datensatz: <strong>{visibleVehicleCount}</strong>
        </p>
      </div>

      <p class="chartNote">
        Prozentwerte zeigen den Anteil an Fahrzeugnennungen innerhalb der jeweiligen
        Personengruppe. Mehrfachnennungen pro Person sind möglich.
      </p>

      <VegaLiteChart
        spec={chartSpec}
        dataName="table"
        dataValues={values}
        signals={{ sortMode, measureMode }}
      />
    </div>
  {/if}
</section>