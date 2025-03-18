import mongoose from 'mongoose';

const spawnedAgentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'idle', 'busy'],
    default: 'active'
  },
  description: {
    type: String,
    default: ''
  },
  capabilities: {
    type: [String],
    default: []
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  tasks: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: String,
    required: false
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const SpawnedAgentModel = mongoose.model('SpawnedAgent', spawnedAgentSchema);

export default SpawnedAgentModel;
