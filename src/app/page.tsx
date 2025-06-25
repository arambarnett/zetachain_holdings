'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { getTokenBalances, getTokenPrices, TokenBalance } from '@/lib/alchemy';
import { SUPPORTED_CHAINS, ALL_CHAINS, getChainById, getMainnetChains, getTestnetChains } from '@/config/chains';
import { ethers } from 'ethers';
import ChainManagement from '@/components/ChainManagement';
import SearchModal from '@/components/SearchModal';
import PortfolioHistory from '@/components/PortfolioHistory';

interface TokenWithPrice extends TokenBalance {
  usdValue: number;
  formattedBalance: string;
}

type SortOption = 'value-desc' | 'value-asc' | 'amount-desc' | 'amount-asc' | 'name-asc' | 'name-desc';

type TabOption = 'holdings' | 'history';

export default function Holdings() {
  const { account, chainId, isConnecting, error, connectWallet, switchChain, disconnectWallet, isConnected } = useWallet();
  const [tokens, setTokens] = useState<TokenWithPrice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [addressCopied, setAddressCopied] = useState(false);
  const [showChainManagement, setShowChainManagement] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('value-desc');
  const [activeTab, setActiveTab] = useState<TabOption>('holdings');

  const fetchTokenData = async (address: string, currentChainId: number) => {
    setIsLoading(true);
    try {
      // Only fetch balances for the currently connected network
      const tokenBalances = await getTokenBalances(address, currentChainId);
      
      if (tokenBalances.length === 0) {
        setTokens([]);
        setTotalValue(0);
        return;
      }

      const uniqueSymbols = [...new Set(tokenBalances.map(token => token.symbol))];
      const prices = await getTokenPrices(uniqueSymbols);

      const tokensWithPrices: TokenWithPrice[] = tokenBalances.map(token => {
        const balance = parseFloat(ethers.formatUnits(token.tokenBalance, token.decimals));
        const price = prices[token.symbol] || 0;
        const usdValue = balance * price;

        return {
          ...token,
          formattedBalance: balance.toFixed(6),
          usdValue: usdValue
        };
      });

      setTokens(tokensWithPrices);
      setTotalValue(tokensWithPrices.reduce((sum, token) => sum + token.usdValue, 0));
    } catch (error) {
      console.error('Error fetching token data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (account && chainId) {
      fetchTokenData(account, chainId);
    }
  }, [account, chainId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Chain management: Cmd/Ctrl + Shift + C
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        setShowChainManagement(true);
      }
      // Search: Cmd/Ctrl + K
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setShowSearch(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getCurrentChain = () => {
    return getChainById(chainId || 0);
  };

  const copyAddressToClipboard = async () => {
    if (!account) return;
    
    try {
      await navigator.clipboard.writeText(account);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  const formatPrice = (value: number) => {
    if (value === 0) return '$0.00';
    
    if (value < 0.01) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 4,
        maximumFractionDigits: 6,
      }).format(value);
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const sortTokens = (tokens: TokenWithPrice[], sortOption: SortOption): TokenWithPrice[] => {
    const sortedTokens = [...tokens];
    
    switch (sortOption) {
      case 'value-desc':
        return sortedTokens.sort((a, b) => b.usdValue - a.usdValue);
      case 'value-asc':
        return sortedTokens.sort((a, b) => a.usdValue - b.usdValue);
      case 'amount-desc':
        return sortedTokens.sort((a, b) => {
          const aAmount = parseFloat(a.formattedBalance);
          const bAmount = parseFloat(b.formattedBalance);
          return bAmount - aAmount;
        });
      case 'amount-asc':
        return sortedTokens.sort((a, b) => {
          const aAmount = parseFloat(a.formattedBalance);
          const bAmount = parseFloat(b.formattedBalance);
          return aAmount - bAmount;
        });
      case 'name-asc':
        return sortedTokens.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return sortedTokens.sort((a, b) => b.name.localeCompare(a.name));
      default:
        return sortedTokens;
    }
  };

  const sortedTokens = sortTokens(tokens, sortBy);

  const getSortOptions = () => [
    { value: 'value-desc', label: '💰 Value (High to Low)', icon: '💰' },
    { value: 'value-asc', label: '💰 Value (Low to High)', icon: '💰' },
    { value: 'amount-desc', label: '📊 Amount (High to Low)', icon: '📊' },
    { value: 'amount-asc', label: '📊 Amount (Low to High)', icon: '📊' },
    { value: 'name-asc', label: '🔤 Name (A to Z)', icon: '🔤' },
    { value: 'name-desc', label: '🔤 Name (Z to A)', icon: '🔤' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">Z</span>
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">ZetaChain Holdings</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search Button */}
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors group"
                title="Search wallets and tokens (Cmd/Ctrl + K)"
              >
                <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {isConnected && (
                <div className="flex items-center space-x-3">
                  {(() => {
                    const currentChain = getCurrentChain();
                    if (!currentChain) return null;
                    
                    return (
                      <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl border ${currentChain.color.bg} ${currentChain.color.text} ${currentChain.color.border} shadow-sm`}>
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${currentChain.gradient.from} ${currentChain.gradient.to}`}></div>
                        <span className="text-sm font-medium">{currentChain.icon}</span>
                        <span className="text-sm font-medium">{currentChain.name}</span>
                        {!currentChain.isMainnet && (
                          <span className="text-xs bg-white/70 px-2 py-0.5 rounded-full">Testnet</span>
                        )}
                      </div>
                    );
                  })()}
                  <button
                    onClick={copyAddressToClipboard}
                    className="group bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition-all duration-200 flex items-center space-x-2"
                    title="Click to copy address"
                  >
                    <span className="text-sm font-mono text-gray-700">
                      {account?.slice(0, 6)}...{account?.slice(-4)}
                    </span>
                    {addressCopied ? (
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
              
              {!isConnected ? (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isConnecting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Connecting...</span>
                    </div>
                  ) : (
                    'Connect Wallet'
                  )}
                </button>
              ) : (
                <button
                  onClick={disconnectWallet}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {addressCopied && (
          <div className="fixed top-4 right-4 z-50 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 shadow-lg animate-fade-in">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Address copied to clipboard!
            </div>
          </div>
        )}

        {!isConnected ? (
          /* Welcome Screen */
          <div className="text-center py-24">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-8">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to ZetaChain Holdings</h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Connect your wallet to view and manage your token balances across ZetaChain and Ethereum networks.
              </p>
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {isConnecting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Connecting Wallet...</span>
                  </div>
                ) : (
                  'Connect Your Wallet'
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Portfolio Summary */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
              <div className="text-center">
                <h2 className="text-lg font-medium text-gray-600 mb-2">
                  Total Portfolio Value
                  {getCurrentChain() && (
                    <span className="block text-sm font-normal mt-1">
                      on {getCurrentChain()?.name}
                    </span>
                  )}
                </h2>
                <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                  {formatPrice(totalValue)}
                </div>
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                  <span>{tokens.length} {tokens.length === 1 ? 'Asset' : 'Assets'}</span>
                  {getCurrentChain() && (
                    <>
                      <span>•</span>
                      <span>{getCurrentChain()?.isMainnet ? 'Mainnet' : 'Testnet'}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-2 shadow-xl border border-white/20">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('holdings')}
                  className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === 'holdings'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <span>Holdings</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === 'history'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>History</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'holdings' && (
              <div className="space-y-8">
                {/* Network Selector */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Networks</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SUPPORTED_CHAINS.map(chain => {
                  const isActive = chainId === chain.id;
                  
                  return (
                    <button
                      key={chain.id}
                      onClick={() => switchChain(chain.id)}
                      className={`p-4 rounded-xl font-medium transition-all duration-200 border text-left ${
                        isActive
                          ? `bg-gradient-to-r ${chain.gradient.from} ${chain.gradient.to} text-white border-transparent shadow-lg transform scale-105`
                          : `bg-white/50 hover:bg-white border-gray-200 hover:shadow-md hover:border-gray-300 hover:${chain.color.bg} hover:${chain.color.text}`
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            isActive ? 'bg-white' : `bg-gradient-to-r ${chain.gradient.from} ${chain.gradient.to}`
                          }`}></div>
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
                        {isActive && (
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Token Holdings */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="p-6 border-b border-gray-200/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Your Holdings</h3>
                  
                  {tokens.length > 0 && (
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500 font-medium">Sort by:</span>
                      <div className="relative">
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as SortOption)}
                          className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
                        >
                          {getSortOptions().map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                        {tokens.length} {tokens.length === 1 ? 'token' : 'tokens'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6">
                {isLoading ? (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                      <div className="w-8 h-8 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                    <p className="text-gray-600 text-lg">Loading your holdings...</p>
                  </div>
                ) : tokens.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <p className="text-gray-600 text-lg">No tokens found in your wallet</p>
                    <p className="text-gray-500 text-sm mt-2">Try switching to a different network or add some tokens to your wallet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedTokens.map((token, index) => (
                      <div key={`${token.contractAddress}-${index}`} className="group p-4 rounded-xl border border-gray-200/50 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="relative">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                <span className="font-bold text-white text-lg">{token.symbol[0]}</span>
                              </div>
                              <div className="absolute -top-2 -left-2 w-6 h-6 bg-gray-800 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                {index + 1}
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-lg">{token.name}</div>
                              <div className="text-gray-500 text-sm">{token.symbol}</div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="font-semibold text-gray-900 text-lg">
                              {parseFloat(token.formattedBalance).toLocaleString()} {token.symbol}
                            </div>
                            <div className="text-gray-600 text-sm">{formatPrice(token.usdValue)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
              </div>
            )}

            {/* Portfolio History Tab */}
            {activeTab === 'history' && (
              <PortfolioHistory tokens={tokens} totalValue={totalValue} />
            )}
          </div>
        )}
      </div>

      {/* Developer Footer */}
      <div className="fixed bottom-4 left-4 z-40">
        <button
          onClick={() => setShowChainManagement(true)}
          className="group bg-black/80 hover:bg-black text-white px-3 py-2 rounded-xl text-xs font-mono transition-all duration-200 backdrop-blur-sm"
          title="Open Chain Management (Cmd/Ctrl + Shift + C)"
        >
          <div className="flex items-center space-x-2">
            <span>⚙️</span>
            <span className="hidden group-hover:inline">Networks ({SUPPORTED_CHAINS.length}/{ALL_CHAINS.length})</span>
          </div>
        </button>
      </div>

      {/* Search Modal */}
      <SearchModal 
        isOpen={showSearch} 
        onClose={() => setShowSearch(false)}
        currentChainId={chainId}
      />

      {/* Chain Management Modal */}
      <ChainManagement 
        isOpen={showChainManagement} 
        onClose={() => setShowChainManagement(false)} 
      />
    </div>
  );
}