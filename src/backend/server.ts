import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express from 'express';
import cors from 'cors';
import { connectToDatabase } from './db/index.js';
import TokenModel from './models/TokenModel.js';
import AgentModel from './models/AgentModel.js';
import { createTokenWithAgent, getAllTokens, getTokenByDenom } from './api/tokenService.js';
import multer from 'multer';
import { uploadToIPFS } from './ipfs.js';
import { chatWithAgent } from './ai/index.js';

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
  } catch (error) {
    console.error('Error creating token:', error);
    res.status(500).json({ error: error.message || 'Failed to create token' });
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
    
    // Generate response using AI
    const response = await chatWithAgent(agent.traits, message, conversationHistory);
    
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
  } catch (error) {
    console.error('Error chatting with agent:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
