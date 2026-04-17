import {
  statusGroupColors,
  statusGroupLabels,
} from "../../../data/domain";

export function createVehicleUsageByGroupSpec() {
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v6.json",
    width: "container",
    height: 480,
    autosize: { type: "fit-x", contains: "padding" },
    padding: { left: 20, right: 20, top: 10, bottom: 10},
    params: [
      { name: "sortMode", value: "fixed" },
      { name: "measureMode", value: "absolute" },
    ],
    transform: [
      {
        joinaggregate: [{ op: "sum", field: "people", as: "vehicle_total" }],
        groupby: ["vehicle_label"],
      },
      {
        calculate:
          "sortMode === 'fixed' ? datum.vehicle_order : -datum.vehicle_total + datum.vehicle_order * 0.001",
        as: "vehicle_sort_val",
      },
      {
        calculate:
          "datum.participants > 0 ? (datum.people / datum.participants) * 100 : 0",
        as: "usage_share_percent",
      },
      {
        calculate: "round(datum.usage_share_percent * 10) / 10",
        as: "usage_share_percent_1",
      },
      {
        calculate:
          "measureMode === 'absolute' ? datum.people : datum.usage_share_percent_1",
        as: "metric_value",
      },
    ],
    data: { name: "table" },
    mark: { type: "bar" },
    encoding: {
      y: {
        field: "vehicle_label",
        type: "nominal",
        title: null,
        sort: { field: "vehicle_sort_val", order: "ascending" },
        axis: { labelLimit: 160 },
      },
      yOffset: { field: "group_label" },
      x: {
        field: "metric_value",
        type: "quantitative",
        title: null,
        axis: {
          grid: true,
          tickMinStep: 1,
          labelExpr:
            "measureMode === 'absolute' ? format(datum.value, ',d') : format(datum.value, '.0f') + '%'",
        },
        scale: {
          zero: true,
          domainRaw: {
            signal: "measureMode === 'percent' ? [0, 100] : null",
          },
        },
      },
      color: {
        field: "group_label",
        type: "nominal",
        title: "Personengruppe",
        scale: {
          domain: statusGroupLabels,
          range: statusGroupColors,
        },
        legend: null,
      },
      tooltip: [
        { field: "vehicle_label", type: "nominal", title: "Verkehrsmittel" },
        { field: "group_label", type: "nominal", title: "Personengruppe" },
        { field: "people", type: "quantitative", title: "Anzahl Personen" },
        {
          field: "usage_share_percent_1",
          type: "quantitative",
          title: "Anteil innerhalb der Personengruppe (%)",
          format: ".1f",
        },
        {
          field: "participants",
          type: "quantitative",
          title: "Fallzahl der Personengruppe (n)",
        },
      ],
    },
  };
}