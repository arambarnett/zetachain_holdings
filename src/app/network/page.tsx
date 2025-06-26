'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { 
  ServerIcon,
  GlobeAltIcon,
  CpuChipIcon,
  ClockIcon,
  ShieldCheckIcon,
  BoltIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  UsersIcon,
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

interface Validator {
  name: string
  stake: string
  commission: string
  uptime: string
  status: 'active' | 'inactive' | 'jailed'
}

export default function NetworkHealthPage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetric[]>([
    {
      label: 'Block Height',
      value: '2,847,291',
      change: '+1.2%',
      status: 'good',
      icon: <CpuChipIcon className="w-6 h-6" />
    },
    {
      label: 'Average Block Time',
      value: '6.2s',
      change: '-0.3s',
      status: 'good', 
      icon: <ClockIcon className="w-6 h-6" />
    },
    {
      label: 'Total Validators',
      value: '104',
      change: '+2',
      status: 'good',
      icon: <ServerIcon className="w-6 h-6" />
    },
    {
      label: 'Network Uptime',
      value: '99.97%',
      change: '+0.01%',
      status: 'good',
      icon: <ShieldCheckIcon className="w-6 h-6" />
    },
    {
      label: 'Active Connections',
      value: '8,942',
      change: '+5.2%',
      status: 'good',
      icon: <GlobeAltIcon className="w-6 h-6" />
    },
    {
      label: 'Total Supply',
      value: '2.1B ZETA',
      change: '+0.1%',
      status: 'good',
      icon: <CurrencyDollarIcon className="w-6 h-6" />
    },
    {
      label: 'Staked Tokens',
      value: '1.2B ZETA',
      change: '+2.1%',
      status: 'good',
      icon: <BoltIcon className="w-6 h-6" />
    },
    {
      label: 'Gas Price',
      value: '0.004 ZETA',
      change: '-2.1%',
      status: 'good',
      icon: <ArrowPathIcon className="w-6 h-6" />
    }
  ])

  const topValidators: Validator[] = [
    { name: 'ZetaChain Foundation', stake: '15.2M ZETA', commission: '5%', uptime: '99.99%', status: 'active' },
    { name: 'Cosmos Hub Validator', stake: '12.8M ZETA', commission: '7%', uptime: '99.95%', status: 'active' },
    { name: 'Staking Rewards', stake: '11.4M ZETA', commission: '6%', uptime: '99.92%', status: 'active' },
    { name: 'Validator One', stake: '10.9M ZETA', commission: '8%', uptime: '99.88%', status: 'active' },
    { name: 'Chain Security', stake: '9.7M ZETA', commission: '5%', uptime: '99.94%', status: 'active' },
    { name: 'Node Guardians', stake: '8.3M ZETA', commission: '9%', uptime: '99.85%', status: 'active' },
    { name: 'Block Producer', stake: '7.1M ZETA', commission: '7%', uptime: '99.91%', status: 'active' },
    { name: 'Secure Staking', stake: '6.8M ZETA', commission: '6%', uptime: '99.89%', status: 'active' }
  ]

  // Simulate real-time updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
      
      // Simulate minor metric updates
      setNetworkMetrics(prev => prev.map(metric => {
        if (Math.random() < 0.3) { // 30% chance to update
          let newValue = metric.value
          if (metric.label === 'Block Height') {
            const current = parseInt(metric.value.replace(/,/g, ''))
            newValue = (current + Math.floor(Math.random() * 3) + 1).toLocaleString()
          } else if (metric.label === 'Average Block Time') {
            const variation = (Math.random() - 0.5) * 0.2
            const current = parseFloat(metric.value.replace('s', ''))
            newValue = `${Math.max(5.0, current + variation).toFixed(1)}s`
          }
          return { ...metric, value: newValue }
        }
        return metric
      }))
    }, 5000) // Update every 5 seconds

    return () => clearInterval(timer)
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

  const getValidatorStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'jailed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold">2.1B+</div>
                <div className="text-zeta-100 text-sm">Total Value Secured</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">104</div>
                <div className="text-zeta-100 text-sm">Active Validators</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">99.97%</div>
                <div className="text-zeta-100 text-sm">Network Uptime</div>
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

          {/* Validators Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Top Validators */}
            <motion.div 
              className="lg:col-span-2 bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-neutral-900 flex items-center">
                  <ServerIcon className="w-5 h-5 mr-2 text-zeta-600" />
                  Top Validators
                </h3>
                <button className="text-zeta-600 hover:text-zeta-700 text-sm font-medium transition-colors">
                  View All →
                </button>
              </div>
              
              <div className="space-y-3">
                {topValidators.map((validator, index) => (
                  <div key={validator.name} className="flex items-center justify-between p-4 bg-white/50 rounded-xl hover:bg-white/70 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-zeta-500 to-zeta-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-900">{validator.name}</div>
                        <div className="text-sm text-neutral-600">Stake: {validator.stake}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-right">
                      <div>
                        <div className="text-sm text-neutral-600">Commission</div>
                        <div className="font-medium text-neutral-900">{validator.commission}</div>
                      </div>
                      <div>
                        <div className="text-sm text-neutral-600">Uptime</div>
                        <div className="font-medium text-neutral-900">{validator.uptime}</div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getValidatorStatusColor(validator.status)}`}>
                        {validator.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Network Info */}
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
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

              {/* Governance */}
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center">
                  <UsersIcon className="w-5 h-5 mr-2 text-zeta-600" />
                  Governance
                </h3>
                
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-neutral-900">12</div>
                    <div className="text-sm text-neutral-600">Active Proposals</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">Voting Power</span>
                      <span className="font-medium text-neutral-900">87.4%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-zeta-500 to-zeta-600 h-2 rounded-full" style={{ width: '87.4%' }}></div>
                    </div>
                  </div>
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