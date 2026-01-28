
import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";

const canvas = document.getElementById("firstCanvas");
const engine = new BABYLON.Engine(canvas);

let gameOver = false;
let winner = "";

/* =========================================================
   PURE GAME LOGIC (NO BABYLON)
========================================================= */

function createBallState() {
  return {
    x: 0,
    z: 0,
    dirX: 0.15,
    dirZ: 0.2,
    speed: 2.0,
    active: false,
    radius: 1
  };
}

function updateBall(ball, limitZ) {
  if (!ball.active) return;

  ball.x += ball.dirX * ball.speed;
  ball.z += ball.dirZ * ball.speed;

  // wall bounce Z
  if (ball.z >= limitZ || ball.z <= -limitZ) {
    ball.dirZ *= -1;
  }

  // TODO: test per valutare movimento
    // console.log("BALL LOGIC:", ball.x, ball.z);
}

function checkPaddleCollision(ball, paddleX, paddleZ) {
  const paddleHalfZ = 2.5;
  const paddleHalfX = 1;

  const collisionX =
    Math.abs(ball.x - paddleX) <= ball.radius + paddleHalfX;

  const collisionZ =
    Math.abs(ball.z - paddleZ) <= ball.radius + paddleHalfZ;

	// TODO: test collision pading
    // console.log("paddle LOGIC:", paddleX, paddleZ, "ball LOGIC:", ball.x, ball.z);

  return collisionX && collisionZ;
}

function bounceOnPaddle(ball, paddleZ) {
  // invert X direction
  ball.dirX *= -1;

  // change Z direction depending on hit offset
  const hitOffset = ball.z - paddleZ;
  ball.dirZ = hitOffset * 0.05;
}

function resetBall(ball, dirX) {
  ball.x = 0;
  ball.z = 0;
  ball.dirX = dirX;       // +0.15 or -0.15
  ball.dirZ = 0.2;
  ball.active = false;
}

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
  playerName1.text = "Player 1";
  playerName1.color = "white";
  playerName1.fontFamily = "Liberation Sans";
  playerName1.fontSize = 48;
  playerName1.top = "-40%";
  playerName1.left = "-40%";
  ui.addControl(playerName1);

  const playerName2 = new GUI.TextBlock();
  playerName2.text = "Player 2";
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

  const ballState = createBallState();

  const ballLimitX = 24; // goal line X
  const ballLimitZ = 24; // wall Z

  shadowGenerator.addShadowCaster(sphere);
  shadowGenerator.addShadowCaster(box);
  shadowGenerator.addShadowCaster(box2);

  /* =======================
     SCORE
  ======================= */
  let scorePlayer1 = 0; // left paddle (box2)
  let scorePlayer2 = 0; // right paddle (box)

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
     INPUT
  ======================= */
  const inputMap = {};
  scene.actionManager = new BABYLON.ActionManager(scene);

  scene.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(
      BABYLON.ActionManager.OnKeyDownTrigger,
      (evt) => (inputMap[evt.sourceEvent.key] = true)
    )
  );

  scene.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(
      BABYLON.ActionManager.OnKeyUpTrigger,
      (evt) => (inputMap[evt.sourceEvent.key] = false)
    )
  );

  /* =======================
     PLAYER MOVEMENT
  ======================= */
  let playerBoxZ = 0;
  let playerBox2Z = 0;

  const speed = 0.5;
  const minZ = -25;
  const maxZ = 25;

  /* =======================
     MAIN LOOP
  ======================= */
  scene.onBeforeRenderObservable.add(() => {
    if (gameOver) {
      gameOverText.text = `${winner} HAS WON`;
      return;
    }

    /* =======================
       PLAYER 1 (ArrowUp/ArrowDown) -> right paddle (box)
    ======================= */
    if (inputMap["ArrowUp"]) {
      if (!ballState.active) ballState.active = true;
      playerBoxZ += speed;
    }
    if (inputMap["ArrowDown"]) {
      if (!ballState.active) ballState.active = true;
      playerBoxZ -= speed;
    }

    playerBoxZ = BABYLON.Scalar.Clamp(playerBoxZ, minZ, maxZ);
    box.position.z = playerBoxZ;

    /* =======================
       PLAYER 2 (W/S) -> left paddle (box2)
    ======================= */
    if (inputMap["w"] || inputMap["W"]) {
      if (!ballState.active) ballState.active = true;
      playerBox2Z += speed;
    }
    if (inputMap["s"] || inputMap["S"]) {
      if (!ballState.active) ballState.active = true;
      playerBox2Z -= speed;
    }

    playerBox2Z = BABYLON.Scalar.Clamp(playerBox2Z, minZ, maxZ);
    box2.position.z = playerBox2Z;

    /* =======================
       BALL UPDATE (pure logic)
    ======================= */
    updateBall(ballState, ballLimitZ);

    /* =======================
       COLLISION (pure check)
    ======================= */

    // right paddle collision (box)
    if (checkPaddleCollision(ballState, box.position.x, box.position.z) && ballState.dirX > 0) {
      bounceOnPaddle(ballState, box.position.z);
    }

    // left paddle collision (box2)
    if (checkPaddleCollision(ballState, box2.position.x, box2.position.z) && ballState.dirX < 0) {
      bounceOnPaddle(ballState, box2.position.z);
    }

    /* =======================
       GOAL CHECK
    ======================= */
    if (ballState.x > ballLimitX) {
      // Player 1 scores
      scorePlayer1++;
      scoreText.text = `${scorePlayer1} : ${scorePlayer2}`;

      // reset ball towards left
      resetBall(ballState, -0.15);

      // optional: increase difficulty
      ballState.speed += 0.05;

      // reset paddles
      playerBoxZ = 0;
      playerBox2Z = 0;
      box.position.set(25, 4, 0);
      box2.position.set(-25, 4, 0);

      if (scorePlayer1 === 5) {
        winner = playerName1.text;
        gameOver = true;
      }
    }

    if (ballState.x < -ballLimitX) {
      // Player 2 scores
      scorePlayer2++;
      scoreText.text = `${scorePlayer1} : ${scorePlayer2}`;

      // reset ball towards right
      resetBall(ballState, 0.15);

      // optional: increase difficulty
      ballState.speed += 0.05;

      // reset paddles
      playerBoxZ = 0;
      playerBox2Z = 0;
      box.position.set(25, 4, 0);
      box2.position.set(-25, 4, 0);

      if (scorePlayer2 === 5) {
        winner = playerName2.text;
        gameOver = true;
      }
    }

    /* =======================
       SYNC BALL STATE -> BABYLON MESH
    ======================= */
    sphere.position.x = ballState.x;
    sphere.position.z = ballState.z;
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
