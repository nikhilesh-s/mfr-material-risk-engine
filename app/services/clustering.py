"""Lightweight dataset clustering over the loaded Phase 3 material descriptors."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

from backend.core.dataset_loader import load_datasets

CLUSTER_COLUMNS = {
    "Density (g/cc)": "density",
    "Melting Point (°C)": "melting_point",
    "Specific Heat (J/g-°C)": "specific_heat",
    "Thermal Cond. (W/m-K)": "thermal_conductivity",
    "Decomp. Temp (°C)": "decomposition_temp",
    "Flame Spread Index": "flame_spread_index",
}


def _material_name_column(frame: pd.DataFrame) -> str:
    for column in ("Material Name", "material_name", "Material"):
        if column in frame.columns:
            return column
    raise ValueError("Dataset is missing a material name column.")


def _build_feature_frame(frame: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    material_name_column = _material_name_column(frame)
    usable = frame[[material_name_column, *CLUSTER_COLUMNS.keys()]].copy()
    usable = usable.rename(columns={material_name_column: "material_name", **CLUSTER_COLUMNS})
    for column in CLUSTER_COLUMNS.values():
        usable[column] = pd.to_numeric(usable[column], errors="coerce")
    usable = usable.dropna(subset=["material_name"]).reset_index(drop=True)
    features = usable[list(CLUSTER_COLUMNS.values())].copy()
    features = features.fillna(features.median(numeric_only=True))
    return usable, features


def cluster_dataset_materials(n_clusters: int = 6) -> dict[str, Any]:
    """Cluster the in-memory dataset into stable descriptor neighborhoods."""
    material_dataset, _ = load_datasets()
    usable, features = _build_feature_frame(material_dataset)
    if usable.empty:
        return {"cluster_count": 0, "clusters": []}

    cluster_count = max(1, min(int(n_clusters), len(usable)))
    scaler = StandardScaler()
    scaled = scaler.fit_transform(features)
    model = KMeans(n_clusters=cluster_count, random_state=42, n_init=10)
    labels = model.fit_predict(scaled)
    usable["cluster_id"] = labels

    centroids = scaler.inverse_transform(model.cluster_centers_)
    clusters: list[dict[str, Any]] = []
    for cluster_id, group in usable.groupby("cluster_id", sort=True):
        center = centroids[int(cluster_id)]
        centroid = {
            feature_name: float(center[index])
            for index, feature_name in enumerate(CLUSTER_COLUMNS.values())
        }
        group_scaled = scaled[group.index]
        distances = np.linalg.norm(group_scaled - model.cluster_centers_[int(cluster_id)], axis=1)
        nearest_indices = np.argsort(distances)[:3]
        example_materials = [str(group.iloc[int(position)]["material_name"]) for position in nearest_indices]
        clusters.append(
            {
                "cluster_id": int(cluster_id),
                "material_count": int(len(group)),
                "centroid": centroid,
                "example_materials": example_materials,
                "materials_in_cluster": [str(value) for value in group["material_name"].tolist()],
                "representative_material": example_materials[0] if example_materials else None,
            }
        )

    return {
        "cluster_count": cluster_count,
        "clusters": clusters,
    }
