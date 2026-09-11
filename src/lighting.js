window.LightingManager = (function () {

    function Manager(scene) {

        this.scene = scene;

        this.group = new THREE.Group();
        this.group.name = 'ShowroomLighting';

        scene.add(this.group);

        this.ready = false;

        this.ambient = null;
        this.key = null;
        this.fill = null;
        this.rect = null;

        this.currentPreset = 'L01';
    }


    /*
     * ============================================================
     * INIT
     * ============================================================
     */

    Manager.prototype.init = function () {

        if (this.ready) {
            return;
        }

        /*
         * Three.js r128
         *
         * Phải init trước khi sử dụng RectAreaLight.
         */
        if (
            THREE.RectAreaLightUniformsLib &&
            typeof THREE.RectAreaLightUniformsLib.init === 'function'
        ) {
            THREE.RectAreaLightUniformsLib.init();
        }


        /*
         * ========================================================
         * AMBIENT
         * ========================================================
         */

        this.ambient =
            new THREE.AmbientLight(
                0xffffff,
                0.58
            );


        /*
         * ========================================================
         * KEY
         * ========================================================
         */

        this.key =
            new THREE.DirectionalLight(
                0xffffff,
                0.72
            );

        this.key.position.set(
            2.2,
            3.5,
            2.4
        );


        /*
         * ========================================================
         * FILL
         * ========================================================
         */

        this.fill =
            new THREE.DirectionalLight(
                0xffffff,
                0.36
            );

        this.fill.position.set(
            -2.0,
            2.0,
            -1.8
        );


        /*
         * ========================================================
         * RECT AREA
         * ========================================================
         */

        this.rect =
            new THREE.RectAreaLight(
                0xffffff,
                2.0,
                1.05,
                0.70
            );

        this.rect.position.set(
            0,
            CONFIG.DIMENSIONS.height - 0.06,
            0.15
        );

        this.rect.lookAt(
            0,
            0,
            0
        );


        /*
         * Add all lights to one group.
         */

        this.group.add(
            this.ambient,
            this.key,
            this.fill,
            this.rect
        );


        this.ready = true;


        /*
         * Default preset.
         */

        this.updateLighting(
            this.currentPreset
        );
    };


    /*
     * ============================================================
     * PRESETS
     * ============================================================
     */

    Manager.prototype.getPresets = function () {

        return {

            /*
             * L01
             * Warm-neutral showroom 4000K
             */

            L01: {
                color: 0xffffff,
                ambient: 0.58,
                key: 0.72,
                fill: 0.36,
                rect: 2.00
            },


            /*
             * L02
             * Cool white 6000K
             */

            L02: {
                color: 0xeaf5ff,
                ambient: 0.52,
                key: 0.72,
                fill: 0.30,
                rect: 1.90
            },


            /*
             * L03
             * Warm 3000K
             */

            L03: {
                color: 0xffd6a0,
                ambient: 0.50,
                key: 0.66,
                fill: 0.36,
                rect: 1.75
            },


            /*
             * L04
             * Studio ambient
             *
             * Không quá mạnh để tránh inox/chrome
             * bị cháy highlight.
             */

            L04: {
                color: 0xf1e8ff,
                ambient: 0.60,
                key: 0.74,
                fill: 0.40,
                rect: 2.20
            }
        };
    };


    /*
     * ============================================================
     * UPDATE LIGHTING
     * ============================================================
     */

    Manager.prototype.updateLighting = function (id) {

        this.init();


        var presets =
            this.getPresets();


        var preset =
            presets[id] ||
            presets.L01;


        this.currentPreset =
            presets[id]
                ? id
                : 'L01';


        /*
         * Color.
         */

        this.ambient.color.set(
            preset.color
        );

        this.key.color.set(
            preset.color
        );

        this.fill.color.set(
            preset.color
        );

        this.rect.color.set(
            preset.color
        );


        /*
         * Intensity.
         */

        this.ambient.intensity =
            preset.ambient;

        this.key.intensity =
            preset.key;

        this.fill.intensity =
            preset.fill;

        this.rect.intensity =
            preset.rect;


        /*
         * Render immediately when possible.
         *
         * SceneManager's animation loop vẫn là render loop chính.
         */
        if (
            this.scene &&
            this.scene.userData &&
            typeof this.scene.userData.render === 'function'
        ) {
            this.scene.userData.render();
        }
    };


    /*
     * ============================================================
     * COMPATIBILITY ALIAS
     * ============================================================
     *
     * Một số phiên bản app.js trước đây gọi:
     *
     * lighting.applyPreset(...)
     *
     * Giữ alias để tránh contract mismatch.
     */

    Manager.prototype.applyPreset = function (id) {

        this.updateLighting(id);
    };


    /*
     * Compatibility alias thứ hai.
     */

    Manager.prototype.setPreset = function (id) {

        this.updateLighting(id);
    };


    /*
     * ============================================================
     * RETURN
     * ============================================================
     */

    return Manager;

})();