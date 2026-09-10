import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

/*
  ELEVATOR CONFIGURATOR — CABIN V8
  - Rebuilt cabin geometry to look like a real showroom elevator.
  - No handrail.
  - No COP.
  - No round spot lights.
  - Showroom-style recessed ceiling with decorative CNC-inspired center panel, halo LED and downlights.
  - Procedural material textures are used for the demo, so the current
    floor PNG assets cannot distort the 3D floor.
  - Keep this file synchronized with the Standard V3 index.html/style.css.
*/

const DIM = { w: 1.4, d: 1.2, h: 2.4 };
const $ = id => document.getElementById(id);

const catalog = {
  cabins: [
    ["GV-001","Basic Hairline Stainless"],
    ["GV-002","Black Luxury"],
    ["GV-003","Silver Minimal"],
    ["GV-004","Warm Bronze"],
    ["GV-005","Pearl White"],
    ["GV-006","Dark Titanium"]
  ],
  floor: [
    ["S01","Black Stone"],
    ["S02","Grey Stone"],
    ["S03","Light Marble"],
    ["S04","Dark Marble"],
    ["S05","Warm Granite"],
    ["S06","Wood Tone"]
  ]
};

const state = {
  cabin:"GV-001",
  floor:"S01",
  view:"front",
  doorOpen:true
};

let scene, camera, renderer, cabinRoot;
let floorMesh, floorBorder, ceilingPanel, ceilingFrame;
let wallMeshes = {};
let frontFrame;
let ledGroup;
const materialCache = new Map();
const textureCache = new Map();

function toast(text){
  const el = $("toast");
  if(!el) return;
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=>el.classList.remove("show"),1500);
}

/* ---------- Demo material generators ---------- */

function canvasTexture(key, painter, repeatX=1, repeatY=1){
  if(textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  painter(ctx,512,512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX,repeatY);
  tex.anisotropy = Math.min(renderer?.capabilities?.getMaxAnisotropy?.() || 4,8);
  textureCache.set(key,tex);
  return tex;
}

function metalTexture(name){
  const colors = {
    champagne:["#8f7047","#c8a56d","#765937"],
    silver:["#73797d","#d8dcde","#656b6f"],
    black:["#151719","#4a4e51","#0c0d0e"],
    bronze:["#5f4933","#a47e50","#443223"],
    white:["#c7ccd0","#f3f4f4","#a9afb3"],
    titanium:["#30363a","#6d7479","#22272a"]
  };
  const c = colors[name] || colors.champagne;

  return canvasTexture("metal-"+name,(ctx,w,h)=>{
    const g=ctx.createLinearGradient(0,0,w,0);
    g.addColorStop(0,c[0]); g.addColorStop(.48,c[1]); g.addColorStop(1,c[2]);
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);

    ctx.globalAlpha=.18;
    for(let y=0;y<h;y+=3){
      ctx.fillStyle = y%6===0 ? "#ffffff" : "#000000";
      ctx.fillRect(0,y,w,1);
    }
    ctx.globalAlpha=.07;
    for(let x=0;x<w;x+=37){
      ctx.fillStyle="#ffffff";
      ctx.fillRect(x,0,2,h);
    }
    ctx.globalAlpha=1;
  },1,2.2);
}

function floorTexture(code){
  const configs = {
    S01:{base:"#1b1c1e", vein:"#d7d0c4", grid:"#343638", kind:"stone"},
    S02:{base:"#777d82", vein:"#d9dde0", grid:"#686e73", kind:"stone"},
    S03:{base:"#eee8dc", vein:"#b9afa1", grid:"#d5cec2", kind:"stone"},
    S04:{base:"#302b29", vein:"#b8a28e", grid:"#48403c", kind:"stone"},
    S05:{base:"#b59b70", vein:"#665b4b", grid:"#9f8962", kind:"stone"},
    S06:{base:"#7c5032", vein:"#d3a273", grid:"#5e3a25", kind:"wood"}
  };
  const cfg=configs[code] || configs.S01;
  return canvasTexture("floor-"+code,(ctx,w,h)=>{
    ctx.fillStyle=cfg.base;
    ctx.fillRect(0,0,w,h);

    if(cfg.kind==="wood"){
      for(let y=0;y<h;y+=76){
        ctx.fillStyle=(y/76)%2 ? cfg.base : "#865a38";
        ctx.fillRect(0,y,w,72);
        ctx.strokeStyle=cfg.grid;
        ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(0,y+72); ctx.lineTo(w,y+72); ctx.stroke();

        ctx.globalAlpha=.32;
        ctx.strokeStyle=cfg.vein;
        for(let k=0;k<7;k++){
          const yy=y+8+k*9;
          ctx.beginPath();
          ctx.moveTo(0,yy);
          ctx.bezierCurveTo(120,yy-5,250,yy+5,512,yy-2);
          ctx.stroke();
        }
        ctx.globalAlpha=1;
      }
      ctx.strokeStyle=cfg.grid;
      ctx.lineWidth=3;
      for(let x=0;x<w;x+=170){
        ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();
      }
    }else{
      ctx.strokeStyle=cfg.grid;
      ctx.lineWidth=3;
      for(let x=0;x<=w;x+=170){
        ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();
      }
      for(let y=0;y<=h;y+=170){
        ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
      }

      ctx.strokeStyle=cfg.vein;
      ctx.lineWidth=2.2;
      ctx.globalAlpha=.65;
      for(let i=0;i<14;i++){
        const x=(i*73)%w, y=(i*137)%h;
        ctx.beginPath();
        ctx.moveTo(x,y);
        ctx.bezierCurveTo(x+35,y-35,x+55,y+40,x+115,y-12);
        ctx.stroke();
      }
      ctx.globalAlpha=1;
    }
  },1.2,1.2);
}

function matFromTexture(key, texture, rough=.34, metal=.55){
  if(materialCache.has(key)) return materialCache.get(key);
  const mat=new THREE.MeshStandardMaterial({
    map:texture,
    roughness:rough,
    metalness:metal
  });
  materialCache.set(key,mat);
  return mat;
}

function wallMaterial(){
  const palettes = {
    "GV-001":"silver",
    "GV-002":"black",
    "GV-003":"silver",
    "GV-004":"bronze",
    "GV-005":"white",
    "GV-006":"titanium"
  };
  const name=palettes[state.cabin] || "champagne";
  return matFromTexture("wall-"+name,metalTexture(name),.31,.72);
}

function floorMaterial(){
  return matFromTexture("floor-"+state.floor,floorTexture(state.floor),.34,.16);
}

function trimMaterial(){
  return new THREE.MeshStandardMaterial({
    color:0xb6bdc1,
    roughness:.18,
    metalness:.88
  });
}

function darkTrimMaterial(){
  return new THREE.MeshStandardMaterial({
    color:0x262a2d,
    roughness:.2,
    metalness:.75
  });
}

function emissiveMaterial(){
  return new THREE.MeshStandardMaterial({
    color:0xffffff,
    emissive:0xffffff,
    emissiveIntensity:2.5,
    roughness:.18,
    metalness:0
  });
}

function box(w,h,d,material){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  m.castShadow=true;
  m.receiveShadow=true;
  return m;
}

/* ---------- Cabin geometry ---------- */

function clearGroup(group){
  while(group.children.length) group.remove(group.children[0]);
}

function buildWallPanel(width,height,depth,material){
  const g=new THREE.Group();
  const panel=box(width,height,depth,material);
  g.add(panel);

  const trim=trimMaterial();
  const edge=.012;

  [-width/2+edge/2,width/2-edge/2].forEach(x=>{
    const v=box(.009,height,.012,trim);
    v.position.set(x,0,-depth/2-.008);
    g.add(v);
  });

  const top=box(width,.009,.012,trim);
  top.position.set(0,height/2,-depth/2-.008);
  g.add(top);

  return g;
}

function createCabin(){
  cabinRoot=new THREE.Group();
  scene.add(cabinRoot);

  const wall=wallMaterial();
  const trim=trimMaterial();
  const dark=darkTrimMaterial();

  /* Floor slab */
  floorMesh=box(DIM.w-.07,.055,DIM.d-.07,floorMaterial());
  floorMesh.position.set(0,.028,0);
  cabinRoot.add(floorMesh);

  /* Floor perimeter — real threshold/base feeling */
  floorBorder=new THREE.Group();
  const border=.035;
  const front=box(DIM.w,.065,border,trim);
  front.position.set(0,.055,-DIM.d/2+.025);
  floorBorder.add(front);

  const left=box(border,.065,DIM.d-.03,trim);
  left.position.set(-DIM.w/2+.025,.055,0);
  floorBorder.add(left);

  const right=box(border,.065,DIM.d-.03,trim);
  right.position.set(DIM.w/2-.025,.055,0);
  floorBorder.add(right);

  const back=box(DIM.w,.065,border,trim);
  back.position.set(0,.055,DIM.d/2-.025);
  floorBorder.add(back);

  cabinRoot.add(floorBorder);

  /* Left / right walls */
  wallMeshes.left=buildWallPanel(DIM.d,DIM.h,.038,wall);
  wallMeshes.left.rotation.y=Math.PI/2;
  wallMeshes.left.position.set(-DIM.w/2+.019,DIM.h/2,0);
  cabinRoot.add(wallMeshes.left);

  wallMeshes.right=buildWallPanel(DIM.d,DIM.h,.038,wall);
  wallMeshes.right.rotation.y=Math.PI/2;
  wallMeshes.right.position.set(DIM.w/2-.019,DIM.h/2,0);
  cabinRoot.add(wallMeshes.right);

  /* REAR WALL — ONE SOLID SURFACE
     The rear wall is intentionally a single continuous panel.
     Do not create openings or bright vertical strips here.
     A second very thin surface sits toward the camera so the
     champagne material always covers the background completely. */
  const rear=new THREE.Group();

  const rearBacking=box(DIM.w-.075,DIM.h-.075,.055,wall);
  rearBacking.position.set(0,DIM.h/2,-.010);
  rear.add(rearBacking);

  /* Very subtle three-panel construction.
     These are inset overlays, not gaps. */
  const panelGap=.004;
  const rearW=(DIM.w-.095-panelGap*2)/3;

  for(let i=0;i<3;i++){
    const panel=box(rearW,DIM.h-.105,.010,wall);
    panel.position.set(
      (i-1)*(rearW+panelGap),
      DIM.h/2-.005,
      -.043
    );
    rear.add(panel);
  }

  /* Dark micro-joints instead of white lines */
  const seamMat=darkTrimMaterial();
  for(const x of [-rearW/2-panelGap/2,rearW/2+panelGap/2]){
    const seam=box(.003,DIM.h-.15,.006,seamMat);
    seam.position.set(x,DIM.h/2-.01,-.050);
    rear.add(seam);
  }

  /* Low kick plate */
  const kick=box(DIM.w-.075,.095,.045,trim);
  kick.position.set(0,.078,-.045);
  rear.add(kick);

  rear.position.set(0,0,DIM.d/2-.018);
  cabinRoot.add(rear);
  wallMeshes.back=rear;

  /* IMPORTANT:
     The front is intentionally completely open in the preview.
     No door leaves, glass panels, or white door placeholders are
     created here. */

  /* Front architectural frame — narrow and realistic */
  frontFrame=new THREE.Group();
  const frameT=.045;
  const frameMat=new THREE.MeshStandardMaterial({
    color:0x3d4143,
    roughness:.26,
    metalness:.78
  });

  /* Vertical front corner trims */
  [-DIM.w/2+.028,DIM.w/2-.028].forEach(x=>{
    const v=box(.026,DIM.h,.045,frameMat);
    v.position.set(x,DIM.h/2,DIM.d/2-.025);
    cabinRoot.add(v);
  });

  [-DIM.w/2-frameT/2,DIM.w/2+frameT/2].forEach(x=>{
    const v=box(frameT,DIM.h+.04,.08,frameMat);
    v.position.set(x,DIM.h/2,-DIM.d/2-.035);
    frontFrame.add(v);
  });

  const top=box(DIM.w+frameT*2,frameT,.08,frameMat);
  top.position.set(0,DIM.h+frameT/2,-DIM.d/2-.035);
  frontFrame.add(top);

  cabinRoot.add(frontFrame);

  createCeiling();
}

function createCeiling(){
  /*
    ELEVATOR CONFIGURATOR — V9 SHOWROOM CEILING

    Realistic architectural composition:
    1. outer ivory ceiling cassette
    2. recessed shadow tray
    3. central decorative CNC panel
    4. four recessed downlights
    5. warm perimeter LED reveal

    Everything is horizontal (XZ plane) so the ceiling reads correctly
    from the showroom camera.
  */

  const group=new THREE.Group();
  group.name="V9_Showroom_Ceiling";

  const ivory=new THREE.MeshStandardMaterial({
    color:0xf2f0eb,
    roughness:.66,
    metalness:.03
  });

  const ivoryEdge=new THREE.MeshStandardMaterial({
    color:0xd8d5ce,
    roughness:.58,
    metalness:.10
  });

  const shadow=new THREE.MeshStandardMaterial({
    color:0x34383a,
    roughness:.42,
    metalness:.22
  });

  const cnc=new THREE.MeshStandardMaterial({
    color:0xe1ded6,
    roughness:.52,
    metalness:.12
  });

  const darkCnc=new THREE.MeshStandardMaterial({
    color:0x8a8984,
    roughness:.48,
    metalness:.22
  });

  const glow=new THREE.MeshStandardMaterial({
    color:0xfffdf5,
    emissive:0xffe6a8,
    emissiveIntensity:2.4,
    roughness:.20,
    metalness:0
  });

  const y=DIM.h-.045;

  // Outer architectural cassette.
  const outer=box(DIM.w-.06,.045,DIM.d-.06,ivory);
  outer.position.set(0,y,0);
  group.add(outer);

  // Slim perimeter edge.
  const edgeT=.032;
  [
    [DIM.w-.08,edgeT,.035,0,y-.026,-DIM.d/2+.055],
    [DIM.w-.08,edgeT,.035,0,y-.026,DIM.d/2-.055],
    [.035,edgeT,DIM.d-.08,-DIM.w/2+.055,y-.026,0],
    [.035,edgeT,DIM.d-.08,DIM.w/2-.055,y-.026,0]
  ].forEach(([w,h,d,x,yy,z])=>{
    const m=box(w,h,d,ivoryEdge);
    m.position.set(x,yy,z);
    group.add(m);
  });

  // Recessed dark tray.
  const trayW=DIM.w-.23;
  const trayD=DIM.d-.23;
  const tray=box(trayW,.018,trayD,shadow);
  tray.position.set(0,y-.055,0);
  group.add(tray);

  // White inner field.
  const field=box(trayW-.075,.022,trayD-.075,ivory);
  field.position.set(0,y-.043,0);
  group.add(field);

  // Warm LED reveal around the inner field.
  const ledY=y-.030;
  const lx=trayW-.075;
  const lz=trayD-.075;
  [
    [lx,.018,.020,0,ledY,-lz/2],
    [lx,.018,.020,0,ledY,lz/2],
    [.020,.018,lz,-lx/2,ledY,0],
    [.020,.018,lz,lx/2,ledY,0]
  ].forEach(([w,h,d,x,yy,z])=>{
    const m=box(w,h,d,glow);
    m.position.set(x,yy,z);
    group.add(m);
  });

  // Central CNC panel.
  const panelW=DIM.w-.46;
  const panelD=DIM.d-.48;

  const panel=box(panelW,.014,panelD,cnc);
  panel.position.set(0,y-.060,0);
  group.add(panel);

  // Thin decorative border.
  const bw=panelW-.045;
  const bd=panelD-.045;
  const bt=.008;
  [
    [bw,bt,.012,0,y-.050,-bd/2],
    [bw,bt,.012,0,y-.050,bd/2],
    [.012,bt,bd,-bw/2,y-.050,0],
    [.012,bt,bd,bw/2,y-.050,0]
  ].forEach(([w,h,d,x,yy,z])=>{
    const m=box(w,h,d,ivory);
    m.position.set(x,yy,z);
    group.add(m);
  });

  // CNC rosette — all pieces lie in the ceiling's XZ plane.
  const motif=new THREE.Group();
  const motifY=y-.041;

  function addRing(radius,tube){
    const ring=new THREE.Mesh(
      new THREE.TorusGeometry(radius,tube,10,48),
      darkCnc
    );
    ring.rotation.x=Math.PI/2;
    ring.position.set(0,motifY,0);
    motif.add(ring);
  }

  addRing(.155,.010);
  addRing(.105,.008);
  addRing(.052,.006);

  // Eight overlapping petals.
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    const petal=new THREE.Mesh(
      new THREE.TorusGeometry(.082,.010,10,32,Math.PI*1.55),
      darkCnc
    );
    petal.rotation.x=Math.PI/2;
    petal.rotation.z=a;
    petal.position.set(
      Math.cos(a)*.062,
      motifY,
      Math.sin(a)*.062
    );
    motif.add(petal);
  }

  // Four small perforation clusters.
  const dotGeo=new THREE.CylinderGeometry(.009,.009,.010,16);
  for(const sx of [-1,1]){
    for(const sz of [-1,1]){
      for(let r=0;r<2;r++){
        for(let c=0;c<3;c++){
          const dot=new THREE.Mesh(dotGeo,glow);
          dot.position.set(
            sx*(.22+c*.027),
            motifY-.002,
            sz*(.17+r*.030)
          );
          motif.add(dot);
        }
      }
    }
  }
  group.add(motif);

  // Four recessed downlights, physically horizontal.
  [
    [-.43,-.31],[.43,-.31],[-.43,.31],[.43,.31]
  ].forEach(([x,z])=>{
    const bezel=new THREE.Mesh(
      new THREE.CylinderGeometry(.046,.046,.014,32),
      ivoryEdge
    );
    bezel.position.set(x,motifY-.004,z);
    group.add(bezel);

    const lamp=new THREE.Mesh(
      new THREE.CylinderGeometry(.027,.027,.010,32),
      glow
    );
    lamp.position.set(x,motifY-.013,z);
    group.add(lamp);

    const light=new THREE.PointLight(0xffe8bd,.72,.95,2);
    light.position.set(x,DIM.h-.14,z);
    group.add(light);
  });

  cabinRoot.add(group);
}

/* ---------- Rendering ---------- */

function setup3D(){
  const viewer=$("viewer");
  const loading=$("loading");
  if(!viewer) throw new Error("viewer element missing");

  scene=new THREE.Scene();
  scene.background=new THREE.Color(0xf1f3f4);

  camera=new THREE.PerspectiveCamera(38,1,.05,30);

  renderer=new THREE.WebGLRenderer({
    antialias:true,
    alpha:true,
    preserveDrawingBuffer:true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;

  viewer.innerHTML="";
  viewer.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff,0x7e878c,1.35));

  const key=new THREE.DirectionalLight(0xffffff,1.8);
  key.position.set(-2.8,4.2,-4.5);
  key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);
  scene.add(key);

  const fill=new THREE.DirectionalLight(0xd9e4ed,.85);
  fill.position.set(2.5,2,-2);
  scene.add(fill);

  createCabin();
  applyCamera();

  window.addEventListener("resize",applyCamera,{passive:true});
  if(window.ResizeObserver) new ResizeObserver(applyCamera).observe(viewer);

  if(loading) loading.style.display="none";
  animate();
}

function applyCamera(){
  if(!renderer||!camera) return;

  const viewer=$("viewer");
  const r=viewer.getBoundingClientRect();
  if(r.width<10||r.height<10) return;

  renderer.setSize(r.width,r.height,false);
  camera.aspect=r.width/r.height;

  /*
    V9 SHOWROOM VIEW
    Camera is outside the open doorway, slightly above floor level,
    looking gently upward. This makes the recessed ceiling a visible
    architectural element while retaining the whole floor.
  */
  const presets={
    front:{pos:[0,1.58,-4.05],look:[0,1.64,.18],fov:43},
    left:{pos:[-2.55,1.60,-3.65],look:[0,1.55,.18],fov:44},
    right:{pos:[2.55,1.60,-3.65],look:[0,1.55,.18],fov:44},
    ceiling:{pos:[0,2.55,-3.05],look:[0,2.05,.10],fov:45},
    floor:{pos:[0,.95,-3.15],look:[0,.92,.28],fov:45}
  };

  const p=presets[state.view]||presets.front;
  camera.position.set(...p.pos);
  camera.fov=p.fov;
  camera.lookAt(...p.look);
  camera.updateProjectionMatrix();
}

function animate(){
  requestAnimationFrame(animate);
  if(renderer) renderer.render(scene,camera);
}

/* ---------- UI ---------- */

function renderCabins(){
  const targets=[$("cabinStyleGrid"),$("cabinCatalog")].filter(Boolean);
  targets.forEach(container=>{
    container.innerHTML="";
    catalog.cabins.forEach(([code,name])=>{
      const b=document.createElement("button");
      b.type="button";
      b.className="choice-card"+(state.cabin===code?" active":"");
      b.innerHTML=`
        <div class="choice-thumb"></div>
        <div class="choice-name">${name}</div>
        <div class="choice-code">${code}</div>
      `;
      b.onclick=()=>{
        state.cabin=code;
        updateCabinMaterial();
        renderCabins();
        updateSummary();
        toast(`${code} · ${name}`);
      };
      container.appendChild(b);
    });
  });
}

function renderFloorSection(){
  const panel=document.querySelector(".left-panel");
  if(!panel) return;

  panel.innerHTML=`
    <div class="panel cabin-panel">
      <div class="panel-heading"><strong>Chọn mẫu sàn</strong><span>⌄</span></div>
      <div id="floorStyleGrid" class="style-grid"></div>
    </div>
    <div class="panel info-panel">
      <div class="info-title">Thông tin sàn hiện tại</div>
      <div id="floorInfo"></div>
    </div>
  `;

  const grid=$("floorStyleGrid");
  catalog.floor.forEach(([code,name])=>{
    const b=document.createElement("button");
    b.type="button";
    b.className="choice-card"+(state.floor===code?" active":"");
    b.innerHTML=`
      <div class="choice-thumb floor-choice-${code}"></div>
      <div class="choice-name">${name}</div>
      <div class="choice-code">${code}</div>
    `;
    b.onclick=()=>{
      state.floor=code;
      updateFloorMaterial();
      renderFloorSection();
      updateSummary();
      toast(`${code} · ${name}`);
    };
    grid.appendChild(b);
  });

  const current=catalog.floor.find(x=>x[0]===state.floor);
  $("floorInfo").innerHTML=`
    <div><b>Mã sàn</b><span>${state.floor}</span></div>
    <div><b>Mẫu</b><span>${current?current[1]:""}</span></div>
  `;
}

function renderCabinSection(){
  const panel=document.querySelector(".left-panel");
  if(!panel) return;

  panel.innerHTML=`
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

function updateCabinMaterial(){
  const m=wallMaterial();
  ["left","right"].forEach(k=>{
    if(wallMeshes[k]){
      wallMeshes[k].traverse(o=>{
        if(o.isMesh && o!==undefined) o.material=m;
      });
    }
  });
  if(wallMeshes.back){
    wallMeshes.back.traverse(o=>{
      if(o.isMesh) o.material=m;
    });
  }
}

function updateFloorMaterial(){
  if(floorMesh) floorMesh.material=floorMaterial();
}

function updateSummary(){
  const info=$("currentInfo");
  if(!info) return;

  const cabin=catalog.cabins.find(x=>x[0]===state.cabin);
  const floor=catalog.floor.find(x=>x[0]===state.floor);

  info.innerHTML=`
    <div><b>Mã mẫu</b><span>${state.cabin}</span></div>
    <div><b>Kiểu cabin</b><span>${cabin?cabin[1]:""}</span></div>
    <div><b>Kích thước</b><span>1400 × 1200 × 2400 mm</span></div>
    <div><b>Sàn</b><span>${state.floor} · ${floor?floor[1]:""}</span></div>
    <div><b>Thiết kế</b><span>3 vách · trần âm · cửa mở</span></div>
  `;
}

function openSection(section,button){
  document.querySelectorAll(".rail-item").forEach(x=>x.classList.remove("active"));
  if(button) button.classList.add("active");

  if(section==="cabin") return renderCabinSection();
  if(section==="floor") return renderFloorSection();

  toast("Mục này sẽ được mở ở bước tiếp theo");
}

function bindRail(){
  const handler=e=>{
    const button=e.target.closest?.(".rail-item");
    if(!button) return;
    if(e.type==="touchend") e.preventDefault();
    openSection(button.dataset.section,button);
  };
  document.addEventListener("click",handler,true);
  document.addEventListener("touchend",handler,{capture:true,passive:false});
}

function bindViewerControls(){
  const left=$("rotateLeft");
  const right=$("rotateRight");
  const door=$("doorToggle");

  if(left) left.onclick=()=>{
    state.view=state.view==="right"?"front":"left";
    applyCamera();
    toast("Góc nhìn");
  };

  if(right) right.onclick=()=>{
    state.view=state.view==="left"?"front":"right";
    applyCamera();
    toast("Góc nhìn");
  };

  if(door) door.onclick=()=>{
    state.doorOpen=true;
    toast("Mặt trước đang mở");
  };

  document.querySelectorAll(".view-card").forEach(b=>{
    b.addEventListener("click",()=>{
      document.querySelectorAll(".view-card").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      state.view=b.dataset.view||"front";
      applyCamera();
    });
  });
}

function bindActions(){
  const map={
    saveBtn:"Đã lưu cấu hình mẫu",
    quoteBtn:"Demo: yêu cầu báo giá sẵn sàng",
    imageBtn:"Demo: xuất hình ảnh",
    shareBtn:"Demo: chia sẻ mẫu"
  };
  Object.entries(map).forEach(([id,msg])=>{
    const b=$(id);
    if(b) b.onclick=()=>toast(msg);
  });
}

function addFloorThumbStyles(){
  const style=document.createElement("style");
  style.textContent=`
    .floor-choice-S01{background:linear-gradient(135deg,#17181a,#46484b)!important}
    .floor-choice-S02{background:linear-gradient(135deg,#656b70,#b9bec1)!important}
    .floor-choice-S03{background:linear-gradient(135deg,#eee8dc,#c9c0b4)!important}
    .floor-choice-S04{background:linear-gradient(135deg,#2b2725,#62564e)!important}
    .floor-choice-S05{background:linear-gradient(135deg,#a99064,#d2bd91)!important}
    .floor-choice-S06{background:repeating-linear-gradient(90deg,#6d452b 0 34px,#96613a 34px 68px)!important}
  `;
  document.head.appendChild(style);
}

function init(){
  addFloorThumbStyles();
  renderCabinSection();
  updateSummary();
  bindRail();
  bindViewerControls();
  bindActions();

  try{
    setup3D();
  }catch(error){
    console.error("3D initialization error:",error);
    const loading=$("loading");
    if(loading){
      loading.textContent="Lỗi khởi tạo 3D";
      loading.style.display="block";
    }
  }
}

init();

/* V9 — keep the showroom cabin clean: no COP and no handrail. */
function cleanShowroomAccessories(){
  if(!cabinRoot) return;
  cabinRoot.traverse(o=>{
    const n=(o.name||"").toLowerCase();
    if(n.includes("handrail") || n.includes("cop") || n.includes("controlpanel")){
      o.visible=false;
    }
  });
}
requestAnimationFrame(cleanShowroomAccessories);
