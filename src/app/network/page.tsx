'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { fetchNetworkStats, formatNumber } from '@/lib/blockscout'
import { 
  ServerIcon,
  GlobeAltIcon,
  CpuChipIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  LinkIcon
} from '@heroicons/react/24/outline'

interface NetworkMetric {
  label: string
  value: string
  change?: string
  status: 'good' | 'warning' | 'critical'
  icon: React.ReactNode
}


export default function NetworkHealthPage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [networkStats, setNetworkStats] = useState<{
    blockHeight: number
    avgBlockTime: number
    totalTransactions: number
    totalAddresses: number
    avgTransactionFee: string
    latestBlocks: Array<{
      number: number
      hash: string
      transaction_count: number
      gas_used: string
    }>
  } | null>(null)


  // Fetch real network data
  const loadNetworkData = async () => {
    try {
      setLoading(true)
      const stats = await fetchNetworkStats()

      if (stats) {
        setNetworkStats(stats)
        
        // Create metrics array with real data
        const metrics: NetworkMetric[] = [
          {
            label: 'Block Height',
            value: formatNumber(stats.blockHeight),
            status: 'good',
            icon: <CpuChipIcon className="w-6 h-6" />
          },
          {
            label: 'Average Block Time',
            value: `${stats.avgBlockTime.toFixed(1)}s`,
            status: stats.avgBlockTime < 10 ? 'good' : 'warning',
            icon: <ClockIcon className="w-6 h-6" />
          },
          {
            label: 'Total Transactions',
            value: formatNumber(stats.totalTransactions),
            status: 'good',
            icon: <ArrowPathIcon className="w-6 h-6" />
          },
          {
            label: 'Active Addresses',
            value: formatNumber(stats.totalAddresses),
            status: 'good',
            icon: <GlobeAltIcon className="w-6 h-6" />
          },
          {
            label: 'Avg Transaction Fee',
            value: stats.avgTransactionFee,
            status: 'good',
            icon: <CurrencyDollarIcon className="w-6 h-6" />
          }
        ]


        setNetworkMetrics(metrics)
      }
    } catch (error) {
      console.error('Error loading network data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load initial data
  useEffect(() => {
    loadNetworkData()
  }, [])

  // Update time and refresh data periodically
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Refresh network data every 30 seconds
    const dataTimer = setInterval(() => {
      loadNetworkData()
    }, 30000)

    return () => {
      clearInterval(timer)
      clearInterval(dataTimer)
    }
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircleIcon className="w-4 h-4" />
      case 'warning': return <ExclamationTriangleIcon className="w-4 h-4" />
      case 'critical': return <ExclamationTriangleIcon className="w-4 h-4" />
      default: return <CheckCircleIcon className="w-4 h-4" />
    }
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-zeta-600 to-zeta-800 bg-clip-text text-transparent mb-2">
                  ZetaChain Network Health
                </h1>
                <p className="text-neutral-600">Real-time network status and validator information</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-neutral-500">Last Updated</div>
                <div className="text-lg font-semibold text-neutral-900">
                  {currentTime.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Network Status Overview */}
          <motion.div 
            className="bg-gradient-to-r from-zeta-500 to-zeta-600 rounded-2xl p-6 mb-8 text-white shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <CheckCircleIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Network Status: Operational</h2>
                  <p className="text-zeta-100">All systems functioning normally</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Live</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold">
                  {loading ? '...' : networkStats ? formatNumber(networkStats.totalTransactions) : '0'}
                </div>
                <div className="text-zeta-100 text-sm">Total Transactions</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold">
                  {loading ? '...' : networkStats ? formatNumber(networkStats.blockHeight) : '0'}
                </div>
                <div className="text-zeta-100 text-sm">Current Block Height</div>
              </div>
            </div>
          </motion.div>

          {/* Network Metrics Grid */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {networkMetrics.map((metric, index) => (
              <motion.div 
                key={metric.label}
                className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-zeta-600">{metric.icon}</div>
                  <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(metric.status)}`}>
                    {getStatusIcon(metric.status)}
                    <span className="ml-1">{metric.status}</span>
                  </div>
                </div>
                
                <div className="text-2xl font-bold text-neutral-900 mb-1">{metric.value}</div>
                <div className="text-sm text-neutral-600 mb-2">{metric.label}</div>
                
                {metric.change && (
                  <div className="flex items-center text-xs">
                    <ArrowTrendingUpIcon className="w-3 h-3 mr-1 text-green-600" />
                    <span className="text-green-600 font-medium">{metric.change}</span>
                    <span className="text-neutral-500 ml-1">vs 24h ago</span>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* Network Information Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Network Info */}
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {/* Chain Information */}
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center">
                  <LinkIcon className="w-5 h-5 mr-2 text-zeta-600" />
                  Chain Information
                </h3>
                
                <div className="space-y-3">
                  {[
                    { label: 'Chain ID', value: 'zetachain_7000-1' },
                    { label: 'Genesis Time', value: 'Feb 1, 2024' },
                    { label: 'Consensus', value: 'Tendermint' },
                    { label: 'Block Explorer', value: 'ZetaScan', link: true }
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center py-2 border-b border-neutral-100 last:border-b-0">
                      <span className="text-neutral-600 text-sm">{item.label}</span>
                      <span className={`font-medium text-sm ${item.link ? 'text-zeta-600 hover:text-zeta-700 cursor-pointer' : 'text-neutral-900'}`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>

            {/* Additional Network Statistics */}
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {/* Latest Blocks */}
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center">
                  <ServerIcon className="w-5 h-5 mr-2 text-zeta-600" />
                  Latest Blocks
                </h3>
                
                <div className="space-y-3">
                  {networkStats?.latestBlocks?.slice(0, 5).map((block) => (
                    <div key={block.hash} className="flex justify-between items-center p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                      <div>
                        <div className="font-semibold text-neutral-900">#{block.number}</div>
                        <div className="text-sm text-neutral-600">{block.transaction_count} txns</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-neutral-600">Gas Used</div>
                        <div className="font-medium text-neutral-900">{formatNumber(parseInt(block.gas_used || '0'))}</div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-4 text-neutral-500">
                      {loading ? 'Loading blocks...' : 'No block data available'}
                    </div>
                  )}
                </div>
              </div>

              {/* Network Explorer Links */}
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center">
                  <LinkIcon className="w-5 h-5 mr-2 text-zeta-600" />
                  Explorer Links
                </h3>
                
                <div className="space-y-3">
                  <button 
                    onClick={() => window.open('https://explorer.zetachain.com', '_blank')}
                    className="w-full flex items-center justify-between p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors text-left"
                  >
                    <span className="font-medium text-neutral-900">ZetaChain Explorer</span>
                    <span className="text-zeta-600">→</span>
                  </button>
                  <button 
                    onClick={() => window.open('https://zetachain.blockscout.com', '_blank')}
                    className="w-full flex items-center justify-between p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors text-left"
                  >
                    <span className="font-medium text-neutral-900">Blockscout Explorer</span>
                    <span className="text-zeta-600">→</span>
                  </button>
                  <button 
                    onClick={() => window.open('https://explorer.zetachain.com/validators', '_blank')}
                    className="w-full flex items-center justify-between p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors text-left"
                  >
                    <span className="font-medium text-neutral-900">View Validators</span>
                    <span className="text-zeta-600">→</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}