'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
// import { getDetailedTokenInfo } from '@/lib/alchemy' // Removed unused import
import { SUPPORTED_CHAINS } from '@/config/chains'
import { searchTokens, getTokenDetails, formatTotalSupply } from '@/lib/blockscout'
import { 
  ArrowLeftIcon,
  DocumentDuplicateIcon,
  ArrowTopRightOnSquareIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Link from 'next/link'

interface TokenInfo {
  address: string
  name: string
  symbol: string
  decimals: number
  totalSupply: string | null
  price: number
  change24h: number
  volume24h: number
  marketCap: number
  marketCapRank: number | null
  allTimeHigh: number | null
  allTimeLow: number | null
  description: string
  website?: string
  twitter?: string
  telegram?: string
  discord?: string
}

export default function TokenDetailPage() {
  const params = useParams()
  const tokenAddress = params.address as string
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d' | '30d' | '90d'>('24h')

  // Token address mapping for cross-network compatibility
  const getCanonicalTokenInfo = (contractAddress: string) => {
    // Map of network-specific addresses to canonical token info
    const tokenMappings: Record<string, { symbol: string, name: string, coingeckoId?: string, mainnetAddress?: string, displayAddress?: string }> = {
      // USDC mappings
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', name: 'USD Coin', coingeckoId: 'usd-coin', displayAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
      '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238': { symbol: 'USDC', name: 'USD Coin', coingeckoId: 'usd-coin', mainnetAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', displayAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' }, // Sepolia
      '0x94a9d9ac8a22534e3faca9b9d444b32ad24d10ee': { symbol: 'USDC', name: 'USD Coin', coingeckoId: 'usd-coin', mainnetAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', displayAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' }, // Sepolia v2
      
      // USDT mappings  
      '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', name: 'Tether USD', coingeckoId: 'tether', displayAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7' },
      '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0': { symbol: 'USDT', name: 'Tether USD', coingeckoId: 'tether', mainnetAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', displayAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7' }, // Sepolia
      
      // WETH mappings
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH', name: 'Wrapped Ether', coingeckoId: 'weth', displayAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' },
      '0xfff9976782d46cc05630d1f6ebab18b2324d6b14': { symbol: 'WETH', name: 'Wrapped Ether', coingeckoId: 'weth', mainnetAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', displayAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' }, // Sepolia
      
      // Native ETH
      '0x0000000000000000000000000000000000000000': { symbol: 'ETH', name: 'Ethereum', coingeckoId: 'ethereum', displayAddress: '0x0000000000000000000000000000000000000000' },
      
      // ZETA mappings
      '0xf091867ec603a6628ed83d274e835539d82e9cc8': { symbol: 'ZETA', name: 'ZetaChain', coingeckoId: 'zetachain', displayAddress: '0xf091867ec603a6628ed83d274e835539d82e9cc8' },
      
      // DAI mappings
      '0x6b175474e89094c44da98b954eedeac495271d0f': { symbol: 'DAI', name: 'Dai Stablecoin', coingeckoId: 'dai', displayAddress: '0x6b175474e89094c44da98b954eedeac495271d0f' },
      '0xff34b3d4aee8ddcd6f9afffb6fe49bd371b8a357': { symbol: 'DAI', name: 'Dai Stablecoin', coingeckoId: 'dai', mainnetAddress: '0x6b175474e89094c44da98b954eedeac495271d0f', displayAddress: '0x6b175474e89094c44da98b954eedeac495271d0f' }, // Sepolia
      
      // LINK mappings
      '0x514910771af9ca656af840dff83e8264ecf986ca': { symbol: 'LINK', name: 'Chainlink', coingeckoId: 'chainlink', displayAddress: '0x514910771af9ca656af840dff83e8264ecf986ca' },
      '0x779877a7b0d9e8603169ddbd7836e478b4624789': { symbol: 'LINK', name: 'Chainlink', coingeckoId: 'chainlink', mainnetAddress: '0x514910771af9ca656af840dff83e8264ecf986ca', displayAddress: '0x514910771af9ca656af840dff83e8264ecf986ca' }, // Sepolia
    }

    return tokenMappings[contractAddress.toLowerCase()] || null
  }

  // Fetch comprehensive token data from multiple sources
  const fetchComprehensiveTokenData = useCallback(async (contractAddress: string) => {
    let tokenData = null
    let marketData = null

    // First check if we have a canonical mapping for this address
    const canonicalInfo = getCanonicalTokenInfo(contractAddress)

    if (canonicalInfo?.coingeckoId) {
      try {
        // Fetch from CoinGecko using the coin ID
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${canonicalInfo.coingeckoId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`)
        if (response.ok) {
          const data = await response.json()
          return {
            tokenData: {
              name: canonicalInfo.name,
              symbol: canonicalInfo.symbol,
              decimals: 18 // Default, will be overridden if we can get it from blockchain
            },
            marketData: {
              price: data.market_data?.current_price?.usd || 0,
              change24h: data.market_data?.price_change_percentage_24h || 0,
              volume24h: data.market_data?.total_volume?.usd || 0,
              marketCap: data.market_data?.market_cap?.usd || 0,
              marketCapRank: data.market_cap_rank || null,
              allTimeHigh: data.market_data?.ath?.usd || null,
              allTimeLow: data.market_data?.atl?.usd || null,
              totalSupply: data.market_data?.total_supply?.toString() || null,
              description: data.description?.en || null,
              logo: data.image?.large
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching ${canonicalInfo.coingeckoId} from CoinGecko:`, error)
      }
    }

    // Try to get token info from CoinGecko by contract address (mainnet only)
    const addressToTry = canonicalInfo?.mainnetAddress || contractAddress
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/ethereum/contract/${addressToTry}`)
      if (response.ok) {
        const data = await response.json()
        marketData = {
          price: data.market_data?.current_price?.usd || 0,
          change24h: data.market_data?.price_change_percentage_24h || 0,
          volume24h: data.market_data?.total_volume?.usd || 0,
          marketCap: data.market_data?.market_cap?.usd || 0,
          marketCapRank: data.market_cap_rank || null,
          allTimeHigh: data.market_data?.ath?.usd || null,
          allTimeLow: data.market_data?.atl?.usd || null,
          totalSupply: data.market_data?.total_supply?.toString() || null,
          description: data.description?.en || null,
          logo: data.image?.large
        }
        tokenData = {
          name: data.name,
          symbol: data.symbol?.toUpperCase(),
          decimals: data.detail_platforms?.ethereum?.decimal_place || 18
        }
      }
    } catch (error) {
      console.error('Error fetching from CoinGecko by contract address:', error)
    }

    // If CoinGecko failed, try Blockscout with enhanced data
    if (!tokenData && contractAddress !== '0x0000000000000000000000000000000000000000') {
      try {
        // First try to get detailed token information
        let token = await getTokenDetails(contractAddress)
        
        // Fallback to search if direct lookup fails
        if (!token) {
          const blockscoutTokens = await searchTokens(contractAddress)
          if (blockscoutTokens.length > 0) {
            token = blockscoutTokens[0]
          }
        }
        
        if (token) {
          tokenData = {
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals
          }
          
          // Parse and format Blockscout data properly
          const price = parseFloat(token.exchange_rate || '0')
          const marketCap = parseFloat(token.circulating_market_cap || '0')
          const volume24h = parseFloat(token.volume_24h || '0')
          const formattedTotalSupply = formatTotalSupply(token.total_supply, token.decimals)
          
          marketData = {
            price: isNaN(price) ? 0 : price,
            change24h: 0, // Not available in Blockscout
            volume24h: isNaN(volume24h) ? 0 : volume24h,
            marketCap: isNaN(marketCap) ? 0 : marketCap,
            marketCapRank: null,
            allTimeHigh: null,
            allTimeLow: null,
            totalSupply: formattedTotalSupply || null,
            description: null,
            logo: token.icon_url
          }
        }
      } catch (error) {
        console.error('Error fetching from Blockscout:', error)
      }
    }

    // Try blockchain metadata as fallback
    if (!tokenData) {
      for (const chain of SUPPORTED_CHAINS) {
        if (chain.supportedBy === 'alchemy') {
          try {
            const response = await fetch(chain.rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'alchemy_getTokenMetadata',
                params: [contractAddress],
                id: 1
              })
            })

            if (response.ok) {
              const data = await response.json()
              if (data.result && data.result.name) {
                tokenData = data.result
                break
              }
            }
          } catch (error) {
            console.error('Error fetching token metadata:', error)
          }
        }
      }
    }

    return { tokenData, marketData }
  }, [])

  useEffect(() => {
    const fetchTokenInfo = async () => {
      setIsLoading(true)
      
      try {
        
        // Handle ZetaChain-specific tokens first
        if (tokenAddress === '0xf091867ec603a6628ed83d274e835539d82e9cc8') {
          // Force fetch ZETA data from CoinGecko
          try {
            const response = await fetch('https://api.coingecko.com/api/v3/coins/zetachain?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false')
            if (response.ok) {
              const data = await response.json()
              setTokenInfo({
                address: '0xf091867ec603a6628ed83d274e835539d82e9cc8',
                name: 'ZetaChain',
                symbol: 'ZETA',
                decimals: 18,
                totalSupply: data.market_data?.total_supply?.toString() || null,
                price: data.market_data?.current_price?.usd || 0,
                change24h: data.market_data?.price_change_percentage_24h || 0,
                volume24h: data.market_data?.total_volume?.usd || 0,
                marketCap: data.market_data?.market_cap?.usd || 0,
                marketCapRank: data.market_cap_rank || null,
                allTimeHigh: data.market_data?.ath?.usd || null,
                allTimeLow: data.market_data?.atl?.usd || null,
                description: data.description?.en || 'ZetaChain is a foundational, public blockchain that enables omnichain, generic smart contracts and messaging between any blockchain.',
                website: 'https://www.zetachain.com',
                twitter: 'https://twitter.com/zetablockchain',
                telegram: 'https://t.me/zetachainofficial',
                discord: 'https://discord.gg/zetachain'
              })
              return
            }
          } catch (error) {
            console.error('Error fetching ZETA data:', error)
          }
        }
        
        // Use the canonical token system for all other tokens
        const canonicalInfo = getCanonicalTokenInfo(tokenAddress)
        if (canonicalInfo) {
          // We have a canonical token, so use the comprehensive data fetching
          const result = await fetchComprehensiveTokenData(tokenAddress)
          
          if (result && result.tokenData && result.marketData) {
            const finalTokenInfo: TokenInfo = {
              address: canonicalInfo.displayAddress || tokenAddress,
              name: result.tokenData.name,
              symbol: result.tokenData.symbol,
              decimals: result.tokenData.decimals,
              totalSupply: result.marketData.totalSupply ? 
                (isNaN(Number(result.marketData.totalSupply)) ? result.marketData.totalSupply : Number(result.marketData.totalSupply).toLocaleString()) : 
                null,
              price: result.marketData.price || 0,
              change24h: result.marketData.change24h || 0,
              volume24h: result.marketData.volume24h || 0,
              marketCap: result.marketData.marketCap || 0,
              marketCapRank: result.marketData.marketCapRank || null,
              allTimeHigh: result.marketData.allTimeHigh || null,
              allTimeLow: result.marketData.allTimeLow || null,
              description: result.marketData.description || getTokenDescription(result.tokenData.symbol),
              website: getTokenWebsite(result.tokenData.symbol),
              twitter: getTokenTwitter(result.tokenData.symbol),
              telegram: getTokenTelegram(result.tokenData.symbol),
              discord: getTokenDiscord(result.tokenData.symbol)
            }
            
            setTokenInfo(finalTokenInfo)
            return
          }
        }

        // Fetch comprehensive token data
        const result = await fetchComprehensiveTokenData(tokenAddress)
        
        if (!result || !result.tokenData) {
          // Try to get basic token info from blockchain one more time
          let basicTokenData = null
          try {
            for (const chain of SUPPORTED_CHAINS) {
              if (chain.supportedBy === 'alchemy') {
                const response = await fetch(chain.rpcUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'alchemy_getTokenMetadata',
                    params: [tokenAddress],
                    id: 1
                  })
                })

                if (response.ok) {
                  const data = await response.json()
                  if (data.result && data.result.name) {
                    basicTokenData = data.result
                    break
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error fetching basic token metadata:', error)
          }

          // No data available anywhere - show info unavailable page
          setTokenInfo({
            address: tokenAddress,
            name: basicTokenData?.name || 'Unknown Token',
            symbol: basicTokenData?.symbol || 'UNKNOWN',
            decimals: basicTokenData?.decimals || 18,
            totalSupply: null,
            price: 0,
            change24h: 0,
            volume24h: 0,
            marketCap: 0,
            marketCapRank: null,
            allTimeHigh: null,
            allTimeLow: null,
              description: 'Information for this token is not available from our data sources.',
            website: undefined,
            twitter: undefined,
            telegram: undefined,
            discord: undefined
          })
          return
        }

        const { tokenData, marketData } = result

        // Combine token metadata with market data - no fallbacks, show null/0 when data unavailable
        const canonicalInfoForDisplay = getCanonicalTokenInfo(tokenAddress)
        const finalTokenInfo: TokenInfo = {
          address: canonicalInfoForDisplay?.displayAddress || tokenAddress,
          name: tokenData.name || 'Unknown Token',
          symbol: tokenData.symbol || 'UNKNOWN',
          decimals: tokenData.decimals || 18,
          totalSupply: marketData?.totalSupply ? 
            (isNaN(Number(marketData.totalSupply)) ? marketData.totalSupply : Number(marketData.totalSupply).toLocaleString()) : 
            null,
          price: marketData?.price || 0,
          change24h: marketData?.change24h || 0,
          volume24h: marketData?.volume24h || 0,
          marketCap: marketData?.marketCap || 0,
          marketCapRank: marketData?.marketCapRank || null,
          allTimeHigh: marketData?.allTimeHigh || null,
          allTimeLow: marketData?.allTimeLow || null,
          description: marketData?.description || getTokenDescription(tokenData.symbol),
          website: getTokenWebsite(tokenData.symbol),
          twitter: getTokenTwitter(tokenData.symbol),
          telegram: getTokenTelegram(tokenData.symbol),
          discord: getTokenDiscord(tokenData.symbol)
        }
        
        setTokenInfo(finalTokenInfo)
      } catch (error) {
        console.error('Error fetching token info:', error)
        setTokenInfo({
          address: tokenAddress,
          name: 'Error Loading Token',
          symbol: 'ERROR',
          decimals: 18,
          totalSupply: null,
          price: 0,
          change24h: 0,
          volume24h: 0,
          marketCap: 0,
          marketCapRank: null,
          allTimeHigh: null,
          allTimeLow: null,
          description: 'Data not available',
          website: undefined,
          twitter: undefined,
          telegram: undefined,
          discord: undefined
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (tokenAddress) {
      fetchTokenInfo()
    }
  }, [tokenAddress, fetchComprehensiveTokenData])

  // Helper functions to get token-specific information
  const getTokenDescription = (symbol: string): string => {
    // Only return description if we have specific knowledge, otherwise return empty string
    const descriptions: Record<string, string> = {
      'ZETA': 'ZetaChain is a foundational, public blockchain that enables omnichain, generic smart contracts and messaging between any blockchain.',
      'ETH': 'Ethereum is a decentralized, open-source blockchain with smart contract functionality.',
    }
    
    return descriptions[symbol] || ''
  }

  const getTokenWebsite = (symbol: string): string | undefined => {
    const websites: Record<string, string> = {
      'ZETA': 'https://www.zetachain.com',
      'ETH': 'https://ethereum.org',
      'USDC': 'https://www.centre.io',
      'USDT': 'https://tether.to',
      'DAI': 'https://makerdao.com',
      'WETH': 'https://weth.io',
      'UNI': 'https://uniswap.org',
      'LINK': 'https://chain.link',
      'AAVE': 'https://aave.com',
    }
    
    return websites[symbol]
  }

  const getTokenTwitter = (symbol: string): string | undefined => {
    const twitters: Record<string, string> = {
      'ZETA': 'https://twitter.com/zetablockchain',
      'ETH': 'https://twitter.com/ethereum',
      'USDC': 'https://twitter.com/centre_io',
      'USDT': 'https://twitter.com/tether_to',
      'DAI': 'https://twitter.com/makerdao',
      'UNI': 'https://twitter.com/uniswap',
      'LINK': 'https://twitter.com/chainlink',
      'AAVE': 'https://twitter.com/aaveaave',
    }
    
    return twitters[symbol]
  }

  const getTokenTelegram = (symbol: string): string | undefined => {
    const telegrams: Record<string, string> = {
      'ZETA': 'https://t.me/zetachainofficial',
      'LINK': 'https://t.me/chainlinkofficial',
      'AAVE': 'https://t.me/aavecom',
    }
    
    return telegrams[symbol]
  }

  const getTokenDiscord = (symbol: string): string | undefined => {
    const discords: Record<string, string> = {
      'ZETA': 'https://discord.gg/zetachain',
      'ETH': 'https://discord.gg/ethereum',
      'UNI': 'https://discord.gg/FCfyBSbCU5',
      'AAVE': 'https://discord.gg/CvKUrqM',
    }
    
    return discords[symbol]
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value)
  }

  const formatLargeNumber = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(2)}B`
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`
    return value.toLocaleString()
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Generate mock price history
  const generatePriceData = () => {
    const data = []
    const periods = timeframe === '1h' ? 60 : timeframe === '24h' ? 24 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
    const basePrice = tokenInfo?.price || 0.169934
    
    for (let i = periods - 1; i >= 0; i--) {
      const date = new Date()
      if (timeframe === '1h') {
        date.setMinutes(date.getMinutes() - i)
      } else if (timeframe === '24h') {
        date.setHours(date.getHours() - i)
      } else {
        date.setDate(date.getDate() - i)
      }
      
      const volatility = 0.05
      const trend = Math.sin(i * 0.1) * 0.02
      const random = (Math.random() - 0.5) * volatility
      const multiplier = 1 + trend + random
      
      const price = Math.max(basePrice * multiplier, 0)
      
      data.push({
        date: timeframe === '1h' 
          ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : timeframe === '24h'
          ? date.toLocaleTimeString('en-US', { hour: '2-digit' })
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: Math.round(price * 1000000) / 1000000,
        volume: Math.random() * 1000000
      })
    }
    
    return data
  }

  const priceData = tokenInfo ? generatePriceData() : []

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-zeta-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 border-3 border-zeta-500/30 border-t-zeta-500 rounded-full animate-spin" />
            </div>
            <p className="text-neutral-600 text-lg">Loading token information...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!tokenInfo) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ChartBarIcon className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-4">Token Not Found</h1>
            <p className="text-neutral-600 mb-8">The requested token could not be found.</p>
            <Link 
              href="/"
              className="inline-flex items-center px-6 py-3 bg-zeta-500 text-white rounded-xl font-medium hover:bg-zeta-600 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Back to Portfolio
            </Link>
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
          {/* Back Button */}
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link 
              href="/"
              className="inline-flex items-center text-zeta-600 hover:text-zeta-800 font-medium"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Back to Portfolio
            </Link>
          </motion.div>

          {/* Token Header */}
          <motion.div 
            className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gradient-to-r from-zeta-500 to-zeta-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                  {tokenInfo.symbol[0]}
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-neutral-900 mb-2">{tokenInfo.name}</h1>
                  <div className="flex items-center space-x-3">
                    <span className="text-xl text-neutral-600 font-medium">{tokenInfo.symbol}</span>
                    <button
                      onClick={() => copyToClipboard(tokenInfo.address)}
                      className="flex items-center space-x-2 text-neutral-500 hover:text-neutral-700 transition-colors"
                    >
                      <span className="font-mono text-sm">{formatAddress(tokenInfo.address)}</span>
                      {copied ? (
                        <CheckIcon className="w-4 h-4 text-green-600" />
                      ) : (
                        <DocumentDuplicateIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-4xl font-bold text-neutral-900 mb-2">
                  {formatPrice(tokenInfo.price)}
                </div>
                <div className={`flex items-center text-lg font-medium ${
                  tokenInfo.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {tokenInfo.change24h >= 0 ? (
                    <ArrowTrendingUpIcon className="w-5 h-5 mr-1" />
                  ) : (
                    <ArrowTrendingDownIcon className="w-5 h-5 mr-1" />
                  )}
                  {tokenInfo.change24h >= 0 ? '+' : ''}{tokenInfo.change24h.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { 
                  label: 'Market Cap', 
                  value: tokenInfo.marketCap > 0 ? formatLargeNumber(tokenInfo.marketCap) : 'N/A', 
                  icon: <CurrencyDollarIcon className="w-5 h-5" /> 
                },
                { 
                  label: '24h Volume', 
                  value: tokenInfo.volume24h > 0 ? formatLargeNumber(tokenInfo.volume24h) : 'N/A', 
                  icon: <ChartBarIcon className="w-5 h-5" /> 
                },
                { 
                  label: 'Total Supply', 
                  value: tokenInfo.totalSupply || 'N/A', 
                  icon: <ClockIcon className="w-5 h-5" /> 
                }
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="flex items-center justify-center mb-2 text-zeta-600">
                    {stat.icon}
                  </div>
                  <div className="text-2xl font-bold text-neutral-900 mb-1">{stat.value}</div>
                  <div className="text-sm text-neutral-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Price Chart */}
          <motion.div 
            className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-neutral-900">MOCK PRICE CHART. NOT REAL DATA</h2>
              <div className="flex items-center space-x-2">
                {(['1h', '24h', '7d', '30d', '90d'] as const).map(period => (
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
                <LineChart data={priceData}>
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
                    width={80}
                    tickFormatter={(value) => {
                      if (value >= 1000000) {
                        return `$${(value / 1000000).toFixed(1)}M`
                      } else if (value >= 1000) {
                        return `$${(value / 1000).toFixed(1)}K`
                      } else if (value >= 1) {
                        return `$${value.toFixed(2)}`
                      } else {
                        return `$${value.toFixed(6)}`
                      }
                    }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatPrice(value), 'Price']}
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#008462" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#008462' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Token Info Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* About */}
            <motion.div 
              className="lg:col-span-2 bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h3 className="text-xl font-semibold text-neutral-900 mb-4">About {tokenInfo.name}</h3>
              <p className="text-neutral-600 leading-relaxed mb-6">
                {tokenInfo.description === 'Information for this token is not available from our data sources.' ? (
                  <span className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 block">
                    <strong>⚠️ Information not available</strong><br />
                    We couldn&apos;t find market data for this token. This could be because:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>It&apos;s a testnet token</li>
                      <li>It&apos;s not listed on major exchanges</li>
                      <li>It&apos;s a custom or private token</li>
                    </ul>
                  </span>
                ) : (
                  tokenInfo.description || 'No description available for this token.'
                )}
              </p>
              
              <div className="flex flex-wrap gap-3">
                {tokenInfo.website && (
                  <a
                    href={tokenInfo.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-zeta-100 text-zeta-700 rounded-lg hover:bg-zeta-200 transition-colors"
                  >
                    <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" />
                    Website
                  </a>
                )}
                {tokenInfo.twitter && (
                  <a
                    href={tokenInfo.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Twitter
                  </a>
                )}
                {tokenInfo.telegram && (
                  <a
                    href={tokenInfo.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Telegram
                  </a>
                )}
                {tokenInfo.discord && (
                  <a
                    href={tokenInfo.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                  >
                    Discord
                  </a>
                )}
              </div>
            </motion.div>

            {/* Token Details */}
            <motion.div 
              className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <h3 className="text-xl font-semibold text-neutral-900 mb-4">Token Details</h3>
              
              <div className="space-y-4">
                {[
                  { label: 'Contract Address', value: formatAddress(tokenInfo.address) },
                  { label: 'Decimals', value: tokenInfo.decimals.toString() },
                  { label: 'Total Supply', value: tokenInfo.totalSupply || 'N/A' },
                  { label: 'Market Cap Rank', value: tokenInfo.marketCapRank ? `#${tokenInfo.marketCapRank}` : 'N/A' },
                  { label: 'All-Time High', value: tokenInfo.allTimeHigh ? formatPrice(tokenInfo.allTimeHigh) : 'N/A' },
                  { label: 'All-Time Low', value: tokenInfo.allTimeLow ? formatPrice(tokenInfo.allTimeLow) : 'N/A' }
                ].map((detail) => (
                  <div key={detail.label} className="flex justify-between items-center py-2 border-b border-neutral-100 last:border-b-0">
                    <span className="text-neutral-600 text-sm">{detail.label}</span>
                    <span className="font-medium text-neutral-900 text-sm">{detail.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}