export const BondingCurveAbi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "_poolManager",
        type: "address",
        internalType: "contract IPoolManager"
      },
      {
        name: "_tokenFactory",
        type: "address",
        internalType: "address"
      },
      {
        name: "_usdt",
        type: "address",
        internalType: "address"
      },
      {
        name: "_positionManager",
        type: "address",
        internalType: "contract IPositionManager"
      },
      {
        name: "_permit2",
        type: "address",
        internalType: "contract IPermit2"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "TOTAL_TOKEN_SUPPLY",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "USDT_GRADUATION_THRESHOLD",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "addLiquidityIfReady",
    inputs: [
      {
        name: "tokenAddress",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "afterAddLiquidity",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address"
      },
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency"
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency"
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24"
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks"
          }
        ]
      },
      {
        name: "params",
        type: "tuple",
        internalType: "struct ModifyLiquidityParams",
        components: [
          {
            name: "tickLower",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "tickUpper",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "liquidityDelta",
            type: "int256",
            internalType: "int256"
          },
          {
            name: "salt",
            type: "bytes32",
            internalType: "bytes32"
          }
        ]
      },
      {
        name: "delta",
        type: "int256",
        internalType: "BalanceDelta"
      },
      {
        name: "feesAccrued",
        type: "int256",
        internalType: "BalanceDelta"
      },
      {
        name: "hookData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4"
      },
      {
        name: "",
        type: "int256",
        internalType: "BalanceDelta"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "afterDonate",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address"
      },
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency"
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency"
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24"
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks"
          }
        ]
      },
      {
        name: "amount0",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "amount1",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "hookData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "afterInitialize",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address"
      },
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency"
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency"
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24"
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks"
          }
        ]
      },
      {
        name: "sqrtPriceX96",
        type: "uint160",
        internalType: "uint160"
      },
      {
        name: "tick",
        type: "int24",
        internalType: "int24"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "afterRemoveLiquidity",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address"
      },
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency"
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency"
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24"
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks"
          }
        ]
      },
      {
        name: "params",
        type: "tuple",
        internalType: "struct ModifyLiquidityParams",
        components: [
          {
            name: "tickLower",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "tickUpper",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "liquidityDelta",
            type: "int256",
            internalType: "int256"
          },
          {
            name: "salt",
            type: "bytes32",
            internalType: "bytes32"
          }
        ]
      },
      {
        name: "delta",
        type: "int256",
        internalType: "BalanceDelta"
      },
      {
        name: "feesAccrued",
        type: "int256",
        internalType: "BalanceDelta"
      },
      {
        name: "hookData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4"
      },
      {
        name: "",
        type: "int256",
        internalType: "BalanceDelta"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "afterSwap",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address"
      },
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency"
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency"
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24"
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks"
          }
        ]
      },
      {
        name: "params",
        type: "tuple",
        internalType: "struct SwapParams",
        components: [
          {
            name: "zeroForOne",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "amountSpecified",
            type: "int256",
            internalType: "int256"
          },
          {
            name: "sqrtPriceLimitX96",
            type: "uint160",
            internalType: "uint160"
          }
        ]
      },
      {
        name: "delta",
        type: "int256",
        internalType: "BalanceDelta"
      },
      {
        name: "hookData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4"
      },
      {
        name: "",
        type: "int128",
        internalType: "int128"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "beforeAddLiquidity",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address"
      },
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency"
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency"
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24"
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks"
          }
        ]
      },
      {
        name: "params",
        type: "tuple",
        internalType: "struct ModifyLiquidityParams",
        components: [
          {
            name: "tickLower",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "tickUpper",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "liquidityDelta",
            type: "int256",
            internalType: "int256"
          },
          {
            name: "salt",
            type: "bytes32",
            internalType: "bytes32"
          }
        ]
      },
      {
        name: "hookData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "beforeDonate",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address"
      },
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency"
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency"
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24"
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks"
          }
        ]
      },
      {
        name: "amount0",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "amount1",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "hookData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "beforeInitialize",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address"
      },
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency"
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency"
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24"
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks"
          }
        ]
      },
      {
        name: "sqrtPriceX96",
        type: "uint160",
        internalType: "uint160"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "beforeRemoveLiquidity",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address"
      },
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency"
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency"
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24"
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks"
          }
        ]
      },
      {
        name: "params",
        type: "tuple",
        internalType: "struct ModifyLiquidityParams",
        components: [
          {
            name: "tickLower",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "tickUpper",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "liquidityDelta",
            type: "int256",
            internalType: "int256"
          },
          {
            name: "salt",
            type: "bytes32",
            internalType: "bytes32"
          }
        ]
      },
      {
        name: "hookData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "beforeSwap",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address"
      },
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency"
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency"
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24"
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24"
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks"
          }
        ]
      },
      {
        name: "params",
        type: "tuple",
        internalType: "struct SwapParams",
        components: [
          {
            name: "zeroForOne",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "amountSpecified",
            type: "int256",
            internalType: "int256"
          },
          {
            name: "sqrtPriceLimitX96",
            type: "uint160",
            internalType: "uint160"
          }
        ]
      },
      {
        name: "hookData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4"
      },
      {
        name: "",
        type: "int256",
        internalType: "BeforeSwapDelta"
      },
      {
        name: "",
        type: "uint24",
        internalType: "uint24"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "buyTokens",
    inputs: [
      {
        name: "tokenAddress",
        type: "address",
        internalType: "address"
      },
      {
        name: "usdtAmount",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "tokensReceived",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "calculateTokensToMint",
    inputs: [
      {
        name: "tokenAddress",
        type: "address",
        internalType: "address"
      },
      {
        name: "usdtAmount",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "tokensToMint",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "calculateUsdtToReturn",
    inputs: [
      {
        name: "tokenAddress",
        type: "address",
        internalType: "address"
      },
      {
        name: "tokenAmount",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "usdtToReturn",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "createToken",
    inputs: [
      {
        name: "name",
        type: "string",
        internalType: "string"
      },
      {
        name: "symbol",
        type: "string",
        internalType: "string"
      },
      {
        name: "description",
        type: "string",
        internalType: "string"
      },
      {
        name: "image",
        type: "string",
        internalType: "string"
      },
      {
        name: "website",
        type: "string",
        internalType: "string"
      },
      {
        name: "twitter",
        type: "string",
        internalType: "string"
      },
      {
        name: "telegram",
        type: "string",
        internalType: "string"
      },
      {
        name: "discord",
        type: "string",
        internalType: "string"
      }
    ],
    outputs: [
      {
        name: "tokenAddress",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "getCurrentBondingCurvePrice",
    inputs: [
      {
        name: "tokenAddress",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "priceUsdtPerToken",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getGraduationStatus",
    inputs: [
      {
        name: "tokenAddress",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "isGraduated",
        type: "bool",
        internalType: "bool"
      },
      {
        name: "usdtRaised",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "usdtUntilGraduation",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "progressPercent",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getHookPermissions",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct Hooks.Permissions",
        components: [
          {
            name: "beforeInitialize",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "afterInitialize",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "beforeAddLiquidity",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "afterAddLiquidity",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "beforeRemoveLiquidity",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "afterRemoveLiquidity",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "beforeSwap",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "afterSwap",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "beforeDonate",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "afterDonate",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "beforeSwapReturnDelta",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "afterSwapReturnDelta",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "afterAddLiquidityReturnDelta",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "afterRemoveLiquidityReturnDelta",
            type: "bool",
            internalType: "bool"
          }
        ]
      }
    ],
    stateMutability: "pure"
  },
  {
    type: "function",
    name: "isTokenGraduated",
    inputs: [
      {
        name: "tokenAddress",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "graduated",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "liquidityAdded",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "permit2",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IPermit2"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "poolManager",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IPoolManager"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "poolToToken",
    inputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "PoolId"
      }
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "positionManager",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IPositionManager"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "sellTokens",
    inputs: [
      {
        name: "tokenAddress",
        type: "address",
        internalType: "address"
      },
      {
        name: "tokenAmount",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "usdtReceived",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "tokenFactory",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract TokenFactory"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "tokenToPoolKey",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "currency0",
        type: "address",
        internalType: "Currency"
      },
      {
        name: "currency1",
        type: "address",
        internalType: "Currency"
      },
      {
        name: "fee",
        type: "uint24",
        internalType: "uint24"
      },
      {
        name: "tickSpacing",
        type: "int24",
        internalType: "int24"
      },
      {
        name: "hooks",
        type: "address",
        internalType: "contract IHooks"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "totalMinted",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "totalUsdtRaised",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "usdt",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "LiquidityAdded",
    inputs: [
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "usdtAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "tokenAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "TokenCreated",
    inputs: [
      {
        name: "tokenAddress",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "creator",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "name",
        type: "string",
        indexed: false,
        internalType: "string"
      },
      {
        name: "symbol",
        type: "string",
        indexed: false,
        internalType: "string"
      },
      {
        name: "decimals",
        type: "uint8",
        indexed: false,
        internalType: "uint8"
      },
      {
        name: "initialSupply",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "description",
        type: "string",
        indexed: false,
        internalType: "string"
      },
      {
        name: "image",
        type: "string",
        indexed: false,
        internalType: "string"
      },
      {
        name: "website",
        type: "string",
        indexed: false,
        internalType: "string"
      },
      {
        name: "twitter",
        type: "string",
        indexed: false,
        internalType: "string"
      },
      {
        name: "telegram",
        type: "string",
        indexed: false,
        internalType: "string"
      },
      {
        name: "discord",
        type: "string",
        indexed: false,
        internalType: "string"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "TokenGraduated",
    inputs: [
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "totalMinted",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "totalUsdtRaised",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "TokenPurchase",
    inputs: [
      {
        name: "wallet",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "tokenAddress",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "amountIn",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "amountOut",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "priceBefore",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "priceAfter",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "TokenSale",
    inputs: [
      {
        name: "wallet",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "tokenAddress",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "amountIn",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "amountOut",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "priceBefore",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "priceAfter",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "error",
    name: "HookNotImplemented",
    inputs: []
  },
  {
    type: "error",
    name: "NotPoolManager",
    inputs: []
  }
] as const;
