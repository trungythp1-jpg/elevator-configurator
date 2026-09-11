/* ============================================================
   GROVA ELEVATOR CONFIGURATOR
   THREE.JS SCENE
   ============================================================ */
window.SceneManager = (function () {
  function Manager(canvas) {
    if (!canvas) throw new Error("Không tìm thấy canvas 3D.");
    if (typeof THREE === "undefined") throw new Error("Three.js chưa tải.");

    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdfe4e6);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);
    this.camera.position.set(3.15, 2.15, 4.0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.controls = new THREE.OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 1.45;
    this.controls.maxDistance = 7;
    this.controls.target.set(0, 1.15, 0);

    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(8,8),
      new THREE.MeshStandardMaterial({color:0xd4d9dc,roughness:.95,metalness:.02})
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.045;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this._resize();
    var self = this;
    window.addEventListener("resize", function () { self._resize(); });
    this.animate();
  }

  Manager.prototype._resize = function () {
    var w = this.canvas.clientWidth || 800;
    var h = this.canvas.clientHeight || 600;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  };

  Manager.prototype.setCameraPreset = function (view) {
    var presets = {
      FRONT: {p:[3.15,2.15,4.0], t:[0,1.15,0]},
      REAR: {p:[0,2.0,-4.0], t:[0,1.15,0]},
      LEFT: {p:[-4.0,2.0,.35], t:[0,1.15,0]},
      RIGHT:{p:[4.0,2.0,.35], t:[0,1.15,0]},
      CEILING:{p:[2.1,4.9,2.1], t:[0,1.0,0]},
      FLOOR:{p:[2.25,.75,2.25], t:[0,.35,0]}
    };
    var x = presets[view] || presets.FRONT;
    this.camera.position.set(x.p[0],x.p[1],x.p[2]);
    this.controls.target.set(x.t[0],x.t[1],x.t[2]);
    this.controls.update();
  };

  Manager.prototype.animate = function () {
    var self = this;
    requestAnimationFrame(function () { self.animate(); });
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  return Manager;
})();
