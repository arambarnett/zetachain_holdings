'use client';

import { useState, useEffect } from 'react';
import { getChainById, SUPPORTED_CHAINS } from '@/config/chains';
import { getTokenBalances, getTokenPrices, type TokenBalance } from '@/lib/alchemy';
import { ethers } from 'ethers';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentChainId?: number | null;
}

interface TokenWithPrice extends TokenBalance {
  usdValue: number;
  formattedBalance: string;
}

interface SearchResult {
  address: string;
  tokens: TokenWithPrice[];
  totalValue: number;
  chainId: number;
  isValidAddress: boolean;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'address' | 'token'>('address');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('zetachain-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  // Save search to recent searches
  const saveRecentSearch = (query: string) => {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('zetachain-recent-searches', JSON.stringify(updated));
  };

  // Clear results when switching search types
  const handleSearchTypeChange = (newType: 'address' | 'token') => {
    setSearchType(newType);
    setSearchResults([]);
    setSearchError(null);
    setSearchQuery('');
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

  const isValidAddress = (address: string): boolean => {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  };

  const searchAddress = async (address: string) => {
    if (!isValidAddress(address)) {
      setSearchError('Invalid address format');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      // Search across all supported chains
      const searchPromises = SUPPORTED_CHAINS.map(async (chain) => {
        try {
          const tokenBalances = await getTokenBalances(address, chain.id);
          
          if (tokenBalances.length > 0) {
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

            const totalValue = tokensWithPrices.reduce((sum, token) => sum + token.usdValue, 0);

            return {
              address,
              tokens: tokensWithPrices,
              totalValue,
              chainId: chain.id,
              isValidAddress: true
            };
          }
        } catch (error) {
          console.error(`Error searching on ${chain.name}:`, error);
        }
        return null;
      });

      const searchResults = await Promise.all(searchPromises);
      const validResults = searchResults.filter((result): result is SearchResult => result !== null);
      
      setSearchResults(validResults);
      
      if (validResults.length === 0) {
        setSearchError('No tokens found for this address on any supported networks');
      }
    } catch (error) {
      setSearchError('Error searching address. Please try again.');
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const query = searchQuery.trim();
      saveRecentSearch(query);
      
      // Auto-detect if it's a contract address (starts with 0x and is valid address)
      if (isValidAddress(query)) {
        // If it's a valid address, search for it regardless of search type
        searchAddress(query);
      } else if (searchType === 'address') {
        searchAddress(query);
      } else {
        searchToken(query);
      }
    }
  };

  const searchToken = async (tokenQuery: string) => {
    setIsSearching(true);
    setSearchError(null);

    try {
      // Mock token search - in real app, use API to search tokens by name/symbol
      const mockResults: SearchResult[] = [
        {
          address: '0x742d35Cc6634C0532925a3b8D942C01C4D3d4aB2',
          tokens: [{
            contractAddress: '0x742d35Cc6634C0532925a3b8D942C01C4D3d4aB2',
            tokenBalance: '1000000000000000000',
            name: 'ZetaChain Token',
            symbol: 'ZETA',
            decimals: 18,
            logo: '',
            usdValue: 0.169934,
            formattedBalance: '1.000000'
          }],
          totalValue: 0.169934,
          chainId: 7000,
          isValidAddress: true
        }
      ];

      // Filter mock results based on search query
      const filteredResults = mockResults.filter(result => 
        result.tokens.some(token => 
          token.name.toLowerCase().includes(tokenQuery.toLowerCase()) ||
          token.symbol.toLowerCase().includes(tokenQuery.toLowerCase())
        )
      );

      setSearchResults(filteredResults);
      
      if (filteredResults.length === 0) {
        setSearchError(`No tokens found matching "${tokenQuery}"`);
      }
    } catch (error) {
      setSearchError('Error searching tokens. Please try again.');
      console.error('Token search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Advanced Search</h2>
              <p className="text-gray-600 mt-1">
                Search wallet addresses or find tokens by name/symbol across networks
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Search Type Selector */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => handleSearchTypeChange('address')}
              className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg font-medium transition-colors ${
                searchType === 'address'
                  ? 'bg-white text-zeta-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Wallet Address
            </button>
            <button
              type="button"
              onClick={() => handleSearchTypeChange('token')}
              className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg font-medium transition-colors ${
                searchType === 'token'
                  ? 'bg-white text-zeta-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Token Search
            </button>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchType === 'address' 
                    ? "Enter wallet or contract address (0x...)" 
                    : "Enter token name or symbol (e.g., ZETA, Bitcoin)"
                  }
                  className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-zeta-500 focus:outline-none focus:ring-1 focus:ring-zeta-500 text-sm ${
                    searchType === 'address' ? 'font-mono' : 'font-sans'
                  }`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-6 py-3 bg-zeta-500 hover:bg-zeta-600 disabled:bg-zeta-400 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
              >
                {isSearching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Keyboard Shortcuts Info */}
          {!searchQuery && !isSearching && (
            <div className="mb-6 p-4 bg-zeta-50 border border-zeta-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-zeta-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-sm text-zeta-700 font-medium">Quick tip</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-zeta-600">
                  <kbd className="px-2 py-1 bg-white border border-zeta-300 rounded text-zeta-700 font-mono">⌘</kbd>
                  <span>+</span>
                  <kbd className="px-2 py-1 bg-white border border-zeta-300 rounded text-zeta-700 font-mono">K</kbd>
                  <span>to open search</span>
                </div>
              </div>
              <p className="text-sm text-zeta-600 mt-2">
                {searchType === 'address' 
                  ? 'Search wallet addresses to view token holdings across supported networks'
                  : 'Search by token name or symbol to find specific tokens'
                }
              </p>
            </div>
          )}

          {/* Recent Searches */}
          {!searchQuery && !isSearching && recentSearches.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Searches</h4>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSearchQuery(search);
                      const query = search.trim();
                      saveRecentSearch(query);
                      if (searchType === 'address') {
                        searchAddress(query);
                      } else {
                        searchToken(query);
                      }
                    }}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                  >
                    {search.length > 20 ? `${search.slice(0, 20)}...` : search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {searchError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {searchError}
              </div>
            </div>
          )}

          {/* Search Results Header */}
          {(searchResults.length > 0 || isSearching) && (
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {isSearching 
                  ? 'Searching...' 
                  : `Found ${searchResults.length} ${searchResults.length === 1 ? 'result' : 'results'}`
                }
              </h3>
              {searchResults.length > 0 && (
                <span className="text-sm text-gray-500">
                  Showing results for &ldquo;{searchQuery}&rdquo;
                </span>
              )}
            </div>
          )}

          {/* Loading State */}
          {isSearching && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 bg-zeta-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-6 h-6 border-2 border-zeta-500/30 border-t-zeta-500 rounded-full animate-spin"></div>
                </div>
                <p className="text-gray-600 font-medium">Searching across networks...</p>
                <p className="text-gray-500 text-sm mt-1">This may take a few moments</p>
              </div>
            </div>
          )}

          {/* Search Results */}
          <div className="space-y-6 max-h-[50vh] overflow-y-auto">
            {searchResults.map((result, index) => {
              const chain = getChainById(result.chainId);
              if (!chain) return null;

              return (
                <div key={`${result.chainId}-${index}`} className="border border-gray-200 rounded-xl p-4">
                  {/* Chain Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r ${chain.gradient.from} ${chain.gradient.to} text-white font-bold`}>
                        {chain.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{chain.name}</h3>
                        <p className="text-sm text-gray-500">{result.tokens.length} tokens found</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg text-gray-900">{formatPrice(result.totalValue)}</div>
                      <div className="text-sm text-gray-500">Total Value</div>
                    </div>
                  </div>

                  {/* Tokens */}
                  <div className="space-y-2">
                    {result.tokens.map((token, tokenIndex) => (
                      <a 
                        key={`${token.contractAddress}-${tokenIndex}`} 
                        href={`/token/${token.contractAddress}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r ${chain.gradient.from} ${chain.gradient.to} text-white font-bold text-sm`}>
                            {token.symbol[0]}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 group-hover:text-zeta-600">{token.name}</div>
                            <div className="text-sm text-gray-500">{token.symbol}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {parseFloat(token.formattedBalance).toLocaleString()} {token.symbol}
                          </div>
                          <div className="text-sm text-gray-600">{formatPrice(token.usdValue)}</div>
                        </div>
                      </a>
                    ))}
                  </div>

                  {/* View on Explorer */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <a
                      href={`${chain.blockExplorerUrl}/address/${result.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-zeta-600 hover:text-zeta-800 text-sm font-medium"
                    >
                      <span>View on {chain.name} Explorer</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              );
            })}

            {searchResults.length === 0 && !isSearching && !searchError && !searchQuery && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-gray-600">
                  {searchType === 'address' 
                    ? 'Enter a wallet address or contract address to search for tokens across networks' 
                    : 'Enter a token name or symbol to find matching tokens'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}