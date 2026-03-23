from __future__ import annotations

from api.main import app


def test_required_routes_are_registered() -> None:
    route_paths = {route.path for route in app.routes}

    assert "/health" in route_paths
    assert "/version" in route_paths
    assert "/schema" in route_paths
    assert "/model-metadata" in route_paths
    assert "/runtime-status" in route_paths
    assert "/predict" in route_paths
    assert "/rank" in route_paths
    assert "/simulate" in route_paths
    assert "/export/ranking" in route_paths
