<script lang="ts">
  import { measureModes, statusGroupDefinitions } from "../../data/domain";
  import type { MeasureMode, StatusGroupKey } from "../../data/domain";
  import {
    dashboardFilters,
    setMeasureModeFilter,
    toggleStatusGroupFilter,
  } from "../../stores/dashboardFilters";

  const measureModeLabels: Record<MeasureMode, string> = {
    absolute: "Absolut",
    percent: "Prozent",
  };

  function handleMeasureModeChange(value: MeasureMode) {
    setMeasureModeFilter(value);
  }

  function handleStatusGroupToggle(key: StatusGroupKey) {
    toggleStatusGroupFilter(key);
  }
</script>

<aside class="dashboardFilterSection" aria-label="Dashboard-Filter">
  <div class="panel dashboardFilterPanel">
    <div class="sectionHeader dashboardFilterHeader">
      <p class="sectionEyebrow">Globaler Filter</p>
      <h2>Analyse filtern</h2>
      <p class="sectionText dashboardFilterText">
        Personengruppen gelten für alle Bereiche des Dashboards.  
      </p>
    </div>

    <div class="dashboardFilterToolbar">
      <div class="field statusGroupField">
        <span>Personengruppen</span>
        <div class="statusGroupList" role="group" aria-label="Personengruppen">
          {#each statusGroupDefinitions as definition}
            {@const isActive = $dashboardFilters.statusGroups.includes(
              definition.key,
            )}
            <button
              type="button"
              class="filterChip"
              class:is-active={isActive}
              aria-pressed={isActive}
              onclick={() => handleStatusGroupToggle(definition.key)}
            >
              <span class="filterChipIndicator" aria-hidden="true">
                {isActive ? "✓" : ""}
              </span>
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

      <div class="field dashboardFilterMeasureField">
        <span>Diagrammwerte</span>

        <div
          class="measureModeButtonGroup"
          role="group"
          aria-label="Diagrammwerte"
        >
          {#each measureModes as option}
            {@const isActive = $dashboardFilters.measureMode === option.key}
            <button
              type="button"
              class="measureModeButton"
              class:is-active={isActive}
              aria-pressed={isActive}
              onclick={() => handleMeasureModeChange(option.key)}
            >
              {measureModeLabels[option.key]}
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>
</aside>
