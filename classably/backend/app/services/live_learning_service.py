"""Incremental transcript → summary → topic-map pipeline for active lectures."""

import asyncio
import json
import logging
import re
from typing import Any

from app.core.database import SessionLocal
from app.models.entities.lecture import LectureSession, LiveLearningState, LiveSubtitle
from app.services.ai_qa_service import ai_qa_service
from app.services.ws_manager import ws_manager

logger = logging.getLogger(__name__)

INITIAL_WORDS = 10
REFINEMENT_WORDS = 20
DEBOUNCE_SECONDS = 3
_scheduled: dict[int, asyncio.Task] = {}


def _clean_json(raw: str) -> dict[str, Any] | None:
    try:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1].removesuffix("```").strip()
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()
        value = json.loads(cleaned)
        return value if isinstance(value, dict) else None
    except (ValueError, TypeError):
        return None


def _fallback(previous: dict[str, Any], delta: str, topic: str) -> dict[str, Any]:
    """Grounded fallback used when Gemini is unavailable; it never invents content."""
    old_text = str(previous.get("summary_text", "")).strip()
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", delta) if len(s.strip()) > 10]
    additions = sentences[:3] or ([delta] if delta else [])
    summary_text = " ".join(part for part in [old_text, *additions] if part).strip()
    points = list(previous.get("key_points", []))
    for sentence in additions:
        if sentence not in points:
            points.append(sentence)
    terms = [word.lower() for word in re.findall(r"[A-Za-z][A-Za-z-]{3,}", delta)]
    ignored = {"this", "that", "with", "from", "have", "will", "into", "about", "their", "they", "then", "when"}
    concepts = []
    for term in terms:
        if term not in ignored and term not in concepts:
            concepts.append(term)
    return {
        "summary_text": summary_text,
        "key_points": points[-8:],
        "concepts": [{"id": term.replace(" ", "_"), "label": term.title(), "description": "Mentioned by the teacher."} for term in concepts[:6]],
        "title": topic or "Active Lecture",
    }


def _to_topic_map(result: dict[str, Any], previous_map: dict[str, Any], topic: str) -> dict[str, Any]:
    existing = {node.get("id"): node for node in previous_map.get("nodes", []) if node.get("id")}
    palette = ["#2563eb", "#0284c7", "#16a34a", "#ea580c", "#8b5cf6", "#ec4899"]
    root_id = "root"
    root = existing.get(root_id, {"id": root_id, "label": result.get("title") or topic or "Active Lecture", "desc": "Current lecture topic.", "color": "#2563eb"})
    nodes = [root]
    for index, concept in enumerate(result.get("concepts", [])[:10]):
        label = str(concept.get("label", "")).strip()
        if not label:
            continue
        node_id = str(concept.get("id") or re.sub(r"\W+", "_", label.lower())).strip("_")
        if not node_id or node_id == root_id:
            continue
        nodes.append({
            "id": node_id,
            "label": label,
            "desc": str(concept.get("description") or "Explained in the live lecture."),
            "color": concept.get("color") or palette[(len(nodes) - 1) % len(palette)],
        })
    # Keep already learned nodes when Gemini returns a compact patch.
    known_ids = {node["id"] for node in nodes}
    nodes.extend(node for node_id, node in existing.items() if node_id not in known_ids and node_id != root_id)
    nodes = nodes[:11]
    links = [{"from": root_id, "to": node["id"], "label": "includes"} for node in nodes[1:]]
    return {"title": root["label"], "nodes": nodes, "links": links}


def _refine(previous: dict[str, Any], delta: str, subject: str, topic: str) -> dict[str, Any]:
    prompt = f'''You maintain a live classroom knowledge state. Update it only with facts in NEW_TRANSCRIPT.
Do not remove correct previous concepts. Merge duplicate concepts and improve descriptions when NEW_TRANSCRIPT clarifies them.

SUBJECT: {subject}
TOPIC: {topic}
PREVIOUS_STATE: {json.dumps(previous, ensure_ascii=False)}
NEW_TRANSCRIPT: {delta}

Return JSON only:
{{"title":"short lecture title","summary_text":"one evolving detailed paragraph","key_points":["grounded point"],"concepts":[{{"id":"stable_snake_case_id","label":"concept","description":"grounded explanation"}}]}}'''
    raw = ai_qa_service._call_gemini_rest(prompt, timeout=12)
    parsed = _clean_json(raw) if raw else None
    return parsed or _fallback(previous, delta, topic)


async def _process(session_id: int) -> None:
    try:
        with SessionLocal() as db:
            session = db.get(LectureSession, session_id)
            if not session:
                return
            state = db.query(LiveLearningState).filter_by(session_id=session_id).first()
            if not state:
                state = LiveLearningState(session_id=session_id, summary={}, topic_map={}, version=0)
                db.add(state)
                db.flush()
            query = db.query(LiveSubtitle).filter(LiveSubtitle.session_id == session_id)
            if state.processed_subtitle_id:
                query = query.filter(LiveSubtitle.id > state.processed_subtitle_id)
            subtitles = query.order_by(LiveSubtitle.id.asc()).all()
            delta = " ".join(item.original_text.strip() for item in subtitles if item.original_text).strip()
            word_count = len(delta.split())
            threshold = INITIAL_WORDS if state.version == 0 else REFINEMENT_WORDS
            if not subtitles or word_count < threshold:
                return
            result = _refine(state.summary or {}, delta, session.subject or "General Lecture", session.topic or "Lecture")
            state.summary = result
            state.topic_map = _to_topic_map(result, state.topic_map or {}, session.topic or session.subject)
            state.processed_subtitle_id = subtitles[-1].id
            state.version += 1
            db.commit()
            payload = {
                "type": "live_learning_update",
                "session_id": session_id,
                "version": state.version,
                "summary": state.summary,
                "topic_map": state.topic_map,
            }
            await ws_manager.broadcast_event(str(session.classroom_id), payload)
    except Exception:
        logger.exception("Live learning update failed for session %s", session_id)
    finally:
        _scheduled.pop(session_id, None)


async def schedule_live_learning_update(session_id: int) -> None:
    previous = _scheduled.get(session_id)
    if previous and not previous.done():
        previous.cancel()

    async def delayed() -> None:
        try:
            await asyncio.sleep(DEBOUNCE_SECONDS)
            await _process(session_id)
        except asyncio.CancelledError:
            return

    _scheduled[session_id] = asyncio.create_task(delayed())


def get_live_learning_state(session_id: int, db) -> dict[str, Any] | None:
    state = db.query(LiveLearningState).filter_by(session_id=session_id).first()
    if not state:
        return None
    return {"session_id": session_id, "version": state.version, "summary": state.summary or {}, "topic_map": state.topic_map or {}}
