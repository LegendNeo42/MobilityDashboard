import { derived, writable } from "svelte/store";
import { statusGroupDefinitions } from "../data/domain";
import type { MeasureMode, StatusGroupKey } from "../data/domain";

export type DashboardFilterState = {
  statusGroups: StatusGroupKey[];
  measureMode: MeasureMode;
  transportMode: string | null;
  region: string | null;
};

const allStatusGroupKeys = statusGroupDefinitions.map((definition) => definition.key);

const initialDashboardFilters: DashboardFilterState = {
  statusGroups: [...allStatusGroupKeys],
  measureMode: "absolute",
  transportMode: null,
  region: null,
};

export const dashboardFilters = writable<DashboardFilterState>(
  initialDashboardFilters,
);

export const selectedStatusGroupKeys = derived(dashboardFilters, ($filters) => {
  return $filters.statusGroups.length > 0
    ? $filters.statusGroups
    : [...allStatusGroupKeys];
});

export const allStatusGroupsSelected = derived(
  dashboardFilters,
  ($filters) => $filters.statusGroups.length === allStatusGroupKeys.length,
);

export function setStatusGroupFilters(values: StatusGroupKey[]): void {
  const nextValues = allStatusGroupKeys.filter((key) => values.includes(key));

  dashboardFilters.update((filters) => ({
    ...filters,
    statusGroups: nextValues.length > 0 ? nextValues : [...allStatusGroupKeys],
  }));
}

export function toggleStatusGroupFilter(value: StatusGroupKey): void {
  dashboardFilters.update((filters) => {
    const nextValues = filters.statusGroups.includes(value)
      ? filters.statusGroups.filter((key) => key !== value)
      : [...filters.statusGroups, value];

    return {
      ...filters,
      statusGroups:
        nextValues.length > 0 ? nextValues : [...allStatusGroupKeys],
    };
  });
}

export function selectAllStatusGroupFilters(): void {
  dashboardFilters.update((filters) => ({
    ...filters,
    statusGroups: [...allStatusGroupKeys],
  }));
}

export function setMeasureModeFilter(value: MeasureMode): void {
  dashboardFilters.update((filters) => ({
    ...filters,
    measureMode: value,
  }));
}