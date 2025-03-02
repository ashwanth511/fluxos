import React, { useState } from 'react';
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

const TokenPage: React.FC = () => {
  const { address, walletStrategy, network } = useWallet();
  const [activeTab, setActiveTab] = useState('ai');
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenSupply, setTokenSupply] = useState('');
  const [tokenImage, setTokenImage] = useState('');
  const [tokenDescription, setTokenDescription] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      alert('Token created successfully! Transaction hash: ' + response.txHash);

    } catch (err: any) {
      console.error('Error creating token:', err);
      setError(err.message || 'Failed to create token');
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
        throw new Error('Please fill in all required fields');
      }

      await createToken({
        name: tokenName,
        symbol: tokenSymbol,
        supply: tokenSupply,
        image: tokenImage,
        description: tokenDescription
      });
    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8 py-20">
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
                onClick={() => setActiveTab('ai')}
                className={`w-1/2 py-6 px-1 text-center border-b-2 font-medium text-lg transition-all duration-200 ${
                  activeTab === 'ai'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                AI-Assisted Creation
              </button>
              <button
                onClick={() => setActiveTab('manual')}
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
                    rows={8}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Example: Create a governance token for my DeFi protocol with the following specifications:
- Initial supply: 1M tokens
- Name theme: Space/Cosmic related
- Use case: Governance and staking
- Target audience: DeFi enthusiasts
- Special features: Deflationary mechanism"
                  />
                </div>
                <button
                  onClick={handleAITokenCreation}
                  disabled={loading}
                  className="w-full flex justify-center py-4 px-6 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-black hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? 'Generating Token...' : 'Generate Token with AI'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token Name
                    </label>
                    <input
                      type="text"
                      value={tokenName}
                      onChange={(e) => setTokenName(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Cosmic Governance Token"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token Symbol
                    </label>
                    <input
                      type="text"
                      value={tokenSymbol}
                      onChange={(e) => setTokenSymbol(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., CGT"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Initial Supply
                    </label>
                    <input
                      type="text"
                      value={tokenSupply}
                      onChange={(e) => setTokenSupply(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 1000000"
                    />
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token Image URL
                    </label>
                    <input
                      type="text"
                      value={tokenImage}
                      onChange={(e) => setTokenImage(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter image URL or IPFS hash"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token Description
                    </label>
                    <textarea
                      value={tokenDescription}
                      onChange={(e) => setTokenDescription(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe your token's purpose and features..."
                    />
                  </div>
                  <button
                    onClick={handleManualTokenCreation}
                    className="w-full flex justify-center py-4 px-6 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-black hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    Create Token
                  </button>
                </div>
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