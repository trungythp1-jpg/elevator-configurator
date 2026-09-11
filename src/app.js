(function(){
  function App(){
    this.state=JSON.parse(JSON.stringify(CONFIG.DEFAULT_STATE));
    this.token=0;
    this.animation=null;
    this.scene=new SceneManager(document.getElementById("webgl-canvas"));
    this.lighting=new LightingManager(this.scene.scene);
    this.cabin=new CabinBuilder(this.scene.scene);
    this.ui=new UIManager();
  }

  App.prototype.valid=function(raw){
    var s=JSON.parse(JSON.stringify(CONFIG.DEFAULT_STATE));

    if(!raw||typeof raw!=="object"||Array.isArray(raw))return s;

    var groups={
      cabinModel:"CABIN_MODELS",
      wallLeft:"WALLS",
      wallBack:"WALLS",
      wallRight:"WALLS",
      panel12:"WALLS",
      panel35:"WALLS",
      panel4:"WALLS",
      panel68:"WALLS",
      panel7:"WALLS",
      panel911:"WALLS",
      panel10:"WALLS",
      material:"MATERIALS",
      etched:"ETCHEDS",
      floor:"FLOORS",
      ceiling:"CEILINGS",
      handrail:"HANDRAILS",
      cop:"COPS",
      lighting:"LIGHTINGS",
      colorTone:"COLORS"
    };

    Object.keys(groups).forEach(function(k){
      var v=raw[k];
      var list=CONFIG.CATALOGS[groups[k]]||[];
      if(list.some(function(x){return x.id===v;}))s[k]=v;
    });

    if(raw.wallMode==="SAME"||raw.wallMode==="INDEPENDENT"){
      s.wallMode=raw.wallMode;
    }

    if(/^#[0-9a-f]{6}$/i.test(raw.customColor||"")){
      s.customColor=raw.customColor;
    }

    if(raw.doorState==="OPEN"||raw.doorState==="CLOSED"){
      s.doorState=raw.doorState;
    }

    var hasPanelState=
      raw.panel12||raw.panel35||raw.panel4||
      raw.panel68||raw.panel7||raw.panel911||raw.panel10;

    if(!hasPanelState){
      s.panel12=s.wallLeft;
      s.panel35=s.wallLeft;
      s.panel4=s.wallLeft;
      s.panel68=s.wallBack;
      s.panel7=s.wallBack;
      s.panel911=s.wallRight;
      s.panel10=s.wallRight;
    }

    if(s.wallMode==="SAME"){
      var same=raw.panel12||raw.wallLeft||s.panel12;

      s.panel12=same;
      s.panel35=same;
      s.panel4=same;
      s.panel68=same;
      s.panel7=same;
      s.panel911=same;
      s.panel10=same;

      s.wallLeft=same;
      s.wallBack=same;
      s.wallRight=same;
    }

    return s;
  };

  App.prototype.loadState=function(){
    var q=new URLSearchParams(location.search).get("config");

    if(q){
      try{
        this.state=this.valid(JSON.parse(decodeURIComponent(escape(atob(q)))));
        return;
      }catch(e){}
    }

    var saved=localStorage.getItem("elevator_config_state");

    if(saved){
      try{
        this.state=this.valid(JSON.parse(saved));
      }catch(e){
        localStorage.removeItem("elevator_config_state");
      }
    }
  };

  App.prototype.bind=function(){
    var self=this;

    this.ui.on("camera",function(v){
      self.scene.setCameraPreset(v);
    });

    this.ui.on("select",function(o){
      self.state[o.key]=o.value;

      var panelKey=
        o.key==="panel12"||
        o.key==="panel35"||
        o.key==="panel4"||
        o.key==="panel68"||
        o.key==="panel7"||
        o.key==="panel911"||
        o.key==="panel10";

      if(o.key==="wallMode"&&o.value==="SAME"){
        var same=self.state.panel12||self.state.wallLeft||"I03";

        self.state.panel12=same;
        self.state.panel35=same;
        self.state.panel4=same;
        self.state.panel68=same;
        self.state.panel7=same;
        self.state.panel911=same;
        self.state.panel10=same;

        self.state.wallLeft=same;
        self.state.wallBack=same;
        self.state.wallRight=same;
      }

      if(self.state.wallMode==="SAME"&&panelKey){
        self.state.panel12=o.value;
        self.state.panel35=o.value;
        self.state.panel4=o.value;
        self.state.panel68=o.value;
        self.state.panel7=o.value;
        self.state.panel911=o.value;
        self.state.panel10=o.value;

        self.state.wallLeft=o.value;
        self.state.wallBack=o.value;
        self.state.wallRight=o.value;
      }

      /* Tương thích với UI cũ nếu vẫn phát wallLeft/Back/Right. */
      if(self.state.wallMode==="SAME"&&
         (o.key==="wallLeft"||o.key==="wallBack"||o.key==="wallRight")){
        self.state.panel12=o.value;
        self.state.panel35=o.value;
        self.state.panel4=o.value;
        self.state.panel68=o.value;
        self.state.panel7=o.value;
        self.state.panel911=o.value;
        self.state.panel10=o.value;

        self.state.wallLeft=o.value;
        self.state.wallBack=o.value;
        self.state.wallRight=o.value;
      }

      self.rebuild();
    });

    this.ui.on("customColor",function(h){
      self.state.customColor=h;
      self.rebuild();
    });

    this.ui.on("door",function(){
      self.toggleDoor();
    });

    this.ui.on("save",function(){
      localStorage.setItem(
        "elevator_config_state",
        JSON.stringify(self.state)
      );
      self.ui.toast("Đã lưu cấu hình.");
    });

    this.ui.on("share",function(){
      self.share();
    });

    this.ui.on("reset",function(){
      self.cancelAnimation();
      self.state=JSON.parse(
        JSON.stringify(CONFIG.DEFAULT_STATE)
      );
      localStorage.removeItem("elevator_config_state");
      history.replaceState({},document.title,location.pathname);
      self.rebuild();
      self.ui.toast("Đã đặt lại cấu hình.");
    });

    this.ui.on("quote",function(){
      self.openQuote();
    });

    this.ui.on("closeQuote",function(){
      self.ui.closeQuote();
    });

    this.ui.on("submitQuote",function(){
      self.ui.toast("Thông tin báo giá đã được ghi nhận.");
    });
  };

  App.prototype.total=function(){
    var s=this.state;
    var c=CONFIG.CATALOGS;
    var t=0;

    var price=function(g,id){
      var list=c[g]||[];
      for(var i=0;i<list.length;i++){
        if(list[i].id===id)return Number(list[i].price)||0;
      }
      return 0;
    };

    t+=price("CABIN_MODELS",s.cabinModel);

    /*
     * 11 PANEL:
     * 1+2=2, 3+5=2, 4=1, 6+8=2,
     * 7=1, 9+11=2, 10=1 => 11 tấm.
     */
    t+=price("WALLS",s.panel12||s.wallLeft)*2;
    t+=price("WALLS",s.panel35||s.wallLeft)*2;
    t+=price("WALLS",s.panel4||s.wallLeft);
    t+=price("WALLS",s.panel68||s.wallBack)*2;
    t+=price("WALLS",s.panel7||s.wallBack);
    t+=price("WALLS",s.panel911||s.wallRight)*2;
    t+=price("WALLS",s.panel10||s.wallRight);

    t+=price("MATERIALS",s.material);
    t+=price("ETCHEDS",s.etched);
    t+=price("FLOORS",s.floor);
    t+=price("CEILINGS",s.ceiling);
    t+=price("HANDRAILS",s.handrail);
    t+=price("COPS",s.cop);
    t+=price("LIGHTINGS",s.lighting);

    return t;
  };

  App.prototype.rebuild=function(){
    var self=this;
    var token=++this.token;

    this.cancelAnimation();
    this.ui.render(this.state);
    this.ui.loading(true);
    this.ui.doorButton(this.state.doorState);

    /*
     * LightingManager hiện tại dùng API applyPreset(),
     * không có updateLighting().
     */
    var lightingConfig=(CONFIG.CATALOGS.LIGHTINGS||[]).find(function(item){
      return item.id===self.state.lighting;
    });

    if(lightingConfig){
      self.lighting.applyPreset(lightingConfig);
    }

    /*
     * CabinBuilder hiện tại dùng buildCabin(state, generationToken)
     * và updateDoorProgress(progress).
     */
    var generationToken={
      cancelled:false,
      id:token
    };

    this.cabin.buildCabin(this.state,generationToken)
      .then(function(){
        if(token!==self.token)return;

        self.cabin.updateDoorProgress(
          self.state.doorState==="OPEN"?1:0
        );

        self.ui.price(self.total());
        self.ui.loading(false);
      })
      .catch(function(e){
        if(token!==self.token)return;

        console.error(
          "Elevator Configurator build error:",
          e
        );

        try{
          self.ui.price(self.total());
        }catch(priceError){
          console.error(
            "Elevator Configurator price error:",
            priceError
          );
        }

        self.ui.loading(false);
        self.ui.toast("Đã dựng cabin với asset dự phòng.");
      });
  };

  App.prototype.cancelAnimation=function(){
    if(this.animation!==null){
      cancelAnimationFrame(this.animation);
      this.animation=null;
    }
  };

  App.prototype.toggleDoor=function(){
    var self=this;

    if(!this.cabin.doorLeftMesh||!this.cabin.doorRightMesh)return;

    this.cancelAnimation();

    var from=this.cabin.doorProgress;
    var to=this.state.doorState==="OPEN"?0:1;
    var start=performance.now();
    var dur=650;

    this.state.doorState=to===1?"OPEN":"CLOSED";
    this.ui.doorButton(this.state.doorState);

    function step(now){
      var x=Math.min(1,(now-start)/dur);
      var e=x<0.5
        ?2*x*x
        :1-Math.pow(-2*x+2,2)/2;

      self.cabin.updateDoorProgress(
        from+(to-from)*e
      );

      if(x<1){
        self.animation=requestAnimationFrame(step);
      }else{
        self.animation=null;
      }
    }

    this.animation=requestAnimationFrame(step);
  };

  App.prototype.share=async function(){
    try{
      var encoded=btoa(
        unescape(
          encodeURIComponent(
            JSON.stringify(this.state)
          )
        )
      );

      var url=location.origin+
        location.pathname+
        "?config="+encoded;

      if(!navigator.clipboard)throw new Error("clipboard");

      await navigator.clipboard.writeText(url);
      this.ui.toast("Đã sao chép liên kết chia sẻ.");
    }catch(e){
      this.ui.toast("Không thể sao chép liên kết trên trình duyệt này.");
    }
  };

  App.prototype.openQuote=function(){
    var s=this.state;
    var c=CONFIG.CATALOGS;
    var rows=[];

    var find=function(g,id){
      var list=c[g]||[];
      for(var i=0;i<list.length;i++){
        if(list[i].id===id)return list[i];
      }
      return null;
    };

    var add=function(label,g,id){
      var x=find(g,id);
      if(x&&Number(x.price)>0){
        rows.push({
          label:label+" — "+x.name,
          price:Number(x.price)
        });
      }
    };

    add("Mẫu cabin","CABIN_MODELS",s.cabinModel);

    [
      ["Cánh gà cửa — Tấm 1 + 2","panel12",2],
      ["Vách trái — Tấm 3 + 5","panel35",2],
      ["Vách trái — Tấm 4","panel4",1],
      ["Vách sau — Tấm 6 + 8","panel68",2],
      ["Vách sau — Tấm 7","panel7",1],
      ["Vách phải — Tấm 9 + 11","panel911",2],
      ["Vách phải — Tấm 10","panel10",1]
    ].forEach(function(g){
      var x=find("WALLS",s[g[1]]);
      if(x&&Number(x.price)>0){
        rows.push({
          label:g[0]+" — "+x.name+" × "+g[2],
          price:Number(x.price)*g[2]
        });
      }
    });

    add("Vật liệu","MATERIALS",s.material);
    add("Hoa văn","ETCHEDS",s.etched);
    add("Sàn","FLOORS",s.floor);
    add("Trần","CEILINGS",s.ceiling);
    add("Tay vịn","HANDRAILS",s.handrail);
    add("COP","COPS",s.cop);
    add("Ánh sáng","LIGHTINGS",s.lighting);

    this.ui.quote(rows,this.total());
  };

  document.addEventListener("DOMContentLoaded",function(){
    var app=new App();

    window.ElevatorConfigurator=app;

    app.loadState();
    app.bind();
    app.ui.bind();
    app.scene.setCameraPreset("FRONT");
    app.rebuild();
  });
})();
