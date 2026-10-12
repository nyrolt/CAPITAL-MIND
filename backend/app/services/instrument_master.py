import gzip
import json
import time
import logging
import threading
from pathlib import Path
from typing import List, Dict, Any, Optional
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
import httpx

logger = logging.getLogger("capitalmind.instruments")

UPSTOX_INSTRUMENTS_URL = "https://assets.upstox.com/market-quote/instruments/exchange/complete.json.gz"
VALID_SEGMENTS = {"NSE_EQ", "BSE_EQ", "NSE_INDEX", "BSE_INDEX"}

class Instrument(BaseModel):
    instrument_key: str
    exchange: str
    segment: str
    trading_symbol: str
    name: str
    short_name: Optional[str] = None
    isin: Optional[str] = None
    instrument_type: str = "EQ"
    tick_size: float = 0.05
    lot_size: int = 1
    exchange_token: Optional[str] = None

# Backward compatibility alias
InstrumentMetadata = Instrument

# Compact fallback seed list for offline/zero-network emergency startup
FALLBACK_SEED_INSTRUMENTS: List[Dict[str, Any]] = [
    {
        "instrument_key": "NSE_EQ|INE009A01021",
        "exchange": "NSE",
        "segment": "NSE_EQ",
        "trading_symbol": "INFY",
        "name": "Infosys Limited",
        "short_name": "Infosys",
        "isin": "INE009A01021",
        "instrument_type": "EQ",
        "tick_size": 0.05,
        "lot_size": 1,
        "exchange_token": "1594"
    },
    {
        "instrument_key": "BSE_EQ|INE009A01021",
        "exchange": "BSE",
        "segment": "BSE_EQ",
        "trading_symbol": "INFY",
        "name": "Infosys Limited",
        "short_name": "Infosys",
        "isin": "INE009A01021",
        "instrument_type": "EQ",
        "tick_size": 0.05,
        "lot_size": 1,
        "exchange_token": "500209"
    },
    {
        "instrument_key": "NSE_EQ|INE467B01029",
        "exchange": "NSE",
        "segment": "NSE_EQ",
        "trading_symbol": "TCS",
        "name": "Tata Consultancy Services Limited",
        "short_name": "TCS",
        "isin": "INE467B01029",
        "instrument_type": "EQ",
        "tick_size": 0.05,
        "lot_size": 1,
        "exchange_token": "11536"
    },
    {
        "instrument_key": "BSE_EQ|INE467B01029",
        "exchange": "BSE",
        "segment": "BSE_EQ",
        "trading_symbol": "TCS",
        "name": "Tata Consultancy Services Limited",
        "short_name": "TCS",
        "isin": "INE467B01029",
        "instrument_type": "EQ",
        "tick_size": 0.05,
        "lot_size": 1,
        "exchange_token": "532540"
    },
    {
        "instrument_key": "NSE_EQ|INE002A01018",
        "exchange": "NSE",
        "segment": "NSE_EQ",
        "trading_symbol": "RELIANCE",
        "name": "Reliance Industries Limited",
        "short_name": "Reliance",
        "isin": "INE002A01018",
        "instrument_type": "EQ",
        "tick_size": 0.05,
        "lot_size": 1,
        "exchange_token": "2885"
    },
    {
        "instrument_key": "BSE_EQ|INE002A01018",
        "exchange": "BSE",
        "segment": "BSE_EQ",
        "trading_symbol": "RELIANCE",
        "name": "Reliance Industries Limited",
        "short_name": "Reliance",
        "isin": "INE002A01018",
        "instrument_type": "EQ",
        "tick_size": 0.05,
        "lot_size": 1,
        "exchange_token": "500325"
    },
    {
        "instrument_key": "NSE_EQ|INE040A01034",
        "exchange": "NSE",
        "segment": "NSE_EQ",
        "trading_symbol": "HDFCBANK",
        "name": "HDFC Bank Limited",
        "short_name": "HDFC Bank",
        "isin": "INE040A01034",
        "instrument_type": "EQ",
        "tick_size": 0.05,
        "lot_size": 1,
        "exchange_token": "1333"
    },
    {
        "instrument_key": "NSE_INDEX|Nifty 50",
        "exchange": "NSE",
        "segment": "NSE_INDEX",
        "trading_symbol": "NIFTY 50",
        "name": "Nifty 50 Index",
        "short_name": "Nifty 50",
        "isin": None,
        "instrument_type": "INDEX",
        "tick_size": 0.05,
        "lot_size": 1,
        "exchange_token": "17"
    },
    {
        "instrument_key": "NSE_INDEX|Nifty Bank",
        "exchange": "NSE",
        "segment": "NSE_INDEX",
        "trading_symbol": "NIFTY BANK",
        "name": "Nifty Bank Index",
        "short_name": "Bank Nifty",
        "isin": None,
        "instrument_type": "INDEX",
        "tick_size": 0.05,
        "lot_size": 1,
        "exchange_token": "23"
    },
    {
        "instrument_key": "NSE_EQ|INF732E01078",
        "exchange": "NSE",
        "segment": "NSE_EQ",
        "trading_symbol": "NIFTYBEES",
        "name": "Nippon India ETF Nifty 50 BeES",
        "short_name": "Nifty BeES",
        "isin": "INF732E01078",
        "instrument_type": "ETF",
        "tick_size": 0.01,
        "lot_size": 1,
        "exchange_token": "10576"
    },
    {
        "instrument_key": "NSE_EQ|IN0020230085",
        "exchange": "NSE",
        "segment": "NSE_EQ",
        "trading_symbol": "GSEC2033",
        "name": "7.18% GS 2033 Sovereign Bond",
        "short_name": "GSEC2033",
        "isin": "IN0020230085",
        "instrument_type": "BOND",
        "tick_size": 0.01,
        "lot_size": 1,
        "exchange_token": "99999"
    }
]

# Alias for backward compatibility
SEED_INSTRUMENTS = FALLBACK_SEED_INSTRUMENTS

class InstrumentMasterService:
    """
    Production-grade Indian Instrument Master & Dynamic Search Service.
    Indexes full Upstox Indian Market Data Feed V3 instruments across NSE, BSE,
    ETFs, BEES, Indices, and Bonds. Supports live search, canonical resolution,
    and background catalogue refresh.
    """
    def __init__(self):
        self._by_key: Dict[str, Instrument] = {}
        self._by_symbol: Dict[str, List[Instrument]] = {}
        self._by_isin: Dict[str, List[Instrument]] = {}
        self._instruments: List[Instrument] = []
        self._lock = threading.RLock()
        self._cache_file = Path(__file__).resolve().parent.parent.parent / "data" / "upstox_instruments.json.gz"
        self._last_sync_time: Optional[float] = None
        self._is_syncing: bool = False

        self._initialize()

    def _initialize(self):
        with self._lock:
            # 1. Attempt to load from cached disk file
            loaded = self._load_from_cache_file()
            if not loaded or len(self._instruments) < 50:
                logger.info("[INSTRUMENT_MASTER] Cache file missing or small, downloading from Upstox CDN...")
                sync_success = self.sync_catalog(background=False)
                if not sync_success:
                    logger.warning("[INSTRUMENT_MASTER] Upstox download failed, loading fallback seed instruments.")
                    self._load_fallback_seeds()

    def _load_from_cache_file(self) -> bool:
        if not self._cache_file.exists():
            return False
        try:
            t0 = time.time()
            with gzip.open(self._cache_file, "rt", encoding="utf-8") as f:
                data = json.load(f)
            
            self._by_key.clear()
            self._by_symbol.clear()
            self._by_isin.clear()
            self._instruments.clear()

            for item in data:
                inst = Instrument(**item)
                self._add_instrument_internal(inst)

            for raw in FALLBACK_SEED_INSTRUMENTS:
                if raw["instrument_key"] not in self._by_key:
                    inst = Instrument(**raw)
                    self._add_instrument_internal(inst)

            self._last_sync_time = self._cache_file.stat().st_mtime
            logger.info(f"[INSTRUMENT_MASTER] Loaded {len(self._instruments)} instruments from cache in {time.time()-t0:.2f}s.")
            return True
        except Exception as e:
            logger.error(f"[INSTRUMENT_MASTER] Failed to load cache file: {e}")
            return False

    def _load_fallback_seeds(self):
        for raw in FALLBACK_SEED_INSTRUMENTS:
            inst = Instrument(**raw)
            self._add_instrument_internal(inst)
        logger.info(f"[INSTRUMENT_MASTER] Loaded {len(self._instruments)} fallback seed instruments.")

    def _add_instrument_internal(self, inst: Instrument):
        self._by_key[inst.instrument_key] = inst
        
        sym_upper = inst.trading_symbol.strip().upper()
        if sym_upper not in self._by_symbol:
            self._by_symbol[sym_upper] = []
        if not any(x.instrument_key == inst.instrument_key for x in self._by_symbol[sym_upper]):
            self._by_symbol[sym_upper].append(inst)

        # Also index name and standard aliases for indices
        aliases = []
        if inst.name and inst.name.strip().upper() != sym_upper:
            aliases.append(inst.name.strip().upper())
        if inst.instrument_key == "NSE_INDEX|Nifty 50":
            aliases.extend(["NIFTY 50", "NIFTY50", "NIFTY", "NIFTY_50"])
        elif inst.instrument_key == "NSE_INDEX|Nifty Bank":
            aliases.extend(["NIFTY BANK", "BANKNIFTY"])
        elif inst.isin == "IN0020230085" or inst.instrument_key == "NSE_EQ|IN0020230085":
            aliases.append("GSEC2033")

        for alias in aliases:
            if alias not in self._by_symbol:
                self._by_symbol[alias] = []
            if not any(x.instrument_key == inst.instrument_key for x in self._by_symbol[alias]):
                self._by_symbol[alias].append(inst)

        if inst.isin:
            isin_upper = inst.isin.strip().upper()
            if isin_upper not in self._by_isin:
                self._by_isin[isin_upper] = []
            if not any(x.instrument_key == inst.instrument_key for x in self._by_isin[isin_upper]):
                self._by_isin[isin_upper].append(inst)

        self._instruments.append(inst)

    def sync_catalog(self, background: bool = False) -> bool:
        """
        Downloads latest Upstox complete instrument catalog, filters cash instruments,
        updates cache file and reloads in-memory indexes.
        """
        if self._is_syncing:
            logger.info("[INSTRUMENT_MASTER] Catalog sync already in progress, skipping.")
            return False

        if background:
            t = threading.Thread(target=self._perform_sync, daemon=True)
            t.start()
            return True
        else:
            return self._perform_sync()

    def _perform_sync(self) -> bool:
        self._is_syncing = True
        try:
            logger.info(f"[INSTRUMENT_MASTER] Fetching latest Upstox catalog from {UPSTOX_INSTRUMENTS_URL}...")
            t0 = time.time()
            with httpx.Client(timeout=60.0) as client:
                res = client.get(UPSTOX_INSTRUMENTS_URL)
                if res.status_code != 200:
                    logger.error(f"[INSTRUMENT_MASTER] Upstox CDN returned status {res.status_code}")
                    return False
                raw_bytes = res.content

            raw_data = json.loads(gzip.decompress(raw_bytes))
            cash_instruments = []

            for item in raw_data:
                seg = item.get("segment")
                if seg in VALID_SEGMENTS:
                    inst_key = item.get("instrument_key")
                    trading_symbol = item.get("trading_symbol")
                    if not inst_key or not trading_symbol:
                        continue

                    inst_type = (item.get("instrument_type") or "EQ").upper()
                    if seg in ("NSE_INDEX", "BSE_INDEX") or inst_type == "INDEX":
                        norm_type = "INDEX"
                    elif inst_type == "ETF" or "ETF" in trading_symbol.upper() or "BEES" in trading_symbol.upper():
                        norm_type = "ETF"
                    elif inst_type in ("SG", "GB", "GS", "TB", "DEB", "BOND", "NCD", "F"):
                        norm_type = "BOND"
                    elif inst_type == "PREF":
                        norm_type = "PREFERENCE"
                    elif inst_type in ("EQ", "A", "B", "T", "XT", "Z", "M", "MT", "P", "ST"):
                        norm_type = "EQ"
                    else:
                        norm_type = inst_type

                    cash_instruments.append({
                        "instrument_key": inst_key,
                        "exchange": item.get("exchange", "NSE"),
                        "segment": seg,
                        "trading_symbol": trading_symbol,
                        "name": item.get("name") or trading_symbol,
                        "short_name": item.get("short_name") or trading_symbol,
                        "isin": item.get("isin"),
                        "instrument_type": norm_type,
                        "tick_size": float(item.get("tick_size") or 0.05),
                        "lot_size": int(item.get("lot_size") or 1),
                        "exchange_token": item.get("exchange_token")
                    })

            if not cash_instruments:
                logger.error("[INSTRUMENT_MASTER] Parsed 0 cash instruments from catalog.")
                return False

            # Persist to disk
            self._cache_file.parent.mkdir(parents=True, exist_ok=True)
            with gzip.open(self._cache_file, "wt", encoding="utf-8") as f:
                json.dump(cash_instruments, f)

            # Reload in-memory indexes under lock
            with self._lock:
                self._by_key.clear()
                self._by_symbol.clear()
                self._by_isin.clear()
                self._instruments.clear()

                for item in cash_instruments:
                    inst = Instrument(**item)
                    self._add_instrument_internal(inst)

                self._last_sync_time = time.time()

            logger.info(f"[INSTRUMENT_MASTER] Successfully synced {len(cash_instruments)} instruments in {time.time()-t0:.2f}s.")
            return True
        except Exception as e:
            logger.error(f"[INSTRUMENT_MASTER] Error during catalog sync: {e}")
            return False
        finally:
            self._is_syncing = False

    def get_by_key(self, instrument_key: str) -> Optional[Instrument]:
        with self._lock:
            return self._by_key.get(instrument_key)

    def get_by_symbol(self, symbol: str, exchange: Optional[str] = None) -> Optional[Instrument]:
        sym_upper = symbol.strip().upper()
        with self._lock:
            matches = self._by_symbol.get(sym_upper, [])
            if not matches:
                # Try index or spaced name match
                for inst in self._instruments:
                    if inst.trading_symbol.upper() == sym_upper:
                        if exchange is None or inst.exchange.upper() == exchange.upper():
                            return inst
                return None

            if exchange:
                for m in matches:
                    if m.exchange.upper() == exchange.upper():
                        return m
            # Prefer NSE if available
            for m in matches:
                if m.exchange == "NSE":
                    return m
            return matches[0]

    def get_by_isin(self, isin: str, exchange: Optional[str] = None) -> Optional[Instrument]:
        isin_upper = isin.strip().upper()
        with self._lock:
            matches = self._by_isin.get(isin_upper, [])
            if not matches:
                return None
            if exchange:
                for m in matches:
                    if m.exchange.upper() == exchange.upper():
                        return m
            for m in matches:
                if m.exchange == "NSE":
                    return m
            return matches[0]

    def resolve_key(self, symbol_or_key: str, exchange: str = "NSE") -> str:
        """
        Takes a symbol (e.g. 'INFY', 'MRF', 'JSWSTEEL') or instrument_key
        and returns the canonical instrument_key.
        """
        token = symbol_or_key.strip()
        if "|" in token:
            return token
        inst = self.get_by_symbol(token, exchange)
        if inst:
            return inst.instrument_key
        # Fallback format if unknown
        return f"{exchange}_EQ|{token.upper()}"

    def search(self, query: str, limit: int = 25) -> List[Dict[str, Any]]:
        """
        High-performance search across 22,000+ Indian instruments.
        Supports trading symbol (exact/prefix/contains), company name, short name, and ISIN.
        Distinguishes NSE and BSE instruments as separate entries.
        """
        q = query.strip().upper()
        if not q:
            return []

        with self._lock:
            candidates: List[Instrument] = []
            seen_keys = set()

            # Exact symbol matches
            exact_matches = self._by_symbol.get(q, [])
            for inst in exact_matches:
                candidates.append(inst)
                seen_keys.add(inst.instrument_key)

            # Exact ISIN matches
            isin_matches = self._by_isin.get(q, [])
            for inst in isin_matches:
                if inst.instrument_key not in seen_keys:
                    candidates.append(inst)
                    seen_keys.add(inst.instrument_key)

            # Substring / Prefix matches
            for inst in self._instruments:
                if inst.instrument_key in seen_keys:
                    continue
                sym = inst.trading_symbol.upper()
                name_upper = inst.name.upper()
                short_upper = (inst.short_name or "").upper()

                if sym.startswith(q) or q in sym or q in name_upper or q in short_upper:
                    candidates.append(inst)
                    seen_keys.add(inst.instrument_key)

            # High-relevance ranking
            def rank_inst(x: Instrument):
                sym = x.trading_symbol.upper()
                name_words = x.name.upper().split()
                is_core = 0 if x.instrument_type in ("EQ", "ETF", "INDEX") else 1
                exact_sym = 0 if sym == q else 1
                prefix_sym = 0 if sym.startswith(q) else 1
                word_starts = 0 if any(w.startswith(q) for w in name_words) else 1
                contains_sym = 0 if q in sym else 1
                pref_exch = 0 if x.exchange == "NSE" else 1
                return (is_core, exact_sym, prefix_sym, word_starts, contains_sym, len(sym), pref_exch)

            sorted_results = sorted(candidates, key=rank_inst)
            results = sorted_results[:limit]

        # Format normalized output for API and UI
        from app.services.sector_service import sector_service

        formatted = []
        for inst in results:
            sec, ind = sector_service.get_sector_and_industry(
                symbol=inst.trading_symbol,
                company_name=inst.name,
                isin=inst.isin,
                instrument_type=inst.instrument_type,
            )
            formatted.append({
                "instrument_key": inst.instrument_key,
                "symbol": inst.trading_symbol,
                "trading_symbol": inst.trading_symbol,
                "name": inst.name,
                "company_name": inst.name,
                "short_name": inst.short_name or inst.trading_symbol,
                "exchange": inst.exchange,
                "segment": inst.segment,
                "sector": sec,
                "industry": ind,
                "instrument_type": inst.instrument_type,
                "isin": inst.isin,
                "tick_size": inst.tick_size,
                "lot_size": inst.lot_size,
                "exchange_token": inst.exchange_token,
            })
        return formatted

    @property
    def total_count(self) -> int:
        with self._lock:
            return len(self._instruments)

    @property
    def last_sync_time(self) -> Optional[float]:
        return self._last_sync_time

# Singleton instance
instrument_master = InstrumentMasterService()
