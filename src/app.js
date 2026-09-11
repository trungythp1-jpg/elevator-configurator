/* ============================================================
   GROVA ELEVATOR CONFIGURATOR
   APPLICATION / STATE / PRICE / SHARE
   ============================================================ */
(function () {
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function App() {
    this.state = clone(CONFIG.DEFAULT_STATE);
    this.token = 0;
    this.doorAnimation = null;

    this.scene = new SceneManager(document.getElementById("webgl-canvas"));
    this.lighting = new LightingManager(this.scene.scene);
    this.cabin = new CabinBuilder(this.scene);
    this.ui = new UIManager();
  }

  App.prototype.catalogHas = function (group, id) {
    return (CONFIG.CATALOGS[group] || []).some(function (x) { return x.id === id; });
  };

  App.prototype.valid = function (raw) {
    var s = clone(CONFIG.DEFAULT_STATE);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return s;

    var simple = {
      cabinModel:"CABIN_MODELS", material:"MATERIALS", etched:"ETCHEDS",
      floor:"FLOORS", ceiling:"CEILINGS", handrail:"HANDRAILS",
      cop:"COPS", lighting:"LIGHTINGS", colorTone:"COLORS"
    };

    Object.keys(simple).forEach(function (key) {
      if (this.catalogHas(simple[key], raw[key])) s[key] = raw[key];
    }, this);

    CONFIG.PANEL_TOPOLOGY.groups.forEach(function (g) {
      if (this.catalogHas("WALLS", raw[g.key])) s[g.key] = raw[g.key];
    }, this);

    if (raw.wallMode === "SAME" || raw.wallMode === "INDEPENDENT") s.wallMode = raw.wallMode;
    if (raw.doorState === "OPEN" || raw.doorState === "CLOSED") s.doorState = raw.doorState;
    if (/^#[0-9a-f]{6}$/i.test(raw.customColor || "")) s.customColor = raw.customColor;

    /* Legacy wall state is intentionally converted only once. */
    if (raw.wallMode === "INDEPENDENT" && raw.wallLeft && raw.wallBack && raw.wallRight) {
      if (this.catalogHas("WALLS", raw.wallLeft)) {
        s.panel35 = raw.wallLeft; s.panel4 = raw.wallLeft;
      }
      if (this.catalogHas("WALLS", raw.wallBack)) {
        s.panel68 = raw.wallBack; s.panel7 = raw.wallBack;
      }
      if (this.catalogHas("WALLS", raw.wallRight)) {
        s.panel911 = raw.wallRight; s.panel10 = raw.wallRight;
      }
    }

    if (s.wallMode === "SAME") {
      /* SAME uses the first main-wall group as the source. */
      s.panel35 = s.panel35 || CONFIG.DEFAULT_STATE.panel35;
      s.panel4 = s.panel35;
      s.panel68 = s.panel35;
      s.panel7 = s.panel35;
      s.panel911 = s.panel35;
      s.panel10 = s.panel35;
    }

    return s;
  };

  App.prototype.loadState = function () {
    var params = new URLSearchParams(location.search);
    var encoded = params.get("config");

    if (encoded) {
      try {
        var decoded = decodeURIComponent(escape(atob(encoded)));
        this.state = this.valid(JSON.parse(decoded));
        return;
      } catch (e) {
        console.warn("Invalid shared configuration", e);
      }
    }

    try {
      var saved = localStorage.getItem("elevator_config_state");
      if (saved) this.state = this.valid(JSON.parse(saved));
    } catch (e2) {
      localStorage.removeItem("elevator_config_state");
    }
  };

  App.prototype.setWallGroup = function (key, value) {
    if (!this.catalogHas("WALLS", value)) return;

    if (this.state.wallMode === "SAME") {
      ["panel35","panel4","panel68","panel7","panel911","panel10"].forEach(function (k) {
        this.state[k] = value;
      });
    } else {
      this.state[key] = value;
    }
  };

  App.prototype.bind = function () {
    var self = this;

    this.ui.on("camera", function (view) {
      self.scene.setCameraPreset(view);
    });

    this.ui.on("select", function (o) {
      if (!o || !o.key) return;

      if (CONFIG.PANEL_TOPOLOGY.groups.some(function (g) { return g.key === o.key; })) {
        self.setWallGroup(o.key, o.value);
      } else if (o.key === "wallMode") {
        self.state.wallMode = o.value;
        if (o.value === "SAME") {
          var source = self.state.panel35;
          ["panel4","panel68","panel7","panel911","panel10"].forEach(function (k) {
            self.state[k] = source;
          });
        }
      } else {
        self.state[o.key] = o.value;
      }

      self.rebuild();
    });

    this.ui.on("customColor", function (hex) {
      if (/^#[0-9a-f]{6}$/i.test(hex || "")) self.state.customColor = hex;
      self.rebuild();
    });

    this.ui.on("door", function () { self.toggleDoor(); });

    this.ui.on("save", function () {
      try {
        localStorage.setItem("elevator_config_state", JSON.stringify(self.state));
        self.ui.toast("Đã lưu cấu hình.");
      } catch (e) {
        self.ui.toast("Không thể lưu trên thiết bị này.");
      }
    });

    this.ui.on("share", function () { self.share(); });

    this.ui.on("reset", function () {
      self.stopDoorAnimation();
      self.state = clone(CONFIG.DEFAULT_STATE);
      localStorage.removeItem("elevator_config_state");
      history.replaceState({}, document.title, location.pathname);
      self.rebuild();
      self.ui.toast("Đã đặt lại cấu hình.");
    });

    this.ui.on("quote", function () { self.openQuote(); });
    this.ui.on("closeQuote", function () { self.ui.closeQuote(); });
    this.ui.on("submitQuote", function () {
      self.ui.toast("Cấu hình đã sẵn sàng để gửi yêu cầu báo giá.");
    });
  };

  App.prototype.price = function (group, id) {
    var item = (CONFIG.CATALOGS[group] || []).find(function (x) { return x.id === id; });
    return item ? Number(item.price || 0) : 0;
  };

  App.prototype.total = function () {
    var s = this.state;
    var total = 0;

    total += this.price("CABIN_MODELS", s.cabinModel);

    /* Exact physical-panel accounting: 11 panels. */
    var counts = {};
    [s.panel12,s.panel12,s.panel35,s.panel4,s.panel35,s.panel68,s.panel7,s.panel68,s.panel911,s.panel10,s.panel911]
      .forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });

    Object.keys(counts).forEach(function (id) {
      total += this.price("WALLS", id) * counts[id];
    });

    total += this.price("MATERIALS", s.material);
    total += this.price("ETCHEDS", s.etched);
    total += this.price("FLOORS", s.floor);
    total += this.price("CEILINGS", s.ceiling);
    total += this.price("HANDRAILS", s.handrail);
    total += this.price("COPS", s.cop);
    total += this.price("LIGHTINGS", s.lighting);

    return total;
  };

  App.prototype.rebuild = function () {
    var self = this;
    var id = ++this.token;

    this.ui.render(this.state);
    this.ui.price(this.total());
    this.ui.doorButton(this.state.doorState);
    this.ui.loading(true, "Đang dựng cabin 3D…", "Đang áp dụng cấu hình mới");

    this.lighting.updateLighting(this.state.lighting);

    var buildPromise;
    try {
      buildPromise = this.cabin.updateCabin(this.state);
    } catch (e) {
      buildPromise = Promise.reject(e);
    }

    var timeout = new Promise(function (_, reject) {
      setTimeout(function () { reject(new Error("3D build timeout")); }, 15000);
    });

    Promise.race([buildPromise, timeout]).then(function () {
      if (id !== self.token) return;
      self.cabin.setDoorProgress(self.state.doorState === "OPEN" ? 1 : 0);
      self.scene.setCameraPreset("FRONT");
      self.ui.loading(false);
    }).catch(function (error) {
      if (id !== self.token) return;
      console.error("Configurator build error:", error);
      self.ui.loading(false);
      self.ui.toast("3D có lỗi nhưng cấu hình vẫn được giữ.");
    });
  };

  App.prototype.stopDoorAnimation = function () {
    if (this.doorAnimation) {
      cancelAnimationFrame(this.doorAnimation);
      this.doorAnimation = null;
    }
  };

  App.prototype.toggleDoor = function () {
    var self = this;
    this.stopDoorAnimation();

    var start = this.cabin.doorProgress;
    var end = this.state.doorState === "OPEN" ? 0 : 1;
    this.state.doorState = end === 1 ? "OPEN" : "CLOSED";
    this.ui.doorButton(this.state.doorState);

    var t0 = performance.now();
    var duration = 620;

    function frame(now) {
      var p = Math.min(1, (now - t0) / duration);
      var eased = p * (2 - p);
      self.cabin.setDoorProgress(start + (end - start) * eased);
      if (p < 1) {
        self.doorAnimation = requestAnimationFrame(frame);
      } else {
        self.doorAnimation = null;
      }
    }

    this.doorAnimation = requestAnimationFrame(frame);
  };

  App.prototype.share = function () {
    try {
      var encoded = btoa(unescape(encodeURIComponent(JSON.stringify(this.state))));
      var url = location.origin + location.pathname + "?config=" + encoded;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          window.__elevatorApp.ui.toast("Đã sao chép liên kết cấu hình.");
        }).catch(function () {
          prompt("Sao chép liên kết:", url);
        });
      } else {
        prompt("Sao chép liên kết:", url);
      }
    } catch (e) {
      this.ui.toast("Không thể tạo liên kết chia sẻ.");
    }
  };

  App.prototype.openQuote = function () {
    var self = this;
    var s = this.state;
    var rows = [];

    function add(label, group, id) {
      var p = self.price(group, id);
      rows.push({ label: label + " · " + id, priceText: self.ui.money(p) });
    }

    add("Cabin", "CABIN_MODELS", s.cabinModel);
    CONFIG.PANEL_TOPOLOGY.groups.forEach(function (g) {
      add(g.label, "WALLS", s[g.key]);
    });
    add("Vật liệu", "MATERIALS", s.material);
    add("Khắc", "ETCHEDS", s.etched);
    add("Sàn", "FLOORS", s.floor);
    add("Trần", "CEILINGS", s.ceiling);
    add("Tay vịn", "HANDRAILS", s.handrail);
    add("COP", "COPS", s.cop);
    add("Ánh sáng", "LIGHTINGS", s.lighting);

    this.ui.showQuote(rows, this.total());
  };

  window.addEventListener("DOMContentLoaded", function () {
    try {
      var app = new App();
      window.__elevatorApp = app;
      app.loadState();
      app.bind();
      app.ui.bind();
      app.rebuild();
    } catch (e) {
      console.error("Elevator Configurator startup error:", e);
      var overlay = document.getElementById("loading-overlay");
      if (overlay) overlay.classList.add("ready");
      var toast = document.getElementById("toast");
      if (toast) {
        toast.textContent = "Không thể khởi động bộ cấu hình 3D.";
        toast.classList.remove("hidden");
      }
    }
  });
})();
