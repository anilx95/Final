from collections import Counter, deque


class ClassStabilizer:

    def __init__(self, history_size=8):

        self.history_size = history_size

        self.history = {}

    def stabilize(self, detections):

        for detection in detections:

            track_id = detection.get("track_id")

            if track_id is None:
                continue

            if track_id not in self.history:

                self.history[track_id] = deque(
                    maxlen=self.history_size
                )

            self.history[track_id].append(
                detection["class_name"]
            )

            votes = Counter(
                self.history[track_id]
            )

            stable_class = votes.most_common(1)[0][0]

            detection["raw_class_name"] = detection["class_name"]

            detection["class_name"] = stable_class

            detection["class_confidence"] = round(
                votes[stable_class]
                / len(self.history[track_id]),
                2,
            )

        return detections


class_stabilizer = ClassStabilizer()