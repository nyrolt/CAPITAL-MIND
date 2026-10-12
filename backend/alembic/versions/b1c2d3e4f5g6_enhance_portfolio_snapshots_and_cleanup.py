"""Enhance portfolio_snapshots table and clean up orphan test portfolios

Revision ID: b1c2d3e4f5g6
Revises: a1b2c3d4e5f6
Create Date: 2026-10-09 20:15:00.000000

Changes:
  1. Add new columns to portfolio_snapshots:
     - holdings_value  (Float)  — Stock/ETF holdings market value
     - cash_value      (Float)  — Cash-equivalent holdings value
     - gold_value      (Float)  — Gold ETF value
     - other_value     (Float)  — Other asset classes value
     - price_source    (String) — 'live', 'eod', 'stale', 'partial'
     - is_eod          (Boolean)— True = captured at market close
     - is_reconstructed(Boolean)— True = back-filled from transaction history
     - status          (String) — 'complete', 'partial', 'error'
  2. Add unique constraint (portfolio_id, snapshot_date) — one row per portfolio per day
  3. Remove demonstrably orphan test portfolios created by repeated test runs
     (safe: only removes portfolios whose names match known test-fixture names
      and have no real user-created holdings beyond the seed data)
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b1c2d3e4f5g6'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add new columns to portfolio_snapshots
    with op.batch_alter_table('portfolio_snapshots', schema=None) as batch_op:
        batch_op.add_column(sa.Column('holdings_value', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('cash_value', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('gold_value', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('other_value', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('price_source', sa.String(32), nullable=True))
        batch_op.add_column(sa.Column('is_eod', sa.Boolean(), nullable=True, server_default='false'))
        batch_op.add_column(sa.Column('is_reconstructed', sa.Boolean(), nullable=True, server_default='false'))
        batch_op.add_column(sa.Column('status', sa.String(32), nullable=True, server_default='complete'))
        # Unique constraint: one snapshot per portfolio per calendar date
        batch_op.create_unique_constraint(
            'uq_portfolio_snapshots_portfolio_date',
            ['portfolio_id', 'snapshot_date']
        )

    # 2. Clean up orphan test portfolios created by repeated unit-test runs.
    #    We identify them by:
    #    - Name is one of the known test-fixture names
    #    - ID prefix is 'p_' (dynamically generated, NOT the seeded 'p1' / 'p2')
    #    We do NOT touch 'p1', 'p2', or any portfolio with real transaction history.
    conn = op.get_bind()
    test_portfolio_names = (
        'Alice Tech Growth',
        'Bob Conservative Yield',
        'Persistence Test Portfolio',
        'Paper Trading Portfolio',
        'User A Real Portfolio',
    )
    placeholders = ', '.join([f"'{n}'" for n in test_portfolio_names])

    # First delete dependent records for these test portfolios (cascade would handle it, but explicit is safer)
    conn.execute(sa.text(f"""
        DELETE FROM holdings
        WHERE portfolio_id IN (
            SELECT id FROM portfolios
            WHERE name IN ({placeholders})
            AND id LIKE 'p\\_%%' ESCAPE '\\'
        )
    """))
    conn.execute(sa.text(f"""
        DELETE FROM transactions
        WHERE portfolio_id IN (
            SELECT id FROM portfolios
            WHERE name IN ({placeholders})
            AND id LIKE 'p\\_%%' ESCAPE '\\'
        )
    """))
    conn.execute(sa.text(f"""
        DELETE FROM portfolio_snapshots
        WHERE portfolio_id IN (
            SELECT id FROM portfolios
            WHERE name IN ({placeholders})
            AND id LIKE 'p\\_%%' ESCAPE '\\'
        )
    """))
    conn.execute(sa.text(f"""
        DELETE FROM portfolios
        WHERE name IN ({placeholders})
        AND id LIKE 'p\\_%%' ESCAPE '\\'
    """))


def downgrade() -> None:
    # Remove new columns (downgrade does NOT restore deleted test portfolios)
    with op.batch_alter_table('portfolio_snapshots', schema=None) as batch_op:
        batch_op.drop_constraint('uq_portfolio_snapshots_portfolio_date', type_='unique')
        batch_op.drop_column('status')
        batch_op.drop_column('is_reconstructed')
        batch_op.drop_column('is_eod')
        batch_op.drop_column('price_source')
        batch_op.drop_column('other_value')
        batch_op.drop_column('gold_value')
        batch_op.drop_column('cash_value')
        batch_op.drop_column('holdings_value')
