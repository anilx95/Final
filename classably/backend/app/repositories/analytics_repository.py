from sqlalchemy.orm import Session

from app.models.entities.analytics import Analytics


class AnalyticsRepository:

    def create(
        self,
        db: Session,
        analytics: Analytics,
    ) -> Analytics:

        db.add(analytics)

        db.commit()

        db.refresh(analytics)

        return analytics

    def get_by_session(
        self,
        db: Session,
        session_id: int,
    ) -> list[Analytics]:

        return (

            db.query(Analytics)

            .filter(
                Analytics.session_id == session_id
            )

            .all()

        )


analytics_repository = AnalyticsRepository()