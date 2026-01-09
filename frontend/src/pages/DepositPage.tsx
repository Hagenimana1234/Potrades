import { useState } from 'react';
import { DollarSign, CreditCard, Wallet, Copy, Check, AlertCircle, Info, TrendingUp } from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  type: 'crypto' | 'card' | 'bank' | 'ewallet';
  icon: string;
  minDeposit: number;
  maxDeposit: number;
  processingTime: string;
  fee: string;
  networks?: string[];
}

interface CryptoNetwork {
  id: string;
  name: string;
  chainId?: string;
  confirmations: number;
  minDeposit: number;
  fee: string;
}

const DepositPage = () => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<CryptoNetwork | null>(null);
  const [amount, setAmount] = useState('');
  const [depositAddress, setDepositAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [bonusCode, setBonusCode] = useState('');

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'btc',
      name: 'Bitcoin',
      type: 'crypto',
      icon: '₿',
      minDeposit: 10,
      maxDeposit: 100000,
      processingTime: '10-30 minutes',
      fee: 'Network fee only',
      networks: ['BTC', 'Lightning'],
    },
    {
      id: 'eth',
      name: 'Ethereum',
      type: 'crypto',
      icon: 'Ξ',
      minDeposit: 10,
      maxDeposit: 100000,
      processingTime: '5-15 minutes',
      fee: 'Network fee only',
      networks: ['ERC20', 'Arbitrum', 'Optimism'],
    },
    {
      id: 'usdt',
      name: 'Tether USDT',
      type: 'crypto',
      icon: '₮',
      minDeposit: 10,
      maxDeposit: 100000,
      processingTime: '5-15 minutes',
      fee: 'Network fee only',
      networks: ['ERC20', 'TRC20', 'BEP20', 'Polygon'],
    },
    {
      id: 'usdc',
      name: 'USD Coin',
      type: 'crypto',
      icon: 'Ⓤ',
      minDeposit: 10,
      maxDeposit: 100000,
      processingTime: '5-15 minutes',
      fee: 'Network fee only',
      networks: ['ERC20', 'BEP20', 'Polygon', 'Solana'],
    },
    {
      id: 'bnb',
      name: 'Binance Coin',
      type: 'crypto',
      icon: '🔸',
      minDeposit: 10,
      maxDeposit: 100000,
      processingTime: '3-10 minutes',
      fee: 'Network fee only',
      networks: ['BEP20', 'BEP2'],
    },
    {
      id: 'trx',
      name: 'TRON',
      type: 'crypto',
      icon: '◈',
      minDeposit: 10,
      maxDeposit: 100000,
      processingTime: '3-10 minutes',
      fee: 'Network fee only',
      networks: ['TRC20'],
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      type: 'card',
      icon: '💳',
      minDeposit: 5,
      maxDeposit: 10000,
      processingTime: 'Instant',
      fee: '2.5%',
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      type: 'bank',
      icon: '🏦',
      minDeposit: 50,
      maxDeposit: 50000,
      processingTime: '1-3 business days',
      fee: 'Free',
    },
  ];

  const cryptoNetworks: Record<string, CryptoNetwork[]> = {
    btc: [
      { id: 'btc', name: 'Bitcoin Network', confirmations: 2, minDeposit: 10, fee: '~$2-5' },
      { id: 'lightning', name: 'Lightning Network', confirmations: 1, minDeposit: 1, fee: '< $0.01' },
    ],
    eth: [
      { id: 'erc20', name: 'Ethereum (ERC20)', chainId: '1', confirmations: 12, minDeposit: 10, fee: '~$5-20' },
      { id: 'arbitrum', name: 'Arbitrum One', chainId: '42161', confirmations: 12, minDeposit: 5, fee: '~$0.1-1' },
      { id: 'optimism', name: 'Optimism', chainId: '10', confirmations: 12, minDeposit: 5, fee: '~$0.1-1' },
    ],
    usdt: [
      { id: 'erc20', name: 'Ethereum (ERC20)', chainId: '1', confirmations: 12, minDeposit: 10, fee: '~$5-20' },
      { id: 'trc20', name: 'TRON (TRC20)', chainId: '', confirmations: 19, minDeposit: 10, fee: '~$1' },
      { id: 'bep20', name: 'BSC (BEP20)', chainId: '56', confirmations: 15, minDeposit: 10, fee: '~$0.2-0.5' },
      { id: 'polygon', name: 'Polygon', chainId: '137', confirmations: 128, minDeposit: 5, fee: '~$0.01-0.1' },
    ],
    usdc: [
      { id: 'erc20', name: 'Ethereum (ERC20)', chainId: '1', confirmations: 12, minDeposit: 10, fee: '~$5-20' },
      { id: 'bep20', name: 'BSC (BEP20)', chainId: '56', confirmations: 15, minDeposit: 10, fee: '~$0.2-0.5' },
      { id: 'polygon', name: 'Polygon', chainId: '137', confirmations: 128, minDeposit: 5, fee: '~$0.01-0.1' },
      { id: 'solana', name: 'Solana', chainId: '', confirmations: 32, minDeposit: 5, fee: '~$0.00025' },
    ],
    bnb: [
      { id: 'bep20', name: 'BSC (BEP20)', chainId: '56', confirmations: 15, minDeposit: 10, fee: '~$0.2-0.5' },
      { id: 'bep2', name: 'Binance Chain (BEP2)', chainId: '', confirmations: 1, minDeposit: 10, fee: '~$0.0001' },
    ],
    trx: [
      { id: 'trc20', name: 'TRON (TRC20)', chainId: '', confirmations: 19, minDeposit: 10, fee: '~$1' },
    ],
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    if (method.type === 'crypto' && method.networks && method.networks.length > 0) {
      const networks = cryptoNetworks[method.id];
      if (networks && networks.length > 0) {
        setSelectedNetwork(networks[0]);
        // Mock deposit address generation
        setDepositAddress(`${method.icon}${Math.random().toString(36).substring(2, 15).toUpperCase()}`);
      }
    }
  };

  const handleNetworkSelect = (network: CryptoNetwork) => {
    setSelectedNetwork(network);
    // Mock address generation based on network
    if (selectedMethod) {
      setDepositAddress(`${selectedMethod.icon}${Math.random().toString(36).substring(2, 15).toUpperCase()}`);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeposit = () => {
    // Handle deposit logic
    console.log('Processing deposit:', { selectedMethod, selectedNetwork, amount, bonusCode });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Wallet className="w-10 h-10 text-green-400" />
            Deposit Funds
          </h1>
          <p className="text-gray-400">Add funds to your trading account quickly and securely</p>
        </div>

        {/* Benefits Banner */}
        <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Get 50% Bonus</h3>
                <p className="text-sm text-gray-400">On your first deposit</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Min Deposit $5</h3>
                <p className="text-sm text-gray-400">Start trading today</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Instant Processing</h3>
                <p className="text-sm text-gray-400">Crypto deposits</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Methods */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Select Payment Method</h2>

              {/* Crypto Methods */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase">Cryptocurrency</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {paymentMethods
                    .filter((m) => m.type === 'crypto')
                    .map((method) => (
                      <button
                        key={method.id}
                        onClick={() => handleMethodSelect(method)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedMethod?.id === method.id
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                        }`}
                      >
                        <div className="text-3xl mb-2">{method.icon}</div>
                        <div className="font-semibold text-white text-sm">{method.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{method.processingTime}</div>
                      </button>
                    ))}
                </div>
              </div>

              {/* Other Methods */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase">Other Methods</h3>
                <div className="grid grid-cols-2 gap-3">
                  {paymentMethods
                    .filter((m) => m.type !== 'crypto')
                    .map((method) => (
                      <button
                        key={method.id}
                        onClick={() => handleMethodSelect(method)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedMethod?.id === method.id
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                        }`}
                      >
                        <div className="text-3xl mb-2">{method.icon}</div>
                        <div className="font-semibold text-white text-sm">{method.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{method.processingTime}</div>
                      </button>
                    ))}
                </div>
              </div>

              {/* Network Selection (for crypto) */}
              {selectedMethod?.type === 'crypto' && selectedMethod.networks && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase">Select Network</h3>
                  <div className="space-y-2">
                    {cryptoNetworks[selectedMethod.id]?.map((network) => (
                      <button
                        key={network.id}
                        onClick={() => handleNetworkSelect(network)}
                        className={`w-full p-4 rounded-lg border transition-all text-left ${
                          selectedNetwork?.id === network.id
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-white">{network.name}</div>
                            {network.chainId && (
                              <div className="text-xs text-gray-400">Chain ID: {network.chainId}</div>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{network.fee}</div>
                        </div>
                        <div className="flex gap-4 text-xs text-gray-400">
                          <span>{network.confirmations} confirmations</span>
                          <span>Min: ${network.minDeposit}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Deposit Address */}
                  {depositAddress && (
                    <div className="mt-6">
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                        <div className="flex gap-2">
                          <Info className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                          <div className="text-sm text-yellow-200">
                            <strong>Important:</strong> Send only {selectedMethod.name} to this address on the{' '}
                            {selectedNetwork?.name} network. Sending other assets may result in permanent loss.
                          </div>
                        </div>
                      </div>

                      <label className="block text-sm font-semibold text-gray-400 mb-2">Deposit Address</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={depositAddress}
                          readOnly
                          className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-sm"
                        />
                        <button
                          onClick={copyToClipboard}
                          className="px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                        >
                          {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </button>
                      </div>

                      {/* QR Code Placeholder */}
                      <div className="mt-6 flex justify-center">
                        <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center">
                          <div className="text-center text-gray-400">
                            <div className="text-4xl mb-2">📱</div>
                            <div className="text-sm">QR Code</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Card/Bank Form */}
              {selectedMethod && selectedMethod.type !== 'crypto' && (
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Amount ($)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`Min: $${selectedMethod.minDeposit}`}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Bonus Code (Optional)</label>
                    <input
                      type="text"
                      value={bonusCode}
                      onChange={(e) => setBonusCode(e.target.value)}
                      placeholder="Enter promo code"
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleDeposit}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-semibold text-lg transition-colors"
                  >
                    Continue to Payment
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Deposit Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 sticky top-6">
              <h2 className="text-xl font-bold text-white mb-6">Deposit Summary</h2>

              {selectedMethod ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Payment Method</div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span className="text-2xl">{selectedMethod.icon}</span>
                      {selectedMethod.name}
                    </div>
                  </div>

                  {selectedNetwork && (
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Network</div>
                      <div className="font-semibold text-white">{selectedNetwork.name}</div>
                    </div>
                  )}

                  <div className="border-t border-gray-700 pt-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Min Deposit</span>
                      <span className="text-white font-semibold">${selectedMethod.minDeposit}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Max Deposit</span>
                      <span className="text-white font-semibold">
                        ${selectedMethod.maxDeposit.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Processing Time</span>
                      <span className="text-white font-semibold">{selectedMethod.processingTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fee</span>
                      <span className="text-white font-semibold">{selectedMethod.fee}</span>
                    </div>
                  </div>

                  {selectedMethod.type === 'crypto' && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <div className="flex gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        <div className="text-sm text-blue-200">
                          Your deposit will be credited after{' '}
                          <strong>{selectedNetwork?.confirmations || 0} network confirmations</strong>.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a payment method to continue</p>
                </div>
              )}
            </div>

            {/* Support */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mt-6">
              <h3 className="font-semibold text-white mb-3">Need Help?</h3>
              <p className="text-sm text-gray-400 mb-4">Our support team is available 24/7 to assist you.</p>
              <button className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositPage;
