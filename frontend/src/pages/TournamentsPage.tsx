import { useState, useEffect } from 'react';
import { Trophy, Clock, Users, DollarSign, Target, TrendingUp, Award, Calendar } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  description: string;
  prizePool: number;
  entryFee: number;
  participantsCount: number;
  maxParticipants: number;
  startDate: Date;
  endDate: Date;
  status: 'upcoming' | 'active' | 'completed';
  type: 'free' | 'paid' | 'vip';
  minTradeAmount: number;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  profit: number;
  trades: number;
  winRate: number;
  prize: number;
}

const TournamentsPage = () => {
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'free' | 'paid' | 'vip'>('all');

  // Mock data - replace with API calls
  useEffect(() => {
    const mockTournaments: Tournament[] = [
      {
        id: '1',
        name: 'Weekend Warriors',
        description: 'Compete for $10,000 in prizes this weekend!',
        prizePool: 10000,
        entryFee: 0,
        participantsCount: 1243,
        maxParticipants: 2000,
        startDate: new Date('2026-01-10T00:00:00'),
        endDate: new Date('2026-01-12T23:59:59'),
        status: 'active',
        type: 'free',
        minTradeAmount: 5,
      },
      {
        id: '2',
        name: 'Pro Traders Championship',
        description: 'High-stakes competition for experienced traders',
        prizePool: 50000,
        entryFee: 100,
        participantsCount: 234,
        maxParticipants: 500,
        startDate: new Date('2026-01-09T00:00:00'),
        endDate: new Date('2026-01-16T23:59:59'),
        status: 'active',
        type: 'paid',
        minTradeAmount: 25,
      },
      {
        id: '3',
        name: 'VIP Elite Challenge',
        description: 'Exclusive tournament for VIP members',
        prizePool: 100000,
        entryFee: 500,
        participantsCount: 87,
        maxParticipants: 100,
        startDate: new Date('2026-01-11T00:00:00'),
        endDate: new Date('2026-01-18T23:59:59'),
        status: 'upcoming',
        type: 'vip',
        minTradeAmount: 100,
      },
      {
        id: '4',
        name: 'Daily Sprint',
        description: '24-hour trading competition',
        prizePool: 2500,
        entryFee: 0,
        participantsCount: 567,
        maxParticipants: 1000,
        startDate: new Date('2026-01-09T00:00:00'),
        endDate: new Date('2026-01-10T00:00:00'),
        status: 'active',
        type: 'free',
        minTradeAmount: 5,
      },
    ];

    const mockLeaderboard: LeaderboardEntry[] = [
      { rank: 1, username: 'TraderPro2024', profit: 5234.56, trades: 145, winRate: 78.2, prize: 5000 },
      { rank: 2, username: 'CryptoKing88', profit: 4892.34, trades: 132, winRate: 75.8, prize: 3000 },
      { rank: 3, username: 'ForexMaster', profit: 4567.89, trades: 128, winRate: 74.1, prize: 2000 },
      { rank: 4, username: 'MarketWizard', profit: 4234.12, trades: 119, winRate: 72.5, prize: 1000 },
      { rank: 5, username: 'TradingNinja', profit: 3987.65, trades: 115, winRate: 71.3, prize: 500 },
      { rank: 6, username: 'BullRunner', profit: 3654.32, trades: 108, winRate: 69.8, prize: 250 },
      { rank: 7, username: 'ChartExpert', profit: 3423.45, trades: 103, winRate: 68.4, prize: 150 },
      { rank: 8, username: 'OptionsPro', profit: 3198.76, trades: 98, winRate: 67.1, prize: 100 },
      { rank: 9, username: 'DayTrader99', profit: 2987.54, trades: 94, winRate: 65.8, prize: 75 },
      { rank: 10, username: 'SwingKing', profit: 2765.43, trades: 89, winRate: 64.2, prize: 50 },
    ];

    setActiveTournaments(mockTournaments);
    setLeaderboard(mockLeaderboard);
    setSelectedTournament(mockTournaments[0]);
  }, []);

  const filteredTournaments = activeTournaments.filter(
    (t) => filter === 'all' || t.type === filter
  );

  const getTimeRemaining = (endDate: Date) => {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getTournamentBadgeColor = (type: string) => {
    switch (type) {
      case 'free':
        return 'bg-green-500/20 text-green-400 border-green-500';
      case 'paid':
        return 'bg-blue-500/20 text-blue-400 border-blue-500';
      case 'vip':
        return 'bg-purple-500/20 text-purple-400 border-purple-500';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Trophy className="w-10 h-10 text-yellow-400" />
            Tournaments & Competitions
          </h1>
          <p className="text-gray-400">Compete with traders worldwide and win amazing prizes</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {[
            { id: 'all', name: 'All Tournaments', icon: '🌐' },
            { id: 'free', name: 'Free Entry', icon: '🎁' },
            { id: 'paid', name: 'Paid Entry', icon: '💰' },
            { id: 'vip', name: 'VIP Only', icon: '👑' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-all ${
                filter === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="font-semibold">{tab.name}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tournaments List */}
          <div className="lg:col-span-2 space-y-4">
            {filteredTournaments.map((tournament) => (
              <div
                key={tournament.id}
                onClick={() => setSelectedTournament(tournament)}
                className={`bg-gray-800 border rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg ${
                  selectedTournament?.id === tournament.id
                    ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{tournament.name}</h3>
                      <span
                        className={`text-xs px-2 py-1 rounded border font-semibold uppercase ${getTournamentBadgeColor(
                          tournament.type
                        )}`}
                      >
                        {tournament.type}
                      </span>
                      {tournament.status === 'active' && (
                        <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500 font-semibold uppercase animate-pulse">
                          Live
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">{tournament.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-900 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-yellow-400 mb-1">
                      <Trophy className="w-4 h-4" />
                      <span className="text-xs font-semibold">Prize Pool</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      ${tournament.prizePool.toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-xs font-semibold">Entry Fee</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {tournament.entryFee === 0 ? 'Free' : `$${tournament.entryFee}`}
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-purple-400 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-xs font-semibold">Participants</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {tournament.participantsCount}/{tournament.maxParticipants}
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-orange-400 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-semibold">Time Left</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {tournament.status === 'upcoming' ? 'Not Started' : getTimeRemaining(tournament.endDate)}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  {tournament.status === 'upcoming' ? (
                    <button className="flex-1 bg-gray-700 text-gray-400 px-6 py-3 rounded-lg font-semibold cursor-not-allowed">
                      Starting Soon
                    </button>
                  ) : (
                    <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                      Join Tournament
                    </button>
                  )}
                  <button className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                    View Details
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Spots Filled</span>
                    <span>
                      {Math.round((tournament.participantsCount / tournament.maxParticipants) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all"
                      style={{
                        width: `${(tournament.participantsCount / tournament.maxParticipants) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Leaderboard */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 sticky top-6">
              <div className="flex items-center gap-2 mb-6">
                <Award className="w-6 h-6 text-yellow-400" />
                <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
              </div>

              {selectedTournament && (
                <div className="mb-4 p-3 bg-gray-900 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Current Tournament:</p>
                  <p className="font-semibold text-white">{selectedTournament.name}</p>
                </div>
              )}

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`p-3 rounded-lg flex items-center gap-3 ${
                      entry.rank <= 3
                        ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30'
                        : 'bg-gray-900'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        entry.rank === 1
                          ? 'bg-yellow-400 text-gray-900'
                          : entry.rank === 2
                          ? 'bg-gray-300 text-gray-900'
                          : entry.rank === 3
                          ? 'bg-orange-400 text-gray-900'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {entry.rank}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white text-sm">{entry.username}</div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-green-400" />
                          {entry.winRate}%
                        </span>
                        <span>{entry.trades} trades</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-400">${entry.profit.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">${entry.prize} prize</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-700">
                <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all">
                  View Full Leaderboard
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Stats Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h3 className="font-semibold text-white">Total Prizes</h3>
            </div>
            <p className="text-3xl font-bold text-white">
              $
              {activeTournaments
                .reduce((sum, t) => sum + t.prizePool, 0)
                .toLocaleString()}
            </p>
            <p className="text-sm text-gray-400 mt-1">Across all tournaments</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-blue-400" />
              <h3 className="font-semibold text-white">Active Traders</h3>
            </div>
            <p className="text-3xl font-bold text-white">
              {activeTournaments.reduce((sum, t) => sum + t.participantsCount, 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-400 mt-1">Currently competing</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6 text-purple-400" />
              <h3 className="font-semibold text-white">Live Tournaments</h3>
            </div>
            <p className="text-3xl font-bold text-white">
              {activeTournaments.filter((t) => t.status === 'active').length}
            </p>
            <p className="text-sm text-gray-400 mt-1">Happening now</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6 text-green-400" />
              <h3 className="font-semibold text-white">Coming Soon</h3>
            </div>
            <p className="text-3xl font-bold text-white">
              {activeTournaments.filter((t) => t.status === 'upcoming').length}
            </p>
            <p className="text-sm text-gray-400 mt-1">Upcoming events</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentsPage;
