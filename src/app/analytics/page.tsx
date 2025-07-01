'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { motion, AnimatePresence } from 'framer-motion'
import { getTokenBalances, getTokenPrices, TokenBalance } from '@/lib/alchemy'
import { getAddressTokenBalances, getAddressNativeBalance } from '@/lib/blockscout'
import { SUPPORTED_CHAINS, getChainById } from '@/config/chains'
import { ethers } from 'ethers'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  CalendarIcon,
  ClockIcon,
  EyeIcon,
  ChevronDownIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'

interface TokenWithPrice extends TokenBalance {
  usdValue: number
  formattedBalance: string
  change24h?: number
  volume24h?: number
}

export default function AnalyticsPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [tokens, setTokens] = useState<TokenWithPrice[]>([])
  const [, setIsLoading] = useState(false)
  const [isFetchingPrices, setIsFetchingPrices] = useState(false)
  const [totalValue, setTotalValue] = useState(0)
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | '90d' | '1y'>('30d')
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const networkButtonRef = useRef<HTMLButtonElement>(null)

  const fetchTokenData = async (address: string, currentChainId: number) => {
    setIsLoading(true)
    setIsFetchingPrices(false)
    
    try {
      // Step 1: Fetch token balances (use Blockscout for ZetaChain)
      console.log('Fetching token balances...')
      let tokenBalances: TokenBalance[] = []
      
      if (currentChainId === 7000) {
        // Use Blockscout for ZetaChain
        const [nativeBalance, tokenBalancesBlockscout] = await Promise.all([
          getAddressNativeBalance(address),
          getAddressTokenBalances(address)
        ])
        
        // Convert Blockscout format to TokenBalance format
        if (nativeBalance && parseFloat(nativeBalance.value) > 0) {
          tokenBalances.push({
            contractAddress: '0x0000000000000000000000000000000000000000',
            tokenBalance: nativeBalance.value,
            symbol: 'ZETA',
            name: 'ZetaChain',
            decimals: 18
          })
        }
        
        tokenBalances.push(...tokenBalancesBlockscout.map(tb => ({
          contractAddress: tb.token.address,
          tokenBalance: tb.value,
          symbol: tb.token.symbol,
          name: tb.token.name,
          decimals: tb.token.decimals,
          logo: tb.token.icon_url
        })))
      } else {
        // Use Alchemy for other chains
        tokenBalances = await getTokenBalances(address, currentChainId)
      }
      
      if (tokenBalances.length === 0) {
        setTokens([])
        setTotalValue(0)
        setIsLoading(false)
        return
      }

      // Step 2: Create initial tokens without prices
      const tokensWithoutPrices: TokenWithPrice[] = tokenBalances.map(token => {
        const balance = parseFloat(ethers.formatUnits(token.tokenBalance, token.decimals))
        return {
          ...token,
          formattedBalance: balance.toFixed(6),
          usdValue: 0, // Initially 0, will be updated after price fetch
          change24h: 0,
          volume24h: 0
        }
      })

      // Set tokens immediately so user sees their balances
      setTokens(tokensWithoutPrices)
      setIsLoading(false)
      
      // Step 3: Fetch prices in background
      setIsFetchingPrices(true)
      console.log('Fetching token prices...')
      
      const uniqueSymbols = [...new Set(tokenBalances.map(token => token.symbol))]
      const commonTokens = ['ETH', 'BTC', 'USDC', 'USDT']
      const allSymbols = [...new Set([...uniqueSymbols, ...commonTokens])]
      
      const prices = await getTokenPrices(allSymbols)

      const tokensWithPrices: TokenWithPrice[] = tokenBalances.map(token => {
        const balance = parseFloat(ethers.formatUnits(token.tokenBalance, token.decimals))
        const price = prices[token.symbol] || 0
        const usdValue = balance * price

        return {
          ...token,
          formattedBalance: balance.toFixed(6),
          usdValue: usdValue,
          change24h: (Math.random() - 0.5) * 20, // Mock data
          volume24h: Math.random() * 1000000
        }
      })

      setTokens(tokensWithPrices)
      setTotalValue(tokensWithPrices.reduce((sum, token) => sum + token.usdValue, 0))
      
    } catch (error) {
      console.error('Error fetching token data:', error)
    } finally {
      setIsLoading(false)
      setIsFetchingPrices(false)
    }
  }

  useEffect(() => {
    if (address && chainId) {
      fetchTokenData(address, chainId)
    }
  }, [address, chainId])

  const getCurrentChain = () => {
    return getChainById(chainId)
  }

  const handleNetworkDropdownToggle = () => {
    if (!showNetworkDropdown && networkButtonRef.current) {
      const rect = networkButtonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right - 320 + window.scrollX, // 320px is dropdown width
      })
    }
    setShowNetworkDropdown(!showNetworkDropdown)
  }

  const formatPrice = (value: number) => {
    if (value === 0) return '$0.00'
    
    if (value < 0.01) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 4,
        maximumFractionDigits: 6,
      }).format(value)
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }


  // Generate mock historical data for performance chart
  const generatePerformanceData = () => {
    const data = []
    const days = timeframe === '24h' ? 24 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365
    const interval = timeframe === '24h' ? 'hour' : 'day'
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      if (interval === 'hour') {
        date.setHours(date.getHours() - i)
      } else {
        date.setDate(date.getDate() - i)
      }
      
      const baseValue = totalValue
      const volatility = 0.15
      const trend = Math.sin(i * 0.1) * 0.05
      const random = (Math.random() - 0.5) * volatility
      const multiplier = 1 + trend + random
      
      const value = Math.max(baseValue * multiplier, 0)
      
      data.push({
        date: interval === 'hour' 
          ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: Math.round(value * 100) / 100,
        timestamp: date.getTime()
      })
    }
    
    // Ensure current value matches
    if (data.length > 0) {
      data[data.length - 1].value = totalValue
    }
    
    return data
  }

  const performanceData = generatePerformanceData()
  const totalChange = performanceData.length > 1 ? 
    ((performanceData[performanceData.length - 1].value - performanceData[0].value) / performanceData[0].value) * 100 : 0

  // Calculate time-based portfolio change
  const calculateTimeBasedChange = () => {
    if (performanceData.length < 2) return 0
    const timeframes = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }
    const daysBack = timeframes[timeframe]
    const dataPoints = Math.min(daysBack, performanceData.length - 1)
    const oldValue = performanceData[performanceData.length - 1 - dataPoints]?.value || totalValue
    const currentValue = performanceData[performanceData.length - 1]?.value || totalValue
    return oldValue > 0 ? ((currentValue - oldValue) / oldValue) * 100 : 0
  }

  // Calculate portfolio metrics
  const portfolioMetrics = {
    totalAssets: tokens.length,
    totalValue: totalValue,
    timeBasedChange: calculateTimeBasedChange(),
    topHolding: tokens.length > 0 ? tokens.reduce((prev, current) => 
      prev.usdValue > current.usdValue ? prev : current
    ) : null,
    totalVolume24h: tokens.reduce((sum, token) => sum + (token.volume24h || 0), 0),
    diversificationScore: Math.min(tokens.length * 20, 100)
  }

  const COLORS = [
    '#008462', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ]

  const allocationData = tokens
    .filter(token => token.usdValue > 0)
    .map(token => ({
      name: token.symbol,
      value: token.usdValue,
      percentage: ((token.usdValue / totalValue) * 100).toFixed(1)
    }))
    .sort((a, b) => b.value - a.value)

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-zeta-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ChartBarIcon className="w-10 h-10 text-zeta-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-4">Connect Your Wallet</h1>
            <p className="text-neutral-600 mb-8">Connect your wallet to view detailed portfolio analytics</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-zeta-600 to-zeta-800 bg-clip-text text-transparent mb-2">
              Portfolio Analytics
            </h1>
            <p className="text-neutral-600">Advanced insights and performance metrics for your Web3 portfolio</p>
            
            {/* Global Price Loading Notification */}
            <AnimatePresence>
              {isFetchingPrices && (
                <motion.div 
                  className="mt-4 flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-xl"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-blue-700">
                      <span className="font-medium">Fetching latest prices...</span>
                      <span className="text-sm text-blue-600 ml-2">This may take a few seconds</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Network Selector - Dropdown */}
          <motion.div 
            className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-semibold text-neutral-900">Current Network</h3>
                {isFetchingPrices && (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-full">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-blue-700 font-medium">Fetching prices...</span>
                  </div>
                )}
              </div>
              
              {/* Network Dropdown */}
              <div className="relative">
                <button
                  ref={networkButtonRef}
                  onClick={handleNetworkDropdownToggle}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-zeta-500 to-zeta-600 text-white rounded-lg font-medium hover:from-zeta-600 hover:to-zeta-700 transition-all duration-200 shadow-lg"
                >
                  Switch Network
                  <ChevronDownIcon className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
            
            {getCurrentChain() && (
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-zeta-500 to-zeta-600 rounded-xl text-white">
                <div className="flex items-center space-x-6">
                  <div className="text-left">
                    <div className="text-sm text-zeta-100">Total Value</div>
                    <div className="font-bold text-2xl">
                      {isFetchingPrices && totalValue === 0 ? (
                        <span className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Loading...</span>
                        </span>
                      ) : (
                        formatPrice(totalValue)
                      )}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-zeta-100">Assets</div>
                    <div className="font-bold text-2xl">{tokens.length}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white text-sm font-bold`}>
                    {getCurrentChain()?.icon || '⚡'}
                  </div>
                  <div>
                    <div className="font-semibold">{getCurrentChain()?.name}</div>
                    <div className="text-xs text-zeta-100">Chain ID: {getCurrentChain()?.id}</div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Key Metrics Cards */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {[
              {
                title: 'Total Value',
                value: isFetchingPrices && portfolioMetrics.totalValue === 0 ? 'Loading...' : formatPrice(portfolioMetrics.totalValue),
                change: totalChange,
                icon: <CurrencyDollarIcon className="w-8 h-8" />,
                color: 'from-zeta-500 to-zeta-600'
              },
              {
                title: 'Total Assets',
                value: portfolioMetrics.totalAssets.toString(),
                change: 0,
                icon: <BanknotesIcon className="w-8 h-8" />,
                color: 'from-blue-500 to-blue-600'
              },
              {
                title: `${timeframe.toUpperCase()} Change`,
                value: `${portfolioMetrics.timeBasedChange >= 0 ? '+' : ''}${portfolioMetrics.timeBasedChange.toFixed(2)}%`,
                change: portfolioMetrics.timeBasedChange,
                icon: portfolioMetrics.timeBasedChange >= 0 ? <ArrowTrendingUpIcon className="w-8 h-8" /> : <ArrowTrendingDownIcon className="w-8 h-8" />,
                color: portfolioMetrics.timeBasedChange >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'
              },
              {
                title: 'Top Holding',
                value: portfolioMetrics.topHolding?.symbol || 'N/A',
                change: 0,
                icon: <EyeIcon className="w-8 h-8" />,
                color: 'from-green-500 to-green-600'
              }
            ].map((metric, index) => (
              <motion.div
                key={metric.title}
                className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 + index * 0.1 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${metric.color} rounded-xl flex items-center justify-center text-white`}>
                    {metric.icon}
                  </div>
                  {metric.change !== 0 && (
                    <div className={`flex items-center text-sm ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metric.change >= 0 ? <ArrowTrendingUpIcon className="w-4 h-4 mr-1" /> : <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />}
                      {Math.abs(metric.change).toFixed(2)}%
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-neutral-900 mb-1">{metric.value}</div>
                <div className="text-sm text-neutral-500">{metric.title}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Performance Chart */}
          <motion.div 
            className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-neutral-900">Portfolio Performance</h2>
              <div className="flex items-center space-x-2">
                {(['24h', '7d', '30d', '90d', '1y'] as const).map(period => (
                  <button
                    key={period}
                    onClick={() => setTimeframe(period)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      timeframe === period
                        ? 'bg-zeta-500 text-white'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#008462" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#008462" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                      if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
                      return `$${value.toFixed(0)}`
                    }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatPrice(value), 'Portfolio Value']}
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#008462" 
                    strokeWidth={3}
                    fill="url(#colorGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Asset Allocation */}
            <motion.div 
              className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h3 className="text-xl font-semibold text-neutral-900 mb-6">Asset Allocation</h3>
              
              {allocationData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ percentage }) => `${percentage}%`}
                        labelLine={false}
                      >
                        {allocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatPrice(value), 'Value']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-neutral-500">
                  No allocation data available
                </div>
              )}
            </motion.div>

            {/* Top Holdings */}
            <motion.div 
              className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <h3 className="text-xl font-semibold text-neutral-900 mb-6">Top Holdings</h3>
              
              <div className="space-y-4">
                {tokens
                  .sort((a, b) => b.usdValue - a.usdValue)
                  .slice(0, 5)
                  .map((token) => (
                    <div key={token.contractAddress} className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-zeta-500 to-zeta-600 rounded-xl flex items-center justify-center text-white font-bold">
                          {token.symbol[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-neutral-900">{token.name}</div>
                          <div className="text-sm text-neutral-500">{token.symbol}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-neutral-900">{formatPrice(token.usdValue)}</div>
                        <div className="text-sm text-neutral-500">
                          {((token.usdValue / totalValue) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          </div>

          {/* Additional Insights */}
          <motion.div 
            className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <h3 className="text-xl font-semibold text-neutral-900 mb-6">Portfolio Insights</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-zeta-50 rounded-xl">
                <div className="flex items-center space-x-2 mb-2">
                  <CalendarIcon className="w-5 h-5 text-zeta-600" />
                  <span className="font-medium text-zeta-900">Portfolio Age</span>
                </div>
                <div className="text-2xl font-bold text-zeta-900">
                  {Math.floor(Math.random() * 365) + 30} days
                </div>
                <p className="text-sm text-zeta-700 mt-1">
                  Since first transaction
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center space-x-2 mb-2">
                  <ClockIcon className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Last Activity</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {Math.floor(Math.random() * 7) + 1}h ago
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Most recent transaction
                </p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="flex items-center space-x-2 mb-2">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">Best Performer</span>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {portfolioMetrics.topHolding?.symbol || 'N/A'}
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Highest value holding
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />

      {/* Network Dropdown Portal */}
      {showNetworkDropdown && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999]"
          onClick={() => setShowNetworkDropdown(false)}
        >
          <div 
            className="absolute w-80 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl ring-1 ring-black/5 max-h-80 overflow-y-auto"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3">
              {['Ethereum', 'Layer 2', 'ZetaChain'].map((category) => {
                const networksInCategory = SUPPORTED_CHAINS.filter(chain => {
                  if (category === 'Ethereum') return [1, 11155111, 17000].includes(chain.id)
                  if (category === 'Layer 2') return [137, 80001, 42161, 421614, 10, 11155420, 8453, 84532].includes(chain.id)
                  if (category === 'ZetaChain') return [7000, 7001].includes(chain.id)
                  return false
                })
                
                if (networksInCategory.length === 0) return null
                
                return (
                  <div key={category} className="mb-4 last:mb-0">
                    <div className="text-xs font-semibold text-gray-500 mb-2 px-2">{category}</div>
                    <div className="space-y-1">
                      {networksInCategory.map((network) => (
                        <button
                          key={network.id}
                          onClick={() => {
                            switchChain({ chainId: network.id as 1 | 11155111 | 17000 | 7000 | 7001 | 137 | 80001 | 42161 | 421614 | 10 | 11155420 | 8453 | 84532 })
                            setShowNetworkDropdown(false)
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                            chainId === network.id
                              ? 'bg-zeta-50 text-zeta-700 border border-zeta-200'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${network.gradient} flex items-center justify-center text-white text-xs font-bold`}>
                              {network.icon}
                            </div>
                            <span className="font-medium text-gray-900">{network.name}</span>
                          </div>
                          {chainId === network.id && (
                            <CheckIcon className="w-4 h-4 text-zeta-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}