from datetime import datetime, timezone
import uuid
import sqlalchemy as sa
from sqlalchemy import (
    Column,
    String,
    Float,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
    Index
)
from sqlalchemy.orm import relationship
from app.database import Base

def gen_uuid(prefix: str = "") -> str:
    short = uuid.uuid4().hex[:8]
    return f"{prefix}_{short}" if prefix else short

class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, default=lambda: gen_uuid("usr"))
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=True)
    role = Column(String(64), default="Retail Investor", nullable=False)
    auth_mode = Column(String(32), default="development", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    portfolios = relationship("Portfolio", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    watchlists = relationship("Watchlist", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    paper_account = relationship("PaperTradingAccount", back_populates="user", uselist=False, cascade="all, delete-orphan", passive_deletes=True)
    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    trades = relationship("Trade", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(String(64), primary_key=True, default=lambda: gen_uuid("p"))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    objective = Column(String(128), default="Wealth Maximization", nullable=False)
    risk_preference = Column(String(64), default="Aggressive", nullable=False)
    description = Column(Text, default="", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="portfolios")
    holdings = relationship("Holding", back_populates="portfolio", cascade="all, delete-orphan", passive_deletes=True, lazy="selectin")
    transactions = relationship("Transaction", back_populates="portfolio", cascade="all, delete-orphan", passive_deletes=True, lazy="selectin")
    snapshots = relationship("PortfolioSnapshot", back_populates="portfolio", cascade="all, delete-orphan", passive_deletes=True, lazy="selectin")


class Holding(Base):
    __tablename__ = "holdings"

    id = Column(String(64), primary_key=True, default=lambda: gen_uuid("h"))
    portfolio_id = Column(String(64), ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False, index=True)
    symbol = Column(String(64), nullable=False, index=True)
    instrument_key = Column(String(128), nullable=True, index=True)
    exchange = Column(String(32), default="NSE", nullable=False)
    isin = Column(String(32), nullable=True)
    company_name = Column(String(255), nullable=False)
    asset_type = Column(String(64), default="Stock", nullable=False)
    quantity = Column(Float, default=0.0, nullable=False)
    average_price = Column(Float, default=0.0, nullable=False)
    current_price = Column(Float, default=0.0, nullable=False)
    sector = Column(String(128), default="General", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    portfolio = relationship("Portfolio", back_populates="holdings")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(64), primary_key=True, default=lambda: gen_uuid("t"))
    portfolio_id = Column(String(64), ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False, index=True)
    symbol = Column(String(64), nullable=False, index=True)
    asset_name = Column(String(255), nullable=False)
    type = Column(String(16), nullable=False)  # BUY, SELL
    quantity = Column(Float, default=0.0, nullable=False)
    price = Column(Float, default=0.0, nullable=False)
    total_value = Column(Float, default=0.0, nullable=False)
    date = Column(String(32), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    portfolio = relationship("Portfolio", back_populates="transactions")


# Schema preparation for future trading & market capabilities
class Stock(Base):
    __tablename__ = "stocks"

    id = Column(String(64), primary_key=True, default=lambda: gen_uuid("stk"))
    symbol = Column(String(64), unique=True, index=True, nullable=False)
    instrument_key = Column(String(128), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=True)
    isin = Column(String(32), nullable=True)
    exchange = Column(String(32), default="NSE", nullable=False)
    sector = Column(String(128), default="General", nullable=False)
    industry = Column(String(128), default="General", nullable=False)
    instrument_type = Column(String(32), default="EQUITY", nullable=False)
    currency = Column(String(8), default="INR", nullable=False)
    current_price = Column(Float, default=0.0, nullable=False)
    previous_close = Column(Float, default=0.0, nullable=False)
    day_open = Column(Float, default=0.0, nullable=False)
    day_high = Column(Float, default=0.0, nullable=False)
    day_low = Column(Float, default=0.0, nullable=False)
    volume = Column(Float, default=0.0, nullable=False)
    market_cap = Column(Float, nullable=True)
    day_change = Column(Float, default=0.0, nullable=False)
    day_change_percentage = Column(Float, default=0.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    # Tracks when sector was last fetched from Fundamentals API (for staleness check)
    sector_fetched_at = Column(DateTime, nullable=True)
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    @property
    def active(self) -> bool:
        return self.is_active


class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(String(64), primary_key=True, default=lambda: gen_uuid("wl"))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(128), default="Default Watchlist", nullable=False)
    symbols = Column(Text, default="[]", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="watchlists")


class PaperTradingAccount(Base):
    __tablename__ = "paper_trading_accounts"

    id = Column(String(64), primary_key=True, default=lambda: gen_uuid("pac"))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    cash_balance = Column(Float, default=1000000.0, nullable=False)
    initial_cash = Column(Float, default=1000000.0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="paper_account")
    positions = relationship("PaperPosition", back_populates="account", cascade="all, delete-orphan", passive_deletes=True, lazy="selectin")
    orders = relationship("Order", back_populates="account")


class PaperPosition(Base):
    __tablename__ = "paper_positions"
    __table_args__ = (
        Index("ix_paper_positions_account_symbol", "account_id", "symbol", unique=True),
    )

    id = Column(String(64), primary_key=True, default=lambda: gen_uuid("pos"))
    account_id = Column(String(64), ForeignKey("paper_trading_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    symbol = Column(String(64), nullable=False, index=True)
    instrument_key = Column(String(128), nullable=True, index=True)
    exchange = Column(String(32), default="NSE", nullable=False)
    isin = Column(String(32), nullable=True)
    company_name = Column(String(255), nullable=False)
    quantity = Column(Float, default=0.0, nullable=False)
    average_price = Column(Float, default=0.0, nullable=False)
    current_price = Column(Float, default=0.0, nullable=False)
    sector = Column(String(128), default="General", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    account = relationship("PaperTradingAccount", back_populates="positions")
    user = relationship("User")


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        Index("ix_orders_user_client_id", "user_id", "client_order_id"),
    )

    id = Column(String(64), primary_key=True, default=lambda: gen_uuid("ord"))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(String(64), ForeignKey("paper_trading_accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    portfolio_id = Column(String(64), ForeignKey("portfolios.id", ondelete="SET NULL"), nullable=True, index=True)
    symbol = Column(String(64), nullable=False, index=True)
    order_type = Column(String(32), default="MARKET", nullable=False)
    side = Column(String(16), default="BUY", nullable=False)
    quantity = Column(Float, default=0.0, nullable=False)
    price = Column(Float, default=0.0, nullable=False)
    requested_price = Column(Float, default=0.0, nullable=False)
    executed_price = Column(Float, default=0.0, nullable=False)
    total_value = Column(Float, default=0.0, nullable=False)
    status = Column(String(32), default="PENDING", nullable=False)
    client_order_id = Column(String(128), nullable=True, index=True)
    rejection_reason = Column(Text, nullable=True)
    filled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="orders")
    account = relationship("PaperTradingAccount", back_populates="orders")
    trades = relationship("Trade", back_populates="order", cascade="all, delete-orphan", passive_deletes=True)


class Trade(Base):
    __tablename__ = "trades"

    id = Column(String(64), primary_key=True, default=lambda: gen_uuid("trd"))
    order_id = Column(String(64), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    symbol = Column(String(64), nullable=False, index=True)
    side = Column(String(16), default="BUY", nullable=False)
    price = Column(Float, default=0.0, nullable=False)
    execution_price = Column(Float, default=0.0, nullable=False)
    quantity = Column(Float, default=0.0, nullable=False)
    total_value = Column(Float, default=0.0, nullable=False)
    executed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    order = relationship("Order", back_populates="trades")
    user = relationship("User", back_populates="trades")


class PortfolioSnapshot(Base):
    __tablename__ = "portfolio_snapshots"
    __table_args__ = (
        # One snapshot per portfolio per calendar date — enforces idempotency
        sa.UniqueConstraint("portfolio_id", "snapshot_date", name="uq_portfolio_snapshots_portfolio_date"),
    )

    id = Column(String(64), primary_key=True, default=lambda: gen_uuid("snp"))
    portfolio_id = Column(String(64), ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False, index=True)
    snapshot_date = Column(String(32), nullable=False, index=True)   # YYYY-MM-DD
    total_value = Column(Float, default=0.0, nullable=False)
    # Breakdown of total_value by asset class
    holdings_value = Column(Float, default=0.0, nullable=True)       # Equity/ETF value
    cash_value = Column(Float, default=0.0, nullable=True)           # Cash-equivalent value
    gold_value = Column(Float, default=0.0, nullable=True)           # Gold ETF value
    other_value = Column(Float, default=0.0, nullable=True)          # Other assets
    # Cost basis and P/L
    invested_capital = Column(Float, default=0.0, nullable=False)
    profit_loss = Column(Float, default=0.0, nullable=False)
    return_percentage = Column(Float, default=0.0, nullable=False)
    # Metadata
    price_source = Column(String(32), default="live", nullable=True)  # 'live', 'eod', 'stale', 'partial'
    is_eod = Column(Boolean, default=False, nullable=True)            # True = captured at market close
    is_reconstructed = Column(Boolean, default=False, nullable=True)  # True = back-filled
    status = Column(String(32), default="complete", nullable=True)    # 'complete', 'partial', 'error'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    portfolio = relationship("Portfolio", back_populates="snapshots")


class NewsArticle(Base):
    __tablename__ = "news_articles"
    __table_args__ = (
        sa.UniqueConstraint("url_hash", name="uq_news_articles_url_hash"),
        Index("ix_news_articles_published_at_desc", "published_at"),
        Index("ix_news_articles_analysis_status", "analysis_status"),
    )

    id = Column(String(64), primary_key=True, default=lambda: gen_uuid("art"))
    provider = Column(String(64), nullable=False)                  # 'Economic Times', 'Livemint', 'Moneycontrol'
    provider_article_id = Column(String(255), nullable=True)
    headline = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    source = Column(String(64), nullable=False)                    # e.g. 'ET Markets', 'Livemint'
    canonical_url = Column(Text, nullable=False)
    url_hash = Column(String(64), nullable=False, unique=True, index=True)
    published_at = Column(DateTime, nullable=False)
    retrieved_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    category = Column(String(64), default="Markets", nullable=False)
    related_sectors = Column(Text, default="[]", nullable=False)   # JSON string list
    related_stocks = Column(Text, default="[]", nullable=False)    # JSON string list of verified tickers
    analysis_json = Column(Text, nullable=True)                    # JSON string with validated Gemini impact schema
    analysis_source = Column(String(64), nullable=True)            # e.g. 'gemini-flash-lite-latest', 'simulated'
    analysis_status = Column(String(32), default="PENDING", nullable=False) # 'PENDING', 'ANALYZED', 'FAILED', 'RATE_LIMITED'
    analyzed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class UserSession(Base):
    __tablename__ = "user_sessions"
    __table_args__ = (
        Index("ix_user_sessions_user_id_active", "user_id", "is_revoked"),
        Index("ix_user_sessions_expires_at", "expires_at"),
    )

    id = Column(String(64), primary_key=True, default=lambda: gen_uuid("sess"))
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_token = Column(String(255), unique=True, index=True, nullable=False)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(Text, nullable=True)
    is_revoked = Column(Boolean, default=False, nullable=False)
    last_activity_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_created_at_desc", "created_at"),
    )

    id = Column(String(64), primary_key=True, default=lambda: gen_uuid("aud"))
    user_id = Column(String(64), nullable=True, index=True)
    action = Column(String(128), nullable=False)
    resource_type = Column(String(64), nullable=False)
    resource_id = Column(String(128), nullable=True)
    details = Column(Text, nullable=True)
    status = Column(String(32), default="SUCCESS", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


