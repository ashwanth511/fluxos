import express from 'express';
import SpawnedAgentModel from '../models/SpawnedAgentModel';

const router = express.Router();

// Get all spawned agents
router.get('/', async (req, res) => {
  try {
    const agents = await SpawnedAgentModel.find({});
    res.json(agents);
  } catch (error) {
    console.error('Error fetching spawned agents:', error);
    res.status(500).json({ error: 'Failed to fetch spawned agents' });
  }
});

// Get a specific spawned agent
router.get('/:id', async (req, res) => {
  try {
    const agent = await SpawnedAgentModel.findOne({ id: req.params.id });
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    console.error('Error fetching spawned agent:', error);
    res.status(500).json({ error: 'Failed to fetch spawned agent' });
  }
});

// Create a new spawned agent
router.post('/', async (req, res) => {
  try {
    const newAgent = new SpawnedAgentModel(req.body);
    await newAgent.save();
    res.status(201).json(newAgent);
  } catch (error) {
    console.error('Error creating spawned agent:', error);
    res.status(500).json({ error: 'Failed to create spawned agent' });
  }
});

// Update a spawned agent
router.put('/:id', async (req, res) => {
  try {
    const updatedAgent = await SpawnedAgentModel.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );
    if (!updatedAgent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(updatedAgent);
  } catch (error) {
    console.error('Error updating spawned agent:', error);
    res.status(500).json({ error: 'Failed to update spawned agent' });
  }
});

// Delete a spawned agent
router.delete('/:id', async (req, res) => {
  try {
    const result = await SpawnedAgentModel.findOneAndDelete({ id: req.params.id });
    if (!result) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting spawned agent:', error);
    res.status(500).json({ error: 'Failed to delete spawned agent' });
  }
});

// Add a new endpoint for agent chat
router.post('/agent-chat', async (req, res) => {
  try {
    const { agentId, message, agentType } = req.body;
    
    if (!agentId || !message) {
      return res.status(400).json({ error: 'Agent ID and message are required' });
    }
    
    // Find the agent
    const agent = await SpawnedAgentModel.findOne({ id: agentId });
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Generate response based on agent type
    let response = '';
    
    if (agentType === 'trading') {
      response = generateTradingResponse(message);
    } else if (agentType === 'vault') {
      response = generateVaultResponse(message);
    } else {
      response = `I'm your ${agentType || 'personal'} agent. How can I assist you?`;
    }
    
    // Update agent's last active timestamp
    agent.lastActive = new Date();
    await agent.save();
    
    res.json({ response });
  } catch (error) {
    console.error('Error in agent chat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to generate trading agent responses
function generateTradingResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('market') || lowerMessage.includes('price')) {
    return 'Based on my analysis, the market is showing mixed signals. INJ is currently trading at $18.45, up 2.3% in the last 24 hours. Volume is increasing, which could indicate a potential breakout.';
  } else if (lowerMessage.includes('trade') || lowerMessage.includes('buy') || lowerMessage.includes('sell')) {
    return 'I recommend a cautious approach to trading in the current market conditions. Consider setting stop losses at key support levels and taking profits at resistance zones. Would you like me to analyze a specific trading pair?';
  } else if (lowerMessage.includes('strategy')) {
    return 'For the current market conditions, I recommend a dollar-cost averaging strategy for accumulation, with focus on high-quality assets like INJ, ATOM, and OSMO that have strong fundamentals and ecosystem growth.';
  } else {
    return 'As your trading agent, I can help with market analysis, trading strategies, and portfolio management. What specific information are you looking for?';
  }
}

// Helper function to generate vault agent responses
function generateVaultResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('vault') || lowerMessage.includes('apy')) {
    return 'The NEPT/INJ vault currently offers the highest APY at 79.22%. This is followed by the INJ/USDT vault at 42.18% and the ATOM/INJ vault at 38.75%. Would you like more details on any specific vault?';
  } else if (lowerMessage.includes('risk') || lowerMessage.includes('safe')) {
    return 'Mito vaults have different risk levels. The INJ/USDT vault has the lowest risk profile with a rating of 2/5, while the NEPT/INJ vault has a higher risk rating of 4/5 due to potential impermanent loss in volatile markets.';
  } else if (lowerMessage.includes('deposit') || lowerMessage.includes('invest')) {
    return 'To deposit into a Mito vault, you need to provide liquidity to the corresponding pool first. Based on your portfolio, I recommend starting with the INJ/USDT vault which offers a good balance of yield and risk.';
  } else {
    return 'As your vault agent, I can help you navigate Mito vaults, compare APYs, assess risks, and optimize your yield farming strategy. What would you like to know about vaults?';
  }
}

export default router;
