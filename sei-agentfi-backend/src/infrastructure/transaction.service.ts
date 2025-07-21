import {
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
  parseGwei,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  getPublicClient,
  getWalletClient,
  getAdminAccount,
  getChain,
} from "../config/blockchain.config";

/**
 * Default gas values to use as fallback when estimation fails
 */
const DEFAULT_GAS_LIMIT = 500000n;
const DEFAULT_GAS_PRICE = parseGwei("2");
const MAX_FEE_PER_GAS_MULTIPLIER = 1.2;
const PRIORITY_FEE_MULTIPLIER = 1.1;

// Higher multipliers for retry with higher gas
const RETRY_MAX_FEE_MULTIPLIER = 2.0;
const RETRY_PRIORITY_FEE_MULTIPLIER = 1.5;

// Define a type for the account parameter
type AccountParam = Address | { address: string; privateKey: string };

// Function to detect insufficient funds errors
const isInsufficientFundsError = (error: any): boolean => {
  const errorMessage = String(error);
  return (
    errorMessage.includes("insufficient funds") ||
    errorMessage.includes("exceeds the balance") ||
    errorMessage.includes(
      "The total cost (gas * gas fee + value) of executing this transaction exceeds the balance"
    ) ||
    (error?.details && error.details.includes("insufficient funds"))
  );
};

// Extract wallet address from error if possible
const extractAddressFromError = (error: any): string | null => {
  try {
    if (error?.sender) {
      return error.sender as string;
    }

    if (error?.metaMessages) {
      // Look for a line like "from: 0x1234..."
      const fromLine = error.metaMessages.find(
        (msg: string) => typeof msg === "string" && msg.includes("from:")
      );

      if (fromLine) {
        const match = fromLine.match(
          /from:\s+([0-9a-fA-F]{40}|0x[0-9a-fA-F]{40})/
        );
        if (match && match[1]) {
          return (
            match[1].startsWith("0x") ? match[1] : `0x${match[1]}`
          ) as string;
        }
      }
    }

    // Try to extract from error message
    const errorMessage = String(error);
    const fromMatch = errorMessage.match(/from:\s*([0-9a-fA-Fx]{42})/);
    if (fromMatch && fromMatch[1]) {
      return fromMatch[1];
    }

    return null;
  } catch (extractError) {
    console.error("Error extracting address from error:", extractError);
    return null;
  }
};

// Check for nonce-related errors
const isNonceError = (error: any): boolean => {
  const errorMessage = String(error);
  return (
    errorMessage.includes("nonce too low") ||
    errorMessage.includes("invalid nonce") ||
    errorMessage.includes("nonce too high") ||
    errorMessage.includes("transaction underpriced") ||
    errorMessage.includes("already known") ||
    errorMessage.includes("same hash was already imported") ||
    errorMessage.includes("current nonce of the account")
  );
};

/**
 * Common retry wrapper for blockchain transactions
 */
const executeTransactionWithRetry = async <T>({
  transactionName,
  signingAccount,
  userWalletAddress,
  retryCount = 0,
  executeTransaction,
  retryTransaction,
}: {
  transactionName: string;
  signingAccount: any;
  userWalletAddress?: string;
  retryCount: number;
  executeTransaction: () => Promise<T>;
  retryTransaction: (params: {
    retryCount: number;
    higherGas?: boolean;
  }) => Promise<T>;
}): Promise<T> => {
  const adminAccount = getAdminAccount();

  console.log(
    `🔥 [TRANSACTION RETRY] Starting ${transactionName} (attempt ${
      retryCount + 1
    })`
  );
  console.log(
    `🔥 [TRANSACTION RETRY] Signing account: ${signingAccount.address}`
  );

  try {
    console.log(`🔥 [TRANSACTION RETRY] Executing transaction...`);
    const result = await executeTransaction();
    console.log(
      `🔥 [TRANSACTION RETRY] ✅ ${transactionName} completed successfully on attempt ${
        retryCount + 1
      }`
    );
    return result;
  } catch (error) {
    const errorMessage = String(error);
    console.error(
      `🔥 [TRANSACTION RETRY] ❌ ${transactionName} failed on attempt ${
        retryCount + 1
      }:`,
      error
    );

    // Step 1: Check for insufficient funds error (only for contract calls, not ETH transfers)
    if (
      isInsufficientFundsError(error) &&
      retryCount < 2 &&
      transactionName !== "ETH transfer"
    ) {
      console.error(
        "🔥 [TRANSACTION RETRY] 💰 Detected insufficient funds error, attempting to fix..."
      );

      // Get the user address from the error or use the provided wallet address
      const targetWalletAddress =
        extractAddressFromError(error) ||
        userWalletAddress ||
        signingAccount.address;

      if (targetWalletAddress && targetWalletAddress !== adminAccount.address) {
        try {
          console.error(
            `🔥 [TRANSACTION RETRY] 💰 Sending 0.1 ETH to user wallet ${targetWalletAddress} to cover gas costs...`
          );

          // Send 0.1 ETH to the user's wallet from admin account
          const fundingAmount = parseEther("0.1");

          // Use internal ETH sending function with admin account
          const publicClient = getPublicClient();
          const walletClient = getWalletClient();

          // Get gas prices for funding transaction and prepare transaction params
          let fundingTxParams: any = {
            account: adminAccount,
            to: targetWalletAddress as `0x${string}`,
            value: fundingAmount,
            gas: 21000n,
            chain: getChain(),
          };

          try {
            const feeData = await publicClient.estimateFeesPerGas();
            if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
              fundingTxParams.maxFeePerGas = feeData.maxFeePerGas;
              fundingTxParams.maxPriorityFeePerGas =
                feeData.maxPriorityFeePerGas;
            } else {
              fundingTxParams.gasPrice = parseGwei("2");
            }
          } catch (feeError) {
            console.warn(
              "Failed to estimate fees for funding transaction, using defaults"
            );
            fundingTxParams.gasPrice = parseGwei("2");
          }

          const fundingHash = await walletClient.sendTransaction(
            fundingTxParams
          );
          console.error(
            `🔥 [TRANSACTION RETRY] 💰 Funding transaction sent: ${fundingHash}`
          );

          // Wait for funding transaction to be mined
          console.error(
            `🔥 [TRANSACTION RETRY] 💰 Waiting for funding transaction to be mined...`
          );
          const fundingReceipt = await publicClient.waitForTransactionReceipt({
            hash: fundingHash,
            timeout: 60000,
          });

          if (fundingReceipt.status === "success") {
            console.error(
              `🔥 [TRANSACTION RETRY] 💰 ✅ Funding transaction mined successfully in block ${fundingReceipt.blockNumber}`
            );
          } else {
            throw new Error("Funding transaction failed");
          }

          // Wait a bit more for balance to update
          console.error(
            `🔥 [TRANSACTION RETRY] 💰 Waiting 3 seconds for balance to update...`
          );
          await new Promise((resolve) => setTimeout(resolve, 3000));

          console.error(
            "🔥 [TRANSACTION RETRY] 💰 ✅ ETH sent successfully, retrying the transaction..."
          );

          // Retry the transaction after funding
          console.log(
            `🔥 [TRANSACTION RETRY] Retrying after funding user wallet...`
          );
          return retryTransaction({ retryCount: retryCount + 1 });
        } catch (fundingError) {
          console.error(
            "🔥 [TRANSACTION RETRY] 💰 ❌ Error while trying to fund user wallet:",
            fundingError
          );
          // Continue with other error handling if funding fails
        }
      } else {
        console.error(
          `🔥 [TRANSACTION RETRY] 💰 Cannot send ETH: Target address not found or is admin account`
        );
      }
    }

    // Step 2: Handle insufficient funds for ETH transfers differently
    if (isInsufficientFundsError(error) && transactionName === "ETH transfer") {
      console.error(
        "🔥 [TRANSACTION RETRY] 💰 ❌ Insufficient funds for ETH transfer - cannot auto-fix"
      );
      throw error;
    }

    // Step 3: Check for "replacement transaction underpriced" error and retry with higher gas
    if (
      errorMessage.includes("replacement transaction underpriced") &&
      retryCount < 3
    ) {
      console.error(
        `🔥 [TRANSACTION RETRY] 💸 Detected replacement transaction underpriced error for ${transactionName}, retrying with higher gas...`
      );

      await new Promise((resolve) => setTimeout(resolve, 2000));

      return retryTransaction({
        retryCount: retryCount + 1,
        higherGas: true,
      });
    }

    // Step 4: Handle nonce errors with retry
    if (isNonceError(error) && retryCount < 3) {
      console.error(
        `🔥 [TRANSACTION RETRY] 🔢 Nonce error detected for ${transactionName}, retrying...`
      );

      const waitTime = 3000 * (retryCount + 1);
      console.log(
        `🔥 [TRANSACTION RETRY] 🔢 Waiting ${waitTime}ms for blockchain state to update...`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      return retryTransaction({
        retryCount: retryCount + 1,
        higherGas: true,
      });
    }

    // If we've reached max retries or encounter an unhandled error type
    console.error(
      `🔥 [TRANSACTION RETRY] ❌ FINAL FAILURE: Unhandled error or max retries (${retryCount}) reached for ${transactionName}`
    );

    throw error;
  }
};

/**
 * Write to a contract with automatic gas estimation and retry logic
 */
export async function writeContractWithAccount<
  TAbi extends readonly unknown[],
  TFunctionName extends string
>({
  address,
  abi,
  functionName,
  args = [],
  account,
  retryCount = 0,
  higherGas = false,
}: {
  address: Address;
  abi: TAbi;
  functionName: TFunctionName;
  args?: readonly unknown[];
  account?: AccountParam;
  retryCount?: number;
  higherGas?: boolean;
}): Promise<Hash> {
  const publicClient = getPublicClient();
  const walletClient = getWalletClient();
  const adminAccount = getAdminAccount();

  console.log(
    `📝 [WRITE CONTRACT] Starting contract write: ${functionName} on ${address}`
  );
  console.log(
    `📝 [WRITE CONTRACT] Args:`,
    args.map((arg) => (typeof arg === "bigint" ? arg.toString() + "n" : arg))
  );

  // Determine which account to use for signing
  let signingAccount = adminAccount;
  let accountAddress: Address;

  if (account) {
    if (typeof account === "object" && "privateKey" in account) {
      try {
        signingAccount = privateKeyToAccount(
          account.privateKey as `0x${string}`
        );
        accountAddress = account.address as Address;
        console.log(
          `📝 [WRITE CONTRACT] Using custom private key account: ${accountAddress}`
        );
      } catch (error) {
        console.error(
          `📝 [WRITE CONTRACT] ❌ Failed to create account from private key:`,
          error
        );
        throw new Error("Invalid private key provided");
      }
    } else {
      accountAddress = account as Address;
      signingAccount = adminAccount; // Still sign with admin but estimate with user address
      console.log(
        `📝 [WRITE CONTRACT] Using provided account address: ${accountAddress}`
      );
    }
  } else {
    accountAddress = adminAccount.address;
    console.log(`📝 [WRITE CONTRACT] Using admin account: ${accountAddress}`);
  }

  // Use the common retry wrapper
  return executeTransactionWithRetry({
    transactionName: "Contract call",
    signingAccount,
    userWalletAddress: accountAddress,
    retryCount,
    executeTransaction: async () => {
      console.log(`📝 [WRITE CONTRACT] Executing core transaction logic...`);

      // Estimate gas and get current gas prices
      let gasLimit;
      let maxFeePerGas;
      let maxPriorityFeePerGas;

      console.log(`📝 [WRITE CONTRACT] ⛽ Estimating gas...`);
      try {
        gasLimit = await publicClient.estimateContractGas({
          address,
          abi,
          functionName,
          args,
          account: accountAddress,
        } as any);

        const bufferMultiplier = 1.2;
        gasLimit = BigInt(Math.floor(Number(gasLimit) * bufferMultiplier));
        console.log(
          `📝 [WRITE CONTRACT] ⛽ Gas limit estimated: ${gasLimit} (with buffer)`
        );
      } catch (error) {
        console.warn(
          `📝 [WRITE CONTRACT] ⛽ ⚠️ Gas estimation failed, using default: ${DEFAULT_GAS_LIMIT}`
        );
        gasLimit = DEFAULT_GAS_LIMIT;
      }

      console.log(`📝 [WRITE CONTRACT] 💰 Estimating fees...`);
      try {
        const feeData = await publicClient.estimateFeesPerGas();

        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          const feeMultiplier = higherGas
            ? RETRY_MAX_FEE_MULTIPLIER
            : MAX_FEE_PER_GAS_MULTIPLIER;
          const priorityMultiplier = higherGas
            ? RETRY_PRIORITY_FEE_MULTIPLIER
            : PRIORITY_FEE_MULTIPLIER;

          maxFeePerGas = BigInt(
            Math.floor(Number(feeData.maxFeePerGas) * feeMultiplier)
          );
          maxPriorityFeePerGas = BigInt(
            Math.floor(
              Number(feeData.maxPriorityFeePerGas) * priorityMultiplier
            )
          );

          console.log(
            `📝 [WRITE CONTRACT] 💰 EIP-1559 fees - Max: ${maxFeePerGas}, Priority: ${maxPriorityFeePerGas}`
          );
        } else {
          const legacyFeeData = await publicClient.estimateFeesPerGas({
            type: "legacy",
            chain: undefined,
          });

          if (legacyFeeData.gasPrice) {
            const gasMultiplier = higherGas ? 1.5 : 1.1;
            const gasPrice = BigInt(
              Math.floor(Number(legacyFeeData.gasPrice) * gasMultiplier)
            );
            maxFeePerGas = gasPrice;
            maxPriorityFeePerGas = gasPrice;
            console.log(`📝 [WRITE CONTRACT] 💰 Legacy gas price: ${gasPrice}`);
          } else {
            throw new Error("Fee data unavailable");
          }
        }
      } catch (error) {
        console.warn(
          `📝 [WRITE CONTRACT] 💰 ⚠️ Fee estimation failed, using default gas price: ${DEFAULT_GAS_PRICE}`
        );
        maxFeePerGas = DEFAULT_GAS_PRICE;
        maxPriorityFeePerGas = DEFAULT_GAS_PRICE;
      }

      // First simulate the contract call to check if it would succeed
      console.log(`📝 [WRITE CONTRACT] 🧪 Simulating contract call...`);
      const { request } = await publicClient.simulateContract({
        address,
        abi,
        functionName,
        args,
        account: accountAddress,
        gas: gasLimit,
      } as any);
      console.log(`📝 [WRITE CONTRACT] 🧪 ✅ Simulation successful`);

      // Prepare transaction parameters
      const txParams: any = {
        ...request,
        account: signingAccount,
        gas: gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
      };

      console.log(`📝 [WRITE CONTRACT] 🚀 Sending transaction...`);
      const hash = await walletClient.writeContract(txParams);
      console.log(
        `📝 [WRITE CONTRACT] ✅ Transaction successfully sent with hash: ${hash}`
      );

      // Wait for transaction receipt
      console.log(
        `📝 [WRITE CONTRACT] ⏳ Waiting for transaction to be mined...`
      );
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 60000, // 60 second timeout
      });

      console.log(
        `📝 [WRITE CONTRACT] ✅ Transaction mined in block: ${receipt.blockNumber}`
      );
      console.log(
        `📝 [WRITE CONTRACT] 📊 Status: ${
          receipt.status === "success" ? "✅ SUCCESS" : "❌ FAILED"
        }`
      );

      if (receipt.status !== "success") {
        throw new Error(`Transaction failed with status: ${receipt.status}`);
      }

      return hash;
    },
    retryTransaction: async (retryParams) => {
      console.log(`📝 [WRITE CONTRACT] 🔄 Retrying transaction...`);
      return writeContractWithAccount({
        address,
        abi,
        functionName,
        args,
        account,
        retryCount: retryParams.retryCount,
        higherGas: retryParams.higherGas,
      });
    },
  });
}

/**
 * Send ETH with automatic gas estimation and retry logic
 */
export async function sendEthTransaction({
  to,
  value,
  account,
  retryCount = 0,
  higherGas = false,
}: {
  to: Address;
  value: bigint;
  account?: AccountParam;
  retryCount?: number;
  higherGas?: boolean;
}): Promise<Hash> {
  const publicClient = getPublicClient();
  const walletClient = getWalletClient();
  const adminAccount = getAdminAccount();

  // Determine which account to use for signing
  let signingAccount = adminAccount;

  if (account && typeof account === "object" && "privateKey" in account) {
    try {
      signingAccount = privateKeyToAccount(account.privateKey as `0x${string}`);
    } catch (error) {
      console.error(`Failed to create account from private key:`, error);
      throw new Error("Invalid private key provided");
    }
  }

  // Use the common retry wrapper
  return executeTransactionWithRetry({
    transactionName: "ETH transfer",
    signingAccount,
    userWalletAddress: signingAccount.address,
    retryCount,
    executeTransaction: async () => {
      // Core ETH transfer execution logic
      let gasLimit = 21000n; // Standard ETH transfer gas limit
      let maxFeePerGas;
      let maxPriorityFeePerGas;

      try {
        const feeData = await publicClient.estimateFeesPerGas();

        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          const feeMultiplier = higherGas
            ? RETRY_MAX_FEE_MULTIPLIER
            : MAX_FEE_PER_GAS_MULTIPLIER;
          const priorityMultiplier = higherGas
            ? RETRY_PRIORITY_FEE_MULTIPLIER
            : PRIORITY_FEE_MULTIPLIER;

          maxFeePerGas = BigInt(
            Math.floor(Number(feeData.maxFeePerGas) * feeMultiplier)
          );
          maxPriorityFeePerGas = BigInt(
            Math.floor(
              Number(feeData.maxPriorityFeePerGas) * priorityMultiplier
            )
          );
        } else {
          const legacyFeeData = await publicClient.estimateFeesPerGas({
            type: "legacy",
            chain: undefined,
          });

          if (legacyFeeData.gasPrice) {
            const gasMultiplier = higherGas ? 1.5 : 1.1;
            const gasPrice = BigInt(
              Math.floor(Number(legacyFeeData.gasPrice) * gasMultiplier)
            );
            maxFeePerGas = gasPrice;
            maxPriorityFeePerGas = gasPrice;
          } else {
            throw new Error("Fee data unavailable");
          }
        }
      } catch (error) {
        console.warn(
          `Fee estimation failed, using default gas price: ${DEFAULT_GAS_PRICE}`
        );
        maxFeePerGas = DEFAULT_GAS_PRICE;
        maxPriorityFeePerGas = DEFAULT_GAS_PRICE;
      }

      // Prepare transaction parameters
      const txParams: any = {
        account: signingAccount,
        to,
        value,
        gas: gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
        chain: getChain(),
      };

      const hash = await walletClient.sendTransaction(txParams);
      console.log(`✅ ETH transaction successfully sent with hash: ${hash}`);

      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 60000,
      });

      if (receipt.status !== "success") {
        throw new Error(
          `ETH transaction failed with status: ${receipt.status}`
        );
      }

      return hash;
    },
    retryTransaction: async (retryParams) => {
      return sendEthTransaction({
        to,
        value,
        account,
        retryCount: retryParams.retryCount,
        higherGas: retryParams.higherGas,
      });
    },
  });
}
