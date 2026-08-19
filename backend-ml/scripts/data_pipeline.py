from __future__ import annotations

import hashlib
from datetime import date
from pathlib import Path
from typing import Any, Optional
import zipfile

import pandas as pd
import requests

FAOSTAT_BULK_URL = "https://fenixservices.fao.org/faostat/static/bulkdownloads/Production_Crops_Livestock_E_All_Data.zip"
OPEN_METEO_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"


def ensure_directory(path: Path | str) -> Path:
    target = Path(path)
    target.mkdir(parents=True, exist_ok=True)
    return target


def download_file(url: str, destination: Path | str, *, timeout: int = 120) -> Path:
    destination_path = Path(destination)
    ensure_directory(destination_path.parent)

    with requests.get(url, stream=True, timeout=timeout) as response:
        response.raise_for_status()
        with destination_path.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    handle.write(chunk)

    return destination_path


def extract_zip_members(zip_path: Path | str, output_dir: Path | str, *, name_contains: str | None = None) -> list[Path]:
    zip_path = Path(zip_path)
    output_dir = ensure_directory(output_dir)
    extracted: list[Path] = []

    with zipfile.ZipFile(zip_path) as archive:
        for member in archive.namelist():
            if name_contains and name_contains not in member:
                continue
            archive.extract(member, output_dir)
            extracted.append(output_dir / member)

    return extracted


def coerce_date(value: Any) -> Optional[pd.Timestamp]:
    if value is None or value == "":
        return None
    parsed = pd.to_datetime(value, errors="coerce")
    if pd.isna(parsed):
        return None
    return parsed.normalize()


def safe_float(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def openmeteo_daily(latitude: float, longitude: float, start_date: date | str, end_date: date | str, *, timezone: str = "Africa/Accra", session: Optional[requests.Session] = None) -> pd.DataFrame:
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": pd.Timestamp(start_date).date().isoformat(),
        "end_date": pd.Timestamp(end_date).date().isoformat(),
        "daily": ",".join([
            "temperature_2m_mean",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_sum",
            "relative_humidity_2m_mean",
            "wind_speed_10m_max",
            "soil_temperature_0cm_mean",
        ]),
        "timezone": timezone,
    }
    client = session or requests
    response = client.get(OPEN_METEO_ARCHIVE_URL, params=params, timeout=120)
    response.raise_for_status()
    payload = response.json()

    daily = payload.get("daily") or {}
    times = daily.get("time") or []
    if not times:
        return pd.DataFrame()

    frame = pd.DataFrame(daily)
    frame["time"] = pd.to_datetime(frame["time"]).dt.normalize()
    frame["latitude"] = payload.get("latitude")
    frame["longitude"] = payload.get("longitude")
    return frame


def aggregate_weather(frame: pd.DataFrame) -> dict[str, Any]:
    if frame.empty:
        return {
            "weather_days": 0,
            "temperature_2m_mean_avg": None,
            "temperature_2m_max_avg": None,
            "temperature_2m_min_avg": None,
            "precipitation_sum_total": None,
            "relative_humidity_2m_mean_avg": None,
            "wind_speed_10m_max_avg": None,
            "soil_temperature_0cm_mean_avg": None,
        }

    return {
        "weather_days": int(len(frame)),
        "temperature_2m_mean_avg": frame["temperature_2m_mean"].mean(skipna=True) if "temperature_2m_mean" in frame else None,
        "temperature_2m_max_avg": frame["temperature_2m_max"].mean(skipna=True) if "temperature_2m_max" in frame else None,
        "temperature_2m_min_avg": frame["temperature_2m_min"].mean(skipna=True) if "temperature_2m_min" in frame else None,
        "precipitation_sum_total": frame["precipitation_sum"].sum(skipna=True) if "precipitation_sum" in frame else None,
        "relative_humidity_2m_mean_avg": frame["relative_humidity_2m_mean"].mean(skipna=True) if "relative_humidity_2m_mean" in frame else None,
        "wind_speed_10m_max_avg": frame["wind_speed_10m_max"].mean(skipna=True) if "wind_speed_10m_max" in frame else None,
        "soil_temperature_0cm_mean_avg": frame["soil_temperature_0cm_mean"].mean(skipna=True) if "soil_temperature_0cm_mean" in frame else None,
    }


def hash_weather_cache_key(latitude: float, longitude: float, start_date: str, end_date: str) -> str:
    raw = f"{latitude:.4f}:{longitude:.4f}:{start_date}:{end_date}".encode("utf-8")
    return hashlib.sha1(raw).hexdigest()


def extract_location(row: pd.Series) -> tuple[Optional[float], Optional[float]]:
    latitude_fields = ["latitude", "lat", "farm_latitude"]
    longitude_fields = ["longitude", "lon", "lng", "farm_longitude"]

    latitude = next((safe_float(row.get(field)) for field in latitude_fields if safe_float(row.get(field)) is not None), None)
    longitude = next((safe_float(row.get(field)) for field in longitude_fields if safe_float(row.get(field)) is not None), None)
    return latitude, longitude


def extract_crop_type(row: pd.Series) -> Optional[str]:
    for field in ["crop_type", "crop_name", "commodity", "name"]:
        value = row.get(field)
        if isinstance(value, str) and value.strip():
            return value.strip().lower()
    return None


def infer_target_days(row: pd.Series) -> Optional[float]:
    planting = coerce_date(row.get("planting_date"))
    harvest = coerce_date(row.get("harvest_date"))
    if planting is not None and harvest is not None:
        return float((harvest - planting).days)
    return None


def infer_shelf_life_days(row: pd.Series) -> Optional[float]:
    harvest = coerce_date(row.get("harvest_date"))
    expiry = coerce_date(row.get("expiry_date") or row.get("predicted_expiry"))
    if harvest is not None and expiry is not None:
        return float((expiry - harvest).days)
    return None


def build_training_row(row: pd.Series, weather_frame: pd.DataFrame) -> dict[str, Any]:
    planting_date = coerce_date(row.get("planting_date"))
    harvest_date = coerce_date(row.get("harvest_date"))
    crop_type = extract_crop_type(row)
    latitude, longitude = extract_location(row)

    feature_row: dict[str, Any] = {
        "crop_type": crop_type,
        "region": row.get("region") or row.get("location") or row.get("district"),
        "storage_condition": row.get("storage_condition"),
        "planting_month": planting_date.month if planting_date is not None else None,
        "harvest_month": harvest_date.month if harvest_date is not None else None,
        "days_to_harvest": infer_target_days(row),
        "shelf_life_days": infer_shelf_life_days(row),
        "latitude": latitude,
        "longitude": longitude,
    }
    feature_row.update(aggregate_weather(weather_frame))
    return feature_row


def load_csv(path: Path | str) -> pd.DataFrame:
    return pd.read_csv(path)


def save_csv(frame: pd.DataFrame, destination: Path | str) -> Path:
    destination_path = Path(destination)
    ensure_directory(destination_path.parent)
    frame.to_csv(destination_path, index=False)
    return destination_path
