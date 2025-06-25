# ZetaChain Holdings

A modern cryptocurrency portfolio application that allows users to connect their wallet and view token balances across multiple networks including ZetaChain and Ethereum. Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🔗 **Wallet Connection**: Connect MetaMask and other EVM-compatible wallets
- 🌐 **Multi-Chain Support**: View balances across ZetaChain and Ethereum networks (mainnet & testnets)
- 📊 **Portfolio Analytics**: Real-time token balances with USD values and historical performance
- 🔍 **Search Functionality**: Search any wallet address to view token holdings across networks
- 📈 **Portfolio History**: Interactive charts showing portfolio performance and allocation
- ⚙️ **Network Management**: Easy network configuration and management interface
- 🎨 **Modern UI**: Professional design with glassmorphism effects and smooth animations

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- An Alchemy API key (for token balance fetching)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd zetachain-holdings
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Add your Alchemy API key to `.env.local`:
```
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Managing Available Chains

The application supports multiple blockchain networks through a flexible configuration system. You can easily add, remove, or modify supported networks by editing the chain configuration.

### Chain Configuration File

All network configurations are managed in `src/config/chains.ts`. This file contains:

- **ALL_CHAINS**: Complete list of all available networks with their configurations
- **SUPPORTED_CHAINS**: Filtered list of currently enabled networks
- Network metadata including RPC URLs, explorers, icons, and styling

### Adding a New Network

To add a new blockchain network:

1. Open `src/config/chains.ts`
2. Add a new chain configuration to the `ALL_CHAINS` array:

```typescript
{
  id: 137, // Chain ID
  name: 'Polygon Mainnet',
  shortName: 'Polygon',
  rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
  blockExplorerUrl: 'https://polygonscan.com',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  icon: '🔷', // Emoji or icon
  gradient: { from: 'from-purple-500', to: 'to-pink-500' }, // Tailwind gradient classes
  color: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  isMainnet: true,
  isSupported: true, // Set to true to enable the network
  supportedBy: 'alchemy', // 'alchemy' | 'rpc' | 'both'
  category: 'polygon' // Network category for organization
}
```

### Enabling/Disabling Networks

To enable or disable a network without removing it:

1. Open `src/config/chains.ts`
2. Find the network in the `ALL_CHAINS` array
3. Set `isSupported: true` to enable or `isSupported: false` to disable

```typescript
{
  id: 137,
  name: 'Polygon Mainnet',
  // ... other config
  isSupported: true, // Change this to enable/disable
}
```

### Network Categories

Networks are organized into categories for better management:

- `ethereum` - Ethereum mainnet and testnets
- `zetachain` - ZetaChain networks
- `polygon` - Polygon networks
- `arbitrum` - Arbitrum networks
- `optimism` - Optimism networks
- `base` - Base networks
- `other` - Other networks

### Network Management UI

The application includes a built-in network management interface:

1. **Access**: Press `Cmd/Ctrl + Shift + C` or click the gear icon in the bottom-left
2. **View**: See all available networks categorized by type
3. **Status**: View which networks are enabled/disabled
4. **Developer Info**: See instructions for enabling disabled networks

### Adding Alchemy Support

For networks that use Alchemy:

1. Ensure your Alchemy account supports the network
2. Update the RPC URL with your Alchemy endpoint
3. Set `supportedBy: 'alchemy'` in the chain config
4. Add any necessary token balance fetching logic in `src/lib/alchemy.ts`

### Custom RPC Networks

For networks not supported by Alchemy:

1. Set `supportedBy: 'rpc'` in the chain config
2. Provide a public RPC URL
3. Implement custom balance fetching logic if needed

## Project Structure

```
src/
├── app/
│   └── page.tsx              # Main application page with tab navigation
├── components/
│   ├── ChainManagement.tsx   # Network management interface
│   ├── SearchModal.tsx       # Wallet search functionality
│   └── PortfolioHistory.tsx  # Historical portfolio performance charts
├── config/
│   └── chains.ts             # Network configuration and management
├── hooks/
│   └── useWallet.ts          # Wallet connection and management hook
└── lib/
    └── alchemy.ts            # Token balance fetching via Alchemy API
```

## Key Features Explained

### Holdings Tab
- Real-time token balance display
- Network switching with visual indicators
- Token sorting (by value, amount, alphabetical)
- Click-to-copy wallet addresses
- USD value calculations with price data

### History Tab
- Portfolio value over time (line chart)
- Asset allocation (pie chart)
- Token value breakdown (bar chart)
- Performance metrics and insights
- Mock historical data with realistic fluctuations

### Search Functionality
- Search any wallet address across all supported networks
- Real-time balance fetching and USD value calculation
- Network-organized results display
- Direct links to block explorers

## Technologies Used

- **Next.js 15** - React framework with app router
- **TypeScript** - Type safety and development experience
- **Tailwind CSS** - Utility-first styling framework
- **Ethers.js** - Ethereum wallet integration
- **Recharts** - Interactive charting library
- **Alchemy API** - Token balance and metadata fetching
- **CoinGecko API** - Cryptocurrency price data

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and test them
4. Commit with a descriptive message: `git commit -m "Add new feature"`
5. Push to your branch: `git push origin feature/new-feature`
6. Open a pull request

## Environment Variables

```bash
# Required
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key

# Optional (for additional features)
NEXT_PUBLIC_COINGECKO_API_KEY=your_coingecko_pro_api_key
```

## Deployment

The application can be deployed to various platforms:

### Vercel (Recommended)
```bash
npm run build
vercel --prod
```

### Other Platforms
```bash
npm run build
npm start
```

## License

MIT License - see LICENSE file for details.