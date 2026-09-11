window.UIManager = (function(){
  function UI(){this.handlers={};}
  UI.prototype.on=function(name,fn){(this.handlers[name]||(this.handlers[name]=[])).push(fn);};
  UI.prototype.emit=function(name,payload){(this.handlers[name]||[]).forEach(function(fn){fn(payload);});};
  UI.prototype.bind=function(){
    var self=this;
    document.querySelectorAll(".btn-camera").forEach(function(b){b.addEventListener("click",function(){
      document.querySelectorAll(".btn-camera").forEach(function(x){x.classList.remove("active");});
      b.classList.add("active");self.emit("camera",b.dataset.view);
    });});
    document.getElementById("btn-toggle-door").addEventListener("click",function(){self.emit("door");});
    document.getElementById("btn-quote").addEventListener("click",function(){self.emit("quote");});
    document.getElementById("btn-share").addEventListener("click",function(){self.emit("share");});
    document.getElementById("btn-save").addEventListener("click",function(){self.emit("save");});
    document.getElementById("btn-reset").addEventListener("click",function(){self.emit("reset");});
    document.getElementById("modal-close").addEventListener("click",function(){self.emit("closeQuote");});
    document.getElementById("btn-modal-submit").addEventListener("click",function(){self.emit("submitQuote");});
    document.getElementById("quote-modal").addEventListener("click",function(e){if(e.target.id==="quote-modal")self.emit("closeQuote");});
  };
  UI.prototype.section=function(root,title,key,items,current,disabled){
    var sec=document.createElement("section");sec.className="config-section";
    var h=document.createElement("h3");h.textContent=title;sec.appendChild(h);
    var grid=document.createElement("div");grid.className="options-grid";sec.appendChild(grid);
    items.forEach(function(it){
      var card=document.createElement("button");card.type="button";card.className="option-card"+(it.id===current?" selected":"");card.disabled=!!disabled;
      var thumb=document.createElement("div");
      if(it.texturePath){thumb.className="option-thumb";thumb.style.backgroundImage="url('"+it.texturePath+"')";}
      else{thumb.className="option-thumb-fallback";thumb.textContent=it.id;}
      card.appendChild(thumb);
      var title=document.createElement("div");title.className="option-title";title.textContent=it.name;card.appendChild(title);
      var price=document.createElement("div");price.className="option-price";price.textContent=it.price?it.price.toLocaleString("vi-VN")+" VNĐ":"Miễn phí";card.appendChild(price);
      if(!disabled)card.addEventListener("click",function(){this.emit("select",{key:key,value:it.id});}.bind(this));
      grid.appendChild(card);
    },this);
    root.appendChild(sec);
  };
  UI.prototype.render=function(s){
    var root=document.getElementById("config-panels");root.innerHTML="";
    this.section(root,"Mẫu cabin","cabinModel",CONFIG.CATALOGS.CABIN_MODELS,s.cabinModel);
    var sec=document.createElement("section");sec.className="config-section";
    var h=document.createElement("h3");h.textContent="Chế độ vách";sec.appendChild(h);
    var mode=document.createElement("div");mode.className="wall-mode-selector";
    ["SAME","INDEPENDENT"].forEach(function(v){var b=document.createElement("button");b.type="button";b.className="btn-tab"+(s.wallMode===v?" active":"");b.textContent=v==="SAME"?"Đồng bộ 3 vách":"Độc lập";b.addEventListener("click",()=>this.emit("select",{key:"wallMode",value:v}));mode.appendChild(b);},this);
    sec.appendChild(mode);root.appendChild(sec);
    this.section(root,"Vách trái","wallLeft",CONFIG.CATALOGS.WALLS,s.wallLeft);
    this.section(root,"Vách sau","wallBack",CONFIG.CATALOGS.WALLS,s.wallBack,s.wallMode==="SAME");
    this.section(root,"Vách phải","wallRight",CONFIG.CATALOGS.WALLS,s.wallRight,s.wallMode==="SAME");
    this.section(root,"Vật liệu nền","material",CONFIG.CATALOGS.MATERIALS,s.material);
    this.section(root,"Màu hoàn thiện","colorTone",CONFIG.CATALOGS.COLORS,s.colorTone);
    if(s.colorTone==="CUSTOM"){
      var c=document.createElement("section");c.className="config-section";c.innerHTML="<h3>Màu Custom</h3>";
      var wrap=document.createElement("div");wrap.className="color-picker-wrapper";
      var input=document.createElement("input");input.type="color";input.value=/^#[0-9a-f]{6}$/i.test(s.customColor)?s.customColor:"#ffffff";
      var text=document.createElement("span");text.textContent=input.value;
      input.addEventListener("input",()=>{text.textContent=input.value;this.emit("customColor",input.value);});
      wrap.append(input,text);c.appendChild(wrap);root.appendChild(c);
    }
    this.section(root,"Hoa văn khắc","etched",CONFIG.CATALOGS.ETCHEDS,s.etched);
    this.section(root,"Sàn","floor",CONFIG.CATALOGS.FLOORS,s.floor);
    this.section(root,"Trần","ceiling",CONFIG.CATALOGS.CEILINGS,s.ceiling);
    this.section(root,"Tay vịn","handrail",CONFIG.CATALOGS.HANDRAILS,s.handrail);
    this.section(root,"Bảng điều khiển","cop",CONFIG.CATALOGS.COPS,s.cop);
    this.section(root,"Ánh sáng","lighting",CONFIG.CATALOGS.LIGHTINGS,s.lighting);
  };
  UI.prototype.loading=function(show,text){document.getElementById("loading-overlay").classList.toggle("hidden",!show);if(text)document.getElementById("loading-text").textContent=text;};
  UI.prototype.doorButton=function(state){document.getElementById("btn-toggle-door").textContent=state==="OPEN"?"Đóng cửa":"Mở cửa";};
  UI.prototype.price=function(v){document.getElementById("total-price").textContent=v.toLocaleString("vi-VN")+" VNĐ";};
  UI.prototype.toast=function(msg){var e=document.getElementById("toast");e.textContent=msg;e.classList.remove("hidden");clearTimeout(this.timer);this.timer=setTimeout(()=>e.classList.add("hidden"),2200);};
  UI.prototype.quote=function(rows,total){var e=document.getElementById("quote-breakdown");e.innerHTML=rows.map(r=>"<div class='quote-row'><span>"+r.label+"</span><strong>"+r.price.toLocaleString("vi-VN")+" VNĐ</strong></div>").join("")+"<div class='quote-total'><span>Tổng cộng</span><strong>"+total.toLocaleString("vi-VN")+" VNĐ</strong></div>";document.getElementById("quote-modal").classList.remove("hidden");};
  UI.prototype.closeQuote=function(){document.getElementById("quote-modal").classList.add("hidden");};
  return UI;
})();