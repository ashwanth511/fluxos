import { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Position,
  MarkerType,
  Handle,
  Node,
  Edge,
  ReactFlowInstance
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Link } from 'react-router-dom';
import { ChevronLeft, Play, Pause, Save } from 'lucide-react';
import WalletConnect from "@/components/WalletConnect";
import { ChainId } from '@injectivelabs/ts-types';
import {Network} from '@injectivelabs/networks'
import { WalletStrategy } from '@/Utils/WalletStrategy';
import { PriceMonitoringService } from '@/services/PriceMonitoringService';
import { getNetworkEndpoints } from '@injectivelabs/networks';
import DockIcons from '@/components/DockIcons'
const CHAIN_ID=ChainId
const NETWORK=Network
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

// Custom Node Components
const TriggerNode = ({ data }: { data: any }) => (
  <div className="relative bg-white border-2 border-blue-500 rounded-lg p-4 shadow-lg min-w-[250px]">
    <Handle
      type="target"
      position={Position.Top}
      className="w-3 h-3 !bg-blue-500"
    />
    <div className="flex items-center gap-2 mb-2">
      <img src={data.icon} className="w-6 h-6" alt={data.type} />
      <div className="font-bold text-blue-600">{data.type}</div>
    </div>
    <div className="text-sm text-gray-600">{data.description}</div>
    <Handle
      type="source"
      position={Position.Bottom}
      className="w-3 h-3 !bg-blue-500"
    />
  </div>
);

const ActionNode = ({ data }: { data: any }) => (
  <div className="relative bg-white border-2 border-green-500 rounded-lg p-4 shadow-lg min-w-[250px]">
    <Handle
      type="target"
      position={Position.Top}
      className="w-3 h-3 !bg-green-500"
    />
    <div className="flex items-center gap-2 mb-2">
      <img src={data.icon} className="w-6 h-6" alt={data.type} />
      <div className="font-bold text-green-600">{data.type}</div>
    </div>
    <div className="text-sm text-gray-600">{data.description}</div>
    {data.hasOutput && (
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-green-500"
      />
    )}
  </div>
);

// Define node types outside the component
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
          { id: 'price', label: 'Price (0 for market)', type: 'number', showWhen: { type: 'Limit' } },
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
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
      {/* Back Button */}
      <div className="p-4 border-b border-gray-200">
        <Link 
          to="/dashboard" 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50 p-2"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Tab Switcher */}
      <div className="p-4 border-b border-gray-200">
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

      {/* Draggable Items */}
      <div className="flex-1 p-4 space-y-6">
        {categories.map((category) => (
          <div key={category.id}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {category.label}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(event: React.DragEvent<HTMLDivElement>) => {
                    event.dataTransfer.setData('application/reactflow-type', 
                      activeTab === 'triggers' ? 'triggerNode' : 'actionNode'
                    );
                    event.dataTransfer.setData('application/reactflow-data', 
                      JSON.stringify(item)
                    );
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  className={`flex flex-col items-center p-3 rounded-lg border cursor-move bg-white transition-all hover:shadow-md ${
                    activeTab === 'triggers' 
                      ? 'border-blue-200 hover:border-blue-500' 
                      : 'border-green-200 hover:border-green-500'
                  }`}
                >
                  <img src={item.icon} alt={item.type} className="w-8 h-8 mb-2" />
                  <span className="text-xs font-medium text-center text-gray-700">{item.type}</span>
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
const NodeConfigPanel = ({ node }: { node: Node | null }) => {
  if (!node) {
    return (
      <div className="w-64 bg-white border-l border-gray-200 mt-4 overflow-y-auto">
        <div className="text-center text-gray-500  mt-8 py-8">
          Select a node to configure
        </div>
      </div>
    );
  }

  // Get the appropriate configuration fields based on node type and data
  const getConfigFields = () => {
    if (node.type === 'triggerNode') {
      if (node.data.type === 'Price Change') {
        return [
          { id: 'market', label: 'Market', type: 'market-selector' },
          { id: 'condition', label: 'Condition', type: 'select', options: ['Above', 'Below', 'Between'] },
          { id: 'price', label: 'Price', type: 'number' },
        ];
      } else if (node.data.type === 'Time Interval') {
        return [
          { id: 'interval', label: 'Interval', type: 'timeframe-selector' },
        ];
      }
    } else if (node.type === 'actionNode') {
      if (node.data.type === 'Spot Order') {
        return [
          { id: 'market', label: 'Market', type: 'market-selector' },
          { id: 'side', label: 'Side', type: 'select', options: ['Buy', 'Sell'] },
          { id: 'quantity', label: 'Quantity', type: 'number' },
          { id: 'price', label: 'Price (0 for market)', type: 'number', showWhen: { type: 'Limit' } },
        ];
      } else if (node.data.type === 'Notification') {
        return [
          { id: 'message', label: 'Message', type: 'text' },
          { id: 'channel', label: 'Channel', type: 'select', options: ['Email', 'SMS', 'Telegram'] },
        ];
      }
    }
    return [];
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    // Update the node data with the new field value
    node.data = {
      ...node.data,
      [fieldId]: value
    };
    
    console.log(`Updated node ${node.id} field ${fieldId} to ${value}`);
  };

  const fields = getConfigFields();
  const allItems = {
    events: node.type === 'triggerNode' ? [
      { id: 'price_change', label: 'Price Change' },
      { id: 'time_interval', label: 'Time Interval' },
      { id: 'wallet_event', label: 'Wallet Event' },
    ] : null,
    actions: node.type === 'actionNode' ? [
      { id: 'spot_order', label: 'Spot Order' },
      { id: 'notification', label: 'Notification' },
      { id: 'wallet_action', label: 'Wallet Action' },
    ] : null,
  };

  return (
    <div className="w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h3 className="font-bold text-lg mb-4">Node Configuration</h3>
      
      <div className="mb-4">
        <h4 className="font-medium text-sm text-gray-700 mb-2">Node Type</h4>
        <div className="bg-gray-100 rounded-md px-3 py-2 text-sm">
          {node.type === 'triggerNode' ? 'Trigger' : 'Action'}
        </div>
      </div>
      
      {allItems.events && (
        <div className="mb-6">
          <h4 className="font-medium text-sm text-gray-700 mb-2">Event Type</h4>
          <select 
            className="w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={node.data.type === 'Price Change' ? 'price_change' : 
                  node.data.type === 'Time Interval' ? 'time_interval' : 'wallet_event'}
            onChange={(e) => {
              const newType = e.target.value === 'price_change' ? 'Price Change' :
                            e.target.value === 'time_interval' ? 'Time Interval' : 'Wallet Event';
              handleFieldChange('type', newType);
            }}
          >
            {allItems.events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.label}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {allItems.actions && (
        <div className="mb-6">
          <h4 className="font-medium text-sm text-gray-700 mb-2">Action Type</h4>
          <select 
            className="w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={node.data.type === 'Spot Order' ? 'spot_order' : 
                  node.data.type === 'Notification' ? 'notification' : 'wallet_action'}
            onChange={(e) => {
              const newType = e.target.value === 'spot_order' ? 'Spot Order' :
                            e.target.value === 'notification' ? 'Notification' : 'Wallet Action';
              handleFieldChange('type', newType);
            }}
          >
            {allItems.actions.map((action) => (
              <option key={action.id} value={action.id}>
                {action.label}
              </option>
            ))}
          </select>
        </div>
      )}
      
      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            {field.type === 'select' ? (
              <select 
                className="w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={node.data[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
              >
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.type === 'number' ? (
              <input
                type="number"
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Enter ${field.label.toLowerCase()}`}
                value={node.data[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
              />
            ) : field.type === 'market-selector' ? (
              <select 
                className="w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={node.data[field.id] || 'INJ/USDT'}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
              >
                <option value="BTC/USDT">BTC/USDT</option>
                <option value="ETH/USDT">ETH/USDT</option>
                <option value="INJ/USDT">INJ/USDT</option>
              </select>
            ) : field.type === 'timeframe-selector' ? (
              <select 
                className="w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={node.data[field.id] || '1m'}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
              >
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
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Enter ${field.label.toLowerCase()}`}
                value={node.data[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

interface Notification {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface TransactionDetails {
  type: string;
  market: string;
  quantity: number;
  price: number;
  total: number;
}

interface Transaction extends TransactionDetails {
  id: string;
  status: string;
  timestamp: string;
}

const ENDPOINTS = getNetworkEndpoints(NETWORK);

const BuilderPage = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowName, setWorkflowName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('triggers');
  const [walletStrategy] = useState(() => new WalletStrategy({
    chainId: CHAIN_ID,
    network: NETWORK
  }));
  const [priceMonitor] = useState(() => new PriceMonitoringService(walletStrategy));

  const edgeOptions = {
    style: { stroke: '#4F46E5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#4F46E5' },
    animated: true
  };

  const onNodesChange = useCallback(
    (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge({ ...params, ...edgeOptions }, eds)),
    [edgeOptions]
  );

  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string, data: any) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.setData('application/reactflow-data', JSON.stringify(data));
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const flowWrapper = document.querySelector('.react-flow');
    if (!flowWrapper) return;
    
    const bounds = flowWrapper.getBoundingClientRect();

    const position = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    };

    const type = event.dataTransfer.getData('application/reactflow-type');
    const data = JSON.parse(event.dataTransfer.getData('application/reactflow-data'));

    // Initialize with default values based on node type
    let nodeData = {
      ...data,
      id: data.id,
      type: data.type,
      icon: data.icon,
      description: data.description
    };
    
    // Add default values for specific node types
    if (type === 'triggerNode' && data.type === 'Price Change') {
      nodeData = {
        ...nodeData,
        market: 'INJ/USDT',
        condition: 'Above',
        price: 1000
      };
    } else if (type === 'actionNode' && data.type === 'Spot Order') {
      nodeData = {
        ...nodeData,
        market: 'INJ/USDT',
        side: 'Buy',
        quantity: 1,
        price: 0 // 0 for market order
      };
    }

    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: nodeData
    };

    setNodes((nds) => nds.concat(newNode));
  }, []);

  const saveWorkflow = useCallback(() => {
    if (!workflowName) return;
    
    setIsSaving(true);
    
    console.log('Saving workflow:', {
      name: workflowName,
      nodes,
      edges,
      isRunning
    });
    
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  }, [workflowName, nodes, edges, isRunning]);

  const [notification, setNotification] = useState<Notification | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);
  const [transactionHistory, setTransactionHistory] = useState<Transaction[]>([]);

  const executeSpotOrder = async (orderData: any, currentPrice: number) => {
    try {
      // Check if orderData has the required fields
      if (!orderData || !orderData.side || !orderData.quantity || !orderData.market) {
        console.error('Invalid order data:', orderData);
        setNotification({
          message: 'Error: Missing required order data. Please configure the action node properly.',
          type: 'error'
        });
        return;
      }
      
      const { side, quantity, market } = orderData;
      
      console.log(`🚀 EXECUTING SPOT ORDER: ${side} ${quantity} ${market} at price $${currentPrice.toFixed(2)}`);
      
      // Show a notification that we're executing an order
      setNotification({
        message: `Executing ${side} order for ${quantity} ${market.split('/')[0]} at $${currentPrice.toFixed(2)}`,
        type: 'info'
      });
      
      // Connect wallet if not already connected
      if (!walletStrategy.isConnected()) {
        setNotification({
          message: 'Please connect your wallet to execute this order',
          type: 'warning'
        });
        
        try {
          // Directly trigger Keplr wallet connection
          const connected = await walletStrategy.connect();
          
          if (!connected) {
            setNotification({
              message: 'Failed to connect wallet. Please try again.',
              type: 'error'
            });
            return;
          }
          
          setNotification({
            message: 'Wallet connected successfully!',
            type: 'success'
          });
        } catch (error: any) {
          console.error('Error connecting wallet:', error);
          setNotification({
            message: `Error connecting wallet: ${error.message || 'Unknown error'}`,
            type: 'error'
          });
          return;
        }
      }
      
      // Prepare transaction details
      const transactionDetails: TransactionDetails = {
        type: side,
        market,
        quantity: Number(quantity),
        price: currentPrice,
        total: Number(quantity) * currentPrice
      };
      
      setTransactionDetails(transactionDetails);
      
      // Execute the transaction using the wallet
      try {
        const transaction = {
          type: side,
          market,
          quantity: Number(quantity),
          price: currentPrice
        };
        
        // This will trigger the Keplr wallet popup
        const result = await walletStrategy.signAndBroadcastTransaction(transaction);
        
        if (result.success) {
          // Add the transaction to history
          const newTransaction: Transaction = {
            id: result.hash,
            type: transactionDetails.type,
            market: transactionDetails.market,
            quantity: transactionDetails.quantity,
            price: transactionDetails.price,
            total: transactionDetails.total,
            status: 'Completed',
            timestamp: result.timestamp
          };
          
          // Update transaction history
          setTransactionHistory(prev => [newTransaction, ...prev]);
          
          setNotification({
            message: `${side} order executed successfully!`,
            type: 'success'
          });
        }
      } catch (error: any) {
        console.error('Error executing transaction:', error);
        setNotification({
          message: `Transaction failed: ${error.message || 'Unknown error'}`,
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error('Error executing spot order:', error);
      setNotification({
        message: `Error executing order: ${error.message || 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  useEffect(() => {
    if (!isRunning) {
      priceMonitor.stopAllSubscriptions();
      return;
    }

    const triggerToActionMap = new Map();
    
    edges.forEach(edge => {
      const sourceNode = nodes.find(node => node.id === edge.source);
      const targetNode = nodes.find(node => node.id === edge.target);
      
      if (sourceNode?.type === 'triggerNode' && targetNode?.type === 'actionNode') {
        if (!triggerToActionMap.has(sourceNode.id)) {
          triggerToActionMap.set(sourceNode.id, []);
        }
        triggerToActionMap.get(sourceNode.id).push(targetNode);
      }
    });

    nodes.forEach(node => {
      if (node.type === 'triggerNode' && node.data.type === 'Price Change') {
        const connectedActions = triggerToActionMap.get(node.id) || [];
        
        // Ensure we have valid market data
        const market = node.data.market || 'INJ/USDT';
        const condition = node.data.condition || 'Above';
        const triggerPrice = parseFloat(node.data.price) || 1000;
        
        priceMonitor.subscribeToPrice(
          node.id, 
          market,
          5000,
          (price) => {
            // Check if the price condition is met
            let conditionMet = false;
            
            if (condition === 'Above' && price > triggerPrice) {
              conditionMet = true;
            } else if (condition === 'Below' && price < triggerPrice) {
              conditionMet = true;
            } else if (condition === 'Equal' && Math.abs(price - triggerPrice) < 0.01) {
              conditionMet = true;
            }
            
            if (!conditionMet) {
              return; // Skip if condition is not met
            }
            
            console.log(`Trigger activated for node ${node.id} with price ${price} (${condition} ${triggerPrice})`);
            
            connectedActions.forEach(actionNode => {
              if (actionNode.data.type === 'Spot Order') {
                // Ensure the action node has all required data
                const orderData = {
                  side: actionNode.data.side || 'Buy',
                  quantity: actionNode.data.quantity || 1,
                  market: actionNode.data.market || 'INJ/USDT',
                  price: parseFloat(actionNode.data.price) || 0
                };
                
                executeSpotOrder(orderData, price);
              }
            });
          }
        );
      }
    });

    return () => {
      priceMonitor.stopAllSubscriptions();
    };
  }, [isRunning, nodes, edges, priceMonitor]);

  const WalletModal = ({ 
    isOpen, 
    onClose, 
    onConnect 
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    onConnect: () => void; 
  }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 max-w-full">
          <h2 className="text-xl font-bold mb-4">Connect Wallet</h2>
          <p className="mb-4">You need to connect your wallet to execute this order.</p>
          
          <div className="flex flex-col space-y-3 mb-4">
            <button 
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 flex items-center justify-center"
              onClick={() => {
                walletStrategy.connect();
                onConnect();
                onClose();
              }}
            >
              <span>Connect Wallet</span>
            </button>
          </div>
          
          <div className="flex justify-end">
            <button 
              className="text-gray-600 hover:text-gray-800"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const TransactionModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    details 
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: () => void; 
    details: TransactionDetails | null; 
  }) => {
    if (!isOpen || !details) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 max-w-full">
          <h2 className="text-xl font-bold mb-4">Confirm Transaction</h2>
          
          <div className="mb-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className={details.type === 'Buy' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                {details.type}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Market:</span>
              <span className="font-medium">{details.market}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Quantity:</span>
              <span className="font-medium">{details.quantity} {details.market.split('/')[0]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Price:</span>
              <span className="font-medium">${details.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="text-gray-600 font-medium">Total:</span>
              <span className="font-bold">${details.total.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button 
              className="bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              className={`${details.type === 'Buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white py-2 px-4 rounded`}
              onClick={onConfirm}
            >
              Confirm {details.type}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const NotificationComponent = ({ 
    notification, 
    onClose 
  }: { 
    notification: Notification | null; 
    onClose: () => void; 
  }) => {
    if (!notification) return null;
    
    const bgColor = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    }[notification.type];
    
    useEffect(() => {
      if (notification) {
        const timer = setTimeout(() => {
          onClose();
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    }, [notification, onClose]);
    
    return (
      <div className={`fixed bottom-4 right-4 ${bgColor} text-white p-4 rounded-lg shadow-lg max-w-sm z-50`}>
        <div className="flex justify-between">
          <div>{notification.message}</div>
          <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">×</button>
        </div>
      </div>
    );
  };

  return (
    <div className="relative h-screen bg-gray-50">
      <div className="fixed top-2 left-1/2 pt-5 mt-15 transform -translate-x-1/2 bg-white rounded-lg shadow-2xl p-4 z-[9999] border-2 border-blue-200 flex items-center gap-4">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white shadow-md transition-all ${
            isRunning
              ? 'bg-red-600 hover:bg-red-700 scale-105'
              : 'bg-green-600 hover:bg-green-700 scale-105'
          }`}
          style={{ minWidth: '120px' }}
        >
          {isRunning ? (
            <>
              <Pause className="w-6 h-6" />
              <span className="uppercase text-base font-bold">STOP</span>
            </>
          ) : (
            <>
              <Play className="w-6 h-6" />
              <span className="uppercase text-base font-bold">START</span>
            </>
          )}
        </button>

        <button
          onClick={saveWorkflow}
          disabled={isSaving || !workflowName}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold shadow-md transition-all ${
            isSaving || !workflowName
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white scale-105'
          }`}
          style={{ minWidth: '120px' }}
        >
          <Save className="w-6 h-6" />
          <span className="uppercase text-base font-bold">{isSaving ? 'SAVING...' : 'SAVE'}</span>
        </button>

        <div className="h-10 w-px bg-gray-300 mx-1" />

        <input
          type="text"
          placeholder="Enter Workflow Name"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="border-2 border-gray-300 rounded-lg px-4 py-2 w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex h-full pt-2">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onDragStart={onDragStart}
        />

        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={(event: React.DragEvent<HTMLDivElement>) => event.preventDefault()}
              onNodeClick={(event: React.MouseEvent, node: Node) => setSelectedNode(node)}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={edgeOptions}
              fitView
              className="w-full h-full bg-gray-50"
            >
              <Background />
              <Controls />
            </ReactFlow>
          </div>
        </div>

        <NodeConfigPanel node={selectedNode} />
      </div>

      <div className="fixed top-4 right-4 z-[9999]">
        <WalletConnect />
      </div>
      
      {/* Notification Toast */}
      {notification && (
        <NotificationComponent notification={notification} onClose={() => setNotification(null)} />
      )}
      
      {/* Wallet Connection Modal */}
      {showWalletModal && (
        <WalletModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} onConnect={() => walletStrategy.connect()} />
      )}
      
      {/* Transaction Confirmation Modal */}
      {showTransactionModal && transactionDetails && (
        <TransactionModal isOpen={showTransactionModal} onClose={() => setShowTransactionModal(false)} onConfirm={() => {}} details={transactionDetails} />
      )}


      <DockIcons/>
    </div>
  );
};

export default BuilderPage;