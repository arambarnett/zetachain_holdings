'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { 
  ArrowLeftIcon,
  DocumentDuplicateIcon,
  ArrowTopRightOnSquareIcon,
  WalletIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { getTokenBalances, getTokenPrices, type TokenBalance } from '@/lib/alchemy'
import { getAddressTokenBalances, getAddressNativeBalance, validateAddress } from '@/lib/blockscout'
import { getChainById, SUPPORTED_CHAINS } from '@/config/chains'
import { ethers } from 'ethers'

interface TokenWithPrice extends TokenBalance {
  usdValue: number
  formattedBalance: string
}

interface WalletData {
  address: string
  totalValue: number
  chains: {
    chainId: number
    chainName: string
    tokens: TokenWithPrice[]
    chainValue: number
  }[]
  isValidAddress: boolean
}

export default function WalletPage() {
  const params = useParams()
  const walletAddress = params.address as string
  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)


  const isValidEthereumAddress = (address: string): boolean => {
    try {
      return ethers.isAddress(address)
    } catch {
      return false
    }
  }

  const isValidZetaAddress = (address: string): boolean => {
    return address.startsWith('zeta1') && address.length >= 39 && address.length <= 59
  }

  const fetchWalletData = useCallback(async (address: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const walletInfo: WalletData = {
        address,
        totalValue: 0,
        chains: [],
        isValidAddress: false
      }

      // Check if it's a valid address format
      const isValidFormat = isValidEthereumAddress(address) || isValidZetaAddress(address)
      if (!isValidFormat) {
        setError('Invalid address format')
        setWalletData(null)
        return
      }

      let hasAnyTokens = false

      // First, try ZetaChain using Blockscout API (supports both 0x... and zeta1... formats)
      try {
        const isValidZetaAddr = await validateAddress(address)
        if (isValidZetaAddr) {
          const [nativeBalance, tokenBalances] = await Promise.all([
            getAddressNativeBalance(address),
            getAddressTokenBalances(address)
          ])

          const tokensWithPrices: TokenWithPrice[] = []

          // Add native ZETA balance if exists
          if (nativeBalance && parseFloat(nativeBalance.value) > 0) {
            const balance = parseFloat(ethers.formatUnits(nativeBalance.value, 18))
            // Get real ZETA price from CoinGecko
            const zetaPrices = await getTokenPrices(['ZETA'])
            const zetaPrice = zetaPrices['ZETA'] || 0.18 // Fallback to 0.18 if API fails
            
            tokensWithPrices.push({
              contractAddress: '0xf091867ec603a6628ed83d274e835539d82e9cc8', // ZetaChain ZETA contract address
              tokenBalance: nativeBalance.value,
              symbol: 'ZETA',
              name: 'ZetaChain',
              decimals: 18,
              formattedBalance: balance.toFixed(6),
              usdValue: balance * zetaPrice,
            })
            hasAnyTokens = true
          }

          // Add token balances
          for (const tokenBalance of tokenBalances) {
            const decimals = parseInt(tokenBalance.token.decimals?.toString() || '18')
            const balance = parseFloat(ethers.formatUnits(tokenBalance.value, decimals))
            const exchangeRate = parseFloat(tokenBalance.token.exchange_rate || '0')
            
            tokensWithPrices.push({
              contractAddress: tokenBalance.token.address,
              tokenBalance: tokenBalance.value,
              symbol: tokenBalance.token.symbol,
              name: tokenBalance.token.name,
              decimals: decimals,
              logo: tokenBalance.token.icon_url,
              formattedBalance: balance.toFixed(6),
              usdValue: balance * exchangeRate,
            })
            hasAnyTokens = true
          }

          if (tokensWithPrices.length > 0) {
            const chainValue = tokensWithPrices.reduce((sum, token) => sum + token.usdValue, 0)
            walletInfo.chains.push({
              chainId: 7000, // ZetaChain mainnet
              chainName: 'ZetaChain',
              tokens: tokensWithPrices,
              chainValue
            })
            walletInfo.totalValue += chainValue
          }
        }
      } catch (error) {
        console.error('Error searching ZetaChain address via Blockscout:', error)
      }

      // Then search other chains using existing method (only for EVM addresses)
      if (isValidEthereumAddress(address)) {
        const otherChains = SUPPORTED_CHAINS.filter(chain => chain.id !== 7000)
        const searchPromises = otherChains.map(async (chain) => {
          try {
            const tokenBalances = await getTokenBalances(address, chain.id)
            
            if (tokenBalances.length > 0) {
              const uniqueSymbols = [...new Set(tokenBalances.map(token => token.symbol))]
              const prices = await getTokenPrices(uniqueSymbols)

              const tokensWithPrices: TokenWithPrice[] = tokenBalances.map(token => {
                const decimals = parseInt(token.decimals?.toString() || '18')
                const balance = parseFloat(ethers.formatUnits(token.tokenBalance, decimals))
                const price = prices[token.symbol] || 0
                const usdValue = balance * price

                return {
                  ...token,
                  decimals: decimals,
                  formattedBalance: balance.toFixed(6),
                  usdValue: usdValue
                }
              })

              const chainValue = tokensWithPrices.reduce((sum, token) => sum + token.usdValue, 0)
              hasAnyTokens = true

              return {
                chainId: chain.id,
                chainName: chain.name,
                tokens: tokensWithPrices,
                chainValue
              }
            }
          } catch (error) {
            console.error(`Error searching on ${chain.name}:`, error)
          }
          return null
        })

        const otherResults = await Promise.all(searchPromises)
        const validOtherResults = otherResults.filter((result): result is NonNullable<typeof result> => result !== null)
        
        walletInfo.chains.push(...validOtherResults)
        walletInfo.totalValue = walletInfo.chains.reduce((sum, chain) => sum + chain.chainValue, 0)
      }

      if (!hasAnyTokens) {
        setError('This address exists but has no token balances on supported networks')
        setWalletData(null)
        return
      }

      walletInfo.isValidAddress = true
      setWalletData(walletInfo)
      
    } catch (error) {
      console.error('Error fetching wallet data:', error)
      setError('Failed to fetch wallet data. Please try again.')
      setWalletData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (walletAddress) {
      fetchWalletData(walletAddress)
    }
  }, [walletAddress, fetchWalletData])

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

  const formatAddress = (address: string) => {
    if (address.startsWith('zeta1')) {
      return `${address.slice(0, 8)}...${address.slice(-8)}`
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-zeta-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 border-3 border-zeta-500/30 border-t-zeta-500 rounded-full animate-spin" />
            </div>
            <p className="text-neutral-600 text-lg">Loading wallet information...</p>
            <p className="text-neutral-500 text-sm mt-2">Searching across all supported networks</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-4">Wallet Not Found</h1>
            <p className="text-neutral-600 mb-8">{error}</p>
            <Link 
              href="/"
              className="inline-flex items-center px-6 py-3 bg-zeta-500 text-white rounded-xl font-medium hover:bg-zeta-600 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Back to Home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!walletData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <WalletIcon className="w-8 h-8 text-neutral-400" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-4">No Wallet Data</h1>
            <p className="text-neutral-600 mb-8">Unable to load wallet information.</p>
            <Link 
              href="/"
              className="inline-flex items-center px-6 py-3 bg-zeta-500 text-white rounded-xl font-medium hover:bg-zeta-600 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Back to Home
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
              Back to Home
            </Link>
          </motion.div>

          {/* Wallet Header */}
          <motion.div 
            className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gradient-to-r from-zeta-500 to-zeta-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                  <WalletIcon className="w-10 h-10" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-neutral-900 mb-2">Wallet Overview</h1>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => copyToClipboard(walletData.address)}
                      className="flex items-center space-x-2 text-neutral-600 hover:text-neutral-800 transition-colors"
                    >
                      <span className="font-mono text-lg">{formatAddress(walletData.address)}</span>
                      {copied ? (
                        <CheckIcon className="w-5 h-5 text-green-600" />
                      ) : (
                        <DocumentDuplicateIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-4xl font-bold text-neutral-900 mb-2">
                  {formatPrice(walletData.totalValue)}
                </div>
                <div className="text-neutral-500 text-lg">Total Portfolio Value</div>
              </div>
            </div>

            {/* Portfolio Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-neutral-900 mb-1">{walletData.chains.length}</div>
                <div className="text-sm text-neutral-500">Networks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-neutral-900 mb-1">
                  {walletData.chains.reduce((sum, chain) => sum + chain.tokens.length, 0)}
                </div>
                <div className="text-sm text-neutral-500">Total Tokens</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-neutral-900 mb-1">
                  {walletData.chains.filter(chain => chain.chainValue > 0).length}
                </div>
                <div className="text-sm text-neutral-500">Active Networks</div>
              </div>
            </div>
          </motion.div>

          {/* Chains and Tokens */}
          <div className="space-y-6">
            {walletData.chains.map((chainData, index) => {
              const chain = getChainById(chainData.chainId)
              if (!chain) return null

              return (
                <motion.div
                  key={chainData.chainId}
                  className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                >
                  {/* Chain Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r ${chain.gradient.from} ${chain.gradient.to} text-white font-bold text-lg`}>
                          {chain.icon}
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{chainData.chainName}</h3>
                          <p className="text-sm text-gray-500">{chainData.tokens.length} tokens</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{formatPrice(chainData.chainValue)}</div>
                        <div className="text-sm text-gray-500">Chain Value</div>
                      </div>
                    </div>
                  </div>

                  {/* Tokens */}
                  <div className="p-6">
                    <div className="space-y-3">
                      {chainData.tokens.map((token, tokenIndex) => {
                        // Route to token page using contract address
                        const tokenHref = `/token/${token.contractAddress}`
                        
                        return (
                          <Link 
                            key={`${token.contractAddress}-${tokenIndex}`} 
                            href={tokenHref}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center space-x-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r ${chain.gradient.from} ${chain.gradient.to} text-white font-bold text-lg`}>
                                {token.symbol[0]}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 group-hover:text-zeta-600">{token.name}</div>
                                <div className="text-sm text-gray-500">{token.symbol}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-gray-900">
                                {parseFloat(token.formattedBalance).toLocaleString()} {token.symbol}
                              </div>
                              <div className="text-sm text-gray-600">{formatPrice(token.usdValue)}</div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>

                    {/* View on Explorer */}
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <a
                        href={`${chain.blockExplorerUrl}/address/${walletData.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-zeta-600 hover:text-zeta-800 text-sm font-medium"
                      >
                        <span>View on {chainData.chainName} Explorer</span>
                        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}