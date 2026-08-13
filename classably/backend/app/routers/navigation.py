from fastapi import APIRouter
from app.models.schemas import NavigationQuery
from app.services.navigation import find_accessible_path, CAMPUS_GRAPH

router = APIRouter(prefix="/api/navigation", tags=["navigation"])


@router.get("/locations")
def list_locations():
    return list(CAMPUS_GRAPH.keys())


@router.post("/route")
def get_route(payload: NavigationQuery):
    return find_accessible_path(payload.start, payload.end, payload.avoid_narrow)
