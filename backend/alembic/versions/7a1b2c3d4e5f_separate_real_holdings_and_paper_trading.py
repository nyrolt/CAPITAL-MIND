"""separate_real_holdings_and_paper_trading

Revision ID: 7a1b2c3d4e5f
Revises: 3518d0ccbc06
Create Date: 2026-10-06 19:15:00.000000

"""
from typing import Sequence, Union
from datetime import datetime, timezone
import uuid

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a1b2c3d4e5f'
down_revision: Union[str, Sequence[str], None] = '3518d0ccbc06'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create paper_positions table
    op.create_table(
        'paper_positions',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('account_id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.String(length=64), nullable=False),
        sa.Column('symbol', sa.String(length=64), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('average_price', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('current_price', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('sector', sa.String(length=128), nullable=False, server_default='General'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['paper_trading_accounts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_paper_positions_account_id', 'paper_positions', ['account_id'], unique=False)
    op.create_index('ix_paper_positions_user_id', 'paper_positions', ['user_id'], unique=False)
    op.create_index('ix_paper_positions_symbol', 'paper_positions', ['symbol'], unique=False)
    op.create_index('ix_paper_positions_account_symbol', 'paper_positions', ['account_id', 'symbol'], unique=True)

    # 2. Add account_id to orders
    op.add_column('orders', sa.Column('account_id', sa.String(length=64), nullable=True))
    op.create_index(op.f('ix_orders_account_id'), 'orders', ['account_id'], unique=False)
    op.create_foreign_key('fk_orders_account_id', 'orders', 'paper_trading_accounts', ['account_id'], ['id'], ondelete='SET NULL')

    # 3. Data Migration: Separate Paper Data from Real Holdings
    conn = op.get_bind()

    # Link orders to paper_trading_accounts
    conn.execute(sa.text("""
        UPDATE orders o
        SET account_id = p.id
        FROM paper_trading_accounts p
        WHERE o.user_id = p.user_id AND o.account_id IS NULL
    """))

    # For demo user usr_dev_001, separate TCS and MARUTI into paper_positions
    now_utc = datetime.now(timezone.utc)
    pac_dev = conn.execute(sa.text("SELECT id FROM paper_trading_accounts WHERE user_id = 'usr_dev_001'")).fetchone()
    if pac_dev:
        pac_id = pac_dev[0]
        # Check if TCS was in p1
        tcs_h = conn.execute(sa.text("SELECT quantity, average_price, current_price FROM holdings WHERE portfolio_id = 'p1' AND symbol = 'TCS'")).fetchone()
        if tcs_h:
            pos_id = f"pos_{uuid.uuid4().hex[:8]}"
            conn.execute(sa.text("""
                INSERT INTO paper_positions (id, account_id, user_id, symbol, company_name, quantity, average_price, current_price, sector, created_at, updated_at)
                VALUES (:id, :account_id, 'usr_dev_001', 'TCS', 'Tata Consultancy Services', :qty, :avg_p, :cur_p, 'Technology', :now, :now)
                ON CONFLICT (account_id, symbol) DO NOTHING
            """), {"id": pos_id, "account_id": pac_id, "qty": tcs_h[0], "avg_p": tcs_h[1], "cur_p": tcs_h[2], "now": now_utc})
            conn.execute(sa.text("DELETE FROM holdings WHERE portfolio_id = 'p1' AND symbol = 'TCS'"))

        maruti_h = conn.execute(sa.text("SELECT quantity, average_price, current_price FROM holdings WHERE portfolio_id = 'p1' AND symbol = 'MARUTI'")).fetchone()
        if maruti_h:
            pos_id = f"pos_{uuid.uuid4().hex[:8]}"
            conn.execute(sa.text("""
                INSERT INTO paper_positions (id, account_id, user_id, symbol, company_name, quantity, average_price, current_price, sector, created_at, updated_at)
                VALUES (:id, :account_id, 'usr_dev_001', 'MARUTI', 'Maruti Suzuki India Ltd.', :qty, :avg_p, :cur_p, 'Automotive', :now, :now)
                ON CONFLICT (account_id, symbol) DO NOTHING
            """), {"id": pos_id, "account_id": pac_id, "qty": maruti_h[0], "avg_p": maruti_h[1], "cur_p": maruti_h[2], "now": now_utc})
            conn.execute(sa.text("DELETE FROM holdings WHERE portfolio_id = 'p1' AND symbol = 'MARUTI'"))

        # Restore original seeded quantities for RELIANCE (75) and INFY (90)
        conn.execute(sa.text("UPDATE holdings SET quantity = 75, average_price = 2400 WHERE id = 'h2' AND portfolio_id = 'p1'"))
        conn.execute(sa.text("UPDATE holdings SET quantity = 90, average_price = 1420 WHERE id = 'h3' AND portfolio_id = 'p1'"))

    # For any portfolios specifically titled "Paper Trading Portfolio", migrate their holdings to paper_positions and delete the portfolio
    paper_ports = conn.execute(sa.text("SELECT id, user_id FROM portfolios WHERE name = 'Paper Trading Portfolio'")).fetchall()
    for port_id, uid in paper_ports:
        pac = conn.execute(sa.text("SELECT id FROM paper_trading_accounts WHERE user_id = :uid"), {"uid": uid}).fetchone()
        if pac:
            port_holdings = conn.execute(sa.text("SELECT symbol, company_name, quantity, average_price, current_price, sector FROM holdings WHERE portfolio_id = :pid"), {"pid": port_id}).fetchall()
            for h in port_holdings:
                pos_id = f"pos_{uuid.uuid4().hex[:8]}"
                conn.execute(sa.text("""
                    INSERT INTO paper_positions (id, account_id, user_id, symbol, company_name, quantity, average_price, current_price, sector, created_at, updated_at)
                    VALUES (:id, :account_id, :uid, :sym, :name, :qty, :avg_p, :cur_p, :sec, :now, :now)
                    ON CONFLICT (account_id, symbol) DO NOTHING
                """), {"id": pos_id, "account_id": pac[0], "uid": uid, "sym": h[0], "name": h[1], "qty": h[2], "avg_p": h[3], "cur_p": h[4], "sec": h[5], "now": now_utc})
        # Delete the fake "Paper Trading Portfolio"
        conn.execute(sa.text("DELETE FROM portfolios WHERE id = :pid"), {"pid": port_id})


def downgrade() -> None:
    op.drop_constraint('fk_orders_account_id', 'orders', type_='foreignkey')
    op.drop_index(op.f('ix_orders_account_id'), table_name='orders')
    op.drop_column('orders', 'account_id')
    op.drop_index('ix_paper_positions_account_symbol', table_name='paper_positions')
    op.drop_index('ix_paper_positions_symbol', table_name='paper_positions')
    op.drop_index('ix_paper_positions_user_id', table_name='paper_positions')
    op.drop_index('ix_paper_positions_account_id', table_name='paper_positions')
    op.drop_table('paper_positions')
