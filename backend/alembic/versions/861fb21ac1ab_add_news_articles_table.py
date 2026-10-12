"""add_news_articles_table

Revision ID: 861fb21ac1ab
Revises: b1c2d3e4f5g6
Create Date: 2026-10-12 16:18:41.451055

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '861fb21ac1ab'
down_revision: Union[str, Sequence[str], None] = 'b1c2d3e4f5g6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if table already exists (created safely during startup or metadata creation)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "news_articles" not in tables:
        op.create_table(
            'news_articles',
            sa.Column('id', sa.String(length=64), nullable=False),
            sa.Column('provider', sa.String(length=64), nullable=False),
            sa.Column('provider_article_id', sa.String(length=255), nullable=True),
            sa.Column('headline', sa.Text(), nullable=False),
            sa.Column('summary', sa.Text(), nullable=True),
            sa.Column('source', sa.String(length=64), nullable=False),
            sa.Column('canonical_url', sa.Text(), nullable=False),
            sa.Column('url_hash', sa.String(length=64), nullable=False),
            sa.Column('published_at', sa.DateTime(), nullable=False),
            sa.Column('retrieved_at', sa.DateTime(), nullable=False),
            sa.Column('category', sa.String(length=64), nullable=False),
            sa.Column('related_sectors', sa.Text(), nullable=False),
            sa.Column('related_stocks', sa.Text(), nullable=False),
            sa.Column('analysis_json', sa.Text(), nullable=True),
            sa.Column('analysis_source', sa.String(length=64), nullable=True),
            sa.Column('analysis_status', sa.String(length=32), nullable=False),
            sa.Column('analyzed_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('url_hash', name='uq_news_articles_url_hash')
        )
        op.create_index('ix_news_articles_url_hash', 'news_articles', ['url_hash'], unique=True)
        op.create_index('ix_news_articles_published_at_desc', 'news_articles', ['published_at'], unique=False)
        op.create_index('ix_news_articles_analysis_status', 'news_articles', ['analysis_status'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_news_articles_analysis_status', table_name='news_articles')
    op.drop_index('ix_news_articles_published_at_desc', table_name='news_articles')
    op.drop_index('ix_news_articles_url_hash', table_name='news_articles')
    op.drop_table('news_articles')
