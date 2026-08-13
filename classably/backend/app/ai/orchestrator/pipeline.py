from app.ai.orchestrator.runner import PipelineRunner

from app.ai.orchestrator.stages.detection_stage import DetectionStage
from app.ai.orchestrator.stages.filter_stage import FilterStage
from app.ai.orchestrator.stages.tracking_stage import TrackingStage
from app.ai.orchestrator.stages.stabilization_stage import StabilizationStage
from app.ai.orchestrator.stages.trajectory_stage import TrajectoryStage
from app.ai.orchestrator.stages.collision_stage import CollisionStage
from app.ai.orchestrator.stages.ocr_stage import OCRStage
from app.ai.orchestrator.stages.activity_stage import ActivityStage
from app.ai.orchestrator.stages.navigation_stage import NavigationStage
from app.ai.orchestrator.stages.voice_stage import VoiceStage

pipeline = (
    PipelineRunner()
    .add_stage(DetectionStage())
    .add_stage(FilterStage())
    .add_stage(TrackingStage())
    .add_stage(StabilizationStage())
    .add_stage(TrajectoryStage())
    .add_stage(CollisionStage())
    .add_stage(OCRStage())
    .add_stage(ActivityStage())
    .add_stage(NavigationStage())
    .add_stage(VoiceStage())
)