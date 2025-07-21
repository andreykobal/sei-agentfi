# Token Creation via Chat - Test Guide

## Overview

The AI chat assistant now supports creating tokens directly through conversation. The system uses structured outputs to collect token information and creates tokens via the bonding curve contract.

## How to Test

### 1. Start the Application

```bash
# Terminal 1: Start the backend
cd sei-agentfi-backend
npm run dev

# Terminal 2: Start the frontend
cd frontend-fix
npm run dev
```

### 2. Access the Application

- Open http://localhost:3000
- Sign in using your email (magic link authentication)
- The chat interface will appear at the bottom of the screen

### 3. Test Token Creation Flow

#### Example Conversation Flow:

**User:** "I want to create a new token"

**AI:** The AI will ask you for the required information:

- Token name (max 50 characters)
- Symbol/ticker (max 10 characters)
- Description (max 500 characters)
- Optional: Image URL, website, social links

**User:** Provide the information when asked, for example:

- "Name: MyAwesome Token"
- "Symbol: MAT"
- "Description: A revolutionary token for awesome people"

**AI:** The AI will:

1. Use `collectTokenCreationData` tool to structure your input
2. Use `createToken` tool to create the token via CreateTokenCommand
3. Provide you with the transaction hash and success confirmation

### 4. What Happens Behind the Scenes

1. **Structured Collection**: The AI uses OpenAI's structured outputs to collect token data in a consistent format
2. **Validation**: The CreateTokenCommand validates all parameters
3. **Blockchain Transaction**: A transaction is sent to the bonding curve contract
4. **Response**: User gets transaction hash and confirmation

### 5. Expected Response Format

When successful, you'll see:

```
✅ Your token has been created successfully!

Transaction Hash: 0x123...abc
Token Name: MyAwesome Token
Symbol: MAT
Description: A revolutionary token for awesome people

The transaction has been submitted to the blockchain. You can track its status using the transaction hash.
```

## Technical Implementation Details

### New Tools Added:

1. **collectTokenCreationData**: Collects structured token data using OpenAI's structured outputs
2. **createToken**: Creates the token using the existing CreateTokenCommand

### Key Features:

- **Structured Outputs**: Ensures consistent data collection
- **Validation**: Full parameter validation before token creation
- **Integration**: Uses existing CreateTokenCommand for blockchain interaction
- **Error Handling**: Comprehensive error handling and user feedback

### Required Environment Variables:

- `OPENAI_API_KEY`: For AI functionality
- `BONDING_CURVE_ADDRESS`: Smart contract address
- `ADMIN_PRIVATE_KEY`: For transaction signing
- All other existing environment variables

## Troubleshooting

### Common Issues:

1. **"User email is required"**: Ensure you're signed in
2. **"Validation failed"**: Check that required fields (name, symbol, description) are provided
3. **"Transaction failed"**: Check blockchain connection and gas fees
4. **"OpenAI error"**: Verify OPENAI_API_KEY is set correctly

### Debug Logs:

The backend logs will show:

- `[DEBUG] Creating token for user: {email}`
- `[DEBUG] Token data: {tokenData}`
- Transaction execution logs from CreateTokenCommand

## Example Test Cases

### Basic Token Creation:

```
User: "Create a token"
AI: "I'll help you create a token! What would you like to name your token?"
User: "DogeCoin2"
AI: "Great! What should the ticker symbol be?"
User: "DOGE2"
AI: "Perfect! Please provide a description for your token."
User: "The next generation of meme coins"
AI: [Creates token and provides transaction hash]
```

### Token with Social Links:

```
User: "I want to create a token with social links"
AI: [Collects name, symbol, description, then asks for optional fields]
User: "Website: https://mytoken.com, Twitter: https://twitter.com/mytoken"
AI: [Creates token with all provided information]
```
