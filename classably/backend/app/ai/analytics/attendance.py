class AttendanceAnalyzer:

    def analyze(
        self,
        context,
    ):

        tracks = getattr(
            context,
            "tracks",
            [],
        )

        unique_ids = {

            t.get("track_id")

            for t in tracks

            if t.get("track_id") is not None

        }

        return {

            "present_students": len(unique_ids),

        }


attendance = AttendanceAnalyzer()