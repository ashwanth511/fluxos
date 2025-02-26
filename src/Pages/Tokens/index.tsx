import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import WalletConnect from '@/components/WalletConnect';
import DockIcons from "@/components/DockIcons";
import { Bot, Home, Settings, Workflow, Wallet, BarChart2, Brain, Rocket, Send, Terminal, Search, Filter } from "lucide-react";

const TokensPage: React.FC = () => {
  // Temporary token data
  const [tokens] = useState([
    {
      id: '1',
      name: 'FluxToken',
      symbol: 'FLX',
      supply: '1000000',
      image: 'https://placeholder.com/150',
      description: 'The native token for FluxOS platform',
      createdAt: '2024-02-26',
      price: '0.5',
      marketCap: '500000',
      volume24h: '50000'
    },
    {
      id: '2',
      name: 'AstroToken',
      symbol: 'ASTRO',
      supply: '500000',
      image: 'https://placeholder.com/150',
      description: 'Powering decentralized astronomy',
      createdAt: '2024-02-25',
      price: '1.2',
      marketCap: '600000',
      volume24h: '75000'
    },
    {
      id: '3',
      name: 'QuantumCoin',
      symbol: 'QTM',
      supply: '2000000',
      image: 'https://placeholder.com/150',
      description: 'Next-gen quantum-resistant token',
      createdAt: '2024-02-24',
      price: '0.8',
      marketCap: '1600000',
      volume24h: '120000'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterOption, setFilterOption] = useState('all');

  const dockIcons = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Workflow, label: "IFTTT Builder", path: "/builder" },
    { icon: Wallet, label: "Wallet", path: "/wallet" },
    { icon: BarChart2, label: "Trading", path: "/trading" },
    { icon: Brain, label: "AI Agents", path: "/agents" },
    { icon: Rocket, label: "Launch", path: "/token" },
    { icon: Terminal, label: "Console", path: "/console" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-white py-20 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Token Explorer</h1>
            <p className="text-gray-600">Discover and manage your tokens</p>
          </div>
          <div className="flex items-center gap-4">
            <WalletConnect />
            <Link
              to="/token"
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200"
            >
              Create New Token
            </Link>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search tokens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterOption}
            onChange={(e) => setFilterOption(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Tokens</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest_cap">Highest Market Cap</option>
            <option value="highest_volume">Highest Volume</option>
          </select>
        </div>

        {/* Token Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tokens.map((token) => (
            <Link
              to={`/token-view/${token.id}`}
              key={token.id}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-200"
            >
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={token.image}
                  alt={token.name}
                  className="w-12 h-12 rounded-full bg-gray-100"
                />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{token.name}</h3>
                  <p className="text-gray-500">{token.symbol}</p>
                </div>
              </div>
              
              <p className="text-gray-600 mb-4 line-clamp-2">{token.description}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Market Cap</p>
                  <p className="font-semibold">${token.marketCap}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">24h Volume</p>
                  <p className="font-semibold">${token.volume24h}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="font-semibold">${token.price}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Supply</p>
                  <p className="font-semibold">{token.supply}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <DockIcons/>
    </div>
  );
};

export default TokensPage;