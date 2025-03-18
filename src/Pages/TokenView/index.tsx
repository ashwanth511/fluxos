import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import WalletConnect from '@/components/WalletConnect';
import DockIcons from "@/components/DockIcons";
import { Bot, Home, Settings, Workflow, Wallet, BarChart2, Brain, Rocket, Send, Terminal, ChevronLeft, Share2, ExternalLink } from "lucide-react";
import { useWallet } from '@/context/WalletContext';

const TokenViewPage: React.FC = () => {
  const { id } = useParams();
  const { address } = useWallet();
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [token, setToken] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{role: string, content: string, timestamp: Date}>>([]);
  const [isSending, setIsSending] = useState(false);

  // Fetch token data
  useEffect(() => {
    const fetchToken = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/tokens/id/${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch token');
        }
        
        const data = await response.json();
        console.log('Token data:', data);
        setToken(data);
      } catch (err) {
        console.error('Error fetching token:', err);
        setError('Failed to load token data');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchToken();
    }
  }, [id]);

  // Fetch chat history
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!token?._id || !address) return;
      
      try {
        const response = await fetch(`http://localhost:5000/api/tokens/${token._id}/chat/${address}`);
        
        if (!response.ok) {
          console.error('Failed to fetch chat history');
          return;
        }
        
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          setChatMessages(data.messages);
        }
      } catch (err) {
        console.error('Error fetching chat history:', err);
      }
    };

    if (token && address) {
      fetchChatHistory();
    }
  }, [token, address]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !token?._id) return;

    try {
      setIsSending(true);
      // Add user message to chat immediately
      const userMessage = { role: 'user', content: message, timestamp: new Date() };
      setChatMessages(prev => [...prev, userMessage]);
      setMessage('');

      // Format conversation history for the backend
      const formattedHistory = chatMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Send message to backend
      const response = await fetch(`http://localhost:5000/api/tokens/${token._id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          userId: address || 'anonymous',
          conversationHistory: formattedHistory
        }),
      });

      // Parse the response data
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || `Server error: ${response.status}`);
      }
      
      // Add AI response to chat
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }]);
    } catch (err: unknown) {
      console.error('Error sending message:', err);
      // Add fallback error message from the AI
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `I'm sorry, I'm having trouble responding right now. Error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again in a moment.`,
        timestamp: new Date()
      }]);
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white py-20 px-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Loading token data...</p>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="min-h-screen bg-white py-20 px-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Token not found'}</p>
          <Link 
            to="/tokens"
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200"
          >
            Back to Tokens
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-20 px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <Link 
              to="/tokens" 
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back to Tokens</span>
            </Link>
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100">
              {/* Fallback to symbol initials */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 font-bold">
                {token.symbol?.substring(0, 3) || '?'}
              </div>
              
              {token.imageUrl && (
                <img
                  src={token.imageUrl}
                  alt={token.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const prevElement = e.currentTarget.previousElementSibling;
                    if (prevElement) {
                      (prevElement as HTMLElement).style.display = 'flex';
                    }
                  }}
                />
              )}
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">{token.name}</h1>
              <p className="text-gray-600">{token.symbol}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <WalletConnect />
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Share2 className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Token Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <p className="text-sm text-gray-500">Price</p>
                <p className="text-2xl font-semibold">${token.price || '0'}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <p className="text-sm text-gray-500">Market Cap</p>
                <p className="text-2xl font-semibold">${token.marketCap || '0'}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <p className="text-sm text-gray-500">24h Volume</p>
                <p className="text-2xl font-semibold">${token.volume24h || '0'}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <p className="text-sm text-gray-500">Holders</p>
                <p className="text-2xl font-semibold">{token.holders || '0'}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex gap-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`pb-4 text-sm font-medium ${
                    activeTab === 'overview'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Overview
                </button>
                {token.agent && (
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`pb-4 text-sm font-medium ${
                      activeTab === 'chat'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Chat with Agent
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('transactions')}
                  className={`pb-4 text-sm font-medium ${
                    activeTab === 'transactions'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Transactions
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">About {token.name}</h3>
                    <p className="text-gray-600">{token.description}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Token Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Token Address</p>
                        <p className="font-mono text-sm break-all">{token.denom}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Supply</p>
                        <p>{token.supply} {token.symbol}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Created On</p>
                        <p>{new Date(token.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Creator</p>
                        <p className="font-mono text-sm break-all">{token.creator}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Agent Information */}
                  {token.agent && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Token Agent</h3>
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Personality</p>
                            <p className="text-gray-600">{token.agent.traits.personality}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Background</p>
                            <p className="text-gray-600">{token.agent.traits.background}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Specialties</p>
                            <div className="flex flex-wrap gap-2">
                              {token.agent.traits.specialties.map((specialty: string, index: number) => (
                                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                  {specialty}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Knowledge Domains</p>
                            <div className="flex flex-wrap gap-2">
                              {token.agent.traits.knowledgeDomains.map((domain: string, index: number) => (
                                <span key={index} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                                  {domain}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'chat' && token.agent && (
                <div className="space-y-6">
                  <div className="h-96 bg-gray-50 rounded-lg p-4 overflow-y-auto">
                    {chatMessages.length === 0 ? (
                      <div className="text-center text-gray-500">
                        Start chatting with the {token.name} AI Agent
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {chatMessages.map((msg, index) => (
                          <div
                            key={index}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] p-3 rounded-lg ${
                                msg.role === 'user'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p className="text-xs mt-1 opacity-70">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Ask the AI agent anything about this token..."
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isSending}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isSending}
                      className={`px-6 py-3 bg-black text-white rounded-lg transition-all duration-200 flex items-center gap-2 ${
                        isSending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'
                      }`}
                    >
                      {isSending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          <span>Send</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'transactions' && (
                <div className="space-y-4">
                  {/* Sample transactions - replace with real data */}
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Send className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Transfer</p>
                          <p className="text-sm text-gray-500">From: 0x1234...5678</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">100 {token.symbol}</p>
                        <p className="text-sm text-gray-500">2 hours ago</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trade Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Trade {token.symbol}</h3>
              <div className="space-y-4">
                {/* Buy Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buy Amount
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="usdt">USDT</option>
                      <option value="inj">INJ</option>
                    </select>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    You'll receive: ~1000 {token.symbol}
                  </p>
                  <button className="w-full mt-2 px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200">
                    Buy {token.symbol}
                  </button>
                </div>

                {/* Sell Section */}
                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sell Amount
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value={token.symbol}>{token.symbol}</option>
                    </select>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    You'll receive: ~500 USDT
                  </p>
                  <button className="w-full mt-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200">
                    Sell {token.symbol}
                  </button>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button className="w-full px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200">
                    Create Trading Bot
                  </button>
                </div>
              </div>
            </div>

            {/* Token Links */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Links</h3>
              <div className="space-y-3">
                <a
                  href={`https://testnet.explorer.injective.network/token/${token.denom}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <span>Explorer</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a
                  href="https://docs.injective.network/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <span>Documentation</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <DockIcons />
    </div>
  );
};

export default TokenViewPage;