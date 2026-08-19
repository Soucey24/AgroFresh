from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


def pick_target(frame: pd.DataFrame, target: str) -> str:
    if target != "auto":
        if target not in frame.columns:
            raise ValueError(f"Target column '{target}' not found")
        return target

    for candidate in ["shelf_life_days", "days_to_harvest", "predicted_days_to_harvest"]:
        if candidate in frame.columns:
            return candidate
    raise ValueError("No auto target found. Expected shelf_life_days, days_to_harvest, or predicted_days_to_harvest")


def build_pipeline() -> Pipeline:
    numeric_features = [
        "planting_month",
        "harvest_month",
        "latitude",
        "longitude",
        "weather_days",
        "temperature_2m_mean_avg",
        "temperature_2m_max_avg",
        "temperature_2m_min_avg",
        "precipitation_sum_total",
        "relative_humidity_2m_mean_avg",
        "wind_speed_10m_max_avg",
        "soil_temperature_0cm_mean_avg",
    ]
    categorical_features = ["crop_type", "region", "storage_condition"]

    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocess = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_features),
            ("cat", categorical_transformer, categorical_features),
        ],
        remainder="drop",
    )

    model = RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1)
    return Pipeline(steps=[("preprocess", preprocess), ("model", model)])


def main() -> None:
    parser = argparse.ArgumentParser(description="Train a baseline freshness regressor.")
    parser.add_argument("--input", required=True, help="Training CSV from prepare_freshness_dataset.py")
    parser.add_argument("--target", default="auto", help="Target column or auto")
    parser.add_argument("--model-out", default="models/freshness_model.joblib")
    parser.add_argument("--meta-out", default="models/freshness_model.meta.json")
    args = parser.parse_args()

    frame = pd.read_csv(args.input)
    target = pick_target(frame, args.target)

    feature_columns = [
        "crop_type",
        "region",
        "storage_condition",
        "planting_month",
        "harvest_month",
        "latitude",
        "longitude",
        "weather_days",
        "temperature_2m_mean_avg",
        "temperature_2m_max_avg",
        "temperature_2m_min_avg",
        "precipitation_sum_total",
        "relative_humidity_2m_mean_avg",
        "wind_speed_10m_max_avg",
        "soil_temperature_0cm_mean_avg",
    ]

    training_frame = frame[feature_columns + [target]].dropna(subset=[target])
    if len(training_frame) < 5:
        raise ValueError("Need at least 5 labeled rows to train")

    features = training_frame[feature_columns]
    target_values = training_frame[target]

    pipeline = build_pipeline()
    x_train, x_test, y_train, y_test = train_test_split(features, target_values, test_size=0.2, random_state=42)
    pipeline.fit(x_train, y_train)

    predictions = pipeline.predict(x_test)
    mae = mean_absolute_error(y_test, predictions)
    rmse = mean_squared_error(y_test, predictions, squared=False)
    r2 = r2_score(y_test, predictions)

    model_out = Path(args.model_out)
    model_out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, model_out)

    metadata = {
        "trained_at": datetime.utcnow().isoformat() + "Z",
        "target": target,
        "rows": int(len(training_frame)),
        "train_rows": int(len(x_train)),
        "test_rows": int(len(x_test)),
        "metrics": {
            "mae": round(float(mae), 4),
            "rmse": round(float(rmse), 4),
            "r2": round(float(r2), 4),
        },
        "feature_columns": feature_columns,
        "model_type": "RandomForestRegressor",
    }

    meta_out = Path(args.meta_out)
    meta_out.parent.mkdir(parents=True, exist_ok=True)
    meta_out.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    print(json.dumps(metadata, indent=2))
    print(f"Saved model to {model_out}")


if __name__ == "__main__":
    main()
