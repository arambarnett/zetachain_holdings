'use client';

import { useState } from 'react';
import { ALL_CHAINS, SUPPORTED_CHAINS, getChainsByCategory, type ChainConfig } from '@/config/chains';

interface ChainManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChainManagement({ isOpen, onClose }: ChainManagementProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  if (!isOpen) return null;

  const categories = [
    { id: 'all', name: 'All Networks', count: ALL_CHAINS.length },
    { id: 'ethereum', name: 'Ethereum', count: getChainsByCategory('ethereum').length },
    { id: 'zetachain', name: 'ZetaChain', count: getChainsByCategory('zetachain').length },
    { id: 'polygon', name: 'Polygon', count: getChainsByCategory('polygon').length },
    { id: 'arbitrum', name: 'Arbitrum', count: getChainsByCategory('arbitrum').length },
    { id: 'optimism', name: 'Optimism', count: getChainsByCategory('optimism').length },
    { id: 'base', name: 'Base', count: getChainsByCategory('base').length },
  ];

  const filteredChains = selectedCategory === 'all' 
    ? ALL_CHAINS 
    : getChainsByCategory(selectedCategory as ChainConfig['category']);

  const supportedCount = SUPPORTED_CHAINS.length;
  const totalCount = ALL_CHAINS.length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Network Management</h2>
              <p className="text-gray-600 mt-1">
                {supportedCount} of {totalCount} networks currently supported
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

        <div className="flex h-[calc(90vh-120px)]">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
            <div className="space-y-1">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left p-3 rounded-xl transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-100 text-blue-800'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-sm text-gray-500">{category.count}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredChains.map(chain => (
                <div
                  key={chain.id}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    chain.isSupported
                      ? `${chain.color.bg} ${chain.color.border} ${chain.color.text}`
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
                        chain.isSupported
                          ? `bg-gradient-to-r ${chain.gradient.from} ${chain.gradient.to} text-white`
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {chain.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">{chain.name}</h4>
                        <p className="text-sm opacity-75">Chain ID: {chain.id}</p>
                        <p className="text-sm opacity-75">{chain.nativeCurrency.symbol}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        chain.isSupported
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {chain.isSupported ? 'Enabled' : 'Disabled'}
                      </div>
                      
                      {!chain.isMainnet && (
                        <div className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          Testnet
                        </div>
                      )}
                      
                      <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {chain.supportedBy}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-current/20">
                    <div className="flex items-center justify-between text-sm">
                      <span className="opacity-75">Block Explorer:</span>
                      <a
                        href={chain.blockExplorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        View
                      </a>
                    </div>
                  </div>

                  {/* Note for developers */}
                  {!chain.isSupported && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-800">
                        💡 To enable this network, set <code>isSupported: true</code> in <code>src/config/chains.ts</code>
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredChains.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <p className="text-gray-600">No networks found in this category</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}