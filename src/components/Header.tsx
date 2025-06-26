'use client'

import { useState } from 'react'
import Link from 'next/link'
import WalletConnection from './WalletConnection'
import SearchModal from './SearchModal'
import { motion } from 'framer-motion'
import { useChainId } from 'wagmi'

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const chainId = useChainId()

  // Add scroll listener for header background
  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', () => {
      setIsScrolled(window.scrollY > 20)
    })
  }

  return (
    <motion.header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/80 backdrop-blur-xl border-b border-neutral-200/50 shadow-lg' 
          : 'bg-transparent'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <motion.div 
              className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity duration-200"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="w-10 h-10 bg-gradient-to-r from-zeta-500 to-zeta-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">Ƶ</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-zeta-600 to-zeta-800 bg-clip-text text-transparent">
                  ZetaChain
                </h1>
                <p className="text-xs text-neutral-500 -mt-1">Holdings</p>
              </div>
            </motion.div>
          </Link>

          {/* Navigation */}
          <motion.nav 
            className="hidden md:flex items-center space-x-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link href="/" className="text-neutral-600 hover:text-zeta-600 font-medium transition-colors duration-200">
              Portfolio
            </Link>
            <Link href="/analytics" className="text-neutral-600 hover:text-zeta-600 font-medium transition-colors duration-200">
              Analytics
            </Link>
            <Link href="/compare" className="text-neutral-600 hover:text-zeta-600 font-medium transition-colors duration-200">
              Compare
            </Link>
            <Link href="/assets" className="text-neutral-600 hover:text-zeta-600 font-medium transition-colors duration-200">
              DeFi Hub
            </Link>
            <Link href="/network" className="text-neutral-600 hover:text-zeta-600 font-medium transition-colors duration-200">
              Network Health
            </Link>
            <button onClick={() => setShowSearch(true)} className="text-neutral-600 hover:text-zeta-600 font-medium transition-colors duration-200">
              Search
            </button>
          </motion.nav>

          {/* Wallet Connection */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <WalletConnection />
          </motion.div>
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal 
        isOpen={showSearch} 
        onClose={() => setShowSearch(false)}
        currentChainId={chainId}
      />
    </motion.header>
  )
}