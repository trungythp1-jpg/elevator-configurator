/* ============================================================
   GROVA ELEVATOR CONFIGURATOR
   MATERIAL / TEXTURE ENGINE
   ============================================================ */
window.MaterialManager = (function () {
  var singleton = null;

  function Manager() {
    this.textureLoader = new THREE.TextureLoader();
    this.textureCache = new Map();
    this.materialCache = new Map();
    this.failed = new Set();
  }

  Manager.prototype.texture = function (path) {
    var self = this;
    if (!path || this.failed.has(path)) return Promise.resolve(null);
    if (this.textureCache.has(path)) return this.textureCache.get(path);

    var promise = new Promise(function (resolve) {
      self.textureLoader.load(
        path,
        function (texture) {
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.encoding = THREE.sRGBEncoding;
          resolve(texture);
        },
        undefined,
        function () {
          self.failed.add(path);
          resolve(null);
        }
      );
    });

    this.textureCache.set(path, promise);
    return promise;
  };

  Manager.prototype.applyRepeat = function (texture, width, height) {
    if (!texture) return;
    texture.repeat.set(
      Math.max(1, Number(width || 1) / 0.55),
      Math.max(1, Number(height || 1) / 1.80)
    );
  };

  Manager.prototype.color = function (tone, custom) {
    if (tone === "CUSTOM") return new THREE.Color(custom || "#ffffff");
    var item = (CONFIG.CATALOGS.COLORS || []).find(function (x) { return x.id === tone; });
    return item && item.hex ? new THREE.Color(item.hex) : null;
  };

  Manager.prototype.wallFallback = function (id) {
    var colors = {
      I01:0xb9bec0, I02:0xe2e5e6, I03:0xb8bec0, I04:0xaeb4b7,
      I05:0xaeb4b7, I06:0xd1ad45, I07:0xc4a25a, I08:0x8b6455
    };
    return new THREE.MeshStandardMaterial({
      color: colors[id] || 0xb8bec0,
      metalness: 0.90,
      roughness: id === "I02" ? 0.12 : 0.28,
      side: THREE.DoubleSide
    });
  };

  Manager.prototype.etchedBump = function (id) {
    if (id === "NONE") return null;

    var canvas = document.createElement("canvas");
    canvas.width = 192;
    canvas.height = 192;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 192, 192);
    ctx.strokeStyle = "rgba(255,255,255,.26)";
    ctx.lineWidth = 2;

    var i, x;
    if (id === "E03") {
      for (i=0;i<=192;i+=24) {
        ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,192); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(192,i); ctx.stroke();
      }
    } else if (id === "E04") {
      for (i=-192;i<384;i+=32) {
        ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i+192,192); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i,192); ctx.lineTo(i+192,0); ctx.stroke();
      }
    } else if (id === "E05") {
      for (x=-20;x<220;x+=30) {
        for (i=15;i<210;i+=30) {
          ctx.beginPath(); ctx.arc(x + (i%60?15:0), i, 13, 0, Math.PI*2); ctx.stroke();
        }
      }
    } else if (id === "E06") {
      for (i=-20;i<220;i+=34) {
        ctx.beginPath();
        for (x=0;x<=192;x+=8) {
          ctx.lineTo(x, i + 12*Math.sin(x/13));
        }
        ctx.stroke();
      }
    } else if (id === "E02") {
      for (i=20;i<190;i+=42) {
        ctx.beginPath(); ctx.arc(96,i,20,0,Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(96,i,8,0,Math.PI*2); ctx.stroke();
      }
    } else {
      for (i=0;i<192;i+=18) {
        ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,192); ctx.stroke();
      }
    }

    var texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.8, 2.6);
    texture.encoding = THREE.LinearEncoding;
    return texture;
  };

  Manager.prototype.getWallMaterial = function (wall, base, width, height, state) {
    var self = this;
    wall = wall || CONFIG.CATALOGS.WALLS[2];
    state = state || {};

    var tone = this.color(state.colorTone, state.customColor);
    var key = [
      "wall", wall.id, base && base.id, state.colorTone,
      state.customColor, state.etched, width, height
    ].join("|");

    if (this.materialCache.has(key)) return Promise.resolve(this.materialCache.get(key));

    return this.texture(wall.texturePath).then(function (texture) {
      var material = texture ? new THREE.MeshStandardMaterial({
        map: texture,
        color: tone || 0xffffff,
        metalness: 0.90,
        roughness: wall.id === "I02" ? 0.13 : 0.26,
        side: THREE.DoubleSide
      }) : self.wallFallback(wall.id);

      if (texture) self.applyRepeat(texture, width, height);
      if (tone) material.color.copy(tone);

      var bump = self.etchedBump(state.etched);
      if (bump) {
        material.bumpMap = bump;
        material.bumpScale = 0.035;
      }

      self.materialCache.set(key, material);
      return material;
    });
  };

  Manager.prototype.getFloorMaterial = function (item, width, depth) {
    var self = this;
    item = item || CONFIG.CATALOGS.FLOORS[0];
    var key = "floor|" + item.id;

    if (this.materialCache.has(key)) return Promise.resolve(this.materialCache.get(key));

    return this.texture(item.texturePath).then(function (texture) {
      var material;
      if (texture) {
        material = new THREE.MeshStandardMaterial({
          map: texture,
          metalness: 0.10,
          roughness: 0.65
        });
        self.applyRepeat(texture, width, depth);
      } else {
        var colors = {T01:0xb5afa4,T02:0xd4cec6,T03:0x66676b,T04:0xc6beb5,T05:0x77736d,T06:0x74797b};
        material = new THREE.MeshStandardMaterial({
          color: colors[item.id] || 0xb8b2aa,
          metalness: 0.10,
          roughness: 0.68
        });
      }

      self.materialCache.set(key, material);
      return material;
    });
  };

  return {
    getInstance: function () {
      if (!singleton) singleton = new Manager();
      return singleton;
    }
  };
})();
