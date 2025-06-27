'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { motion, AnimatePresence } from 'framer-motion'
import { getTokenBalances, getTokenPrices, getTokenData, TokenBalance } from '@/lib/alchemy'
import { SUPPORTED_CHAINS, getChainById } from '@/config/chains'
import { ethers } from 'ethers'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
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
  ChevronDownIcon,
  CheckIcon
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
  const [isFetchingPrices, setIsFetchingPrices] = useState(false)
  const [totalValue, setTotalValue] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('value-desc')
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const networkButtonRef = useRef<HTMLButtonElement>(null)
  const [liveData, setLiveData] = useState({
    btc: { price: 43250.75, change: 2.34 },
    eth: { price: 2618.45, change: -1.67 },
    zeta: { price: 0.169934, change: 3.21 },
    sol: { price: 98.23, change: 4.55 },
    ada: { price: 0.487, change: -0.89 },
    link: { price: 14.78, change: 1.23 }
  })

  const fetchTokenData = useCallback(async (address: string, currentChainId: number) => {
    setIsLoading(true)
    setIsFetchingPrices(false)
    
    try {
      // Step 1: Fetch token balances
      console.log('Fetching token balances...')
      const tokenBalances = await getTokenBalances(address, currentChainId)
      
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
          usdValue: 0 // Initially 0, will be updated after price fetch
        }
      })

      // Set tokens immediately so user sees their balances
      setTokens(tokensWithoutPrices)
      setIsLoading(false)
      
      // Step 3: Fetch prices in background
      setIsFetchingPrices(true)
      console.log('Fetching token prices...')
      
      // Get all unique symbols including native tokens
      const uniqueSymbols = [...new Set(tokenBalances.map(token => token.symbol))]
      
      // Add native token symbols for price fetching based on chain
      const nativeTokenSymbol = getNativeTokenSymbol(currentChainId)
      if (nativeTokenSymbol && !uniqueSymbols.includes(nativeTokenSymbol)) {
        uniqueSymbols.push(nativeTokenSymbol)
      }
      
      // Retry logic for price fetching
      let prices: Record<string, number> = {}
      let retryCount = 0
      const maxRetries = 3
      
      while (retryCount < maxRetries) {
        try {
          prices = await getTokenPrices(uniqueSymbols)
          console.log('Prices fetched successfully:', prices)
          break
        } catch (priceError) {
          retryCount++
          console.warn(`Price fetch attempt ${retryCount} failed:`, priceError)
          if (retryCount < maxRetries) {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
          }
        }
      }

      // Step 4: Update tokens with prices
      const tokensWithPrices: TokenWithPrice[] = tokenBalances.map(token => {
        const balance = parseFloat(ethers.formatUnits(token.tokenBalance, token.decimals))
        const price = prices[token.symbol] || 0
        const usdValue = balance * price

        return {
          ...token,
          formattedBalance: balance.toFixed(6),
          usdValue: isNaN(usdValue) ? 0 : usdValue
        }
      })

      setTokens(tokensWithPrices)
      setTotalValue(tokensWithPrices.reduce((sum, token) => sum + (token.usdValue || 0), 0))
      
      if (Object.keys(prices).length === 0) {
        console.warn('No prices fetched after retries - showing balances without USD values')
        // For testnets, this is expected behavior
        const isTestnet = [11155111, 17000, 80001, 421614, 11155420, 84532, 7001].includes(currentChainId)
        if (isTestnet) {
          console.info('Testnet detected - USD values not available for test tokens')
        }
      }
      
    } catch (error) {
      console.error('Error fetching token data:', error)
      setTokens([])
      setTotalValue(0)
    } finally {
      setIsLoading(false)
      setIsFetchingPrices(false)
    }
  }, [])

  useEffect(() => {
    if (address && chainId) {
      fetchTokenData(address, chainId)
    }
  }, [address, chainId, fetchTokenData])

  // Fetch real live price data from CoinGecko
  const fetchLiveData = useCallback(async () => {
    try {
      const symbols = ['BTC', 'ETH', 'ZETA', 'SOL', 'ADA', 'LINK']
      
      // Add timeout for live data fetching
      const tokenDataPromise = getTokenData(symbols)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Live data fetch timeout')), 8000)
      )
      
      const tokenData = await Promise.race([tokenDataPromise, timeoutPromise]) as Record<string, { price: number; change24h: number }>
      
      const newLiveData = {
        btc: { 
          price: tokenData.BTC?.price || liveData.btc.price, 
          change: tokenData.BTC?.change24h || liveData.btc.change 
        },
        eth: { 
          price: tokenData.ETH?.price || liveData.eth.price, 
          change: tokenData.ETH?.change24h || liveData.eth.change 
        },
        zeta: { 
          price: tokenData.ZETA?.price || liveData.zeta.price, 
          change: tokenData.ZETA?.change24h || liveData.zeta.change 
        },
        sol: { 
          price: tokenData.SOL?.price || liveData.sol.price, 
          change: tokenData.SOL?.change24h || liveData.sol.change 
        },
        ada: { 
          price: tokenData.ADA?.price || liveData.ada.price, 
          change: tokenData.ADA?.change24h || liveData.ada.change 
        },
        link: { 
          price: tokenData.LINK?.price || liveData.link.price, 
          change: tokenData.LINK?.change24h || liveData.link.change 
        }
      }
      
      setLiveData(newLiveData)
      console.log('Live data updated successfully')
    } catch (error) {
      console.warn('Error fetching live data, using cached values:', error)
      // Keep existing live data instead of failing
    }
  }, [liveData])

  useEffect(() => {
    // Fetch live data immediately and then every 30 seconds
    fetchLiveData()
    const interval = setInterval(fetchLiveData, 30000)
    
    return () => clearInterval(interval)
  }, [fetchLiveData])

  const getCurrentChain = () => {
    return getChainById(chainId)
  }

  const getNativeTokenSymbol = (chainId: number) => {
    switch (chainId) {
      case 1: // Ethereum Mainnet
      case 11155111: // Sepolia
      case 17000: // Holesky
      case 42161: // Arbitrum
      case 421614: // Arbitrum Sepolia  
      case 10: // Optimism
      case 11155420: // Optimism Sepolia
      case 8453: // Base
      case 84532: // Base Sepolia
        return 'ETH'
      case 137: // Polygon
      case 80001: // Mumbai
        return 'MATIC'
      case 7000: // ZetaChain Mainnet
      case 7001: // ZetaChain Athens
        return 'ZETA'
      default:
        return 'ETH'
    }
  }

  const topStories = [
    {
      title: "ZetaChain Announces $27M Funding Round Led by Human Capital",
      summary: "Strategic investment to accelerate universal blockchain interoperability and expand ecosystem.",
      source: "CoinDesk",
      timestamp: "2h ago", 
      category: "Funding",
      trending: true
    },
    {
      title: "New Cross-Chain DeFi Protocol Launches on ZetaChain Mainnet",
      summary: "Revolutionary protocol enables seamless asset transfers between Bitcoin, Ethereum, and other major chains.",
      source: "The Block",
      timestamp: "4h ago",
      category: "DeFi",
      trending: true
    },
    {
      title: "ZetaChain Partners with Major Exchanges for Native Bitcoin Support",
      summary: "Partnership brings native Bitcoin transactions to Ethereum DeFi without wrapped tokens.",
      source: "Decrypt",
      timestamp: "6h ago",
      category: "Partnership",
      trending: false
    },
    {
      title: "Layer 1 Interoperability: ZetaChain vs Cosmos vs Polkadot Analysis",
      summary: "Comprehensive comparison of leading interoperability solutions and their unique approaches.",
      source: "Messari",
      timestamp: "8h ago",
      category: "Analysis",
      trending: false
    },
    {
      title: "ZetaChain Testnet Processes Over 1M Cross-Chain Transactions",
      summary: "Milestone achievement demonstrates network stability and readiness for mainnet scaling.",
      source: "CoinTelegraph",
      timestamp: "12h ago",
      category: "Milestone",
      trending: false
    },
    {
      title: "Developer Guide: Building Cross-Chain dApps on ZetaChain",
      summary: "Step-by-step tutorial for developers to create applications spanning multiple blockchains.",
      source: "ZetaChain Blog",
      timestamp: "1d ago",
      category: "Development",
      trending: false
    },
    {
      title: "Institutional Adoption: Fortune 500 Company Integrates ZetaChain",
      summary: "Major corporation leverages omnichain capabilities for enterprise blockchain solutions.",
      source: "Forbes",
      timestamp: "1d ago",
      category: "Enterprise",
      trending: false
    },
    {
      title: "ZetaChain Community Governance Proposal: Fee Structure Update",
      summary: "Community votes on proposed changes to network fees and validator economics.",
      source: "ZetaChain Governance",
      timestamp: "2d ago",
      category: "Governance",
      trending: false
    },
    {
      title: "Cross-Chain NFT Marketplace Sees 300% Growth on ZetaChain",
      summary: "Platform enables trading of NFTs across Bitcoin, Ethereum, and BSC ecosystems.",
      source: "NFT Evening",
      timestamp: "2d ago",
      category: "NFTs", 
      trending: false
    },
    {
      title: "Security Audit Results: ZetaChain Core Protocol Receives Clean Bill",
      summary: "Independent security firm confirms robust architecture and smart contract safety.",
      source: "Security.org",
      timestamp: "3d ago",
      category: "Security",
      trending: false
    },
    {
      title: "ZetaChain Mobile Wallet Beta Launches with Cross-Chain Features",
      summary: "New mobile app enables users to manage assets across multiple blockchains seamlessly.",
      source: "Mobile Crypto",
      timestamp: "4d ago",
      category: "Product",
      trending: false
    },
    {
      title: "Cross-Chain Bridge Security Improvements Show 60% Reduction in Exploits",
      summary: "Enhanced security protocols and audit processes have significantly improved bridge safety.",
      source: "DeFi Pulse",
      timestamp: "10h ago",
      category: "Security",
      trending: false
    }
  ]

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
    if (value === 0 || isNaN(value)) return '$0.00'
    
    // Handle very small values (less than $0.0001)
    if (value < 0.0001) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 6,
        maximumFractionDigits: 8,
      }).format(value)
    }
    
    // Handle small values (less than $0.01)
    if (value < 0.01) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 4,
        maximumFractionDigits: 6,
      }).format(value)
    }
    
    // Handle normal values
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
    { value: 'name-desc', label: 'Name (Z to A)' }
  ]


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
              transition={{ duration: 0.8 }}
            >
              {/* Hero Section */}
              <div className="relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                  <motion.div 
                    className="text-center"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  >
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-zeta-600 via-zeta-700 to-zeta-800 bg-clip-text text-transparent mb-6">
                      ZetaChain Holdings
                    </h1>
                    <p className="text-xl sm:text-2xl text-neutral-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                      Track your cross-chain portfolio across Bitcoin, Ethereum, and all connected blockchain ecosystems in one unified interface.
                    </p>
                    
                    <motion.div 
                      className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                    >
                      <WalletConnection />
                      <button 
                        onClick={() => setShowSearch(true)}
                        className="inline-flex items-center px-6 py-3 border border-neutral-300 text-base font-medium rounded-xl text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zeta-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <EyeIcon className="w-5 h-5 mr-2" />
                        View Demo Portfolio
                      </button>
                    </motion.div>

                    {/* Live Price Ticker */}
                    <motion.div 
                      className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 mb-12"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.5 }}
                    >
                      <h3 className="text-lg font-semibold text-neutral-900 mb-4">Live Market Prices</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        {Object.entries(liveData).map(([coin, data]) => (
                          <div key={coin} className="text-center">
                            <div className="text-sm font-medium text-neutral-500 uppercase">{coin}</div>
                            <div className="text-lg font-bold text-neutral-900">{formatPrice(data.price)}</div>
                            <div className={`text-sm font-medium ${data.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Features Grid */}
                    <motion.div 
                      className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.6 }}
                    >
                      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
                        <div className="w-12 h-12 bg-gradient-to-r from-zeta-500 to-zeta-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                          <ChartBarIcon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-neutral-900 mb-3">Portfolio Analytics</h3>
                        <p className="text-neutral-600">Real-time tracking of your multi-chain assets with detailed performance metrics and historical data.</p>
                      </div>
                      
                      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
                        <div className="w-12 h-12 bg-gradient-to-r from-zeta-500 to-zeta-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                          <WalletIcon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-neutral-900 mb-3">Cross-Chain Support</h3>
                        <p className="text-neutral-600">Native support for Bitcoin, Ethereum, BSC, Polygon, and all ZetaChain-connected networks.</p>
                      </div>
                      
                      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
                        <div className="w-12 h-12 bg-gradient-to-r from-zeta-500 to-zeta-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                          <ArrowTrendingUpIcon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-neutral-900 mb-3">Live Market Data</h3>
                        <p className="text-neutral-600">Real-time price feeds, market trends, and portfolio performance tracking across all supported chains.</p>
                      </div>
                    </motion.div>
                  </motion.div>
                </div>

                {/* News Section */}
                <motion.div 
                  className="bg-white/40 backdrop-blur-sm py-16"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                >
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                      <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">Latest ZetaChain News</h2>
                      <p className="text-lg text-neutral-600">Stay updated with the latest developments in cross-chain technology</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {topStories.slice(0, 6).map((story, index) => (
                        <motion.article 
                          key={index}
                          className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 hover:scale-105"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.9 + index * 0.1 }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              story.trending ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {story.trending && '🔥 '}
                              {story.category}
                            </span>
                            <div className="flex items-center text-neutral-500 text-xs">
                              <ClockIcon className="w-3 h-3 mr-1" />
                              {story.timestamp}
                            </div>
                          </div>
                          
                          <h3 className="text-lg font-bold text-neutral-900 mb-2 line-clamp-2">
                            {story.title}
                          </h3>
                          <p className="text-neutral-600 text-sm mb-3 line-clamp-3">
                            {story.summary}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-neutral-500">{story.source}</span>
                            <button className="text-zeta-600 hover:text-zeta-700 text-sm font-medium transition-colors">
                              Read more →
                            </button>
                          </div>
                        </motion.article>
                      ))}
                    </div>
                    
                    <div className="text-center mt-12">
                      <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-zeta-500 to-zeta-600 hover:from-zeta-600 hover:to-zeta-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zeta-500 transition-all duration-200 shadow-lg hover:shadow-xl">
                        <NewspaperIcon className="w-5 h-5 mr-2" />
                        View All News
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.section>
          ) : (
            // Connected Portfolio View
            <motion.div 
              className="relative min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 py-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Portfolio Header */}
                <motion.div 
                  className="mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-zeta-600 to-zeta-800 bg-clip-text text-transparent mb-2">
                      Your Portfolio
                    </h1>
                    <p className="text-neutral-600">
                      Connected to {getCurrentChain()?.name || 'Unknown Network'}
                    </p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="space-y-8"
                >
                    {/* Network Selector - Dropdown */}
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-neutral-900">Current Network</h3>
                        
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
                                {isFetchingPrices ? (
                                  <div className="flex items-center">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                    Fetching prices...
                                  </div>
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
                    </div>

                    {/* Token Holdings */}
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden relative z-[1]">
                      <div className="p-6 border-b border-neutral-200/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-semibold text-neutral-900">Your Holdings</h3>
                            {isFetchingPrices && (
                              <div className="flex items-center text-sm text-neutral-500 mt-1">
                                <div className="w-3 h-3 border border-neutral-400 border-t-neutral-600 rounded-full animate-spin mr-2"></div>
                                Updating prices...
                              </div>
                            )}
                            {!isFetchingPrices && totalValue === 0 && tokens.length > 0 && (
                              <div className="text-xs text-neutral-400 mt-1">
                                {[11155111, 17000, 80001, 421614, 11155420, 84532, 7001].includes(chainId || 0) 
                                  ? 'USD values not available for testnet tokens' 
                                  : 'Prices may take a moment to load'}
                              </div>
                            )}
                          </div>
                          
                          {tokens.length > 0 && (
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-neutral-500 font-medium">Sort by:</span>
                              <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                className="text-sm border border-neutral-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-zeta-500 focus:border-transparent"
                              >
                                {getSortOptions().map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="divide-y divide-neutral-100">
                        {isLoading ? (
                          <div className="p-8 text-center">
                            <div className="inline-flex items-center">
                              <div className="w-4 h-4 border-2 border-zeta-500/30 border-t-zeta-500 rounded-full animate-spin mr-3"></div>
                              <span className="text-neutral-600">Loading your holdings...</span>
                            </div>
                          </div>
                        ) : sortedTokens.length === 0 ? (
                          <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <WalletIcon className="w-8 h-8 text-neutral-400" />
                            </div>
                            <h4 className="text-lg font-medium text-neutral-900 mb-2">No tokens found</h4>
                            <p className="text-neutral-500 mb-4">
                              {address ? 'No tokens detected on this network.' : 'Connect your wallet to view your holdings.'}
                            </p>
                            <button 
                              onClick={() => setShowSearch(true)}
                              className="inline-flex items-center px-4 py-2 bg-zeta-500 text-white rounded-lg hover:bg-zeta-600 transition-colors"
                            >
                              <EyeIcon className="w-4 h-4 mr-2" />
                              Search for tokens
                            </button>
                          </div>
                        ) : (
                          sortedTokens.map((token, index) => (
                            <Link 
                              key={`${token.contractAddress}-${index}`}
                              href={`/token/${token.contractAddress}`}
                              className="block p-6 hover:bg-neutral-50 transition-colors duration-150"
                            >
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-zeta-400 to-zeta-600 rounded-xl flex items-center justify-center">
                                  <span className="text-white font-bold text-lg">
                                    {token.symbol?.charAt(0) || '?'}
                                  </span>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="text-lg font-semibold text-neutral-900 truncate">
                                        {token.name || 'Unknown Token'}
                                      </h4>
                                      <p className="text-sm text-neutral-500 uppercase font-medium">
                                        {token.symbol || 'N/A'}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-lg font-bold text-neutral-900">
                                        {formatPrice(token.usdValue)}
                                      </div>
                                      <div className="text-sm text-neutral-500">
                                        {token.formattedBalance} {token.symbol}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <ChevronDownIcon className="w-5 h-5 text-neutral-400 transform rotate-[-90deg]" />
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />


      {/* Modals */}
      <SearchModal 
        isOpen={showSearch} 
        onClose={() => setShowSearch(false)}
        currentChainId={chainId}
      />

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