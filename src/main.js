
import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import { GameManager, GAME_MODES } from "./game/GameManager.js";

const canvas = document.getElementById("firstCanvas");
const engine = new BABYLON.Engine(canvas);

/* =========================================================
   GAME MODE SELECTION
   Change this to switch between modes:
   - GAME_MODES.LOCAL_MULTIPLAYER (2 players: W/S vs Arrow keys)
   - GAME_MODES.LOCAL_VS_AI (Player vs AI)
   - GAME_MODES.ONLINE (requires websocket)
========================================================= */
const CURRENT_MODE = GAME_MODES.LOCAL_VS_AI ; // Change this to test different modes

// Initialize Game Manager
const gameManager = new GameManager(CURRENT_MODE,
{
  maxScore: parseInt(import.meta.env.VITE_MAX_SCORE) || 5,
  aiDifficulty: import.meta.env.VITE_AI_DEFAULT_DIFFICULTY || "medium",
  playerNames: {
    left: "You",
    right: "AI"
  }
});

/* =========================================================
   WORLD COORDINATE BOUNDS (for converting normalized to 3D)
========================================================= */
const WORLD_BOUNDS = {
  minX: -25,
  maxX: 25,
  minZ: -25,
  maxZ: 25
};

/* =========================================================
   SCENE
========================================================= */

function createScene() {
  const scene = new BABYLON.Scene(engine);

  scene.clearColor = new BABYLON.Color3(0.6, 0.5, 0);

  /* =======================
     CAMERA
  ======================= */
  const camera = new BABYLON.UniversalCamera(
    "camera",
    new BABYLON.Vector3(0, 50, -55),
    scene
  );

  camera.inputs.clear();
  camera.attachControl(canvas, true);
  scene.activeCamera = camera;

  /* =======================
     LIGHT
  ======================= */
  const light = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(60, 100, 20),
    scene
  );
  light.intensity = 0.5;

  /* =======================
     SHADOW LIGHT
  ======================= */
  const shadowLight = new BABYLON.DirectionalLight(
    "shadowLight",
    new BABYLON.Vector3(-1, -2, -1),
    scene
  );

  shadowLight.position = new BABYLON.Vector3(0, 40, 0);

  const shadowGenerator = new BABYLON.ShadowGenerator(1024, shadowLight);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurKernel = 32;

  /* =======================
     UI
  ======================= */
  const ui = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

  const scoreText = new GUI.TextBlock();
  scoreText.text = "0 : 0";
  scoreText.color = "white";
  scoreText.fontSize = 48;
  scoreText.fontFamily = "Liberation Sans";
  scoreText.top = "-40%";
  ui.addControl(scoreText);

  const playerName1 = new GUI.TextBlock();
  playerName1.text = gameManager.getGameState().playerNames.left;
  playerName1.color = "white";
  playerName1.fontFamily = "Liberation Sans";
  playerName1.fontSize = 48;
  playerName1.top = "-40%";
  playerName1.left = "-40%";
  ui.addControl(playerName1);

  const playerName2 = new GUI.TextBlock();
  playerName2.text = gameManager.getGameState().playerNames.right;
  playerName2.color = "white";
  playerName2.fontFamily = "Liberation Sans";
  playerName2.fontSize = 48;
  playerName2.top = "-40%";
  playerName2.left = "40%";
  ui.addControl(playerName2);

  const gameOverText = new GUI.TextBlock();
  gameOverText.text = "";
  gameOverText.color = "red";
  gameOverText.top = "-35%";
  gameOverText.fontSize = 48;
  gameOverText.fontFamily = "Liberation Sans";
  ui.addControl(gameOverText);

  /* =======================
     PADDLES (Babylon meshes)
  ======================= */

  // right paddle (Player 2)
  const box = BABYLON.MeshBuilder.CreateBox(
    "box1",
    {
      height: 1,
      width: 2,
      depth: 5,
      faceColors: [
        new BABYLON.Color4(1, 0, 0, 1),
        new BABYLON.Color4(1, 0, 0, 1),
        new BABYLON.Color4(1, 0, 0, 1),
        new BABYLON.Color4(1, 0, 0, 1),
        new BABYLON.Color4(1, 0, 0, 1),
        new BABYLON.Color4(1, 0, 0, 1)
      ]
    },
    scene
  );
  box.position.set(25, 4, 0);

  // left paddle (Player 1)
  const box2 = BABYLON.MeshBuilder.CreateBox(
    "box2",
    {
      height: 1,
      width: 2,
      depth: 5,
      faceColors: [
        new BABYLON.Color4(0, 0, 1, 1),
        new BABYLON.Color4(0, 0, 1, 1),
        new BABYLON.Color4(0, 0, 1, 1),
        new BABYLON.Color4(0, 0, 1, 1),
        new BABYLON.Color4(0, 0, 1, 1),
        new BABYLON.Color4(0, 0, 1, 1)
      ]
    },
    scene
  );
  box2.position.set(-25, 4, 0);

  /* =======================
     BALL (mesh + pure state)
  ======================= */
  const sphere = BABYLON.MeshBuilder.CreateSphere(
    "sphere",
    { diameter: 2, segments: 32 },
    scene
  );
  sphere.position.set(0, 4, 0);

  shadowGenerator.addShadowCaster(sphere);
  shadowGenerator.addShadowCaster(box);
  shadowGenerator.addShadowCaster(box2);

  /* =======================
     GROUND
  ======================= */
  const groundHighMap = new BABYLON.MeshBuilder.CreateGroundFromHeightMap(
    "heighMapGround",
    "/public/topoGraphicMap.png",
    {
      height: 60,
      depth: 50,
      width: 80
    },
    scene
  );

  groundHighMap.position.y = -1;
  groundHighMap.receiveShadows = true;

  const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
  groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.2);
  groundMaterial.specularColor = BABYLON.Color3.Black();
  groundHighMap.material = groundMaterial;

  camera.setTarget(groundHighMap.position);

  /* =======================
     GAME MANAGER CALLBACKS
  ======================= */
  gameManager.setCallbacks({
    onGoal: (scorer, scores) => {
      scoreText.text = `${scores.left} : ${scores.right}`;
    },
    onGameOver: (winner) => {
      const winnerName = winner === "left" 
        ? gameManager.getGameState().playerNames.left 
        : gameManager.getGameState().playerNames.right;
      gameOverText.text = `${winnerName} HAS WON`;
    }
  });

  /* =======================
     MAIN LOOP - Now using GameManager
  ======================= */
  scene.onBeforeRenderObservable.add(() => {
    // Update game logic via GameManager
    gameManager.update();

    // Get world coordinates from normalized game state
    const worldCoords = gameManager.getWorldCoordinates(
      WORLD_BOUNDS.minX,
      WORLD_BOUNDS.maxX,
      WORLD_BOUNDS.minZ,
      WORLD_BOUNDS.maxZ
    );

    // Update visual representation
    sphere.position.x = worldCoords.ball.x;
    sphere.position.z = worldCoords.ball.z;

    box2.position.x = worldCoords.paddles.left.x;
    box2.position.z = worldCoords.paddles.left.z;

    box.position.x = worldCoords.paddles.right.x;
    box.position.z = worldCoords.paddles.right.z;
  });

  return scene;
}

/* =========================================================
   RUN
========================================================= */

const scenario = createScene();

engine.runRenderLoop(() => {
  scenario.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});


// OLD VERSION PEER CONFRONTO


// /**
//  * 
//  * to display a 3D element abbiamo bisogno di 4 
//  * pezzi fondamentali:
//  * - CANVAS ELEMENT: un elemento html <canvas></canvas>
//  * - ENGIN: CreateBox() crea l'oggetto interattivo
//  * - SCENE: crea lo spazio in cui si sviluppano le coordinate
//  *          per la logica 3D (x, y, z)
//  * - CAMERA: da dove viene visto parte della scena
//  *
//  */

// // TODO
// /**
//  * vite non aggiunge automaticamente i pacchetti anche
//  * se l'importi per cui prima devi fare ad es.
//  * npm install @babylonjs/gui
//  * perchè vite scarica automaticamente solo il core
//  * di babylon
// */
// import * as BABYLON from '@babylonjs/core'
// import * as GUI from '@babylonjs/gui';


// const canvas = document.getElementById('firstCanvas');

// const engine = new BABYLON.Engine(canvas);
// let gameOver = false;
// let winner = "";

// function createScene() {

// 	const scene = new BABYLON.Scene(engine);

// 	/* =======================
// 	   BACKGROUND COLOR
// 	======================= */
// 	scene.clearColor = new BABYLON.Color3(0.6, 0.5, 0);

// 	/* =======================
// 	   CAMERA
// 	======================= */

// 	const camera = new BABYLON.UniversalCamera(
// 		"camera",
// 		new BABYLON.Vector3(0, 50, -55),
// 		scene
// 	);

// 	camera.inputs.clear();
// 	camera.attachControl(canvas, true);
// 	scene.activeCamera = camera;

// 	/* =======================
// 	   LUCE
// 	======================= */
// 	const light = new BABYLON.HemisphericLight(
// 		"light",
// 		new BABYLON.Vector3(60, 100, 20),
// 		scene
// 	);
// 	light.intensity = 0.5;

// 	/* =======================
// 	SHADOW LIGHT
// 	======================= */

// 	// TODO 
// 	const shadowLight = new BABYLON.DirectionalLight(
// 		"shadowLight",
// 		new BABYLON.Vector3(-1, -2, -1),
// 		scene
// 	);

// 	shadowLight.position = new BABYLON.Vector3(0, 40, 0);
// 	const shadowGenerator = new BABYLON.ShadowGenerator(1024, shadowLight);
// 	shadowGenerator.useBlurExponentialShadowMap = true;
// 	shadowGenerator.blurKernel = 32;

// 	/* =======================
// 	SCOREBOARD AND NAMES UI
// 	======================= */

// 	const ui = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

// 	const scoreText = new GUI.TextBlock();
// 	scoreText.text = "0 : 0";
// 	scoreText.color = "white";
// 	scoreText.fontSize = 48;
// 	scoreText.fontFamily = "Liberation Sans";
// 	scoreText.top = "-40%";

// 	// names
// 	const playerName1 = new GUI.TextBlock();
// 	playerName1.text = "name player 1";
// 	playerName1.color = "white";
// 	playerName1.fontFamily = "Liberation Sans";
// 	playerName1.fontSize = 48;
// 	playerName1.top = "-40%";
// 	playerName1.left = "-40%";
// 	ui.addControl(playerName1);

// 	const playerName2 = new GUI.TextBlock();
// 	playerName2.text = "name player 2";
// 	playerName2.color = "white";
// 	playerName2.fontFamily = "Liberation Sans";
// 	playerName2.fontSize = 48;
// 	playerName2.top = "-40%";
// 	playerName2.left = "40%";
// 	ui.addControl(playerName2);


// 	ui.addControl(scoreText);

// 	/* =======================
// 	   BOX player 2
// 	======================= */
// 	const box = BABYLON.MeshBuilder.CreateBox("box1",
// 		{
// 			height: 1,
// 			width: 2,
// 			depth: 5,
// 			faceColors: [
// 				new BABYLON.Color4(1, 0, 0, 1),
// 				new BABYLON.Color4(1, 0, 0, 1),
// 				new BABYLON.Color4(1, 0, 0, 1),
// 				new BABYLON.Color4(1, 0, 0, 1),
// 				new BABYLON.Color4(1, 0, 0, 1),
// 				new BABYLON.Color4(1, 0, 0, 1)
// 			]
// 		},
// 		scene);
// 	box.position.set(25, 4, 0);

// 	/* =======================
// 	   BOX player 1
// 	======================= */

// 	const box2 = BABYLON.MeshBuilder.CreateBox("box2", {
// 		height: 1,
// 		width: 2,
// 		depth: 5,
// 		faceColors: [
// 			new BABYLON.Color4(0, 0, 1, 1),
// 			new BABYLON.Color4(0, 0, 1, 1),
// 			new BABYLON.Color4(0, 0, 1, 1),
// 			new BABYLON.Color4(0, 0, 1, 1),
// 			new BABYLON.Color4(0, 0, 1, 1),
// 			new BABYLON.Color4(0, 0, 1, 1)
// 		]
// 	}, scene);

// 	box2.position.set(-25, 4, 0);

// 	/* =======================
// 	   SPHERE
// 	======================= */

// 	const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {
// 		diameter: 2,
// 		segments: 32
// 	}, scene);

// 	sphere.position.set(0, 4, 0);
// 	let ballDir = new BABYLON.Vector3(0.15, 0, 0.2);
// 	let ballSpeed = 2.00;
// 	const ballLimit = 24;

// 	shadowGenerator.addShadowCaster(sphere);
// 	shadowGenerator.addShadowCaster(box);
// 	shadowGenerator.addShadowCaster(box2);

// 	/* =======================
// 	SCORE
// 	======================= */
// 	let scorePlayer1 = 0; // box2 (sinistra)
// 	let scorePlayer2 = 0; // box (destra)


// 	/* =======================
// 	   GROUND
// 	======================= */

// 	const groundHighMap = new BABYLON.MeshBuilder.CreateGroundFromHeightMap('heighMapGround', '/public/topoGraphicMap.png',
// 		{
// 			height: 60,
// 			depth: 50,
// 			width: 80,
// 			// per vedere i rilievi
// 			// subdivisiion: 50
// 		}, scene);
// 	groundHighMap.position.y = -1;
// 	groundHighMap.receiveShadows = true;

// 	/* =======================
// 	GROUND MATERIAL
// 	======================= */
// 	const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
// 	groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.2); // verde campo
// 	groundMaterial.specularColor = BABYLON.Color3.Black(); // niente riflessi

// 	groundHighMap.material = groundMaterial;

// 	camera.setTarget(groundHighMap.position);

// 	/* =======================
// 	   INPUT
// 	======================= */

// 	const inputMap = {};
// 	scene.actionManager = new BABYLON.ActionManager(scene);

// 	scene.actionManager.registerAction(
// 		new BABYLON.ExecuteCodeAction(
// 			BABYLON.ActionManager.OnKeyDownTrigger,
// 			evt => inputMap[evt.sourceEvent.key] = true
// 		)
// 	);

// 	scene.actionManager.registerAction(
// 		new BABYLON.ExecuteCodeAction(
// 			BABYLON.ActionManager.OnKeyUpTrigger,
// 			evt => inputMap[evt.sourceEvent.key] = false
// 		)
// 	);

// 	/* =======================
// 	   MOVIMENTO PLAYER + CAMERA
// 	======================= */
// 	let playerBox = 0;
// 	let playerBox2 = 0;
// 	const speed = 0.5;
// 	const minZ = -25;
// 	const maxZ = 25;
// 	let ballActive = false;

// 	// per AI player
// 	const aiSpeed = 0.35;
// 	const aiReactionDistance = 20; // quanto vicino deve essere la palla
// 	let aiActive = false;


// 	/* =======================
// 	   FUNZIONE PER COLLISIONE PALLA <-> PADDLE
// 	======================= */
// 	function checkBallPaddleCollision(ball, paddle, player) {
// 		const ballRadius = 1;
// 		const paddleHalfZ = 2.5;
// 		const paddleHalfX = 1;

// 		const collisionX =
// 			Math.abs(ball.position.x - paddle.position.x) <=
// 			ballRadius + paddleHalfX;

// 		const collisionZ =
// 			Math.abs(ball.position.z - paddle.position.z) <=
// 			ballRadius + paddleHalfZ;
// 		return collisionX && collisionZ;
// 	}

// 	scene.onBeforeRenderObservable.add(() => {

// 		if (gameOver && winner != ""){
// 			const gameOvertext = new GUI.TextBlock();
// 			gameOvertext.text = winner + " HAS WON";
// 			gameOvertext.color = "red";
// 			gameOvertext.top = "-35%";
// 			gameOvertext.fontSize = 48;
// 			gameOvertext.fontFamily = "Liberation Sans";
// 			ui.addControl(gameOvertext);
// 			return;	
// 		} 
// 		/* =======================
// 		   PLAYER 1 – up / down (default camera)
// 		======================= */
// 		if (inputMap["ArrowUp"]) {
// 			if (ballActive === false)
// 				ballActive = true;
// 			playerBox += speed;
// 		}
// 		if (inputMap["ArrowDown"]) {
// 			if (ballActive === false)
// 				ballActive = true;
// 			playerBox -= speed;
// 		}

// 		playerBox = BABYLON.Scalar.Clamp(playerBox, minZ, maxZ);

// 		box.position.z = playerBox;
// 		/* =======================
// 		   PLAYER 2 – W / S (default camera)
// 		======================= */
// 		if (inputMap["s"] || inputMap["S"]) {
// 			if (ballActive === false)
// 				ballActive = true;
// 			playerBox2 -= speed;
// 		}
// 		if (inputMap["w"] || inputMap["W"]) {
// 			if (ballActive === false)
// 				ballActive = true;
// 			playerBox2 += speed;
// 		}

// 		playerBox2 = BABYLON.Scalar.Clamp(playerBox2, minZ, maxZ);
// 		box2.position.z = playerBox2;

// 		/* =======================
// 		BALL MOVEMENT
// 		======================= */

// 		// funzione per cambio coordinate palla
		

// 		// Movimento lineare
// 		if (ballActive) {
// 			sphere.position.x += ballDir.x * ballSpeed;
// 			sphere.position.z += ballDir.z * ballSpeed;
// 		}

// 		/* =======================
// 		BALL ↔ PADDLE COLLISION
// 		======================= */

// 		// Paddle destro
// 		if (checkBallPaddleCollision(sphere, box, 2) && ballDir.x > 0) {
// 			ballDir.x *= -1;

// 			// variazione angolo in base a dove colpisce il paddle
// 			const hitOffset = sphere.position.z - box.position.z;
// 			ballDir.z = hitOffset * 0.05;
// 		}

// 		// Paddle sinistro
// 		if (checkBallPaddleCollision(sphere, box2, 1) && ballDir.x < 0) {
// 			ballDir.x *= -1;

// 			const hitOffset = sphere.position.z - box2.position.z;
// 			ballDir.z = hitOffset * 0.05;
// 		}

// 		/* =======================
// 		   AI PLAYER
// 		======================= */
// 		// TODO decomment
// 		// if (!gameOver) {
// 		// 	const distanceX = Math.abs(sphere.position.x - box2.position.x);

// 		// 	if (aiActive && distanceX < aiReactionDistance) {
// 		// 		if (sphere.position.z > box2.position.z + 0.7) {
// 		// 			playerBox2 += aiSpeed;
// 		// 		}
// 		// 		else if (sphere.position.z < box2.position.z - 0.7) {
// 		// 			playerBox2 -= aiSpeed;
// 		// 		}
// 		// 	}

// 		// 	playerBox2 = BABYLON.Scalar.Clamp(playerBox2, minZ, maxZ);
// 		// 	box2.position.z = playerBox2;
// 		// }

// 		// Limiti X
// 		/* =======================
// 		   GOAL + RESET
// 		======================= */
// 		if (sphere.position.x > ballLimit) {
// 			scorePlayer1++;
// 			scoreText.text = `${scorePlayer1} : ${scorePlayer2}`;
// 			sphere.position.set(0, 4, 0);
// 			ballDir = new BABYLON.Vector3(-0.15, 0, 0.2);
// 			ballActive = false;
// 			ballSpeed += 0.05;
// 			playerBox = 0;
// 			playerBox2 = 0;
// 			box.position.set(25, 4, 0);
// 			box2.position.set(-25, 4, 0);
// 			if (scorePlayer1 == 5)
// 			{
// 				winner = playerName1.text;
// 				gameOver = true;
// 			}
// 			return;
// 		}

// 		if (sphere.position.x < -ballLimit) {
// 			scorePlayer2++;
// 			scoreText.text = `${scorePlayer1} : ${scorePlayer2}`;
// 			sphere.position.set(0, 4, 0);
// 			ballDir = new BABYLON.Vector3(0.15, 0, 0.2);
// 			ballActive = false;
// 			ballSpeed += 0.05;
// 			playerBox = 0;
// 			playerBox2 = 0;
// 			box.position.set(25, 4, 0);
// 			box2.position.set(-25, 4, 0);
// 			if (scorePlayer2 == 5)
// 			{
// 				winner = playerName2.text;
// 				gameOver = true;
// 			}
// 			return;
// 		}

// 		// Limiti Z
// 		if (sphere.position.z >= ballLimit || sphere.position.z <= -ballLimit) {
// 			ballDir.z *= -1;
// 		}
// 	});

// 	return scene;
// }

// const scenario = createScene();

// engine.runRenderLoop(() => {
// 	scenario.render();
// });

// window.addEventListener("resize", () => {
// 	engine.resize();
// });
