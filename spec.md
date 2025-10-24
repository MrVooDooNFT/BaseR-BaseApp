# BaseR by Mr VooDoo

## Overview
A modern React + TypeScript web application that allows users to connect to the Base network using multiple wallet support (MetaMask, Rabby, WalletConnect) and interact with Ethereum smart contracts. The application performs specified numbers of clone and ping operations while displaying real-time logs. Users can also deploy real Pinger contracts, mint NFT collections, and view comprehensive wallet statistics.

**Subtitle**: 
- English: "Secure contract farming, deployment, and NFT creation on Base"
- Turkish: "Base üzerinde güvenli kontrat farming, dağıtım ve NFT oluşturma"

## Core Features

### Multi-Wallet Support and Base Network Integration
- Users can connect MetaMask, Rabby, or WalletConnect wallets to the application
- Application specifically works on Base Mainnet (chainId: 0x2105) network
- Checks if user is on Base network before wallet connection
- Shows warning to users on wrong network to switch to Base network
- Provides button or automatic request for Base network switching/adding
- Displays wallet connection status with only wallet address and connect/disconnect buttons
- Shows connected account address
- All transactions are signed directly from user's wallet, no private keys are processed in the application

### Wallet Activity Dashboard
- After wallet connection, displays comprehensive statistics for the connected wallet on Base network
- Positioned centered directly above the Real-Time Logs section, matching the style and alignment of the logs area
- Shows total number of normal transactions sent by the wallet using optimized parallel fetching
- Displays number of owned NFTs for the connected wallet using the following logic:
  - Fetches all NFT transfers for the connected EOA using Etherscan Multichain API at https://api.etherscan.io/v2/api with chainid=8453 and API key "RDD9YF5WX8IYNCVZ76N2XIDECFMXNBZZZ7"
  - Uses `account/tokennfttx` endpoint with optimized parallel fetching, paged until empty
  - For ERC-721: For each (contract, tokenId), the owner is the address in the most recent transfer; counts as owned if to==MY_EOA and not transferred out later
  - For ERC-1155: For each (contract, tokenId), sums transfer values in/out for MY_EOA; counts as owned if balance > 0
  - Displays the total count as "Owned NFTs" in the stat box
  - Includes a "View details" link that opens a modal listing contract name/symbol, tokenId, and an optional image (if metadata URL exists)
- Shows number of contracts deployed by the wallet including both direct deploys (transactions with empty `to` field) and factory clones (using `logs/getLogs` for factory address and Cloned event topic)
- Statistics are fetched using Etherscan Multichain API at https://api.etherscan.io/v2/api with chainid=8453 and API key "RDD9YF5WX8IYNCVZ76N2XIDECFMXNBZZZ7"
- Uses optimized parallel fetching for `account/txlist` endpoint with up to 5 concurrent requests per batch, stopping when a page returns empty, with 150ms delay between batches
- Uses `logs/getLogs` endpoint for factory address to count factory-created contracts
- No backend or proxy services are used for data fetching
- Statistics are displayed in a clear, user-friendly format without description text or eye icons
- Activity rows include small icons: 📊 for Transactions, 🖼️ for Owned NFTs, 🚀 for Deployed Contracts
- Real-time updates when wallet connection changes
- Graceful error handling with clear messages for API unavailability, rate limiting, CORS errors, or unsupported chainid
- Implements caching for merged results (txlist + NFT stats + contract stats) in Motoko in-memory store for 300 seconds (5 minutes) to avoid redundant network requests on reloads
- Shows "Last updated" timestamp for cached data
- Shows visible spinner or loading indicator with message "Loading data from BaseScan…" that remains visible until all parallel batches have resolved and wallet activity data is fully loaded

### NFT Collection Minting
- "Create and Mint your NFT collection" section positioned in the left column directly below the wallet connection area
- Visually grouped with the wallet connection to maintain a clean and intuitive layout
- Section displays the nft.jpg image prominently and centered, sized to approximately 25% of the viewport width (responsive for both desktop and mobile)
- Two input fields:
  - Handle (string, required): Text input for collection handle without any prefix added, must be non-empty
    - Turkish label: "Koleksiyon Adı" (instead of "Tanıtıcı")
  - Amount (integer, 1-10, required): Dropdown select field allowing user to choose from values 1 through 10, styled consistently with the rest of the app and accessible on both desktop and mobile
- Submit button to initiate minting process
- Interacts with NFTFactory contract at address 0xfC92711490c25eBcF73e91CC549007369f0A22F8
- Uses only the provided ABI for createMyCollection function:
  - Function signature: createMyCollection(string handle, uint256 amount) returns (address collection)
  - Function is nonpayable (no value sent with transaction)
  - Function selector is always 0x703270d8 (for createMyCollection(string,uint256))
- Encodes the function call using ethers.Interface.encodeFunctionData with the specified ABI
- Uses wallet-suggested gas pricing (no manual gasPrice or gasLimit unless gas estimation fails)
- Uses Base Mainnet RPC endpoint for all contract interactions
- After transaction completion, displays:
  - Transaction hash
  - Transaction status (success/failure)
  - Gas used
  - New collection address (from function return value)
- All minting operations are logged in the real-time logs panel
- Error handling for failed transactions or invalid inputs
- Input validation ensures handle is non-empty and amount is between 1 and 10

### Contract Deployment Options
- "Deploy A Contract 🚀" button located in the right column with green or blue Web3-style color
  - Turkish: "Kontrat Deploy Et 🚀" button
- When clicked, deploys real contract using ethers.ContractFactory with Pinger.sol ABI and BYTECODE
- Deployment is performed using connected wallet (signer)
- After deployment, new contract address and transaction details are logged in the log panel
- Both "Clone Deploy" (minimal proxy with Factory.createClone) and "Deploy Contract" (direct contract deployment) modes available in the right column
  - Turkish: "Kontrat Deploy Et" for Deploy Contract mode
- Clear distinction between the two deployment modes

### Transaction Parameters
- Fixed Factory address: 0x0ae36d90d4e295a4b87274eec0c1520fd5f6f842
- Users can specify clone count with label "How many unique contracts to interact with"
  - Turkish: "Kaç Benzersiz Kontrat oluşturmak istiyorsunuz"
- Ping count per clone can be set with label "Transactions per contract"
- Parameters are collected through numerical input fields in the right column

### Advanced Settings Panel
- Expandable "Advanced" panel with note at the top: "Do not change unless you know what you are doing"
- Gas Mode toggle with two options:
  - "Wallet suggested" (default): Only gasLimit is set for transactions, allowing wallet to suggest EIP-1559 fees dynamically
  - "Custom": User can specify custom maxFeePerGas and maxPriorityFeePerGas values
- When "Wallet suggested" mode is selected:
  - Shows only MinGas(createClone) = 180,000 and MinGas(ping) = 50,000 fields
  - Transaction options include only gasLimit, no maxFeePerGas or maxPriorityFeePerGas
- When "Custom" mode is selected:
  - Shows all fields: MinGas(createClone) = 180,000, MinGas(ping) = 50,000, MaxFee = 0.05 gwei, Priority = 0.01 gwei
  - Transaction options include gasLimit, maxFeePerGas, and maxPriorityFeePerGas as specified by user
- GasBuffer = 20% (always shown regardless of mode)
- Users can optionally modify these values

### Smart Contract Interaction
- Communication with Factory contract (0x0ae36d90d4e295a4b87274eec0c1520fd5f6f842) on Base network using ethers.js
- Factory contract ABI is defined exactly as:
  - "event Cloned(address indexed addr)" event
  - "function createClone() returns (address)" function
- Communication with NFTFactory contract (0xfC92711490c25eBcF73e91CC549007369f0A22F8) on Base network using ethers.js
- NFTFactory contract uses only the specified ABI for createMyCollection function with function selector 0x703270d8
- Contract interaction uses only ethers.Contract with factory.createClone() call
- Verifies that createClone function selector is 0x64f2d4b9 and displays in logs
- Does not use old function calls like factory.clone() or factory["clone(address)"]()
- Pinger contract ABI includes:
  - "function ping()" function
  - "function counter() view returns (uint256)" function
- Real contract deployment using ethers.ContractFactory with Pinger.sol ABI and BYTECODE
- All contract calls are sent to Base network using Base Mainnet RPC endpoint
- Clear warnings for users on wrong network
- Transactions are performed sequentially
- Transaction options are constructed based on selected Gas Mode:
  - "Wallet suggested": Only gasLimit is included in transaction options
  - "Custom": gasLimit, maxFeePerGas, and maxPriorityFeePerGas are included
- All gas parameters are sent directly from browser to wallet
- No proxy, relay, or backend transaction signing/forwarding is used
- No cached or old ABI/function signatures are used
- Follows ethers v6 transaction pattern
- NFT minting uses ethers.Interface.encodeFunctionData for function call encoding and wallet-suggested gas pricing

### Real-Time Logging
- All operations are displayed in real-time in the log area positioned below the Wallet Activity panel, spanning the full width
- Log clear button is located within the real-time logs section and reliably clears all log entries when clicked
- When a wallet is connected, the log message simply says "Wallet connected" without mentioning any specific wallet name
- Each operation step is recorded in detail
- Transaction statuses (successful/failed) are indicated
- Network status and switching operations are shown in logs
- Log entries are listed in chronological order
- Gas parameters and transaction details are shown in logs
- createClone function selector value is displayed in logs
- Real contract deployment operations and new contract addresses are logged
- NFT collection minting operations, transaction details, and new collection addresses are logged
- Function selector 0x703270d8 for createMyCollection is displayed in logs
- Advanced error handling and user-friendly error messages
- Contract addresses are correctly displayed in logs
- Timestamped transaction records
- Gas mode selection is logged when transactions are initiated

### Language Support
- Language selector positioned at the very top of the page, directly under the "BaseR" heading
- Styled as a button group for English and Turkish selection
- Two language options: English and Türkçe (Turkish)
- Application defaults to English on first load
- When user selects Turkish, all visible UI text updates to Turkish with specific overrides:
  - All "Deploy Contract" labels and buttons become "Kontrat Deploy Et"
  - In the info section, "Deploy Contract" becomes "Kontrat Deploy Etme"
  - In the NFT mint section, "Tanıtıcı" becomes "Koleksiyon Adı"
  - Clone/interaction input label becomes "Kaç Benzersiz Kontrat oluşturmak istiyorsunuz"
- When user selects English, all text switches back to English
- User can toggle between languages at any time
- All labels, headings, buttons, and informational text update according to selected language
- Language selection does not affect wallet connection or other app logic
- All translations update instantly when the language is switched

### User Interface
- Modern React + TypeScript architecture
- Clean and minimal design using shadcn/ui components
- Multi-language support (English/Turkish) with user-selectable language toggle positioned at the very top under the main heading
- Web page title and main header: "BaseR by Mr VooDoo"
- Language selector styled as button group positioned directly under the "BaseR" heading
- Page subtitle updates based on language:
  - English: "Secure contract farming, deployment, and NFT creation on Base"
  - Turkish: "Base üzerinde güvenli kontrat farming, dağıtım ve NFT oluşturma"
- Two-column responsive layout:
  - Left column: wallet connection (address and connect/disconnect buttons only), followed by "Create and Mint your NFT collection" section positioned directly below and visually grouped with the wallet connection
  - Right column: "Deploy A Contract 🚀" button (green or blue Web3-style color, Turkish: "Kontrat Deploy Et 🚀"), and "Transaction Farming" section with transaction parameters
- Wallet Activity dashboard positioned centered directly above the Real-Time Logs section, matching the style and alignment of the logs area
- "Transaction Farming" section header with description: "The first number sets how many unique contracts you want to interact with. The second number defines how many transactions to send for each unique contract."
- Real-time logs panel positioned below the Wallet Activity panel, spanning full width with log clear button
- Contract information section moved to the very bottom of the page showing only contract address
- Informational section at the very bottom of the page with the following content (formatted and styled for clarity):
  - 🔹 Deployed Contracts: Real contract deployments (permanent footprint on Base chain). Avg cost: $0.0007 – $0.002
    - Turkish: 🔹 Kontrat Deploy Etme: Real contract deployments (permanent footprint on Base chain). Avg cost: $0.0007 – $0.002
  - 🔹 Transactions (Tx): On-chain activity score (every tx boosts your footprint). Avg cost: $0.0001 – $0.0005
  - 🔹 Unique Contracts: Minimal proxy clones (lightweight contract instances). Avg cost: $0.0003 – $0.001
  - 🔹 Create NFTs: Unique contract and Unique NFT creation, You will be creator and minter. Avg cost: $0.01 – $0.05
  - ⚡ Costs vary with network congestion. This application never charges or deducts any fees — all costs are only gas fees paid directly to the Base network.
  - 💬 For any questions, issues or suggestions, reach out on X: @MrVooDooNFT (with @MrVooDooNFT as a clickable link to https://x.com/MrVooDooNFT)
- Network status indicators
- Base network switching buttons
- "Deploy A Contract 🚀" button in the right column without description (green or blue Web3-style color, Turkish: "Kontrat Deploy Et 🚀")
- Clear distinction between Clone Deploy and Deploy Contract modes
- Expandable advanced settings panel with warning note and Gas Mode toggle
- Gas Mode toggle clearly shows "Wallet suggested" (default) and "Custom" options
- Dynamic field visibility based on selected Gas Mode
- Simple and intuitive interface design
- Ready default values for testing (Clones=1, Pings=1)
- "Start Farming TX ⚡" or "Start Farming TX 🎯" button (green color) to initiate clone deploy operations
- All UI text and labels dynamically update based on selected language (English/Turkish) with specific Turkish overrides as specified

## Backend Data Storage
- Wallet activity cache data stored in Motoko in-memory store with 300-second (5 minutes) expiration
- Cache includes merged transaction list, NFT ownership data, and contract statistics for connected wallet addresses
- Cache key based on wallet address and Base network chainId
- Automatic cache invalidation after 300 seconds
- No persistent storage required, only in-memory caching for performance optimization

## Security Requirements
- Must be hosted over HTTPS
- No private keys are stored or processed in the application
- All transactions are signed directly from user's wallet
- No proxy, relay, or backend transaction signing is used
- All gas/transaction parameters are sent directly from browser to wallet
- Wallet statistics are fetched directly from Etherscan Multichain API without backend intermediaries
- API key is used securely for Etherscan Multichain API requests
- Cache data is stored securely in backend memory without exposing sensitive information

## Technical Requirements
- Modern React + TypeScript application
- shadcn/ui component library
- ethers.js library for Base network interaction
- ethers.ContractFactory support for real contract deployment
- ethers.Interface for function call encoding
- MetaMask, Rabby, and WalletConnect provider integration
- Base Mainnet (chainId: 0x2105) network control and switching operations
- Etherscan Multichain API integration with provided API key for wallet statistics and NFT data
- Base RPC fallback support for contract detection (https://mainnet.base.org)
- Optimized parallel request batching with up to 5 concurrent requests per batch for txlist and tokennfttx data retrieval
- 150ms delay between batches for txlist fetching
- JSON-RPC batch requests (5-10 per batch) for eth_getCode and eth_getTransactionReceipt calls with 200ms throttle between batches
- Motoko backend integration for in-memory caching with 300-second expiration
- Cache implementation for merged results (txlist + NFT stats + contract stats) to avoid redundant API calls on reloads
- Loading indicator with "Loading data from BaseScan…" message during wallet activity data fetching
- Dynamic gas parameter handling based on Gas Mode selection
- Real-time UI updates
- TypeScript type safety
- Advanced error handling and user notifications
- HTTPS deployment support
- Function selector validation and logging
- Ethers v6 compatible transaction options
- NFTFactory contract integration with specified ABI and function selector 0x703270d8
- Wallet-suggested gas pricing for NFT minting functionality
- Modal component for NFT details display with contract information and optional metadata images
- Multi-language support implementation with English and Turkish translations positioned at the very top under the main heading
- Language state management and dynamic text updates with specific Turkish overrides
- Default language setting to English on first application load
- Instant language switching with button group interface
