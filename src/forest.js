import * as THREE from 'three';

const rand = (min, max) => min + Math.random() * (max - min);

export function terrainHeight(x, z) {
  const broad = Math.sin(x * 0.0065 + Math.sin(z * 0.0038) * 0.7) * 2.6
    + Math.cos(z * 0.0074 - Math.sin(x * 0.004) * 0.55) * 2.35;
  const middle = Math.sin((x + z) * 0.014) * 1.05
    + Math.cos((x - z) * 0.018) * 0.72;
  const fine = Math.sin(x * 0.035 + z * 0.021) * 0.18
    + Math.cos(z * 0.031 - x * 0.024) * 0.16;
  const hillA = 5.5 * Math.exp(-(((x - 115) ** 2) / 10500 + ((z - 155) ** 2) / 18000));
  const hillB = 4.2 * Math.exp(-(((x + 175) ** 2) / 15000 + ((z - 285) ** 2) / 12000));
  const hillC = 3.6 * Math.exp(-(((x - 245) ** 2) / 18000 + ((z + 165) ** 2) / 14500));
  return broad + middle + fine + hillA + hillB + hillC;
}

export function pathCenterX(z) {
  const distance = z + 12;
  return Math.sin(distance * 0.012) * 7.2 + Math.sin(distance * 0.031) * 2.1;
}

function createPath(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#847354';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const shade = Math.random();
    ctx.fillStyle = shade > 0.55 ? 'rgba(43,35,25,.13)' : 'rgba(222,207,170,.10)';
    ctx.beginPath();
    ctx.ellipse(rand(0, 512), rand(0, 512), rand(0.5, 3.8), rand(0.5, 2.2), rand(0, Math.PI), 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.4, 1);
  texture.anisotropy = 8;

  const segments = 280;
  const startZ = -24;
  const endZ = 485;
  const halfWidth = 5.7;
  const vertices = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const z = THREE.MathUtils.lerp(startZ, endZ, t);
    const x = pathCenterX(z);
    const dx = pathCenterX(z + 0.8) - pathCenterX(z - 0.8);
    const length = Math.hypot(dx, 1.6);
    const nx = 1.6 / length;
    const nz = -dx / length;
    for (const side of [-1, 1]) {
      const px = x + nx * halfWidth * side;
      const pz = z + nz * halfWidth * side;
      vertices.push(px, terrainHeight(px, pz) + 0.16, pz);
      uvs.push(side === -1 ? 0 : 1, t * 30);
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
  const path = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    map: texture, color: 0xc4b18b, roughness: 1, side: THREE.DoubleSide
  }));
  path.receiveShadow = true;
  scene.add(path);
}

function makeGroundTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(512, 512);
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const i = (y * 512 + x) * 4;
      const n = Math.random() * 21;
      const fleck = Math.sin(x * 0.14 + Math.sin(y * 0.07) * 2) * 3;
      image.data[i] = 55 + n + fleck;
      image.data[i + 1] = 78 + n * 1.4 + fleck;
      image.data[i + 2] = 42 + n * 0.55;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  // scattered leaf litter and tiny soil flecks
  for (let i = 0; i < 1900; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(25,42,23,.25)' : 'rgba(178,154,92,.24)';
    ctx.beginPath();
    ctx.ellipse(rand(0, 512), rand(0, 512), rand(1, 4), rand(1, 2), rand(0, Math.PI), 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  texture.anisotropy = 8;
  return texture;
}

function setInstance(mesh, index, position, rotation, scale) {
  const dummy = new THREE.Object3D();
  dummy.position.copy(position);
  dummy.rotation.set(rotation.x, rotation.y, rotation.z);
  dummy.scale.set(scale.x, scale.y, scale.z);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

function between(a, b) {
  const direction = new THREE.Vector3().subVectors(b, a);
  const length = direction.length();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return { midpoint: new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), quaternion, length };
}


function makeBarkTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  gradient.addColorStop(0, '#39291f');
  gradient.addColorStop(0.25, '#705039');
  gradient.addColorStop(0.52, '#4d382a');
  gradient.addColorStop(0.78, '#806047');
  gradient.addColorStop(1, '#34271f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 900; i++) {
    const x = rand(0, 256), y = rand(0, 512);
    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(25,15,10,.24)' : 'rgba(205,164,112,.13)';
    ctx.lineWidth = rand(0.4, 2.4);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + rand(-5, 5), y + 30, x + rand(-4, 4), y + 90, x + rand(-8, 8), y + rand(90, 220));
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);
  texture.anisotropy = 8;
  return texture;
}

function createTrees(scene) {
  const treeCount = 1050;
  const trunkGeometry = new THREE.CylinderGeometry(0.30, 0.56, 1, 10, 2);
  const trunkMaterial = new THREE.MeshStandardMaterial({ map: makeBarkTexture(), color: 0xc2a17c, roughness: 1 });
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, treeCount);
  trunks.castShadow = true;
  trunks.receiveShadow = true;
  scene.add(trunks);

  const branchGeometry = new THREE.CylinderGeometry(0.045, 0.13, 1, 6, 1);
  const branches = new THREE.InstancedMesh(branchGeometry, trunkMaterial, treeCount * 3);
  branches.castShadow = true;
  scene.add(branches);

  const crownGeometry = new THREE.IcosahedronGeometry(1, 2);
  const leafMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x315c32, roughness: 0.96 }),
    new THREE.MeshStandardMaterial({ color: 0x3d6c38, roughness: 0.96 }),
    new THREE.MeshStandardMaterial({ color: 0x4a773d, roughness: 0.96 }),
    new THREE.MeshStandardMaterial({ color: 0x294f2d, roughness: 0.96 })
  ];
  const crowns = leafMaterials.map(material => {
    const instanced = new THREE.InstancedMesh(crownGeometry, material, treeCount * 6);
    instanced.castShadow = true;
    instanced.receiveShadow = true;
    scene.add(instanced);
    return instanced;
  });
  const dummy = new THREE.Object3D();
  const crownCounts = [0, 0, 0, 0];
  let branchIndex = 0;
  const positions = [];

  for (let i = 0; i < treeCount; i++) {
    const angle = rand(0, Math.PI * 2);
    const distance = Math.sqrt(Math.random()) * 405;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    // Keep one continuous open corridor for the broad trail.
    if (z > -35 && z < 510 && Math.abs(x - pathCenterX(z)) < 12.5) { i--; continue; }
    if (Math.hypot(x, z) < 13) { i--; continue; }
    const ground = terrainHeight(x, z);
    const height = rand(10, 18);
    const radius = rand(2.5, 4.8);
    const leanX = rand(-0.07, 0.07);
    const leanZ = rand(-0.06, 0.06);
    positions.push({ x, z, ground, height, radius });
    setInstance(trunks, i, new THREE.Vector3(x, ground + height / 2, z), new THREE.Euler(leanX, rand(0, Math.PI * 2), leanZ), new THREE.Vector3(rand(0.85, 1.18), height, rand(0.85, 1.18)));

    for (let b = 0; b < 3; b++) {
      const start = new THREE.Vector3(x, ground + height * rand(0.48, 0.75), z);
      const a = rand(0, Math.PI * 2);
      const end = start.clone().add(new THREE.Vector3(Math.cos(a) * rand(2.4, 4), rand(0.8, 2.7), Math.sin(a) * rand(2.4, 4)));
      const branch = between(start, end);
      dummy.position.copy(branch.midpoint);
      dummy.quaternion.copy(branch.quaternion);
      dummy.scale.set(1, branch.length, 1);
      dummy.updateMatrix();
      branches.setMatrixAt(branchIndex++, dummy.matrix);
    }

    const crownCount = 5 + Math.floor(Math.random() * 2);
    for (let c = 0; c < crownCount; c++) {
      const materialIndex = Math.floor(rand(0, leafMaterials.length));
      const mesh = crowns[materialIndex];
      const id = crownCounts[materialIndex]++;
      const y = ground + height * rand(0.68, 1.04);
      const spread = radius * (c === 0 ? 0.72 : 1);
      dummy.position.set(x + rand(-spread, spread), y, z + rand(-spread, spread));
      dummy.rotation.set(rand(-0.2, 0.2), rand(0, Math.PI * 2), rand(-0.2, 0.2));
      const r = radius * (c === 0 ? 1.15 : rand(0.62, 0.96));
      dummy.scale.set(r * rand(0.85, 1.1), r * rand(0.82, 1.18), r * rand(0.85, 1.1));
      dummy.updateMatrix();
      mesh.setMatrixAt(id, dummy.matrix);
    }
  }
  trunks.instanceMatrix.needsUpdate = true;
  branches.instanceMatrix.needsUpdate = true;
  crowns.forEach((mesh, index) => { mesh.count = crownCounts[index]; mesh.instanceMatrix.needsUpdate = true; });
  return positions;
}

function createGroundDetails(scene) {
  const grassGeometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    -0.05, 0, 0, 0.05, 0, 0, -0.015, 0.42, 0,
    0, 0, -0.05, 0, 0, 0.05, 0.06, 0.34, 0
  ]);
  grassGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  grassGeometry.computeVertexNormals();
  const grass = new THREE.InstancedMesh(grassGeometry, new THREE.MeshStandardMaterial({ color: 0x719653, side: THREE.DoubleSide, roughness: 1 }), 8500);
  const obj = new THREE.Object3D();
  for (let i = 0; i < 8500; i++) {
    const x = rand(-440, 440), z = rand(-440, 440);
    if (z > -35 && z < 510 && Math.abs(x - pathCenterX(z)) < 6.0) { i--; continue; }
    obj.position.set(x, terrainHeight(x, z) + 0.03, z);
    obj.rotation.y = rand(0, Math.PI * 2);
    const s = rand(0.65, 1.5);
    obj.scale.set(s, s, s);
    obj.updateMatrix();
    grass.setMatrixAt(i, obj.matrix);
  }
  grass.instanceMatrix.needsUpdate = true;
  grass.castShadow = false;
  grass.receiveShadow = false;
  scene.add(grass);

  const rockGeometry = new THREE.DodecahedronGeometry(1, 1);
  const rocks = new THREE.InstancedMesh(rockGeometry, new THREE.MeshStandardMaterial({ color: 0x6f7566, roughness: 1 }), 320);
  for (let i = 0; i < 320; i++) {
    const x = rand(-430, 430), z = rand(-430, 430);
    if (z > -35 && z < 510 && Math.abs(x - pathCenterX(z)) < 6.0) { i--; continue; }
    obj.position.set(x, terrainHeight(x, z) + 0.15, z);
    obj.rotation.set(rand(0, 1), rand(0, Math.PI * 2), rand(0, 1));
    obj.scale.set(rand(0.28, 1.15), rand(0.2, 0.82), rand(0.3, 1.25));
    obj.updateMatrix();
    rocks.setMatrixAt(i, obj.matrix);
    const shades = [0x666b63, 0x77796f, 0x8b877a, 0x5d625e, 0x9a9282];
    rocks.setColorAt(i, new THREE.Color(shades[Math.floor(rand(0, shades.length))]));
  }
  rocks.instanceMatrix.needsUpdate = true;
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  scene.add(rocks);
}

function createSky(scene) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(850, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `varying vec3 vWorldPosition; void main(){ vec4 p=modelMatrix*vec4(position,1.0); vWorldPosition=p.xyz; gl_Position=projectionMatrix*viewMatrix*p; }`,
      fragmentShader: `
        varying vec3 vWorldPosition;
        void main(){
          float h=normalize(vWorldPosition).y;
          vec3 horizon=vec3(0.71,0.80,0.72);
          vec3 zenith=vec3(0.24,0.48,0.62);
          float t=smoothstep(-0.12,0.72,h);
          vec3 col=mix(horizon,zenith,t);
          float haze=exp(-abs(h+0.02)*13.0)*0.12;
          col=mix(col,vec3(0.88,0.86,0.71),haze);
          gl_FragColor=vec4(col,1.0);
        }
      `
    })
  );
  scene.add(sky);
}

export function createForest(scene) {
  const groundTexture = makeGroundTexture();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000, 220, 220),
    new THREE.MeshStandardMaterial({ map: groundTexture, color: 0xc4d4a0, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  const pos = ground.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = -pos.getY(i);
    pos.setZ(i, terrainHeight(x, z));
  }
  ground.geometry.computeVertexNormals();
  ground.receiveShadow = true;
  scene.add(ground);

  createPath(scene);
  createTrees(scene);
  createGroundDetails(scene);
  createSky(scene);
}
