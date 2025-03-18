"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bot, Send, Copy, Check } from "lucide-react"
import DockIcons from "@/components/DockIcons"
import WalletConnect from "@/components/WalletConnect"
import agentimg from "@/assets/hero13.png"
import { AgentService, Message, TokenDenom, ValidatorInfo} from "@/services/agentService"
import { useWallet } from "@/context/WalletContext"
import { useNavigate } from "react-router-dom"

import { Network } from "@injectivelabs/networks"

const styles = `
  @keyframes wave {
    0% { transform: translateY(0) scale(1) rotate(0deg); }
    25% { transform: translateY(-8px) scale(1.02) rotate(1deg); }
    50% { transform: translateY(-15px) scale(1.03) rotate(-1deg); }
    75% { transform: translateY(-8px) scale(1.02) rotate(1deg); }
    100% { transform: translateY(0) scale(1) rotate(0deg); }
  }
  
  @keyframes wave-reverse {
    0% { transform: translateY(0) scale(1.02) rotate(0deg); }
    25% { transform: translateY(8px) scale(1.01) rotate(-1deg); }
    50% { transform: translateY(15px) scale(1) rotate(1deg); }
    75% { transform: translateY(8px) scale(1.01) rotate(-1deg); }
    100% { transform: translateY(0) scale(1.02) rotate(0deg); }
  }

  @keyframes float {
    0% { transform: translateY(0) scale(1); filter: brightness(1) blur(0px); }
    25% { transform: translateY(-15px) scale(1.02); filter: brightness(1.1) blur(0.5px); }
    50% { transform: translateY(-25px) scale(1.03); filter: brightness(1.2) blur(1px); }
    75% { transform: translateY(-15px) scale(1.02); filter: brightness(1.1) blur(0.5px); }
    100% { transform: translateY(0) scale(1); filter: brightness(1) blur(0px); }
  }

  @keyframes glow {
    0% { opacity: 0.4; }
    50% { opacity: 0.7; }
    100% { opacity: 0.4; }
  }

  .animate-wave {
    animation: wave 8s ease-in-out infinite;
    will-change: transform;
  }

  .animate-wave-reverse {
    animation: wave-reverse 7s ease-in-out infinite;
    will-change: transform;
  }

  .animate-float {
    animation: float 6s ease-in-out infinite;
    will-change: transform, filter;
  }

  .glow {
    animation: glow 4s ease-in-out infinite;
    will-change: opacity;
  }
`

export default function DashboardPage() {
  const navigate = useNavigate();
  
  // State for user messages and conversation
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: "Hi! I'm your Injective assistant! \n" +
               " Just tell me what you want to do:\n" +
               "• Buy INJ (e.g. 'Buy $20 of INJ')\n" +
               "• Check your INJ balance\n" +
               "• Stake INJ tokens\n" +
               "• Get INJ price\n" +
               "• View all tokens on Injective"
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  // State for wallet connection
  const { network } = useWallet();
  const [address, setAddress] = useState("")
  
  // State for showing different card types
  const [showValidators, setShowValidators] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [showVaultCards, setShowVaultCards] = useState(false);
  const [showMarkets, setShowMarkets] = useState(false);
  
  // State for tokens and vaults
  const [tokens, setTokens] = useState<TokenDenom[]>([])
  const [validators, setValidators] = useState<ValidatorInfo[]>([])
  const [vaultsList, setVaultsList] = useState<any[]>([]);
  const [copiedDenom, setCopiedDenom] = useState<string | null>(null)
  
  // State for markets
  const [spotMarkets, setSpotMarkets] = useState<any[]>([]);
  const [derivativeMarkets, setDerivativeMarkets] = useState<any[]>([]);
  const [selectedMarketType, setSelectedMarketType] = useState<'spot' | 'derivative'>('spot');
  const [marketList, setMarketList] = useState<any[]>([]);
  
  // State for market pagination
  const [currentMarketPage, setCurrentMarketPage] = useState(1);
  const marketsPerPage = 5;
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const agentService = useRef<AgentService | null>(null)

  useEffect(() => {
    if (!agentService.current) {
      agentService.current = new AgentService()
    }
  }, [])

  useEffect(() => {
    if (agentService.current) {
      agentService.current.setNetwork(network);
      console.log(`Network changed to ${network}, updating AgentService`);
    }
  }, [network]);

  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDenom(text);
    setTimeout(() => setCopiedDenom(null), 2000);
  };

  const handleBuyINJ = async (amount: string = "20", skipUserMessage = false, isTokenAmount = false) => {
    if (!address) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Please connect your wallet first! Click the 'Connect Wallet' button above." }
      ]);
      return;
    }

    if (!agentService.current) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
      ]);
      return;
    }

    // Add user's request to messages only if not skipped
    if (!skipUserMessage) {
      const message = isTokenAmount 
        ? `Buy ${amount} INJ tokens` 
        : `Buy $${amount} worth of INJ`;
      setMessages(prev => [...prev, { role: 'user', content: message }]);
    }
    
    setIsLoading(true);
    
    try {
      // Validate amount
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        setMessages(prev => [...prev, 
          { role: 'assistant', content: "Please provide a valid amount to purchase. For example: 'Buy $20 of INJ' or 'Buy 2 INJ tokens'" }
        ]);
        setIsLoading(false);
        return;
      }
      
      // Call the service to initiate MoonPay purchase
      const response = await agentService.current.buyINJWithFiatSimple(amount, address, isTokenAmount);
      
      // Only add assistant message if there's an error
      if (response) {
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      } else {
        // Success message
        const successMsg = isTokenAmount
          ? `Opening MoonPay to buy ${amount} INJ tokens. They will be sent directly to your wallet ${address.slice(0,6)}...${address.slice(-4)} 🚀`
          : `Opening MoonPay to buy $${amount} worth of INJ. The INJ will be sent directly to your wallet ${address.slice(0,6)}...${address.slice(-4)} 🚀`;
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: successMsg
        }]);
        
        // Add helpful follow-up message after a delay
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: "Once your purchase is complete, you can check your INJ balance in your wallet. Would you like to do anything else with your INJ?" 
          }]);
        }, 2000);
      }
    } catch (error) {
      console.error('Error processing INJ purchase:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I encountered an error while processing your INJ purchase. Please try again or visit MoonPay directly at https://buy.moonpay.com" 
      }]);
    }
    
    setIsLoading(false);
  };

  const handleCheckBalance = async (skipUserMessage = false) => {
    if (!address) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Please connect your wallet first! Click the 'Connect Wallet' button above." }
      ]);
      return;
    }

    if (!agentService.current) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
      ]);
      return;
    }

    setIsLoading(true);
    try {
      // Add user message first if not skipped
      if (!skipUserMessage) {
        setMessages(prev => [...prev, { role: 'user', content: "Check my INJ balance" }]);
      }
      
      // Add a loading message
      setMessages(prev => [...prev, { role: 'assistant', content: "Checking your INJ balance..." }]);
      
      const response = await agentService.current.checkINJBalance(address);
      
      // Replace the loading message with the actual balance
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { role: 'assistant', content: response };
        return newMessages;
      });
    } catch (error) {
      console.error('Error checking balance:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I encountered an error while checking your balance. Please try again or visit Injective Explorer directly." 
      }]);
    }
    setIsLoading(false);
  };

  const handleGetAllTokens = async (skipUserMessage = false, useTestnet = false) => {
    if (!agentService.current) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
      ]);
      return;
    }

    setIsLoading(true);
    try {
      // Add user message first if not skipped
      if (!skipUserMessage) {
        const networkName = useTestnet ? "testnet" : "mainnet";
        setMessages(prev => [...prev, { 
          role: 'user', 
          content: `Show me all tokens on Injective ${networkName}` 
        }]);
      }
      
      // Add a loading message
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Fetching all tokens on Injective ${useTestnet ? 'testnet' : 'mainnet'}...` 
      }]);
      
      // Reset token page when fetching new tokens
      const tokenList = await agentService.current.getAllTokenDenoms(useTestnet);
      
      // Store tokens in state
      setTokens(tokenList);
      
           setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { 
          role: 'assistant', 
          content: `Here are tokens on Injective ${useTestnet ? 'Testnet' : 'Mainnet'} (Page 1)` 
        };
        return newMessages;
      });
      
      // Show the tokens UI
      setShowTokens(true);
    } catch (error) {
      console.error('Error fetching token denoms:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I encountered an error while fetching the tokens. Please try again later." 
      }]);
      setShowTokens(false);
    }
    setIsLoading(false);
  };

  // Handle token pagination
  const handleTokenPagination = (direction: 'next' | 'prev') => {
    if (!agentService.current || tokens.length === 0) return;
    
    const pageSize = 5;
    const totalPages = Math.ceil(tokens.length / pageSize);
    
    // Get current page from last message
    const lastMessage = messages[messages.length - 1];
    const pageMatch = lastMessage?.content?.match?.(/Page (\d+)/);
    let page = pageMatch ? parseInt(pageMatch[1]) : 1;
    
    // Update page based on direction
    if (direction === 'next') {
      page = page < totalPages ? page + 1 : 1; // Loop back to first page
    } else {
      page = page > 1 ? page - 1 : totalPages; // Loop back to last page
    }
    
    // Update the page number with network info
    const networkType = lastMessage?.content?.includes?.('Testnet') ? 'Testnet' : 'Mainnet';
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: `Here are tokens on Injective ${networkType} (Page ${page}/${totalPages})` 
    }]);
  };

  const handleStakeINJ = async (skipUserMessage = false) => {
    if (!address) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Please connect your wallet first! Click the 'Connect Wallet' button above." }
      ]);
      return;
    }

    if (!agentService.current) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
      ]);
      return;
    }

    setIsLoading(true);
    try {
      // Add user message first if not skipped
      if (!skipUserMessage) {
        setMessages(prev => [...prev, { role: 'user', content: "I want to stake INJ" }]);
      }
      
      // Add a loading message
      setMessages(prev => [...prev, { role: 'assistant', content: "Fetching validators for staking..." }]);
      
      // Get validators
      const validatorList = await agentService.current.getValidators();
      setValidators(validatorList);
      
      // Replace the loading message with a simple message - validators will be shown in UI
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { 
          role: 'assistant', 
          content: "Here are the top validators for staking your INJ. Select one and specify how much INJ you want to stake:" 
        };
        return newMessages;
      });
      
      // Set flag to show validators
      setShowValidators(true);
    } catch (error) {
      console.error('Error fetching validators:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I encountered an error while fetching validators. Please try again or visit Injective Explorer directly." 
      }]);
    }
    setIsLoading(false);
  };

  const handleStakeToValidator = async (validatorAddress: string, amount: string = "1") => {
    if (!address) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Please connect your wallet first! Click the 'Connect Wallet' button above." }
      ]);
      return;
    }

    if (!agentService.current) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
      ]);
      return;
    }

    setIsLoading(true);
    try {
      // Validate amount
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        setMessages(prev => [...prev, 
          { role: 'assistant', content: "Please provide a valid amount to stake. For example: 'Stake 1 INJ'" }
        ]);
        setIsLoading(false);
        return;
      }

      // Add user message
      const validator = validators.find(v => v.address === validatorAddress);
      setMessages(prev => [...prev, { 
        role: 'user', 
        content: `Stake ${amount} INJ to ${validator?.moniker || validatorAddress}` 
      }]);
      
      // Add a loading message
      setMessages(prev => [...prev, { role: 'assistant', content: "Processing staking request..." }]);
      
      // Call the staking service
      const response = await agentService.current.stakeINJ(amount, address, validatorAddress);
      
      // Replace the loading message with the staking result
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { 
          role: 'assistant', 
          content: response 
        };
        return newMessages;
      });
      
      // Hide validators after staking
      setShowValidators(false);
    } catch (error) {
      console.error('Error staking INJ:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I encountered an error while processing your staking request. Please try again or visit Injective Explorer directly." 
      }]);
    }
    setIsLoading(false);
  };

  const handleGetINJPrice = async (skipUserMessage = false) => {
    if (!agentService.current) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
      ]);
      return;
    }

    setIsLoading(true);
    try {
      // Add user message first if not skipped
      if (!skipUserMessage) {
        setMessages(prev => [...prev, { role: 'user', content: "What's the current INJ price?" }]);
      }
      
      // Add a loading message
      setMessages(prev => [...prev, { role: 'assistant', content: "Fetching current INJ price..." }]);
      
      const response = await agentService.current.getINJPrice();
      
      // Replace the loading message with the price
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { role: 'assistant', content: response };
        return newMessages;
      });
    } catch (error) {
      console.error('Error fetching INJ price:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I encountered an error while fetching the INJ price. Please try again later." 
      }]);
    }
    setIsLoading(false);
  };

  const handleGetCosmosEcosystemPrices = async (skipUserMessage = false) => {
    if (!agentService.current) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
      ]);
      return;
    }

    setIsLoading(true);
    try {
      // Add user message first if not skipped
      if (!skipUserMessage) {
        setMessages(prev => [...prev, { role: 'user', content: "What are the current prices of Cosmos ecosystem tokens?" }]);
      }
      
      // Add a loading message
      setMessages(prev => [...prev, { role: 'assistant', content: "Fetching current prices of Cosmos ecosystem tokens..." }]);
      
      const response = await agentService.current.getCosmosEcosystemPrices();
      
      // Replace the loading message with the prices
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { role: 'assistant', content: response };
        return newMessages;
      });
    } catch (error) {
      console.error('Error fetching Cosmos ecosystem prices:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I encountered an error while fetching the prices of Cosmos ecosystem tokens. Please try again later." 
      }]);
    }
    setIsLoading(false);
  };

  const handleGetCosmosTokenPrice = async (tokenSymbol: string, skipUserMessage = false) => {
    if (!agentService.current) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
      ]);
      return;
    }

    setIsLoading(true);
    try {
      // Add user message first if not skipped
      if (!skipUserMessage) {
        setMessages(prev => [...prev, { role: 'user', content: `What's the current price of ${tokenSymbol}?` }]);
      }
      
      // Add a loading message
      setMessages(prev => [...prev, { role: 'assistant', content: `Fetching current price of ${tokenSymbol}...` }]);
      
      const response = await agentService.current.getCosmosTokenPrice(tokenSymbol);
      
      // Replace the loading message with the price
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { role: 'assistant', content: response };
        return newMessages;
      });
    } catch (error) {
      console.error(`Error fetching ${tokenSymbol} price:`, error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I encountered an error while fetching the price of ${tokenSymbol}. Please try again later.` 
      }]);
    }
    setIsLoading(false);
  };

 
  // Handle showing available vaults with card display
  const handleShowVaultsWithCards = async (skipUserMessage = false) => {
    if (!agentService.current) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
      ]);
      return;
    }

    setIsLoading(true);
    try {
      // Add user message first if not skipped
      if (!skipUserMessage) {
        setMessages(prev => [...prev, { role: 'user', content: "Show me available vaults" }]);
      }
      
      // Add a loading message
      setMessages(prev => [...prev, { role: 'assistant', content: "Fetching available Mito vaults..." }]);
      
      const vaults = await agentService.current.getMitoVaults();
      
      // Set the vaults for card display
      setVaultsList(vaults);
      setShowVaultCards(true);
      
      // Update the last message
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { 
          role: 'assistant', 
          content: "Here are the available Mito vaults. Click on a vault to deposit or use the Deposit button." 
        };
        return newMessages;
      });
    } catch (error) {
      console.error('Error fetching vaults:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I encountered an error while fetching the vaults. Please try again later." 
      }]);
    }
    
    setIsLoading(false);
  };

  // Handle showing highest APY vault
  const handleHighestAPYVault = async (skipUserMessage = false) => {
    if (!agentService.current) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
      ]);
      return;
    }

    setIsLoading(true);
    try {
      // Add user message first if not skipped
      if (!skipUserMessage) {
        setMessages(prev => [...prev, { role: 'user', content: "What's the highest APY vault?" }]);
      }
      
      // Add a loading message
      setMessages(prev => [...prev, { role: 'assistant', content: "Finding the highest APY vault..." }]);
      
      const highestVault = await agentService.current.getHighestAPYVault();
      const response = `The highest APY is currently offered by the ${highestVault.name} at ${highestVault.apy.toFixed(2)}%. This vault uses a ${highestVault.strategy} strategy with ${highestVault.riskLevel} risk level. Would you like more details about this vault?`;
      
      // Update the last message instead of adding a new one
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { role: 'assistant', content: response };
        return newMessages;
      });
    } catch (error) {
      console.error('Error fetching highest APY vault:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I encountered an error while finding the highest APY vault. Please try again later." 
      }]);
    }
    
    setIsLoading(false);
  };

  // Handle comparing staking vs vaults
  const handleCompareStakingVsVaults = async (skipUserMessage = false) => {
    if (!agentService.current) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
      ]);
      return;
    }

    setIsLoading(true);
    try {
      // Add user message first if not skipped
      if (!skipUserMessage) {
        setMessages(prev => [...prev, { role: 'user', content: "Compare staking and vaults" }]);
      }
      
      // Add a loading message
      setMessages(prev => [...prev, { role: 'assistant', content: "Comparing staking and vault options..." }]);
      
      const response = await agentService.current.compareStakingVsVaults();
      
      // Update the last message instead of adding a new one
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { role: 'assistant', content: response };
        return newMessages;
      });
    } catch (error) {
      console.error('Error comparing staking and vaults:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I encountered an error while comparing staking and vaults. Please try again later." 
      }]);
    }
    
    setIsLoading(false);
  };

  // Handle vault details request
  const handleVaultDetails = async (vaultId: string, skipUserMessage = false) => {
    if (!agentService.current) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
      ]);
      return;
    }

    setIsLoading(true);
    try {
      // Add user message first if not skipped
      if (!skipUserMessage) {
        setMessages(prev => [...prev, { role: 'user', content: `Tell me about the ${vaultId.replace('vault_', '').replace('_', '/')} vault` }]);
      }
      
      // Add a loading message
      setMessages(prev => [...prev, { role: 'assistant', content: "Fetching vault details..." }]);
      
      const response = await agentService.current.getVaultDetails(vaultId);
      
      // Update the last message instead of adding a new one
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { role: 'assistant', content: response };
        return newMessages;
      });
    } catch (error) {
      console.error('Error fetching vault details:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I encountered an error while fetching vault details. Please try again later." 
      }]);
    }
    
    setIsLoading(false);
  };

 

  const handleRealVaultDeposit = async (vaultId: string, amount: string, skipUserMessage = false) => {
    if (!address) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Please connect your wallet first! Click the 'Connect Wallet' button above." }
      ]);
      return;
    }

    if (!agentService.current) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
      ]);
      return;
    }

    setIsLoading(true);
    try {
      // Add user message first if not skipped
      if (!skipUserMessage) {
        setMessages(prev => [...prev, { role: 'user', content: `Deposit ${amount} INJ into ${vaultId.replace('vault_', '').replace('_', '/')} vault` }]);
      }
      
      // Add a loading message showing Keplr wallet connection process
      setMessages(prev => [...prev, { role: 'assistant', content: "Connecting to Keplr wallet..." }]);
      
      // Check if Keplr is available
      if (typeof window === 'undefined' || !window.keplr) {
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { 
            role: 'assistant', 
            content: "Keplr wallet extension is not installed. Please install Keplr and try again." 
          };
          return newMessages;
        });
        setIsLoading(false);
        return;
      }
      
      try {
        // Initialize Injective Chain ID
        const chainId = 'injective-1'; // Mainnet chain ID
        
        // Request Keplr to connect to Injective chain
        await window.keplr.enable(chainId);
        
        // Update message to show wallet connection in progress
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { 
            role: 'assistant', 
            content: "Keplr wallet connected. Preparing transaction..." 
          };
          return newMessages;
        });
        
        // Execute the deposit through the agent service
        const response = await agentService.current.depositToVault(vaultId, amount, address);
        
        // Update the message with the final response
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'assistant', content: response };
          return newMessages;
        });
      } catch (error) {
        console.error('Keplr connection error:', error);
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { 
            role: 'assistant', 
            content: `Error connecting to Keplr wallet: ${error.message || 'Unknown error'}. Please make sure Keplr is installed and unlocked.` 
          };
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error processing vault deposit:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I encountered an error while processing the vault deposit. Please try again later." 
      }]);
    }
    
    setIsLoading(false);
  };

  const handleFetchMarkets = async (marketType: 'spot' | 'derivative' = 'spot', skipUserMessage = false) => {
    if (!agentService.current) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
      ]);
      return;
    }

    console.log(`Starting to fetch ${marketType} markets...`);
    setIsLoading(true);
    try {
      // Add user message first if not skipped
      if (!skipUserMessage) {
        setMessages(prev => [...prev, { 
          role: 'user', 
          content: `Show me ${marketType} markets` 
        }]);
      }
      
      // Add a loading message
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Fetching ${marketType} markets...` 
      }]);
      
      // IMPORTANT: Set the selected market type FIRST
      setSelectedMarketType(marketType);
      console.log(`Set selected market type to: ${marketType}`);
      
      // Fetch markets
      console.log(`Calling fetchAndLogMarkets with type: ${marketType}`);
      const markets = await agentService.current.fetchAndLogMarkets(marketType);
      console.log(`Received markets response:`, markets);
      
      // Store markets in state based on type
      if (marketType === 'spot') {
        setSpotMarkets(markets.markets);
        console.log(`Stored ${markets.markets?.length || 0} spot markets`);
      } else {
        setDerivativeMarkets(markets.markets);
        console.log(`Stored ${markets.markets?.length || 0} derivative markets`);
      }
      
      // Set the market list AFTER setting the selected type
      setMarketList(markets.markets);
      console.log(`Set market list with ${markets.markets?.length || 0} ${marketType} markets`);
      
      // Show markets
      setShowMarkets(true);
      
      // Update the last message to show markets
      setMessages(prev => {
        const newMessages = [...prev];
        const networkName = agentService.current?.getCurrentNetwork() === Network.Mainnet ? 'Mainnet' : 'Testnet';
        newMessages[newMessages.length - 1] = { 
          role: 'assistant', 
          content: `Here are the available ${marketType} markets on ${networkName}` 
        };
        return newMessages;
      });
      
      // Reset current page
      setCurrentMarketPage(1);
    } catch (error) {
      console.error(`Error fetching ${marketType} markets:`, error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I encountered an error while fetching ${marketType} markets. Please try again later.` 
      }]);
    }
    setIsLoading(false);
  };

  const handlePlaceSpotOrder = async (marketId: string, quantity: string, price?: string, side: 'buy' | 'sell' = 'buy', isMarket: boolean = true) => {
    if (!address) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Please connect your wallet first! Click the 'Connect Wallet' button above." }
      ]);
      return;
    }

    if (!agentService.current) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
      ]);
      return;
    }

    setIsLoading(true);
    try {
      // Find market details
      const market = spotMarkets.find(m => m.marketId === marketId);
      if (!market) {
        throw new Error("Market not found");
      }
      
      // Add user message
      const orderType = isMarket ? "market" : "limit";
      const priceInfo = isMarket ? "" : ` at ${price}`;
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Processing your request to ${side} ${orderType} order for ${quantity} ${market.baseToken}${priceInfo}...` 
      }]);
      
      // Add a loading message
      setMessages(prev => [...prev, { role: 'assistant', content: "Processing your order..." }]);
      
      // Call the spot order service
      const response = await agentService.current.placeSpotOrder(
        marketId,
        side,
        quantity,
        price,
        isMarket
      );
      
      // Replace the loading message with the order result
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { 
          role: 'assistant', 
          content: `Your ${side} ${orderType} order for ${quantity} ${market.baseToken}${priceInfo} has been placed successfully! ${response}` 
        };
        return newMessages;
      });
    } catch (error) {
      console.error('Error placing spot order:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I encountered an error while placing your order: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.` 
      }]);
    }
    setIsLoading(false);
  };

  const handlePlaceDerivativeOrder = async (marketId: string, quantity: string, price?: string, side: 'buy' | 'sell' = 'buy', isMarket: boolean = true) => {
    if (!address) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Please connect your wallet first! Click the 'Connect Wallet' button above." }
      ]);
      return;
    }

    if (!agentService.current) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
      ]);
      return;
    }

    setIsLoading(true);
    try {
      // Find market details
      const market = derivativeMarkets.find(m => m.marketId === marketId);
      if (!market) {
        throw new Error("Market not found");
      }
      
      // Add user message
      const orderType = isMarket ? "market" : "limit";
      const priceInfo = isMarket ? "" : ` at ${price}`;
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Processing your request to ${side} ${orderType} order for ${quantity} ${market.ticker}${priceInfo}...` 
      }]);
      
      // Add a loading message
      setMessages(prev => [...prev, { role: 'assistant', content: "Processing your order..." }]);
      
      // Call the derivative order service
      const response = await agentService.current.placeDerivativeOrder(
        marketId,
        side,
        quantity,
        price,
        isMarket
      );
      
      // Replace the loading message with the order result
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { 
          role: 'assistant', 
          content: `Your ${side} ${orderType} order for ${quantity} ${market.ticker}${priceInfo} has been placed successfully! ${response}` 
        };
        return newMessages;
      });
    } catch (error) {
      console.error('Error placing derivative order:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I encountered an error while placing your order: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.` 
      }]);
    }
    setIsLoading(false);
  };

  const handleMarketSelection = (market: any, type: 'spot' | 'derivative') => {
    setSelectedMarketType(type);
    
    // Add a message about the selected market
    let marketInfo = "";
    if (type === 'spot') {
      marketInfo = `You've selected the ${market.baseToken}/${market.quoteToken} spot market. In this market, you spend ${market.quoteToken} to buy ${market.baseToken}.`;
    } else {
      marketInfo = `You've selected the ${market.ticker} perpetual market. This is a derivative contract where you can trade with leverage.`;
    }
    
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: marketInfo + " You can now place an order using the form below." 
    }]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (messageText: string = input) => {
    if (!messageText.trim()) return

    setIsLoading(true)
    setMessages(prev => [...prev, { role: 'user', content: messageText }])
    setInput("")

    // Hide any UI elements that might be showing
    setShowValidators(false);
    setShowTokens(false);
    setShowVaultCards(false);

    // Reset card displays when submitting new message
    setShowVaultCards(false);

    // Check for passive income or earning queries
    const lowerMessage = messageText.toLowerCase();
    if ((lowerMessage.includes('passive') || 
         lowerMessage.includes('earn') || 
         lowerMessage.includes('income') || 
         lowerMessage.includes('yield') ||
         lowerMessage.includes('invest') ||
         (lowerMessage.includes('make') && lowerMessage.includes('money'))) && 
        (lowerMessage.includes('inj') || 
         !lowerMessage.includes('validator'))) {
      await handleCompareStakingVsVaults(true);
      setIsLoading(false);
      return;
    }

    // Check for buy commands with dollar amount
    const buyDollarMatch = messageText.toLowerCase().match(/buy\s+\$?(\d+)(?:\.\d+)?\s+(?:worth\s+)?(?:of\s+)?inj/i);
    if (buyDollarMatch) {
      const amount = buyDollarMatch[1];
      await handleBuyINJ(amount, true, false);
      setIsLoading(false);
      return;
    }

    // Check for buy commands with token quantity
    const buyTokenMatch = messageText.toLowerCase().match(/buy\s+(\d+)(?:\.\d+)?\s+inj(?:\s+tokens?)?/i);
    if (buyTokenMatch) {
      const amount = buyTokenMatch[1];
      await handleBuyINJ(amount, true, true);
      setIsLoading(false);
      return;
    }

    // Check for balance checking commands
    if (messageText.toLowerCase().includes('balance') || 
        messageText.toLowerCase().includes('check inj') ||
        messageText.toLowerCase().includes('my inj')) {
      await handleCheckBalance(true);
      setIsLoading(false);
      return;
    }

    // Check for staking commands with amount and validator
    const stakeMatch = messageText.toLowerCase().match(/stake\s+(\d+(?:\.\d+)?)\s+inj(?:\s+(?:to|on|with)\s+(.+))?/i);
    if (stakeMatch) {
      const amount = stakeMatch[1];
      const validatorName = stakeMatch[2];
      
      // Always fetch validators to ensure we have the latest list
      await handleStakeINJ(true);
      
      if (validatorName) {
        // Find validator by name
        const validator = validators.find(v => 
          v.moniker.toLowerCase().includes(validatorName.toLowerCase()));
        
        if (validator) {
          await handleStakeToValidator(validator.address, amount);
        } else {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `Could not find validator "${validatorName}". Please select from the list below:` 
          }]);
        }
      }
      
      setIsLoading(false);
      return;
    }
    
    // Check for general staking commands
    if (messageText.toLowerCase().includes('stake') && 
        messageText.toLowerCase().includes('inj')) {
      // Always call handleStakeINJ to refresh the validators
      await handleStakeINJ(true);
      setIsLoading(false);
      return;
    }

    // Check for token commands
    if (messageText.toLowerCase().includes('token') || 
        messageText.toLowerCase().includes('all tokens') || 
        messageText.toLowerCase().includes('denoms')) {
      // Check if specifically asking for testnet tokens
      const useTestnet = messageText.toLowerCase().includes('testnet');
      await handleGetAllTokens(true, useTestnet);
      setIsLoading(false);
      return;
    }
    
    // Check for pagination commands
    if (showTokens && tokens.length > 0) {
      if (messageText.toLowerCase().includes('next page')) {
        handleTokenPagination('next');
        setIsLoading(false);
        return;
      }
      if (messageText.toLowerCase().includes('previous page') || messageText.toLowerCase().includes('prev page')) {
        handleTokenPagination('prev');
        setIsLoading(false);
        return;
      }
    }

    // Check for price commands
    if (messageText.toLowerCase().includes('price')) {
      if (messageText.toLowerCase().includes('inj')) {
        await handleGetINJPrice(true);
      } else if (messageText.toLowerCase().includes('cosmos') || messageText.toLowerCase().includes('ecosystem')) {
        await handleGetCosmosEcosystemPrices(true);
      } else {
        const tokenMatch = messageText.match(/price\s+(?:of|for)?\s+(\w+)/i);
        if (tokenMatch && tokenMatch[1]) {
          const tokenSymbol = tokenMatch[1].toUpperCase();
          await handleGetCosmosTokenPrice(tokenSymbol, true);
        } else {
          await handleGetINJPrice(true);
        }
      }
      setIsLoading(false);
      return;
    }

    // Check for vault commands
    if (messageText.toLowerCase().includes('vault') || messageText.toLowerCase().includes('mito')) {
      if (messageText.toLowerCase().includes('show') || 
          messageText.toLowerCase().includes('list') || 
          messageText.toLowerCase().includes('available')) {
        await handleShowVaultsWithCards(true);
        setIsLoading(false);
        return;
      }
      if (messageText.toLowerCase().includes('highest') || 
          messageText.toLowerCase().includes('best') || 
          messageText.toLowerCase().includes('top')) {
        await handleHighestAPYVault(true);
        setIsLoading(false);
        return;
      }
      if (messageText.toLowerCase().includes('compare') || 
          messageText.toLowerCase().includes('staking')) {
        await handleCompareStakingVsVaults(true);
        setIsLoading(false);
        return;
      }
      if (messageText.toLowerCase().includes('details')) {
        const vaultIdMatch = messageText.match(/vault\s+([a-zA-Z0-9_]+)/i);
        if (vaultIdMatch && vaultIdMatch[1]) {
          const vaultId = vaultIdMatch[1];
          await handleVaultDetails(vaultId, true);
        } else {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: "Please specify the vault ID for which you want to see details." 
          }]);
        }
        setIsLoading(false);
        return;
      }
      if (messageText.toLowerCase().includes('deposit')) {
        // For deposit requests, show the vault cards UI
        await handleShowVaultsWithCards(true);
        setIsLoading(false);
        return;
      }
    }

    // Check for market commands
    if (messageText.toLowerCase().includes('market')) {
      // Prevent duplicate market display when using trade commands
      if (messageText.toLowerCase().match(/trade\s+\d+/) || messageText.toLowerCase().match(/sell\s+\d+/)) {
        // Skip market handling for trade/sell commands
      } else {
        await handleMarketCommand(messageText);
        setIsLoading(false);
        return;
      }
    }
    // Check for test trading flow command
    if (messageText.toLowerCase().includes('test trading') || 
        messageText.toLowerCase().includes('test invest')) {
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Let's test the trading flow. Here are some commands you can try:

1. **View Markets**: Type "show markets" to see available markets
2. **Trade**: Type "trade 0.01 INJ" to trade INJ
3. **Sell**: Type "sell 0.01 INJ" to sell INJ

When you use these commands, the Keplr wallet should open to sign the transaction.` 
      }]);
      
      setIsLoading(false);
      return;
    }

    // Check for agent spawning commands
    const spawnMatch = messageText.toLowerCase().match(/spawn (\w+)(?:\s+agent)?/);
    if (spawnMatch) {
      const agentType = spawnMatch[1];
      try {
        const config = {
          purpose: messageText, // Store the original command for context
          createdFrom: 'dashboard'
        };
        
        const agentId = await agentService.current.spawnAgent(agentType, config);
        const agent = await agentService.current.getAgent(agentId);
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Created new agent: ${agent.name}\nType: ${agentType}\nID: ${agentId}\n\nCapabilities:\n${agent.capabilities && agent.capabilities.length > 0 ? agent.capabilities.map(c => `- ${c}`).join('\n') : 'Loading capabilities...'}\n\nView and manage your agent in the Spawned Agents page.` 
        }]);
        
        // Navigate to spawned agents page after a delay
        setTimeout(() => {
          navigate('/spawned-agents');
        }, 3000);
        
        setIsLoading(false);
        return;
      } catch (error) {
        console.error('Error spawning agent:', error);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Error spawning agent: ${error instanceof Error ? error.message : String(error)}` 
        }]);
        setIsLoading(false);
        return;
      }
    }

    // Check for trading commands
    const tradeRegex = /trade\s+(\d+(?:\.\d+)?)\s+([A-Za-z0-9/]+)/i;
    const sellRegex = /sell\s+(\d+(?:\.\d+)?)\s+([A-Za-z0-9/]+)/i;
    const tradeMatch = messageText.match(tradeRegex);
    const sellMatch = messageText.match(sellRegex);

    if (tradeMatch || sellMatch) {
      const match = tradeMatch || sellMatch;
      if (match) {
        const side = tradeMatch ? 'buy' : 'sell';
        const quantity = match[1];
        let symbol = match[2].toUpperCase();
        
        // Handle trading pairs like ATOM/USDT
        let baseSymbol = symbol;
        if (symbol.includes('/')) {
          baseSymbol = symbol.split('/')[0];
        }

        console.log(`Processing ${side} order for ${quantity} ${symbol}`);

        // Find the market that matches the symbol
        if (spotMarkets.length === 0 && derivativeMarkets.length === 0) {
          // Fetch markets first if we don't have them yet
          console.log("No markets loaded, fetching markets first");
          await handleFetchMarkets();
        }

        console.log(`Looking for market matching ${symbol} in ${spotMarkets.length} spot markets and ${derivativeMarkets.length} derivative markets`);

        // Debug: Log all available markets for troubleshooting
        console.log("Available spot markets:");
        spotMarkets.forEach(m => {
          console.log(`- Market: ${m.ticker}, ID: ${m.marketId}, Base: ${m.baseSymbol}, Quote: ${m.quoteSymbol}`);
        });

        // Look for the market in both spot and derivative markets
        let foundMarket;
        let marketType: 'spot' | 'derivative' = 'spot';
        
        // First check spot markets
        foundMarket = spotMarkets.find(m => {
          // Safely check if ticker exists before accessing
          if (!m.ticker) return false;
          
          const marketTicker = m.ticker.toUpperCase();
          const searchSymbol = symbol.toUpperCase();
          console.log(`Checking spot market: ${marketTicker} against symbol: ${searchSymbol}`);
          
          // For trading pairs like INJ/USDT
          if (searchSymbol.includes('/')) {
            // Direct comparison with ticker (case insensitive)
            const tickerMatch = marketTicker === searchSymbol;
            console.log(`  - Ticker match? ${tickerMatch} (${marketTicker} vs ${searchSymbol})`);
            return tickerMatch;
          }
          
          // For single token symbols like INJ
          const baseMatch = m.baseSymbol === searchSymbol;
          console.log(`  - Base token match? ${baseMatch} (${m.baseSymbol} vs ${searchSymbol})`);
          
          return baseMatch;
        });

        // If not found in spot markets, check derivative markets
        if (!foundMarket) {
          console.log(`Symbol ${symbol} not found in spot markets, checking derivatives`);
          foundMarket = derivativeMarkets.find(m => {
            // Safely check if ticker exists before accessing
            if (!m.ticker) return false;
            
            const marketTicker = m.ticker.toUpperCase();
            const searchSymbol = symbol.toUpperCase();
            console.log(`Checking derivative market: ${marketTicker} against symbol: ${searchSymbol}`);
            
            // For trading pairs like ATOM/USDT
            if (searchSymbol.includes('/')) {
              const tickerMatch = marketTicker === searchSymbol;
              console.log(`  - Ticker match? ${tickerMatch} (${marketTicker} vs ${searchSymbol})`);
              return tickerMatch;
            }
            
            // For single token symbols
            const baseMatch = m.baseSymbol === searchSymbol;
            console.log(`  - Base token match? ${baseMatch} (${m.baseSymbol} vs ${searchSymbol})`);
            
            return baseMatch;
          });
          if (foundMarket) marketType = 'derivative';
        }
        
        if (foundMarket) {
          console.log(`Found matching market: ${foundMarket.ticker}, ID: ${foundMarket.marketId}, Type: ${marketType}`);
          
          // Add user message about the trade
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `Processing your request to ${tradeMatch ? 'trade' : 'sell'} ${quantity} ${symbol}...` 
          }]);
          
          // Add a message showing which market was selected
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `Selected market: ${foundMarket.ticker} (${marketType})\nMarket ID: ${foundMarket.marketId}` 
          }]);

          // Found a matching market, place the order
          try {
            if (marketType === 'spot') {
              const result = await handlePlaceSpotOrder(
                foundMarket.marketId,
                quantity,
                undefined, // No price for market orders
                side as 'buy' | 'sell',
                true // isMarket
              );
              
              // Add the result message
              setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: result 
              }]);
            } else {
              const result = await handlePlaceDerivativeOrder(
                foundMarket.marketId,
                quantity,
                undefined, // No price for market orders
                side as 'buy' | 'sell',
                true // isMarket
              );
              
              // Add the result message
              setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: result 
              }]);
            }
          } catch (error) {
            console.error('Error placing order:', error);
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: `Error placing order: ${error instanceof Error ? error.message : String(error)}. Please try again.` 
            }]);
          }
        } else {
          console.log(`No matching market found for ${symbol}`);
          
          // Provide a helpful error message
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `I couldn't find a market for ${symbol}. Please fetch available markets first using the "Fetch Markets" button or by asking "Show me available markets".` 
          }]);
          
          // Show the available markets to help the user
          await handleFetchMarkets('spot', true);
          setIsLoading(false);
          return;
        }
      }
    }

    // Check for simple trade command without proper format
    if (messageText.toLowerCase() === 'trade' || messageText.toLowerCase().startsWith('trade ') && !messageText.match(/trade\s+\d/)) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `To trade on Injective, use this format: **trade [amount] [token]**

Examples:
- **trade 0.1 INJ** - Buy 0.1 INJ
- **trade 0.5 ATOM** - Buy 0.5 ATOM
- **sell 0.2 ETH** - Sell 0.2 ETH

You can also specify the trading pair if needed:
- **trade 10 ATOM/USDT** - Buy 10 ATOM with USDT`
      }]);
      setIsLoading(false);
      return;
    }

    // Check for simple sell command without proper format
    if (messageText.toLowerCase() === 'sell' || messageText.toLowerCase().startsWith('sell ') && !messageText.match(/sell\s+\d/)) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `To sell on Injective, use this format: **sell [amount] [token]**

Examples:
- **sell 0.1 INJ** - Sell 0.1 INJ
- **sell 0.5 ATOM** - Sell 0.5 ATOM

You can also specify the trading pair if needed:
- **sell 10 ATOM/USDT** - Sell 10 ATOM for USDT`
      }]);
      setIsLoading(false);
      return;
    }

    // If no special commands were detected, use the AI
    try {
      if (!agentService.current) {
        setMessages(prev => [...prev, 
          { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
        ]);
        setIsLoading(false);
        return;
      }
      
      const response = await agentService.current.sendMessage(messageText);
      
      // Check if this is a trading command that should be handled by the Dashboard
      if (response === "TRADING_COMMAND_BYPASS") {
        console.log("Received trading bypass marker, not displaying AI response");
        // The trading command has already been processed above, so we don't need to do anything here
        setIsLoading(false);
        return;
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: "Error. Try again." }])
      setIsLoading(false);
    }
  }

  // Handle market-related commands
  const handleMarketCommand = async (message: string) => {
    const lowerMessage = message.toLowerCase();
    console.log("Market command received:", lowerMessage);
    
    // First check for derivative markets specifically
    if (lowerMessage.includes('derivat')) {
      console.log("Derivative markets requested");
      // Force derivative market type
      setSelectedMarketType('derivative');
      await handleFetchMarkets('derivative', true);
      return true;
    }
    
    // Then check for spot markets specifically
    if (lowerMessage.includes('spot')) {
      console.log("Spot markets requested");
      // Force spot market type
      setSelectedMarketType('spot');
      await handleFetchMarkets('spot', true);
      return true;
    }
    
    // Generic market request - default to spot
    if (lowerMessage.includes('market')) {
      console.log("Generic market request - defaulting to spot");
      setSelectedMarketType('spot');
      await handleFetchMarkets('spot', true);
      return true;
    }
    
    return false;
  };

  // Function to render token cards in the chat
  const renderTokenCards = () => {
    if (!showTokens || tokens.length === 0) return null;
    
    // Get current page from the last message
    const lastMessage = messages[messages.length - 1];
    const pageMatch = lastMessage?.content?.match?.(/Page (\d+)/);
    const currentPage = pageMatch ? parseInt(pageMatch[1]) : 1;
    
    const pageSize = 5;
    const totalPages = Math.ceil(tokens.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, tokens.length);
    const currentPageTokens = tokens.slice(startIndex, endIndex);
    
    // Get network type
    const isTestnet = lastMessage?.content?.includes?.('Testnet') || false;
    
    return (
      <div className="token-cards mt-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {currentPageTokens.map((token) => (
            <div 
              key={token.denom} 
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center text-center"
            >
              {token.logoUrl && (
                <div className="w-12 h-12 mb-2 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                  <img 
                    src={token.logoUrl} 
                    alt={token.symbol} 
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
              )}
              <div className="font-medium text-black">{token.symbol}</div>
              <div className="text-xs text-gray-500">{token.name}</div>
              <div className="text-xs text-gray-400 flex items-center mt-1 w-full justify-center">
                <div className="truncate max-w-[80%]" title={token.denom}>
                  {token.denom.length > 15 ? `${token.denom.substring(0, 15)}...` : token.denom}
                </div>
                <button 
                  onClick={() => copyToClipboard(token.denom)}
                  className="text-gray-500 hover:text-black ml-1 flex-shrink-0"
                >
                  {copiedDenom === token.denom ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {token.network}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Pagination controls */}
        {tokens.length > pageSize && (
          <div className="flex justify-between items-center mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleTokenPagination('prev')}
            >
              Previous
            </Button>
            
            <span className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </span>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleTokenPagination('next')}
            >
              Next
            </Button>
          </div>
        )}
        
        {/* Network toggle */}
        <div className="flex justify-center mt-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleGetAllTokens(false, !isTestnet)}
            className="text-xs"
          >
            Switch to {isTestnet ? 'Mainnet' : 'Testnet'} Tokens
          </Button>
        </div>
      </div>
    );
  };

  // Function to render validator cards
  const renderValidatorCards = () => {
    if (!showValidators || validators.length === 0) return null;
    
    return (
      <div className="mt-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {validators.slice(0, 6).map((validator) => (
            <div 
              key={validator.address} 
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center cursor-pointer hover:bg-gray-50"
              onClick={() => {
                // Prompt for amount when validator is clicked
                const amount = prompt(`How much INJ do you want to stake with ${validator.moniker}?`, "1");
                if (amount) {
                  handleStakeToValidator(validator.address, amount);
                }
              }}
            >
              <div className="w-10 h-10 mr-3">
                <img 
                  src={validator.imageUrl || 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png'} 
                  alt={validator.moniker} 
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <div className="flex-1">
                <div className="font-medium">{validator.moniker}</div>
                <div className="text-xs text-gray-500">Commission: {validator.commission}</div>
                <div className="text-xs text-gray-500">Tokens: {validator.tokens}</div>
                <div className="text-xs text-gray-400 flex items-center mt-1">
                  <div className="truncate mr-2" title={validator.address}>
                    {validator.address.substring(0, 10)}...
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(validator.address);
                    }}
                    className="text-gray-500 hover:text-black"
                  >
                    {copiedDenom === validator.address ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Function to render vault cards
  const renderVaultCards = () => {
    if (!showVaultCards || vaultsList.length === 0) return null;
    
    return (
      <div className="mt-4 mb-4 overflow-x-auto">
        <div className="flex flex-nowrap gap-3 pb-2" style={{ minWidth: "100%" }}>
          {vaultsList.map((vault) => (
            <div 
              key={vault.id} 
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 relative overflow-hidden cursor-pointer hover:bg-gray-50 flex-shrink-0"
              style={{ width: "280px" }}
              onClick={() => {
                // Prompt for amount when vault is clicked
                const amount = prompt(`How much INJ do you want to deposit into ${vault.name}?`, "20");
                if (amount) {
                  handleRealVaultDeposit(vault.id, amount);
                  setShowVaultCards(false);
                }
              }}
            >
              {/* APY Badge */}
              <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 rounded-bl-lg font-bold">
                {vault.apy.toFixed(2)}% APY
              </div>
              
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 mr-3">
                  <img 
                    src={vault.imageUrl || 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png'} 
                    alt={vault.name} 
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-lg">{vault.name}</div>
                  <div className="text-xs text-gray-500">{vault.pairSymbol || vault.symbol}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-xs text-gray-500">TVL</div>
                  <div className="font-medium">${(vault.tvl / 1000000).toFixed(2)}M</div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-xs text-gray-500">Risk</div>
                  <div className="font-medium">{vault.riskLevel}</div>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 mb-2">
                <span className="font-medium">Strategy:</span> {vault.strategy}
              </div>
              
              <div className="text-xs text-gray-400 flex items-center">
                <div className="truncate mr-2" title={vault.id}>
                  ID: {vault.id}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(vault.id);
                  }}
                  className="text-gray-500 hover:text-black"
                >
                  {copiedDenom === vault.id ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              
              <div className="mt-3 text-center">
                <Button 
                  size="sm" 
                  className="bg-black text-white w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    const amount = prompt(`How much INJ do you want to deposit into ${vault.name}?`, "20");
                    if (amount) {
                      handleRealVaultDeposit(vault.id, amount);
                      setShowVaultCards(false);
                    }
                  }}
                >
                  Deposit
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Function to render market cards
  const renderMarketCards = () => {
    if (!marketList || marketList.length === 0) {
      console.log("No markets to display");
      return null;
    }

    console.log(`Rendering markets: ${selectedMarketType}, count: ${marketList.length}`);
    
    const marketsPerPage = 4;
    const startIndex = (currentMarketPage - 1) * marketsPerPage;
    const endIndex = Math.min(startIndex + marketsPerPage, marketList.length);
    const currentPageMarkets = marketList.slice(startIndex, endIndex);
    const marketType = selectedMarketType === 'spot' ? 'Spot' : 'Derivative';
    const networkName = agentService.current?.getCurrentNetwork() === Network.Mainnet ? 'Mainnet' : 'Testnet';

    return (
      <>
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{marketType} Markets on {networkName}</h3>
          <p className="text-sm text-gray-500">Page {currentMarketPage} of {Math.ceil(marketList.length / marketsPerPage)}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          {currentPageMarkets.map((market: any, index: number) => {
            console.log(`Rendering market ${index}:`, market);
            return (
              <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <img 
                      src={market.baseImage} 
                      alt={market.baseSymbol || 'Unknown'} 
                      className="w-8 h-8 mr-2 rounded-full"
                      onError={(e: any) => {
                        e.target.src = 'https://raw.githubusercontent.com/cosmos/chain-registry/master/injective/images/inj.png';
                      }}
                    />
                    <div>
                      <div className="font-medium">{market.ticker || 'Unknown Market'}</div>
                      <div className="text-xs text-gray-500">{market.marketType || marketType}</div>
                    </div>
                  </div>
                  <div className={`${market.priceChangeColor || (parseFloat(market.priceChange || '0') >= 0 ? 'text-green-600' : 'text-red-600')} font-medium`}>
                    {market.displayPriceChange || ((parseFloat(market.priceChange || '0') >= 0 ? '+' : '') + parseFloat(market.priceChange || '0').toFixed(2) + '%')}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <p className="text-gray-500">Price</p>
                    <p className="font-medium">
                      {parseFloat(market.price || '0').toFixed(6)} {market.quoteSymbol || 'USDT'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Volume (24h)</p>
                    <p className="font-medium">
                      {parseFloat(market.volume || '0').toFixed(2)} {market.quoteSymbol || 'USDT'}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 truncate" title={market.marketId}>Market ID: {market.marketId || 'Unknown'}</div>
                <div className="mt-2 text-xs">
                  <span className="text-blue-600 cursor-pointer">Trade: {market.ticker || 'Unknown Market'}</span>
                </div>
              </div>
            );
          })}
        </div>
        {marketList.length > marketsPerPage && (
          <div className="flex justify-center space-x-2 mt-4">
            <button 
              onClick={() => setCurrentMarketPage(prev => prev > 1 ? prev - 1 : Math.ceil(marketList.length / marketsPerPage))}
              className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
            >
              Previous
            </button>
            
            <span className="px-3 py-1 text-sm">
              Page {currentMarketPage} of {Math.ceil(marketList.length / marketsPerPage)}
            </span>
            
            <button 
              onClick={() => setCurrentMarketPage(prev => prev < Math.ceil(marketList.length / marketsPerPage) ? prev + 1 : 1)}
              className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
            >
              Next
            </button>
          </div>
        )}
      </>
    );
  };

  const handleNextPage = () => {
    if (currentMarketPage < Math.ceil(marketList.length / marketsPerPage)) {
      setCurrentMarketPage(currentMarketPage + 1);
    } else {
      // Loop back to first page
      setCurrentMarketPage(1);
    }
  };

  const handlePreviousPage = () => {
    if (currentMarketPage > 1) {
      setCurrentMarketPage(currentMarketPage - 1);
    } else {
      // Loop back to last page
      setCurrentMarketPage(Math.ceil(marketList.length / marketsPerPage));
    }
  };

  const handleGoToPage = (pageNumber: number) => {
    const totalPages = Math.ceil(marketList.length / marketsPerPage);
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentMarketPage(pageNumber);
    } else {
      setMessages(prev => [...prev, { role: 'assistant', content: `Invalid page number. Please enter a page number between 1 and ${totalPages}.` }]);
    }
  };

  const handleSpotOrderCommand = (command: string) => {
    // Extract order details from command
    // Format: "place spot order buy/sell [quantity] [market name]"
    const orderRegex = /(?:place\s+spot\s+order|spot\s+)(buy|sell)\s+(\d+(?:\.\d+)?)\s+(.+)/i;
    const match = command.match(orderRegex);
    
    if (!match) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Invalid spot order format. Please use: "place spot order buy/sell [quantity] [market name]" or "spot buy/sell [quantity] [market name]"' 
      }]);
      return;
    }
    
    const orderSide = match[1].toLowerCase();
    const quantity = parseFloat(match[2]);
    const marketName = match[3].trim();
    
    // Find the market in our list
    const market = spotMarkets.find(m => 
      m.name.toLowerCase() === marketName.toLowerCase() || 
      `${m.baseToken}/${m.quoteToken}`.toLowerCase() === marketName.toLowerCase()
    );
    
    if (!market) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Could not find spot market "${marketName}". Please check the market name and try again.` 
      }]);
      return;
    }
    
    // Confirm the order
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: `Preparing to place a ${orderSide} order for ${quantity} ${market.baseToken} on ${market.name} spot market.` 
    }]);
    
    // Place the order
    placeSpotOrder(market.marketId, orderSide, quantity, market);
  };
  
  const handleDerivativeOrderCommand = (command: string) => {
    // Extract order details from command
    // Format: "place derivative order buy/sell [quantity] [market name]"
    const orderRegex = /(?:place\s+derivative\s+order|derivative\s+)(buy|sell)\s+(\d+(?:\.\d+)?)\s+(.+)/i;
    const match = command.match(orderRegex);
    
    if (!match) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Invalid derivative order format. Please use: "place derivative order buy/sell [quantity] [market name]" or "derivative buy/sell [quantity] [market name]"' 
      }]);
      return;
    }
    
    const orderSide = match[1].toLowerCase();
    const quantity = parseFloat(match[2]);
    const marketName = match[3].trim();
    
    // Find the market in our list
    const market = derivativeMarkets.find(m => 
      m.name.toLowerCase() === marketName.toLowerCase() || 
      `${m.baseToken}/${m.quoteToken}`.toLowerCase() === marketName.toLowerCase()
    );
    
    if (!market) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Could not find derivative market "${marketName}". Please check the market name and try again.` 
      }]);
      return;
    }
    
    // Confirm the order
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: `Preparing to place a ${orderSide} order for ${quantity} contracts on ${market.name} derivative market.` 
    }]);
    
    // Place the order
    placeDerivativeOrder(market.marketId, orderSide, quantity, market);
  };
  
  const placeSpotOrder = async (marketId: string, orderSide: string, quantity: number, market: any) => {
    if (!agentService.current) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
      ]);
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Get current price as a reference
      const price = parseFloat(market.price);
      
      // Adjust price slightly to ensure the order gets filled (market orders)
      const adjustedPrice = orderSide === 'buy' ? price * 1.01 : price * 0.99;
      
      // Place the order
      const response = await agentService.current.placeSpotOrder({
        marketId,
        orderType: 'MARKET',
        orderSide: orderSide.toUpperCase(),
        price: adjustedPrice.toString(),
        quantity: quantity.toString(),
      });
      
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { 
          role: 'assistant', 
          content: `Your ${orderSide} order for ${quantity} ${market.baseToken} on ${market.name} spot market has been placed successfully! ${response}` 
        };
        return newMessages;
      });
    } catch (error) {
      console.error('Error placing spot order:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I encountered an error while placing your order: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const placeDerivativeOrder = async (marketId: string, orderSide: string, quantity: number, market: any) => {
    if (!agentService.current) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
      ]);
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Get current price as a reference
      const price = parseFloat(market.price);
      
      // Adjust price slightly to ensure the order gets filled (market orders)
      const adjustedPrice = orderSide === 'buy' ? price * 1.01 : price * 0.99;
      
      // Place the order
      const response = await agentService.current.placeDerivativeOrder({
        marketId,
        orderType: 'MARKET',
        orderSide: orderSide.toUpperCase(),
        price: adjustedPrice.toString(),
        quantity: quantity.toString(),
      });
      
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { 
          role: 'assistant', 
          content: `Your ${orderSide} order for ${quantity} contracts on ${market.name} derivative market has been placed successfully! ${response}` 
        };
        return newMessages;
      });
    } catch (error) {
      console.error('Error placing derivative order:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I encountered an error while placing your order: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowMarkets = async (marketType: 'spot' | 'derivative' = 'spot') => {
    try {
      setIsLoading(true);
      setSelectedMarketType(marketType);
      
      if (!agentService.current) {
        setMessages(prev => [...prev, 
          { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
        ]);
        setIsLoading(false);
        return;
      }
      
      // Get current network
      const currentNetwork = agentService.current?.getCurrentNetwork();
      const networkName = currentNetwork === Network.Mainnet ? "Mainnet" : "Testnet";
      
      // Use the updated fetchAndLogMarkets function to get formatted market data
      const marketData = await agentService.current.fetchAndLogMarkets(marketType);
      console.log(`Formatted ${marketType} markets:`, marketData);
      
      // Set the markets based on type
      if (marketType === 'spot') {
        setSpotMarkets(marketData.markets);
      } else {
        setDerivativeMarkets(marketData.markets);
      }
      
      // Set the market list
      setMarketList(marketData.markets);
      
      // Show markets
      setShowMarkets(true);
      
      // Update the last message to show markets
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { 
          role: 'assistant', 
          content: `Here are the available ${marketType} markets on ${networkName}` 
        };
        return newMessages;
      });
      
      // Reset current page
      setCurrentMarketPage(1);
    } catch (error) {
      console.error('Error showing markets:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I encountered an error while fetching the markets. Please try again later." 
      }]);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <WalletConnect setAddress={setAddress}/>

      <div className="pt-20 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-1/3 aspect-square mx-auto mb-4 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <img 
                  src={agentimg} 
                  alt="AI Assistant" 
                  className="w-4/5 h-5/5 object-contain relative z-10 animate-float rounded-2xl"
                  style={{
                    animation: "float 6s ease-in-out infinite"
                  }}
                />
              </div>
            </div>
            <h1 className="text-2xl font-semibold mb-2">Flux OS</h1>
            <p className="text-gray-600">Your Injective Protocol Assistant</p>
          </div>

          <div className="mb-8 space-y-4 max-h-[400px] overflow-y-auto">
            {messages.map((message, i) => {
              // Check if this is a token display message
              const isTokenDisplayMessage = 
                message.role === 'assistant' && 
                typeof message.content === 'string' &&
                message.content.includes('tokens on Injective') && 
                message.content.includes('Page');
              
              // Check if this is a vault display message
              const isVaultDisplayMessage =
                message.role === 'assistant' &&
                typeof message.content === 'string' &&
                message.content.includes('vault') &&
                (message.content.includes('APY') || message.content.includes('Vaults') || message.content.includes('vaults'));
              
              // Check if this is a market display message
              const isMarketDisplayMessage =
                message.role === 'assistant' &&
                typeof message.content === 'string' &&
                (message.content.includes('available markets') || 
                 message.content.includes('available spot markets') || 
                 message.content.includes('available derivative markets') ||
                 message.content.includes('Here are the available'));
              
              return (
                <div key={i} className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] p-4 rounded-xl ${
                    message.role === 'assistant' 
                      ? 'bg-white text-gray-800 shadow-sm' 
                      : 'bg-black text-white'
                  }`}>
                    {/* For token display messages, only show the header */}
                    {isTokenDisplayMessage ? (
                      <div>
                        {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
                        {i === messages.length - 1 && showTokens && renderTokenCards()}
                      </div>
                    ) : isVaultDisplayMessage ? (
                      <div>
                        {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
                        {i === messages.length - 1 && showVaultCards && renderVaultCards()}
                      </div>
                    ) : isMarketDisplayMessage ? (
                      <div>
                        {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
                        {i === messages.length - 1 && showMarkets && renderMarketCards()}
                      </div>
                    ) : (
                      <div>
                        {typeof message.content === 'string' ? message.content : 
                         (typeof message.content === 'object' ? JSON.stringify(message.content) : String(message.content))}
                        {message.role === 'assistant' && i === messages.length - 1 && showValidators && renderValidatorCards()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="mb-8">
            <div className="text-sm text-gray-600 mb-4">Quick Actions:</div>
            <div className="flex flex-wrap gap-2">
              <Button 
                key="buy-inj" 
                variant="outline" 
                size="sm" 
                className="rounded-full"
                onClick={() => handleBuyINJ("20")}
              >
                Buy $20 of INJ
              </Button>
              <Button 
                key="check-balance" 
                variant="outline" 
                size="sm" 
                className="rounded-full"
                onClick={() => handleCheckBalance()}
              >
                Check Balance
              </Button>
              <Button 
                key="stake-inj" 
                variant="outline" 
                size="sm" 
                className="rounded-full"
                onClick={() => handleStakeINJ()}
              >
                Stake INJ
              </Button>
              <Button 
                key="get-price" 
                variant="outline" 
                size="sm"
                onClick={() => handleGetINJPrice()}
              >
                INJ Price
              </Button>
              <Button 
                key="mainnet-tokens" 
                variant="outline" 
                size="sm"
                onClick={() => handleGetAllTokens(false, false)}
              >
                Mainnet Tokens
              </Button>
              <Button 
                key="testnet-tokens" 
                variant="outline" 
                size="sm"
                onClick={() => handleGetAllTokens(false, true)}
              >
                Testnet Tokens
              </Button>
              <Button 
                key="fetch-markets" 
                variant="outline" 
                size="sm"
                onClick={() => handleFetchMarkets()}
              >
                Fetch Markets
              </Button>
            </div>
          </div>

          <div className="relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Try: Trade $20 worth of INJ"
              className="w-full pl-12 pr-12 py-10 h-32 bg-white border-gray-200 rounded-xl shadow-sm text-lg"
              disabled={isLoading}
            />
            <Bot className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <Button 
              size="lg" 
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black text-white px-6 py-3"
              onClick={() => handleSubmit()}
              disabled={isLoading}
            >
              <span className="flex items-center">
                {isLoading ? '...' : 'Ask'} 
                <Send className="w-5 h-5 ml-2" />
              </span>
            </Button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <DockIcons />
    </div>
  )
}
