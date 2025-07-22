# SEI AgentFi Backend

Event-sourced CQRS backend for AI-native DeFi platform with blockchain indexing, conversational UI, and autonomous trading agents.

## Architecture Overview

**Event-Sourced CQRS with External Event Stream**

The backend implements a sophisticated event sourcing architecture where the blockchain serves as the external event stream:

```
Blockchain (External Event Stream)
    ↓
Ponder Indexer (Stream Processing)
    ↓
Domain Event Handlers
    ↓
Projections (Read Models) → MongoDB
    ↓
CQRS APIs (Analytics, Chat, Trading)
```

### Why This Architecture

- **Blockchain as Source of Truth**: All token events (creation, trades, liquidity) originate from smart contracts
- **Immutable Event History**: Complete audit trail of all trading activity
- **Real-time Projections**: Live materialized views for analytics and AI decision-making
- **Scalable Queries**: Optimized read models for complex market data analysis
- **Autonomous Agents**: Event-driven triggers for market maker bots

## App Flow

1. **User Authentication** → Creates wallet, funds with test tokens
2. **Token Creation** → Deploys smart contract, emits blockchain event
3. **Event Processing** → Ponder captures event, updates projections
4. **AI Chat Interface** → Real-time market intelligence and trading assistance
5. **Autonomous Trading** → Market maker bots execute automated strategies
6. **Analytics** → Live dashboards from materialized views

## Directory Structure

```
src/
├── api/                          # CQRS API endpoints
│   ├── auth.api.ts              # JWT auth, wallet generation, user funding
│   ├── chat.api.ts              # AI chat interface with OpenAI integration
│   ├── tokens.api.ts            # Token analytics and market data
│   ├── create-token.api.ts      # Token creation endpoint
│   ├── buy-tokens.api.ts        # Token purchase endpoint
│   ├── sell-tokens.api.ts       # Token sale endpoint
│   ├── market-maker.api.ts      # Autonomous trading bot management
│   └── index.ts                 # API router and MongoDB initialization
│
├── application/                  # Command handlers (CQRS writes)
│   ├── create-token.command.ts  # Execute token creation on blockchain
│   ├── buy-tokens.command.ts    # Execute token purchases via bonding curve
│   └── sell-tokens.command.ts   # Execute token sales via bonding curve
│
├── config/                       # Environment and service configuration
│   ├── env.config.ts            # Environment variables validation
│   ├── database.config.ts       # MongoDB connection management
│   ├── blockchain.config.ts     # Viem client for SEI testnet
│   └── chains.config.ts         # Chain configuration constants
│
├── domain/                       # Event handlers (blockchain → domain)
│   ├── BondingCurve.ts          # Process token lifecycle events
│   └── PoolManager.ts           # Process Uniswap V4 pool events
│
├── infrastructure/               # Core services and utilities
│   ├── chat.service/            # 🔥 AI Chat & Real-time Market Intelligence
│   │   ├── openai-service.ts    # Main OpenAI orchestration service
│   │   ├── chat-handler.ts      # Conversation flow and context management
│   │   ├── tools.ts             # Available AI tools definition
│   │   ├── tool-executor.ts     # Tool execution with blockchain integration
│   │   ├── helpers.ts           # System prompts and context utilities
│   │   └── types.ts             # Chat service type definitions
│   │
│   ├── market-maker.service/    # 🔥 Autonomous Trading Agents
│   │   ├── bot-management.ts    # Create, start, stop trading bots
│   │   ├── trading.ts           # Execute autonomous buy/sell decisions
│   │   ├── analysis.ts          # Price impact and growth analysis
│   │   ├── scheduling.ts        # Trade timing and interval management
│   │   ├── config.ts            # Trading parameters and strategy config
│   │   ├── status.ts            # Bot performance monitoring
│   │   └── index.ts             # Service orchestration
│   │
│   ├── wallet.service.ts        # Blockchain wallet operations
│   ├── transaction.service.ts   # Smart contract interaction layer
│   ├── chart.service.ts         # Price chart data generation
│   └── knowledge-base.util.ts   # Platform knowledge for AI context
│
├── middlewares/                  # Request processing middleware
│   └── auth.middleware.ts       # JWT token verification
│
├── models/                       # MongoDB schemas and types
│   ├── token.model.ts           # Token metadata and market data
│   ├── chat.model.ts            # Chat history and conversation state
│   ├── user.model.ts            # User accounts and wallet mapping
│   └── market-maker.model.ts    # Trading bot state and logs
│
├── projections/                  # Read model builders (CQRS reads)
│   └── token.projection.ts      # Build token analytics from events
│
└── index.ts                     # Domain event handler imports
```

## 🔥 Chat Service - Conversational DeFi Interface

**Real-time Market Intelligence powered by AI**

The chat service provides a conversational interface to the entire DeFi platform, with AI agents that have full access to blockchain data and trading capabilities.

### Core Components

- **OpenAI Service**: GPT-4 integration with custom tools
- **Chat Handler**: Context management and conversation flow
- **Tool Executor**: Blockchain operations via conversational commands
- **System Prompts**: Platform-specific knowledge injection

### AI Capabilities

- **Market Analysis**: Real-time token analytics, holder distribution, trading volumes
- **Token Creation**: Guided token deployment through conversation
- **Trading Operations**: Buy/sell tokens via natural language
- **Bot Management**: Create and control autonomous trading agents
- **Platform Knowledge**: Expert guidance on platform features

### Example Conversation

```
User: "Create a trading bot for Rainbow Dash token with 2% hourly growth"
AI: "I'll help you create an autonomous agent. First, let me show you available tokens..."
    → Calls getAllTokens() tool
    → Guides through bot configuration
    → Executes createMarketMakerBot()
    → Starts automated trading
```

## 🔥 Market Maker Service - Autonomous Trading Agents

**Agentic Trading through AI-powered Market Makers**

The market maker service implements autonomous trading bots that provide liquidity, create volume, and promote token growth without human intervention.

### Autonomous Features

- **Dedicated Wallets**: Each bot has its own blockchain wallet with private keys
- **Growth Strategies**: Configurable hourly growth targets (0.5-5%+)
- **Adaptive Trading**: AI adjusts strategy based on price impact analysis
- **Portfolio Balancing**: Maintains optimal USDT/token ratios
- **Risk Management**: Trade size limits and pause mechanisms

### Trading Intelligence

- **Price Impact Analysis**: Measures trade effectiveness and market response
- **Growth Progress Tracking**: Monitors actual vs target growth rates
- **Strategy Adjustment**: Real-time parameter tuning based on performance
- **Volume Generation**: Creates organic trading activity

### Bot Lifecycle

1. **Creation**: User allocates budget, sets growth target
2. **Wallet Generation**: Bot gets dedicated wallet and funding
3. **Strategy Calculation**: AI determines optimal trading parameters
4. **Autonomous Execution**: Bot trades continuously with randomized timing
5. **Performance Monitoring**: Real-time analytics and strategy adjustments

## Event Sourcing Flow

### 1. External Event Stream (Blockchain)

```typescript
// Smart contract emits events
emit TokenCreated(tokenAddress, creator, name, symbol, ...)
emit TokenPurchase(wallet, tokenAddress, amountIn, amountOut, ...)
```

### 2. Stream Processing (Ponder Indexer)

```typescript
// Ponder captures blockchain events
ponder.on("BondingCurve:TokenCreated", async ({ event, context }) => {
  // Index to SQL database
  await context.db.insert(tokenCreated).values({ ...event.args });

  // Forward to domain handlers
  await TokenProjection.handleTokenCreated(event);
});
```

### 3. Projection Building (Read Models)

```typescript
// Build analytics from events
static async handleTokenPurchase(event: TokenPurchaseEvent) {
  // Update token price and market cap
  // Recalculate holder distribution
  // Update 24h trading volumes
  // Trigger market maker analysis
}
```

### 4. CQRS API Layer

```typescript
// Serve optimized read models
GET /tokens/:address → Returns materialized token analytics
POST /chat/message → AI accesses live market data
POST /market-maker/create → Spawns autonomous trading bot
```

## Technology Stack

- **Event Processing**: Ponder (blockchain indexing)
- **AI/ML**: OpenAI GPT-4 with custom tools
- **Blockchain**: Viem (SEI testnet integration)
- **Database**: MongoDB (read models), PostgreSQL (Ponder events)
- **Runtime**: Node.js with TypeScript
- **API**: Hono framework with JWT authentication

## Key Features

- **Event-Driven Architecture**: Reactive to all blockchain activity
- **AI-Native Interface**: Conversational access to all platform features
- **Autonomous Agents**: Self-managing market maker bots
- **Real-time Analytics**: Live materialized views from blockchain events
- **CQRS Pattern**: Optimized reads and writes for different use cases
