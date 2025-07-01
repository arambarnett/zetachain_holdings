'use client'

import { useAccount, useDisconnect, useEnsName, useConnect, useSwitchChain } from 'wagmi'
import { Fragment, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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

// Type for MetaMask ethereum provider
interface EthereumProvider {
  isMetaMask?: boolean
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

export default function WalletConnection() {
  const { address, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const { connect, connectors, isPending, error } = useConnect()
  const { switchChain } = useSwitchChain()
  const { data: ensName } = useEnsName({ address })
  const [copied, setCopied] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [metaMaskDetected, setMetaMaskDetected] = useState(false)
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false)
  const [networkDropdownPosition, setNetworkDropdownPosition] = useState({ top: 0, left: 0 })
  const walletNetworkButtonRef = useRef<HTMLButtonElement>(null)

  // Check for MetaMask on mount and when ethereum object changes
  useEffect(() => {
    const checkMetaMask = () => {
      const detected = isMetaMaskAvailable()
      setMetaMaskDetected(detected)
      console.log('MetaMask detection result:', detected)
      console.log('Available connectors:', connectors.map(c => ({ id: c.id, name: c.name })))
    }

    checkMetaMask()
    
    // Listen for ethereum provider injection
    const handleEthereumChange = () => {
      setTimeout(checkMetaMask, 100) // Small delay to ensure provider is fully loaded
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('ethereum#initialized', handleEthereumChange)
      
      // Also check periodically in case MetaMask loads after initial check
      const interval = setInterval(checkMetaMask, 1000)
      
      // Clean up after 10 seconds
      setTimeout(() => clearInterval(interval), 10000)
      
      return () => {
        window.removeEventListener('ethereum#initialized', handleEthereumChange)
        clearInterval(interval)
      }
    }
  }, [connectors])

  // Close network dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showNetworkDropdown) {
        setShowNetworkDropdown(false)
      }
    }

    if (showNetworkDropdown) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showNetworkDropdown])


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

  const handleMetaMaskConnect = async () => {
    try {
      const ethereum = (window as unknown as { ethereum?: EthereumProvider })?.ethereum
      
      // Check if MetaMask is available
      if (typeof window === 'undefined' || !ethereum?.isMetaMask) {
        // Open MetaMask install page if not available
        window.open('https://metamask.io/', '_blank')
        return
      }

      // Direct MetaMask connection - no page refresh needed with wagmi v2
      await ethereum.request({ method: 'eth_requestAccounts' })
      setShowWalletModal(false)
      
      // No page refresh needed - wagmi handles connection state automatically
      
    } catch (error: unknown) {
      console.error('MetaMask connection error:', error)
      if ((error as { code?: number })?.code === 4001) {
        // User rejected connection
        console.log('User rejected the connection')
      }
    }
  }

  // Simplified MetaMask availability check
  const isMetaMaskAvailable = () => {
    const ethereum = (window as unknown as { ethereum?: EthereumProvider })?.ethereum
    return typeof window !== 'undefined' && !!ethereum?.isMetaMask
  }

  // Simplified wallet options - just MetaMask and WalletConnect
  const walletOptions = [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: '🦊',
      description: metaMaskDetected ? 'Ready to connect' : 'Browser extension',
      connector: connectors.find(c => c.id === 'metaMask'),
      available: metaMaskDetected,
      color: 'from-orange-400 to-orange-600',
      recommended: metaMaskDetected
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: '🔗',
      description: '300+ mobile wallets',
      connector: connectors.find(c => c.id === 'walletConnect'),
      available: true,
      color: 'from-blue-500 to-blue-600'
    }
  ]

  // All networks for dropdown
  const supportedNetworks = [
    // Ethereum networks
    { id: 1, name: 'Ethereum Mainnet', icon: '⚡', color: 'from-blue-500 to-blue-600', category: 'Ethereum' },
    { id: 11155111, name: 'Ethereum Sepolia', icon: '⚡', color: 'from-purple-500 to-purple-600', category: 'Ethereum' },
    { id: 17000, name: 'Ethereum Holesky', icon: '⚡', color: 'from-indigo-500 to-indigo-600', category: 'Ethereum' },
    
    // Layer 2 networks
    { id: 137, name: 'Polygon Mainnet', icon: '🔷', color: 'from-purple-500 to-pink-500', category: 'Layer 2' },
    { id: 80001, name: 'Polygon Mumbai', icon: '🔷', color: 'from-purple-400 to-pink-400', category: 'Layer 2' },
    { id: 42161, name: 'Arbitrum One', icon: '🔵', color: 'from-blue-400 to-cyan-400', category: 'Layer 2' },
    { id: 421614, name: 'Arbitrum Sepolia', icon: '🔵', color: 'from-blue-300 to-cyan-300', category: 'Layer 2' },
    { id: 10, name: 'Optimism Mainnet', icon: '🔴', color: 'from-red-500 to-pink-500', category: 'Layer 2' },
    { id: 11155420, name: 'Optimism Sepolia', icon: '🔴', color: 'from-red-400 to-pink-400', category: 'Layer 2' },
    { id: 8453, name: 'Base Mainnet', icon: '🟦', color: 'from-blue-600 to-indigo-600', category: 'Layer 2' },
    { id: 84532, name: 'Base Sepolia', icon: '🟦', color: 'from-blue-400 to-indigo-400', category: 'Layer 2' },
    
    // ZetaChain networks
    { id: 7000, name: 'ZetaChain Mainnet', icon: 'Ζ', color: 'from-green-500 to-green-600', category: 'ZetaChain' },
    { id: 7001, name: 'ZetaChain Athens', icon: 'Ζ', color: 'from-yellow-500 to-yellow-600', category: 'ZetaChain' }
  ]

  const handleNetworkSwitch = async (chainId: number) => {
    try {
      console.log('Attempting to switch to chain:', chainId)
      
      // First try with wagmi
      await switchChain({ 
        chainId: chainId as 1 | 11155111 | 17000 | 7000 | 7001 | 137 | 80001 | 42161 | 421614 | 10 | 11155420 | 8453 | 84532 
      })
      
      console.log('Network switch successful')
    } catch (error) {
      console.error('Failed to switch network:', error)
      
      // Fallback: Try direct MetaMask network switching
      const ethereum = (window as unknown as { ethereum?: EthereumProvider })?.ethereum
      if (ethereum?.isMetaMask) {
        try {
          const chainIdHex = `0x${chainId.toString(16)}`
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }],
          })
        } catch (switchError: unknown) {
          // If the chain hasn't been added to MetaMask, add it
          if ((switchError as { code?: number })?.code === 4902) {
            await addNetworkToMetaMask(chainId)
          } else {
            console.error('Direct network switch failed:', switchError)
          }
        }
      }
    }
  }

  const addNetworkToMetaMask = async (chainId: number) => {
    const network = supportedNetworks.find(n => n.id === chainId)
    const ethereum = (window as unknown as { ethereum?: EthereumProvider })?.ethereum
    if (!network || !ethereum?.isMetaMask) return

    const networkParams = {
      chainId: `0x${chainId.toString(16)}`,
      chainName: network.name,
      nativeCurrency: {
        name: getNetworkNativeCurrency(chainId).name,
        symbol: getNetworkNativeCurrency(chainId).symbol,
        decimals: 18,
      },
      rpcUrls: [getNetworkRpcUrl(chainId)],
      blockExplorerUrls: [getNetworkExplorer(chainId)],
    }

    try {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [networkParams],
      })
    } catch (error) {
      console.error('Failed to add network to MetaMask:', error)
    }
  }

  const getNetworkNativeCurrency = (chainId: number) => {
    switch (chainId) {
      case 1:
      case 11155111:
      case 17000:
      case 42161:
      case 421614:
      case 10:
      case 11155420:
      case 8453:
      case 84532:
        return { name: 'Ether', symbol: 'ETH' }
      case 137:
      case 80001:
        return { name: 'MATIC', symbol: 'MATIC' }
      case 7000:
      case 7001:
        return { name: 'Zeta', symbol: 'ZETA' }
      default:
        return { name: 'ETH', symbol: 'ETH' }
    }
  }

  const getNetworkRpcUrl = (chainId: number) => {
    switch (chainId) {
      case 7000:
        return 'https://zetachain-evm.blockpi.network/v1/rpc/public'
      case 7001:
        return 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public'
      default:
        return `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
    }
  }

  const getNetworkExplorer = (chainId: number) => {
    switch (chainId) {
      case 1:
        return 'https://etherscan.io'
      case 11155111:
        return 'https://sepolia.etherscan.io'
      case 17000:
        return 'https://holesky.etherscan.io'
      case 137:
        return 'https://polygonscan.com'
      case 80001:
        return 'https://mumbai.polygonscan.com'
      case 42161:
        return 'https://arbiscan.io'
      case 421614:
        return 'https://sepolia.arbiscan.io'
      case 10:
        return 'https://optimistic.etherscan.io'
      case 11155420:
        return 'https://sepolia-optimism.etherscan.io'
      case 8453:
        return 'https://basescan.org'
      case 84532:
        return 'https://sepolia.basescan.org'
      case 7000:
        return 'https://explorer.zetachain.com'
      case 7001:
        return 'https://athens3.explorer.zetachain.com'
      default:
        return 'https://etherscan.io'
    }
  }

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
          onClose={() => setShowWalletModal(false)}
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
                      Connect Your Wallet
                    </Dialog.Title>
                    <p className="text-zeta-100 text-sm mt-1">
                      Choose your preferred wallet connection method
                    </p>
                  </div>
                  <button
                    onClick={() => setShowWalletModal(false)}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Wallet Options */}
              <div className="p-8">
                <div className="grid gap-4 grid-cols-1">
                  {walletOptions.map((wallet) => (
                    <button
                      key={wallet.id}
                      onClick={() => {
                        console.log('Wallet clicked:', {
                          walletId: wallet.id,
                          metaMaskDetected,
                          hasConnector: !!wallet.connector,
                          connectorId: wallet.connector?.id
                        })
                        
                        if (wallet.id === 'metamask') {
                          console.log('MetaMask clicked, attempting direct connection')
                          handleMetaMaskConnect()
                        } else if (wallet.connector) {
                          handleConnect(wallet.connector)
                        }
                      }}
                      disabled={isPending}
                      className={`group relative overflow-hidden rounded-3xl p-6 transition-all duration-300 transform hover:scale-102 ${
                        wallet.id === 'metamask' && wallet.available
                          ? 'bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 shadow-xl hover:shadow-2xl cursor-pointer ring-2 ring-orange-200' 
                          : wallet.connector && wallet.available
                          ? 'bg-white shadow-lg hover:shadow-xl border border-gray-100 cursor-pointer' 
                          : wallet.id === 'metamask' && !wallet.available
                          ? 'bg-orange-50 border border-orange-200 hover:border-orange-300 cursor-pointer'
                          : wallet.connector
                          ? 'bg-white shadow-lg hover:shadow-xl border border-gray-100 cursor-pointer'
                          : 'bg-gray-50 border border-gray-200 cursor-not-allowed opacity-60'
                      } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {/* Gradient background on hover */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${wallet.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                      
                      <div className="relative z-10">
                        <div className="flex flex-col items-center text-center space-y-4">
                          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${wallet.color} flex items-center justify-center text-white text-2xl shadow-lg`}>
                            {wallet.icon}
                          </div>
                          <div>
                            <div className={`font-bold text-lg ${
                              wallet.connector && wallet.available ? 'text-gray-900' : 
                              wallet.id === 'metamask' && !wallet.available ? 'text-orange-600' : 
                              'text-gray-500'
                            }`}>
                              {wallet.name}
                            </div>
                            <div className={`text-sm mt-1 ${
                              wallet.connector && wallet.available ? 'text-gray-500' : 
                              wallet.id === 'metamask' && !wallet.available ? 'text-orange-500' : 
                              'text-gray-400'
                            }`}>
                              {wallet.connector && wallet.available ? wallet.description : 
                               wallet.id === 'metamask' && !wallet.available ? 'Click to install' : 
                               wallet.description}
                            </div>
                            {wallet.id === 'metamask' && !wallet.available && (
                              <div className="text-xs text-orange-600 mt-1 font-medium">
                                Not installed
                              </div>
                            )}
                            {wallet.id === 'metamask' && wallet.available && (
                              <div className="flex items-center space-x-2 mt-1">
                                <div className="text-xs text-green-600 font-medium">
                                  Ready to connect
                                </div>
                                <div className="px-2 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded-full">
                                  RECOMMENDED
                                </div>
                              </div>
                            )}
                            {wallet.connector && wallet.available && wallet.id !== 'metamask' && (
                              <div className="text-xs text-green-600 mt-1 font-medium">
                                Ready to connect
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

                {walletOptions.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">Loading wallet options...</p>
                    <div className="w-6 h-6 border-2 border-zeta-500/30 border-t-zeta-500 rounded-full animate-spin mx-auto" />
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
    <>
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
              <div className="absolute right-0 z-[9998] mt-2 w-72 origin-top-right rounded-xl bg-white/95 backdrop-blur-sm shadow-2xl ring-1 ring-black/5 focus:outline-none">
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

                    {/* Network Dropdown */}
                    <div className="relative">
                      <button 
                        ref={walletNetworkButtonRef}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!showNetworkDropdown && walletNetworkButtonRef.current) {
                            const rect = walletNetworkButtonRef.current.getBoundingClientRect()
                            setNetworkDropdownPosition({
                              top: rect.top + window.scrollY,
                              left: rect.right + window.scrollX + 8,
                            })
                          }
                          setShowNetworkDropdown(!showNetworkDropdown)
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors duration-150"
                      >
                        <WalletIcon className="w-4 h-4" />
                        Switch Network
                        <ChevronDownIcon className="w-3 h-3 ml-auto" />
                      </button>
                    </div>

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

      {/* Network Dropdown Portal */}
      {showNetworkDropdown && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999]"
          onClick={() => setShowNetworkDropdown(false)}
        >
          <div 
            className="absolute w-72 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl ring-1 ring-black/5 max-h-80 overflow-y-auto"
            style={{
              top: networkDropdownPosition.top,
              left: networkDropdownPosition.left,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3">
              {['Ethereum', 'Layer 2', 'ZetaChain'].map((category) => {
                const networksInCategory = supportedNetworks.filter(network => network.category === category)
                if (networksInCategory.length === 0) return null
                
                return (
                  <div key={category} className="mb-4 last:mb-0">
                    <div className="text-xs font-semibold text-gray-500 mb-2 px-2">{category}</div>
                    <div className="space-y-1">
                      {networksInCategory.map((network) => (
                        <button
                          key={network.id}
                          onClick={() => {
                            handleNetworkSwitch(network.id)
                            setShowNetworkDropdown(false)
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                            chain?.id === network.id
                              ? 'bg-zeta-50 text-zeta-700 border border-zeta-200'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${network.color} flex items-center justify-center text-white text-xs`}>
                              {network.icon}
                            </div>
                            <span className="font-medium text-gray-900">{network.name}</span>
                          </div>
                          {chain?.id === network.id && (
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
      
    </>
  )
}