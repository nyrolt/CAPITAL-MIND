import os
import sys
from pathlib import Path

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import json
import time
import uuid
import unittest
from unittest.mock import MagicMock, patch

from app.config import settings
from app.models.market import MarketTick, ProviderStatusModel, MarketStatusModel
from app.services.instrument_master import instrument_master, Instrument
from app.services.market_data.decoder import UpstoxMarketDataDecoder
from app.services.upstox_market_data import UpstoxMarketDataManager
from upstox_client.feeder.proto import MarketDataFeedV3_pb2

class TestMarketDataPipeline(unittest.TestCase):

    # 1. Token Configuration Test
    def test_token_configuration(self):
        # Verify settings schema includes market data flags
        self.assertTrue(hasattr(settings, "UPSTOX_ANALYTICS_TOKEN"))
        self.assertTrue(hasattr(settings, "UPSTOX_MARKET_DATA_ENABLED"))
        self.assertTrue(hasattr(settings, "UPSTOX_MARKET_DATA_MODE"))
        self.assertIsInstance(settings.is_upstox_live, bool)

    # 2. Authorization Endpoint Flow (Mocked HTTP)
    @patch("httpx.Client.get")
    def test_authorization_endpoint_mock(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": "success",
            "data": {
                "authorizedRedirectUri": "wss://wsfeeder-api.upstox.com/market-data-feed/v3?token=mock_test_token"
            }
        }
        mock_get.return_value = mock_response

        manager = UpstoxMarketDataManager()
        manager.token = "mock_secret_token"
        manager.is_enabled = True

        uri = manager._fetch_authorized_redirect_uri()
        self.assertIsNotNone(uri)
        self.assertIn("wsfeeder-api.upstox.com", uri)
        # Verify headers used
        headers = manager._get_auth_headers()
        self.assertEqual(headers["Authorization"], "Bearer mock_secret_token")
        self.assertEqual(headers["Accept"], "application/json")

    # 3. REST Quote Snapshot (Mocked HTTP)
    @patch("httpx.Client.get")
    def test_rest_quote_snapshot_mock(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": "success",
            "data": {
                "NSE_EQ:INFY": {
                    "last_price": 1520.50,
                    "net_change": 15.20,
                    "ohlc": {
                        "open": 1510.0,
                        "high": 1530.0,
                        "low": 1505.0,
                        "close": 1505.30,
                        "volume": 2500000
                    }
                }
            }
        }
        mock_get.return_value = mock_response

        manager = UpstoxMarketDataManager()
        manager.token = "mock_token"
        manager.is_enabled = True

        tick = manager.fetch_rest_snapshot("NSE_EQ|INE009A01021")
        self.assertIsNotNone(tick)
        self.assertEqual(tick.symbol, "INFY")
        self.assertEqual(tick.ltp, 1520.50)
        self.assertEqual(tick.previous_close, 1505.30)
        self.assertEqual(tick.change, 15.20)
        self.assertEqual(tick.asset_type, "EQUITY")
        self.assertEqual(tick.source, "UPSTOX")

    # 4. Protobuf Decoder Test with Synthetic Protobuf Message
    def test_protobuf_decoder(self):
        feed_response = MarketDataFeedV3_pb2.FeedResponse()
        feed_response.type = MarketDataFeedV3_pb2.Type.live_feed

        # Create market full feed item
        feed_data = feed_response.feeds["NSE_EQ|INE009A01021"]
        feed_data.fullFeed.marketFF.ltpc.ltp = 1525.75
        feed_data.fullFeed.marketFF.ltpc.cp = 1510.00
        feed_data.fullFeed.marketFF.ltpc.ltt = 1760000000000
        feed_data.fullFeed.marketFF.vtt = 3200000

        # Create index full feed item
        index_data = feed_response.feeds["NSE_INDEX|Nifty 50"]
        index_data.fullFeed.indexFF.ltpc.ltp = 22500.50
        index_data.fullFeed.indexFF.ltpc.cp = 22400.00
        index_data.fullFeed.indexFF.ltpc.ltt = 1760000000000

        # Serialize to bytes
        raw_bytes = feed_response.SerializeToString()

        status, ticks = UpstoxMarketDataDecoder.decode(raw_bytes, current_market_status="OPEN")
        self.assertEqual(len(ticks), 2)

        # Find INFY tick
        infy_tick = next(t for t in ticks if t.symbol == "INFY")
        self.assertEqual(infy_tick.ltp, 1525.75)
        self.assertEqual(infy_tick.previous_close, 1510.00)
        self.assertEqual(infy_tick.change, 15.75)
        self.assertEqual(infy_tick.asset_type, "EQUITY")

        # Find NIFTY 50 tick
        nifty_tick = next(t for t in ticks if t.symbol == "NIFTY 50")
        self.assertEqual(nifty_tick.ltp, 22500.50)
        self.assertEqual(nifty_tick.asset_type, "INDEX")

    # 5. Normalized MarketTick Model Validation
    def test_normalized_tick_model(self):
        tick = MarketTick(
            instrument_key="NSE_EQ|INE009A01021",
            symbol="INFY",
            name="Infosys Ltd.",
            exchange="NSE",
            segment="NSE_EQ",
            asset_type="EQUITY",
            ltp=1510.50,
            previous_close=1500.00,
            change=10.50,
            change_percent=0.70,
            open=1505.00,
            high=1520.00,
            low=1498.00,
            volume=1500000,
            timestamp=int(time.time() * 1000),
            market_status="OPEN",
            source="UPSTOX"
        )
        data = tick.model_dump()
        self.assertEqual(data["symbol"], "INFY")
        self.assertEqual(data["asset_type"], "EQUITY")
        self.assertEqual(data["ltp"], 1510.50)
        self.assertEqual(data["change"], 10.50)

    # 6. Instrument Master Lookup & Multi-Asset Support
    def test_instrument_master_multi_asset(self):
        # Equity lookup
        infy_key = instrument_master.resolve_key("INFY")
        self.assertEqual(infy_key, "NSE_EQ|INE009A01021")

        # Index lookup
        nifty_key = instrument_master.resolve_key("NIFTY 50")
        self.assertEqual(nifty_key, "NSE_INDEX|Nifty 50")

        # ETF lookup
        bees_key = instrument_master.resolve_key("NIFTYBEES")
        self.assertEqual(bees_key, "NSE_EQ|INF204KB14I2")
        bees_meta = instrument_master.get_by_key(bees_key)
        self.assertIsNotNone(bees_meta)
        self.assertEqual(bees_meta.instrument_type, "ETF")

        # Sovereign Bond lookup
        bond_key = instrument_master.resolve_key("GSEC2033")
        self.assertEqual(bond_key, "NSE_EQ|IN0020230085")
        bond_meta = instrument_master.get_by_key(bond_key)
        self.assertIsNotNone(bond_meta)
        self.assertEqual(bond_meta.instrument_type, "BOND")

        # Search functionality
        results = instrument_master.search("BEES", limit=5)
        self.assertGreater(len(results), 0)
        symbols = [r["symbol"] for r in results]
        self.assertTrue(any("BEES" in s for s in symbols))

    # 7. Subscription Reference Counting & Manager
    def test_client_subscription_reference_counting(self):
        manager = UpstoxMarketDataManager()
        manager.is_enabled = False  # Ensure unit test runs purely in-memory
        client_a = "client_alpha"
        client_b = "client_beta"

        # Client A subscribes to INFY & TCS
        manager.client_subscribe(client_a, ["INFY", "TCS"])
        self.assertIn("NSE_EQ|INE009A01021", manager._client_subs[client_a])
        self.assertIn("NSE_EQ|INE467B01029", manager._client_subs[client_a])
        self.assertIn("NSE_EQ|INE009A01021", manager._active_keys)

        # Client B also subscribes to INFY
        manager.client_subscribe(client_b, ["INFY"])
        self.assertIn("NSE_EQ|INE009A01021", manager._client_subs[client_b])

        # Client A unsubscribes from INFY
        manager.client_unsubscribe(client_a, ["INFY"])
        self.assertNotIn("NSE_EQ|INE009A01021", manager._client_subs[client_a])
        # Key must STILL be active because Client B is subscribed!
        self.assertIn("NSE_EQ|INE009A01021", manager._active_keys)

        # Client B disconnects completely
        manager.client_disconnect(client_b)
        self.assertNotIn(client_b, manager._client_subs)

    # 8. Reconnection State Machine
    def test_reconnection_state_machine(self):
        manager = UpstoxMarketDataManager()
        manager.is_enabled = False
        self.assertIn(manager.state, ("DISCONNECTED", "STOPPED"))

        status = manager.get_provider_status()
        self.assertIsInstance(status, ProviderStatusModel)
        self.assertEqual(status.provider, "UPSTOX")
        self.assertIn(status.state, ("DISCONNECTED", "STOPPED"))

    # 9. Backend WebSocket /ws/market Connection and Message Handling
    def test_websocket_market_endpoint(self):
        from starlette.testclient import TestClient
        from app.services.upstox_market_data import upstox_market_data
        orig_enabled = upstox_market_data.is_enabled
        upstox_market_data.is_enabled = False
        try:
            from app.main import app
            client = TestClient(app)
            with client.websocket_connect("/ws/market") as ws:
                # First message received is the initial provider status
                init_msg = ws.receive_json()
                self.assertEqual(init_msg.get("type"), "status")
                self.assertIn("provider", init_msg.get("data", {}))

                # Send ping heartbeat
                ws.send_json({"action": "ping"})
                pong_msg = ws.receive_json()
                self.assertEqual(pong_msg.get("type"), "pong")

                # Send subscribe action
                ws.send_json({"action": "subscribe", "instrument_keys": ["NSE_EQ|INE009A01021"]})

                # Send unsubscribe action
                ws.send_json({"action": "unsubscribe", "instrument_keys": ["NSE_EQ|INE009A01021"]})
        finally:
            upstox_market_data.is_enabled = orig_enabled

if __name__ == "__main__":
    unittest.main()
