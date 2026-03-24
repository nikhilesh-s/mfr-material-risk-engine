"""Dataset clustering service for material descriptor exploration."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans

from app.services.database_service import get_database_service
from backend.core.dataset_loader import load_datasets

CLUSTER_FEATURE_COLUMNS = [
    "density",
    "melting_point",
    "thermal_conductivity",
    "specific_heat",
    "decomposition_temp",
    "glass_transition_temp",
]


def _normalize_dataset_materials(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for row in rows:
        normalized.append(
            {
                "material_name": row.get("material_name") or row.get("Material Name") or row.get("Material"),
                "density": row.get("density", row.get("Density (g/cc)")),
                "melting_point": row.get("melting_point", row.get("Melting Point (°C)")),
                "thermal_conductivity": row.get("thermal_conductivity", row.get("Thermal Cond. (W/m-K)")),
                "specific_heat": row.get("specific_heat", row.get("Specific Heat (J/g-°C)")),
                "decomposition_temp": row.get("decomposition_temp", row.get("Decomp. Temp (°C)")),
                "glass_transition_temp": row.get("glass_transition_temp", row.get("Glass Transition Temp (°C)")),
            }
        )
    return normalized


def _normalize_custom_materials(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for row in rows:
        payload = dict(row.get("descriptor_payload") or row.get("properties") or {})
        normalized.append(
            {
                "material_name": row.get("material_name"),
                "density": payload.get("density", payload.get("Density_g_cc")),
                "melting_point": payload.get("melting_point", payload.get("Melting_Point_C")),
                "thermal_conductivity": payload.get("thermal_conductivity", payload.get("Thermal_Cond_W_mK")),
                "specific_heat": payload.get("specific_heat", payload.get("Specific_Heat_J_g_C")),
                "decomposition_temp": payload.get("decomposition_temp", payload.get("Decomp_Temp_C")),
                "glass_transition_temp": payload.get("glass_transition_temp"),
            }
        )
    return normalized


def cluster_materials(n_clusters: int = 4) -> dict[str, Any]:
    """Cluster dataset and custom materials into descriptor neighborhoods."""
    database = get_database_service()
    dataset_rows = _normalize_dataset_materials(database.get_dataset_materials())
    custom_rows = _normalize_custom_materials(database.get_custom_materials())

    if not dataset_rows:
        fallback_df, _ = load_datasets()
        dataset_rows = _normalize_dataset_materials(fallback_df.to_dict(orient="records"))

    dataframe = pd.DataFrame(dataset_rows + custom_rows)
    if dataframe.empty:
        return {"clusters": []}

    for column in CLUSTER_FEATURE_COLUMNS:
        dataframe[column] = pd.to_numeric(dataframe.get(column), errors="coerce")
    usable = dataframe.dropna(subset=["material_name"]).copy()
    if usable.empty:
        return {"clusters": []}

    feature_frame = usable[CLUSTER_FEATURE_COLUMNS].copy()
    feature_frame = feature_frame.fillna(feature_frame.median(numeric_only=True))
    cluster_count = max(1, min(n_clusters, len(feature_frame)))
    model = KMeans(n_clusters=cluster_count, random_state=42, n_init=10)
    labels = model.fit_predict(feature_frame)
    usable["cluster_id"] = labels

    clusters: list[dict[str, Any]] = []
    for cluster_id, group in usable.groupby("cluster_id"):
        center = model.cluster_centers_[int(cluster_id)]
        center_properties = {
            feature_name: float(center[index])
            for index, feature_name in enumerate(CLUSTER_FEATURE_COLUMNS)
        }
        group_features = feature_frame.loc[group.index]
        distances = np.linalg.norm(group_features.to_numpy(dtype=float) - center, axis=1)
        representative_material = str(group.iloc[int(np.argmin(distances))]["material_name"])
        clusters.append(
            {
                "cluster_id": int(cluster_id),
                "cluster_center_properties": center_properties,
                "materials_in_cluster": [str(value) for value in group["material_name"].tolist()],
                "representative_material": representative_material,
            }
        )

    clusters.sort(key=lambda item: item["cluster_id"])
    return {"clusters": clusters}
