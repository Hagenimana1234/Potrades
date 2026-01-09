import { useState } from 'react';
import { BookOpen, Clock, User, Tag, TrendingUp, Calendar, Search } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: Date;
  readTime: string;
  image: string;
  tags: string[];
}

const BlogPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const blogPosts: BlogPost[] = [
    {
      id: '1',
      title: 'Top 10 Binary Options Trading Strategies for 2026',
      excerpt:
        'Discover the most effective trading strategies used by professional traders. Learn how to maximize profits and minimize risks in binary options trading.',
      category: 'Strategies',
      author: 'Sarah Johnson',
      date: new Date('2026-01-05'),
      readTime: '8 min read',
      image: '📈',
      tags: ['Trading', 'Strategies', 'Beginner'],
    },
    {
      id: '2',
      title: 'Understanding Technical Indicators: RSI, MACD, and Moving Averages',
      excerpt:
        'A comprehensive guide to the most popular technical indicators. Learn how to read charts and make informed trading decisions.',
      category: 'Education',
      author: 'Michael Chen',
      date: new Date('2026-01-03'),
      readTime: '12 min read',
      image: '📊',
      tags: ['Technical Analysis', 'Education', 'Advanced'],
    },
    {
      id: '3',
      title: 'Cryptocurrency Trading in 2026: What You Need to Know',
      excerpt:
        'The crypto market is evolving rapidly. Stay updated with the latest trends, regulations, and trading opportunities in the cryptocurrency space.',
      category: 'Market News',
      author: 'David Rodriguez',
      date: new Date('2026-01-01'),
      readTime: '10 min read',
      image: '₿',
      tags: ['Crypto', 'Market News', 'Trends'],
    },
    {
      id: '4',
      title: 'Risk Management: Protecting Your Trading Capital',
      excerpt:
        'Learn essential risk management techniques that every trader should know. Discover how to set stop losses, manage position sizes, and protect your investments.',
      category: 'Risk Management',
      author: 'Emma Thompson',
      date: new Date('2025-12-28'),
      readTime: '15 min read',
      image: '🛡️',
      tags: ['Risk Management', 'Strategy', 'Education'],
    },
    {
      id: '5',
      title: 'Psychology of Trading: Mastering Your Emotions',
      excerpt:
        'Trading psychology is often overlooked but crucial for success. Learn how to control fear, greed, and other emotions that affect your trading decisions.',
      category: 'Psychology',
      author: 'Dr. James Wilson',
      date: new Date('2025-12-25'),
      readTime: '9 min read',
      image: '🧠',
      tags: ['Psychology', 'Mindset', 'Advanced'],
    },
    {
      id: '6',
      title: 'How to Use Copy Trading to Learn from the Pros',
      excerpt:
        'Copy trading allows you to replicate the trades of successful traders. Discover how to choose the right traders to copy and maximize your returns.',
      category: 'Features',
      author: 'Lisa Anderson',
      date: new Date('2025-12-22'),
      readTime: '7 min read',
      image: '👥',
      tags: ['Copy Trading', 'Social Trading', 'Beginner'],
    },
    {
      id: '7',
      title: 'Forex Trading Basics: Understanding Currency Pairs',
      excerpt:
        'New to forex trading? Learn the fundamentals of currency pairs, pips, spreads, and how the forex market works.',
      category: 'Education',
      author: 'Robert Martinez',
      date: new Date('2025-12-20'),
      readTime: '11 min read',
      image: '💱',
      tags: ['Forex', 'Education', 'Beginner'],
    },
    {
      id: '8',
      title: 'Market Analysis: Gold Price Predictions for Q1 2026',
      excerpt:
        'In-depth analysis of gold market trends, geopolitical factors, and price predictions for the first quarter of 2026.',
      category: 'Market News',
      author: 'Sarah Johnson',
      date: new Date('2025-12-18'),
      readTime: '14 min read',
      image: '🥇',
      tags: ['Gold', 'Commodities', 'Analysis'],
    },
    {
      id: '9',
      title: 'Binary Options vs Traditional Options: Key Differences',
      excerpt:
        'Understanding the differences between binary options and traditional options trading. Which one is right for you?',
      category: 'Education',
      author: 'Michael Chen',
      date: new Date('2025-12-15'),
      readTime: '10 min read',
      image: '📖',
      tags: ['Education', 'Comparison', 'Beginner'],
    },
  ];

  const categories = [
    { id: 'all', name: 'All Posts', count: blogPosts.length },
    { id: 'Strategies', name: 'Trading Strategies', count: blogPosts.filter((p) => p.category === 'Strategies').length },
    { id: 'Education', name: 'Education', count: blogPosts.filter((p) => p.category === 'Education').length },
    { id: 'Market News', name: 'Market News', count: blogPosts.filter((p) => p.category === 'Market News').length },
    { id: 'Risk Management', name: 'Risk Management', count: blogPosts.filter((p) => p.category === 'Risk Management').length },
    { id: 'Psychology', name: 'Psychology', count: blogPosts.filter((p) => p.category === 'Psychology').length },
    { id: 'Features', name: 'Platform Features', count: blogPosts.filter((p) => p.category === 'Features').length },
  ];

  const filteredPosts = blogPosts.filter((post) => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const featuredPost = blogPosts[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-3 flex items-center gap-3">
            <BookOpen className="w-12 h-12 text-blue-400" />
            Trading Blog
          </h1>
          <p className="text-xl text-gray-400">
            Expert insights, trading strategies, and market analysis
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Featured Post */}
        <div className="mb-12">
          <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl overflow-hidden">
            <div className="p-8 md:p-12">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-semibold">
                  Featured
                </span>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-semibold">
                  {featuredPost.category}
                </span>
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">{featuredPost.title}</h2>
              <p className="text-xl text-blue-100 mb-6">{featuredPost.excerpt}</p>
              <div className="flex flex-wrap items-center gap-6 text-blue-100 mb-6">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{featuredPost.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{featuredPost.date.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{featuredPost.readTime}</span>
                </div>
              </div>
              <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                Read Article
              </button>
            </div>
            <div className="absolute top-0 right-0 text-9xl opacity-10 p-8">
              {featuredPost.image}
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-6 py-3 rounded-lg whitespace-nowrap transition-all ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              {category.name}
              <span className="ml-2 text-xs opacity-75">({category.count})</span>
            </button>
          ))}
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-blue-500 transition-all cursor-pointer group"
            >
              {/* Image Placeholder */}
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 h-48 flex items-center justify-center text-6xl">
                {post.image}
              </div>

              <div className="p-6">
                {/* Category Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-blue-600/20 border border-blue-500 rounded-full text-blue-400 text-xs font-semibold">
                    {post.category}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                  {post.title}
                </h3>

                {/* Excerpt */}
                <p className="text-gray-400 mb-4 line-clamp-3">{post.excerpt}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-900 text-gray-400 text-xs rounded flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Meta Info */}
                <div className="flex items-center justify-between text-sm text-gray-400 pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{post.author}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{post.readTime}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">No articles found</h3>
            <p className="text-gray-400">Try adjusting your search or category filter</p>
          </div>
        )}

        {/* Newsletter Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 md:p-12">
          <div className="max-w-3xl mx-auto text-center">
            <TrendingUp className="w-12 h-12 text-white mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-4">Subscribe to Our Newsletter</h2>
            <p className="text-xl text-blue-100 mb-8">
              Get the latest trading insights, strategies, and market analysis delivered to your inbox weekly
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-6 py-4 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors whitespace-nowrap">
                Subscribe
              </button>
            </div>
            <p className="text-sm text-blue-100 mt-4">
              Join 50,000+ traders receiving our weekly newsletter
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
