import React, { useState, useCallback, useRef, useEffect } from 'react';
import WalletConnect from '@/components/WalletConnect';
import DockIcons from "@/components/DockIcons"
import { useWallet } from '@/context/WalletContext';
import { ChainId } from '@injectivelabs/ts-types';
import { BigNumberInBase } from '@injectivelabs/utils';
import { 
  MsgCreateDenom,
  MsgMint,
  MsgSetDenomMetadata
} from '@injectivelabs/sdk-ts';
import { MsgBroadcaster } from '@injectivelabs/wallet-ts';
import Confetti from 'react-confetti';

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

const TokenPage: React.FC = () => {
  const { address, walletStrategy, network } = useWallet();
  const [activeTab, setActiveTab] = useState('ai');
  const [currentStep, setCurrentStep] = useState(1);
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenSupply, setTokenSupply] = useState('');
  const [tokenImage, setTokenImage] = useState('');
  const [tokenDescription, setTokenDescription] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [successToken, setSuccessToken] = useState<any>(null);
  const [successAgent, setSuccessAgent] = useState<any>(null);
  const [createdToken, setCreatedToken] = useState<any>(null);
  
  // Agent traits state
  const [agentPersonality, setAgentPersonality] = useState('');
  const [agentBackground, setAgentBackground] = useState('');
  const [agentSpecialties, setAgentSpecialties] = useState('');
  const [agentInterests, setAgentInterests] = useState('');
  const [agentCommunicationStyle, setAgentCommunicationStyle] = useState('');
  const [agentKnowledgeDomains, setAgentKnowledgeDomains] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { width, height } = useWindowSize();

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
      setTokenImage(data.url);
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
      const createDenomMsg = {
        subdenom: subdenom,
        sender: address
      };

      // Convert supply to the proper format - using 18 decimals for token
      const amountInWei = new BigNumberInBase(params.supply).toWei(18).toFixed();

      // Create mint message with proper structure
      const mintMsg = {
        sender: address,
        amount: {
          denom: denom,
          amount: amountInWei
        }
      };

      // Create metadata message with proper structure
      const metadataMsg = {
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
      };

      // Create broadcaster using wallet strategy
      const broadcaster = new MsgBroadcaster({
        network: network,
        walletStrategy
      });

      // Create actual message instances
      const createDenomMsgInstance = MsgCreateDenom.fromJSON(createDenomMsg);
      const mintMsgInstance = MsgMint.fromJSON(mintMsg);
      const metadataMsgInstance = MsgSetDenomMetadata.fromJSON(metadataMsg);

      // Broadcast transaction with all messages
      const response = await broadcaster.broadcast({
        injectiveAddress: address,
        msgs: [createDenomMsgInstance, mintMsgInstance, metadataMsgInstance]
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
        txHash: response.txhash // Use txhash from the response
      };
      
      setCreatedToken(tokenData);
      
      // Return the token data with txHash
      return {
        ...tokenData,
        txhash: response.txhash
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
        image: tokenImage,
        description: tokenDescription
      });

      console.log('Token created with data:', tokenData);

      // Token was created, now save both token and agent
      const agentData = {
        token: tokenData,
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
    setTokenImage('');
    setTokenDescription('');
    setAiPrompt('');
    setAgentPersonality('');
    setAgentBackground('');
    setAgentSpecialties('');
    setAgentInterests('');
    setAgentCommunicationStyle('');
    setAgentKnowledgeDomains('');
  };

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
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
                className={`w-1/2 py-6 px-1 text-center border-b-2 font-medium text-lg transition-all duration-200 ${
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
                className={`w-1/2 py-6 px-1 text-center border-b-2 font-medium text-lg transition-all duration-200 ${
                  activeTab === 'manual'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Manual Creation
              </button>
            </nav>
          </div>

          <div className="p-8">
            {activeTab === 'ai' ? (
              <div className="space-y-8">
                <div className="bg-gray-50 rounded-lg p-6">
                  <label className="block text-lg font-medium text-gray-900 mb-4">
                    Describe Your Token
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Describe your token's purpose, features, and target audience..."
                        className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                    <div className="flex justify-end">
                <button
                  onClick={handleAITokenCreation}
                        disabled={!address || loading || !aiPrompt}
                        className={`px-8 py-3 rounded-lg text-white font-medium ${
                          !address || loading || !aiPrompt
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {loading ? 'Creating...' : 'Generate Token with AI'}
                </button>
                    </div>
              </div>
            ) : (
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
                        {tokenImage && (
                          <div className="flex items-center">
                            <img 
                              src={tokenImage} 
                              alt="Token" 
                              className="h-10 w-10 rounded-full object-cover"
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
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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