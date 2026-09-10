import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase/firebase-config.js";

/* =========================================================
   ELEVATOR CONFIGURATOR
   GitHub assets + Firebase catalog + Three.js 3D
   ========================================================= */

const ASSET = "./assets/";

const FALLBACK_CATALOG = {
  cabins: [
    { code: "GV-001", name: "Modern Line", file: "GV-001.glb" },
    { code: "GV-002", name: "Luxury Line", file: "GV-002.glb" },
    { code: "GV-003", name: "Minimal Line", file: "GV-003.glb" }
  ],
  walls: [
    { code:"I01", name:"Champagne Hairline", file:"I01.png", color:"#c7b49b" },
    { code:"I02", name:"Titanium Mirror", file:"I02.png", color:"#c6cbd0" },
    { code:"I03", name:"Silver Hairline", file:"I03.png", color:"#aeb7bd" },
    { code:"I04", name:"Black Titanium", file:"I04.png", color:"#20252a" },
    { code:"I05", name:"Rose Gold", file:"I05.png", color:"#b9897d" },
    { code:"I06", name:"Dark Bronze", file:"I06.png", color:"#55443a" },
    { code:"I07", name:"Champagne Mirror", file:"I07.png", color:"#d1bfaa" },
    { code:"I08", name:"Graphite Hairline", file:"I08.png", color:"#454c52" }
  ],
  floors: [
    { code:"S01", name:"Light Stone", file:"S01.png", color:"#d9d4cb" },
    { code:"S02", name:"Dark Stone", file:"S02.png", color:"#4d4c4a" },
    { code:"S03", name:"Warm Marble", file:"S03.png", color:"#bcae9c" },
    { code:"S04", name:"Black Marble", file:"S04.png", color:"#292b2d" },
    { code:"S05", name:"Grey Granite", file:"S05.png", color:"#777a79" },
    { code:"S06", name:"Luxury Beige", file:"S06.png", color:"#c9bda9" }
  ],
  ceilings: [
    { code:"T01", name:"Flat White", file:"T01.png", color:"#f2f2ee" },
    { code:"T02", name:"Black Frame", file:"T02.png", color:"#24282a" },
    { code:"T03", name:"Linear LED", file:"T03.png", color:"#d9d8d2" },
    { code:"T04", name:"Luxury Gold", file:"T04.png", color:"#b8a276" },
    { code:"T05", name:"Dark Grid", file:"T05.png", color:"#363a3c" },
    { code:"T06", name:"Soft Silver", file:"T06.png", color:"#bfc3c4" }
  ],
  doors: [
    { code:"C01", name:"Silver Hairline", file:"C01.png", color:"#9ca4a8" },
    { code:"C02", name:"Champagne", file:"C02.png", color:"#c6b39a" },
    { code:"C03", name:"Black Mirror", file:"C03.png", color:"#202427" },
    { code:"C04", name:"Titanium", file:"C04.png", color:"#747b7f" },
    { code:"C05", name:"Rose Gold", file:"C05.png", color:"#a77e76" },
    { code:"C06", name:"Bronze", file:"C06.png", color:"#5b463b" }
  ],
  handrails: [
    { code:"H01", name:"Round Silver", file:"H01.png", color:"#9ea5a8" },
    { code:"H02", name:"Round Black", file:"H02.png", color:"#222629" },
    { code:"H03", name:"Gold", file:"H03.png", color:"#b59652" },
    { code:"H04", name:"Champagne", file:"H04.png", color:"#bca78e" }
  ],
  cops: [
    { code:"P01", name:"Slim Black", file:"P01.png", color:"#22272a" },
    { code:"P02", name:"Silver", file:"P02.png", color:"#9fa6aa" },
    { code:"P03", name:"Gold", file:"P03.png", color:"#b89b61" },
    { code:"P04", name:"Glass Black", file:"P04.png", color:"#111517" }
  ],
  lightings: [
    { code:"L01", name:"Warm 3000K", file:"L01.png", color:"#ffd9a3" },
    { code:"L02", name:"Neutral 4000K", file:"L02.png", color:"#fff4dd" },
    { code:"L03", name:"Cool 5000K", file:"L03.png", color:"#dcecff" },
    { code:"L04", name:"Ambient", file:"L04.png", color:"#e9f0ff" }
  ]
};

const state = {
  cabin: FALLBACK_CATALOG.cabins[0],
  wallMode: "same",
  walls: {
    left: FALLBACK_CATALOG.walls[0],
    back: FALLBACK_CATALOG.walls[0],
    right: FALLBACK_CATALOG.walls[0]
  },
  floor: FALLBACK_CATALOG.floors[0],
  ceiling: FALLBACK_CATALOG.ceilings[0],
  door: FALLBACK_CATALOG.doors[0],
  handrail: FALLBACK_CATALOG.handrails[0],
  cop: FALLBACK_CATALOG.cops[0],
  lighting: FALLBACK_CATALOG.lightings[0]
};

let catalog = structuredClone(FALLBACK_CATALOG);

let scene, camera, renderer, controls;
let cabinRoot;
let meshes = {};
let textureLoader;
let gltfLoader;
const textureCache = new Map();

const viewer = document.getElementById("viewer");
const loading = document.getElementById("loading");
const loadingText = document.getElementById("loadingText");

function setLoading(text, visible = true) {
  loadingText.textContent = text;
  loading.classList.toggle("hidden", !visible);
}

function hexColor(value, fallback = 0xb7bdc0) {
  try {
    return new THREE.Color(value || fallback);
  } catch {
    return new THREE.Color(fallback);
  }
}

function assetUrl(folder, file) {
  return `${ASSET}${folder}/${file}`;
}

function init3D() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe9edef);

  camera = new THREE.PerspectiveCamera(
    42,
    viewer.clientWidth / Math.max(1, viewer.clientHeight),
    0.05,
    100
  );
  camera.position.set(4.8, 3.5, 5.5);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(viewer.clientWidth, viewer.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  viewer.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 2.6;
  controls.maxDistance = 12;
  controls.target.set(0, 1.35, 0);

  textureLoader = new THREE.TextureLoader();
  gltfLoader = new GLTFLoader();

  addLights();
  buildProceduralCabin();
  window.addEventListener("resize", resize3D);

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
}

function addLights() {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x606a70, 2.0);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3.5, 7, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 1.1);
  fill.position.set(-4, 4, 2);
  scene.add(fill);
}

function makeMaterial(opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: opts.color || 0xffffff,
    roughness: opts.roughness ?? 0.42,
    metalness: opts.metalness ?? 0.45
  });
}

function box(name, size, pos, material, parent = cabinRoot) {
  const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  mesh.position.set(pos.x, pos.y, pos.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  meshes[name] = mesh;
  return mesh;
}

function buildProceduralCabin() {
  if (cabinRoot) scene.remove(cabinRoot);

  cabinRoot = new THREE.Group();
  cabinRoot.name = "ElevatorCabin";
  scene.add(cabinRoot);

  const W = 2.8;
  const D = 2.4;
  const H = 3.0;
  const wallT = 0.07;

  // Floor
  box("floor", {x:W, y:0.10, z:D}, {x:0,y:0.05,z:0}, makeMaterial());

  // Back wall
  box("wallBack", {x:W, y:H, z:wallT}, {x:0,y:H/2,z:-D/2}, makeMaterial());

  // Left / right walls are separate meshes intentionally.
  box("wallLeft", {x:wallT, y:H, z:D}, {x:-W/2,y:H/2,z:0}, makeMaterial());
  box("wallRight", {x:wallT, y:H, z:D}, {x:W/2,y:H/2,z:0}, makeMaterial());

  // Ceiling
  box("ceiling", {x:W, y:0.12, z:D}, {x:0,y:H,z:0}, makeMaterial());

  // Front door frame and doors
  box("frontHeader", {x:W, y:0.18, z:0.12}, {x:0,y:H-0.18,z:D/2}, makeMaterial({color:0x777d80}));

  box("doorLeft", {x:W/2-0.03, y:H-0.38, z:0.045}, {x:-W/4,y:(H-0.38)/2,z:D/2+0.02}, makeMaterial());
  box("doorRight", {x:W/2-0.03, y:H-0.38, z:0.045}, {x:W/4,y:(H-0.38)/2,z:D/2+0.02}, makeMaterial());

  // Door center gap
  box("doorGap", {x:0.025,y:H-0.38,z:0.055}, {x:0,y:(H-0.38)/2,z:D/2+0.05}, makeMaterial({color:0x161a1c, roughness:.3}));

  // Decorative base trims
  const trimMat = makeMaterial({color:0x8b9194, roughness:.28, metalness:.72});
  box("trimBack", {x:W,y:0.09,z:0.10}, {x:0,y:0.20,z:-D/2+0.05}, trimMat);
  box("trimLeft", {x:0.10,y:0.09,z:D}, {x:-W/2+0.05,y:0.20,z:0}, trimMat);
  box("trimRight", {x:0.10,y:0.09,z:D}, {x:W/2-0.05,y:0.20,z:0}, trimMat);

  // Handrail
  const rail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035,0.035,1.65,24),
    makeMaterial({color:0x999999, roughness:.22, metalness:.8})
  );
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, 1.15, -D/2 + 0.12);
  rail.castShadow = true;
  rail.name = "handrail";
  cabinRoot.add(rail);
  meshes.handrail = rail;

  // COP panel on right wall
  box("copPanel", {x:0.045,y:0.78,z:0.42}, {x:W/2-0.08,y:1.42,z:0.15}, makeMaterial({color:0x171b1d, roughness:.25, metalness:.55}));

  // Ceiling light strips
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 2.5,
    roughness: .2
  });

  for (let i = -1; i <= 1; i++) {
    box(`light_${i}`, {x:0.11,y:0.025,z:1.65}, {x:i*0.78,y:H-0.075,z:0}, lightMat);
  }

  applyAllMaterials();
}

async function loadTexture(url) {
  if (textureCache.has(url)) return textureCache.get(url);

  const texture = await new Promise((resolve) => {
    textureLoader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        resolve(tex);
      },
      undefined,
      () => resolve(null)
    );
  });

  textureCache.set(url, texture);
  return texture;
}

async function materialFromAsset(item, folder, options = {}) {
  const texture = await loadTexture(assetUrl(folder, item.file));

  const material = new THREE.MeshStandardMaterial({
    color: hexColor(item.color, 0xb7bdc0),
    map: texture || null,
    roughness: options.roughness ?? 0.36,
    metalness: options.metalness ?? 0.58
  });

  if (texture) {
    texture.repeat.set(options.repeatX ?? 1.0, options.repeatY ?? 1.0);
    texture.needsUpdate = true;
  }

  return material;
}

async function applyWallMaterials() {
  const left = await materialFromAsset(state.walls.left, "walls", {repeatX:1,repeatY:1});
  const back = await materialFromAsset(state.walls.back, "walls", {repeatX:1,repeatY:1});
  const right = await materialFromAsset(state.walls.right, "walls", {repeatX:1,repeatY:1});

  meshes.wallLeft.material = left;
  meshes.wallBack.material = back;
  meshes.wallRight.material = right;

  if (state.wallMode === "pattern") {
    addPatternOverlay();
  } else {
    removePatternOverlay();
  }
}

let patternOverlay = null;

function addPatternOverlay() {
  removePatternOverlay();

  patternOverlay = new THREE.Group();
  patternOverlay.name = "etchedPatternOverlay";

  const patternMat = new THREE.MeshStandardMaterial({
    color: 0xc9b98e,
    emissive: 0x2a2417,
    emissiveIntensity: 0.15,
    transparent: true,
    opacity: 0.45,
    roughness: .32,
    metalness: .55
  });

  // Elegant vertical etched-line demonstration.
  for (const [x,z] of [
    [-0.7,-1.205], [0,-1.205], [0.7,-1.205]
  ]) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 2.45, 0.012),
      patternMat
    );
    line.position.set(x, 1.5, z + 0.012);
    patternOverlay.add(line);
  }

  cabinRoot.add(patternOverlay);
}

function removePatternOverlay() {
  if (patternOverlay) {
    cabinRoot.remove(patternOverlay);
    patternOverlay.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    patternOverlay = null;
  }
}

async function applyFloor() {
  const mat = await materialFromAsset(state.floor, "floor", {
    repeatX: 1.2, repeatY: 1.0, roughness: .55, metalness: .05
  });
  meshes.floor.material = mat;
}

async function applyCeiling() {
  const mat = await materialFromAsset(state.ceiling, "ceiling", {
    repeatX: 1, repeatY: 1, roughness: .34, metalness: .45
  });
  meshes.ceiling.material = mat;
}

async function applyDoor() {
  const mat = await materialFromAsset(state.door, "doors", {
    repeatX: 1, repeatY: 1, roughness: .26, metalness: .68
  });
  meshes.doorLeft.material = mat;
  meshes.doorRight.material = mat.clone();
}

async function applyHandrail() {
  const mat = await materialFromAsset(state.handrail, "handrail", {
    repeatX: 1, repeatY: 1, roughness: .22, metalness: .82
  });
  meshes.handrail.material = mat;
}

async function applyCop() {
  const mat = await materialFromAsset(state.cop, "cop", {
    repeatX: 1, repeatY: 1, roughness: .24, metalness: .58
  });
  meshes.copPanel.material = mat;
}

function applyLighting() {
  const map = {
    L01: {color:0xffd6a0, intensity:3.0},
    L02: {color:0xfff1dc, intensity:3.1},
    L03: {color:0xdbeaff, intensity:3.2},
    L04: {color:0xe6edff, intensity:2.6}
  };
  const cfg = map[state.lighting.code] || map.L02;

  for (const key of Object.keys(meshes)) {
    if (key.startsWith("light_")) {
      meshes[key].material.color.setHex(0xffffff);
      meshes[key].material.emissive.setHex(cfg.color);
      meshes[key].material.emissiveIntensity = cfg.intensity;
    }
  }
}

async function applyAllMaterials() {
  setLoading("Đang tải vật liệu…", true);

  await Promise.all([
    applyWallMaterials(),
    applyFloor(),
    applyCeiling(),
    applyDoor(),
    applyHandrail(),
    applyCop()
  ]);

  applyLighting();
  updateUI();
  setLoading("", false);
}

async function loadCabinModel(item) {
  // The GLB library is already stored in GitHub. For this first architecture,
  // the procedural cabin remains the guaranteed fallback and the GLB is loaded
  // in the background when available.
  const url = assetUrl("cabin", item.file);

  try {
    const gltf = await new Promise((resolve, reject) => {
      gltfLoader.load(url, resolve, undefined, reject);
    });

    // Replace the procedural shell with the GLB only if it loads successfully.
    // We keep the loaded model in a separate group so future GLB naming/material
    // mappings can be added without changing the catalog/UI.
    const model = gltf.scene;
    model.name = "GLB_" + item.code;

    model.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    // For now, don't automatically replace the procedural shell: the GLB files
    // are demo assets and may have different internal dimensions/material names.
    // This verifies that GitHub GLB assets are reachable without risking layout.
    model.visible = false;
    cabinRoot.add(model);
  } catch (err) {
    console.warn("GLB not loaded:", url, err);
  }
}

function renderChoices(containerId, items, key, folder) {
  const el = document.getElementById(containerId);
  el.innerHTML = "";

  items.forEach(item => {
    const button = document.createElement("button");
    button.className = "choice";
    button.dataset.code = item.code;

    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.backgroundColor = item.color || "#c5c9cb";
    swatch.style.backgroundImage = `url("${assetUrl(folder, item.file)}")`;

    const name = document.createElement("div");
    name.className = "choice-name";
    name.textContent = item.name;

    const code = document.createElement("div");
    code.className = "choice-code";
    code.textContent = item.code;

    button.append(swatch, name, code);

    button.addEventListener("click", async () => {
      state[key] = item;
      await applyAllMaterials();
    });

    el.appendChild(button);
  });
}

function renderWallChoices() {
  const el = document.getElementById("wallChoices");
  el.innerHTML = "";

  catalog.walls.forEach(item => {
    const button = document.createElement("button");
    button.className = "choice";
    button.dataset.code = item.code;

    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.backgroundColor = item.color;
    swatch.style.backgroundImage = `url("${assetUrl("walls", item.file)}")`;

    const name = document.createElement("div");
    name.className = "choice-name";
    name.textContent = item.name;

    const code = document.createElement("div");
    code.className = "choice-code";
    code.textContent = item.code;

    button.append(swatch, name, code);

    button.addEventListener("click", async () => {
      if (state.wallMode === "same" || state.wallMode === "pattern") {
        state.walls.left = item;
        state.walls.back = item;
        state.walls.right = item;
      } else {
        const target = prompt(
          "Chọn vách muốn áp dụng: left = trái, back = sau, right = phải",
          "back"
        );

        if (target === "left") state.walls.left = item;
        if (target === "back") state.walls.back = item;
        if (target === "right") state.walls.right = item;
      }

      await applyWallMaterials();
      updateUI();
    });

    el.appendChild(button);
  });
}

function renderAllChoices() {
  renderChoices("cabinChoices", catalog.cabins, "cabin", "cabin");
  renderWallChoices();
  renderChoices("floorChoices", catalog.floors, "floor", "floor");
  renderChoices("ceilingChoices", catalog.ceilings, "ceiling", "ceiling");
  renderChoices("doorChoices", catalog.doors, "door", "doors");
  renderChoices("handrailChoices", catalog.handrails, "handrail", "handrail");
  renderChoices("copChoices", catalog.cops, "cop", "cop");
  renderChoices("lightingChoices", catalog.lightings, "lighting", "lighting");
}

function updateUI() {
  document.querySelectorAll(".choice").forEach(btn => btn.classList.remove("active"));

  const mark = (containerId, code) => {
    document.querySelectorAll(`#${containerId} .choice`).forEach(btn => {
      btn.classList.toggle("active", btn.dataset.code === code);
    });
  };

  mark("cabinChoices", state.cabin.code);
  mark("floorChoices", state.floor.code);
  mark("ceilingChoices", state.ceiling.code);
  mark("doorChoices", state.door.code);
  mark("handrailChoices", state.handrail.code);
  mark("copChoices", state.cop.code);
  mark("lightingChoices", state.lighting.code);

  document.getElementById("wallLeftLabel").textContent = state.walls.left.code;
  document.getElementById("wallBackLabel").textContent = state.walls.back.code;
  document.getElementById("wallRightLabel").textContent = state.walls.right.code;

  const wallActive = new Set([
    state.walls.left.code,
    state.walls.back.code,
    state.walls.right.code
  ]);

  document.querySelectorAll("#wallChoices .choice").forEach(btn => {
    btn.classList.toggle("active", wallActive.has(btn.dataset.code));
  });

  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === state.wallMode);
  });

  document.getElementById("configOutput").textContent = JSON.stringify({
    cabin: state.cabin.code,
    walls: {
      left: state.walls.left.code,
      back: state.walls.back.code,
      right: state.walls.right.code,
      mode: state.wallMode
    },
    floor: state.floor.code,
    ceiling: state.ceiling.code,
    door: state.door.code,
    handrail: state.handrail.code,
    cop: state.cop.code,
    lighting: state.lighting.code
  }, null, 2);
}

async function setupFirebase() {
  try {
    const firebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(firebaseApp);

    document.getElementById("firebaseStatus").textContent = "Firebase kết nối";

    // Read-only catalog sync. If Firestore is empty or rules deny access,
    // the local demo catalog continues working.
    try {
      const snapshot = await getDocs(
        query(collection(db, "materials"), orderBy("code"))
      );

      if (!snapshot.empty) {
        const wallDocs = [];
        snapshot.forEach(doc => {
          const d = doc.data();
          if (d.active !== false && d.category === "wall") {
            wallDocs.push({
              code: d.code || doc.id,
              name: d.name || d.code || doc.id,
              file: d.file || `${d.code || doc.id}.png`,
              color: d.hex || d.colorHex || fallbackColor(d.color)
            });
          }
        });

        if (wallDocs.length) {
          catalog.walls = wallDocs;
          renderAllChoices();
          updateUI();
        }
      }
    } catch (err) {
      console.warn("Firestore catalog read skipped:", err);
      document.getElementById("firebaseStatus").textContent = "Firebase · Demo offline";
    }
  } catch (err) {
    console.error("Firebase init failed:", err);
    document.getElementById("firebaseStatus").textContent = "Demo offline";
  }
}

function fallbackColor(name) {
  const map = {
    champagne:"#c7b49b",
    gold:"#b89b61",
    silver:"#aeb7bd",
    black:"#24282a",
    bronze:"#5b463b",
    rose:"#b9897d",
    titanium:"#8b9296"
  };
  return map[String(name || "").toLowerCase()] || "#b7bdc0";
}

function setupEvents() {
  document.getElementById("wallModes").addEventListener("click", async (e) => {
    const btn = e.target.closest(".mode-btn");
    if (!btn) return;

    state.wallMode = btn.dataset.mode;

    if (state.wallMode === "same") {
      state.walls.back = state.walls.left;
      state.walls.right = state.walls.left;
    }

    await applyWallMaterials();
    updateUI();
  });
}

async function boot() {
  try {
    init3D();
    renderAllChoices();
    setupEvents();
    updateUI();

    // Start loading the first GLB in the background to verify GitHub asset access.
    loadCabinModel(state.cabin);

    await setupFirebase();
    setLoading("", false);
  } catch (err) {
    console.error(err);
    setLoading("Không thể khởi tạo 3D. Kiểm tra Console.", true);
  }
}

boot();
