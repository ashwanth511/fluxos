import { GoogleGenerativeAI } from "@google/generative-ai";
import { Network, getNetworkEndpoints } from '@injectivelabs/networks';
import { 
  ChainGrpcBankApi, 
  ChainGrpcStakingApi, 
  IndexerGrpcOracleApi,
  MsgDelegate
} from '@injectivelabs/sdk-ts';
import { MsgBroadcaster, WalletStrategy, Wallet } from "@injectivelabs/wallet-ts";
import { ChainId } from '@injectivelabs/ts-types'
import { BigNumberInBase } from '@injectivelabs/utils'

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

export class AgentService {
  private model;
  private chat;
  private bankApi: ChainGrpcBankApi;
  private stakingApi: ChainGrpcStakingApi;
  private oracleApi: IndexerGrpcOracleApi;
  private network: Network;
  
  // Add mainnet APIs for token fetching
  private mainnetBankApi: ChainGrpcBankApi;
  private mainnetStakingApi: ChainGrpcStakingApi;
  msgBroadcaster: any;

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
    
    // Initialize mainnet API for token fetching
    const mainnetEndpoints = getNetworkEndpoints(Network.Mainnet);
    this.mainnetBankApi = new ChainGrpcBankApi(mainnetEndpoints.grpc);
    this.mainnetStakingApi = new ChainGrpcStakingApi(mainnetEndpoints.grpc);

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
}
