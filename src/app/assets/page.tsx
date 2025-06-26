'use client'

import { useState, useEffect } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { motion } from 'framer-motion'
import { getTokenBalances, getTokenPrices, TokenBalance } from '@/lib/alchemy'
import { SUPPORTED_CHAINS, getChainById } from '@/config/chains'
import { ethers } from 'ethers'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BanknotesIcon,
  MagnifyingGlassIcon,
  StarIcon,
  EyeIcon,
  EyeSlashIcon,
  FunnelIcon,
  ArrowPathRoundedSquareIcon,
  BuildingLibraryIcon,
  GlobeAltIcon,
  FireIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface TokenWithPrice extends TokenBalance {
  usdValue: number
  formattedBalance: string
  change24h?: number
  volume24h?: number
  isHidden?: boolean
  isFavorite?: boolean
}

type SortOption = 'value-desc' | 'value-asc' | 'amount-desc' | 'amount-asc' | 'name-asc' | 'name-desc' | 'change-desc' | 'change-asc'
type ExchangeSortOption = 'volume-desc' | 'volume-asc' | 'name-asc' | 'name-desc' | 'type' | 'security'
type FilterOption = 'all' | 'favorites' | 'hidden' | 'high-value' | 'low-value'
type TabOption = 'assets' | 'bridges' | 'exchanges'

interface Bridge {
  id: string
  name: string
  description: string
  logo: string
  supportedChains: string[]
  fees: string
  security: 'high' | 'medium' | 'low'
  speed: string
  url: string
  volume24h: number
  tvl: number
}

interface Exchange {
  id: string
  name: string
  description: string
  logo: string
  type: 'cex' | 'dex'
  volume24h: number
  fees: string
  supportedChains: string[]
  url: string
  features: string[]
  security: 'high' | 'medium' | 'low'
}

export default function AssetsPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [tokens, setTokens] = useState<TokenWithPrice[]>([])
  const [filteredTokens, setFilteredTokens] = useState<TokenWithPrice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [totalValue, setTotalValue] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('value-desc')
  const [exchangeSortBy, setExchangeSortBy] = useState<ExchangeSortOption>('volume-desc')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<TabOption>('assets')

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

      // Load user preferences from localStorage
      const favorites = JSON.parse(localStorage.getItem('zeta-favorites') || '[]')
      const hidden = JSON.parse(localStorage.getItem('zeta-hidden') || '[]')

      const tokensWithPrices: TokenWithPrice[] = tokenBalances.map(token => {
        const balance = parseFloat(ethers.formatUnits(token.tokenBalance, token.decimals))
        const price = prices[token.symbol] || 0
        const usdValue = balance * price

        return {
          ...token,
          formattedBalance: balance.toFixed(6),
          usdValue: usdValue,
          change24h: (Math.random() - 0.5) * 20,
          volume24h: Math.random() * 1000000,
          isFavorite: favorites.includes(token.contractAddress),
          isHidden: hidden.includes(token.contractAddress)
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

  // Filter and sort tokens
  useEffect(() => {
    let filtered = tokens.filter(token => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!token.name.toLowerCase().includes(query) && 
            !token.symbol.toLowerCase().includes(query)) {
          return false
        }
      }

      // Category filter
      switch (filterBy) {
        case 'favorites':
          return token.isFavorite
        case 'hidden':
          return token.isHidden
        case 'high-value':
          return token.usdValue >= 100
        case 'low-value':
          return token.usdValue < 1
        default:
          return !token.isHidden // Don't show hidden tokens in 'all'
      }
    })

    // Sort tokens
    filtered = sortTokens(filtered, sortBy)
    setFilteredTokens(filtered)
  }, [tokens, searchQuery, sortBy, filterBy])

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
      case 'change-desc':
        return sortedTokens.sort((a, b) => (b.change24h || 0) - (a.change24h || 0))
      case 'change-asc':
        return sortedTokens.sort((a, b) => (a.change24h || 0) - (b.change24h || 0))
      default:
        return sortedTokens
    }
  }

  const sortExchanges = (exchanges: Exchange[], sortOption: ExchangeSortOption): Exchange[] => {
    const sortedExchanges = [...exchanges]
    
    switch (sortOption) {
      case 'volume-desc':
        return sortedExchanges.sort((a, b) => b.volume24h - a.volume24h)
      case 'volume-asc':
        return sortedExchanges.sort((a, b) => a.volume24h - b.volume24h)
      case 'name-asc':
        return sortedExchanges.sort((a, b) => a.name.localeCompare(b.name))
      case 'name-desc':
        return sortedExchanges.sort((a, b) => b.name.localeCompare(a.name))
      case 'type':
        return sortedExchanges.sort((a, b) => a.type.localeCompare(b.type))
      case 'security':
        const securityOrder = { 'high': 3, 'medium': 2, 'low': 1 }
        return sortedExchanges.sort((a, b) => securityOrder[b.security] - securityOrder[a.security])
      default:
        return sortedExchanges
    }
  }

  const toggleFavorite = (contractAddress: string) => {
    const favorites = JSON.parse(localStorage.getItem('zeta-favorites') || '[]')
    const updatedFavorites = favorites.includes(contractAddress)
      ? favorites.filter((addr: string) => addr !== contractAddress)
      : [...favorites, contractAddress]
    
    localStorage.setItem('zeta-favorites', JSON.stringify(updatedFavorites))
    
    setTokens(tokens.map(token => 
      token.contractAddress === contractAddress 
        ? { ...token, isFavorite: !token.isFavorite }
        : token
    ))
  }

  const toggleHidden = (contractAddress: string) => {
    const hidden = JSON.parse(localStorage.getItem('zeta-hidden') || '[]')
    const updatedHidden = hidden.includes(contractAddress)
      ? hidden.filter((addr: string) => addr !== contractAddress)
      : [...hidden, contractAddress]
    
    localStorage.setItem('zeta-hidden', JSON.stringify(updatedHidden))
    
    setTokens(tokens.map(token => 
      token.contractAddress === contractAddress 
        ? { ...token, isHidden: !token.isHidden }
        : token
    ))
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

  const getCurrentChain = () => {
    return getChainById(chainId || 0)
  }

  // Mock bridge data
  const bridges: Bridge[] = [
    {
      id: 'zetachain-bridge',
      name: 'ZetaChain Bridge',
      description: 'Official ZetaChain omnichain bridge for seamless cross-chain transfers',
      logo: 'Ζ',
      supportedChains: ['Ethereum', 'Bitcoin', 'BSC', 'Polygon'],
      fees: '0.1-0.3%',
      security: 'high',
      speed: '2-5 minutes',
      url: 'https://bridge.zetachain.com',
      volume24h: 12500000,
      tvl: 245000000
    },
    {
      id: 'layerzero-bridge',
      name: 'LayerZero Bridge',
      description: 'Cross-chain infrastructure for omnichain applications',
      logo: 'LZ',
      supportedChains: ['Ethereum', 'Arbitrum', 'Optimism', 'Polygon'],
      fees: '0.05-0.2%',
      security: 'high',
      speed: '1-3 minutes',
      url: 'https://layerzero.network',
      volume24h: 8900000,
      tvl: 189000000
    },
    {
      id: 'wormhole-bridge',
      name: 'Wormhole',
      description: 'Generic message passing protocol for cross-chain communication',
      logo: 'W',
      supportedChains: ['Ethereum', 'Solana', 'BSC', 'Polygon'],
      fees: '0.1-0.25%',
      security: 'medium',
      speed: '3-8 minutes',
      url: 'https://wormhole.com',
      volume24h: 15600000,
      tvl: 156000000
    },
    {
      id: 'stargate-bridge',
      name: 'Stargate Finance',
      description: 'Fully composable liquidity transport protocol built on LayerZero',
      logo: 'STG',
      supportedChains: ['Ethereum', 'Arbitrum', 'Optimism', 'Avalanche'],
      fees: '0.06%',
      security: 'high',
      speed: '1-2 minutes',
      url: 'https://stargate.finance',
      volume24h: 6700000,
      tvl: 234000000
    }
  ]

  // Mock exchange data
  const exchanges: Exchange[] = [
    {
      id: 'uniswap',
      name: 'Uniswap',
      description: 'Leading decentralized trading protocol on Ethereum',
      logo: '🦄',
      type: 'dex',
      volume24h: 1200000000,
      fees: '0.05-1%',
      supportedChains: ['Ethereum', 'Arbitrum', 'Optimism', 'Polygon'],
      url: 'https://app.uniswap.org',
      features: ['AMM', 'Liquidity Pools', 'Yield Farming', 'NFT Trading'],
      security: 'high'
    },
    {
      id: 'pancakeswap',
      name: 'PancakeSwap',
      description: 'The most popular DEX on BNB Smart Chain',
      logo: '🥞',
      type: 'dex',
      volume24h: 450000000,
      fees: '0.25%',
      supportedChains: ['BSC', 'Ethereum', 'Arbitrum'],
      url: 'https://pancakeswap.finance',
      features: ['AMM', 'Farms', 'Pools', 'Lottery', 'NFT Marketplace'],
      security: 'high'
    },
    {
      id: 'binance',
      name: 'Binance',
      description: 'World\'s largest cryptocurrency exchange by trading volume',
      logo: 'B',
      type: 'cex',
      volume24h: 15000000000,
      fees: '0.1%',
      supportedChains: ['Ethereum', 'BSC', 'Bitcoin', 'Arbitrum'],
      url: 'https://binance.com',
      features: ['Spot Trading', 'Futures', 'Options', 'Staking', 'Launchpad'],
      security: 'high'
    },
    {
      id: 'coinbase',
      name: 'Coinbase',
      description: 'Leading US-based cryptocurrency exchange platform',
      logo: 'CB',
      type: 'cex',
      volume24h: 3200000000,
      fees: '0.25-0.6%',
      supportedChains: ['Ethereum', 'Bitcoin', 'Polygon', 'Arbitrum'],
      url: 'https://coinbase.com',
      features: ['Spot Trading', 'Pro Trading', 'Staking', 'NFT Marketplace'],
      security: 'high'
    },
    {
      id: 'sushiswap',
      name: 'SushiSwap',
      description: 'Community-driven DEX with advanced DeFi features',
      logo: '🍣',
      type: 'dex',
      volume24h: 120000000,
      fees: '0.3%',
      supportedChains: ['Ethereum', 'Arbitrum', 'Polygon', 'Avalanche'],
      url: 'https://sushi.com',
      features: ['AMM', 'Yield Farming', 'Lending', 'Cross-chain'],
      security: 'medium'
    },
    {
      id: 'curve',
      name: 'Curve Finance',
      description: 'Exchange liquidity pool for efficient stablecoin trading',
      logo: 'CRV',
      type: 'dex',
      volume24h: 89000000,
      fees: '0.04%',
      supportedChains: ['Ethereum', 'Arbitrum', 'Optimism', 'Polygon'],
      url: 'https://curve.fi',
      features: ['Stablecoin Exchange', 'Low Slippage', 'Yield Farming'],
      security: 'high'
    }
  ]

  const formatLargeNumber = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toFixed(0)}`
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-zeta-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BanknotesIcon className="w-10 h-10 text-zeta-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-4">Connect Your Wallet</h1>
            <p className="text-neutral-600 mb-8">Connect your wallet to view and manage your assets</p>
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
              DeFi Hub
            </h1>
            <p className="text-neutral-600">Manage assets, discover bridges, and find the best exchanges</p>
          </motion.div>

          {/* Tab Navigation */}
          <motion.div 
            className="bg-white/60 backdrop-blur-sm rounded-2xl p-2 shadow-xl border border-white/20 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
          >
            <div className="flex space-x-2">
              {[
                { id: 'assets', label: 'Assets', icon: <BanknotesIcon className="w-5 h-5" />, description: 'Manage your tokens' },
                { id: 'bridges', label: 'Bridges', icon: <ArrowPathRoundedSquareIcon className="w-5 h-5" />, description: 'Cross-chain transfers' },
                { id: 'exchanges', label: 'Exchanges', icon: <BuildingLibraryIcon className="w-5 h-5" />, description: 'Trading platforms' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabOption)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-zeta-500 text-white shadow-lg'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/50'
                  }`}
                >
                  {tab.icon}
                  <div className="text-left">
                    <div className="font-semibold">{tab.label}</div>
                    <div className={`text-xs ${activeTab === tab.id ? 'text-zeta-100' : 'text-neutral-500'}`}>
                      {tab.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Network Selector - Only show for Assets tab */}
          {activeTab === 'assets' && (
            <motion.div 
              className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
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
                        isActive ? 'bg-white' : `bg-gradient-to-r ${chain.gradient.from} ${chain.gradient.to}`
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
          </motion.div>
          )}

          {/* Assets Tab Content */}
          {activeTab === 'assets' && (
            <>
              {/* Portfolio Summary */}
          <motion.div 
            className="bg-gradient-to-r from-zeta-500 to-zeta-600 rounded-2xl p-8 text-white shadow-xl mb-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">Asset Portfolio</h2>
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
                  {filteredTokens.length} of {tokens.length} assets shown
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { icon: <BanknotesIcon className="w-5 h-5" />, label: 'Total Assets', value: `${tokens.length} tokens` },
                { icon: <StarIcon className="w-5 h-5" />, label: 'Favorites', value: `${tokens.filter(t => t.isFavorite).length} marked` },
                { icon: <EyeSlashIcon className="w-5 h-5" />, label: 'Hidden', value: `${tokens.filter(t => t.isHidden).length} hidden` },
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

          {/* Search and Filters */}
          <motion.div 
            className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search assets by name or symbol..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:border-zeta-500 focus:outline-none focus:ring-1 focus:ring-zeta-500 text-sm"
                />
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors flex items-center space-x-2"
              >
                <FunnelIcon className="w-4 h-4" />
                <span>Filters</span>
              </button>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:border-zeta-500 focus:outline-none focus:ring-1 focus:ring-zeta-500 text-sm font-medium text-gray-700"
              >
                <option value="value-desc">Value (High to Low)</option>
                <option value="value-asc">Value (Low to High)</option>
                <option value="amount-desc">Amount (High to Low)</option>
                <option value="amount-asc">Amount (Low to High)</option>
                <option value="name-asc">Name (A to Z)</option>
                <option value="name-desc">Name (Z to A)</option>
                <option value="change-desc">24h Change (High to Low)</option>
                <option value="change-asc">24h Change (Low to High)</option>
              </select>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <motion.div 
                className="mt-4 pt-4 border-t border-gray-200"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'all', label: 'All Assets', count: tokens.filter(t => !t.isHidden).length },
                    { key: 'favorites', label: 'Favorites', count: tokens.filter(t => t.isFavorite).length },
                    { key: 'hidden', label: 'Hidden', count: tokens.filter(t => t.isHidden).length },
                    { key: 'high-value', label: 'High Value ($100+)', count: tokens.filter(t => t.usdValue >= 100).length },
                    { key: 'low-value', label: 'Low Value (<$1)', count: tokens.filter(t => t.usdValue < 1).length }
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setFilterBy(filter.key as FilterOption)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        filterBy === filter.key
                          ? 'bg-zeta-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {filter.label} ({filter.count})
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Assets List */}
          <motion.div 
            className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="p-6 border-b border-neutral-200/50">
              <h3 className="text-xl font-semibold text-neutral-900">Your Assets</h3>
            </div>
            
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-zeta-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="w-8 h-8 border-3 border-zeta-500/30 border-t-zeta-500 rounded-full animate-spin" />
                  </div>
                  <p className="text-neutral-600 text-lg">Loading your assets...</p>
                </div>
              ) : filteredTokens.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BanknotesIcon className="w-8 h-8 text-neutral-400" />
                  </div>
                  <p className="text-neutral-600 text-lg">
                    {searchQuery || filterBy !== 'all' ? 'No assets match your filters' : 'No assets found'}
                  </p>
                  <p className="text-neutral-500 text-sm mt-2">
                    {searchQuery || filterBy !== 'all' ? 'Try adjusting your search or filters' : 'Try switching to a different network'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTokens.map((token, index) => (
                    <motion.div
                      key={`${token.contractAddress}-${index}`}
                      className="group p-4 rounded-xl border border-neutral-200/50 hover:border-zeta-200 hover:bg-zeta-50/30 transition-all duration-200"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-zeta-500 to-zeta-600 rounded-xl flex items-center justify-center shadow-lg">
                              <span className="font-bold text-white text-lg">{token.symbol[0]}</span>
                            </div>
                            {token.isFavorite && (
                              <StarIconSolid className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1" />
                            )}
                            {token.isHidden && (
                              <EyeSlashIcon className="w-4 h-4 text-gray-400 absolute -bottom-1 -right-1" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <Link 
                                href={`/token/${token.contractAddress}`}
                                className="font-semibold text-neutral-900 text-lg group-hover:text-zeta-600 transition-colors"
                              >
                                {token.name}
                              </Link>
                              <span className="text-neutral-500 text-sm">{token.symbol}</span>
                            </div>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-neutral-600 text-sm">
                                {parseFloat(token.formattedBalance).toLocaleString()} {token.symbol}
                              </span>
                              {token.change24h && (
                                <div className={`flex items-center text-sm ${
                                  token.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {token.change24h >= 0 ? (
                                    <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
                                  ) : (
                                    <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />
                                  )}
                                  {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="font-semibold text-neutral-900 text-lg">
                              {formatPrice(token.usdValue)}
                            </div>
                            <div className="text-neutral-500 text-sm">
                              {((token.usdValue / totalValue) * 100).toFixed(1)}% of portfolio
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => toggleFavorite(token.contractAddress)}
                              className={`p-2 rounded-lg transition-colors ${
                                token.isFavorite
                                  ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              <StarIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleHidden(token.contractAddress)}
                              className={`p-2 rounded-lg transition-colors ${
                                token.isHidden
                                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {token.isHidden ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
            </>
          )}

          {/* Bridges Tab Content */}
          {activeTab === 'bridges' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-6"
            >
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-neutral-900">Cross-Chain Bridges</h3>
                  <div className="text-sm text-neutral-600">
                    Compare fees, security, and speed
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {bridges.map((bridge) => (
                    <motion.div
                      key={bridge.id}
                      className="p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group"
                      whileHover={{ scale: 1.02 }}
                      onClick={() => window.open(bridge.url, '_blank')}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-zeta-500 to-zeta-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                            {bridge.logo}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 group-hover:text-zeta-600">{bridge.name}</h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <div className={`w-2 h-2 rounded-full ${
                                bridge.security === 'high' ? 'bg-green-500' : 
                                bridge.security === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                              }`} />
                              <span className="text-xs text-gray-500 capitalize">{bridge.security} Security</span>
                            </div>
                          </div>
                        </div>
                        <ArrowTopRightOnSquareIcon className="w-5 h-5 text-gray-400 group-hover:text-zeta-600" />
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-4">{bridge.description}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">24h Volume</div>
                          <div className="font-semibold text-gray-900">{formatLargeNumber(bridge.volume24h)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">TVL</div>
                          <div className="font-semibold text-gray-900">{formatLargeNumber(bridge.tvl)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Fees</div>
                          <div className="font-semibold text-gray-900">{bridge.fees}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Speed</div>
                          <div className="font-semibold text-gray-900">{bridge.speed}</div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-500 mb-2">Supported Chains</div>
                        <div className="flex flex-wrap gap-1">
                          {bridge.supportedChains.map((chain, index) => (
                            <span key={index} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                              {chain}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Exchanges Tab Content */}
          {activeTab === 'exchanges' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-6"
            >
              {/* CEX vs DEX Toggle */}
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-neutral-900">Trading Platforms</h3>
                  <div className="flex items-center space-x-4">
                    <select
                      value={exchangeSortBy}
                      onChange={(e) => setExchangeSortBy(e.target.value as ExchangeSortOption)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-zeta-500 focus:outline-none focus:ring-1 focus:ring-zeta-500"
                    >
                      <option value="volume-desc">Volume (High to Low)</option>
                      <option value="volume-asc">Volume (Low to High)</option>
                      <option value="name-asc">Name (A to Z)</option>
                      <option value="name-desc">Name (Z to A)</option>
                      <option value="type">Type (CEX/DEX)</option>
                      <option value="security">Security Rating</option>
                    </select>
                    <div className="flex bg-gray-100 rounded-xl p-1">
                      <button className="px-4 py-2 bg-white text-zeta-600 rounded-lg font-medium shadow-sm">
                        All Exchanges
                      </button>
                      <button className="px-4 py-2 text-gray-600 hover:text-gray-900 rounded-lg font-medium">
                        CEX Only
                      </button>
                      <button className="px-4 py-2 text-gray-600 hover:text-gray-900 rounded-lg font-medium">
                        DEX Only
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortExchanges(exchanges, exchangeSortBy).map((exchange) => (
                    <motion.div
                      key={exchange.id}
                      className="p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group"
                      whileHover={{ scale: 1.02 }}
                      onClick={() => window.open(exchange.url, '_blank')}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                            {exchange.logo}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 group-hover:text-blue-600">{exchange.name}</h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                exchange.type === 'cex' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {exchange.type.toUpperCase()}
                              </span>
                              <div className={`w-2 h-2 rounded-full ${
                                exchange.security === 'high' ? 'bg-green-500' : 
                                exchange.security === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                              }`} />
                            </div>
                          </div>
                        </div>
                        <ArrowTopRightOnSquareIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-4">{exchange.description}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">24h Volume</div>
                          <div className="font-semibold text-gray-900">{formatLargeNumber(exchange.volume24h)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Trading Fees</div>
                          <div className="font-semibold text-gray-900">{exchange.fees}</div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="text-xs text-gray-500 mb-2">Features</div>
                        <div className="flex flex-wrap gap-1">
                          {exchange.features.slice(0, 3).map((feature, index) => (
                            <span key={index} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                              {feature}
                            </span>
                          ))}
                          {exchange.features.length > 3 && (
                            <span className="text-xs text-gray-500">+{exchange.features.length - 3} more</span>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-500 mb-2">Supported Networks</div>
                        <div className="flex flex-wrap gap-1">
                          {exchange.supportedChains.slice(0, 3).map((chain, index) => (
                            <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {chain}
                            </span>
                          ))}
                          {exchange.supportedChains.length > 3 && (
                            <span className="text-xs text-gray-500">+{exchange.supportedChains.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                  <div className="flex items-center space-x-3 mb-4">
                    <FireIcon className="w-8 h-8 text-orange-500" />
                    <h4 className="font-semibold text-gray-900">Highest Volume</h4>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">Binance</div>
                  <div className="text-gray-600 text-sm">{formatLargeNumber(15000000000)} 24h</div>
                </div>
                
                
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                  <div className="flex items-center space-x-3 mb-4">
                    <GlobeAltIcon className="w-8 h-8 text-blue-500" />
                    <h4 className="font-semibold text-gray-900">DEX Options</h4>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">4 Platforms</div>
                  <div className="text-gray-600 text-sm">Decentralized trading</div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}