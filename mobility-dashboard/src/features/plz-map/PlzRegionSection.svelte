<script lang="ts">
  import { onMount } from "svelte";
  import DashboardChartSection from "../../components/charts/DashboardChartSection.svelte";
  import { transportModeDefinitions } from "../../data/domain";
  import {
    loadPlzMapDataset,
    buildVisiblePlzRegionMetrics,
  } from "../../data/plzMap";
  import type { PlzMapDataset, PlzMapFeature } from "../../data/plzMap";
  import {
    dashboardFilters,
    selectedStatusGroupKeys,
  } from "../../stores/dashboardFilters";
  import { formatSemesterTime } from "../../utils/semester";

  const MAP_WIDTH = 760;
  const MAP_HEIGHT = 520;
  const MAP_PADDING = 18;
  const MAP_EMPTY_COLOR = "#eef2ef";
  const MAP_MIN_COLOR = "#dbeade";
  const MAP_MAX_COLOR = "#1f7a50";
  const MAP_COLOR_EXPONENT = 0.45;
  const UNIVERSITY_COORDINATES = {
    latitude: 48.997042971029316,
    longitude: 12.095752877124259,
  };

  type ProjectedFeature = {
    plz: string;
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

  let error = $state<string | null>(null);
  let dataset = $state<PlzMapDataset | null>(null);
  let semesterTime = $state("ws_vl");
  let selectedPlz = $state<string | null>(null);
  let hoveredPlz = $state<string | null>(null);
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
  const MAX_ZOOM_SCALE = 6;
  const WHEEL_ZOOM_FACTOR = 1.2;

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

  const projection = $derived.by(() => {
    if (!dataset) return null;

    const bounds = collectBounds(dataset.features);
    return createProjectPoint(bounds);
  });

  const projectedFeatures = $derived.by(() => {
    if (!dataset || !projection) return [];

    return dataset.features.map((feature) => ({
      plz: feature.properties.plz,
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

  const selectedRegion = $derived.by(() => {
    return selectedPlz ? (regionMetricsByPlz.get(selectedPlz) ?? null) : null;
  });

  const hoveredRegion = $derived.by(() => {
    return hoveredPlz ? (regionMetricsByPlz.get(hoveredPlz) ?? null) : null;
  });

  const selectedTransportRows = $derived.by(() => {
    if (!selectedRegion || selectedRegion.n === 0) return [];

    return transportModeDefinitions
      .map((definition) => ({
        key: definition.key,
        label: definition.label,
        order: definition.order,
        count: selectedRegion.transportCounts[definition.key] ?? 0,
        share: selectedRegion.transportShares[definition.key] ?? 0,
      }))
      .filter((row) => row.count > 0)
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;
        return left.order - right.order;
      });
  });

  const maxSelectedTransportCount = $derived.by(() => {
    return selectedTransportRows.reduce((maxCount, row) => {
      return Math.max(maxCount, row.count);
    }, 0);
  });

  const legendStops = $derived.by(() => {
    if (!dataset) return [];

    const stops = buildLegendStops(dataset.maxParticipantCount);

    if (stops.length >= 2) {
      return stops.filter((_, index) => index !== stops.length - 2);
    }

    return stops;
  });

  const hoverPreview = $derived.by(() => {
    return {
      plz: hoveredRegion?.plz ?? "–",
      n: hoveredRegion?.n ?? null,
    };
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

  function formatSelectedTransportValue(count: number, share: number): string {
    return $dashboardFilters.measureMode === "percent"
      ? formatPercent(share)
      : formatInteger(count);
  }

  function getSelectedTransportBarWidth(count: number, share: number, maxCount: number): string {
    if ($dashboardFilters.measureMode === "percent") {
      return `${Math.max(share * 100, 2)}%`;
    }

    if (maxCount <= 0) {
      return "2%";
    }

    return `${Math.max((count / maxCount) * 100, 2)}%`;
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

    return ([longitude, latitude]: [number, number]): ProjectedPoint => {
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

  function clampTransform(scale: number, translateX: number, translateY: number) {
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

  function buildLegendStops(maxValue: number): LegendStop[] {
    if (maxValue <= 0) {
      return [
        { value: 0, label: "0", position: 0 },
        { value: 1, label: "1", position: 1 },
      ];
    }

    const step = getNiceLegendStep(maxValue);
    const stops: LegendStop[] = [{ value: 0, label: "0", position: 0 }];

    for (let value = step; value < maxValue; value += step) {
      stops.push({
        value,
        label: formatInteger(value),
        position: getColorScaleRatio(value, maxValue),
      });
    }

    if (stops[stops.length - 1]?.value !== maxValue) {
      stops.push({
        value: maxValue,
        label: formatInteger(maxValue),
        position: 1,
      });
    }

    return stops;
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

  function getColorScaleRatio(value: number, maxValue: number): number {
    if (value <= 0 || maxValue <= 0) return 0;
    return Math.pow(value / maxValue, MAP_COLOR_EXPONENT);
  }

  function getRegionFillColor(value: number, maxValue: number): string {
    if (value <= 0 || maxValue <= 0) return MAP_EMPTY_COLOR;
    return interpolateHexColor(
      MAP_MIN_COLOR,
      MAP_MAX_COLOR,
      getColorScaleRatio(value, maxValue),
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
    title="Wie verteilen sich die Teilnehmenden auf die sichtbaren PLZ-Bereiche?"
    description="Die Karte zeigt die Zahl der Teilnehmenden je Postleitzahlbereich in der aktuellen Auswahl. Ein Klick auf eine PLZ öffnet darunter die regionale Detailansicht mit Modal Split auf Basis des Hauptverkehrsmittels."
    note="Die Karte zeigt surveybasierte regionale Muster für die aktuell gewählte Semesterzeit und die sichtbaren Personengruppen. Die Farbskala bleibt fest an der absoluten Fallzahl je PLZ ausgerichtet, damit gleiche Werte immer gleich eingefärbt werden. Für bessere Unterscheidbarkeit nutzt die Karte eine verstärkte Farbspreizung im unteren und mittleren Wertebereich. Sehr weit entfernte Einzelfälle oder nicht zuordenbare Postleitzahlen liegen in dieser fokussierten Regionalsicht nicht im sichtbaren Kartenausschnitt."
    hasToolbar={true}
    hasMeta={true}
  >
    {#snippet toolbar()}
      <label class="field">
        <span>Semesterzeit</span>
        <select bind:value={semesterTime}>
          {#each dataset.semesterOptions as option}
            <option value={option}>{formatSemesterTime(option)}</option>
          {/each}
        </select>
      </label>
    {/snippet}

    {#snippet meta()}
      <p class="chartMeta">
        Semesterzeit:
        <strong>{formatSemesterTime(semesterTime)}</strong>
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
      <div class="regionMapCard">
        <div class="regionMapHeader">
          <div>
            <h3 class="regionSubheading">Teilnehmende je PLZ</h3>
          </div>

          {#if hasMapTransform}
            <button type="button" class="regionResetButton" onclick={resetMapView}>
              Ansicht zurücksetzen
            </button>
          {/if}
        </div>

        <div
          class:regionMapFrame={true}
          class:is-panning={isPanning}
          role="presentation"
          style={`cursor: ${isPanning ? "grabbing" : hasMapTransform ? "grab" : "default"};`}
          onmousedown={handleMapMouseDown}
          onwheel={handleMapWheel}
        >
          <svg
            bind:this={mapSvgElement}
            class="regionMapSvg"
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            role="img"
            aria-label="PLZ-Karte der fokussierten Region um Regensburg"
          >
            <g transform={`translate(${zoomTranslateX} ${zoomTranslateY}) scale(${zoomScale})`}>
              {#each mapFeatures as feature}
                <path
                  class="regionPath"
                  class:is-hovered={!isPanning && hoveredPlz === feature.plz}
                  class:is-selected={selectedPlz === feature.plz}
                  class:is-empty={!feature.metric || feature.metric.n === 0}
                  d={feature.path}
                  fill={getRegionFillColor(
                    feature.metric?.n ?? 0,
                    dataset.maxParticipantCount,
                  )}
                  vector-effect="non-scaling-stroke"
                  role="button"
                  tabindex="0"
                  aria-label={`PLZ ${feature.plz}`}
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
                  onclick={(event) => handleRegionMouseClick(event, feature.plz)}
                >
                  <title>
                    {`PLZ ${feature.plz} · ${formatSemesterTime(semesterTime)} · n = ${formatInteger(feature.metric?.n ?? 0)}`}
                  </title>
                </path>
              {/each}

              {#if universityMarkerPosition}
                <circle
                  class="regionUniversityMarker"
                  cx={universityMarkerPosition.x}
                  cy={universityMarkerPosition.y}
                  r="4"
                ></circle>
              {/if}
            </g>
          </svg>
        </div>
      </div>

      <div class="regionInfoGrid">
        <section class="panel regionInfoPanel">
          <div class="regionLegendPanel">
            <h3 class="regionSubheading">Legende</h3>

            <div class="regionLegendMarkerRow">
              <span
                class="regionLegendMarker regionLegendMarker--university"
                aria-hidden="true"
              ></span>
              <span>Universität Regensburg</span>
            </div>

            <p class="regionSubtext">Farbskala: Anzahl Teilnehmender (n)</p>

            <div class="regionLegendScale">
              <div class="regionLegendGradient" aria-hidden="true"></div>

              <div class="regionLegendLabels" aria-hidden="true">
                {#each legendStops as stop}
                  <span style={`left: ${stop.position * 100}%;`}>{stop.label}</span>
                {/each}
              </div>
            </div>
          </div>

          <div class="regionHoverPanel">
            <h3 class="regionSubheading">Hover-Vorschau</h3>

            <dl class="regionDetailList regionDetailList--compact">
              <div>
                <dt>PLZ</dt>
                <dd>{hoverPreview.plz}</dd>
              </div>
              <div>
                <dt>Fallzahl</dt>
                <dd>{hoverPreview.n === null ? "–" : `n = ${formatInteger(hoverPreview.n)}`}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section class="panel regionInfoPanel">
          <div class="regionSelectionHeader">
            <div>
              <h3 class="regionSubheading">Ausgewählte PLZ</h3>
              <p class="regionSubtext">
                Die Detailansicht berücksichtigt die aktuelle Auswahl des Dashboards.
              </p>
            </div>

            {#if selectedRegion}
              <button type="button" class="regionResetButton" onclick={clearSelection}>
                Auswahl zurücksetzen
              </button>
            {/if}
          </div>

          {#if selectedRegion}
            <dl class="regionDetailList regionDetailList--selection">
              <div>
                <dt>PLZ</dt>
                <dd>{selectedRegion.plz}</dd>
              </div>
              <div>
                <dt>Fallzahl</dt>
                <dd>n = {formatInteger(selectedRegion.n)}</dd>
              </div>
            </dl>

            <div class="regionSplitSection">
              <p class="regionSplitHeading">Modal Split im ausgewählten Bereich</p>

              {#if selectedRegion.n === 0}
                <p class="regionPlaceholderText">
                  Für diese PLZ liegen in der aktuellen Auswahl keine Fälle vor.
                </p>
              {:else}
                <ul class="regionTransportList">
                  {#each selectedTransportRows as row}
                    <li class="regionTransportRow">
                      <div class="regionTransportRowHeader">
                        <span class="regionTransportLabel">{row.label}</span>
                        <span class="regionTransportValues">
                          {formatSelectedTransportValue(row.count, row.share)}
                        </span>
                      </div>

                      <div class="regionTransportBarTrack" aria-hidden="true">
                        <div
                          class="regionTransportBarFill"
                          style={`width: ${getSelectedTransportBarWidth(
                            row.count,
                            row.share,
                            maxSelectedTransportCount,
                          )}`}
                        ></div>
                      </div>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          {:else}
            <p class="regionPlaceholderText">
              Wählen Sie eine PLZ auf der Karte aus, um die regionale Detailansicht zu öffnen.
            </p>
          {/if}
        </section>
      </div>
    </div>
  </DashboardChartSection>
{/if}