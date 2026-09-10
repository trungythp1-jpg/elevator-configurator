/* ELEVATOR CONFIGURATOR V7
   Fixed cabin preview: 1400W x 1200D x 2400H mm
   No rotate / no zoom / no pan.
   3D startup is independent from Firebase and optional UI events.
*/

import * as THREE from "three";

const LOCAL_MANIFEST_FALLBACK = {
  cabin: [
    { code: "GV-001", name: "Champagne Classic" },
    { code: "GV-002", name: "Titanium Modern" },
    { code: "GV-003", name: "Dark Luxury" }
  ],
  walls: [
    { code: "I01", name: "Inox Champagne Hairline", color: "champagne", finish: "hairline" },
    { code: "I02", name: "Inox Titanium Mirror", color: "gold", finish: "mirror" },
    { code: "I03", name: "Inox Silver Hairline", color: "silver", finish: "hairline" },
    { code: "I04", name: "Inox Black Mirror", color: "black", finish: "mirror" },
    { code: "I05", name: "Inox Rose Gold", color: "rose", finish: "mirror" },
    { code: "I06", name: "Inox Bronze", color: "bronze", finish: "hairline" },
    { code: "I07", name: "Inox Blue Titanium", color: "blue", finish: "mirror" },
    { code: "I08", name: "Inox Pearl", color: "pearl", finish: "hairline" }
  ],
  floor: Array.from({length:6}, (_,i)=>({code:`S0${i+1}`,name:`Floor ${String(i+1).padStart(2,"0")}`})),
  ceiling: Array.from({length:6}, (_,i)=>({code:`T0${i+1}`,name:`Ceiling ${String(i+1).padStart(2,"0")}`})),
  doors: Array.from({length:6}, (_,i)=>({code:`C0${i+1}`,name:`Door ${String(i+1).padStart(2,"0")}`})),
  handrail: Array.from({length:4}, (_,i)=>({code:`H0${i+1}`,name:`Handrail ${String(i+1).padStart(2,"0")}`})),
  cop: Array.from({length:4}, (_,i)=>({code:`P0${i+1}`,name:`COP ${String(i+1).padStart(2,"0")}`})),
  lighting: Array.from({length:4}, (_,i)=>({code:`L0${i+1}`,name:`Lighting ${String(i+1).padStart(2,"0")}`}))
};

const state = {
  cabin: 0,
  wallMode: "same",
  wallTarget: "left",
  walls: { left: 0, back: 0, right: 0 },
  floor: 0,
  ceiling: 0,
  door: 0,
  handrail: 0,
  cop: 0,
  lighting: 0
};

let manifest = LOCAL_MANIFEST_FALLBACK;
let library = cloneLibrary(LOCAL_MANIFEST_FALLBACK);
let scene = null;
let camera = null;
let renderer = null;
let viewer = null;
let cabinGroup = null;
let fillLight = null;
let initialized = false;
let textureLoader = null;
const textureCache = new Map();

const palette = {
  I01: 0xc4a57b, I02: 0xb68d4f, I03: 0xaeb5ba, I04: 0x272b30,
  I05: 0xb87972, I06: 0x75553a, I07: 0x405a72, I08: 0xc9c6bd,
  S01: 0x9b9b94, S02: 0x4a4b4d, S03: 0x222426, S04: 0x796957,
  S05: 0x72777b, S06: 0xc8c0ae,
  T01: 0xa7adb2, T02: 0x22262a, T03: 0xa68b61, T04: 0xd9d9d7,
  T05: 0x747a7f, T06: 0x555a5f,
  C01: 0x9aa1a6, C02: 0x282c31, C03: 0xb4976a, C04: 0x654a37,
  C05: 0x171b1f, C06: 0x4b555d,
  H01: 0xb4b7b9, H02: 0x282b2d, H03: 0xb18e5b, H04: 0x654934,
  P01: 0x8d9295, P02: 0x1e2226, P03: 0xb38e59, P04: 0x4d3628
};

function $(selector) { return document.querySelector(selector); }
function cloneLibrary(value) { return JSON.parse(JSON.stringify(value)); }
function setLoading(show, text="Đang khởi tạo 3D…", detail="Đang chuẩn bị cabin") {
  const el = $("#loading");
  if (!el) return;
  el.hidden = !show;
  $("#loadingText").textContent = text;
  $("#loadingDetail").textContent = detail;
}
function showError(error) {
  const message = error?.message || String(error || "Unknown error");
  $("#errorText").textContent = message;
  $("#errorBox").hidden = false;
  setLoading(false);
  console.error("[Elevator Configurator V6]", error);
}
function hideError() { $("#errorBox").hidden = true; }
function asset(cat, index) {
  const list = library[cat] || [];
  return list[index % Math.max(list.length, 1)] || {code:""};
}
function assetPath(cat, code) { return `./assets/${cat}/${code}.png`; }

async function loadManifest() {
  try {
    const response = await fetch(`./asset-manifest.json?v=3`, { cache: "no-store" });
    if (!response.ok) throw new Error(`asset-manifest.json HTTP ${response.status}`);
    const data = await response.json();
    manifest = {
      ...LOCAL_MANIFEST_FALLBACK,
      ...data,
      cabin: Array.isArray(data.cabin) && data.cabin.length ? data.cabin : LOCAL_MANIFEST_FALLBACK.cabin
    };
    library = {
      ...cloneLibrary(LOCAL_MANIFEST_FALLBACK),
      ...data
    };
  } catch (error) {
    console.warn("Using built-in asset manifest fallback:", error);
    manifest = LOCAL_MANIFEST_FALLBACK;
    library = cloneLibrary(LOCAL_MANIFEST_FALLBACK);
  }
}

function makeTexture(path) {
  if (textureCache.has(path)) return textureCache.get(path);
  const texture = textureLoader.load(
    path,
    undefined,
    undefined,
    () => console.warn("Texture unavailable:", path)
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(renderer?.capabilities?.getMaxAnisotropy?.() || 1, 4);
  textureCache.set(path, texture);
  return texture;
}

function materialFor(cat, item, roughness=0.5, metalness=0.5) {
  const code = item?.code || "";
  const path = assetPath(cat, code);
  const material = new THREE.MeshStandardMaterial({
    color: palette[code] || 0x888888,
    map: makeTexture(path),
    roughness,
    metalness
  });
  return material;
}

function initThree() {
  viewer = $("#viewer");
  if (!viewer) throw new Error("Không tìm thấy vùng viewer.");

  const testCanvas = document.createElement("canvas");
  const gl = testCanvas.getContext("webgl2") || testCanvas.getContext("webgl");
  if (!gl) throw new Error("Thiết bị hoặc trình duyệt không hỗ trợ WebGL.");

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f3f2);

  camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);
  camera.position.set(0, 1.25, -3.35);
  camera.lookAt(0, 1.18, 0.48);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0xf0f3f2, 1);
  renderer.domElement.setAttribute("aria-label", "3D elevator cabin preview");
  viewer.prepend(renderer.domElement);

  textureLoader = new THREE.TextureLoader();

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c0c4, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.set(3.5, 4.5, 3);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xddeeff, 1.4);
  rim.position.set(-3, 3, -2);
  scene.add(rim);
  fillLight = new THREE.PointLight(0xffffff, 18, 7);
  fillLight.position.set(0, 0.0, 1.95);
  scene.add(fillLight);

  cabinGroup = new THREE.Group();
  scene.add(cabinGroup);

  renderer.domElement.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    showError(new Error("WebGL context đã bị mất. Hãy tải lại trang để khởi tạo lại 3D."));
  });

  window.addEventListener("resize", resize, { passive: true });
  resize();
  rebuildCabin();
  renderAllChoices();
  initialized = true;
  setLoading(false);
}

function addBox(name, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  cabinGroup.add(mesh);
  return mesh;
}

function wallMaterial(zone) {
  const index = state.walls[zone];
  return materialFor("walls", asset("walls", index), 0.38, 0.72);
}
function floorMaterial() { return materialFor("floor", asset("floor", state.floor), 0.72, 0.18); }
function ceilingMaterial() { return materialFor("ceiling", asset("ceiling", state.ceiling), 0.4, 0.65); }
function doorMaterial() { return materialFor("doors", asset("doors", state.door), 0.28, 0.75); }

function disposeObject(root) {
  root.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach(m => m.dispose());
    }
  });
}

function rebuildCabin() {
  if (!cabinGroup) return;
  while (cabinGroup.children.length) {
    const child = cabinGroup.children.pop();
    disposeObject(child);
  }

  // Real cabin reference dimensions: W 1400 mm × D 1200 mm × H 2400 mm.
  // Three.js units are metres.
  const W = 1.40, D = 1.20, H = 2.40, t = 0.045;
  addBox("floor", [W, D, t], [0, 0, t / 2], floorMaterial());
  addBox("back", [W, t, H], [0, D / 2 - t / 2, H / 2], wallMaterial("back"));
  addBox("left", [t, D, H], [-W / 2 + t / 2, 0, H / 2], wallMaterial("left"));
  addBox("right", [t, D, H], [W / 2 - t / 2, 0, H / 2], wallMaterial("right"));
  addBox("ceiling", [W, D, t], [0, 0, H - t / 2], ceilingMaterial());

  addBox("topTrim", [W, 0.04, 0.10], [0, D / 2 - 0.05, H - 0.10], ceilingMaterial());
  addHandrail();
  addCop();
  applyLighting();
}

function addHandrail() {
  const item = asset("handrail", state.handrail);
  const material = materialFor("handrail", item, 0.23, 0.82);
  const geo = new THREE.CylinderGeometry(0.028, 0.028, 1.25, 24);
  for (const [x, y, z] of [[-0.48, 0.16, 1.18], [0.48, 0.16, 1.18]]) {
    const rail = new THREE.Mesh(geo, material);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(x, y, z);
    cabinGroup.add(rail);
  }
}

function addCop() {
  const item = asset("cop", state.cop);
  const material = materialFor("cop", item, 0.3, 0.7);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.055, 0.78), material);
  panel.position.set(0.56, -0.36, 1.30);
  panel.rotation.x = 0.04;
  cabinGroup.add(panel);

  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, 0.012, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x152329, emissive: 0x173b44, emissiveIntensity: 0.65, roughness: 0.2, metalness: 0.3 })
  );
  screen.position.set(0.56, -0.33, 1.47);
  screen.rotation.x = 0.04;
  cabinGroup.add(screen);
}

function applyLighting() {
  const item = asset("lighting", state.lighting);
  const colors = { L01: 0xffd07a, L02: 0xfff1d6, L03: 0xbfe2ff, L04: 0xffffff };
  if (fillLight) {
    fillLight.color.setHex(colors[item.code] || 0xffffff);
    fillLight.intensity = 18;
  }
}

function resetCamera() {
  if (!camera) return;
  camera.position.set(0, 1.25, -3.35);
  camera.lookAt(0, 1.18, 0.48);
}

function resize() {
  if (!renderer || !camera || !viewer) return;
  const rect = viewer.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function renderCabins() {
  const el = $("#cabinChoices");
  el.innerHTML = "";
  (manifest.cabin || []).forEach((item, index) => {
    const card = document.createElement("div");
    card.className = `choice ${index === state.cabin ? "active" : ""}`;
    card.innerHTML = `<div class="cabin-thumb cabin-${index + 1}"><span>${item.code}</span></div><label>${item.code} · ${item.name}</label>`;
    card.onclick = () => {
      state.cabin = index;
      $("#cabinTitle").textContent = `${item.code} · ${item.name}`;
      rebuildCabin();
      resetCamera();
      renderCabins();
      updateConfig();
    };
    el.appendChild(card);
  });
}

function renderWalls() {
  const zones = $("#wallZones");
  zones.innerHTML = "";
  const labels = { left: "Vách trái", back: "Vách sau", right: "Vách phải" };
  Object.entries(labels).forEach(([key, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${label} · ${asset("walls", state.walls[key]).code}`;
    button.className = state.wallTarget === key ? "active" : "";
    button.onclick = () => {
      state.wallTarget = key;
      renderWalls();
    };
    zones.appendChild(button);
  });

  const swatches = $("#wallMaterials");
  swatches.innerHTML = "";
  (library.walls || []).forEach((item, index) => {
    const swatch = document.createElement("div");
    const selected = state.wallMode === "same" ? state.walls.left === index : state.walls[state.wallTarget] === index;
    swatch.className = `swatch ${selected ? "active" : ""}`;
    swatch.style.backgroundImage = `url("${assetPath("walls", item.code)}")`;
    swatch.innerHTML = `<small>${item.code}</small>`;
    swatch.onclick = () => selectWall(index);
    swatches.appendChild(swatch);
  });
}

function selectWall(index) {
  if (state.wallMode === "same" || state.wallMode === "pattern") {
    state.walls = { left: index, back: index, right: index };
  } else {
    state.walls[state.wallTarget] = index;
  }
  rebuildCabin();
  renderWalls();
  updateConfig();
}

function renderCards(cat, id, stateKey = cat === "doors" ? "door" : cat) {
  const el = $("#" + id);
  el.innerHTML = "";
  (library[cat] || []).forEach((item, index) => {
    const card = document.createElement("div");
    card.className = `card ${state[stateKey] === index ? "active" : ""}`;
    card.innerHTML = `<img loading="lazy" src="${assetPath(cat, item.code)}" alt="${item.name || item.code}"><label>${item.code} · ${item.name || item.code}</label>`;
    card.onclick = () => {
      state[stateKey] = index;
      rebuildCabin();
      renderCards(cat, id, stateKey);
      updateConfig();
    };
    el.appendChild(card);
  });
}

function renderAllChoices() {
  renderCabins();
  renderWalls();
  renderCards("floor", "floorChoices");
  renderCards("ceiling", "ceilingChoices");
  renderCards("doors", "doorChoices", "door");
  renderCards("handrail", "handrailChoices");
  renderCards("cop", "copChoices");
  renderCards("lighting", "lightingChoices");
  updateConfig();
}

function updateConfig() {
  const cabin = manifest.cabin?.[state.cabin] || LOCAL_MANIFEST_FALLBACK.cabin[0];
  $("#modeTitle").textContent = `3 Walls · ${state.wallMode === "same" ? "Same Material" : state.wallMode === "independent" ? "Independent" : "Etched Pattern"}`;
  $("#configPreview").textContent = JSON.stringify({
    cabin: cabin.code,
    dimensions: "1400 × 1200 × 2400 mm",
    walls: {
      left: asset("walls", state.walls.left).code,
      back: asset("walls", state.walls.back).code,
      right: asset("walls", state.walls.right).code
    },
    floor: asset("floor", state.floor).code,
    ceiling: asset("ceiling", state.ceiling).code,
    door: asset("doors", state.door).code,
    handrail: asset("handrail", state.handrail).code,
    cop: asset("cop", state.cop).code,
    lighting: asset("lighting", state.lighting).code
  }, null, 2);
}

function setupEvents() {
  // V7: event wiring is optional and must never block 3D startup.

  document.querySelectorAll("[data-wall-mode]").forEach(button => {
    button.addEventListener("click", () => {
      state.wallMode = button.dataset.wallMode;
      document.querySelectorAll("[data-wall-mode]").forEach(x => x.classList.toggle("active", x === button));
      renderWalls();
      updateConfig();
      rebuildCabin();
    });
  });

  $("#resetBtn").addEventListener("click", () => {
    Object.assign(state, {
      cabin: 0,
      wallMode: "same",
      wallTarget: "left",
      walls: { left: 0, back: 0, right: 0 },
      floor: 0,
      ceiling: 0,
      door: 0,
      handrail: 0,
      cop: 0,
      lighting: 0
    });
    document.querySelectorAll("[data-wall-mode]").forEach((x, i) => x.classList.toggle("active", i === 0));
    $("#cabinTitle").textContent = `${manifest.cabin[0].code} · ${manifest.cabin[0].name}`;
    rebuildCabin();
    renderAllChoices();
    resetCamera();
  });

  $("#retryBtn").addEventListener("click", () => location.reload());
}

async function setupFirebaseInBackground() {
  const status = $("#cloudStatus");
  try {
    status.textContent = "Firebase: connecting…";
    const [{ initializeApp }, firestore, authModule, configModule] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js"),
      import("https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js"),
      import("./firebase/firebase-config.js?v=3")
    ]);

    const firebaseApp = initializeApp(configModule.firebaseConfig);
    const db = firestore.getFirestore(firebaseApp);
    const auth = authModule.getAuth(firebaseApp);

    authModule.onAuthStateChanged(auth, user => {
      status.textContent = user ? "Firebase: signed in" : "Firebase: guest";
    });

    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase timeout")), 4500));
    const read = firestore.getDocs(firestore.collection(db, "materials"));
    const snapshot = await Promise.race([read, timeout]);
    const cloud = {};
    snapshot.forEach(doc => { cloud[doc.id] = doc.data(); });

    if (Object.keys(cloud).length) {
      const grouped = cloneLibrary(library);
      for (const item of Object.values(cloud)) {
        const category = item.category === "wall" ? "walls" : item.category;
        if (!grouped[category]) grouped[category] = [];
        const normalized = {
          ...item,
          code: item.code || "",
          name: item.name || item.code || "Unnamed",
          file: item.file || `${category}/${item.code}.png`
        };
        const existing = grouped[category].findIndex(x => x.code === normalized.code);
        if (existing >= 0) grouped[category][existing] = normalized;
        else grouped[category].push(normalized);
      }
      library = grouped;
      renderAllChoices();
      rebuildCabin();
    }

    if (status.textContent !== "Firebase: signed in") status.textContent = "Firebase: connected";
  } catch (error) {
    console.warn("Firebase background connection unavailable:", error);
    status.textContent = "Firebase: local demo";
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (!renderer || !scene || !camera) return;
  renderer.render(scene, camera);
}

async function boot() {
  setupEvents();
  try {
    setLoading(true, "Đang khởi tạo 3D…", "Không chờ Firebase");
    await loadManifest();
    initThree();
    animate();
    // Cloud is deliberately non-blocking: 3D must remain usable even if Firebase fails.
    void setupFirebaseInBackground();
  } catch (error) {
    showError(error);
  }
}

boot();
