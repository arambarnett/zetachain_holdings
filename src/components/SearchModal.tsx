'use client';

import { useState } from 'react';
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
      searchAddress(searchQuery.trim());
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Wallet & Token Search</h2>
              <p className="text-gray-600 mt-1">
                Search any wallet address to view token balances across networks
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
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter wallet address (0x...)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm"
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
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
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
                      <div key={`${token.contractAddress}-${tokenIndex}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r ${chain.gradient.from} ${chain.gradient.to} text-white font-bold text-sm`}>
                            {token.symbol[0]}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{token.name}</div>
                            <div className="text-sm text-gray-500">{token.symbol}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {parseFloat(token.formattedBalance).toLocaleString()} {token.symbol}
                          </div>
                          <div className="text-sm text-gray-600">{formatPrice(token.usdValue)}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* View on Explorer */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <a
                      href={`${chain.blockExplorerUrl}/address/${result.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
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

            {searchResults.length === 0 && !isSearching && !searchError && searchQuery && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-gray-600">Enter a wallet address to search for tokens</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}