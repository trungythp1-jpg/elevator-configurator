import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { firebaseConfig } from "./firebase/firebase-config.js";

const ASSET = "./assets/";

const catalog = {
  cabin: [
    { code: "GV-001", name: "Modern Standard", width: 1.30, depth: 1.35, height: 2.25 },
    { code: "GV-002", name: "Luxury Wide", width: 1.45, depth: 1.50, height: 2.30 },
    { code: "GV-003", name: "Compact", width: 1.10, depth: 1.20, height: 2.20 }
  ],
  wall: Array.from({length: 8}, (_, i) => {
    const code = `I${String(i + 1).padStart(2, "0")}`;
    return { code, name: `Inox mẫu ${i + 1}`, image: `${ASSET}walls/${code}.png` };
  }),
  floor: Array.from({length: 6}, (_, i) => {
    const code = `S${String(i + 1).padStart(2, "0")}`;
    return { code, name: `Sàn mẫu ${i + 1}`, image: `${ASSET}floor/${code}.png` };
  }),
  ceiling: Array.from({length: 6}, (_, i) => {
    const code = `T${String(i + 1).padStart(2, "0")}`;
    return { code, name: `Trần mẫu ${i + 1}`, image: `${ASSET}ceiling/${code}.png` };
  }),
  door: Array.from({length: 6}, (_, i) => {
    const code = `C${String(i + 1).padStart(2, "0")}`;
    return { code, name: `Cửa mẫu ${i + 1}`, image: `${ASSET}doors/${code}.png` };
  }),
  handrail: Array.from({length: 4}, (_, i) => {
    const code = `H${String(i + 1).padStart(2, "0")}`;
    return { code, name: `Tay vịn mẫu ${i + 1}`, image: `${ASSET}handrail/${code}.png` };
  }),
  cop: Array.from({length: 4}, (_, i) => {
    const code = `P${String(i + 1).padStart(2, "0")}`;
    return { code, name: `COP mẫu ${i + 1}`, image: `${ASSET}cop/${code}.png` };
  }),
  lighting: Array.from({length: 4}, (_, i) => {
    const code = `L${String(i + 1).padStart(2, "0")}`;
    return { code, name: `Ánh sáng mẫu ${i + 1}`, image: `${ASSET}lighting/${code}.png` };
  })
};

const state = {
  cabin: "GV-001",
  wallMode: "same",
  wallActiveSide: "back",
  walls: { left: "I01", back: "I01", right: "I01" },
  floor: "S01",
  ceiling: "T01",
  door: "C01",
  handrail: "H01",
  cop: "P01",
  lighting: "L01"
};

let scene, camera, renderer, controls;
let cabinGroup;
let meshes = {};
let textureCache = new Map();
let firebaseDb = null;
let firebaseUser = null;
let resizeObserver = null;

const $ = (id) => document.getElementById(id);

function setLoading(text, visible) {
  $("loadingText").textContent = text;
  $("loading").classList.toggle("hidden", !visible);
}

function setStatus(text) {
  $("statusBadge").textContent = text;
}

function makeMaterial(options = {}) {
  return new THREE.MeshStandardMaterial({
    color: options.color ?? 0xffffff,
    roughness: options.roughness ?? 0.42,
    metalness: options.metalness ?? 0.25,
    map: options.map ?? null,
    side: THREE.FrontSide
  });
}

function getTexture(url, repeatX = 1, repeatY = 1) {
  if (textureCache.has(url)) return textureCache.get(url);

  const loader = new THREE.TextureLoader();
  const texture = loader.load(
    url,
    (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeatX, repeatY);
      t.anisotropy = Math.min(renderer?.capabilities?.getMaxAnisotropy?.() || 4, 8);
      renderer?.render(scene, camera);
    },
    undefined,
    () => {}
  );
  t.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  textureCache.set(url, texture);
  return texture;
}

function materialFromAsset(item, fallbackColor = 0xd8dddd, roughness = .42, metalness = .25) {
  if (!item?.image) return makeMaterial({color: fallbackColor, roughness, metalness});
  const tex = getTexture(item.image);
  return makeMaterial({map: tex, roughness, metalness});
}

function createMesh(geometry, material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function clearGroup(group) {
  while (group.children.length) {
    const child = group.children.pop();
    child.traverse?.((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => o.dispose?.());
      }
    });
  }
}

function addBox(name, size, position, material) {
  const mesh = createMesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.name = name;
  cabinGroup.add(mesh);
  meshes[name] = mesh;
  return mesh;
}

function createPatternTexture(code) {
  const key = `pattern:${code}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#9ea6a6";
  ctx.fillRect(0, 0, 512, 512);

  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, "#d7dddd");
  grad.addColorStop(.5, "#8e9898");
  grad.addColorStop(1, "#cbd2d2");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = "rgba(255,255,255,.28)";
  ctx.lineWidth = 3;
  for (let i = -512; i < 1024; i += 42) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 512, 512);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(40,50,50,.18)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 512, 512);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  textureCache.set(key, tex);
  return tex;
}

function wallMaterial(code, patterned = false) {
  if (patterned) {
    return makeMaterial({
      map: createPatternTexture(code),
      roughness: .34,
      metalness: .62
    });
  }
  const item = catalog.wall.find(x => x.code === code);
  return materialFromAsset(item, 0xbfc6c6, .32, .65);
}

function rebuildCabin() {
  if (!cabinGroup) return;

  clearGroup(cabinGroup);
  meshes = {};

  const cabin = catalog.cabin.find(x => x.code === state.cabin) || catalog.cabin[0];
  const W = cabin.width;
  const D = cabin.depth;
  const H = cabin.height;
  const wallT = 0.045;
  const floorT = 0.08;

  const wallPattern = state.wallMode === "pattern";

  // Floor
  const floorItem = catalog.floor.find(x => x.code === state.floor);
  addBox("floor", [W, floorT, D], [0, floorT / 2, 0],
    materialFromAsset(floorItem, 0x7d8585, .58, .12));

  // Main three walls: separate meshes so independent selection is real.
  addBox("leftWall", [wallT, H, D], [-W / 2, H / 2, 0],
    wallMaterial(state.walls.left, wallPattern));

  addBox("backWall", [W, H, wallT], [0, H / 2, -D / 2],
    wallMaterial(state.walls.back, wallPattern));

  addBox("rightWall", [wallT, H, D], [W / 2, H / 2, 0],
    wallMaterial(state.walls.right, wallPattern));

  // Ceiling
  const ceilingItem = catalog.ceiling.find(x => x.code === state.ceiling);
  addBox("ceiling", [W, 0.055, D], [0, H, 0],
    materialFromAsset(ceilingItem, 0xe6e9e9, .25, .35));

  // Dark top trim
  const trimMat = makeMaterial({color: 0x303737, roughness: .25, metalness: .72});
  addBox("topTrimBack", [W, .045, .035], [0, H - .08, -D/2 + .02], trimMat);

  // Door opening and two panels
  const doorW = Math.min(.82, W * .72);
  const doorH = Math.min(2.12, H - .08);
  const doorGap = .008;
  const panelW = (doorW - doorGap) / 2;
  const doorY = doorH / 2 + floorT;

  const doorItem = catalog.door.find(x => x.code === state.door);
  const doorMat = materialFromAsset(doorItem, 0x9ca4a4, .3, .58);

  addBox("doorLeft", [panelW, doorH, .035],
    [-panelW/2 - doorGap/2, doorY, D/2 + .018], doorMat.clone());
  addBox("doorRight", [panelW, doorH, .035],
    [panelW/2 + doorGap/2, doorY, D/2 + .018], doorMat.clone());

  // Side vertical trims
  addBox("doorTrimL", [.035, doorH, .05],
    [-doorW/2 - .02, doorY, D/2 + .025], trimMat);
  addBox("doorTrimR", [.035, doorH, .05],
    [doorW/2 + .02, doorY, D/2 + .025], trimMat);

  // Handrail on rear wall
  const railMat = new THREE.MeshStandardMaterial({
    color: state.handrail === "H02" ? 0xb9bec0 : state.handrail === "H03" ? 0x8d9293 : 0xd0a86a,
    roughness: .22,
    metalness: .85
  });
  const railRadius = state.handrail === "H04" ? .025 : .018;
  const rail = createMesh(
    new THREE.CylinderGeometry(railRadius, railRadius, W * .62, 24),
    railMat
  );
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, H * .47, -D/2 + .075);
  cabinGroup.add(rail);

  // COP panel
  const copItem = catalog.cop.find(x => x.code === state.cop);
  const copTex = copItem?.image ? getTexture(copItem.image) : null;
  const copMat = makeMaterial({map: copTex, color: 0x737b7b, roughness: .3, metalness: .55});
  const cop = addBox("cop", [.055, H * .42, .32],
    [W/2 - .07, H * .48, .15], copMat);
  cop.rotation.y = 0;

  // COP buttons, simple visual controls
  const buttonMat = makeMaterial({color: 0xd7dddd, roughness: .2, metalness: .55});
  for (let i = 0; i < 6; i++) {
    const b = createMesh(new THREE.CylinderGeometry(.018, .018, .012, 16), buttonMat);
    b.rotation.z = Math.PI / 2;
    b.position.set(W/2 - .104, H * .31 + i * .07, .15);
    cabinGroup.add(b);
  }

  applyLighting();
  updateCameraTarget();
  renderer.render(scene, camera);
}

function applyLighting() {
  if (!scene) return;

  const key = state.lighting;
  const ambient = key === "L02" ? .72 : key === "L03" ? .48 : key === "L04" ? .88 : .62;
  const intensity = key === "L02" ? 2.0 : key === "L03" ? 1.15 : key === "L04" ? 2.4 : 1.65;

  scene.userData.ambient.intensity = ambient;
  scene.userData.key.intensity = intensity;

  if (meshes.ceiling) {
    meshes.ceiling.material.emissive = new THREE.Color(
      key === "L03" ? 0x222222 : key === "L02" ? 0xdbeaff : 0xffffff
    );
    meshes.ceiling.material.emissiveIntensity = key === "L03" ? .02 : .12;
  }
}

function updateCameraTarget() {
  const cabin = catalog.cabin.find(x => x.code === state.cabin) || catalog.cabin[0];
  controls.target.set(0, cabin.height * .48, 0);
  camera.position.set(cabin.width * 1.65, cabin.height * .72, cabin.depth * 1.75);
  controls.update();
}

function initThree() {
  const container = $("viewer");

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf1f4f4);

  camera = new THREE.PerspectiveCamera(
    38,
    container.clientWidth / container.clientHeight,
    0.01,
    100
  );

  renderer = new THREE.WebGLRenderer({antialias: true, alpha: false, powerPreference: "high-performance"});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .08;
  controls.minDistance = 1.4;
  controls.maxDistance = 6.5;
  controls.maxPolarAngle = Math.PI * .92;
  controls.minPolarAngle = Math.PI * .10;

  const ambient = new THREE.AmbientLight(0xffffff, .62);
  const key = new THREE.DirectionalLight(0xffffff, 1.65);
  key.position.set(2.5, 4.5, 3.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);

  const fill = new THREE.DirectionalLight(0xddeeee, .55);
  fill.position.set(-3, 2, -2);

  scene.add(ambient, key, fill);
  scene.userData.ambient = ambient;
  scene.userData.key = key;

  cabinGroup = new THREE.Group();
  cabinGroup.position.y = 0;
  scene.add(cabinGroup);

  // Ground only for subtle contact shadow.
  const ground = createMesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.ShadowMaterial({opacity: .08})
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  updateCameraTarget();
  rebuildCabin();

  const renderLoop = () => {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(renderLoop);
  };
  requestAnimationFrame(renderLoop);

  resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  resizeObserver.observe(container);
}

function optionCard(item, selected, onClick) {
  const button = document.createElement("button");
  button.className = `option-card${selected ? " active" : ""}`;

  const thumb = document.createElement("div");
  thumb.className = "option-thumb";

  if (item.image) {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = item.image;
    img.alt = item.code;
    img.onerror = () => {
      thumb.textContent = item.code;
      thumb.style.fontWeight = "800";
    };
    thumb.appendChild(img);
  } else {
    thumb.textContent = item.code;
    thumb.style.fontWeight = "800";
  }

  const label = document.createElement("div");
  label.className = "option-label";
  label.innerHTML = `<div class="option-code">${item.code}</div><div class="option-name">${item.name}</div>`;

  button.append(thumb, label);
  button.addEventListener("click", onClick);
  return button;
}

function renderCabins() {
  const root = $("cabinOptions");
  root.innerHTML = "";
  catalog.cabin.forEach(item => {
    root.appendChild(optionCard(item, state.cabin === item.code, () => {
      state.cabin = item.code;
      rebuildCabin();
      renderAll();
    }));
  });
}

function renderWallControls() {
  const root = $("wallControls");
  root.innerHTML = "";

  const independent = state.wallMode === "independent";
  root.classList.toggle("visible", independent);

  if (!independent) return;

  [
    ["left", "Vách trái"],
    ["back", "Vách sau"],
    ["right", "Vách phải"]
  ].forEach(([side, label]) => {
    const b = document.createElement("button");
    b.className = `wall-control-btn${state.wallActiveSide === side ? " active" : ""}`;
    b.textContent = `${label} · ${state.walls[side]}`;
    b.addEventListener("click", () => {
      state.wallActiveSide = side;
      renderWallControls();
      renderWallOptions();
    });
    root.appendChild(b);
  });
}

function renderWallOptions() {
  const root = $("wallMaterialOptions");
  root.innerHTML = "";

  catalog.wall.forEach(item => {
    let selected;
    if (state.wallMode === "same") {
      selected = state.walls.left === item.code && state.walls.back === item.code && state.walls.right === item.code;
    } else {
      selected = state.walls[state.wallActiveSide] === item.code;
    }

    root.appendChild(optionCard(item, selected, () => {
      if (state.wallMode === "same") {
        state.walls.left = item.code;
        state.walls.back = item.code;
        state.walls.right = item.code;
      } else {
        state.walls[state.wallActiveSide] = item.code;
      }
      rebuildCabin();
      renderAll();
    }));
  });
}

function renderSimpleCategory(category, elementId, stateKey) {
  const root = $(elementId);
  root.innerHTML = "";
  catalog[category].forEach(item => {
    root.appendChild(optionCard(item, state[stateKey] === item.code, () => {
      state[stateKey] = item.code;
      rebuildCabin();
      renderAll();
    }));
  });
}

function updateSummary() {
  $("leftSummary").textContent = state.walls.left;
  $("backSummary").textContent = state.walls.back;
  $("rightSummary").textContent = state.walls.right;

  $("configSummary").textContent = JSON.stringify({
    cabin: state.cabin,
    walls: state.walls,
    wallMode: state.wallMode,
    floor: state.floor,
    ceiling: state.ceiling,
    door: state.door,
    handrail: state.handrail,
    cop: state.cop,
    lighting: state.lighting
  }, null, 2);
}

function renderAll() {
  document.querySelectorAll("[data-wall-mode]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.wallMode === state.wallMode);
  });

  renderCabins();
  renderWallControls();
  renderWallOptions();
  renderSimpleCategory("floor", "floorOptions", "floor");
  renderSimpleCategory("ceiling", "ceilingOptions", "ceiling");
  renderSimpleCategory("door", "doorOptions", "door");
  renderSimpleCategory("handrail", "handrailOptions", "handrail");
  renderSimpleCategory("cop", "copOptions", "cop");
  renderSimpleCategory("lighting", "lightingOptions", "lighting");
  updateSummary();
}

function bindUI() {
  document.querySelectorAll("[data-wall-mode]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.wallMode = btn.dataset.wallMode;
      if (state.wallMode === "pattern") {
        state.wallActiveSide = "back";
      }
      rebuildCabin();
      renderAll();
    });
  });

  $("resetBtn").addEventListener("click", () => {
    Object.assign(state, {
      cabin: "GV-001",
      wallMode: "same",
      wallActiveSide: "back",
      walls: {left: "I01", back: "I01", right: "I01"},
      floor: "S01",
      ceiling: "T01",
      door: "C01",
      handrail: "H01",
      cop: "P01",
      lighting: "L01"
    });
    rebuildCabin();
    renderAll();
    $("saveStatus").textContent = "Đã khôi phục cấu hình mặc định.";
  });

  $("saveBtn").addEventListener("click", saveConfiguration);
}

async function initFirebaseNonBlocking() {
  try {
    const app = initializeApp(firebaseConfig);
    firebaseDb = getFirestore(app);
    const auth = getAuth(app);

    onAuthStateChanged(auth, user => {
      firebaseUser = user || null;
      if (user) {
        setStatus("3D sẵn sàng · Đã đăng nhập");
      } else {
        setStatus("3D sẵn sàng");
      }
    });

    // IMPORTANT: Firestore is deliberately background-only.
    // It can never block 3D initialization.
    Promise.race([
      loadRemoteMaterials(),
      new Promise(resolve => setTimeout(resolve, 3500))
    ]).catch(() => {});
  } catch (err) {
    console.warn("Firebase background init failed:", err);
    setStatus("3D sẵn sàng · Offline");
  }
}

async function loadRemoteMaterials() {
  if (!firebaseDb) return;
  try {
    const snap = await getDocs(query(collection(firebaseDb, "materials"), orderBy("code")));
    // Keep local demo catalog as the stable baseline.
    // Remote metadata can be integrated here later without blocking the renderer.
    console.info(`Firebase materials loaded: ${snap.size}`);
  } catch (err) {
    console.warn("Firebase materials unavailable:", err);
  }
}

async function saveConfiguration() {
  const payload = {
    ...JSON.parse(JSON.stringify(state)),
    savedAt: new Date().toISOString()
  };

  // For now save locally so the demo always works without authentication.
  localStorage.setItem("elevatorConfigurator:lastConfig", JSON.stringify(payload));

  if (firebaseUser && firebaseDb) {
    $("saveStatus").textContent = "Đã lưu cấu hình trên thiết bị. Đồng bộ Firebase sẽ được mở ở bước quản trị.";
  } else {
    $("saveStatus").textContent = "Đã lưu cấu hình trên thiết bị (local).";
  }
}

async function start() {
  bindUI();

  // Critical path: 3D first. No Firebase await here.
  try {
    initThree();
    renderAll();
    setLoading("", false);
    setStatus("3D sẵn sàng");
  } catch (err) {
    console.error("3D initialization failed:", err);
    setLoading("Không thể khởi tạo 3D. Hãy kiểm tra WebGL/Safari.", true);
    setStatus("Lỗi 3D");
    return;
  }

  // Firebase starts only after the 3D scene is visible.
  setTimeout(() => initFirebaseNonBlocking(), 0);
}

start();
