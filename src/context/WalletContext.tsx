import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  WalletStrategy, 
  Wallet
} from '@injectivelabs/wallet-ts';
import { Network, getNetworkEndpoints } from '@injectivelabs/networks';
import { ChainId, EthereumChainId } from '@injectivelabs/ts-types';
import { BigNumberInBase, BigNumberInWei } from '@injectivelabs/utils';
import { 
  ChainRestAuthApi,
  ChainRestBankApi,
} from '@injectivelabs/sdk-ts';
import { getInjectiveAddress } from '@injectivelabs/sdk-ts';

interface WalletContextType {
  isConnected: boolean;
  address: string;
  network: Network;
  walletType: Wallet | null;
  walletStrategy: WalletStrategy | null;
  connecting: boolean;
  error: string;
  balance: string;
  connectWallet: (walletType: Wallet) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  switchNetwork: (network: Network) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState(Network.Testnet);
  const [walletType, setWalletType] = useState<Wallet | null>(null);
  const [walletStrategy, setWalletStrategy] = useState<WalletStrategy | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [balance, setBalance] = useState('0');

  // Clear all wallet state
  const clearWalletState = () => {
    setIsConnected(false);
    setAddress('');
    setWalletStrategy(null);
    setWalletType(null);
    setError('');
    setBalance('0');
    localStorage.removeItem('walletType');
    localStorage.removeItem('network');
  };

  // Fetch balance function
  const fetchBalance = async (injectiveAddress: string, endpoints: ReturnType<typeof getNetworkEndpoints>) => {
    try {
      // Create bank API with increased timeout
      const bankApi = new ChainRestBankApi(endpoints.rest, {
        timeout: 30000, // Increase timeout to 30 seconds
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      // Add a timeout promise to handle API hanging
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Balance fetch timeout')), 30000);
      });
      
      // Race between the actual fetch and the timeout
      const balanceResponse = await Promise.race([
        bankApi.fetchBalance(injectiveAddress, 'inj'),
        timeoutPromise
      ]) as any;
      
      if (!balanceResponse || !balanceResponse.amount) {
        console.log('No balance data returned, defaulting to 0');
        setBalance('0');
        return;
      }

      // Convert from Wei (18 decimals) to human readable format
      const amountInWei = new BigNumberInWei(balanceResponse.amount);
      const amountInToken = amountInWei.toBase();
      
      // Format to max 6 decimal places if it's not zero
      if (amountInToken.eq(0)) {
        setBalance('0');
      } else {
        setBalance(parseFloat(amountInToken.toFixed()).toFixed(6));
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      // Don't reset balance to 0 on error, keep previous value
      // Just log the error and continue
    }
  };

  // Add periodic balance refresh with more robust handling
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let retryCount = 0;
    const maxRetries = 3;
    const initialInterval = 15000; // 15 seconds
    const backoffInterval = 30000; // 30 seconds after failures

    if (isConnected && address) {
      // Initial fetch
      const endpoints = getNetworkEndpoints(network);
      fetchBalance(address, endpoints);

      // Refresh with exponential backoff on failures
      const refreshBalance = async () => {
        try {
          await fetchBalance(address, endpoints);
          // Reset retry count on success
          retryCount = 0;
        } catch (error) {
          console.warn(`Balance refresh attempt ${retryCount + 1} failed:`, error);
          retryCount++;
        }

        // Schedule next refresh with appropriate interval
        const nextInterval = retryCount > 0 ? backoffInterval : initialInterval;
        intervalId = setTimeout(refreshBalance, nextInterval);
      };

      // Start the refresh cycle
      intervalId = setTimeout(refreshBalance, initialInterval);
    }

    return () => {
      if (intervalId) {
        clearTimeout(intervalId);
      }
    };
  }, [isConnected, address, network]);

  // Try to restore wallet connection on page load
  useEffect(() => {
    const savedWalletType = localStorage.getItem('walletType');
    const savedNetwork = localStorage.getItem('network');
    
    if (savedWalletType && savedNetwork) {
      connectWallet(savedWalletType as Wallet, savedNetwork as Network);
    }
  }, []);

  const connectWallet = async (type: Wallet, networkType: Network = network) => {
    try {
      setConnecting(true);
      setError('');
      
      // Create a timeout for the entire connection process
      const connectionTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout - network may be unavailable')), 30000);
      });
      
      // Get network endpoints with fallbacks
      const endpoints = getNetworkEndpoints(networkType);
      const isMainnet = networkType === Network.Mainnet;
      
      // Create wallet strategy with more robust configuration
      const strategy = new WalletStrategy({
        chainId: isMainnet ? ChainId.Mainnet : ChainId.Testnet,
        ethereumOptions: {
          ethereumChainId: isMainnet ? EthereumChainId.Mainnet : EthereumChainId.Goerli,
          rpcUrl: endpoints.rpc
        },
        chainName: isMainnet ? 'injective-1' : 'injective-888',
        restUrl: endpoints.rest,
        // Add timeout options
        options: {
          timeout: 30000, // 30 seconds timeout
          headers: { 'Cache-Control': 'no-cache' }
        }
      });

      // Set the wallet type
      await Promise.race([
        strategy.setWallet(type),
        connectionTimeout
      ]);

      // Get addresses and handle EVM conversion if needed
      const addresses = await Promise.race([
        strategy.getAddresses(),
        connectionTimeout
      ]);
      
      if (addresses && addresses.length > 0) {
        let injectiveAddress = addresses[0];

        // Convert Ethereum address to Injective address if using MetaMask or other EVM wallets
        if (type === Wallet.Metamask || type === Wallet.WalletConnect) {
          injectiveAddress = getInjectiveAddress(addresses[0]);
        }

        // Add the network to MetaMask if using it
        if (type === Wallet.Metamask) {
          try {
            const ethereum = (window as any).ethereum;
            if (ethereum) {
              // First switch chain, if it fails, then add the chain
              try {
                await Promise.race([
                  ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: `0x${isMainnet ? 'e9' : '89'}` }],
                  }),
                  connectionTimeout
                ]);
              } catch (switchError: any) {
                // This error code indicates that the chain has not been added to MetaMask
                if (switchError.code === 4902) {
                  await Promise.race([
                    ethereum.request({
                      method: 'wallet_addEthereumChain',
                      params: [{
                        chainId: `0x${isMainnet ? 'e9' : '89'}`,
                        chainName: isMainnet ? 'Injective' : 'Injective Testnet',
                        nativeCurrency: {
                          name: 'INJ',
                          symbol: 'INJ',
                          decimals: 18
                        },
                        rpcUrls: [endpoints.rpc],
                        blockExplorerUrls: [isMainnet ? 'https://explorer.injective.network' : 'https://testnet.explorer.injective.network']
                      }],
                    }),
                    connectionTimeout
                  ]);
                } else {
                  throw switchError;
                }
              }
            }
          } catch (error) {
            console.error('Error configuring MetaMask network:', error);
            throw new Error('Failed to configure network in MetaMask');
          }
        }

        setAddress(injectiveAddress);
        setIsConnected(true);
        setWalletStrategy(strategy);
        setWalletType(type);
        setNetwork(networkType);
        
        // Save wallet info for persistence
        localStorage.setItem('walletType', type);
        localStorage.setItem('network', networkType);

        // Fetch initial balance with a catch to prevent connection failure
        try {
          await fetchBalance(injectiveAddress, endpoints);
        } catch (balanceError) {
          console.warn('Initial balance fetch failed, will retry later:', balanceError);
          // Don't throw - we still want to complete the connection
        }
      } else {
        throw new Error('No addresses found');
      }
    } catch (error: any) {
      let errorMessage = 'Unknown error occurred';
      if (error.message?.includes('not installed')) {
        errorMessage = `${type} wallet is not installed`;
      } else if (error.message?.includes('rejected')) {
        errorMessage = 'Connection rejected by user';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Connection timed out. The network may be unavailable or overloaded.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      setError(errorMessage);
      console.error('Wallet connection error:', errorMessage);
      clearWalletState();
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      if (walletStrategy) {
        // First disconnect from the wallet strategy
        await walletStrategy.disconnect();

        // Handle MetaMask specific disconnection
        if (walletType === Wallet.Metamask) {
          try {
            const ethereum = (window as any).ethereum;
            if (ethereum) {
              // Remove all listeners
              if (ethereum.removeAllListeners) {
                ethereum.removeAllListeners();
              }
              
              // Request account disconnection
              await ethereum.request({
                method: 'wallet_requestPermissions',
                params: [{ eth_accounts: {} }]
              }).catch(() => {});
            }
          } catch (error) {
            console.error('Error disconnecting from MetaMask:', error);
          }
        }

        // Handle Keplr specific disconnection
        if (walletType === Wallet.Keplr) {
          try {
            const keplr = (window as any).keplr;
            if (keplr) {
              // Clear Keplr session
              if (keplr.disable) {
                await keplr.disable();
              }
              // Remove chain suggestions
              if (keplr.clearOfflineSigner) {
                await keplr.clearOfflineSigner();
              }
            }
          } catch (error) {
            console.error('Error disconnecting from Keplr:', error);
          }
        }

        // Handle Cosmostation specific disconnection
        if (walletType === Wallet.Cosmostation) {
          try {
            const cosmostation = (window as any).cosmostation;
            if (cosmostation) {
              // Clear Cosmostation connection
              if (cosmostation.disconnect) {
                await cosmostation.disconnect();
              }
            }
          } catch (error) {
            console.error('Error disconnecting from Cosmostation:', error);
          }
        }

        // Handle Leap specific disconnection
        if (walletType === Wallet.Leap) {
          try {
            const leap = (window as any).leap;
            if (leap) {
              // Clear Leap connection
              if (leap.disconnect) {
                await leap.disconnect();
              }
            }
          } catch (error) {
            console.error('Error disconnecting from Leap:', error);
          }
        }

        // Clear all local storage
        localStorage.clear();
        sessionStorage.clear();

        // Clear all wallet state
        clearWalletState();

        // Force a page reload to ensure clean state
        window.location.reload();
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to disconnect wallet';
      setError(errorMessage);
      console.error('Disconnect error:', errorMessage);
      
      // Even if there's an error, clear the state and reload
      clearWalletState();
      window.location.reload();
    }
  };

  const switchNetwork = async (newNetwork: Network) => {
    if (!walletType || !walletStrategy) {
      setError('No wallet connected');
      return;
    }

    try {
      setConnecting(true);
      
      // For MetaMask, we need to switch networks first
      if (walletType === Wallet.Metamask) {
        const ethereum = (window as any).ethereum;
        const isMainnet = newNetwork === Network.Mainnet;
        const chainId = `0x${isMainnet ? 'e9' : '89'}`;
        
        try {
          // First try to switch
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId }],
          });
        } catch (switchError: any) {
          // If the network doesn't exist, add it
          if (switchError.code === 4902) {
            const endpoints = getNetworkEndpoints(newNetwork);
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId,
                chainName: isMainnet ? 'Injective' : 'Injective Testnet',
                nativeCurrency: {
                  name: 'INJ',
                  symbol: 'INJ',
                  decimals: 18
                },
                rpcUrls: [endpoints.rpc],
                blockExplorerUrls: [isMainnet ? 'https://explorer.injective.network' : 'https://testnet.explorer.injective.network']
              }]
            });
          } else {
            throw switchError;
          }
        }
      }

      // Reconnect with the new network
      await connectWallet(walletType, newNetwork);
    } catch (error: any) {
      console.error('Error switching network:', error);
      setError(error.message || 'Failed to switch network');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        network,
        walletType,
        walletStrategy,
        connecting,
        error,
        balance,
        connectWallet,
        disconnectWallet,
        switchNetwork,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
