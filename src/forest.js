import * as THREE from 'three';

export const CHUNK_SIZE = 200;
const CHUNK_RADIUS = 1;

const clamp = THREE.MathUtils.clamp;

export function terrainHeight(x, z) {
  // Layered, continuous terrain: these functions have no map edge.
  const broad = Math.sin(x * 0.0052 + Math.sin(z * 0.0028) * 0.65) * 2.8
    + Math.cos(z * 0.0061 - Math.sin(x * 0.0034) * 0.5) * 2.4;
  const rolling = Math.sin((x + z) * 0.0105) * 1.2
    + Math.cos((x - z) * 0.013) * 0.95
    + Math.sin(x * 0.018 + z * 0.009) * 0.42;
  const small = Math.sin(x * 0.035 + Math.cos(z * 0.021)) * 0.18
    + Math.cos(z * 0.032 - x * 0.019) * 0.14;
  return broad + rolling + small;
}

export function pathCenterX(z) {
  return Math.sin(z * 0.0055) * 10
    + Math.sin(z * 0.017) * 2.6
    + Math.sin(z * 0.0021) * 8;
}

function seededRandom(cx, cz) {
  let seed = ((Math.imul(cx + 8192, 73856093) ^ Math.imul(cz + 8192, 19349663)) >>> 0) || 1;
  return () => {
    seed += 0x6D2B79F5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const randomBetween = (random, min, max) => min + random() * (max - min);

function makeGroundTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(512, 512);
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const i = (y * 512 + x) * 4;
      const n = Math.random() * 18;
      const fleck = Math.sin(x * 0.11 + Math.sin(y * 0.08) * 2) * 3;
      image.data[i] = 49 + n + fleck;
      image.data[i + 1] = 72 + n * 1.35 + fleck;
      image.data[i + 2] = 39 + n * 0.6;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = Math.random() > 0.52 ? 'rgba(23,35,19,.28)' : 'rgba(181,148,83,.22)';
    ctx.beginPath();
    ctx.ellipse(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 4, 0.6 + Math.random() * 2, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 7);
  texture.anisotropy = 4;
  return texture;
}

function makeBarkTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  gradient.addColorStop(0, '#30221a');
  gradient.addColorStop(0.18, '#694a32');
  gradient.addColorStop(0.42, '#493326');
  gradient.addColorStop(0.68, '#856044');
  gradient.addColorStop(0.86, '#513728');
  gradient.addColorStop(1, '#2f241c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 1150; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 512;
    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(19,12,8,.35)' : 'rgba(219,175,119,.19)';
    ctx.lineWidth = 0.4 + Math.random() * 2.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + (Math.random() - 0.5) * 8, y + 40, x + (Math.random() - 0.5) * 6, y + 105, x + (Math.random() - 0.5) * 10, y + 90 + Math.random() * 160);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);
  texture.anisotropy = 4;
  return texture;
}

function makeLeafTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#547744';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 700; i++) {
    const shade = Math.random();
    ctx.fillStyle = shade > 0.62 ? 'rgba(17,53,25,.30)' : 'rgba(189,204,119,.24)';
    ctx.beginPath();
    ctx.arc(Math.random() * 128, Math.random() * 128, 0.5 + Math.random() * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.anisotropy = 4;
  return texture;
}

function makePathTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#806d4e';
  ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 6500; i++) {
    const shade = Math.random();
    ctx.fillStyle = shade > 0.5 ? 'rgba(40,31,21,.17)' : 'rgba(218,196,151,.16)';
    ctx.beginPath();
    ctx.ellipse(Math.random() * 256, Math.random() * 512, 0.5 + Math.random() * 2.8, 0.5 + Math.random() * 2, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.6, 6);
  texture.anisotropy = 4;
  return texture;
}

function createSharedAssets() {
  const bark = makeBarkTexture();
  const leaves = makeLeafTexture();
  const ground = makeGroundTexture();
  const path = makePathTexture();

  return {
    groundTexture: ground,
    groundMaterial: new THREE.MeshStandardMaterial({ map: ground, color: 0xc3d09e, roughness: 1 }),
    pathMaterial: new THREE.MeshStandardMaterial({ map: path, color: 0xc7b38c, roughness: 1, side: THREE.DoubleSide }),
    trunkMaterial: new THREE.MeshStandardMaterial({ map: bark, bumpMap: bark, bumpScale: 0.055, color: 0xe0c09b, roughness: 1 }),
    branchMaterial: new THREE.MeshStandardMaterial({ map: bark, bumpMap: bark, bumpScale: 0.035, color: 0xb58b65, roughness: 1 }),
    leafMaterial: new THREE.MeshStandardMaterial({ map: leaves, color: 0xffffff, roughness: 0.96 }),
    pineMaterial: new THREE.MeshStandardMaterial({ map: leaves, color: 0x537848, roughness: 0.98 }),
    grassMaterial: new THREE.MeshStandardMaterial({ color: 0x789858, side: THREE.DoubleSide, roughness: 1 }),
    rockMaterial: new THREE.MeshStandardMaterial({ color: 0x77796f, roughness: 1 }),
    trunkGeometry: new THREE.CylinderGeometry(0.25, 0.5, 1, 10, 4),
    rootGeometry: new THREE.CylinderGeometry(0.055, 0.24, 1, 7, 1),
    branchGeometry: new THREE.CylinderGeometry(0.025, 0.105, 1, 7, 1),
    leafGeometry: new THREE.SphereGeometry(1, 10, 8),
    pineGeometry: new THREE.ConeGeometry(1, 1, 9, 2),
    grassGeometry: (() => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        -0.055, 0, 0, 0.055, 0, 0, -0.02, 0.4, 0,
        0, 0, -0.055, 0, 0, 0.055, 0.02, 0.36, 0,
        -0.045, 0, -0.035, 0.045, 0, 0.035, -0.015, 0.32, -0.015
      ]);
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.computeVertexNormals();
      return geometry;
    })(),
    rockGeometry: new THREE.DodecahedronGeometry(1, 1)
  };
}

function setBetween(mesh, index, start, end, dummy) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  dummy.position.addVectors(start, end).multiplyScalar(0.5);
  dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  dummy.scale.set(1, length, 1);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

function createGround(group, originX, originZ, assets) {
  const geometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 48, 48);
  const positions = geometry.attributes.position;
  const half = CHUNK_SIZE / 2;
  for (let i = 0; i < positions.count; i++) {
    const x = originX + half + positions.getX(i);
    const z = originZ + half - positions.getY(i);
    positions.setZ(i, terrainHeight(x, z));
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, assets.groundMaterial);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(half, 0, half);
  mesh.receiveShadow = true;
  group.add(mesh);
}

function createPath(group, originX, originZ, assets) {
  const segments = 110;
  const halfWidth = 6.8;
  const vertices = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const z = originZ + t * CHUNK_SIZE;
    const center = pathCenterX(z);
    const dx = pathCenterX(z + 0.75) - pathCenterX(z - 0.75);
    const length = Math.hypot(dx, 1.5);
    const nx = 1.5 / length;
    const nz = -dx / length;
    for (const side of [-1, 1]) {
      const x = center + nx * halfWidth * side;
      const zz = z + nz * halfWidth * side;
      vertices.push(x - originX, terrainHeight(x, zz) + 0.15, zz - originZ);
      uvs.push(side < 0 ? 0 : 1, t * 12);
    }
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, assets.pathMaterial);
  mesh.receiveShadow = true;
  group.add(mesh);
}

function createTrees(group, originX, originZ, assets, random) {
  const count = 58 + Math.floor(random() * 25);
  const trunks = new THREE.InstancedMesh(assets.trunkGeometry, assets.trunkMaterial, count);
  const roots = new THREE.InstancedMesh(assets.rootGeometry, assets.branchMaterial, count * 4);
  const branches = new THREE.InstancedMesh(assets.branchGeometry, assets.branchMaterial, count * 3);
  const leaves = new THREE.InstancedMesh(assets.leafGeometry, assets.leafMaterial, count * 6);
  const pines = new THREE.InstancedMesh(assets.pineGeometry, assets.pineMaterial, count * 3);
  const dummy = new THREE.Object3D();
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const trees = [];
  let rootIndex = 0;
  let branchIndex = 0;
  let leafIndex = 0;
  let pineIndex = 0;

  for (let i = 0; i < count; i++) {
    let x;
    let z;
    let attempts = 0;
    do {
      x = randomBetween(random, 7, CHUNK_SIZE - 7);
      z = randomBetween(random, 7, CHUNK_SIZE - 7);
      attempts++;
    } while (Math.abs(originX + x - pathCenterX(originZ + z)) < 14 && attempts < 100);

    const worldX = originX + x;
    const worldZ = originZ + z;
    const ground = terrainHeight(worldX, worldZ);
    const height = randomBetween(random, 11, 19);
    const radius = randomBetween(random, 2.6, 4.4);
    const leanX = randomBetween(random, -0.045, 0.045);
    const leanZ = randomBetween(random, -0.045, 0.045);
    const base = v(x, ground, z);

    dummy.position.set(x, ground + height / 2, z);
    dummy.rotation.set(leanX, random() * Math.PI * 2, leanZ);
    dummy.scale.set(randomBetween(random, 0.88, 1.18), height, randomBetween(random, 0.88, 1.18));
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    const trunkTone = randomBetween(random, 0.78, 1.08);
    trunks.setColorAt(i, new THREE.Color(trunkTone, trunkTone * 0.92, trunkTone * 0.78));

    // Buttress roots widen the foot of each trunk and help it sit in the soil.
    for (let r = 0; r < 4; r++) {
      const angle = (r / 4) * Math.PI * 2 + random() * 0.4;
      const start = base.clone().add(v(Math.cos(angle) * 0.14, 0.34, Math.sin(angle) * 0.14));
      const end = base.clone().add(v(Math.cos(angle) * randomBetween(random, 0.75, 1.25), 0.04, Math.sin(angle) * randomBetween(random, 0.75, 1.25)));
      setBetween(roots, rootIndex++, start, end, dummy);
    }

    // Branches leave the trunk at different heights and reach out beneath the canopy.
    for (let b = 0; b < 3; b++) {
      const start = base.clone().add(v(0, height * randomBetween(random, 0.48, 0.76), 0));
      const angle = random() * Math.PI * 2;
      const end = start.clone().add(v(Math.cos(angle) * randomBetween(random, 2.0, 3.8), randomBetween(random, 0.7, 2.2), Math.sin(angle) * randomBetween(random, 2.0, 3.8)));
      setBetween(branches, branchIndex++, start, end, dummy);
    }

    const isPine = random() < 0.27;
    if (isPine) {
      for (let tier = 0; tier < 3; tier++) {
        const y = ground + height * (0.48 + tier * 0.15);
        const width = radius * (1.05 - tier * 0.23);
        dummy.position.set(x, y, z);
        dummy.rotation.set(randomBetween(random, -0.025, 0.025), random() * Math.PI * 2, randomBetween(random, -0.025, 0.025));
        dummy.scale.set(width, height * 0.38, width);
        dummy.updateMatrix();
        pines.setMatrixAt(pineIndex, dummy.matrix);
        const shade = randomBetween(random, 0.78, 1.18);
        pines.setColorAt(pineIndex++, new THREE.Color(0.58 * shade, 0.82 * shade, 0.52 * shade));
      }
    } else {
      // Overlapping, irregular leaf masses produce a fuller crown than a single ball.
      const lobes = 6;
      for (let c = 0; c < lobes; c++) {
        const angle = (c / lobes) * Math.PI * 2 + random() * 0.28;
        const spread = radius * (c === 0 ? 0.08 : 0.53);
        const y = ground + height * (c === 0 ? 0.88 : randomBetween(random, 0.67, 0.9));
        const size = radius * (c === 0 ? 1.08 : randomBetween(random, 0.68, 0.9));
        dummy.position.set(x + Math.cos(angle) * spread, y, z + Math.sin(angle) * spread);
        dummy.rotation.set(randomBetween(random, -0.12, 0.12), random() * Math.PI * 2, randomBetween(random, -0.12, 0.12));
        dummy.scale.set(size * randomBetween(random, 0.86, 1.12), size * randomBetween(random, 0.78, 1.1), size * randomBetween(random, 0.86, 1.12));
        dummy.updateMatrix();
        leaves.setMatrixAt(leafIndex, dummy.matrix);
        const shade = randomBetween(random, 0.78, 1.2);
        leaves.setColorAt(leafIndex++, new THREE.Color(0.52 * shade, 0.82 * shade, 0.48 * shade));
      }
    }
    trees.push({ x: worldX, z: worldZ, radius: 0.55 });
  }

  roots.count = rootIndex;
  branches.count = branchIndex;
  leaves.count = leafIndex;
  pines.count = pineIndex;

  // Trunks and rocks cast the key shadows; tiny leaves and twigs stay unshadowed for speed.
  trunks.castShadow = true;
  trunks.receiveShadow = true;
  roots.castShadow = false;
  branches.castShadow = false;
  leaves.castShadow = false;
  leaves.receiveShadow = true;
  pines.castShadow = false;
  for (const mesh of [trunks, roots, branches, leaves, pines]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return trees;
}

function createGroundDetails(group, originX, originZ, assets, random) {
  const grass = new THREE.InstancedMesh(assets.grassGeometry, assets.grassMaterial, 1050);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 1050; i++) {
    const x = randomBetween(random, 1, CHUNK_SIZE - 1);
    const z = randomBetween(random, 1, CHUNK_SIZE - 1);
    const worldX = originX + x;
    const worldZ = originZ + z;
    if (Math.abs(worldX - pathCenterX(worldZ)) < 7.4) { i--; continue; }
    dummy.position.set(x, terrainHeight(worldX, worldZ) + 0.025, z);
    dummy.rotation.set(0, random() * Math.PI * 2, 0);
    const scale = randomBetween(random, 0.55, 1.35);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
  }
  grass.instanceMatrix.needsUpdate = true;
  grass.computeBoundingSphere();
  grass.castShadow = false;
  group.add(grass);

  const rocks = new THREE.InstancedMesh(assets.rockGeometry, assets.rockMaterial, 28);
  const stoneColors = [0x666d65, 0x777a70, 0x908c7d, 0x5c625e, 0x9b9485];
  for (let i = 0; i < 28; i++) {
    const x = randomBetween(random, 3, CHUNK_SIZE - 3);
    const z = randomBetween(random, 3, CHUNK_SIZE - 3);
    const worldX = originX + x;
    const worldZ = originZ + z;
    if (Math.abs(worldX - pathCenterX(worldZ)) < 8.2) { i--; continue; }
    dummy.position.set(x, terrainHeight(worldX, worldZ) + 0.16, z);
    dummy.rotation.set(random() * 0.9, random() * Math.PI * 2, random() * 0.9);
    dummy.scale.set(randomBetween(random, 0.25, 0.95), randomBetween(random, 0.18, 0.66), randomBetween(random, 0.3, 1.05));
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
    rocks.setColorAt(i, new THREE.Color(stoneColors[Math.floor(random() * stoneColors.length)]));
  }
  rocks.instanceMatrix.needsUpdate = true;
  rocks.computeBoundingSphere();
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  group.add(rocks);
}

function createChunk(scene, cx, cz, assets) {
  const originX = cx * CHUNK_SIZE;
  const originZ = cz * CHUNK_SIZE;
  const random = seededRandom(cx, cz);
  const group = new THREE.Group();
  group.position.set(originX, 0, originZ);
  group.name = `forest-chunk-${cx}-${cz}`;
  scene.add(group);

  createGround(group, originX, originZ, assets);
  const pathChunkX = Math.floor(pathCenterX(originZ + CHUNK_SIZE / 2) / CHUNK_SIZE);
  if (cx === pathChunkX) createPath(group, originX, originZ, assets);
  const trees = createTrees(group, originX, originZ, assets, random);
  createGroundDetails(group, originX, originZ, assets, random);
  return { group, trees, cx, cz };
}

function createSky(scene) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(850, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `varying vec3 vSkyPosition; void main(){ vSkyPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        varying vec3 vSkyPosition;
        void main(){
          float h=normalize(vSkyPosition).y;
          vec3 horizon=vec3(0.72,0.80,0.72);
          vec3 zenith=vec3(0.25,0.48,0.62);
          float t=smoothstep(-0.12,0.72,h);
          vec3 col=mix(horizon,zenith,t);
          float haze=exp(-abs(h+0.02)*13.0)*0.13;
          col=mix(col,vec3(0.9,0.87,0.73),haze);
          gl_FragColor=vec4(col,1.0);
        }
      `
    })
  );
  scene.add(sky);
  return sky;
}

export function createForest(scene) {
  const assets = createSharedAssets();
  const chunks = new Map();
  const pending = [];
  let centerKey = '';
  const sky = createSky(scene);

  // Build the spawn chunk immediately; its eight neighbors stream in over subsequent frames.
  const first = createChunk(scene, 0, 0, assets);
  chunks.set('0,0', first);

  function update(x, z) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const key = `${cx},${cz}`;

    if (key !== centerKey) {
      centerKey = key;
      const wanted = [];
      for (let dz = -CHUNK_RADIUS; dz <= CHUNK_RADIUS; dz++) {
        for (let dx = -CHUNK_RADIUS; dx <= CHUNK_RADIUS; dx++) {
          const nx = cx + dx;
          const nz = cz + dz;
          wanted.push({ cx: nx, cz: nz, key: `${nx},${nz}`, distance: dx * dx + dz * dz });
        }
      }
      const wantedKeys = new Set(wanted.map(item => item.key));
      for (const [chunkKey, chunk] of chunks) {
        if (!wantedKeys.has(chunkKey)) {
          scene.remove(chunk.group);
          chunk.group.traverse(object => {
            if (object.isMesh && object.geometry && object.geometry !== assets.trunkGeometry &&
                object.geometry !== assets.rootGeometry && object.geometry !== assets.branchGeometry &&
                object.geometry !== assets.leafGeometry && object.geometry !== assets.pineGeometry &&
                object.geometry !== assets.grassGeometry && object.geometry !== assets.rockGeometry) {
              object.geometry.dispose();
            }
          });
          chunks.delete(chunkKey);
        }
      }
      pending.length = 0;
      wanted.sort((a, b) => a.distance - b.distance);
      for (const item of wanted) {
        if (!chunks.has(item.key)) pending.push(item);
      }
    }

    // Add only one chunk per frame to prevent a large generation hitch.
    if (pending.length) {
      const item = pending.shift();
      chunks.set(item.key, createChunk(scene, item.cx, item.cz, assets));
    }
    sky.position.set(x, terrainHeight(x, z), z);
  }

  function getNearbyTrees(x, z, radius = 2.2) {
    const minX = Math.floor((x - radius) / CHUNK_SIZE);
    const maxX = Math.floor((x + radius) / CHUNK_SIZE);
    const minZ = Math.floor((z - radius) / CHUNK_SIZE);
    const maxZ = Math.floor((z + radius) / CHUNK_SIZE);
    const near = [];
    for (let cz = minZ; cz <= maxZ; cz++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const chunk = chunks.get(`${cx},${cz}`);
        if (!chunk) continue;
        for (const tree of chunk.trees) {
          if (Math.abs(tree.x - x) <= radius + tree.radius && Math.abs(tree.z - z) <= radius + tree.radius) {
            near.push(tree);
          }
        }
      }
    }
    return near;
  }

  return { update, getNearbyTrees };
}
