import { importanceResponseDefinitions } from "../../../data/domain";

const responseLabels = importanceResponseDefinitions.map(
  (definition) => definition.label,
);

export function createPublicTransportImprovementSpec(options?: {
  height?: number;
  paddingLeft?: number;
  labelLimit?: number;
}) {
  const height = options?.height ?? 340;
  const paddingLeft = options?.paddingLeft ?? 44;
  const labelLimit = options?.labelLimit ?? 140;

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v6.json",
    width: "container",
    height,
    autosize: { type: "fit-x", contains: "padding" },
    padding: { left: paddingLeft, right: 14, top: 10, bottom: 10 },
    params: [{ name: "measureMode", value: "absolute" }],
    data: { name: "table" },
    transform: [
      {
        calculate:
          "measureMode === 'absolute' ? datum.absolute_start : datum.percent_start",
        as: "metric_start",
      },
      {
        calculate:
          "measureMode === 'absolute' ? datum.absolute_end : datum.percent_end",
        as: "metric_end",
      },
    ],
    mark: { type: "bar" },
    encoding: {
      y: {
        field: "topic_label",
        type: "nominal",
        title: null,
        sort: {
          field: "topic_sort_rank",
          order: "ascending",
        },
        axis: {
          labelLimit,
        },
      },
      x: {
        field: "metric_start",
        type: "quantitative",
        title: null,
        scale: {
          zero: true,
          domainRaw: {
            signal: "measureMode === 'percent' ? [-100, 100] : null",
          },
        },
        axis: {
          grid: true,
          tickMinStep: 1,
          labelExpr:
            "measureMode === 'absolute' ? format(abs(datum.value), ',d') : format(abs(datum.value), '.0f') + '%'",
        },
      },
      x2: {
        field: "metric_end",
      },
      color: {
        field: "response_label",
        type: "nominal",
        title: "Bewertung",
        sort: responseLabels,
        scale: {
          domain: responseLabels,
          range: ["#8fa4b8", "#c6d0da", "#e6ebf0", "#f5b14c", "#dc7f0f"],
        },
        legend: {
          orient: "bottom",
          direction: "horizontal",
          symbolType: "square",
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
        { field: "topic_label", type: "nominal", title: "Thema" },
        { field: "response_label", type: "nominal", title: "Bewertung" },
        { field: "people", type: "quantitative", title: "Anzahl Antworten" },
        {
          field: "valid_share_percent",
          type: "quantitative",
          title: "Anteil innerhalb des Themas (%)",
          format: ".1f",
        },
        {
          field: "valid_responses",
          type: "quantitative",
          title: "Gültige Antworten zum Thema (n)",
        },
        {
          field: "no_opinion_responses",
          type: "quantitative",
          title: "Keine Meinung",
        },
        {
          field: "no_answer_responses",
          type: "quantitative",
          title: "Keine Angabe",
        },
      ],
    },
  };
}
