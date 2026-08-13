from collections import deque


class TrajectoryPredictor:

    def __init__(self):

        self.history = {}

        self.history_size = 10

    def predict(self, detections):

        for detection in detections:

            track_id = detection.get("track_id")

            if track_id is None:
                continue

            center = self._center(detection["bbox"])

            if track_id not in self.history:

                self.history[track_id] = deque(
                    maxlen=self.history_size
                )

            self.history[track_id].append(center)

            prediction = center

            if len(self.history[track_id]) >= 2:

                last = self.history[track_id][-1]

                prev = self.history[track_id][-2]

                dx = last[0] - prev[0]

                dy = last[1] - prev[1]

                prediction = (
                    last[0] + dx,
                    last[1] + dy,
                )

            detection["predicted_center"] = prediction

        return detections

    def _center(self, bbox):

        x1, y1, x2, y2 = bbox

        return (
            (x1 + x2) / 2,
            (y1 + y2) / 2,
        )


trajectory_predictor = TrajectoryPredictor()