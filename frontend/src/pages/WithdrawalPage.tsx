import { useState } from 'react';
import { ArrowDownToLine, Wallet, AlertCircle, Clock, CheckCircle, XCircle, Info } from 'lucide-react';

interface WithdrawalMethod {
  id: string;
  name: string;
  type: 'crypto' | 'card' | 'bank' | 'ewallet';
  icon: string;
  minWithdrawal: number;
  maxWithdrawal: number;
  processingTime: string;
  fee: string;
  networks?: string[];
}

interface CryptoNetwork {
  id: string;
  name: string;
  chainId?: string;
  minWithdrawal: number;
  fee: string;
}

interface WithdrawalHistory {
  id: string;
  method: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  date: Date;
  network?: string;
}

const WithdrawalPage = () => {
  const [selectedMethod, setSelectedMethod] = useState<WithdrawalMethod | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<CryptoNetwork | null>(null);
  const [amount, setAmount] = useState('');
  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Mock user balance
  const userBalance = 5234.56;
  const availableBalance = 5000.0; // After pending withdrawals

  const withdrawalMethods: WithdrawalMethod[] = [
    {
      id: 'btc',
      name: 'Bitcoin',
      type: 'crypto',
      icon: '₿',
      minWithdrawal: 20,
      maxWithdrawal: 100000,
      processingTime: '1-3 hours',
      fee: 'Network fee',
      networks: ['BTC', 'Lightning'],
    },
    {
      id: 'eth',
      name: 'Ethereum',
      type: 'crypto',
      icon: 'Ξ',
      minWithdrawal: 20,
      maxWithdrawal: 100000,
      processingTime: '1-3 hours',
      fee: 'Network fee',
      networks: ['ERC20', 'Arbitrum', 'Optimism'],
    },
    {
      id: 'usdt',
      name: 'Tether USDT',
      type: 'crypto',
      icon: '₮',
      minWithdrawal: 20,
      maxWithdrawal: 100000,
      processingTime: '1-3 hours',
      fee: 'Network fee',
      networks: ['ERC20', 'TRC20', 'BEP20', 'Polygon'],
    },
    {
      id: 'usdc',
      name: 'USD Coin',
      type: 'crypto',
      icon: 'Ⓤ',
      minWithdrawal: 20,
      maxWithdrawal: 100000,
      processingTime: '1-3 hours',
      fee: 'Network fee',
      networks: ['ERC20', 'BEP20', 'Polygon', 'Solana'],
    },
    {
      id: 'bnb',
      name: 'Binance Coin',
      type: 'crypto',
      icon: '🔸',
      minWithdrawal: 20,
      maxWithdrawal: 100000,
      processingTime: '1-3 hours',
      fee: 'Network fee',
      networks: ['BEP20', 'BEP2'],
    },
    {
      id: 'trx',
      name: 'TRON',
      type: 'crypto',
      icon: '◈',
      minWithdrawal: 20,
      maxWithdrawal: 100000,
      processingTime: '1-3 hours',
      fee: 'Network fee',
      networks: ['TRC20'],
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      type: 'bank',
      icon: '🏦',
      minWithdrawal: 100,
      maxWithdrawal: 50000,
      processingTime: '2-5 business days',
      fee: '$5 or 1%',
    },
    {
      id: 'card',
      name: 'Debit Card',
      type: 'card',
      icon: '💳',
      minWithdrawal: 20,
      maxWithdrawal: 5000,
      processingTime: '1-3 business days',
      fee: '2.5%',
    },
  ];

  const cryptoNetworks: Record<string, CryptoNetwork[]> = {
    btc: [
      { id: 'btc', name: 'Bitcoin Network', minWithdrawal: 20, fee: '~$2-5' },
      { id: 'lightning', name: 'Lightning Network', minWithdrawal: 5, fee: '< $0.01' },
    ],
    eth: [
      { id: 'erc20', name: 'Ethereum (ERC20)', chainId: '1', minWithdrawal: 20, fee: '~$5-20' },
      { id: 'arbitrum', name: 'Arbitrum One', chainId: '42161', minWithdrawal: 10, fee: '~$0.1-1' },
      { id: 'optimism', name: 'Optimism', chainId: '10', minWithdrawal: 10, fee: '~$0.1-1' },
    ],
    usdt: [
      { id: 'erc20', name: 'Ethereum (ERC20)', chainId: '1', minWithdrawal: 20, fee: '~$5-20' },
      { id: 'trc20', name: 'TRON (TRC20)', chainId: '', minWithdrawal: 20, fee: '~$1' },
      { id: 'bep20', name: 'BSC (BEP20)', chainId: '56', minWithdrawal: 20, fee: '~$0.2-0.5' },
      { id: 'polygon', name: 'Polygon', chainId: '137', minWithdrawal: 10, fee: '~$0.01-0.1' },
    ],
    usdc: [
      { id: 'erc20', name: 'Ethereum (ERC20)', chainId: '1', minWithdrawal: 20, fee: '~$5-20' },
      { id: 'bep20', name: 'BSC (BEP20)', chainId: '56', minWithdrawal: 20, fee: '~$0.2-0.5' },
      { id: 'polygon', name: 'Polygon', chainId: '137', minWithdrawal: 10, fee: '~$0.01-0.1' },
      { id: 'solana', name: 'Solana', chainId: '', minWithdrawal: 10, fee: '~$0.00025' },
    ],
    bnb: [
      { id: 'bep20', name: 'BSC (BEP20)', chainId: '56', minWithdrawal: 20, fee: '~$0.2-0.5' },
      { id: 'bep2', name: 'Binance Chain (BEP2)', chainId: '', minWithdrawal: 20, fee: '~$0.0001' },
    ],
    trx: [{ id: 'trc20', name: 'TRON (TRC20)', chainId: '', minWithdrawal: 20, fee: '~$1' }],
  };

  const withdrawalHistory: WithdrawalHistory[] = [
    {
      id: '1',
      method: 'Bitcoin',
      amount: 500,
      status: 'completed',
      date: new Date('2026-01-08T14:30:00'),
      network: 'BTC',
    },
    {
      id: '2',
      method: 'USDT',
      amount: 1000,
      status: 'processing',
      date: new Date('2026-01-09T10:15:00'),
      network: 'TRC20',
    },
    {
      id: '3',
      method: 'Ethereum',
      amount: 250,
      status: 'pending',
      date: new Date('2026-01-09T16:45:00'),
      network: 'ERC20',
    },
  ];

  const handleMethodSelect = (method: WithdrawalMethod) => {
    setSelectedMethod(method);
    if (method.type === 'crypto' && method.networks && method.networks.length > 0) {
      const networks = cryptoNetworks[method.id];
      if (networks && networks.length > 0) {
        setSelectedNetwork(networks[0]);
      }
    }
  };

  const handleNetworkSelect = (network: CryptoNetwork) => {
    setSelectedNetwork(network);
  };

  const handleWithdraw = () => {
    // Handle withdrawal logic
    console.log('Processing withdrawal:', {
      selectedMethod,
      selectedNetwork,
      amount,
      withdrawalAddress,
      twoFactorCode,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-400" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-500/20 border-green-500';
      case 'processing':
        return 'text-blue-400 bg-blue-500/20 border-blue-500';
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500';
      case 'rejected':
        return 'text-red-400 bg-red-500/20 border-red-500';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <ArrowDownToLine className="w-10 h-10 text-blue-400" />
            Withdraw Funds
          </h1>
          <p className="text-gray-400">Fast and secure withdrawals to your preferred method</p>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-blue-100 text-sm mb-1">Total Balance</p>
              <p className="text-3xl font-bold text-white">${userBalance.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm mb-1">Available for Withdrawal</p>
              <p className="text-3xl font-bold text-white">${availableBalance.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm mb-1">Pending Withdrawals</p>
              <p className="text-3xl font-bold text-white">${(userBalance - availableBalance).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowHistory(false)}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              !showHistory
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            New Withdrawal
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              showHistory
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Withdrawal History
          </button>
        </div>

        {!showHistory ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Withdrawal Form */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Select Withdrawal Method</h2>

                {/* Important Notice */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                  <div className="flex gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                    <div className="text-sm text-yellow-200">
                      <strong>KYC Required:</strong> All withdrawals require identity verification. Complete your KYC
                      to enable withdrawals.
                    </div>
                  </div>
                </div>

                {/* Crypto Methods */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase">Cryptocurrency</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {withdrawalMethods
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
                    {withdrawalMethods
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

                {/* Network Selection & Form */}
                {selectedMethod && (
                  <div className="mt-6 space-y-6">
                    {/* Network Selection (for crypto) */}
                    {selectedMethod.type === 'crypto' && selectedMethod.networks && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-3 uppercase">
                          Select Network
                        </label>
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
                              <div className="text-xs text-gray-400">Min: ${network.minWithdrawal}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Withdrawal Amount */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-2">Amount ($)</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder={`Min: $${selectedMethod.minWithdrawal}`}
                          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        />
                        <button
                          onClick={() => setAmount(availableBalance.toString())}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                        >
                          Max
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Available: ${availableBalance.toLocaleString()}
                      </p>
                    </div>

                    {/* Withdrawal Address (for crypto) */}
                    {selectedMethod.type === 'crypto' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">
                          {selectedMethod.name} Address
                        </label>
                        <input
                          type="text"
                          value={withdrawalAddress}
                          onChange={(e) => setWithdrawalAddress(e.target.value)}
                          placeholder={`Enter your ${selectedMethod.name} address`}
                          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                        />
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-2">
                          <div className="flex gap-2">
                            <Info className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-red-200">
                              Double-check your address. Withdrawals to incorrect addresses cannot be recovered.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2FA Code */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-2">
                        Two-Factor Authentication Code
                      </label>
                      <input
                        type="text"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value)}
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <button
                      onClick={handleWithdraw}
                      disabled={
                        !amount ||
                        parseFloat(amount) < selectedMethod.minWithdrawal ||
                        (selectedMethod.type === 'crypto' && !withdrawalAddress) ||
                        !twoFactorCode
                      }
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-4 rounded-lg font-semibold text-lg transition-colors"
                    >
                      Request Withdrawal
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Withdrawal Summary */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 sticky top-6">
                <h2 className="text-xl font-bold text-white mb-6">Withdrawal Summary</h2>

                {selectedMethod ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Method</div>
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
                        <span className="text-gray-400">Min Withdrawal</span>
                        <span className="text-white font-semibold">${selectedMethod.minWithdrawal}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400">Max Withdrawal</span>
                        <span className="text-white font-semibold">
                          ${selectedMethod.maxWithdrawal.toLocaleString()}
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

                    {amount && parseFloat(amount) > 0 && (
                      <div className="border-t border-gray-700 pt-4">
                        <div className="flex justify-between text-lg mb-2">
                          <span className="text-white font-semibold">Amount</span>
                          <span className="text-white font-bold">${parseFloat(amount).toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-gray-400">You will receive approximately ${parseFloat(amount).toFixed(2)}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Select a withdrawal method</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Withdrawal History */
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Recent Withdrawals</h2>
            <div className="space-y-4">
              {withdrawalHistory.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(withdrawal.status)}
                    <div>
                      <div className="font-semibold text-white">
                        {withdrawal.method}
                        {withdrawal.network && (
                          <span className="text-gray-400 text-sm ml-2">({withdrawal.network})</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">
                        {withdrawal.date.toLocaleDateString()} {withdrawal.date.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">${withdrawal.amount.toLocaleString()}</div>
                    <span
                      className={`text-xs px-2 py-1 rounded border font-semibold uppercase ${getStatusColor(
                        withdrawal.status
                      )}`}
                    >
                      {withdrawal.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawalPage;
