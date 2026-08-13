import time

from app.ai.activity.states import PersonState
from app.ai.activity.rules import *


class ActivityRecognizer:

    def __init__(self):

        self.people = {}

    def _state(self, track):

        track_id = track["track_id"]

        if track_id not in self.people:

            self.people[track_id] = PersonState(

                track_id=track_id,

                label=track["class_name"],

            )

        return self.people[track_id]

    def recognize(self, tracks):

        activities = []

        now = time.time()

        for track in tracks:

            state = self._state(track)

            state.last_seen = now

            velocity = track.get("velocity", 0)

            movement = track.get("movement", "stationary")

            frames = track.get("frames_seen", 0)

            bbox = track["bbox"]

            center_x = (bbox[0] + bbox[2]) / 2

            # ------------------------
            # Moving
            # ------------------------

            if velocity > MIN_MOVING_SPEED:

                state.current_activity = "walking"

                state.moving_frames += 1

            else:

                state.current_activity = "standing"

                state.standing_frames += 1

            # ------------------------
            # Near Board
            # ------------------------

            if center_x > BOARD_REGION_X * 1920:

                state.near_board_frames += 1

                if state.near_board_frames > 20:

                    state.current_activity = "writing_board"

            # ------------------------
            # Entering
            # ------------------------

            if bbox[0] < ENTER_EXIT_MARGIN:

                state.entering_frames += 1

                if state.entering_frames > 8:

                    state.current_activity = "entering"

            # ------------------------
            # Leaving
            # ------------------------

            if bbox[2] > 1880:

                state.leaving_frames += 1

                if state.leaving_frames > 8:

                    state.current_activity = "leaving"

            activities.append({

                "track_id": track["track_id"],

                "class_name": track["class_name"],

                "activity": state.current_activity,

                "confidence": round(

                    min(1.0, frames / 20),

                    2,

                ),

            })

        return activities


recognizer = ActivityRecognizer()