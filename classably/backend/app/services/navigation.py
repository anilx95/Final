"""
Indoor Navigation - accessible pathfinding.

Campus is modelled as a weighted graph of nodes (classrooms, lifts, ramps,
junctions). Edges carry accessibility flags. Dijkstra's algorithm finds the
shortest path while hard-excluding any edge that isn't wheelchair /
mobility-aid accessible (stairs, active construction, sub-90cm passages).
"""
import heapq

# Demo campus graph. In production this would be seeded from a building's
# real floorplan/BIM export.
CAMPUS_GRAPH = {
    "Main Entrance": [
        ("Lift A", 20, {"stairs": False, "narrow": False, "construction": False}),
        ("Corridor 1 (Stairs)", 10, {"stairs": True, "narrow": False, "construction": False}),
    ],
    "Lift A": [
        ("Main Entrance", 20, {"stairs": False, "narrow": False, "construction": False}),
        ("Floor 2 Lobby", 15, {"stairs": False, "narrow": False, "construction": False}),
    ],
    "Corridor 1 (Stairs)": [
        ("Main Entrance", 10, {"stairs": True, "narrow": False, "construction": False}),
        ("Lab 201", 8, {"stairs": True, "narrow": False, "construction": False}),
    ],
    "Floor 2 Lobby": [
        ("Lift A", 15, {"stairs": False, "narrow": False, "construction": False}),
        ("Ramp B", 12, {"stairs": False, "narrow": False, "construction": False}),
        ("Narrow Passage C", 6, {"stairs": False, "narrow": True, "construction": False}),
    ],
    "Ramp B": [
        ("Floor 2 Lobby", 12, {"stairs": False, "narrow": False, "construction": False}),
        ("Lab 201", 22, {"stairs": False, "narrow": False, "construction": False}),
        ("Room 204", 14, {"stairs": False, "narrow": False, "construction": True}),
    ],
    "Narrow Passage C": [
        ("Floor 2 Lobby", 6, {"stairs": False, "narrow": True, "construction": False}),
        ("Lab 201", 5, {"stairs": False, "narrow": True, "construction": False}),
    ],
    "Room 204": [
        ("Ramp B", 14, {"stairs": False, "narrow": False, "construction": True}),
    ],
    "Lab 201": [
        ("Corridor 1 (Stairs)", 8, {"stairs": True, "narrow": False, "construction": False}),
        ("Ramp B", 22, {"stairs": False, "narrow": False, "construction": False}),
        ("Narrow Passage C", 5, {"stairs": False, "narrow": True, "construction": False}),
    ],
}


def find_accessible_path(start: str, end: str, avoid_narrow: bool = True):
    if start not in CAMPUS_GRAPH or end not in CAMPUS_GRAPH:
        return {"error": f"Unknown location. Known locations: {list(CAMPUS_GRAPH.keys())}"}

    dist = {node: float("inf") for node in CAMPUS_GRAPH}
    prev = {}
    dist[start] = 0
    pq = [(0, start)]
    visited = set()

    while pq:
        d, node = heapq.heappop(pq)
        if node in visited:
            continue
        visited.add(node)
        if node == end:
            break
        for neighbor, weight, flags in CAMPUS_GRAPH.get(node, []):
            if flags["stairs"] or flags["construction"]:
                continue  # hard exclude: never route through stairs or active construction
            if avoid_narrow and flags["narrow"]:
                continue
            nd = d + weight
            if nd < dist[neighbor]:
                dist[neighbor] = nd
                prev[neighbor] = node
                heapq.heappush(pq, (nd, neighbor))

    if dist[end] == float("inf"):
        return {
            "error": "No accessible route found avoiding stairs/construction"
            + ("/narrow passages" if avoid_narrow else ""),
            "suggestion": "Try again allowing narrow passages, or contact facilities.",
        }

    path = [end]
    while path[-1] != start:
        path.append(prev[path[-1]])
    path.reverse()

    return {
        "path": path,
        "total_distance_m": dist[end],
        "avoided": ["stairs", "construction"] + (["narrow passages"] if avoid_narrow else []),
    }
