import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.ai.cache.session_store import session_store
from app.ai.orchestrator.context import PipelineContext
from app.ai.orchestrator.pipeline import pipeline

router = APIRouter()


@router.websocket("/live")
async def live_stream(
    websocket: WebSocket,
):

    await websocket.accept()

    session_id = str(uuid.uuid4())

    try:

        while True:

            frame = await websocket.receive_bytes()

            context = PipelineContext(
                image=frame,
                session_id=session_id,
            )

            context = pipeline.run(context)

            session_store.put(
                session_id,
                context,
            )

            await websocket.send_json(

                {

                    "session_id": session_id,

                    "processing_time": context.processing_time,

                    "objects_detected": len(
                        getattr(
                            context,
                            "detections",
                            [],
                        )
                    ),

                    "alerts": getattr(
                        context,
                        "alerts",
                        [],
                    ),

                    "navigation": (
                        context.navigation.tts_message
                        if context.navigation
                        else None
                    ),

                    "voice_messages": [

                        message.message

                        for message in getattr(
                            context,
                            "voice_messages",
                            [],
                        )

                    ],

                }

            )

    except WebSocketDisconnect:

        pass