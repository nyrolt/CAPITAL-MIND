"""add_sector_fetched_at_to_stocks

Revision ID: a1b2c3d4e5f6
Revises: 8b2c3d4e5f6a
Create Date: 2026-10-08 19:54:00.000000

Adds sector_fetched_at DateTime column to stocks table.
Tracks when the Upstox Fundamentals API last provided sector data.
Stale threshold: 7 days.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '8b2c3d4e5f6a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('stocks', sa.Column('sector_fetched_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('stocks', 'sector_fetched_at')
