from __future__ import annotations

from pathlib import Path
import argparse
import sys

from .data_pipeline import ensure_directory, download_file, extract_zip_members, FAOSTAT_BULK_URL


def main() -> None:
    parser = argparse.ArgumentParser(description="Download and extract FAOSTAT bulk production data.")
    parser.add_argument("--out-dir", default="data/raw/faostat", help="Output directory for extracted files")
    parser.add_argument("--zip-name", default="faostat_production.zip", help="Local zip filename")
    args = parser.parse_args()

    out_dir = ensure_directory(Path(args.out_dir))
    zip_path = out_dir / args.zip_name

    print(f"Downloading FAOSTAT bulk to {zip_path}...")
    try:
        download_file(FAOSTAT_BULK_URL, zip_path)
    except Exception as exc:
        print(f"Download failed: {exc}")
        sys.exit(1)

    print("Extracting CSV members...")
    extracted = extract_zip_members(zip_path, out_dir, name_contains=".csv")
    if not extracted:
        print("No CSV files found in the archive. Inspecting archive listing...")
        extracted = extract_zip_members(zip_path, out_dir)

    print(f"Extracted {len(extracted)} files to {out_dir}")
    print("Candidate files:")
    for p in extracted[:50]:
        try:
            rel_path = p.relative_to(Path.cwd())
        except ValueError:
            rel_path = p.relative_to(out_dir.parent)
        print(f" - {rel_path}")

    print("")
    print("Next steps:")
    print(" - Inspect the CSV files under the output directory and select one as the crops export to feed into prepare_freshness_dataset.py")
    print(" - Example: py -3 scripts/prepare_freshness_dataset.py --crops-csv data/raw/faostat/Production_Crops_Livestock_E_All_Data.csv --output data/training/freshness_training.csv")


if __name__ == "__main__":
    main()

