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
        as: "metric_value",
      },
    ],
    mark: { type: "bar", color: "#6f8f8a" },
    encoding: {
      y: {
        field: "barrier_label",
        type: "nominal",
        title: null,
        sort: { field: "barrier_sort_rank", order: "ascending" },
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
          tickCount: 18,
          labelOverlap: "greedy",
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
      tooltip: [
        {
          field: "barrier_label",
          type: "nominal",
          title: "Genannter Grund gegen Bus und Bahn",
        },
        {
          field: "segment_context_label",
          type: "nominal",
          title: "Gezeigte Antworten von",
        },
        {
          field: "people",
          type: "quantitative",
          title: "Personen, die diesen Grund genannt haben",
        },
        {
          field: "segment_share_percent_1",
          type: "quantitative",
          title: "Anteil der gezeigten Personen (%)",
          format: ".1f",
        },
        {
          field: "segment_participants",
          type: "quantitative",
          title: "Gezeigte Personen (n)",
        },
      ],
    },
  };
}
