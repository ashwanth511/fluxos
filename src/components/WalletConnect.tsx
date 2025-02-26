import { useState } from 'react'
import { Button } from './ui/button'
import { Wallet, ChevronDown, Bot } from 'lucide-react'
import { WalletStrategy } from '@injectivelabs/wallet-ts'
import { Network } from '@injectivelabs/networks'
import { ChainId } from '@injectivelabs/ts-types'
import { AtomIcon } from './atom-icon'

export default function WalletConnect() {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState('')

  const connectWallet = async () => {
    try {
      const walletStrategy = new WalletStrategy({
        chainId: ChainId.Mainnet,
        networkType: Network.Mainnet
      })

      await walletStrategy.connectWallet()
      const addresses = await walletStrategy.getAddresses()
      if (addresses.length > 0) {
        setAddress(addresses[0])
        setIsConnected(true)
      }
    } catch (e) {
      console.error('Failed to connect wallet:', e)
    }
  }

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
            <span className="ml-2 text-xl font-semibold font-space-grotesk">FLUXOS</span>
          </div>
          
          <div className="flex items-center gap-2">
            {!isConnected ? (
              <Button 
                onClick={connectWallet}
                variant="outline"
                className="font-space-grotesk flex items-center gap-2 border-gray-200"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="font-space-grotesk flex items-center gap-2 border-gray-200"
              >
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {formatAddress(address)}
                <ChevronDown className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
