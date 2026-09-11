window.MaterialManager = (function(){
  var instance = null;
  function Manager(){
    this.textureLoader = new THREE.TextureLoader();
    this.textureCache = new Map();
    this.materialCache = new Map();
    this.failedAssets = new Set();
  }
  Manager.prototype._texture = function(path,isData){
    if(!path) return Promise.resolve(null);
    if(this.failedAssets.has(path)) return Promise.resolve(null);
    if(this.textureCache.has(path)) return this.textureCache.get(path);
    var self=this;
    var p=new Promise(function(resolve){
      self.textureLoader.load(path,function(t){
        t.wrapS=t.wrapT=THREE.RepeatWrapping;
        t.encoding=isData?THREE.LinearEncoding:THREE.sRGBEncoding;
        resolve(t);
      },undefined,function(){
        self.failedAssets.add(path); resolve(null);
      });
    });
    this.textureCache.set(path,p);
    return p;
  };
  Manager.prototype._repeat = function(t,w,h){
    if(!t)return;
    t.repeat.set(Math.max(1,w/0.7),Math.max(1,h/1.8));
  };
  Manager.prototype._fallback = function(id){
    var colors={I01:0xb9bec0,I02:0xe2e5e6,I03:0xb8bdc0,I04:0xb3b8ba,I05:0xb3b8ba,I06:0xd4b04a,I07:0xc6a354,I08:0x8e6654};
    var m=new THREE.MeshStandardMaterial({
      color:colors[id]||0xb9bec0, metalness:.88, roughness:id==="I02"?.14:.27, side:THREE.DoubleSide
    });
    if(id==="I03"||id==="I01"){
      var c=document.createElement("canvas"); c.width=256;c.height=256;
      var x=c.getContext("2d"); x.fillStyle="#b9bec0";x.fillRect(0,0,256,256);
      for(var y=0;y<256;y+=2){x.fillStyle="rgba(255,255,255,"+(0.10+Math.random()*.12)+")";x.fillRect(0,y,256,1);}
      var t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,4);t.encoding=THREE.sRGBEncoding;
      m.map=t;
    }
    return m;
  };
  Manager.prototype.getWallMaterial = function(wall,base,colorTone,etched,w,h){
    var id=wall.id+"|"+base.id+"|"+(colorTone||"DEFAULT")+"|"+etched.id+"|"+w+"|"+h;
    if(this.materialCache.has(id))return Promise.resolve(this.materialCache.get(id));
    var self=this, path=wall.texturePath||null;
    return this._texture(path,false).then(function(t){
      var c=colorTone?new THREE.Color(colorTone):null;
      var m=t?new THREE.MeshStandardMaterial({map:t,metalness:.88,roughness:.25,side:THREE.DoubleSide}):self._fallback(wall.id);
      if(t)self._repeat(t,w,h);
      if(c){m.color.copy(c);}
      if(etched && etched.bumpPath){
        return self._texture(etched.bumpPath,true).then(function(b){
          if(b){self._repeat(b,w,h);m.bumpMap=b;m.bumpScale=.055;}
          self.materialCache.set(id,m);return m;
        });
      }
      self.materialCache.set(id,m);return m;
    });
  };
  Manager.prototype.getFloorMaterial = function(floor,w,d){
    var id=floor.id+"|"+w+"|"+d;
    if(this.materialCache.has(id))return Promise.resolve(this.materialCache.get(id));
    var self=this;
    return this._texture(floor.texturePath,false).then(function(t){
      var m=t?new THREE.MeshStandardMaterial({map:t,metalness:.10,roughness:.62}):
        new THREE.MeshStandardMaterial({color:0xc7c0b6,metalness:.08,roughness:.68});
      if(t)self._repeat(t,w,d);
      self.materialCache.set(id,m);return m;
    });
  };
  Manager.prototype.getInstance=function(){return this;};
  return { getInstance:function(){ if(!instance)instance=new Manager(); return instance; } };
})();