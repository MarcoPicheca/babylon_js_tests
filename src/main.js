/**
 * 
 * to display a 3D element abbiamo bisogno di 4 
 * pezzi fondamentali:
 * - CANVAS ELEMENT: un elemento html <canvas></canvas>
 * - ENGIN: CreateBox() crea l'oggetto interattivo
 * - SCENE: crea lo spazio in cui si sviluppano le coordinate
 *          per la logica 3D (x, y, z)
 * - CAMERA: da dove viene visto parte della scena
 *
 */

// TODO
/**
 * vite non aggiunge automaticamente i pacchetti anche
 * se l'importi per cui prima devi fare ad es.
 * npm install @babylonjs/gui
 * perchè vite scarica automaticamente solo il core
 * di babylon
*/
import * as BABYLON from '@babylonjs/core'
import * as GUI from '@babylonjs/gui';


const canvas = document.getElementById('firstCanvas');

const engine = new BABYLON.Engine(canvas);
let gameOver = false;
let winner = "";

function createScene() {

	const scene = new BABYLON.Scene(engine);

	/* =======================
	   BACKGROUND COLOR
	======================= */
	scene.clearColor = new BABYLON.Color3(0.6, 0.5, 0);

	/* =======================
	   CAMERA
	======================= */

	const camera = new BABYLON.UniversalCamera(
		"camera",
		new BABYLON.Vector3(0, 20, -55),
		scene
	);

	camera.inputs.clear();
	camera.attachControl(canvas, true);
	scene.activeCamera = camera;


	/* =======================
	CAMERA FPS player 1
	======================= */
	const fpsCamera1 = new BABYLON.UniversalCamera(
		"fpsCamera1",
		new BABYLON.Vector3(0, 0, 0),
		scene
	);

	fpsCamera1.inputs.clear();
	fpsCamera1.attachControl(canvas, true);


	/* =======================
	CAMERA FPS player 2
	======================= */
	const fpsCamera2 = new BABYLON.UniversalCamera(
		"fpsCamera2",
		new BABYLON.Vector3(0, 0, 0),
		scene
	);

	fpsCamera2.inputs.clear();
	fpsCamera2.attachControl(canvas, true);

	/* =======================
	   LUCE
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

	// TODO 
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
	   CAMBIO CAMERA
	======================= */
	window.addEventListener("keydown", (e) => {
		if (e.key === "c" || e.key === "C") {
			scene.activeCamera = camera;
			scene.activeCamera.attachControl(canvas, true);
		}
		else if (e.key === "p" || e.key == "P") {
			scene.activeCamera = fpsCamera2;
			scene.activeCamera.attachControl(canvas, true);
		}
		else if (e.key === "m" || e.key == "M") {
			scene.activeCamera = fpsCamera1;
			scene.activeCamera.attachControl(canvas, true);
		}
	});

	/* =======================
	SCOREBOARD AND NAMES UI
	======================= */

	const ui = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

	const scoreText = new GUI.TextBlock();
	scoreText.text = "0 : 0";
	scoreText.color = "white";
	scoreText.fontSize = 48;
	scoreText.fontFamily = "Liberation Sans";
	scoreText.top = "-40%";

	// names
	const playerName1 = new GUI.TextBlock();
	playerName1.text = "name player 1";
	playerName1.color = "white";
	playerName1.fontFamily = "Liberation Sans";
	playerName1.fontSize = 48;
	playerName1.top = "-40%";
	playerName1.left = "-40%";
	ui.addControl(playerName1);

	const playerName2 = new GUI.TextBlock();
	playerName2.text = "name player 2";
	playerName2.color = "white";
	playerName2.fontFamily = "Liberation Sans";
	playerName2.fontSize = 48;
	playerName2.top = "-40%";
	playerName2.left = "40%";
	ui.addControl(playerName2);


	ui.addControl(scoreText);

	/* =======================
	   BOX player 2
	======================= */
	const box = BABYLON.MeshBuilder.CreateBox("box1",
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
		scene);
	box.position.set(25, 4, 0);

	/* =======================
	   BOX player 1
	======================= */

	const box2 = BABYLON.MeshBuilder.CreateBox("box2", {
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
	}, scene);

	box2.position.set(-25, 4, 0);

	/* =======================
	   SPHERE
	======================= */

	const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {
		diameter: 2,
		segments: 32
	}, scene);

	sphere.position.set(0, 4, 0);
	let ballDir = new BABYLON.Vector3(0.15, 0, 0.2);
	let ballSpeed = 2.00;
	const ballLimit = 24;

	shadowGenerator.addShadowCaster(sphere);
	shadowGenerator.addShadowCaster(box);
	shadowGenerator.addShadowCaster(box2);

	/* =======================
	SCORE
	======================= */
	let scorePlayer1 = 0; // box2 (sinistra)
	let scorePlayer2 = 0; // box (destra)


	/* =======================
	   GROUND
	======================= */

	const groundHighMap = new BABYLON.MeshBuilder.CreateGroundFromHeightMap('heighMapGround', '/public/topoGraphicMap.png',
		{
			height: 60,
			depth: 50,
			width: 60,
			// per vedere i rilievi
			// subdivisiion: 50
		}, scene);
	groundHighMap.position.y = -1;
	groundHighMap.receiveShadows = true;

	/* =======================
	GROUND MATERIAL
	======================= */
	const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
	groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.2); // verde campo
	groundMaterial.specularColor = BABYLON.Color3.Black(); // niente riflessi

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
			evt => inputMap[evt.sourceEvent.key] = true
		)
	);

	scene.actionManager.registerAction(
		new BABYLON.ExecuteCodeAction(
			BABYLON.ActionManager.OnKeyUpTrigger,
			evt => inputMap[evt.sourceEvent.key] = false
		)
	);

	/* =======================
	   MOVIMENTO PLAYER + CAMERA
	======================= */
	let playerBox = 0;
	let playerBox2 = 0;
	const speed = 0.5;
	const minZ = -25;
	const maxZ = 25;
	let ballActive = false;

	// per AI player
	const aiSpeed = 0.35;
	const aiReactionDistance = 20; // quanto vicino deve essere la palla
	let aiActive = false;


	/* =======================
	   FUNZIONE PER COLLISIONE PALLA <-> PADDLE
	======================= */
	function checkBallPaddleCollision(ball, paddle, player) {
		const ballRadius = 1;
		const paddleHalfZ = 2.5;
		const paddleHalfX = 1;

		const collisionX =
			Math.abs(ball.position.x - paddle.position.x) <=
			ballRadius + paddleHalfX;

		const collisionZ =
			Math.abs(ball.position.z - paddle.position.z) <=
			ballRadius + paddleHalfZ;

		if (player == 1 && ball.position.x < 0 && scene.activeCamera == fpsCamera2)
			scene.activeCamera = fpsCamera1;
		else if (player == 2 && ball.position.x > 0 && scene.activeCamera == fpsCamera1)
			scene.activeCamera = fpsCamera2;

		return collisionX && collisionZ;
	}

	scene.onBeforeRenderObservable.add(() => {

		if (gameOver && winner != ""){
			const gameOvertext = new GUI.TextBlock();
			gameOvertext.text = winner + " HAS WON";
			gameOvertext.color = "red";
			gameOvertext.top = "-35%";
			gameOvertext.fontSize = 48;
			gameOvertext.fontFamily = "Liberation Sans";
			ui.addControl(gameOvertext);
			return;	
		} 
		/* =======================
		   PLAYER 1 – right / left (FPS camera) or up / down (default camera)
		======================= */
		if (scene.activeCamera === camera) {
			if (inputMap["ArrowUp"]) {
				if (ballActive === false)
					ballActive = true;
				playerBox += speed;
			}

			if (inputMap["ArrowDown"]) {
				if (ballActive === false)
					ballActive = true;
				playerBox -= speed;
			}
		}
		else {
			if (inputMap["ArrowRight"]) {
				if (ballActive === false)
					ballActive = true;
				playerBox += speed;
			}

			if (inputMap["ArrowLeft"]) {
				if (ballActive === false)
					ballActive = true;
				playerBox -= speed;
			}
		}

		playerBox = BABYLON.Scalar.Clamp(playerBox, minZ, maxZ);

		box.position.z = playerBox;
		/* =======================
		   PLAYER 2 – A / D (FPS camera) or W / S (default camera)
		======================= */
		if (scene.activeCamera === camera) {
			if (inputMap["s"] || inputMap["S"]) {
				if (ballActive === false)
					ballActive = true;
				playerBox2 -= speed;
			}
			if (inputMap["w"] || inputMap["W"]) {
				if (ballActive === false)
					ballActive = true;
				playerBox2 += speed;
			}
		}
		else {
			if (inputMap["d"] || inputMap["D"]) {
				if (ballActive === false)
					ballActive = true;
				playerBox2 -= speed;
			}
			if (inputMap["a"] || inputMap["A"]) {
				if (ballActive === false)
					ballActive = true;
				playerBox2 += speed;
			}
		}

		playerBox2 = BABYLON.Scalar.Clamp(playerBox2, minZ, maxZ);
		box2.position.z = playerBox2;

		/* =======================
			CHANGE CAMERA TO FPS player 1
		======================= */

		if (scene.activeCamera === fpsCamera2) {
			fpsCamera2.position.x = box.position.x + 20;
			fpsCamera2.position.y = box.position.y + 3;
			fpsCamera2.position.z = box.position.z;

			// TODO decidere quale usare
			fpsCamera2.setTarget(sphere.position);
			// fpsCamera2.setTarget(groundHighMap.position);
		}
		
		/* =======================
			CHANGE CAMERA TO FPS player 2
		======================= */

		if (scene.activeCamera === fpsCamera1) {
			fpsCamera1.position.x = box2.position.x - 20;
			fpsCamera1.position.y = box2.position.y + 3;
			fpsCamera1.position.z = box2.position.z;

			console.log(scene.activeCamera === fpsCamera1);
			// TODO decidere quale usare
			fpsCamera1.setTarget(sphere.position);
		}

		/* =======================
		BALL MOVEMENT
		======================= */

		// Movimento lineare
		if (ballActive) {
			sphere.position.x += ballDir.x * ballSpeed;
			sphere.position.z += ballDir.z * ballSpeed;
		}

		/* =======================
		BALL ↔ PADDLE COLLISION
		======================= */

		// Paddle destro
		if (checkBallPaddleCollision(sphere, box, 2) && ballDir.x > 0) {
			ballDir.x *= -1;

			// variazione angolo in base a dove colpisce il paddle
			const hitOffset = sphere.position.z - box.position.z;
			ballDir.z = hitOffset * 0.05;
		}

		// Paddle sinistro
		if (checkBallPaddleCollision(sphere, box2, 1) && ballDir.x < 0) {
			ballDir.x *= -1;

			const hitOffset = sphere.position.z - box2.position.z;
			ballDir.z = hitOffset * 0.05;
		}

		/* =======================
		   AI PLAYER
		======================= */
		// TODO decomment
		// if (!gameOver) {
		// 	const distanceX = Math.abs(sphere.position.x - box2.position.x);

		// 	if (aiActive && distanceX < aiReactionDistance) {
		// 		if (sphere.position.z > box2.position.z + 0.7) {
		// 			playerBox2 += aiSpeed;
		// 		}
		// 		else if (sphere.position.z < box2.position.z - 0.7) {
		// 			playerBox2 -= aiSpeed;
		// 		}
		// 	}

		// 	playerBox2 = BABYLON.Scalar.Clamp(playerBox2, minZ, maxZ);
		// 	box2.position.z = playerBox2;
		// }

		// Limiti X
		/* =======================
		   GOAL + RESET
		======================= */
		if (sphere.position.x > ballLimit) {
			scorePlayer1++;
			scoreText.text = `${scorePlayer1} : ${scorePlayer2}`;
			sphere.position.set(0, 4, 0);
			ballDir = new BABYLON.Vector3(-0.15, 0, 0.2);
			ballActive = false;
			ballSpeed += 0.05;
			playerBox = 0;
			playerBox2 = 0;
			box.position.set(25, 4, 0);
			box2.position.set(-25, 4, 0);
			if (scorePlayer1 == 5)
			{
				winner = playerName1.text;
				gameOver = true;
			}
			return;
		}

		if (sphere.position.x < -ballLimit) {
			scorePlayer2++;
			scoreText.text = `${scorePlayer1} : ${scorePlayer2}`;
			sphere.position.set(0, 4, 0);
			ballDir = new BABYLON.Vector3(0.15, 0, 0.2);
			ballActive = false;
			ballSpeed += 0.05;
			playerBox = 0;
			playerBox2 = 0;
			box.position.set(25, 4, 0);
			box2.position.set(-25, 4, 0);
			if (scorePlayer2 == 5)
			{
				winner = playerName2.text;
				gameOver = true;
			}
			return;
		}

		// Limiti Z
		if (sphere.position.z >= ballLimit || sphere.position.z <= -ballLimit) {
			ballDir.z *= -1;
		}
	});

	return scene;
}

const scenario = createScene();

engine.runRenderLoop(() => {
	scenario.render();
});

window.addEventListener("resize", () => {
	engine.resize();
});
