import { Network } from '@injectivelabs/networks';

// Define Keplr wallet interface
interface KeplrWallet {
  enable: (chainId: string) => Promise<void>;
  getOfflineSigner: (chainId: string) => any;
  getOfflineSignerAuto: (chainId: string) => any;
  signDirect: (chainId: string, signerAddress: string, signDoc: any) => Promise<any>;
  experimentalSuggestChain: (chainInfo: any) => Promise<void>;
  signAmino: (chainId: string, signerAddress: string, signDoc: any) => Promise<any>;
}

// Extend Window interface globally
declare global {
  interface Window {
    keplr: KeplrWallet | undefined;
  }
}

interface WalletStrategyOptions {
  chainId: string;
  network: Network;
}

export class WalletStrategy {
  private chainId: string;
  private network: Network;
  private connected: boolean = false;
  private address: string = '';

  constructor({ chainId, network }: WalletStrategyOptions) {
    this.chainId = chainId;
    this.network = network;
    console.log(`Wallet strategy initialized for chain: ${this.chainId}`);
    
    // Check if already connected
    this.checkConnection();
  }

  private async checkConnection(): Promise<void> {
    try {
      const address = await this.getAddress();
      if (address) {
        this.connected = true;
        this.address = address;
        console.log('Already connected with address:', this.address);
      }
    } catch (error) {
      this.connected = false;
      this.address = '';
    }
  }

  getChainId(): string {
    return this.chainId;
  }

  getNetwork(): Network {
    return this.network;
  }

  isConnected(): boolean {
    return this.connected;
  }
  
  getConnectedAddress(): string {
    return this.address;
  }

  async connect(): Promise<boolean> {
    try {
      // Check if Keplr is installed
      if (!window.keplr) {
        alert("Keplr wallet extension is not installed. Please install it to continue.");
        return false;
      }

      // Request connection to Keplr
      await window.keplr.enable(this.chainId);
      
      // Get the address
      const address = await this.getAddress();
      if (address) {
        this.connected = true;
        this.address = address;
        console.log('Wallet connected successfully:', address);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      this.connected = false;
      return false;
    }
  }

  disconnect(): void {
    this.connected = false;
    this.address = '';
    console.log('Wallet disconnected');
    // Note: Keplr doesn't have a direct disconnect method, we just clear our local state
  }

  async getAddress(): Promise<string> {
    try {
      if (!window.keplr) {
        throw new Error('Keplr wallet extension not found');
      }
      
      const offlineSigner = window.keplr.getOfflineSigner(this.chainId);
      const accounts = await offlineSigner.getAccounts();
      
      if (accounts && accounts.length > 0) {
        return accounts[0].address;
      }
      
      throw new Error('No accounts found');
    } catch (error) {
      console.error('Error getting address:', error);
      throw error;
    }
  }

  async signAndBroadcastTransaction(transaction: any): Promise<any> {
    try {
      if (!this.isConnected()) {
        throw new Error('Wallet not connected');
      }

      // In a real implementation, this would use the Keplr wallet to sign and broadcast
      // For demonstration, we'll simulate a successful transaction
      console.log('Signing transaction:', transaction);
      
      // Simulate opening Keplr wallet for confirmation
      alert('Keplr wallet would open here for transaction confirmation');
      
      // Simulate transaction success
      return {
        success: true,
        hash: `0x${Math.random().toString(16).substring(2, 10)}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  }
}