class ClassroomState:

    def __init__(self):

        self.state = "idle"

    def update(self, detections):

        persons = sum(
            1
            for d in detections
            if d["class_name"] == "person"
        )

        board = any(
            d["class_name"] in [
                "whiteboard",
                "blackboard",
                "screen",
                "projector",
            ]
            for d in detections
        )

        if persons == 0:

            self.state = "empty"

        elif board:

            self.state = "lecture"

        else:

            self.state = "discussion"

        return self.state


classroom_state = ClassroomState()