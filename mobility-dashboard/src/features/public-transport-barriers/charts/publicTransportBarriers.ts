import { offsetEncodingScaleIgnored } from "vega-lite/types_unstable/log/message.js";
import { publicTransportBarrierDefinitions } from "../../../data/domain";

const barrierLabels = publicTransportBarrierDefinitions.map(
  (definition) => definition.label,
);

export function createPublicTransportBarrierSpec() {
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v6.json",
    width: "container",
    height: 420,
    autosize: { type: "fit-x", contains: "padding" },
    padding: { left: 29, right: 14, top: 10, bottom: 0 },
    params: [{ name: "measureMode", value: "absolute" }],
    data: { name: "table" },
    transform: [
      {
        calculate:
          "datum.segment_participants > 0 ? (datum.people / datum.segment_participants) * 100 : 0",
        as: "segment_share_percent",
      },
      {
        calculate: "round(datum.segment_share_percent * 10) / 10",
        as: "segment_share_percent_1",
      },
      {
        calculate:
          "measureMode === 'absolute' ? datum.people : datum.segment_share_percent_1",
        as: "unsigned_metric_value",
      },
      {
        calculate:
          "datum.response_key === 'yes' ? datum.unsigned_metric_value : -datum.unsigned_metric_value",
        as: "metric_value",
      },
      {
        calculate: "datum.response_key === 'yes' ? 'Ja' : 'Nein'",
        as: "response_side_label",
      },
    ],
    mark: { type: "bar" },
    encoding: {
      y: {
        field: "barrier_label",
        type: "nominal",
        title: null,
        sort: barrierLabels,
        axis: {
          labelLimit: 160,
        },
      },
      x: {
        field: "metric_value",
        type: "quantitative",
        title: null,
        axis: {
          grid: true,
          tickMinStep: 1,
          labelExpr:
            "measureMode === 'absolute' ? format(abs(datum.value), ',d') : format(abs(datum.value), '.0f') + '%'",
        },
        scale: {
          zero: true,
          domainRaw: {
            signal: "measureMode === 'percent' ? [-100, 100] : null",
          },
        },
      },
      color: {
        field: "response_side_label",
        type: "nominal",
        title: "Antwort",
        scale: {
          domain: ["Nein", "Ja"],
          range: ["#9fb3c8", "#f58518"],
        },
        legend: {
          orient: "bottom",
          direction: "horizontal",
          symbolType: "square",
          offset: 20,
          labelFontSize: 12,
          titleFontSize: 13,
        },
      },
      order: {
        field: "response_order",
        type: "quantitative",
        sort: "ascending",
      },
      tooltip: [
        { field: "barrier_label", type: "nominal", title: "Hürde" },
        { field: "response_side_label", type: "nominal", title: "Antwort" },
        { field: "people", type: "quantitative", title: "Anzahl Personen" },
        {
          field: "segment_share_percent_1",
          type: "quantitative",
          title: "Anteil innerhalb des Segments (%)",
          format: ".1f",
        },
        {
          field: "segment_participants",
          type: "quantitative",
          title: "Fallzahl des Segments (n)",
        },
      ],
    },
  };
}
