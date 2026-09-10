import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const DIM = { w: 1.4, d: 1.2, h: 2.4 };
const ASSET = "./assets/";

const catalog = {
  cabins: [
    { code:"GV-001", name:"Champagne Classic" },
    { code:"GV-002", name:"Black Luxury" },
    { code:"GV-003", name:"Silver Minimal" }
  ],
  walls: [
    ["I01","Champagne Gold"],["I02","Mirror Silver"],["I03","Hairline Silver"],["I04","Dark Titanium"],
    ["I05","Rose Gold"],["I06","Black Mirror"],["I07","Warm Bronze"],["I08","Pearl White"]
  ],
  floor: [["S01","Black Stone"],["S02","Grey Stone"],["S03","Light Marble"],["S04","Dark Marble"],["S05","Warm Granite"],["S06","Wood Tone"]],
  ceiling: [["T01","Square Light"],["T02","Linear Light"],["T03","Gold Frame"],["T04","Black Frame"],["T05","White Minimal"],["T06","Star Light"]],
  doors: [["C01","Champagne"],["C02","Silver"],["C03","Black"],["C04","Rose Gold"],["C05","Bronze"],["C06","Mirror"]],
  handrail: [["H01","Round Silver"],["H02","Round Gold"],["H03","Black"],["H04","Wood"]],
  cop: [["P01","Slim Silver"],["P02","Black Glass"],["P03","Gold Frame"],["P04","Full Height"]],
  lighting: [["L01","Neutral"],["L02","Warm"],["L03","Cool"],["L04","Accent"]]
};

const state = {
  cabin:"GV-001",
  walls:{ left:"I01", back:"I01", right:"I01" },
  floor:"S01", ceiling:"T01", door:"C01",
  handrail:"H01", cop:"P01", lighting:"L01"
};

const $ = id => document.getElementById(id);
const viewer = $("viewer");
const loading = $("loading");

let scene, camera, renderer, cabinRoot;
let wallMeshes = {}, floorMesh, ceilingMesh, doorFrame, railMesh, copMesh, lightRig;
const textureCache = new Map();

function asset(category, code) {
  return `${ASSET}${category}/${code}.png`;
}

function toast(text) {
  const el = $("toast");
  if (!el) return;
  el.textContent = text;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1600);
}

function makeTexture(path) {
  if (textureCache.has(path)) return textureCache.get(path);
  const texture = new THREE.TextureLoader().load(
    path,
    undefined,
    undefined,
    () => console.warn("Texture unavailable:", path)
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(path, texture);
  return texture;
}

function texturedMat(category, code, roughness=.42, metalness=.65) {
  return new THREE.MeshStandardMaterial({
    map: makeTexture(asset(category, code)),
    color: 0xffffff,
    roughness,
    metalness
  });
}

function solidMat(color, roughness=.4, metalness=.2) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function box(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createCabin() {
  cabinRoot = new THREE.Group();
  scene.add(cabinRoot);

  floorMesh = box(DIM.w, .045, DIM.d, texturedMat("floor", state.floor, .62, .08));
  floorMesh.position.y = .0225;
  cabinRoot.add(floorMesh);

  const wt = .035;

  wallMeshes.left = box(wt, DIM.h, DIM.d, texturedMat("walls", state.walls.left));
  wallMeshes.left.position.set(-DIM.w/2 + wt/2, DIM.h/2, 0);
  cabinRoot.add(wallMeshes.left);

  wallMeshes.back = box(DIM.w, DIM.h, wt, texturedMat("walls", state.walls.back));
  wallMeshes.back.position.set(0, DIM.h/2, DIM.d/2 - wt/2);
  cabinRoot.add(wallMeshes.back);

  wallMeshes.right = box(wt, DIM.h, DIM.d, texturedMat("walls", state.walls.right));
  wallMeshes.right.position.set(DIM.w/2 - wt/2, DIM.h/2, 0);
  cabinRoot.add(wallMeshes.right);

  ceilingMesh = box(DIM.w-.10, .06, DIM.d-.10, texturedMat("ceiling", state.ceiling, .55, .15));
  ceilingMesh.position.y = DIM.h-.055;
  cabinRoot.add(ceilingMesh);

  createDoorFrame();
  railMesh = createHandrail();
  cabinRoot.add(railMesh);

  copMesh = createCOP();
  cabinRoot.add(copMesh);

  lightRig = new THREE.Group();
  cabinRoot.add(lightRig);
  updateLighting();
}

function createDoorFrame() {
  if (doorFrame) cabinRoot.remove(doorFrame);

  const colors = {
    C01:0xc9b18b, C02:0xbec3c8, C03:0x202124,
    C04:0xc78e83, C05:0x9c7751, C06:0xbec3c8
  };

  const material = solidMat(colors[state.door] || 0xbec3c8, .27, .78);
  const group = new THREE.Group();
  const t = .038;

  [-DIM.w/2+t/2, DIM.w/2-t/2].forEach(x => {
    const part = box(t, DIM.h, .05, material);
    part.position.set(x, DIM.h/2, -DIM.d/2-.07);
    group.add(part);
  });

  const top = box(DIM.w, t, .05, material);
  top.position.set(0, DIM.h-t/2, -DIM.d/2-.07);
  group.add(top);

  doorFrame = group;
  cabinRoot.add(group);
}

function createHandrail() {
  const group = new THREE.Group();
  const colors = { H01:0xc8cbd0, H02:0xd5b77c, H03:0x202020, H04:0x7b5235 };
  const material = solidMat(colors[state.handrail] || 0xc8cbd0, .22, .7);

  const bar = new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,.92,24), material);
  bar.rotation.z = Math.PI/2;
  bar.position.set(0,1.05,DIM.d/2-.075);
  group.add(bar);

  [-.46,.46].forEach(x => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.17,20), material);
    post.position.set(x,.965,DIM.d/2-.075);
    group.add(post);
  });

  return group;
}

function createCOP() {
  const group = new THREE.Group();
  const colors = { P01:0xd5d7da, P02:0x18191b, P03:0xd4b16f, P04:0x202226 };
  const material = solidMat(colors[state.cop] || 0x202226, .28, .62);

  const width = state.cop === "P04" ? .16 : .11;
  const height = state.cop === "P04" ? .88 : .48;

  const panel = box(width, height, .035, material);
  panel.position.set(DIM.w/2-.075,1.28,-.03);
  group.add(panel);

  return group;
}

function updateLighting() {
  if (!lightRig) return;

  while (lightRig.children.length) {
    lightRig.remove(lightRig.children[0]);
  }

  const values = {
    L01:[0xffffff,1.45],
    L02:[0xffdfad,1.55],
    L03:[0xddeaff,1.5],
    L04:[0xf0d5ff,1.65]
  }[state.lighting] || [0xffffff,1.45];

  [[-.43,-.30],[.43,-.30],[-.43,.30],[.43,.30]].forEach(([x,z]) => {
    const panel = box(.20,.012,.045,solidMat(values[0],.15,.05));
    panel.position.set(x,2.29,z);
    lightRig.add(panel);

    const light = new THREE.PointLight(values[0],values[1],1.0,2);
    light.position.set(x,2.18,z);
    lightRig.add(light);
  });
}

function setup3D() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf1f3f4);

  camera = new THREE.PerspectiveCamera(42,1,.05,30);

  renderer = new THREE.WebGLRenderer({
    antialias:true,
    alpha:true,
    preserveDrawingBuffer:true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  viewer.innerHTML = "";
  viewer.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff,0xb7bec4,1.65));

  const key = new THREE.DirectionalLight(0xffffff,2.15);
  key.position.set(-2.5,4.5,-4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024,1024);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xdde6f0,1.05);
  fill.position.set(3,2,-2);
  scene.add(fill);

  createCabin();
  applyCamera();

  window.addEventListener("resize", applyCamera, {passive:true});

  if (window.ResizeObserver) {
    new ResizeObserver(applyCamera).observe(viewer);
  }

  loading.style.display = "none";
  animate();
}

function applyCamera() {
  if (!renderer || !camera) return;

  const rect = viewer.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;

  renderer.setSize(rect.width,rect.height,false);
  camera.aspect = rect.width / rect.height;

  const portrait = rect.height > rect.width * 1.10;

  if (portrait) {
    camera.position.set(.34,1.38,-5.90);
    camera.fov = 44;
  } else {
    camera.position.set(.46,1.40,-5.35);
    camera.fov = 40;
  }

  camera.lookAt(0,1.10,.12);
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);
  if (renderer) renderer.render(scene,camera);
}

function updateSummary() {
  const info = $("currentInfo");
  if (!info) return;

  const cabin = catalog.cabins.find(item => item.code === state.cabin);

  info.innerHTML = `
    <div><b>Mã mẫu</b><span>${state.cabin}</span></div>
    <div><b>Kiểu cabin</b><span>${cabin ? cabin.name : ""}</span></div>
    <div><b>Vách</b><span>${state.walls.left} / ${state.walls.back} / ${state.walls.right}</span></div>
    <div><b>Sàn</b><span>${state.floor}</span></div>
    <div><b>Trần</b><span>${state.ceiling}</span></div>
    <div><b>Cửa</b><span>${state.door}</span></div>
    <div><b>Tay vịn</b><span>${state.handrail}</span></div>
    <div><b>Bảng điều khiển</b><span>${state.cop}</span></div>
  `;
}

function renderCabins() {
  const targets = [$("cabinStyleGrid"), $("cabinCatalog")].filter(Boolean);

  targets.forEach(container => {
    container.innerHTML = "";

    catalog.cabins.forEach(cabin => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-card" + (state.cabin === cabin.code ? " active" : "");
      button.innerHTML = `
        <div class="choice-thumb"></div>
        <div class="choice-name">${cabin.name}</div>
        <div class="choice-code">${cabin.code}</div>
      `;

      button.onclick = () => {
        state.cabin = cabin.code;
        renderCabins();
        updateSummary();
        toast(cabin.code);
      };

      container.appendChild(button);
    });
  });
}

function updateMaterials() {
  if (!wallMeshes.left) return;

  wallMeshes.left.material = texturedMat("walls",state.walls.left);
  wallMeshes.back.material = texturedMat("walls",state.walls.back);
  wallMeshes.right.material = texturedMat("walls",state.walls.right);
  floorMesh.material = texturedMat("floor",state.floor,.62,.08);
  ceilingMesh.material = texturedMat("ceiling",state.ceiling,.55,.15);

  if (railMesh) {
    cabinRoot.remove(railMesh);
    railMesh = createHandrail();
    cabinRoot.add(railMesh);
  }

  if (copMesh) {
    cabinRoot.remove(copMesh);
    copMesh = createCOP();
    cabinRoot.add(copMesh);
  }

  createDoorFrame();
  updateLighting();
  updateSummary();
}

function bindControls() {
  const left = $("rotateLeft");
  const right = $("rotateRight");
  const door = $("doorToggle");

  // Keep the baseline visual stable: these controls are intentionally subtle.
  if (left) left.onclick = () => toast("Góc nhìn cố định");
  if (right) right.onclick = () => toast("Góc nhìn cố định");
  if (door) door.onclick = () => toast("Mặt trước đang mở");

  document.querySelectorAll(".view-card").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".view-card").forEach(x => x.classList.remove("active"));
      button.classList.add("active");
      toast(button.querySelector("span")?.textContent || "Góc nhìn");
    });
  });

  const quote = $("quoteBtn");
  if (quote) quote.onclick = () => toast("Demo: yêu cầu báo giá sẵn sàng");

  const save = $("saveBtn");
  if (save) save.onclick = () => toast("Đã lưu cấu hình mẫu");

  const image = $("imageBtn");
  if (image) image.onclick = () => toast("Demo: xuất hình ảnh");

  const share = $("shareBtn");
  if (share) share.onclick = () => toast("Demo: chia sẻ mẫu");
}


function renderCabinSection() {
  const panel = document.querySelector(".left-panel");
  if (!panel) return;

  panel.innerHTML = `
    <div class="panel cabin-panel">
      <div class="panel-heading"><strong>Chọn kiểu cabin</strong><span>⌄</span></div>
      <div id="cabinStyleGrid" class="style-grid"></div>
    </div>
    <div class="panel info-panel">
      <div class="info-title">Thông tin mẫu hiện tại</div>
      <div id="currentInfo"></div>
    </div>
  `;

  renderCabins();
  updateSummary();
}

function renderFloorSection() {
  const panel = document.querySelector(".left-panel");
  if (!panel) return;

  panel.innerHTML = `
    <div class="panel cabin-panel">
      <div class="panel-heading"><strong>Chọn mẫu sàn</strong><span>⌄</span></div>
      <div id="floorStyleGrid" class="style-grid"></div>
    </div>
    <div class="panel info-panel">
      <div class="info-title">Thông tin sàn hiện tại</div>
      <div id="floorInfo"></div>
    </div>
  `;

  const grid = $("floorStyleGrid");
  catalog.floor.forEach(([code, name]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-card" + (state.floor === code ? " active" : "");
    button.innerHTML = `
      <div class="choice-thumb" style="background:linear-gradient(135deg,#444,#aaa)"></div>
      <div class="choice-name">${name}</div>
      <div class="choice-code">${code}</div>
    `;

    button.onclick = () => {
      state.floor = code;
      updateMaterials();
      renderFloorSection();
      toast(`${code} · ${name}`);
    };

    grid.appendChild(button);
  });

  const current = catalog.floor.find(([code]) => code === state.floor);
  $("floorInfo").innerHTML = `
    <div><b>Mã sàn</b><span>${state.floor}</span></div>
    <div><b>Mẫu</b><span>${current ? current[1] : ""}</span></div>
  `;
}

function bindRailNavigation() {
  document.querySelectorAll(".rail-item").forEach(button => {
    button.addEventListener("click", () => {
      const section = button.dataset.section;

      if (section === "cabin") {
        document.querySelectorAll(".rail-item").forEach(x => x.classList.remove("active"));
        button.classList.add("active");
        renderCabinSection();
        return;
      }

      if (section === "floor") {
        document.querySelectorAll(".rail-item").forEach(x => x.classList.remove("active"));
        button.classList.add("active");
        renderFloorSection();
        return;
      }

      // Các mục còn lại chưa mở trong bước này — giữ nguyên baseline.
      toast("Mục này sẽ được mở ở bước tiếp theo");
    });
  });
}

renderCabinSection();
updateSummary();
bindControls();
bindRailNavigation();


try {
  setup3D();
} catch (error) {
  console.error("3D initialization error:",error);
  loading.textContent = "Lỗi khởi tạo 3D";
  loading.style.display = "block";
}

(async () => {
  try {
    const { initializeApp } =
      await import("https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js");

    const { getFirestore } =
      await import("https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js");

    const app = initializeApp({
      apiKey:"AIzaSyATAShAE4dBaU5fPAE1l_5sTe7WaUPumDA",
      authDomain:"elevator-configurator-ac760.firebaseapp.com",
      projectId:"elevator-configurator-ac760",
      storageBucket:"elevator-configurator-ac760.firebasestorage.app",
      messagingSenderId:"509625508976",
      appId:"1:509625508976:web:cda6aecd0d06f069f040b5"
    });

    getFirestore(app);
  } catch (error) {
    console.warn("Firebase optional:",error);
  }
})();
