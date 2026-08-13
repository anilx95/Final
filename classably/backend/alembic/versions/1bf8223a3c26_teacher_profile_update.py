"""teacher_profile_update

Revision ID: 1bf8223a3c26
Revises: d0eaafcca5ac
Create Date: 2026-07-25 18:39:31.442153
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "1bf8223a3c26"
down_revision: Union[str, None] = "d0eaafcca5ac"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -----------------------------
    # Create lecture_sessions table
    # -----------------------------
    op.create_table(
        "lecture_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("classroom_id", sa.Integer(), nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=False),
        sa.Column("subject", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["classroom_id"], ["classrooms.id"]),
        sa.ForeignKeyConstraint(["teacher_id"], ["teachers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_lecture_sessions_id"),
        "lecture_sessions",
        ["id"],
        unique=False,
    )

    # -----------------------------
    # Link lecture notes to sessions
    # -----------------------------
    op.add_column(
        "lecture_notes",
        sa.Column("session_id", sa.Integer(), nullable=True),
    )

    op.create_foreign_key(
        "fk_lecture_notes_session",
        "lecture_notes",
        "lecture_sessions",
        ["session_id"],
        ["id"],
    )

    # -----------------------------
    # Teacher profile fields
    # -----------------------------
    op.add_column(
        "teachers",
        sa.Column("employee_id", sa.String(), nullable=True),
    )

    op.add_column(
        "teachers",
        sa.Column("phone", sa.String(), nullable=True),
    )

    op.add_column(
        "teachers",
        sa.Column("department", sa.String(), nullable=True),
    )

    op.add_column(
        "teachers",
        sa.Column("designation", sa.String(), nullable=True),
    )

    op.add_column(
        "teachers",
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_index(
        op.f("ix_teachers_employee_id"),
        "teachers",
        ["employee_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_teachers_employee_id"),
        table_name="teachers",
    )

    op.drop_column("teachers", "created_at")
    op.drop_column("teachers", "designation")
    op.drop_column("teachers", "department")
    op.drop_column("teachers", "phone")
    op.drop_column("teachers", "employee_id")

    op.drop_constraint(
        "fk_lecture_notes_session",
        "lecture_notes",
        type_="foreignkey",
    )

    op.drop_column("lecture_notes", "session_id")

    op.drop_index(
        op.f("ix_lecture_sessions_id"),
        table_name="lecture_sessions",
    )

    op.drop_table("lecture_sessions")