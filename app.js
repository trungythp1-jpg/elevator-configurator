import * as THREE from "three";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase/firebase-config.js";

const $ = (s) => document.querySelector(s);

const fallback = {
  cabin:[
    {code:"GV-001",name:"Champagne Classic"},
    {code:"GV-002",name:"Titanium Modern"},
    {code:"GV-003",name:"Dark Luxury"}
  ],
  walls:[
    "I01","I02","I03","I04","I05","I06","I07","I08"
  ].map((code,i)=>({code,name:[
    "Inox Champagne Hairline","Inox Titanium Mirror","Inox Silver Hairline",
    "Inox Black Mirror","Inox Rose Hairline","Inox Bronze Mirror",
    "Inox Deep Blue Hairline","Inox Pearl Etched"
  ][i]})),
  floor:["S01","S02","S03","S04","S05","S06"].map((code,i)=>({code,name:[
    "Granite Light","Granite Dark","Black Stone","Warm Stone","Grey Ceramic","Ivory Ceramic"
  ][i]})),
  ceiling:["T01","T02","T03","T04","T05","T06"].map((code,i)=>({code,name:[
    "Silver Ceiling","Black Ceiling","Champagne Ceiling","White Ceiling","Mirror Ceiling","Star Grid Ceiling"
  ][i]})),
  doors:["C01","C02","C03","C04","C05","C06"].map((code,i)=>({code,name:[
    "Two-panel Silver","Two-panel Black","Two-panel Champagne","Center-opening Bronze","Glass Dark","Glass Smoke"
  ][i]})),
  handrail:["H01","H02","H03","H04"].map((code,i)=>({code,name:[
    "Round Silver","Round Black","Round Champagne","Square Bronze"
  ][i]})),
  cop:["P01","P02","P03","P04"].map((code,i)=>({code,name:[
    "Stainless COP","Black Glass COP","Champagne COP","Dark Bronze COP"
  ][i]})),
  lighting:["L01","L02","L03","L04"].map((code,i)=>({code,name:[
    "Warm 3000K","Neutral 4000K","Cool 6000K","Perimeter LED"
  ][i]}))
};

let library = structuredClone(fallback);

const state = {
  cabin:0, wallMode:"same", wallTarget:"left",
  walls:{left:0,back:0,right:0},
  floor:0, ceiling:0, door:0, handrail:0, cop:0, lighting:0
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
const status = $("#cloudStatus");
const toast = $("#toast");

let scene, camera, renderer, cabinGroup;
let wallMeshes = {};
let dynamicLights = [];
let textureCache = new Map();

function item(cat,i){ const a=library[cat]||[]; return a.length ? a[i%a.length] : {code:"",name:""}; }
function path(cat,code){ return `./assets/${cat}/${code}.png`; }

function showToast(message){
  toast.textContent=message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer=setTimeout(()=>toast.classList.remove("show"),1800);
}

function mat(cat,index,rough=.45,metal=.65){
  const x=item(cat,index);
  const m=new THREE.MeshStandardMaterial({
    color:COLORS[x.code] ?? 0x888888,
    roughness:rough, metalness:metal
  });
  const url=path(cat,x.code);
  if(!textureCache.has(url)){
    const tex=new THREE.TextureLoader().load(url,undefined,undefined,()=>{});
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.repeat.set(cat==="walls"?1.2:1,cat==="walls"?1.8:1);
    textureCache.set(url,tex);
  }
  m.map=textureCache.get(url);
  m.needsUpdate=true;
  return m;
}

function addBox(name,size,pos,material,parent=cabinGroup){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);
  mesh.name=name; mesh.position.set(...pos); parent.add(mesh); return mesh;
}

function init3D(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0xf1f5f3);

  camera=new THREE.PerspectiveCamera(35,1,.05,100);
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor(0xf1f5f3,1);
  viewer.innerHTML="";
  viewer.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff,0x78837f,2.3));
  const key=new THREE.DirectionalLight(0xffffff,2.3); key.position.set(2,4,5); scene.add(key);
  const front=new THREE.DirectionalLight(0xffffff,1.2); front.position.set(-2,2,6); scene.add(front);

  cabinGroup=new THREE.Group();
  scene.add(cabinGroup);

  resize3D();
  rebuild();
}

function clearGroup(){
  while(cabinGroup.children.length){
    const o=cabinGroup.children.pop();
    o.traverse?.(n=>{
      if(n.geometry)n.geometry.dispose();
      if(n.material && !Array.isArray(n.material)) n.material.dispose?.();
    });
  }
  wallMeshes={};
  dynamicLights.forEach(l=>scene.remove(l));
  dynamicLights=[];
}

function rebuild(){
  clearGroup();

  // Real cabin dimensions: W 1400 / D 1200 / H 2400 mm.
  // Scene scale: 1 unit = 1000 mm.
  const W=1.40,D=1.20,H=2.40,t=.045;
  const floorT=.055;

  addBox("floor",[W,D,floorT],[0,0,floorT/2],mat("floor",state.floor,.72,.18));

  wallMeshes.back=addBox("back",[W,t,H],[0,D/2-t/2,H/2],mat("walls",state.walls.back,.42,.72));
  wallMeshes.left=addBox("left",[t,D,H],[-W/2+t/2,0,H/2],mat("walls",state.walls.left,.42,.72));
  wallMeshes.right=addBox("right",[t,D,H],[W/2-t/2,0,H/2],mat("walls",state.walls.right,.42,.72));

  addBox("ceiling",[W,D,t],[0,0,H-t/2],mat("ceiling",state.ceiling,.34,.72));

  // Front frame only. No door leaf: user wants direct view into cabin.
  const frameMat=mat("doors",state.door,.28,.76);
  const fs=.055;
  addBox("frameL",[fs,.055,H],[-W/2+fs/2,-D/2+.025,H/2],frameMat);
  addBox("frameR",[fs,.055,H],[W/2-fs/2,-D/2+.025,H/2],frameMat);
  addBox("frameT",[W,.055,fs],[0,-D/2+.025,H-fs/2],frameMat);

  // Handrail: back wall horizontal.
  const railMat=mat("handrail",state.handrail,.25,.82);
  const rail=new THREE.Mesh(new THREE.CylinderGeometry(.026,.026,.88,24),railMat);
  rail.rotation.z=Math.PI/2; rail.position.set(0,D/2-.075,1.12); cabinGroup.add(rail);

  // COP on right wall.
  const copMat=mat("cop",state.cop,.27,.72);
  const cop=addBox("cop",[.26,.045,.58],[W/2-.10,-.02,1.20],copMat);
  cop.rotation.y=Math.PI/2;

  // Ceiling visual panel + lights.
  const panelMat=new THREE.MeshStandardMaterial({color:0x1f2428,roughness:.28,metalness:.55});
  addBox("ceilingPanel",[.76,.52,.018],[0,.04,H-.08],panelMat);

  const lightCode=item("lighting",state.lighting).code;
  const color={L01:0xffd07b,L02:0xfff2d9,L03:0xbfe4ff,L04:0xffffff}[lightCode]||0xffffff;
  const intensity={L01:3.2,L02:3.0,L03:2.8,L04:3.6}[lightCode]||3;
  [[-.48,-.38],[.48,-.38],[-.48,.34],[.48,.34]].forEach(([x,z])=>{
    const bulb=new THREE.Mesh(
      new THREE.CylinderGeometry(.055,.055,.015,24),
      new THREE.MeshStandardMaterial({color:0xffffff,emissive:color,emissiveIntensity:1.8})
    );
    bulb.rotation.x=Math.PI/2; bulb.position.set(x,z,H-.055); cabinGroup.add(bulb);
    const p=new THREE.PointLight(color,intensity,3.4,2); p.position.set(x,z,H-.15); cabinGroup.add(p);
    dynamicLights.push(p);
  });

  // Subtle rear decorative panel for etched mode.
  if(state.wallMode==="pattern"){
    const pmat=new THREE.MeshStandardMaterial({
      color:0xd7b78e,roughness:.28,metalness:.72,emissive:0x1b1007,emissiveIntensity:.08
    });
    const panel=addBox("etchedPanel",[.82,.018,1.70],[0,D/2-.028,1.30],pmat);
    panel.userData.pattern=true;
    addPatternLines(pmat);
  }

  applyCamera();
}

function addPatternLines(material){
  const g=new THREE.Group();
  const z0=0.55;
  for(let i=0;i<5;i++){
    const geo=new THREE.TorusGeometry(.13,.012,8,32,Math.PI*1.35);
    const m=new THREE.Mesh(geo,material);
    m.rotation.x=Math.PI/2;
    m.position.set(-.22+i*.11,D/2-.04,z0+i*.18);
    g.add(m);
  }
  cabinGroup.add(g);
}

function applyCamera(){
  const r=viewer.getBoundingClientRect();
  if(!r.width||!r.height)return;
  renderer.setSize(r.width,r.height,false);
  camera.aspect=r.width/r.height;

  // Fixed front perspective. Deliberately high + far so the full floor,
  // ceiling and all three walls remain visible.
  const portrait=r.height>r.width*1.15;
  if(portrait){
    camera.position.set(.72,1.88,5.35);
    camera.lookAt(0,1.20,.05);
  }else{
    camera.position.set(.70,1.82,4.75);
    camera.lookAt(0,1.18,.05);
  }
  camera.updateProjectionMatrix();
}

function resize3D(){
  if(renderer)applyCamera();
}

function renderCabins(){
  const el=$("#cabinChoices"); el.innerHTML="";
  library.cabin.forEach((x,i)=>{
    const d=document.createElement("button");
    d.type="button"; d.className=`cabin-card ${i===state.cabin?"active":""}`;
    const bg=i===0?"linear-gradient(120deg,#cbb58c,#eee1ca)":i===1?"linear-gradient(120deg,#8e979f,#e3e7e9)":"linear-gradient(120deg,#22282d,#697176)";
    d.innerHTML=`<div class="cabin-thumb" style="background:${bg}"><span class="cabin-code">${x.code}</span></div><span class="card-label">${x.code} · ${x.name}</span>`;
    d.addEventListener("click",()=>{
      state.cabin=i;
      updateText();
      renderCabins();
      showToast(`${x.code} · ${x.name}`);
    });
    el.appendChild(d);
  });
}

function renderWallModes(){
  document.querySelectorAll("[data-wall-mode]").forEach(b=>{
    b.classList.toggle("active",b.dataset.wallMode===state.wallMode);
  });
}

function renderWalls(){
  const zones=$("#wallZones"); zones.innerHTML="";
  const labels={left:"Vách trái",back:"Vách sau",right:"Vách phải"};
  Object.entries(labels).forEach(([key,label])=>{
    const b=document.createElement("button");
    b.type="button"; b.className=state.wallTarget===key?"active":"";
    b.textContent=`${label} · ${item("walls",state.walls[key]).code}`;
    b.addEventListener("click",()=>{
      state.wallTarget=key; renderWalls();
    });
    zones.appendChild(b);
  });

  const sw=$("#wallMaterials"); sw.innerHTML="";
  library.walls.forEach((x,i)=>{
    const b=document.createElement("button");
    b.type="button";
    b.className=`swatch ${isWallSelected(i)?"active":""}`;
    b.style.backgroundImage=`url("${path("walls",x.code)}")`;
    b.innerHTML=`<small>${x.code}</small>`;
    b.addEventListener("click",()=>{
      if(state.wallMode==="same"||state.wallMode==="pattern"){
        state.walls={left:i,back:i,right:i};
      }else{
        state.walls[state.wallTarget]=i;
      }
      rebuild(); renderWalls(); updateConfig();
    });
    sw.appendChild(b);
  });
}

function isWallSelected(i){
  if(state.wallMode==="same"||state.wallMode==="pattern")return state.walls.left===i;
  return state.walls[state.wallTarget]===i;
}

function renderOptions(cat,id,stateKey){
  const el=$("#"+id); el.innerHTML="";
  library[cat].forEach((x,i)=>{
    const b=document.createElement("button");
    b.type="button"; b.className=`option-card ${state[stateKey]===i?"active":""}`;
    b.innerHTML=`<img src="${path(cat,x.code)}" alt="${x.code}"><span class="card-label">${x.code} · ${x.name}</span>`;
    b.addEventListener("click",()=>{
      state[stateKey]=i; rebuild(); renderOptions(cat,id,stateKey); updateConfig();
    });
    el.appendChild(b);
  });
}

function updateText(){
  const c=item("cabin",state.cabin);
  $("#cabinTitle").textContent=`${c.code} · ${c.name}`;
  const mode=state.wallMode==="same"?"Same Material":state.wallMode==="independent"?"Independent":"Etched Pattern";
  $("#modeTitle").textContent=`3 Walls · ${mode}`;
}

function updateConfig(){
  updateText();
  $("#configPreview").textContent=JSON.stringify({
    cabin:item("cabin",state.cabin).code,
    dimensions:"1400 × 1200 × 2400 mm",
    preview:"fixed / front open",
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
    cabin:0,wallMode:"same",wallTarget:"left",
    walls:{left:0,back:0,right:0},
    floor:0,ceiling:0,door:0,handrail:0,cop:0,lighting:0
  });
  rebuild(); renderAll();
  showToast("Đã reset cấu hình");
}

// Accordion controls use normal buttons and event listeners.
// No canvas overlay is allowed to cover the controls.
document.querySelectorAll("[data-toggle]").forEach(button=>{
  button.addEventListener("click",()=>{
    const name=button.dataset.toggle;
    const panel=document.querySelector(`[data-section="${name}"]`);
    const body=panel.querySelector(".section-body");
    const open=panel.classList.toggle("open");
    body.classList.toggle("hidden",!open);
    const chevron=button.querySelector(".chevron");
    if(chevron)chevron.textContent=open?"⌄":"›";
  });
});

document.querySelectorAll("[data-wall-mode]").forEach(button=>{
  button.addEventListener("click",()=>{
    state.wallMode=button.dataset.wallMode;
    renderWallModes(); renderWalls(); rebuild(); updateConfig();
  });
});

$("#resetBtn").addEventListener("click",reset);
$("#quoteBtn").addEventListener("click",()=>{
  showToast("Cấu hình đã sẵn sàng để báo giá");
});

async function loadManifest(){
  try{
    const r=await fetch("./assets/asset-manifest.json",{cache:"no-store"});
    if(r.ok){
      const data=await r.json();
      if(data && typeof data==="object") library={...library,...data};
    }
  }catch(e){}
}

async function firebaseBackground(){
  try{
    const app=initializeApp(firebaseConfig);
    const db=getFirestore(app);
    status.textContent="Firebase: connecting…";
    const snap=await Promise.race([
      getDocs(collection(db,"materials")),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error("timeout")),5000))
    ]);
    const cloud={};
    snap.forEach(d=>cloud[d.id]=d.data());
    for(const data of Object.values(cloud)){
      const cat=data.category==="wall"?"walls":data.category;
      if(!library[cat])continue;
      const idx=library[cat].findIndex(x=>x.code===data.code);
      if(idx>=0)library[cat][idx]={...library[cat][idx],...data};
    }
    status.textContent="Firebase: connected";
    renderAll(); rebuild();
  }catch(e){
    status.textContent="Local demo";
  }
}

async function boot(){
  try{
    loading.classList.remove("hide");
    await loadManifest();
    init3D();
    renderAll();
    requestAnimationFrame(()=>{
      resize3D();
      loading.classList.add("hide");
    });
    setTimeout(firebaseBackground,150);
  }catch(err){
    console.error(err);
    loading.classList.add("hide");
    status.textContent="Local demo";
  }
}

window.addEventListener("resize",resize3D,{passive:true});
if("ResizeObserver" in window){
  new ResizeObserver(()=>resize3D()).observe(viewer);
}

boot();

function animate(){
  requestAnimationFrame(animate);
  if(renderer&&scene&&camera)renderer.render(scene,camera);
}
animate();
