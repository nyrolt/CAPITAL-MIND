"""
sector_service.py
=================
Sector and industry resolution for Indian equities.

Priority order for sector resolution:
  1. Curated static map (for major index constituents — fastest path)
  2. DB-cached sector (stocks table, fresh if < 7 days since sector_fetched_at)
  3. In-memory ISIN lookup (from NSE CSV datasets loaded at startup)
  4. Upstox Fundamentals API  ->  GET /v2/fundamentals/{ISIN}/profile  ->  data.sector
  5. Company-name heuristics
  6. "Unclassified" (only when all above fail or ISIN is missing)

NEVER puts exchange/segment/instrument_type (NSE_EQ, BSE_EQ, EQ, NSE_INDEX)
into the sector field.

Token is BACKEND-ONLY — never returned to frontend.
"""

import csv
import logging
import threading
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger("capitalmind.sectors")

SECTOR_STALENESS_DAYS = 7

# ---------------------------------------------------------------------------
# Curated fallback map
# ---------------------------------------------------------------------------
CURATED_SECTOR_MAP: Dict[str, Dict[str, str]] = {
    "TATAMOTORS": {"sector": "Automobile", "industry": "Automobile & Commercial Vehicles"},
    "TMPV":        {"sector": "Automobile", "industry": "Automobile & Passenger Vehicles"},
    "TMCV":        {"sector": "Automobile", "industry": "Automobile & Commercial Vehicles"},
    "MARUTI":      {"sector": "Automobile", "industry": "Automobile - 4 Wheelers"},
    "M&M":         {"sector": "Automobile", "industry": "Automobile & Farm Equipment"},
    "BAJAJ-AUTO":  {"sector": "Automobile", "industry": "Automobile - 2 & 3 Wheelers"},
    "EICHERMOT":   {"sector": "Automobile", "industry": "Automobile - 2 Wheelers & CV"},
    "HEROMOTOCO":  {"sector": "Automobile", "industry": "Automobile - 2 Wheelers"},
    "TVSMOTOR":    {"sector": "Automobile", "industry": "Automobile - 2 Wheelers"},
    "ASHOKLEY":    {"sector": "Automobile", "industry": "Commercial Vehicles"},
    "BHARATFORG":  {"sector": "Automobile", "industry": "Auto Components"},
    "APOLLOTYRE":  {"sector": "Automobile", "industry": "Tyres & Rubber"},
    "MRF":         {"sector": "Automobile", "industry": "Tyres & Rubber"},
    "BALKRISIND":  {"sector": "Automobile", "industry": "Tyres - Off Highway"},
    "MOTHERSON":   {"sector": "Automobile", "industry": "Auto Ancillary"},
    "BOSCHLTD":    {"sector": "Automobile", "industry": "Auto Components & Electronics"},
    "TCS":         {"sector": "IT", "industry": "IT Services & Consulting"},
    "INFY":        {"sector": "IT", "industry": "IT Services & Consulting"},
    "WIPRO":       {"sector": "IT", "industry": "IT Services & Consulting"},
    "HCLTECH":     {"sector": "IT", "industry": "IT Services & Consulting"},
    "TECHM":       {"sector": "IT", "industry": "IT Services & Telecom"},
    "LTIM":        {"sector": "IT", "industry": "IT Services & Digital Solutions"},
    "PERSISTENT":  {"sector": "IT", "industry": "IT Services & Software"},
    "COFORGE":     {"sector": "IT", "industry": "IT Solutions"},
    "MPHASIS":     {"sector": "IT", "industry": "IT Services"},
    "KPITTECH":    {"sector": "IT", "industry": "Automotive Software"},
    "TATAELXSI":   {"sector": "IT", "industry": "Design & Technology Services"},
    "LTTS":        {"sector": "IT", "industry": "Engineering R&D Services"},
    "ORCL":        {"sector": "IT", "industry": "Enterprise Software"},
    "OFSS":        {"sector": "IT", "industry": "Financial Software"},
    "RELIANCE":    {"sector": "Energy", "industry": "Oil, Gas & Refining / Conglomerate"},
    "ONGC":        {"sector": "Energy", "industry": "Oil & Gas Exploration"},
    "IOC":         {"sector": "Energy", "industry": "Petroleum Refining & Marketing"},
    "BPCL":        {"sector": "Energy", "industry": "Petroleum Refining & Marketing"},
    "HPCL":        {"sector": "Energy", "industry": "Petroleum Refining & Marketing"},
    "GAIL":        {"sector": "Energy", "industry": "Natural Gas Transmission"},
    "PETRONET":    {"sector": "Energy", "industry": "LNG Terminal Operations"},
    "OIL":         {"sector": "Energy", "industry": "Oil & Gas Exploration"},
    "COALINDIA":   {"sector": "Energy", "industry": "Coal Mining"},
    "NTPC":        {"sector": "Energy", "industry": "Thermal & Renewable Power Generation"},
    "POWERGRID":   {"sector": "Energy", "industry": "Power Transmission"},
    "TATAPOWER":   {"sector": "Energy", "industry": "Power Generation & Distribution"},
    "ADANIPOWER":  {"sector": "Energy", "industry": "Thermal Power Generation"},
    "ADANIGREEN":  {"sector": "Energy", "industry": "Renewable Power"},
    "JSWENERGY":   {"sector": "Energy", "industry": "Power Generation"},
    "NHPC":        {"sector": "Energy", "industry": "Hydroelectric Power"},
    "SJVN":        {"sector": "Energy", "industry": "Hydro & Renewable Power"},
    "SUZLON":      {"sector": "Energy", "industry": "Wind Power Equipment"},
    "HDFCBANK":    {"sector": "Banking", "industry": "Private Sector Commercial Bank"},
    "ICICIBANK":   {"sector": "Banking", "industry": "Private Sector Commercial Bank"},
    "SBIN":        {"sector": "Banking", "industry": "Public Sector Commercial Bank"},
    "KOTAKBANK":   {"sector": "Banking", "industry": "Private Sector Commercial Bank"},
    "AXISBANK":    {"sector": "Banking", "industry": "Private Sector Commercial Bank"},
    "INDUSINDBK":  {"sector": "Banking", "industry": "Private Sector Commercial Bank"},
    "BANKBARODA":  {"sector": "Banking", "industry": "Public Sector Commercial Bank"},
    "PNB":         {"sector": "Banking", "industry": "Public Sector Commercial Bank"},
    "CANBK":       {"sector": "Banking", "industry": "Public Sector Commercial Bank"},
    "UNIONBANK":   {"sector": "Banking", "industry": "Public Sector Commercial Bank"},
    "IDFCFIRSTB":  {"sector": "Banking", "industry": "Private Sector Commercial Bank"},
    "FEDERALBNK":  {"sector": "Banking", "industry": "Private Sector Commercial Bank"},
    "AUBANK":      {"sector": "Banking", "industry": "Small Finance Bank"},
    "BANDHANBNK":  {"sector": "Banking", "industry": "Private Sector Commercial Bank"},
    "YESBANK":     {"sector": "Banking", "industry": "Private Sector Commercial Bank"},
    "BAJFINANCE":  {"sector": "Financial Services", "industry": "Consumer Finance NBFC"},
    "BAJAJFINSV":  {"sector": "Financial Services", "industry": "Financial Holding Company"},
    "CHOLAFIN":    {"sector": "Financial Services", "industry": "Vehicle & Commercial Finance"},
    "SHRIRAMFIN":  {"sector": "Financial Services", "industry": "Commercial Vehicle Finance"},
    "MUTHOOTFIN":  {"sector": "Financial Services", "industry": "Gold Loan NBFC"},
    "PFC":         {"sector": "Financial Services", "industry": "Power Infrastructure Finance"},
    "RECLTD":      {"sector": "Financial Services", "industry": "Power Infrastructure Finance"},
    "HDFCLIFE":    {"sector": "Financial Services", "industry": "Life Insurance"},
    "SBILIFE":     {"sector": "Financial Services", "industry": "Life Insurance"},
    "ICICIPRULI":  {"sector": "Financial Services", "industry": "Life Insurance"},
    "ICICIGI":     {"sector": "Financial Services", "industry": "General Insurance"},
    "HDFCAMC":     {"sector": "Financial Services", "industry": "Asset Management Company"},
    "NAM-INDIA":   {"sector": "Financial Services", "industry": "Asset Management Company"},
    "BSE":         {"sector": "Financial Services", "industry": "Financial Exchange Platform"},
    "MCX":         {"sector": "Financial Services", "industry": "Commodity Exchange"},
    "CDSL":        {"sector": "Financial Services", "industry": "Securities Depository"},
    "CAMS":        {"sector": "Financial Services", "industry": "Mutual Fund Registrar & Transfer"},
    "KFINTECH":    {"sector": "Financial Services", "industry": "Financial Registry & Services"},
    "JSWHL":       {"sector": "Financial Services", "industry": "Holding Company & Investments"},
    "PAYTM":       {"sector": "Financial Services", "industry": "Digital Payments & Financial Services"},
    "POLICYBZR":   {"sector": "Financial Services", "industry": "Insurance Distribution Fintech"},
    "360ONE":      {"sector": "Financial Services", "industry": "Wealth & Asset Management"},
    "TATACAP":     {"sector": "Financial Services", "industry": "Diversified NBFC"},
    "ITC":         {"sector": "FMCG", "industry": "Cigarettes, Foods & Agribusiness"},
    "HINDUNILVR":  {"sector": "FMCG", "industry": "Household & Personal Care"},
    "NESTLEIND":   {"sector": "FMCG", "industry": "Packaged Foods & Dairy"},
    "BRITANNIA":   {"sector": "FMCG", "industry": "Bakery & Packaged Foods"},
    "TATACONSUM":  {"sector": "FMCG", "industry": "Tea, Coffee & Packaged Foods"},
    "DABUR":       {"sector": "FMCG", "industry": "Ayurvedic & Healthcare FMCG"},
    "MARICO":      {"sector": "FMCG", "industry": "Edible Oils & Hair Care"},
    "GODREJCP":    {"sector": "FMCG", "industry": "Personal Care & Home Insecticides"},
    "COLPAL":      {"sector": "FMCG", "industry": "Oral Care & Dental Hygiene"},
    "VBL":         {"sector": "FMCG", "industry": "Beverages & Carbonated Soft Drinks"},
    "RADICO":      {"sector": "FMCG", "industry": "Alcoholic Beverages"},
    "UBL":         {"sector": "FMCG", "industry": "Beer & Breweries"},
    "SUNPHARMA":   {"sector": "Pharma", "industry": "Pharmaceuticals & Generics"},
    "DRREDDY":     {"sector": "Pharma", "industry": "Pharmaceuticals & API"},
    "CIPLA":       {"sector": "Pharma", "industry": "Respiratory & Generics"},
    "DIVISLAB":    {"sector": "Pharma", "industry": "Active Pharmaceutical Ingredients (API)"},
    "LUPIN":       {"sector": "Pharma", "industry": "Pharmaceutical Formulations"},
    "APOLLOHOSP":  {"sector": "Pharma", "industry": "Hospitals & Healthcare Services"},
    "MAXHEALTH":   {"sector": "Pharma", "industry": "Hospitals & Healthcare Services"},
    "FORTIS":      {"sector": "Pharma", "industry": "Hospitals & Clinics"},
    "MEDANTA":     {"sector": "Pharma", "industry": "Super Specialty Hospitals"},
    "MANKIND":     {"sector": "Pharma", "industry": "Domestic Formulations"},
    "TORNTPHARM":  {"sector": "Pharma", "industry": "Pharmaceutical Formulations"},
    "ZYDUSLIFE":   {"sector": "Pharma", "industry": "Formulations & Biosimilars"},
    "AUROPHARMA":  {"sector": "Pharma", "industry": "Generics & Injectables"},
    "BIOCON":      {"sector": "Pharma", "industry": "Biopharmaceuticals & Biosimilars"},
    "TATASTEEL":   {"sector": "Metals", "industry": "Steel Manufacturing"},
    "JSWSTEEL":    {"sector": "Metals", "industry": "Steel Manufacturing"},
    "HINDALCO":    {"sector": "Metals", "industry": "Aluminium & Copper"},
    "VEDL":        {"sector": "Metals", "industry": "Diversified Mining & Metals"},
    "JINDALSTEL":  {"sector": "Metals", "industry": "Steel & Sponge Iron"},
    "SAIL":        {"sector": "Metals", "industry": "Public Sector Steel"},
    "NMDC":        {"sector": "Metals", "industry": "Iron Ore Mining"},
    "NATIONALUM":  {"sector": "Metals", "industry": "Aluminium Production"},
    "HINDZINC":    {"sector": "Metals", "industry": "Zinc & Lead Mining"},
    "TATACHEM":    {"sector": "Chemicals", "industry": "Soda Ash & Basic Chemicals"},
    "PIDILITIND":  {"sector": "Chemicals", "industry": "Adhesives & Construction Chemicals"},
    "SRF":         {"sector": "Chemicals", "industry": "Specialty Chemicals & Fluorochemicals"},
    "GUJGASLTD":   {"sector": "Chemicals", "industry": "City Gas Distribution"},
    "AARTIIND":    {"sector": "Chemicals", "industry": "Specialty Chemicals & Intermediates"},
    "DEEPAKNTR":   {"sector": "Chemicals", "industry": "Phenolics & Basic Chemicals"},
    "NAVINFLUOR":  {"sector": "Chemicals", "industry": "Fluorochemicals"},
    "ATUL":        {"sector": "Chemicals", "industry": "Specialty & Crop Chemicals"},
    "COROMANDEL":  {"sector": "Chemicals", "industry": "Fertilisers & Agrochemicals"},
    "UPL":         {"sector": "Chemicals", "industry": "Agrochemicals & Crop Protection"},
    "DLF":         {"sector": "Realty", "industry": "Commercial & Residential Real Estate"},
    "GODREJPROP":  {"sector": "Realty", "industry": "Residential Real Estate"},
    "MACROTECH":   {"sector": "Realty", "industry": "Residential Real Estate"},
    "OBEROIRLTY":  {"sector": "Realty", "industry": "Premium Residential & Commercial"},
    "PRESTIGE":    {"sector": "Realty", "industry": "Real Estate Development"},
    "PHOENIXLTD":  {"sector": "Realty", "industry": "Retail Malls & Mixed Development"},
    "BRIGADE":     {"sector": "Realty", "industry": "Integrated Enclaves & Real Estate"},
    "SOBHA":       {"sector": "Realty", "industry": "Contracting & Residential Real Estate"},
    "LT":          {"sector": "Construction", "industry": "Engineering & Construction EPC"},
    "ULTRACEMCO":  {"sector": "Construction", "industry": "Cement & Ready Mix"},
    "AMBUJACEM":   {"sector": "Construction", "industry": "Cement Manufacturing"},
    "ACC":         {"sector": "Construction", "industry": "Cement & Building Materials"},
    "GRASIM":      {"sector": "Construction", "industry": "Viscose Staple Fibre & Cement"},
    "SHREECEM":    {"sector": "Construction", "industry": "Cement Manufacturing"},
    "DALBHARAT":   {"sector": "Construction", "industry": "Cement Manufacturing"},
    "GMRINFRA":    {"sector": "Construction", "industry": "Airport & Transportation Infra"},
    "IRB":         {"sector": "Construction", "industry": "Highways & Tollways"},
    "TITAN":       {"sector": "Consumer Goods", "industry": "Jewellery, Watches & Eyewear"},
    "HAVELLS":     {"sector": "Consumer Goods", "industry": "Electrical Consumer Durables"},
    "VOLTAS":      {"sector": "Consumer Goods", "industry": "Air Conditioning & Engineering"},
    "CROMPTON":    {"sector": "Consumer Goods", "industry": "Fans & Consumer Appliances"},
    "WHIRLPOOL":   {"sector": "Consumer Goods", "industry": "Home Appliances"},
    "DIXON":       {"sector": "Consumer Goods", "industry": "Electronics Manufacturing Services"},
    "DMART":       {"sector": "Consumer Goods", "industry": "Supermarkets & Retail Chain"},
    "TRENT":       {"sector": "Consumer Goods", "industry": "Apparel & Retail"},
    "ZOMATO":      {"sector": "Consumer Goods", "industry": "Food Delivery & Quick Commerce"},
    "NYKAA":       {"sector": "Consumer Goods", "industry": "Beauty & Fashion E-Commerce"},
    "INDHOTEL":    {"sector": "Consumer Goods", "industry": "Hotels & Hospitality (Taj)"},
    "LEMONTREE":   {"sector": "Consumer Goods", "industry": "Midscale Hotel Chain"},
    "IRCTC":       {"sector": "Consumer Goods", "industry": "Rail Catering & Online Ticketing"},
    "BHARTIARTL":  {"sector": "Telecom", "industry": "Wireless & Broadband Telecom"},
    "IDEA":        {"sector": "Telecom", "industry": "Mobile Telecommunications"},
    "TATACOMM":    {"sector": "Telecom", "industry": "Enterprise Data & Cloud Network"},
    "INDUSTOWER":  {"sector": "Telecom", "industry": "Telecom Tower Infrastructure"},
    "HAL":         {"sector": "Capital Goods", "industry": "Aerospace & Defense Aircraft"},
    "BEL":         {"sector": "Capital Goods", "industry": "Defense Electronics & Radars"},
    "BHEL":        {"sector": "Capital Goods", "industry": "Heavy Electrical Equipment"},
    "SIEMENS":     {"sector": "Capital Goods", "industry": "Industrial Automation & Power"},
    "ABB":         {"sector": "Capital Goods", "industry": "Robotics & Heavy Electricals"},
    "CUMMINSIND":  {"sector": "Capital Goods", "industry": "Diesel Engines & Generators"},
    # Non-company instruments
    "NIFTYBEES":   {"sector": "Index ETF", "industry": "Nifty 50 Broad Market ETF"},
    "BANKBEES":    {"sector": "Index ETF", "industry": "Nifty Bank Sectoral ETF"},
    "JUNIORBEES":  {"sector": "Index ETF", "industry": "Nifty Next 50 ETF"},
    "MID150BEES":  {"sector": "Index ETF", "industry": "Nifty Midcap 150 ETF"},
    "GOLDBEES":    {"sector": "Commodities", "industry": "Physical Gold ETF"},
    "SILVERBEES":  {"sector": "Commodities", "industry": "Physical Silver ETF"},
    "LIQUIDBEES":  {"sector": "Cash Equivalent", "industry": "Daily Dividend Overnight Liquid ETF"},
    "GSEC2033":    {"sector": "Government Debt", "industry": "7.18% GS 2033 Sovereign Bond"},
    "PARAGPARIKH": {"sector": "Diversified Equity", "industry": "Multi-Cap Active Mutual Fund"},
}

NSE_INDUSTRY_TO_SECTOR: Dict[str, str] = {
    "IT - Software": "IT",
    "IT - Hardware": "IT",
    "IT - Education": "IT",
    "Information Technology": "IT",
    "Bank": "Banking",
    "Finance": "Financial Services",
    "Investment": "Financial Services",
    "Tobacco": "FMCG",
    "Household Products": "FMCG",
    "Fast Moving Consumer Goods": "FMCG",
    "Pharmaceuticals": "Pharma",
    "Healthcare": "Pharma",
    "Steel & Iron Products": "Metals",
    "Metals & Mining": "Metals",
    "Tyres & Allied": "Automobile",
    "Automobile": "Automobile",
    "Automobile and Auto Components": "Automobile",
    "Oil Exploration": "Energy",
    "Oil & Gas": "Energy",
    "Power Generation & Distribution": "Energy",
    "Power": "Energy",
    "Oil Gas & Consumable Fuels": "Energy",
    "Chemicals": "Chemicals",
    "Agrochemicals": "Chemicals",
    "Engineering": "Construction",
    "Construction": "Construction",
    "Construction Materials": "Construction",
    "Telecommunication": "Telecom",
    "Jewellery": "Consumer Goods",
    "Consumer Durables": "Consumer Goods",
    "Consumer Services": "Consumer Goods",
    "Capital Goods": "Capital Goods",
    "Realty": "Realty",
    "Services": "Services",
    "Textiles": "Textiles",
    "Media Entertainment & Publication": "Media",
    "Utilities": "Utilities",
    "Diversified": "Diversified",
    "Forest Materials": "Materials",
}

BAD_SECTORS = {
    "NSE_EQ", "BSE_EQ", "NSE_INDEX", "BSE_INDEX",
    "General", "Equity", "EQ", "BE", "SM", "Unclassified"
}

NON_EQUITY_INSTRUMENT_TYPES = {"ETF", "BOND", "INDEX", "PREFERENCE"}


def _is_non_equity(symbol: str, instrument_type: Optional[str]) -> bool:
    sym = symbol.strip().upper()
    itype = (instrument_type or "").strip().upper()
    if itype in NON_EQUITY_INSTRUMENT_TYPES:
        return True
    if "BEES" in sym or "ETF" in sym or sym.startswith(("GSEC", "SDL", "GOI")):
        return True
    return False


class UpstoxFundamentalsClient:
    """
    Synchronous HTTP client for Upstox Fundamentals API.
    GET /v2/fundamentals/{ISIN}/profile  ->  data.sector
    Token is BACKEND-ONLY.
    """

    BASE_URL = "https://api.upstox.com/v2/fundamentals/{isin}/profile"
    MIN_CALL_INTERVAL_MS = 400
    MAX_RETRIES = 2

    def __init__(self):
        self._lock = threading.Lock()
        self._last_call_ts: float = 0.0

    def _get_token(self) -> str:
        from app.config import settings
        return settings.UPSTOX_ANALYTICS_TOKEN

    def fetch_sector(self, isin: str) -> Optional[str]:
        """Fetch sector string for ISIN from Upstox Fundamentals API. Returns None on failure."""
        token = self._get_token()
        if not token:
            logger.debug("[FUNDAMENTALS] Token not configured.")
            return None

        isin_clean = isin.strip().upper()
        if not isin_clean or len(isin_clean) < 10:
            return None

        url = self.BASE_URL.format(isin=isin_clean)

        for attempt in range(self.MAX_RETRIES + 1):
            try:
                import httpx

                with self._lock:
                    now = time.time()
                    elapsed_ms = (now - self._last_call_ts) * 1000
                    if elapsed_ms < self.MIN_CALL_INTERVAL_MS:
                        time.sleep((self.MIN_CALL_INTERVAL_MS - elapsed_ms) / 1000)
                    self._last_call_ts = time.time()

                headers = {
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                }

                with httpx.Client(timeout=10.0) as client:
                    resp = client.get(url, headers=headers)

                if resp.status_code == 200:
                    body = resp.json()
                    data = body.get("data") or {}
                    sector = (
                        data.get("sector")
                        or data.get("industry_group")
                        or data.get("industry")
                        or None
                    )
                    if sector and sector.strip():
                        logger.info(
                            f"[FUNDAMENTALS] ISIN={isin_clean} sector='{sector}'"
                        )
                        return sector.strip()
                    logger.warning(
                        f"[FUNDAMENTALS] ISIN={isin_clean}: 200 OK but no sector in response"
                    )
                    return None

                elif resp.status_code == 429:
                    logger.warning(f"[FUNDAMENTALS] Rate limit (429) for {isin_clean}")
                    time.sleep(2.0 * (attempt + 1))
                    continue

                elif resp.status_code in (404, 422):
                    logger.info(f"[FUNDAMENTALS] ISIN={isin_clean} not found (status={resp.status_code})")
                    return None

                elif resp.status_code == 401:
                    logger.error("[FUNDAMENTALS] 401 Unauthorized - check analytics token")
                    return None

                else:
                    logger.warning(f"[FUNDAMENTALS] status={resp.status_code} for {isin_clean}")
                    if attempt < self.MAX_RETRIES:
                        time.sleep(1.0)
                        continue
                    return None

            except Exception as exc:
                logger.error(f"[FUNDAMENTALS] Exception for {isin_clean} (attempt {attempt}): {exc}")
                if attempt < self.MAX_RETRIES:
                    time.sleep(1.0)
                    continue
                return None

        return None


fundamentals_client = UpstoxFundamentalsClient()


class SectorEnrichmentService:
    """
    Authoritative sector resolver for Indian instruments.
    See module docstring for priority order.
    """

    def __init__(self):
        self._by_symbol: Dict[str, Dict[str, str]] = {}
        self._by_isin: Dict[str, Dict[str, str]] = {}
        self._api_negative_cache: Dict[str, float] = {}
        self._api_negative_ttl = 3600  # 1 hour
        self._lock = threading.Lock()
        self._load_datasets()

    def _load_datasets(self):
        for sym, meta in CURATED_SECTOR_MAP.items():
            self._by_symbol[sym.upper()] = {
                "sector": meta["sector"],
                "industry": meta.get("industry", meta["sector"]),
            }

        data_dir = Path(__file__).resolve().parent.parent.parent / "data"
        for csv_name in ("nifty_total_market_sectors.csv", "nifty_microcap250_sectors.csv"):
            csv_path = data_dir / csv_name
            if not csv_path.exists():
                continue
            try:
                with open(csv_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        sym = (row.get("Symbol") or "").strip().upper()
                        raw_ind = (row.get("Industry") or "").strip()
                        isin = (row.get("ISIN Code") or row.get("ISIN") or "").strip().upper()
                        cname = (row.get("Company Name") or "").strip()
                        if not sym:
                            continue
                        sector = self._normalize_sector(raw_ind, sym, cname)
                        entry = {"sector": sector, "industry": raw_ind or sector, "company_name": cname}
                        if sym not in self._by_symbol:
                            self._by_symbol[sym] = entry
                        if isin and isin not in self._by_isin:
                            self._by_isin[isin] = entry
            except Exception as e:
                logger.warning(f"[SECTOR_SERVICE] CSV read error {csv_name}: {e}")

        logger.info(f"[SECTOR_SERVICE] Loaded {len(self._by_symbol)} sector mappings.")

    def _normalize_sector(self, nse_industry: str, symbol: str, company_name: str) -> str:
        ind = nse_industry.strip()
        sym = symbol.strip().upper()
        cname = company_name.upper()
        if ind == "Financial Services":
            if "BANK" in sym or "BANK" in cname or sym in {
                "SBIN", "PNB", "CANBK", "UNIONBANK", "YESBANK", "FEDERALBNK", "AUBANK", "BANDHANBNK"
            }:
                return "Banking"
            return "Financial Services"
        if ind == "Construction":
            if sym in {"DLF", "GODREJPROP", "OBEROIRLTY", "MACROTECH", "LODHA", "PHOENIXLTD", "BRIGADE", "PRESTIGE", "SOBHA"}:
                return "Realty"
        if ind in NSE_INDUSTRY_TO_SECTOR:
            return NSE_INDUSTRY_TO_SECTOR[ind]
        return ind or "Unclassified"

    def get_cached_sector_from_db(self, identifier: Optional[str], db) -> Optional[str]:
        """Read sector from stocks table DB cache. Returns None if stale or bad value."""
        if not identifier or not db:
            return None
        try:
            from app.models.db_models import Stock
            clean = identifier.strip().upper()
            record = db.query(Stock).filter((Stock.isin == clean) | (Stock.symbol == clean)).first()
            if not record:
                return None
            sec = record.sector
            if not sec or sec in BAD_SECTORS:
                return None
            fetched_at = getattr(record, "sector_fetched_at", None)
            if fetched_at:
                if isinstance(fetched_at, str):
                    try:
                        fetched_at = datetime.fromisoformat(fetched_at)
                    except Exception:
                        fetched_at = None
                if fetched_at:
                    if fetched_at.tzinfo is None:
                        fetched_at = fetched_at.replace(tzinfo=timezone.utc)
                    age = datetime.now(timezone.utc) - fetched_at
                    if age < timedelta(days=SECTOR_STALENESS_DAYS):
                        return sec
                    return None  # Stale
            return sec  # No timestamp but valid sector
        except Exception as exc:
            logger.debug(f"[SECTOR_SERVICE] DB lookup error: {exc}")
            return None

    def persist_sector_to_db(self, isin: Optional[str], symbol: Optional[str], sector: str, db) -> None:
        """Persist fetched sector back to stocks table and update related holdings."""
        if not db or not sector or sector in BAD_SECTORS:
            return
        try:
            from app.models.db_models import Stock, Holding
            isin_clean = isin.strip().upper() if isin else None
            sym_clean = symbol.strip().upper() if symbol else None
            now = datetime.now(timezone.utc)

            record = None
            if isin_clean:
                record = db.query(Stock).filter(Stock.isin == isin_clean).first()
            if not record and sym_clean:
                record = db.query(Stock).filter(Stock.symbol == sym_clean).first()

            if record:
                record.sector = sector
                if isin_clean and not record.isin:
                    record.isin = isin_clean
                if hasattr(record, "sector_fetched_at"):
                    record.sector_fetched_at = now

            if sym_clean:
                for h in db.query(Holding).filter(Holding.symbol == sym_clean).all():
                    h.sector = sector
                    if isin_clean and not h.isin:
                        h.isin = isin_clean

            db.commit()
            logger.info(f"[SECTOR_SERVICE] Persisted sector='{sector}' symbol='{sym_clean}' ISIN='{isin_clean}'")
        except Exception as exc:
            logger.warning(f"[SECTOR_SERVICE] Persist error: {exc}")
            try:
                db.rollback()
            except Exception:
                pass

    def get_sector_and_industry(
        self,
        symbol: str,
        company_name: Optional[str] = None,
        isin: Optional[str] = None,
        instrument_type: Optional[str] = None,
        db=None,
    ) -> Tuple[str, str]:
        """
        Authoritative sector & industry lookup.
        Never returns exchange/segment codes as sector.
        """
        sym_clean = symbol.strip().upper()
        cname_clean = (company_name or "").strip()
        isin_clean = isin.strip().upper() if isin else None

        # 1. Non-equity assets
        if _is_non_equity(sym_clean, instrument_type):
            return self._asset_class_sector(sym_clean, (instrument_type or "").upper())

        # Resolve ISIN if not provided
        if not isin_clean:
            try:
                from app.services.instrument_master import instrument_master
                inst = instrument_master.get_by_symbol(sym_clean)
                if inst and inst.isin:
                    isin_clean = inst.isin.strip().upper()
            except Exception:
                pass
            if not isin_clean and db:
                try:
                    from app.models.db_models import Stock
                    stk = db.query(Stock).filter(Stock.symbol == sym_clean).first()
                    if stk and stk.isin:
                        isin_clean = stk.isin.strip().upper()
                except Exception:
                    pass

        # 2. Curated map check (instant RAM lookup - 0ms)
        if sym_clean in self._by_symbol:
            res = self._by_symbol[sym_clean]
            if res.get("sector") and res["sector"] not in BAD_SECTORS:
                return res["sector"], res["industry"]

        # 3. In-memory ISIN from CSVs (instant RAM lookup - 0ms)
        if isin_clean and isin_clean in self._by_isin:
            res = self._by_isin[isin_clean]
            if res.get("sector") and res["sector"] not in BAD_SECTORS:
                return res["sector"], res["industry"]

        # 4. DB cache check (fast local DB query - ~1ms)
        if db:
            cached = self.get_cached_sector_from_db(isin_clean or sym_clean, db)
            if cached and cached not in BAD_SECTORS:
                return cached, cached

        # 5. Upstox Fundamentals API (fallback only if unknown in curated map, CSVs, and DB)
        if isin_clean:
            api_sector = self._fetch_from_fundamentals_api(isin_clean)
            if api_sector and api_sector not in BAD_SECTORS:
                normalized = self._normalize_sector(api_sector, sym_clean, cname_clean)
                with self._lock:
                    self._by_symbol[sym_clean] = {"sector": normalized, "industry": api_sector}
                    self._by_isin[isin_clean] = {"sector": normalized, "industry": api_sector}
                if db:
                    self.persist_sector_to_db(isin_clean, sym_clean, normalized, db)
                return normalized, api_sector

        # 6. Heuristics fallback
        if cname_clean:
            result = self._heuristic_sector(cname_clean.upper())
            if result and result[0] not in BAD_SECTORS:
                return result

        return "Unclassified", "Unclassified"

    def _fetch_from_fundamentals_api(self, isin: str) -> Optional[str]:
        with self._lock:
            neg_ts = self._api_negative_cache.get(isin)
            if neg_ts and (time.time() - neg_ts) < self._api_negative_ttl:
                return None
        result = fundamentals_client.fetch_sector(isin)
        if result is None:
            with self._lock:
                self._api_negative_cache[isin] = time.time()
        return result

    def _asset_class_sector(self, sym: str, inst_type: str) -> Tuple[str, str]:
        if "GOLD" in sym or "SILVER" in sym:
            return "Commodities", "Commodity ETF"
        if "LIQUID" in sym or "CASH" in sym:
            return "Cash Equivalent", "Liquid ETF"
        if inst_type == "BOND" or any(t in sym for t in ("GS", "GSEC", "SDL", "GOI")):
            return "Government Debt", "Sovereign Bonds"
        if inst_type == "INDEX":
            return "Index", "Market Index"
        return "Index ETF", "Index ETF"

    def _heuristic_sector(self, cname_upper: str) -> Optional[Tuple[str, str]]:
        c = cname_upper
        if "BANK" in c:
            return "Banking", "Commercial Banking"
        if any(k in c for k in ("FINANCE", "FINANCIAL", "CAPITAL", "INVESTMENT", "SECURITIES", "WEALTH", "HOLDINGS")):
            return "Financial Services", "Financial Services"
        if any(k in c for k in ("MOTORS", "AUTO", "TYRES", "TYRE", "VEHICLE")):
            return "Automobile", "Automotive"
        if any(k in c for k in ("PHARMA", "LABORATORIES", "DRUG", "HEALTHCARE", "HOSPITAL", "CLINIC")):
            return "Pharma", "Pharmaceuticals & Healthcare"
        if any(k in c for k in ("SOFTWARE", "INFOTECH", "TECHNOLOGIES", "TECH", "SYSTEMS", "COMPUTERS")):
            return "IT", "Information Technology"
        if any(k in c for k in ("POWER", "ENERGY", "SOLAR", "PETROLEUM", "GAS", "OIL")):
            return "Energy", "Energy & Power"
        if any(k in c for k in ("STEEL", "MINING", "MINERALS", "METALS", "ALUMINIUM", "COPPER", "ZINC")):
            return "Metals", "Metals & Mining"
        if any(k in c for k in ("CHEMICAL", "ORGANICS", "FERTILISER", "AGRO")):
            return "Chemicals", "Chemicals"
        if any(k in c for k in ("CEMENT", "INFRASTRUCTURE", "CONSTRUCTION", "ENGINEERING", "BUILDERS")):
            return "Construction", "Construction & Building Materials"
        if any(k in c for k in ("REAL ESTATE", "REALTY", "DEVELOPERS", "PROPERTIES")):
            return "Realty", "Real Estate Development"
        if any(k in c for k in ("FOOD", "SUGAR", "BEVERAGE", "BREWERIES", "DAIRY", "CONSUMER")):
            return "FMCG", "FMCG & Consumer Goods"
        if any(k in c for k in ("TELECOM", "COMMUNICATION", "BROADBAND")):
            return "Telecom", "Telecommunications"
        if any(k in c for k in ("TEXTILE", "FABRICS", "GARMENTS", "SPINNING", "DENIM")):
            return "Textiles", "Textiles & Apparel"
        return None

    def enrich_instrument(self, inst: Dict[str, Any], db=None) -> Dict[str, Any]:
        sym = inst.get("symbol") or inst.get("trading_symbol") or ""
        cname = inst.get("name") or inst.get("company_name") or ""
        sector, industry = self.get_sector_and_industry(
            symbol=sym,
            company_name=cname,
            isin=inst.get("isin"),
            instrument_type=inst.get("instrument_type"),
            db=db,
        )
        inst["sector"] = sector
        inst["industry"] = industry
        return inst

    def bulk_warm_sectors(self, instruments: list, db=None, max_api_calls: int = 50) -> int:
        """
        Pre-warm sector cache for a batch of instruments.
        Calls Fundamentals API for equities missing from curated map.
        Returns count of API calls made.
        """
        fetched = 0
        for inst in instruments:
            if fetched >= max_api_calls:
                break
            isin = (inst.get("isin") or "").strip().upper()
            sym = (inst.get("symbol") or inst.get("trading_symbol") or "").strip().upper()
            itype = inst.get("instrument_type", "EQ")
            if _is_non_equity(sym, itype):
                continue
            if sym in self._by_symbol:
                continue
            if not isin:
                continue
            api_sector = self._fetch_from_fundamentals_api(isin)
            if api_sector:
                normalized = NSE_INDUSTRY_TO_SECTOR.get(api_sector, api_sector)
                with self._lock:
                    self._by_symbol[sym] = {"sector": normalized, "industry": api_sector}
                    self._by_isin[isin] = {"sector": normalized, "industry": api_sector}
                if db:
                    self.persist_sector_to_db(isin, sym, normalized, db)
                fetched += 1
        return fetched


sector_service = SectorEnrichmentService()
