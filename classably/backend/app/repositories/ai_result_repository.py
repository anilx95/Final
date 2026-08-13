from sqlalchemy.orm import Session

from app.models.entities.ai_result import AIResult


class AIResultRepository:

    def create(
        self,
        db: Session,
        result: AIResult,
    ) -> AIResult:

        db.add(result)

        db.commit()

        db.refresh(result)

        return result

    def get_by_session(
        self,
        db: Session,
        session_id: int,
    ) -> list[AIResult]:

        return (

            db.query(AIResult)

            .filter(
                AIResult.session_id == session_id
            )

            .order_by(
                AIResult.created_at
            )

            .all()

        )


ai_result_repository = AIResultRepository()