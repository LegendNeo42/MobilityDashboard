import { statusGroupColors, statusGroupLabels } from "../../../data/domain";

export function createQualitativeThemeSummarySpec(options?: {
  height?: number;
  paddingLeft?: number;
  labelLimit?: number;
  themeSortOrder?: string[];
}) {
  const height = options?.height ?? 420;
  const paddingLeft = options?.paddingLeft ?? 280;
  const labelLimit = options?.labelLimit ?? 280;
  const themeSortOrder = options?.themeSortOrder ?? [];

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v6.json",
    width: "container",
    height,
    autosize: { type: "fit-x", contains: "padding" },
    padding: { left: paddingLeft, right: 28, top: 10, bottom: 35 },
    params: [{ name: "measureMode", value: "absolute" }],
    data: { name: "table" },
    transform: [
      {
        calculate:
          "measureMode === 'absolute' ? datum.statements : datum.participant_share_percent",
        as: "metric_value",
      },
      {
        calculate:
          "measureMode === 'absolute' ? format(datum.statements, ',d') : format(datum.participant_share_percent, '.1f') + '%'",
        as: "metric_label",
      },
    ],
    encoding: {
      y: {
        field: "theme_label",
        type: "nominal",
        title: null,
        sort: themeSortOrder,
        axis: { labelLimit },
      },
      yOffset: {
        field: "group_label",
        type: "nominal",
        sort: statusGroupLabels,
      },
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
        legend: null,
        scale: {
          domain: statusGroupLabels,
          range: statusGroupColors,
        },
      },
      tooltip: [
        { field: "theme_label", type: "nominal", title: "Thema" },
        { field: "group_label", type: "nominal", title: "Personengruppe" },
        {
          field: "statements",
          type: "quantitative",
          title: "Zugeordnete Aussagen",
        },
        {
          field: "participants",
          type: "quantitative",
          title: "Personen mit Aussage zum Thema",
        },
        {
          field: "participant_total",
          type: "quantitative",
          title: "Personen in der Personengruppe",
        },
        {
          field: "participant_share_percent",
          type: "quantitative",
          title: "Anteil in der Personengruppe (%)",
          format: ".1f",
        },
      ],
    },
    layer: [
      {
        mark: {
          type: "bar",
          cornerRadiusEnd: 4,
        },
      },
      {
        mark: {
          type: "text",
          align: "left",
          baseline: "middle",
          dx: 5,
          color: "#314252",
        },
        encoding: {
          text: {
            field: "metric_label",
            type: "nominal",
          },
        },
      },
    ],
  };
}