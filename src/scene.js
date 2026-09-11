window.SceneManager = (function(){
  function Manager(canvas){
    this.canvas=canvas;
    this.renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,powerPreference:"high-performance"});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    this.renderer.outputEncoding=THREE.sRGBEncoding;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.05;
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color(0xdfe4e6);
    this.camera=new THREE.PerspectiveCamera(42,1,.05,100);
    this.controls=new THREE.OrbitControls(this.camera,canvas);
    this.controls.enableRotate=false;this.controls.enablePan=false;this.controls.enableZoom=false;
    this.resize();
    window.addEventListener("resize",this.resize.bind(this));
    this.animate();
  }
  Manager.prototype.resize=function(){
    var w=Math.max(1,this.canvas.clientWidth),h=Math.max(1,this.canvas.clientHeight);
    this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  };
  Manager.prototype.setCameraPreset=function(view){
    var d=CONFIG.DIMENSIONS,t=new THREE.Vector3(0,d.height*.48,0);
    var p;
    switch(view){
      case "REAR":p.set(0,d.height*.48,-d.depth*1.65);break;
      case "LEFT":p.set(-d.width*1.55,d.height*.48,0);break;
      case "RIGHT":p.set(d.width*1.55,d.height*.48,0);break;
      case "CEILING":p.set(0,d.height*1.60,.02);t.set(0,d.height*.80,0);break;
      case "FLOOR":p.set(0,d.height*.72,.02);t.set(0,.05,0);break;
      default:p=new THREE.Vector3(0,d.height*.48,d.depth*1.70);
    }
    this.camera.position.copy(p);this.camera.lookAt(t);this.controls.target.copy(t);this.controls.update();
  };
  Manager.prototype.animate=function(){
    requestAnimationFrame(this.animate.bind(this));
    this.renderer.render(this.scene,this.camera);
  };
  return Manager;
})();