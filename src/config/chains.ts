export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  icon: string;
  gradient: {
    from: string;
    to: string;
  };
  color: {
    bg: string;
    text: string;
    border: string;
  };
  isMainnet: boolean;
  isSupported: boolean; // Toggle to enable/disable chains
  supportedBy: 'alchemy' | 'rpc' | 'both';
  category: 'ethereum' | 'zetachain' | 'polygon' | 'arbitrum' | 'optimism' | 'base' | 'other';
}

// Comprehensive list of all Alchemy-supported chains
export const ALL_CHAINS: ChainConfig[] = [
  // Ethereum Networks
  {
    id: 1,
    name: 'Ethereum Mainnet',
    shortName: 'Ethereum',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/zYGMrg98bsMbB5cI68j6Z',
    blockExplorerUrl: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    icon: '⚡',
    gradient: { from: 'from-blue-500', to: 'to-blue-600' },
    color: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    isMainnet: true,
    isSupported: false,
    supportedBy: 'alchemy',
    category: 'ethereum'
  },
  {
    id: 11155111,
    name: 'Ethereum Sepolia',
    shortName: 'Sepolia',
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/zYGMrg98bsMbB5cI68j6Z',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    icon: '⚡',
    gradient: { from: 'from-purple-500', to: 'to-purple-600' },
    color: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
    isMainnet: false,
    isSupported: true,
    supportedBy: 'alchemy',
    category: 'ethereum'
  },
  {
    id: 17000,
    name: 'Ethereum Holesky',
    shortName: 'Holesky',
    rpcUrl: 'https://eth-holesky.g.alchemy.com/v2/zYGMrg98bsMbB5cI68j6Z',
    blockExplorerUrl: 'https://holesky.etherscan.io',
    nativeCurrency: { name: 'Holesky Ether', symbol: 'ETH', decimals: 18 },
    icon: '⚡',
    gradient: { from: 'from-indigo-500', to: 'to-indigo-600' },
    color: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
    isMainnet: false,
    isSupported: true,
    supportedBy: 'alchemy',
    category: 'ethereum'
  },

  // ZetaChain Networks
  {
    id: 7000,
    name: 'ZetaChain Mainnet',
    shortName: 'ZetaChain',
    rpcUrl: 'https://zetachain-mainnet.g.alchemy.com/v2/zYGMrg98bsMbB5cI68j6Z',
    blockExplorerUrl: 'https://explorer.zetachain.com',
    nativeCurrency: { name: 'Zeta', symbol: 'ZETA', decimals: 18 },
    icon: 'Ζ',
    gradient: { from: 'from-green-500', to: 'to-green-600' },
    color: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    isMainnet: true,
    isSupported: true,
    supportedBy: 'alchemy',
    category: 'zetachain'
  },
  {
    id: 7001,
    name: 'ZetaChain Athens',
    shortName: 'Athens',
    rpcUrl: 'https://zetachain-testnet.g.alchemy.com/v2/zYGMrg98bsMbB5cI68j6Z',
    blockExplorerUrl: 'https://zetachain-athens-3.blockscout.com',
    nativeCurrency: { name: 'Zeta', symbol: 'ZETA', decimals: 18 },
    icon: 'Ζ',
    gradient: { from: 'from-yellow-500', to: 'to-yellow-600' },
    color: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    isMainnet: false,
    isSupported: true,
    supportedBy: 'alchemy',
    category: 'zetachain'
  },

  // Polygon Networks
  {
    id: 137,
    name: 'Polygon Mainnet',
    shortName: 'Polygon',
    rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/zYGMrg98bsMbB5cI68j6Z',
    blockExplorerUrl: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    icon: '🔷',
    gradient: { from: 'from-purple-500', to: 'to-pink-500' },
    color: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
    isMainnet: true,
    isSupported: true,
    supportedBy: 'alchemy',
    category: 'polygon'
  },
  {
    id: 80001,
    name: 'Polygon Mumbai',
    shortName: 'Mumbai',
    rpcUrl: 'https://polygon-mumbai.g.alchemy.com/v2/zYGMrg98bsMbB5cI68j6Z',
    blockExplorerUrl: 'https://mumbai.polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    icon: '🔷',
    gradient: { from: 'from-purple-400', to: 'to-pink-400' },
    color: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
    isMainnet: false,
    isSupported: true,
    supportedBy: 'alchemy',
    category: 'polygon'
  },

  // Arbitrum Networks
  {
    id: 42161,
    name: 'Arbitrum One',
    shortName: 'Arbitrum',
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/zYGMrg98bsMbB5cI68j6Z',
    blockExplorerUrl: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    icon: '🔵',
    gradient: { from: 'from-blue-400', to: 'to-cyan-400' },
    color: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    isMainnet: true,
    isSupported: true,
    supportedBy: 'alchemy',
    category: 'arbitrum'
  },
  {
    id: 421614,
    name: 'Arbitrum Sepolia',
    shortName: 'Arb Sepolia',
    rpcUrl: 'https://arb-sepolia.g.alchemy.com/v2/zYGMrg98bsMbB5cI68j6Z',
    blockExplorerUrl: 'https://sepolia.arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    icon: '🔵',
    gradient: { from: 'from-blue-300', to: 'to-cyan-300' },
    color: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    isMainnet: false,
    isSupported: true,
    supportedBy: 'alchemy',
    category: 'arbitrum'
  },

  // Optimism Networks
  {
    id: 10,
    name: 'Optimism Mainnet',
    shortName: 'Optimism',
    rpcUrl: 'https://opt-mainnet.g.alchemy.com/v2/zYGMrg98bsMbB5cI68j6Z',
    blockExplorerUrl: 'https://optimistic.etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    icon: '🔴',
    gradient: { from: 'from-red-500', to: 'to-pink-500' },
    color: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    isMainnet: true,
    isSupported: true,
    supportedBy: 'alchemy',
    category: 'optimism'
  },
  {
    id: 11155420,
    name: 'Optimism Sepolia',
    shortName: 'OP Sepolia',
    rpcUrl: 'https://opt-sepolia.g.alchemy.com/v2/zYGMrg98bsMbB5cI68j6Z',
    blockExplorerUrl: 'https://sepolia-optimism.etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    icon: '🔴',
    gradient: { from: 'from-red-400', to: 'to-pink-400' },
    color: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    isMainnet: false,
    isSupported: true,
    supportedBy: 'alchemy',
    category: 'optimism'
  },

  // Base Networks
  {
    id: 8453,
    name: 'Base Mainnet',
    shortName: 'Base',
    rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/zYGMrg98bsMbB5cI68j6Z',
    blockExplorerUrl: 'https://basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    icon: '🟦',
    gradient: { from: 'from-blue-600', to: 'to-indigo-600' },
    color: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    isMainnet: true,
    isSupported: true,
    supportedBy: 'alchemy',
    category: 'base'
  },
  {
    id: 84532,
    name: 'Base Sepolia',
    shortName: 'Base Sepolia',
    rpcUrl: 'https://base-sepolia.g.alchemy.com/v2/zYGMrg98bsMbB5cI68j6Z',
    blockExplorerUrl: 'https://sepolia.basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    icon: '🟦',
    gradient: { from: 'from-blue-400', to: 'to-indigo-400' },
    color: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    isMainnet: false,
    isSupported: true,
    supportedBy: 'alchemy',
    category: 'base'
  }
];

// Get only supported chains
export const SUPPORTED_CHAINS = ALL_CHAINS.filter(chain => chain.isSupported);

// Get chains by category
export const getChainsByCategory = (category: ChainConfig['category']) => 
  ALL_CHAINS.filter(chain => chain.category === category);

// Get chain by ID
export const getChainById = (chainId: number): ChainConfig | undefined => 
  ALL_CHAINS.find(chain => chain.id === chainId);

// Get supported chains by mainnet status
export const getMainnetChains = () => SUPPORTED_CHAINS.filter(chain => chain.isMainnet);
export const getTestnetChains = () => SUPPORTED_CHAINS.filter(chain => !chain.isMainnet);