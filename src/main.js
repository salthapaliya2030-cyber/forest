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

const forest = createForest(scene);

const player = {
  position: new THREE.Vector3(0, terrainHeight(0, 0) + 1.72, 0),
  velocityY: 0,
  grounded: true,
  yaw: Math.PI,
  pitch: -0.035,
  bobTime: 0,
  isMoving: false,
  moveVelocity: new THREE.Vector3()
};
camera.position.copy(player.position);

const keys = new Set();
let locked = false;
let lastTime = performance.now();
let introDismissed = false;
let jumpRequested = false;

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
  if (event.code === 'Space' && !event.repeat && player.grounded) jumpRequested = true;
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

  // Keep movement aligned with the camera's rotated -z viewing direction.
  if (player.isMoving) {
    const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    const direction = forward.multiplyScalar(forwardInput).add(right.multiplyScalar(sideInput)).normalize();
    player.moveVelocity.lerp(direction.multiplyScalar(speed), 1 - Math.exp(-dt * 11));
  } else {
    player.moveVelocity.multiplyScalar(Math.exp(-dt * 13));
  }

  const previousPosition = player.position.clone();
  player.position.addScaledVector(player.moveVelocity, dt);

  // Solid tree trunks: nudge the player around nearby trees rather than through them.
  for (const tree of forest.trees) {
    const dx = player.position.x - tree.x;
    if (Math.abs(dx) > 1.6) continue;
    const dz = player.position.z - tree.z;
    if (Math.abs(dz) > 1.6) continue;
    const minDistance = 0.82;
    const distanceSq = dx * dx + dz * dz;
    if (distanceSq < minDistance * minDistance) {
      const distance = Math.sqrt(distanceSq) || 0.001;
      const push = minDistance - distance;
      player.position.x += (dx / distance) * push;
      player.position.z += (dz / distance) * push;
    }
  }

  player.position.x = THREE.MathUtils.clamp(player.position.x, -470, 470);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -470, 470);
  const floor = terrainHeight(player.position.x, player.position.z) + 1.72;

  if (player.grounded && jumpRequested) {
    player.velocityY = 7.2;
    player.grounded = false;
    jumpRequested = false;
  }
  if (!player.grounded) {
    player.velocityY -= 19.5 * dt;
    player.position.y += player.velocityY * dt;
    if (player.position.y <= floor) {
      player.position.y = floor;
      player.velocityY = 0;
      player.grounded = true;
    }
  } else {
    // Follow slopes on both climbs and descents instead of hovering over valleys.
    player.position.y = floor;
  }

  player.bobTime += dt * (running ? 11 : 8);
  const actualMotion = player.position.distanceTo(previousPosition) > 0.002;
  const bob = actualMotion && player.grounded ? Math.sin(player.bobTime) * 0.035 : 0;
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
