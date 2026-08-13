import asyncio
import base64
import json
import logging

import cv2
import numpy as np

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.database import SessionLocal
from app.websocket.streaming.stream_session import StreamSession

try:
    from app.ai.stream_processor import stream_processor
except Exception:
    stream_processor = None

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/camera/ws")
async def camera_stream(websocket: WebSocket):

    await websocket.accept()

    db = SessionLocal()

    session = StreamSession()

    try:

        # ---------------------------------------------
        # Receive initial connection metadata
        # ---------------------------------------------

        first_message = await websocket.receive_text()

        try:

            data = json.loads(first_message)

            session.classroom_id = data["classroom_id"]

        except (KeyError, json.JSONDecodeError):

            await websocket.send_json(
                {
                    "success": False,
                    "message": "Invalid connection payload.",
                }
            )

            return

        await websocket.send_json(
            {
                "success": True,
                "message": "Camera connected.",
            }
        )

        logger.info(
            "Camera connected (classroom=%s)",
            session.classroom_id,
        )

        if stream_processor is None:
            await websocket.send_json(
                {
                    "success": False,
                    "message": "Camera AI stream processing is unavailable on this server.",
                }
            )
            await websocket.close()
            return

        # ---------------------------------------------
        # Receive Frames
        # ---------------------------------------------

        async def receiver():

            while session.running:

                try:

                    message = await websocket.receive_text()

                    image_bytes = base64.b64decode(message)

                    image = np.frombuffer(
                        image_bytes,
                        dtype=np.uint8,
                    )

                    frame = cv2.imdecode(
                        image,
                        cv2.IMREAD_COLOR,
                    )

                    if frame is not None:

                        session.buffer.push(frame)

                except WebSocketDisconnect:

                    session.running = False
                    break

                except Exception:

                    logger.exception(
                        "Frame receive failed."
                    )

        # ---------------------------------------------
        # Process Frames
        # ---------------------------------------------

        async def processor():

            if stream_processor is None:
                await websocket.send_json(
                    {
                        "success": False,
                        "error": "AI stream processor unavailable.",
                    }
                )
                session.running = False
                return

            while session.running:

                frame = session.buffer.latest()

                if frame is None:

                    await asyncio.sleep(0.01)

                    continue

                try:

                    result = stream_processor.process(
                        frame=frame,
                        classroom_id=session.classroom_id,
                        db=db,
                    )

                    await websocket.send_json(result)

                except WebSocketDisconnect:

                    session.running = False
                    break

                except RuntimeError:

                    session.running = False
                    break

                except Exception:

                    logger.exception(
                        "Stream processing failed."
                    )

        await asyncio.gather(

            receiver(),

            processor(),

        )

    except WebSocketDisconnect:

        logger.info(
            "Camera disconnected (classroom=%s)",
            session.classroom_id,
        )

    except Exception:

        logger.exception(
            "Camera WebSocket failed."
        )

    finally:

        session.running = False

        db.close()

        logger.info(
            "Camera session closed."
        )