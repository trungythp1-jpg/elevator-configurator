import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

// ELEVATOR CONFIGURATOR — REALISTIC CABIN BASELINE
// Góc nhìn cố định: nhìn thẳng vào cabin, hơi thấp hơn trần để thấy sàn + trần.
// Cabin Basic mặc định: inox hairline sáng, trần âm nhiều lớp màu trắng/ivory,
// panel CNC trung tâm, LED hắt quanh viền, downlight. Không tay vịn / không COP.

const DIM = { w: 1.4, d: 1.2, h: 2.4 };
const ASSET = "./assets/";

const catalog = {
  cabins: [
    { code:"GV-001", name:"Basic Hairline Stainless" },
    { code:"GV-002", name:"Black Luxury" },
    { code:"GV-003", name:"Silver Minimal" },
    { code:"GV-004", name:"Champagne Classic" },
    { code:"GV-005", name:"Warm Bronze" },
    { code:"GV-006", name:"White Premium" }
  ],
  walls: [
    ["I01","Champagne Gold"],["I02","Mirror Silver"],["I03","Hairline Silver"],["I04","Dark Titanium"],
    ["I05","Rose Gold"],["I06","Black Mirror"],["I07","Warm Bronze"],["I08","Pearl White"]
  ],
  floor: [["S01","Black Stone"],["S02","Grey Stone"],["S03","Light Marble"],["S04","Dark Marble"],["S05","Warm Granite"],["S06","Wood Tone"]],
  ceiling: [["T01","CNC Flower White"],["T02","Linear White"],["T03","Gold Frame"],["T04","Black Frame"],["T05","White Minimal"],["T06","Star Light"]],
  doors: [["C01","Champagne"],["C02","Silver"],["C03","Black"],["C04","Rose Gold"],["C05","Bronze"],["C06","Mirror"]],
  lighting: [["L01","Neutral"],["L02","Warm"],["L03","Cool"],["L04","Accent"]]
};

const state = {
  cabin:"GV-001",
  walls:{ left:"I03", back:"I03", right:"I03" },
  floor:"S04",
  ceiling:"T01",
  door:"C02",
  lighting:"L01"
};

const $ = id => document.getElementById(id);
const viewer = $("viewer");
const loading = $("loading");

let scene, camera, renderer, cabinRoot;
let wallMeshes = {}, floorMesh, ceilingAssembly, doorFrame, lightRig;
const textureCache = new Map();

function asset(category, code){ return `${ASSET}${category}/${code}.png`; }

function toast(text){
  const el = $("toast");
  if(!el) return;
  el.textContent = text;
  el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),1600);
}

function makeTexture(path){
  if(textureCache.has(path)) return textureCache.get(path);
  const texture = new THREE.TextureLoader().load(path, undefined, undefined, ()=>console.warn("Texture unavailable:",path));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(path,texture);
  return texture;
}

function texturedMat(category,code,roughness=.42,metalness=.65){
  return new THREE.MeshStandardMaterial({
    map:makeTexture(asset(category,code)),
    color:0xffffff,
    roughness,
    metalness
  });
}

function solidMat(color,roughness=.4,metalness=.2){
  return new THREE.MeshStandardMaterial({color,roughness,metalness});
}

function box(w,h,d,material){
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createPanelSeam(x,y,z,w,h,d,vertical=true){
  const mat = solidMat(0x687078,.27,.7);
  const seam = box(vertical ? .006 : w, vertical ? h : .006, d,mat);
  seam.position.set(x,y,z);
  cabinRoot.add(seam);
  return seam;
}

function createCabin(){
  cabinRoot = new THREE.Group();
  scene.add(cabinRoot);

  // Floor: thin structural slab + inset visible surface.
  floorMesh = box(DIM.w-.055,.035,DIM.d-.055,texturedMat("floor",state.floor,.56,.12));
  floorMesh.position.y=.022;
  cabinRoot.add(floorMesh);

  const floorBorder = solidMat(0x555b60,.28,.7);
  const frontThreshold = box(DIM.w-.02,.045,.055,floorBorder);
  frontThreshold.position.set(0,.035,-DIM.d/2+.025);
  cabinRoot.add(frontThreshold);

  const wallT=.028;
  const wallY=DIM.h/2;

  wallMeshes.left = box(wallT,DIM.h-.10,DIM.d-.06,texturedMat("walls",state.walls.left,.34,.78));
  wallMeshes.left.position.set(-DIM.w/2+wallT/2,wallY,.015);
  cabinRoot.add(wallMeshes.left);

  wallMeshes.back = box(DIM.w-.05,DIM.h-.10,wallT,texturedMat("walls",state.walls.back,.34,.78));
  wallMeshes.back.position.set(0,wallY,DIM.d/2-wallT/2-.02);
  cabinRoot.add(wallMeshes.back);

  wallMeshes.right = box(wallT,DIM.h-.10,DIM.d-.06,texturedMat("walls",state.walls.right,.34,.78));
  wallMeshes.right.position.set(DIM.w/2-wallT/2,.0+wallY,.015);
  cabinRoot.add(wallMeshes.right);

  // Base skirting gives the walls a real elevator-cabin termination.
  const skirting = solidMat(0x73787b,.24,.8);
  [
    [-(DIM.w/2-.035),.095,DIM.d/2-.055,.035,.19,.045],
    [ (DIM.w/2-.035),.095,DIM.d/2-.055,.035,.19,.045],
    [0,.095,DIM.d/2-.045,DIM.w-.07,.19,.035]
  ].forEach(([x,y,z,w,h,d])=>{
    const s=box(w,h,d,skirting); s.position.set(x,y,z); cabinRoot.add(s);
  });

  // Back-wall vertical panel joints — subtle, not oversized lines.
  [-.36,0,.36].forEach(x=>createPanelSeam(x,1.20,DIM.d/2-.038,.006,2.08,.008,true));

  createDoorFrame();
  createRealisticCeiling();
  createLighting();
}

function createDoorFrame(){
  if(doorFrame) cabinRoot.remove(doorFrame);

  const colors={C01:0xb99b70,C02:0x596168,C03:0x171a1d,C04:0xb57d74,C05:0x76533b,C06:0x7f878c};
  const mat=solidMat(colors[state.door]||0x596168,.23,.82);
  const group=new THREE.Group();
  const t=.035;

  // Open-front preview: only jambs + top lintel, no door leaves blocking the cabin.
  [-DIM.w/2+t/2,DIM.w/2-t/2].forEach(x=>{
    const jamb=box(t,DIM.h,.075,mat);
    jamb.position.set(x,DIM.h/2,-DIM.d/2-.025);
    group.add(jamb);
  });
  const top=box(DIM.w,t,.075,mat);
  top.position.set(0,DIM.h-t/2,-DIM.d/2-.025);
  group.add(top);

  doorFrame=group;
  cabinRoot.add(group);
}

function createRealisticCeiling(){
  if(ceilingAssembly) cabinRoot.remove(ceilingAssembly);
  const group=new THREE.Group();

  // Main white/ivory ceiling plane.
  const ivory=solidMat(0xf4f0e7,.58,.05);
  const white=solidMat(0xfafafa,.52,.03);
  const dark=solidMat(0x8c8a84,.48,.08);
  const metal=solidMat(0xb8b5ae,.26,.62);

  const outer=box(DIM.w-.055,.075,DIM.d-.055,ivory);
  outer.position.y=DIM.h-.075;
  group.add(outer);

  // Recessed stepped frame.
  const frameY=DIM.h-.145;
  const strips=[
    [DIM.w-.13,.045,.055,0,frameY,-(DIM.d/2-.11)],
    [DIM.w-.13,.045,.055,0,frameY, (DIM.d/2-.11)],
    [.055,.045,DIM.d-.22,-(DIM.w/2-.065),frameY,0],
    [.055,.045,DIM.d-.22, (DIM.w/2-.065),frameY,0]
  ];
  strips.forEach(([w,h,d,x,y,z])=>{const m=box(w,h,d,white);m.position.set(x,y,z);group.add(m);});

  // Dark recessed cavity behind the CNC panel.
  const recess=box(.82,.028,.58,dark);
  recess.position.set(0,DIM.h-.158,.04);
  group.add(recess);

  // Central CNC decorative panel. Geometry is deliberately geometric/floral,
  // so it remains visible even when no external ceiling texture is loaded.
  const panelFrame=box(.82,.018,.58,metal);
  panelFrame.position.set(0,DIM.h-.122,.04);
  group.add(panelFrame);

  const cncGroup=new THREE.Group();
  const cncMat=solidMat(0xfaf9f5,.38,.04);

  // Four-petal rosette made from flattened rings.
  const petalShape=new THREE.Shape();
  petalShape.moveTo(0,.16);
  petalShape.bezierCurveTo(.16,.18,.22,.08,.22,0);
  petalShape.bezierCurveTo(.22,-.08,.16,-.18,0,-.16);
  petalShape.bezierCurveTo(-.16,-.18,-.22,-.08,-.22,0);
  petalShape.bezierCurveTo(-.22,.08,-.16,.18,0,.16);
  const petalGeo=new THREE.ExtrudeGeometry(petalShape,{depth:.012,bevelEnabled:false});
  [[0,.105,0],[0,-.105,0],[.105,0,Math.PI/2],[-.105,0,Math.PI/2]].forEach(([x,z,rot])=>{
    const p=new THREE.Mesh(petalGeo,cncMat);
    p.rotation.x=-Math.PI/2;
    p.rotation.z=rot;
    p.position.set(x,DIM.h-.102,.04+z);
    cncGroup.add(p);
  });

  const center=new THREE.Mesh(new THREE.CylinderGeometry(.105,.105,.014,48),cncMat);
  center.position.set(0,DIM.h-.101,.04);
  center.rotation.x=Math.PI/2;
  cncGroup.add(center);

  // Small corner perforation motifs.
  [-.30,.30].forEach(x=>[-.20,.20].forEach(z=>{
    for(let i=0;i<3;i++){
      const dot=box(.045,.014,.035,cncMat);
      dot.position.set(x+(x<0?i*.055:-i*.055),DIM.h-.100,z);
      cncGroup.add(dot);
    }
  }));

  group.add(cncGroup);

  // Recessed downlights.
  [[-.46,-.35],[.46,-.35],[-.46,.35],[.46,.35]].forEach(([x,z])=>{
    const ring=new THREE.Mesh(new THREE.CylinderGeometry(.072,.072,.018,32),metal);
    ring.rotation.x=Math.PI/2;
    ring.position.set(x,DIM.h-.095,z);
    group.add(ring);
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(.054,.054,.012,32),white);
    disc.rotation.x=Math.PI/2;
    disc.position.set(x,DIM.h-.102,z);
    group.add(disc);
  });

  cabinRoot.add(group);
  ceilingAssembly=group;
}

function createLighting(){
  if(lightRig) cabinRoot.remove(lightRig);
  lightRig=new THREE.Group();
  cabinRoot.add(lightRig);

  const values={
    L01:[0xfff9ed,2.0],
    L02:[0xffd7a0,2.15],
    L03:[0xe8f1ff,1.95],
    L04:[0xffe0b8,2.35]
  }[state.lighting]||[0xfff9ed,2.0];

  // Ceiling downlights.
  [[-.46,-.35],[.46,-.35],[-.46,.35],[.46,.35]].forEach(([x,z])=>{
    const light=new THREE.PointLight(values[0],values[1],1.15,2);
    light.position.set(x,DIM.h-.24,z);
    light.castShadow=false;
    lightRig.add(light);
  });

  // Soft vertical wall wash: makes the cabin read like a real showroom cabin.
  [[-.60,.8],[.60,.8]].forEach(([x,z])=>{
    const light=new THREE.PointLight(values[0],1.15,.95,2);
    light.position.set(x,1.55,z);
    lightRig.add(light);
  });

  // Hidden warm LED strips around the recessed ceiling edge.
  const ledMat=new THREE.MeshBasicMaterial({color:values[0]});
  const ledY=DIM.h-.175;
  [
    [DIM.w-.22,.012,.025,0,ledY,-(DIM.d/2-.14)],
    [DIM.w-.22,.012,.025,0,ledY, (DIM.d/2-.14)],
    [.025,.012,DIM.d-.28,-(DIM.w/2-.11),ledY,0],
    [.025,.012,DIM.d-.28, (DIM.w/2-.11),ledY,0]
  ].forEach(([w,h,d,x,y,z])=>{
    const led=box(w,h,d,ledMat); led.position.set(x,y,z); lightRig.add(led);
  });
}

function setup3D(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0xf2f4f5);

  camera=new THREE.PerspectiveCamera(43,1,.05,30);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;

  viewer.innerHTML="";
  viewer.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff,0x7c858b,1.8));

  const key=new THREE.DirectionalLight(0xffffff,2.05);
  key.position.set(-2.8,4.8,-4.8);
  key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);
  scene.add(key);

  const fill=new THREE.DirectionalLight(0xe8edf2,1.0);
  fill.position.set(2.5,2.5,-3);
  scene.add(fill);

  createCabin();
  applyCamera();

  window.addEventListener("resize",applyCamera,{passive:true});
  if(window.ResizeObserver)new ResizeObserver(applyCamera).observe(viewer);

  loading.style.display="none";
  animate();
}

function applyCamera(){
  if(!renderer||!camera)return;
  const rect=viewer.getBoundingClientRect();
  if(rect.width<10||rect.height<10)return;

  renderer.setSize(rect.width,rect.height,false);
  camera.aspect=rect.width/rect.height;

  // Negative Z is the open/front side of the cabin.
  // This composition intentionally shows the entire floor and the layered ceiling.
  const portrait=rect.height>rect.width*1.05;
  if(portrait){
    camera.position.set(.12,1.30,-4.75);
    camera.fov=46;
  }else{
    camera.position.set(.14,1.31,-4.35);
    camera.fov=43;
  }

  camera.lookAt(0,1.18,.22);
  camera.updateProjectionMatrix();
}

function animate(){
  requestAnimationFrame(animate);
  if(renderer)renderer.render(scene,camera);
}

function updateSummary(){
  const info=$("currentInfo");
  if(!info)return;
  const cabin=catalog.cabins.find(x=>x.code===state.cabin);
  info.innerHTML=`
    <div><b>Mã mẫu</b><span>${state.cabin}</span></div>
    <div><b>Kiểu cabin</b><span>${cabin?.name||""}</span></div>
    <div><b>Vách</b><span>${state.walls.left} / ${state.walls.back} / ${state.walls.right}</span></div>
    <div><b>Sàn</b><span>${state.floor}</span></div>
    <div><b>Trần</b><span>${state.ceiling}</span></div>
    <div><b>Cửa</b><span>${state.door}</span></div>
  `;
}

function renderCabins(){
  const targets=[$("cabinStyleGrid"),$("cabinCatalog")].filter(Boolean);
  targets.forEach(container=>{
    container.innerHTML="";
    catalog.cabins.forEach(cabin=>{
      const button=document.createElement("button");
      button.type="button";
      button.className="choice-card"+(state.cabin===cabin.code?" active":"");
      button.innerHTML=`<div class="choice-thumb"></div><div class="choice-name">${cabin.name}</div><div class="choice-code">${cabin.code}</div>`;
      button.onclick=()=>{
        state.cabin=cabin.code;
        // GV-001 is the reference Basic cabin. Other demo cards change only the wall tone.
        const defaults={
          "GV-001":["I03","I03","I03","S04","T01"],
          "GV-002":["I06","I06","I06","S01","T04"],
          "GV-003":["I02","I02","I02","S02","T05"],
          "GV-004":["I01","I01","I01","S03","T03"],
          "GV-005":["I07","I07","I07","S05","T03"],
          "GV-006":["I08","I08","I08","S03","T05"]
        }[cabin.code];
        if(defaults){
          [state.walls.left,state.walls.back,state.walls.right,state.floor,state.ceiling]=defaults;
          updateMaterials();
        }
        renderCabins();
        updateSummary();
        toast(cabin.code);
      };
      container.appendChild(button);
    });
  });
}

function updateMaterials(){
  if(!wallMeshes.left)return;
  wallMeshes.left.material=texturedMat("walls",state.walls.left,.34,.78);
  wallMeshes.back.material=texturedMat("walls",state.walls.back,.34,.78);
  wallMeshes.right.material=texturedMat("walls",state.walls.right,.34,.78);
  floorMesh.material=texturedMat("floor",state.floor,.56,.12);
  createRealisticCeiling();
  createDoorFrame();
  createLighting();
  updateSummary();
}

function openSection(section){
  document.querySelectorAll(".rail-item").forEach(x=>x.classList.toggle("active",x.dataset.section===section));

  const left=document.querySelector(".left-panel");
  if(!left)return;

  if(section==="cabin"){
    left.innerHTML=`
      <div class="panel cabin-panel"><div class="panel-heading"><strong>Chọn kiểu cabin</strong><span>⌄</span></div><div id="cabinStyleGrid" class="style-grid"></div></div>
      <div class="panel info-panel"><div class="info-title">Thông tin mẫu hiện tại</div><div id="currentInfo"></div></div>`;
    renderCabins();
    updateSummary();
    return;
  }

  if(section==="floor"){
    left.innerHTML=`
      <div class="panel cabin-panel"><div class="panel-heading"><strong>Chọn mẫu sàn</strong><span>⌄</span></div><div id="floorStyleGrid" class="style-grid"></div></div>
      <div class="panel info-panel"><div class="info-title">Sàn hiện tại</div><div id="currentInfo"></div></div>`;
    renderFloors();
    updateSummary();
    return;
  }

  left.innerHTML=`
    <div class="panel cabin-panel">
      <div class="panel-heading"><strong>${sectionTitle(section)}</strong><span>⌄</span></div>
      <div style="padding:10px 2px 16px;font-size:13px;line-height:1.6;color:#60717b">Khu vực này sẽ được hoàn thiện tiếp theo trên cùng hệ thống 3D.</div>
    </div>`;
}

function sectionTitle(section){
  return {walls:"Chọn vật liệu vách",ceiling:"Chọn kiểu trần",door:"Chọn kiểu cửa",handrail:"Tay vịn",cop:"Bảng điều khiển",lighting:"Ánh sáng",color:"Màu sắc"}[section]||"Tùy chỉnh cabin";
}

function renderFloors(){
  const container=$("floorStyleGrid");
  if(!container)return;
  container.innerHTML="";
  catalog.floor.forEach(([code,name])=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="choice-card"+(state.floor===code?" active":"");
    button.innerHTML=`<div class="choice-thumb" style="background:linear-gradient(145deg,#d7dbdd,#71777a)"></div><div class="choice-name">${name}</div><div class="choice-code">${code}</div>`;
    button.onclick=()=>{
      state.floor=code;
      updateMaterials();
      renderFloors();
      toast(name);
    };
    container.appendChild(button);
  });
}

function bindControls(){
  const left=$("rotateLeft"),right=$("rotateRight"),door=$("doorToggle");
  if(left)left.onclick=()=>toast("Góc nhìn cố định");
  if(right)right.onclick=()=>toast("Góc nhìn cố định");
  if(door)door.onclick=()=>toast("Mặt trước đang mở");

  document.querySelectorAll(".view-card").forEach(button=>button.addEventListener("click",()=>{
    document.querySelectorAll(".view-card").forEach(x=>x.classList.remove("active"));
    button.classList.add("active");
    const label=button.querySelector("span")?.textContent||"Góc nhìn";
    toast(label);
  }));

  const quote=$("quoteBtn"); if(quote)quote.onclick=()=>toast("Demo: yêu cầu báo giá sẵn sàng");
  const save=$("saveBtn"); if(save)save.onclick=()=>toast("Đã lưu cấu hình mẫu");
  const image=$("imageBtn"); if(image)image.onclick=()=>toast("Demo: xuất hình ảnh");
  const share=$("shareBtn"); if(share)share.onclick=()=>toast("Demo: chia sẻ mẫu");
}

// Rail is delegated so it continues to work after panels are swapped.
document.addEventListener("click",event=>{
  const button=event.target.closest?.(".rail-item");
  if(!button)return;
  event.preventDefault();
  openSection(button.dataset.section);
},true);

document.addEventListener("touchend",event=>{
  const button=event.target.closest?.(".rail-item");
  if(!button)return;
  event.preventDefault();
  openSection(button.dataset.section);
},{capture:true,passive:false});

renderCabins();
updateSummary();
bindControls();

try{
  setup3D();
}catch(error){
  console.error("3D initialization error:",error);
  if(loading){loading.textContent="Lỗi khởi tạo 3D";loading.style.display="block";}
}
