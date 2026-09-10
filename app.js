import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase/firebase-config.js";

const $ = (s) => document.querySelector(s);

const fallback = {
  cabin: [
    {code:"GV-001",name:"Champagne Classic"},
    {code:"GV-002",name:"Titanium Modern"},
    {code:"GV-003",name:"Dark Luxury"}
  ],
  walls: ["I01","I02","I03","I04","I05","I06","I07","I08"].map((code,i)=>({
    code,
    name:[
      "Inox Champagne Hairline","Inox Titanium Mirror","Inox Silver Hairline",
      "Inox Black Mirror","Inox Rose Hairline","Inox Bronze Mirror",
      "Inox Deep Blue Hairline","Inox Pearl Etched"
    ][i]
  })),
  floor: ["S01","S02","S03","S04","S05","S06"].map((code,i)=>({
    code,name:["Granite Light","Granite Dark","Black Stone","Warm Stone","Grey Ceramic","Ivory Ceramic"][i]
  })),
  ceiling: ["T01","T02","T03","T04","T05","T06"].map((code,i)=>({
    code,name:["Silver Ceiling","Black Ceiling","Champagne Ceiling","White Ceiling","Mirror Ceiling","Star Grid Ceiling"][i]
  })),
  doors: ["C01","C02","C03","C04","C05","C06"].map((code,i)=>({
    code,name:["Two-panel Silver","Two-panel Black","Two-panel Champagne","Center-opening Bronze","Glass Dark","Glass Smoke"][i]
  })),
  handrail: ["H01","H02","H03","H04"].map((code,i)=>({
    code,name:["Round Silver","Round Black","Round Champagne","Square Bronze"][i]
  })),
  cop: ["P01","P02","P03","P04"].map((code,i)=>({
    code,name:["Stainless COP","Black Glass COP","Champagne COP","Dark Bronze COP"][i]
  })),
  lighting: ["L01","L02","L03","L04"].map((code,i)=>({
    code,name:["Warm 3000K","Neutral 4000K","Cool 6000K","Perimeter LED"][i]
  }))
};

let library = structuredClone(fallback);

const state = {
  cabin:0,
  wallMode:"same",
  wallTarget:"left",
  walls:{left:0,back:0,right:0},
  floor:0,
  ceiling:0,
  door:0,
  handrail:0,
  cop:0,
  lighting:0
};

const COLORS = {
  I01:0xc3a36e,I02:0x87919b,I03:0xb8bec3,I04:0x20262d,
  I05:0xa97972,I06:0x6b4a2e,I07:0x314a63,I08:0xc8c7bd,
  S01:0xa9a9a3,S02:0x47494a,S03:0x1b1c1e,S04:0x766655,S05:0x81868a,S06:0xd2cbbc,
  T01:0xaab0b5,T02:0x20252a,T03:0xb49666,T04:0xe1e2e1,T05:0x777d82,T06:0x55595e,
  C01:0x9ea5ab,C02:0x24282d,C03:0xb39769,C04:0x664b37,C05:0x20262b,C06:0x4f5860,
  H01:0xb4bac0,H02:0x20242a,H03:0xb39461,H04:0x62452f,
  P01:0x899096,P02:0x171b20,P03:0xb39668,P04:0x493126
};

const viewer = $("#viewer");
const loading = $("#loading");
const loadingText = $("#loadingText");
const firebaseStatus = $("#firebaseStatus");

let scene, camera, renderer, cabinGroup;
let resizeObserver;
const textureCache = new Map();

function item(cat,index){
  const list = library[cat] || [];
  return list.length ? list[index % list.length] : {code:"",name:""};
}

function assetPath(cat,code){
  return `./assets/${cat}/${code}.png`;
}

function material(cat,index,roughness=.45,metalness=.65){
  const data = item(cat,index);
  const m = new THREE.MeshStandardMaterial({
    color: COLORS[data.code] ?? 0x888888,
    roughness,
    metalness
  });

  const url = assetPath(cat,data.code);
  if(!textureCache.has(url)){
    const tex = new THREE.TextureLoader().load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(cat === "walls" ? 1.2 : 1, cat === "walls" ? 1.8 : 1);
    textureCache.set(url,tex);
  }

  m.map = textureCache.get(url);
  m.needsUpdate = true;
  return m;
}

function addBox(name,size,position,mat,parent=cabinGroup){
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size),mat);
  mesh.name = name;
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function disposeObject(obj){
  obj.traverse?.(node=>{
    if(node.geometry) node.geometry.dispose();
    if(node.material){
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach(m=>m.dispose?.());
    }
  });
}

function clearCabin(){
  while(cabinGroup.children.length){
    const obj = cabinGroup.children.pop();
    disposeObject(obj);
  }
}

function buildCabin(){
  clearCabin();

  // Exact demo cabin dimensions:
  // Width 1400 mm, Depth 1200 mm, Height 2400 mm.
  const W = 1.40;
  const D = 1.20;
  const H = 2.40;
  const wallT = .045;
  const floorT = .055;

  // Floor
  addBox(
    "floor",
    [W,D,floorT],
    [0,0,floorT/2],
    material("floor",state.floor,.72,.18)
  );

  // Three primary walls
  addBox(
    "wall-left",
    [wallT,D,H],
    [-W/2 + wallT/2,0,H/2],
    material("walls",state.walls.left,.42,.72)
  );

  addBox(
    "wall-back",
    [W,wallT,H],
    [0,D/2 - wallT/2,H/2],
    material("walls",state.walls.back,.42,.72)
  );

  addBox(
    "wall-right",
    [wallT,D,H],
    [W/2 - wallT/2,0,H/2],
    material("walls",state.walls.right,.42,.72)
  );

  // Ceiling
  addBox(
    "ceiling",
    [W,D,wallT],
    [0,0,H-wallT/2],
    material("ceiling",state.ceiling,.34,.72)
  );

  // Open front: only frame, no door leaf blocking the view.
  const doorMat = material("doors",state.door,.28,.76);
  const frame = .055;

  addBox("front-left-frame",[frame,.055,H],
    [-W/2+frame/2,-D/2+.025,H/2],doorMat);

  addBox("front-right-frame",[frame,.055,H],
    [W/2-frame/2,-D/2+.025,H/2],doorMat);

  addBox("front-top-frame",[W,.055,frame],
    [0,-D/2+.025,H-frame/2],doorMat);

  // Handrail on rear wall
  const railMat = material("handrail",state.handrail,.25,.82);
  const rail = new THREE.Mesh(
    new THREE.CylinderGeometry(.026,.026,.88,24),
    railMat
  );
  rail.rotation.z = Math.PI/2;
  rail.position.set(0,D/2-.075,1.12);
  cabinGroup.add(rail);

  // COP on right wall
  const copMat = material("cop",state.cop,.27,.72);
  const cop = addBox(
    "cop",
    [.26,.045,.58],
    [W/2-.10,-.02,1.20],
    copMat
  );
  cop.rotation.y = Math.PI/2;

  // Ceiling decorative panel
  const panelMat = new THREE.MeshStandardMaterial({
    color:0x20252a,
    roughness:.28,
    metalness:.55
  });
  addBox("ceiling-panel",[.76,.52,.018],[0,.04,H-.08],panelMat);

  // Lighting
  const lightingCode = item("lighting",state.lighting).code;
  const lightColor = {
    L01:0xffd07b,
    L02:0xfff2d9,
    L03:0xbfe4ff,
    L04:0xffffff
  }[lightingCode] || 0xffffff;

  const lightIntensity = {
    L01:3.2,
    L02:3.0,
    L03:2.8,
    L04:3.6
  }[lightingCode] || 3;

  [
    [-.48,-.38],[.48,-.38],
    [-.48,.34],[.48,.34]
  ].forEach(([x,z])=>{
    const bulb = new THREE.Mesh(
      new THREE.CylinderGeometry(.055,.055,.015,24),
      new THREE.MeshStandardMaterial({
        color:0xffffff,
        emissive:lightColor,
        emissiveIntensity:1.8
      })
    );
    bulb.rotation.x = Math.PI/2;
    bulb.position.set(x,z,H-.055);
    cabinGroup.add(bulb);

    const point = new THREE.PointLight(
      lightColor,
      lightIntensity,
      3.4,
      2
    );
    point.position.set(x,z,H-.15);
    cabinGroup.add(point);
  });

  // Demo etched pattern mode
  if(state.wallMode === "pattern"){
    const patternMat = new THREE.MeshStandardMaterial({
      color:0xd7b78e,
      roughness:.28,
      metalness:.72,
      emissive:0x1b1007,
      emissiveIntensity:.08
    });

    const patternPanel = addBox(
      "etched-pattern-panel",
      [.82,.018,1.70],
      [0,D/2-.028,1.30],
      patternMat
    );

    for(let i=0;i<5;i++){
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(.13,.012,8,32,Math.PI*1.35),
        patternMat
      );
      ring.rotation.x = Math.PI/2;
      ring.position.set(-.22+i*.11,D/2-.04,.55+i*.18);
      cabinGroup.add(ring);
    }

    patternPanel.userData.isPattern = true;
  }

  applyCamera();
}

function init3D(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf1f5f3);

  camera = new THREE.PerspectiveCamera(40,1,.05,100);

  renderer = new THREE.WebGLRenderer({
    antialias:true,
    powerPreference:"high-performance"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0xf1f5f3,1);

  viewer.innerHTML = "";
  viewer.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff,0x78837f,2.0));

  const key = new THREE.DirectionalLight(0xffffff,2.5);
  key.position.set(-2,4,-4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff,1.4);
  fill.position.set(3,2,-5);
  scene.add(fill);

  cabinGroup = new THREE.Group();
  scene.add(cabinGroup);

  buildCabin();
  applyCamera();
}

function applyCamera(){
  if(!renderer || !camera || !viewer) return;

  const r = viewer.getBoundingClientRect();
  if(!r.width || !r.height) return;

  renderer.setSize(r.width,r.height,false);
  camera.aspect = r.width/r.height;

  /*
    Fixed front view.

    Cabin front is Z = -0.60.
    Camera is always at NEGATIVE Z, outside the open front.

    The iPad portrait framing is intentionally wide and distant so
    the complete cabin can remain visible from floor to ceiling.
  */
  const portrait = r.height >= r.width;

  if(portrait){
    camera.fov = 43;
    camera.position.set(.55,1.52,-6.20);
    camera.lookAt(0,1.00,0.08);
  }else{
    camera.fov = 39;
    camera.position.set(.62,1.48,-5.55);
    camera.lookAt(0,.99,0.08);
  }

  camera.updateProjectionMatrix();
}

function resize3D(){
  applyCamera();
}

function renderCabins(){
  const el = $("#cabinChoices");
  if(!el) return;

  el.innerHTML = "";

  library.cabin.forEach((data,index)=>{
    const button = document.createElement("button");
    button.type = "button";
    button.className = `cabin-card ${index === state.cabin ? "active" : ""}`;

    const background =
      index === 0
        ? "linear-gradient(120deg,#cbb58c,#eee1ca)"
        : index === 1
          ? "linear-gradient(120deg,#8e979f,#e3e7e9)"
          : "linear-gradient(120deg,#22282d,#697176)";

    button.innerHTML = `
      <div class="cabin-thumb" style="background:${background}">
        <span class="cabin-code">${data.code}</span>
      </div>
      <span class="card-label">${data.code} · ${data.name}</span>
    `;

    button.addEventListener("click",()=>{
      state.cabin = index;
      renderCabins();
      updateConfig();
    });

    el.appendChild(button);
  });
}

function renderWallModes(){
  document.querySelectorAll("#wallModes [data-mode]").forEach(button=>{
    button.classList.toggle(
      "active",
      button.dataset.mode === state.wallMode
    );
  });
}

function renderWalls(){
  const choices = $("#wallChoices");
  if(!choices) return;

  choices.innerHTML = "";

  const labels = {
    left:"Vách trái",
    back:"Vách sau",
    right:"Vách phải"
  };

  Object.entries(labels).forEach(([key,label])=>{
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      `zone-selector ${state.wallTarget === key ? "active" : ""}`;

    button.textContent =
      `${label} · ${item("walls",state.walls[key]).code}`;

    button.addEventListener("click",()=>{
      state.wallTarget = key;
      renderWalls();
    });

    // Zone selectors use the existing grid styling.
    button.style.width = "100%";
    button.style.border = "1px solid var(--line)";
    button.style.background =
      state.wallTarget === key ? "var(--soft)" : "#fff";
    button.style.borderRadius = "11px";
    button.style.padding = "10px 4px";
    button.style.cursor = "pointer";
    button.style.fontSize = "10px";
    button.style.minHeight = "40px";
    button.style.color =
      state.wallTarget === key ? "var(--accent-dark)" : "var(--text)";
    choices.appendChild(button);
  });

  library.walls.forEach((data,index)=>{
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      `swatch ${isWallSelected(index) ? "active" : ""}`;
    button.style.backgroundImage =
      `url("${assetPath("walls",data.code)}")`;

    button.innerHTML = `<small>${data.code}</small>`;

    button.addEventListener("click",()=>{
      if(state.wallMode === "same" || state.wallMode === "pattern"){
        state.walls = {left:index,back:index,right:index};
      }else{
        state.walls[state.wallTarget] = index;
      }

      buildCabin();
      renderWalls();
      updateConfig();
    });

    choices.appendChild(button);
  });
}

function isWallSelected(index){
  if(state.wallMode === "same" || state.wallMode === "pattern"){
    return state.walls.left === index;
  }
  return state.walls[state.wallTarget] === index;
}

function renderOptions(category,id,stateKey){
  const el = $("#"+id);
  if(!el) return;

  el.innerHTML = "";

  library[category].forEach((data,index)=>{
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      `option-card ${state[stateKey] === index ? "active" : ""}`;

    button.innerHTML = `
      <img src="${assetPath(category,data.code)}" alt="${data.code}">
      <span class="card-label">${data.code} · ${data.name}</span>
    `;

    button.addEventListener("click",()=>{
      state[stateKey] = index;
      buildCabin();
      renderOptions(category,id,stateKey);
      updateConfig();
    });

    el.appendChild(button);
  });
}

function updateConfig(){
  const output = $("#configOutput");
  if(!output) return;

  output.textContent = JSON.stringify({
    cabin:item("cabin",state.cabin).code,
    dimensions:"1400 × 1200 × 2400 mm",
    preview:"fixed / front open",
    camera:"fixed / front / full cabin",
    walls:{
      left:item("walls",state.walls.left).code,
      back:item("walls",state.walls.back).code,
      right:item("walls",state.walls.right).code
    },
    floor:item("floor",state.floor).code,
    ceiling:item("ceiling",state.ceiling).code,
    door:item("doors",state.door).code,
    handrail:item("handrail",state.handrail).code,
    cop:item("cop",state.cop).code,
    lighting:item("lighting",state.lighting).code
  },null,2);
}

function renderAll(){
  renderCabins();
  renderWallModes();
  renderWalls();
  renderOptions("floor","floorChoices","floor");
  renderOptions("ceiling","ceilingChoices","ceiling");
  renderOptions("doors","doorChoices","door");
  renderOptions("handrail","handrailChoices","handrail");
  renderOptions("cop","copChoices","cop");
  renderOptions("lighting","lightingChoices","lighting");
  updateConfig();
}

function reset(){
  Object.assign(state,{
    cabin:0,
    wallMode:"same",
    wallTarget:"left",
    walls:{left:0,back:0,right:0},
    floor:0,
    ceiling:0,
    door:0,
    handrail:0,
    cop:0,
    lighting:0
  });

  renderAll();
  buildCabin();
}

function setupEvents(){
  document.querySelectorAll(".section-title").forEach(button=>{
    button.addEventListener("click",()=>{
      const panel = button.closest(".panel");
      if(!panel) return;

      const body = panel.querySelector(".section-body");
      if(!body) return;

      const open = panel.classList.toggle("open");
      body.classList.toggle("hidden",!open);

      const chevron = button.querySelector(".chevron");
      if(chevron) chevron.textContent = open ? "⌄" : "›";
    });
  });

  document.querySelectorAll("#wallModes [data-mode]").forEach(button=>{
    button.addEventListener("click",()=>{
      state.wallMode = button.dataset.mode;
      renderWallModes();
      renderWalls();
      buildCabin();
      updateConfig();
    });
  });
}

async function loadManifest(){
  try{
    const response = await fetch(
      "./assets/asset-manifest.json",
      {cache:"no-store"}
    );

    if(!response.ok) return;

    const data = await response.json();

    if(data && typeof data === "object"){
      library = {...library,...data};
    }
  }catch(error){
    // Local fallback remains active.
  }
}

async function loadFirebaseInBackground(){
  if(!firebaseStatus) return;

  try{
    firebaseStatus.textContent = "Firebase: connecting…";

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const snapshot = await Promise.race([
      getDocs(collection(db,"materials")),
      new Promise((_,reject)=>
        setTimeout(()=>reject(new Error("timeout")),5000)
      )
    ]);

    snapshot.forEach(doc=>{
      const data = doc.data();
      const category = data.category === "wall"
        ? "walls"
        : data.category;

      if(!library[category]) return;

      const index = library[category]
        .findIndex(x=>x.code === data.code);

      if(index >= 0){
        library[category][index] = {
          ...library[category][index],
          ...data
        };
      }
    });

    firebaseStatus.textContent = "Firebase: connected";
    renderAll();
    buildCabin();

  }catch(error){
    firebaseStatus.textContent = "Local demo";
  }
}

async function boot(){
  try{
    if(loading) loading.classList.remove("hide");
    if(loadingText) loadingText.textContent = "Đang khởi tạo 3D…";

    // Local assets first. Firebase never blocks the 3D preview.
    await loadManifest();

    init3D();
    setupEvents();
    renderAll();

    requestAnimationFrame(()=>{
      resize3D();
      if(loading) loading.classList.add("hide");
    });

    setTimeout(loadFirebaseInBackground,150);

  }catch(error){
    console.error(error);

    if(loading) loading.classList.add("hide");
    if(firebaseStatus) firebaseStatus.textContent = "Local demo";
  }
}

window.addEventListener("resize",resize3D,{passive:true});

if("ResizeObserver" in window){
  resizeObserver = new ResizeObserver(resize3D);
  resizeObserver.observe(viewer);
}

boot();

function animate(){
  requestAnimationFrame(animate);

  if(renderer && scene && camera){
    renderer.render(scene,camera);
  }
}

animate();
