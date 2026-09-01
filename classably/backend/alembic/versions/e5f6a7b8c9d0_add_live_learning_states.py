"""add live learning states

Revision ID: e5f6a7b8c9d0
Revises: 1bf8223a3c26
"""

from alembic import op
import sqlalchemy as sa

revision = "e5f6a7b8c9d0"
down_revision = "1bf8223a3c26"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "live_learning_states",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("lecture_sessions.id"), nullable=False, unique=True),
        sa.Column("processed_subtitle_id", sa.Integer(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("summary", sa.JSON(), nullable=True),
        sa.Column("topic_map", sa.JSON(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_live_learning_states_id", "live_learning_states", ["id"])
    op.create_index("ix_live_learning_states_session_id", "live_learning_states", ["session_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_live_learning_states_session_id", table_name="live_learning_states")
    op.drop_index("ix_live_learning_states_id", table_name="live_learning_states")
    op.drop_table("live_learning_states")
