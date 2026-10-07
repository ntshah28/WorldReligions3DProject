import * as THREE from 'three';
import { ARTWORKS } from './artworks.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const ROOM = { width: 24, depth: 16, height: 6 };
const EYE_HEIGHT = 1.7;
const WALK_SPEED = 4; // metres per second
const WALL_MARGIN = 1.0; // how close the visitor can get to a wall
const ART_MAX = { w: 3.4, h: 2.6 }; // largest size an artwork can be displayed at
const ART_CENTER_Y = 2.3;
const VIEW_DISTANCE = 4.2; // how far from an artwork the camera stops when viewing it

// Where each of the six artworks hangs: position on the wall and the wall's
// inward-facing normal.
const HW = ROOM.width / 2;
const HD = ROOM.depth / 2;
const PLACEMENTS = [
  { pos: [-5.5, ART_CENTER_Y, -HD], normal: [0, 0, 1] },  // back wall, left
  { pos: [5.5, ART_CENTER_Y, -HD], normal: [0, 0, 1] },   // back wall, right
  { pos: [HW, ART_CENTER_Y, 0], normal: [-1, 0, 0] },     // right wall
  { pos: [5.5, ART_CENTER_Y, HD], normal: [0, 0, -1] },   // front wall, right
  { pos: [-5.5, ART_CENTER_Y, HD], normal: [0, 0, -1] },  // front wall, left
  { pos: [-HW, ART_CENTER_Y, 0], normal: [1, 0, 0] },     // left wall
];

// ---------------------------------------------------------------------------
// Renderer, scene, camera
// ---------------------------------------------------------------------------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1714);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);

// Keep a usable horizontal field of view on tall (portrait) screens
function updateCameraFov() {
  camera.aspect = window.innerWidth / window.innerHeight;
  const minHFov = THREE.MathUtils.degToRad(70);
  const neededVFov = 2 * Math.atan(Math.tan(minHFov / 2) / camera.aspect);
  camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(neededVFov), 65, 95);
  camera.updateProjectionMatrix();
}
updateCameraFov();
camera.rotation.order = 'YXZ';
const look = { yaw: 0, pitch: 0 };
camera.position.set(0, EYE_HEIGHT, 4);

// ---------------------------------------------------------------------------
// Procedural textures
// ---------------------------------------------------------------------------
function canvasTexture(width, height, draw, { repeat, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  draw(c.getContext('2d'), width, height);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(...repeat);
  }
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function woodFloorTexture() {
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    const plankH = h / 8;
    for (let row = 0; row < 8; row++) {
      const offset = (row % 2) * (w / 3);
      for (let x = -offset; x < w; x += w / 1.5) {
        const shade = 95 + Math.random() * 25;
        ctx.fillStyle = `rgb(${shade + 40}, ${shade + 10}, ${shade - 25})`;
        ctx.fillRect(x, row * plankH, w / 1.5, plankH);
        // grain
        ctx.strokeStyle = 'rgba(60, 35, 15, 0.12)';
        for (let g = 0; g < 14; g++) {
          const gy = row * plankH + Math.random() * plankH;
          ctx.beginPath();
          ctx.moveTo(x, gy);
          ctx.bezierCurveTo(x + w / 4, gy + 4, x + w / 2, gy - 4, x + w / 1.5, gy);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(30, 18, 8, 0.6)';
        ctx.fillRect(x, row * plankH, 2, plankH);
      }
      ctx.fillStyle = 'rgba(30, 18, 8, 0.6)';
      ctx.fillRect(0, row * plankH, w, 2);
    }
  }, { repeat: [4, 4] });
}

// Placeholder shown until the real image file exists.
function placeholderTexture(index, art) {
  const hue = (index * 57 + 20) % 360;
  return canvasTexture(1024, 768, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, `hsl(${hue}, 35%, 32%)`);
    grad.addColorStop(1, `hsl(${(hue + 40) % 360}, 40%, 18%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // soft decorative circles
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, 80 + Math.random() * 220, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${(hue + i * 25) % 360}, 45%, 60%, 0.08)`;
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 12]);
    ctx.strokeRect(40, 40, w - 80, h - 80);
    ctx.setLineDash([]);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '600 120px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(String(index + 1).padStart(2, '0'), w / 2, h / 2 - 20);
    ctx.font = '500 44px Inter, sans-serif';
    ctx.fillText(art.title, w / 2, h / 2 + 60);
    ctx.font = '400 28px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('Image coming soon', w / 2, h / 2 + 110);
  });
}

function placardTexture(index, art) {
  return canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f7f4ee';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1d1a16';
    ctx.font = '600 52px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(art.title, 32, 84, w - 64);
    ctx.fillStyle = '#6f675c';
    ctx.font = '400 28px Inter, sans-serif';
    ctx.fillText(`${art.artist}, ${art.year}`, 32, 136, w - 64);
    ctx.fillStyle = '#b08d57';
    ctx.font = '500 22px Inter, sans-serif';
    ctx.fillText(`No. ${index + 1}`, 32, 206);
  });
}

// ---------------------------------------------------------------------------
// Room
// ---------------------------------------------------------------------------
function buildRoom() {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xece6dc, roughness: 0.95 });
  const floorMat = new THREE.MeshStandardMaterial({ map: woodFloorTexture(), roughness: 0.55, metalness: 0.05 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xf4f1ec, roughness: 1 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x3a332b, roughness: 0.6 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.width, ROOM.depth), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.width, ROOM.depth), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM.height;
  scene.add(ceiling);

  // Walls: [width, x, z, rotationY]
  const walls = [
    [ROOM.width, 0, -HD, 0],
    [ROOM.width, 0, HD, Math.PI],
    [ROOM.depth, -HW, 0, Math.PI / 2],
    [ROOM.depth, HW, 0, -Math.PI / 2],
  ];
  for (const [w, x, z, ry] of walls) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, ROOM.height), wallMat);
    wall.position.set(x, ROOM.height / 2, z);
    wall.rotation.y = ry;
    wall.receiveShadow = true;
    scene.add(wall);

    const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, 0.04), trimMat);
    base.position.set(x, 0.09, z);
    base.rotation.y = ry;
    base.translateZ(0.02);
    scene.add(base);
  }

  // Skylight panels in the ceiling
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xfffaf0 });
  for (const x of [-6, 0, 6]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.2), panelMat);
    panel.rotation.x = Math.PI / 2;
    panel.position.set(x, ROOM.height - 0.01, 0);
    scene.add(panel);
  }

  // A pair of benches in the middle of the room
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x2b2520, roughness: 0.5 });
  const cushionMat = new THREE.MeshStandardMaterial({ color: 0x6b5a48, roughness: 0.9 });
  for (const x of [-3, 3]) {
    const bench = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.6), cushionMat);
    top.position.y = 0.46;
    bench.add(top);
    for (const lx of [-1.05, 1.05]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.55), benchMat);
      leg.position.set(lx, 0.2, 0);
      bench.add(leg);
    }
    bench.traverse((m) => { m.castShadow = true; m.receiveShadow = true; });
    bench.position.set(x, 0, 0);
    scene.add(bench);
  }
}

// ---------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------
function buildLights() {
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0xa8977f, 1.0));
  const fill = new THREE.PointLight(0xfff2e0, 18, 0, 1.6);
  fill.position.set(0, ROOM.height - 0.5, 0);
  scene.add(fill);
}

// ---------------------------------------------------------------------------
// Artworks
// ---------------------------------------------------------------------------
const frameMat = new THREE.MeshStandardMaterial({ color: 0x1f1a15, roughness: 0.4, metalness: 0.2 });
const matboardMat = new THREE.MeshStandardMaterial({ color: 0xfbf9f4, roughness: 0.9 });
const FRAME = 0.1;
const MATBOARD = 0.18;

const pieces = []; // { group, canvas, frame, mat, light, index, normal }

function fitSize(aspect) {
  let w = ART_MAX.w;
  let h = w / aspect;
  if (h > ART_MAX.h) {
    h = ART_MAX.h;
    w = h * aspect;
  }
  return { w, h };
}

function setPieceSize(piece, aspect) {
  const { w, h } = fitSize(aspect);
  piece.width = w + (MATBOARD + FRAME) * 2;
  piece.canvas.scale.set(w, h, 1);
  piece.mat.scale.set(w + MATBOARD * 2, h + MATBOARD * 2, 1);
  piece.frame.scale.set(w + (MATBOARD + FRAME) * 2, h + (MATBOARD + FRAME) * 2, 1);
  piece.placard.position.set(w / 2 + MATBOARD + FRAME + 0.5, -0.4, 0.01);
}

function buildArtwork(art, index) {
  const { pos, normal } = PLACEMENTS[index];
  const n = new THREE.Vector3(...normal);
  const group = new THREE.Group();
  group.position.set(...pos);
  group.lookAt(group.position.clone().add(n));
  scene.add(group);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.08), frameMat);
  frame.position.z = 0.04;
  frame.castShadow = true;
  group.add(frame);

  const mat = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), matboardMat);
  mat.position.z = 0.081;
  group.add(mat);

  const artMat = new THREE.MeshStandardMaterial({ map: placeholderTexture(index, art), roughness: 0.8 });
  const canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), artMat);
  canvasMesh.position.z = 0.083;
  canvasMesh.userData.index = index;
  group.add(canvasMesh);

  const placard = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.25),
    new THREE.MeshStandardMaterial({ map: placardTexture(index, art), roughness: 0.9 }),
  );
  group.add(placard);

  // Spotlight from the ceiling, aimed at the artwork
  const light = new THREE.SpotLight(0xfff1dc, 60, 0, 0.42, 0.55, 1.4);
  light.position.copy(group.position).add(n.clone().multiplyScalar(2.6));
  light.position.y = ROOM.height - 0.2;
  light.target.position.copy(group.position);
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  light.shadow.bias = -0.0005;
  scene.add(light, light.target);

  // Small track-light fixture
  const fixture = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.1, 0.25, 16),
    new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.4 }),
  );
  fixture.position.copy(light.position);
  fixture.lookAt(group.position);
  fixture.rotateX(Math.PI / 2);
  scene.add(fixture);

  const piece = { group, canvas: canvasMesh, frame, mat, placard, light, index, normal: n, width: 0 };
  pieces.push(piece);
  setPieceSize(piece, 4 / 3);

  // Try to load the real image; keep the placeholder if it isn't there yet.
  new THREE.TextureLoader().load(
    art.image,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      artMat.map.dispose();
      artMat.map = tex;
      artMat.needsUpdate = true;
      setPieceSize(piece, tex.image.width / tex.image.height);
    },
    undefined,
    () => { /* image not added yet — placeholder stays */ },
  );
}

// ---------------------------------------------------------------------------
// Controls: drag to look, WASD / arrows to walk, click artwork to view
// ---------------------------------------------------------------------------
const keys = new Set();
const touchMove = { forward: false, back: false };
let dragging = false;
let dragDistance = 0;
let lastPointer = { x: 0, y: 0 };
let tour = null; // active camera animation
let viewing = -1; // index of the artwork currently being viewed
let started = false;

const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();

function pickArtwork(clientX, clientY) {
  pointerNdc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointerNdc, camera);
  const hits = raycaster.intersectObjects(pieces.map((p) => p.canvas));
  return hits.length ? hits[0].object.userData.index : -1;
}

canvas.addEventListener('pointerdown', (e) => {
  if (!started) return;
  dragging = true;
  dragDistance = 0;
  lastPointer = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('dragging');
});

canvas.addEventListener('pointermove', (e) => {
  if (!started) return;
  if (dragging) {
    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;
    dragDistance += Math.abs(dx) + Math.abs(dy);
    lastPointer = { x: e.clientX, y: e.clientY };
    if (dragDistance > 4) {
      tour = null;
      const sensitivity = e.pointerType === 'touch' ? 0.005 : 0.0035;
      look.yaw += dx * sensitivity;
      look.pitch = THREE.MathUtils.clamp(look.pitch + dy * sensitivity, -1.2, 1.2);
    }
  } else {
    canvas.classList.toggle('hovering', pickArtwork(e.clientX, e.clientY) !== -1);
  }
});

canvas.addEventListener('pointerup', (e) => {
  if (!dragging) return;
  dragging = false;
  canvas.classList.remove('dragging');
  if (dragDistance <= 4) {
    const index = pickArtwork(e.clientX, e.clientY);
    if (index !== -1) viewArtwork(index);
  }
});

window.addEventListener('keydown', (e) => {
  if (!started) return;
  if (e.key === 'Escape') closeInfo();
  if (e.key === 'ArrowRight' && viewing !== -1) return viewArtwork((viewing + 1) % pieces.length);
  if (e.key === 'ArrowLeft' && viewing !== -1) return viewArtwork((viewing + pieces.length - 1) % pieces.length);
  keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

document.querySelectorAll('#touch-move button').forEach((btn) => {
  const dir = btn.dataset.dir;
  const set = (v) => (e) => { e.preventDefault(); touchMove[dir] = v; };
  btn.addEventListener('pointerdown', set(true));
  btn.addEventListener('pointerup', set(false));
  btn.addEventListener('pointerleave', set(false));
  btn.addEventListener('pointercancel', set(false));
});

function shortestAngle(from, to) {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function viewArtwork(index) {
  const piece = pieces[index];
  // Step back far enough that the whole framed piece fits on narrow screens
  const halfHFov = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
  const distance = Math.max(VIEW_DISTANCE, (piece.width * 0.6) / Math.tan(halfHFov));
  const target = piece.group.position.clone().add(piece.normal.clone().multiplyScalar(distance));
  target.y = EYE_HEIGHT;
  // Yaw that makes the camera face the wall (looking along -normal)
  const yaw = Math.atan2(piece.normal.x, piece.normal.z);
  // Tilt slightly up so the artwork is centred in view
  const pitch = Math.atan2(ART_CENTER_Y - EYE_HEIGHT, distance);
  tour = {
    t: 0,
    duration: 1.3,
    fromPos: camera.position.clone(),
    toPos: target,
    fromYaw: look.yaw,
    toYaw: shortestAngle(look.yaw, yaw),
    fromPitch: look.pitch,
    toPitch: pitch,
  };
  openInfo(index);
}

// ---------------------------------------------------------------------------
// Info panel
// ---------------------------------------------------------------------------
const info = document.getElementById('info');

function openInfo(index) {
  viewing = index;
  const art = ARTWORKS[index];
  document.getElementById('info-index').textContent = `No. ${index + 1} of ${ARTWORKS.length}`;
  document.getElementById('info-title').textContent = art.title;
  document.getElementById('info-artist').textContent = art.artist;
  document.getElementById('info-year').textContent = art.year;
  document.getElementById('info-desc').textContent = art.description;
  info.classList.add('open');
  info.setAttribute('aria-hidden', 'false');
}

function closeInfo() {
  viewing = -1;
  info.classList.remove('open');
  info.setAttribute('aria-hidden', 'true');
}

document.getElementById('info-close').addEventListener('click', closeInfo);
document.getElementById('info-next').addEventListener('click', () => viewArtwork((viewing + 1) % pieces.length));
document.getElementById('info-prev').addEventListener('click', () => viewArtwork((viewing + pieces.length - 1) % pieces.length));

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const move = new THREE.Vector3();

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function update(dt) {
  if (tour) {
    tour.t = Math.min(1, tour.t + dt / tour.duration);
    const k = easeInOut(tour.t);
    camera.position.lerpVectors(tour.fromPos, tour.toPos, k);
    look.yaw = THREE.MathUtils.lerp(tour.fromYaw, tour.toYaw, k);
    look.pitch = THREE.MathUtils.lerp(tour.fromPitch, tour.toPitch, k);
    if (tour.t >= 1) tour = null;
  }

  forward.set(-Math.sin(look.yaw), 0, -Math.cos(look.yaw));
  right.set(-forward.z, 0, forward.x);
  move.set(0, 0, 0);
  if (keys.has('KeyW') || keys.has('ArrowUp') || touchMove.forward) move.add(forward);
  if (keys.has('KeyS') || keys.has('ArrowDown') || touchMove.back) move.sub(forward);
  if (keys.has('KeyD') || (keys.has('ArrowRight') && viewing === -1)) move.add(right);
  if (keys.has('KeyA') || (keys.has('ArrowLeft') && viewing === -1)) move.sub(right);

  if (move.lengthSq() > 0) {
    tour = null;
    if (viewing !== -1) closeInfo();
    camera.position.addScaledVector(move.normalize(), WALK_SPEED * dt);
  }

  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -HW + WALL_MARGIN, HW - WALL_MARGIN);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -HD + WALL_MARGIN, HD - WALL_MARGIN);
  camera.rotation.set(look.pitch, look.yaw, 0);
}

// Shift the rendered view so the artwork being viewed isn't hidden behind the
// info panel (panel sits on the right on desktop, at the bottom on phones).
const viewShift = { x: 0, y: 0 };
function updateViewShift(dt) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const narrow = w <= 600;
  const tx = viewing !== -1 && !narrow ? Math.min(info.offsetWidth / 2 + 24, w * 0.25) : 0;
  const ty = viewing !== -1 && narrow ? Math.min(info.offsetHeight / 2 + 16, h * 0.3) : 0;
  const k = 1 - Math.exp(-dt * 6);
  viewShift.x += (tx - viewShift.x) * k;
  viewShift.y += (ty - viewShift.y) * k;
  if (Math.abs(viewShift.x) < 0.5 && Math.abs(viewShift.y) < 0.5 && tx === 0 && ty === 0) {
    if (camera.view && camera.view.enabled) camera.clearViewOffset();
    viewShift.x = viewShift.y = 0;
  } else {
    camera.setViewOffset(w, h, viewShift.x, viewShift.y, w, h);
  }
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  updateViewShift(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
  updateCameraFov();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
async function init() {
  // Make sure the web fonts are ready before drawing text onto textures
  try {
    await Promise.all([
      document.fonts.load('600 52px "Cormorant Garamond"'),
      document.fonts.load('500 44px Inter'),
    ]);
  } catch { /* fall back to system fonts */ }

  buildRoom();
  buildLights();
  ARTWORKS.slice(0, PLACEMENTS.length).forEach(buildArtwork);
  animate();

  const enter = document.getElementById('enter');
  enter.disabled = false;
  enter.textContent = 'Enter Gallery';
  enter.addEventListener('click', () => {
    started = true;
    document.getElementById('intro').classList.add('hidden');
    document.getElementById('hint').classList.add('visible');
    document.getElementById('touch-move').classList.add('visible');
    setTimeout(() => document.getElementById('hint').classList.remove('visible'), 6000);
  });
}

init();
