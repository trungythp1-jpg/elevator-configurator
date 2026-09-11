window.CabinBuilder = (function(){
  function Builder(scene){
    this.scene=scene;
    this.root=new THREE.Group();
    this.root.name="Cabin";
    scene.add(this.root);
    this.mm=MaterialManager.getInstance();
    this.loader=new THREE.GLTFLoader();
    this.gltfCache=new Map();
    this.door={left:null,right:null,progress:1};
  }
  Builder.prototype.clear=function(){
    var self=this;
    this.root.traverse(function(o){ if(o.isMesh && o.geometry)o.geometry.dispose(); });
    while(this.root.children.length)this.root.remove(this.root.children[0]);
    this.door.left=null;this.door.right=null;
  };
  Builder.prototype.load=function(path){
    if(!path)return Promise.reject(new Error("no asset"));
    if(this.gltfCache.has(path))return this.gltfCache.get(path);
    var self=this;
    var p=new Promise(function(resolve,reject){self.loader.load(path,resolve,undefined,reject);});
    this.gltfCache.set(path,p);return p;
  };
  Builder.prototype.mesh=function(parent,g,m,x,y,z,name){
    var q=new THREE.Mesh(g,m);q.position.set(x,y,z);q.name=name||"Mesh";q.castShadow=true;q.receiveShadow=true;parent.add(q);return q;
  };
  Builder.prototype.build=function(s,token,isCurrent){
    var self=this,d=CONFIG.DIMENSIONS,c=CONFIG.CATALOGS;
    var wl=CONFIG.find("WALLS",s.wallLeft)||c.WALLS[0];
    var wb=CONFIG.find("WALLS",s.wallBack)||c.WALLS[0];
    var wr=CONFIG.find("WALLS",s.wallRight)||c.WALLS[0];
    var base=CONFIG.find("MATERIALS",s.material)||c.MATERIALS[0];
    var etched=CONFIG.find("ETCHEDS",s.etched)||c.ETCHEDS[0];
    var floor=CONFIG.find("FLOORS",s.floor)||c.FLOORS[0];
    var tone=CONFIG.find("COLORS",s.colorTone);
    var hex=s.colorTone==="CUSTOM"?s.customColor:(tone&&tone.hex);
    return Promise.all([
      self.mm.getWallMaterial(wl,base,hex,etched,d.width,d.height),
      self.mm.getWallMaterial(wb,base,hex,etched,d.width,d.height),
      self.mm.getWallMaterial(wr,base,hex,etched,d.depth,d.height),
      self.mm.getFloorMaterial(floor,d.width,d.depth)
    ]).then(function(ms){
      if(!isCurrent(token))return;
      var shell=new THREE.Group();shell.name="InteriorShell";self.root.add(shell);
      var q=.035;
      self.mesh(shell,new THREE.BoxGeometry(d.width,d.height,q),ms[1],0,d.height/2,-d.depth/2,"BackWall");
      self.mesh(shell,new THREE.BoxGeometry(q,d.height,d.depth),ms[0],-d.width/2,d.height/2,0,"LeftWall");
      self.mesh(shell,new THREE.BoxGeometry(q,d.height,d.depth),ms[2],d.width/2,d.height/2,0,"RightWall");
      self.mesh(shell,new THREE.BoxGeometry(d.width,.05,d.depth),ms[3],0,.025,0,"Floor");
      self.ceiling();
      self.door();
      return self.components(s,token,isCurrent);
    });
  };
  Builder.prototype.ceiling=function(){
    var d=CONFIG.DIMENSIONS,g=new THREE.Group();g.name="ArchitecturalCeiling";this.root.add(g);
    var outer=new THREE.MeshStandardMaterial({color:0xf3f0e9,roughness:.72});
    var inner=new THREE.MeshStandardMaterial({color:0xe5e0d6,roughness:.62});
    var dark=new THREE.MeshStandardMaterial({color:0x373a3c,metalness:.5,roughness:.34});
    var cnc=new THREE.MeshStandardMaterial({color:0xb8b0a3,metalness:.32,roughness:.42});
    var glow=new THREE.MeshStandardMaterial({color:0xfff8e8,emissive:0xffe5ad,emissiveIntensity:2.2});
    this.mesh(g,new THREE.BoxGeometry(d.width-.08,.04,d.depth-.08),outer,0,d.height-.06,0,"CeilingOuter");
    this.mesh(g,new THREE.BoxGeometry(d.width-.24,.025,d.depth-.24),dark,0,d.height-.035,0,"ShadowGap");
    this.mesh(g,new THREE.BoxGeometry(d.width-.31,.025,d.depth-.31),inner,0,d.height-.012,0,"CeilingInner");
    this.mesh(g,new THREE.BoxGeometry(d.width*.46,.016,d.depth*.42),cnc,0,d.height+.004,0,"CentralCNC");
    [-.39,.39].forEach(function(x){this.mesh(g,new THREE.BoxGeometry(.028,.012,d.depth-.34),glow,x,d.height+.014,0,"HiddenLED");},this);
  };
  Builder.prototype.door=function(){
    var d=CONFIG.DIMENSIONS,w=d.width*.235,h=d.height*.87,z=d.depth/2-.045;
    var dm=new THREE.MeshStandardMaterial({color:0xbfc3c5,metalness:.88,roughness:.22});
    var fm=new THREE.MeshStandardMaterial({color:0x2b2e31,metalness:.65,roughness:.30});
    var frame=new THREE.Group();frame.name="DoorFrame";this.root.add(frame);
    this.mesh(frame,new THREE.BoxGeometry(.04,h+.04,.055),fm,-d.width/2+.02,h/2,z+.035,"FrameL");
    this.mesh(frame,new THREE.BoxGeometry(.04,h+.04,.055),fm,d.width/2-.02,h/2,z+.035,"FrameR");
    this.mesh(frame,new THREE.BoxGeometry(d.width,.04,.055),fm,0,h+.02,z+.035,"FrameTop");
    this.door.left=this.mesh(this.root,new THREE.BoxGeometry(w,h,.05),dm,-w/2,h/2,z,"DoorLeft");
    this.door.right=this.mesh(this.root,new THREE.BoxGeometry(w,h,.05),dm,w/2,h/2,z,"DoorRight");
  };
  Builder.prototype.components=function(s,token,isCurrent){
    var self=this,d=CONFIG.DIMENSIONS,c=CONFIG.CATALOGS;
    var h=CONFIG.find("HANDRAILS",s.handrail),p=CONFIG.find("COPS",s.cop);
    var jobs=[];
    if(h&&h.id!=="NONE")jobs.push(self.assetOrFallback(h,"Handrail",new THREE.Vector3(0,d.height*.43,-d.depth/2+.08),.78,token,isCurrent));
    if(p&&p.id!=="NONE")jobs.push(self.assetOrFallback(p,"COP",new THREE.Vector3(d.width/2-.08,d.height*.52,0),.65,token,isCurrent));
    return Promise.all(jobs);
  };
  Builder.prototype.assetOrFallback=function(item,name,pos,target,token,isCurrent){
    var self=this;
    if(!item.modelPath)return Promise.resolve(self.fallback(item,name,pos));
    return this.load(item.modelPath).then(function(gltf){
      if(!isCurrent(token))return;
      var g=gltf.scene.clone(true),box=new THREE.Box3().setFromObject(g),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),max=Math.max(size.x,size.y,size.z)||1,sc=target/max;
      g.scale.setScalar(sc);g.position.set(pos.x-center.x*sc,pos.y-center.y*sc,pos.z-center.z*sc);g.name=name+"Asset";
      g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
      self.root.add(g);
    }).catch(function(){ if(isCurrent(token))self.fallback(item,name,pos); });
  };
  Builder.prototype.fallback=function(item,name,pos){
    var g=new THREE.Group();g.name=name+"Fallback";this.root.add(g);
    var m=new THREE.MeshStandardMaterial({color:name==="COP"?0x202326:0xc6c9cb,metalness:.78,roughness:.24});
    if(name==="Handrail"){
      var bar=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,1.0,24),m);bar.rotation.z=Math.PI/2;bar.position.copy(pos);g.add(bar);
    }else{
      var p=new THREE.Mesh(new THREE.BoxGeometry(.12,.55,.035),m);p.position.copy(pos);g.add(p);
    }
  };
  Builder.prototype.setDoorProgress=function(v){
    this.door.progress=Math.max(0,Math.min(1,v));
    if(!this.door.left||!this.door.right)return;
    var d=CONFIG.DIMENSIONS,w=d.width*.235,dist=d.width*.43;
    this.door.left.position.x=-w/2-dist*this.door.progress;
    this.door.right.position.x=w/2+dist*this.door.progress;
  };
  return Builder;
})();