import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express from 'express';
import cors from 'cors';
import { connectToDatabase } from './db/index.js';
import TokenModel from './models/TokenModel.js';
import AgentModel from './models/AgentModel.js';
import { createTokenWithAgent, getAllTokens, getTokenByDenom, getTokenById, getTokensByCreator } from './api/tokenService.js';
import multer from 'multer';
import { uploadToIPFS } from './ipfs.js';
import { chatWithAgent } from './ai/index.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;
console.log("mongodb url"+ process.env.MONGODB_URI);
// Middleware
app.use(cors());
app.use(express.json());

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fluxos';
connectToDatabase(MONGODB_URI);

// Routes
app.get('/api/tokens', async (req, res) => {
  try {
    const tokens = await getAllTokens();
    res.json(tokens);
  } catch (error) {
    console.error('Error fetching tokens:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

// Get token by ID - this must come before the denom route
app.get('/api/tokens/id/:id', async (req, res) => {
  try {
    const token = await getTokenById(req.params.id);
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }
    res.json(token);
  } catch (error) {
    console.error('Error fetching token by ID:', error);
    res.status(500).json({ error: 'Failed to fetch token' });
  }
});

// Get tokens by creator address
app.get('/api/tokens/creator/:address', async (req, res) => {
  try {
    const tokens = await getTokensByCreator(req.params.address);
    res.json(tokens);
  } catch (error) {
    console.error('Error fetching tokens by creator:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

app.get('/api/tokens/:denom', async (req, res) => {
  try {
    const token = await getTokenByDenom(req.params.denom);
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }
    res.json(token);
  } catch (error) {
    console.error('Error fetching token:', error);
    res.status(500).json({ error: 'Failed to fetch token' });
  }
});

app.post('/api/tokens', async (req, res) => {
  try {
    console.log('Received token creation request:', JSON.stringify(req.body, null, 2));
    const result = await createTokenWithAgent(req.body);
    res.status(201).json(result);
  } catch (error: unknown) {
    console.error('Error creating token:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create token';
    res.status(500).json({ error: errorMessage });
  }
});

// File upload endpoint
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const imageBuffer = req.file.buffer;
    const ipfsUrl = await uploadToIPFS(imageBuffer);
    
    res.json({ url: ipfsUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Chat with token agent endpoint
app.post('/api/tokens/:tokenId/chat', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { message, userId, conversationHistory = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Find the agent associated with the token
    const agent = await AgentModel.findOne({ tokenId });
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found for this token' });
    }
    
    // Get the token information to pass to the agent
    const token = await TokenModel.findById(tokenId);
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    // Enhance agent traits with token information
    const enhancedTraits = {
      ...agent.traits,
      tokenName: token.name,
      tokenSymbol: token.symbol,
      tokenDescription: token.description,
      tokenCreator: token.creator,
      tokenSupply: token.supply,
      tokenDenom: token.denom
    };
    
    try {
      // Generate response using AI with enhanced traits
      const response = await chatWithAgent(enhancedTraits, message, conversationHistory);
      
      // Save the conversation
      let conversation = agent.conversations.find(conv => conv.userId === userId);
      if (!conversation) {
        conversation = { userId, messages: [] };
        agent.conversations.push(conversation);
      }
      
      // Add user message and AI response to conversation
      conversation.messages.push(
        { role: 'user', content: message, timestamp: new Date() },
        { role: 'assistant', content: response, timestamp: new Date() }
      );
      
      await agent.save();
      
      res.json({ response });
    } catch (aiError: unknown) {
      console.error('Error generating AI response:', aiError);
      const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown AI error';
      
      // Create a fallback response based on agent traits
      const fallbackResponse = generateFallbackResponse(enhancedTraits, message);
      
      // Save the conversation with fallback response
      let conversation = agent.conversations.find(conv => conv.userId === userId);
      if (!conversation) {
        conversation = { userId, messages: [] };
        agent.conversations.push(conversation);
      }
      
      // Add user message and fallback response to conversation
      conversation.messages.push(
        { role: 'user', content: message, timestamp: new Date() },
        { role: 'assistant', content: fallbackResponse, timestamp: new Date() }
      );
      
      await agent.save();
      
      // Return the fallback response
      res.json({ 
        response: fallbackResponse,
        warning: 'AI service unavailable, using fallback response'
      });
    }
  } catch (error: unknown) {
    console.error('Error processing chat request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    res.status(500).json({ 
      error: 'Failed to process chat request',
      message: errorMessage
    });
  }
});

// Generate a fallback response when AI is unavailable
function generateFallbackResponse(traits: any, userMessage: string): string {
  const tokenName = traits.tokenName || 'this token';
  const tokenSymbol = traits.tokenSymbol || 'TOKEN';
  const personality = traits.personality || 'helpful';
  
  const fallbackResponses = [
    `As the dedicated representative for ${tokenName} (${tokenSymbol}) with a ${personality} approach, I'm experiencing connection issues with my knowledge base. I'd be happy to answer your question about ${tokenName} once the connection is restored. Please try again in a moment.`,
    
    `I apologize for the inconvenience. As ${tokenName}'s AI agent, I'm currently unable to access my complete knowledge base. Your question about "${userMessage.substring(0, 30)}..." is important, and I'll be able to assist you with ${tokenName}-related information once the service is restored.`,
    
    `Thank you for your interest in ${tokenName} (${tokenSymbol}). I'm currently operating in fallback mode due to technical limitations. Please try again later for a more detailed response about ${tokenName}'s features and benefits.`,
    
    `As ${tokenName}'s dedicated agent, I'm temporarily unable to provide detailed information about this token. The ${tokenName} team is working to restore full functionality as soon as possible. Please check back shortly for complete information about ${tokenSymbol}.`
  ];
  
  // Return a random fallback response
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
}

// Get conversation history
app.get('/api/tokens/:tokenId/chat/:userId', async (req, res) => {
  try {
    const { tokenId, userId } = req.params;
    
    // Find the agent associated with the token
    const agent = await AgentModel.findOne({ tokenId });
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found for this token' });
    }
    
    // Find the conversation for this user
    const conversation = agent.conversations.find(conv => conv.userId === userId);
    if (!conversation) {
      return res.json({ messages: [] });
    }
    
    res.json({ messages: conversation.messages });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// AI Assistant for token creation and trading strategies
app.post('/api/assistant/chat', async (req, res) => {
  try {
    const { message, walletAddress, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`Received message from ${walletAddress || 'unknown user'}: ${message}`);

    // Get user's tokens if wallet address is provided
    let userTokens: any[] = [];
    if (walletAddress) {
      try {
        const tokens = await TokenModel.find({ creatorAddress: walletAddress });
        userTokens = tokens.map(token => ({
          name: token.name,
          symbol: token.symbol,
          supply: token.supply,
          description: token.description,
          createdAt: token.createdAt
        }));
      } catch (err) {
        console.error('Error fetching user tokens:', err);
      }
    }

    // Create context for the AI
    const contextBuilder = [
      `You are a AI assistant for the FluxOS an operative system built for trading token cretaion and many more things on Injective Protocol.`,
      `Current date: ${new Date().toISOString().split('T')[0]}`,
      `User wallet address: ${walletAddress || 'Not connected'}`,
    ];

    // Add token information if available
    if (userTokens.length > 0) {
      contextBuilder.push(`User has created the following tokens:`);
      userTokens.forEach(token => {
        contextBuilder.push(`- ${token.name} (${token.symbol}): ${token.supply} tokens, Created: ${new Date(token.createdAt).toLocaleDateString()}`);
      });
    } else if (walletAddress) {
      contextBuilder.push(`User has not created any tokens yet.`);
    }

    // Add capabilities information
    contextBuilder.push(`
You are a concise AI assistant for the FluxOS Token Creation Platform on Injective Protocol.
IMPORTANT: Keep all responses brief, direct, and to the point. Avoid lengthy explanations.

You can help with:
1. Token creation and customization
2. Trading strategies on Injective Protocol
3. Staking and yield farming advice
4. Injective Protocol features and capabilities
5. Token agent personality creation

When asked about yield farming, staking, or trading strategies, provide SPECIFIC numbers and options available on Injective.
For example: "Top yield farms on Injective: Astroport INJ-USDT pool (15-20% APY), Helix Finance (8-12% APY), etc."

IMPORTANT: Follow this specific conversation flow for token creation:

1. When a user asks about creating a token, ask for token details (name, symbol, supply, description).
2. After receiving token details, respond with TOKEN_DATA format.
3. Then immediately ask about agent personality traits.
4. After receiving agent details, respond with AGENT_DATA format.
5. Then ask if they want to launch the token.
6. When they confirm, include "launch token" in your response.

For token creation, wrap your response in TOKEN_DATA: and END_TOKEN_DATA tags with JSON data inside.
Example:
TOKEN_DATA:
{
  "name": "Example Token",
  "symbol": "EXT",
  "supply": "1000000",
  "description": "A utility token for the Example platform"
}
END_TOKEN_DATA

For agent creation, wrap your response in AGENT_DATA: and END_AGENT_DATA tags with JSON data inside.
Example:
AGENT_DATA:
{
  "personality": "Friendly and helpful",
  "background": "Financial advisor with expertise in DeFi",
  "specialties": "Trading strategies, token economics",
  "interests": "DeFi, yield farming, market analysis",
  "communicationStyle": "Clear, concise, and educational",
  "knowledgeDomains": "Finance, blockchain, Injective Protocol"
}
END_AGENT_DATA

When the user says "launch" or "launch token", respond with: "Launching your token now. Please approve the transaction in your wallet. launch token"

REMEMBER: Be extremely concise. Limit responses to 3-5 sentences maximum unless specific details are requested.`);
    
    const context = contextBuilder.join('\n');

    // Build the prompt with context and conversation history
    let fullPrompt = `${context}\n\n`;
    
    // Add conversation history
    if (conversationHistory.length > 0) {
      fullPrompt += "Previous conversation:\n";
      conversationHistory.forEach((msg: { role: string; content: string }) => {
        const role = msg.role === 'assistant' ? 'Assistant' : 'User';
        fullPrompt += `${role}: ${msg.content}\n`;
      });
    }
    
    // Add the current user message
    fullPrompt += `\nUser: ${message}\nAssistant:`;

    // Generate AI response
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || 'AIzaSyCej6Iyr0KGpID2pnKqB54elsTX6p5xHDc');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Add specific instructions for response format
    fullPrompt = `${fullPrompt}\n\nIMPORTANT INSTRUCTIONS FOR YOUR RESPONSE:
1. Be extremely concise and direct. Maximum 3-5 sentences.
2. Provide specific information, numbers, and facts when asked about yield farming, trading, or staking.
3. If you don't know exact numbers, provide realistic ranges based on current market conditions.
4. Avoid disclaimers, lengthy explanations, and unnecessary context.
5. Focus on answering exactly what was asked, nothing more.
6. For yield farming questions, always mention specific pools like: "Astroport INJ-USDT (15-20% APY), Helix Finance (8-12% APY)".
7. For token creation questions, provide the TOKEN_DATA format immediately.
8. Follow the token creation conversation flow precisely:
   - Ask for token details
   - Provide TOKEN_DATA
   - Ask for agent details
   - Provide AGENT_DATA
   - Ask for launch confirmation
   - Include "launch token" in response when confirmed
9. When the user says "launch" or "launch token", respond with: "Launching your token now. Please approve the transaction in your wallet. launch token"

Now please respond to the user's message:`;
    
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: fullPrompt }]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    const response = result.response;
    const text = response.text();

    console.log('AI response:', text.substring(0, 100) + '...');

    return res.json({ response: text });
  } catch (error) {
    console.error('Error in AI chat:', error);
    return res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
