"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bot, Send, Copy, Check } from "lucide-react"
import DockIcons from "@/components/DockIcons"
import WalletConnect from "@/components/WalletConnect"
import agentimg from "@/assets/hero13.png"
import { AgentService, Message, TokenDenom, ValidatorInfo } from "@/services/agentService"
 
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
  const [input, setInput] = useState("")
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
  const [isLoading, setIsLoading] = useState(false)
  const [address, setAddress] = useState("")
  const [validators, setValidators] = useState<ValidatorInfo[]>([])
  const [showValidators, setShowValidators] = useState(false)
  const [tokens, setTokens] = useState<TokenDenom[]>([])
  const [showTokens, setShowTokens] = useState(false)
  const [tokenPage, setTokenPage] = useState(1)
  const [tokenNetwork, setTokenNetwork] = useState("mainnet")
  const [copiedDenom, setCopiedDenom] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const agentService = useRef<AgentService | null>(null)

  useEffect(() => {
    if (!agentService.current) {
      agentService.current = new AgentService()
    }
  }, [])

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
      setTokenPage(1);
      setTokenNetwork(useTestnet ? "testnet" : "mainnet");
      
      // Get tokens with network parameter
      const tokenList = await agentService.current.getAllTokenDenoms(useTestnet);
      
      // Store tokens in state
      setTokens(tokenList);
      setShowTokens(true);
      
      // Replace the loading message with a simple header message
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { 
          role: 'assistant', 
          content: `Here are tokens on Injective ${useTestnet ? 'Testnet' : 'Mainnet'} (Page ${tokenPage}/${Math.ceil(tokenList.length / 5)})` 
        };
        return newMessages;
      });
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
    
    let newPage = tokenPage;
    if (direction === 'next' && tokenPage < totalPages) {
      newPage = tokenPage + 1;
    } else if (direction === 'prev' && tokenPage > 1) {
      newPage = tokenPage - 1;
    } else {
      return; // No change needed
    }
    
    // Update the page number
    setTokenPage(newPage);
    
    // Add a new message for the page change
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: `Here are tokens on Injective ${tokenNetwork === "testnet" ? 'Testnet' : 'Mainnet'} (Page ${newPage}/${totalPages})` 
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
      
      if (!showValidators) {
        // First fetch validators
        await handleStakeINJ(true);
      }
      
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

    try {
      if (!agentService.current) {
        setMessages(prev => [...prev, 
          { role: 'assistant', content: "Service is initializing. Please try again in a moment." }
        ]);
        return;
      }
      const response = await agentService.current.sendMessage(messageText)
      setMessages(prev => [...prev, { role: 'assistant', content: response }])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: "Error. Try again." }])
    }

    setIsLoading(false)
  }

  // Function to render token cards in the chat
  const renderTokenCards = () => {
    if (!showTokens || tokens.length === 0) return null;
    
    const pageSize = 5;
    const startIndex = (tokenPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, tokens.length);
    const tokensToDisplay = tokens.slice(startIndex, endIndex);
    const totalPages = Math.ceil(tokens.length / pageSize);
    
    return (
      <div className="mt-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {tokensToDisplay.map((token) => (
            <div 
              key={token.denom} 
              className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 relative"
            >
              {token.logoUrl && (
                <div className="absolute top-3 right-3 w-8 h-8">
                  <img 
                    src={token.logoUrl} 
                    alt={token.symbol} 
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
              )}
              <div className="font-medium text-black">{token.symbol}</div>
              <div className="text-xs text-gray-500">{token.name}</div>
              <div className="text-xs text-gray-400 flex items-center mt-1">
                <div className="truncate mr-2" title={token.denom}>
                  {token.denom.length > 20 ? `${token.denom.substring(0, 20)}...` : token.denom}
                </div>
                <button 
                  onClick={() => copyToClipboard(token.denom)}
                  className="text-gray-500 hover:text-black"
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
              disabled={tokenPage === 1}
              onClick={() => handleTokenPagination('prev')}
            >
              Previous
            </Button>
            
            <span className="text-sm text-gray-500">
              Page {tokenPage} of {totalPages}
            </span>
            
            <Button 
              variant="outline" 
              size="sm"
              disabled={tokenPage >= totalPages}
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
            onClick={() => handleGetAllTokens(false, tokenNetwork === "mainnet")}
            className="text-xs"
          >
            Switch to {tokenNetwork === "mainnet" ? "Testnet" : "Mainnet"} Tokens
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
                message.content.includes('tokens on Injective') && 
                message.content.includes('Page');
              
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
                        {message.content}
                        {i === messages.length - 1 && showTokens && renderTokenCards()}
                      </div>
                    ) : (
                      <div>
                        {message.content}
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
                className="rounded-full"
                onClick={() => handleGetINJPrice()}
              >
                INJ Price
              </Button>
              <Button 
                key="mainnet-tokens" 
                variant="outline" 
                size="sm" 
                className="rounded-full"
                onClick={() => handleGetAllTokens(false, false)}
              >
                Mainnet Tokens
              </Button>
              <Button 
                key="testnet-tokens" 
                variant="outline" 
                size="sm" 
                className="rounded-full"
                onClick={() => handleGetAllTokens(false, true)}
              >
                Testnet Tokens
              </Button>
            </div>
          </div>

          <div className="relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Try: Buy $20 worth of INJ"
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
