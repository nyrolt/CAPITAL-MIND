import os
import gzip
import json
import logging
import httpx
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sync_instruments")

UPSTOX_INSTRUMENTS_URL = "https://assets.upstox.com/market-quote/instruments/exchange/complete.json.gz"
VALID_SEGMENTS = {"NSE_EQ", "BSE_EQ", "NSE_INDEX", "BSE_INDEX"}

def sync():
    data_dir = Path(__file__).resolve().parent / "backend" / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    out_file = data_dir / "upstox_instruments.json.gz"

    logger.info(f"Downloading Upstox complete catalog from {UPSTOX_INSTRUMENTS_URL}...")
    with httpx.Client(timeout=60.0) as client:
        res = client.get(UPSTOX_INSTRUMENTS_URL)
        res.raise_for_status()
        raw_bytes = res.content

    logger.info("Decompressing and filtering cash instruments...")
    raw_data = json.loads(gzip.decompress(raw_bytes))
    
    cash_instruments = []
    for item in raw_data:
        seg = item.get("segment")
        if seg in VALID_SEGMENTS:
            inst_key = item.get("instrument_key")
            trading_symbol = item.get("trading_symbol")
            if not inst_key or not trading_symbol:
                continue

            inst_type = item.get("instrument_type", "EQ")
            if seg in ("NSE_INDEX", "BSE_INDEX") or inst_type == "INDEX":
                norm_type = "INDEX"
            elif inst_type == "ETF" or "ETF" in trading_symbol.upper() or "BEES" in trading_symbol.upper():
                norm_type = "ETF"
            elif inst_type in ("SG", "GB", "GS", "TB", "DEB", "BOND", "NCD"):
                norm_type = "BOND"
            elif inst_type == "PREF":
                norm_type = "PREFERENCE"
            else:
                norm_type = inst_type or "EQ"

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

    logger.info(f"Writing {len(cash_instruments)} cash instruments to {out_file}...")
    with gzip.open(out_file, "wt", encoding="utf-8") as f:
        json.dump(cash_instruments, f)

    file_size_kb = os.path.getsize(out_file) / 1024
    logger.info(f"Successfully saved {len(cash_instruments)} instruments ({file_size_kb:.1f} KB)!")
    return len(cash_instruments)

if __name__ == "__main__":
    sync()
