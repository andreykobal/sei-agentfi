export const TokenFactoryAbi = [
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
        name: "decimals",
        type: "uint8",
        internalType: "uint8"
      },
      {
        name: "initialSupply",
        type: "uint256",
        internalType: "uint256"
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
    name: "createdTokens",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
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
    name: "getAllCreatedTokens",
    inputs: [],
    outputs: [
      {
        name: "tokens",
        type: "address[]",
        internalType: "address[]"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getCreatedTokensCount",
    inputs: [],
    outputs: [
      {
        name: "count",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getTokensByCreator",
    inputs: [
      {
        name: "creator",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "tokens",
        type: "address[]",
        internalType: "address[]"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "isFactoryToken",
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
  }
] as const;
