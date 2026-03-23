"""Validate and prepare versioned materials and coatings datasets."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pandas as pd


REPO_ROOT = Path(__file__).resolve().parents[1]
TARGET_VERSION = "v0.3.1"
MATERIALS_DIR = REPO_ROOT / "data" / "materials" / TARGET_VERSION
COATINGS_DIR = REPO_ROOT / "data" / "coatings" / TARGET_VERSION

MATERIALS_REQUIRED_COLUMNS = [
    "Material",
    "Density (g/cc)",
    "Melting Point (°C)",
    "Specific Heat (J/g-°C)",
    "Thermal Cond. (W/m-K)",
    "CTE (µm/m-°C)",
    "Flash Point (°C)",
    "Autoignition Temp (°C)",
    "Limiting Oxygen Index (%)",
    "Smoke Density (Ds)",
    "Char Yield (%)",
    "Decomp. Temp (°C)",
    "Heat of Combustion (MJ/kg)",
    "Flame Spread Index",
]
MATERIALS_DEFAULT_COLUMNS = [
    "Material",
    "Density (g/cc)",
    "Melting Point (°C)",
    "Specific Heat (J/g-°C)",
    "Thermal Cond. (W/m-K)",
    "CTE (µm/m-°C)",
    "Flash Point (°C)",
    "Autoignition Temp (°C)",
    "UL94 Flammability",
    "Limiting Oxygen Index (%)",
    "Smoke Density (Ds)",
    "Char Yield (%)",
    "Decomp. Temp (°C)",
    "Heat of Combustion (MJ/kg)",
    "Flame Spread Index",
]
MATERIALS_NUMERIC_COLUMNS = [
    column for column in MATERIALS_REQUIRED_COLUMNS if column != "Material"
]

COATINGS_REQUIRED_COLUMNS = [
    "Coating",
    "LOI Improvement",
    "Thermal Barrier Effect",
    "Combustion Delay",
    "Surface Protection Factor",
]
COATINGS_DEFAULT_COLUMNS = [
    "Coating",
    "LOI Improvement",
    "Thermal Barrier Effect",
    "Combustion Delay",
    "Surface Protection Factor",
]
COATINGS_NUMERIC_COLUMNS = [
    column for column in COATINGS_REQUIRED_COLUMNS if column != "Coating"
]

SOURCE_EXTENSIONS = {".csv", ".xlsx"}
IGNORED_FILENAMES = {
    "materials_dataset.csv",
    "coatings_dataset.csv",
    "materials_dataset_clean.csv",
    "coatings_dataset_clean.csv",
    "validation_report.txt",
}


@dataclass
class DatasetSelection:
    dataset_type: str
    version_dir: Path
    source_file: Path
    working_csv: Path
    detection_notes: list[str]


@dataclass
class ValidationResult:
    dataset_type: str
    source_file: Path
    working_csv: Path
    clean_output: Path
    report_output: Path
    original_rows: int
    cleaned_rows: int
    row_count_removed: int
    columns: list[str]
    duplicates_removed: int
    rows_removed_missing_threshold: int
    missing_numeric_counts: dict[str, int]
    notes: list[str]


def _non_hidden_files(version_dir: Path) -> Iterable[Path]:
    return (
        path
        for path in sorted(version_dir.iterdir())
        if path.is_file() and not path.name.startswith(".")
    )


def find_source_dataset(dataset_type: str, version_dir: Path) -> DatasetSelection:
    canonical_csv_name = f"{dataset_type}_dataset.csv"
    canonical_csv_path = version_dir / canonical_csv_name
    raw_candidates = [
        path
        for path in _non_hidden_files(version_dir)
        if path.suffix.lower() in SOURCE_EXTENSIONS and path.name not in IGNORED_FILENAMES
    ]
    csv_candidates = [path for path in raw_candidates if path.suffix.lower() == ".csv"]
    xlsx_candidates = [path for path in raw_candidates if path.suffix.lower() == ".xlsx"]

    notes: list[str] = []
    if csv_candidates:
        source_file = csv_candidates[0]
        notes.append(f"Detected CSV source: {source_file.name}")
        if xlsx_candidates:
            notes.append(
                "XLSX source also present but CSV was preferred: "
                + ", ".join(path.name for path in xlsx_candidates)
            )
        return DatasetSelection(
            dataset_type=dataset_type,
            version_dir=version_dir,
            source_file=source_file,
            working_csv=source_file,
            detection_notes=notes,
        )

    if xlsx_candidates:
        source_file = xlsx_candidates[0]
        notes.append(f"Detected XLSX source: {source_file.name}")
        notes.append(f"Converted XLSX to CSV: {canonical_csv_path.name}")
        return DatasetSelection(
            dataset_type=dataset_type,
            version_dir=version_dir,
            source_file=source_file,
            working_csv=canonical_csv_path,
            detection_notes=notes,
        )

    raise FileNotFoundError(f"No CSV or XLSX dataset found in {version_dir}")


def _load_table(path: Path, header: int | None) -> pd.DataFrame:
    if path.suffix.lower() == ".csv":
        return pd.read_csv(path, header=header, dtype="object")
    return pd.read_excel(path, header=header, dtype="object")


def _drop_empty_columns(dataframe: pd.DataFrame) -> pd.DataFrame:
    cleaned = dataframe.copy()
    cleaned.columns = [str(column).strip() for column in cleaned.columns]
    for column in cleaned.columns:
        if pd.api.types.is_object_dtype(cleaned[column]) or pd.api.types.is_string_dtype(cleaned[column]):
            cleaned[column] = cleaned[column].map(
                lambda value: pd.NA
                if isinstance(value, str) and not value.strip()
                else value
            )
    cleaned = cleaned.dropna(axis=1, how="all")
    return cleaned


def _column_names_with_extras(base_columns: list[str], total_columns: int) -> list[str]:
    if total_columns <= len(base_columns):
        return base_columns[:total_columns]
    extras = [
        f"Additional Column {index}"
        for index in range(1, total_columns - len(base_columns) + 1)
    ]
    return [*base_columns, *extras]


def load_source_dataframe(
    selection: DatasetSelection,
    required_columns: list[str],
    default_columns: list[str],
) -> tuple[pd.DataFrame, list[str]]:
    notes = list(selection.detection_notes)

    if selection.source_file.suffix.lower() == ".xlsx":
        dataframe = _load_table(selection.source_file, header=0)
        dataframe = _drop_empty_columns(dataframe)
        dataframe.to_csv(selection.working_csv, index=False)
    else:
        dataframe = _load_table(selection.source_file, header=0)
        dataframe = _drop_empty_columns(dataframe)

    if set(required_columns).issubset(dataframe.columns):
        notes.append("Input schema already contained the required headers.")
        return dataframe, notes

    headerless = _load_table(selection.source_file, header=None)
    headerless = _drop_empty_columns(headerless)
    headerless.columns = _column_names_with_extras(default_columns, len(headerless.columns))

    if not set(required_columns).issubset(headerless.columns):
        missing = sorted(set(required_columns) - set(headerless.columns))
        raise ValueError(
            f"{selection.dataset_type} dataset is missing required columns after schema inference: "
            + ", ".join(missing)
        )

    if selection.source_file.suffix.lower() == ".xlsx":
        headerless.to_csv(selection.working_csv, index=False)

    notes.append("Input schema was headerless; expected column names were assigned.")
    return headerless, notes


def _normalize_identifier_column(dataframe: pd.DataFrame, column: str) -> pd.DataFrame:
    cleaned = dataframe.copy()
    cleaned[column] = cleaned[column].astype("string").str.strip()
    cleaned.loc[cleaned[column].isin(["", "nan", "None", "<NA>"]), column] = pd.NA
    return cleaned


def _coerce_numeric_columns(dataframe: pd.DataFrame, numeric_columns: list[str]) -> pd.DataFrame:
    cleaned = dataframe.copy()
    for column in numeric_columns:
        cleaned[column] = pd.to_numeric(cleaned[column], errors="coerce")
    return cleaned


def validate_materials(selection: DatasetSelection) -> ValidationResult:
    dataframe, notes = load_source_dataframe(
        selection,
        required_columns=MATERIALS_REQUIRED_COLUMNS,
        default_columns=MATERIALS_DEFAULT_COLUMNS,
    )
    original_rows = len(dataframe)
    dataframe = _normalize_identifier_column(dataframe, "Material")
    dataframe = dataframe.dropna(subset=["Material"]).copy()
    rows_removed_missing_identifier = original_rows - len(dataframe)

    deduped = dataframe.drop_duplicates(subset=["Material"], keep="first").copy()
    duplicates_removed = len(dataframe) - len(deduped)
    deduped = _coerce_numeric_columns(deduped, MATERIALS_NUMERIC_COLUMNS)

    missing_numeric_counts = {
        column: int(deduped[column].isna().sum()) for column in MATERIALS_NUMERIC_COLUMNS
    }
    required_view = deduped[MATERIALS_REQUIRED_COLUMNS]
    missing_ratio = required_view.isna().mean(axis=1)
    cleaned = deduped.loc[missing_ratio <= 0.30].copy()
    rows_removed_missing_threshold = len(deduped) - len(cleaned)

    clean_output = selection.version_dir / "materials_dataset_clean.csv"
    cleaned.to_csv(clean_output, index=False)

    report_output = selection.version_dir / "validation_report.txt"
    report_lines = [
        "Materials Dataset Validation Report",
        f"Source file: {selection.source_file.name}",
        f"Working CSV: {selection.working_csv.name}",
        f"Original rows: {original_rows}",
        f"Rows removed with missing identifier: {rows_removed_missing_identifier}",
        f"Duplicate materials removed: {duplicates_removed}",
        f"Rows removed for >30% missing required data: {rows_removed_missing_threshold}",
        f"Cleaned rows: {len(cleaned)}",
        f"Columns: {', '.join(cleaned.columns.astype(str).tolist())}",
        "Missing numeric values by column:",
    ]
    report_lines.extend(
        f"- {column}: {count}" for column, count in missing_numeric_counts.items()
    )
    report_lines.append("Notes:")
    report_lines.extend(f"- {note}" for note in notes)
    report_output.write_text("\n".join(report_lines) + "\n", encoding="utf-8")

    return ValidationResult(
        dataset_type="materials",
        source_file=selection.source_file,
        working_csv=selection.working_csv,
        clean_output=clean_output,
        report_output=report_output,
        original_rows=original_rows,
        cleaned_rows=len(cleaned),
        row_count_removed=original_rows - len(cleaned),
        columns=cleaned.columns.astype(str).tolist(),
        duplicates_removed=duplicates_removed,
        rows_removed_missing_threshold=rows_removed_missing_threshold,
        missing_numeric_counts=missing_numeric_counts,
        notes=[
            *notes,
            f"Rows removed with missing Material: {rows_removed_missing_identifier}",
        ],
    )


def validate_coatings(selection: DatasetSelection) -> ValidationResult:
    dataframe, notes = load_source_dataframe(
        selection,
        required_columns=COATINGS_REQUIRED_COLUMNS,
        default_columns=COATINGS_DEFAULT_COLUMNS,
    )
    original_rows = len(dataframe)
    dataframe = _normalize_identifier_column(dataframe, "Coating")
    dataframe = dataframe.dropna(subset=["Coating"]).copy()
    rows_removed_missing_identifier = original_rows - len(dataframe)

    deduped = dataframe.drop_duplicates(subset=["Coating"], keep="first").copy()
    duplicates_removed = len(dataframe) - len(deduped)
    deduped = _coerce_numeric_columns(deduped, COATINGS_NUMERIC_COLUMNS)

    missing_numeric_counts = {
        column: int(deduped[column].isna().sum()) for column in COATINGS_NUMERIC_COLUMNS
    }

    clean_output = selection.version_dir / "coatings_dataset_clean.csv"
    deduped.to_csv(clean_output, index=False)

    report_output = selection.version_dir / "validation_report.txt"
    report_lines = [
        "Coatings Dataset Validation Report",
        f"Source file: {selection.source_file.name}",
        f"Working CSV: {selection.working_csv.name}",
        f"Original rows: {original_rows}",
        f"Rows removed with missing identifier: {rows_removed_missing_identifier}",
        f"Duplicate coatings removed: {duplicates_removed}",
        f"Cleaned rows: {len(deduped)}",
        f"Columns: {', '.join(deduped.columns.astype(str).tolist())}",
        "Missing numeric values by column:",
    ]
    report_lines.extend(
        f"- {column}: {count}" for column, count in missing_numeric_counts.items()
    )
    report_lines.append("Notes:")
    report_lines.extend(f"- {note}" for note in notes)
    report_output.write_text("\n".join(report_lines) + "\n", encoding="utf-8")

    return ValidationResult(
        dataset_type="coatings",
        source_file=selection.source_file,
        working_csv=selection.working_csv,
        clean_output=clean_output,
        report_output=report_output,
        original_rows=original_rows,
        cleaned_rows=len(deduped),
        row_count_removed=original_rows - len(deduped),
        columns=deduped.columns.astype(str).tolist(),
        duplicates_removed=duplicates_removed,
        rows_removed_missing_threshold=0,
        missing_numeric_counts=missing_numeric_counts,
        notes=[
            *notes,
            f"Rows removed with missing Coating: {rows_removed_missing_identifier}",
        ],
    )


def print_validation_summary(
    materials_result: ValidationResult,
    coatings_result: ValidationResult,
) -> None:
    print("Detected dataset files:")
    print(f"- Materials source: {materials_result.source_file}")
    print(f"- Coatings source: {coatings_result.source_file}")
    print()
    print("Validation summary:")
    print(
        f"- Materials: {materials_result.cleaned_rows}/{materials_result.original_rows} rows kept, "
        f"{len(materials_result.columns)} columns, "
        f"{materials_result.duplicates_removed} duplicates removed, "
        f"{materials_result.rows_removed_missing_threshold} rows removed for missing-data threshold"
    )
    print(
        f"- Coatings: {coatings_result.cleaned_rows}/{coatings_result.original_rows} rows kept, "
        f"{len(coatings_result.columns)} columns, "
        f"{coatings_result.duplicates_removed} duplicates removed"
    )
    print()
    print("Final dataset summary:")
    print(f"Materials rows: {materials_result.cleaned_rows}")
    print(f"Materials columns: {len(materials_result.columns)}")
    print(f"Coatings rows: {coatings_result.cleaned_rows}")
    print(f"Coatings columns: {len(coatings_result.columns)}")
    print(
        "Number of rows removed during cleaning: "
        f"{materials_result.row_count_removed + coatings_result.row_count_removed}"
    )


def main() -> None:
    materials_selection = find_source_dataset("materials", MATERIALS_DIR)
    coatings_selection = find_source_dataset("coatings", COATINGS_DIR)

    materials_result = validate_materials(materials_selection)
    coatings_result = validate_coatings(coatings_selection)
    print_validation_summary(materials_result, coatings_result)


if __name__ == "__main__":
    main()
