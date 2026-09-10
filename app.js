===== app.js =====

import * as THREE from "three";

const DIM={w:1.4,d:1.2,h:2.4};
const state={cabin:"GV-001",style:"Sang trọng",wall:"I01",floor:"S02",ceiling:"T01",door:"C01",handrail:"H01",cop:"P01",lighting:"L02",doorOpen:true,view:"front",angle:0};

const cabins=[
["GV-001","Tiêu chuẩn","Champagne"],["GV-002","Sang trọng","Silver"],["GV-003","Gia đình","Black"],
["GV-004","Kính toàn cảnh","Glass"],["GV-005","Tải hàng","Bronze"],["GV-006","Theo yêu cầu","Gold"],
["GV-007","Classic Wood","Wood"],["GV-008","Panoramic","Blue Glass"],["GV-009","Luxury Gold","Luxury"]
];
const infoRows=()=>[
["Mã mẫu",state.cabin],["Kiểu cabin",cabins.find(x=>x[0]===state.cabin)?.[1]||"Sang trọng"],
["Vách","Inox vàng hoa văn"],["Sàn","Đá marble đen viền vàng"],["Trần","LED hoa văn"],["Cửa","Inox vàng"],
["Tay vịn","Không"],["Bảng điều khiển","Mẫu tiêu chuẩn"]
];

let scene,camera,renderer,root,doorGroup,wallGroup,ceiling,lights=[];
const viewer=document.querySelector("#viewer");

function mat(color,rough=.4,metal=.4){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});}
function box(w,h,d,m){const x=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);x.castShadow=true;x.receiveShadow=true;return x;}
function createScene(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0xb8c1c5);
 camera=new THREE.PerspectiveCamera(39,1,.05,30);
 renderer=new THREE.WebGLRenderer({antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;
 viewer.appendChild(renderer.domElement);

 scene.add(new THREE.HemisphereLight(0xffffff,0x66727a,1.8));
 const key=new THREE.DirectionalLight(0xffffff,2.8);key.position.set(-2,4,-4);key.castShadow=true;scene.add(key);
 const fill=new THREE.DirectionalLight(0xffe2c0,1.1);fill.position.set(2,2,-3);scene.add(fill);

 root=new THREE.Group();scene.add(root);
 buildCabin(); resize(); requestAnimationFrame(loop);
 window.addEventListener("resize",resize);
 document.querySelector("#loading").style.display="none";
}
function buildCabin(){
 while(root.children.length)root.remove(root.children[0]);
 const wall=mat(0xd3b07a,.27,.72), dark=mat(0x27282b,.38,.7), floorM=mat(0x28282a,.62,.12);
 const inner=mat(0xd7c09b,.32,.6);

 root.add(box(DIM.w,.045,DIM.d,floorM));root.children.at(-1).position.y=.0225;
 const left=box(.035,DIM.h,DIM.d,wall);left.position.set(-DIM.w/2+.0175,DIM.h/2,0);root.add(left);
 const back=box(DIM.w,DIM.h,.035,inner);back.position.set(0,DIM.h/2,DIM.d/2-.0175);root.add(back);
 const right=box(.035,DIM.h,DIM.d,wall);right.position.set(DIM.w/2-.0175,DIM.h/2,0);root.add(right);
 // decorative vertical panels
 for(const x of [-.62,.62]){
   const deco=box(.16,1.75,.018,dark);deco.position.set(x,1.32,.57);root.add(deco);
   const innerLine=box(.018,1.48,.012,mat(0xd9b86f,.3,.75));innerLine.position.set(x,1.32,.555);root.add(innerLine);
 }
 // ceiling frame and luminous panel
 const cf=box(DIM.w-.10,.055,DIM.d-.10,mat(0x6e4a1f,.3,.75));cf.position.y=2.355;root.add(cf);
 const lp=box(.75,.025,.48,mat(0xfff1d0,.12,.15));lp.position.y=2.39;root.add(lp);
 // lights
 for(const x of [-.46,.46])for(const z of [-.35,.35]){
   const l=new THREE.PointLight(0xffdfad,1.8,.95,2);l.position.set(x,2.31,z);root.add(l);
   const disk=box(.14,.012,.14,mat(0xfff1cf,.1,.1));disk.position.set(x,2.37,z);root.add(disk);
 }
 doorGroup=new THREE.Group();root.add(doorGroup);buildDoor();
 buildRail();buildCOP();
}
function buildDoor(){
 while(doorGroup.children.length)doorGroup.remove(doorGroup.children[0]);
 const dm=mat(0xc8a76b,.25,.8), glass=mat(0x9a784c,.22,.65);
 if(state.doorOpen){
   // door leaves parked at the sides, keeping the cabin view open
   for(const x of [-.54,.54]){const p=box(.06,2.2,.028,dm);p.position.set(x,1.1,-.62);doorGroup.add(p)}
 }else{
   for(const x of [-.33,.33]){const p=box(.325,2.2,.03,glass);p.position.set(x,1.1,-.62);doorGroup.add(p)}
 }
}
function buildRail(){
 const rmat=mat(0xc7a35f,.22,.8);const bar=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.82,20),rmat);bar.rotation.z=Math.PI/2;bar.position.set(0,1.05,.565);root.add(bar);
}
function buildCOP(){
 const p=box(.11,.52,.03,mat(0x191b1d,.25,.65));p.position.set(.61,1.25,-.015);root.add(p);
 const s=box(.075,.08,.012,mat(0x08131a,.12,.35));s.position.set(.61,1.38,-.035);root.add(s);
}
function resize(){
 const r=viewer.getBoundingClientRect();if(!r.width||!r.height)return;
 renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;
 const portrait=r.height>r.width*1.1;
 camera.position.set(state.angle*.85,1.34,portrait?-5.45:-5.05);
 camera.lookAt(0,1.12,.12);camera.updateProjectionMatrix();
}
function loop(){requestAnimationFrame(loop);if(renderer)renderer.render(scene,camera)}

function renderCabinStyles(){
 const el=document.querySelector("#cabinStyleGrid");el.innerHTML="";
 [["Tiêu chuẩn","GV-001"],["Sang trọng","GV-002"],["Gia đình","GV-003"],["Kính toàn cảnh","GV-004"],["Tải hàng","GV-005"],["Theo yêu cầu","GV-006"]].forEach(([name,code],i)=>{
   const b=document.createElement("button");b.className="style-card"+(state.style===name?" active":"");b.innerHTML=`<div class="style-thumb"></div><div class="style-name">${name}</div>`;
   b.onclick=()=>{state.style=name;state.cabin=code;renderAll();toast(`Đã chọn ${name}`)};el.appendChild(b);
 });
}
function renderCatalog(){
 const el=document.querySelector("#cabinCatalog");el.innerHTML="";
 cabins.forEach(([code,name])=>{
   const b=document.createElement("button");b.className="catalog-card"+(state.cabin===code?" active":"");
   b.innerHTML=`<div class="catalog-thumb"></div><div class="catalog-name">${code}</div>`;
   b.onclick=()=>{state.cabin=code;renderCatalog();renderInfo();toast(`Đã chọn ${code}`)};el.appendChild(b);
 });
}
function renderInfo(){
 document.querySelector("#currentInfo").innerHTML=infoRows().map(([a,b])=>`<div class="info-row"><b>${a}</b><span>${b}</span></div>`).join("");
}
function renderAll(){renderCabinStyles();renderCatalog();renderInfo();buildCabin();resize();}
function toast(s){const e=document.querySelector("#toast");e.textContent=s;e.classList.add("show");clearTimeout(window._t);window._t=setTimeout(()=>e.classList.remove("show"),1600)}

document.querySelectorAll(".rail-item").forEach(b=>b.onclick=()=>{document.querySelectorAll(".rail-item").forEach(x=>x.classList.remove("active"));b.classList.add("active");toast(`Mục ${b.querySelector("span").textContent}`)});
document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active")});
document.querySelector("#doorToggle").onclick=()=>{state.doorOpen=!state.doorOpen;document.querySelector("#doorText").textContent=state.doorOpen?"Mở cửa":"Đóng cửa";buildDoor()};
document.querySelector("#rotateLeft").onclick=()=>{state.angle=Math.max(-.35,state.angle-.12);resize()};
document.querySelector("#rotateRight").onclick=()=>{state.angle=Math.min(.35,state.angle+.12);resize()};
document.querySelectorAll(".view-card").forEach(b=>b.onclick=()=>{document.querySelectorAll(".view-card").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.view=b.dataset.view;toast(`Góc ${b.textContent.trim()}`)});
document.querySelector("#saveBtn").onclick=()=>toast("Đã lưu cấu hình mẫu");
document.querySelector("#quoteBtn").onclick=()=>toast("Đã tạo yêu cầu báo giá");
document.querySelector("#imageBtn").onclick=()=>toast("Demo: chức năng tải ảnh sẵn sàng");
document.querySelector("#shareBtn").onclick=()=>toast("Demo: chia sẻ mẫu sẵn sàng");

renderAll();
try{createScene()}catch(e){console.error(e);document.querySelector("#loading").textContent="Không thể khởi tạo 3D";}
