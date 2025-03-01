import { useState } from 'react'
import { Button } from './ui/button'
import { Wallet as WalletIcon, ChevronDown } from 'lucide-react'
import { Wallet } from '@injectivelabs/wallet-ts'
import { Network } from '@injectivelabs/networks'
import { AtomIcon } from './atom-icon'
import { Link } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'

// Define supported wallets
const supportedWallets = [
  { type: Wallet.Keplr, name: 'Keplr', category: 'cosmos' },
  { type: Wallet.Metamask, name: 'MetaMask', category: 'evm' },
  { type: Wallet.WalletConnect, name: 'WalletConnect', category: 'evm' },
  { type: Wallet.Leap, name: 'Leap', category: 'cosmos' },
  { type: Wallet.Cosmostation, name: 'Cosmostation', category: 'cosmos' }
] as const

export default function WalletConnect() {
  const { 
    isConnected, 
    address, 
    network,
    connecting: isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    switchNetwork
  } = useWallet()

  const [showWalletDropdown, setShowWalletDropdown] = useState(false)
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false)

  const formatAddress = (addr: string) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <AtomIcon className='w-6 h-6'/>
            <Link to="/"> <span className="ml-2 text-xl font-semibold font-space-grotesk">FLUXOS</span></Link>
          </div>
          
          <div className="flex items-center gap-2 relative">
            {!isConnected ? (
              <div className="relative">
                <Button 
                  onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                  variant="outline"
                  className="font-space-grotesk flex items-center gap-2 border-gray-200"
                  disabled={isConnecting}
                >
                  <WalletIcon className="w-4 h-4" />
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  <ChevronDown className="w-4 h-4" />
                </Button>

                {/* Wallet Selection Dropdown */}
                {showWalletDropdown && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-1" role="menu">
                      {supportedWallets.map((wallet) => (
                        <button
                          key={wallet.type}
                          onClick={() => {
                            connectWallet(wallet.type);
                            setShowWalletDropdown(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                        >
                          {wallet.name}
                          <span className="ml-2 text-xs text-gray-500">
                            ({wallet.category})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <Button 
                  variant="outline" 
                  className="font-space-grotesk flex items-center gap-2 border-gray-200"
                  onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                >
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  {formatAddress(address)}
                  <ChevronDown className="w-4 h-4" />
                </Button>

                {/* Network Info & Disconnect Dropdown */}
                {showNetworkDropdown && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-1" role="menu">
                      <div className="px-4 py-2 text-sm font-medium text-gray-900">
                        Network
                      </div>
                      <button
                        onClick={() => {
                          switchNetwork(Network.Mainnet);
                          setShowNetworkDropdown(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          network === Network.Mainnet ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                        } hover:bg-gray-100`}
                      >
                        Mainnet
                      </button>
                      <button
                        onClick={() => {
                          switchNetwork(Network.Testnet);
                          setShowNetworkDropdown(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          network === Network.Testnet ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                        } hover:bg-gray-100`}
                      >
                        Testnet
                      </button>
                      <div className="border-t border-gray-100"></div>
                      <button
                        onClick={() => {
                          disconnectWallet();
                          setShowNetworkDropdown(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        role="menuitem"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {error && (
          <div className="text-red-500 text-sm mt-2">
            {error}
          </div>
        )}
      </div>
    </header>
  )
}
