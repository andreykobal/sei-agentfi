import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { seiTestnet } from "./chains.config";
import { ADMIN_PRIVATE_KEY } from "./env.config";

// Create public client for reading blockchain data
export function getPublicClient() {
  return createPublicClient({
    chain: seiTestnet,
    transport: http(),
  });
}

// Create wallet client for sending transactions
export function getWalletClient() {
  return createWalletClient({
    chain: seiTestnet,
    transport: http(),
  });
}

// Get admin account from private key
export function getAdminAccount() {
  if (!ADMIN_PRIVATE_KEY) {
    throw new Error("ADMIN_PRIVATE_KEY is required");
  }
  return privateKeyToAccount(ADMIN_PRIVATE_KEY as `0x${string}`);
}

// Get the chain object
export function getChain() {
  return seiTestnet;
}
