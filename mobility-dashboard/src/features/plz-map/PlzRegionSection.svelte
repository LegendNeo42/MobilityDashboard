<script lang="ts">
  import { onMount } from "svelte";
  import DashboardChartSection from "../../components/charts/DashboardChartSection.svelte";
  import { transportModeDefinitions } from "../../data/domain";
  import {
    loadPlzMapDataset,
    buildVisiblePlzRegionMetrics,
  } from "../../data/plzMap";
  import type {
    PlzMapDataset,
    PlzMapFeature,
    PlzRegionMetric,
  } from "../../data/plzMap";
  import { selectedStatusGroupKeys } from "../../stores/dashboardFilters";
  import { formatSemesterTime } from "../../utils/semester";

  const MAP_WIDTH = 760;
  const MAP_HEIGHT = 520;
  const MAP_PADDING = 18;
  const MAP_EMPTY_COLOR = "#e4e8e5";
  const MAP_ZERO_SHARE_COLOR = "#f7faf7";
  const PARTICIPANT_MAP_SINGLE_CASE_COLOR = "#edf6ef";
  const PARTICIPANT_MAP_MIN_COLOR = "#c7e0cf";
  const PARTICIPANT_MAP_MAX_COLOR = "#075435";
  const transportModeColorByKey: Record<string, string> = {
    "car-driver": "#4e79a7",
    "car-passenger": "#f28e2b",
    motorbike: "#e15759",
    bus: "#2f8f8a",
    "train-short": "#59a14f",
    "train-far": "#b37a00",
    bicycle: "#85509a",
    ebike: "#d37295",
    walk: "#9c755f",
  };
  const MAP_COUNT_COLOR_EXPONENT = 0.62;
  const SMALL_REGION_N_THRESHOLD = 10;
  const UNIVERSITY_COORDINATES = {
    latitude: 48.997042971029316,
    longitude: 12.095752877124259,
  };
  const CATHEDRAL_COORDINATES = {
    latitude: 49.01968765020921,
    longitude: 12.098372886274182,
  };

  type MapDisplayMode = "participant-count" | "transport-share";

  type ProjectedFeature = {
    plz: string;
    label: string;
    path: string;
  };

  type Bounds = {
    minLongitude: number;
    maxLongitude: number;
    minLatitude: number;
    maxLatitude: number;
  };

  type LegendStop = {
    value: number;
    label: string;
    position: number;
  };

  type ProjectedPoint = {
    x: number;
    y: number;
  };

  type ReferenceMarkerKey = "university" | "cathedral";

  const mapDisplayModeOptions: Array<{ key: MapDisplayMode; label: string }> = [
    { key: "participant-count", label: "Antwortanzahl" },
    { key: "transport-share", label: "Verkehrsmittelanteil" },
  ];

  const transportModeOptions = transportModeDefinitions
    .slice()
    .sort((left, right) => left.order - right.order);

  let error = $state<string | null>(null);
  let dataset = $state<PlzMapDataset | null>(null);
  let semesterTime = $state("ws_vl");
  let mapDisplayMode = $state<MapDisplayMode>("participant-count");
  let selectedMapTransportMode = $state("car-driver");
  let selectedPlz = $state<string | null>(null);
  let hoveredPlz = $state<string | null>(null);
  let hoveredReferenceMarker = $state<ReferenceMarkerKey | null>(null);
  let mapSvgElement = $state<SVGSVGElement | null>(null);
  let zoomScale = $state(1);
  let zoomTranslateX = $state(0);
  let zoomTranslateY = $state(0);
  let isPanning = $state(false);
  let isPointerDown = $state(false);
  let suppressNextRegionClick = $state(false);
  let dragStartClientX = 0;
  let dragStartClientY = 0;
  let dragStartTranslateX = 0;
  let dragStartTranslateY = 0;

  const DRAG_THRESHOLD = 4;
  const MIN_ZOOM_SCALE = 1;
  const MAX_ZOOM_SCALE = 7;
  const WHEEL_ZOOM_FACTOR = 1.2;

  const semesterOptions = $derived(dataset?.semesterOptions ?? []);

  onMount(async () => {
    try {
      const nextDataset = await loadPlzMapDataset();
      dataset = nextDataset;
      semesterTime = nextDataset.semesterOptions.includes("ws_vl")
        ? "ws_vl"
        : (nextDataset.semesterOptions[0] ?? "");
    } catch (loadError) {
      error =
        loadError instanceof Error ? loadError.message : String(loadError);
    }
  });

  const selectedMapModeLabel = $derived.by(() => {
    return (
      mapDisplayModeOptions.find((option) => option.key === mapDisplayMode)
        ?.label ?? "Antwortanzahl"
    );
  });

  const selectedMapTransportDefinition = $derived.by(() => {
    return (
      transportModeOptions.find(
        (definition) => definition.key === selectedMapTransportMode,
      ) ?? transportModeOptions[0]
    );
  });

  const selectedMapTransportLabel = $derived.by(() => {
    return selectedMapTransportDefinition?.label ?? "Hauptverkehrsmittel";
  });

  const selectedMapTransportColor = $derived.by(() => {
    return getTransportModeColor(selectedMapTransportMode);
  });

  const mapMetricLabel = $derived.by(() => {
    return mapDisplayMode === "transport-share"
      ? `Anteil ${selectedMapTransportLabel}`
      : "Antwortanzahl";
  });

  const sectionDescription =
    "Die Karte zeigt, aus welchen Postleitzahlbereichen Teilnehmende zur Universität pendeln und wie sich regionale Muster unterscheiden.";

  const projection = $derived.by(() => {
    if (!dataset) return null;

    const bounds = collectBounds(dataset.features);
    return createProjectPoint(bounds);
  });

  const projectedFeatures = $derived.by(() => {
    if (!dataset || !projection) return [];

    return dataset.features.map((feature) => ({
      plz: feature.properties.plz,
      label: feature.properties.label || feature.properties.plz,
      path: buildGeometryPath(feature.geometry, projection),
    }));
  });

  const universityMarkerPosition = $derived.by(() => {
    if (!projection) return null;
    return projection([
      UNIVERSITY_COORDINATES.longitude,
      UNIVERSITY_COORDINATES.latitude,
    ]);
  });

  const cathedralMarkerPosition = $derived.by(() => {
    if (!projection) return null;
    return projection([
      CATHEDRAL_COORDINATES.longitude,
      CATHEDRAL_COORDINATES.latitude,
    ]);
  });

  const regionMetrics = $derived.by(() => {
    if (!dataset || !semesterTime) return [];
    return buildVisiblePlzRegionMetrics(
      dataset,
      semesterTime,
      $selectedStatusGroupKeys,
    );
  });

  const regionMetricsByPlz = $derived.by(() => {
    return new Map(regionMetrics.map((metric) => [metric.plz, metric]));
  });

  const mapFeatures = $derived.by(() => {
    return projectedFeatures.map((feature) => ({
      ...feature,
      metric: regionMetricsByPlz.get(feature.plz) ?? null,
    }));
  });

  const visibleRegionCount = $derived.by(() => {
    return regionMetrics.filter((metric) => metric.n > 0).length;
  });

  const participantsInSelection = $derived.by(() => {
    return regionMetrics.reduce((total, metric) => total + metric.n, 0);
  });

  const maxParticipantCountInSelection = $derived.by(() => {
    return regionMetrics.reduce((maxCount, metric) => {
      return Math.max(maxCount, metric.n);
    }, 0);
  });

  const selectedRegion = $derived.by(() => {
    return selectedPlz ? (regionMetricsByPlz.get(selectedPlz) ?? null) : null;
  });

  const hoveredRegion = $derived.by(() => {
    return hoveredPlz ? (regionMetricsByPlz.get(hoveredPlz) ?? null) : null;
  });

  const selectedModeSummary = $derived.by(() => {
    if (!selectedRegion) return null;

    return buildTransportModeSummary(selectedRegion);
  });

  const selectedTransportRows = $derived.by(() => {
    if (!selectedRegion || selectedRegion.n === 0) return [];

    return transportModeOptions
      .map((definition) => ({
        key: definition.key,
        label: definition.label,
        order: definition.order,
        color: getTransportModeColor(definition.key),
        count: selectedRegion.transportCounts[definition.key] ?? 0,
        share: selectedRegion.transportShares[definition.key] ?? 0,
      }))
      .filter((row) => row.count > 0)
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;
        return left.order - right.order;
      });
  });

  const legendStops = $derived.by(() => {
    return mapDisplayMode === "transport-share"
      ? buildShareLegendStops()
      : buildParticipantLegendStops(maxParticipantCountInSelection);
  });

  const legendDescription = $derived.by(() => {
    return mapDisplayMode === "transport-share"
      ? `Dunkler = höherer Anteil. Die Farben zeigen Prozentwerte für ${selectedMapTransportLabel} innerhalb der jeweiligen PLZ; absolute Fallzahlen stehen als Kontext in Hover und Detailansicht.`
      : "Dunkler = mehr Fälle. Die Farben zeigen absolute Fallzahlen je PLZ in der aktuellen Auswahl; 0 Fälle erscheinen neutral grau.";
  });

  const legendGradientStart = $derived.by(() => {
    return mapDisplayMode === "transport-share"
      ? getTransportModeScaleStart(selectedMapTransportMode)
      : PARTICIPANT_MAP_SINGLE_CASE_COLOR;
  });

  const legendGradientEnd = $derived.by(() => {
    return mapDisplayMode === "transport-share"
      ? selectedMapTransportColor
      : PARTICIPANT_MAP_MAX_COLOR;
  });

  const legendKey = $derived.by(() => {
    return `${mapDisplayMode}-${selectedMapTransportMode}-${maxParticipantCountInSelection}-${participantsInSelection}`;
  });

  const hoverPreview = $derived.by(() => {
    return {
      label: hoveredRegion?.label ?? "–",
      n: hoveredRegion?.n ?? null,
    };
  });

  const cathedralMarkerScreenPosition = $derived.by(() => {
    return cathedralMarkerPosition
      ? transformProjectedPoint(cathedralMarkerPosition)
      : null;
  });

  const universityMarkerScreenPosition = $derived.by(() => {
    return universityMarkerPosition
      ? transformProjectedPoint(universityMarkerPosition)
      : null;
  });

  const hasMapTransform = $derived.by(() => {
    return zoomScale !== 1 || zoomTranslateX !== 0 || zoomTranslateY !== 0;
  });

  function handleRegionClick(plz: string) {
    selectedPlz = selectedPlz === plz ? null : plz;
  }

  function handleRegionPointerDown(event: MouseEvent) {
    event.preventDefault();
  }

  function handleRegionMouseClick(event: MouseEvent, plz: string) {
    const currentTarget = event.currentTarget as
      | (SVGElement & { blur?: () => void })
      | null;

    if (suppressNextRegionClick) {
      currentTarget?.blur?.();
      return;
    }

    handleRegionClick(plz);
    currentTarget?.blur?.();
  }

  function clearSelection() {
    selectedPlz = null;
  }

  function resetMapView() {
    zoomScale = 1;
    zoomTranslateX = 0;
    zoomTranslateY = 0;
    isPanning = false;
    isPointerDown = false;
    suppressNextRegionClick = false;
  }

  function showReferenceMarkerTooltip(marker: ReferenceMarkerKey) {
    hoveredReferenceMarker = marker;
  }

  function hideReferenceMarkerTooltip() {
    hoveredReferenceMarker = null;
  }

  function handleMapMouseDown(event: MouseEvent) {
    if (event.button !== 0) return;

    isPointerDown = true;
    isPanning = false;
    dragStartClientX = event.clientX;
    dragStartClientY = event.clientY;
    dragStartTranslateX = zoomTranslateX;
    dragStartTranslateY = zoomTranslateY;
  }

  function handleWindowMouseMove(event: MouseEvent) {
    if (!isPointerDown) return;

    const deltaX = event.clientX - dragStartClientX;
    const deltaY = event.clientY - dragStartClientY;

    if (!isPanning && Math.hypot(deltaX, deltaY) >= DRAG_THRESHOLD) {
      isPanning = true;
      hoveredPlz = null;
    }

    if (!isPanning) return;

    const nextTransform = clampTransform(
      zoomScale,
      dragStartTranslateX + deltaX,
      dragStartTranslateY + deltaY,
    );

    zoomTranslateX = nextTransform.translateX;
    zoomTranslateY = nextTransform.translateY;
  }

  function handleWindowMouseUp() {
    if (!isPointerDown) return;

    isPointerDown = false;

    if (isPanning) {
      suppressNextRegionClick = true;
      window.setTimeout(() => {
        suppressNextRegionClick = false;
      }, 0);
    }

    isPanning = false;
  }

  function handleMapWheel(event: WheelEvent) {
    event.preventDefault();

    const point = getSvgPoint(event.clientX, event.clientY);
    const zoomFactor =
      event.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
    const nextScale = clampNumber(
      zoomScale * zoomFactor,
      MIN_ZOOM_SCALE,
      MAX_ZOOM_SCALE,
    );

    if (nextScale === zoomScale) return;

    const contentX = (point.x - zoomTranslateX) / zoomScale;
    const contentY = (point.y - zoomTranslateY) / zoomScale;
    const nextTranslateX = point.x - contentX * nextScale;
    const nextTranslateY = point.y - contentY * nextScale;
    const nextTransform = clampTransform(
      nextScale,
      nextTranslateX,
      nextTranslateY,
    );

    zoomScale = nextScale;
    zoomTranslateX = nextTransform.translateX;
    zoomTranslateY = nextTransform.translateY;
  }

  function handleRegionKeydown(event: KeyboardEvent, plz: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleRegionClick(plz);
  }

  function formatInteger(value: number): string {
    return new Intl.NumberFormat("de-DE").format(value);
  }

  function formatPercent(value: number): string {
    return new Intl.NumberFormat("de-DE", {
      style: "percent",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatPercentOneDecimal(value: number): string {
    return new Intl.NumberFormat("de-DE", {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
  }

  function formatRegionNWithSelectionShare(n: number): string {
    if (participantsInSelection <= 0) return `n = ${formatInteger(n)}`;
    return `n = ${formatInteger(n)} (${formatPercentOneDecimal(n / participantsInSelection)})`;
  }

  function formatModalSplitValue(count: number, share: number): string {
    return `${formatInteger(count)} · ${formatPercent(share)}`;
  }

  function formatTransportModeCount(metric: PlzRegionMetric): string {
    const count = metric.transportCounts[selectedMapTransportMode] ?? 0;
    return `${formatInteger(count)} von ${formatInteger(metric.n)}`;
  }

  function formatMapMetricValue(metric: PlzRegionMetric): string {
    if (metric.n === 0) return "keine Fälle";

    if (mapDisplayMode === "transport-share") {
      const share = metric.transportShares[selectedMapTransportMode] ?? 0;
      return `${formatPercent(share)} · ${formatTransportModeCount(metric)}`;
    }

    return `n = ${formatInteger(metric.n)}`;
  }

  function buildTransportModeSummary(metric: PlzRegionMetric) {
    return {
      label: selectedMapTransportLabel,
      color: getTransportModeColor(selectedMapTransportMode),
      count: metric.transportCounts[selectedMapTransportMode] ?? 0,
      share: metric.transportShares[selectedMapTransportMode] ?? 0,
    };
  }

  function getSelectedTransportBarWidth(share: number): string {
    return `${Math.max(share * 100, 2)}%`;
  }

  function getSmallSampleNote(metric: PlzRegionMetric): string | null {
    if (metric.n > 0 && metric.n < SMALL_REGION_N_THRESHOLD) {
      return "Kleines n: Prozentwerte in diesem PLZ-Bereich bitte vorsichtig interpretieren.";
    }

    return null;
  }

  function collectBounds(features: PlzMapFeature[]): Bounds {
    let minLongitude = Number.POSITIVE_INFINITY;
    let maxLongitude = Number.NEGATIVE_INFINITY;
    let minLatitude = Number.POSITIVE_INFINITY;
    let maxLatitude = Number.NEGATIVE_INFINITY;

    for (const feature of features) {
      visitGeometryCoordinates(feature.geometry, ([longitude, latitude]) => {
        minLongitude = Math.min(minLongitude, longitude);
        maxLongitude = Math.max(maxLongitude, longitude);
        minLatitude = Math.min(minLatitude, latitude);
        maxLatitude = Math.max(maxLatitude, latitude);
      });
    }

    return { minLongitude, maxLongitude, minLatitude, maxLatitude };
  }

  function visitGeometryCoordinates(
    geometry: PlzMapFeature["geometry"],
    callback: (point: [number, number]) => void,
  ) {
    if (geometry.type === "Polygon") {
      for (const ring of geometry.coordinates) {
        for (const [longitude, latitude] of ring) {
          callback([longitude, latitude]);
        }
      }
      return;
    }

    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) {
        for (const [longitude, latitude] of ring) {
          callback([longitude, latitude]);
        }
      }
    }
  }

  function createProjectPoint(bounds: Bounds) {
    const longitudeSpan = Math.max(
      bounds.maxLongitude - bounds.minLongitude,
      0.0001,
    );
    const latitudeSpan = Math.max(
      bounds.maxLatitude - bounds.minLatitude,
      0.0001,
    );
    const scale = Math.min(
      (MAP_WIDTH - MAP_PADDING * 2) / longitudeSpan,
      (MAP_HEIGHT - MAP_PADDING * 2) / latitudeSpan,
    );
    const offsetX =
      (MAP_WIDTH - longitudeSpan * scale) / 2 - bounds.minLongitude * scale;
    const offsetY =
      (MAP_HEIGHT - latitudeSpan * scale) / 2 + bounds.maxLatitude * scale;

    return ([longitude, latitude]: [number, number]) => {
      return {
        x: longitude * scale + offsetX,
        y: offsetY - latitude * scale,
      };
    };
  }

  function buildGeometryPath(
    geometry: PlzMapFeature["geometry"],
    projectPoint: ReturnType<typeof createProjectPoint>,
  ): string {
    if (geometry.type === "Polygon") {
      return buildPolygonPath(geometry.coordinates, projectPoint);
    }

    return geometry.coordinates
      .map((polygon) => buildPolygonPath(polygon, projectPoint))
      .join(" ");
  }

  function buildPolygonPath(
    polygon: number[][][],
    projectPoint: ReturnType<typeof createProjectPoint>,
  ): string {
    return polygon
      .map((ring) => {
        if (ring.length === 0) return "";

        const [firstLongitude, firstLatitude] = ring[0];
        const firstPoint = projectPoint([firstLongitude, firstLatitude]);
        const segments = [
          `M ${firstPoint.x.toFixed(2)} ${firstPoint.y.toFixed(2)}`,
        ];

        for (let index = 1; index < ring.length; index += 1) {
          const [longitude, latitude] = ring[index];
          const point = projectPoint([longitude, latitude]);
          segments.push(`L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
        }

        segments.push("Z");
        return segments.join(" ");
      })
      .filter(Boolean)
      .join(" ");
  }

  function getSvgPoint(clientX: number, clientY: number): ProjectedPoint {
    if (!mapSvgElement) {
      return { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
    }

    const bounds = mapSvgElement.getBoundingClientRect();

    return {
      x: ((clientX - bounds.left) / bounds.width) * MAP_WIDTH,
      y: ((clientY - bounds.top) / bounds.height) * MAP_HEIGHT,
    };
  }

  function clampTransform(
    scale: number,
    translateX: number,
    translateY: number,
  ) {
    const minTranslateX = MAP_WIDTH - MAP_WIDTH * scale;
    const minTranslateY = MAP_HEIGHT - MAP_HEIGHT * scale;

    return {
      translateX: clampNumber(translateX, minTranslateX, 0),
      translateY: clampNumber(translateY, minTranslateY, 0),
    };
  }

  function clampNumber(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  function transformProjectedPoint(point: ProjectedPoint): ProjectedPoint {
    return {
      x: point.x * zoomScale + zoomTranslateX,
      y: point.y * zoomScale + zoomTranslateY,
    };
  }

  function buildParticipantLegendStops(maxValue: number): LegendStop[] {
    if (maxValue <= 0) return [];

    const stops: LegendStop[] = [{ value: 1, label: "1", position: 0 }];

    if (maxValue === 1) return stops;

    const step = getNiceLegendStep(maxValue);
    const firstStep = Math.max(2, step);

    for (let value = firstStep; value < maxValue; value += step) {
      stops.push({
        value,
        label: formatInteger(value),
        position: getParticipantCountScaleRatio(value, maxValue),
      });
    }

    if (stops[stops.length - 1]?.value !== maxValue) {
      stops.push({
        value: maxValue,
        label: formatInteger(maxValue),
        position: 1,
      });
    }

    const lastStop = stops[stops.length - 1];
    const previousStop = stops[stops.length - 2];
    if (
      lastStop &&
      previousStop &&
      lastStop.position - previousStop.position < 0.12
    ) {
      stops.splice(stops.length - 2, 1);
    }

    return stops;
  }

  function getTransportModeColor(transportModeKey: string): string {
    return (
      transportModeColorByKey[transportModeKey] ?? PARTICIPANT_MAP_MAX_COLOR
    );
  }

  function getTransportModeScaleStart(transportModeKey: string): string {
    return interpolateHexColor(
      MAP_ZERO_SHARE_COLOR,
      getTransportModeColor(transportModeKey),
      0.16,
    );
  }

  function getTransportModeBarBackground(transportModeKey: string): string {
    return `linear-gradient(90deg, ${getTransportModeScaleStart(transportModeKey)}, ${getTransportModeColor(transportModeKey)})`;
  }

  function buildShareLegendStops(): LegendStop[] {
    return [0, 0.25, 0.5, 0.75, 1].map((value) => ({
      value,
      label: formatPercent(value),
      position: value,
    }));
  }

  function getNiceLegendStep(maxValue: number): number {
    if (maxValue <= 10) return 2;
    if (maxValue <= 50) return 10;
    if (maxValue <= 100) return 20;

    const roughStep = maxValue / 5;
    const exponent = Math.floor(Math.log10(roughStep));
    const base = 10 ** exponent;
    const normalized = roughStep / base;

    if (normalized <= 1) return base;
    if (normalized <= 2) return 2 * base;
    if (normalized <= 5) return 5 * base;
    return 10 * base;
  }

  function interpolateHexColor(
    startColor: string,
    endColor: string,
    ratio: number,
  ): string {
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const start = parseHexColor(startColor);
    const end = parseHexColor(endColor);

    const red = Math.round(start.red + (end.red - start.red) * clampedRatio);
    const green = Math.round(
      start.green + (end.green - start.green) * clampedRatio,
    );
    const blue = Math.round(
      start.blue + (end.blue - start.blue) * clampedRatio,
    );

    return `rgb(${red}, ${green}, ${blue})`;
  }

  function parseHexColor(hexColor: string) {
    const normalized = hexColor.replace("#", "");
    return {
      red: Number.parseInt(normalized.slice(0, 2), 16),
      green: Number.parseInt(normalized.slice(2, 4), 16),
      blue: Number.parseInt(normalized.slice(4, 6), 16),
    };
  }

  function getParticipantCountScaleRatio(
    value: number,
    maxValue: number,
  ): number {
    if (value <= 1 || maxValue <= 1) return 0;
    return Math.pow((value - 1) / (maxValue - 1), MAP_COUNT_COLOR_EXPONENT);
  }

  function getSampleColorStrength(n: number): number {
    if (n <= 1) return 0.24;
    if (n < SMALL_REGION_N_THRESHOLD) {
      return 0.42 + ((n - 2) / (SMALL_REGION_N_THRESHOLD - 2)) * 0.28;
    }

    return 1;
  }

  function getRegionFillColor(metric: PlzRegionMetric | null): string {
    if (!metric || metric.n === 0) return MAP_EMPTY_COLOR;

    if (mapDisplayMode === "transport-share") {
      const share = metric.transportShares[selectedMapTransportMode] ?? 0;
      const sampleStrength = getSampleColorStrength(metric.n);
      const shareStrength = Math.pow(share, 0.82) * sampleStrength;

      return interpolateHexColor(
        MAP_ZERO_SHARE_COLOR,
        getTransportModeColor(selectedMapTransportMode),
        Math.min(1, shareStrength),
      );
    }

    if (metric.n === 1) return PARTICIPANT_MAP_SINGLE_CASE_COLOR;

    return interpolateHexColor(
      PARTICIPANT_MAP_MIN_COLOR,
      PARTICIPANT_MAP_MAX_COLOR,
      getParticipantCountScaleRatio(metric.n, maxParticipantCountInSelection),
    );
  }
</script>

<svelte:window
  onmousemove={handleWindowMouseMove}
  onmouseup={handleWindowMouseUp}
/>

{#if error}
  <p class="statusMessage">Fehler: {error}</p>
{:else if !dataset}
  <p class="statusMessage">Lade Regionalsicht…</p>
{:else}
  <DashboardChartSection
    eyebrow="PLZ-Karte"
    title="Welche regionalen Muster zeigen die sichtbaren PLZ-Bereiche?"
    description={sectionDescription}
    infoTitle="Regionale PLZ-Karte"
    infoIntro="Die Karte ist eine vorbereitete Fokusansicht auf die Region um Regensburg."
    infoItems={[
      "Antwortanzahl färbt PLZ-Bereiche nach absoluten Fallzahlen in der aktuellen Auswahl.",
      "Verkehrsmittelanteil färbt PLZ-Bereiche nach dem prozentualen Anteil des gewählten Hauptverkehrsmittels innerhalb der PLZ.",
      "Ein Klick auf eine PLZ öffnet Fallzahl und Modal Split für den ausgewählten Bereich.",
      "PLZ-Angaben können veraltet sein und zeigen Herkunftsbereiche, keine exakten Wohnorte oder Pendelrouten.",
      "Kleine Fallzahlen sind vorsichtig zu interpretieren.",
    ]}
    hasToolbar={true}
    hasMeta={true}
  >
    {#snippet toolbar()}
      <label class="field">
        <span>Semesterzeit</span>
        <select bind:value={semesterTime}>
          {#each semesterOptions as option}
            <option value={option}>{formatSemesterTime(option)}</option>
          {/each}
        </select>
      </label>

      <div class="field regionMapModeField">
        <span>Kartenansicht</span>

        <div
          class="measureModeButtonGroup regionMapModeButtonGroup"
          role="group"
          aria-label="Kartenansicht wählen"
        >
          {#each mapDisplayModeOptions as option}
            <button
              type="button"
              class="measureModeButton regionMapModeButton"
              class:is-active={mapDisplayMode === option.key}
              aria-pressed={mapDisplayMode === option.key}
              onclick={() => {
                mapDisplayMode = option.key;
              }}
            >
              {option.label}
            </button>
          {/each}
        </div>
      </div>

      {#if mapDisplayMode === "transport-share"}
        <label class="field regionTransportModeField">
          <span>Hauptverkehrsmittel</span>
          <select bind:value={selectedMapTransportMode}>
            {#each transportModeOptions as option}
              <option value={option.key}>{option.label}</option>
            {/each}
          </select>
        </label>
      {/if}
    {/snippet}

    {#snippet meta()}
      <p class="chartMeta">
        Kartenansicht:
        <strong>{selectedMapModeLabel}</strong>
      </p>
      <p class="chartMeta">
        Sichtbare PLZ mit Fällen:
        <strong>{formatInteger(visibleRegionCount)}</strong>
      </p>
      <p class="chartMeta">
        Aktuelle Auswahl:
        <strong>n = {formatInteger(participantsInSelection)}</strong>
      </p>
    {/snippet}

    <div class="regionModuleLayout">
      <div class="regionMapColumn">
        <div
          class:regionMapFrame={true}
          class:is-panning={isPanning}
          role="presentation"
          style={`cursor: ${isPanning ? "grabbing" : hasMapTransform ? "grab" : "default"};`}
          onmousedown={handleMapMouseDown}
          onwheel={handleMapWheel}
        >
          <div class="regionMapOverlay">
            <div class="regionMapOverlayLeft">
              <div class="regionMapInteractionHint">
                Mausrad: Zoomen · Ziehen: Verschieben
              </div>

              <div class="regionNorthIndicator" aria-label="Nordrichtung">
                <span>N</span>
              </div>
            </div>

            <button
              type="button"
              class="regionResetButton regionMapResetButton"
              disabled={!hasMapTransform}
              aria-disabled={!hasMapTransform}
              onmousedown={(event) => event.stopPropagation()}
              onclick={resetMapView}
            >
              Ansicht zurücksetzen
            </button>
          </div>

          <svg
            bind:this={mapSvgElement}
            class="regionMapSvg"
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            role="img"
            aria-label="PLZ-Karte der fokussierten Region um Regensburg mit Dom und Universität als Orientierungspunkten"
          >
            <g
              transform={`translate(${zoomTranslateX} ${zoomTranslateY}) scale(${zoomScale})`}
            >
              {#each mapFeatures as feature}
                <path
                  class="regionPath"
                  class:is-hovered={!isPanning && hoveredPlz === feature.plz}
                  class:is-selected={selectedPlz === feature.plz}
                  class:is-empty={!feature.metric || feature.metric.n === 0}
                  d={feature.path}
                  fill={getRegionFillColor(feature.metric)}
                  vector-effect="non-scaling-stroke"
                  role="button"
                  tabindex="0"
                  aria-label={`PLZ-Bereich ${feature.metric?.label ?? feature.label}`}
                  style={`cursor: ${isPanning ? "grabbing" : hasMapTransform ? "grab" : "pointer"};`}
                  onmouseenter={() => {
                    if (isPanning) return;
                    hoveredPlz = feature.plz;
                  }}
                  onmouseleave={() => {
                    hoveredPlz = null;
                  }}
                  onfocus={() => {
                    if (isPanning) return;
                    hoveredPlz = feature.plz;
                  }}
                  onblur={() => {
                    hoveredPlz = null;
                  }}
                  onmousedown={handleRegionPointerDown}
                  onkeydown={(event) => handleRegionKeydown(event, feature.plz)}
                  onclick={(event) =>
                    handleRegionMouseClick(event, feature.plz)}
                >
                  <title>
                    {`${feature.metric?.label ?? feature.label} · ${formatSemesterTime(semesterTime)} · ${mapMetricLabel}: ${feature.metric ? formatMapMetricValue(feature.metric) : "keine Fälle"}`}
                  </title>
                </path>
              {/each}

              {#if cathedralMarkerPosition}
                <rect
                  class="regionReferenceMarker regionReferenceMarker--cathedral"
                  x={cathedralMarkerPosition.x - 2}
                  y={cathedralMarkerPosition.y - 2}
                  width="4"
                  height="4"
                  transform={`rotate(45 ${cathedralMarkerPosition.x} ${cathedralMarkerPosition.y})`}
                  vector-effect="non-scaling-stroke"
                  role="img"
                  aria-label="Regensburger Dom"
                  onmouseenter={() => showReferenceMarkerTooltip("cathedral")}
                  onmouseleave={hideReferenceMarkerTooltip}
                ></rect>
              {/if}

              {#if universityMarkerPosition}
                <circle
                  class="regionReferenceMarker regionReferenceMarker--university"
                  cx={universityMarkerPosition.x}
                  cy={universityMarkerPosition.y}
                  r="2"
                  vector-effect="non-scaling-stroke"
                  role="img"
                  aria-label="Universität Regensburg"
                  onmouseenter={() => showReferenceMarkerTooltip("university")}
                  onmouseleave={hideReferenceMarkerTooltip}
                ></circle>
              {/if}
            </g>

            {#if hoveredReferenceMarker === "cathedral" && cathedralMarkerScreenPosition}
              <g
                class="regionReferenceTooltip"
                transform={`translate(${cathedralMarkerScreenPosition.x + 8} ${cathedralMarkerScreenPosition.y - 30})`}
              >
                <rect width="118" height="24" rx="8"></rect>
                <text x="10" y="16">Regensburger Dom</text>
              </g>
            {/if}

            {#if hoveredReferenceMarker === "university" && universityMarkerScreenPosition}
              <g
                class="regionReferenceTooltip"
                transform={`translate(${universityMarkerScreenPosition.x + 8} ${universityMarkerScreenPosition.y - 30})`}
              >
                <rect width="142" height="24" rx="8"></rect>
                <text x="10" y="16">Universität Regensburg</text>
              </g>
            {/if}
          </svg>
        </div>

        <section class="panel regionInfoPanel regionLegendPanel">
          <h3 class="regionSubheading">Legende</h3>

          <div class="regionLegendMain">
            {#key legendKey}
              <div class="regionLegendScale">
                <div
                  class="regionLegendGradient"
                  style={`--region-legend-start: ${legendGradientStart}; --region-legend-end: ${legendGradientEnd};`}
                  aria-hidden="true"
                ></div>

                <div class="regionLegendLabels" aria-hidden="true">
                  {#each legendStops as stop}
                    <span style={`left: ${stop.position * 100}%;`}
                      >{stop.label}</span
                    >
                  {/each}
                </div>
              </div>
            {/key}

            <div
              class="regionLegendMarkerList regionLegendMarkerList--besideScale"
            >
              <div class="regionLegendMarkerRow">
                <span
                  class="regionLegendMarker regionLegendMarker--university"
                  aria-hidden="true"
                ></span>
                <span>Universität Regensburg</span>
              </div>

              <div class="regionLegendMarkerRow">
                <span
                  class="regionLegendMarker regionLegendMarker--cathedral"
                  aria-hidden="true"
                ></span>
                <span>Dom</span>
              </div>
            </div>
          </div>
          <p class="regionSubtext">{legendDescription}</p>
          <p class="regionLegendHint">
            Sehr kleine Fallzahlen, besonders n = 1, sind heller dargestellt.
            Hohe Prozentwerte bei kleinem n sind nur vorsichtig interpretierbar.
          </p>
        </section>
      </div>

      <aside
        class="regionDetailColumn"
        aria-label="Regionale Detailinformationen"
      >
        <section class="panel regionInfoPanel regionHoverPanel">
          <h3 class="regionSubheading">Hover-Vorschau</h3>
          <dl class="regionDetailList regionDetailList--compact">
            <div>
              <dt>PLZ-Bereich</dt>
              <dd>{hoverPreview.label}</dd>
            </div>
            <div>
              <dt>Fallzahl</dt>
              <dd>
                {hoverPreview.n === null
                  ? "–"
                  : formatRegionNWithSelectionShare(hoverPreview.n)}
              </dd>
            </div>
          </dl>
        </section>

        <section class="panel regionInfoPanel regionSelectionPanel">
          <div class="regionSelectionHeader">
            <div>
              <h3 class="regionSubheading">Ausgewählter PLZ-Bereich</h3>
            </div>
          </div>

          {#if selectedRegion}
            <dl class="regionDetailList regionDetailList--selection">
              <div>
                <dt>PLZ-Bereich</dt>
                <dd>{selectedRegion.label}</dd>
              </div>
              <div>
                <dt>Fallzahl</dt>
                <dd>{formatRegionNWithSelectionShare(selectedRegion.n)}</dd>
              </div>
            </dl>

            {#if mapDisplayMode === "transport-share" && selectedModeSummary}
              <div class="regionSelectedModeSummary">
                <p class="regionSplitHeading">
                  Ausgewähltes Hauptverkehrsmittel
                </p>
                <div
                  class="regionSelectedModeValue"
                  style={`--selected-mode-color: ${selectedModeSummary.color};`}
                >
                  <strong>{formatPercent(selectedModeSummary.share)}</strong>
                  <span>
                    {selectedModeSummary.label}: {formatInteger(
                      selectedModeSummary.count,
                    )} von {formatInteger(selectedRegion.n)} Fällen
                  </span>
                </div>
              </div>
            {/if}

            {#if getSmallSampleNote(selectedRegion)}
              <p class="regionSampleNote">
                {getSmallSampleNote(selectedRegion)}
              </p>
            {/if}

            <div class="regionSplitSection">
              <p class="regionSplitHeading">
                Modal Split im ausgewählten Bereich
              </p>

              {#if selectedRegion.n === 0}
                <p class="regionPlaceholderText">
                  Für diesen PLZ-Bereich liegen in der aktuellen Auswahl keine
                  Fälle vor.
                </p>
              {:else}
                <ul class="regionTransportList">
                  {#each selectedTransportRows as row}
                    <li class="regionTransportRow">
                      <div class="regionTransportRowHeader">
                        <span class="regionTransportLabel">{row.label}</span>
                        <span class="regionTransportValues">
                          {formatModalSplitValue(row.count, row.share)}
                        </span>
                      </div>

                      <div class="regionTransportBarTrack" aria-hidden="true">
                        <div
                          class="regionTransportBarFill"
                          style={`width: ${getSelectedTransportBarWidth(
                            row.share,
                          )}; background: ${getTransportModeBarBackground(
                            row.key,
                          )};`}
                        ></div>
                      </div>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>

            <button
              type="button"
              class="regionResetButton"
              onclick={clearSelection}
            >
              Auswahl zurücksetzen
            </button>
          {:else}
            <p class="regionPlaceholderText">
              Wählen Sie einen PLZ-Bereich auf der Karte aus, um eine stabile
              Detailansicht zu öffnen.
            </p>
          {/if}
        </section>
      </aside>
    </div>
  </DashboardChartSection>
{/if}
