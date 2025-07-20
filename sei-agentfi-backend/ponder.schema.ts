import { onchainTable, index } from "ponder";

// BondingCurve Events (TokenCreated)
export const tokenCreated = onchainTable(
  "token_created",
  (t) => ({
    id: t.text().primaryKey(),
    tokenAddress: t.hex().notNull(),
    creator: t.hex().notNull(),
    name: t.text().notNull(),
    symbol: t.text().notNull(),
    decimals: t.integer().notNull(),
    initialSupply: t.bigint().notNull(),
    description: t.text(),
    image: t.text(),
    website: t.text(),
    twitter: t.text(),
    telegram: t.text(),
    discord: t.text(),
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    creatorIdx: index().on(table.creator),
    tokenAddressIdx: index().on(table.tokenAddress),
    timestampIdx: index().on(table.timestamp),
  })
);

// PoolManager Events
export const approval = onchainTable(
  "approval",
  (t) => ({
    id: t.text().primaryKey(),
    owner: t.hex().notNull(),
    spender: t.hex().notNull(),
    tokenId: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    ownerIdx: index().on(table.owner),
    spenderIdx: index().on(table.spender),
    timestampIdx: index().on(table.timestamp),
  })
);

export const donate = onchainTable(
  "donate",
  (t) => ({
    id: t.text().primaryKey(),
    poolId: t.hex().notNull(),
    sender: t.hex().notNull(),
    amount0: t.bigint().notNull(),
    amount1: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    poolIdIdx: index().on(table.poolId),
    senderIdx: index().on(table.sender),
    timestampIdx: index().on(table.timestamp),
  })
);

export const initialize = onchainTable(
  "initialize",
  (t) => ({
    id: t.text().primaryKey(),
    poolId: t.hex().notNull(),
    currency0: t.hex().notNull(),
    currency1: t.hex().notNull(),
    fee: t.integer().notNull(),
    tickSpacing: t.integer().notNull(),
    hooks: t.hex().notNull(),
    sqrtPriceX96: t.bigint().notNull(),
    tick: t.integer().notNull(),
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    poolIdIdx: index().on(table.poolId),
    currency0Idx: index().on(table.currency0),
    currency1Idx: index().on(table.currency1),
    timestampIdx: index().on(table.timestamp),
  })
);

export const modifyLiquidity = onchainTable(
  "modify_liquidity",
  (t) => ({
    id: t.text().primaryKey(),
    poolId: t.hex().notNull(),
    sender: t.hex().notNull(),
    tickLower: t.integer().notNull(),
    tickUpper: t.integer().notNull(),
    liquidityDelta: t.bigint().notNull(),
    salt: t.hex().notNull(),
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    poolIdIdx: index().on(table.poolId),
    senderIdx: index().on(table.sender),
    timestampIdx: index().on(table.timestamp),
  })
);

export const operatorSet = onchainTable(
  "operator_set",
  (t) => ({
    id: t.text().primaryKey(),
    owner: t.hex().notNull(),
    operator: t.hex().notNull(),
    approved: t.boolean().notNull(),
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    ownerIdx: index().on(table.owner),
    operatorIdx: index().on(table.operator),
    timestampIdx: index().on(table.timestamp),
  })
);

export const ownershipTransferred = onchainTable(
  "ownership_transferred",
  (t) => ({
    id: t.text().primaryKey(),
    user: t.hex().notNull(),
    newOwner: t.hex().notNull(),
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
    newOwnerIdx: index().on(table.newOwner),
    timestampIdx: index().on(table.timestamp),
  })
);

export const protocolFeeControllerUpdated = onchainTable(
  "protocol_fee_controller_updated",
  (t) => ({
    id: t.text().primaryKey(),
    protocolFeeController: t.hex().notNull(),
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    protocolFeeControllerIdx: index().on(table.protocolFeeController),
    timestampIdx: index().on(table.timestamp),
  })
);

export const protocolFeeUpdated = onchainTable(
  "protocol_fee_updated",
  (t) => ({
    id: t.text().primaryKey(),
    poolId: t.hex().notNull(),
    protocolFee: t.integer().notNull(),
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    poolIdIdx: index().on(table.poolId),
    timestampIdx: index().on(table.timestamp),
  })
);

export const swap = onchainTable(
  "swap",
  (t) => ({
    id: t.text().primaryKey(),
    poolId: t.hex().notNull(),
    sender: t.hex().notNull(),
    amount0: t.bigint().notNull(),
    amount1: t.bigint().notNull(),
    sqrtPriceX96: t.bigint().notNull(),
    liquidity: t.bigint().notNull(),
    tick: t.integer().notNull(),
    fee: t.integer().notNull(),
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    poolIdIdx: index().on(table.poolId),
    senderIdx: index().on(table.sender),
    timestampIdx: index().on(table.timestamp),
  })
);

export const transfer = onchainTable(
  "transfer",
  (t) => ({
    id: t.text().primaryKey(),
    caller: t.hex().notNull(),
    from: t.hex().notNull(),
    to: t.hex().notNull(),
    tokenId: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    fromIdx: index().on(table.from),
    toIdx: index().on(table.to),
    callerIdx: index().on(table.caller),
    timestampIdx: index().on(table.timestamp),
  })
);
