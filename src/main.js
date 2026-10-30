import * as THREE from 'three';
import { createForest, terrainHeight } from './forest.js';
import './style.css';

const app = document.querySelector('#app');
const canvas = document.querySelector('#scene');
const intro = document.querySelector('#intro');
const enter = document.querySelector('#enter');
const bottomHint = document.querySelector('#bottomHint');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xa6b4a2, 0.00215);
const camera = new THREE.PerspectiveCamera(78, window.innerWidth / window.innerHeight, 0.1, 1100);
camera.rotation.order = 'YXZ';

scene.add(new THREE.HemisphereLight(0xd6e9ed, 0x53613e, 1.65));
const sun = new THREE.DirectionalLight(0xffe7bf, 2.15);
sun.position.set(-90, 150, 70);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -85;
sun.shadow.camera.right = 85;
sun.shadow.camera.top = 85;
sun.shadow.camera.bottom = -85;
sun.shadow.bias = -0.00016;
sun.shadow.normalBias = 0.025;
scene.add(sun);
sun.target.position.set(0, 0, 0);
scene.add(sun.target);

createForest(scene);

const player = {
  position: new THREE.Vector3(0, terrainHeight(0, 0) + 1.72, 0),
  velocityY: 0,
  grounded: true,
  yaw: Math.PI,
  pitch: -0.035,
  bobTime: 0,
  isMoving: false
};
camera.position.copy(player.position);

const keys = new Set();
let locked = false;
let lastTime = performance.now();
let introDismissed = false;

function requestLock() {
  if (!document.pointerLockElement) canvas.requestPointerLock?.();
}
enter.addEventListener('click', () => {
  introDismissed = true;
  intro.classList.add('gone');
  requestLock();
});
canvas.addEventListener('click', () => {
  if (introDismissed && !document.pointerLockElement) requestLock();
});
canvas.addEventListener('contextmenu', event => event.preventDefault());

document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  app.classList.toggle('locked', locked);
  bottomHint.textContent = locked ? 'esc to release mouse' : 'click to capture mouse · esc to release';
  if (!locked) keys.clear();
});

document.addEventListener('mousemove', event => {
  if (!locked) return;
  player.yaw -= event.movementX * 0.00215;
  player.pitch -= event.movementY * 0.00185;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -1.35, 1.35);
});

window.addEventListener('keydown', event => {
  if (['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight'].includes(event.code)) event.preventDefault();
  keys.add(event.code);
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());

function updatePlayer(dt) {
  const forwardInput = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
  const sideInput = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  const inputLength = Math.hypot(forwardInput, sideInput);
  player.isMoving = inputLength > 0.01;
  const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const speed = running ? 8.8 : 4.6;

  if (player.isMoving) {
    const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    const direction = forward.multiplyScalar(forwardInput).add(right.multiplyScalar(sideInput)).normalize();
    player.position.addScaledVector(direction, speed * dt);
  }

  if (keys.has('Space') && player.grounded) {
    player.velocityY = 7.2;
    player.grounded = false;
  }
  if (!player.grounded) {
    player.velocityY -= 19.5 * dt;
    player.position.y += player.velocityY * dt;
  }
  const floor = terrainHeight(player.position.x, player.position.z) + 1.72;
  if (player.position.y <= floor) {
    player.position.y = floor;
    player.velocityY = 0;
    player.grounded = true;
  }
  player.position.x = THREE.MathUtils.clamp(player.position.x, -315, 315);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -315, 315);

  player.bobTime += dt * (running ? 13 : 9);
  const bob = player.isMoving && player.grounded ? Math.sin(player.bobTime) * 0.045 : 0;
  camera.position.copy(player.position);
  camera.position.y += bob;
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.04);
  lastTime = now;
  if (locked) updatePlayer(dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
});
