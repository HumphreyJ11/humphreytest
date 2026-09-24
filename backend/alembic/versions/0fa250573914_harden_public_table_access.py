"""Harden public table access.

Revision ID: 0fa250573914
Revises: 0001
Create Date: 2026-09-23 20:12:35.770852

"""
from collections.abc import Sequence

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "0fa250573914"
down_revision: str | Sequence[str] | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY")
    op.execute("REVOKE ALL PRIVILEGES ON TABLE public.topics FROM anon, authenticated")
    op.execute("ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY")
    op.execute(
        "REVOKE ALL PRIVILEGES ON TABLE public.alembic_version FROM anon, authenticated"
    )


def downgrade() -> None:
    op.execute("GRANT ALL PRIVILEGES ON TABLE public.topics TO anon, authenticated")
    op.execute("GRANT ALL PRIVILEGES ON TABLE public.alembic_version TO anon, authenticated")
    op.execute("ALTER TABLE public.alembic_version DISABLE ROW LEVEL SECURITY")
