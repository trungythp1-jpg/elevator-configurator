import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js";

const ASSET = "./assets/";

const catalog = {
  cabins: [
    { code: "GV-001", name: "Champagne Classic" },
    { code: "GV-002", name: "Black Luxury" },
    { code: "GV-003", name: "Silver Minimal" }
  ],
  walls: [
    ["I01", "Champagne Gold"], ["I02", "Mirror Silver"], ["I03", "Hairline Silver"], ["I04", "Dark Titanium"],
    ["I05", "Rose Gold"], ["I06", "Black Mirror"], ["I07", "Warm Bronze"], ["I08", "Pearl White"]
  ],
  floor: [["S01", "Black Stone"], ["S02", "Grey Stone"], ["S03", "Light Marble"], ["S04", "Dark Marble"], ["S05", "Warm Granite"], ["S06", "Wood Tone"]],
  ceiling: [["T01", "Square Light"], ["T02", "Linear Light"], ["T03", "Gold Frame"], ["T04", "Black Frame"], ["T05", "White Minimal"], ["T06", "Star Light"]],
  doors: [["C01", "Champagne"], ["C02", "Silver"], ["C03", "Black"], ["C04", "Rose Gold"], ["C05", "Bronze"], ["C06", "Mirror"]],
  handrail: [["H01", "Round Silver"], ["H02", "Round Gold"], ["H03", "Black"], ["H04", "Wood"]],
  cop: [["P01", "Slim Silver"], ["P02", "Black Glass"], ["P03", "Gold Frame"], ["P04", "Full Height"]],
  lighting: [["L01", "Neutral"], ["L02", "Warm"], ["L03", "Cool"], ["L04", "Accent"]]
};

const state = {
  cabin: "GV-001",
  walls: { left: "I01", back: "I01", right: "I01" },
  floor: "S01", ceiling: "T01", door: "C01",
  handrail: "H01", cop: "P01", lighting: "L01"
};

const $ = id => document.getElementById(id);
const viewer = $("viewer");
const loading = $("loading");

let scene, camera, renderer, controls, gltfLoader;
let currentCabinModel = null;
const textureCache = new Map();

function asset(category, code, ext = "png") {
  return `${ASSET}${category}/${code}.${ext}`;
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

function setup3D() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf1f3f4);

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 1.2, -3.5);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  viewer.innerHTML = "";
  viewer.appendChild(renderer.domElement);

  // Điều khiển xoay camera
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 1.1, 0);

  // Ánh sáng
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb7bec4, 1.5));

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
  keyLight.position.set(-2, 4, -3);
  keyLight.castShadow = true;
  scene.add(keyLight);

  gltfLoader = new GLTFLoader();

  loadCabinGLB(state.cabin);
  applyCamera();

  window.addEventListener("resize", applyCamera, { passive: true });
  if (window.ResizeObserver) {
    new ResizeObserver(applyCamera).observe(viewer);
  }

  animate();
}

// Tải file mô hình GLB từ folder assets/cabin/
function loadCabinGLB(cabinCode) {
  if (loading) loading.style.display = "block";

  if (currentCabinModel) {
    scene.remove(currentCabinModel);
  }

  const modelPath = asset("cabin", cabinCode, "glb");

  gltfLoader.load(
    modelPath,
    (gltf) => {
      currentCabinModel = gltf.scene;
      currentCabinModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(currentCabinModel);
      updateMaterials();
      if (loading) loading.style.display = "none";
    },
    undefined,
    (error) => {
      console.warn(`Không tìm thấy file GLB tại ${modelPath}, hiển thị chế độ fallback.`, error);
      if (loading) loading.style.display = "none";
    }
  );
}

function updateMaterials() {
  if (!currentCabinModel) return;

  // Áp dụng texture lên các phần tương ứng nếu mesh được đặt tên trong file 3D
  currentCabinModel.traverse((child) => {
    if (child.isMesh) {
      const name = child.name.toLowerCase();
      if (name.includes("floor")) {
        child.material.map = makeTexture(asset("floor", state.floor));
      } else if (name.includes("wall_left")) {
        child.material.map = makeTexture(asset("walls", state.walls.left));
      } else if (name.includes("wall_back")) {
        child.material.map = makeTexture(asset("walls", state.walls.back));
      } else if (name.includes("wall_right")) {
        child.material.map = makeTexture(asset("walls", state.walls.right));
      } else if (name.includes("ceiling")) {
        child.material.map = makeTexture(asset("ceiling", state.ceiling));
      }
      child.material.needsUpdate = true;
    }
  });

  updateSummary();
}

function applyCamera() {
  if (!renderer || !camera) return;
  const rect = viewer.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;

  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
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
        loadCabinGLB(state.cabin);
        toast(cabin.code);
      };

      container.appendChild(button);
    });
  });
}

function bindControls() {
  const left = $("rotateLeft");
  const right = $("rotateRight");

  if (left) left.onclick = () => { if (controls) controls.azimuthAngle -= Math.PI / 8; };
  if (right) right.onclick = () => { if (controls) controls.azimuthAngle += Math.PI / 8; };

  const save = $("saveBtn");
  if (save) save.onclick = () => toast("Đã lưu cấu hình mẫu");
}

renderCabins();
updateSummary();
bindControls();

try {
  setup3D();
} catch (error) {
  console.error("3D initialization error:", error);
}
