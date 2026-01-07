import { create } from 'zustand';

interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: string;
  payoutPercent: number;
  minTradeAmount: number;
  maxTradeAmount: number;
  currentPrice?: number;
}

interface Trade {
  id: string;
  assetId: string;
  direction: 'UP' | 'DOWN';
  amount: number;
  status: string;
  openPrice?: number;
  closePrice?: number;
  profit?: number;
  expiresAt?: string;
}

interface TradingState {
  selectedAsset: Asset | null;
  assets: Asset[];
  amount: number;
  expirySeconds: number;
  walletType: 'DEMO' | 'REAL';
  activeTrades: Trade[];
  balance: number;
  demoBalance: number;
  realBalance: number;

  setSelectedAsset: (asset: Asset) => void;
  setAssets: (assets: Asset[]) => void;
  setAmount: (amount: number) => void;
  setExpirySeconds: (seconds: number) => void;
  setWalletType: (type: 'DEMO' | 'REAL') => void;
  setActiveTrades: (trades: Trade[]) => void;
  addTrade: (trade: Trade) => void;
  updateTrade: (tradeId: string, updates: Partial<Trade>) => void;
  setBalances: (demo: number, real: number) => void;
  updatePrice: (assetId: string, price: number) => void;
}

export const useTradingStore = create<TradingState>((set) => ({
  selectedAsset: null,
  assets: [],
  amount: 10,
  expirySeconds: 60,
  walletType: 'DEMO',
  activeTrades: [],
  balance: 10000,
  demoBalance: 10000,
  realBalance: 0,

  setSelectedAsset: (asset) => set({ selectedAsset: asset }),

  setAssets: (assets) => set({ assets }),

  setAmount: (amount) => set({ amount }),

  setExpirySeconds: (seconds) => set({ expirySeconds: seconds }),

  setWalletType: (type) => set({
    walletType: type,
    balance: type === 'DEMO' ? (state: any) => state.demoBalance : (state: any) => state.realBalance
  }),

  setActiveTrades: (trades) => set({ activeTrades: trades }),

  addTrade: (trade) => set((state) => ({
    activeTrades: [...state.activeTrades, trade]
  })),

  updateTrade: (tradeId, updates) => set((state) => ({
    activeTrades: state.activeTrades.map(trade =>
      trade.id === tradeId ? { ...trade, ...updates } : trade
    )
  })),

  setBalances: (demo, real) => set((state) => ({
    demoBalance: demo,
    realBalance: real,
    balance: state.walletType === 'DEMO' ? demo : real
  })),

  updatePrice: (assetId, price) => set((state) => ({
    assets: state.assets.map(asset =>
      asset.id === assetId ? { ...asset, currentPrice: price } : asset
    ),
    selectedAsset: state.selectedAsset?.id === assetId
      ? { ...state.selectedAsset, currentPrice: price }
      : state.selectedAsset
  })),
}));
