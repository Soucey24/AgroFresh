from __future__ import annotations

import argparse

from scripts.data_pipeline import openmeteo_daily, save_csv


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch historical daily weather from Open-Meteo.")
    parser.add_argument("--latitude", type=float, required=True)
    parser.add_argument("--longitude", type=float, required=True)
    parser.add_argument("--start-date", required=True, help="YYYY-MM-DD")
    parser.add_argument("--end-date", required=True, help="YYYY-MM-DD")
    parser.add_argument("--timezone", default="Africa/Accra")
    parser.add_argument("--output", default="data/weather/weather.csv")
    args = parser.parse_args()

    frame = openmeteo_daily(
        args.latitude,
        args.longitude,
        args.start_date,
        args.end_date,
        timezone=args.timezone,
    )

    output_path = save_csv(frame, args.output)
    print(f"Saved weather data to {output_path}")


if __name__ == "__main__":
    main()
