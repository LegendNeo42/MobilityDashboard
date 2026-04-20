from __future__ import annotations

import csv
import json
import math
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, UTC
from pathlib import Path
from typing import Any

try:
    from shapely import wkt
    from shapely.geometry import mapping
    from shapely.ops import unary_union
except ImportError as exc:  # pragma: no cover - helpful runtime guard
    raise SystemExit(
        "This script requires shapely. Install it with 'pip install shapely'."
    ) from exc

csv.field_size_limit(10_000_000)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
PRIVATE_DATA_DIR = PROJECT_ROOT / "data-private"
PUBLIC_OUTPUT_DIR = PROJECT_ROOT / "public" / "data" / "plz-map"

VEHICLE_INPUT_PATH = PROJECT_ROOT / "public" / "data" / "data_vehicle.csv"
PLZ_SHAPES_INPUT_PATH = PRIVATE_DATA_DIR / "plz_shape_coords.csv"

GEOMETRY_OUTPUT_PATH = PUBLIC_OUTPUT_DIR / "plz_focus_regions.geojson"
METRICS_OUTPUT_PATH = PUBLIC_OUTPUT_DIR / "plz_focus_metrics.json"
INSPECTION_OUTPUT_PATH = PRIVATE_DATA_DIR / "plz_map_join_inspection.csv"

FOCUS_RADIUS_KM = 70.0
SIMPLIFY_TOLERANCE = 0.0015
COORDINATE_ROUND_DIGITS = 5
SHARE_ROUND_DIGITS = 6

SEMESTER_TIME_ORDER = ["ws_vl", "ws_free", "ss_vl", "ss_free"]

VISIBLE_STATUS_GROUPS = [
    {
        "key": "student",
        "label": "Studierende",
        "source_statuses": {"student"},
    },
    {
        "key": "employee",
        "label": "Mitarbeitende",
        "source_statuses": {"wimi", "niwi"},
    },
    {
        "key": "prof",
        "label": "Professor:innen",
        "source_statuses": {"prof"},
    },
]

MAIN_TRANSPORT_MODES = [
    {"key": "car-driver", "label": "Auto (Fahrer:in)", "order": 1},
    {"key": "car-passenger", "label": "Auto (Beifahrer:in)", "order": 2},
    {"key": "motorbike", "label": "Motorrad", "order": 3},
    {"key": "bus", "label": "Bus", "order": 4},
    {"key": "train-short", "label": "Bahn (Nahverkehr)", "order": 5},
    {"key": "train-far", "label": "Bahn (Fernverkehr)", "order": 6},
    {"key": "bicycle", "label": "Fahrrad", "order": 7},
    {"key": "ebike", "label": "E-Bike", "order": 8},
    {"key": "walk", "label": "Zu Fuß", "order": 9},
]

STATUS_GROUP_BY_SOURCE_STATUS = {
    source_status: definition["key"]
    for definition in VISIBLE_STATUS_GROUPS
    for source_status in definition["source_statuses"]
}
TRANSPORT_MODE_DEFINITION_BY_KEY = {
    definition["key"]: definition for definition in MAIN_TRANSPORT_MODES
}


@dataclass
class AggregatedResponse:
    semester_time: str
    plz: str
    status_group: str
    main_transport_mode: str


@dataclass
class GeometryRecord:
    plz: str
    centroid_longitude: float
    centroid_latitude: float
    geometry_source_rows: int
    geometry_parts: int
    geojson_geometry: dict[str, Any]


class PlzNormalizationError(ValueError):
    pass


class GeometryError(ValueError):
    pass


def normalize_plz(value: str) -> str:
    stripped = (value or "").strip()
    if not stripped:
        raise PlzNormalizationError("empty")

    digits = re.sub(r"\D", "", stripped)
    if not digits:
        raise PlzNormalizationError("non_digit")
    if len(digits) > 5:
        raise PlzNormalizationError("too_long")

    normalized = digits.zfill(5)
    if normalized == "00000":
        raise PlzNormalizationError("zero")

    return normalized


def parse_point_wkt(value: str) -> tuple[float, float]:
    match = re.match(
        r"POINT\s*\(([-0-9.]+)\s+([-0-9.]+)\)",
        (value or "").strip(),
    )
    if not match:
        raise GeometryError("invalid_centroid_wkt")

    return float(match.group(1)), float(match.group(2))


def haversine_km(
    longitude_a: float,
    latitude_a: float,
    longitude_b: float,
    latitude_b: float,
) -> float:
    radius_km = 6371.0

    delta_longitude = math.radians(longitude_b - longitude_a)
    delta_latitude = math.radians(latitude_b - latitude_a)
    latitude_a_rad = math.radians(latitude_a)
    latitude_b_rad = math.radians(latitude_b)

    haversine = (
        math.sin(delta_latitude / 2) ** 2
        + math.cos(latitude_a_rad)
        * math.cos(latitude_b_rad)
        * math.sin(delta_longitude / 2) ** 2
    )

    return 2 * radius_km * math.asin(math.sqrt(haversine))


def round_coordinates(value: Any, digits: int) -> Any:
    if isinstance(value, dict):
        rounded = {}
        for key, entry in value.items():
            if key == "coordinates":
                rounded[key] = round_coordinates(entry, digits)
            else:
                rounded[key] = entry
        return rounded

    if isinstance(value, list):
        if value and all(isinstance(entry, (int, float)) for entry in value[:2]):
            return [round(float(value[0]), digits), round(float(value[1]), digits)]
        return [round_coordinates(entry, digits) for entry in value]

    return value


def build_empty_transport_count_map() -> dict[str, int]:
    return {definition["key"]: 0 for definition in MAIN_TRANSPORT_MODES}


def build_empty_transport_share_map() -> dict[str, float]:
    return {definition["key"]: 0.0 for definition in MAIN_TRANSPORT_MODES}


def build_metrics_row(
    responses: list[AggregatedResponse],
    plz: str,
    semester_time: str,
    centroid_longitude: float,
    centroid_latitude: float,
    distance_to_focus_center_km: float,
) -> dict[str, Any]:
    total_transport_counts = build_empty_transport_count_map()
    status_group_counts = {definition["key"]: 0 for definition in VISIBLE_STATUS_GROUPS}
    status_group_metrics: dict[str, dict[str, Any]] = {}

    responses_by_status_group: dict[str, list[AggregatedResponse]] = defaultdict(list)
    for response in responses:
        total_transport_counts[response.main_transport_mode] += 1
        status_group_counts[response.status_group] += 1
        responses_by_status_group[response.status_group].append(response)

    total_n = len(responses)
    total_transport_shares = build_empty_transport_share_map()
    if total_n > 0:
        for transport_key, count in total_transport_counts.items():
            total_transport_shares[transport_key] = round(
                count / total_n,
                SHARE_ROUND_DIGITS,
            )

    for definition in VISIBLE_STATUS_GROUPS:
        status_group_key = definition["key"]
        group_responses = responses_by_status_group.get(status_group_key, [])
        group_transport_counts = build_empty_transport_count_map()
        group_n = len(group_responses)

        for response in group_responses:
            group_transport_counts[response.main_transport_mode] += 1

        group_transport_shares = build_empty_transport_share_map()
        if group_n > 0:
            for transport_key, count in group_transport_counts.items():
                group_transport_shares[transport_key] = round(
                    count / group_n,
                    SHARE_ROUND_DIGITS,
                )

        status_group_metrics[status_group_key] = {
            "n": group_n,
            "main_transport_counts": group_transport_counts,
            "main_transport_shares": group_transport_shares,
        }

    return {
        "plz": plz,
        "semester_time": semester_time,
        "centroid": {
            "longitude": round(centroid_longitude, COORDINATE_ROUND_DIGITS),
            "latitude": round(centroid_latitude, COORDINATE_ROUND_DIGITS),
        },
        "distance_to_focus_center_km": round(distance_to_focus_center_km, 3),
        "n": total_n,
        "status_group_counts": status_group_counts,
        "main_transport_counts": total_transport_counts,
        "main_transport_shares": total_transport_shares,
        "status_group_metrics": status_group_metrics,
    }


def semester_time_sort_key(value: str) -> tuple[int, str]:
    try:
        return (SEMESTER_TIME_ORDER.index(value), value)
    except ValueError:
        return (len(SEMESTER_TIME_ORDER), value)


def load_survey_responses() -> tuple[list[AggregatedResponse], Counter[str]]:
    if not VEHICLE_INPUT_PATH.exists():
        raise FileNotFoundError(f"Missing input file: {VEHICLE_INPUT_PATH}")

    responses: list[AggregatedResponse] = []
    normalization_issue_counts: Counter[str] = Counter()

    with VEHICLE_INPUT_PATH.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if (row.get("is_main_vehicle") or "").strip().lower() != "true":
                continue

            status_group = STATUS_GROUP_BY_SOURCE_STATUS.get(
                (row.get("employment_status") or "").strip()
            )
            if not status_group:
                continue

            transport_key = (row.get("vehicle") or "").strip()
            if transport_key not in TRANSPORT_MODE_DEFINITION_BY_KEY:
                continue

            try:
                plz = normalize_plz(row.get("plz") or "")
            except PlzNormalizationError as exc:
                normalization_issue_counts[str(exc)] += 1
                continue

            responses.append(
                AggregatedResponse(
                    semester_time=(row.get("semester_time") or "").strip(),
                    plz=plz,
                    status_group=status_group,
                    main_transport_mode=transport_key,
                )
            )

    return responses, normalization_issue_counts


def load_geometry_records() -> tuple[dict[str, GeometryRecord], Counter[str]]:
    if not PLZ_SHAPES_INPUT_PATH.exists():
        raise FileNotFoundError(
            "Missing PLZ geometry source. Expected file at "
            f"{PLZ_SHAPES_INPUT_PATH}"
        )

    geometry_groups: dict[str, list[Any]] = defaultdict(list)
    centroid_by_plz: dict[str, tuple[float, float]] = {}
    geometry_issue_counts: Counter[str] = Counter()
    geometry_row_counter: Counter[str] = Counter()

    with PLZ_SHAPES_INPUT_PATH.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            try:
                plz = normalize_plz(row.get("plz") or "")
            except PlzNormalizationError as exc:
                geometry_issue_counts[f"plz_{exc}"] += 1
                continue

            geometry_text = (row.get("geometry") or "").strip()
            centroid_text = (row.get("centroid") or "").strip()

            if not geometry_text:
                geometry_issue_counts["missing_geometry"] += 1
                continue
            if not centroid_text:
                geometry_issue_counts["missing_centroid"] += 1
                continue

            try:
                geometry = wkt.loads(geometry_text)
                centroid_longitude, centroid_latitude = parse_point_wkt(centroid_text)
            except Exception as exc:
                geometry_issue_counts[type(exc).__name__] += 1
                continue

            geometry_groups[plz].append(geometry)
            geometry_row_counter[plz] += 1
            centroid_by_plz.setdefault(plz, (centroid_longitude, centroid_latitude))

    geometry_records: dict[str, GeometryRecord] = {}

    for plz, geometries in geometry_groups.items():
        dissolved_geometry = unary_union(geometries)
        simplified_geometry = dissolved_geometry.simplify(
            SIMPLIFY_TOLERANCE,
            preserve_topology=True,
        )
        geojson_geometry = round_coordinates(
            mapping(simplified_geometry),
            COORDINATE_ROUND_DIGITS,
        )
        geometry_parts = (
            len(simplified_geometry.geoms)
            if hasattr(simplified_geometry, "geoms")
            else 1
        )
        centroid_longitude, centroid_latitude = centroid_by_plz[plz]

        geometry_records[plz] = GeometryRecord(
            plz=plz,
            centroid_longitude=centroid_longitude,
            centroid_latitude=centroid_latitude,
            geometry_source_rows=geometry_row_counter[plz],
            geometry_parts=geometry_parts,
            geojson_geometry=geojson_geometry,
        )

    return geometry_records, geometry_issue_counts


def write_outputs() -> None:
    survey_responses, normalization_issue_counts = load_survey_responses()
    geometry_records, geometry_issue_counts = load_geometry_records()

    responses_by_plz: dict[str, list[AggregatedResponse]] = defaultdict(list)
    responses_by_plz_and_semester_time: dict[tuple[str, str], list[AggregatedResponse]] = defaultdict(list)
    semester_times = set()

    for response in survey_responses:
        responses_by_plz[response.plz].append(response)
        responses_by_plz_and_semester_time[(response.plz, response.semester_time)].append(
            response
        )
        semester_times.add(response.semester_time)

    matched_plz_counts = Counter(
        {
            plz: len(responses)
            for plz, responses in responses_by_plz.items()
            if plz in geometry_records
        }
    )

    if not matched_plz_counts:
        raise SystemExit("No survey PLZ values could be matched to geometry records.")

    weighted_longitude = sum(
        geometry_records[plz].centroid_longitude * count
        for plz, count in matched_plz_counts.items()
    ) / sum(matched_plz_counts.values())
    weighted_latitude = sum(
        geometry_records[plz].centroid_latitude * count
        for plz, count in matched_plz_counts.items()
    ) / sum(matched_plz_counts.values())

    focus_plz_set = set()
    matched_outside_focus_plz = set()
    matched_participants_in_focus = 0
    matched_participants_outside_focus = 0

    for plz, count in matched_plz_counts.items():
        geometry_record = geometry_records[plz]
        distance_to_focus_center_km = haversine_km(
            weighted_longitude,
            weighted_latitude,
            geometry_record.centroid_longitude,
            geometry_record.centroid_latitude,
        )

        if distance_to_focus_center_km <= FOCUS_RADIUS_KM:
            focus_plz_set.add(plz)
            matched_participants_in_focus += count
        else:
            matched_outside_focus_plz.add(plz)
            matched_participants_outside_focus += count

    sorted_focus_plz = sorted(focus_plz_set)
    sorted_semester_times = sorted(semester_times, key=semester_time_sort_key)

    PUBLIC_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    INSPECTION_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    geometry_features = []
    metrics_rows = []
    inspection_rows = []

    for plz in sorted(responses_by_plz):
        geometry_record = geometry_records.get(plz)
        all_responses_for_plz = responses_by_plz[plz]
        total_plz_count = len(all_responses_for_plz)
        distance_to_focus_center_km: float | None = None

        if geometry_record:
            distance_to_focus_center_km = haversine_km(
                weighted_longitude,
                weighted_latitude,
                geometry_record.centroid_longitude,
                geometry_record.centroid_latitude,
            )

        for semester_time in sorted_semester_times:
            semester_responses = responses_by_plz_and_semester_time.get((plz, semester_time))
            if not semester_responses or not geometry_record or plz not in focus_plz_set:
                continue

            metrics_rows.append(
                build_metrics_row(
                    responses=semester_responses,
                    plz=plz,
                    semester_time=semester_time,
                    centroid_longitude=geometry_record.centroid_longitude,
                    centroid_latitude=geometry_record.centroid_latitude,
                    distance_to_focus_center_km=distance_to_focus_center_km or 0.0,
                )
            )

        if geometry_record and plz in focus_plz_set:
            geometry_features.append(
                {
                    "type": "Feature",
                    "properties": {
                        "plz": plz,
                        "centroid": {
                            "longitude": round(
                                geometry_record.centroid_longitude,
                                COORDINATE_ROUND_DIGITS,
                            ),
                            "latitude": round(
                                geometry_record.centroid_latitude,
                                COORDINATE_ROUND_DIGITS,
                            ),
                        },
                        "geometry_source_rows": geometry_record.geometry_source_rows,
                        "geometry_parts": geometry_record.geometry_parts,
                        "distance_to_focus_center_km": round(
                            distance_to_focus_center_km or 0.0,
                            3,
                        ),
                    },
                    "geometry": geometry_record.geojson_geometry,
                }
            )

        semester_counts = {
            semester_time: len(
                responses_by_plz_and_semester_time.get((plz, semester_time), [])
            )
            for semester_time in sorted_semester_times
        }

        inspection_rows.append(
            {
                "plz": plz,
                "survey_cases_total": total_plz_count,
                **{f"survey_cases_{semester_time}": semester_counts[semester_time] for semester_time in sorted_semester_times},
                "matched_geometry": "true" if geometry_record else "false",
                "geometry_source_rows": geometry_record.geometry_source_rows if geometry_record else 0,
                "geometry_parts": geometry_record.geometry_parts if geometry_record else 0,
                "distance_to_focus_center_km": (
                    round(distance_to_focus_center_km, 3)
                    if distance_to_focus_center_km is not None
                    else ""
                ),
                "in_focus_area": (
                    "true" if geometry_record and plz in focus_plz_set else "false"
                ),
                "focus_status": (
                    "included"
                    if geometry_record and plz in focus_plz_set
                    else "outside_focus_radius"
                    if geometry_record
                    else "unmatched_geometry"
                ),
            }
        )

    geometry_geojson = {
        "type": "FeatureCollection",
        "features": geometry_features,
    }

    metrics_payload = {
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "source": {
            "survey": str(VEHICLE_INPUT_PATH.relative_to(PROJECT_ROOT)),
            "geometry": str(PLZ_SHAPES_INPUT_PATH.relative_to(PROJECT_ROOT)),
        },
        "focus": {
            "method": "weighted_centroid_radius",
            "center": {
                "longitude": round(weighted_longitude, COORDINATE_ROUND_DIGITS),
                "latitude": round(weighted_latitude, COORDINATE_ROUND_DIGITS),
            },
            "radius_km": FOCUS_RADIUS_KM,
            "matched_plz_total": len(matched_plz_counts),
            "matched_cases_total": sum(matched_plz_counts.values()),
            "included_plz_count": len(sorted_focus_plz),
            "included_case_count": matched_participants_in_focus,
            "excluded_plz_count": len(matched_outside_focus_plz),
            "excluded_case_count": matched_participants_outside_focus,
            "unmatched_plz_count": len(responses_by_plz) - len(matched_plz_counts),
            "unmatched_case_count": len(survey_responses) - sum(matched_plz_counts.values()),
        },
        "geometry": {
            "simplify_tolerance": SIMPLIFY_TOLERANCE,
            "coordinate_round_digits": COORDINATE_ROUND_DIGITS,
        },
        "survey_unit": {
            "row_type": "main_transport_response",
            "note": (
                "Rows stay separated by semester_time so the regional metrics do not "
                "double-count the same participant across multiple seasonal variants."
            ),
        },
        "status_groups": [
            {"key": definition["key"], "label": definition["label"]}
            for definition in VISIBLE_STATUS_GROUPS
        ],
        "main_transport_modes": MAIN_TRANSPORT_MODES,
        "semester_times": sorted_semester_times,
        "rows": metrics_rows,
    }

    with GEOMETRY_OUTPUT_PATH.open("w", encoding="utf-8") as handle:
        json.dump(geometry_geojson, handle, ensure_ascii=False, separators=(",", ":"))

    with METRICS_OUTPUT_PATH.open("w", encoding="utf-8") as handle:
        json.dump(metrics_payload, handle, ensure_ascii=False, separators=(",", ":"))

    fieldnames = list(inspection_rows[0].keys()) if inspection_rows else ["plz"]
    with INSPECTION_OUTPUT_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(inspection_rows)

    print(
        json.dumps(
            {
                "normalized_survey_rows": len(survey_responses),
                "focus_plz_count": len(sorted_focus_plz),
                "focus_case_count": matched_participants_in_focus,
                "normalization_issue_counts": normalization_issue_counts,
                "geometry_issue_counts": geometry_issue_counts,
                "inspection_output": str(INSPECTION_OUTPUT_PATH.relative_to(PROJECT_ROOT)),
                "geometry_output": str(GEOMETRY_OUTPUT_PATH.relative_to(PROJECT_ROOT)),
                "metrics_output": str(METRICS_OUTPUT_PATH.relative_to(PROJECT_ROOT)),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    write_outputs()