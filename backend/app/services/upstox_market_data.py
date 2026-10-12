import json
import time
import ssl
import uuid
import logging
import threading
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Set
import httpx
import websocket

from app.config import settings
from app.models.market import MarketTick, ProviderStatusModel
from app.services.instrument_master import instrument_master
from app.services.market_data.decoder import UpstoxMarketDataDecoder

logger = logging.getLogger("capitalmind.upstox_market_data")

class UpstoxMarketDataManager:
    """
    Central Upstox Market Data Feed V3 & Cache Manager.
    - Manages a single resilient WebSocket connection to Upstox Market Data Feed V3.
    - Uses UpstoxMarketDataDecoder for binary Protobuf decoding into MarketTick instances.
    - Maintains in-memory latest quote cache and reference-counted subscriptions.
    - Reconnects with exponential backoff on connection drop.
    - Provides REST snapshot fallback and historical candles.
    """

    def __init__(self):
        self.token = settings.UPSTOX_ANALYTICS_TOKEN
        self.is_enabled = settings.is_upstox_live
        self.market_status: str = "CLOSED"
        self.state: str = "DISCONNECTED"  # DISCONNECTED, CONNECTING, CONNECTED, SUBSCRIBED, RECONNECTING, STOPPED
        self.last_update_ts: Optional[int] = None

        # In-memory latest quotes cache: canonical instrument_key -> MarketTick
        self._cache: Dict[str, MarketTick] = {}

        # Subscription management:
        # Client reference counting: client_id -> Set[instrument_keys]
        self._client_subs: Dict[str, Set[str]] = {}
        # Union of all active keys currently subscribed on Upstox WebSocket
        self._active_keys: Set[str] = set()

        # Listeners: listener_id -> callback(MarketTick)
        self._listeners: Dict[str, Any] = {}

        # Threading & worker control
        self._ws: Optional[websocket.WebSocketApp] = None
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._reconnect_delay = 2
        self._max_reconnect_delay = 30
        self._lock = threading.RLock()

        # Pre-populate core liquid instruments into subscription set
        default_seed_keys = [
            "NSE_EQ|INE009A01021",  # INFY
            "NSE_EQ|INE467B01029",  # TCS
            "NSE_EQ|INE002A01018",  # RELIANCE
            "NSE_EQ|INE040A01034",  # HDFCBANK
            "NSE_INDEX|Nifty 50"     # NIFTY 50
        ]
        for key in default_seed_keys:
            self._active_keys.add(key)

    @property
    def is_connected(self) -> bool:
        return self.state in ("CONNECTED", "SUBSCRIBED")

    def start(self):
        """Start the background Upstox WebSocket streaming worker if live mode is enabled."""
        if not self.is_enabled or not self.token:
            logger.info("[UPSTOX] Running in MOCK mode (live feed disabled or token absent).")
            self.state = "STOPPED"
            return

        if self._thread and self._thread.is_alive():
            return

        self._stop_event.clear()
        self.state = "CONNECTING"
        self._thread = threading.Thread(target=self._run_loop, daemon=True, name="UpstoxFeedWorker")
        self._thread.start()
        logger.info("[UPSTOX] Started background Upstox V3 streaming worker.")

    def stop(self):
        """Stop the background worker."""
        self._stop_event.set()
        self.state = "STOPPED"
        if self._ws:
            try:
                self._ws.close()
            except Exception:
                pass

    def _get_auth_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json"
        }

    def _fetch_authorized_redirect_uri(self) -> Optional[str]:
        """Call Upstox V3 authorize endpoint to get authorized redirect URI."""
        try:
            url = "https://api.upstox.com/v3/feed/market-data-feed/authorize"
            with httpx.Client(timeout=10.0) as client:
                res = client.get(url, headers=self._get_auth_headers())
                if res.status_code == 200:
                    data = res.json()
                    return data.get("data", {}).get("authorizedRedirectUri") or data.get("data", {}).get("authorized_redirect_uri")
                logger.error(f"[UPSTOX] Authorize request returned HTTP {res.status_code}")
        except Exception as e:
            logger.error(f"[UPSTOX] Error during authorize request: {e}")
        return None

    def _run_loop(self):
        """Persistent worker loop with automatic reconnect and exponential backoff."""
        delay = self._reconnect_delay
        while not self._stop_event.is_set():
            try:
                self.state = "CONNECTING"
                logger.info("[UPSTOX] Connecting to Upstox Market Data Feed V3...")
                ws_uri = self._fetch_authorized_redirect_uri()
                if not ws_uri:
                    self.state = "RECONNECTING"
                    logger.warning(f"[UPSTOX] Could not get authorized URI. Reconnecting in {delay:.1f}s...")
                    time.sleep(delay)
                    delay = min(delay * 1.5, self._max_reconnect_delay)
                    continue

                self._ws = websocket.WebSocketApp(
                    ws_uri,
                    header=self._get_auth_headers(),
                    on_open=self._on_open,
                    on_message=self._on_message,
                    on_error=self._on_error,
                    on_close=self._on_close
                )

                sslopt = {"cert_reqs": ssl.CERT_NONE, "check_hostname": False}
                self._ws.run_forever(sslopt=sslopt, ping_interval=20, ping_timeout=10)

            except Exception as e:
                logger.error(f"[UPSTOX] Worker exception: {e}")

            if self._stop_event.is_set():
                self.state = "STOPPED"
                break

            self.state = "RECONNECTING"
            logger.info(f"[UPSTOX] Disconnected. Reconnecting in {delay:.1f}s...")
            time.sleep(delay)
            delay = min(delay * 1.5, self._max_reconnect_delay)

    def _on_open(self, ws):
        logger.info("[UPSTOX] Connected to V3 feed successfully.")
        self.state = "CONNECTED"
        self._reconnect_delay = 2  # Reset backoff on successful connect

        # Resubscribe all active keys
        with self._lock:
            keys_to_sub = list(self._active_keys)

        if keys_to_sub:
            self._send_subscription(keys_to_sub)
            self.state = "SUBSCRIBED"

    def _on_error(self, ws, error):
        logger.warning(f"[UPSTOX] WebSocket error encountered: {error}")

    def _on_close(self, ws, close_status_code, close_msg):
        logger.info(f"[UPSTOX] WebSocket connection closed: code={close_status_code}")
        if not self._stop_event.is_set():
            self.state = "DISCONNECTED"

    def _send_subscription(self, keys: List[str]):
        """Send subscription payload over WebSocket."""
        if not self._ws or not self._ws.sock or not keys:
            return
        try:
            sub_payload = {
                "guid": str(uuid.uuid4()),
                "method": "sub",
                "data": {
                    "mode": "full",
                    "instrumentKeys": keys
                }
            }
            msg_bytes = json.dumps(sub_payload).encode("utf-8")
            self._ws.send(msg_bytes, opcode=websocket.ABNF.OPCODE_BINARY)
            logger.info(f"[UPSTOX] Subscribed: {len(keys)} instruments ({', '.join(keys[:3])}...)")
        except Exception as e:
            logger.error(f"[UPSTOX] Error sending subscription: {e}")

    def _on_message(self, ws, raw_message):
        """Decode binary Protobuf message using UpstoxMarketDataDecoder."""
        new_status, ticks = UpstoxMarketDataDecoder.decode(raw_message, self.market_status)

        if new_status:
            self.market_status = new_status
            logger.info(f"[UPSTOX] Market Status: {self.market_status}")

        for tick in ticks:
            # Update cache by canonical instrument_key
            self._cache[tick.instrument_key] = tick
            self._cache[tick.symbol.upper()] = tick
            self.last_update_ts = tick.timestamp

            # Dispatch to listeners
            self._dispatch_tick(tick)

    def _dispatch_tick(self, tick: MarketTick):
        for callback in list(self._listeners.values()):
            try:
                callback(tick)
            except Exception as e:
                logger.error(f"[UPSTOX] Listener callback error: {e}")

    def register_listener(self, listener_id: str, callback: Any):
        self._listeners[listener_id] = callback

    def unregister_listener(self, listener_id: str):
        self._listeners.pop(listener_id, None)

    # --- Client Subscription Reference Counting ---

    def client_subscribe(self, client_id: str, keys: List[str]) -> List[MarketTick]:
        """
        Subscribes a client to a set of keys.
        Returns immediate cached snapshots for requested keys.
        """
        snapshots: List[MarketTick] = []
        new_keys_to_subscribe = []

        with self._lock:
            if client_id not in self._client_subs:
                self._client_subs[client_id] = set()

            for k in keys:
                canonical = instrument_master.resolve_key(k)
                self._client_subs[client_id].add(canonical)

                if canonical not in self._active_keys:
                    self._active_keys.add(canonical)
                    new_keys_to_subscribe.append(canonical)

                # Return immediate snapshot if already in memory cache
                cached = self._cache.get(canonical)
                if cached:
                    snapshots.append(cached)

        if new_keys_to_subscribe and self.is_connected:
            self._send_subscription(new_keys_to_subscribe)

        return snapshots

    def client_unsubscribe(self, client_id: str, keys: List[str]):
        """Unsubscribe a client from keys; prunes keys with 0 remaining listeners."""
        with self._lock:
            client_keys = self._client_subs.get(client_id, set())
            for k in keys:
                canonical = instrument_master.resolve_key(k)
                client_keys.discard(canonical)

            self._recalculate_active_keys()

    def client_disconnect(self, client_id: str):
        """Cleanup when a frontend client disconnects completely."""
        with self._lock:
            self._client_subs.pop(client_id, None)
            self._recalculate_active_keys()

    def _recalculate_active_keys(self):
        """Recalculate active keys from all remaining client subscriptions."""
        needed_keys = set()
        for subs in self._client_subs.values():
            needed_keys.update(subs)

        # Keep default seed keys active
        default_seed_keys = [
            "NSE_EQ|INE009A01021",
            "NSE_EQ|INE467B01029",
            "NSE_EQ|INE002A01018",
            "NSE_EQ|INE040A01034",
            "NSE_INDEX|Nifty 50"
        ]
        needed_keys.update(default_seed_keys)
        self._active_keys = needed_keys

    # --- Cache and REST Fallback ---

    def get_cached_tick(self, symbol_or_key: str, fetch_if_missing: bool = True) -> Optional[MarketTick]:
        """Get quote from cache or fetch via REST fallback."""
        key = instrument_master.resolve_key(symbol_or_key)
        sym = symbol_or_key.strip().upper()

        if key in self._cache:
            return self._cache[key]
        if sym in self._cache:
            return self._cache[sym]

        if not fetch_if_missing:
            return None

        # REST Fallback if live mode enabled
        if self.is_enabled and self.token:
            rest_tick = self.fetch_rest_snapshot(key)
            if rest_tick:
                self._cache[key] = rest_tick
                self._cache[rest_tick.symbol.upper()] = rest_tick
                # Auto-subscribe key so it continues streaming
                with self._lock:
                    if key not in self._active_keys:
                        self._active_keys.add(key)
                        if self.is_connected:
                            self._send_subscription([key])
                return rest_tick

        return None

    def get_cached_quote(self, symbol_or_key: str, fetch_if_missing: bool = True) -> Optional[Dict[str, Any]]:
        """Get quote as a dictionary for compatibility."""
        tick = self.get_cached_tick(symbol_or_key, fetch_if_missing=fetch_if_missing)
        return tick.model_dump() if tick else None

    def _get_http_client(self) -> httpx.Client:
        if not hasattr(self, "_http_client") or self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.Client(timeout=4.0)
        return self._http_client

    def fetch_rest_snapshots_batch(self, symbols_or_keys: List[str]) -> Dict[str, MarketTick]:
        """Fetch multiple quotes in a single Upstox V3 REST request with HTTP connection pooling."""
        if not symbols_or_keys or not self.is_enabled or not self.token:
            return {}

        result: Dict[str, MarketTick] = {}
        missing_keys: List[str] = []

        for item in symbols_or_keys:
            key = instrument_master.resolve_key(item)
            sym = item.strip().upper()
            if key in self._cache:
                result[key] = self._cache[key]
                result[sym] = self._cache[key]
            elif sym in self._cache:
                result[key] = self._cache[sym]
                result[sym] = self._cache[sym]
            else:
                if key not in missing_keys:
                    missing_keys.append(key)

        if not missing_keys:
            return result

        try:
            client = self._get_http_client()
            keys_param = ",".join(missing_keys)
            url = f"https://api.upstox.com/v3/market-quote/quotes?instrument_key={keys_param}"
            res = client.get(url, headers=self._get_auth_headers())
            if res.status_code != 200:
                url_v2 = f"https://api.upstox.com/v2/market-quote/quotes?instrument_key={keys_param}"
                res = client.get(url_v2, headers=self._get_auth_headers())

            if res.status_code == 200:
                data = res.json().get("data", {})
                for k, val in data.items():
                    clean_k = k.replace(":", "|")
                    inst = instrument_master.get_by_key(clean_k) or instrument_master.get_by_symbol(clean_k.split("|")[-1])
                    inst_key = inst.instrument_key if inst else clean_k

                    ltp = float(val.get("last_price") or 0.0)
                    ohlc = val.get("ohlc") or {}
                    cp = float(ohlc.get("close") or ltp or 0.0)
                    open_p = float(ohlc.get("open") or ltp or 0.0)
                    high_p = float(ohlc.get("high") or ltp or 0.0)
                    low_p = float(ohlc.get("low") or ltp or 0.0)
                    volume = float(val.get("volume") or 0.0)
                    net_chg = val.get("net_change")
                    change = float(net_chg) if net_chg is not None else round(ltp - cp, 2)
                    change_pct = round((change / cp * 100), 2) if cp > 0 else 0.0

                    symbol = inst.trading_symbol if inst else inst_key.split("|")[-1]
                    name = inst.name if inst else symbol
                    exchange = inst.exchange if inst else "NSE"
                    segment = inst.segment if inst else "NSE_EQ"

                    asset_type = "EQUITY"
                    if inst:
                        if inst.instrument_type == "ETF":
                            asset_type = "ETF"
                        elif inst.instrument_type == "INDEX":
                            asset_type = "INDEX"
                        elif inst.instrument_type == "BOND":
                            asset_type = "BOND"

                    tick = MarketTick(
                        instrument_key=inst_key,
                        symbol=symbol,
                        name=name,
                        exchange=exchange,
                        segment=segment,
                        asset_type=asset_type,
                        ltp=round(ltp, 2),
                        previous_close=round(cp, 2),
                        change=round(change, 2),
                        change_percent=round(change_pct, 2),
                        open=round(open_p, 2),
                        high=round(high_p, 2),
                        low=round(low_p, 2),
                        volume=volume,
                        timestamp=int(time.time() * 1000),
                        market_status=self.market_status,
                        source="UPSTOX"
                    )
                    self._cache[inst_key] = tick
                    self._cache[symbol.upper()] = tick
                    result[inst_key] = tick
                    result[symbol.upper()] = tick
        except Exception as e:
            logger.error(f"[UPSTOX] Batch REST snapshot error: {e}")

        return result

    def fetch_rest_snapshot(self, instrument_key: str) -> Optional[MarketTick]:
        """REST market quote fallback using Upstox V3 with V2 fallback and HTTP pooling."""
        batch = self.fetch_rest_snapshots_batch([instrument_key])
        key = instrument_master.resolve_key(instrument_key)
        return batch.get(key) or batch.get(instrument_key) or batch.get(instrument_key.split("|")[-1].upper())

    def fetch_ohlc_v3(self, instrument_key: str, interval: str = "1d") -> Optional[Dict[str, Any]]:
        """Fetch V3 OHLC quote directly from Upstox V3 OHLC endpoint."""
        try:
            url = f"https://api.upstox.com/v3/market-quote/ohlc?instrument_key={instrument_key}&interval={interval}"
            with httpx.Client(timeout=6.0) as client:
                res = client.get(url, headers=self._get_auth_headers())
                if res.status_code == 200:
                    return res.json().get("data", {})
        except Exception as e:
            logger.error(f"[UPSTOX] Error fetching V3 OHLC for {instrument_key}: {e}")
        return None

    def fetch_historical_candles(self, symbol_or_key: str, timeframe: str = "1M") -> List[Dict[str, Any]]:
        """Fetch real historical candle series from Upstox without fabricating values."""
        key = instrument_master.resolve_key(symbol_or_key)
        days_map = {
            "1D": 2,
            "1W": 10,
            "1M": 35,
            "3M": 95,
            "6M": 185,
            "1Y": 370,
            "5Y": 1825,
            "ALL": 1825
        }
        days = days_map.get(timeframe.upper(), 35)
        to_date = datetime.now().strftime("%Y-%m-%d")
        from_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

        try:
            url = f"https://api.upstox.com/v2/historical-candle/{key}/day/{to_date}/{from_date}"
            with httpx.Client(timeout=8.0) as client:
                res = client.get(url, headers=self._get_auth_headers())
                if res.status_code == 200:
                    candles = res.json().get("data", {}).get("candles", [])
                    candles_asc = list(reversed(candles))
                    formatted = []
                    for c in candles_asc:
                        date_str = c[0].split("T")[0]
                        try:
                            dt = datetime.fromisoformat(c[0])
                            fmt_date = dt.strftime("%d %b") if timeframe in ("1D", "1W", "1M", "3M") else dt.strftime("%b '%y")
                        except Exception:
                            fmt_date = date_str
                        formatted.append({
                            "date": date_str,
                            "formatted_date": fmt_date,
                            "timestamp": c[0],
                            "open": float(c[1]),
                            "high": float(c[2]),
                            "low": float(c[3]),
                            "close": float(c[4]),
                            "price": float(c[4]),
                            "volume": float(c[5])
                        })
                    return formatted
        except Exception as e:
            logger.error(f"[UPSTOX] Error fetching historical candles for {key}: {e}")
        return []

    def get_provider_status(self) -> ProviderStatusModel:
        """Returns structured status of the Upstox market data feed."""
        last_update_str = None
        if self.last_update_ts:
            last_update_str = datetime.fromtimestamp(self.last_update_ts / 1000, tz=timezone.utc).isoformat()

        return ProviderStatusModel(
            provider="UPSTOX",
            mode="live" if self.is_enabled else "mock",
            connected=self.is_connected,
            state=self.state,
            market_data_enabled=self.is_enabled,
            is_upstox_live=self.is_enabled,
            subscribed_instruments=len(self._active_keys),
            cached_instruments=len(self._cache),
            market_status=self.market_status,
            last_update=last_update_str
        )

upstox_market_data = UpstoxMarketDataManager()
