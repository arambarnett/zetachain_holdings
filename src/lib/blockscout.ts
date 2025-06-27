// ZetaChain Blockscout API integration for real network stats

const BLOCKSCOUT_BASE_URL = 'https://zetachain.blockscout.com'
const API_KEY = process.env.NEXT_PUBLIC_BLOCKSCOUT_API_KEY || '341a516f-204d-4aaf-a659-546019e0b666'

interface BlockscoutStats {
  total_blocks: string
  total_transactions: string
  total_addresses: string
  average_block_time: number
  total_gas_used: string
}

interface BlockscoutBlock {
  number: number
  timestamp: string
  transaction_count: number
  gas_used: string
  gas_limit: string
  size: number
  hash: string
  miner_hash: string
}

interface BlockscoutTransaction {
  hash: string
  block_number: number
  from_address_hash: string
  to_address_hash: string
  value: string
  gas_price: string
  gas_used: string
  status: string
  timestamp: string
}

interface NetworkStats {
  blockHeight: number
  avgBlockTime: number
  totalTransactions: number
  totalAddresses: number
  avgTransactionFee: string
  latestBlocks: BlockscoutBlock[]
  recentTransactions: BlockscoutTransaction[]
}

export const fetchNetworkStats = async (): Promise<NetworkStats | null> => {
  try {
    // Fetch general stats
    const statsResponse = await fetch(`${BLOCKSCOUT_BASE_URL}/api/v2/stats`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    let stats: BlockscoutStats | null = null
    if (statsResponse.ok) {
      stats = await statsResponse.json()
    }

    // Fetch latest blocks
    const blocksResponse = await fetch(`${BLOCKSCOUT_BASE_URL}/api/v2/blocks?type=block`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    let latestBlocks: BlockscoutBlock[] = []
    if (blocksResponse.ok) {
      const blocksData = await blocksResponse.json()
      latestBlocks = blocksData.items?.slice(0, 5) || []
    }

    // Fetch recent transactions
    const txResponse = await fetch(`${BLOCKSCOUT_BASE_URL}/api/v2/transactions`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    let recentTransactions: BlockscoutTransaction[] = []
    if (txResponse.ok) {
      const txData = await txResponse.json()
      recentTransactions = txData.items?.slice(0, 10) || []
    }

    // Calculate average transaction fee from recent transactions
    const calculateAvgTransactionFee = () => {
      if (recentTransactions.length > 0) {
        const totalFees = recentTransactions.reduce((sum, tx) => {
          const gasPrice = parseInt(tx.gas_price || '0')
          const gasUsed = parseInt(tx.gas_used || '0')
          const fee = gasPrice * gasUsed
          return sum + (isNaN(fee) ? 0 : fee)
        }, 0)
        
        const avgFeeInWei = totalFees / recentTransactions.length
        
        // Convert wei to ZETA and format with appropriate decimal places
        const avgFeeInZeta = avgFeeInWei / 1e18
        
        if (avgFeeInZeta < 0.000001) {
          // Show in scientific notation for very small amounts
          return `${avgFeeInZeta.toExponential(2)} ZETA`
        } else if (avgFeeInZeta < 0.001) {
          // Show with 6 decimal places
          return `${avgFeeInZeta.toFixed(6)} ZETA`
        } else if (avgFeeInZeta < 1) {
          // Show with 4 decimal places  
          return `${avgFeeInZeta.toFixed(4)} ZETA`
        } else {
          // Show with 2 decimal places
          return `${avgFeeInZeta.toFixed(2)} ZETA`
        }
      }
      
      return '0.000021 ZETA' // Default estimate
    }

    // Get latest block info
    const latestBlock = latestBlocks[0]
    const blockHeight = latestBlock?.number || parseInt(stats?.total_blocks || '0')


    return {
      blockHeight,
      avgBlockTime: stats?.average_block_time || latestBlocks.length >= 2 
        ? (new Date(latestBlocks[0]?.timestamp).getTime() - new Date(latestBlocks[1]?.timestamp).getTime()) / 1000
        : 6.2,
      totalTransactions: parseInt(stats?.total_transactions || '0'),
      totalAddresses: parseInt(stats?.total_addresses || '0'),
      avgTransactionFee: calculateAvgTransactionFee(),
      latestBlocks,
      recentTransactions
    }

  } catch (error) {
    console.error('Error fetching Blockscout data:', error)
    return null
  }
}

export const fetchTokenSupply = async (): Promise<{ totalSupply: string; circulatingSupply: string } | null> => {
  try {
    // Fetch ZETA token information from Blockscout
    const tokenResponse = await fetch(`${BLOCKSCOUT_BASE_URL}/api/v2/tokens/0x0000000000000000000000000000000000000000`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json()
      return {
        totalSupply: tokenData.total_supply || '2100000000',
        circulatingSupply: tokenData.circulating_supply || '1200000000'
      }
    }

    // Fallback to estimated values if API doesn't provide token info
    return {
      totalSupply: '2100000000',
      circulatingSupply: '1200000000'
    }

  } catch (error) {
    console.error('Error fetching token supply:', error)
    return {
      totalSupply: '2100000000',
      circulatingSupply: '1200000000'
    }
  }
}

export const formatNumber = (num: number): string => {
  if (num >= 1e9) {
    return (num / 1e9).toFixed(1) + 'B'
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M'
  } else if (num >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K'
  }
  return num.toLocaleString()
}

export const formatBlockTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  } else {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`
  }
}