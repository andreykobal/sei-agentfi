# SEI AgentFi - Project Description for Hackathon

## 1️⃣ Project Name

**SEI: AgentFi** - _AI-native DeFi platform for real-time insights and autonomous trading_

## 2️⃣ Problem

Launching tokens in DeFi remains an unstructured process: new projects often start without real liquidity, without market activity, and without access to algorithmic support or high-quality real-time analytics.

## 3️⃣ Solution

We are creating a standardized, automated method for launching and supporting DeFi tokens with real liquidity and market activity, managed by AI agents that provide real-time insights for decision-making.

## 4️⃣ How It Works (Key Features)

🔹🔥 **Real-time Market Intelligence** — The AI agent has full access to a historical database of tokens, transactions, prices, and events, providing actionable insights for traders and developers.

🔹🔥 **Agentic Trading via Autonomous Agents** — Autonomous AI agents automatically maintain liquidity, generate trading volumes, manage spreads, and optimize AMM parameters.

🔹 **AI-powered Token Factory** — Token launches through a convenient chat interface with automatic smart contract deployment and parameter configuration.

🔹 \***Bonding Curve Mechanism** — Automatic creation of a bonding curve for initial liquidity and transparent token price growth.

🔹 \***Graduate to AMM** — Tokens automatically transition from bonding curves to full AMM pools once certain market cap thresholds are reached.

🔹 **Conversational DeFi Interface** — All management is done through an AI chat interface, which can execute commands, give advice, and adjust strategies.

## 5️⃣ Target Audience

**Token Developers** — Get out-of-the-box liquidity, trading bots, and analytics to support their projects.

**DeFi Traders** — Gain an AI assistant with access to all on-chain data for informed trading decisions.

**Meme Coin and Experimental Token Creators** — Quickly launch projects with transparent growth models.

## 6️⃣ Technology Stack

- **Blockchain**: SEI Network
- **Smart Contracts**: Solidity (Uniswap V4 + custom bonding curve)
- **Indexer**: Ponder
- **AI/ML**: Anthropic Claude for agents and chat
- **Frontend**: Next.js, React, Tailwind CSS, Wagmi, RainbowKit
- **Backend**: Node.js, Express.js
- **Trading Bots**: Viem with market-making algorithms
- **Database**: PostgreSQL for event logs, Redis for projections

### Architecture

**Event-Sourced CQRS with External Event Stream and Stream-Driven Projections**

1️⃣ **External Event Stream (Blockchain Logs)**

2️⃣ **Stream Processing (Indexing / Projection)**

3️⃣ **Materialized Views / Read Models (Redis)**

4️⃣ **CQRS API (Analytics, Dashboards, Insights)**

---

Blockchain (Uniswap) serves as the **source of truth**, from which we read events like token launches, swaps, and liquidity changes.
These events are processed, projections are built into MongoDB (e.g., for token stats, prices, volumes, liquidity), and via separate CQRS routes, we deliver ready-made data for analytics, market dashboards, and insights.

## 7️⃣ Why It Matters / Benefits / Impact

The platform removes the main barrier in DeFi between a token idea and a functioning market with real activity.
It reduces risks for investors through transparent growth mechanisms, removes barriers for projects **(no need for expensive market makers)**, and creates a healthier token ecosystem where market activity is managed by AI agents, not manipulation.

---

## 🔥 One-liner for the Pitch:

_"AI-native DeFi platform delivering real-time market intelligence and agentic trading through autonomous AI agents — from automated token creation to AMM liquidity, shaping the future of DeFi."_
