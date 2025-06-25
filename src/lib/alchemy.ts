import { getChainById } from '@/config/chains';

interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string;
}

export interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
}

export interface TokenPrice {
  symbol: string;
  price: number;
}

const getAlchemyUrl = (chainId: number): string => {
  const chain = getChainById(chainId);
  if (!chain || chain.supportedBy !== 'alchemy') return '';
  return chain.rpcUrl;
};

export const getTokenBalances = async (address: string, chainId: number): Promise<TokenBalance[]> => {
  try {
    const alchemyUrl = getAlchemyUrl(chainId);
    if (!alchemyUrl) {
      console.error('Unsupported chain ID:', chainId);
      return [];
    }

    // For Ethereum networks (mainnet and testnet)
    if (chainId === 1 || chainId === 11155111) {
      const results: TokenBalance[] = [];

      // First, get ETH balance
      try {
        const ethBalanceResponse = await fetch(alchemyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [address, 'latest'],
            id: 1
          })
        });

        if (ethBalanceResponse.ok) {
          const ethData = await ethBalanceResponse.json();
          if (ethData.result && ethData.result !== '0x0') {
            results.push({
              contractAddress: '0x0000000000000000000000000000000000000000',
              tokenBalance: ethData.result,
              symbol: 'ETH',
              name: 'Ethereum',
              decimals: 18
            });
          }
        }
      } catch (error) {
        console.error('Error fetching ETH balance:', error);
      }

      // Then get ERC-20 token balances
      try {
        const response = await fetch(alchemyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'alchemy_getTokenBalances',
            params: [address],
            id: 1
          })
        });

        if (!response.ok) {
          console.error('Alchemy API error:', response.status);
          return results; // Return at least ETH balance if we have it
        }

        const data = await response.json();
        
        if (data.result?.tokenBalances) {
          const tokenBalances = data.result.tokenBalances.filter(
            (token: AlchemyTokenBalance) => token.tokenBalance !== '0x0' && token.tokenBalance !== '0x'
          );

          const tokenDetails = await Promise.all(
            tokenBalances.map(async (token: AlchemyTokenBalance) => {
              try {
                const metadataResponse = await fetch(alchemyUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'alchemy_getTokenMetadata',
                    params: [token.contractAddress],
                    id: 1
                  })
                });

                if (!metadataResponse.ok) return null;
                
                const metadata = await metadataResponse.json();
                
                return {
                  contractAddress: token.contractAddress,
                  tokenBalance: token.tokenBalance,
                  symbol: metadata.result?.symbol || 'UNKNOWN',
                  name: metadata.result?.name || 'Unknown Token',
                  decimals: metadata.result?.decimals || 18,
                  logo: metadata.result?.logo
                };
              } catch (error) {
                console.error('Error fetching token metadata:', error);
                return null;
              }
            })
          );

          const validTokens = tokenDetails.filter((token): token is TokenBalance => token !== null);
          results.push(...validTokens);
        }
      } catch (error) {
        console.error('Error fetching token balances:', error);
      }

      return results;
    }
    
    // For ZetaChain networks (mainnet and testnet)
    if (chainId === 7000 || chainId === 7001) {
      try {
        const response = await fetch(alchemyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [address, 'latest'],
            id: 1
          })
        });

        if (!response.ok) {
          console.error('ZetaChain API error:', response.status);
          return [];
        }

        const data = await response.json();
        
        if (data.result && data.result !== '0x0') {
          return [
            {
              contractAddress: '0x0000000000000000000000000000000000000000',
              tokenBalance: data.result,
              symbol: 'ZETA',
              name: 'ZetaChain',
              decimals: 18
            }
          ];
        }
      } catch (error) {
        console.error('Error fetching ZetaChain balance:', error);
      }
      
      return [];
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching token balances:', error);
    return [];
  }
};

export const getTokenPrices = async (symbols: string[]): Promise<Record<string, number>> => {
  try {
    // Create a mapping of symbol to CoinGecko ID
    const symbolToId: Record<string, string> = {
      'ETH': 'ethereum',
      'ZETA': 'zetachain',
      'BTC': 'bitcoin',
      'USDC': 'usd-coin',
      'USDT': 'tether',
      'DAI': 'dai',
      'WETH': 'weth',
      'LINK': 'chainlink',
      'UNI': 'uniswap',
      'AAVE': 'aave',
      'COMP': 'compound-governance-token',
      'MKR': 'maker',
      'SNX': 'havven',
      'YFI': 'yearn-finance',
      'SUSHI': 'sushi',
      '1INCH': '1inch',
      'BAL': 'balancer',
      'CRV': 'curve-dao-token'
    };

    // Get unique CoinGecko IDs for the symbols we have
    const coinGeckoIds = [...new Set(symbols.map(symbol => 
      symbolToId[symbol.toUpperCase()] || null
    ).filter(Boolean))];

    if (coinGeckoIds.length === 0) return {};

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoIds.join(',')}&vs_currencies=usd`
    );
    
    if (!response.ok) {
      console.error('CoinGecko API error:', response.status);
      return {};
    }
    
    const data = await response.json();
    
    // Convert back to symbol-based mapping
    const priceMap: Record<string, number> = {};
    
    Object.entries(symbolToId).forEach(([symbol, geckoId]) => {
      if (data[geckoId]?.usd) {
        priceMap[symbol] = data[geckoId].usd;
      }
    });
    
    return priceMap;
  } catch (error) {
    console.error('Error fetching token prices:', error);
    return {};
  }
};