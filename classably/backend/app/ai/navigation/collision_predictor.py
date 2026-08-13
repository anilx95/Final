import math


class CollisionPredictor:

    def predict(self, detections):

        for detection in detections:

            center = self._center(
                detection["bbox"]
            )

            future = detection.get(
                "predicted_center"
            )

            if future is None:

                detection["collision_risk"] = False

                continue

            movement = math.dist(
                center,
                future,
            )

            detection["collision_risk"] = (
                movement > 25
            )

        return detections

    def _center(self, bbox):

        x1, y1, x2, y2 = bbox

        return (
            (x1 + x2) / 2,
            (y1 + y2) / 2,
        )


collision_predictor = CollisionPredictor()