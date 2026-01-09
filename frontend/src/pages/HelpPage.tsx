import { useState } from 'react';
import { HelpCircle, Search, ChevronDown, ChevronRight, BookOpen, CreditCard, TrendingUp, Shield, Users, Settings, MessageCircle, Video } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  faqs: FAQItem[];
}

const HelpPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('getting-started');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const categories: FAQCategory[] = [
    {
      id: 'getting-started',
      name: 'Getting Started',
      icon: <BookOpen className="w-5 h-5" />,
      faqs: [
        {
          question: 'How do I create an account?',
          answer: 'Click on "Sign Up" button at the top right corner. Fill in your email, create a strong password, and verify your email address. Once verified, you can start trading immediately with a demo account or make a deposit to trade with real money.',
        },
        {
          question: 'What is the minimum deposit amount?',
          answer: 'The minimum deposit amount is $5 for most payment methods. Some payment methods may have different minimum amounts. We support credit/debit cards, bank transfers, and various cryptocurrencies.',
        },
        {
          question: 'Do you offer a demo account?',
          answer: 'Yes! All new users get a free demo account with $10,000 virtual funds. You can practice trading without any risk and familiarize yourself with our platform before investing real money.',
        },
        {
          question: 'What assets can I trade?',
          answer: 'We offer 100+ trading assets including Forex pairs (EUR/USD, GBP/USD, etc.), Cryptocurrencies (Bitcoin, Ethereum, etc.), Stocks (Apple, Google, Tesla, etc.), Commodities (Gold, Oil, Silver), and Indices.',
        },
        {
          question: 'What are the trading hours?',
          answer: 'Crypto assets are available 24/7. Forex markets are open 24/5 (Monday to Friday). Stock markets follow their respective exchange hours. OTC (Over-The-Counter) assets are available during weekends and market closures.',
        },
      ],
    },
    {
      id: 'deposits-withdrawals',
      name: 'Deposits & Withdrawals',
      icon: <CreditCard className="w-5 h-5" />,
      faqs: [
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept Credit/Debit cards (Visa, Mastercard), Bank transfers, and Cryptocurrencies (Bitcoin, Ethereum, USDT, USDC, BNB, TRX). Each method has different processing times and fees.',
        },
        {
          question: 'How long do deposits take?',
          answer: 'Cryptocurrency deposits are typically credited within 10-30 minutes after network confirmations. Card deposits are instant. Bank transfers may take 1-3 business days depending on your bank.',
        },
        {
          question: 'How do I withdraw my funds?',
          answer: 'Go to the Withdrawal page, select your preferred method, enter the amount and destination address/account. All withdrawals require 2FA verification for security. Processing time varies by method: Crypto (1-3 hours), Cards (1-3 days), Bank (2-5 days).',
        },
        {
          question: 'Are there any withdrawal fees?',
          answer: 'Cryptocurrency withdrawals have network fees only. Bank transfers have a $5 or 1% fee (whichever is higher). Card withdrawals have a 2.5% processing fee. There are no fees for the first withdrawal each month.',
        },
        {
          question: 'What is the minimum withdrawal amount?',
          answer: 'Minimum withdrawal is $20 for most methods. Some payment methods or networks may have different minimums. Check the withdrawal page for specific limits for each method.',
        },
      ],
    },
    {
      id: 'trading',
      name: 'Trading',
      icon: <TrendingUp className="w-5 h-5" />,
      faqs: [
        {
          question: 'How does binary options trading work?',
          answer: 'Binary options trading is simple: predict whether the price of an asset will go UP or DOWN within a specific time frame. If your prediction is correct, you earn a fixed payout (up to 95%). If incorrect, you lose your investment amount.',
        },
        {
          question: 'What is the payout percentage?',
          answer: 'Payouts range from 75% to 95% depending on the asset, market conditions, and expiry time. The exact payout percentage is shown before you place each trade. Higher risk assets typically offer higher payouts.',
        },
        {
          question: 'What are expiry times?',
          answer: 'Expiry time is when your trade closes. We offer various expiry times: 1 second, 5 seconds, 1 minute, 5 minutes, 15 minutes, 30 minutes, 1 hour, 4 hours, and end-of-day. Choose based on your trading strategy.',
        },
        {
          question: 'Can I close a trade early?',
          answer: 'Early close is available for certain trade types and expiry times. This feature allows you to close your trade before expiry to secure profits or minimize losses. A small fee may apply for early closure.',
        },
        {
          question: 'What is the maximum trade amount?',
          answer: 'Minimum trade is $5. Maximum trade amount varies by asset and account type: Standard accounts: $1,000 per trade, VIP accounts: $5,000 per trade. Contact support for higher limits.',
        },
      ],
    },
    {
      id: 'account-security',
      name: 'Account & Security',
      icon: <Shield className="w-5 h-5" />,
      faqs: [
        {
          question: 'How do I enable Two-Factor Authentication?',
          answer: 'Go to Settings > Security > Two-Factor Authentication. Download Google Authenticator or Authy app on your phone, scan the QR code, and enter the 6-digit code to activate. We strongly recommend enabling 2FA for maximum security.',
        },
        {
          question: 'What is KYC verification?',
          answer: 'KYC (Know Your Customer) is identity verification required by financial regulations. You need to provide: ID document (passport/driver license), proof of address (utility bill/bank statement), and a selfie. Verification typically takes 24-48 hours.',
        },
        {
          question: 'Is my personal information secure?',
          answer: 'Yes. We use bank-level SSL/TLS encryption for all data transmission. Your personal information is stored in encrypted databases and never shared with third parties. We comply with GDPR and international data protection regulations.',
        },
        {
          question: 'How do I reset my password?',
          answer: 'Click "Forgot Password" on the login page. Enter your registered email address. You\'ll receive a password reset link via email. Click the link and create a new strong password.',
        },
        {
          question: 'What if my account is locked?',
          answer: 'Accounts may be locked after multiple failed login attempts for security. Wait 30 minutes and try again, or contact support immediately. If you suspect unauthorized access, change your password and enable 2FA.',
        },
      ],
    },
    {
      id: 'social-features',
      name: 'Social & Copy Trading',
      icon: <Users className="w-5 h-5" />,
      faqs: [
        {
          question: 'What is copy trading?',
          answer: 'Copy trading allows you to automatically copy trades from successful traders. Browse our top traders, check their performance statistics, and start copying with a single click. You can set copying limits and stop anytime.',
        },
        {
          question: 'How much does copy trading cost?',
          answer: 'There\'s no additional fee for copy trading. You only pay the standard trade amount. Some professional traders may charge a performance fee (typically 5-20%) on your profits. This is clearly shown before you start copying.',
        },
        {
          question: 'Can I become a signal provider?',
          answer: 'Yes! Once you have a proven track record (minimum 100 trades with 60%+ win rate), you can apply to become a signal provider. Earn commissions from traders who copy you. Apply through the Social Trading section.',
        },
        {
          question: 'What are tournaments?',
          answer: 'Tournaments are trading competitions where you compete with other traders for prize pools. Entry can be free or paid. Trade during the tournament period and climb the leaderboard to win prizes ranging from $50 to $100,000.',
        },
      ],
    },
    {
      id: 'technical',
      name: 'Technical Issues',
      icon: <Settings className="w-5 h-5" />,
      faqs: [
        {
          question: 'The platform is not loading. What should I do?',
          answer: 'Try these steps: 1) Clear browser cache and cookies, 2) Try a different browser (Chrome, Firefox, Safari), 3) Check your internet connection, 4) Disable browser extensions, 5) Try incognito/private mode. If issues persist, contact support.',
        },
        {
          question: 'Why is my trade not opening?',
          answer: 'Trades may not open due to: Insufficient balance, Market closed, Asset temporarily unavailable, Connection issues, or Pending verification. Check your balance, market hours, and internet connection. Refresh the page and try again.',
        },
        {
          question: 'My withdrawal is pending. Why?',
          answer: 'Withdrawals are processed within stated timeframes but may be delayed due to: KYC verification pending, Security checks, Weekend/holiday, Network congestion (crypto), or Banking hours. Check your email for any verification requests.',
        },
        {
          question: 'Can I use the platform on mobile?',
          answer: 'Yes! Our platform is fully responsive and works on all devices. Use your mobile browser to access the full platform. We also have dedicated iOS and Android apps available for download from App Store and Google Play.',
        },
      ],
    },
  ];

  const filteredFAQs = categories
    .map((category) => ({
      ...category,
      faqs: category.faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.faqs.length > 0 || searchQuery === '');

  const selectedCategoryData = filteredFAQs.find((cat) => cat.id === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <HelpCircle className="w-12 h-12 text-blue-400" />
            Help Center
          </h1>
          <p className="text-xl text-gray-400">Find answers to your questions and learn how to use PoTrades</p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help..."
              className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 text-lg"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <button className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-blue-500 transition-all text-left">
            <MessageCircle className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Live Chat</h3>
            <p className="text-sm text-gray-400">Chat with our support team</p>
          </button>
          <button className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-green-500 transition-all text-left">
            <Video className="w-8 h-8 text-green-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Video Tutorials</h3>
            <p className="text-sm text-gray-400">Watch step-by-step guides</p>
          </button>
          <button className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-purple-500 transition-all text-left">
            <BookOpen className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Trading Guide</h3>
            <p className="text-sm text-gray-400">Learn trading strategies</p>
          </button>
          <button className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-orange-500 transition-all text-left">
            <Users className="w-8 h-8 text-orange-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">Community</h3>
            <p className="text-sm text-gray-400">Join our trading community</p>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sticky top-6">
              <h2 className="text-lg font-bold text-white mb-4">Categories</h2>
              <div className="space-y-2">
                {filteredFAQs.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {category.icon}
                    <span className="font-medium flex-1 text-left">{category.name}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        selectedCategory === category.id ? 'bg-blue-700' : 'bg-gray-700'
                      }`}
                    >
                      {category.faqs.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* FAQ Content */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              {selectedCategoryData ? (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="text-blue-400">{selectedCategoryData.icon}</div>
                    <h2 className="text-2xl font-bold text-white">{selectedCategoryData.name}</h2>
                  </div>

                  <div className="space-y-4">
                    {selectedCategoryData.faqs.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No questions found matching your search.</p>
                      </div>
                    ) : (
                      selectedCategoryData.faqs.map((faq, index) => (
                        <div
                          key={index}
                          className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden"
                        >
                          <button
                            onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-800 transition-colors"
                          >
                            <span className="font-semibold text-white text-left">{faq.question}</span>
                            {expandedFAQ === index ? (
                              <ChevronDown className="w-5 h-5 text-blue-400 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            )}
                          </button>
                          {expandedFAQ === index && (
                            <div className="px-4 pb-4 text-gray-300 border-t border-gray-700 pt-4">
                              {faq.answer}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a category to view FAQs</p>
                </div>
              )}
            </div>

            {/* Contact Support */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-8 mt-6">
              <h3 className="text-2xl font-bold text-white mb-3">Still need help?</h3>
              <p className="text-gray-300 mb-6">
                Can't find what you're looking for? Our support team is available 24/7 to assist you.
              </p>
              <div className="flex flex-wrap gap-4">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                  Contact Support
                </button>
                <button className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                  Email Us
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
