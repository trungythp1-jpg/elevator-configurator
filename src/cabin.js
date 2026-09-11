/* ============================================================
   GROVA ELEVATOR CONFIGURATOR
   CABIN 3D ENGINE
   ============================================================ */
window.CabinBuilder = (function () {
  function Builder(sceneManager) {
    this.sceneManager = sceneManager;
    this.root = new THREE.Group();
    this.root.name = "CABIN_ROOT";
    this.sceneManager.scene.add(this.root);

    this.doorGroup = new THREE.Group();
    this.doorGroup.name = "DOOR_SYSTEM";
    this.root.add(this.doorGroup);

    this.doorProgress = 1;
  }

  Builder.prototype.material = function (color, roughness, metalness) {
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: roughness == null ? 0.28 : roughness,
      metalness: metalness == null ? 0.86 : metalness,
      side: THREE.DoubleSide
    });
  };

  Builder.prototype.box = function (name, w, h, d, x, y, z, material, parent) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    (parent || this.root).add(mesh);
    return mesh;
  };

  Builder.prototype.wall = function (state, key, w, h) {
    var wall = CONFIG.CATALOGS.WALLS.find(function (x) { return x.id === state[key]; }) || CONFIG.CATALOGS.WALLS[2];
    var base = CONFIG.CATALOGS.MATERIALS.find(function (x) { return x.id === state.material; }) || CONFIG.CATALOGS.MATERIALS[0];
    return MaterialManager.getInstance().getWallMaterial(wall, base, w, h, state);
  };

  Builder.prototype.clearGeometry = function () {
    var keepDoor = this.doorGroup;
    var children = this.root.children.slice();

    children.forEach(function (child) {
      if (child !== keepDoor) {
        this.root.remove(child);
        this.disposeObject(child);
      }
    }, this);

    while (this.doorGroup.children.length) {
      var child2 = this.doorGroup.children[0];
      this.doorGroup.remove(child2);
      this.disposeObject(child2);
    }
  };

  Builder.prototype.disposeObject = function (obj) {
    obj.traverse(function (node) {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        var list = Array.isArray(node.material) ? node.material : [node.material];
        list.forEach(function (m) {
          if (m.map) m.map.dispose();
          if (m.bumpMap) m.bumpMap.dispose();
          m.dispose();
        });
      }
    });
  };

  Builder.prototype.updateCabin = async function (state) {
    this.clearGeometry();

    var D = CONFIG.DIMENSIONS;
    var floorY = D.floorThickness;
    var wallY = floorY + D.height / 2;

    var leftX = -D.width / 2 + D.wallThickness / 2;
    var rightX = D.width / 2 - D.wallThickness / 2;
    var backZ = -D.depth / 2 + D.wallThickness / 2;
    var frontZ = D.depth / 2 - D.wallThickness / 2;

    var sideSegment = D.depth / 3;
    var backSegment = D.width / 3;
    var returnWidth = (D.width - D.doorWidth) / 2;

    var floorItem = CONFIG.CATALOGS.FLOORS.find(function (x) { return x.id === state.floor; }) || CONFIG.CATALOGS.FLOORS[0];
    var floorMat = await MaterialManager.getInstance().getFloorMaterial(floorItem, D.width, D.depth);

    this.box("FLOOR", D.width, D.floorThickness, D.depth, 0, floorY / 2, 0, floorMat);

    var mats = await Promise.all([
      this.wall(state, "panel12", returnWidth, D.height),
      this.wall(state, "panel35", sideSegment, D.height),
      this.wall(state, "panel4", sideSegment, D.height),
      this.wall(state, "panel68", backSegment, D.height),
      this.wall(state, "panel7", backSegment, D.height),
      this.wall(state, "panel911", sideSegment, D.height),
      this.wall(state, "panel10", sideSegment, D.height)
    ]);

    /* 1 + 2: door returns */
    this.box("PANEL_1", returnWidth, D.height, D.wallThickness,
      -D.width / 2 + returnWidth / 2, wallY, frontZ, mats[0]);
    this.box("PANEL_2", returnWidth, D.height, D.wallThickness,
      D.width / 2 - returnWidth / 2, wallY, frontZ, mats[0]);

    /* 3 - 4 - 5: left wall */
    this.box("PANEL_3", D.wallThickness, D.height, sideSegment,
      leftX, wallY, D.depth / 2 - sideSegment / 2, mats[1]);
    this.box("PANEL_4", D.wallThickness, D.height, sideSegment,
      leftX, wallY, 0, mats[2]);
    this.box("PANEL_5", D.wallThickness, D.height, sideSegment,
      leftX, wallY, -D.depth / 2 + sideSegment / 2, mats[1]);

    /* 6 - 7 - 8: back wall */
    this.box("PANEL_6", backSegment, D.height, D.wallThickness,
      -D.width / 2 + backSegment / 2, wallY, backZ, mats[3]);
    this.box("PANEL_7", backSegment, D.height, D.wallThickness,
      0, wallY, backZ, mats[4]);
    this.box("PANEL_8", backSegment, D.height, D.wallThickness,
      D.width / 2 - backSegment / 2, wallY, backZ, mats[3]);

    /* 9 - 10 - 11: right wall */
    this.box("PANEL_9", D.wallThickness, D.height, sideSegment,
      rightX, wallY, D.depth / 2 - sideSegment / 2, mats[5]);
    this.box("PANEL_10", D.wallThickness, D.height, sideSegment,
      rightX, wallY, 0, mats[6]);
    this.box("PANEL_11", D.wallThickness, D.height, sideSegment,
      rightX, wallY, -D.depth / 2 + sideSegment / 2, mats[5]);

    /* Corner trims */
    var trim = this.material(0x8f9699, 0.20, 0.92);
    [[leftX,frontZ],[leftX,backZ],[rightX,frontZ],[rightX,backZ]].forEach(function (p) {
      this.box("CORNER_TRIM", 0.028, D.height + 0.01, 0.028, p[0], wallY, p[1], trim);
    }, this);

    await this.buildCeiling(state);
    this.buildDoor();
    this.buildHandrail(state);
    this.buildCOP(state);

    this.setDoorProgress(state.doorState === "OPEN" ? 1 : 0);
    return true;
  };

  Builder.prototype.buildCeiling = async function (state) {
    var D = CONFIG.DIMENSIONS;
    var y = D.floorThickness + D.height;
    var item = CONFIG.CATALOGS.CEILINGS.find(function (x) { return x.id === state.ceiling; }) || CONFIG.CATALOGS.CEILINGS[0];

    var base = this.material(0xc6cbce, 0.24, 0.88);
    var light = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.72,
      roughness: 0.35,
      metalness: 0.05
    });
    var dark = this.material(0x858d91, 0.20, 0.92);

    this.box("CEILING_BASE", D.width, 0.055, D.depth, 0, y, 0, base);

    if (item.id === "C01") {
      [-0.36, 0, 0.36].forEach(function (x) {
        this.box("LED", 0.075, 0.018, D.depth * 0.72, x, y + 0.038, 0, light);
      }, this);
    } else if (item.id === "C02") {
      [-0.42, 0, 0.42].forEach(function (x) {
        this.box("CNC", 0.28, 0.022, D.depth * 0.74, x, y + 0.04, 0, dark);
      }, this);
      this.box("LED_CENTER", 0.065, 0.02, D.depth * 0.80, 0, y + 0.045, 0, light);
    } else if (item.id === "C03") {
      this.box("DOMED_LIGHT", D.width * 0.78, 0.035, D.depth * 0.70, 0, y + 0.04, 0, light);
    } else if (item.id === "C04") {
      [[-.38,-.30],[.38,-.30],[-.38,.30],[.38,.30]].forEach(function (p) {
        this.box("SQUARE_LIGHT", .25, .02, .25, p[0], y + .04, p[1], light);
      }, this);
    } else if (item.id === "C05") {
      this.box("LED_LONG_X", D.width * .78, .02, .065, 0, y + .045, 0, light);
      this.box("LED_LONG_Z", .065, .02, D.depth * .72, 0, y + .05, 0, light);
    } else {
      [-.52,-.26,0,.26,.52].forEach(function (x) {
        this.box("METAL_RIB", .035, .024, D.depth * .75, x, y + .04, 0, dark);
      }, this);
      this.box("LED_CENTER_2", .10, .02, D.depth * .72, 0, y + .05, 0, light);
    }
  };

  Builder.prototype.buildDoor = function () {
    var D = CONFIG.DIMENSIONS;
    var mat = this.material(0x9ba2a5, 0.22, 0.90);
    var leafW = D.doorWidth / 2;
    var y = D.floorThickness + D.doorHeight / 2;
    var z = D.depth / 2 + D.wallThickness * 0.70;

    var left = this.box("DOOR_LEFT", leafW - .006, D.doorHeight, .035,
      -leafW / 2, y, z, mat, this.doorGroup);
    var right = this.box("DOOR_RIGHT", leafW - .006, D.doorHeight, .035,
      leafW / 2, y, z, mat, this.doorGroup);

    left.userData.closedX = -leafW / 2;
    right.userData.closedX = leafW / 2;
    left.userData.direction = -1;
    right.userData.direction = 1;

    this.box("DOOR_HEADER", D.doorWidth, .045, .055, 0,
      D.floorThickness + D.doorHeight + .045, z, mat, this.doorGroup);
  };

  Builder.prototype.buildHandrail = function (state) {
    if (state.handrail === "NONE") return;

    var D = CONFIG.DIMENSIONS;
    var mat = this.material(state.handrail === "H02" ? 0xd4d7d8 : 0xa4aaad, .18, .94);
    var y = D.floorThickness + 1.02;
    var z = -D.depth / 2 + .11;

    if (state.handrail === "H02") {
      this.box("HANDRAIL_FLAT", .98, .055, .07, 0, y, z, mat);
    } else {
      var offsets = state.handrail === "H03" ? [-.07,.07] : [0];
      offsets.forEach(function (dy) {
        var mesh = new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.96,24), mat);
        mesh.rotation.z = Math.PI / 2;
        mesh.position.set(0, y + dy, z);
        mesh.castShadow = true;
        this.root.add(mesh);
      }, this);
    }
  };

  Builder.prototype.buildCOP = function (state) {
    if (state.cop === "NONE") return;

    var D = CONFIG.DIMENSIONS;
    var body = this.material(0x252a2d, .22, .92);
    var accent = this.material(0xbfc4c6, .16, .90);
    var x = -D.width / 2 - .045;
    var y = D.floorThickness + 1.15;
    var z = -.02;
    var h = state.cop === "P03" ? .86 : .72;

    this.box("COP_BODY", .07, h, .19, x, y, z, body);

    if (state.cop === "P02") {
      this.box("COP_SCREEN", .015, .30, .14, x - .043, y + .12, z, accent);
    } else if (state.cop === "P04") {
      [-.16,0,.16].forEach(function (dy) {
        this.box("COP_BUTTON", .018, .055, .055, x - .043, y + dy, z, accent);
      }, this);
    } else {
      [-.22,-.11,0,.11,.22].forEach(function (dy) {
        this.box("COP_BUTTON", .018, .045, .045, x - .043, y + dy, z, accent);
      }, this);
    }
  };

  Builder.prototype.setDoorProgress = function (progress) {
    this.doorProgress = Math.max(0, Math.min(1, Number(progress) || 0));

    var left = this.doorGroup.getObjectByName("DOOR_LEFT");
    var right = this.doorGroup.getObjectByName("DOOR_RIGHT");
    if (!left || !right) return;

    var travel = CONFIG.DIMENSIONS.doorWidth * 0.46;
    left.position.x = left.userData.closedX - travel * this.doorProgress;
    right.position.x = right.userData.closedX + travel * this.doorProgress;
  };

  return Builder;
})();
