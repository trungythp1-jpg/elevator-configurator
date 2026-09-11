window.LightingManager = (function(){
  function Manager(scene){
    this.scene=scene;
    this.group=new THREE.Group();
    this.group.name="ShowroomLighting";
    scene.add(this.group);
    this.ready=false;
  }
  Manager.prototype.init=function(){
    if(this.ready)return;
    THREE.RectAreaLightUniformsLib.init();
    this.ambient=new THREE.AmbientLight(0xffffff,.58);
    this.key=new THREE.DirectionalLight(0xffffff,.72);
    this.fill=new THREE.DirectionalLight(0xffffff,.36);
    this.rect=new THREE.RectAreaLight(0xffffff,2.0,1.05,.70);
    this.key.position.set(2.2,3.5,2.4);
    this.fill.position.set(-2.0,2.0,-1.8);
    this.rect.position.set(0,2.34,.15);
    this.rect.lookAt(0,0,0);
    this.group.add(this.ambient,this.key,this.fill,this.rect);
    this.ready=true;
  };
  Manager.prototype.updateLighting=function(id){
    this.init();
    var p={
      L01:{c:0xffffff,a:.58,k:.72,f:.36,r:2.0},
      L02:{c:0xeaf5ff,a:.52,k:.72,f:.30,r:1.9},
      L03:{c:0xffd6a0,a:.50,k:.66,f:.36,r:1.75},
      L04:{c:0xf1e8ff,a:.66,k:.78,f:.45,r:2.55}
    }[id] || {c:0xffffff,a:.58,k:.72,f:.36,r:2.0};
    this.ambient.color.set(p.c);this.key.color.set(p.c);this.fill.color.set(p.c);this.rect.color.set(p.c);
    this.ambient.intensity=p.a;this.key.intensity=p.k;this.fill.intensity=p.f;this.rect.intensity=p.r;
  };
  return Manager;
})();