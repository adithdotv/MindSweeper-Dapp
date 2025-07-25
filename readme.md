💣 MinesGame
A decentralized, provably fair version of the classic Mines game, built to run on the Somnia Testnet. This dApp enables players to wager testnet ETH on a 25-tile grid, strategically uncovering diamonds while avoiding hidden mines. The game logic is fully managed by a Solidity smart contract, ensuring transparency, fairness, and trustless gameplay for an engaging betting experience tailored for the Somnia Mini Games Hackathon.

🎮 How to Play
MinesGame offers a simple, intuitive, and thrilling betting experience. The goal is to reveal as many "diamond" tiles as possible without hitting a mine, with each safe tile boosting your potential winnings.

Connect Your Wallet: Connect a Web3 wallet like MetaMask, configured to the Somnia Testnet.

Set Your Terms: Customize your risk and reward before starting:

Bet Amount: Wager testnet ETH (minimum 0.01 ETH) to play.

Number of Mines: Choose 1 to 24 mines to hide on the 25-tile grid. More mines increase risk but amplify the payout multiplier for each diamond found.

Start the Game: Click "Start Game" and approve the transaction in your wallet. This sends your bet to the smart contract, which locks it and generates pseudo-random mine locations for your session.

Find the Diamonds: Interact with the 5x5 grid by clicking tiles to reveal their contents:

💎 Diamond: Success! Your payout multiplier increases. Choose to reveal another tile for a higher reward or cash out to secure your winnings.

💣 Mine: Game over! Hitting a mine forfeits your bet to the house.

Cash Out: After finding at least one diamond, click "Cash Out" to end the game and transfer your bet plus winnings (minus a 2% house fee) to your wallet.

✨ Key Features

Provably Fair: Game logic, including mine placement, is executed on the Somnia Testnet, fully transparent and verifiable via the blockchain explorer.

Decentralized: No central server controls outcomes; all bets, tile reveals, and payouts are managed peer-to-peer via the smart contract.

Player-Controlled Risk: Players set the number of mines (1–24), balancing risk and reward with higher multipliers for riskier games.

Instant Payouts: Winnings are transferred instantly upon cashing out, with contract funding ensured via owner deposits (e.g., 50 testnet ETH).

Secure and Robust: Incorporates OpenZeppelin’s ReentrancyGuard, Ownable, and Pausable for security, plus a 7-day game timeout to prevent stalled games.

Gas-Efficient: Uses a uint32 bitmap for tile states, minimizing gas costs on the Somnia Testnet.
🛠️ Technology Stack


The project leverages a modern Web3 stack optimized for the Somnia Testnet:

Frontend:

Framework: React for a dynamic, user-friendly interface.
Styling: Tailwind CSS for responsive and modern design.
Blockchain Interaction: Ethers.js for seamless interaction with the MinesGame smart contract on the Somnia Testnet.

Blockchain:

Language: Solidity (version ^0.8.19).
Contract: A custom MinesGame.sol contract managing game logic, bets, and payouts.
Target Network: Somnia Testnet, leveraging its fast, low-cost transactions for a smooth gaming experience.

Development & Deployment:

Environment: Node.js for front-end development.
Remix: Used for compiling, testing, and deploying the MinesGame smart contract to the Somnia Testnet.
Testing: Contract tested in Remix’s JavaScript VM and deployed on Somnia Testnet for real-world validation.

🚀 Why It Stands Out

MinesGame combines simplicity, strategy, and blockchain innovation, making it an ideal fit for the Somnia Mini Games Hackathon. Its provably fair mechanics, secure design, and player-driven risk model showcase the potential of decentralized betting games on the Somnia Testnet. The contract’s robust features (reentrancy protection, gas optimization, and timeout handling) ensure a production-ready experience, while the funding mechanism guarantees a seamless demo for judges.

🚀 Getting Started: Local Development

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

Prerequisites
Node.js (v18 or later recommended)
Yarn or npm
A web3 wallet browser extension, such as MetaMask.
Frontend Setup
Clone the repository:

git clone https://github.com/your-username/mines-game.git
Install dependencies:

npm install --legacy-peer-deps

npm start
Open http://localhost:3000 in your browser to see the application.