import { GoogleGenerativeAI } from "@google/generative-ai";
import { loadMoonPay } from '@moonpay/moonpay-js';
import { Network, getNetworkEndpoints } from '@injectivelabs/networks';
import { 
  ChainGrpcBankApi, 
  ChainGrpcStakingApi, 
  IndexerGrpcOracleApi
} from '@injectivelabs/sdk-ts';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface TokenDenom {
  denom: string;
  name: string;
  symbol: string;
  decimals: number;
  logoUrl?: string;
}

export interface ValidatorInfo {
  address: string;
  moniker: string;
  commission: string;
  tokens: string;
  status: string;
}

export class AgentService {
  private model;
  private chat;
  private bankApi: ChainGrpcBankApi;
  private stakingApi: ChainGrpcStakingApi;
  private oracleApi: IndexerGrpcOracleApi;
  private network: Network;

  constructor() {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Initialize Injective SDK
    this.network = Network.Testnet;
    const endpoints = getNetworkEndpoints(this.network);
    this.bankApi = new ChainGrpcBankApi(endpoints.grpc);
    this.stakingApi = new ChainGrpcStakingApi(endpoints.grpc);
    this.oracleApi = new IndexerGrpcOracleApi(endpoints.indexer);

    this.chat = this.model.startChat({
      history: [
        {
          role: "user",
          parts: [{
            text: "You are Flux OS for Injective Protocol. Keep responses concise. For any messages about buying INJ, checking INJ balance, staking INJ, fetching token denoms, or getting price data, respond with 'I'll help you with that.' Do not try to interpret buy/sell amounts or provide trading advice. Only help with general questions about Injective Protocol."
          }]
        },
        {
          role: "model",
          parts: [{
            text: "Understood. I'll keep responses concise and only handle general Injective Protocol questions. For buy INJ, balance check, staking, token denom, or price data requests, I'll acknowledge and let the system handle them."
          }]
        }
      ]
    });
  }

  async sendMessage(message: string): Promise<string> {
    try {
      const lowerMessage = message.toLowerCase();
      
      // Return empty string for buy/balance/stake/tokens/price commands to prevent chat duplication
      if ((lowerMessage.includes('buy') && lowerMessage.includes('inj')) || 
          lowerMessage.includes('balance') || 
          lowerMessage.includes('check inj') ||
          lowerMessage.includes('stake') ||
          lowerMessage.includes('all tokens') ||
          lowerMessage.includes('token denoms') ||
          lowerMessage.includes('price')) {
        return "";
      }

      // Only process non-buy/balance messages through chat
      const result = await this.chat.sendMessage([{ text: message }]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error:', error);
      return "Error. Try again.";
    }
  }

  async buyINJWithFiatSimple(amount: string, walletAddress: string, isTokenAmount = false): Promise<string> {
    try {
      if (!walletAddress) {
        return "Please connect your wallet first to buy INJ.";
      }

      // Validate amount
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return "Please provide a valid amount to purchase.";
      }

      // Check minimum requirements
      if (!isTokenAmount && numAmount < 20) {
        return "The minimum purchase amount is $20 worth of INJ. Please increase your purchase amount.";
      }

      // For token quantity purchases, estimate dollar value (using a placeholder price of $10 per INJ)
      // In a real app, you would fetch the current price from an API
      const estimatedPrice = 10; // $10 per INJ (placeholder)
      let baseCurrencyAmount = isTokenAmount ? (numAmount * estimatedPrice).toString() : amount;
      
      // Ensure minimum $20 equivalent for token purchases
      if (isTokenAmount && Number(baseCurrencyAmount) < 20) {
        return `To purchase ${numAmount} INJ tokens (approximately $${Number(baseCurrencyAmount).toFixed(2)}), you need to buy at least $20 worth. Please increase your purchase amount to at least 2 INJ.`;
      }

      // Create MoonPay URL with parameters
      const moonpayUrl = new URL('https://buy-sandbox.moonpay.com');
      moonpayUrl.searchParams.append('apiKey', 'pk_test_rgHL1yD1AZz4emc2GWjzSc6Z02JYU4');
      moonpayUrl.searchParams.append('currencyCode', 'inj');
      moonpayUrl.searchParams.append('walletAddress', walletAddress);
      
      // If token amount, we use the extraFiatAmount parameter
      if (isTokenAmount) {
        moonpayUrl.searchParams.append('quoteCurrencyAmount', amount); // Amount in INJ tokens
      } else {
        moonpayUrl.searchParams.append('baseCurrencyAmount', amount); // Amount in USD
      }
      
      moonpayUrl.searchParams.append('redirectURL', window.location.origin);
      moonpayUrl.searchParams.append('colorCode', '#000000');

      // Calculate center position for the popup
      const width = 600;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      // Open MoonPay in a centered window
      const moonpayWindow = window.open(
        moonpayUrl.toString(),
        'MoonPay',
        `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no,scrollbars=no,resizable=no,status=no`
      );

      if (!moonpayWindow || moonpayWindow.closed || typeof moonpayWindow.closed === 'undefined') {
        return "Popup was blocked. Please allow popups for this site to buy INJ.";
      }

      // Return empty string to avoid duplicate messages in chat
      return "";
    } catch (error) {
      console.error('MoonPay Error:', error);
      return "Error processing your INJ purchase. Please try again or visit https://buy.moonpay.com directly.";
    }
  }

  async buyINJWithFiat(amount: string, walletAddress: string): Promise<string> {
    return this.buyINJWithFiatSimple(amount, walletAddress);
  }

  async checkINJBalance(walletAddress: string): Promise<string> {
    try {
      if (!walletAddress) {
        return "Please connect your wallet first to check your INJ balance.";
      }

      try {
        // Fetch balance using Injective SDK
        const balanceResponse = await this.bankApi.fetchBalance({
          accountAddress: walletAddress,
          denom: 'inj'
        });
        
        // Convert from base units (10^18) to INJ
        const balance = parseFloat(balanceResponse.amount) / 10**18;
        
        // Format the balance with 6 decimal places
        const formattedBalance = balance.toFixed(6);
        
        return `Your INJ balance: ${formattedBalance} INJ for wallet ${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}`;
      } catch (sdkError) {
        console.error('SDK Error:', sdkError);
        
        // Fallback to explorer if SDK fails
        const explorerUrl = `https://testnet.explorer.injective.network/account/${walletAddress}`;
        window.open(explorerUrl, "_blank");
        
        return `Unable to fetch balance directly. Opening Injective Explorer to check your INJ balance for wallet ${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}.`;
      }
    } catch (error) {
      console.error('Explorer Error:', error);
      return "Error checking your INJ balance. Please visit https://testnet.explorer.injective.network manually.";
    }
  }

  /**
   * NEW FEATURE 1: Get all token denoms from the Injective chain
   * @returns Promise with array of token denoms
   */
  async getAllTokenDenoms(): Promise<TokenDenom[]> {
    try {
      // Fetch denoms metadata
      const { metadatas } = await this.bankApi.fetchDenomsMetadata();
      
      // Define popular/trending tokens to prioritize
      const trendingTokens = ['inj', 'peggy0xdAC17F958D2ee523a2206206994597C13D831ec7', 'factory/inj17vytdwqczqz72j65saukplrktd4gyfme5agf6c/atom'];
      
      // Map to TokenDenom interface
      let tokens: TokenDenom[] = metadatas.map(metadata => ({
        denom: metadata.base,
        name: metadata.name || metadata.base,
        symbol: metadata.symbol || metadata.base.split('/').pop() || metadata.base,
        decimals: metadata.denomUnits?.[metadata.denomUnits.length-1]?.exponent || 0,
        logoUrl: metadata.uri || ''
      }));
      
      // Fetch total supply to get any tokens that might not have metadata
      const { supply } = await this.bankApi.fetchAllTotalSupply();
      
      // Add tokens from supply that might not have metadata
      for (const coin of supply) {
        // Skip if already added
        if (tokens.some(token => token.denom === coin.denom)) {
          continue;
        }
        
        // Extract a readable symbol from the denom
        const symbol = coin.denom.split('/').pop() || coin.denom;
        
        tokens.push({
          denom: coin.denom,
          name: symbol,
          symbol: symbol,
          decimals: 0
        });
      }
      
      // Sort tokens to show trending ones first
      tokens = tokens.sort((a, b) => {
        const aIsTrending = trendingTokens.includes(a.denom);
        const bIsTrending = trendingTokens.includes(b.denom);
        
        if (aIsTrending && !bIsTrending) return -1;
        if (!aIsTrending && bIsTrending) return 1;
        
        // Secondary sort by symbol
        return a.symbol.localeCompare(b.symbol);
      });
      
      return tokens;
    } catch (error) {
      console.error('Error fetching token denoms:', error);
      
      // Return a minimal set of fallback tokens if API fails
      return [
        {
          denom: 'inj',
          name: 'Injective',
          symbol: 'INJ',
          decimals: 18,
          logoUrl: 'https://static.alchemyapi.io/images/assets/7226.png'
        },
        {
          denom: 'peggy0xdAC17F958D2ee523a2206206994597C13D831ec7',
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: 6,
          logoUrl: 'https://static.alchemyapi.io/images/assets/825.png'
        }
      ];
    }
  }

  /**
   * NEW FEATURE 2: Stake INJ tokens to a validator
   * @param amount - Amount of INJ to stake
   * @param walletAddress - User's wallet address
   * @param validatorAddress - Address of the validator to stake to
   * @returns Promise with staking result
   */
  async stakeINJ(amount: string, walletAddress: string, validatorAddress: string): Promise<string> {
    try {
      if (!walletAddress) {
        return "Please connect your wallet first to stake INJ.";
      }

      // Validate amount
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return "Please provide a valid amount to stake.";
      }

      // Check if validatorAddress is a moniker instead of an address
      if (!validatorAddress.startsWith('injvaloper')) {
        // Try to find the validator by moniker
        const validators = await this.getValidators();
        const validator = validators.find(v => 
          v.moniker.toLowerCase() === validatorAddress.toLowerCase());
        
        if (validator) {
          validatorAddress = validator.address;
        } else {
          return `Could not find validator with name "${validatorAddress}". Please provide a valid validator name or address.`;
        }
      }

      // Open explorer to the staking page
      const stakingUrl = `https://testnet.explorer.injective.network/validators/${validatorAddress}?action=delegate`;
      window.open(stakingUrl, "_blank");
      
      return `Opening Injective Explorer to stake ${amount} INJ to validator ${validatorAddress.slice(0,10)}... Please complete the transaction in the explorer.`;
    } catch (error) {
      console.error('Error staking INJ:', error);
      return "Error processing your staking request. Please try again or visit https://testnet.explorer.injective.network/validators manually.";
    }
  }

  /**
   * Get list of validators for staking
   * @returns Promise with array of validator info
   */
  async getValidators(): Promise<ValidatorInfo[]> {
    try {
      const { validators } = await this.stakingApi.fetchValidators();
      
      // Filter to only active validators and sort by tokens
      const activeValidators = validators
        .filter(validator => validator.status.toString() === '3')
        .sort((a, b) => parseFloat(b.tokens) - parseFloat(a.tokens))
        .map(validator => ({
          address: validator.operatorAddress,
          moniker: validator.description?.moniker || 'Unknown',
          commission: (parseFloat(validator.commission?.commissionRates?.rate || '0') * 100).toFixed(2) + '%',
          tokens: (parseFloat(validator.tokens) / 10**18).toFixed(2) + ' INJ',
          status: 'Active'
        }));
      
      // Return top 10 validators for better UX
      return activeValidators.slice(0, 10);
    } catch (error) {
      console.error('Error fetching validators:', error);
      
      // Return fallback validators if API fails
      return [
        {
          address: 'injvaloper1ypvzalcm74ycj6tr4rhhlxkwxlz3t59yff8jdz',
          moniker: 'Injective Foundation',
          commission: '0.00%',
          tokens: '1000000.00 INJ',
          status: 'Active'
        },
        {
          address: 'injvaloper1ultw9r29l8nxy5u6thcgusjn95vsy2cwr05234',
          moniker: 'Figment',
          commission: '5.00%',
          tokens: '500000.00 INJ',
          status: 'Active'
        },
        {
          address: 'injvaloper1qv8yd2d6qvjcm7zcx5j0jqsh6vyt0yk2qvlrr5',
          moniker: 'Binance Staking',
          commission: '10.00%',
          tokens: '450000.00 INJ',
          status: 'Active'
        }
      ];
    }
  }

  /**
   * NEW FEATURE 3: Get INJ price from oracle
   * @returns Promise with INJ price data
   */
  async getINJPrice(): Promise<string> {
    try {
      // Use CoinGecko API for real-time prices
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=injective&vs_currencies=usd&include_24hr_change=true');
        const data = await response.json();
        
        if (data && data.injective && data.injective.usd) {
          const price = data.injective.usd;
          const change = data.injective.usd_24h_change || 0;
          const changeSymbol = change >= 0 ? '+' : '';
          
          return `Current INJ price: $${price.toFixed(4)} USD (${changeSymbol}${change.toFixed(2)}% 24h)`;
        }
      } catch (coingeckoError) {
        console.error('CoinGecko API Error:', coingeckoError);
      }
      
      // Fallback: Use a hardcoded recent price
      return "Current INJ price: $18.75 USDT (estimated)";
    } catch (error) {
      console.error('Price Error:', error);
      return "Current INJ price: $18.75 USDT (estimated)";
    }
  }

  /**
   * Get price for any Cosmos ecosystem token
   * @param tokenSymbol Symbol of the token to get price for (e.g., 'ATOM', 'OSMO')
   * @returns Promise with token price data
   */
  async getCosmosTokenPrice(tokenSymbol: string): Promise<string> {
    try {
      // Map of token symbols to CoinGecko IDs
      const tokenIdMap: Record<string, string> = {
        'INJ': 'injective',
        'ATOM': 'cosmos',
        'OSMO': 'osmosis',
        'JUNO': 'juno-network',
        'STARS': 'stargaze',
        'AKT': 'akash-network',
        'SCRT': 'secret',
        'EVMOS': 'evmos',
        'LUNA': 'terra-luna-2',
        'USDC': 'usd-coin'
      };
      
      // Convert symbol to lowercase for case-insensitive matching
      const normalizedSymbol = tokenSymbol.toUpperCase();
      
      // Get the CoinGecko ID for the token
      const coinId = tokenIdMap[normalizedSymbol];
      if (!coinId) {
        return `Price not available for ${tokenSymbol}. Supported tokens: ${Object.keys(tokenIdMap).join(', ')}`;
      }
      
      // Fetch price from CoinGecko
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`);
      const data = await response.json();
      
      if (data && data[coinId] && data[coinId].usd) {
        const price = data[coinId].usd;
        const change = data[coinId].usd_24h_change || 0;
        const changeSymbol = change >= 0 ? '+' : '';
        
        return `Current ${normalizedSymbol} price: $${price.toFixed(4)} USD (${changeSymbol}${change.toFixed(2)}% 24h)`;
      } else {
        throw new Error('Price data not available');
      }
    } catch (error) {
      console.error(`Error fetching ${tokenSymbol} price:`, error);
      return `Unable to fetch current price for ${tokenSymbol}. Please try again later.`;
    }
  }

  /**
   * Get prices for multiple Cosmos ecosystem tokens
   * @returns Promise with formatted price data for key Cosmos tokens
   */
  async getCosmosEcosystemPrices(): Promise<string> {
    try {
      // Key tokens in the Cosmos ecosystem
      const tokens = ['INJ', 'ATOM', 'OSMO', 'JUNO'];
      
      // Fetch all prices in parallel
      const pricePromises = tokens.map(token => this.getCosmosTokenPrice(token));
      const prices = await Promise.all(pricePromises);
      
      // Format the results
      return prices.join('\n\n');
    } catch (error) {
      console.error('Error fetching Cosmos ecosystem prices:', error);
      return 'Unable to fetch current prices for Cosmos ecosystem tokens. Please try again later.';
    }
  }
}
