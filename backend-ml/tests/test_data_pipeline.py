import unittest

import pandas as pd

from scripts.data_pipeline import aggregate_weather, build_training_row, coerce_date, extract_location, hash_weather_cache_key


class DataPipelineTests(unittest.TestCase):
    def test_coerce_date(self):
        self.assertEqual(coerce_date("2026-03-15").date().isoformat(), "2026-03-15")
        self.assertIsNone(coerce_date(None))

    def test_cache_key_changes(self):
        key_a = hash_weather_cache_key(5.6, -0.18, "2026-01-01", "2026-01-10")
        key_b = hash_weather_cache_key(5.6, -0.18, "2026-01-02", "2026-01-10")
        self.assertNotEqual(key_a, key_b)

    def test_extract_location(self):
        row = pd.Series({"farm_latitude": "5.6037", "farm_longitude": "-0.1870"})
        self.assertEqual(extract_location(row), (5.6037, -0.187))

    def test_aggregate_weather(self):
        frame = pd.DataFrame(
            {
                "temperature_2m_mean": [25.0, 26.0],
                "temperature_2m_max": [30.0, 31.0],
                "temperature_2m_min": [20.0, 21.0],
                "precipitation_sum": [2.0, 3.0],
                "relative_humidity_2m_mean": [80.0, 78.0],
                "wind_speed_10m_max": [12.0, 11.0],
                "soil_temperature_0cm_mean": [24.0, 25.0],
            }
        )
        features = aggregate_weather(frame)
        self.assertEqual(features["weather_days"], 2)
        self.assertAlmostEqual(features["precipitation_sum_total"], 5.0)

    def test_build_training_row(self):
        crop_row = pd.Series(
            {
                "crop_type": "tomato",
                "region": "Ashanti",
                "storage_condition": "room_temp",
                "planting_date": "2026-01-01",
                "harvest_date": "2026-03-12",
                "farm_latitude": "5.6037",
                "farm_longitude": "-0.1870",
            }
        )
        weather = pd.DataFrame({"temperature_2m_mean": [25.0], "precipitation_sum": [2.0]})
        row = build_training_row(crop_row, weather)
        self.assertEqual(row["crop_type"], "tomato")
        self.assertEqual(row["days_to_harvest"], 70.0)
        self.assertEqual(row["latitude"], 5.6037)


if __name__ == "__main__":
    unittest.main()
