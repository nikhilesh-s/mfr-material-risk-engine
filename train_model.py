"""CLI entrypoint for the Dravix Phase 3.2 training pipeline."""

from __future__ import annotations

from app.training.train_models import train_models


def main() -> None:
    result = train_models()
    print("Dravix training complete")
    print(f"best_model: {result.model_name}")
    print(f"model_version: {result.model_version}")
    print(f"artifact_path: {result.artifact_path}")
    print(f"metadata_path: {result.metadata_path}")
    print(f"metrics: {result.metrics[result.model_name]}")
    print(f"benchmark_rows: {len(result.benchmark_results)}")


if __name__ == "__main__":
    main()
