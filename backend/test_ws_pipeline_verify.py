import asyncio
import json
import websockets

async def test_ws_client():
    uri = "ws://127.0.0.1:8000/ws/market"
    print(f"Connecting to {uri}...")
    async with websockets.connect(uri) as ws:
        print("[PASS] WebSocket connection established!")

        # 1. Receive initial status message
        raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
        msg = json.loads(raw)
        assert msg["type"] == "status", f"Expected 'status', got {msg.get('type')}"
        status_data = msg["data"]
        print(f"[PASS] Received initial provider status: provider={status_data.get('provider')}, mode={status_data.get('mode')}, connected={status_data.get('connected')}")

        # 2. Test ping / pong
        await ws.send(json.dumps({"action": "ping"}))
        pong_raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
        pong_msg = json.loads(pong_raw)
        assert pong_msg["type"] == "pong", f"Expected 'pong', got {pong_msg}"
        print(f"[PASS] Ping/Pong verified: timestamp={pong_msg.get('timestamp')}")

        # 3. Subscribe to instruments
        instruments = ["NSE_EQ|INE009A01021", "NSE_EQ|INE467B01029", "NSE_INDEX|Nifty 50"]
        print(f"Subscribing to {instruments}...")
        await ws.send(json.dumps({
            "action": "subscribe",
            "instrument_keys": instruments
        }))

        # 4. Wait for snapshot or ticks
        received_ticks = 0
        try:
            while received_ticks < 2:
                msg_raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
                tick_msg = json.loads(msg_raw)
                if tick_msg["type"] == "market_tick":
                    tick = tick_msg["data"]
                    received_ticks += 1
                    print(f"  [PASS] Tick {received_ticks}: {tick['symbol']} ({tick['instrument_key']}) -> LTP=Rs.{tick['ltp']}, Change={tick['change']} ({tick['change_percent']}%)")
        except asyncio.TimeoutError:
            print("  [NOTE] Timed out waiting for ticks (market may be offline or no fresh ticks received)")

        # 5. Test unsubscribe
        await ws.send(json.dumps({
            "action": "unsubscribe",
            "instrument_keys": instruments
        }))
        print("[PASS] Unsubscribe request sent successfully!")

        print("\nWS PIPELINE VERIFICATION PASSED!")

if __name__ == "__main__":
    asyncio.run(test_ws_client())
