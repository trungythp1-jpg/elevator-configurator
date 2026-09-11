(function(){
  function App(){
    this.state=JSON.parse(JSON.stringify(CONFIG.DEFAULT_STATE));
    this.token=0;this.animation=null;
    this.scene=new SceneManager(document.getElementById("webgl-canvas"));
    this.lighting=new LightingManager(this.scene.scene);
    this.cabin=new CabinBuilder(this.scene.scene);
    this.ui=new UIManager();
  }
  App.prototype.valid=function(raw){
    var s=JSON.parse(JSON.stringify(CONFIG.DEFAULT_STATE));
    if(!raw||typeof raw!=="object"||Array.isArray(raw))return s;
    var groups={cabinModel:"CABIN_MODELS",wallLeft:"WALLS",wallBack:"WALLS",wallRight:"WALLS",material:"MATERIALS",etched:"ETCHEDS",floor:"FLOORS",ceiling:"CEILINGS",handrail:"HANDRAILS",cop:"COPS",lighting:"LIGHTINGS",colorTone:"COLORS"};
    Object.keys(groups).forEach(function(k){var v=raw[k],list=CONFIG.CATALOGS[groups[k]]||[];if(list.some(x=>x.id===v))s[k]=v;});
    if(raw.wallMode==="SAME"||raw.wallMode==="INDEPENDENT")s.wallMode=raw.wallMode;
    if(/^#[0-9a-f]{6}$/i.test(raw.customColor||""))s.customColor=raw.customColor;
    if(raw.doorState==="OPEN"||raw.doorState==="CLOSED")s.doorState=raw.doorState;
    if(s.wallMode==="SAME"){s.wallBack=s.wallLeft;s.wallRight=s.wallLeft;}
    return s;
  };
  App.prototype.loadState=function(){
    var q=new URLSearchParams(location.search).get("config");
    if(q){try{this.state=this.valid(JSON.parse(decodeURIComponent(escape(atob(q)))));return;}catch(e){}}
    var saved=localStorage.getItem("elevator_config_state");
    if(saved){try{this.state=this.valid(JSON.parse(saved));}catch(e){localStorage.removeItem("elevator_config_state");}}
  };
  App.prototype.bind=function(){
    var self=this;
    this.ui.on("camera",v=>self.scene.setCameraPreset(v));
    this.ui.on("select",o=>{
      self.state[o.key]=o.value;
      if(o.key==="wallMode"&&o.value==="SAME"){self.state.wallBack=self.state.wallLeft;self.state.wallRight=self.state.wallLeft;}
      if(o.key==="wallLeft"&&self.state.wallMode==="SAME"){self.state.wallBack=o.value;self.state.wallRight=o.value;}
      self.rebuild();
    });
    this.ui.on("customColor",h=>{self.state.customColor=h;self.rebuild();});
    this.ui.on("door",()=>self.toggleDoor());
    this.ui.on("save",()=>{localStorage.setItem("elevator_config_state",JSON.stringify(self.state));self.ui.toast("Đã lưu cấu hình.");});
    this.ui.on("share",()=>self.share());
    this.ui.on("reset",()=>{self.cancelAnimation();self.state=JSON.parse(JSON.stringify(CONFIG.DEFAULT_STATE));localStorage.removeItem("elevator_config_state");history.replaceState({},document.title,location.pathname);self.rebuild();self.ui.toast("Đã đặt lại cấu hình.");});
    this.ui.on("quote",()=>self.openQuote());
    this.ui.on("closeQuote",()=>self.ui.closeQuote());
    this.ui.on("submitQuote",()=>self.ui.toast("Thông tin báo giá đã được ghi nhận."));
  };
  App.prototype.total=function(){
    var s=this.state,c=CONFIG.CATALOGS,t=0,price=function(g,id){var x=(c[g]||[]).find(x=>x.id===id);return x?x.price:0;};
    t+=price("CABIN_MODELS",s.cabinModel);
    t+=s.wallMode==="SAME"?price("WALLS",s.wallLeft)*3:price("WALLS",s.wallLeft)+price("WALLS",s.wallBack)+price("WALLS",s.wallRight);
    ["MATERIALS","ETCHEDS","FLOORS","CEILINGS","HANDRAILS","COPS","LIGHTINGS"].forEach((g,i)=>t+=price(g,[s.material,s.etched,s.floor,s.ceiling,s.handrail,s.cop,s.lighting][i]));
    return t;
  };
  App.prototype.rebuild=function(){
    var self=this,token=++this.token;
    this.cancelAnimation();this.ui.render(this.state);this.ui.loading(true);this.ui.doorButton(this.state.doorState);this.lighting.updateLighting(this.state.lighting);
    this.cabin.build(this.state,token,function(t){return t===self.token;}).then(function(){if(token!==self.token)return;self.cabin.setDoorProgress(self.state.doorState==="OPEN"?1:0);self.ui.price(self.total());self.ui.loading(false);}).catch(function(e){if(token!==self.token)return;console.error(e);self.ui.price(self.total());self.ui.loading(false);self.ui.toast("Có lỗi khi dựng cấu hình 3D.");});
  };
  App.prototype.cancelAnimation=function(){if(this.animation!==null){cancelAnimationFrame(this.animation);this.animation=null;}};
  App.prototype.toggleDoor=function(){
    var self=this;if(!this.cabin.door.left||!this.cabin.door.right)return;
    this.cancelAnimation();var from=this.cabin.door.progress,to=this.state.doorState==="OPEN"?0:1,start=performance.now(),dur=650;
    this.state.doorState=to===1?"OPEN":"CLOSED";this.ui.doorButton(this.state.doorState);
    function step(now){var x=Math.min(1,(now-start)/dur),e=x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;self.cabin.setDoorProgress(from+(to-from)*e);if(x<1)self.animation=requestAnimationFrame(step);else self.animation=null;}
    this.animation=requestAnimationFrame(step);
  };
  App.prototype.share=async function(){
    try{
      var encoded=btoa(unescape(encodeURIComponent(JSON.stringify(this.state)))),url=location.origin+location.pathname+"?config="+encoded;
      if(!navigator.clipboard)throw new Error("clipboard");
      await navigator.clipboard.writeText(url);this.ui.toast("Đã sao chép liên kết chia sẻ.");
    }catch(e){this.ui.toast("Không thể sao chép liên kết trên trình duyệt này.");}
  };
  App.prototype.openQuote=function(){
    var s=this.state,c=CONFIG.CATALOGS,rows=[],find=function(g,id){return(c[g]||[]).find(x=>x.id===id);},add=function(label,g,id){var x=find(g,id);if(x&&x.price>0)rows.push({label:label+" — "+x.name,price:x.price});};
    add("Mẫu cabin","CABIN_MODELS",s.cabinModel);
    var w=find("WALLS",s.wallLeft);if(w&&w.price>0)rows.push({label:s.wallMode==="SAME"?"3 vách — "+w.name:"Vách trái — "+w.name,price:w.price*(s.wallMode==="SAME"?3:1)});
    if(s.wallMode==="INDEPENDENT"){var wb=find("WALLS",s.wallBack),wr=find("WALLS",s.wallRight);if(wb&&wb.price>0)rows.push({label:"Vách sau — "+wb.name,price:wb.price});if(wr&&wr.price>0)rows.push({label:"Vách phải — "+wr.name,price:wr.price});}
    add("Vật liệu","MATERIALS",s.material);add("Hoa văn","ETCHEDS",s.etched);add("Sàn","FLOORS",s.floor);add("Trần","CEILINGS",s.ceiling);add("Tay vịn","HANDRAILS",s.handrail);add("COP","COPS",s.cop);add("Ánh sáng","LIGHTINGS",s.lighting);
    this.ui.quote(rows,this.total());
  };
  document.addEventListener("DOMContentLoaded",function(){var app=new App();window.ElevatorConfigurator=app;app.loadState();app.bind();app.ui.bind();app.scene.setCameraPreset("FRONT");app.rebuild();});
})();