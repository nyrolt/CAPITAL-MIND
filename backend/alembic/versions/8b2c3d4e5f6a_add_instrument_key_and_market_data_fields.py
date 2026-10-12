"""add_instrument_key_and_market_data_fields

Revision ID: 8b2c3d4e5f6a
Revises: 7a1b2c3d4e5f
Create Date: 2026-10-06 20:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8b2c3d4e5f6a'
down_revision: Union[str, Sequence[str], None] = '7a1b2c3d4e5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add instrument_key, exchange, isin to holdings
    op.add_column('holdings', sa.Column('instrument_key', sa.String(length=128), nullable=True))
    op.add_column('holdings', sa.Column('exchange', sa.String(length=32), nullable=False, server_default='NSE'))
    op.add_column('holdings', sa.Column('isin', sa.String(length=32), nullable=True))
    op.create_index('ix_holdings_instrument_key', 'holdings', ['instrument_key'], unique=False)

    # 2. Add instrument_key, exchange, isin to paper_positions
    op.add_column('paper_positions', sa.Column('instrument_key', sa.String(length=128), nullable=True))
    op.add_column('paper_positions', sa.Column('exchange', sa.String(length=32), nullable=False, server_default='NSE'))
    op.add_column('paper_positions', sa.Column('isin', sa.String(length=32), nullable=True))
    op.create_index('ix_paper_positions_instrument_key', 'paper_positions', ['instrument_key'], unique=False)

    # 3. Add instrument_key to stocks
    op.add_column('stocks', sa.Column('instrument_key', sa.String(length=128), nullable=True))
    op.create_index('ix_stocks_instrument_key', 'stocks', ['instrument_key'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_stocks_instrument_key', table_name='stocks')
    op.drop_column('stocks', 'instrument_key')

    op.drop_index('ix_paper_positions_instrument_key', table_name='paper_positions')
    op.drop_column('paper_positions', 'isin')
    op.drop_column('paper_positions', 'exchange')
    op.drop_column('paper_positions', 'instrument_key')

    op.drop_index('ix_holdings_instrument_key', table_name='holdings')
    op.drop_column('holdings', 'isin')
    op.drop_column('holdings', 'exchange')
    op.drop_column('holdings', 'instrument_key')
