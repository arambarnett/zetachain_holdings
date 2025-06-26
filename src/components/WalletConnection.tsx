'use client'

import { useAccount, useDisconnect, useEnsName, useConnect } from 'wagmi'
import { Fragment, useState } from 'react'
import { Menu, Transition, Dialog } from '@headlessui/react'
import { 
  ChevronDownIcon, 
  WalletIcon, 
  DocumentDuplicateIcon,
  ArrowRightOnRectangleIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import type { Connector } from 'wagmi'

export default function WalletConnection() {
  const { address, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const { connect, connectors, isPending, error } = useConnect()
  const { data: ensName } = useEnsName({ address })
  const [copied, setCopied] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [showAllWallets, setShowAllWallets] = useState(false)


  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
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

  const getChainColor = (chainId?: number) => {
    switch (chainId) {
      case 1: return 'bg-blue-500'
      case 11155111: return 'bg-purple-500'
      case 7000: return 'bg-zeta-500'
      case 7001: return 'bg-zeta-400'
      default: return 'bg-neutral-500'
    }
  }

  const handleConnect = async (connector: Connector) => {
    try {
      await connect({ connector })
      setShowWalletModal(false)
    } catch (error) {
      console.error('Connection error:', error)
      // Keep modal open to show error and allow retry
    }
  }

  // Popular wallets for main display (8 wallets)
  const popularWallets = [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: '🦊',
      description: 'Browser extension',
      connector: connectors.find(c => c.id === 'metaMask'),
      available: typeof window !== 'undefined' && window.ethereum?.isMetaMask,
      color: 'from-orange-400 to-orange-600'
    },
    {
      id: 'trust',
      name: 'Trust Wallet',
      icon: '🛡️',
      description: 'Mobile wallet',
      connector: connectors.find(c => c.id === 'walletConnect'),
      available: true,
      color: 'from-blue-400 to-blue-600'
    },
    {
      id: 'rainbow',
      name: 'Rainbow',
      icon: '🌈',
      description: 'Mobile wallet',
      connector: connectors.find(c => c.id === 'walletConnect'),
      available: true,
      color: 'from-pink-400 to-purple-600'
    },
    {
      id: 'coinbase',
      name: 'Coinbase',
      icon: '🔵',
      description: 'Mobile & web',
      connector: connectors.find(c => c.id === 'coinbaseWallet'),
      available: true,
      color: 'from-blue-500 to-blue-700'
    },
    {
      id: 'phantom',
      name: 'Phantom',
      icon: '👻',
      description: 'Mobile wallet',
      connector: connectors.find(c => c.id === 'walletConnect'),
      available: true,
      color: 'from-purple-400 to-purple-600'
    },
    {
      id: 'zerion',
      name: 'Zerion',
      icon: '💎',
      description: 'DeFi wallet',
      connector: connectors.find(c => c.id === 'walletConnect'),
      available: true,
      color: 'from-cyan-400 to-cyan-600'
    },
    {
      id: 'imtoken',
      name: 'imToken',
      icon: '🔷',
      description: 'Mobile wallet',
      connector: connectors.find(c => c.id === 'walletConnect'),
      available: true,
      color: 'from-indigo-400 to-indigo-600'
    },
    {
      id: 'uniswap',
      name: 'Uniswap',
      icon: '🦄',
      description: 'Mobile wallet',
      connector: connectors.find(c => c.id === 'walletConnect'),
      available: true,
      color: 'from-pink-400 to-pink-600'
    }
  ]

  // All wallets including the 8 popular ones plus more
  const allWallets = [
    ...popularWallets,
    {
      id: 'argent',
      name: 'Argent',
      icon: '🏛️',
      description: 'Smart wallet',
      connector: connectors.find(c => c.id === 'walletConnect'),
      available: true,
      color: 'from-gray-400 to-gray-600'
    },
    {
      id: 'gnosis',
      name: 'Gnosis Safe',
      icon: '🔐',
      description: 'Multi-sig wallet',
      connector: connectors.find(c => c.id === 'walletConnect'),
      available: true,
      color: 'from-green-400 to-green-600'
    },
    {
      id: 'walletconnect',
      name: 'Other Wallets',
      icon: '🔗',
      description: '300+ more wallets',
      connector: connectors.find(c => c.id === 'walletConnect'),
      available: true,
      color: 'from-zeta-400 to-zeta-600'
    }
  ]

  const walletsToShow = showAllWallets ? allWallets : popularWallets

  if (!isConnected) {
    return (
      <>
        <button
          onClick={() => setShowWalletModal(true)}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-zeta-500 hover:bg-zeta-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zeta-500 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <WalletIcon className="w-5 h-5 mr-2" />
          Connect Wallet
        </button>

        {/* Wallet Selection Modal */}
        <Dialog
          open={showWalletModal}
          onClose={() => {
            setShowWalletModal(false)
            setShowAllWallets(false)
          }}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-md" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 max-w-lg w-full overflow-hidden">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-zeta-500 to-zeta-600 px-8 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Dialog.Title className="text-2xl font-bold text-white">
                      {showAllWallets ? 'All Wallets' : 'Choose Your Wallet'}
                    </Dialog.Title>
                    <p className="text-zeta-100 text-sm mt-1">
                      {showAllWallets ? 'Connect with any supported wallet' : 'Select from the most popular options'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowWalletModal(false)
                      setShowAllWallets(false)
                    }}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Wallet Grid */}
              <div className="p-8">
                {/* Debug info - remove after testing */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mb-4 p-3 bg-gray-100 rounded-xl text-xs">
                    <p className="font-medium mb-2">Debug Info:</p>
                    <p>Total connectors: {connectors.length}</p>
                    <p>Wallets to show: {walletsToShow.length}</p>
                    <p>Filtered wallets: {walletsToShow.filter(w => w.connector).length}</p>
                    <div className="mt-2">
                      {walletsToShow.slice(0, 3).map(w => (
                        <div key={w.id} className="text-xs">
                          {w.name}: {w.connector ? '✅' : '❌'} {w.connector?.id || 'no connector'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className={`grid gap-4 ${showAllWallets ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {walletsToShow.filter(wallet => wallet.connector).map((wallet) => (
                    <button
                      key={wallet.id}
                      onClick={() => wallet.connector && handleConnect(wallet.connector)}
                      disabled={isPending || !wallet.available}
                      className={`group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 transform hover:scale-105 ${
                        wallet.available 
                          ? 'bg-white shadow-lg hover:shadow-xl border border-gray-100 cursor-pointer' 
                          : 'bg-gray-50 border border-gray-200 cursor-not-allowed opacity-60'
                      } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {/* Gradient background on hover */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${wallet.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                      
                      <div className="relative z-10">
                        <div className="flex flex-col items-center text-center space-y-3">
                          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${wallet.color} flex items-center justify-center text-white text-xl shadow-lg`}>
                            {wallet.icon}
                          </div>
                          <div>
                            <div className={`font-semibold text-sm ${wallet.available ? 'text-gray-900' : 'text-gray-500'}`}>
                              {wallet.name}
                            </div>
                            <div className={`text-xs mt-1 ${wallet.available ? 'text-gray-500' : 'text-gray-400'}`}>
                              {wallet.description}
                            </div>
                            {!wallet.available && (
                              <div className="text-xs text-red-500 mt-1 font-medium">
                                Not detected
                              </div>
                            )}
                          </div>
                          {isPending && (
                            <div className="w-4 h-4 border-2 border-zeta-500/30 border-t-zeta-500 rounded-full animate-spin" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* See All / See Less Button */}
                {!showAllWallets ? (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setShowAllWallets(true)}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-zeta-500 to-zeta-600 text-white rounded-xl font-medium hover:from-zeta-600 hover:to-zeta-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span>See All Wallets</span>
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setShowAllWallets(false)}
                      className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span>Show Popular</span>
                    </button>
                  </div>
                )}

                {walletsToShow.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No wallet connectors available</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="text-zeta-600 hover:text-zeta-800 text-sm underline"
                    >
                      Refresh page to retry
                    </button>
                  </div>
                )}
                {/* Error Section */}
                {error && (
                  <div className="mx-8 mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
                    <p className="text-sm text-red-600 font-medium mb-2">
                      Connection Failed
                    </p>
                    <p className="text-xs text-red-500 mb-3">
                      {error.message.includes('rejected') ? 
                        'Connection was rejected. Please try again and approve the connection in your wallet.' :
                        error.message.includes('reset') ?
                        'Connection was reset. Please ensure your wallet is unlocked and try again.' :
                        'Failed to connect wallet. Please check your wallet app and try again.'}
                    </p>
                    <div className="text-xs text-red-600">
                      <p className="font-medium mb-1">Troubleshooting tips:</p>
                      <ul className="list-disc list-inside space-y-1 text-red-500">
                        <li>Make sure your wallet app is open and unlocked</li>
                        <li>Check that you&apos;re on the correct network</li>
                        <li>Try refreshing the page if the issue persists</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="px-8 pb-8 text-center">
                  <p className="text-xs text-gray-500">
                    By connecting a wallet, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </>
    )
  }

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex items-center w-full justify-center gap-x-2 rounded-xl bg-white/70 backdrop-blur-sm px-4 py-3 text-sm font-semibold text-neutral-900 shadow-lg ring-1 ring-inset ring-neutral-200 hover:bg-white/80 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${getChainColor(chain?.id)}`} />
            <div className="flex flex-col items-start">
              <div className="text-sm font-medium">
                {ensName || formatAddress(address!)}
              </div>
              {chain && (
                <div className="text-xs text-neutral-500">
                  {chain.name}
                </div>
              )}
            </div>
          </div>
          <ChevronDownIcon className="h-4 w-4 text-neutral-500" aria-hidden="true" />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Item>
          {() => (
            <div className="absolute right-0 z-10 mt-2 w-72 origin-top-right rounded-xl bg-white/95 backdrop-blur-sm shadow-2xl ring-1 ring-black/5 focus:outline-none">
              <div className="p-4 space-y-4">
                {/* Account Info */}
                <div className="border-b border-neutral-200 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${getChainColor(chain?.id)}`} />
                    <div>
                      <div className="text-sm font-medium text-neutral-900">
                        {ensName || formatAddress(address!)}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {chain?.name}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    onClick={() => copyToClipboard(address!)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors duration-150"
                  >
                    {copied ? (
                      <CheckIcon className="w-4 h-4 text-zeta-500" />
                    ) : (
                      <DocumentDuplicateIcon className="w-4 h-4" />
                    )}
                    {copied ? 'Copied!' : 'Copy Address'}
                  </button>

                  <button
                    onClick={() => {/* TODO: Implement network switching */}}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors duration-150"
                  >
                    <WalletIcon className="w-4 h-4" />
                    Switch Network
                  </button>

                  <button
                    onClick={() => disconnect()}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          )}
        </Menu.Item>
      </Transition>
    </Menu>
  )
}