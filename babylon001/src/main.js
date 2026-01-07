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

import * as BABYLON from '@babylonjs/core'

const canvas = document.getElementById('firstCanvas');

const engine = new BABYLON.Engine(canvas);

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
		new BABYLON.Vector3(0, 7, -55),
		scene
	);

	camera.inputs.clear();
	camera.attachControl(canvas, true);
	scene.activeCamera = camera;

	/* =======================
	CAMERA FPS
	======================= */
	const fpsCamera = new BABYLON.UniversalCamera(
		"fpsCamera",
		new BABYLON.Vector3(0, 0, 0),
		scene
	);

	fpsCamera.inputs.clear();
	fpsCamera.attachControl(canvas, true);

	/* =======================
	   LUCE
	======================= */
	const light = new BABYLON.HemisphericLight(
		"light",
		new BABYLON.Vector3(60, 100, 20),
		scene
	);
	light.intensity = 0.7;

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
	   CAMBIO CAMERA
	======================= */
	window.addEventListener("keydown", (e) => 
	{
		if (e.key === "c" || e.key === "C") 
		{
			scene.activeCamera =
				scene.activeCamera === camera
					? fpsCamera
					: camera;
			scene.activeCamera.attachControl(canvas, true);
		}
	});

	/* =======================
	   PLAYER BOX
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


	// var fontData = await (await fetch("https://assets.babylonjs.com/fonts/Droid Sans_Regular.json")).json();
	// var myText = BABYLON.MeshBuilder.CreateText("myText", "Hello World !! @ #$ % é", fontData, {
	//     size: 16,
	//     resolution: 64, 
	//     depth: 10
	// });

	/* =======================
	   BOX 2
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
	const ballSpeed = 1.5;
	const ballLimit = 24;

	shadowGenerator.addShadowCaster(sphere);
	shadowGenerator.addShadowCaster(box);
	shadowGenerator.addShadowCaster(box2);
2
	/* =======================
	   GROUND
	======================= */

	const groundHighMap = new BABYLON.MeshBuilder.CreateGroundFromHeightMap('heighMapGround', '/public/topoGraphicMap.png',
		{
			height: 60,
			depth: 50,
			width: 60,
		}, scene);
	groundHighMap.position.y = -1;
	groundHighMap.receiveShadows = true;
	
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

	scene.onBeforeRenderObservable.add(() => {

		/* =======================
		   PLAYER 1 – -> / <- (arrows)
		======================= */
		if (inputMap["ArrowRight"]) {
			playerBox += speed;
		}

		if (inputMap["ArrowLeft"]) {
			playerBox -= speed;
		}

		playerBox = BABYLON.Scalar.Clamp(playerBox, minZ, maxZ);

		box.position.z = playerBox;
		/* =======================
		   PLAYER 2 – A / D
		======================= */
		if (inputMap["d"] || inputMap["D"]) {
			playerBox2 -= speed;
		}

		if (inputMap["a"] || inputMap["A"]) {
			playerBox2 += speed;
		}

		playerBox2 = BABYLON.Scalar.Clamp(playerBox2, minZ, maxZ);
		box2.position.z = playerBox2;
		
		/* =======================
			CHANGE CAMERA TO FPS
		======================= */

		if (scene.activeCamera === fpsCamera) {
			fpsCamera.position.x = box.position.x + 20;
			fpsCamera.position.y = box.position.y + 3;
			fpsCamera.position.z = box.position.z;

			// TODO decidere quale usare
			fpsCamera.setTarget(sphere.position);
			// fpsCamera.setTarget(groundHighMap.position);
		}
		
		/* =======================
		BALL MOVEMENT
		======================= */

		// Movimento lineare
		sphere.position.x += ballDir.x * ballSpeed;
		sphere.position.z += ballDir.z * ballSpeed;

		// Limiti X
		if (sphere.position.x >= ballLimit || sphere.position.x <= -ballLimit) {
			ballDir.x *= -1;
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
