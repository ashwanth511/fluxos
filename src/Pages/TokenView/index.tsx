import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import WalletConnect from '@/components/WalletConnect';
import DockIcons from "@/components/DockIcons";
import { Bot, Home, Settings, Workflow, Wallet, BarChart2, Brain, Rocket, Send, Terminal, ChevronLeft, Share2, ExternalLink } from "lucide-react";

const TokenViewPage: React.FC = () => {
  const { id } = useParams();
  
  // Temporary token data - replace with actual data fetch
  const [token] = useState({
    id: '1',
    name: 'FluxToken',
    symbol: 'FLX',
    supply: '1000000',
    image: 'https://placeholder.com/150',
    description: 'The native token for FluxOS platform. Built with advanced AI capabilities and designed for seamless trading automation.',
    createdAt: '2024-02-26',
    price: '0.5',
    marketCap: '500000',
    volume24h: '50000',
    creator: '0x1234...5678',
    holders: 150,
    transactions: 1250
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState('');

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
            <img
              src={token.image}
              alt={token.name}
              className="w-16 h-16 rounded-full bg-gray-100"
            />
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
                <p className="text-2xl font-semibold">${token.price}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <p className="text-sm text-gray-500">Market Cap</p>
                <p className="text-2xl font-semibold">${token.marketCap}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <p className="text-sm text-gray-500">24h Volume</p>
                <p className="text-2xl font-semibold">${token.volume24h}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <p className="text-sm text-gray-500">Holders</p>
                <p className="text-2xl font-semibold">{token.holders}</p>
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
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`pb-4 text-sm font-medium ${
                    activeTab === 'chat'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Chat
                </button>
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
                        <p className="text-sm text-gray-500">Contract Address</p>
                        <p className="font-mono">{token.creator}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Supply</p>
                        <p>{token.supply} {token.symbol}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Created On</p>
                        <p>{token.createdAt}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Transactions</p>
                        <p>{token.transactions}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="space-y-6">
                  <div className="h-96 bg-gray-50 rounded-lg p-4 overflow-y-auto">
                    {/* Chat messages will go here */}
                    <div className="text-center text-gray-500">
                      Start chatting about {token.name}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => {
                        // Handle sending message
                        setMessage('');
                      }}
                      className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200"
                    >
                      Send
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
                      <option value="usdc">USDC</option>
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
                  href="#"
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <span>Website</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <span>Explorer</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a
                  href="#"
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