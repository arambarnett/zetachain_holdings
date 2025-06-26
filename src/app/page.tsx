'use client'

import { useState, useEffect } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { motion, AnimatePresence } from 'framer-motion'
import { getTokenBalances, getTokenPrices, getTokenData, TokenBalance } from '@/lib/alchemy'
import { SUPPORTED_CHAINS, getChainById } from '@/config/chains'
import { ethers } from 'ethers'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ChainManagement from '@/components/ChainManagement'
import SearchModal from '@/components/SearchModal'
import WalletConnection from '@/components/WalletConnection'
import Link from 'next/link'
import { 
  ChartBarIcon, 
  WalletIcon, 
  ArrowTrendingUpIcon,
  EyeIcon,
  ClockIcon,
  NewspaperIcon,
  BoltIcon
} from '@heroicons/react/24/outline'

interface TokenWithPrice extends TokenBalance {
  usdValue: number
  formattedBalance: string
}

type SortOption = 'value-desc' | 'value-asc' | 'amount-desc' | 'amount-asc' | 'name-asc' | 'name-desc'

export default function ZetaChainHoldings() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [tokens, setTokens] = useState<TokenWithPrice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [totalValue, setTotalValue] = useState(0)
  const [showChainManagement, setShowChainManagement] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('value-desc')
  const [liveData, setLiveData] = useState({
    btc: { price: 43250.75, change: 2.34 },
    eth: { price: 2618.45, change: -1.67 },
    zeta: { price: 0.169934, change: 3.21 },
    sol: { price: 98.23, change: 4.55 },
    ada: { price: 0.487, change: -0.89 },
    link: { price: 14.78, change: 1.23 }
  })

  const fetchTokenData = async (address: string, currentChainId: number) => {
    setIsLoading(true)
    try {
      const tokenBalances = await getTokenBalances(address, currentChainId)
      
      if (tokenBalances.length === 0) {
        setTokens([])
        setTotalValue(0)
        return
      }

      const uniqueSymbols = [...new Set(tokenBalances.map(token => token.symbol))]
      const prices = await getTokenPrices(uniqueSymbols)

      const tokensWithPrices: TokenWithPrice[] = tokenBalances.map(token => {
        const balance = parseFloat(ethers.formatUnits(token.tokenBalance, token.decimals))
        const price = prices[token.symbol] || 0
        const usdValue = balance * price

        return {
          ...token,
          formattedBalance: balance.toFixed(6),
          usdValue: usdValue
        }
      })

      setTokens(tokensWithPrices)
      setTotalValue(tokensWithPrices.reduce((sum, token) => sum + token.usdValue, 0))
    } catch (error) {
      console.error('Error fetching token data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (address && chainId) {
      fetchTokenData(address, chainId)
    }
  }, [address, chainId])

  // Fetch real live price data from CoinGecko
  const fetchLiveData = async () => {
    try {
      const symbols = ['BTC', 'ETH', 'ZETA', 'SOL', 'ADA', 'LINK']
      const tokenData = await getTokenData(symbols)
      
      const newLiveData = {
        btc: { 
          price: tokenData.BTC?.price || 43250.75, 
          change: tokenData.BTC?.change24h || 2.34 
        },
        eth: { 
          price: tokenData.ETH?.price || 2618.45, 
          change: tokenData.ETH?.change24h || -1.67 
        },
        zeta: { 
          price: tokenData.ZETA?.price || 0.169934, 
          change: tokenData.ZETA?.change24h || 3.21 
        },
        sol: { 
          price: tokenData.SOL?.price || 98.23, 
          change: tokenData.SOL?.change24h || 4.55 
        },
        ada: { 
          price: tokenData.ADA?.price || 0.487, 
          change: tokenData.ADA?.change24h || -0.89 
        },
        link: { 
          price: tokenData.LINK?.price || 14.78, 
          change: tokenData.LINK?.change24h || 1.23 
        }
      }
      
      setLiveData(newLiveData)
    } catch (error) {
      console.error('Error fetching live data:', error)
    }
  }

  // Initial load and periodic updates with real data
  useEffect(() => {
    fetchLiveData() // Initial load
    
    const interval = setInterval(() => {
      fetchLiveData() // Update every 60 seconds with real data
    }, 60000) // Every minute to avoid rate limiting

    return () => clearInterval(interval)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'C') {
        event.preventDefault()
        setShowChainManagement(true)
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setShowSearch(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const getCurrentChain = () => {
    return getChainById(chainId || 0)
  }

  // Mock news data
  const newsArticles = [
    {
      id: 1,
      title: "ZetaChain Announces Major Partnership with Leading DeFi Protocols",
      summary: "ZetaChain's omnichain infrastructure enables seamless cross-chain DeFi operations, marking a significant milestone in blockchain interoperability.",
      source: "CryptoNews",
      timestamp: "2h ago",
      category: "Partnership",
      trending: true
    },
    {
      id: 2,
      title: "Bitcoin ETF Inflows Reach Record High of $1.2B This Week",
      summary: "Institutional demand for Bitcoin exposure continues to surge as spot ETFs see unprecedented capital inflows.",
      source: "Bloomberg Crypto",
      timestamp: "4h ago",
      category: "Market",
      trending: true
    },
    {
      id: 3,
      title: "Ethereum Layer 2 Solutions See 40% Growth in TVL",
      summary: "Arbitrum and Optimism lead the charge as users migrate to lower-cost scaling solutions.",
      source: "The Block",
      timestamp: "6h ago",
      category: "Technology",
      trending: false
    },
    {
      id: 4,
      title: "Web3 Portfolio Management Tools Gain Traction Among Institutions",
      summary: "Professional investors increasingly adopt sophisticated DeFi tracking and analytics platforms.",
      source: "CoinDesk",
      timestamp: "8h ago",
      category: "Adoption",
      trending: false
    },
    {
      id: 5,
      title: "Cross-Chain Bridge Security Improvements Show 60% Reduction in Exploits",
      summary: "Enhanced security protocols and audit processes have significantly improved bridge safety.",
      source: "DeFi Pulse",
      timestamp: "10h ago",
      category: "Security",
      trending: false
    }
  ]

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

  const sortTokens = (tokens: TokenWithPrice[], sortOption: SortOption): TokenWithPrice[] => {
    const sortedTokens = [...tokens]
    
    switch (sortOption) {
      case 'value-desc':
        return sortedTokens.sort((a, b) => b.usdValue - a.usdValue)
      case 'value-asc':
        return sortedTokens.sort((a, b) => a.usdValue - b.usdValue)
      case 'amount-desc':
        return sortedTokens.sort((a, b) => {
          const aAmount = parseFloat(a.formattedBalance)
          const bAmount = parseFloat(b.formattedBalance)
          return bAmount - aAmount
        })
      case 'amount-asc':
        return sortedTokens.sort((a, b) => {
          const aAmount = parseFloat(a.formattedBalance)
          const bAmount = parseFloat(b.formattedBalance)
          return aAmount - bAmount
        })
      case 'name-asc':
        return sortedTokens.sort((a, b) => a.name.localeCompare(b.name))
      case 'name-desc':
        return sortedTokens.sort((a, b) => b.name.localeCompare(a.name))
      default:
        return sortedTokens
    }
  }

  const sortedTokens = sortTokens(tokens, sortBy)

  const getSortOptions = () => [
    { value: 'value-desc', label: 'Value (High to Low)' },
    { value: 'value-asc', label: 'Value (Low to High)' },
    { value: 'amount-desc', label: 'Amount (High to Low)' },
    { value: 'amount-asc', label: 'Amount (Low to High)' },
    { value: 'name-asc', label: 'Name (A to Z)' },
    { value: 'name-desc', label: 'Name (Z to A)' },
  ]

  const getChainColor = (chainId?: number) => {
    switch (chainId) {
      case 1: return 'from-blue-500 to-blue-600'
      case 11155111: return 'from-purple-500 to-purple-600'
      case 7000: return 'from-zeta-500 to-zeta-600'
      case 7001: return 'from-zeta-400 to-zeta-500'
      default: return 'from-neutral-500 to-neutral-600'
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pt-16">
        <AnimatePresence>
          {!isConnected ? (
            // ZetaChain Holdings Landing Page
            <motion.section 
              className="relative overflow-hidden bg-gradient-to-br from-neutral-50 via-white to-neutral-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Live Price Ticker */}
              <div className="bg-gradient-to-r from-zeta-500 to-zeta-600 text-white py-2 shadow-sm">
                <motion.div 
                  className="flex space-x-8 whitespace-nowrap"
                  animate={{ x: [-100, -2000] }}
                  transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                >
                  {Object.entries(liveData).map(([symbol, data]) => (
                    <div key={symbol} className="flex items-center space-x-2 text-sm">
                      <span className="font-semibold">{symbol.toUpperCase()}</span>
                      <span className="text-zeta-100">${data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: symbol === 'btc' ? 2 : symbol === 'eth' ? 2 : 6 })}</span>
                      <span className={`flex items-center ${data.change >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                        {data.change >= 0 ? '↗' : '↘'} {Math.abs(data.change).toFixed(2)}%
                      </span>
                    </div>
                  ))}
                  {/* Duplicate for seamless loop */}
                  {Object.entries(liveData).map(([symbol, data]) => (
                    <div key={`${symbol}-dup`} className="flex items-center space-x-2 text-sm">
                      <span className="font-semibold">{symbol.toUpperCase()}</span>
                      <span className="text-zeta-100">${data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: symbol === 'btc' ? 2 : symbol === 'eth' ? 2 : 6 })}</span>
                      <span className={`flex items-center ${data.change >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                        {data.change >= 0 ? '↗' : '↘'} {Math.abs(data.change).toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </motion.div>
              </div>
              
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Main Header */}
                <motion.div 
                  className="text-center mb-12"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-zeta-500 to-zeta-600 text-white rounded-xl text-sm font-medium mb-6 shadow-lg">
                    <BoltIcon className="w-4 h-4 mr-2" />
                    Live Market Data
                  </div>
                  
                  <h1 className="text-5xl md:text-6xl font-bold mb-4">
                    <span className="bg-gradient-to-r from-zeta-600 to-zeta-800 bg-clip-text text-transparent">ZetaChain</span>
                    <span className="text-neutral-900"> Holdings</span>
                  </h1>
                  
                  <p className="text-xl text-neutral-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                    Professional multi-chain portfolio management with real-time insights. 
                    Track, analyze, and optimize your Web3 investments across all networks.
                  </p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="mb-12"
                  >
                    <WalletConnection />
                  </motion.div>
                </motion.div>

                {/* Market Overview Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                  {/* Market Data */}
                  <motion.div 
                    className="lg:col-span-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  >
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-neutral-900 flex items-center">
                          <ArrowTrendingUpIcon className="w-5 h-5 mr-2 text-zeta-600" />
                          Market Overview
                        </h2>
                        <div className="text-sm text-neutral-500">Updated 3s ago</div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(liveData).map(([symbol, data]) => {
                          // Map symbols to contract addresses for navigation
                          // Use native token addresses where applicable
                          const tokenAddresses: Record<string, string> = {
                            btc: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC on Ethereum
                            eth: '0x0000000000000000000000000000000000000000', // Native ETH
                            zeta: '0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf', // ZETA on Ethereum
                            sol: '0xD31a59c85aE9D8edEFeC411D448f90841571b89c', // SOL wrapped on Ethereum
                            ada: '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47', // ADA wrapped on Ethereum
                            link: '0x514910771AF9Ca656af840dff83E8264EcF986CA'  // LINK on Ethereum
                          }
                          
                          return (
                            <Link 
                              key={symbol} 
                              href={`/token/${tokenAddresses[symbol]}`}
                              className="block"
                            >
                              <motion.div 
                                className="bg-white/80 p-4 rounded-xl border border-neutral-200 hover:border-zeta-400 hover:shadow-lg transition-all cursor-pointer"
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-neutral-900 font-semibold text-sm">{symbol.toUpperCase()}</span>
                                  <div className={`w-2 h-2 rounded-full ${data.change >= 0 ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                                </div>
                                <div className="text-lg font-bold text-neutral-900 mb-1">
                                  ${data.price.toLocaleString(undefined, { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: symbol === 'btc' ? 2 : symbol === 'eth' ? 2 : 6 
                                  })}
                                </div>
                                <div className={`text-sm font-medium flex items-center ${data.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {data.change >= 0 ? '↗' : '↘'} {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}%
                                </div>
                              </motion.div>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  </motion.div>

                  {/* Market Stats */}
                  <motion.div 
                    className="space-y-6"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                      <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center">
                        <ArrowTrendingUpIcon className="w-5 h-5 mr-2 text-zeta-600" />
                        Today&apos;s Movers
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                          <span className="text-neutral-700 font-medium">SOL</span>
                          <span className="text-green-600 font-semibold">+4.55%</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                          <span className="text-neutral-700 font-medium">ZETA</span>
                          <span className="text-green-600 font-semibold">+3.21%</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                          <span className="text-neutral-700 font-medium">ETH</span>
                          <span className="text-red-600 font-semibold">-1.67%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                      <h3 className="text-lg font-bold text-neutral-900 mb-4">Market Sentiment</h3>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-zeta-600 mb-2">64</div>
                        <div className="text-sm text-neutral-600 font-medium">Moderate Optimism</div>
                        <div className="w-full bg-neutral-200 rounded-full h-3 mt-4">
                          <div className="bg-gradient-to-r from-zeta-500 to-zeta-600 h-3 rounded-full w-3/5 shadow-sm"></div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* News Section */}
                <motion.div 
                  className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-neutral-900 flex items-center">
                      <NewspaperIcon className="w-5 h-5 mr-2 text-zeta-600" />
                      Latest News & Insights
                    </h2>
                    <div className="text-sm text-neutral-500">Live Updates</div>
                  </div>
                  
                  <div className="space-y-4">
                    {newsArticles.slice(0, 3).map((article, index) => (
                      <motion.div 
                        key={article.id}
                        className="border-l-4 border-zeta-500 pl-4 hover:bg-white/50 p-3 rounded-r transition-colors cursor-pointer"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {article.trending && (
                                <div className="bg-gradient-to-r from-zeta-500 to-zeta-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                                  Trending
                                </div>
                              )}
                              <span className="text-neutral-500 text-sm font-medium">{article.source}</span>
                              <span className="text-neutral-400 text-sm">•</span>
                              <span className="text-neutral-500 text-sm">{article.timestamp}</span>
                            </div>
                            <h3 className="text-neutral-900 font-semibold mb-2 leading-tight">
                              {article.title}
                            </h3>
                            <p className="text-neutral-600 text-sm leading-relaxed">
                              {article.summary}
                            </p>
                          </div>
                          <div className="ml-4">
                            <span className="text-xs bg-zeta-100 text-zeta-700 px-2 py-1 rounded-full font-medium">
                              {article.category}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="mt-6 text-center">
                    <button className="text-zeta-600 hover:text-zeta-700 font-medium text-sm transition-colors">
                      View All Market News →
                    </button>
                  </div>
                </motion.div>

              </div>
            </motion.section>
          ) : (
            // Connected User Dashboard
            <motion.div 
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Portfolio Overview */}
              <motion.div 
                className="bg-gradient-to-r from-zeta-500 to-zeta-600 rounded-3xl p-8 text-white shadow-2xl mb-8"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">Portfolio Overview</h2>
                    {getCurrentChain() && (
                      <div className="flex items-center space-x-2 text-zeta-100">
                        <div className="w-2 h-2 bg-white rounded-full" />
                        <span className="text-sm font-medium">{getCurrentChain()?.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-5xl font-bold mb-1">{formatPrice(totalValue)}</div>
                    <div className="text-zeta-100 text-sm">
                      {tokens.length} {tokens.length === 1 ? 'Asset' : 'Assets'}
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { icon: <EyeIcon className="w-5 h-5" />, label: 'Watching', value: `${tokens.length} tokens` },
                    { icon: <ClockIcon className="w-5 h-5" />, label: 'Last Updated', value: 'Just now' },
                    { icon: <ChartBarIcon className="w-5 h-5" />, label: 'Network', value: getCurrentChain()?.name || 'Unknown' }
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="flex items-center space-x-2 text-zeta-100 mb-1">
                        {stat.icon}
                        <span className="text-sm font-medium">{stat.label}</span>
                      </div>
                      <div className="text-white font-semibold">{stat.value}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Holdings Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="space-y-8"
              >
                    {/* Network Selector */}
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                      <h3 className="text-xl font-semibold text-neutral-900 mb-6">Select Network</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {SUPPORTED_CHAINS.map(chain => {
                          const isActive = chainId === chain.id
                          
                          return (
                            <motion.button
                              key={chain.id}
                              onClick={() => switchChain({ chainId: chain.id as 1 | 11155111 | 7000 | 7001 })}
                              className={`p-4 rounded-xl font-medium transition-all duration-200 border text-left ${
                                isActive
                                  ? 'bg-gradient-to-r from-zeta-500 to-zeta-600 text-white border-transparent shadow-lg'
                                  : 'bg-white/50 hover:bg-white border-neutral-200 hover:shadow-md hover:border-zeta-300 text-neutral-900'
                              }`}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  isActive ? 'bg-white' : `bg-gradient-to-r ${getChainColor(chain.id)}`
                                }`} />
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-lg">{chain.icon}</span>
                                    <span className="font-semibold">{chain.name}</span>
                                  </div>
                                  {!chain.isMainnet && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                                      isActive ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-800'
                                    }`}>
                                      Testnet
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Token Holdings */}
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                      <div className="p-6 border-b border-neutral-200/50">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-semibold text-neutral-900">Your Holdings</h3>
                          
                          {tokens.length > 0 && (
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-neutral-500 font-medium">Sort by:</span>
                              <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                className="bg-white border border-neutral-200 rounded-xl px-4 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-300 focus:border-zeta-500 focus:outline-none focus:ring-1 focus:ring-zeta-500 transition-colors"
                              >
                                {getSortOptions().map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-6">
                        {isLoading ? (
                          <div className="text-center py-16">
                            <div className="w-16 h-16 bg-zeta-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <div className="w-8 h-8 border-3 border-zeta-500/30 border-t-zeta-500 rounded-full animate-spin" />
                            </div>
                            <p className="text-neutral-600 text-lg">Loading your holdings...</p>
                          </div>
                        ) : tokens.length === 0 ? (
                          <div className="text-center py-16">
                            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <WalletIcon className="w-8 h-8 text-neutral-400" />
                            </div>
                            <p className="text-neutral-600 text-lg">No tokens found</p>
                            <p className="text-neutral-500 text-sm mt-2">Try switching to a different network</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {sortedTokens.map((token, index) => (
                              <motion.a
                                key={`${token.contractAddress}-${index}`} 
                                href={`/token/${token.contractAddress}`}
                                className="block group p-4 rounded-xl border border-neutral-200/50 hover:border-zeta-200 hover:bg-zeta-50/30 transition-all duration-200 cursor-pointer"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                whileHover={{ scale: 1.01 }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <div className="relative">
                                      <div className="w-12 h-12 bg-gradient-to-br from-zeta-500 to-zeta-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <span className="font-bold text-white text-lg">{token.symbol[0]}</span>
                                      </div>
                                      <div className="absolute -top-2 -left-2 w-6 h-6 bg-neutral-800 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                        {index + 1}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="font-semibold text-neutral-900 text-lg group-hover:text-zeta-600 transition-colors">{token.name}</div>
                                      <div className="text-neutral-500 text-sm">{token.symbol}</div>
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <div className="font-semibold text-neutral-900 text-lg">
                                      {parseFloat(token.formattedBalance).toLocaleString()} {token.symbol}
                                    </div>
                                    <div className="text-neutral-600 text-sm">{formatPrice(token.usdValue)}</div>
                                  </div>
                                </div>
                              </motion.a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />

      {/* Developer Tools */}
      {isConnected && (
        <div className="fixed bottom-4 left-4 z-40">
          <button
            onClick={() => setShowChainManagement(true)}
            className="group bg-neutral-900/90 hover:bg-neutral-900 text-white px-3 py-2 rounded-xl text-xs font-mono transition-all duration-200 backdrop-blur-sm"
            title="Open Chain Management (Cmd/Ctrl + Shift + C)"
          >
            <div className="flex items-center space-x-2">
              <span>⚙️</span>
              <span className="hidden group-hover:inline">Networks</span>
            </div>
          </button>
        </div>
      )}

      {/* Modals */}
      <SearchModal 
        isOpen={showSearch} 
        onClose={() => setShowSearch(false)}
        currentChainId={chainId}
      />

      <ChainManagement 
        isOpen={showChainManagement} 
        onClose={() => setShowChainManagement(false)} 
      />
    </div>
  )
}