import WalletConnect from '@/components/WalletConnect';
import  { useState, useCallback,  } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyEdgeChanges,
  applyNodeChanges,
  addEdge,
  Handle,
  Position,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FaSave, FaPlay, FaPause } from 'react-icons/fa';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import DockIcons from '@/components/DockIcons';

// Icons (you'll need to add these to your public folder)
const icons = {
  price: '/icons/price.svg',
  volume: '/icons/volume.svg',
  liquidity: '/icons/liquidity.svg',
  orderbook: '/icons/orderbook.svg',
  trade: '/icons/trade.svg',
  alert: '/icons/alert.svg',
  portfolio: '/icons/portfolio.svg',
  timer: '/icons/timer.svg',
  risk: '/icons/risk.svg',
  ai: '/icons/ai.svg'
};

// Custom Node Components with enhanced UI
const TriggerNode = ({ data }) => (
  <div className="relative bg-white border-2 border-blue-500 rounded-lg p-4 shadow-lg min-w-[250px]">
    {/* Multiple output handles for different conditions */}
    {data.outputs?.map((output, index) => (
      <Handle
        key={index}
        type="source"
        position={Position.Bottom}
        id={`output-${index}`}
        className="w-3 h-3 !bg-blue-500"
        style={{ left: `${(index + 1) * (100 / (data.outputs.length + 1))}%` }}
      />
    ))}
    <div className="flex items-center gap-2 mb-2">
      <img src={data.icon} className="w-6 h-6" alt={data.type} />
      <div className="font-bold text-blue-600">{data.type}</div>
    </div>
    <div className="text-sm text-gray-600">{data.description}</div>
  </div>
);

const ActionNode = ({ data }) => (
  <div className="relative bg-white border-2 border-green-500 rounded-lg p-4 shadow-lg min-w-[250px]">
    {/* Multiple input handles for different conditions */}
    {data.inputs?.map((input, index) => (
      <Handle
        key={index}
        type="target"
        position={Position.Top}
        id={`input-${index}`}
        className="w-3 h-3 !bg-green-500"
        style={{ left: `${(index + 1) * (100 / (data.inputs.length + 1))}%` }}
      />
    ))}
    {/* Output handle for chaining actions */}
    {data.hasOutput && (
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-green-500"
      />
    )}
    <div className="flex items-center gap-2 mb-2">
      <img src={data.icon} className="w-6 h-6" alt={data.type} />
      <div className="font-bold text-green-600">{data.type}</div>
    </div>
    <div className="text-sm text-gray-600">{data.description}</div>
  </div>
);

const nodeTypes = {
  triggerNode: TriggerNode,
  actionNode: ActionNode,
};

// Trigger Categories with rich metadata
const triggerCategories = [
  {
    id: 'market',
    label: 'Market',
    items: [
      {
        id: 'price-change',
        type: 'Price Change',
        icon: icons.price,
        description: 'Trigger on price movements',
        outputs: ['above', 'below', 'between'],
        events: [
          { id: 'price-above', label: 'Price Above', configType: 'number' },
          { id: 'price-below', label: 'Price Below', configType: 'number' },
          { id: 'price-change-percent', label: 'Price Change %', configType: 'percentage' },
          { id: 'price-crossover', label: 'Moving Average Crossover', configType: 'ma-crossover' },
          { id: 'price-momentum', label: 'RSI Condition', configType: 'rsi' },
          { id: 'bollinger-band', label: 'Bollinger Band Break', configType: 'bb' }
        ],
        configFields: [
          { id: 'market', label: 'Market', type: 'market-selector' },
          { id: 'threshold', label: 'Threshold', type: 'number' },
          { id: 'timeframe', label: 'Timeframe', type: 'timeframe-selector' },
          { id: 'comparison', label: 'Comparison', type: 'select', options: ['Above', 'Below', 'Between'] }
        ]
      },
      {
        id: 'volume-alert',
        type: 'Volume Alert',
        icon: icons.volume,
        description: 'Monitor trading volume',
        events: [
          { id: 'volume-spike', label: 'Volume Spike', configType: 'percentage' },
          { id: 'volume-drop', label: 'Volume Drop', configType: 'percentage' },
          { id: 'volume-ma', label: 'Volume MA Cross', configType: 'ma' },
          { id: 'obv-signal', label: 'OBV Signal', configType: 'obv' }
        ],
        configFields: [
          { id: 'market', label: 'Market', type: 'market-selector' },
          { id: 'threshold', label: 'Threshold %', type: 'number' },
          { id: 'window', label: 'Time Window', type: 'timeframe-selector' }
        ]
      }
    ]
  },
  {
    id: 'trading',
    label: 'Trading',
    items: [
      {
        id: 'order-events',
        type: 'Order Events',
        icon: icons.orderbook,
        description: 'Track order activities',
        events: [
          { id: 'order-filled', label: 'Order Filled' },
          { id: 'order-cancelled', label: 'Order Cancelled' },
          { id: 'liquidation-near', label: 'Liquidation Warning' },
          { id: 'margin-call', label: 'Margin Call' }
        ],
        configFields: [
          { id: 'market', label: 'Market', type: 'market-selector' },
          { id: 'side', label: 'Side', type: 'select', options: ['Buy', 'Sell'] },
          { id: 'type', label: 'Order Type', type: 'select', options: ['Market', 'Limit'] }
        ]
      }
    ]
  },
  {
    id: 'risk',
    label: 'Risk Management',
    items: [
      {
        id: 'risk-metrics',
        type: 'Risk Metrics',
        icon: icons.risk,
        description: 'Monitor risk levels',
        events: [
          { id: 'drawdown-alert', label: 'Drawdown Alert', configType: 'percentage' },
          { id: 'exposure-limit', label: 'Exposure Limit', configType: 'amount' },
          { id: 'volatility-spike', label: 'Volatility Spike', configType: 'percentage' },
          { id: 'correlation-break', label: 'Correlation Break', configType: 'correlation' }
        ],
        configFields: [
          { id: 'assets', label: 'Assets', type: 'asset-selector', multiple: true },
          { id: 'threshold', label: 'Risk Threshold', type: 'number' },
          { id: 'timeframe', label: 'Monitoring Window', type: 'timeframe-selector' }
        ]
      },
      {
        id: 'portfolio-metrics',
        type: 'Portfolio Metrics',
        icon: icons.portfolio,
        description: 'Track portfolio health',
        events: [
          { id: 'sharpe-ratio', label: 'Sharpe Ratio Alert', configType: 'number' },
          { id: 'portfolio-beta', label: 'Portfolio Beta', configType: 'number' },
          { id: 'var-breach', label: 'VaR Breach', configType: 'percentage' }
        ],
        configFields: [
          { id: 'portfolio', label: 'Portfolio', type: 'portfolio-selector' },
          { id: 'threshold', label: 'Alert Threshold', type: 'number' },
          { id: 'confidence', label: 'Confidence Level', type: 'percentage' }
        ]
      }
    ]
  },
  {
    id: 'time',
    label: 'Time & Schedule',
    items: [
      {
        id: 'timer-trigger',
        type: 'Timer',
        icon: icons.timer,
        description: 'Time-based triggers',
        events: [
          { id: 'fixed-interval', label: 'Fixed Interval', configType: 'interval' },
          { id: 'cron-schedule', label: 'Cron Schedule', configType: 'cron' },
          { id: 'market-hours', label: 'Market Hours', configType: 'market-hours' }
        ],
        configFields: [
          { id: 'schedule', label: 'Schedule', type: 'schedule-selector' },
          { id: 'timezone', label: 'Timezone', type: 'timezone-selector' },
          { id: 'repeat', label: 'Repeat', type: 'boolean' }
        ]
      }
    ]
  },
  {
    id: 'derivatives',
    label: 'Derivatives',
    items: [
      {
        id: 'perpetual-position',
        type: 'Perpetual Position',
        icon: icons.trade,
        description: 'Monitor perpetual positions',
        outputs: ['liquidation', 'profit', 'loss'],
        events: [
          { id: 'liquidation-risk', label: 'Liquidation Risk', configType: 'percentage' },
          { id: 'take-profit', label: 'Take Profit Hit', configType: 'price' },
          { id: 'stop-loss', label: 'Stop Loss Hit', configType: 'price' },
          { id: 'funding-rate', label: 'Funding Rate', configType: 'percentage' }
        ],
        configFields: [
          { id: 'market', label: 'Perpetual Market', type: 'market-selector' },
          { id: 'position', label: 'Position Side', type: 'select', options: ['Long', 'Short'] },
          { id: 'threshold', label: 'Alert Threshold', type: 'number' }
        ]
      }
    ]
  }
];

// Action Categories with rich metadata
const actionCategories = [
  {
    id: 'trading',
    label: 'Trading',
    items: [
      {
        id: 'spot-order',
        type: 'Spot Order',
        icon: icons.trade,
        description: 'Place spot orders',
        inputs: ['trigger'],
        hasOutput: true,
        configFields: [
          { id: 'market', label: 'Market', type: 'market-selector' },
          { id: 'side', label: 'Side', type: 'select', options: ['Buy', 'Sell'] },
          { id: 'type', label: 'Order Type', type: 'select', options: ['Market', 'Limit', 'Stop', 'Take-Profit'] },
          { id: 'quantity', label: 'Quantity', type: 'number' },
          { id: 'price', label: 'Price', type: 'number', showWhen: { type: 'Limit' } },
          { id: 'timeInForce', label: 'Time In Force', type: 'select', options: ['GTC', 'IOC', 'FOK'] }
        ]
      },
      {
        id: 'derivative-order',
        type: 'Derivative Order',
        icon: icons.trade,
        description: 'Place derivative orders',
        inputs: ['trigger'],
        hasOutput: true,
        configFields: [
          { id: 'market', label: 'Market', type: 'market-selector' },
          { id: 'side', label: 'Side', type: 'select', options: ['Buy', 'Sell'] },
          { id: 'type', label: 'Order Type', type: 'select', options: ['Market', 'Limit', 'Stop', 'Take-Profit'] },
          { id: 'quantity', label: 'Quantity', type: 'number' },
          { id: 'leverage', label: 'Leverage', type: 'number' },
          { id: 'margin', label: 'Margin', type: 'number' }
        ]
      },
      {
        id: 'conditional-order',
        type: 'Conditional Order',
        icon: icons.trade,
        description: 'Place orders with conditions',
        inputs: ['price', 'volume'],
        hasOutput: true,
        configFields: [
          { id: 'market', label: 'Market', type: 'market-selector' },
          { id: 'mainOrder', label: 'Main Order', type: 'order-config' },
          { id: 'conditions', label: 'Conditions', type: 'condition-builder' },
          { id: 'childOrders', label: 'Child Orders', type: 'order-list' }
        ]
      }
    ]
  },
  {
    id: 'risk',
    label: 'Risk Management',
    items: [
      {
        id: 'stop-loss',
        type: 'Stop Loss',
        icon: icons.risk,
        description: 'Automated stop loss',
        configFields: [
          { id: 'type', label: 'Stop Type', type: 'select', options: ['Fixed', 'Trailing', 'ATR-Based'] },
          { id: 'distance', label: 'Stop Distance', type: 'number' },
          { id: 'size', label: 'Position Size', type: 'number' },
          { id: 'market', label: 'Market', type: 'market-selector' }
        ]
      },
      {
        id: 'hedge',
        type: 'Hedge Position',
        icon: icons.portfolio,
        description: 'Automated hedging',
        configFields: [
          { id: 'instrument', label: 'Hedge Instrument', type: 'instrument-selector' },
          { id: 'ratio', label: 'Hedge Ratio', type: 'number' },
          { id: 'method', label: 'Method', type: 'select', options: ['Direct', 'Cross', 'Basket'] }
        ]
      }
    ]
  },
  {
    id: 'ai',
    label: 'AI & Analytics',
    items: [
      {
        id: 'sentiment-analysis',
        type: 'Sentiment Analysis',
        icon: icons.ai,
        description: 'AI-powered market sentiment',
        configFields: [
          { id: 'sources', label: 'Data Sources', type: 'multi-select', options: ['News', 'Social', 'On-Chain'] },
          { id: 'model', label: 'AI Model', type: 'select', options: ['Basic', 'Advanced', 'Custom'] },
          { id: 'frequency', label: 'Update Frequency', type: 'interval-selector' }
        ]
      },
      {
        id: 'prediction',
        type: 'Price Prediction',
        icon: icons.ai,
        description: 'ML-based price forecasting',
        configFields: [
          { id: 'model', label: 'Model Type', type: 'select', options: ['LSTM', 'Prophet', 'Ensemble'] },
          { id: 'timeframe', label: 'Prediction Timeframe', type: 'timeframe-selector' },
          { id: 'confidence', label: 'Confidence Threshold', type: 'percentage' }
        ]
      }
    ]
  },
  {
    id: 'notifications',
    label: 'Notifications',
    items: [
      {
        id: 'send-alert',
        type: 'Send Alert',
        icon: icons.alert,
        description: 'Send notifications',
        configFields: [
          { id: 'channel', label: 'Channel', type: 'select', options: ['Email', 'Telegram', 'Discord', 'Webhook'] },
          { id: 'message', label: 'Message Template', type: 'text-template' },
          { id: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High'] },
          { id: 'format', label: 'Format', type: 'select', options: ['Text', 'Rich', 'Custom'] }
        ]
      }
    ]
  }
];

// Enhanced Sidebar Component with Grid Layout
const Sidebar = ({ activeTab, setActiveTab, onDragStart }) => {
  const categories = activeTab === 'triggers' ? triggerCategories : actionCategories;

  return (
    <div className="w-64 bg-white border-r border-gray-200 py-5 flex flex-col h-full">
      {/* Back Button */}
      <div className="px-4 ">
        <Link 
          to="/dashboard" 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors  rounded-lg hover:bg-gray-50"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Tab Switcher */}
      <div className="px-4 mb-4">
        <div className="flex rounded-lg bg-gray-100 p-1">
          <button
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'triggers' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('triggers')}
          >
            Triggers
          </button>
          <button
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'actions' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('actions')}
          >
            Actions
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="flex-1 px-4 overflow-y-auto">
        {categories.map((category) => (
          <div key={category.id} className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {category.label}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, activeTab === 'triggers' ? 'triggerNode' : 'actionNode', item)}
                  className={`flex flex-col items-center p-3 rounded-lg border border-gray-200 cursor-move bg-white transition-all hover:shadow-md ${
                    activeTab === 'triggers' ? 'hover:border-blue-500' : 'hover:border-green-500'
                  }`}
                >
                  <img src={item.icon} alt={item.type} className="w-8 h-8 mb-2" />
                  <span className="text-xs font-medium text-center">{item.type}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Enhanced Node Configuration Panel
const NodeConfigPanel = ({ node }) => {
  if (!node) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <p>Select a node to configure it</p>
        </div>
      </div>
    );
  }

  const nodeData = node.data;
  const allItems = [...triggerCategories, ...actionCategories]
    .flatMap(category => category.items)
    .find(item => item.id === nodeData.id);

  if (!allItems) return null;

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-6 py-20 overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <img src={nodeData.icon} alt={nodeData.type} className="w-8 h-8" />
        <div>
          <h3 className="font-bold text-lg">{nodeData.type}</h3>
          <p className="text-sm text-gray-600">{nodeData.description}</p>
        </div>
      </div>

      {/* Quick Setup Guide */}
      {nodeData.id === 'price-change' && (
        <div className="mb-6 bg-blue-50 p-4 rounded-md">
          <h4 className="font-medium text-blue-800 mb-2">Quick Setup: Price Drop Trigger</h4>
          <ol className="text-sm text-blue-600 space-y-2">
            <li>1. Select BTC/USDT in Market</li>
            <li>2. Choose "Price Change %" event</li>
            <li>3. Set threshold to -5%</li>
            <li>4. Set timeframe to desired window</li>
          </ol>
        </div>
      )}

      {nodeData.id === 'volume-alert' && (
        <div className="mb-6 bg-blue-50 p-4 rounded-md">
          <h4 className="font-medium text-blue-800 mb-2">Quick Setup: Volume Spike</h4>
          <ol className="text-sm text-blue-600 space-y-2">
            <li>1. Select BTC/USDT in Market</li>
            <li>2. Choose "Volume Spike" event</li>
            <li>3. Set spike threshold (e.g., 200%)</li>
            <li>4. Match timeframe with price trigger</li>
          </ol>
        </div>
      )}

      {nodeData.id === 'spot-order' && (
        <div className="mb-6 bg-blue-50 p-4 rounded-md">
          <h4 className="font-medium text-blue-800 mb-2">Quick Setup: Buy Order</h4>
          <ol className="text-sm text-blue-600 space-y-2">
            <li>1. Select BTC/USDT in Market</li>
            <li>2. Choose "Buy" side</li>
            <li>3. Set order type (Market for instant)</li>
            <li>4. Enter quantity to buy</li>
          </ol>
        </div>
      )}

      {/* Events Section for Triggers */}
      {allItems.events && (
        <div className="mb-6">
          <h4 className="font-medium text-sm text-gray-700 mb-2">Event Type</h4>
          <select className="w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {allItems.events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Configuration Fields */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-gray-700">Configuration</h4>
        {allItems.configFields.map((field) => (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.id === 'threshold' && nodeData.id === 'price-change' && (
                <span className="text-xs text-gray-500 ml-2">(e.g., -5 for 5% drop)</span>
              )}
            </label>
            {field.type === 'select' ? (
              <select className="w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.type === 'number' ? (
              <input
                type="number"
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter ${field.label.toLowerCase()}`}
              />
            ) : field.type === 'market-selector' ? (
              <select className="w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="BTC/USDT">BTC/USDT</option>
                <option value="ETH/USDT">ETH/USDT</option>
                <option value="INJ/USDT">INJ/USDT</option>
              </select>
            ) : field.type === 'timeframe-selector' ? (
              <select className="w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="1m">1 minute</option>
                <option value="5m">5 minutes</option>
                <option value="15m">15 minutes</option>
                <option value="1h">1 hour</option>
                <option value="4h">4 hours</option>
                <option value="1d">1 day</option>
              </select>
            ) : (
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter ${field.label.toLowerCase()}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Connection Help */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-medium text-sm text-gray-700 mb-2">Connections</h4>
        {nodeData.inputs && (
          <div className="text-sm text-gray-600">
            <p>Input Handles: {nodeData.inputs.join(', ')}</p>
            <p className="mt-1 text-xs">Connect triggers to these inputs</p>
          </div>
        )}
        {nodeData.outputs && (
          <div className="text-sm text-gray-600 mt-2">
            <p>Output Handles: {nodeData.outputs.join(', ')}</p>
            <p className="mt-1 text-xs">Connect these to action nodes</p>
          </div>
        )}
      </div>
    </div>
  );
};

const BuilderPage = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [workflowName, setWorkflowName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('triggers');

  // Edge styling
  const edgeOptions = {
    style: { stroke: '#4F46E5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#4F46E5' },
    animated: true
  };

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, ...edgeOptions }, eds)),
    [edgeOptions]
  );

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow-type');
      const data = JSON.parse(event.dataTransfer.getData('application/reactflow-data'));

      const reactFlowBounds = document.querySelector('.react-flow').getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNode = {
        id: `${type}-${nodes.length + 1}`,
        type,
        position,
        data: { ...data },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [nodes]
  );

  const onNodeDragStart = (event, nodeType, data) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.setData('application/reactflow-data', JSON.stringify(data));
    event.dataTransfer.effectAllowed = 'move';
  };

  // Save workflow function
  const saveWorkflow = useCallback(async () => {
    setIsSaving(true);
    try {
      const workflow = {
        name: workflowName,
        nodes,
        edges,
        createdAt: new Date().toISOString(),
        status: isRunning ? 'active' : 'paused'
      };
      
      // TODO: Save to backend/localStorage
      localStorage.setItem(`workflow_${workflow.name}`, JSON.stringify(workflow));
      
      // Show success message
      alert('Workflow saved successfully!');
      
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Error saving workflow');
    }
    setIsSaving(false);
  }, [workflowName, nodes, edges, isRunning]);

  const toggleWorkflow = useCallback(() => {
    setIsRunning(!isRunning);
  }, [isRunning]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header with WalletConnect and Controls */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <WalletConnect />
            <div className="h-6 w-px bg-gray-300" /> {/* Divider */}
            <input
              type="text"
              placeholder="Enter Workflow Name"
              className="border border-gray-300 rounded-md px-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleWorkflow}
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                isRunning 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-green-100 text-green-600 hover:bg-green-200'
              }`}
            >
              {isRunning ? (
                <>
                  <FaPause className="w-4 h-4" />
                  <span>Pause Workflow</span>
                </>
              ) : (
                <>
                  <FaPlay className="w-4 h-4" />
                  <span>Run Workflow</span>
                </>
              )}
            </button>
            <button
              onClick={saveWorkflow}
              disabled={isSaving || !workflowName}
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                isSaving || !workflowName
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}
            >
              <FaSave className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Workflow'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onDragStart={onNodeDragStart} />
        <div className="flex-1 flex flex-col">
          <div className="h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onNodeClick={(_, node) => setSelectedNode(node)}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={edgeOptions}
              fitView
            >
              <Background />
              <Controls />
            </ReactFlow>
          </div>
        </div>
        <NodeConfigPanel node={selectedNode} />
        <DockIcons />
      </div>
    </div>
  );
};

export default BuilderPage;