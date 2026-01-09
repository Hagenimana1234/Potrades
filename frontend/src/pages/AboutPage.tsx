import { Shield, TrendingUp, Users, Award, Globe, CheckCircle, Target, Zap } from 'lucide-react';

const AboutPage = () => {
  const stats = [
    { value: '500K+', label: 'Active Traders', icon: <Users className="w-6 h-6" /> },
    { value: '$2.5B+', label: 'Trading Volume', icon: <TrendingUp className="w-6 h-6" /> },
    { value: '150+', label: 'Countries', icon: <Globe className="w-6 h-6" /> },
    { value: '99.9%', label: 'Uptime', icon: <Zap className="w-6 h-6" /> },
  ];

  const features = [
    {
      icon: <Shield className="w-8 h-8 text-blue-400" />,
      title: 'Secure & Licensed',
      description: 'Fully regulated and licensed trading platform with advanced security measures.',
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-green-400" />,
      title: 'High Payouts',
      description: 'Up to 95% payout on successful trades with competitive rates.',
    },
    {
      icon: <Zap className="w-8 h-8 text-yellow-400" />,
      title: 'Fast Execution',
      description: 'Lightning-fast trade execution with minimal latency.',
    },
    {
      icon: <Users className="w-8 h-8 text-purple-400" />,
      title: 'Social Trading',
      description: 'Copy successful traders and learn from the best in the industry.',
    },
    {
      icon: <Award className="w-8 h-8 text-orange-400" />,
      title: 'Tournaments',
      description: 'Compete in exciting tournaments with massive prize pools.',
    },
    {
      icon: <Globe className="w-8 h-8 text-cyan-400" />,
      title: 'Global Markets',
      description: 'Trade 100+ assets across Forex, Crypto, Stocks, and Commodities.',
    },
  ];

  const team = [
    {
      name: 'John Anderson',
      role: 'Chief Executive Officer',
      image: '👨‍💼',
      description: '15+ years in fintech and trading platforms',
    },
    {
      name: 'Sarah Chen',
      role: 'Chief Technology Officer',
      image: '👩‍💻',
      description: 'Expert in blockchain and high-frequency trading systems',
    },
    {
      name: 'Michael Rodriguez',
      role: 'Head of Trading',
      image: '👨‍💼',
      description: 'Former hedge fund manager with 20 years experience',
    },
    {
      name: 'Emma Thompson',
      role: 'Chief Compliance Officer',
      image: '👩‍💼',
      description: 'Specialized in financial regulations and risk management',
    },
  ];

  const values = [
    { icon: '🎯', title: 'Innovation', description: 'Constantly evolving with cutting-edge technology' },
    { icon: '🛡️', title: 'Security', description: 'Your funds and data are our top priority' },
    { icon: '🤝', title: 'Transparency', description: 'Clear terms, no hidden fees or conditions' },
    { icon: '📚', title: 'Education', description: 'Empowering traders with knowledge and tools' },
    { icon: '⚡', title: 'Speed', description: 'Instant execution and fast withdrawals' },
    { icon: '🌍', title: 'Accessibility', description: 'Available 24/7 from anywhere in the world' },
  ];

  const milestones = [
    { year: '2018', title: 'Company Founded', description: 'PoTrades was established in Singapore' },
    { year: '2019', title: 'Regulatory License', description: 'Obtained international trading license' },
    { year: '2020', title: '100K Users', description: 'Reached 100,000 active traders milestone' },
    { year: '2021', title: 'Social Trading', description: 'Launched copy trading and social features' },
    { year: '2023', title: 'Crypto Integration', description: 'Added cryptocurrency deposits and trading' },
    { year: '2026', title: 'Global Expansion', description: 'Operating in 150+ countries worldwide' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 py-20 px-6">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">About PoTrades</h1>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            A leading binary options trading platform trusted by over 500,000 traders worldwide. We're committed to
            providing a secure, transparent, and innovative trading experience.
          </p>
          <div className="flex gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
              Start Trading
            </button>
            <button className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors">
              Contact Us
            </button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-6xl mx-auto px-6 -mt-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
              <div className="flex justify-center mb-3 text-blue-400">{stat.icon}</div>
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mission Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Our Mission</h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            To democratize financial trading by providing accessible, transparent, and innovative tools that empower
            traders of all levels to achieve their financial goals.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-blue-500 transition-all"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Values Section */}
      <div className="bg-gray-800/50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-white text-center mb-12">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map((value, index) => (
              <div key={index} className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
                <div className="text-5xl mb-4">{value.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{value.title}</h3>
                <p className="text-gray-400">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-white text-center mb-12">Our Journey</h2>
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-blue-600"></div>

          {/* Timeline Items */}
          <div className="space-y-12">
            {milestones.map((milestone, index) => (
              <div
                key={index}
                className={`flex items-center gap-8 ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
              >
                <div className={`flex-1 ${index % 2 === 0 ? 'text-right' : 'text-left'}`}>
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 inline-block">
                    <div className="text-blue-400 font-bold text-xl mb-2">{milestone.year}</div>
                    <h3 className="text-xl font-bold text-white mb-2">{milestone.title}</h3>
                    <p className="text-gray-400">{milestone.description}</p>
                  </div>
                </div>
                <div className="w-8 h-8 bg-blue-600 rounded-full border-4 border-gray-900 z-10"></div>
                <div className="flex-1"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="bg-gray-800/50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-white text-center mb-12">Leadership Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {team.map((member, index) => (
              <div key={index} className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
                <div className="text-6xl mb-4">{member.image}</div>
                <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                <div className="text-blue-400 text-sm font-semibold mb-3">{member.role}</div>
                <p className="text-gray-400 text-sm">{member.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security & Compliance Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">Security & Compliance</h2>
              <p className="text-gray-300 mb-6">
                Your security is our priority. We employ industry-leading security measures and comply with
                international financial regulations to protect your funds and personal information.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-white">SSL/TLS Encryption</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-white">Two-Factor Authentication</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-white">Segregated Client Funds</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-white">International Licenses</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-white">KYC/AML Compliance</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="w-64 h-64 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Shield className="w-32 h-32 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-12 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Start Trading?</h2>
          <p className="text-xl text-blue-100 mb-8">Join over 500,000 traders and start your journey today</p>
          <div className="flex gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-colors">
              Create Free Account
            </button>
            <button className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/10 transition-colors">
              Try Demo Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
