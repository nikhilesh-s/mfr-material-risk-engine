"""Material clustering utilities."""

from __future__ import annotations

from typing import Any

import pandas as pd
from sklearn.cluster import KMeans

from app.db.supabase_client import get_supabase
from app.training.feature_engineering import build_feature_frame
from src.utils import repo_path


def _load_dataset_materials() -> pd.DataFrame:
    try:
        response = get_supabase().table("dataset_materials").select("*").execute()
        rows = response.data or []
        if rows:
            return pd.DataFrame(rows)
    except Exception:
        pass

    fallback = repo_path("data", "benchmark_materials.csv")
    return pd.read_csv(fallback)


def cluster_candidate_materials(n_clusters: int = 4) -> dict[str, list[dict[str, Any]]]:
    materials = _load_dataset_materials()
    if materials.empty:
        return {"clusters": []}

    feature_frame = build_feature_frame(materials)
    usable = feature_frame.fillna(feature_frame.median(numeric_only=True))
    cluster_count = max(1, min(n_clusters, len(usable)))
    labels = KMeans(n_clusters=cluster_count, random_state=42, n_init=10).fit_predict(usable)

    clustered = materials.copy()
    clustered["cluster_id"] = labels
    clusters: list[dict[str, Any]] = []
    for cluster_id, group in clustered.groupby("cluster_id"):
        material_names = []
        if "material_name" in group.columns:
            material_names = [str(value) for value in group["material_name"].dropna().tolist()]
        clusters.append({"cluster_id": int(cluster_id), "materials": material_names})
    return {"clusters": clusters}
