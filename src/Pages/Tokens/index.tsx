import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import WalletConnect from '@/components/WalletConnect';
import DockIcons from "@/components/DockIcons";
import { Bot, Home, Settings, Workflow, Wallet, BarChart2, Brain, Rocket, Send, Terminal, Search, Filter, Copy, Check } from "lucide-react";
import { useWallet } from '@/context/WalletContext';

const TokensPage: React.FC = () => {
  const { address } = useWallet();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedAddress, setCopiedAddress] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterOption, setFilterOption] = useState('all');

  // Fetch tokens from the database
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5000/api/tokens');
        
        if (!response.ok) {
          throw new Error('Failed to fetch tokens');
        }
        
        const data = await response.json();
        console.log('Fetched tokens:', data); // Log to see the structure
        setTokens(data);
      } catch (err) {
        console.error('Error fetching tokens:', err);
        setError('Failed to load tokens. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, []);

  // Copy address to clipboard
  const copyToClipboard = (e, address) => {
    e.preventDefault(); // Prevent navigation to token view
    e.stopPropagation(); // Prevent event bubbling
    
    navigator.clipboard.writeText(address)
      .then(() => {
        setCopiedAddress(address);
        setTimeout(() => setCopiedAddress(''), 2000);
      })
      .catch(err => {
        console.error('Failed to copy address:', err);
      });
  };

  // Filter and sort tokens based on search term and filter option
  const filteredTokens = tokens.filter(token => 
    token.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    token.symbol?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedTokens = [...filteredTokens].sort((a, b) => {
    switch (filterOption) {
      case 'newest':
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      case 'oldest':
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      case 'highest_cap':
        return parseFloat(b.marketCap || 0) - parseFloat(a.marketCap || 0);
      case 'highest_volume':
        return parseFloat(b.volume24h || 0) - parseFloat(a.volume24h || 0);
      default:
        return 0;
    }
  });



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

        {/* Loading and Error States */}
        {loading && (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
            <p className="text-gray-600">Loading tokens...</p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-10">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && sortedTokens.length === 0 && (
          <div className="text-center py-10">
            <div className="bg-gray-50 rounded-lg p-8 inline-block mb-4">
              <Rocket className="mx-auto h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No tokens found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No tokens match your search criteria' : 'You haven\'t created any tokens yet'}
            </p>
            <Link
              to="/token"
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200 inline-block"
            >
              Create Your First Token
            </Link>
          </div>
        )}

        {/* Token Grid */}
        {!loading && !error && sortedTokens.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedTokens.map((token) => (
              <Link
                to={`/token-view/${token._id}`}
                key={token._id}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-200"
              >
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
                          // Hide broken image and show fallback
                          (e.target as HTMLImageElement).style.display = 'none';
                          e.currentTarget.previousElementSibling.style.display = 'flex';
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{token.name}</h3>
                    <p className="text-gray-500">{token.symbol}</p>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-4 line-clamp-2">{token.description || 'No description available'}</p>
                
                {/* Token Address - Copiable */}
                {token.denom && (
                  <div 
                    className="mb-4 bg-gray-50 p-2 rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-100"
                    onClick={(e) => copyToClipboard(e, token.denom)}
                  >
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <span className="text-xs font-medium text-gray-700 mb-1">Token Address:</span>
                      <p className="text-xs text-gray-500 truncate">
                        {token.denom}
                      </p>
                    </div>
                    <button className="ml-2 p-1 rounded-full hover:bg-gray-200 flex-shrink-0">
                      {copiedAddress === token.denom ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Market Cap</p>
                    <p className="font-semibold">${token.marketCap || '0'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">24h Volume</p>
                    <p className="font-semibold">${token.volume24h || '0'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Price</p>
                    <p className="font-semibold">${token.price || '0'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Supply</p>
                    <p className="font-semibold">{token.supply || 'N/A'}</p>
                  </div>
                </div>

           

                {/* Token Owner Badge */}
                {token.creator === address && (
                  <div className="mt-4 inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-800">
                    Your Token
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
      <DockIcons/>
    </div>
  );
};

export default TokensPage;