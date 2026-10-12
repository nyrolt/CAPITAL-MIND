import logging
from typing import List, Optional, Tuple
from upstox_client.feeder.proto import MarketDataFeedV3_pb2
from app.models.market import MarketTick, AssetTypeCategory
from app.services.instrument_master import instrument_master

logger = logging.getLogger("capitalmind.upstox.decoder")

class UpstoxMarketDataDecoder:
    """
    Decodes binary Protobuf messages from Upstox Market Data Feed V3
    into normalized MarketTick models.
    """

    @staticmethod
    def decode(raw_bytes: bytes, current_market_status: str = "CLOSED") -> Tuple[Optional[str], List[MarketTick]]:
        """
        Decodes raw bytes.
        Returns (new_market_status_if_present, list_of_decoded_ticks).
        """
        try:
            feed_response = MarketDataFeedV3_pb2.FeedResponse.FromString(raw_bytes)
        except Exception as e:
            logger.error(f"[DECODER] Protobuf deserialization failed: {e}")
            return None, []

        new_market_status: Optional[str] = None
        ticks: List[MarketTick] = []

        # 1. Process market status info if present
        if feed_response.type == MarketDataFeedV3_pb2.Type.market_info:
            if feed_response.HasField("marketInfo"):
                seg_status = feed_response.marketInfo.segmentStatus
                status_val = seg_status.get("NSE_EQ", seg_status.get("NSE_INDEX", None))
                if status_val is not None:
                    if isinstance(status_val, int):
                        # Map MarketStatus enum integer
                        if status_val == MarketDataFeedV3_pb2.MarketStatus.NORMAL_OPEN:
                            new_market_status = "OPEN"
                        elif status_val in (MarketDataFeedV3_pb2.MarketStatus.PRE_OPEN_START, MarketDataFeedV3_pb2.MarketStatus.PRE_OPEN_END):
                            new_market_status = "PRE_OPEN"
                        elif status_val in (MarketDataFeedV3_pb2.MarketStatus.NORMAL_CLOSE, MarketDataFeedV3_pb2.MarketStatus.CLOSING_END):
                            new_market_status = "CLOSED"
                        else:
                            try:
                                new_market_status = MarketDataFeedV3_pb2.MarketStatus.DESCRIPTOR.values_by_number[status_val].name
                            except Exception:
                                new_market_status = str(status_val)
                    else:
                        str_val = str(status_val).upper()
                        if "OPEN" in str_val:
                            new_market_status = "OPEN"
                        elif "PRE" in str_val:
                            new_market_status = "PRE_OPEN"
                        elif "CLOSE" in str_val:
                            new_market_status = "CLOSED"
                        else:
                            new_market_status = str_val

        # 2. Process feed items
        if feed_response.feeds:
            effective_status = new_market_status or current_market_status
            for inst_key, feed in feed_response.feeds.items():
                tick = UpstoxMarketDataDecoder._parse_feed_item(inst_key, feed, effective_status)
                if tick:
                    ticks.append(tick)

        return new_market_status, ticks

    @staticmethod
    def _parse_feed_item(inst_key: str, feed: MarketDataFeedV3_pb2.Feed, market_status: str) -> Optional[MarketTick]:
        try:
            ltpc = None
            market_ohlc = None
            market_level = None

            if feed.HasField("fullFeed"):
                full_feed = feed.fullFeed
                if full_feed.HasField("marketFF"):
                    mff = full_feed.marketFF
                    ltpc = mff.ltpc if mff.HasField("ltpc") else None
                    market_ohlc = mff.marketOHLC if mff.HasField("marketOHLC") else None
                    market_level = mff.marketLevel if mff.HasField("marketLevel") else None
                elif full_feed.HasField("indexFF"):
                    iff = full_feed.indexFF
                    ltpc = iff.ltpc if iff.HasField("ltpc") else None
                    market_ohlc = iff.marketOHLC if iff.HasField("marketOHLC") else None
            elif feed.HasField("ltpc"):
                ltpc = feed.ltpc

            if not ltpc:
                return None

            ltp = float(ltpc.ltp)
            cp = float(ltpc.cp)
            ltt = int(ltpc.ltt) if ltpc.ltt else 0

            # OHLC
            open_p, high_p, low_p, close_p = None, None, None, None
            if market_ohlc and market_ohlc.ohlc:
                daily = market_ohlc.ohlc[0]
                open_p = float(daily.open)
                high_p = float(daily.high)
                low_p = float(daily.low)
                close_p = float(daily.close)

            # Fallback when closed-market tick has zero LTP/CP but daily OHLC close is known
            if ltp <= 0.0 and cp > 0.0:
                ltp = cp
            elif ltp <= 0.0 and close_p and close_p > 0.0:
                ltp = close_p

            if cp <= 0.0 and close_p and close_p > 0.0:
                cp = close_p

            change = round(ltp - cp, 2) if cp > 0 else 0.0
            change_percent = round((change / cp * 100), 2) if cp > 0 else 0.0

            # Market Level depth (bid/ask)
            bid, ask, bid_q, ask_q = None, None, None, None
            if market_level and market_level.bidAskQuote:
                depth_0 = market_level.bidAskQuote[0]
                if depth_0.bidP > 0:
                    bid = float(depth_0.bidP)
                    bid_q = float(depth_0.bidQ)
                if depth_0.askP > 0:
                    ask = float(depth_0.askP)
                    ask_q = float(depth_0.askQ)

            # Metadata resolution
            inst = instrument_master.get_by_key(inst_key)
            if inst_key == "NSE_INDEX|Nifty 50":
                symbol = "NIFTY 50"
            elif inst_key == "NSE_INDEX|Nifty Bank":
                symbol = "NIFTY BANK"
            else:
                symbol = inst.trading_symbol if inst else inst_key.split("|")[-1]
            name = inst.name if inst else symbol
            exchange = inst.exchange if inst else ("BSE" if "BSE" in inst_key else "NSE")
            segment = inst.segment if inst else ("NSE_INDEX" if "INDEX" in inst_key else "NSE_EQ")

            # Determine AssetTypeCategory
            asset_type: AssetTypeCategory = "EQUITY"
            if inst:
                if inst.instrument_type == "ETF":
                    asset_type = "ETF"
                elif inst.instrument_type == "INDEX":
                    asset_type = "INDEX"
                elif inst.instrument_type == "BOND":
                    asset_type = "BOND"
            elif "INDEX" in inst_key:
                asset_type = "INDEX"

            return MarketTick(
                instrument_key=inst_key,
                symbol=symbol,
                name=name,
                exchange=exchange,
                segment=segment,
                asset_type=asset_type,
                ltp=round(ltp, 2),
                previous_close=round(cp, 2),
                change=change,
                change_percent=change_percent,
                open=open_p,
                high=high_p,
                low=low_p,
                volume=0.0,
                timestamp=ltt,
                bid=bid,
                ask=ask,
                bid_quantity=bid_q,
                ask_quantity=ask_q,
                market_status=market_status,
                source="UPSTOX"
            )

        except Exception as e:
            logger.error(f"[DECODER] Error parsing feed item for {inst_key}: {e}")
            return None
