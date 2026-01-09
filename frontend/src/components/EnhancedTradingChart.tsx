import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, LineStyle } from 'lightweight-charts';
import styled from 'styled-components';

interface EnhancedTradingChartProps {
  assetId: string;
  symbol: string;
}

type ChartType = 'candlestick' | 'line' | 'area' | 'bars';
type Timeframe = '1s' | '5s' | '15s' | '30s' | '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

const EnhancedTradingChart: React.FC<EnhancedTradingChartProps> = ({ assetId, symbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const [selectedIndicator, setSelectedIndicator] = useState<string>('');
  const [selectedDrawing, setSelectedDrawing] = useState<string>('');
  const [showIndicators, setShowIndicators] = useState(false);
  const [showDrawingTools, setShowDrawingTools] = useState(false);

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
        mode: 1,
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
    setChartType(type);
    // Implement chart type change logic
  };

  const handleTimeframeChange = (tf: Timeframe) => {
    setTimeframe(tf);
    // Implement timeframe change logic
  };

  const handleIndicatorSelect = (indicatorId: string) => {
    setSelectedIndicator(indicatorId);
    // Implement indicator addition logic
    setShowIndicators(false);
  };

  const handleDrawingToolSelect = (toolId: string) => {
    setSelectedDrawing(toolId);
    // Implement drawing tool activation logic
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

      {/* Indicators Dropdown */}
      {showIndicators && (
        <DropdownPanel>
          <DropdownTitle>Technical Indicators</DropdownTitle>
          <IndicatorList>
            {indicators.map((indicator) => (
              <IndicatorItem key={indicator.id} onClick={() => handleIndicatorSelect(indicator.id)}>
                <IndicatorIcon>{indicator.icon}</IndicatorIcon>
                <IndicatorName>{indicator.name}</IndicatorName>
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

export default EnhancedTradingChart;
