import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { 
  walletConnect, 
  metaMask, 
  coinbaseWallet,
  injected 
} from 'wagmi/connectors'

// ZetaChain custom chains
const zetaMainnet = {
  id: 7000,
  name: 'ZetaChain Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'ZETA',
    symbol: 'ZETA',
  },
  rpcUrls: {
    default: {
      http: ['https://zetachain-evm.blockpi.network/v1/rpc/public'],
    },
  },
  blockExplorers: {
    default: { name: 'ZetaScan', url: 'https://explorer.zetachain.com' },
  },
} as const

const zetaAthens = {
  id: 7001,
  name: 'ZetaChain Athens',
  nativeCurrency: {
    decimals: 18,
    name: 'ZETA',
    symbol: 'ZETA',
  },
  rpcUrls: {
    default: {
      http: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'],
    },
  },
  blockExplorers: {
    default: { name: 'ZetaScan Athens', url: 'https://athens3.explorer.zetachain.com' },
  },
} as const

// WalletConnect Project ID (get this from https://cloud.walletconnect.com)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'a01e2f3c4d5e6f7g8h9i0j1k2l3m4n5o'

export const config = createConfig({
  chains: [mainnet, sepolia, zetaMainnet, zetaAthens],
  connectors: [
    injected({ shimDisconnect: true }),
    metaMask({
      dappMetadata: {
        name: 'ZetaChain Holdings',
        url: typeof window !== 'undefined' ? window.location.href : '',
      },
    }),
    walletConnect({
      projectId,
      metadata: {
        name: 'ZetaChain Holdings',
        description: 'Track your ZetaChain portfolio',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000',
        icons: [typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : 'https://zetachain.com/favicon.ico'],
      },
      showQrModal: true,
      qrModalOptions: {
        themeMode: 'light',
        themeVariables: {
          '--wcm-z-index': '1000',
        },
      },
    }),
    coinbaseWallet({
      appName: 'ZetaChain Holdings',
      appLogoUrl: 'https://zetachain.com/favicon.ico',
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [zetaMainnet.id]: http('https://zetachain-evm.blockpi.network/v1/rpc/public'),
    [zetaAthens.id]: http('https://zetachain-athens-evm.blockpi.network/v1/rpc/public'),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}