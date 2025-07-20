import { ponder } from "ponder:registry";
import {
  approval,
  donate,
  initialize,
  modifyLiquidity,
  operatorSet,
  ownershipTransferred,
  protocolFeeControllerUpdated,
  protocolFeeUpdated,
  swap,
  transfer,
} from "ponder:schema";

// PoolManager Events
ponder.on("PoolManager:Approval", async ({ event, context }) => {
  await context.db.insert(approval).values({
    id: event.id,
    owner: event.args.owner,
    spender: event.args.spender,
    tokenId: event.args.id,
    amount: event.args.amount,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });
});

ponder.on("PoolManager:Donate", async ({ event, context }) => {
  await context.db.insert(donate).values({
    id: event.id,
    poolId: event.args.id,
    sender: event.args.sender,
    amount0: event.args.amount0,
    amount1: event.args.amount1,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });
});

ponder.on("PoolManager:Initialize", async ({ event, context }) => {
  await context.db.insert(initialize).values({
    id: event.id,
    poolId: event.args.id,
    currency0: event.args.currency0,
    currency1: event.args.currency1,
    fee: event.args.fee,
    tickSpacing: event.args.tickSpacing,
    hooks: event.args.hooks,
    sqrtPriceX96: event.args.sqrtPriceX96,
    tick: event.args.tick,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });
});

ponder.on("PoolManager:ModifyLiquidity", async ({ event, context }) => {
  await context.db.insert(modifyLiquidity).values({
    id: event.id,
    poolId: event.args.id,
    sender: event.args.sender,
    tickLower: event.args.tickLower,
    tickUpper: event.args.tickUpper,
    liquidityDelta: event.args.liquidityDelta,
    salt: event.args.salt,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });
});

ponder.on("PoolManager:OperatorSet", async ({ event, context }) => {
  await context.db.insert(operatorSet).values({
    id: event.id,
    owner: event.args.owner,
    operator: event.args.operator,
    approved: event.args.approved,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });
});

ponder.on("PoolManager:OwnershipTransferred", async ({ event, context }) => {
  await context.db.insert(ownershipTransferred).values({
    id: event.id,
    user: event.args.user,
    newOwner: event.args.newOwner,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });
});

ponder.on(
  "PoolManager:ProtocolFeeControllerUpdated",
  async ({ event, context }) => {
    await context.db.insert(protocolFeeControllerUpdated).values({
      id: event.id,
      protocolFeeController: event.args.protocolFeeController,
      timestamp: event.block.timestamp,
      blockNumber: event.block.number,
    });
  }
);

ponder.on("PoolManager:ProtocolFeeUpdated", async ({ event, context }) => {
  await context.db.insert(protocolFeeUpdated).values({
    id: event.id,
    poolId: event.args.id,
    protocolFee: event.args.protocolFee,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });
});

ponder.on("PoolManager:Swap", async ({ event, context }) => {
  await context.db.insert(swap).values({
    id: event.id,
    poolId: event.args.id,
    sender: event.args.sender,
    amount0: event.args.amount0,
    amount1: event.args.amount1,
    sqrtPriceX96: event.args.sqrtPriceX96,
    liquidity: event.args.liquidity,
    tick: event.args.tick,
    fee: event.args.fee,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });
});

ponder.on("PoolManager:Transfer", async ({ event, context }) => {
  await context.db.insert(transfer).values({
    id: event.id,
    caller: event.args.caller,
    from: event.args.from,
    to: event.args.to,
    tokenId: event.args.id,
    amount: event.args.amount,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });
});
