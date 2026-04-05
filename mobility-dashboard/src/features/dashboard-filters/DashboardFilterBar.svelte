<script lang="ts">
  import { measureModes, statusGroupDefinitions } from "../../data/domain";
  import type { MeasureMode, StatusGroupKey } from "../../data/domain";
  import {
    allStatusGroupsSelected,
    dashboardFilters,
    selectAllStatusGroupFilters,
    setMeasureModeFilter,
    toggleStatusGroupFilter,
  } from "../../stores/dashboardFilters";

  function handleMeasureModeChange(event: Event) {
    const target = event.currentTarget as HTMLSelectElement;
    setMeasureModeFilter(target.value as MeasureMode);
  }

  function handleStatusGroupToggle(key: StatusGroupKey) {
    toggleStatusGroupFilter(key);
  }
</script>

<section class="dashboardSection">
  <div class="panel">
    <div class="sectionHeader">
      <p class="sectionEyebrow">Filter</p>
      <h2>Dashboard-Filter</h2>
      <p class="sectionText">
        Die Auswahl gilt für alle Ansichten, die an den gemeinsamen
        Dashboard-Filter angebunden sind.
      </p>
    </div>

    <div class="toolbar dashboardFilterToolbar">
      <div class="field statusGroupField">
        <span>Personengruppen</span>

        <div class="statusGroupList" role="group" aria-label="Personengruppen">
          <button
            type="button"
            class="filterChip"
            class:is-active={$allStatusGroupsSelected}
            on:click={selectAllStatusGroupFilters}
          >
            <span class="filterChipLabel">Alle</span>
          </button>

          {#each statusGroupDefinitions as definition}
            <button
              type="button"
              class="filterChip"
              class:is-active={$dashboardFilters.statusGroups.includes(definition.key)}
              on:click={() => handleStatusGroupToggle(definition.key)}
            >
              <span
                class="filterChipSwatch"
                style={`background-color: ${definition.color};`}
                aria-hidden="true"
              ></span>
              <span class="filterChipLabel">{definition.label}</span>
            </button>
          {/each}
        </div>
      </div>

      <label class="field">
        <span>Maß</span>
        <select
          value={$dashboardFilters.measureMode}
          on:change={handleMeasureModeChange}
        >
          {#each measureModes as option}
            <option value={option.key}>{option.label}</option>
          {/each}
        </select>
      </label>
    </div>
  </div>
</section>