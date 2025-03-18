"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Bot, ArrowLeft, RefreshCw, Zap, BarChart3, Wallet, TrendingUp, Search, PieChart, Send, X } from "lucide-react"
import DockIcons from "@/components/DockIcons"
import WalletConnect from "@/components/WalletConnect"
import { useWallet } from "@/context/WalletContext"
import { Input } from "@/components/ui/input"
import { AgentService } from "@/services/agentService"

// Define agent types
interface SpawnedAgent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'idle' | 'busy';
  createdAt: Date;
  lastActive: Date;
  description: string;
  capabilities: string[];
  icon: React.ReactNode;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SpawnedAgentsPage = () => {
  const navigate = useNavigate()
  const { agentService } = useWallet()
  const [agents, setAgents] = useState<SpawnedAgent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<SpawnedAgent | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  
  // Get direct reference to AgentService
  const directAgentService = AgentService.current;

  // Load spawned agents directly from API
  useEffect(() => {
    const loadAgents = async () => {
      setIsLoading(true);
      try {
        console.log('Fetching agents from backend API...');
        
        // Try to fetch from backend API
        const response = await fetch(`${apiBaseUrl}/spawned-agents`);
        
        if (response.ok) {
          const loadedAgents = await response.json();
          console.log('Loaded agents from API:', loadedAgents);
          
          if (!loadedAgents || loadedAgents.length === 0) {
            console.log('No agents returned from API');
            
            // Fallback to direct agent service
            if (directAgentService) {
              console.log('Trying direct agent service as fallback...');
              const serviceAgents = await directAgentService.getSpawnedAgents();
              
              if (serviceAgents && serviceAgents.length > 0) {
                const mappedAgents = serviceAgents.map(agent => ({
                  ...agent,
                  icon: getAgentIcon(agent.type || 'default')
                }));
                setAgents(mappedAgents);
              } else {
                setAgents([]);
              }
            } else {
              setAgents([]);
            }
          } else {
            const mappedAgents = loadedAgents.map(agent => ({
              ...agent,
              icon: getAgentIcon(agent.type || 'default')
            }));
            setAgents(mappedAgents);
          }
        } else {
          console.error('Error fetching agents from API:', await response.text());
          // Fallback to direct agent service
          if (directAgentService) {
            const serviceAgents = await directAgentService.getSpawnedAgents();
            if (serviceAgents) {
              const mappedAgents = serviceAgents.map(agent => ({
                ...agent,
                icon: getAgentIcon(agent.type || 'default')
              }));
              setAgents(mappedAgents);
            }
          }
        }
      } catch (error) {
        console.error('Error loading agents:', error);
        // Fallback to direct agent service
        if (directAgentService) {
          try {
            const serviceAgents = await directAgentService.getSpawnedAgents();
            if (serviceAgents) {
              const mappedAgents = serviceAgents.map(agent => ({
                ...agent,
                icon: getAgentIcon(agent.type || 'default')
              }));
              setAgents(mappedAgents);
            }
          } catch (e) {
            console.error('Fallback also failed:', e);
            setAgents([]);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAgents();
    
    // Refresh agents every 10 seconds
    const interval = setInterval(loadAgents, 10000);
    return () => clearInterval(interval);
  }, [apiBaseUrl, directAgentService]);

  // Get appropriate icon based on agent type
  const getAgentIcon = (type: string) => {
    switch(type.toLowerCase()) {
      case 'market':
        return <BarChart3 className="h-12 w-12 text-blue-500" />;
      case 'staking':
        return <Zap className="h-12 w-12 text-purple-500" />;
      case 'vault':
        return <Wallet className="h-12 w-12 text-green-500" />;
      case 'trading':
        return <TrendingUp className="h-12 w-12 text-orange-500" />;
      case 'research':
        return <Search className="h-12 w-12 text-indigo-500" />;
      case 'portfolio':
        return <PieChart className="h-12 w-12 text-pink-500" />;
      default:
        return <Bot className="h-12 w-12 text-gray-500" />;
    }
  };

  // Format date for display
  const formatDate = (dateString: string | number | Date) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const handleActivateAgent = async (agentId: string) => {
    setIsLoading(true);
    try {
      await directAgentService?.updateAgentStatus(agentId, 'active');
      const updatedAgents = await directAgentService?.getSpawnedAgents() || [];
      setAgents(updatedAgents.map(agent => ({
        ...agent,
        icon: getAgentIcon(agent.type)
      })));
    } catch (error) {
      console.error('Error activating agent:', error);
    }
    setIsLoading(false);
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (confirm("Are you sure you want to delete this agent?")) {
      setIsLoading(true);
      try {
        await directAgentService?.deleteAgent(agentId);
        const updatedAgents = await directAgentService?.getSpawnedAgents() || [];
        setAgents(updatedAgents.map(agent => ({
          ...agent,
          icon: getAgentIcon(agent.type)
        })));
      } catch (error) {
        console.error('Error deleting agent:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'busy': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  }

  const handleSendMessage = async () => {
    if (!selectedAgent || inputMessage.trim() === '') return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: inputMessage };
    setChatMessages(prevMessages => [...prevMessages, userMessage]);
    setInputMessage('');
    
    try {
      // Show loading state
      setChatMessages(prevMessages => [...prevMessages, { role: 'assistant', content: '...' }]);
      
      // Send message to backend
      const response = await fetch(`${apiBaseUrl}/agent-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          message: inputMessage,
          agentType: selectedAgent.type
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Remove loading message and add actual response
        setChatMessages(prevMessages => {
          const newMessages = [...prevMessages];
          newMessages.pop(); // Remove loading message
          return [...newMessages, { role: 'assistant', content: data.response }];
        });
      } else {
        // Handle error
        setChatMessages(prevMessages => {
          const newMessages = [...prevMessages];
          newMessages.pop(); // Remove loading message
          return [...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error processing your request.' }];
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Fallback response if backend fails
      setChatMessages(prevMessages => {
        const newMessages = [...prevMessages];
        newMessages.pop(); // Remove loading message
        
        // Generate a simple response based on agent type
        let response = 'Sorry, I encountered an error processing your request.';
        
        if (selectedAgent.type === 'trading') {
          response = 'As a trading agent, I can help with market analysis and trading strategies. However, I\'m currently having connection issues.';
        } else if (selectedAgent.type === 'vault') {
          response = 'As a vault agent, I can help with managing your investments in Mito vaults. However, I\'m currently having connection issues.';
        }
        
        return [...newMessages, { role: 'assistant', content: response }];
      });
    }
  };

  const handleOpenChat = (agent: SpawnedAgent) => {
    setSelectedAgent(agent);
    setChatOpen(true);
  };

  const handleCloseChat = () => {
    setChatOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/dashboard')}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold flex items-center">
              <Bot className="mr-2 h-6 w-6 text-primary" />
              Spawned Agents
            </h1>
          </div>
          <WalletConnect />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Your Active Agents</h2>
          <p className="text-gray-500 dark:text-gray-400">
            These specialized agents are working for you on the Injective network
          </p>
        </div>

        {/* Agent cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading && <p className="col-span-3 text-center">Loading agents...</p>}
          
          {!isLoading && agents.length === 0 && (
            <div className="col-span-3 text-center p-8 border border-dashed rounded-lg">
              <Bot className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <h3 className="text-lg font-medium mb-1">No agents found</h3>
              <p className="text-gray-500 mb-4">You haven't spawned any agents yet.</p>
              <Button onClick={() => navigate('/dashboard')}>
                Go to Dashboard to spawn agents
              </Button>
            </div>
          )}
          
          {agents.map(agent => (
            <Card key={agent.id} className="overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl flex items-center">
                      {agent.name}
                    </CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${getStatusColor(agent.status)} mr-2`}></span>
                      {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                    </CardDescription>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-full">
                    {agent.icon}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  {agent.description}
                </p>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">CAPABILITIES:</p>
                  <ul className="text-sm space-y-1">
                    {agent.capabilities && agent.capabilities.length > 0 ? (
                      agent.capabilities.map((capability, index) => (
                        <li key={index} className="flex items-center">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></span>
                          {capability}
                        </li>
                      ))
                    ) : (
                      <li className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></span>
                        Default agent capabilities
                      </li>
                    )}
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <div className="text-xs text-gray-500">
                  Last active: {formatDate(agent.lastActive)}
                </div>
                <div className="flex space-x-2">
                  {agent.status !== 'active' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleActivateAgent(agent.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Activate"}
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleDeleteAgent(agent.id)}
                  >
                    Delete
                  </Button>
                  <Button 
                    size="sm" 
                    variant="primary"
                    onClick={() => handleOpenChat(agent)}
                  >
                    Chat
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Create new agent section */}
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">Spawn New Agent</h2>
          <Card className="border border-dashed border-gray-300 dark:border-gray-700 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Bot className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-center text-gray-600 dark:text-gray-300 mb-2">
                Create a new specialized agent to help with specific tasks
              </p>
              <Button className="mt-2">
                Spawn New Agent
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Simple Tailwind Modal for Chat */}
      {chatOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center">
              <div className="flex items-center gap-2">
                {selectedAgent?.icon}
                <div>
                  <h3 className="text-lg font-semibold">Chat with {selectedAgent?.name}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedAgent?.type === 'trading' ? 'Ask about market analysis and trading strategies' : 
                     selectedAgent?.type === 'vault' ? 'Ask about Mito vaults and investment strategies' :
                     'Send messages to your agent'}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleCloseChat}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-10">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                chatMessages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`${
                        message.role === 'user' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      } p-3 rounded-lg max-w-[80%]`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Input Area */}
            <div className="p-4 border-t mt-auto">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex gap-2"
              >
                <Input 
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  autoFocus
                />
                <Button type="submit" size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Dock */}
      <DockIcons />
    </div>
  )
}

export default SpawnedAgentsPage