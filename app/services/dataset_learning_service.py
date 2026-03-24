"""Interface contract for future dataset learning workflows."""

from __future__ import annotations

from typing import TypedDict


class DatasetLearningResult(TypedDict):
    dataset_id: str
    status: str
    learned_patterns: list[str]


def learn_from_dataset(dataset_id: str) -> DatasetLearningResult:
    """Learn from uploaded dataset rows using analysis history and Supabase dataset storage."""
    raise NotImplementedError("Dataset learning is not implemented yet.")
