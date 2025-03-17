import { WalletStrategy } from '../utils/WalletStrategy';

// Define a type for the price update callback
type PriceUpdateCallback = (price: number) => void;

export class PriceMonitoringService {
  private subscriptions: Map<string, number>; // Changed from NodeJS.Timer to number
  private walletStrategy: WalletStrategy;
  private callbacks: Map<string, PriceUpdateCallback>;

  constructor(walletStrategy: WalletStrategy) {
    this.walletStrategy = walletStrategy;
    this.subscriptions = new Map();
    this.callbacks = new Map();
    
    // Use wallet strategy for logging
    console.log(`Price monitoring service initialized for chain: ${this.walletStrategy.getChainId()}`);
  }

  async getPrice(market: string): Promise<number> {
    try {
      console.log(`Getting price for market: ${market}`);
      // In a real implementation, this would call the API
      // For now, we'll return a random price for testing
      return Math.random() * 1000 + 500; // Random price between 500-1500
    } catch (error) {
      console.error('Error fetching price:', error);
      return 0;
    }
  }

  subscribeToPrice(
    nodeId: string, 
    market: string, 
    interval = 5000,
    callback?: PriceUpdateCallback
  ): number {
    console.log(`Subscribing to price updates for ${market} with node ID ${nodeId}`);
    
    // Store the callback if provided
    if (callback) {
      this.callbacks.set(nodeId, callback);
    }
    
    // Clear any existing subscription for this node
    if (this.subscriptions.has(nodeId)) {
      clearInterval(this.subscriptions.get(nodeId) as number);
    }

    // Set up new interval
    const timerId = window.setInterval(async () => {
      const price = await this.getPrice(market);
      console.log(`Price update for ${market}: $${price.toFixed(2)}`);
      
      // Call the callback if it exists
      const cb = this.callbacks.get(nodeId);
      if (cb) {
        cb(price);
      }
    }, interval);

    this.subscriptions.set(nodeId, timerId);
    return timerId;
  }

  stopAllSubscriptions(): void {
    console.log('Stopping all price subscriptions');
    this.subscriptions.forEach((interval) => clearInterval(interval));
    this.subscriptions.clear();
    this.callbacks.clear();
  }
}
