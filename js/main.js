// Runs as a classic script after vendor/three.min.js (global THREE) and
// js/artworks.js (EXHIBITION, STOPS), so the site has no outside dependencies.
(function () {
if (!window.THREE) {
  galleryError('The 3D engine did not load. Please reload the page.');
  return;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
// Two rooms in a line along -z, joined by a doorway in the dividing wall.
//   Gallery I:  z from 0 to -ROOM_DEPTH
//   Gallery II: z from -ROOM_DEPTH to -2 * ROOM_DEPTH
const HW = 8; // half the room width
const ROOM_DEPTH = 16;
const WALL_H = 5.5;
const DOOR_W = 3.2;
const DOOR_H = 3.4;
const DIVIDER_Z = -ROOM_DEPTH;
const BACK_Z = -2 * ROOM_DEPTH;

const EYE_HEIGHT = 1.7;
const WALK_SPEED = 4;
const BODY_RADIUS = 0.6;
const ART_MAX = { w: 2.6, h: 2.4 };
const ART_CENTER_Y = 2.2;
const FRAME = 0.1;
const MATBOARD = 0.16;
const LABEL_W = 1.8; // wall label beside each artwork
const LABEL_GAP = 0.35;
const TEXT_PANEL_W = 3.0; // intro / closing panels
// Panel text is drawn above 1x for sharpness (a little less on touch devices to save memory)
const TEXT_SCALE = window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2;
const STATION_DIST = 2.8; // floor marker distance from the wall
const START = new THREE.Vector3(0, EYE_HEIGHT, -6.5);
const START_YAW = Math.PI; // facing the intro panel on the entrance wall

// Where each stop (in STOPS order) hangs. `along` is the position along the
// wall of the artwork's centre (or the text panel's centre).
const STOP_LAYOUT = [
  { wall: 'front', along: 0 },     // intro panel on the entrance wall
  { wall: 'left', along: -4.0 },   // Gallery I
  { wall: 'left', along: -10.5 },
  { wall: 'right', along: -12.5 },
  { wall: 'left', along: -20.5 },  // Gallery II
  { wall: 'right', along: -23.0 },
  { wall: 'back', along: 0, width: 4.6 }, // closing panel (wider: it has more text)
];

const BENCHES = [
  { x: 0, z: -8.5 },
  { x: 0, z: -25.5 },
];

function wallFrame(wall, along) {
  // Returns the anchor point on the wall, its inward normal, and the
  // direction "to the right" when facing the wall.
  if (wall === 'left') return { pos: new THREE.Vector3(-HW, 0, along), normal: new THREE.Vector3(1, 0, 0) };
  if (wall === 'right') return { pos: new THREE.Vector3(HW, 0, along), normal: new THREE.Vector3(-1, 0, 0) };
  if (wall === 'front') return { pos: new THREE.Vector3(along, 0, 0), normal: new THREE.Vector3(0, 0, -1) };
  return { pos: new THREE.Vector3(along, 0, BACK_Z), normal: new THREE.Vector3(0, 0, 1) };
}

// ---------------------------------------------------------------------------
// Renderer, scene, camera
// ---------------------------------------------------------------------------
const canvas = document.getElementById('scene');
const isTouch = window.matchMedia('(pointer: coarse)').matches;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (err) {
  galleryError('This browser could not start 3D graphics (WebGL).');
  return;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const maxAniso = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1714);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
camera.rotation.order = 'YXZ';

// Keep a usable horizontal field of view on tall (portrait) screens
function updateCameraFov() {
  camera.aspect = window.innerWidth / window.innerHeight;
  const minHFov = THREE.MathUtils.degToRad(70);
  const neededVFov = 2 * Math.atan(Math.tan(minHFov / 2) / camera.aspect);
  camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(neededVFov), 65, 95);
  camera.updateProjectionMatrix();
}
updateCameraFov();

const look = { yaw: START_YAW, pitch: 0 };
camera.position.copy(START);

// ---------------------------------------------------------------------------
// Canvas textures
// ---------------------------------------------------------------------------
const SERIF = '"Cormorant Garamond", Georgia, "Times New Roman", serif';
// Wall panels use a sturdier serif so titles stay bold and readable at a distance
const PANEL_SERIF = 'Georgia, "Times New Roman", serif';
const INK = '#000000';
const SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(c, repeat) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(...repeat);
  }
  return tex;
}

function woodFloorTexture() {
  const c = makeCanvas(1024, 1024);
  const ctx = c.getContext('2d');
  const w = 1024;
  const plankH = w / 8;
  for (let row = 0; row < 8; row++) {
    const offset = (row % 2) * (w / 3);
    for (let x = -offset; x < w; x += w / 1.5) {
      const shade = 95 + Math.random() * 25;
      ctx.fillStyle = `rgb(${shade + 40}, ${shade + 10}, ${shade - 25})`;
      ctx.fillRect(x, row * plankH, w / 1.5, plankH);
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
  return toTexture(c, [4, 8]);
}

function placeholderTexture(stop) {
  const c = makeCanvas(768, 1024);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3a3129';
  ctx.fillRect(0, 0, 768, 1024);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textAlign = 'center';
  ctx.font = `500 40px ${SANS}`;
  ctx.fillText('Loading image…', 384, 512);
  return toTexture(c);
}

function wrapLines(ctx, text, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Lays out blocks of text on a panel-sized canvas. Each block is
// { text, font, color, lh, gap } or { rule: true, gap }.
function textPanelCanvas(blocks, widthPx, { pad = 72, bg = '#ece4d6', accent = '#6b3d12' } = {}) {
  const maxW = widthPx - pad * 2;
  const measure = makeCanvas(8, 8).getContext('2d');
  let height = pad;
  const laid = blocks.map((b) => {
    if (b.rule) {
      const item = { rule: true, y: height };
      height += 4 + (b.gap || 0);
      return item;
    }
    measure.font = b.font;
    const lines = wrapLines(measure, b.text, maxW);
    const item = { ...b, lines, y: height };
    height += lines.length * b.lh + (b.gap || 0);
    return item;
  });
  height += pad - 10;

  const c = makeCanvas(widthPx * TEXT_SCALE, Math.ceil(height) * TEXT_SCALE);
  const ctx = c.getContext('2d');
  ctx.scale(TEXT_SCALE, TEXT_SCALE);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, widthPx, height);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, widthPx, 12);
  ctx.textBaseline = 'top';
  for (const item of laid) {
    if (item.rule) {
      ctx.fillStyle = accent;
      ctx.fillRect(pad, item.y, 120, 5);
      continue;
    }
    ctx.font = item.font;
    ctx.fillStyle = item.color;
    item.lines.forEach((line, i) => ctx.fillText(line, pad, item.y + i * item.lh));
  }
  return c;
}

function labelBlocks(stop, number) {
  const meta = [stop.artist, stop.date].filter(Boolean).join(', ');
  return [
    { text: `NO. ${number}  ·  ${EXHIBITION.rooms[stop.room].toUpperCase()}`, font: `800 26px ${SANS}`, color: '#6b3d12', lh: 36, gap: 20 },
    { text: stop.title, font: `700 64px ${PANEL_SERIF}`, color: INK, lh: 74, gap: 20 },
    { text: meta, font: `700 32px ${SANS}`, color: INK, lh: 42, gap: 8 },
    { text: stop.medium, font: `600 26px ${SANS}`, color: '#2a2420', lh: 36, gap: 30 },
    { rule: true, gap: 30 },
    { text: stop.description, font: `600 35px ${SANS}`, color: INK, lh: 52, gap: 32 },
    { text: `Source: ${stop.source}`, font: `600 23px ${SANS}`, color: '#2a2420', lh: 33, gap: 0 },
  ];
}

function textStopBlocks(stop) {
  const blocks = [
    { text: stop.eyebrow.toUpperCase(), font: `800 28px ${SANS}`, color: '#6b3d12', lh: 38, gap: 16 },
    { text: stop.title, font: `700 88px ${PANEL_SERIF}`, color: INK, lh: 98, gap: 26 },
  ];
  if (stop.subtitleLabel) blocks.push({ text: stop.subtitleLabel.toUpperCase(), font: `800 26px ${SANS}`, color: '#6b3d12', lh: 36, gap: 8 });
  if (stop.subtitle) blocks.push({ text: stop.subtitle, font: `italic 700 46px ${PANEL_SERIF}`, color: '#1a1512', lh: 60, gap: 34 });
  blocks.push({ rule: true, gap: 34 });
  stop.body.forEach((p) => blocks.push({ text: p, font: `600 38px ${SANS}`, color: INK, lh: 56, gap: 28 }));
  if (stop.source) blocks.push({ text: `Source: ${stop.source}`, font: `600 25px ${SANS}`, color: '#2a2420', lh: 36, gap: 0 });
  return blocks;
}

function signCanvas(lines, { w = 1024, h = 256 } = {}) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2b241d';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#c9a46a';
  ctx.font = `600 30px ${SANS}`;
  ctx.fillText(lines[0], w / 2, h * 0.32);
  ctx.fillStyle = '#f7f4ee';
  ctx.font = `600 72px ${SERIF}`;
  ctx.fillText(lines[1], w / 2, h * 0.66);
  return c;
}

// ---------------------------------------------------------------------------
// Room
// ---------------------------------------------------------------------------
const wallMat = new THREE.MeshStandardMaterial({ color: 0xece4d6, roughness: 0.95 });
const trimMat = new THREE.MeshStandardMaterial({ color: 0x3a332b, roughness: 0.6 });

function addWall(width, height, x, y, z, ry, material = wallMat) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  wall.position.set(x, y, z);
  wall.rotation.y = ry;
  scene.add(wall);
  return wall;
}

function addBaseboard(width, x, z, ry) {
  const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.18, 0.04), trimMat);
  base.position.set(x, 0.09, z);
  base.rotation.y = ry;
  base.translateZ(0.02);
  scene.add(base);
}

function buildRooms() {
  const totalDepth = ROOM_DEPTH * 2;
  const midZ = -ROOM_DEPTH;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(HW * 2, totalDepth),
    new THREE.MeshStandardMaterial({ map: woodFloorTexture(), roughness: 0.55, metalness: 0.05 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = midZ;
  scene.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(HW * 2, totalDepth),
    new THREE.MeshStandardMaterial({ color: 0xf4f1ec, roughness: 1 }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, WALL_H, midZ);
  scene.add(ceiling);

  // Outer walls
  addWall(totalDepth, WALL_H, -HW, WALL_H / 2, midZ, Math.PI / 2);
  addWall(totalDepth, WALL_H, HW, WALL_H / 2, midZ, -Math.PI / 2);
  addWall(HW * 2, WALL_H, 0, WALL_H / 2, 0, Math.PI);
  addWall(HW * 2, WALL_H, 0, WALL_H / 2, BACK_Z, 0);
  addBaseboard(totalDepth, -HW, midZ, Math.PI / 2);
  addBaseboard(totalDepth, HW, midZ, -Math.PI / 2);
  addBaseboard(HW * 2, 0, 0, Math.PI);
  addBaseboard(HW * 2, 0, BACK_Z, 0);

  // Dividing wall with a doorway (a thick box on each side, plus a lintel)
  const thickness = 0.3;
  const sideW = HW - DOOR_W / 2;
  for (const sign of [-1, 1]) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(sideW, WALL_H, thickness), wallMat);
    seg.position.set(sign * (DOOR_W / 2 + sideW / 2), WALL_H / 2, DIVIDER_Z);
    scene.add(seg);
    for (const face of [-1, 1]) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(sideW, 0.18, 0.04), trimMat);
      base.position.set(seg.position.x, 0.09, DIVIDER_Z + face * (thickness / 2 + 0.02));
      scene.add(base);
    }
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, WALL_H - DOOR_H, thickness), wallMat);
  lintel.position.set(0, DOOR_H + (WALL_H - DOOR_H) / 2, DIVIDER_Z);
  scene.add(lintel);
  // Door frame
  const frameMatDark = new THREE.MeshStandardMaterial({ color: 0x2b241d, roughness: 0.5 });
  for (const sign of [-1, 1]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.12, DOOR_H, thickness + 0.08), frameMatDark);
    jamb.position.set(sign * (DOOR_W / 2 + 0.06), DOOR_H / 2, DIVIDER_Z);
    scene.add(jamb);
  }
  const head = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W + 0.24, 0.12, thickness + 0.08), frameMatDark);
  head.position.set(0, DOOR_H + 0.06, DIVIDER_Z);
  scene.add(head);

  // Signs above the doorway on both sides
  const signs = [
    { lines: ['CONTINUE TO', EXHIBITION.rooms[1]], z: DIVIDER_Z + thickness / 2 + 0.01, ry: 0 },
    { lines: ['BACK TO', EXHIBITION.rooms[0]], z: DIVIDER_Z - thickness / 2 - 0.01, ry: Math.PI },
  ];
  for (const s of signs) {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 0.9),
      new THREE.MeshStandardMaterial({ map: toTexture(signCanvas(s.lines)), roughness: 0.8 }),
    );
    sign.position.set(0, DOOR_H + 0.9, s.z);
    sign.rotation.y = s.ry;
    scene.add(sign);
  }

  // Room title on the entrance wall area of Gallery I is the intro panel;
  // Gallery II gets a title sign above the closing panel.
  const g2 = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 1.1),
    new THREE.MeshStandardMaterial({ map: toTexture(signCanvas(['GALLERY II', 'Traditional Healing'])), roughness: 0.8 }),
  );
  g2.position.set(0, WALL_H - 0.75, BACK_Z + 0.02);
  scene.add(g2);

  // Skylights
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xfffaf0 });
  for (const z of [-5, -11, -21, -27]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.4), panelMat);
    panel.rotation.x = Math.PI / 2;
    panel.position.set(0, WALL_H - 0.01, z);
    scene.add(panel);
  }

  // Benches
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x2b2520, roughness: 0.5 });
  const cushionMat = new THREE.MeshStandardMaterial({ color: 0x6b5a48, roughness: 0.9 });
  for (const b of BENCHES) {
    const bench = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.6), cushionMat);
    top.position.y = 0.46;
    bench.add(top);
    for (const lx of [-1.05, 1.05]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.55), benchMat);
      leg.position.set(lx, 0.2, 0);
      bench.add(leg);
    }
    bench.position.set(b.x, 0, b.z);
    scene.add(bench);
  }
}

function buildLights() {
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0xa8977f, 1.0));
  for (const z of [-8, -24]) {
    const fill = new THREE.PointLight(0xfff2e0, 16, 0, 1.6);
    fill.position.set(0, WALL_H - 0.5, z);
    scene.add(fill);
  }
}

// ---------------------------------------------------------------------------
// Stops: artworks with labels, and text panels
// ---------------------------------------------------------------------------
const frameMat = new THREE.MeshStandardMaterial({ color: 0x1f1a15, roughness: 0.4, metalness: 0.2 });
const matboardMat = new THREE.MeshStandardMaterial({ color: 0xfbf9f4, roughness: 0.9 });
const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.4 });

const stops = []; // runtime data per stop
const clickable = [];

function fitSize(aspect) {
  let w = ART_MAX.w;
  let h = w / aspect;
  if (h > ART_MAX.h) {
    h = ART_MAX.h;
    w = h * aspect;
  }
  return { w, h };
}

function addPanelMesh(group, canvasEl, widthM, x, y, index) {
  const heightM = widthM * (canvasEl.height / canvasEl.width);
  const backing = new THREE.Mesh(new THREE.BoxGeometry(widthM + 0.04, heightM + 0.04, 0.04), frameMat);
  backing.position.set(x, y, 0.02);
  group.add(backing);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(widthM, heightM),
    // Unlit so the spotlights never wash out or dim the text
    new THREE.MeshBasicMaterial({ map: toTexture(canvasEl), toneMapped: false }),
  );
  panel.position.set(x, y, 0.042);
  panel.userData.stop = index;
  group.add(panel);
  clickable.push(panel);
  return { panel, heightM };
}

function addSpot(target, normal, angle) {
  const light = new THREE.SpotLight(0xfff1dc, 32, 0, angle, 0.7, 1.4);
  light.position.copy(target).add(normal.clone().multiplyScalar(2.6));
  light.position.y = WALL_H - 0.2;
  light.target.position.copy(target);
  scene.add(light, light.target);
  const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.25, 16), fixtureMat);
  fixture.position.copy(light.position);
  fixture.lookAt(target);
  fixture.rotateX(Math.PI / 2);
  scene.add(fixture);
  return light;
}

// Unit = everything hung for one stop. `focus` is the centre of the unit on
// the wall, used for the floor marker, spotlight and camera framing.
function updateArtUnit(s, aspect) {
  const { w, h } = fitSize(aspect);
  const frameW = w + (MATBOARD + FRAME) * 2;
  const frameH = h + (MATBOARD + FRAME) * 2;
  s.canvasMesh.scale.set(w, h, 1);
  s.mat.scale.set(w + MATBOARD * 2, h + MATBOARD * 2, 1);
  s.frame.scale.set(frameW, frameH, 1);

  const labelX = frameW / 2 + LABEL_GAP + LABEL_W / 2;
  const top = ART_CENTER_Y + frameH / 2;
  const labelY = Math.max(top - s.labelH / 2, s.labelH / 2 + 0.45);
  s.label.position.set(labelX, labelY, 0);

  s.unitWidth = frameW + LABEL_GAP + LABEL_W;
  s.unitCenterX = (-frameW / 2 + labelX + LABEL_W / 2) / 2;
  refreshFocus(s);
}

function refreshFocus(s) {
  s.group.updateMatrixWorld(true);
  s.focus = new THREE.Vector3(s.unitCenterX, ART_CENTER_Y, 0).applyMatrix4(s.group.matrixWorld);
  // Light the artwork itself, not the label beside it
  s.artCenter = new THREE.Vector3(0, ART_CENTER_Y, 0).applyMatrix4(s.group.matrixWorld);
  if (s.light) s.light.target.position.copy(s.stop.type === 'art' ? s.artCenter : s.focus);
}

function buildStop(stop, index) {
  const layout = STOP_LAYOUT[index];
  const { pos, normal } = wallFrame(layout.wall, layout.along);
  const group = new THREE.Group();
  group.position.copy(pos);
  group.lookAt(pos.clone().add(normal));
  scene.add(group);
  const s = { stop, index, group, normal, room: stop.room };
  stops.push(s);

  if (stop.type === 'text') {
    const widthM = layout.width || TEXT_PANEL_W;
    const c = textPanelCanvas(textStopBlocks(stop), Math.round(widthM * 400), { pad: 90 });
    const heightM = widthM * (c.height / c.width);
    const y = Math.max(2.5, heightM / 2 + 0.5);
    addPanelMesh(group, c, widthM, 0, y, index);
    s.unitWidth = widthM;
    s.panelH = heightM;
    s.unitCenterX = 0;
    s.focusY = y;
    refreshFocus(s);
    s.focus.y = y;
    s.light = addSpot(s.focus, normal, 0.45);
    s.light.intensity = 14;
    return;
  }

  const frame = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.08), frameMat);
  frame.position.z = 0.04;
  group.add(frame);
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), matboardMat);
  mat.position.z = 0.081;
  group.add(mat);
  const artMat = new THREE.MeshStandardMaterial({ map: placeholderTexture(stop), roughness: 0.8 });
  const canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), artMat);
  canvasMesh.position.set(0, ART_CENTER_Y, 0.083);
  frame.position.y = ART_CENTER_Y;
  mat.position.y = ART_CENTER_Y;
  canvasMesh.userData.stop = index;
  group.add(canvasMesh);
  clickable.push(canvasMesh);

  const number = STOPS.slice(0, index + 1).filter((x) => x.type === 'art').length;
  s.number = number;
  const labelCanvas = textPanelCanvas(labelBlocks(stop, number), 900, { pad: 64 });
  const labelGroup = new THREE.Group();
  const { heightM } = addPanelMesh(labelGroup, labelCanvas, LABEL_W, 0, 0, index);
  group.add(labelGroup);

  Object.assign(s, { frame, mat, canvasMesh, label: labelGroup, labelH: heightM });
  updateArtUnit(s, 3 / 4);
  s.light = addSpot(s.artCenter, normal, 0.48);

  new THREE.TextureLoader().load(
    stop.image,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      artMat.map.dispose();
      artMat.map = tex;
      artMat.needsUpdate = true;
      updateArtUnit(s, tex.image.width / tex.image.height);
      buildFloorGuide();
    },
    undefined,
    () => { /* keep placeholder */ },
  );
}

// ---------------------------------------------------------------------------
// Floor guide: arrows along the route and a marker in front of each stop
// ---------------------------------------------------------------------------
function arrowTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.strokeStyle = '#ffd890';
  ctx.lineWidth = 34;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(48, 168);
  ctx.lineTo(128, 88);
  ctx.lineTo(208, 168);
  ctx.stroke();
  return toTexture(c);
}

function markerTexture(text, small) {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(43, 36, 29, 0.85)';
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd890';
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.fillStyle = '#ffd890';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = small ? `600 54px ${SANS}` : `600 120px ${SERIF}`;
  ctx.fillText(text, 128, small ? 128 : 136);
  return toTexture(c);
}

const guide = new THREE.Group();
scene.add(guide);
const arrowTex = arrowTexture();
let arrows = [];

function floorPlane(size, tex, opacity = 1) {
  const geo = new THREE.PlaneGeometry(size, size);
  geo.rotateX(-Math.PI / 2); // texture "up" now points along -z
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false });
  return new THREE.Mesh(geo, mat);
}

function yawToward(dx, dz) {
  return Math.atan2(-dx, -dz);
}

function stationPoint(s) {
  return s.focus.clone().setY(0).add(s.normal.clone().multiplyScalar(STATION_DIST));
}

function routePoints() {
  const pts = [];
  stops.forEach((s, i) => {
    if (i > 0 && stops[i - 1].room !== s.room) {
      pts.push(new THREE.Vector3(0, 0, DIVIDER_Z + 1.6));
      pts.push(new THREE.Vector3(0, 0, DIVIDER_Z - 1.6));
    }
    pts.push(stationPoint(s));
  });
  return pts;
}

function buildFloorGuide() {
  if (stops.length !== STOPS.length) return;
  guide.clear();
  arrows = [];
  const pts = routePoints();
  const stationSet = stops.map(stationPoint);
  let travelled = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = a.distanceTo(b);
    const dir = b.clone().sub(a).normalize();
    for (let d = 0.9; d < len - 0.6; d += 1.0) {
      const p = a.clone().addScaledVector(dir, d);
      if (stationSet.some((st) => st.distanceTo(p) < 0.9)) continue;
      const arrow = floorPlane(0.55, arrowTex, 0.8);
      arrow.position.set(p.x, 0.012, p.z);
      arrow.rotation.y = yawToward(dir.x, dir.z);
      arrow.userData.phase = travelled + d;
      guide.add(arrow);
      arrows.push(arrow);
    }
    travelled += len;
  }
  stops.forEach((s, i) => {
    const label = s.stop.type === 'art' ? String(s.number) : i === 0 ? 'START' : 'END';
    const marker = floorPlane(0.95, markerTexture(label, s.stop.type !== 'art'), 0.95);
    const p = stationSet[i];
    marker.position.set(p.x, 0.014, p.z);
    marker.rotation.y = yawToward(-s.normal.x, -s.normal.z);
    marker.userData.stop = i;
    guide.add(marker);
  });
}

// ---------------------------------------------------------------------------
// Movement and collisions
// ---------------------------------------------------------------------------
function blocked(x, z) {
  const r = BODY_RADIUS;
  if (x < -HW + r || x > HW - r || z > -r || z < BACK_Z + r) return true;
  if (Math.abs(z - DIVIDER_Z) < r + 0.15 && Math.abs(x) > DOOR_W / 2 - 0.35) return true;
  for (const b of BENCHES) {
    if (Math.abs(x - b.x) < 1.2 + r * 0.6 && Math.abs(z - b.z) < 0.3 + r * 0.6) return true;
  }
  return false;
}

function tryMove(dx, dz) {
  const p = camera.position;
  if (!blocked(p.x + dx, p.z + dz)) { p.x += dx; p.z += dz; return; }
  if (!blocked(p.x + dx, p.z)) { p.x += dx; return; }
  if (!blocked(p.x, p.z + dz)) p.z += dz;
}

// ---------------------------------------------------------------------------
// Guided tour (camera flights between stops)
// ---------------------------------------------------------------------------
let flight = null;
let current = -1;

function shortestAngle(from, to) {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function roomOf(z) {
  return z < DIVIDER_Z ? 1 : 0;
}

function viewPoint(s) {
  const halfHFov = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
  const halfVFov = THREE.MathUtils.degToRad(camera.fov) / 2;
  const tall = s.stop.type === 'text' ? Math.max(3.4, s.panelH + 0.5) : 3.2;
  let dist = Math.max((s.unitWidth * 0.62) / Math.tan(halfHFov), (tall * 0.62) / Math.tan(halfVFov), 3.2);
  dist = Math.min(dist, HW * 2 - 1.2);
  const p = s.focus.clone().add(s.normal.clone().multiplyScalar(dist));
  p.y = EYE_HEIGHT;
  const yaw = Math.atan2(s.normal.x, s.normal.z);
  const pitch = Math.atan2(s.focus.y - EYE_HEIGHT, dist);
  return { p, yaw, pitch };
}

function goTo(index) {
  index = (index + stops.length) % stops.length;
  const s = stops[index];
  const { p, yaw, pitch } = viewPoint(s);
  const path = [camera.position.clone()];
  if (roomOf(camera.position.z) !== s.room) {
    // go through the doorway instead of through the wall
    const enterSide = s.room === 1 ? 1 : -1;
    path.push(new THREE.Vector3(0, EYE_HEIGHT, DIVIDER_Z + enterSide * 1.8));
    path.push(new THREE.Vector3(0, EYE_HEIGHT, DIVIDER_Z - enterSide * 1.8));
  }
  path.push(p);
  const lengths = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const l = path[i].distanceTo(path[i + 1]);
    lengths.push(l);
    total += l;
  }
  flight = {
    t: 0,
    duration: THREE.MathUtils.clamp(total / 6, 1.1, 3.2),
    path, lengths, total,
    fromYaw: look.yaw,
    toYaw: shortestAngle(look.yaw, yaw),
    fromPitch: look.pitch,
    toPitch: pitch,
  };
  current = index;
  showTourBar(index);
}

function pointOnPath(f, k) {
  let d = k * f.total;
  for (let i = 0; i < f.lengths.length; i++) {
    if (d <= f.lengths[i] || i === f.lengths.length - 1) {
      const t = f.lengths[i] ? Math.min(d / f.lengths[i], 1) : 1;
      return f.path[i].clone().lerp(f.path[i + 1], t);
    }
    d -= f.lengths[i];
  }
  return f.path[f.path.length - 1].clone();
}

// ---------------------------------------------------------------------------
// UI: tour bar and reader card
// ---------------------------------------------------------------------------
const tourbar = document.getElementById('tourbar');
const reader = document.getElementById('reader');

function stopTitle(s) {
  return s.stop.type === 'art' ? `${s.number}. ${s.stop.title}` : s.stop.title;
}

function showTourBar(index) {
  const s = stops[index];
  document.getElementById('tour-step').textContent = `Stop ${index + 1} of ${stops.length} · ${EXHIBITION.rooms[s.room]}`;
  document.getElementById('tour-title').textContent = stopTitle(s);
  tourbar.classList.add('open');
  if (reader.classList.contains('open')) fillReader(index);
}

function hideTourBar() {
  current = -1;
  tourbar.classList.remove('open');
  closeReader();
}

function fillReader(index) {
  const st = stops[index].stop;
  document.getElementById('reader-eyebrow').textContent = st.type === 'art'
    ? `No. ${stops[index].number} · ${EXHIBITION.rooms[st.room]}`
    : st.eyebrow;
  document.getElementById('reader-title').textContent = st.title;
  const meta = st.type === 'art'
    ? [st.artist, st.date].filter(Boolean).join(', ')
    : [st.subtitleLabel, st.subtitle].filter(Boolean).join(' ');
  document.getElementById('reader-meta').textContent = meta || '';
  document.getElementById('reader-medium').textContent = st.type === 'art' ? st.medium : '';
  const body = document.getElementById('reader-body');
  body.replaceChildren();
  (st.type === 'art' ? [st.description] : st.body).forEach((t) => {
    const p = document.createElement('p');
    p.textContent = t;
    body.appendChild(p);
  });
  document.getElementById('reader-source').textContent = st.source ? `Source: ${st.source}` : '';
}

function openReader() {
  if (current === -1) return;
  fillReader(current);
  reader.classList.add('open');
  reader.setAttribute('aria-hidden', 'false');
}

function closeReader() {
  reader.classList.remove('open');
  reader.setAttribute('aria-hidden', 'true');
}

document.getElementById('tour-prev').addEventListener('click', () => goTo(current - 1));
document.getElementById('tour-next').addEventListener('click', () => goTo(current + 1));
document.getElementById('tour-read').addEventListener('click', () => (reader.classList.contains('open') ? closeReader() : openReader()));
document.getElementById('tour-close').addEventListener('click', hideTourBar);
document.getElementById('reader-close').addEventListener('click', closeReader);

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
const keys = new Set();
const touchMove = { forward: false, back: false };
let dragging = false;
let dragDistance = 0;
let lastPointer = { x: 0, y: 0 };
let started = false;

const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();

function pickStop(clientX, clientY) {
  pointerNdc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointerNdc, camera);
  const hits = raycaster.intersectObjects(clickable.concat(guide.children.filter((m) => m.userData.stop !== undefined)));
  return hits.length ? hits[0].object.userData.stop : -1;
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
      flight = null;
      const sensitivity = e.pointerType === 'touch' ? 0.005 : 0.0035;
      look.yaw += dx * sensitivity;
      look.pitch = THREE.MathUtils.clamp(look.pitch + dy * sensitivity, -1.2, 1.2);
    }
  } else if (e.pointerType === 'mouse') {
    canvas.classList.toggle('hovering', pickStop(e.clientX, e.clientY) !== -1);
  }
});

canvas.addEventListener('pointerup', (e) => {
  if (!dragging) return;
  dragging = false;
  canvas.classList.remove('dragging');
  if (dragDistance <= 4) {
    const index = pickStop(e.clientX, e.clientY);
    if (index !== -1) goTo(index);
  }
});

window.addEventListener('keydown', (e) => {
  if (!started) return;
  if (e.key === 'Escape') { if (reader.classList.contains('open')) closeReader(); else hideTourBar(); }
  if (current !== -1 && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    goTo(current + (e.key === 'ArrowRight' ? 1 : -1));
    return;
  }
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

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const move = new THREE.Vector3();
let elapsed = 0;

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function update(dt) {
  elapsed += dt;
  if (flight) {
    flight.t = Math.min(1, flight.t + dt / flight.duration);
    const k = easeInOut(flight.t);
    camera.position.copy(pointOnPath(flight, k));
    look.yaw = THREE.MathUtils.lerp(flight.fromYaw, flight.toYaw, k);
    look.pitch = THREE.MathUtils.lerp(flight.fromPitch, flight.toPitch, k);
    if (flight.t >= 1) flight = null;
  }

  forward.set(-Math.sin(look.yaw), 0, -Math.cos(look.yaw));
  right.set(-forward.z, 0, forward.x);
  move.set(0, 0, 0);
  if (keys.has('KeyW') || keys.has('ArrowUp') || touchMove.forward) move.add(forward);
  if (keys.has('KeyS') || keys.has('ArrowDown') || touchMove.back) move.sub(forward);
  if (keys.has('KeyD') || keys.has('ArrowRight')) move.add(right);
  if (keys.has('KeyA') || keys.has('ArrowLeft')) move.sub(right);
  if (move.lengthSq() > 0) {
    flight = null;
    if (current !== -1) hideTourBar();
    move.normalize().multiplyScalar(WALK_SPEED * dt);
    tryMove(move.x, move.z);
  }
  camera.rotation.set(look.pitch, look.yaw, 0);

  // Arrows pulse in a wave along the route, pointing the way forward
  for (const a of arrows) {
    const wave = Math.sin(elapsed * 3 - a.userData.phase * 1.1);
    a.material.opacity = 0.3 + 0.6 * Math.max(0, wave) ** 2;
  }
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
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
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load(`600 52px "Cormorant Garamond"`),
        document.fonts.load('italic 500 46px "Cormorant Garamond"'),
        document.fonts.load('500 44px Inter'),
        document.fonts.load('600 35px Inter'),
        document.fonts.load('700 32px Inter'),
        document.fonts.load('800 26px Inter'),
      ]),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch { /* fall back to system fonts */ }

  buildRooms();
  buildLights();
  STOPS.forEach(buildStop);
  buildFloorGuide();
  animate();

  const begin = (tour) => {
    started = true;
    document.getElementById('intro').classList.add('hidden');
    document.getElementById('touch-move').classList.add('visible');
    if (tour) {
      goTo(0);
    } else {
      const hint = document.getElementById('hint');
      hint.classList.add('visible');
      setTimeout(() => hint.classList.remove('visible'), 7000);
    }
  };
  const enter = document.getElementById('enter');
  const tourBtn = document.getElementById('enter-tour');
  enter.disabled = false;
  tourBtn.disabled = false;
  enter.textContent = 'Explore freely';
  enter.addEventListener('click', () => begin(false));
  tourBtn.addEventListener('click', () => begin(true));
}

init();
})();
