import React, { useState, useCallback, useRef, useEffect } from 'react';
import WalletConnect from '@/components/WalletConnect';
import DockIcons from "@/components/DockIcons"
import { useWallet } from '@/context/WalletContext';

import { 
  MsgCreateDenom,
  MsgMint,
  MsgSetDenomMetadata,
  MsgInstantSpotMarketLaunch
} from '@injectivelabs/sdk-ts';

import { MsgBroadcaster } from '@injectivelabs/wallet-ts';
import Confetti from 'react-confetti';
import { Network, getNetworkEndpoints } from '@injectivelabs/networks';
import { BigNumberInBase } from '@injectivelabs/utils';
import { ChainGrpcExchangeApi } from '@injectivelabs/sdk-ts';

// Custom hook for window size
const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

interface LiquidityModalProps {
  token: any;
  address: string;
  onSubmit: (quoteAsset: string) => void;
  onClose: () => void;
}

const LiquidityModal: React.FC<LiquidityModalProps> = ({ 
  token, 
  address,
  onSubmit, 
  onClose
}) => {
  const [quoteAsset, setQuoteAsset] = useState('USDT');

  const handleSubmit = () => {
    onSubmit(quoteAsset);
  };

  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-black opacity-30" onClick={onClose}></div>
        <div className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Add Liquidity for {token?.name} ({token?.symbol})
            </h3>
            <div className="mt-4">
              <div>
                <label htmlFor="quoteAsset" className="block text-sm font-medium text-gray-700">
                  Quote Asset
                </label>
                <select
                  name="quoteAsset"
                  id="quoteAsset"
                  value={quoteAsset}
                  onChange={(e) => setQuoteAsset(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="USDT">USDT</option>
                  <option value="INJ">INJ</option>
                </select>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TokenPage: React.FC = () => {
  const { address, walletStrategy, network } = useWallet();
  const [activeTab, setActiveTab] = useState('ai');
  const [currentStep, setCurrentStep] = useState(1);
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenSupply, setTokenSupply] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [tokenDescription, setTokenDescription] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [successToken, setSuccessToken] = useState<any>(null);
  const [successAgent, setSuccessAgent] = useState<any>(null);
  const [createdToken, setCreatedToken] = useState<any>(null);
  
  // User tokens state for Flux Into Market tab
  const [userTokens, setUserTokens] = useState<any[]>([]);
  const [loadingUserTokens, setLoadingUserTokens] = useState(false);
  const [userTokensError, setUserTokensError] = useState('');
  
  // Agent traits state
  const [agentPersonality, setAgentPersonality] = useState('');
  const [agentBackground, setAgentBackground] = useState('');
  const [agentSpecialties, setAgentSpecialties] = useState('');
  const [agentInterests, setAgentInterests] = useState('');
  const [agentCommunicationStyle, setAgentCommunicationStyle] = useState('');
  const [agentKnowledgeDomains, setAgentKnowledgeDomains] = useState('');
  
  // Add these state variables at the top of the component
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([
    {
      role: 'assistant',
      content: 'Hi there! I\'m your AI assistant for token creation and trading strategies,DCA an dvarious things about  Injective be funny and . How can I help you today?'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { width, height } = useWindowSize();

  // Fetch user tokens when tab changes to 'market' or address changes
  useEffect(() => {
    if (activeTab === 'market' && address) {
      fetchUserTokens();
    }
  }, [activeTab, address]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('image', file);

      // Upload to IPFS through our backend
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      setSelectedImage(data.url);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      setError(error.message || 'Failed to upload image');
    }
  };

  const createToken = async (params: {
    name: string;
    symbol: string;
    supply: string;
    image?: string;
    description?: string;
  }) => {
    try {
      if (!address || !walletStrategy) {
        throw new Error('Please connect your wallet first');
      }

      setLoading(true);
      setError('');

      const subdenom = params.symbol.toLowerCase();
      const denom = `factory/${address}/${subdenom}`;

      // Create denom message with proper structure
      const createDenomMsg = new MsgCreateDenom({
        subdenom: subdenom,
        sender: address
      });

      // Convert supply to the proper format - using 18 decimals for token
      const amountInWei = new BigNumberInBase(params.supply).toWei(18).toFixed();

      // Create mint message with proper structure
      const mintMsg = new MsgMint({
        sender: address,
        amount: {
          denom: denom,
          amount: amountInWei
        }
      });

      // Create metadata message with proper structure
      const metadataMsg = new MsgSetDenomMetadata({
        sender: address,
        metadata: {
          base: denom,
          description: params.description || '',
          display: subdenom,
          name: params.name,
          symbol: params.symbol.toUpperCase(),
          uri: params.image || '',
          uriHash: '',
          decimals: 18,
          denomUnits: [
            {
              denom: denom,
              exponent: 0,
              aliases: [subdenom]
            },
            {
              denom: subdenom,
              exponent: 18,
              aliases: []
            }
          ]
        }
      });

      // Create broadcaster using wallet strategy
      const broadcaster = new MsgBroadcaster({
        network: Network.Testnet,
        walletStrategy
      });

      // Broadcast transaction with all messages
      const response = await broadcaster.broadcast({
        injectiveAddress: address,
        msgs: [createDenomMsg, mintMsg, metadataMsg]
      });
      
      console.log('Token created successfully:', response);
      
      // Save token data temporarily
      const tokenData = {
        name: params.name,
        symbol: params.symbol.toUpperCase(),
        denom: denom,
        supply: params.supply,
        description: params.description || '',
        imageUrl: params.image || '',
        creator: address,
        txHash: response.txHash  //tx.has
      };
      
      setCreatedToken(tokenData);
      
      // Return the token data with txHash
      return {
        ...tokenData,
        txhash: response.txHash
      };

    } catch (err: any) {
      console.error('Error creating token:', err);
      setError(err.message || 'Failed to create token');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleAITokenCreation = async () => {
    setLoading(true);
    try {
      // Here we would integrate with AI to generate token params
      // For now, let's use some default values
      const tokenParams = {
        name: "AI Generated Token",
        symbol: "AGT",
        supply: "1000000",
        description: aiPrompt
      };
      
      await createToken(tokenParams);
    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message);
    }
    setLoading(false);
  };

  const handleManualTokenCreation = async () => {
    try {
      if (!tokenName || !tokenSymbol || !tokenSupply) {
        throw new Error('Please fill in all required token fields');
      }
      
      if (currentStep === 1) {
        // Move to agent creation step without creating token yet
        setCurrentStep(2);
        return;
      }
      
      // Step 2: Validate agent fields
      if (!agentPersonality || !agentBackground || !agentSpecialties || 
          !agentInterests || !agentCommunicationStyle || !agentKnowledgeDomains) {
        throw new Error('Please fill in all agent fields');
      }

      setLoading(true);
      setError('');

      // Now create token on blockchain
      const tokenData = await createToken({
        name: tokenName,
        symbol: tokenSymbol,
        supply: tokenSupply,
        image: selectedImage,
        description: tokenDescription
      });

      console.log('Token created with data:', tokenData);

      // Token was created, now save both token and agent
      const agentData = {
        token: {
          ...tokenData,
          imageUrl: selectedImage
        },
        traits: {
          personality: agentPersonality || 'Friendly and professional',
          background: agentBackground || `Expert in ${tokenName} token and blockchain technology`,
          specialties: agentSpecialties ? agentSpecialties.split(',').map(s => s.trim()) : ['Blockchain', 'Tokenomics'],
          interests: agentInterests ? agentInterests.split(',').map(s => s.trim()) : ['DeFi', 'Technology'],
          communicationStyle: agentCommunicationStyle || 'Professional and helpful',
          knowledgeDomains: agentKnowledgeDomains ? agentKnowledgeDomains.split(',').map(s => s.trim()) : ['Blockchain', 'Finance']
        }
      };

      console.log('Sending data to backend:', JSON.stringify(agentData, null, 2));

      // Save token and agent to database
      const dbResponse = await fetch('http://localhost:5000/api/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
      });
      
      const responseText = await dbResponse.text();
      console.log('Response from server:', responseText);
      
      if (!dbResponse.ok) {
        throw new Error(responseText || 'Failed to create token and agent');
      }
      
      const responseData = JSON.parse(responseText);
      const { token, agent } = responseData;
      
      setSuccessToken(token);
      setSuccessAgent(agent);
      setShowConfetti(true);
      
      // Hide confetti after 10 seconds
      setTimeout(() => {
        setShowConfetti(false);
      }, 10000);

      // Reset form
      setCurrentStep(1);
      resetForm();
    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTokenName('');
    setTokenSymbol('');
    setTokenSupply('');
    setSelectedImage('');
    setTokenDescription('');
    setAiPrompt('');
    setAgentPersonality('');
    setAgentBackground('');
    setAgentSpecialties('');
    setAgentInterests('');
    setAgentCommunicationStyle('');
    setAgentKnowledgeDomains('');
  };

  // Fetch tokens created by the current user
  const fetchUserTokens = async () => {
    if (!address) return;
    
    try {
      setLoadingUserTokens(true);
      setUserTokensError('');
      
      const response = await fetch(`http://localhost:5000/api/tokens/creator/${address}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch your tokens');
      }
      
      const data = await response.json();
      setUserTokens(data);
    } catch (error: any) {
      console.error('Error fetching user tokens:', error);
      setUserTokensError(error.message || 'Failed to load your tokens');
    } finally {
      setLoadingUserTokens(false);
    }
  };

  // Add token to market (Helix exchange)
  const addTokenToMarket = async (token: any) => {
    if (token) {
      setCreatedToken(token);
      setShowLiquidityModal(true);
    }
  };

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleSendMessage = async () => {
    if (!aiPrompt.trim() || loading) return;
    
    // Add user message to chat
    const userMessage = aiPrompt.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setAiPrompt('');
    setIsTyping(true);
    
    try {
      // Call the AI assistant API
      const response = await fetch('http://localhost:5000/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          walletAddress: address,
          conversationHistory: messages
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response from assistant');
      }
      
      const data = await response.json();
      
      // Process the response to extract token information if available
      const aiResponse = data.response;
      
      // Check if the response contains token creation data
      if (aiResponse.includes('TOKEN_DATA:')) {
        try {
          const tokenDataMatch = aiResponse.match(/TOKEN_DATA:(.*?)END_TOKEN_DATA/s);
          if (tokenDataMatch && tokenDataMatch[1]) {
            const tokenData = JSON.parse(tokenDataMatch[1].trim());
            
            // Fill in the token form
            setTokenName(tokenData.name || '');
            setTokenSymbol(tokenData.symbol || '');
            setTokenSupply(tokenData.supply || '');
            setTokenDescription(tokenData.description || '');
            
            // Add a message about the token data
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: 'I\'ve prepared the token details for you. Now let\'s create an AI agent for your token. What personality and traits would you like your token agent to have?' 
            }]);
            
            // Don't switch to manual tab yet
            // setActiveTab('manual');
            // setCurrentStep(1);
          } else {
            // Just add the regular response
            setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
          }
        } catch (err) {
          console.error('Error parsing token data:', err);
          setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
        }
      } 
      // Check if the response contains agent data
      else if (aiResponse.includes('AGENT_DATA:')) {
        try {
          const agentDataMatch = aiResponse.match(/AGENT_DATA:(.*?)END_AGENT_DATA/s);
          if (agentDataMatch && agentDataMatch[1]) {
            const agentData = JSON.parse(agentDataMatch[1].trim());
            
            // Fill in the agent form
            setAgentPersonality(agentData.personality || '');
            setAgentBackground(agentData.background || '');
            setAgentSpecialties(agentData.specialties || '');
            setAgentInterests(agentData.interests || '');
            setAgentCommunicationStyle(agentData.communicationStyle || '');
            setAgentKnowledgeDomains(agentData.knowledgeDomains || '');
            
            // Add a message about the agent data
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: 'I\'ve prepared the agent details. Ready to launch your token? Just say "launch" and I\'ll create your token on the blockchain.' 
            }]);
            
            // Don't switch to manual tab
            // setActiveTab('manual');
            // setCurrentStep(2);
          } else {
            // Just add the regular response
            setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
          }
        } catch (err) {
          console.error('Error parsing agent data:', err);
          setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
        }
      }
      // Check if the response contains a launch command
      else if (aiResponse.toLowerCase().includes('launch token') || 
               userMessage.toLowerCase().includes('launch')) {
        
        // Check if we have all required token data
        if (!tokenName || !tokenSymbol || !tokenSupply) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: 'I need more information about your token before I can launch it. Please provide a name, symbol, and supply for your token.' 
          }]);
          return;
        }
        
        // Add the assistant message first
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Launching your token now. Please approve the transaction in your wallet.' 
        }]);
        
        // Trigger token creation directly from AI interface
        setLoading(true);
        
        try {
          // Create token and agent
          const result = await createTokenWithAgent();
          
          if (result.success) {
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: `🎉 Success! Your token "${tokenName}" (${tokenSymbol}) has been created on the blockchain. Transaction hash: ${result.txHash}` 
            }]);
            
            // Show confetti
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 5000);
            
            // Reset form
            resetForm();
          } else {
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: `Sorry, there was an error creating your token: ${result.error}` 
            }]);
          }
        } catch (error) {
          console.error('Error creating token:', error);
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: 'Sorry, there was an error creating your token. Please try again.' 
          }]);
        } finally {
          setLoading(false);
        }
      }
      // Regular response
      else {
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsTyping(false);
      // Scroll to bottom of chat
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Add this function to handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add this component to display trading strategies
  const TradingStrategies = () => {
  return (
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Trading Strategies</h2>
        <p className="text-gray-600 mb-4">
          Ask the AI assistant about trading strategies for your tokens. Here are some examples:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-700">DCA Strategy</h3>
            <p className="text-sm text-gray-600">Dollar-cost averaging strategy for long-term token accumulation</p>
            <button 
              onClick={() => {
                setAiPrompt("Can you explain a dollar-cost averaging strategy for my token?");
                handleSendMessage();
              }}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Ask about this strategy →
            </button>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-700">Staking Strategy</h3>
            <p className="text-sm text-gray-600">Maximize returns through strategic token staking</p>
            <button 
              onClick={() => {
                setAiPrompt("What's the best staking strategy for my token on Injective?");
                handleSendMessage();
              }}
              className="mt-2 text-sm text-green-600 hover:text-green-800"
            >
              Ask about staking →
            </button>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium text-purple-700">Liquidity Provision</h3>
            <p className="text-sm text-gray-600">Provide liquidity to DEXs and earn fees</p>
            <button 
              onClick={() => {
                setAiPrompt("How can I provide liquidity for my token on Injective?");
                handleSendMessage();
              }}
              className="mt-2 text-sm text-purple-600 hover:text-purple-800"
            >
              Learn about LP →
            </button>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-medium text-yellow-700">Token Launch Strategy</h3>
            <p className="text-sm text-gray-600">Best practices for launching your token</p>
            <button 
              onClick={() => {
                setAiPrompt("What's the best strategy for launching my token on Injective?");
                handleSendMessage();
              }}
              className="mt-2 text-sm text-yellow-600 hover:text-yellow-800"
            >
              Get launch tips →
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Add this component to display token creation suggestions
  const TokenCreationSuggestions = () => {
    return (
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Token Creation Assistant</h2>
        <p className="text-gray-600 mb-4">
          Let the AI help you create your token. Click on any suggestion to get started:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="font-medium text-indigo-700">Create a DeFi Token</h3>
            <p className="text-sm text-gray-600">Generate a token optimized for DeFi applications</p>
            <button 
              onClick={() => {
                setAiPrompt("Help me create a DeFi token for lending and borrowing");
                handleSendMessage();
              }}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
            >
              Create DeFi Token →
            </button>
          </div>
          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="font-medium text-pink-700">Create a Governance Token</h3>
            <p className="text-sm text-gray-600">Generate a token for DAO governance</p>
            <button 
              onClick={() => {
                setAiPrompt("Help me create a governance token for my DAO");
                handleSendMessage();
              }}
              className="mt-2 text-sm text-pink-600 hover:text-pink-800"
            >
              Create Governance Token →
            </button>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-medium text-red-700">Create a Utility Token</h3>
            <p className="text-sm text-gray-600">Generate a token with utility in your ecosystem</p>
            <button 
              onClick={() => {
                setAiPrompt("Help me create a utility token for my dApp");
                handleSendMessage();
              }}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Create Utility Token →
            </button>
          </div>
          <div className="bg-teal-50 p-4 rounded-lg">
            <h3 className="font-medium text-teal-700">Custom Token</h3>
            <p className="text-sm text-gray-600">Describe your token idea and let AI help you</p>
            <button 
              onClick={() => {
                setAiPrompt("I want to create a token for [your idea here]. Can you help me?");
                handleSendMessage();
              }}
              className="mt-2 text-sm text-teal-600 hover:text-teal-800"
            >
              Create Custom Token →
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Add this function to create token and agent directly from AI interface
  const createTokenWithAgent = async () => {
    if (!address || !tokenName || !tokenSymbol || !tokenSupply) {
      return { success: false, error: 'Missing required token information' };
    }

    try {
      // First create the token on the blockchain using the existing function
      // that properly interacts with the wallet
      const tokenBlockchainData = await createToken({
        name: tokenName,
        symbol: tokenSymbol,
        supply: tokenSupply,
        image: selectedImage || '',
        description: tokenDescription || ''
      });

      console.log('Token created on blockchain:', tokenBlockchainData);

      // Prepare agent data
      const agentData = {
        token: tokenBlockchainData, // Use the blockchain token data
        traits: {
          personality: agentPersonality || 'Helpful and knowledgeable',
          background: agentBackground || 'Expert in token economics and trading strategies',
          specialties: agentSpecialties ? agentSpecialties.split(',').map((s: string) => s.trim()) : ['Token creation', 'Trading', 'Investment strategies'],
          interests: agentInterests ? agentInterests.split(',').map((s: string) => s.trim()) : ['DeFi', 'Blockchain technology', 'Financial markets'],
          communicationStyle: agentCommunicationStyle || 'Clear, concise, and informative',
          knowledgeDomains: agentKnowledgeDomains ? agentKnowledgeDomains.split(',').map((s: string) => s.trim()) : ['Cryptocurrency', 'DeFi', 'Injective Protocol']
        }
      };

      // Save token and agent to database
      const dbResponse = await fetch('http://localhost:5000/api/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
      });
      
      const responseText = await dbResponse.text();
      console.log('Response from server:', responseText);
      
      if (!dbResponse.ok) {
        throw new Error(responseText || 'Failed to create token and agent in database');
      }
      
      try {
        const responseData = JSON.parse(responseText);
        const { token, agent } = responseData;
        
        setSuccessToken(token);
        setSuccessAgent(agent);
      } catch (err) {
        console.error('Error parsing response:', err);
      }

      return { 
        success: true, 
        txHash: tokenBlockchainData.txhash || 'Transaction successful, but hash not available',
        tokenId: tokenBlockchainData.denom || ''
      };
    } catch (error) {
      console.error('Error creating token:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const [showLiquidityModal, setShowLiquidityModal] = useState(false);

  // Define the MarketParams interface to match token-station
  interface MarketParams {
    sender: string;
    baseDenom: string;
    quoteDenom: string;
    minPriceTickSize: string;
    minQuantityTickSize: string;
    ticker: string;
  }

  const handleLiquiditySubmit = async (quoteAsset: string) => {
    if (!address || !walletStrategy) return;
    
    try {
      setLoading(true);
      setError('');

      // Get network endpoints
      const endpoints = getNetworkEndpoints(Network.Testnet);
      
      // Initialize the exchange API
      const exchangeApi = new ChainGrpcExchangeApi(endpoints.grpc);
      
      // Get the correct quote denom
      const quoteDenom = quoteAsset === 'USDT' 
        ? 'peggy0x87aB3B4C8661e07D6372361211B96ed4Dc36B1B5' 
        : 'inj';

      // Set decimals based on the quote asset
      const baseDecimals = 18;
      const quoteDecimals = quoteAsset === 'USDT' ? 6 : 18;

      // Calculate tick sizes properly
      const baseTick = new BigNumberInBase(0.001).toFixed();
      const quoteTick = new BigNumberInBase(0.000001).toFixed();

      // Calculate the actual tick sizes with proper decimals
      const minQuantityTickSize = new BigNumberInBase(baseTick)
        .toWei(baseDecimals)
        .toFixed();

      const minPriceTickSize = new BigNumberInBase(quoteTick)
        .toWei(quoteDecimals)
        .toFixed();

      // Construct market parameters
      const marketParams = {
        sender: address,
        baseDenom: createdToken.denom, // Use the created token's denom
        quoteDenom: quoteDenom,
        ticker: `${createdToken.symbol}/${quoteAsset}`,
        minPriceTickSize,
        minQuantityTickSize
      };

      console.log('Market parameters:', {
        baseTick,
        quoteTick,
        baseDecimals,
        quoteDecimals,
        minQuantityTickSize,
        minPriceTickSize
      });

      // Create market launch message
      const msg = MsgInstantSpotMarketLaunch.fromJSON({
        market: marketParams,
        proposer: address
      });

      // Create broadcaster with proper configuration
      const msgBroadcastClient = new MsgBroadcaster({
        network: Network.Testnet,
        endpoints: endpoints,
        walletStrategy
      });

      // Broadcast the transaction
      const response = await msgBroadcastClient.broadcast({
        msgs: [msg],
        injectiveAddress: address
      });

      if (!response.txHash) {
        throw new Error('Failed to create market: No transaction hash received');
      }

      console.log('Market created successfully:', response);
      setShowLiquidityModal(false);
      
      // Show success message with transaction hash
      alert(`Market created successfully! Transaction hash: ${response.txHash}`);

    } catch (error: any) {
      console.error('Error creating market:', error);
      setError(error.message || 'Failed to create market');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8 py-20 relative">
      {showConfetti && <Confetti width={width} height={height} recycle={false} />}
      
      {(successToken && successAgent) && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-green-600">Token Created Successfully!</h2>
            <div className="mb-4">
              <p className="font-semibold">Token Details:</p>
              <p>Name: {successToken.name}</p>
              <p>Symbol: {successToken.symbol}</p>
              <p>Denom: {successToken.denom}</p>
            </div>
            <div className="mb-4">
              <p className="font-semibold">Your Agent:</p>
              <p>Name: {successAgent.name}</p>
              <p>Description: {successAgent.description}</p>
              <p>Personality: {successAgent.traits.personality}</p>
              <p>Background: {successAgent.traits.background}</p>
            </div>
            <button 
              onClick={() => {
                setShowConfetti(false);
                setSuccessToken(null);
                setSuccessAgent(null);
              }}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {showLiquidityModal && (
        <LiquidityModal 
          token={createdToken}
          address={address}
          onSubmit={handleLiquiditySubmit}
          onClose={() => setShowLiquidityModal(false)}
        />
      )}
      
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Token Creation</h1>
            <p className="text-gray-600">Create your custom token with AI assistance or manual configuration</p>
          </div>
          <WalletConnect />
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex" aria-label="Tabs">
              <button
                onClick={() => {
                  setActiveTab('ai');
                  setCurrentStep(1);
                }}
                className={`w-1/3 py-6 px-1 text-center border-b-2 font-medium text-lg transition-all duration-200 ${
                  activeTab === 'ai'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                AI-Assisted Creation
              </button>
              <button
                onClick={() => {
                  setActiveTab('manual');
                  setCurrentStep(1);
                }}
                className={`w-1/3 py-6 px-1 text-center border-b-2 font-medium text-lg transition-all duration-200 ${
                  activeTab === 'manual'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Manual Creation
              </button>
              <button
                onClick={() => {
                  setActiveTab('market');
                  fetchUserTokens();
                }}
                className={`w-1/3 py-6 px-1 text-center border-b-2 font-medium text-lg transition-all duration-200 ${
                  activeTab === 'market'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Flux Into Market
              </button>
            </nav>
          </div>

          <div className="p-8">
            {activeTab === 'ai' ? (
              <div>
              
              <div className="space-y-8">
                <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6 text-white">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div className="text-lg font-medium text-gray-900 ml-3">AI Assistant</div>
                    </div>
                    <div className="chat-messages bg-white rounded-lg p-4 mb-4 h-60 overflow-y-auto">
                      {messages.map((message, index) => (
                        <div key={index} className={`flex items-center mb-2 ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                          <div className={`rounded-lg p-2 max-w-[80%] ${message.role === 'assistant' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                            {message.content}
                          </div>
                        </div>
                      ))}
                      {isTyping && (
                        <div className="flex items-center mb-2 justify-start">
                          <div className="rounded-lg p-2 bg-blue-100 text-blue-600">
                            <div className="flex items-center">
                              <div className="dot-typing"></div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="flex items-center">
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about token creation..."
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={3}
                  />
                </div>
                  </div>

                  <div className="flex justify-end">
                <button
                      onClick={handleSendMessage}
                      disabled={!address || loading || !aiPrompt}
                      className={`px-8 py-3 rounded-lg text-white font-medium ${
                        !address || loading || !aiPrompt
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          Generating...
                        </>
                      ) : (
                        <>
                          Send
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </>
                      )}
                </button>
              </div>
                </div>
              </div>
            ) : activeTab === 'manual' ? (
              <div className="space-y-8">
                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-4">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      currentStep === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      1
                    </div>
                    <div className="w-16 h-1 bg-gray-200">
                      <div className={`h-full ${currentStep === 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                    </div>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      currentStep === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      2
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 text-center">
                  {currentStep === 1 ? 'Token Details' : 'Customize AI Agent'}
                </h2>

                {currentStep === 1 ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                      Token Name
                    </label>
                    <input
                      type="text"
                      value={tokenName}
                      onChange={(e) => setTokenName(e.target.value)}
                          placeholder="e.g. My Awesome Token"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                      Token Symbol
                    </label>
                    <input
                      type="text"
                      value={tokenSymbol}
                      onChange={(e) => setTokenSymbol(e.target.value)}
                          placeholder="e.g. MAT"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                    </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Token Supply
                    </label>
                    <input
                      type="text"
                      value={tokenSupply}
                      onChange={(e) => setTokenSupply(e.target.value)}
                        placeholder="e.g. 1000000"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Token Image
                    </label>
                      <div className="flex items-center space-x-4">
                    <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          onClick={handleImageButtonClick}
                          className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          Upload Image
                        </button>
                        {selectedImage && (
                          <div className="flex items-center">
                            <img 
                              src={selectedImage} 
                              alt="Token" 
                              className="h-10 w-10 rounded-full object-cover"
                              onError={(e) => {
                                const imgElement = e.target as HTMLImageElement;
                                const fallbackElement = imgElement.previousElementSibling as HTMLElement;
                                if (imgElement && fallbackElement) {
                                  imgElement.style.display = 'none';
                                  fallbackElement.style.display = 'flex';
                                }
                              }}
                            />
                            <span className="ml-2 text-sm text-green-600">Image uploaded</span>
                  </div>
                        )}
                      </div>
                    </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                      Token Description
                    </label>
                    <textarea
                      value={tokenDescription}
                      onChange={(e) => setTokenDescription(e.target.value)}
                        placeholder="Describe your token..."
                        className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleManualTokenCreation}
                        disabled={!address || loading || !tokenName || !tokenSymbol || !tokenSupply}
                        className={`px-8 py-3 rounded-lg text-white font-medium ${
                          !address || loading || !tokenName || !tokenSymbol || !tokenSupply
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {loading ? 'Creating...' : 'Next: Customize Agent'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8">
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Design Your AI Agent</h3>
                      <p className="text-gray-600">Create a unique personality for your token's AI representative</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left Column */}
                      <div className="space-y-6">
                        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Personality
                            <span className="text-blue-600 ml-1">*</span>
                          </label>
                          <input
                            type="text"
                            value={agentPersonality}
                            onChange={(e) => setAgentPersonality(e.target.value)}
                            placeholder="e.g., Friendly and knowledgeable"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
                          />
                          <p className="mt-2 text-sm text-gray-500">Define how your agent interacts with users</p>
                        </div>

                        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Background Story
                            <span className="text-blue-600 ml-1">*</span>
                          </label>
                          <textarea
                            value={agentBackground}
                            onChange={(e) => setAgentBackground(e.target.value)}
                            placeholder="Create a compelling origin story for your agent..."
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
                      rows={4}
                    />
                          <p className="mt-2 text-sm text-gray-500">Give your agent a unique history and purpose</p>
                  </div>

                        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Communication Style
                            <span className="text-blue-600 ml-1">*</span>
                          </label>
                          <input
                            type="text"
                            value={agentCommunicationStyle}
                            onChange={(e) => setAgentCommunicationStyle(e.target.value)}
                            placeholder="e.g., Professional and concise"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
                          />
                          <p className="mt-2 text-sm text-gray-500">How your agent communicates with users</p>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-6">
                        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Specialties
                            <span className="text-blue-600 ml-1">*</span>
                          </label>
                          <input
                            type="text"
                            value={agentSpecialties}
                            onChange={(e) => setAgentSpecialties(e.target.value)}
                            placeholder="e.g., DeFi, NFTs, Gaming (comma-separated)"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
                          />
                          <p className="mt-2 text-sm text-gray-500">Key areas of expertise</p>
                        </div>

                        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Interests
                            <span className="text-blue-600 ml-1">*</span>
                          </label>
                          <input
                            type="text"
                            value={agentInterests}
                            onChange={(e) => setAgentInterests(e.target.value)}
                            placeholder="e.g., Blockchain, Art, Technology (comma-separated)"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
                          />
                          <p className="mt-2 text-sm text-gray-500">Topics your agent is passionate about</p>
                        </div>

                        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Knowledge Domains
                            <span className="text-blue-600 ml-1">*</span>
                          </label>
                          <input
                            type="text"
                            value={agentKnowledgeDomains}
                            onChange={(e) => setAgentKnowledgeDomains(e.target.value)}
                            placeholder="e.g., Finance, Blockchain, Economics (comma-separated)"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
                          />
                          <p className="mt-2 text-sm text-gray-500">Areas of expertise and deep knowledge</p>
                        </div>

                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                          <h4 className="text-sm font-medium text-gray-800 mb-2">Tips for Great AI Agents</h4>
                          <ul className="space-y-2 text-sm text-gray-600">
                            <li className="flex items-center">
                              <span className="mr-2">•</span>
                              Be specific with personality traits
                            </li>
                            <li className="flex items-center">
                              <span className="mr-2">•</span>
                              Create a memorable background story
                            </li>
                            <li className="flex items-center">
                              <span className="mr-2">•</span>
                              List relevant specialties for your token
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-6 mt-8 border-t border-gray-200">
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Token Details
                      </button>
                  <button
                    onClick={handleManualTokenCreation}
                        disabled={loading}
                        className={`px-8 py-3 rounded-lg text-white font-medium flex items-center ${
                          loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Creating...
                          </>
                        ) : (
                          <>
                            Create Token & Agent
                            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </>
                        )}
                  </button>
                </div>
              </div>
            )}
          </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Your Tokens</h2>
                  <button
                    onClick={fetchUserTokens}
                    className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H0L10.93 8.93a1.5 1.5 0 011.414 0l3 3a1.5 1.5 0 01-1.414 1.414l-3-3A1.5 1.5 0 009.06 8.06L4 12a2 2 0 100 4zm7-7a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2h0L14.93 8.93a1.5 1.5 0 011.414 0l3 3a1.5 1.5 0 01-1.414 1.414l-3-3A1.5 1.5 0 0113.06 8.06L10 12a2 2 0 100 4z" clipRule="evenodd" />
                    </svg>
                    Refresh
                  </button>
                </div>
                
                {!address && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-yellow-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h3 className="text-lg font-medium text-yellow-800 mb-2">Connect Your Wallet</h3>
                    <p className="text-yellow-600 mb-4">Please connect your wallet to see your tokens and add them to the market.</p>
                    <WalletConnect />
                  </div>
                )}
                
                {loadingUserTokens && (
                  <div className="flex justify-center items-center py-12">
                    <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                )}
                
                {userTokensError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Tokens</h3>
                    <p className="text-red-600">{userTokensError}</p>
                  </div>
                )}
                
                {!loadingUserTokens && !userTokensError && userTokens.length === 0 && address && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">No Tokens Found</h3>
                    <p className="text-gray-600 mb-6">You haven't created any tokens yet. Create a token first using AI-Assisted or Manual Creation.</p>
                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={() => setActiveTab('ai')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        AI-Assisted Creation
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('manual');
                          setCurrentStep(1);
                        }}
                        className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      >
                        Manual Creation
                      </button>
                    </div>
                  </div>
                )}
                
                {!loadingUserTokens && !userTokensError && userTokens.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {userTokens.map((token) => (
                      <div key={token._id} className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="relative w-12 h-12 rounded-full overflow-hidden">
                            {/* Fallback to symbol initials */}
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 font-bold text-sm">
                              {token.symbol?.substring(0, 3) || '?'}
                            </div>
                            
                            {token.imageUrl && (
                              <img
                                src={token.imageUrl}
                                alt={token.name}
                                className="absolute inset-0 w-full h-full object-cover"
                                onError={(e) => {
                                  const imgElement = e.target as HTMLImageElement;
                                  const fallbackElement = imgElement.previousElementSibling as HTMLElement;
                                  if (imgElement && fallbackElement) {
                                    imgElement.style.display = 'none';
                                    fallbackElement.style.display = 'flex';
                                  }
                                }}
                              />
                            )}
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">{token.name}</h3>
                            <p className="text-gray-500">{token.symbol}</p>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-500">Supply</span>
                            <span className="text-sm font-medium">{token.supply}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Denom</span>
                            <span className="text-sm font-medium truncate max-w-[200px]">{token.denom}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Created</span>
                            <span className="text-sm font-medium">{new Date(token.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className="border-t border-gray-200 pt-4 mt-4">
                          <button
                           onClick={() => addTokenToMarket(token)}
                           disabled={loading}
                           className={`w-full py-3 rounded-lg text-white font-medium ${
                             loading
                               ? 'bg-gray-400 cursor-not-allowed'
                               : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                           }`}
                         >
                            {loading ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Processing...
                              </>
                            ) : (
                              <>create a Market</>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <DockIcons />
    </div>
  );
};

export default TokenPage;