/* ============================================================
   GROVA ELEVATOR CONFIGURATOR
   LIGHTING ENGINE
   ============================================================ */
window.LightingManager = (function () {
  function Manager(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = "CONFIG_LIGHTING";
    scene.add(this.group);
  }

  Manager.prototype.clear = function () {
    while (this.group.children.length) this.group.remove(this.group.children[0]);
  };

  Manager.prototype.updateLighting = function (id) {
    this.clear();

    var presets = {
      L01:{color:0xffffff,intensity:2.10,ambient:.58},
      L02:{color:0xddeaff,intensity:2.35,ambient:.65},
      L03:{color:0xffd09a,intensity:2.00,ambient:.54},
      L04:{color:0xffefd5,intensity:2.55,ambient:.70}
    };
    var p = presets[id] || presets.L01;

    this.group.add(new THREE.HemisphereLight(0xffffff,0x62696d,p.ambient));

    var key = new THREE.DirectionalLight(p.color,p.intensity);
    key.position.set(2.8,4.2,3.8);
    key.castShadow = true;
    key.shadow.mapSize.width = 1024;
    key.shadow.mapSize.height = 1024;
    this.group.add(key);

    var fill = new THREE.DirectionalLight(p.color,p.intensity*.48);
    fill.position.set(-3.2,2.5,-2.2);
    this.group.add(fill);

    var front = new THREE.PointLight(p.color,p.intensity*.38,7);
    front.position.set(0,1.9,1.4);
    this.group.add(front);

    var ceiling = new THREE.PointLight(p.color,p.intensity*.28,5);
    ceiling.position.set(0,2.35,0);
    this.group.add(ceiling);
  };

  return Manager;
})();
