'use client'

import { useState, useEffect } from 'react'
import { useChainId } from 'wagmi'
import { motion } from 'framer-motion'
import { TokenPrice } from '@/lib/alchemy'
import { 
  fetchZetaTokens
} from '@/lib/zetachain-api'
import { formatTotalSupply } from '@/lib/blockscout'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BanknotesIcon,
  MagnifyingGlassIcon,
  BuildingLibraryIcon,
  GlobeAltIcon,
  FireIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'

interface TopAsset extends TokenPrice {
  id: string
  name: string
  rank: number
  logo?: string
  totalSupply?: string
  decimals?: number
}

type ExchangeSortOption = 'volume-desc' | 'volume-asc' | 'name-asc' | 'name-desc' | 'type' | 'security'
type TabOption = 'assets' | 'exchanges'


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
  const chainId = useChainId()
  const [topAssets, setTopAssets] = useState<TopAsset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<TopAsset[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [exchangeSortBy, setExchangeSortBy] = useState<ExchangeSortOption>('volume-desc')
  const [activeTab, setActiveTab] = useState<TabOption>('assets')
  
  // Real API data state
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)

  // Fetch real ZetaChain tokens from Blockscout API
  const fetchTokensData = async () => {
    setIsLoadingTokens(true)
    try {
      const tokens = await fetchZetaTokens()
      // Store tokens for potential future use
      
      // Convert to TopAsset format for compatibility with proper formatting
      const assets: TopAsset[] = tokens.map((token, index) => {
        const price = parseFloat(token.exchange_rate || '0')
        const marketCap = parseFloat(token.circulating_market_cap || '0')
        
        return {
          id: token.address,
          symbol: token.symbol,
          name: token.name,
          rank: index + 1,
          price: isNaN(price) ? 0 : price,
          marketCap: isNaN(marketCap) ? 0 : marketCap,
          volume24h: 0, // Not available in Blockscout API
          change24h: 0, // Not available in Blockscout API
          logo: token.icon_url,
          // Store raw total supply for potential display
          totalSupply: token.total_supply,
          decimals: token.decimals
        }
      })

      // Get additional market data from CoinGecko for ZETA token
      try {
        const zetaIndex = assets.findIndex(token => 
          token.symbol === 'ZETA' || 
          token.name.toLowerCase().includes('zetachain') ||
          token.id === '0x0000000000000000000000000000000000000000' ||
          token.id === '0xf091867ec603a6628ed83d274e835539d82e9cc8'
        )
        
        if (zetaIndex !== -1) {
          // Fetch ZETA market data from CoinGecko API directly
          const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=zetachain&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true')
          if (response.ok) {
            const zetaData = await response.json()
            const zetaInfo = zetaData.zetachain
            
            if (zetaInfo) {
              assets[zetaIndex].price = zetaInfo.usd || assets[zetaIndex].price
              assets[zetaIndex].marketCap = zetaInfo.usd_market_cap || assets[zetaIndex].marketCap
              assets[zetaIndex].volume24h = zetaInfo.usd_24h_vol || 0
              assets[zetaIndex].change24h = zetaInfo.usd_24h_change || 0
            }
          }
        }
      } catch (error) {
        console.warn('Failed to fetch ZETA market data from CoinGecko:', error)
      }

      // Ensure ZETA native token is always at the top of the list
      const sortedAssets = [...assets]
      
      // Find ZETA token (native token should have address 0x0000... or specific known address)
      const zetaIndex = sortedAssets.findIndex(token => 
        token.symbol === 'ZETA' || 
        token.name.toLowerCase().includes('zetachain') ||
        token.id === '0x0000000000000000000000000000000000000000' ||
        token.id === '0xf091867ec603a6628ed83d274e835539d82e9cc8'
      )
      
      if (zetaIndex > 0) {
        // Move ZETA to the front and adjust ranks
        const zetaToken = sortedAssets.splice(zetaIndex, 1)[0]
        zetaToken.rank = 1
        sortedAssets.unshift(zetaToken)
        
        // Adjust ranks for remaining tokens
        sortedAssets.forEach((token, index) => {
          if (index > 0) {
            token.rank = index + 1
          }
        })
      }
      
      setTopAssets(sortedAssets)
    } catch (error) {
      console.error('Error fetching ZetaChain tokens:', error)
    } finally {
      setIsLoadingTokens(false)
    }
  }
  


  useEffect(() => {
    // Fetch all data on component mount
    fetchTokensData()
  }, [chainId])

  // Filter assets by search only
  useEffect(() => {
    const filtered = topAssets.filter(asset => {
      // Search filter only
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return asset.name.toLowerCase().includes(query) || 
               asset.symbol.toLowerCase().includes(query)
      }
      return true
    })

    setFilteredAssets(filtered)
  }, [topAssets, searchQuery])


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


  // Keep exchange data as it's helpful
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

  // Remove wallet connection requirement for asset discovery

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
              Explore
            </h1>
            <p className="text-neutral-600">Discover top ZetaChain assets and explore exchanges</p>
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
                { id: 'assets', label: 'Assets', icon: <BanknotesIcon className="w-5 h-5" />, description: 'Top ZetaChain tokens' },
                { id: 'exchanges', label: 'Exchanges', icon: <BuildingLibraryIcon className="w-5 h-5" />, description: 'Trading platforms' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabOption)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-4 rounded-xl font-medium transition-all duration-200 ${
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


          {/* Assets Tab Content */}
          {activeTab === 'assets' && (
            <>

          {/* Search */}
          <motion.div 
            className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search top assets by name or symbol..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:border-zeta-500 focus:outline-none focus:ring-1 focus:ring-zeta-500 text-sm"
              />
            </div>
          </motion.div>

          {/* Assets List */}
          <motion.div 
            className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="p-6 border-b border-neutral-200/50">
              <h3 className="text-xl font-semibold text-neutral-900">Top Assets</h3>
            </div>
            
            <div className="p-6">
              {isLoadingTokens ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-zeta-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="w-8 h-8 border-3 border-zeta-500/30 border-t-zeta-500 rounded-full animate-spin" />
                  </div>
                  <p className="text-neutral-600 text-lg">Loading top assets...</p>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BanknotesIcon className="w-8 h-8 text-neutral-400" />
                  </div>
                  <p className="text-neutral-600 text-lg">
                    {searchQuery ? 'No assets match your search' : 'No assets found'}
                  </p>
                  <p className="text-neutral-500 text-sm mt-2">
                    {searchQuery ? 'Try adjusting your search term' : 'Try switching to a different network'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAssets.map((asset, index) => (
                    <Link href={`/token/${asset.id}`} key={`${asset.id}-${index}`}>
                      <motion.div
                        className="group p-4 rounded-xl border border-neutral-200/50 hover:border-zeta-200 hover:bg-zeta-50/30 transition-all duration-200 cursor-pointer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center text-sm font-bold text-neutral-600">
                              #{asset.rank}
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-zeta-500 to-zeta-600 rounded-xl flex items-center justify-center shadow-lg">
                              <span className="font-bold text-white text-lg">{asset.symbol[0]}</span>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-neutral-900 text-lg group-hover:text-zeta-600 transition-colors">
                                {asset.name}
                              </span>
                              <span className="text-neutral-500 text-sm font-medium">{asset.symbol}</span>
                            </div>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-neutral-600 text-sm">
                                Market Cap: {formatLargeNumber(asset.marketCap || 0)}
                              </span>
                              {asset.change24h !== undefined && (
                                <div className={`flex items-center text-sm ${
                                  asset.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {asset.change24h >= 0 ? (
                                    <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
                                  ) : (
                                    <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />
                                  )}
                                  {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="font-semibold text-neutral-900 text-lg">
                              {formatPrice(asset.price)}
                            </div>
                            <div className="text-neutral-500 text-sm">
                              24h Vol: {formatLargeNumber(asset.volume24h || 0)}
                            </div>
                          </div>
                          
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowTopRightOnSquareIcon className="w-5 h-5 text-neutral-400" />
                          </div>
                        </div>
                      </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
            </>
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