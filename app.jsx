import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, DollarSign, Shield, FileText, Search, Terminal, BarChart3, Map, Users, Upload, Download, Settings, Bell, LogOut, Menu, X, Globe, Calendar, Activity } from 'lucide-react';

// Mock data - in production this comes from your backend
const mockPortfolioData = {
  summary: {
    totalPremium: 45600000,
    totalPremiumBHD: 17100000,
    policyCount: 1247,
    lossRatio: 0.68,
    combinedRatio: 0.94,
    avgPremium: 36568,
    takafulPercentage: 0.35,
    monthlyGrowth: 0.123
  },
  byCountry: [
    { country: 'BH', name: 'Bahrain', premium: 12500000, premiumBHD: 4687500, policies: 342, lossRatio: 0.65, flag: '🇧🇭' },
    { country: 'SA', name: 'Saudi Arabia', premium: 18900000, premiumBHD: 7087500, policies: 487, lossRatio: 0.71, flag: '🇸🇦' },
    { country: 'AE', name: 'UAE', premium: 8600000, premiumBHD: 3225000, policies: 234, lossRatio: 0.64, flag: '🇦🇪' },
    { country: 'KW', name: 'Kuwait', premium: 3200000, premiumBHD: 1200000, policies: 134, lossRatio: 0.59, flag: '🇰🇼' },
    { country: 'QA', name: 'Qatar', premium: 2400000, premiumBHD: 900000, policies: 50, lossRatio: 0.72, flag: '🇶🇦' }
  ],
  lossHistory: [
    { month: 'Jan', losses: 2100000, premium: 3800000, lossRatio: 0.55 },
    { month: 'Feb', losses: 1950000, premium: 3750000, lossRatio: 0.52 },
    { month: 'Mar', losses: 2300000, premium: 3900000, lossRatio: 0.59 },
    { month: 'Apr', losses: 2650000, premium: 3850000, lossRatio: 0.69 },
    { month: 'May', losses: 2200000, premium: 3800000, lossRatio: 0.58 },
    { month: 'Jun', losses: 2800000, premium: 3900000, lossRatio: 0.72 }
  ],
  lineOfBusiness: [
    { name: 'Property', value: 18500000, count: 456, lossRatio: 0.62, takaful: 6500000 },
    { name: 'Motor', value: 15200000, count: 489, lossRatio: 0.74, takaful: 5300000 },
    { name: 'Health', value: 7900000, count: 178, lossRatio: 0.81, takaful: 2800000 },
    { name: 'Casualty', value: 4000000, count: 124, lossRatio: 0.55, takaful: 1400000 }
  ],
  recentActivity: [
    { id: 1, type: 'policy', action: 'New Policy Bound', company: 'Acme Manufacturing', premium: 125000, time: '2 hours ago', country: 'BH' },
    { id: 2, type: 'claim', action: 'Claim Reported', company: 'TechStart Inc', amount: 45000, time: '4 hours ago', country: 'SA' },
    { id: 3, type: 'renewal', action: 'Renewal Processed', company: 'Retail Plaza LLC', premium: 245000, time: '1 day ago', country: 'AE' },
    { id: 4, type: 'quote', action: 'Quote Issued', company: 'Construction Co', premium: 89000, time: '1 day ago', country: 'KW' }
  ],
  alerts: [
    { id: 1, severity: 'high', message: 'Loss ratio exceeded 75% in Saudi Motor segment', time: '1 hour ago' },
    { id: 2, severity: 'medium', message: 'Upcoming renewal for major account (BD 250K premium)', time: '3 hours ago' },
    { id: 3, severity: 'low', message: 'SAMA quarterly report due in 7 days', time: '1 day ago' }
  ]
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const InsuranceApp = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [aiQuery, setAiQuery] = useState('');
  const [aiMessages, setAiMessages] = useState([
    { type: 'system', content: 'Welcome to InsurePulse AI Assistant. Ask me anything about your portfolio.', timestamp: new Date() }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [aiMessages]);

  const processAIQuery = async (query) => {
    setAiLoading(true);
    const userMessage = { type: 'user', content: query, timestamp: new Date() };
    setAiMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `You are an AI assistant for GCC insurance analytics. Analyze this query using the portfolio data:

Portfolio Summary:
- Total Premium: $${mockPortfolioData.summary.totalPremium.toLocaleString()} (BD ${mockPortfolioData.summary.totalPremiumBHD.toLocaleString()})
- Policy Count: ${mockPortfolioData.summary.policyCount}
- Loss Ratio: ${(mockPortfolioData.summary.lossRatio * 100).toFixed(1)}%
- Combined Ratio: ${(mockPortfolioData.summary.combinedRatio * 100).toFixed(1)}%
- Takaful Mix: ${(mockPortfolioData.summary.takafulPercentage * 100).toFixed(1)}%

By Country:
${mockPortfolioData.byCountry.map(c => `- ${c.name}: $${c.premium.toLocaleString()} (${c.policies} policies, ${(c.lossRatio * 100).toFixed(1)}% loss ratio)`).join('\n')}

Lines of Business:
${mockPortfolioData.lineOfBusiness.map(l => `- ${l.name}: $${l.value.toLocaleString()} (${(l.lossRatio * 100).toFixed(1)}% loss ratio, ${((l.takaful/l.value)*100).toFixed(1)}% Takaful)`).join('\n')}

User Query: ${query}

Provide a concise, actionable response with specific numbers and recommendations. If relevant, mention Takaful vs conventional performance, GCC country differences, or regulatory considerations.`
            }
          ]
        })
      });

      const data = await response.json();
      const aiResponse = data.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');

      setAiMessages(prev => [...prev, {
        type: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      }]);
    } catch (error) {
      setAiMessages(prev => [...prev, {
        type: 'error',
        content: `Analysis unavailable. Error: ${error.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAISubmit = (e) => {
    e.preventDefault();
    if (aiQuery.trim() && !aiLoading) {
      processAIQuery(aiQuery);
      setAiQuery('');
    }
  };

  const quickQueries = [
    "What's my Saudi Arabia loss ratio trend?",
    "Compare Takaful vs conventional performance",
    "Which country has the highest exposure?",
    "Analyze motor insurance profitability",
    "Show me upcoming renewals"
  ];

  const formatCurrency = (value, currency = 'USD') => {
    if (currency === 'BHD') {
      return `BD ${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000000).toFixed(1)}M`;
  };

  const filteredData = selectedCountry === 'all' 
    ? mockPortfolioData 
    : {
        ...mockPortfolioData,
        byCountry: mockPortfolioData.byCountry.filter(c => c.country === selectedCountry)
      };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Navigation */}
      <nav className="fixed top-0 w-full h-16 bg-slate-900 border-b border-slate-800 z-40 flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">InsurePulse</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Bell className="w-5 h-5 cursor-pointer" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </div>
          <button className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-slate-800">
            <Globe className="w-4 h-4" />
            <span className="text-sm">EN / العربية</span>
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
              AK
            </div>
            <span className="text-sm hidden md:block">Ahmed Al-Khalifa</span>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-slate-900 border-r border-slate-800 z-30 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-6 space-y-2">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${activeView === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Dashboard</span>
          </button>
          
          <button
            onClick={() => setActiveView('analytics')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${activeView === 'analytics' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <Activity className="w-5 h-5" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => setActiveView('ai-assistant')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${activeView === 'ai-assistant' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <Terminal className="w-5 h-5" />
            <span>AI Assistant</span>
          </button>

          <button
            onClick={() => setActiveView('data')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${activeView === 'data' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <Upload className="w-5 h-5" />
            <span>Upload Data</span>
          </button>

          <button
            onClick={() => setActiveView('reports')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${activeView === 'reports' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <FileText className="w-5 h-5" />
            <span>Reports</span>
          </button>

          <button
            onClick={() => setActiveView('settings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${activeView === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-800">
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-red-400">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`pt-16 transition-all ${sidebarOpen ? 'lg:pl-64' : ''}`}>
        <div className="p-6">
          {/* Dashboard View */}
          {activeView === 'dashboard' && (
            <>
              {/* Country Filter */}
              <div className="mb-6 flex items-center justify-between">
                <h1 className="text-3xl font-bold">Portfolio Dashboard</h1>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-400">Filter by country:</span>
                  <select 
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All GCC Countries</option>
                    {mockPortfolioData.byCountry.map(c => (
                      <option key={c.country} value={c.country}>{c.flag} {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Alerts */}
              {mockPortfolioData.alerts.length > 0 && (
                <div className="mb-6 space-y-2">
                  {mockPortfolioData.alerts.slice(0, 2).map(alert => (
                    <div key={alert.id} className={`flex items-start space-x-3 p-4 rounded-lg border ${
                      alert.severity === 'high' ? 'bg-red-900/20 border-red-800' :
                      alert.severity === 'medium' ? 'bg-yellow-900/20 border-yellow-800' :
                      'bg-blue-900/20 border-blue-800'
                    }`}>
                      <AlertCircle className={`w-5 h-5 mt-0.5 ${
                        alert.severity === 'high' ? 'text-red-400' :
                        alert.severity === 'medium' ? 'text-yellow-400' :
                        'text-blue-400'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm">{alert.message}</p>
                        <p className="text-xs text-slate-500 mt-1">{alert.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-400 text-sm mb-1">Total Premium</p>
                      <p className="text-3xl font-bold text-green-400">{formatCurrency(mockPortfolioData.summary.totalPremium)}</p>
                      <p className="text-sm text-slate-500 mt-1">{formatCurrency(mockPortfolioData.summary.totalPremiumBHD, 'BHD')}</p>
                    </div>
                    <DollarSign className="w-10 h-10 text-green-400" />
                  </div>
                  <div className="flex items-center text-sm text-green-400">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    <span>+{(mockPortfolioData.summary.monthlyGrowth * 100).toFixed(1)}% vs last month</span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-400 text-sm mb-1">Active Policies</p>
                      <p className="text-3xl font-bold text-blue-400">{mockPortfolioData.summary.policyCount.toLocaleString()}</p>
                      <p className="text-sm text-slate-500 mt-1">{(mockPortfolioData.summary.takafulPercentage * 100).toFixed(0)}% Takaful</p>
                    </div>
                    <FileText className="w-10 h-10 text-blue-400" />
                  </div>
                  <div className="flex items-center text-sm text-blue-400">
                    <span>Avg: {formatCurrency(mockPortfolioData.summary.avgPremium, 'USD').replace('M', 'K')}</span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-400 text-sm mb-1">Loss Ratio</p>
                      <p className="text-3xl font-bold text-yellow-400">{(mockPortfolioData.summary.lossRatio * 100).toFixed(1)}%</p>
                      <p className="text-sm text-slate-500 mt-1">Industry avg: 72%</p>
                    </div>
                    {mockPortfolioData.summary.lossRatio < 0.7 ? 
                      <TrendingDown className="w-10 h-10 text-green-400" /> :
                      <TrendingUp className="w-10 h-10 text-yellow-400" />
                    }
                  </div>
                  <div className="flex items-center text-sm text-green-400">
                    <TrendingDown className="w-4 h-4 mr-1" />
                    <span>Better than target</span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-400 text-sm mb-1">Combined Ratio</p>
                      <p className="text-3xl font-bold text-green-400">{(mockPortfolioData.summary.combinedRatio * 100).toFixed(1)}%</p>
                      <p className="text-sm text-slate-500 mt-1">Target: &lt;100%</p>
                    </div>
                    <BarChart3 className="w-10 h-10 text-green-400" />
                  </div>
                  <div className="flex items-center text-sm text-green-400">
                    <span>Profitable portfolio</span>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Loss History */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-blue-400" />
                    Loss Trend - 6 Months
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={mockPortfolioData.lossHistory}>
                      <defs>
                        <linearGradient id="colorPremium" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorLosses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        formatter={(value) => `$${(value / 1000000).toFixed(2)}M`}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="premium" stroke="#10b981" fillOpacity={1} fill="url(#colorPremium)" name="Premium" />
                      <Area type="monotone" dataKey="losses" stroke="#ef4444" fillOpacity={1} fill="url(#colorLosses)" name="Losses" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Line of Business */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-green-400" />
                    Premium by Line of Business
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={mockPortfolioData.lineOfBusiness}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}\n${(percent * 100).toFixed(0)}%`}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {mockPortfolioData.lineOfBusiness.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => `$${(value / 1000000).toFixed(2)}M`}
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Country Breakdown */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Map className="w-5 h-5 mr-2 text-purple-400" />
                  GCC Country Breakdown
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockPortfolioData.byCountry}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      formatter={(value, name) => {
                        if (name === 'premium') return [`$${(value / 1000000).toFixed(2)}M`, 'Premium'];
                        if (name === 'policies') return [value, 'Policies'];
                        return value;
                      }}
                    />
                    <Legend />
                    <Bar dataKey="premium" fill="#3b82f6" name="Premium ($M)" />
                    <Bar dataKey="policies" fill="#10b981" name="Policies" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Recent Activity */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-yellow-400" />
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {mockPortfolioData.recentActivity.map(activity => (
                    <div key={activity.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          activity.type === 'policy' ? 'bg-blue-600/20 text-blue-400' :
                          activity.type === 'claim' ? 'bg-red-600/20 text-red-400' :
                          activity.type === 'renewal' ? 'bg-green-600/20 text-green-400' :
                          'bg-yellow-600/20 text-yellow-400'
                        }`}>
                          {activity.type === 'policy' && <FileText className="w-5 h-5" />}
                          {activity.type === 'claim' && <AlertCircle className="w-5 h-5" />}
                          {activity.type === 'renewal' && <Activity className="w-5 h-5" />}
                          {activity.type === 'quote' && <DollarSign className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-medium">{activity.action}</p>
                          <p className="text-sm text-slate-400">{activity.company}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-400">
                          {activity.premium ? `${formatCurrency(activity.premium, 'USD')}` : activity.amount ? `${formatCurrency(activity.amount, 'USD')}` : ''}
                        </p>
                        <p className="text-xs text-slate-500">{activity.time} • {activity.country}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* AI Assistant View */}
          {activeView === 'ai-assistant' && (
            <div className="max-w-6xl mx-auto">
              <h1 className="text-3xl font-bold mb-6">AI Assistant</h1>
              
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden" style={{ height: 'calc(100vh - 16rem)' }}>
                {/* Messages */}
                <div className="h-[calc(100%-8rem)] overflow-y-auto p-6 space-y-4">
                  {aiMessages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-3xl ${
                        msg.type === 'system' ? 'w-full bg-slate-800 border border-slate-700 rounded-lg p-4 text-sm text-green-400' :
                        msg.type === 'user' ? 'bg-blue-600 rounded-lg p-4' :
                        msg.type === 'error' ? 'bg-red-900 rounded-lg p-4' :
                        'bg-slate-800 border border-slate-700 rounded-lg p-4'
                      }`}>
                        {msg.type === 'user' && <div className="text-xs text-blue-300 mb-2">You</div>}
                        {msg.type === 'assistant' && <div className="text-xs text-green-400 mb-2">AI Assistant</div>}
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        <div className="text-xs text-slate-500 mt-2">{msg.timestamp.toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex gap-3">
                      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                        <div className="text-xs text-green-400 mb-2">AI Assistant</div>
                        <div className="flex gap-2 items-center">
                          <div className="animate-pulse">Analyzing your portfolio...</div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Queries */}
                <div className="border-t border-slate-800 px-6 py-3 bg-slate-900">
                  <div className="text-xs text-slate-400 mb-2">Quick Queries:</div>
                  <div className="flex flex-wrap gap-2">
                    {quickQueries.map((query, idx) => (
                      <button
                        key={idx}
                        onClick={() => !aiLoading && processAIQuery(query)}
                        disabled={aiLoading}
                        className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 disabled:opacity-50 transition"
                      >
                        {query}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input */}
                <div className="border-t border-slate-800 p-6">
                  <form onSubmit={handleAISubmit} className="flex gap-3">
                    <input
                      type="text"
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      placeholder="Ask about portfolio risk, pricing, loss trends, exposure analysis..."
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                      disabled={aiLoading}
                    />
                    <button
                      type="submit"
                      disabled={aiLoading || !aiQuery.trim()}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Upload Data View */}
          {activeView === 'data' && (
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold mb-6">Upload Portfolio Data</h1>
              
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                <Upload className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Upload Your Data Files</h3>
                <p className="text-slate-400 mb-6">Support for Excel, CSV, and PDF files. We'll process and analyze your data automatically.</p>
                
                <label className="inline-block cursor-pointer">
                  <input type="file" multiple className="hidden" accept=".xlsx,.xls,.csv,.pdf" />
                  <span className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-medium inline-block transition">
                    Choose Files
                  </span>
                </label>
                
                <div className="mt-8 pt-8 border-t border-slate-800">
                  <h4 className="font-semibold mb-4">Or connect via:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button className="p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition">
                      <i className="fab fa-whatsapp text-3xl text-green-400 mb-2"></i>
                      <p className="text-sm">WhatsApp Upload</p>
                    </button>
                    <button className="p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition">
                      <i className="fas fa-envelope text-3xl text-blue-400 mb-2"></i>
                      <p className="text-sm">Email Integration</p>
                    </button>
                    <button className="p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition">
                      <i className="fas fa-link text-3xl text-purple-400 mb-2"></i>
                      <p className="text-sm">API Connection</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other views would go here */}
          {(activeView === 'analytics' || activeView === 'reports' || activeView === 'settings') && (
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-slate-400 mb-4">
                {activeView === 'analytics' && 'Advanced Analytics'}
                {activeView === 'reports' && 'Reports & Exports'}
                {activeView === 'settings' && 'Settings'}
              </h2>
              <p className="text-slate-500">This section is under development</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default InsuranceApp;