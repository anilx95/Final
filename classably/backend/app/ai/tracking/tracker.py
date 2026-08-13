import math
import time
from dataclasses import dataclass

from app.ai.config import (
    TRACKING_DISTANCE_THRESHOLD,
    TRACK_EXPIRY_FRAMES,
)


@dataclass
class Track:

    track_id: int

    class_name: str

    center: tuple

    bbox: list

    last_distance: float = None

    last_update: float = 0

    previous_center: tuple = None

    velocity: float = 0

    movement: str = "stationary"

    approaching: bool = False

    distance_delta: float = 0

    time_to_collision: float = -1

    frames_seen: int = 1

    missed_frames: int = 0


class ObjectTracker:

    def __init__(self):

        self.next_id = 1

        self.tracks = {}

    def _center(self, bbox):

        x1, y1, x2, y2 = bbox

        return (
            (x1 + x2) / 2,
            (y1 + y2) / 2,
        )

    def update(self, detections):

        now = time.time()

        matched = set()

        for detection in detections:

            center = self._center(
                detection["bbox"]
            )

            distance = detection.get(
                "distance"
            )

            best_track = None

            best_distance = float("inf")

            for track in self.tracks.values():

                if track.class_name != detection["class_name"]:
                    continue

                d = math.dist(
                    center,
                    track.center,
                )

                if d < best_distance:

                    best_distance = d

                    best_track = track

            if (
                best_track
                and best_distance
                < TRACKING_DISTANCE_THRESHOLD
            ):

                dt = max(
                    now - best_track.last_update,
                    0.001,
                )

                # ---------------------------
                # Velocity
                # ---------------------------

                if best_track.previous_center:

                    movement = math.dist(
                        center,
                        best_track.previous_center,
                    )

                    best_track.velocity = movement / dt

                # ---------------------------
                # Distance Change
                # ---------------------------

                if (
                    distance is not None
                    and best_track.last_distance is not None
                ):

                    delta = (
                        distance
                        - best_track.last_distance
                    )

                    best_track.distance_delta = round(
                        delta,
                        3,
                    )

                    best_track.approaching = delta < -0.15

                    if (
                        best_track.approaching
                        and abs(delta) > 0.01
                    ):

                        best_track.time_to_collision = round(
                            distance / abs(delta),
                            2,
                        )

                    else:

                        best_track.time_to_collision = -1

                best_track.previous_center = (
                    best_track.center
                )

                best_track.center = center

                best_track.last_distance = distance

                best_track.last_update = now

                best_track.frames_seen += 1

                best_track.missed_frames = 0

                detection["track_id"] = best_track.track_id

                detection["frames_seen"] = best_track.frames_seen

                detection["velocity"] = round(
                    best_track.velocity,
                    2,
                )

                detection["approaching"] = (
                    best_track.approaching
                )

                detection["distance_delta"] = (
                    best_track.distance_delta
                )

                detection["time_to_collision"] = (
                    best_track.time_to_collision
                )

                matched.add(
                    best_track.track_id
                )

            else:

                track = Track(
                    track_id=self.next_id,
                    class_name=detection["class_name"],
                    center=center,
                    bbox=detection["bbox"],
                    last_distance=distance,
                    last_update=now,
                )

                self.tracks[self.next_id] = track

                detection["track_id"] = self.next_id

                detection["frames_seen"] = 1

                detection["velocity"] = 0

                detection["approaching"] = False

                detection["distance_delta"] = 0

                detection["time_to_collision"] = -1

                matched.add(self.next_id)

                self.next_id += 1

        expired = []

        for track_id, track in self.tracks.items():

            if track_id not in matched:

                track.missed_frames += 1

                if (
                    track.missed_frames
                    > TRACK_EXPIRY_FRAMES
                ):
                    expired.append(track_id)

        for track_id in expired:

            del self.tracks[track_id]

        return detections


tracker = ObjectTracker()