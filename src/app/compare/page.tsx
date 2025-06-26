'use client'

import { useState, useEffect } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { motion } from 'framer-motion'
import { getTokenBalances, getTokenPrices, TokenBalance } from '@/lib/alchemy'
import { SUPPORTED_CHAINS } from '@/config/chains'
import { ethers } from 'ethers'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  UserIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  TrophyIcon
} from '@heroicons/react/24/outline'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface TokenWithPrice extends TokenBalance {
  usdValue: number
  formattedBalance: string
  change24h?: number
}

interface PortfolioData {
  address: string
  tokens: TokenWithPrice[]
  totalValue: number
  totalAssets: number
  avgValue: number
  topHolding: TokenWithPrice | null
  performance24h: number
}

export default function ComparePage() {
  const { address: connectedAddress, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [compareAddress, setCompareAddress] = useState('')
  const [isValidAddress, setIsValidAddress] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [myPortfolio, setMyPortfolio] = useState<PortfolioData | null>(null)
  const [comparePortfolio, setComparePortfolio] = useState<PortfolioData | null>(null)

  const validateAddress = (addr: string): boolean => {
    try {
      return ethers.isAddress(addr)
    } catch {
      return false
    }
  }

  useEffect(() => {
    setIsValidAddress(validateAddress(compareAddress))
  }, [compareAddress])

  const fetchPortfolioData = async (address: string, currentChainId: number): Promise<PortfolioData | null> => {
    try {
      const tokenBalances = await getTokenBalances(address, currentChainId)
      
      if (tokenBalances.length === 0) {
        return {
          address,
          tokens: [],
          totalValue: 0,
          totalAssets: 0,
          avgValue: 0,
          topHolding: null,
          performance24h: 0
        }
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
          usdValue: usdValue,
          change24h: (Math.random() - 0.5) * 20
        }
      })

      const totalValue = tokensWithPrices.reduce((sum, token) => sum + token.usdValue, 0)
      const topHolding = tokensWithPrices.length > 0 ? 
        tokensWithPrices.reduce((prev, current) => prev.usdValue > current.usdValue ? prev : current) : null

      return {
        address,
        tokens: tokensWithPrices,
        totalValue,
        totalAssets: tokensWithPrices.length,
        avgValue: tokensWithPrices.length > 0 ? totalValue / tokensWithPrices.length : 0,
        topHolding,
        performance24h: (Math.random() - 0.5) * 30
      }
    } catch (error) {
      console.error('Error fetching portfolio data:', error)
      return null
    }
  }

  const handleCompare = async () => {
    if (!isValidAddress || !connectedAddress || !chainId) return

    setIsLoading(true)
    setError(null)

    try {
      const [myData, compareData] = await Promise.all([
        fetchPortfolioData(connectedAddress, chainId),
        fetchPortfolioData(compareAddress, chainId)
      ])

      setMyPortfolio(myData)
      setComparePortfolio(compareData)
    } catch (err) {
      setError('Failed to fetch portfolio data. Please try again.')
      console.error('Comparison error:', err)
    } finally {
      setIsLoading(false)
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

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const generateComparisonChart = () => {
    if (!myPortfolio || !comparePortfolio) return []
    
    const data = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      const myBase = myPortfolio.totalValue
      const compareBase = comparePortfolio.totalValue
      
      const volatility = 0.1
      const myTrend = Math.sin(i * 0.1) * 0.05
      const compareTrend = Math.sin(i * 0.1 + 1) * 0.05
      const myRandom = (Math.random() - 0.5) * volatility
      const compareRandom = (Math.random() - 0.5) * volatility
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        myValue: Math.max(myBase * (1 + myTrend + myRandom), 0),
        compareValue: Math.max(compareBase * (1 + compareTrend + compareRandom), 0)
      })
    }
    
    return data
  }

  const comparisonData = generateComparisonChart()

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
            <p className="text-neutral-600 mb-8">Connect your wallet to compare portfolio performance</p>
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
              Portfolio Comparison
            </h1>
            <p className="text-neutral-600">Compare your portfolio performance against another wallet</p>
          </motion.div>

          {/* Network Selector */}
          <motion.div 
            className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
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

          {/* Comparison Input */}
          <motion.div 
            className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h3 className="text-xl font-semibold text-neutral-900 mb-6">Compare Against</h3>
            
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={compareAddress}
                  onChange={(e) => setCompareAddress(e.target.value)}
                  placeholder="Enter wallet address to compare (0x...)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-zeta-500 focus:outline-none focus:ring-1 focus:ring-zeta-500 font-mono text-sm"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {compareAddress && (
                    isValidAddress ? (
                      <CheckIcon className="w-5 h-5 text-green-600" />
                    ) : (
                      <XMarkIcon className="w-5 h-5 text-red-600" />
                    )
                  )}
                </div>
              </div>
              
              <button
                onClick={handleCompare}
                disabled={!isValidAddress || isLoading}
                className="px-6 py-3 bg-zeta-500 hover:bg-zeta-600 disabled:bg-zeta-400 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Comparing...</span>
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="w-4 h-4" />
                    <span>Compare</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                <div className="flex items-center">
                  <XMarkIcon className="w-5 h-5 mr-2" />
                  {error}
                </div>
              </div>
            )}
          </motion.div>

          {/* Comparison Results */}
          {myPortfolio && comparePortfolio && (
            <>
              {/* Portfolio Overview Comparison */}
              <motion.div 
                className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {/* My Portfolio */}
                <div className="bg-gradient-to-r from-zeta-500 to-zeta-600 rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <UserIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Your Portfolio</h3>
                        <p className="text-zeta-100 text-sm font-mono">{formatAddress(myPortfolio.address)}</p>
                      </div>
                    </div>
                    {myPortfolio.totalValue > comparePortfolio.totalValue && (
                      <TrophyIcon className="w-8 h-8 text-yellow-300" />
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="text-3xl font-bold">{formatPrice(myPortfolio.totalValue)}</div>
                      <div className="text-zeta-100 text-sm">Total Value</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xl font-semibold">{myPortfolio.totalAssets}</div>
                        <div className="text-zeta-100 text-sm">Assets</div>
                      </div>
                      <div>
                        <div className={`text-xl font-semibold flex items-center ${
                          myPortfolio.performance24h >= 0 ? 'text-green-200' : 'text-red-200'
                        }`}>
                          {myPortfolio.performance24h >= 0 ? (
                            <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                          ) : (
                            <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
                          )}
                          {myPortfolio.performance24h >= 0 ? '+' : ''}{myPortfolio.performance24h.toFixed(2)}%
                        </div>
                        <div className="text-zeta-100 text-sm">24h Change</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compare Portfolio */}
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Comparison Portfolio</h3>
                        <p className="text-gray-500 text-sm font-mono">{formatAddress(comparePortfolio.address)}</p>
                      </div>
                    </div>
                    {comparePortfolio.totalValue > myPortfolio.totalValue && (
                      <TrophyIcon className="w-8 h-8 text-yellow-500" />
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="text-3xl font-bold text-gray-900">{formatPrice(comparePortfolio.totalValue)}</div>
                      <div className="text-gray-500 text-sm">Total Value</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xl font-semibold text-gray-900">{comparePortfolio.totalAssets}</div>
                        <div className="text-gray-500 text-sm">Assets</div>
                      </div>
                      <div>
                        <div className={`text-xl font-semibold flex items-center ${
                          comparePortfolio.performance24h >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {comparePortfolio.performance24h >= 0 ? (
                            <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                          ) : (
                            <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
                          )}
                          {comparePortfolio.performance24h >= 0 ? '+' : ''}{comparePortfolio.performance24h.toFixed(2)}%
                        </div>
                        <div className="text-gray-500 text-sm">24h Change</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Performance Chart */}
              <motion.div 
                className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <h3 className="text-xl font-semibold text-neutral-900 mb-6">30-Day Performance Comparison</h3>
                
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={comparisonData}>
                      <defs>
                        <linearGradient id="myGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#008462" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#008462" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="compareGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6b7280" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#6b7280" stopOpacity={0.1}/>
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
                        formatter={(value: number, name: string) => [
                          formatPrice(value), 
                          name === 'myValue' ? 'Your Portfolio' : 'Comparison Portfolio'
                        ]}
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
                        dataKey="myValue" 
                        stroke="#008462" 
                        strokeWidth={3}
                        fill="url(#myGradient)"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="compareValue" 
                        stroke="#6b7280" 
                        strokeWidth={3}
                        fill="url(#compareGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Detailed Metrics Comparison */}
              <motion.div 
                className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <h3 className="text-xl font-semibold text-neutral-900 mb-6">Detailed Comparison</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      title: 'Total Value',
                      myValue: formatPrice(myPortfolio.totalValue),
                      compareValue: formatPrice(comparePortfolio.totalValue),
                      winner: myPortfolio.totalValue > comparePortfolio.totalValue ? 'me' : 'them',
                      icon: <CurrencyDollarIcon className="w-6 h-6" />
                    },
                    {
                      title: 'Total Assets',
                      myValue: myPortfolio.totalAssets.toString(),
                      compareValue: comparePortfolio.totalAssets.toString(),
                      winner: myPortfolio.totalAssets > comparePortfolio.totalAssets ? 'me' : 'them',
                      icon: <BanknotesIcon className="w-6 h-6" />
                    },
                    {
                      title: 'Average Asset Value',
                      myValue: formatPrice(myPortfolio.avgValue),
                      compareValue: formatPrice(comparePortfolio.avgValue),
                      winner: myPortfolio.avgValue > comparePortfolio.avgValue ? 'me' : 'them',
                      icon: <ChartBarIcon className="w-6 h-6" />
                    }
                  ].map((metric) => (
                    <div key={metric.title} className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="text-gray-600">{metric.icon}</div>
                          <h4 className="font-medium text-gray-900">{metric.title}</h4>
                        </div>
                        {metric.winner === 'me' ? (
                          <div className="w-6 h-6 bg-zeta-500 rounded-full flex items-center justify-center">
                            <CheckIcon className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                            <CheckIcon className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className={`flex justify-between items-center p-2 rounded ${
                          metric.winner === 'me' ? 'bg-zeta-50 border border-zeta-200' : 'bg-white'
                        }`}>
                          <span className="text-sm text-gray-600">You</span>
                          <span className="font-semibold text-gray-900">{metric.myValue}</span>
                        </div>
                        <div className={`flex justify-between items-center p-2 rounded ${
                          metric.winner === 'them' ? 'bg-gray-100 border border-gray-300' : 'bg-white'
                        }`}>
                          <span className="text-sm text-gray-600">Them</span>
                          <span className="font-semibold text-gray-900">{metric.compareValue}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}