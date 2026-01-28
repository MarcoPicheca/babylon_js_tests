import * as Physics from "./physics.js";
import { LocalInputController, AIController, NetworkInputController } from "./InputController.js";

/**
 * Game modes enum
 */
export const GAME_MODES =
{
	LOCAL_MULTIPLAYER: "local_multiplayer", // 2 players, same keyboard
	LOCAL_VS_AI: "local_vs_ai", // Player vs AI
	ONLINE: "online", // Player vs Remote player
};

/**
 * Game Manager - handles game logic, physics, and input for all game modes
 */
export class GameManager
{
	constructor(mode, config = {})
	{
		this.mode = mode;
		this.config =
		{
			maxScore: config.maxScore || 5,
			websocket: config.websocket || null,
			playerNames: config.playerNames || { left: "Player 1", right: "Player 2" },
			...config,
		};

		// Initialize game state using physics engine
		this.gameState = Physics.initGameState("left", "right");
		this.gameState.playerNames = this.config.playerNames;
		this.gameState.maxScore = this.config.maxScore;
		this.gameState.gameOver = false;
		this.gameState.winner = null;

		// Input controllers
		this.leftInputController = null;
		this.rightInputController = null;

		// For network mode
		this.networkController = null;
		this.localPlayerId = config.localPlayerId || "left";

		// Initialize based on mode
		this.initializeMode();
	}

	/**
	 * Initialize input controllers based on game mode
	 */
	initializeMode()
	{
		switch (this.mode)
		{
			case GAME_MODES.LOCAL_MULTIPLAYER:
				// Left player: W/S, Right player: Arrow keys
				this.leftInputController = new LocalInputController("w", "s");
				this.rightInputController = new LocalInputController("ArrowUp", "ArrowDown");
				break;

			case GAME_MODES.LOCAL_VS_AI:
			// Player controls left paddle, AI controls right
			this.leftInputController = new LocalInputController("ArrowUp", "ArrowDown");
			this.rightInputController = new AIController(
			this.gameState,
			"right",
				);
				break;

			case GAME_MODES.ONLINE:
				// Local player and network opponent
				this.networkController = new NetworkInputController(this.config.websocket);
				
				if (this.localPlayerId === "left")
				{
					this.leftInputController = new LocalInputController("ArrowUp", "ArrowDown");
					this.rightInputController = this.networkController;
				}
				else
				{
					this.leftInputController = this.networkController;
					this.rightInputController = new LocalInputController("ArrowUp", "ArrowDown");
				}

				break;

			default:
				console.error(`[GameManager] Unknown game mode: ${this.mode}`);
		}
	}

	/**
	 * Main update loop - call this every frame
	 * @param {number} deltaTime - Time delta (default 1 for 60fps)
	 */
	update(deltaTime = 1)
	{
		if (this.gameState.gameOver)
			return;

		// Get input from both controllers
		const leftMovement = this.leftInputController?.getMovement();
		const rightMovement = this.rightInputController?.getMovement();

		// For online mode, server is authoritative - NO LOCAL PHYSICS
		if (this.mode === GAME_MODES.ONLINE && this.networkController)
		{
			// 1. Send movement to server
			const localMovement = this.localPlayerId === "left" ? leftMovement : rightMovement;
			this.networkController.sendMovement(localMovement);

			// 2. Apply server state if available
			const serverState = this.networkController.getServerGameState();
			if (serverState)
			{
				// Server sends complete state - replace (not merge) to avoid stale data
				if (serverState.ball)
					this.gameState.ball = { ...serverState.ball };
				
				// Map server paddle keys (player IDs) to client keys (left/right)
				if (serverState.paddles)
				{
					const serverPaddleKeys = Object.keys(serverState.paddles);
					const leftPaddleKey = serverPaddleKeys[0];
					const rightPaddleKey = serverPaddleKeys[1];
					
					if (serverState.paddles[leftPaddleKey])
						this.gameState.paddles.left = { ...this.gameState.paddles.left, ...serverState.paddles[leftPaddleKey] };
					
					if (serverState.paddles[rightPaddleKey])
						this.gameState.paddles.right = { ...this.gameState.paddles.right, ...serverState.paddles[rightPaddleKey] };
				}
				
				// Update scores
				if (serverState.scores)
				{
					const scoreKeys = Object.keys(serverState.scores);
					if (scoreKeys.length >= 2)
					{
						this.gameState.scores.left = serverState.scores[scoreKeys[0]] || 0;
						this.gameState.scores.right = serverState.scores[scoreKeys[1]] || 0;
					}
				}
			}
			
			// 3. EXIT - Do not run local physics simulation
			return;
		}

		// Update paddle positions (Local / AI modes only)
		if (leftMovement)
		{
			this.gameState.paddles.left.y = Physics.movePaddle(this.gameState.paddles.left.y, leftMovement);
		
			// Activate ball on first movement
			if (!this.gameState.ball.active)
				this.gameState.ball.active = true;
		}

		if (rightMovement)
		{
			this.gameState.paddles.right.y = Physics.movePaddle(this.gameState.paddles.right.y, rightMovement);
		
			// Activate ball on first movement
			if (!this.gameState.ball.active)
				this.gameState.ball.active = true;
		}

		// Update ball position if active
		if (this.gameState.ball.active)
			Physics.updateBallPosition(this.gameState.ball, deltaTime);

		// Check wall collisions (top/bottom)
		const ball = this.gameState.ball;
		if (ball.y <= ball.radius || ball.y >= 1 - ball.radius)
			Physics.elaborateWallCollision(ball);

		// Check paddle collisions
		const leftPaddle = this.gameState.paddles.left;
		const rightPaddle = this.gameState.paddles.right;

		// Left paddle collision
		if (ball.vx < 0 && Physics.checkPaddleCollision(ball, leftPaddle))
			Physics.elaboratePaddleCollision(ball, leftPaddle, 1); // Bounce right

		// Right paddle collision
		if (ball.vx > 0 && Physics.checkPaddleCollision(ball, rightPaddle))
			Physics.elaboratePaddleCollision(ball, rightPaddle, -1); // Bounce left

		// Check for goals
		const goal = Physics.checkGoal(ball);
		if (goal)
			this.handleGoal(goal);
	}

	/**
	 * Handle goal scoring
	 * @param {string} scorer - 'left' or 'right'
	 */
	handleGoal(scorer)
	{
		// Update score
		this.gameState.scores[scorer]++;

		// Reset ball towards the player who got scored on
		const ballDirection = scorer === "left" ? 1 : -1;
		Physics.resetBall(this.gameState.ball, ballDirection);

		// Check for game over
		if (this.gameState.scores[scorer] >= this.gameState.maxScore)
		{
			this.gameState.gameOver = true;
			this.gameState.winner = scorer;
			this.onGameOver(scorer);
		}

		// Callback for goal event
		if (this.onGoal)
			this.onGoal(scorer, this.gameState.scores);
	}

	/**
	 * Called when game is over
	 * @param {string} winner - 'left' or 'right'
	 */
	onGameOver(winner)
	{
		console.log(`[GameManager] Game Over! Winner: ${winner}`);
		// Override this or use setCallbacks
	}

	/**
	 * Set event callbacks
	 * @param {object} callbacks - Object with callback functions
	 */
	setCallbacks(callbacks) 
	{
		if (callbacks.onGoal)
			this.onGoal = callbacks.onGoal;
		if (callbacks.onGameOver)
			this.onGameOver = callbacks.onGameOver;
		if (callbacks.onBallActivate)
			this.onBallActivate = callbacks.onBallActivate;
	}

/**
 * Get current game state (for rendering)
 * @returns {object} Current game state
 */
getGameState()
{
	return this.gameState;
}

/**
 * Get normalized coordinates converted to world coordinates
 * @param {number} minX - Min X in world coordinates
 * @param {number} maxX - Max X in world coordinates
 * @param {number} minZ - Min Z in world coordinates
 * @param {number} maxZ - Max Z in world coordinates
 * @returns {object} World coordinates for rendering
 */
getWorldCoordinates(minX, maxX, minZ, maxZ)
{
	const ball = this.gameState.ball;
	const leftPaddle = this.gameState.paddles.left;
	const rightPaddle = this.gameState.paddles.right;

	// Convert normalized (0-1) to world coordinates
	// X: 0 -> minX, 1 -> maxX
	// Y (which is Z in 3D): 0 -> maxZ (top), 1 -> minZ (bottom) - INVERTED for 3D coordinates
	return {
		ball:
		{
			x: minX + ball.x * (maxX - minX),
			z: maxZ - ball.y * (maxZ - minZ),  // Inverted: 0 maps to maxZ, 1 maps to minZ
		},
		paddles: 
		{
			left:
			{
				x: minX,
				z: maxZ - (leftPaddle.y + leftPaddle.height / 2) * (maxZ - minZ),  // Inverted
			},
			right:
			{
				x: maxX,
				z: maxZ - (rightPaddle.y + rightPaddle.height / 2) * (maxZ - minZ),  // Inverted
			},
		},
		scores: this.gameState.scores,
		gameOver: this.gameState.gameOver,
		winner: this.gameState.winner,
	};
}

	/**
	 * Reset game to initial state
	 */
	reset()
	{
		this.gameState = Physics.initGameState("left", "right");
		this.gameState.playerNames = this.config.playerNames;
		this.gameState.maxScore = this.config.maxScore;
		this.gameState.gameOver = false;
		this.gameState.winner = null;
		this.gameState.ball.active = false;
	}

	/**
	 * Change game mode (reinitializes controllers)
	 * @param {string} newMode - New game mode
	 * @param {object} newConfig - New configuration
	 */
	changeMode(newMode, newConfig = {})
	{
		this.destroy();
		this.mode = newMode;
		this.config = { ...this.config, ...newConfig };
		this.reset();
		this.initializeMode();
	}

	/**
	 * Clean up resources
	 */
	destroy()
	{
		if (this.leftInputController?.destroy)
			this.leftInputController.destroy();
		if (this.rightInputController?.destroy)
			this.rightInputController.destroy();
		if (this.networkController?.destroy)
			this.networkController.destroy();
	}
}

export default GameManager;
