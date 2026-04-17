import {
  distanceBucketDefinitions,
  transportModeDefinitions,
} from "../../../data/domain";

const distanceBucketLabels = distanceBucketDefinitions
  .slice()
  .sort((a, b) => a.order - b.order)
  .map((definition) => definition.label);

const transportModeLabels = transportModeDefinitions
  .slice()
  .sort((a, b) => a.order - b.order)
  .map((definition) => definition.label);

export function createModalSplitByDistanceSpec() {
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v6.json",
    width: "container",
    height: 440,
    autosize: { type: "fit-x", contains: "padding" },
    padding: { left: 70, right: 24, top: 10, bottom: 38 },
    params: [{ name: "measureMode", value: "absolute" }],
    transform: [
      {
        calculate:
          "datum.bucket_participants > 0 ? (datum.people / datum.bucket_participants) * 100 : 0",
        as: "bucket_share_percent",
      },
      {
        calculate: "round(datum.bucket_share_percent * 10) / 10",
        as: "bucket_share_percent_1",
      },
      {
        calculate:
          "measureMode === 'absolute' ? datum.people : datum.bucket_share_percent_1",
        as: "metric_value",
      },
    ],
    data: { name: "table" },
    mark: { type: "bar" },
    encoding: {
      x: {
        field: "distance_bucket_label",
        type: "nominal",
        title: null,
        sort: distanceBucketLabels,
        scale: {
          domain: distanceBucketLabels,
          paddingInner: 0.18,
          paddingOuter: 0.08,
        },
        axis: {
          labelAngle: 0,
          labelLimit: 120,
        },
      },
      y: {
        field: "metric_value",
        type: "quantitative",
        title: null,
        stack: "zero",
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
        field: "vehicle_label",
        type: "nominal",
        title: "Hauptverkehrsmittel",
        scale: {
          domain: transportModeLabels,
        },
        legend: {
          orient: "bottom",
          direction: "horizontal",
          columns: 2,
          symbolType: "square",
        },
      },
      order: {
        field: "vehicle_order",
        type: "quantitative",
        sort: "ascending",
      },
      tooltip: [
        { field: "distance_bucket_label", type: "nominal", title: "Distanzklasse" },
        { field: "vehicle_label", type: "nominal", title: "Hauptverkehrsmittel" },
        { field: "people", type: "quantitative", title: "Anzahl Personen" },
        {
          field: "bucket_share_percent_1",
          type: "quantitative",
          title: "Anteil innerhalb der Distanzklasse (%)",
          format: ".1f",
        },
        {
          field: "bucket_participants",
          type: "quantitative",
          title: "Fallzahl der Distanzklasse (n)",
        },
      ],
    },
  };
}