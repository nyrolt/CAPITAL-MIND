import { useState, useEffect, useRef, useCallback } from 'react';
import { LiveMarketTick, MarketProviderStatus } from '../types';
import { marketDataService } from '../services/marketDataService';

export function useMarketData(symbols: string[] = []) {
  const [ticks, setTicks] = useState<Record<string, LiveMarketTick>>({});
  const [connectionState, setConnectionState] = useState(marketDataService.connectionState);
  const [providerStatus, setProviderStatus] = useState<MarketProviderStatus | null>(marketDataService.providerStatus);
  const [flashes, setFlashes] = useState<Record<string, 'up' | 'down' | null>>({});

  const symbolsRef = useRef<string[]>(symbols);
  symbolsRef.current = symbols;

  const previousPricesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    // Collect immediate snapshots for provided symbols
    const initialMap: Record<string, LiveMarketTick> = {};
    for (const s of symbols) {
      const cached = marketDataService.getCachedTick(s);
      if (cached) {
        initialMap[s.toUpperCase()] = cached;
        initialMap[cached.instrument_key] = cached;
      }
    }
    if (Object.keys(initialMap).length > 0) {
      setTicks((prev) => ({ ...prev, ...initialMap }));
    }

    // Subscribe to symbols
    if (symbols.length > 0) {
      marketDataService.subscribe(symbols);
    }

    // Tick Listener
    const handleTick = (tick: LiveMarketTick) => {
      const symUpper = tick.symbol.toUpperCase();
      const key = tick.instrument_key;

      const isInterested = symbolsRef.current.some(
        (s) => s.toUpperCase() === symUpper || s === key
      );

      if (isInterested || symbolsRef.current.length === 0) {
        // Compute price flash
        const prevPrice = previousPricesRef.current[symUpper];
        if (prevPrice !== undefined && prevPrice !== tick.ltp) {
          const dir = tick.ltp > prevPrice ? 'up' : 'down';
          setFlashes((f) => ({ ...f, [symUpper]: dir, [key]: dir }));
          setTimeout(() => {
            setFlashes((f) => ({ ...f, [symUpper]: null, [key]: null }));
          }, 1200);
        }
        previousPricesRef.current[symUpper] = tick.ltp;
        previousPricesRef.current[key] = tick.ltp;

        setTicks((prev) => ({
          ...prev,
          [symUpper]: tick,
          [key]: tick
        }));
      }
    };

    // Status Listener
    const handleStatus = (status: MarketProviderStatus) => {
      setProviderStatus(status);
      setConnectionState(marketDataService.connectionState);
    };

    marketDataService.addTickListener(handleTick);
    marketDataService.addStatusListener(handleStatus);

    // Initial fetch of provider status if not set
    if (!providerStatus) {
      marketDataService.getProviderStatus().then((s) => {
        if (s) setProviderStatus(s);
      });
    }

    return () => {
      marketDataService.removeTickListener(handleTick);
      marketDataService.removeStatusListener(handleStatus);
      if (symbols.length > 0) {
        marketDataService.unsubscribe(symbols);
      }
    };
  }, [symbols.join(',')]);

  const getTick = useCallback(
    (symbolOrKey: string): LiveMarketTick | undefined => {
      const upper = symbolOrKey.trim().toUpperCase();
      return ticks[upper] || marketDataService.getCachedTick(upper);
    },
    [ticks]
  );

  return {
    ticks,
    getTick,
    connectionState,
    providerStatus,
    flashes,
    subscribe: (keys: string[]) => marketDataService.subscribe(keys),
    unsubscribe: (keys: string[]) => marketDataService.unsubscribe(keys)
  };
}
