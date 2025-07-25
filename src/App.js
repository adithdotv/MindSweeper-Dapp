import React, { useState, useEffect, useCallback } from 'react';
import { 
  createPublicClient, 
  createWalletClient, 
  custom, 
  formatEther, 
  parseEther
} from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI, SOMNIA_TESTNET, somniaTestnet } from './contractConfig';
import toast, { Toaster } from 'react-hot-toast';

function App() {
  const [account, setAccount] = useState('');
  const [publicClient, setPublicClient] = useState(null);
  const [walletClient, setWalletClient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gameState, setGameState] = useState({
    bet: 0,
    mineCount: 0,
    diamondsFound: 0,
    revealedTilesBitmap: 0,
    active: false,
    timeLeft: 0
  });
  const [betAmount, setBetAmount] = useState('0.5');
  const [selectedMines, setSelectedMines] = useState(3);
  const [minimumBet, setMinimumBet] = useState('0');
  const [gameResult, setGameResult] = useState(null); // 'win', 'lose', or null
  const [mineTiles, setMineTiles] = useState(new Set()); // Track which tiles are mines

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error('Please install MetaMask!');
      return;
    }

    try {
      setLoading(true);
      
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      // Add/Switch to Somnia testnet
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SOMNIA_TESTNET.chainId }],
        });
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [SOMNIA_TESTNET],
            });
          } catch (addError) {
            toast.error('Failed to add Somnia testnet to MetaMask');
            return;
          }
        } else {
          toast.error('Failed to switch to Somnia testnet');
          return;
        }
      }

      // Create Viem clients
      const publicClient = createPublicClient({
        chain: somniaTestnet,
        transport: custom(window.ethereum)
      });

      const walletClient = createWalletClient({
        chain: somniaTestnet,
        transport: custom(window.ethereum)
      });

      setAccount(accounts[0]);
      setPublicClient(publicClient);
      setWalletClient(walletClient);
      
      // Get minimum bet using public client
      const minBet = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'minimumBet',
      });
      
      setMinimumBet(formatEther(minBet));
      
      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  // Load game state
  const loadGameState = useCallback(async () => {
    if (!publicClient || !account) return;

    try {
      const state = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getGameState',
        args: [account],
      });

      setGameState({
        bet: formatEther(state[0]),
        mineCount: Number(state[1]),
        diamondsFound: Number(state[2]),
        revealedTilesBitmap: Number(state[3]),
        active: state[4],
        timeLeft: Number(state[5])
      });
    } catch (error) {
      console.error('Error loading game state:', error);
    }
  }, [publicClient, account]);

  // Start new game
  const startGame = async () => {
    if (!walletClient || !account) return;

    try {
      setLoading(true);
      const betInWei = parseEther(betAmount);
      
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'startGame',
        args: [selectedMines],
        value: betInWei,
        account: account,
      });
      
      toast.loading('Starting game...', { id: 'start-game' });
      
      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash });
      
      toast.success('Game started!', { id: 'start-game' });
      
      await loadGameState();
    } catch (error) {
      console.error('Error starting game:', error);
      toast.error('Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  // Reveal tile
  const revealTile = async (tileIndex) => {
    if (!walletClient || !gameState.active || !account) return;

    try {
      setLoading(true);
      
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'revealTile',
        args: [tileIndex],
        account: account,
      });
      
      toast.loading('Revealing tile...', { id: 'reveal-tile' });
      
      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      console.log('Transaction receipt:', receipt);
      console.log('Receipt logs:', receipt.logs);
      
      // Process all logs to find relevant events
      let hitMine = false;
      let gameEnded = false;
      
      for (const log of receipt.logs) {
        try {
          const decoded = publicClient.decodeEventLog({
            abi: CONTRACT_ABI,
            data: log.data,
            topics: log.topics,
          });
          
          console.log('Decoded event:', decoded);
          
          if (decoded.eventName === 'TileRevealed') {
            console.log('TileRevealed event args:', decoded.args);
            if (decoded.args.isMine) {
              hitMine = true;
              setMineTiles(prev => new Set([...prev, Number(decoded.args.index)]));
              console.log('Player hit a mine!');
            }
          }
          
          if (decoded.eventName === 'GameEnded') {
            console.log('GameEnded event args:', decoded.args);
            gameEnded = true;
            if (!decoded.args.cashedOut) {
              hitMine = true; // Game ended without cashing out means mine hit
            }
          }
        } catch (decodeError) {
          // Skip logs that can't be decoded with our ABI
          console.log('Could not decode log:', decodeError);
        }
      }
      
      // Load updated game state first
      await loadGameState();
      
      // Handle the results
      if (hitMine) {
        setGameResult('lose');
        toast.error('💥 BOOM! You hit a mine! Game over.', { 
          id: 'reveal-tile',
          duration: 4000 
        });
      } else if (gameEnded) {
        setGameResult('win');
        toast.success('🎉 Congratulations! You won!', {
          id: 'reveal-tile',
          duration: 5000
        });
      } else {
        // Check if game is still active after state update
        const updatedState = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'getGameState',
          args: [account],
        });
        
        if (!updatedState[4]) { // active = false
          // Game ended, check if it was due to mine
          setGameResult('lose');
          toast.error('💥 BOOM! You hit a mine! Game over.', { 
            id: 'reveal-tile',
            duration: 4000 
          });
        } else {
          // Player found a diamond
          toast.success('💎 Diamond found!', { id: 'reveal-tile' });
        }
      }
      
    } catch (error) {
      console.error('Error revealing tile:', error);
      toast.error('Failed to reveal tile');
    } finally {
      setLoading(false);
    }
  };

  // Cash out
  const cashOut = async () => {
    if (!walletClient || !gameState.active || !account) return;

    try {
      setLoading(true);
      
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'cashOut',
        account: account,
      });
      
      toast.loading('Cashing out...', { id: 'cash-out' });
      
      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // Check for GameEnded event to get reward amount
      let rewardAmount = 0;
      for (const log of receipt.logs) {
        try {
          const decoded = publicClient.decodeEventLog({
            abi: CONTRACT_ABI,
            data: log.data,
            topics: log.topics,
          });
          
          if (decoded.eventName === 'GameEnded' && decoded.args.cashedOut) {
            rewardAmount = formatEther(decoded.args.reward);
            break;
          }
        } catch (decodeError) {
          // Skip logs that can't be decoded
        }
      }
      
      setGameResult('win');
      toast.success(`🎉 Successfully cashed out ${rewardAmount} STT!`, { id: 'cash-out' });
      
      await loadGameState();
    } catch (error) {
      console.error('Error cashing out:', error);
      toast.error('Failed to cash out');
    } finally {
      setLoading(false);
    }
  };

  // Calculate multiplier based on mines and diamonds found
  const calculateMultiplier = () => {
    if (gameState.diamondsFound === 0) return 1;
    const totalTiles = 25;
    const safeTiles = totalTiles - gameState.mineCount;
    let multiplier = 1;
    
    for (let i = 0; i < gameState.diamondsFound; i++) {
      multiplier *= (safeTiles - i) / (totalTiles - i);
    }
    
    return (1 / multiplier).toFixed(2);
  };

  // Check if tile is revealed
  const isTileRevealed = (index) => {
    return (gameState.revealedTilesBitmap & (1 << index)) !== 0;
  };

  // Reset game state for new game
  const resetGame = () => {
    setGameResult(null);
    setMineTiles(new Set());
    setGameState({
      bet: 0,
      mineCount: 0,
      diamondsFound: 0,
      revealedTilesBitmap: 0,
      active: false,
      timeLeft: 0
    });
  };

  // Load game state on account change
  useEffect(() => {
    if (account && publicClient) {
      loadGameState();
    }
  }, [account, publicClient, loadGameState]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setAccount('');
          setPublicClient(null);
          setWalletClient(null);
        } else {
          setAccount(accounts[0]);
        }
      });
    }
  }, []);

  return (
    <div className="app">
      <Toaster position="top-right" />
      
      <div className="header">
        <div className="logo-container">
          <div className="logo">
            <div className="logo-brain">
              <div className="brain-core"></div>
              <div className="neural-network">
                <div className="neuron neuron-1"></div>
                <div className="neuron neuron-2"></div>
                <div className="neuron neuron-3"></div>
                <div className="neuron neuron-4"></div>
                <div className="connection connection-1"></div>
                <div className="connection connection-2"></div>
                <div className="connection connection-3"></div>
              </div>
              <div className="scan-line"></div>
            </div>
            <div className="logo-text">
              <span className="mind">MIND</span>
              <span className="sweeper">SWEEPER</span>
            </div>
          </div>
          <div className="logo-subtitle">Neural Network Gaming Protocol</div>
        </div>
        <p>Powered by Somnia Testnet</p>
      </div>

      <div className="wallet-section">
        {!account ? (
          <button 
            className="connect-btn" 
            onClick={connectWallet}
            disabled={loading}
          >
            {loading ? <div className="loading"></div> : 'Connect Wallet'}
          </button>
        ) : (
          <div className="wallet-info">
            <p>Connected:</p>
            <div className="wallet-address">
              {account.slice(0, 6)}...{account.slice(-4)}
            </div>
          </div>
        )}
      </div>

      {account && (
        <div className="game-container">
          {gameResult ? (
            // Game Over Screen
            <div className="game-result">
              <div className={`result-message ${gameResult}`}>
                {gameResult === 'lose' ? (
                  <>
                    <h2>💥 Game Over!</h2>
                    <p>You hit a mine and lost {gameState.bet} STT</p>
                    <p>Better luck next time!</p>
                  </>
                ) : (
                  <>
                    <h2>🎉 Congratulations!</h2>
                    <p>You successfully cashed out!</p>
                    <p>Great job avoiding those mines!</p>
                  </>
                )}
              </div>
              
              <div className="game-stats">
                <div className="stat-card">
                  <h4>Final Bet</h4>
                  <p>{gameState.bet} STT</p>
                </div>
                <div className="stat-card">
                  <h4>Mines</h4>
                  <p>{gameState.mineCount}</p>
                </div>
                <div className="stat-card">
                  <h4>Diamonds Found</h4>
                  <p>{gameState.diamondsFound}</p>
                </div>
                <div className="stat-card">
                  <h4>Final Multiplier</h4>
                  <p>{calculateMultiplier()}x</p>
                </div>
              </div>

              <div className="game-actions">
                <button 
                  className="start-game-btn"
                  onClick={resetGame}
                  disabled={loading}
                >
                  {loading ? <div className="loading"></div> : 'Try Again'}
                </button>
              </div>
            </div>
          ) : !gameState.active ? (
            // Game Setup Screen
            <div className="game-controls">
              <div className="control-group">
                <label>Bet Amount (STT)</label>
                <input
                  type="number"
                  step="0.001"
                  min={minimumBet}
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Enter bet amount"
                />
                <small>Minimum bet: {minimumBet} STT</small>
              </div>
              
              <div className="control-group">
                <label>Number of Mines</label>
                <select 
                  value={selectedMines} 
                  onChange={(e) => setSelectedMines(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <option key={num} value={num}>{num} mines</option>
                  ))}
                </select>
              </div>
              
              <button 
                className="start-game-btn"
                onClick={startGame}
                disabled={loading || !betAmount || parseFloat(betAmount) < parseFloat(minimumBet)}
              >
                {loading ? <div className="loading"></div> : 'Start Game'}
              </button>
            </div>
          ) : (
            // Active Game Screen
            <>
              <div className="game-stats">
                <div className="stat-card">
                  <h4>Bet Amount</h4>
                  <p>{gameState.bet} STT</p>
                </div>
                <div className="stat-card">
                  <h4>Mines</h4>
                  <p>{gameState.mineCount}</p>
                </div>
                <div className="stat-card">
                  <h4>Diamonds Found</h4>
                  <p>{gameState.diamondsFound}</p>
                </div>
                <div className="stat-card multiplier-card">
                  <h4>Current Multiplier</h4>
                  <p>{calculateMultiplier()}x</p>
                  <div className="multiplier-hint">
                    <span className="hint-icon">💡</span>
                    <span className="hint-text">Each diamond found increases your multiplier. More mines = higher risk, higher reward!</span>
                  </div>
                </div>
              </div>

              <div className="game-board">
                {Array.from({ length: 25 }, (_, index) => {
                  const isRevealed = isTileRevealed(index);
                  const isMine = mineTiles.has(index);
                  
                  return (
                    <button
                      key={index}
                      className={`tile ${isRevealed ? 'revealed' : ''} ${isMine ? 'mine' : ''}`}
                      onClick={() => revealTile(index)}
                      disabled={loading || isRevealed || gameResult}
                    >
                      {isRevealed ? (isMine ? '💥' : '💎') : '?'}
                    </button>
                  );
                })}
              </div>

              <div className="game-actions">
                <button 
                  className="cash-out-btn"
                  onClick={cashOut}
                  disabled={loading || gameState.diamondsFound === 0}
                >
                  {loading ? <div className="loading"></div> : `Cash Out (${(parseFloat(gameState.bet) * parseFloat(calculateMultiplier())).toFixed(4)} STT)`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;