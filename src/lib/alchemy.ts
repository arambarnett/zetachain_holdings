import { getChainById } from '@/config/chains';
import { Alchemy } from 'alchemy-sdk';

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
  marketCap?: number;
  volume24h?: number;
  change24h?: number;
  totalSupply?: number;
  circulatingSupply?: number;
}

// Initialize Alchemy SDK for Prices API
const alchemy = new Alchemy({ 
  apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'demo'
});

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
              contractAddress: '0xf091867ec603a6628ed83d274e835539d82e9cc8',
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

// Price cache to reduce API calls
const priceCache = new Map<string, { price: number; timestamp: number }>()
const CACHE_DURATION = 300000 // 5 minutes (increased from 30 seconds to reduce API calls)

// Separate API key pools for different features
// Portfolio uses keys 1 & 2, Token pages use key 3
const COINGECKO_PORTFOLIO_KEYS = [
  process.env.NEXT_PUBLIC_COINGECKO_API_KEY_1,
  process.env.NEXT_PUBLIC_COINGECKO_API_KEY_2,
  process.env.NEXT_PUBLIC_COINGECKO_API_KEY || 'CG-dbufBv4poxBTxgc181AQnsEB' // Fallback for legacy
].filter(Boolean)

const COINGECKO_TOKEN_KEYS = [
  process.env.NEXT_PUBLIC_COINGECKO_API_KEY_3
].filter(Boolean) as string[]

// Legacy: Keep for backwards compatibility
const COINGECKO_API_KEYS = COINGECKO_PORTFOLIO_KEYS

let currentKeyIndex = 0
const keyFailureCount = new Map<string, { count: number; lastFailure: number }>()
const KEY_FAILURE_COOLDOWN = 120000 // 2 minutes cooldown after failures

const getNextApiKey = (keyPool: (string | undefined)[] = COINGECKO_API_KEYS): string => {
  if (keyPool.length === 0) {
    // Fallback if no keys are configured
    return 'CG-dbufBv4poxBTxgc181AQnsEB'
  }
  
  const now = Date.now()
  
  // Find a key that hasn't failed recently
  for (let i = 0; i < keyPool.length; i++) {
    const keyIndex = (currentKeyIndex + i) % keyPool.length
    const key = keyPool[keyIndex]
    if (!key) continue
    
    const failure = keyFailureCount.get(key)
    
    if (!failure || (now - failure.lastFailure) > KEY_FAILURE_COOLDOWN) {
      currentKeyIndex = (keyIndex + 1) % keyPool.length
      return key
    }
  }
  
  // If all keys have failed recently, use the oldest failure
  let oldestFailureKey = keyPool[0] || 'CG-dbufBv4poxBTxgc181AQnsEB'
  let oldestFailureTime = now
  
  for (const key of keyPool) {
    if (!key) continue
    const failure = keyFailureCount.get(key)
    if (failure && failure.lastFailure < oldestFailureTime) {
      oldestFailureTime = failure.lastFailure
      oldestFailureKey = key
    }
  }
  
  return oldestFailureKey
}

const recordKeyFailure = (key: string): void => {
  const failure = keyFailureCount.get(key) || { count: 0, lastFailure: 0 }
  failure.count += 1
  failure.lastFailure = Date.now()
  keyFailureCount.set(key, failure)
  console.warn(`CoinGecko API key failure recorded (${failure.count} failures):`, key.substring(0, 8) + '...')
}

const recordKeySuccess = (key: string): void => {
  // Reset failure count on successful request
  keyFailureCount.delete(key)
}

// Utility function to get API key status for debugging
export const getCoinGeckoApiStatus = () => {
  const now = Date.now()
  const keyStatus = COINGECKO_API_KEYS.map(key => {
    if (!key) return null
    const failure = keyFailureCount.get(key)
    return {
      key: key.substring(0, 8) + '...',
      failures: failure?.count || 0,
      lastFailure: failure?.lastFailure || 0,
      isAvailable: !failure || (now - failure.lastFailure) > KEY_FAILURE_COOLDOWN,
      cooldownRemaining: failure ? Math.max(0, KEY_FAILURE_COOLDOWN - (now - failure.lastFailure)) : 0
    }
  }).filter(Boolean)
  
  return {
    totalKeys: COINGECKO_API_KEYS.length,
    availableKeys: keyStatus.filter(status => status?.isAvailable).length,
    keyStatus
  }
}

// Dedicated function for token detail pages using separate API key pool
export const fetchCoinGeckoData = async (url: string): Promise<Response> => {
  console.log('COINGECKO_TOKEN_KEYS:', COINGECKO_TOKEN_KEYS)
  const apiKey = getNextApiKey(COINGECKO_TOKEN_KEYS)
  console.log('Using API key for token page:', apiKey.substring(0, 8) + '...')
  
  const response = await fetch(url, {
    headers: {
      'X-CG-API-KEY': apiKey
    },
    signal: AbortSignal.timeout(5000) // 5 second timeout
  })
  
  if (!response.ok) {
    console.error('CoinGecko API failed:', response.status, response.statusText)
    if (response.status === 429) {
      recordKeyFailure(apiKey)
      throw new Error('Rate limited')
    }
    throw new Error(`API call failed: ${response.status}`)
  }
  
  return response
}

// Preload common token prices to improve performance
export const preloadCommonPrices = async () => {
  const commonTokens = ['ETH', 'BTC', 'USDC', 'USDT', 'ZETA', 'LINK', 'UNI']
  try {
    await getTokenPrices(commonTokens)
    console.log('Common prices preloaded')
  } catch (error) {
    console.warn('Failed to preload common prices:', error)
  }
}

// New Alchemy Prices API functions
export const getTokenPricesFromAlchemy = async (symbols: string[]): Promise<Record<string, number>> => {
  try {
    const now = Date.now()
    const priceMap: Record<string, number> = {}
    const symbolsToFetch: string[] = []
    
    // Check cache first
    for (const symbol of symbols) {
      const cached = priceCache.get(symbol)
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        priceMap[symbol] = cached.price
      } else {
        symbolsToFetch.push(symbol)
      }
    }
    
    // If all prices are cached, return immediately
    if (symbolsToFetch.length === 0) {
      console.log('All prices loaded from cache')
      return priceMap
    }
    
    console.log(`Fetching prices from Alchemy for: ${symbolsToFetch.join(', ')}`)
    
    try {
      // Use Alchemy Prices API
      const data = await alchemy.prices.getTokenPriceBySymbol(symbolsToFetch)
      
      if (data?.data) {
        data.data.forEach((tokenData: { symbol?: string; prices?: Array<{ value?: string }> }) => {
          if (tokenData.symbol && tokenData.prices?.[0]?.value) {
            const price = parseFloat(tokenData.prices[0].value)
            priceMap[tokenData.symbol] = price
            // Cache the price
            priceCache.set(tokenData.symbol, { price, timestamp: now })
          }
        })
      }
      
      console.log(`Fetched and cached ${Object.keys(priceMap).length - (symbols.length - symbolsToFetch.length)} prices from Alchemy`)
      return priceMap
      
    } catch (alchemyError) {
      console.warn('Alchemy Prices API failed, falling back to CoinGecko:', alchemyError)
      // Fallback to CoinGecko
      return await getTokenPricesFromCoinGecko(symbolsToFetch)
    }
    
  } catch (error) {
    console.error('Error fetching token prices:', error)
    // Return cached prices if available
    const fallbackPrices: Record<string, number> = {}
    for (const symbol of symbols) {
      const cached = priceCache.get(symbol)
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        fallbackPrices[symbol] = cached.price
      }
    }
    return fallbackPrices
  }
}

// Renamed original function to be explicit about CoinGecko usage
export const getTokenPricesFromCoinGecko = async (symbols: string[]): Promise<Record<string, number>> => {
  try {
    const now = Date.now()
    const priceMap: Record<string, number> = {}
    const symbolsToFetch: string[] = []
    
    // Check cache first
    for (const symbol of symbols) {
      const cached = priceCache.get(symbol)
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        priceMap[symbol] = cached.price
      } else {
        symbolsToFetch.push(symbol)
      }
    }
    
    // If all prices are cached, return immediately
    if (symbolsToFetch.length === 0) {
      console.log('All prices loaded from cache')
      return priceMap
    }
    
    console.log(`Fetching prices for: ${symbolsToFetch.join(', ')}`)
    
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
      'CRV': 'curve-dao-token',
      'SOL': 'solana',
      'ADA': 'cardano'
    };

    // Get unique CoinGecko IDs for the symbols we need to fetch
    const coinGeckoIds = [...new Set(symbolsToFetch.map(symbol => 
      symbolToId[symbol.toUpperCase()] || null
    ).filter(Boolean))];

    if (coinGeckoIds.length === 0) return priceMap;

    // Try API keys in round robin fashion
    let lastError: Error | null = null
    let response: Response | null = null
    const maxAttempts = Math.max(1, COINGECKO_API_KEYS.length)
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const apiKey = getNextApiKey()
      
      try {
        console.log(`Attempting CoinGecko API call with key: ${apiKey.substring(0, 8)}...`)
        
        response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoIds.join(',')}&vs_currencies=usd`,
          {
            headers: {
              'X-CG-API-KEY': apiKey
            },
            signal: AbortSignal.timeout(5000) // 5 second timeout
          }
        )
        
        if (response.ok) {
          recordKeySuccess(apiKey)
          console.log(`CoinGecko API success with key: ${apiKey.substring(0, 8)}...`)
          break
        } else if (response.status === 429) {
          // Rate limited - try next key
          recordKeyFailure(apiKey)
          console.warn(`Rate limited on key ${apiKey.substring(0, 8)}..., trying next key`)
          lastError = new Error(`Rate limited: ${response.status}`)
          response = null
          continue
        } else {
          // Other error - record failure and try next key
          recordKeyFailure(apiKey)
          lastError = new Error(`API error: ${response.status}`)
          response = null
          continue
        }
      } catch (error) {
        recordKeyFailure(apiKey)
        lastError = error as Error
        console.error(`Network error with key ${apiKey.substring(0, 8)}...:`, error)
        continue
      }
    }
    
    if (!response || !response.ok) {
      console.error('All CoinGecko API keys failed:', lastError?.message || 'Unknown error')
      return priceMap // Return cached prices if all API keys fail
    }
    
    const data = await response.json();
    
    // Add fetched prices to the map and cache
    Object.entries(symbolToId).forEach(([symbol, geckoId]) => {
      if (data[geckoId]?.usd) {
        const price = data[geckoId].usd;
        priceMap[symbol] = price;
        // Cache the price
        priceCache.set(symbol, { price, timestamp: now });
      }
    });
    
    console.log(`Fetched and cached ${Object.keys(data).length} prices`);
    return priceMap;
  } catch (error) {
    console.error('Error fetching token prices:', error);
    // Return empty object if no cached prices available
    const fallbackPrices: Record<string, number> = {}
    for (const symbol of symbols) {
      const cached = priceCache.get(symbol)
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        fallbackPrices[symbol] = cached.price
      }
    }
    return fallbackPrices;
  }
};

// Main function - now uses Alchemy by default
export const getTokenPrices = async (symbols: string[]): Promise<Record<string, number>> => {
  return await getTokenPricesFromAlchemy(symbols);
};

// New function to get comprehensive token data - uses Alchemy for prices, CoinGecko for additional data
export const getTokenData = async (symbols: string[]): Promise<Record<string, TokenPrice>> => {
  try {
    // Get prices from Alchemy first
    const prices = await getTokenPricesFromAlchemy(symbols);
    
    // Get additional market data from CoinGecko
    const marketData = await getTokenMarketDataFromCoinGecko(symbols);
    
    // Combine the data
    const tokenDataMap: Record<string, TokenPrice> = {};
    
    symbols.forEach(symbol => {
      const price = prices[symbol] || 0;
      const market = marketData[symbol] || {};
      
      tokenDataMap[symbol] = {
        symbol,
        price,
        marketCap: market.marketCap || 0,
        volume24h: market.volume24h || 0,
        change24h: market.change24h || 0
      };
    });
    
    return tokenDataMap;
  } catch (error) {
    console.error('Error fetching comprehensive token data:', error);
    return {};
  }
};

// Helper function to get market data from CoinGecko (for additional data not available in Alchemy)
export const getTokenMarketDataFromCoinGecko = async (symbols: string[]): Promise<Record<string, { marketCap?: number; volume24h?: number; change24h?: number }>> => {
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
      'CRV': 'curve-dao-token',
      'SOL': 'solana',
      'ADA': 'cardano'
    };

    // Get unique CoinGecko IDs for the symbols we have
    const coinGeckoIds = [...new Set(symbols.map(symbol => 
      symbolToId[symbol.toUpperCase()] || null
    ).filter(Boolean))];

    if (coinGeckoIds.length === 0) return {};

    // Try API keys in round robin fashion
    let lastError: Error | null = null
    let response: Response | null = null
    const maxAttempts = Math.max(1, COINGECKO_API_KEYS.length)
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const apiKey = getNextApiKey()
      
      try {
        response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoIds.join(',')}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
          {
            headers: {
              'X-CG-API-KEY': apiKey
            },
            signal: AbortSignal.timeout(5000) // 5 second timeout
          }
        )
        
        if (response.ok) {
          recordKeySuccess(apiKey)
          break
        } else if (response.status === 429) {
          recordKeyFailure(apiKey)
          lastError = new Error(`Rate limited: ${response.status}`)
          response = null
          continue
        } else {
          recordKeyFailure(apiKey)
          lastError = new Error(`API error: ${response.status}`)
          response = null
          continue
        }
      } catch (error) {
        recordKeyFailure(apiKey)
        lastError = error as Error
        continue
      }
    }
    
    if (!response || !response.ok) {
      console.error('All CoinGecko API keys failed for market data:', lastError?.message || 'Unknown error')
      return {}
    }
    
    const data = await response.json();
    
    // Convert back to symbol-based mapping with market data only
    const marketDataMap: Record<string, { marketCap?: number; volume24h?: number; change24h?: number }> = {};
    
    Object.entries(symbolToId).forEach(([symbol, geckoId]) => {
      if (data[geckoId]) {
        marketDataMap[symbol] = {
          marketCap: data[geckoId].usd_market_cap || 0,
          volume24h: data[geckoId].usd_24h_vol || 0,
          change24h: data[geckoId].usd_24h_change || 0
        };
      }
    });
    
    return marketDataMap;
  } catch (error) {
    console.error('Error fetching market data from CoinGecko:', error);
    return {};
  }
};

// Function to get detailed token information - uses Alchemy for price, CoinGecko for detailed market data
export const getDetailedTokenInfo = async (symbol: string): Promise<TokenPrice | null> => {
  try {
    // Get price from Alchemy
    const priceData = await getTokenPricesFromAlchemy([symbol]);
    const price = priceData[symbol] || 0;
    
    // Get detailed market data from CoinGecko
    const detailedData = await getDetailedTokenInfoFromCoinGecko(symbol);
    
    if (!detailedData && price === 0) {
      return null;
    }
    
    return {
      symbol,
      price, // Use Alchemy price
      marketCap: detailedData?.marketCap || 0,
      volume24h: detailedData?.volume24h || 0,
      change24h: detailedData?.change24h || 0,
      totalSupply: detailedData?.totalSupply || 0,
      circulatingSupply: detailedData?.circulatingSupply || 0
    };
  } catch (error) {
    console.error('Error fetching detailed token info:', error);
    return null;
  }
};

// Helper function to get detailed market data from CoinGecko
export const getDetailedTokenInfoFromCoinGecko = async (symbol: string): Promise<TokenPrice | null> => {
  try {
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
      'CRV': 'curve-dao-token',
      'SOL': 'solana',
      'ADA': 'cardano'
    };

    const geckoId = symbolToId[symbol.toUpperCase()];
    if (!geckoId) return null;

    // Try API keys in round robin fashion
    let lastError: Error | null = null
    let response: Response | null = null
    const maxAttempts = Math.max(1, COINGECKO_API_KEYS.length)
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const apiKey = getNextApiKey()
      
      try {
        response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${geckoId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
          {
            headers: {
              'X-CG-API-KEY': apiKey
            },
            signal: AbortSignal.timeout(5000) // 5 second timeout
          }
        )
        
        if (response.ok) {
          recordKeySuccess(apiKey)
          break
        } else if (response.status === 429) {
          recordKeyFailure(apiKey)
          lastError = new Error(`Rate limited: ${response.status}`)
          response = null
          continue
        } else {
          recordKeyFailure(apiKey)
          lastError = new Error(`API error: ${response.status}`)
          response = null
          continue
        }
      } catch (error) {
        recordKeyFailure(apiKey)
        lastError = error as Error
        continue
      }
    }
    
    if (!response || !response.ok) {
      console.error('All CoinGecko API keys failed for detailed token info:', lastError?.message || 'Unknown error')
      return null
    }
    
    const data = await response.json();
    
    return {
      symbol,
      price: data.market_data?.current_price?.usd || 0, // This will be overridden by Alchemy price
      marketCap: data.market_data?.market_cap?.usd || 0,
      volume24h: data.market_data?.total_volume?.usd || 0,
      change24h: data.market_data?.price_change_percentage_24h || 0,
      totalSupply: data.market_data?.total_supply || 0,
      circulatingSupply: data.market_data?.circulating_supply || 0
    };
  } catch (error) {
    console.error('Error fetching detailed token info from CoinGecko:', error);
    return null;
  }
};