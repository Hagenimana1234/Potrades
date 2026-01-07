import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useTradingStore } from '../store/tradingStore';
import wsService from '../services/websocket';

export function TradingChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const { selectedAsset } = useTradingStore();
  const [priceData, setPriceData] = useState<any[]>([]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#1a1d2e' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2a2e39' },
        horzLines: { color: '#2a2e39' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: '#2a2e39',
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!selectedAsset || !candlestickSeriesRef.current) return;

    // Subscribe to price updates
    wsService.subscribeToPrices(selectedAsset.id, (update) => {
      const time = Math.floor(new Date(update.timestamp).getTime() / 1000);

      setPriceData((prev) => {
        const newData = [...prev];
        const lastCandle = newData[newData.length - 1];

        if (!lastCandle || time - lastCandle.time >= 60) {
          // New candle
          newData.push({
            time,
            open: update.price,
            high: update.price,
            low: update.price,
            close: update.price,
          });
        } else {
          // Update current candle
          newData[newData.length - 1] = {
            ...lastCandle,
            high: Math.max(lastCandle.high, update.price),
            low: Math.min(lastCandle.low, update.price),
            close: update.price,
          };
        }

        if (newData.length > 100) newData.shift();

        candlestickSeriesRef.current?.setData(newData);
        return newData;
      });
    });

    return () => {
      wsService.unsubscribeFromPrices(selectedAsset.id);
    };
  }, [selectedAsset]);

  return (
    <div
      ref={chartContainerRef}
      className="w-full h-full"
      style={{ minHeight: '400px' }}
    />
  );
}
