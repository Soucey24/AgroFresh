from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from scripts.data_pipeline import (
    build_training_row,
    ensure_directory,
    extract_location,
    hash_weather_cache_key,
    load_csv,
    openmeteo_daily,
    save_csv,
)


def resolve_cached_weather(cache_dir: Path, latitude: float, longitude: float, start_date: str, end_date: str) -> pd.DataFrame:
    cache_key = hash_weather_cache_key(latitude, longitude, start_date, end_date)
    cache_path = cache_dir / f"{cache_key}.csv"
    if cache_path.exists():
        return pd.read_csv(cache_path)

    weather = openmeteo_daily(latitude, longitude, start_date, end_date)
    weather.to_csv(cache_path, index=False)
    return weather


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare a freshness training dataset from crop exports.")
    parser.add_argument("--crops-csv", required=True, help="CSV export with crop rows")
    parser.add_argument("--output", default="data/training/freshness_training.csv")
    parser.add_argument("--cache-dir", default="data/weather-cache")
    parser.add_argument("--limit", type=int, default=0, help="Optional row limit for quick runs")
    args = parser.parse_args()

    crops = load_csv(args.crops_csv)
    if args.limit and args.limit > 0:
        crops = crops.head(args.limit)

    cache_dir = ensure_directory(args.cache_dir)
    rows: list[dict] = []

    for index, (_, crop_row) in enumerate(crops.iterrows(), start=1):
        latitude, longitude = extract_location(crop_row)
        planting_date = crop_row.get("planting_date")
        harvest_date = crop_row.get("harvest_date")
        if latitude is None or longitude is None or not planting_date or not harvest_date:
            continue

        weather_frame = resolve_cached_weather(
            cache_dir,
            latitude,
            longitude,
            str(pd.to_datetime(planting_date).date()),
            str(pd.to_datetime(harvest_date).date()),
        )
        rows.append(build_training_row(crop_row, weather_frame))
        print(f"Processed {index}/{len(crops)}")

    frame = pd.DataFrame(rows)
    output_path = save_csv(frame, args.output)
    print(f"Saved {len(frame)} rows to {output_path}")


if __name__ == "__main__":
    main()
