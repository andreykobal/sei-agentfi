# SEI AgentFi — Autonomous DeFi Infrastructure Powered by AI

## 1️⃣ Project Name

**SEI: AgentFi** - _Autonomous DeFi Infrastructure Powered by AI for real-time market intelligence and autonomous trading_

![Create-Next-App-07-22-2025_07_17_AM](https://github.com/user-attachments/assets/65fab474-79ad-4498-a375-36edd7cc6e12)

## 2️⃣ Demo Links

🔗 **[Live Platform Demo](https://avaethernity.top/)**  
🎥 **[Demo Video (YouTube)](https://www.youtube.com/watch?v=OhMEQIwbwWA/)**

**Sei Testnet Deployments**

**[Bonding Curve (Uniswap V4 Hook)](https://testnet.seistream.app/contracts/0x34f494c5fc1535bc20dceca39b6a590c743fc088)**  
`0x34F494c5FC1535Bc20DcECa39b6A590C743fc088`

**[Token Factory](https://testnet.seistream.app/contracts/0x8743e5061495f483cfd53b23ff751e8a71c8e67d)**  
`0x8743e5061495f483CFD53B23ff751E8A71C8E67D`

**[USDT](https://testnet.seistream.app/tokens/0x0dcb5f7195ca0dc566db58b0c9202bbd5e846b8a?standart=erc20)**  
`0x0dcb5f7195ca0dc566db58b0c9202bbd5e846b8a`

## 3️⃣ Problem

Launching tokens in DeFi remains an unstructured process: new projects often start without real liquidity, without market activity, and without access to algorithmic support or high-quality real-time analytics.

## 4️⃣ Solution

We are creating a standardized, automated method for launching and supporting DeFi tokens with real liquidity and market activity, managed by AI agents that provide real-time insights for decision-making.

## 5️⃣ How It Works (Key Features)

🔹🔥 **Conversational DeFi Interface** — Revolutionary chat-based UI where users execute complex DeFi operations through natural language, powered by AI agents with complete blockchain access and real-time market intelligence.

🔹🔥 **Real-time Market Intelligence** — The AI agent has full access to a historical database of tokens, transactions, prices, and events, providing actionable insights for traders and developers.

🔹🔥 **Agentic Trading via Autonomous Agents** — Autonomous AI agents automatically maintain liquidity, generate trading volumes, manage spreads, and optimize AMM parameters.

🔹 **AI-powered Token Factory** — Token launches through a convenient chat interface with automatic smart contract deployment and parameter configuration.

🔹 **Bonding Curve Mechanism** — Automatic creation of a bonding curve for initial liquidity and transparent token price growth.

🔹 **Graduate to AMM** — Tokens automatically transition from bonding curves to full AMM pools once certain market cap thresholds are reached.

## 6️⃣ Target Audience

**Token Developers** — Get out-of-the-box liquidity, trading bots, and analytics to support their projects.

**DeFi Traders** — Gain an AI assistant with access to all on-chain data for informed trading decisions.

**Meme Coin and Experimental Token Creators** — Quickly launch projects with transparent growth models.

## 7️⃣ Technology Stack

- **Blockchain**: SEI Network
- **Smart Contracts**: Solidity (Uniswap V4 + custom bonding curve)
- **Indexer**: Ponder
- **AI/ML**: OpenAI GPT-4 for agents and chat
- **Frontend**: Next.js, React, Tailwind CSS, Zustand
- **Backend**: Node.js, MongoDB
- **Trading Bots**: Viem with market-making algorithms
- **Database**: PostgreSQL for event logs, MongoDB for projections

### Architecture

Blockchain (Uniswap) serves as the **source of truth**, from which we read events like token launches, swaps, and liquidity changes.

These events are processed, projections are built into MongoDB (e.g., for token stats, prices, volumes, liquidity), and via separate API routes, we deliver ready-made data for analytics, market dashboards, and insights.

## 8️⃣ Why It Matters / Benefits / Impact

AgentFi solves a core problem in DeFi: the gap between launching a token and achieving real market activity.

By automating liquidity provisioning, trading volume, and analytics, the platform removes the need for manual intervention or expensive market makers. This reduces investor risk through transparent, rules-based price discovery and creates a more stable token ecosystem — where trading is driven by AI logic, not hype or manipulation.

---

## 🔥 Elevator Pitch

_"From token launch to automated liquidity — a full-stack AI-native DeFi platform driven by real-time insights and autonomous trading agents."_

# Conversational DeFi Interface

**The killer feature of AgentFi: Execute complex blockchain operations through natural conversation**

## How it Works

<img width="2581" height="3840" alt="Untitled diagram _ Mermaid Chart-2025-07-22-050036" src="https://github.com/user-attachments/assets/bc1bf485-bd8c-44b6-b79e-476cd40c1de6" />

## 🤖 AI-Powered Chat System

The conversational interface transforms DeFi complexity into simple conversations. Users can create tokens, execute trades, spawn autonomous trading agents, and analyze markets using natural language - all powered by GPT-4 with custom tools that have direct blockchain access.

### Core Components

- **OpenAI Service**: GPT-4 integration with custom tools for blockchain operations
- **Chat Handler**: Context management and conversation flow with sliding window memory
- **Tool Executor**: Translates AI commands into real blockchain transactions
- **System Prompts**: Platform-specific knowledge injection and real-time market intelligence

### AI Capabilities

- **Market Analysis**: Real-time token analytics, holder distribution, trading volumes
- **Token Creation**: Guided token deployment through conversation
- **Trading Operations**: Buy/sell tokens via natural language commands
- **Bot Management**: Create and control autonomous trading agents through chat
- **Platform Knowledge**: Expert guidance on platform features and bonding curve mechanics

### Example Conversations

**Token Creation:**

```
User: "Create a token called Rainbow Dash with RD symbol"
AI: "I'll help you create that token. What's the description and purpose?"
User: "A token for the fastest pony in Equestria"
AI: [Collects metadata, deploys contract] "Token created! Contract: 0x..."
```

**Autonomous Agent Creation:**

```
User: "Create a trading bot for Rainbow Dash token with 2% hourly growth"
AI: "I'll help you create an autonomous agent. First, let me show available tokens..."
    → Calls getAllTokens() tool
    → Guides through bot configuration
    → Executes createMarketMakerBot()
    → "Bot created! Starting automated trading with 100 USDT budget"
```

**Real-time Market Intelligence:**

```
User: "Who are the top holders of this token?"
AI: [Accesses current token context] "Here are the top 10 holders..."
User: "Show me recent trading activity"
AI: [Calls getTokenTransactions()] "Recent trades show..."
```

### 20+ AI Tools Available

- **Data Tools**: `getAllTokens()`, `getTokenByAddress()`, `getUserBalances()`, `getTokenHolders()`
- **Trading Tools**: `buyTokens()`, `sellTokens()`, `createToken()`
- **Agentic Trading Tools**: `createMarketMakerBot()`, `startMarketMakerBot()`, `getMarketMakerBotStatus()`
- **Analytics Tools**: `getTokenTransactions()`, `getPlatformKnowledge()`

## 🚀 Why This Changes Everything

Traditional DeFi requires users to navigate complex interfaces, understand gas fees, and manually execute multi-step processes. **AgentFi's conversational interface eliminates all friction** - users simply describe what they want, and AI agents execute the blockchain operations seamlessly.

The AI has **complete access to real-time market data** and can spawn **autonomous trading agents** that operate independently, creating a truly agentic trading ecosystem where users collaborate with AI to navigate DeFi markets.

## How it works

<img width="2506" height="3840" alt="Untitled diagram _ Mermaid Chart-2025-07-22-065012" src="https://github.com/user-attachments/assets/7f23780d-f66b-41e1-b5bf-75da483329af" />

## Architecture Overview

**The backend implements a sophisticated event sourcing architecture where the blockchain serves as the external event stream:**

```
Blockchain (External Event Stream)
    ↓
Ponder Indexer (Stream Processing)
    ↓
Domain Event Handlers
    ↓
Projections (Read Models) → MongoDB
    ↓
APIs (Analytics, Chat, Trading)
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
├── api/                          # API endpoints
│   ├── auth.api.ts              # JWT auth, wallet generation, user funding
│   ├── chat.api.ts              # AI chat interface with OpenAI integration
│   ├── tokens.api.ts            # Token analytics and market data
│   ├── create-token.api.ts      # Token creation endpoint
│   ├── buy-tokens.api.ts        # Token purchase endpoint
│   ├── sell-tokens.api.ts       # Token sale endpoint
│   ├── market-maker.api.ts      # Autonomous trading bot management
│   └── index.ts                 # API router and MongoDB initialization
│
├── application/                  # Command handlers (writes)
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
├── projections/                  # Read model builders (reads)
│   └── token.projection.ts      # Build token analytics from events
│
└── index.ts                     # Domain event handler imports
```

## 🔥 Chat Service - Conversational DeFi Interface

**Real-time Market Intelligence powered by AI**

The chat service provides a conversational interface to the entire DeFi platform, with AI agents that have full access to blockchain data and trading capabilities.

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


# Smart Contracts - Bonding Curve Trading Platform

A decentralized token trading platform built on Uniswap V4 that implements a bonding curve mechanism inspired by PUMP.FUN. Tokens start in a bonding curve phase, then graduate to normal Uniswap trading at 20,000 USDT raised.

## How it Works

<img width="3840" height="1230" alt="Untitled diagram _ Mermaid Chart-2025-07-22-050239" src="https://github.com/user-attachments/assets/4336e0d4-52e0-46bc-b3e9-f7444edbb888" />

## Token Lifecycle

### Phase 1: Bonding Curve Trading

- **Token Creation**: Create tokens with metadata (name, symbol, image, social links)
- **Initial Supply**: 0 tokens - all minted through bonding curve purchases
- **Trading**: Direct buy/sell with bonding curve contract using PUMP.FUN formula
- **Price Mechanism**: Each purchase increases price, each sale decreases price

### Phase 2: Graduation (20,000 USDT raised)

- **Pool Creation**: Automatically creates Uniswap V4 liquidity pool
- **Liquidity Addition**: Remaining tokens (1B total - minted) + all USDT added as liquidity
- **Price Continuity**: Pool starts at final bonding curve price

### Phase 3: Normal Trading

- **Standard AMM**: Normal Uniswap trading with fixed 1B token supply
- **No More Minting**: Bonding curve disabled, price set by market forces

## Bonding Curve Formula

The bonding curve uses PUMP.FUN's mathematics with virtual reserves:

### Virtual Reserve Model

The bonding curve operates using virtual reserves that create a constant product:

```
Virtual USDT Reserve = 6,000 + x
Virtual Token Reserve = k ÷ (6,000 + x)
```

Where:

- `x` = Total USDT raised through bonding curve trading
- `k` = 6,438,000,006,000 (constant product)
- `6,000` = Virtual initial USDT reserve

### Token Supply Function

The total tokens issued as a function of USDT contributed:

$$
S(x) = T - \frac{k}{6000 + x}
$$

Where:

- `T` = Virtual total token supply (≈ 1.073B tokens)
- `k` = 6,438,000,006,000 (scaling constant)
- `x` = USDT contributed to the bonding curve

### Instantaneous Token Price

The current price per token (in USDT) at any point in the curve:

$$
p(x) = \frac{(6000 + x)^2}{k}
$$

**Properties:**

- Price starts low when `x` is small (early purchases cheaper)
- Price increases quadratically with total USDT raised
- Deterministic pricing follows mathematical formula
- No front-running during bonding curve phase

### Example Pricing

With our constants:

- **Initial Price** (x=0): `(6000)² ÷ 6,438,000,006,000 ≈ 0.0000056 USDT per token`
- **At 1,000 USDT raised**: `(7000)² ÷ 6,438,000,006,000 ≈ 0.0076 USDT per token`
- **At 10,000 USDT raised**: `(16000)² ÷ 6,438,000,006,000 ≈ 0.0398 USDT per token`
- **At graduation (20,000 USDT)**: `(26000)² ÷ 6,438,000,006,000 ≈ 0.105 USDT per token`

This creates a smooth price curve that increases predictably with purchases.

