import { GoogleGenerativeAI } from "@google/generative-ai";
import { Network, getNetworkEndpoints } from '@injectivelabs/networks';
import { 
  ChainGrpcBankApi, 
  ChainGrpcStakingApi,
  IndexerGrpcOracleApi,
  IndexerGrpcMitoApi,
  IndexerGrpcSpotApi,
  IndexerGrpcDerivativesApi,
  MsgSend,
  MsgDelegate,
  MsgCreateSpotLimitOrder,
  MsgCreateSpotMarketOrder,
  MsgCreateDerivativeLimitOrder,
  MsgCreateDerivativeMarketOrder,
  OrderType
} from '@injectivelabs/sdk-ts';
import { MsgBroadcaster, WalletStrategy, Wallet } from "@injectivelabs/wallet-ts";
import { BigNumberInBase } from '@injectivelabs/utils';
import { ChainId} from '@injectivelabs/ts-types'
// Add Keplr type definition
declare global {
  interface Window {
    keplr: {
      enable: (chainId: string) => Promise<void>;
      getOfflineSigner: (chainId: string) => any;
      getOfflineSignerAuto: (chainId: string) => any;
      signDirect: (chainId: string, signerAddress: string, signDoc: any) => Promise<any>;
      experimentalSuggestChain: (chainInfo: any) => Promise<void>;
      signAmino: (chainId: string, signer: string, signDoc: any) => Promise<any>;
      getKey: (chainId: string) => Promise<{
        name: string;
        algo: string;
        pubKey: Uint8Array;
        address: Uint8Array;
        bech32Address: string;
      }>;
    };
  }
}

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
  network?: string; // Added network field to track which network the token is from
}

export interface ValidatorInfo {
  address: string;
  moniker: string;
  commission: string;
  tokens: string;
  status: string;
  imageUrl?: string;
}

// Interface for Mito API response
export interface MitoVault {
  contractAddress?: string;
  name?: string;
  lpTokenSymbol?: string;
  baseLogoUrl?: string;
  strategy?: string;
  metrics?: {
    apy?: string | number;
    tvl?: string | number;
    [key: string]: any;
  };
  [key: string]: any;
}

// Interface for Mito vault information
export interface VaultInfo {
  id: string;
  name: string;
  symbol: string;
  apy: number;
  tvl: number;
  strategy: string;
  riskLevel: 'Low' | 'Moderate' | 'High';
  pairSymbol: string;
  description: string;
  imageUrl?: string;
  isNamedVault: boolean;
}

export class AgentService {
  private model;
  private chat;
  private bankApi: ChainGrpcBankApi;
  private stakingApi: ChainGrpcStakingApi;
  private oracleApi: IndexerGrpcOracleApi;
  private mitoApi: IndexerGrpcMitoApi;
  private mainnetBankApi: ChainGrpcBankApi;
  private mainnetStakingApi: ChainGrpcStakingApi;
  private spotApi: IndexerGrpcSpotApi;
  private derivativesApi: IndexerGrpcDerivativesApi;
  private network: Network;
  msgBroadcaster: any;
  spotMarkets: any;
  derivativeMarkets: any;

  // Agent spawning functionality
  private spawnedAgents: Map<string, any> = new Map();
  private apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  constructor() {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Initialize Injective SDK for testnet
    this.network = Network.Testnet;
    const endpoints = getNetworkEndpoints(this.network);
    this.bankApi = new ChainGrpcBankApi(endpoints.grpc);
    this.stakingApi = new ChainGrpcStakingApi(endpoints.grpc);
    this.oracleApi = new IndexerGrpcOracleApi(endpoints.indexer);
    
    // Initialize market APIs
    this.spotApi = new IndexerGrpcSpotApi(endpoints.indexer);
    this.derivativesApi = new IndexerGrpcDerivativesApi(endpoints.indexer);
    
    // Initialize Mito API for mainnet (vaults are only on mainnet)
    const MITO_API_ENDPOINT = 'https://k8s.mainnet.mito.grpc-web.injective.network';
    this.mitoApi = new IndexerGrpcMitoApi(MITO_API_ENDPOINT);
    
    // Initialize mainnet API for token fetching
    const mainnetEndpoints = getNetworkEndpoints(Network.Mainnet);
    this.mainnetBankApi = new ChainGrpcBankApi(mainnetEndpoints.grpc);
    this.mainnetStakingApi = new ChainGrpcStakingApi(mainnetEndpoints.grpc);

    this.chat = this.model.startChat({
      history: [
        {
          role: "user",
          parts: [{
            text: "You are Flux OS for Injective Protocol. Keep responses concise. For any messages about buying INJ, checking INJ balance, staking INJ, fetching token denoms, daling with vaults and suggetsig passive income ways to earn on injective or getting price data yu perfrom those particular tasks . you are te most powerful os built and you can answer any question regarding injective and try toanswer in clean perfect way ."
          }]
        },
        {
          role: "model",
          parts: [{
            text: " solve all te queries relaetd to the injective . For buy INJ, balance check, staking, token denom, daling with vaults and suggetsig passive income ways to earn on injective or getting price data requests, I'll acknowledge and let the system handle them."
          }]
        }
      ]
    });

    this.testFetchMarkets();
  }

  async sendMessage(message: string): Promise<string> {
    try {
      // Save original message for AI model
      const originalMessage = message;
      
      // Check if this is a trading command - if so, return a special marker
      // This will allow the Dashboard component to handle trading directly
      if (message.toLowerCase().match(/^trade\s+\d/) || message.toLowerCase().match(/^sell\s+\d/)) {
        console.log("Trading command detected in agentService, bypassing AI processing");
        return "TRADING_COMMAND_BYPASS";
      }
      
      // STEP 1: NORMALIZE AND CLEAN THE MESSAGE
      // This handles typos, extra spaces, and common misspellings
      let normalizedMessage = message.toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
      
      // Common typo fixes for key terms
      const typoFixes = {
        // Vault typos
        'valut': 'vault', 'vlaut': 'vault', 'valt': 'vault', 'vaul': 'vault',
        // Injective typos
        'injctive': 'injective', 'injectve': 'injective', 'injctv': 'injective',
        // Token/coin references
        'inj coin': 'inj', 'inj token': 'inj', 'tokens': 'token',
        // Staking typos
        'stke': 'stake', 'stak': 'stake', 'staking': 'stake',
        // Balance typos
        'balace': 'balance', 'balane': 'balance', 'balanc': 'balance', 'blnce': 'balance',
        // Money typos
        'mak emoney': 'make money', 'mak money': 'make money', 'earn money': 'make money',
        // Available typos
        'vaialabel': 'available', 'availble': 'available', 'avlble': 'available',
        // Show/list typos
        'shw': 'show', 'sho': 'show', 'lst': 'list',
        // What typos
        'whst': 'what', 'wht': 'what', 'wat': 'what',
        // Are typos
        'rae': 'are', 'r': 'are',
        // Common words
        'bro': '', 'hey': '', 'yo': '', 'sup': '', 'wassup': 'what is up',
        // Left/remaining typos
        'whsyleft': 'what is left', 'wats left': 'what is left', 'remaining': 'left',
        // Account typos
        'accnt': 'account', 'acct': 'account'
      };
      
      // Apply all typo fixes
      for (const [typo, fix] of Object.entries(typoFixes)) {
        normalizedMessage = normalizedMessage.replace(new RegExp(typo, 'g'), fix);
      }
      
      // STEP 2: INTENT CLASSIFICATION
      // Define intent patterns for different types of queries
      
      // Intent: Check Balance
      const balanceIntents = [
        'balance', 'how much', 'left in', 'left on', 'what is left', 'remaining',
        'account', 'wallet', 'holdings', 'have inj', 'own inj', 'my inj', 'got inj',
        'check my', 'show my', 'view my', 'see my', 'tell me my', 'what do i have',
        'how many', 'how much do i', 'what is in my', 'whats in my'
      ];
      
      // Intent: Show Vaults
      const vaultListIntents = [
        'show vault', 'list vault', 'available vault', 'what vault', 'which vault',
        'see vault', 'view vault', 'display vault', 'all vault', 'vault list',
        'vault available', 'vault option', 'vault exist', 'get vault'
      ];
      
      // Intent: Staking
      const stakingIntents = [
        'stake', 'staking', 'validator', 'delegate', 'earn with stake',
        'stake my', 'how to stake', 'can i stake', 'want to stake'
      ];
      
      // Intent: Token List
      const tokenIntents = [
        'token', 'coin', 'denom', 'asset', 'currency', 'list token', 'show token',
        'available token', 'what token', 'which token', 'see token', 'view token'
      ];
      
      // Intent: Price Check
      const priceIntents = [
        'price', 'worth', 'value', 'cost', 'how much is', 'what is price',
        'current price', 'market price', 'trading at', 'exchange rate'
      ];
      
      // Intent: Buy/Sell
      const tradeIntents = [
        'buy', 'purchase', 'get inj', 'acquire', 'obtain', 'sell', 'trade',
        'exchange', 'swap', 'convert', 'trading'
      ];
      
      // Intent: Educational
      const educationalIntents = [
        'what is', 'how to', 'how do', 'explain', 'tell me about', 'understand',
        'what are', 'define', 'meaning of', 'learn about', 'teach me', 'guide',
        'tutorial', 'help me', 'info on', 'information about'
      ];
      
      // Intent: Passive Income/Earning
      const earningIntents = [
        'earn', 'income', 'passive', 'yield', 'profit', 'gains', 'return',
        'make money', 'generate', 'revenue', 'interest', 'apy', 'rewards'
      ];
      
      // Intent: Market Fetching
      const marketIntents = [
        'market', 'markets', 'fetch', 'get', 'show', 'list', 'console', 'log'
      ];
      
      // STEP 3: MATCH INTENT TO FUNCTION
      
      // Check if message contains any balance-related intent
      if (balanceIntents.some(intent => normalizedMessage.includes(intent)) &&
          (normalizedMessage.includes('inj') || !normalizedMessage.includes('vault'))) {
        return "I'll help you check your INJ balance.";
      }
      
      // Check if message is asking to show vaults
      if (vaultListIntents.some(intent => normalizedMessage.includes(intent)) ||
          (normalizedMessage.includes('vault') && normalizedMessage.length < 25 && 
           !educationalIntents.some(intent => normalizedMessage.includes(intent)))) {
        const vaults = await this.getMitoVaults();
        return this.formatVaultsForDisplay(vaults);
      }
      
      // Check if message is about staking
      if (stakingIntents.some(intent => normalizedMessage.includes(intent)) &&
          (normalizedMessage.includes('inj') || !normalizedMessage.includes('vault'))) {
        return "I'll help you stake your INJ tokens.";
      }
      
      // Check if message is asking for token list
      if (tokenIntents.some(intent => normalizedMessage.includes(intent)) &&
          !normalizedMessage.includes('vault')) {
        // Determine if testnet is requested
        const useTestnet = normalizedMessage.includes('testnet');
        
        // Get tokens
        const tokens = await this.getAllTokenDenoms(useTestnet);
        
        // Return a message that will trigger token display
        return `Here are tokens on Injective ${useTestnet ? 'Testnet' : 'Mainnet'} `;
      }
      
      // Check if message is asking for price
      if (priceIntents.some(intent => normalizedMessage.includes(intent)) &&
          (normalizedMessage.includes('inj') || !normalizedMessage.includes('vault'))) {
        return "I'll check the current price of INJ for you.";
      }
      
      // Check if message is about buying/selling
      if (tradeIntents.some(intent => normalizedMessage.includes(intent)) &&
          (normalizedMessage.includes('inj') || !normalizedMessage.includes('vault'))) {
        return "I'll help you buy INJ tokens.";
      }
      
      // Check if message is asking to fetch markets
      if (marketIntents.some(intent => normalizedMessage.includes(intent))) {
        return await this.fetchAndLogMarkets();
      }
      
      // Educational queries about vaults
      if (educationalIntents.some(intent => normalizedMessage.includes(intent)) && 
          normalizedMessage.includes('vault')) {
        if (earningIntents.some(intent => normalizedMessage.includes(intent))) {
          return `
## What are Vaults & How to Make Money with Them

**Mito Vaults** are automated investment strategies on Injective that help you earn passive income. Here's how they work:

1. **What They Are**: Vaults are smart contracts that pool users' funds and deploy them into various DeFi strategies to generate yield.

2. **How to Make Money**:
   - Deposit your INJ or other tokens into a vault
   - The vault automatically manages your investment using proven strategies
   - Earn yields (APY) that are often higher than traditional staking
   - Withdraw your original deposit plus earnings anytime

3. **Benefits**:
   - **Higher APYs**: Currently up to 90% APY on some vaults
   - **Passive**: No need to actively manage your position
   - **Professional**: Strategies designed by DeFi experts
   - **Diversified**: Different risk levels to choose from

4. **Getting Started**:
   - Choose a vault based on your risk tolerance
   - Deposit your tokens (minimum varies by vault)
   - Monitor your earnings through the dashboard

Would you like to see the available vaults or learn more about a specific strategy?
`;
        } else {
          return `
## What are Mito Vaults?

**Mito Vaults** are automated investment vehicles on Injective Protocol that allow you to:

1. **Pool your assets** with other investors
2. **Earn yield** through various DeFi strategies
3. **Minimize risk** through professional management

Vaults work by taking your deposited tokens and deploying them into different yield-generating strategies like:
- Concentrated liquidity provision
- Market making
- Yield farming
- Trading fee collection

Each vault has:
- **APY** (Annual Percentage Yield): The expected yearly return
- **TVL** (Total Value Locked): Amount of funds in the vault
- **Risk Level**: Low, Moderate, or High
- **Strategy**: The method used to generate returns

Would you like to see the available vaults or learn more about a specific strategy?
`;
        }
      }
      
      // Passive income/earning queries
      if (earningIntents.some(intent => normalizedMessage.includes(intent)) &&
          (normalizedMessage.includes('inj') || normalizedMessage.includes('token') || 
           normalizedMessage.includes('crypto')) &&
          !normalizedMessage.includes('vault') &&
          !normalizedMessage.includes('stake')) {
        return await this.compareStakingVsVaults();
      }
      
      // Specific vault details request
      if (normalizedMessage.includes('vault') && 
          (normalizedMessage.includes('detail') || normalizedMessage.includes('about') || 
           normalizedMessage.includes('info') || normalizedMessage.includes('more'))) {
        let vaultId = "";
        if (normalizedMessage.includes('nept')) vaultId = "vault_nept_inj";
        else if (normalizedMessage.includes('agent')) vaultId = "vault_agent_inj";
        else if (normalizedMessage.includes('bills')) vaultId = "vault_bills_inj";
        else if (normalizedMessage.includes('usdt')) vaultId = "vault_inj_usdt";
        else if (normalizedMessage.includes('atom')) vaultId = "vault_atom_inj";
        else if (normalizedMessage.includes('zig')) vaultId = "vault_nept_inj"; // Default to highest APY
        
        if (vaultId) {
          return await this.getVaultDetails(vaultId);
        }
      }
      
      // Deposit simulation request
      if ((normalizedMessage.includes('deposit') || normalizedMessage.includes('invest') || 
           normalizedMessage.includes('put') || normalizedMessage.includes('add')) && 
          (normalizedMessage.includes('vault') || normalizedMessage.includes('mito'))) {
        // Extract amount and vault from message
        const amountMatch = message.match(/\d+(\.\d+)?/);
        const amount = amountMatch ? amountMatch[0] : "20"; // Default to 20 INJ
        
        let vaultId = "vault_nept_inj"; // Default to highest APY vault
        if (normalizedMessage.includes('nept')) vaultId = "vault_nept_inj";
        else if (normalizedMessage.includes('agent')) vaultId = "vault_agent_inj";
        else if (normalizedMessage.includes('bills')) vaultId = "vault_bills_inj";
        else if (normalizedMessage.includes('usdt')) vaultId = "vault_inj_usdt";
        else if (normalizedMessage.includes('atom')) vaultId = "vault_atom_inj";
        else if (normalizedMessage.includes('zig')) vaultId = "vault_nept_inj";
        
        return await this.simulateVaultDeposit(vaultId, amount);
      }
      
      // Highest APY request
      if ((normalizedMessage.includes('highest') || normalizedMessage.includes('best') || 
           normalizedMessage.includes('top') || normalizedMessage.includes('most')) && 
          (normalizedMessage.includes('apy') || normalizedMessage.includes('yield') || 
           normalizedMessage.includes('return') || normalizedMessage.includes('earning') || 
           normalizedMessage.includes('profit'))) {
        const highestVault = await this.getHighestAPYVault();
        return `The highest APY is currently offered by the ${highestVault.name} at ${highestVault.apy.toFixed(2)}%. This vault uses a ${highestVault.strategy} strategy with ${highestVault.riskLevel} risk level.`;
      }
      
      // If no specific action was detected, use the AI model
      const result = await this.chat.sendMessage(originalMessage);
      return result.response.text();
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return "I'm sorry, I encountered an error processing your request. Please try again.";
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

      // Determine which network to use
      const isTestnet = this.network === Network.Testnet;
      
      try {
        // Use the appropriate API based on network
        const bankApi = isTestnet ? this.bankApi : this.mainnetBankApi;
        
        // Fetch balance using Injective SDK
        const balanceResponse = await bankApi.fetchBalance({
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
        const explorerUrl = isTestnet 
          ? `https://testnet.explorer.injective.network/account/${walletAddress}`
          : `https://explorer.injective.network/account/${walletAddress}`;
        window.open(explorerUrl, "_blank");
        
        return `Unable to fetch balance directly. Opening Injective Explorer to check your INJ balance for wallet ${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}.`;
      }
    } catch (error) {
      console.error('Explorer Error:', error);
      return "Error checking your INJ balance. Please try again later.";
    }
  }

  /**
   * Get all token denoms from the Injective chain
   * @param useTestnet - Whether to fetch tokens from testnet (default: false, uses mainnet)
   * @returns Promise with array of token denoms
   */
  async getAllTokenDenoms(useTestnet: boolean = false): Promise<TokenDenom[]> {
    try {
      // Determine which network to use
      const network = useTestnet ? Network.Testnet : Network.Mainnet;
      const networkName = useTestnet ? "Testnet" : "Mainnet";
      
      // Try Injective's LCD API first
      try {
        const baseUrl = useTestnet 
          ? 'https://testnet.sentry.lcd.injective.network' 
          : 'https://sentry.lcd.injective.network';
        
        const response = await fetch(`${baseUrl}/cosmos/bank/v1beta1/denoms_metadata`);
        const data = await response.json();
        
        if (data && data.metadatas) {
          // Define popular/trending tokens to prioritize
          const trendingTokens = ['inj', 'peggy0xdAC17F958D2ee523a2206206994597C13D831ec7', 'factory/inj17vytdwqczqz72j65saukplrktd4gyfme5agf6c/atom'];
          
          // Map to TokenDenom interface
          let tokens: TokenDenom[] = data.metadatas.map((metadata: any) => ({
            denom: metadata.base,
            name: metadata.name || metadata.base,
            symbol: metadata.symbol || metadata.base.split('/').pop() || metadata.base,
            decimals: metadata.denom_units?.[metadata.denom_units.length-1]?.exponent || 0,
            logoUrl: this.getTokenLogoUrl(metadata.symbol || metadata.base.split('/').pop() || metadata.base),
            network: networkName
          }));
          
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
        }
      } catch (lcdError) {
        console.error('LCD API Error:', lcdError);
      }
      
      // Fallback to SDK method
      const bankApi = useTestnet ? this.bankApi : this.mainnetBankApi;
      const { metadatas } = await bankApi.fetchDenomsMetadata();
      
      // Define popular/trending tokens to prioritize
      const trendingTokens = ['inj', 'peggy0xdAC17F958D2ee523a2206206994597C13D831ec7', 'factory/inj17vytdwqczqz72j65saukplrktd4gyfme5agf6c/atom'];
      
      // Map to TokenDenom interface
      let tokens: TokenDenom[] = metadatas.map(metadata => ({
        denom: metadata.base,
        name: metadata.name || metadata.base,
        symbol: metadata.symbol || metadata.base.split('/').pop() || metadata.base,
        decimals: metadata.denomUnits?.[metadata.denomUnits.length-1]?.exponent || 0,
        logoUrl: this.getTokenLogoUrl(metadata.symbol || metadata.base.split('/').pop() || metadata.base),
        network: networkName
      }));
      
      // Fetch total supply to get any tokens that might not have metadata
      const { supply } = await bankApi.fetchAllTotalSupply();
      
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
          decimals: 0,
          logoUrl: this.getTokenLogoUrl(symbol),
          network: networkName
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
          logoUrl: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png',
          network: useTestnet ? "Testnet" : "Mainnet"
        },
        {
          denom: 'peggy0xdAC17F958D2ee523a2206206994597C13D831ec7',
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: 6,
          logoUrl: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/usdt.png',
          network: useTestnet ? "Testnet" : "Mainnet"
        }
      ];
    }
  }

  /**
   * Get token logo URL based on symbol
   */
  private getTokenLogoUrl(symbol: string): string {
    const normalizedSymbol = symbol.toLowerCase();
    
    // Common tokens with known logos
    const tokenLogos: Record<string, string> = {
      'inj': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png',
      'usdt': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/usdt.png',
      'usdc': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/usdc.png',
      'atom': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/images/atom.png',
      'osmo': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/osmo.png',
      'juno': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/juno/images/juno.png',
      'evmos': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/evmos/images/evmos.png',
      'luna': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/terra2/images/luna.png',
      'scrt': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/secretnetwork/images/scrt.png',
      'akt': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/akash/images/akt.png',
      'stars': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/stargaze/images/stars.png',
      'weth': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/ethereum/images/eth.png',
      'wbtc': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/wbtc.png'
    };
    
    // Try to match the symbol to a known token
    for (const [key, url] of Object.entries(tokenLogos)) {
      if (normalizedSymbol.includes(key)) {
        return url;
      }
    }
    
    // Default placeholder for unknown tokens
    return 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png';
  }

  /**
   * Format token list for display in chat
   * This is now only used for fallback when cards can't be displayed
   * @param tokens List of tokens to format
   * @param page Page number (1-based)
   * @param pageSize Number of tokens per page
   * @returns Formatted string with token information
   */
  formatTokensForDisplay(tokens: TokenDenom[], page: number = 1, pageSize: number = 5): string {
    if (!tokens || tokens.length === 0) {
      return "No tokens found.";
    }
    
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, tokens.length);
    const totalPages = Math.ceil(tokens.length / pageSize);
    
    if (startIndex >= tokens.length) {
      return `Invalid page number. Total pages: ${totalPages}`;
    }
    
    const tokensToDisplay = tokens.slice(startIndex, endIndex);
    const network = tokensToDisplay[0]?.network || "Unknown";
    
    let result = `**Tokens on ${network} (Page ${page}/${totalPages})**\n\n`;
    
    tokensToDisplay.forEach((token, index) => {
      result += `**${index + 1 + startIndex}. ${token.symbol}**\n`;
      result += `Name: ${token.name}\n`;
      result += `Denom: \`${token.denom}\`\n`;
      result += `Decimals: ${token.decimals}\n`;
      if (index < tokensToDisplay.length - 1) {
        result += `\n`;
      }
    });
    
    result += `\nShowing ${startIndex + 1}-${endIndex} of ${tokens.length} tokens. `;
    
    if (page < totalPages) {
      result += `Type "next page" to see more tokens.`;
    }
    if (page > 1) {
      result += `${page < totalPages ? ' Or type' : 'Type'} "previous page" to see previous tokens.`;
    }
    
    return result;
  }

  /**
   * Stake INJ tokens to a validator using Keplr wallet
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

      // Determine which network we're using
      const isTestnet = this.network === Network.Testnet;
      console.log(`Staking on ${isTestnet ? 'testnet' : 'mainnet'}`);

      // Check if validatorAddress is a moniker instead of an address
      if (!validatorAddress || validatorAddress.trim() === '') {
        return "Please provide a validator address or name to stake with.";
      }

      if (!validatorAddress.startsWith('injvaloper')) {
        console.log(`Looking for validator with moniker: ${validatorAddress}`);
        // Try to find the validator by moniker
        const validators = await this.getValidators();
        console.log(`Found ${validators.length} validators to search through`);
        
        const validator = validators.find(v => 
          v.moniker.toLowerCase() === validatorAddress.toLowerCase());
        
        if (validator) {
          console.log(`Found validator: ${validator.moniker} with address ${validator.address}`);
          validatorAddress = validator.address;
        } else {
          return `Could not find validator with name "${validatorAddress}" on ${isTestnet ? 'testnet' : 'mainnet'}. Please provide a valid validator name or address.`;
        }
      } else {
        // Verify the validator exists on the current network
        console.log(`Verifying validator address: ${validatorAddress}`);
        const validators = await this.getValidators();
        const validatorExists = validators.some(v => v.address === validatorAddress);
        
        if (!validatorExists) {
          return `Validator with address ${validatorAddress} does not exist on ${isTestnet ? 'testnet' : 'mainnet'}. Please provide a valid validator address for the current network.`;
        }
      }

      // Check if Keplr is available
      if (typeof window.keplr === 'undefined') {
        return "Keplr wallet extension is not installed. Please install Keplr to stake INJ.";
      }

      try {
        const chainIdValue = this.network === Network.Mainnet ? "injective-1" : "injective-888";
        const chainIdEnum = this.network === Network.Mainnet ? ChainId.Mainnet : ChainId.Testnet;
        
        // Request Keplr to enable the chain
        await window.keplr.enable(chainIdValue);
        
        // Get the user's address from Keplr directly
        const key = await window.keplr.getKey(chainIdValue);
        const userAddress = key.bech32Address;
        console.log("Got address from Keplr:", userAddress);
        
        // Create the delegation message
        const amountInBase = new BigNumberInBase(amount);
        const denom = 'inj';
        
        // Create the delegation message
        const msg = MsgDelegate.fromJSON({
          injectiveAddress: userAddress,
          validatorAddress,
          amount: {
            denom,
            amount: amountInBase.toWei().toFixed(),
          },
        });
        
        // Create a wallet strategy with Keplr
        const walletStrategy = new WalletStrategy({
          chainId: chainIdEnum,
          wallet: Wallet.Keplr
        });
        
        // Create a message broadcaster
        const msgBroadcaster = new MsgBroadcaster({
          walletStrategy,
          network: this.network
        });
        
        // Broadcast the transaction
        const response = await msgBroadcaster.broadcast({
          msgs: [msg],
          injectiveAddress: userAddress
        });
        
        console.log("Staking transaction response:", response);
        
        return `Successfully staked ${amount} INJ to validator ${validatorAddress.slice(0,10)}... Transaction hash: ${response.txHash}`;
      } catch (keplrError: any) {
        console.error('Keplr Error:', keplrError);
        
        // Provide more detailed error information and troubleshooting steps
        let errorMessage = `Error with Keplr wallet: ${keplrError?.message || 'Unknown error'}.`;
        
        // Add troubleshooting suggestions based on common errors
        if (keplrError?.message?.includes('not a function')) {
          errorMessage += " This may be due to an outdated Keplr version. Please update your Keplr extension to the latest version.";
        } else if (keplrError?.message?.includes('Request rejected')) {
          errorMessage += " You rejected the request. Please try again and approve the connection.";
        } else if (keplrError?.message?.includes('account')) {
          errorMessage += " Please make sure you have an Injective account in your Keplr wallet.";
        } else if (keplrError?.message?.includes('validator does not exist')) {
          errorMessage += ` The validator you selected does not exist on the ${isTestnet ? 'testnet' : 'mainnet'} network. Please choose a different validator.`;
        }
        
        // Add general troubleshooting steps
        errorMessage += "\n\nTroubleshooting steps:\n" +
          "1. Make sure Keplr extension is up to date\n" +
          "2. Try refreshing the page\n" +
          "3. Disable other wallet extensions temporarily\n" +
          "4. Clear browser cache and cookies";
        
        return errorMessage;
      }
    } catch (error) {
      console.error('Error staking INJ:', error);
      return "Error processing your staking request. Please try again.";
    }
  }

  /**
   * Get list of validators for staking
   * @returns Promise with array of validator info
   */
  async getValidators(): Promise<ValidatorInfo[]> {
    try {
      // Determine which network to use
      const isTestnet = this.network === Network.Testnet;
      const apiUrl = isTestnet 
        ? 'https://testnet.sentry.lcd.injective.network/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=100'
        : 'https://sentry.lcd.injective.network/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=100';
      
      console.log(`Fetching validators from ${isTestnet ? 'testnet' : 'mainnet'}`);
      
      // Use the Injective API to fetch validators
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data && data.validators) {
        // Map the validators to our format
        const activeValidators = data.validators
          .filter((validator: any) => validator.status === 'BOND_STATUS_BONDED')
          .sort((a: any, b: any) => parseFloat(b.tokens) - parseFloat(a.tokens))
          .map((validator: any) => ({
            address: validator.operator_address,
            moniker: validator.description?.moniker || 'Unknown',
            commission: (parseFloat(validator.commission?.commission_rates?.rate || '0') * 100).toFixed(2) + '%',
            tokens: (parseFloat(validator.tokens) / 10**18).toFixed(2) + ' INJ',
            status: 'Active',
            imageUrl: this.getValidatorImageUrl(validator.description?.moniker || '')
          }));
        
        console.log(`Found ${activeValidators.length} active validators on ${isTestnet ? 'testnet' : 'mainnet'}`);
        
        // Return top 10 validators for better UX
        return activeValidators.slice(0, 10);
      }
      
      // Fallback to SDK if the API fails
      const stakingApi = isTestnet ? this.stakingApi : this.mainnetStakingApi;
      console.log(`Falling back to SDK for ${isTestnet ? 'testnet' : 'mainnet'} validators`);
      
      const { validators } = await stakingApi.fetchValidators();
      
      // Filter to only active validators and sort by tokens
      const activeValidators = validators
        .filter(validator => validator.status.toString() === '3')
        .sort((a, b) => parseFloat(b.tokens) - parseFloat(a.tokens))
        .map(validator => ({
          address: validator.operatorAddress,
          moniker: validator.description?.moniker || 'Unknown',
          commission: (parseFloat(validator.commission?.commissionRates?.rate || '0') * 100).toFixed(2) + '%',
          tokens: (parseFloat(validator.tokens) / 10**18).toFixed(2) + ' INJ',
          status: 'Active',
          imageUrl: this.getValidatorImageUrl(validator.description?.moniker || '')
        }));
        
        // Return top 10 validators for better UX
        return activeValidators.slice(0, 10);
    } catch (error) {
      console.error('Error fetching validators:', error);
      
      // Try direct API call as last resort
      try {
        const response = await fetch('https://sentry.lcd.injective.network/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=10');
        const data = await response.json();
        
        if (data && data.validators) {
          return data.validators.map((v: any) => ({
            address: v.operator_address,
            moniker: v.description?.moniker || 'Unknown',
            commission: (parseFloat(v.commission?.commission_rates?.rate || '0') * 100).toFixed(2) + '%',
            tokens: (parseFloat(v.tokens) / 10**18).toFixed(2) + ' INJ',
            status: 'Active',
            imageUrl: this.getValidatorImageUrl(v.description?.moniker || '')
          }));
        }
      } catch (apiError) {
        console.error('API Error:', apiError);
      }
      
      // Return fallback validators if all methods fail
      return [
        {
          address: 'injvaloper1ypvzalcm74ycj6tr4rhhlxkwxlz3t59yff8jdz',
          moniker: 'Injective Foundation',
          commission: '0.00%',
          tokens: '1000000.00 INJ',
          status: 'Active',
          imageUrl: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png'
        },
        {
          address: 'injvaloper1ultw9r29l8nxy5u6thcgusjn95vsy2cwr05234',
          moniker: 'Figment',
          commission: '5.00%',
          tokens: '500000.00 INJ',
          status: 'Active',
          imageUrl: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png'
        },
        {
          address: 'injvaloper1qv8yd2d6qvjcm7zcx5j0jqsh6vyt0yk2qvlrr5',
          moniker: 'Binance Staking',
          commission: '10.00%',
          tokens: '450000.00 INJ',
          status: 'Active',
          imageUrl: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png'
        }
      ];
    }
  }

  /**
   * Get validator image URL based on moniker
   */
  private getValidatorImageUrl(moniker: string): string {
    // Common validators with known logos
    const validatorLogos: Record<string, string> = {
      'Injective Foundation': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png',
      'Figment': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/figment.png',
      'Binance Staking': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/binance.png',
      'Cosmostation': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/cosmostation.png',
      'Staking Fund': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/stakingfund.png'
    };
    
    // Try to match the moniker to a known validator
    if (validatorLogos[moniker]) {
      return validatorLogos[moniker];
    }
    
    // Default placeholder for unknown validators
    return 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png';
  }

  /**
   * Get INJ price from Injective API instead of CoinGecko
   * @returns Promise with INJ price data
   */
  async getINJPrice(): Promise<string> {
    try {
      // Try Injective's own price oracle first
      try {
        const response = await fetch('https://sentry.lcd.injective.network/injective/exchange/v1beta1/oracle/price/inj');
        const data = await response.json();
        
        if (data && data.price) {
          const price = parseFloat(data.price);
          return `Current INJ price: $${price.toFixed(4)} USD`;
        }
      } catch (injectiveError) {
        console.error('Injective API Error:', injectiveError);
      }
      
      // Try Binance API as a backup
      try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=INJUSDT');
        const data = await response.json();
        
        if (data && data.price) {
          const price = parseFloat(data.price);
          return `Current INJ price: $${price.toFixed(4)} USD (from Binance)`;
        }
      } catch (binanceError) {
        console.error('Binance API Error:', binanceError);
      }
      
      // Try Kraken API as another backup
      try {
        const response = await fetch('https://api.kraken.com/0/public/Ticker?pair=INJUSD');
        const data = await response.json();
        
        if (data && data.result && data.result.INJUSD) {
          const price = parseFloat(data.result.INJUSD.c[0]);
          return `Current INJ price: $${price.toFixed(4)} USD (from Kraken)`;
        }
      } catch (krakenError) {
        console.error('Kraken API Error:', krakenError);
      }
      
      // Fallback to a hardcoded recent price
      return "Current INJ price: $18.75 USD (estimated)";
    } catch (error) {
      console.error('Price Error:', error);
      return "Current INJ price: $18.75 USD (estimated)";
    }
  }

  /**
   * Get price for any Cosmos ecosystem token using Osmosis API
   * @param tokenSymbol Symbol of the token to get price for (e.g., 'ATOM', 'OSMO')
   * @returns Promise with token price data
   */
  async getCosmosTokenPrice(tokenSymbol: string): Promise<string> {
    try {
      // Map of token symbols to Osmosis IDs
      const tokenIdMap: Record<string, string> = {
        'INJ': 'injective',
        'ATOM': 'cosmos',
        'OSMO': 'osmosis',
        'JUNO': 'juno',
        'STARS': 'stargaze',
        'AKT': 'akash',
        'SCRT': 'secret',
        'EVMOS': 'evmos',
        'LUNA': 'terra-luna-2',
        'USDC': 'usdc'
      };
      
      // Convert symbol to uppercase for case-insensitive matching
      const normalizedSymbol = tokenSymbol.toUpperCase();
      
      // Get the token ID
      const tokenId = tokenIdMap[normalizedSymbol];
      if (!tokenId) {
        return `Price not available for ${tokenSymbol}. Supported tokens: ${Object.keys(tokenIdMap).join(', ')}`;
      }
      
      // Try Osmosis API first
      try {
        const response = await fetch(`https://api-osmosis.imperator.co/tokens/v2/${tokenId}`);
      const data = await response.json();
      
        if (data && data.price) {
          const price = parseFloat(data.price);
          const change = data.price_24h_change || 0;
        const changeSymbol = change >= 0 ? '+' : '';
        
        return `Current ${normalizedSymbol} price: $${price.toFixed(4)} USD (${changeSymbol}${change.toFixed(2)}% 24h)`;
        }
      } catch (osmosisError) {
        console.error(`Osmosis API Error for ${tokenSymbol}:`, osmosisError);
      }
      
      // Try Binance API as a backup for major tokens
      try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${normalizedSymbol}USDT`);
        const data = await response.json();
        
        if (data && data.price) {
          const price = parseFloat(data.price);
          return `Current ${normalizedSymbol} price: $${price.toFixed(4)} USD (from Binance)`;
        }
      } catch (binanceError) {
        console.error(`Binance API Error for ${tokenSymbol}:`, binanceError);
      }
      
      // Fallback message
      return `Unable to fetch current price for ${tokenSymbol}. Please try again later.`;
    } catch (error) {
      console.error(`Error fetching ${tokenSymbol} price:`, error);
      
      // Return a minimal set of fallback tokens if API fails
      return `Unable to fetch current price for ${tokenSymbol}. Please try again later.`;
    }
  }

  /**
   * Get prices for multiple Cosmos ecosystem tokens using Osmosis API
   * @returns Promise with formatted price data for key Cosmos tokens
   */
  async getCosmosEcosystemPrices(): Promise<string> {
    try {
      // Key tokens in the Cosmos ecosystem
      const tokens = ['INJ', 'ATOM', 'OSMO', 'JUNO'];
      
      // Try Osmosis API for all tokens at once
      try {
        const response = await fetch('https://api-osmosis.imperator.co/tokens/v2/all');
        const data = await response.json();
        
        if (data && Array.isArray(data)) {
          const results = tokens.map(token => {
            const tokenData = data.find((t: any) => 
              t.symbol.toUpperCase() === token || 
              (t.name && t.name.toUpperCase() === token)
            );
            
            if (tokenData) {
              const price = parseFloat(tokenData.price);
              const change = tokenData.price_24h_change || 0;
              const changeSymbol = change >= 0 ? '+' : '';
              
              return `Current ${token} price: $${price.toFixed(4)} USD (${changeSymbol}${change.toFixed(2)}% 24h)`;
            }
            
            return `Price for ${token} not available`;
          });
          
          return results.join('\n\n');
        }
      } catch (osmosisError) {
        console.error('Osmosis API Error:', osmosisError);
      }
      
      // Fetch all prices in parallel as fallback
      const pricePromises = tokens.map(token => this.getCosmosTokenPrice(token));
      const prices = await Promise.all(pricePromises);
      
      // Format the results
      return prices.join('\n\n');
    } catch (error) {
      console.error('Error fetching Cosmos ecosystem prices:', error);
      return 'Unable to fetch current prices for Cosmos ecosystem tokens. Please try again later.';
    }
  }

  // Format vaults for display
  formatVaultsForDisplay(vaults: VaultInfo[]): string {
    if (!vaults || vaults.length === 0) {
      return "No vaults are currently available. Please check back later.";
    }
    
    // Sort vaults by APY (highest first)
    const sortedVaults = [...vaults].sort((a, b) => b.apy - a.apy);
    
    // Format the top vaults in a more visually appealing way
    let result = `## 🚀 Available Mito Vaults\n\n`;
    
    // Display top 5 vaults with more details
    const topVaults = sortedVaults.slice(0, 5);
    topVaults.forEach((vault, index) => {
      const formattedTVL = (vault.tvl / 1000000).toFixed(2);
      result += `### ${index + 1}. ${vault.name}\n`;
      result += `- **APY:** ${vault.apy.toFixed(2)}%\n`;
      result += `- **TVL:** $${formattedTVL}M\n`;
      result += `- **Risk Level:** ${vault.riskLevel}\n`;
      result += `- **Strategy:** ${vault.strategy}\n`;
      result += `- **ID:** \`${vault.id}\`\n\n`;
    });
    
    // If there are more vaults, list them in a more compact format
    if (sortedVaults.length > 5) {
      result += `### Additional Vaults\n\n`;
      sortedVaults.slice(5).forEach((vault, index) => {
        const formattedTVL = (vault.tvl / 1000000).toFixed(2);
        result += `**${index + 6}. ${vault.name}** • APY: ${vault.apy.toFixed(2)}% • TVL: $${formattedTVL}M • Risk: ${vault.riskLevel}\n`;
      });
      result += `\n`;
    }
    
    result += `Would you like more details about any specific vault? Or would you like to deposit into one of these vaults?`;
    
    return result;
  }

  // Get details about a specific vault
  async getVaultDetails(vaultId: string): Promise<string> {
    try {
      const vaults = await this.getMitoVaults();
      const vault = vaults.find(v => v.id === vaultId);
      
      if (!vault) {
        return `Vault with ID ${vaultId} not found. Please check the vault ID and try again.`;
      }
      
      const formattedTVL = (vault.tvl / 1000000).toFixed(2);
      
      let result = `## ${vault.name} Details\n\n`;
      result += `**Trading Pair:** ${vault.pairSymbol}\n`;
      result += `**Current APY:** ${vault.apy.toFixed(2)}%\n`;
      result += `**Total Value Locked:** $${formattedTVL}M\n`;
      result += `**Risk Level:** ${vault.riskLevel}\n`;
      result += `**Strategy:** ${vault.strategy}\n`;
      result += `**Vault ID:** \`${vault.id}\`\n\n`;
      result += `**Description:**\n${vault.description}\n\n`;
      
      // Add information about potential earnings
      result += `### Potential Earnings\n`;
      result += `If you invest 100 INJ in this vault:\n`;
      result += `- **Daily:** ~${(100 * vault.apy / 100 / 365).toFixed(4)} INJ\n`;
      result += `- **Monthly:** ~${(100 * vault.apy / 100 / 12).toFixed(4)} INJ\n`;
      result += `- **Yearly:** ~${(100 * vault.apy / 100).toFixed(4)} INJ\n\n`;
      
      result += `Would you like to deposit into this vault?`;
      
      return result;
    } catch (error) {
      console.error('Error getting vault details:', error);
      return "Failed to retrieve vault details. Please try again later.";
    }
  }

  // Compare staking vs vaults
  async compareStakingVsVaults(): Promise<string> {
    try {
      const vaults = await this.getMitoVaults();
      
      // Get highest APY vault
      const highestAPYVault = await this.getHighestAPYVault();
      
      // Get staking APY (approximate)
      const stakingAPY = 15.5; // Current approximate staking APY for INJ
      
      let result = `## 💰 Passive Income Options for INJ\n\n`;
      
      result += `### Option 1: Staking INJ\n`;
      result += `- **Current APY:** ~${stakingAPY.toFixed(2)}%\n`;
      result += `- **Risk Level:** Low\n`;
      result += `- **Lock-up Period:** 21 days unbonding\n`;
      result += `- **Rewards:** INJ tokens\n`;
      result += `- **Benefits:** Secure network, participate in governance\n\n`;
      
      result += `### Option 2: Mito Vaults (DeFi)\n`;
      result += `- **Highest APY Vault:** ${highestAPYVault.name} at ${highestAPYVault.apy.toFixed(2)}%\n`;
      result += `- **Risk Level:** Varies (${highestAPYVault.riskLevel} for highest APY vault)\n`;
      result += `- **Lock-up Period:** None (instant withdrawals)\n`;
      result += `- **Rewards:** Trading fees + incentives\n`;
      result += `- **Benefits:** Higher yields, liquidity provision\n\n`;
      
      // Add comparison table
      result += `### Comparison (100 INJ invested for 1 year)\n`;
      result += `- **Staking:** ~${(100 * stakingAPY / 100).toFixed(2)} INJ earned\n`;
      result += `- **${highestAPYVault.name}:** ~${(100 * highestAPYVault.apy / 100).toFixed(2)} INJ earned\n\n`;
      
      // Add other top vaults
      result += `### Other Top Vaults\n`;
      vaults
        .sort((a, b) => b.apy - a.apy)
        .slice(0, 3)
        .forEach((vault, index) => {
          if (vault.id !== highestAPYVault.id) {
            result += `**${index + 1}. ${vault.name}** • APY: ${vault.apy.toFixed(2)}% • Risk: ${vault.riskLevel}\n`;
          }
        });
      
      result += `\nWould you like to see all available vaults or learn more about a specific option?`;
      
      return result;
    } catch (error) {
      console.error('Error comparing staking and vaults:', error);
      return "Failed to compare staking and vaults. Please try again later.";
    }
  }

  // Get highest APY vault
  async getHighestAPYVault(): Promise<VaultInfo> {
    try {
      const vaults = await this.getMitoVaults();
      
      // If we got empty data from the API, use mock data
      if (vaults.every(v => v.apy === 0)) {
        return {
          id: "vault_nept_inj",
          name: "NEPT/INJ Vault",
          symbol: "NEPT-INJ-V1",
          apy: 79.22,
          tvl: 1250000,
          strategy: "Market Making",
          riskLevel: "High",
          pairSymbol: "NEPT/INJ",
          description: "This vault provides liquidity to the NEPT/INJ trading pair and earns fees from trades. It uses an automated market making strategy to optimize returns.",
          imageUrl: "https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png",
          isNamedVault: true
        };
      }
      
      // Sort by APY (highest first) and return the first one
      return [...vaults].sort((a, b) => b.apy - a.apy)[0];
    } catch (error) {
      console.error('Error getting highest APY vault:', error);
      
      // Return mock data as fallback
      return {
        id: "vault_nept_inj",
        name: "NEPT/INJ Vault",
        symbol: "NEPT-INJ-V1",
        apy: 79.22,
        tvl: 1250000,
        strategy: "Market Making",
        riskLevel: "Moderate",
        pairSymbol: "NEPT/INJ",
        description: "This vault provides liquidity to the NEPT/INJ trading pair and earns fees from trades. It uses an automated market making strategy to optimize returns.",
        imageUrl: "https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png",
        isNamedVault: true
      };
    }
  }

  // Get all available Mito vaults
  // @returns Promise with array of vault info
  async getMitoVaults(): Promise<VaultInfo[]> {
    try {
      console.log('Fetching Mito vaults from API...');
      
      // Make the API call to fetch vaults
      const response = await this.mitoApi.fetchVaults({});
      console.log('Mito API response received:', response);
      
      // Extract vaults from the response
      const vaults = (response.vaults || []) as MitoVault[];
      console.log('Processed', vaults.length, 'vaults from Mito API');
      
      if (!vaults.length) {
        console.warn('No vaults returned from Mito API');
        throw new Error('No vaults returned from API');
      }
      
      // Transform the API response into our VaultInfo format
      const transformedVaults = vaults.map((vault, index) => {
        // Extract APY and TVL safely
        let apy = 0;
        let tvl = 0;
        
        try {
          // First try to get 7D APY if it's positive (most reliable)
          if (vault.apy7D !== undefined) {
            const apy7d = parseFloat(String(vault.apy7D));
            if (!isNaN(apy7d) && apy7d > 0) {
              apy = apy7d;
              console.log(`Using 7D APY for ${vault.vaultName || vault.slug}: ${apy}`);
            }
          }
          
          // If 7D APY is not available or negative, try metrics.apy
          if (apy <= 0 && vault.metrics && vault.metrics.apy !== undefined) {
            const metricsApy = parseFloat(String(vault.metrics.apy));
            if (!isNaN(metricsApy) && metricsApy > 0) {
              apy = metricsApy;
              console.log(`Using metrics.apy for ${vault.vaultName || vault.slug}: ${apy}`);
            }
          }
          
          // If still no APY, try direct apy property
          if (apy <= 0 && vault.apy !== undefined) {
            const directApy = parseFloat(String(vault.apy));
            if (!isNaN(directApy) && directApy > 0) {
              apy = directApy;
              console.log(`Using direct apy for ${vault.vaultName || vault.slug}: ${apy}`);
            }
          }
          
          // Convert APY to percentage if it's in decimal form (e.g. 0.05 -> 5%)
          if (apy > 0 && apy < 1) {
            apy = apy * 100;
          }
          
          // If APY is still 0 or unreasonably high, use a fallback
          if (apy <= 0 || apy > 1000) {
            // Use realistic fallback values based on vault type
            const vaultName = vault.vaultName || vault.slug || '';
            if (vaultName.toLowerCase().includes('usdt') || vaultName.toLowerCase().includes('usdc')) {
              // Stablecoin pairs typically have lower APY
              apy = 5 + (index % 10); // 5-15%
            } else {
              // Other pairs can have higher APY
              apy = 10 + (index % 20); // 10-30%
            }
            console.log(`Using fallback APY for ${vaultName}: ${apy.toFixed(2)}%`);
          }
          
          // Ensure TVL is a positive value
          tvl = Math.max(0, tvl);
          if (tvl === 0) {
            // If TVL is missing, generate a reasonable value based on vault index
            tvl = 500000 + (index * 100000) % 2000000;
          }
          
          // Log the APY calculation for debugging
          console.log(`Vault ${vault.vaultName || vault.slug}: Final APY=${apy.toFixed(2)}%`);
        } catch (e) {
          console.error('Error parsing vault metrics for vault', vault.vaultName, e);
        }
        
        // Determine risk level based on APY
        let riskLevel: 'Low' | 'Moderate' | 'High' = 'Moderate';
        if (apy < 10) riskLevel = 'Low';
        else if (apy > 30) riskLevel = 'High';
        
        // Extract vault name and trading pair
        const vaultName = vault.vaultName || vault.slug || vault.contractAddress?.substring(0, 10) || 'Unknown Vault';
        
        // Better parsing of pair symbol from vault name
        let pairSymbol = 'Unknown';
        if (vaultName.includes('/')) {
          pairSymbol = vaultName;
        } else if (vaultName.includes('-')) {
          const parts = vaultName.split('-');
          if (parts.length >= 2) {
            // Check if it ends with v1, v2, etc.
            const lastPart = parts[parts.length - 1].toLowerCase();
            if (lastPart.startsWith('v') && lastPart.length <= 3) {
              // It's a version suffix, use the parts before it
              pairSymbol = `${parts[0]}/${parts[1]}`;
            } else {
              pairSymbol = `${parts[0]}/${parts[1]}`;
            }
          }
        } else if (vault.lpTokenSymbol) {
          // Try to extract from LP token symbol
          const parts = vault.lpTokenSymbol.split('-');
          if (parts.length >= 2) {
            pairSymbol = `${parts[0]}/${parts[1]}`;
          }
        }
        
        // Default strategy based on vault type
        let strategy = 'Market Making';
        if (vault.vaultType) {
          if (vault.vaultType.includes('cpmm')) {
            strategy = 'Concentrated Position Market Making';
          } else if (vault.vaultType.includes('spot')) {
            strategy = 'Spot Market Making';
          }
        }
        
        // Generate a reliable ID
        let id = vault.contractAddress || vault.slug;
        if (!id) {
          // Create ID from pair symbol if contract address not available
          id = `vault_${pairSymbol.toLowerCase().replace('/', '_')}`;
        }
        
        // Determine if this is a named vault (not permissionless)
        const isNamedVault = !vaultName.includes('permissionless') && !vaultName.includes('launchpad-amm-vault');
        
        return {
          id: id,
          name: vaultName,
          symbol: vault.lpTokenSymbol || `${pairSymbol.replace('/', '-')}-LP`,
          apy: apy,
          tvl: tvl,
          strategy: strategy,
          riskLevel: riskLevel,
          pairSymbol: pairSymbol,
          description: `This vault provides liquidity to the ${pairSymbol} trading pair and earns fees from trades. It uses an automated ${strategy.toLowerCase()} strategy to optimize returns.`,
          imageUrl: vault.baseLogoUrl || "https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png",
          isNamedVault: isNamedVault // Add property to identify named vaults
        };
      });
      
      // Filter out any vaults with missing critical data
      const validVaults = transformedVaults.filter(v => v.name && v.name !== 'Unknown Vault');
      
      // Sort vaults: named vaults first, then by APY (highest first)
      const sortedVaults = validVaults.sort((a, b) => {
        // First prioritize named vaults vs permissionless
        if (a.isNamedVault && !b.isNamedVault) return -1;
        if (!a.isNamedVault && b.isNamedVault) return 1;
        
        // Then sort by APY (highest first)
        return b.apy - a.apy;
      });
      
      if (sortedVaults.length > 0) {
        console.log('Successfully fetched and transformed real Mito vault data:', sortedVaults.length, 'valid vaults');
        return sortedVaults;
      }
      
      console.warn('API returned vaults but data is incomplete, using backup data');
      throw new Error('Incomplete vault data from API');
      
    } catch (error) {
      console.error('Error fetching Mito vaults:', error);
      
      // Fallback to realistic mock data if API fails
      console.log('Falling back to mock vault data');
      return [
        {
          id: "vault_nept_inj",
          name: "NEPT/INJ Vault",
          symbol: "NEPT-INJ-V1",
          apy: 79.22,
          tvl: 1250000,
          strategy: "Market Making",
          riskLevel: "High",
          pairSymbol: "NEPT/INJ",
          description: "This vault provides liquidity to the NEPT/INJ trading pair and earns fees from trades. It uses an automated market making strategy to optimize returns.",
          imageUrl: "https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png",
          isNamedVault: true
        },
        {
          id: "vault_bills_inj",
          name: "BILLS/INJ Vault",
          symbol: "BILLS-INJ-V1",
          apy: 62.18,
          tvl: 850000,
          strategy: "Market Making",
          riskLevel: "High",
          pairSymbol: "BILLS/INJ",
          description: "This vault provides liquidity to the BILLS/INJ trading pair and earns fees from trades. It uses an automated market making strategy to optimize returns.",
          imageUrl: "https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png",
          isNamedVault: true
        },
        {
          id: "vault_agent_inj",
          name: "AGENT/INJ Vault",
          symbol: "AGENT-INJ-V1",
          apy: 58.45,
          tvl: 980000,
          strategy: "Market Making",
          riskLevel: "Moderate",
          pairSymbol: "AGENT/INJ",
          description: "This vault provides liquidity to the AGENT/INJ trading pair and earns fees from trades. It uses an automated market making strategy to optimize returns.",
          imageUrl: "https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png",
          isNamedVault: true
        },
        {
          id: "vault_atom_inj",
          name: "ATOM/INJ Vault",
          symbol: "ATOM-INJ-V1",
          apy: 41.87,
          tvl: 1750000,
          strategy: "Market Making",
          riskLevel: "Moderate",
          pairSymbol: "ATOM/INJ",
          description: "This vault provides liquidity to the ATOM/INJ trading pair and earns fees from trades. It uses an automated market making strategy to optimize returns.",
          imageUrl: "https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png",
          isNamedVault: true
        },
        {
          id: "vault_inj_usdt",
          name: "INJ/USDT Vault",
          symbol: "INJ-USDT-V1",
          apy: 32.45,
          tvl: 2500000,
          strategy: "Market Making",
          riskLevel: "Low",
          pairSymbol: "INJ/USDT",
          description: "This vault provides liquidity to the INJ/USDT trading pair and earns fees from trades. It uses an automated market making strategy with lower risk due to the stablecoin pairing.",
          imageUrl: "https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png",
          isNamedVault: true
        }
      ];
    }
  }

  // Simulate a deposit into a vault (for demonstration purposes)
  async simulateVaultDeposit(vaultId: string, amount: string): Promise<string> {
    try {
      // Find the vault by ID
      const vaults = await this.getMitoVaults();
      const vault = vaults.find(v => v.id === vaultId);
      
      if (!vault) {
        return `Vault with ID ${vaultId} not found. Please check the vault ID and try again.`;
      }
      
      // Parse amount
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return "Please provide a valid amount to deposit.";
      }
      
      // Calculate potential earnings based on APY
      const annualEarnings = numAmount * (vault.apy / 100);
      const monthlyEarnings = annualEarnings / 12;
      const dailyEarnings = annualEarnings / 365;
      
      return `
## Deposit Simulation for ${vault.name}

**Amount**: ${numAmount} INJ
**Vault APY**: ${vault.apy.toFixed(2)}%
**Strategy**: ${vault.strategy}
**Risk Level**: ${vault.riskLevel}

### Projected Earnings
- **Daily**: ~${dailyEarnings.toFixed(4)} INJ
- **Monthly**: ~${monthlyEarnings.toFixed(4)} INJ
- **Yearly**: ~${annualEarnings.toFixed(4)} INJ

This is a simulation only. To make an actual deposit, you would need to:
1. Connect your wallet
2. Approve the vault contract to use your tokens
3. Confirm the deposit transaction

Would you like to proceed with a real deposit instead of a simulation?
      `;
    } catch (error) {
      console.error('Error simulating vault deposit:', error);
      return "An error occurred while simulating the vault deposit. Please try again later.";
    }
  }

  /**
   * Execute a real deposit into a Mito vault
   * @param vaultId The ID of the vault to deposit into
   * @param amount The amount of INJ to deposit
   * @param walletAddress The user's wallet address
   * @returns Promise with deposit result
   */
  async depositToVault(vaultId: string, amount: string, walletAddress: string): Promise<string> {
    try {
      // Validate amount
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return "Please provide a valid amount to deposit.";
      }

      // Find the vault by ID
      const vaults = await this.getMitoVaults();
      const vault = vaults.find(v => v.id === vaultId);
      
      if (!vault) {
        return `Vault with ID ${vaultId} not found.`;
      }
      
      // Check if we have a valid contract address
      if (!vault.id.startsWith('inj') && !vault.id.startsWith('0x')) {
        return `Cannot execute deposit - no valid contract address for ${vault.name}. This may be using mock data.`;
      }

      // Initialize Injective Chain ID - Mito vaults are only on mainnet
      const chainId = this.network === Network.Mainnet ? ChainId.Mainnet : ChainId.Testnet;
      
      // Check if Keplr is available
      if (typeof window === 'undefined' || !window.keplr) {
        return "Keplr wallet is not installed. Please install Keplr and try again.";
      }
      
      try {
        // Request Keplr to connect to Injective chain
        await window.keplr.enable(chainId);
        
        // Get the signer from Keplr
        const offlineSigner = window.keplr.getOfflineSigner(chainId);
        const accounts = await offlineSigner.getAccounts();
        const injectiveAddress = accounts[0].address;
        
        // Create a MsgSend transaction
        const amountInWei = (numAmount * 10**18).toString(); // Convert to INJ base units (10^18)
        
        // Create a direct transaction using Keplr's signDirect method
        try {
          // Prepare a direct transaction
          window.keplr.experimentalSuggestChain({
            chainId: chainId,
            chainName: 'Injective',
            rpc: 'https://tm.injective.network',
            rest: 'https://lcd.injective.network',
            bip44: {
              coinType: 60,
            },
            bech32Config: {
              bech32PrefixAccAddr: 'inj',
              bech32PrefixAccPub: 'injpub',
              bech32PrefixValAddr: 'injvaloper',
              bech32PrefixValPub: 'injvaloperpub',
              bech32PrefixConsAddr: 'injvalcons',
              bech32PrefixConsPub: 'injvalconspub',
            },
            currencies: [
              {
                coinDenom: 'INJ',
                coinMinimalDenom: 'inj',
                coinDecimals: 18,
              },
            ],
            feeCurrencies: [
              {
                coinDenom: 'INJ',
                coinMinimalDenom: 'inj',
                coinDecimals: 18,
                gasPriceStep: {
                  low: 0.0001,
                  average: 0.0005,
                  high: 0.001,
                },
              },
            ],
            stakeCurrency: {
              coinDenom: 'INJ',
              coinMinimalDenom: 'inj',
              coinDecimals: 18,
            },
            coinType: 60,
            features: ['ibc-transfer', 'ibc-go'],
          });
          
          // Force Keplr to open for signing
          window.keplr.signAmino(
            chainId,
            injectiveAddress,
            {
              chain_id: chainId,
              account_number: "0",
              sequence: "0",
              fee: {
                amount: [{ denom: "inj", amount: "5000000000000000" }],
                gas: "200000",
              },
              msgs: [
                {
                  type: "cosmos-sdk/MsgSend",
                  value: {
                    from_address: injectiveAddress,
                    to_address: vault.id,
                    amount: [{ denom: "inj", amount: amountInWei }],
                  },
                },
              ],
              memo: `Deposit to ${vault.name} vault`,
            }
          ).catch(e => {
            console.log("User may have rejected the transaction", e);
          });
          
          // Generate a transaction hash for demo purposes
          const txHash = "0x" + Math.random().toString(16).substring(2, 42);
          
          // Simplified response that's more concise and professional
          return `
## Transaction Initiated: ${vault.name}

**Amount:** ${numAmount} INJ
**APY:** ${vault.apy.toFixed(2)}%
**Est. Yearly Earnings:** ${(numAmount * vault.apy / 100).toFixed(4)} INJ


          `;
        } catch (txError: any) {
          console.error('Transaction error:', txError);
          return `Error creating transaction: ${txError.message || 'Unknown error'}. Please try again.`;
        }
      } catch (error: any) {
        console.error('Keplr connection error:', error);
        return `Error connecting to Keplr wallet: ${error.message || 'Unknown error'}. Please make sure Keplr is installed and unlocked.`;
      }
    } catch (error: any) {
      console.error('Error processing vault deposit:', error);
      return "An error occurred while processing the vault deposit. Please try again later.";
    }
  }

  /**
   * Get the current network (Mainnet or Testnet)
   * @returns The current network
   */
  getCurrentNetwork(): Network {
    return this.network;
  }

  /**
   * Update the network setting
   * @param newNetwork The new network to use (Mainnet or Testnet)
   */
  setNetwork(newNetwork: Network) {
    // Store the new network setting
    this.network = newNetwork;
    
    // Update API endpoints based on the new network
    const endpoints = getNetworkEndpoints(newNetwork);
    this.bankApi = new ChainGrpcBankApi(endpoints.grpc);
    this.stakingApi = new ChainGrpcStakingApi(endpoints.grpc);
    
    // Update oracle API if needed
    if (newNetwork === Network.Mainnet) {
      this.oracleApi = new IndexerGrpcOracleApi(endpoints.indexer);
    } else {
      // For testnet
      this.oracleApi = new IndexerGrpcOracleApi(endpoints.indexer);
    }
    
    return `Network updated to ${newNetwork}`;
  }

  /**
   * Fetch spot markets from Injective
   */
  async fetchSpotMarkets(): Promise<any[]> {
    try {
      const networkName = this.network === Network.Testnet ? 'Testnet' : 'Mainnet';
      console.log(`Fetching spot markets from Injective for ${networkName}...`);
      
      // Use the appropriate network endpoints based on current network
      const endpoints = getNetworkEndpoints(this.network);
      const spotApi = new IndexerGrpcSpotApi(endpoints.indexer);
      
      try {
        // Fetch markets from the API
        const spotMarketsResponse = await spotApi.fetchMarkets({});
        
        // Handle the response properly based on its structure
        let markets = [];
        
        // Check if response is an array or has a markets property
        if (Array.isArray(spotMarketsResponse)) {
          markets = spotMarketsResponse;
        } else if (spotMarketsResponse && typeof spotMarketsResponse === 'object') {
          // Try to extract markets from response object if it's not an array
          markets = spotMarketsResponse.markets || 
                    spotMarketsResponse.data || 
                    [];
        }
        
        if (markets.length > 0) {
          console.log(`Successfully fetched ${markets.length} spot markets for ${networkName}`);
          
          // Debug: Log the first market to see its structure
          console.log("Sample market data structure:", JSON.stringify(markets[0], null, 2));
          
          // Process the markets to ensure they have the required fields
          const processedMarkets = markets
            // Filter markets by network if there's a network identifier in the market data
            .filter(market => {
              // If market has network info, filter by it, otherwise keep all
              if (market.network) {
                return (this.network === Network.Mainnet && 
                       (market.network === 'mainnet' || market.network === 'Mainnet')) ||
                       (this.network === Network.Testnet && 
                       (market.network === 'testnet' || market.network === 'Testnet'));
              }
              return true;
            })
            .map(market => {
              // Extract price data correctly from the market info
              const price = market.price || market.lastPrice || market.oraclePrice || "0";
              const vol = market.volume || market.volume24h || market.dayVolume || "0";
              const priceChange = market.priceChange24h || market.priceChange || "0";
              
              // Extract base and quote tokens correctly
              const baseSymbol = market.baseToken?.symbol || market.baseDenom?.split('/').pop() || 'Unknown';
              const quoteSymbol = market.quoteToken?.symbol || market.quoteDenom?.split('/').pop() || 'USDT';
              const ticker = market.ticker || `${baseSymbol}/${quoteSymbol}`;
              
              return {
                marketId: market.marketId,
                marketStatus: market.marketStatus || "active",
                ticker: ticker.toUpperCase(), // Ensure ticker is uppercase for matching
                baseToken: {
                  symbol: baseSymbol.toUpperCase(), // Ensure symbol is uppercase for matching
                  name: market.baseToken?.name || baseSymbol,
                  denom: market.baseToken?.denom || market.baseDenom || '',
                  address: market.baseToken?.address || ''
                },
                quoteToken: {
                  symbol: quoteSymbol.toUpperCase(), // Ensure symbol is uppercase for matching
                  name: market.quoteToken?.name || quoteSymbol,
                  denom: market.quoteToken?.denom || market.quoteDenom || '',
                  address: market.quoteToken?.address || ''
                },
                lastPrice: price,
                volume: vol,
                priceChange24h: priceChange,
                network: networkName, // Add network identifier
                raw: market // Keep raw data for debugging
              };
            });
          
          console.log(`Processed ${processedMarkets.length} markets for ${networkName}`);
          return processedMarkets;
        }
      } catch (error) {
        console.error(`Error fetching markets for ${networkName}:`, error);
      }
      
      // If API call fails or returns no markets, use appropriate fallback markets
      console.log(`Using fallback spot markets for ${networkName}`);
      
      // Different fallback markets depending on network
      if (this.network === Network.Mainnet) {
        return [
          {
            marketId: "0x0611780ba69656949525013d947713300f56c37b6175e02f26bffa495c3208fe",
            marketStatus: "active",
            ticker: "INJ/USDT",
            baseToken: {
              symbol: "INJ",
              name: "Injective Protocol",
              denom: "inj",
              address: "0xe28b3B32B6c345A34Ff64674606124Dd5Aceca30"
            },
            quoteToken: {
              symbol: "USDT",
              name: "Tether USD",
              denom: "peggy0xdAC17F958D2ee523a2206206994597C13D831ec7",
              address: "0xdAC17F958D2ee523a2206206994597C13D831ec7"
            },
            lastPrice: "23.45",
            volume: "1245000",
            priceChange24h: "2.5",
            network: "Mainnet"
          },
          {
            marketId: "0x7a57e705bb4e09c88aecfc295569481dbf2fe1d5efe364651fbe72385938e9b0",
            marketStatus: "active",
            ticker: "WETH/USDT",
            baseToken: {
              symbol: "WETH",
              name: "Wrapped Ethereum",
              denom: "peggy0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
              address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
            },
            quoteToken: {
              symbol: "USDT",
              name: "Tether USD",
              denom: "peggy0xdAC17F958D2ee523a2206206994597C13D831ec7",
              address: "0xdAC17F958D2ee523a2206206994597C13D831ec7"
            },
            lastPrice: "3456.78",
            volume: "3456000",
            priceChange24h: "-0.8",
            network: "Mainnet"
          }
        ];
      } else {
        // Testnet fallback markets
        return [
          {
            marketId: "0x0611780ba69656949525013d947713300f56c37b6175e02f26bffa495c3208aa",
            marketStatus: "active",
            ticker: "INJ/USDT",
            baseToken: {
              symbol: "INJ",
              name: "Injective Protocol",
              denom: "inj",
              address: "0xe28b3B32B6c345A34Ff64674606124Dd5Aceca30"
            },
            quoteToken: {
              symbol: "USDT",
              name: "Tether USD",
              denom: "peggy0xdAC17F958D2ee523a2206206994597C13D831ec7",
              address: "0xdAC17F958D2ee523a2206206994597C13D831ec7"
            },
            lastPrice: "20.45",
            volume: "45000",
            priceChange24h: "1.5",
            network: "Testnet"
          },
          {
            marketId: "0x7a57e705bb4e09c88aecfc295569481dbf2fe1d5efe364651fbe72385938e9cc",
            marketStatus: "active",
            ticker: "WETH/USDT",
            baseToken: {
              symbol: "WETH",
              name: "Wrapped Ethereum",
              denom: "peggy0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
              address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
            },
            quoteToken: {
              symbol: "USDT",
              name: "Tether USD",
              denom: "peggy0xdAC17F958D2ee523a2206206994597C13D831ec7",
              address: "0xdAC17F958D2ee523a2206206994597C13D831ec7"
            },
            lastPrice: "3000.00",
            volume: "100000",
            priceChange24h: "0.2",
            network: "Testnet"
          }
        ];
      }
    } catch (error) {
      console.error("Error in fetchSpotMarkets:", error);
      return [];
    }
  }
  /**
   * Fetch derivative markets from Injective
   */
  async fetchDerivativeMarkets(): Promise<any[]> {
    try {
      console.log(`Fetching derivative markets for ${this.network === Network.Mainnet ? 'Mainnet' : 'Testnet'}...`);
      
      // Use the current network endpoints instead of forcing testnet
      const endpoints = getNetworkEndpoints(this.network);
      const derivativesApi = new IndexerGrpcDerivativesApi(endpoints.indexer);
      
      const derivativeMarketsResponse = await derivativesApi.fetchMarkets({});
      
      // The API response is already an array of markets
      const allMarkets = Array.isArray(derivativeMarketsResponse) ? derivativeMarketsResponse : [];
      console.log(`Fetched ${allMarkets.length} total derivative markets from ${this.network === Network.Mainnet ? 'Mainnet' : 'Testnet'}`);
      
      // Debug: Log the first market to see its structure
      if (allMarkets.length > 0) {
        console.log("Sample derivative market data structure:", JSON.stringify(allMarkets[0], null, 2));
      }
      
      // Process the markets to ensure they have the required fields
      const processedMarkets = allMarkets.map(market => {
        // Extract price data correctly from the market info
        const price = market.price || market.lastPrice || market.oraclePrice || "0";
        const vol = market.volume || market.volume24h || market.dayVolume || "0";
        const priceChange = market.priceChange24h || market.priceChange || "0";
        
        return {
          marketId: market.marketId,
          marketStatus: market.marketStatus || "active",
          ticker: market.ticker || `${market.oracleBase || 'Unknown'}/${market.oracleQuote || 'Unknown'} PERP`,
          oracleBase: market.oracleBase || 'Unknown',
          oracleQuote: market.oracleQuote || 'Unknown',
          quoteDenom: market.quoteDenom || '',
          lastPrice: price,
          volume: vol,
          priceChange24h: priceChange,
          raw: market // Keep raw data for debugging
        };
      });
      
      // If no markets found, return mock data for hackathon demo purposes
      if (allMarkets.length === 0) {
        console.log("No derivative markets found, using mock data for hackathon demo");
        return this.getMockDerivativeMarkets();
      }
      
      return processedMarkets;
    } catch (error) {
      console.error("Error fetching derivative markets:", error);
      // Return mock derivative markets for testing if API fails
      console.log("Using mock derivative markets due to API error");
      return this.getMockDerivativeMarkets();
    }
  }
  
  /**
   * Get mock derivative markets for testing
   */
  private getMockDerivativeMarkets(): any[] {
    return [
      {
        marketId: "0x17ef48032cb24375ba7c2e39f384e56433bcab20cbee9a7357e4cba2eb00abe6",
        marketStatus: "active",
        ticker: "INJ/USDT PERP",
        oracleBase: "INJ",
        oracleQuote: "USDT",
        quoteDenom: "peggy0x87aB3B4C8661e07D6372361211B96ed4Dc36B1B5",
        makerFeeRate: "0.001",
        takerFeeRate: "0.001",
        serviceProviderFee: "0.4",
        minPriceTickSize: "0.000000000000001",
        minQuantityTickSize: "0.001",
        lastPrice: "23.45",
        volume: "1245000",
        priceChange24h: "2.5",
        perpetualMarketInfo: {
          fundingInterval: "3600",
          initialMarginRatio: "0.05",
          maintenanceMarginRatio: "0.025"
        }
      },
      {
        marketId: "0x1c79dac019f73e4060494ab1b4fcba734350656d6fc4d474f6a238c13c6f9ced",
        marketStatus: "active",
        ticker: "BTC/USDT PERP",
        oracleBase: "BTC",
        oracleQuote: "USDT",
        quoteDenom: "peggy0x87aB3B4C8661e07D6372361211B96ed4Dc36B1B5",
        makerFeeRate: "0.001",
        takerFeeRate: "0.001",
        serviceProviderFee: "0.4",
        minPriceTickSize: "0.000000000000001",
        minQuantityTickSize: "0.001",
        lastPrice: "67890.45",
        volume: "5678000",
        priceChange24h: "1.2",
        perpetualMarketInfo: {
          fundingInterval: "3600",
          initialMarginRatio: "0.05",
          maintenanceMarginRatio: "0.025"
        }
      },
      {
        marketId: "0x4ca0f92fc28be0c9761326016b5a1a2177dd6375558365116b5bdda9abc229ce",
        marketStatus: "active",
        ticker: "ETH/USDT PERP",
        oracleBase: "ETH",
        oracleQuote: "USDT",
        quoteDenom: "peggy0x87aB3B4C8661e07D6372361211B96ed4Dc36B1B5",
        makerFeeRate: "0.001",
        takerFeeRate: "0.001",
        serviceProviderFee: "0.4",
        minPriceTickSize: "0.000000000000001",
        minQuantityTickSize: "0.001",
        lastPrice: "3456.78",
        volume: "3456000",
        priceChange24h: "-0.8",
        perpetualMarketInfo: {
          fundingInterval: "3600",
          initialMarginRatio: "0.05",
          maintenanceMarginRatio: "0.025"
        }
      }
    ];
  }

  /**
   * Fetch and log all available markets (spot and derivatives) from Injective
   * @returns An object containing formatted market data for display
   */
  async fetchAndLogMarkets(marketType: 'spot' | 'derivative' = 'spot'): Promise<any> {
    try {
      console.log("Fetching Injective markets...");
      
      // Get the network type
      const networkType = this.network === Network.Testnet ? 'Testnet' : 'Mainnet';
      console.log(`Current network: ${networkType}`);
      
      // Fetch markets based on type
      let marketsToDisplay = [];
      if (marketType === 'spot') {
        marketsToDisplay = await this.fetchSpotMarkets();
      } else {
        marketsToDisplay = await this.fetchDerivativeMarkets();
      }
      
      // Debug log the raw markets
      console.log(`Raw ${marketType} markets:`, marketsToDisplay);
      
      // Format markets for display
      const formattedMarkets = marketsToDisplay.map(market => {
        // Ensure we have a valid ticker
        const ticker = market.ticker?.toUpperCase() || 
                      `${market.baseToken?.symbol || 'Unknown'}/${market.quoteToken?.symbol || 'USDT'}`.toUpperCase();
        
        // Log each market's data for debugging
        console.log(`Processing market: ${ticker}`, {
          marketId: market.marketId,
          ticker: ticker,
          baseToken: market.baseToken,
          quoteToken: market.quoteToken
        });
        
        return {
          marketId: market.marketId,
          ticker: ticker,
          baseSymbol: market.baseToken?.symbol?.toUpperCase() || ticker.split('/')[0],
          quoteSymbol: market.quoteToken?.symbol?.toUpperCase() || ticker.split('/')[1] || 'USDT',
          baseImage: this.getTokenImageUrl(market.baseToken?.symbol || ticker.split('/')[0]),
          price: market.lastPrice || '0.000000',
          volume: market.volume || '0.00',
          priceChange: market.priceChange24h || '0.00',
          marketType: marketType === 'spot' ? 'Spot' : (market.perpetualMarketInfo ? 'Perpetual' : 'Futures'),
          raw: market // Keep raw data for debugging
        };
      });
      
      // Log the final formatted markets
      console.log(`Formatted ${marketType} markets:`, formattedMarkets);
      
      return {
        markets: formattedMarkets,
        totalCount: formattedMarkets.length,
        networkType,
        marketType: marketType === 'spot' ? 'Spot' : 'Derivative'
      };
    } catch (error) {
      console.error("Error fetching markets:", error);
      return {
        markets: [],
        totalCount: 0,
        networkType: this.network === Network.Testnet ? 'Testnet' : 'Mainnet',
        marketType: marketType === 'spot' ? 'Spot' : 'Derivative'
      };
    }
  }

  /**
   * Helper function to get token image URL
   */
  private getTokenImageUrl(symbol: string): string {
    // Map of common token symbols to their image URLs
    const tokenImageMap: Record<string, string> = {
      'INJ': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png',
      'USDT': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/usdt.png',
      'USDC': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/usdc.png',
      'WETH': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/weth.png',
      'WBTC': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/wbtc.png',
      'APE': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/ape.png',
      'ATOM': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/atom/images/atom.png',
      'OSMO': 'https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/osmo.png'
    };
    
    // Try to match the symbol to a known token
    if (tokenImageMap[symbol]) {
      return tokenImageMap[symbol];
    }
    
    // Default placeholder for unknown tokens
    return 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png';
  }

  /**
   * Place a spot market order on Injective
   * @param marketId The market ID to trade on
   * @param orderSide Buy or Sell
   * @param quantity Amount to buy or sell
   * @param price Limit price (only for limit orders)
   * @param isMarketOrder Whether this is a market order (true) or limit order (false)
   * @returns Transaction hash if successful
   */
  async placeSpotOrder(
    marketId: string,
    orderSide: 'buy' | 'sell',
    quantity: string,
    price?: string,
    isMarketOrder: boolean = false
  ): Promise<string> {
    try {
      console.log(`Attempting to place ${orderSide} spot order for ${quantity} on market ${marketId}`);
      
      if (!window.keplr) {
        throw new Error("Keplr wallet is not installed");
      }

      // Get the connected wallet address
      const chainId = this.network === Network.Mainnet ? ChainId.Mainnet : ChainId.Testnet;
      console.log(`Enabling Keplr for chain ID: ${chainId}`);
      await window.keplr.enable(chainId);
      const accounts = await window.keplr.getOfflineSigner(chainId).getAccounts();
      const injectiveAddress = accounts[0].address;
      console.log(`Using Injective address: ${injectiveAddress}`);
      
      // Get the default subaccount ID
      const subaccountId = `${injectiveAddress}000000000000000000000000`;
      
      // Create the appropriate message based on order type
      let msg;
      if (isMarketOrder) {
        const marketOrderParams = {
          injectiveAddress: injectiveAddress,
          marketId: marketId,
          subaccountId: subaccountId,
          feeRecipient: injectiveAddress,
          price: price || '0',
          quantity: quantity,
          orderType: orderSide === 'buy' ? 1 : 2, // 1 for Buy, 2 for Sell
          cid: `spot-market-${Date.now()}`
        };
        
        console.log("Creating spot market order with params:", marketOrderParams);
        msg = MsgCreateSpotMarketOrder.fromJSON(marketOrderParams);
      } else {
        if (!price) {
          throw new Error("Price is required for limit orders");
        }
        
        const limitOrderParams = {
          injectiveAddress: injectiveAddress,
          marketId: marketId,
          subaccountId: subaccountId,
          feeRecipient: injectiveAddress,
          price: price,
          quantity: quantity,
          orderType: orderSide === 'buy' ? 1 : 2, // 1 for Buy, 2 for Sell
          cid: `spot-limit-${Date.now()}`
        };
        
        console.log("Creating spot limit order with params:", limitOrderParams);
        msg = MsgCreateSpotLimitOrder.fromJSON(limitOrderParams);
      }
      
      // Create the transaction
      console.log("Creating broadcaster with network:", this.network);
      const broadcaster = new MsgBroadcaster({
        network: this.network,
        walletStrategy: new WalletStrategy({
          chainId: this.network === Network.Mainnet ? ChainId.Mainnet : ChainId.Testnet,
          wallet: Wallet.Keplr
        })
      });
      
      // Broadcast the transaction
      console.log("Broadcasting transaction...");
      const response = await broadcaster.broadcast({
        msgs: [msg],
        injectiveAddress: injectiveAddress
      });
      
      console.log(`Order placed successfully: ${response.txHash}`);
      return `Order placed successfully! Transaction hash: ${response.txHash}`;
    } catch (error) {
      console.error("Error placing spot order:", error);
      return `Failed to place order: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Place a derivative market order on Injective
   * @param marketId The market ID to trade on
   * @param orderSide Buy or Sell
   * @param quantity Amount to buy or sell
   * @param price Limit price (only for limit orders)
   * @param isMarketOrder Whether this is a market order (true) or limit order (false)
   * @returns Transaction hash if successful
   */
  async placeDerivativeOrder(
    marketId: string,
    orderSide: 'buy' | 'sell',
    quantity: string,
    price?: string,
    isMarketOrder: boolean = false
  ): Promise<string> {
    try {
      console.log(`Attempting to place ${orderSide} derivative order for ${quantity} on market ${marketId}`);
      
      if (!window.keplr) {
        throw new Error("Keplr wallet is not installed");
      }

      // Get the connected wallet address
      const chainId = this.network === Network.Mainnet ? ChainId.Mainnet : ChainId.Testnet;
      console.log(`Enabling Keplr for chain ID: ${chainId}`);
      await window.keplr.enable(chainId);
      const accounts = await window.keplr.getOfflineSigner(chainId).getAccounts();
      const injectiveAddress = accounts[0].address;
      console.log(`Using Injective address: ${injectiveAddress}`);
      
      // Get the default subaccount ID
      const subaccountId = `${injectiveAddress}000000000000000000000000`;
      
      // Create the appropriate message based on order type
      let msg;
      if (isMarketOrder) {
        const marketOrderParams = {
          injectiveAddress: injectiveAddress,
          marketId: marketId,
          subaccountId: subaccountId,
          feeRecipient: injectiveAddress,
          price: price || '0',
          quantity: quantity,
          margin: '0', // Required for derivative orders
          orderType: orderSide === 'buy' ? 1 : 2, // 1 for Buy, 2 for Sell
          cid: `derivative-market-${Date.now()}`
        };
        
        console.log("Creating derivative market order with params:", marketOrderParams);
        msg = MsgCreateDerivativeMarketOrder.fromJSON(marketOrderParams);
      } else {
        if (!price) {
          throw new Error("Price is required for limit orders");
        }
        
        const limitOrderParams = {
          injectiveAddress: injectiveAddress,
          marketId: marketId,
          subaccountId: subaccountId,
          feeRecipient: injectiveAddress,
          price: price,
          quantity: quantity,
          margin: '0', // Required for derivative orders
          orderType: orderSide === 'buy' ? 1 : 2, // 1 for Buy, 2 for Sell
          cid: `derivative-limit-${Date.now()}`
        };
        
        console.log("Creating derivative limit order with params:", limitOrderParams);
        msg = MsgCreateDerivativeLimitOrder.fromJSON(limitOrderParams);
      }
      
      // Create the transaction
      console.log("Creating broadcaster with network:", this.network);
      const broadcaster = new MsgBroadcaster({
        network: this.network,
        walletStrategy: new WalletStrategy({
          chainId: this.network === Network.Mainnet ? ChainId.Mainnet : ChainId.Testnet,
          wallet: Wallet.Keplr
        })
      });
      
      // Broadcast the transaction
      console.log("Broadcasting transaction...");
      const response = await broadcaster.broadcast({
        msgs: [msg],
        injectiveAddress: injectiveAddress
      });
      
      console.log(`Order placed successfully: ${response.txHash}`);
      return `Order placed successfully! Transaction hash: ${response.txHash}`;
    } catch (error) {
      console.error("Error placing derivative order:", error);
      return `Failed to place order: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Agent spawning functionality
   */
  async spawnAgent(type: string, config: any = {}): Promise<string> {
    const agentId = `${type}-${Date.now()}`;
    
    // Default capabilities for any agent
    const defaultCapabilities = [
      'Process user commands',
      'Execute tasks',
      'Report status',
      'Interact with other agents'
    ];

    // Create the base agent
    const agent = {
      id: agentId,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Agent`,
      status: 'active',
      createdAt: new Date(),
      lastActive: new Date(),
      config,
      data: {},
      tasks: [],
      description: `Specialized ${type} agent with custom capabilities`,
      capabilities: [...defaultCapabilities]
    };

    // Add specific capabilities based on type
    switch (type.toLowerCase()) {
      case 'market':
        agent.capabilities.push(
          'Fetch spot market data',
          'Fetch derivative market data',
          'Analyze market trends',
          'Execute trades'
        );
        break;
      case 'staking':
        agent.capabilities.push(
          'Monitor validator performance',
          'Recommend validators',
          'Execute staking transactions',
          'Calculate rewards'
        );
        break;
      case 'vault':
        agent.capabilities.push(
          'Analyze vault performance',
          'Compare APY across vaults',
          'Recommend optimal vaults',
          'Execute vault deposits'
        );
        break;
      case 'trading':
        agent.capabilities.push(
          'Monitor trading opportunities',
          'Execute trades',
          'Analyze market conditions',
          'Manage trading positions'
        );
        break;
      case 'research':
        agent.capabilities.push(
          'Analyze market data',
          'Generate reports',
          'Track trends',
          'Provide insights'
        );
        break;
      case 'portfolio':
        agent.capabilities.push(
          'Track portfolio performance',
          'Manage asset allocation',
          'Calculate returns',
          'Suggest rebalancing'
        );
        break;
      default:
        // For custom agents, add generic capabilities based on the type
        agent.capabilities.push(
          `Handle ${type}-related tasks`,
          `Process ${type} data`,
          `Execute ${type} operations`,
          `Monitor ${type} status`
        );
    }

    // Store the agent locally
    this.spawnedAgents.set(agentId, agent);
    
    // Save to localStorage for persistence
    this.saveAgentsToLocalStorage();
    
    try {
      // Also save to backend
      const response = await fetch(`${this.apiBaseUrl}/spawned-agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agent)
      });
      
      if (!response.ok) {
        console.error('Error saving agent to backend:', await response.text());
      } else {
        console.log('Agent saved to backend successfully');
      }
    } catch (error) {
      console.error('Error connecting to backend:', error);
      // Continue with local storage even if backend fails
    }
    
    console.log(`Spawned new ${type} agent:`, agent);
    return agentId;
  }

  async getSpawnedAgents(): Promise<any[]> {
    console.log('getSpawnedAgents called');
    
    // Always return local agents first for immediate display
    const localAgents = Array.from(this.spawnedAgents.values());
    console.log('Local agents:', localAgents);
    
    try {
      // Try to get from backend in parallel
      const response = await fetch(`${this.apiBaseUrl}/spawned-agents`);
      
      if (response.ok) {
        const backendAgents = await response.json();
        console.log('Backend agents:', backendAgents);
        
        // Update local cache with backend data
        backendAgents.forEach(agent => {
          this.spawnedAgents.set(agent.id, agent);
        });
        
        // Return combined unique agents
        const allAgents = Array.from(this.spawnedAgents.values());
        console.log('Returning all agents:', allAgents);
        return allAgents;
      } else {
        console.error('Error fetching agents from backend:', await response.text());
      }
    } catch (error) {
      console.error('Error connecting to backend:', error);
    }
    
    // Return local agents if backend fails
    return localAgents;
  }

  async getAgent(id: string): Promise<any> {
    try {
      // Try to get from backend first
      const response = await fetch(`${this.apiBaseUrl}/spawned-agents/${id}`);
      
      if (response.ok) {
        const agent = await response.json();
        // Update local cache
        this.spawnedAgents.set(id, agent);
        return agent;
      } else {
        console.error('Error fetching agent from backend:', await response.text());
      }
    } catch (error) {
      console.error('Error connecting to backend:', error);
    }
    
    // Fallback to local storage
    return this.spawnedAgents.get(id);
  }

  async updateAgentStatus(id: string, status: 'active' | 'idle' | 'busy'): Promise<void> {
    const agent = this.spawnedAgents.get(id);
    if (agent) {
      agent.status = status;
      agent.lastActive = new Date();
      this.spawnedAgents.set(id, agent);
      
      try {
        // Update in backend
        const response = await fetch(`${this.apiBaseUrl}/spawned-agents/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(agent)
        });
        
        if (!response.ok) {
          console.error('Error updating agent in backend:', await response.text());
        }
      } catch (error) {
        console.error('Error connecting to backend:', error);
      }
    }
  }

  async deleteAgent(id: string): Promise<boolean> {
    const deleted = this.spawnedAgents.delete(id);
    
    try {
      // Delete from backend
      const response = await fetch(`${this.apiBaseUrl}/spawned-agents/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        console.error('Error deleting agent from backend:', await response.text());
      }
    } catch (error) {
      console.error('Error connecting to backend:', error);
    }
    
    // Save changes to localStorage
    this.saveAgentsToLocalStorage();
    
    return deleted;
  }

  /**
   * Save agents to localStorage for persistence
   */
  private saveAgentsToLocalStorage() {
    try {
      const agentsArray = Array.from(this.spawnedAgents.entries());
      localStorage.setItem('spawnedAgents', JSON.stringify(agentsArray));
      console.log('Saved agents to localStorage:', agentsArray);
    } catch (error) {
      console.error('Error saving agents to localStorage:', error);
    }
  }
  
  /**
   * Load agents from localStorage
   */
  private loadAgentsFromLocalStorage() {
    try {
      const savedAgents = localStorage.getItem('spawnedAgents');
      if (savedAgents) {
        const agentsArray = JSON.parse(savedAgents);
        agentsArray.forEach(([id, agent]) => {
          this.spawnedAgents.set(id, agent);
        });
        console.log('Loaded agents from localStorage:', this.spawnedAgents);
      }
    } catch (error) {
      console.error('Error loading agents from localStorage:', error);
    }
  }

  /**
   * Test function to directly call fetchAndLogMarkets
   * This will run as soon as the service is initialized
   */
  testFetchMarkets() {
    console.log("=== STARTING MARKET FETCH TEST ===");
    this.fetchAndLogMarkets()
      .then(result => {
        console.log("Market fetch result:", result);
      })
      .catch(error => {
        console.error("Error in test function:", error);
      });
    console.log("=== MARKET FETCH TEST INITIATED ===");
  }
}
