import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const DIM={w:1.4,d:1.2,h:2.4};
const ASSET="./assets/";
const catalog={
 cabins:[
  {code:"GV-001",name:"Champagne Classic"},
  {code:"GV-002",name:"Black Luxury"},
  {code:"GV-003",name:"Silver Minimal"}
 ],
 walls:[
  ["I01","Champagne Gold"],["I02","Mirror Silver"],["I03","Hairline Silver"],["I04","Dark Titanium"],
  ["I05","Rose Gold"],["I06","Black Mirror"],["I07","Warm Bronze"],["I08","Pearl White"]
 ],
 floor:[["S01","Black Stone"],["S02","Grey Stone"],["S03","Light Marble"],["S04","Dark Marble"],["S05","Warm Granite"],["S06","Wood Tone"]],
 ceiling:[["T01","Square Light"],["T02","Linear Light"],["T03","Gold Frame"],["T04","Black Frame"],["T05","White Minimal"],["T06","Star Light"]],
 doors:[["C01","Champagne"],["C02","Silver"],["C03","Black"],["C04","Rose Gold"],["C05","Bronze"],["C06","Mirror"]],
 handrail:[["H01","Round Silver"],["H02","Round Gold"],["H03","Black"],["H04","Wood"]],
 cop:[["P01","Slim Silver"],["P02","Black Glass"],["P03","Gold Frame"],["P04","Full Height"]],
 lighting:[["L01","Neutral"],["L02","Warm"],["L03","Cool"],["L04","Accent"]]
};

const state={
 cabin:"GV-001",wallMode:"same",wallTarget:"back",
 walls:{left:"I01",back:"I01",right:"I01"},
 floor:"S01",ceiling:"T01",door:"C01",handrail:"H01",cop:"P01",lighting:"L01"
};

const $=id=>document.getElementById(id);
const viewer=$("viewer"),loading=$("loading");
let scene,camera,renderer,cabinRoot;
let wallMeshes={},floorMesh,ceilingMesh,doorFrame,railMesh,copMesh,lightRig;
const textureCache=new Map();
let toastTimer;

function asset(category,code){return `${ASSET}${category}/${code}.png`;}

function toast(text){
 const el=$("toast"); if(!el)return;
 el.textContent=text;el.classList.add("show");
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),1600);
}

function makeTexture(path){
 if(textureCache.has(path))return textureCache.get(path);
 const t=new THREE.TextureLoader().load(path,
   ()=>{},
   undefined,
   ()=>console.warn("Texture unavailable:",path)
 );
 t.colorSpace=THREE.SRGBColorSpace;
 t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;
 textureCache.set(path,t);
 return t;
}

function texturedMat(category,code,rough=.42,metal=.65){
 return new THREE.MeshStandardMaterial({
  map:makeTexture(asset(category,code)),
  color:0xffffff,roughness:rough,metalness:metal
 });
}
function mat(color,rough=.4,metal=.2){
 return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
}
function box(w,h,d,m){
 const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
 o.castShadow=true;o.receiveShadow=true;return o;
}

function createCabin(){
 cabinRoot=new THREE.Group();scene.add(cabinRoot);

 floorMesh=box(DIM.w,.045,DIM.d,texturedMat("floor",state.floor,.62,.08));
 floorMesh.position.y=.0225;cabinRoot.add(floorMesh);

 const wt=.035;
 wallMeshes.left=box(wt,DIM.h,DIM.d,texturedMat("walls",state.walls.left));
 wallMeshes.left.position.set(-DIM.w/2+wt/2,DIM.h/2,0);cabinRoot.add(wallMeshes.left);

 wallMeshes.back=box(DIM.w,DIM.h,wt,texturedMat("walls",state.walls.back));
 wallMeshes.back.position.set(0,DIM.h/2,DIM.d/2-wt/2);cabinRoot.add(wallMeshes.back);

 wallMeshes.right=box(wt,DIM.h,DIM.d,texturedMat("walls",state.walls.right));
 wallMeshes.right.position.set(DIM.w/2-wt/2,DIM.h/2,0);cabinRoot.add(wallMeshes.right);

 ceilingMesh=box(DIM.w-.10,.06,DIM.d-.10,texturedMat("ceiling",state.ceiling,.55,.15));
 ceilingMesh.position.y=DIM.h-.055;cabinRoot.add(ceilingMesh);

 // Open front frame only — no door leaves in the preview.
 updateDoorFrame();
 railMesh=createHandrail();cabinRoot.add(railMesh);
 copMesh=createCOP();cabinRoot.add(copMesh);

 lightRig=new THREE.Group();cabinRoot.add(lightRig);
 updateLighting();
}

function updateDoorFrame(){
 if(doorFrame)cabinRoot.remove(doorFrame);
 const colors={C01:0xc9b18b,C02:0xbec3c8,C03:0x202124,C04:0xc78e83,C05:0x9c7751,C06:0xbec3c8};
 const m=mat(colors[state.door]||0xbec3c8,.27,.78),g=new THREE.Group(),t=.038;
 [-DIM.w/2+t/2,DIM.w/2-t/2].forEach(x=>{
  const p=box(t,DIM.h,.05,m);p.position.set(x,DIM.h/2,-DIM.d/2-.07);g.add(p);
 });
 const h=box(DIM.w,t,.05,m);h.position.set(0,DIM.h-t/2,-DIM.d/2-.07);g.add(h);
 doorFrame=g;cabinRoot.add(g);
}

function createHandrail(){
 const g=new THREE.Group();
 const colors={H01:0xc8cbd0,H02:0xd5b77c,H03:0x202020,H04:0x7b5235};
 const m=mat(colors[state.handrail]||0xc8cbd0,.22,.7);
 const b=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,.92,24),m);
 b.rotation.z=Math.PI/2;b.position.set(0,1.05,DIM.d/2-.075);g.add(b);
 [-.46,.46].forEach(x=>{
  const p=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.17,20),m);
  p.position.set(x,.965,DIM.d/2-.075);g.add(p);
 });
 return g;
}

function createCOP(){
 const g=new THREE.Group();
 const colors={P01:0xd5d7da,P02:0x18191b,P03:0xd4b16f,P04:0x202226};
 const m=mat(colors[state.cop]||0x202226,.28,.62);
 const w=state.cop==="P04"?.16:.11,h=state.cop==="P04"?.88:.48;
 const p=box(w,h,.035,m);p.position.set(DIM.w/2-.075,1.28,-.03);g.add(p);
 const s=box(w*.64,h*.18,.012,mat(0x071014,.16,.35));
 s.position.set(DIM.w/2-.075,1.39,-.055);g.add(s);
 return g;
}

function updateMaterials(){
 ["left","back","right"].forEach(side=>{
  wallMeshes[side].material=texturedMat("walls",state.walls[side]);
 });
 floorMesh.material=texturedMat("floor",state.floor,.62,.08);
 ceilingMesh.material=texturedMat("ceiling",state.ceiling,.55,.15);
 if(railMesh){cabinRoot.remove(railMesh);railMesh=createHandrail();cabinRoot.add(railMesh);}
 if(copMesh){cabinRoot.remove(copMesh);copMesh=createCOP();cabinRoot.add(copMesh);}
 updateDoorFrame();updateLighting();
}

function updateLighting(){
 if(!lightRig)return;
 while(lightRig.children.length)lightRig.remove(lightRig.children[0]);
 const p={
  L01:[0xffffff,1.45],L02:[0xffdfad,1.55],L03:[0xddeaff,1.5],L04:[0xf0d5ff,1.65]
 }[state.lighting]||[0xffffff,1.45];

 [[-.43,-.30],[.43,-.30],[-.43,.30],[.43,.30]].forEach(([x,z])=>{
  const panel=box(.20,.012,.045,mat(p[0],.15,.05));
  panel.position.set(x,2.29,z);lightRig.add(panel);
  const l=new THREE.PointLight(p[0],p[1],1.0,2);
  l.position.set(x,2.18,z);lightRig.add(l);
 });
}

function setup3D(){
 scene=new THREE.Scene();
 scene.background=new THREE.Color(0xf1f3f4);

 camera=new THREE.PerspectiveCamera(42,1,.05,30);

 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 viewer.innerHTML="";
 viewer.appendChild(renderer.domElement);

 scene.add(new THREE.HemisphereLight(0xffffff,0xb7bec4,1.65));

 const key=new THREE.DirectionalLight(0xffffff,2.15);
 key.position.set(-2.5,4.5,-4.5);key.castShadow=true;
 key.shadow.mapSize.set(1024,1024);scene.add(key);

 const fill=new THREE.DirectionalLight(0xdde6f0,1.05);
 fill.position.set(3,2,-2);scene.add(fill);

 createCabin();
 applyCamera();

 window.addEventListener("resize",applyCamera,{passive:true});
 if(window.ResizeObserver)new ResizeObserver(applyCamera).observe(viewer);

 loading.style.display="none";
 animate();
}

function applyCamera(){
 if(!renderer||!camera)return;
 const r=viewer.getBoundingClientRect();
 if(r.width<10||r.height<10)return;
 renderer.setSize(r.width,r.height,false);
 camera.aspect=r.width/r.height;

 const portrait=r.height>r.width*1.10;
 if(portrait){
  camera.position.set(.34,1.38,-5.90);
  camera.fov=44;
 }else{
  camera.position.set(.46,1.40,-5.35);
  camera.fov=40;
 }
 camera.lookAt(0,1.10,.12);
 camera.updateProjectionMatrix();
}

function animate(){
 requestAnimationFrame(animate);
 if(renderer)renderer.render(scene,camera);
}

function renderCabins(){
 const el=$("cabinChoices");if(!el)return;el.innerHTML="";
 catalog.cabins.forEach(c=>{
  const b=document.createElement("button");b.type="button";
  b.className="choice-card"+(state.cabin===c.code?" active":"");
  b.innerHTML=`<div class="choice-thumb"></div><div class="choice-name">${c.name}</div><div class="choice-code">${c.code}</div>`;
  b.onclick=()=>{state.cabin=c.code;renderCabins();updateSummary();toast(c.code);};
  el.appendChild(b);
 });
}

function renderWalls(){
 document.querySelectorAll("[data-wall-mode]").forEach(b=>b.classList.toggle("active",b.dataset.wallMode===state.wallMode));
 const zones=$("wallZones");if(zones){
  zones.innerHTML="";
  [["left","Vách trái"],["back","Vách sau"],["right","Vách phải"]].forEach(([side,label])=>{
   const b=document.createElement("button");b.type="button";
   b.className="wall-zone"+((state.wallMode==="same"||state.wallTarget===side)?" active":"");
   b.textContent=label;b.onclick=()=>{if(state.wallMode!=="same"){state.wallTarget=side;renderWalls();}};
   zones.appendChild(b);
  });
 }
 const el=$("wallMaterials");if(!el)return;el.innerHTML="";
 catalog.walls.forEach(([code,name])=>{
  const b=document.createElement("button");b.type="button";
  const selected=state.wallMode==="same"?state.walls.back===code:state.walls[state.wallTarget]===code;
  b.className="swatch"+(selected?" active":"");
  b.innerHTML=`<div class="swatch-img"><img src="${asset("walls",code)}" alt=""></div><div class="swatch-label">${code} · ${name}</div>`;
  b.onclick=()=>{
   if(state.wallMode==="same")state.walls={left:code,back:code,right:code};
   else state.walls[state.wallTarget]=code;
   updateMaterials();renderWalls();updateSummary();
  };
  el.appendChild(b);
 });
}

function renderGrid(id,items,category,key){
 const el=$(id);if(!el)return;el.innerHTML="";
 items.forEach(([code,name])=>{
  const b=document.createElement("button");b.type="button";
  b.className="mini-card"+(state[key]===code?" active":"");
  b.innerHTML=`<div class="mini-thumb"><img src="${asset(category,code)}" alt=""></div><div class="mini-label">${code} · ${name}</div>`;
  b.onclick=()=>{state[key]=code;updateMaterials();renderUI();};
  el.appendChild(b);
 });
}

function updateSummary(){
 const c=catalog.cabins.find(x=>x.code===state.cabin);
 $("configPreview").textContent=state.cabin;
 $("cabinTitle").textContent=`${state.cabin} · ${c?c.name:"Cabin"}`;
 $("modeTitle").textContent=`3 Walls · ${{same:"Same Material",independent:"Independent",pattern:"Pattern"}[state.wallMode]}`;
 $("configSummary").innerHTML=
  `Walls: ${state.walls.left} / ${state.walls.back} / ${state.walls.right}<br>`+
  `Floor ${state.floor} · Ceiling ${state.ceiling} · Door ${state.door}<br>`+
  `Handrail ${state.handrail} · COP ${state.cop} · Light ${state.lighting}`;
}

function renderUI(){
 renderCabins();renderWalls();
 renderGrid("floorChoices",catalog.floor,"floor","floor");
 renderGrid("ceilingChoices",catalog.ceiling,"ceiling","ceiling");
 renderGrid("doorChoices",catalog.doors,"doors","door");
 renderGrid("handrailChoices",catalog.handrail,"handrail","handrail");
 renderGrid("copChoices",catalog.cop,"cop","cop");
 renderGrid("lightingChoices",catalog.lighting,"lighting","lighting");
 updateSummary();
}

document.querySelectorAll("[data-wall-mode]").forEach(b=>b.onclick=()=>{
 state.wallMode=b.dataset.wallMode;
 if(state.wallMode==="same"){
  state.walls.left=state.walls.back;state.walls.right=state.walls.back;
 }
 renderWalls();updateSummary();
});
$("resetBtn").onclick=()=>{
 Object.assign(state,{
  cabin:"GV-001",wallMode:"same",wallTarget:"back",
  walls:{left:"I01",back:"I01",right:"I01"},
  floor:"S01",ceiling:"T01",door:"C01",handrail:"H01",cop:"P01",lighting:"L01"
 });
 renderUI();updateMaterials();toast("Đã đặt lại");
};
$("quoteBtn").onclick=()=>toast("Demo: yêu cầu báo giá sẵn sàng");

renderUI();

try{
 setup3D();
}catch(err){
 console.error("3D initialization error:",err);
 loading.textContent="Lỗi khởi tạo 3D";
 loading.style.display="block";
 $("cloudStatus").textContent="3D error · xem Console";
}

(async()=>{
 try{
  const {initializeApp}=await import("https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js");
  const {getFirestore}=await import("https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js");
  initializeApp({
   apiKey:"AIzaSyATAShAE4dBaU5fPAE1l_5sTe7WaUPumDA",
   authDomain:"elevator-configurator-ac760.firebaseapp.com",
   projectId:"elevator-configurator-ac760",
   storageBucket:"elevator-configurator-ac760.firebasestorage.app",
   messagingSenderId:"509625508976",
   appId:"1:509625508976:web:cda6aecd0d06f069f040b5"
  });
  getFirestore();
  $("cloudStatus").textContent="Firebase connected · demo catalog";
 }catch(e){
  $("cloudStatus").textContent="Local catalog · Firebase optional";
 }
})();
