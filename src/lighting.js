window.LightingManager = (function () {
    function LightingManager(scene) {
        this.scene = scene;
        this.lightsGroup = new THREE.Group();
        this.scene.add(this.lightsGroup);

        if (typeof THREE.RectAreaLightUniformsLib !== 'undefined' && THREE.RectAreaLightUniformsLib.init) {
            THREE.RectAreaLightUniformsLib.init();
        }

        this.ambientLight = null;
        this.keyLight = null;
        this.fillLight = null;
        this.rectLight = null;

        this.initLights();
    }

    LightingManager.prototype.initLights = function () {
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.lightsGroup.add(this.ambientLight);

        this.keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.keyLight.position.set(2, 4, 3);
        this.lightsGroup.add(this.keyLight);

        this.fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
        this.fillLight.position.set(-2, 2, -1);
        this.lightsGroup.add(this.fillLight);

        this.rectLight = new THREE.RectAreaLight(0xffffff, 2.0, 1.2, 1.0);
        this.rectLight.position.set(0, 2.38, 0);
        this.rectLight.rotation.x = -Math.PI / 2;
        this.lightsGroup.add(this.rectLight);
    };

    LightingManager.prototype.applyPreset = function (lightingConfig) {
        if (!lightingConfig) return;

        const baseColor = new THREE.Color(lightingConfig.color || '#ffffff');
        const intensity = lightingConfig.intensity ?? 1.0;

        if (lightingConfig.id === 'L04') {
            // Showroom Premium Preset
            this.ambientLight.color.set('#ffffff');
            this.ambientLight.intensity = 0.5;

            this.keyLight.color.set('#ffffff');
            this.keyLight.intensity = 0.9 * intensity;

            this.fillLight.color.set('#e6f2ff');
            this.fillLight.intensity = 0.5 * intensity;

            this.rectLight.color.set('#ffffff');
            this.rectLight.intensity = 3.5 * intensity;
        } else {
            this.ambientLight.color.copy(baseColor);
            this.ambientLight.intensity = 0.6 * intensity;

            this.keyLight.color.copy(baseColor);
            this.keyLight.intensity = 0.8 * intensity;

            this.fillLight.color.copy(baseColor);
            this.fillLight.intensity = 0.3 * intensity;

            this.rectLight.color.copy(baseColor);
            this.rectLight.intensity = 2.0 * intensity;
        }
    };

    return LightingManager;
})();
