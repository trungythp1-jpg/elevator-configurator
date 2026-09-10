import * as THREE from "three";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { firebaseConfig } from "./firebase/firebase-config.js";

const viewer = document.querySelector("#viewer");
const loading = document.querySelector("#loading");
const cloudStatus = document.querySelector("#cloudStatus");

const fallbackManifest = {
  cabin:[
    {code:"GV-001",file:"cabin/GV-001.glb",name:"Champagne Classic"},
    {code:"GV-002",file:"cabin/GV-002.glb",name:"Titanium Modern"},
    {code:"GV-003",file:"cabin/GV-003.glb",name:"Dark Luxury"}
  ],
  walls:[1,2,3,4,5,6,7,8].map((n)=>({code:`I0${n}`,file:`walls/I0${n}.png`,name:["Inox Champagne Hairline","Inox Titanium Mirror","Inox Silver Hairline","Inox Black Mirror","Inox Rose Hairline","Inox Bronze Mirror","Inox Deep Blue Hairline","Inox Pearl Etched"][n-1]})),
  floor:[1,2,3,4,5,6].map((n)=>({code:`S0${n}`,file:`floor/S0${n}.png`,name:["Granite Light","Granite Dark","Black Stone","Warm Stone","Grey Ceramic","Ivory Ceramic"][n-1]})),
  ceiling:[1,2,3,4,5,6].map((n)=>({code:`T0${n}`,file:`ceiling/T0${n}.png`,name:["Silver Ceiling","Black Ceiling","Champagne Ceiling","White Ceiling","Mirror Ceiling","Star Grid Ceiling"][n-1]})),
  doors:[1,2,3,4,5,6].map((n)=>({code:`C0${n}`,file:`doors/C0${n}.png`,name:["Two-panel Silver","Two-panel Black","Two-panel Champagne","Center-opening Bronze","Glass Dark","Glass Smoke"][n-1]})),
  handrail:[1,2,3,4].map((n)=>({code:`H0${n}`,file:`handrail/H0${n}.png`,name:["Round Silver","Round Black","Round Champagne","Square Bronze"][n-1]})),
  cop:[1,2,3,4].map((n)=>({code:`P0${n}`,file:`cop/P0${n}.png`,name:["Stainless COP","Black Glass COP","Champagne COP","Dark Bronze COP"][n-1]})),
  lighting:[1,2,3,4].map((n)=>({code:`L0${n}`,file:`lighting/L0${n}.png`,name:["Warm 3000K","Neutral 4000K","Cool 6000K","Perimeter LED"][n-1]}))
};

let manifest = fallbackManifest;
try {
  const r = await fetch("./asset-manifest.json",{cache:"no-store"});
  if(r.ok) manifest = await r.json();
} catch(e) {}

const state = {
  cabin:0,
  wallMode:"same",
  wallTarget:"left",
  walls:{left:0,back:0,right:0},
  floor:0,ceiling:0,door:0,handrail:0,cop:0,lighting:0
};
let library = {...manifest};

// ---------------------------------------------------------
// 3D: FIXED FRONT VIEW — 1400 x 1200 x 2400 mm
// ---------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf3f6f4);
const camera = new THREE.PerspectiveCamera(39,1,0.05,100);
const renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0xf3f6f4,1);
viewer.appendChild(renderer.domElement);

// No OrbitControls: cabin is intentionally fixed.
const ambient = new THREE.HemisphereLight(0xffffff,0x7f8b86,2.0); scene.add(ambient);
const key = new THREE.DirectionalLight(0xffffff,2.6); key.position.set(2.5,4.5,4); scene.add(key);
const fill = new THREE.PointLight(0xffffff,18,8); fill.position.set(0,1.8,0.4); scene.add(fill);
const frontFill = new THREE.DirectionalLight(0xffffff,1.1); frontFill.position.set(0,2.2,5); scene.add(frontFill);

const cabinGroup = new THREE.Group();
cabinGroup.position.y = 0;
scene.add(cabinGroup);
const textureCache = new Map();
const materialCache = new Map();
const meshes = {};

function texture(path){
  if(textureCache.has(path)) return textureCache.get(path);
  const t = new THREE.TextureLoader().load(path);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  textureCache.set(path,t);
  return t;
}

const palettes={
  I01:0xbc9d6c,I02:0x7a848f,I03:0xb0b7be,I04:0x2a2e34,I05:0xa6766f,I06:0x67492f,I07:0x30455b,I08:0xc7c5b8,
  S01:0xa6a6a0,S02:0x424446,S03:0x1c1e20,S04:0x7d6c5b,S05:0x7e8488,S06:0xcdc7b9,
  T01:0xa4aab0,T02:0x202327,T03:0xaf9465,T04:0xdcdddd,T05:0x73787d,T06:0x52565b,
  C01:0x9ea4aa,C02:0x282b30,C03:0xb49669,C04:0x694e38,C05:0x1a2024,C06:0x4e5860,
  H01:0xaaafb5,H02:0x24262a,H03:0xaf9160,H04:0x644832,
  P01:0x878e94,P02:0x1b1f23,P03:0xae9164,P04:0x4b3428
};

function asset(cat,idx){return library[cat][idx % library[cat].length]}
function genericMaterial(item,cat,rough=.5){
  const key=`${cat}:${item.code}:${rough}`;
  if(materialCache.has(key)) return materialCache.get(key);
  const m=new THREE.MeshStandardMaterial({
    color:palettes[item.code]||0x888888,
    map:texture(`./assets/${cat}/${item.code}.png`),
    roughness:rough,
    metalness:cat==="floor"?.15:.72
  });
  materialCache.set(key,m); return m;
}
function box(name,size,pos,material){
  const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);
  m.position.set(...pos); m.name=name; cabinGroup.add(m); meshes[name]=m; return m;
}
function clearCabin(){
  while(cabinGroup.children.length){
    const child=cabinGroup.children.pop();
    child.geometry?.dispose();
  }
  for(const k of Object.keys(meshes)) delete meshes[k];
}
function wallMaterial(zone){
  const i=state.walls[zone];
  return genericMaterial(asset("walls",i),"walls",.42);
}
function floorMaterial(){return genericMaterial(asset("floor",state.floor),"floor",.72)}
function ceilingMaterial(){return genericMaterial(asset("ceiling",state.ceiling),"ceiling",.38)}
function doorMaterial(){return genericMaterial(asset("doors",state.door),"doors",.28)}

function rebuildCabin(){
  clearCabin();
  // Real target dimensions represented as 1.4 x 1.2 x 2.4 scene units.
  const W=1.40,D=1.20,H=2.40,t=.045;
  const floorT=.055;

  box("floor",[W,D,floorT],[0,0,floorT/2],floorMaterial());
  box("back",[W,t,H],[0,D/2-t/2,H/2],wallMaterial("back"));
  box("left",[t,D,H],[-W/2+t/2,0,H/2],wallMaterial("left"));
  box("right",[t,D,H],[W/2-t/2,0,H/2],wallMaterial("right"));
  box("ceiling",[W,D,t],[0,0,H-t/2],ceilingMaterial());

  // Open front — no door in the preview, matching the approved reference view.
  addFrontFrame();
  addHandrail();
  addCop();
  addCeilingLights();
  applyLighting();
}

function addFrontFrame(){
  const frameMat=genericMaterial(asset("doors",state.door),"doors",.24);
  const side=.055;
  box("frontLeftFrame",[side,.055,H],[-W2(),-D/2+.03,H/2],frameMat);
  box("frontRightFrame",[side,.055,H],[W2(),-D/2+.03,H/2],frameMat);
  box("frontTopFrame",[W,.055,side],[0,-D/2+.03,H-side/2],frameMat);
  function W2(){return 1.40/2-side/2}
}
function addHandrail(){
  const m=genericMaterial(asset("handrail",state.handrail),"handrail",.25);
  const geo=new THREE.CylinderGeometry(.026,.026,.92,24);
  for(const x of [-.50,.50]){
    const h=new THREE.Mesh(geo,m); h.rotation.z=Math.PI/2; h.position.set(x,-.48,1.18); cabinGroup.add(h);
  }
}
function addCop(){
  const m=genericMaterial(asset("cop",state.cop),"cop",.3);
  const p=new THREE.Mesh(new THREE.BoxGeometry(.26,.045,.58),m);
  p.position.set(.49,-.515,1.22); cabinGroup.add(p);
}
function addCeilingLights(){
  const lightMat=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:1.8});
  const geo=new THREE.CylinderGeometry(.055,.055,.012,32);
  [[-.48,-.38,2.34],[.48,-.38,2.34],[-.48,.30,2.34],[.48,.30,2.34]].forEach(([x,z,y])=>{
    const l=new THREE.Mesh(geo,lightMat);l.rotation.x=Math.PI/2;l.position.set(x,z,y);cabinGroup.add(l);
  });
}
function applyLighting(){
  const colors={L01:0xffd07a,L02:0xfff1d6,L03:0xbfe2ff,L04:0xffffff};
  const code=asset("lighting",state.lighting).code;
  fill.color.setHex(colors[code]||0xffffff);
  fill.intensity=code==="L04"?24:18;
}

function frameCamera(){
  const r=viewer.getBoundingClientRect();
  if(!r.width||!r.height)return;
  renderer.setSize(r.width,r.height,false);
  camera.aspect=r.width/r.height;
  camera.updateProjectionMatrix();
  // Higher and farther so the complete floor + ceiling remain visible.
  const compact=Math.min(r.width,r.height);
  const portrait=r.height>r.width*1.15;
  camera.position.set(portrait?1.95:1.72, portrait?2.28:2.18, portrait?4.75:4.35);
  camera.lookAt(0,1.18,0.02);
}

function showLoading(show){loading.classList.toggle("show",show)}

function renderCabins(){
  const el=document.querySelector("#cabinChoices");el.innerHTML="";
  manifest.cabin.forEach((x,i)=>{
    const d=document.createElement("div");
    d.className=`choice ${i===state.cabin?"active":""}`;
    d.innerHTML=`<div class="cabin-thumb" style="background:${i===0?"linear-gradient(120deg,#cdb78f,#f2e7d0)":i===1?"linear-gradient(120deg,#8e969e,#e3e7e9)":"linear-gradient(120deg,#242a2e,#687075)"};height:66px;display:flex;align-items:center;justify-content:center"><span style="border:2px solid #fff9;padding:13px 42px;color:#fff;font-weight:700;font-size:11px;text-shadow:0 1px 3px #0008">${x.code}</span></div><label>${x.code} · ${x.name}</label>`;
    d.onclick=()=>{state.cabin=i;document.querySelector("#cabinTitle").textContent=`${x.code} · ${x.name}`;renderCabins();updateConfig()};
    el.appendChild(d);
  });
}
function renderWalls(){
  const zones=document.querySelector("#wallZones");zones.innerHTML="";
  const labels={left:"Vách trái",back:"Vách sau",right:"Vách phải"};
  Object.entries(labels).forEach(([key,label])=>{
    const b=document.createElement("button");b.textContent=`${label} · ${asset("walls",state.walls[key]).code}`;
    b.className=state.wallTarget===key?"active":"";
    b.onclick=()=>{state.wallTarget=key;renderWalls()};zones.appendChild(b);
  });
  const sw=document.querySelector("#wallMaterials");sw.innerHTML="";
  library.walls.forEach((x,i)=>{
    const active=(state.wallMode==="same"?state.walls.left:state.walls[state.wallTarget])===i;
    const b=document.createElement("div");b.className=`swatch ${active?"active":""}`;
    b.style.backgroundImage=`url("./assets/walls/${x.code}.png")`;
    b.innerHTML=`<small>${x.code}</small>`;
    b.onclick=()=>selectWall(i);sw.appendChild(b);
  });
}
function selectWall(i){
  if(state.wallMode==="same"||state.wallMode==="pattern")state.walls={left:i,back:i,right:i};
  else state.walls[state.wallTarget]=i;
  rebuildCabin();renderWalls();updateConfig();
}
function renderCards(cat,id){
  const el=document.querySelector(`#${id}`);el.innerHTML="";
  library[cat].forEach((x,i)=>{
    const key=cat==="doors"?"door":cat;
    const d=document.createElement("div");d.className=`card ${state[key]===i?"active":""}`;
    d.innerHTML=`<img src="./assets/${cat}/${x.code}.png" alt=""><label>${x.code} · ${x.name}</label>`;
    d.onclick=()=>{state[key]=i;rebuildCabin();renderCards(cat,id);updateConfig()};el.appendChild(d);
  });
}
function renderAll(){
  renderCabins();renderWalls();
  renderCards("floor","floorChoices");renderCards("ceiling","ceilingChoices");renderCards("doors","doorChoices");renderCards("handrail","handrailChoices");renderCards("cop","copChoices");renderCards("lighting","lightingChoices");
  updateConfig();
}
function updateConfig(){
  document.querySelector("#modeTitle").textContent=`3 Walls · ${state.wallMode==="same"?"Same Material":state.wallMode==="independent"?"Independent":"Etched Pattern"}`;
  document.querySelector("#configPreview").textContent=JSON.stringify({
    cabin:manifest.cabin[state.cabin].code,
    dimensions:"1400 × 1200 × 2400 mm",
    preview:"fixed / front open",
    walls:{left:asset("walls",state.walls.left).code,back:asset("walls",state.walls.back).code,right:asset("walls",state.walls.right).code},
    floor:asset("floor",state.floor).code,ceiling:asset("ceiling",state.ceiling).code,
    door:asset("doors",state.door).code,handrail:asset("handrail",state.handrail).code,
    cop:asset("cop",state.cop).code,lighting:asset("lighting",state.lighting).code
  },null,2);
}

document.querySelectorAll("[data-wall-mode]").forEach(b=>b.onclick=()=>{
  state.wallMode=b.dataset.wallMode;
  document.querySelectorAll("[data-wall-mode]").forEach(x=>x.classList.toggle("active",x===b));
  renderWalls();updateConfig();rebuildCabin();
});

document.querySelector("#resetBtn").onclick=()=>{
  Object.assign(state,{cabin:0,wallMode:"same",wallTarget:"left",walls:{left:0,back:0,right:0},floor:0,ceiling:0,door:0,handrail:0,cop:0,lighting:0});
  document.querySelectorAll("[data-wall-mode]").forEach((x,i)=>x.classList.toggle("active",i===0));
  document.querySelector("#cabinTitle").textContent=`${manifest.cabin[0].code} · ${manifest.cabin[0].name}`;
  rebuildCabin();renderAll();
};

function setupFirebaseBackground(){
  try{
    const firebaseApp=initializeApp(firebaseConfig);
    const db=getFirestore(firebaseApp);
    const auth=getAuth(firebaseApp);
    onAuthStateChanged(auth,u=>{cloudStatus.textContent=u?"Firebase: signed in":"Firebase: guest"});
    // Firebase is deliberately background-only; it can never block the 3D preview.
    getDocs(collection(db,"materials")).then(snap=>{
      const cloud={};snap.forEach(d=>cloud[d.id]=d.data());
      if(Object.keys(cloud).length){
        const grouped={...library};
        for(const item of Object.values(cloud)){
          const cat=item.category==="wall"?"walls":item.category;
          if(!grouped[cat])continue;
          const idx=grouped[cat].findIndex(x=>x.code===item.code);
          if(idx>=0)grouped[cat][idx]={...grouped[cat][idx],...item,file:item.file||grouped[cat][idx].file,name:item.name||grouped[cat][idx].name};
        }
        library=grouped;renderAll();rebuildCabin();
      }
      cloudStatus.textContent="Firebase: connected";
    }).catch(()=>cloudStatus.textContent="Firebase: local demo");
  }catch(e){cloudStatus.textContent="Firebase: local demo"}
}

function boot(){
  showLoading(true);
  try{
    rebuildCabin();
    renderAll();
    frameCamera();
    showLoading(false);
    // Let the UI paint first, then start Firebase.
    setTimeout(setupFirebaseBackground,80);
  }catch(e){
    console.error(e);showLoading(false);cloudStatus.textContent="Firebase: local demo";
  }
}

addEventListener("resize",frameCamera,{passive:true});
if("ResizeObserver" in window)new ResizeObserver(frameCamera).observe(viewer);
boot();

(function animate(){requestAnimationFrame(animate);renderer.render(scene,camera)})();
