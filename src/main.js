import * as THREE from 'three';
import { createForest, terrainHeight } from './forest.js';
import './style.css';

const app = document.querySelector('#app');
const canvas = document.querySelector('#scene');
const intro = document.querySelector('#intro');
const enter = document.querySelector('#enter');
const bottomHint = document.querySelector('#bottomHint');
const speedValue = document.querySelector('#speedValue');

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

function addTube(parent, start, end, radius, material, sides = 10) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, sides), material);
  mesh.position.addVectors(start, end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  parent.add(mesh);
  return mesh;
}

function createBicycle(parent) {
  const bike = new THREE.Group();
  parent.add(bike);

  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x263d35, metalness: 0.72, roughness: 0.28 });
  const metalMaterial = new THREE.MeshStandardMaterial({ color: 0xaeb9b2, metalness: 0.86, roughness: 0.24 });
  const rubberMaterial = new THREE.MeshStandardMaterial({ color: 0x141817, roughness: 0.94 });
  const gripMaterial = new THREE.MeshStandardMaterial({ color: 0x202522, roughness: 0.98 });
  const redMaterial = new THREE.MeshStandardMaterial({ color: 0x9a3d2f, roughness: 0.72 });

  // The front assembly sits in the rider's view, just below the horizon.
  const steering = new THREE.Group();
  steering.position.set(0, -0.44, -0.91);
  bike.add(steering);

  addTube(steering, new THREE.Vector3(-0.73, 0, 0), new THREE.Vector3(0.73, 0, 0), 0.038, frameMaterial, 12);
  for (const side of [-1, 1]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.25, 12), gripMaterial);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(side * 0.69, 0, 0);
    steering.add(grip);

    addTube(steering,
      new THREE.Vector3(side * 0.55, -0.015, -0.02),
      new THREE.Vector3(side * 0.63, -0.13, -0.11),
      0.018, metalMaterial, 8
    );
  }

  addTube(steering, new THREE.Vector3(0, 0.01, 0.01), new THREE.Vector3(0, -0.2, -0.25), 0.065, metalMaterial, 12);
  addTube(steering, new THREE.Vector3(0, -0.17, -0.21), new THREE.Vector3(0, -0.28, -0.34), 0.075, frameMaterial, 12);

  const wheel = new THREE.Group();
  wheel.position.set(0, -0.82, -0.91);
  steering.add(wheel);

  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.052, 10, 64), rubberMaterial);
  tire.rotation.y = Math.PI / 2;
  wheel.add(tire);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.012, 6, 64), metalMaterial);
  rim.rotation.y = Math.PI / 2;
  wheel.add(rim);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.18, 12), metalMaterial);
  hub.rotation.z = Math.PI / 2;
  wheel.add(hub);

  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    const end = new THREE.Vector3(0, Math.cos(angle) * 0.49, Math.sin(angle) * 0.49);
    addTube(wheel, new THREE.Vector3(-0.055, 0, 0), end, 0.0045, metalMaterial, 5);
    addTube(wheel, new THREE.Vector3(0.055, 0, 0), end, 0.0045, metalMaterial, 5);
  }

  for (const side of [-1, 1]) {
    addTube(steering,
      new THREE.Vector3(side * 0.17, -0.23, -0.3),
      new THREE.Vector3(side * 0.17, -0.82, -0.91),
      0.035, frameMaterial, 10
    );
    addTube(steering,
      new THREE.Vector3(side * 0.17, -0.78, -0.88),
      new THREE.Vector3(side * 0.17, -0.86, -0.94),
      0.052, metalMaterial, 10
    );
  }

  // A short frame section makes the bicycle feel connected to the rider.
  addTube(bike,
    new THREE.Vector3(0, -0.75, -0.72),
    new THREE.Vector3(0, -0.56, -0.98),
    0.045, frameMaterial, 10
  );

  return { root: bike, steering, wheel };
}

const bicycle = createBicycle(camera);

const player = {
  position: new THREE.Vector3(0, terrainHeight(0, 0) + 1.58, 0),
  yaw: Math.PI,
  pitch: -0.025,
  speed: 0,
  steer: 0,
  wheelSpin: 0,
  rideTime: 0
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
  bottomHint.textContent = locked ? 'w pedal · a/d steer · s brake · esc to pause' : 'click to ride · esc to release mouse';
  if (!locked) keys.clear();
});

document.addEventListener('mousemove', event => {
  if (!locked) return;
  player.yaw -= event.movementX * 0.00165;
  player.pitch -= event.movementY * 0.00125;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -0.48, 0.42);
});

window.addEventListener('keydown', event => {
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.code)) {
    event.preventDefault();
  }
  keys.add(event.code);
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());

function updateRide(dt, now) {
  const pedal = keys.has('KeyW') || keys.has('ArrowUp');
  const brake = keys.has('KeyS') || keys.has('ArrowDown');
  const steerInput = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
    - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);

  // Pedaling builds speed gradually; the bicycle coasts naturally when W is released.
  if (pedal) player.speed += 5.8 * dt;
  else player.speed *= Math.exp(-0.23 * dt);
  if (brake) player.speed = Math.max(0, player.speed - 13.5 * dt);

  const maxSpeed = 15.5;
  player.speed = THREE.MathUtils.clamp(player.speed, 0, maxSpeed);

  player.steer = THREE.MathUtils.damp(player.steer, steerInput, 7.5, dt);
  const turnRate = player.speed * 0.052 * player.steer;
  player.yaw -= turnRate * dt;

  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const currentGround = terrainHeight(player.position.x, player.position.z);
  const aheadGround = terrainHeight(
    player.position.x + forward.x * 3,
    player.position.z + forward.z * 3
  );
  const grade = (aheadGround - currentGround) / 3;
  player.speed = THREE.MathUtils.clamp(player.speed - grade * 1.45 * dt, 0, maxSpeed);

  const previousX = player.position.x;
  const previousZ = player.position.z;
  player.position.addScaledVector(forward, player.speed * dt);

  // Keep the bicycle from passing through tree trunks.
  let hitTree = false;
  for (const tree of forest.trees) {
    const dx = player.position.x - tree.x;
    if (Math.abs(dx) > 1.25) continue;
    const dz = player.position.z - tree.z;
    if (Math.abs(dz) > 1.25) continue;
    const distanceSq = dx * dx + dz * dz;
    const minimum = 0.92;
    if (distanceSq < minimum * minimum) {
      const distance = Math.sqrt(distanceSq) || 0.001;
      const push = minimum - distance;
      player.position.x += (dx / distance) * push;
      player.position.z += (dz / distance) * push;
      hitTree = true;
    }
  }
  if (hitTree) {
    player.speed *= 0.32;
    if (player.speed < 0.65) player.speed = 0;
  }

  player.position.x = THREE.MathUtils.clamp(player.position.x, -470, 470);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -470, 470);

  const ground = terrainHeight(player.position.x, player.position.z);
  const bumpAmount = Math.min(player.speed / maxSpeed, 1);
  player.rideTime += dt * (3 + player.speed * 1.6);
  const roadBump = (Math.sin(player.rideTime * 2.8) * 0.012
    + Math.sin(player.rideTime * 6.1) * 0.006) * bumpAmount;
  camera.position.set(player.position.x, ground + 1.58 + roadBump, player.position.z);

  const lean = -player.steer * bumpAmount * 0.12;
  const roadPitch = THREE.MathUtils.clamp((aheadGround - ground) * 0.045, -0.12, 0.12);
  camera.rotation.set(player.pitch - roadPitch, player.yaw, lean, 'YXZ');

  bicycle.root.position.y = -0.025 + roadBump * 0.75;
  bicycle.root.rotation.z = lean * 0.75;
  bicycle.steering.rotation.y = -player.steer * 0.32;
  player.wheelSpin += (player.speed * dt) / 0.56;
  bicycle.wheel.rotation.x = -player.wheelSpin;

  speedValue.textContent = String(Math.round(player.speed * 3.6)).padStart(2, '0');
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.04);
  lastTime = now;
  if (locked) updateRide(dt, now);
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
});
