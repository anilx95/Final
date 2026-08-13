from collections import Counter


class TimelineSummary:
    """
    Generates high-level statistics from the classroom timeline.
    """

    def generate(
        self,
        timeline,
    ):

        if not timeline:

            return {

                "total_events": 0,

                "critical_events": 0,

                "high_priority_events": 0,

                "lecture_started": False,

                "lecture_active": False,

                "teacher_actions": 0,

                "student_actions": 0,

                "most_common_event": None,

            }

        priorities = Counter()

        events = Counter()

        teacher_actions = 0

        student_actions = 0

        lecture_started = False

        lecture_active = False

        for item in timeline:

            priorities[item["priority"]] += 1

            events[item["event"]] += 1

            event_name = item["event"]

            if event_name.startswith("Teacher"):

                teacher_actions += 1

            if event_name.startswith("Student"):

                student_actions += 1

            if event_name in (

                "TeacherStartedWriting",

                "TeacherExplaining",

                "TeacherMoving",

            ):

                lecture_started = True
                lecture_active = True

        return {

            "total_events": len(timeline),

            "critical_events": priorities["critical"],

            "high_priority_events": priorities["high"],

            "normal_events": priorities["normal"],

            "low_priority_events": priorities["low"],

            "teacher_actions": teacher_actions,

            "student_actions": student_actions,

            "lecture_started": lecture_started,

            "lecture_active": lecture_active,

            "most_common_event": (

                events.most_common(1)[0][0]

                if events

                else None

            ),

        }


summary = TimelineSummary()