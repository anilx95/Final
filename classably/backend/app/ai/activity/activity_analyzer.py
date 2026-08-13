from app.ai.activity.classroom_state import classroom_state
from app.ai.activity.participation import participation_analyzer
from app.ai.activity.attention import attention_analyzer


class ActivityAnalyzer:

    def analyze(self, detections):

        return {

            "classroom_state": classroom_state.update(
                detections
            ),

            "participation": participation_analyzer.analyze(
                detections
            ),

            "attention": attention_analyzer.analyze(
                detections
            ),
        }


activity_analyzer = ActivityAnalyzer()