/* ============================================================
   GROVA ELEVATOR CONFIGURATOR
   UI LAYER
   ============================================================ */
window.UIManager = (function () {
  function UI() {
    this.handlers = {};
    this.root = document.getElementById("config-panels");
  }

  UI.prototype.on = function (name, fn) {
    if (typeof fn !== "function") return;
    if (!this.handlers[name]) this.handlers[name] = [];
    this.handlers[name].push(fn);
  };

  UI.prototype.emit = function (name, payload) {
    (this.handlers[name] || []).slice().forEach(function (fn) {
      try { fn(payload); } catch (e) { console.error("UI event", name, e); }
    });
  };

  UI.prototype.money = function (v) {
    return Number(v || 0).toLocaleString("vi-VN") + " VNĐ";
  };

  UI.prototype.item = function (group, id) {
    return (CONFIG.CATALOGS[group] || []).find(function (x) { return x.id === id; }) || null;
  };

  UI.prototype.section = function (title, note) {
    var section = document.createElement("section");
    section.className = "config-section";

    var heading = document.createElement("div");
    heading.className = "section-heading";

    var wrap = document.createElement("div");
    var h = document.createElement("h3");
    h.textContent = title;
    wrap.appendChild(h);

    if (note) {
      var p = document.createElement("div");
      p.className = "section-note";
      p.textContent = note;
      wrap.appendChild(p);
    }

    heading.appendChild(wrap);
    section.appendChild(heading);
    return section;
  };

  UI.prototype.options = function (section, group, key, state, columns) {
    var grid = document.createElement("div");
    grid.className = "options-grid" + (columns === 3 ? " three" : "");
    var list = CONFIG.CATALOGS[group] || [];
    var self = this;

    list.forEach(function (item) {
      var card = document.createElement("div");
      card.className = "option-card" + (state[key] === item.id ? " selected" : "");

      var button = document.createElement("button");
      button.type = "button";

      var thumb = document.createElement("div");
      thumb.className = "option-thumb";

      if (item.texturePath) {
        thumb.style.backgroundImage = "url('" + item.texturePath + "')";
      } else {
        thumb.classList.add("option-thumb-fallback");
        thumb.textContent = item.id;
      }

      var title = document.createElement("div");
      title.className = "option-title";
      title.textContent = item.name;

      var price = document.createElement("div");
      price.className = "option-price";
      price.textContent = item.price ? self.money(item.price) : "Tiêu chuẩn";

      button.appendChild(thumb);
      button.appendChild(title);
      button.appendChild(price);
      button.addEventListener("click", function () {
        self.emit("select", { key: key, value: item.id });
      });

      card.appendChild(button);
      grid.appendChild(card);
    });

    section.appendChild(grid);
  };

  UI.prototype.render = function (state) {
    var self = this;
    this.root.innerHTML = "";

    var cabin = this.section("Mẫu cabin", "Chọn cấu hình cabin tổng thể.");
    this.options(cabin, "CABIN_MODELS", "cabinModel", state, 3);
    this.root.appendChild(cabin);

    var walls = this.section("Vách cabin", "11 panel vật lý · 7 nhóm lựa chọn.");
    var mode = document.createElement("div");
    mode.className = "wall-mode-selector";

    [["SAME", "Đồng bộ 3 vách"], ["INDEPENDENT", "Độc lập"]].forEach(function (x) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn-tab" + (state.wallMode === x[0] ? " active" : "");
      b.textContent = x[1];
      b.addEventListener("click", function () {
        self.emit("select", { key: "wallMode", value: x[0] });
      });
      mode.appendChild(b);
    });
    walls.appendChild(mode);

    var map = document.createElement("div");
    map.className = "panel-map";
    CONFIG.PANEL_TOPOLOGY.groups.forEach(function (g) {
      var item = document.createElement("div");
      item.className = "panel-map-item";
      var strong = document.createElement("strong");
      strong.textContent = g.label;
      var value = document.createElement("span");
      value.textContent = state[g.key] || "I03";
      item.appendChild(strong);
      item.appendChild(value);
      map.appendChild(item);
    });
    walls.appendChild(map);

    CONFIG.PANEL_TOPOLOGY.groups.forEach(function (g) {
      var groupSection = self.section(g.label, "Panel " + g.panels.join(" + "));
      self.options(groupSection, "WALLS", g.key, state, 3);
      walls.appendChild(groupSection);
    });
    this.root.appendChild(walls);

    var material = this.section("Vật liệu nền", "Thiết lập vật liệu chung.");
    this.options(material, "MATERIALS", "material", state, 3);
    this.root.appendChild(material);

    var etched = this.section("Hoa văn khắc", "Hiệu ứng khắc được dựng an toàn khi thiếu texture bump.");
    this.options(etched, "ETCHEDS", "etched", state, 3);
    this.root.appendChild(etched);

    var floor = this.section("Sàn", "Mẫu sàn cabin.");
    this.options(floor, "FLOORS", "floor", state, 3);
    this.root.appendChild(floor);

    var ceiling = this.section("Trần", "Mẫu trần và hệ đèn.");
    this.options(ceiling, "CEILINGS", "ceiling", state, 3);
    this.root.appendChild(ceiling);

    var handrail = this.section("Tay vịn", "Thiết bị tay vịn.");
    this.options(handrail, "HANDRAILS", "handrail", state, 3);
    this.root.appendChild(handrail);

    var cop = this.section("Bảng điều khiển COP", "Vị trí bảng điều khiển trong cabin.");
    this.options(cop, "COPS", "cop", state, 3);
    this.root.appendChild(cop);

    var lighting = this.section("Ánh sáng", "Thiết lập ánh sáng 3D.");
    this.options(lighting, "LIGHTINGS", "lighting", state, 3);
    this.root.appendChild(lighting);

    var tone = this.section("Tông màu", "Áp dụng màu cho vật liệu kim loại.");
    this.options(tone, "COLORS", "colorTone", state, 3);

    var colorWrap = document.createElement("div");
    colorWrap.className = "color-picker-wrapper";
    var label = document.createElement("span");
    label.textContent = "Màu custom";
    var input = document.createElement("input");
    input.type = "color";
    input.value = /^#[0-9a-f]{6}$/i.test(state.customColor || "") ? state.customColor : "#ffffff";
    input.addEventListener("input", function () {
      self.emit("customColor", input.value);
    });
    colorWrap.appendChild(label);
    colorWrap.appendChild(input);
    tone.appendChild(colorWrap);
    this.root.appendChild(tone);
  };

  UI.prototype.loading = function (show, text, detail) {
    var overlay = document.getElementById("loading-overlay");
    if (!overlay) return;
    overlay.classList.toggle("ready", !show);
    if (text) document.getElementById("loading-text").textContent = text;
    if (detail) document.getElementById("loading-detail").textContent = detail;
  };

  UI.prototype.price = function (value) {
    var el = document.getElementById("total-price");
    if (el) el.textContent = this.money(value);
  };

  UI.prototype.doorButton = function (state) {
    var b = document.getElementById("btn-toggle-door");
    if (b) b.textContent = state === "OPEN" ? "Đóng cửa" : "Mở cửa";
  };

  UI.prototype.toast = function (text) {
    var node = document.getElementById("toast");
    if (!node) return;
    node.textContent = text;
    node.classList.remove("hidden");
    clearTimeout(this.toastTimer);
    var self = this;
    this.toastTimer = setTimeout(function () {
      node.classList.add("hidden");
    }, 2600);
  };

  UI.prototype.showQuote = function (rows, total) {
    var node = document.getElementById("quote-breakdown");
    if (!node) return;
    node.innerHTML = "";

    rows.forEach(function (r) {
      var row = document.createElement("div");
      row.className = "quote-row";
      var a = document.createElement("span");
      var b = document.createElement("span");
      a.textContent = r.label;
      b.textContent = r.priceText;
      row.appendChild(a);
      row.appendChild(b);
      node.appendChild(row);
    });

    var totalRow = document.createElement("div");
    totalRow.className = "quote-total";
    var ta = document.createElement("span");
    var tb = document.createElement("span");
    ta.textContent = "Tổng";
    tb.textContent = this.money(total);
    totalRow.appendChild(ta);
    totalRow.appendChild(tb);
    node.appendChild(totalRow);

    document.getElementById("quote-modal").classList.remove("hidden");
  };

  UI.prototype.closeQuote = function () {
    document.getElementById("quote-modal").classList.add("hidden");
  };

  UI.prototype.bind = function () {
    var self = this;

    document.querySelectorAll(".btn-camera").forEach(function (button) {
      button.addEventListener("click", function () {
        document.querySelectorAll(".btn-camera").forEach(function (x) { x.classList.remove("active"); });
        button.classList.add("active");
        self.emit("camera", button.dataset.view);
      });
    });

    var events = {
      "btn-toggle-door": "door",
      "btn-quote": "quote",
      "btn-share": "share",
      "btn-save": "save",
      "btn-reset": "reset",
      "modal-close": "closeQuote",
      "btn-modal-submit": "submitQuote"
    };

    Object.keys(events).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", function () { self.emit(events[id]); });
    });

    var modal = document.getElementById("quote-modal");
    if (modal) modal.addEventListener("click", function (e) {
      if (e.target === modal) self.emit("closeQuote");
    });
  };

  return UI;
})();
