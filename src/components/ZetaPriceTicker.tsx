'use client'

import { useState, useEffect } from 'react'
import { getTokenPrices } from '@/lib/alchemy'

export default function ZetaPriceTicker() {
  const [zetaPrice, setZetaPrice] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchZetaPrice = async () => {
      try {
        const prices = await getTokenPrices(['ZETA'])
        setZetaPrice(prices['ZETA'] || 0.18) // Fallback to 0.18
      } catch (error) {
        console.error('Error fetching ZETA price:', error)
        setZetaPrice(0.18) // Fallback price
      } finally {
        setIsLoading(false)
      }
    }

    fetchZetaPrice()
    // Update price every 30 seconds
    const interval = setInterval(fetchZetaPrice, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(price)
  }

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-xs text-neutral-500">
        <div className="w-2 h-2 bg-neutral-300 rounded-full animate-pulse" />
        <span>Loading ZETA...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2 text-xs text-neutral-600">
      <div className="w-2 h-2 bg-zeta-500 rounded-full" />
      <span className="font-medium">ZETA {zetaPrice ? formatPrice(zetaPrice) : '$0.18'}</span>
    </div>
  )
}