import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, LineStyle, CrosshairMode, Time } from 'lightweight-charts';
import styled from 'styled-components';

interface EnhancedTradingChartProps {
  assetId: string;
  symbol: string;
}

type ChartType = 'candlestick' | 'line' | 'area' | 'bars';
type Timeframe = '1s' | '5s' | '15s' | '30s' | '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface LineData {
  time: Time;
  value: number;
}

const EnhancedTradingChart: React.FC<EnhancedTradingChartProps> = ({ assetId, symbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const [selectedIndicator, setSelectedIndicator] = useState<string>('');
  const [selectedDrawing, setSelectedDrawing] = useState<string>('');
  const [showIndicators, setShowIndicators] = useState(false);
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<string[]>([]);
  const [priceData, setPriceData] = useState<CandleData[]>([]);

  // Indicators list
  const indicators = [
    { id: 'sma', name: 'SMA - Simple Moving Average', icon: '📈' },
    { id: 'ema', name: 'EMA - Exponential Moving Average', icon: '📊' },
    { id: 'rsi', name: 'RSI - Relative Strength Index', icon: '📉' },
    { id: 'macd', name: 'MACD - Moving Average Convergence Divergence', icon: '🔄' },
    { id: 'bollinger', name: 'Bollinger Bands', icon: '📏' },
    { id: 'stochastic', name: 'Stochastic Oscillator', icon: '⚡' },
    { id: 'atr', name: 'ATR - Average True Range', icon: '📶' },
    { id: 'adx', name: 'ADX - Average Directional Index', icon: '🎯' },
    { id: 'cci', name: 'CCI - Commodity Channel Index', icon: '🌊' },
    { id: 'ichimoku', name: 'Ichimoku Cloud', icon: '☁️' },
  ];

  // Drawing tools list
  const drawingTools = [
    { id: 'trendline', name: 'Trend Line', icon: '📐' },
    { id: 'horizontal', name: 'Horizontal Line', icon: '—' },
    { id: 'vertical', name: 'Vertical Line', icon: '|' },
    { id: 'rectangle', name: 'Rectangle', icon: '▭' },
    { id: 'circle', name: 'Circle', icon: '⭕' },
    { id: 'triangle', name: 'Triangle', icon: '△' },
    { id: 'fibonacci', name: 'Fibonacci Retracement', icon: '🔢' },
    { id: 'arrow', name: 'Arrow', icon: '→' },
    { id: 'text', name: 'Text', icon: 'T' },
  ];

  // Timeframes
  const timeframes: Timeframe[] = ['1s', '5s', '15s', '30s', '1m', '5m', '15m', '30m', '1h', '4h', '1d'];

  // Indicator calculation functions
  const calculateSMA = (data: CandleData[], period: number = 20): LineData[] => {
    const result: LineData[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0);
      result.push({ time: data[i].time, value: sum / period });
    }
    return result;
  };

  const calculateEMA = (data: CandleData[], period: number = 20): LineData[] => {
    const result: LineData[] = [];
    const multiplier = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((acc, candle) => acc + candle.close, 0) / period;

    for (let i = period; i < data.length; i++) {
      ema = (data[i].close - ema) * multiplier + ema;
      result.push({ time: data[i].time, value: ema });
    }
    return result;
  };

  const calculateRSI = (data: CandleData[], period: number = 14): LineData[] => {
    const result: LineData[] = [];
    const changes = data.slice(1).map((candle, i) => candle.close - data[i].close);

    for (let i = period; i < changes.length; i++) {
      const gains = changes.slice(i - period, i).filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
      const losses = Math.abs(changes.slice(i - period, i).filter(c => c < 0).reduce((a, b) => a + b, 0)) / period;
      const rs = gains / (losses || 1);
      const rsi = 100 - (100 / (1 + rs));
      result.push({ time: data[i + 1].time, value: rsi });
    }
    return result;
  };

  const calculateBollingerBands = (data: CandleData[], period: number = 20, stdDev: number = 2) => {
    const sma = calculateSMA(data, period);
    const upper: LineData[] = [];
    const lower: LineData[] = [];

    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = slice.reduce((acc, candle) => acc + candle.close, 0) / period;
      const variance = slice.reduce((acc, candle) => acc + Math.pow(candle.close - mean, 2), 0) / period;
      const std = Math.sqrt(variance);

      upper.push({ time: data[i].time, value: mean + (stdDev * std) });
      lower.push({ time: data[i].time, value: mean - (stdDev * std) });
    }

    return { sma, upper, lower };
  };

  // Generate mock data for demonstration
  const generateMockData = (): CandleData[] => {
    const data: CandleData[] = [];
    let basePrice = 100;
    const now = Math.floor(Date.now() / 1000);

    for (let i = 200; i >= 0; i--) {
      const time = (now - i * 60) as Time;
      const change = (Math.random() - 0.5) * 2;
      const open = basePrice;
      const close = basePrice + change;
      const high = Math.max(open, close) + Math.random();
      const low = Math.min(open, close) - Math.random();

      data.push({ time, open, high, low, close });
      basePrice = close;
    }

    return data;
  };

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
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#667eea',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#667eea',
        },
        horzLine: {
          color: '#667eea',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#667eea',
        },
      },
    });

    chartRef.current = chart;

    // Generate mock data
    const mockData = generateMockData();
    setPriceData(mockData);

    // Create initial candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    candlestickSeries.setData(mockData);
    mainSeriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
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

  const handleChartTypeChange = (type: ChartType) => {
    if (!chartRef.current || priceData.length === 0) return;

    setChartType(type);

    // Remove old main series
    if (mainSeriesRef.current) {
      chartRef.current.removeSeries(mainSeriesRef.current);
    }

    // Add new series based on type
    let newSeries: ISeriesApi<any>;

    switch (type) {
      case 'line':
        newSeries = chartRef.current.addLineSeries({
          color: '#667eea',
          lineWidth: 2,
        });
        newSeries.setData(priceData.map(d => ({ time: d.time, value: d.close })));
        break;

      case 'area':
        newSeries = chartRef.current.addAreaSeries({
          topColor: 'rgba(102, 126, 234, 0.4)',
          bottomColor: 'rgba(102, 126, 234, 0.0)',
          lineColor: '#667eea',
          lineWidth: 2,
        });
        newSeries.setData(priceData.map(d => ({ time: d.time, value: d.close })));
        break;

      case 'bars':
        newSeries = chartRef.current.addBarSeries({
          upColor: '#26a69a',
          downColor: '#ef5350',
        });
        newSeries.setData(priceData);
        break;

      case 'candlestick':
      default:
        newSeries = chartRef.current.addCandlestickSeries({
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });
        newSeries.setData(priceData);
        break;
    }

    mainSeriesRef.current = newSeries;
  };

  const handleTimeframeChange = (tf: Timeframe) => {
    setTimeframe(tf);
    // In a real application, this would fetch new data for the selected timeframe
    console.log(`Timeframe changed to: ${tf}`);
  };

  const addIndicator = (indicatorId: string) => {
    if (!chartRef.current || priceData.length === 0) return;
    if (activeIndicators.includes(indicatorId)) return; // Already active

    let indicatorData: LineData[] = [];
    let series: ISeriesApi<any>;

    switch (indicatorId) {
      case 'sma':
        indicatorData = calculateSMA(priceData, 20);
        series = chartRef.current.addLineSeries({
          color: '#2196F3',
          lineWidth: 2,
          title: 'SMA(20)',
        });
        series.setData(indicatorData);
        indicatorSeriesRef.current.set(indicatorId, series);
        break;

      case 'ema':
        indicatorData = calculateEMA(priceData, 20);
        series = chartRef.current.addLineSeries({
          color: '#FF9800',
          lineWidth: 2,
          title: 'EMA(20)',
        });
        series.setData(indicatorData);
        indicatorSeriesRef.current.set(indicatorId, series);
        break;

      case 'bollinger':
        const bb = calculateBollingerBands(priceData, 20, 2);
        const upperSeries = chartRef.current.addLineSeries({
          color: '#9C27B0',
          lineWidth: 1,
          title: 'BB Upper',
        });
        const middleSeries = chartRef.current.addLineSeries({
          color: '#9C27B0',
          lineWidth: 2,
          title: 'BB Middle',
        });
        const lowerSeries = chartRef.current.addLineSeries({
          color: '#9C27B0',
          lineWidth: 1,
          title: 'BB Lower',
        });
        upperSeries.setData(bb.upper);
        middleSeries.setData(bb.sma);
        lowerSeries.setData(bb.lower);
        indicatorSeriesRef.current.set(`${indicatorId}-upper`, upperSeries);
        indicatorSeriesRef.current.set(`${indicatorId}-middle`, middleSeries);
        indicatorSeriesRef.current.set(`${indicatorId}-lower`, lowerSeries);
        break;

      case 'rsi':
      case 'macd':
      case 'stochastic':
      case 'atr':
      case 'adx':
      case 'cci':
      case 'ichimoku':
        // These indicators would typically be displayed in separate panes
        alert(`${indicatorId.toUpperCase()} indicator added! (Displayed in main chart for demo)`);
        if (indicatorId === 'rsi') {
          const rsiData = calculateRSI(priceData, 14);
          // Scale RSI to fit in price chart (for demo purposes)
          const scaledRSI = rsiData.map(d => ({
            time: d.time,
            value: priceData[0].close * (d.value / 100) // Scale to price range
          }));
          series = chartRef.current.addLineSeries({
            color: '#4CAF50',
            lineWidth: 2,
            title: 'RSI(14)',
          });
          series.setData(scaledRSI);
          indicatorSeriesRef.current.set(indicatorId, series);
        }
        break;
    }

    setActiveIndicators([...activeIndicators, indicatorId]);
  };

  const removeIndicator = (indicatorId: string) => {
    if (!chartRef.current) return;

    // Handle Bollinger Bands (3 series)
    if (indicatorId === 'bollinger') {
      ['upper', 'middle', 'lower'].forEach(band => {
        const key = `${indicatorId}-${band}`;
        const series = indicatorSeriesRef.current.get(key);
        if (series) {
          chartRef.current!.removeSeries(series);
          indicatorSeriesRef.current.delete(key);
        }
      });
    } else {
      const series = indicatorSeriesRef.current.get(indicatorId);
      if (series) {
        chartRef.current.removeSeries(series);
        indicatorSeriesRef.current.delete(indicatorId);
      }
    }

    setActiveIndicators(activeIndicators.filter(id => id !== indicatorId));
  };

  const handleIndicatorSelect = (indicatorId: string) => {
    setSelectedIndicator(indicatorId);
    addIndicator(indicatorId);
    setShowIndicators(false);
  };

  const handleDrawingToolSelect = (toolId: string) => {
    setSelectedDrawing(toolId);
    // In a production app, this would enable drawing mode
    alert(`${toolId} drawing tool activated! Click and drag on the chart to draw. (Drawing functionality requires additional plugin)`);
    setShowDrawingTools(false);
  };

  return (
    <ChartContainer>
      {/* Chart Controls */}
      <ChartControls>
        <ControlGroup>
          <ControlButton active={chartType === 'candlestick'} onClick={() => handleChartTypeChange('candlestick')}>
            🕯️ Candles
          </ControlButton>
          <ControlButton active={chartType === 'line'} onClick={() => handleChartTypeChange('line')}>
            📈 Line
          </ControlButton>
          <ControlButton active={chartType === 'area'} onClick={() => handleChartTypeChange('area')}>
            📊 Area
          </ControlButton>
          <ControlButton active={chartType === 'bars'} onClick={() => handleChartTypeChange('bars')}>
            📊 Bars
          </ControlButton>
        </ControlGroup>

        <ControlGroup>
          <ControlButton onClick={() => setShowIndicators(!showIndicators)}>
            📊 Indicators
          </ControlButton>
          <ControlButton onClick={() => setShowDrawingTools(!showDrawingTools)}>
            ✏️ Drawing Tools
          </ControlButton>
        </ControlGroup>

        <ControlGroup>
          <ControlButton>⚙️</ControlButton>
          <ControlButton>📸</ControlButton>
          <ControlButton>🔍</ControlButton>
        </ControlGroup>
      </ChartControls>

      {/* Timeframe Selector */}
      <TimeframeBar>
        {timeframes.map((tf) => (
          <TimeframeButton key={tf} active={timeframe === tf} onClick={() => handleTimeframeChange(tf)}>
            {tf}
          </TimeframeButton>
        ))}
      </TimeframeBar>

      {/* Active Indicators Display */}
      {activeIndicators.length > 0 && (
        <ActiveIndicatorsBar>
          <span style={{ fontSize: '0.75rem', color: '#8a8ea0', marginRight: '0.5rem' }}>Active:</span>
          {activeIndicators.map((indicatorId) => {
            const indicator = indicators.find(i => i.id === indicatorId);
            return (
              <ActiveIndicatorChip key={indicatorId}>
                <span>{indicator?.icon}</span>
                <span>{indicatorId.toUpperCase()}</span>
                <RemoveButton onClick={() => removeIndicator(indicatorId)}>×</RemoveButton>
              </ActiveIndicatorChip>
            );
          })}
        </ActiveIndicatorsBar>
      )}

      {/* Indicators Dropdown */}
      {showIndicators && (
        <DropdownPanel>
          <DropdownTitle>Technical Indicators</DropdownTitle>
          <IndicatorList>
            {indicators.map((indicator) => (
              <IndicatorItem
                key={indicator.id}
                onClick={() => handleIndicatorSelect(indicator.id)}
                style={{
                  opacity: activeIndicators.includes(indicator.id) ? 0.5 : 1,
                  cursor: activeIndicators.includes(indicator.id) ? 'not-allowed' : 'pointer'
                }}
              >
                <IndicatorIcon>{indicator.icon}</IndicatorIcon>
                <IndicatorName>
                  {indicator.name}
                  {activeIndicators.includes(indicator.id) && ' (Active)'}
                </IndicatorName>
              </IndicatorItem>
            ))}
          </IndicatorList>
        </DropdownPanel>
      )}

      {/* Drawing Tools Dropdown */}
      {showDrawingTools && (
        <DropdownPanel>
          <DropdownTitle>Drawing Tools</DropdownTitle>
          <ToolsList>
            {drawingTools.map((tool) => (
              <ToolItem key={tool.id} onClick={() => handleDrawingToolSelect(tool.id)}>
                <ToolIcon>{tool.icon}</ToolIcon>
                <ToolName>{tool.name}</ToolName>
              </ToolItem>
            ))}
          </ToolsList>
        </DropdownPanel>
      )}

      {/* Chart */}
      <ChartWrapper ref={chartContainerRef} />
    </ChartContainer>
  );
};

const ChartContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background: #1a1d2e;
  border-radius: 10px;
  overflow: hidden;
`;

const ChartControls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(26, 29, 58, 0.95);
  border-bottom: 1px solid #2a2e39;
`;

const ControlGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  border-right: 1px solid #2a2e39;
  padding-right: 1rem;

  &:last-child {
    border-right: none;
  }
`;

const ControlButton = styled.button<{ active?: boolean }>`
  padding: 0.5rem 1rem;
  background: ${(props) => (props.active ? '#667eea' : 'transparent')};
  border: 1px solid ${(props) => (props.active ? '#667eea' : '#2a2e39')};
  border-radius: 6px;
  color: #fff;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: ${(props) => (props.active ? '#667eea' : 'rgba(102, 126, 234, 0.1)')};
    border-color: #667eea;
  }
`;

const TimeframeBar = styled.div`
  display: flex;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  background: rgba(26, 29, 58, 0.8);
  border-bottom: 1px solid #2a2e39;
  overflow-x: auto;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #667eea;
    border-radius: 2px;
  }
`;

const TimeframeButton = styled.button<{ active?: boolean }>`
  padding: 0.5rem 1rem;
  background: ${(props) => (props.active ? '#667eea' : 'transparent')};
  border: 1px solid ${(props) => (props.active ? '#667eea' : 'transparent')};
  border-radius: 6px;
  color: ${(props) => (props.active ? '#fff' : '#8a8ea0')};
  font-size: 0.875rem;
  font-weight: ${(props) => (props.active ? '600' : '400')};
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: ${(props) => (props.active ? '#667eea' : 'rgba(102, 126, 234, 0.1)')};
    color: #fff;
  }
`;

const DropdownPanel = styled.div`
  position: absolute;
  top: 120px;
  left: 1rem;
  width: 350px;
  max-height: 500px;
  background: rgba(26, 29, 58, 0.98);
  border: 1px solid #2a2e39;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 100;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #667eea;
    border-radius: 3px;
  }
`;

const DropdownTitle = styled.div`
  padding: 1rem;
  font-size: 1.125rem;
  font-weight: 700;
  color: #fff;
  border-bottom: 1px solid #2a2e39;
  position: sticky;
  top: 0;
  background: rgba(26, 29, 58, 0.98);
`;

const IndicatorList = styled.div`
  padding: 0.5rem;
`;

const IndicatorItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(102, 126, 234, 0.1);
  }
`;

const IndicatorIcon = styled.div`
  font-size: 1.5rem;
`;

const IndicatorName = styled.div`
  color: #d1d4dc;
  font-size: 0.9rem;
`;

const ToolsList = styled.div`
  padding: 0.5rem;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
`;

const ToolItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(102, 126, 234, 0.1);
  }
`;

const ToolIcon = styled.div`
  font-size: 1.5rem;
`;

const ToolName = styled.div`
  color: #d1d4dc;
  font-size: 0.75rem;
  text-align: center;
`;

const ChartWrapper = styled.div`
  width: 100%;
  height: calc(100% - 120px);
`;

const ActiveIndicatorsBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(26, 29, 58, 0.7);
  border-bottom: 1px solid #2a2e39;
  overflow-x: auto;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #667eea;
    border-radius: 2px;
  }
`;

const ActiveIndicatorChip = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: rgba(102, 126, 234, 0.2);
  border: 1px solid #667eea;
  border-radius: 6px;
  font-size: 0.75rem;
  color: #fff;
  white-space: nowrap;
`;

const RemoveButton = styled.button`
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  margin-left: 0.25rem;
  opacity: 0.7;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

export default EnhancedTradingChart;
