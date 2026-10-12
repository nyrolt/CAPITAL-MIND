import json
import time
import uuid
import asyncio
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException

from app.models.market import MarketTick
from app.services.instrument_master import instrument_master
from app.services.upstox_market_data import upstox_market_data
from app.services.market_data.market_service import market_data_service

logger = logging.getLogger("capitalmind.market_ws")

router = APIRouter(tags=["Market WebSocket & Real-Time Feed"])

class ConnectionManager:
    """
    Manages frontend WebSocket client connections and broadcasts
    normalized MarketTick messages received from UpstoxMarketDataManager.
    """
    def __init__(self):
        # active_connections: client_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop

    def broadcast_tick(self, tick: MarketTick):
        """Called from Upstox thread when a normalized tick arrives."""
        if not self.active_connections or not self._loop:
            return

        inst_key = tick.instrument_key
        symbol = tick.symbol.upper()
        msg_payload = json.dumps({"type": "market_tick", "data": tick.model_dump()})

        for client_id, ws in list(self.active_connections.items()):
            client_subs = upstox_market_data._client_subs.get(client_id, set())
            if inst_key in client_subs or symbol in client_subs or "ALL" in client_subs:
                asyncio.run_coroutine_threadsafe(self._safe_send(ws, msg_payload), self._loop)

    async def _safe_send(self, ws: WebSocket, msg: str):
        try:
            await ws.send_text(msg)
        except Exception:
            pass

manager = ConnectionManager()
upstox_market_data.register_listener("connection_manager", manager.broadcast_tick)

@router.websocket("/ws/market")
async def websocket_market_feed(websocket: WebSocket):
    """
    Real-Time Indian Market Data WebSocket Feed for CapitalMind frontend.
    Normalizes and streams ticks from Upstox Market Data Feed V3.
    """
    await websocket.accept()
    client_id = str(uuid.uuid4())
    manager.active_connections[client_id] = websocket
    manager.set_loop(asyncio.get_running_loop())

    logger.info(f"[WS] Client connected: {client_id}")

    try:
        # Send initial status
        status = upstox_market_data.get_provider_status()
        await websocket.send_text(json.dumps({"type": "status", "data": status.model_dump()}))

        while True:
            raw_text = await websocket.receive_text()
            try:
                msg = json.loads(raw_text)
            except Exception:
                continue

            action = msg.get("action")

            if action == "subscribe":
                raw_keys = msg.get("instrument_keys") or []
                if isinstance(raw_keys, str):
                    raw_keys = [raw_keys]

                # Subscribe and obtain immediate cached snapshots
                snapshots = upstox_market_data.client_subscribe(client_id, raw_keys)
                for snap in snapshots:
                    await websocket.send_text(json.dumps({"type": "market_tick", "data": snap.model_dump()}))

            elif action == "unsubscribe":
                raw_keys = msg.get("instrument_keys") or []
                if isinstance(raw_keys, str):
                    raw_keys = [raw_keys]
                upstox_market_data.client_unsubscribe(client_id, raw_keys)

            elif action == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "timestamp": int(time.time() * 1000)}))

    except WebSocketDisconnect:
        logger.info(f"[WS] Client disconnected: {client_id}")
    except Exception as e:
        logger.warning(f"[WS] Client connection error: {e}")
    finally:
        manager.active_connections.pop(client_id, None)
        upstox_market_data.client_disconnect(client_id)


# --- REST Endpoints for Market Data & Instruments ---

@router.get("/api/market/instruments/search")
async def search_instruments(
    q: str = Query(..., min_length=1, description="Instrument symbol or name e.g. INFY, TCS, NIFTYBEES"),
    limit: int = Query(15, ge=1, le=50)
) -> List[Dict[str, Any]]:
    """
    Search Indian instruments by symbol or company name with canonical instrument_key.
    """
    return instrument_master.search(q, limit=limit)


@router.get("/api/market/quote/{instrument_key:path}")
async def get_market_quote(instrument_key: str) -> Dict[str, Any]:
    """
    Get live normalized quote for an instrument by canonical instrument_key or trading symbol.
    """
    tick = upstox_market_data.get_cached_tick(instrument_key)
    if tick:
        return tick.model_dump()

    quote = await market_data_service.get_stock_quote(instrument_key)
    if not quote:
        raise HTTPException(status_code=404, detail=f"Quote not found for '{instrument_key}'")
    return quote


@router.get("/api/market/ohlc/{instrument_key:path}")
async def get_market_ohlc(instrument_key: str, interval: str = Query("1d", description="OHLC interval")) -> Dict[str, Any]:
    """
    Get V3 OHLC market data for an instrument.
    """
    data = upstox_market_data.fetch_ohlc_v3(instrument_key, interval=interval)
    if not data:
        raise HTTPException(status_code=404, detail=f"OHLC data not available for '{instrument_key}'")
    return data


@router.get("/api/market/provider-status")
async def get_provider_status() -> Dict[str, Any]:
    """
    Get live status of Upstox Market Data Feed connection and stream statistics.
    """
    return upstox_market_data.get_provider_status().model_dump()
