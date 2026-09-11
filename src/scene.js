window.SceneManager = (function () {

    function Manager(canvas) {

        if (!canvas) {
            throw new Error("SceneManager: canvas not found");
        }

        this.canvas = canvas;

        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            powerPreference: "high-performance"
        });

        this.renderer.setPixelRatio(
            Math.min(window.devicePixelRatio || 1, 2)
        );

        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;

        this.scene = new THREE.Scene();

        this.scene.background = new THREE.Color(0xdfe4e6);

        /*
         * Camera rộng hơn một chút để trên mobile
         * vẫn nhìn được cả trần và sàn.
         */
        this.camera = new THREE.PerspectiveCamera(
            46,
            1,
            0.05,
            100
        );

        this.controls = new THREE.OrbitControls(
            this.camera,
            canvas
        );

        /*
         * Camera preset cố định.
         * Không cho người dùng tự xoay / zoom / pan.
         */
        this.controls.enableRotate = false;
        this.controls.enablePan = false;
        this.controls.enableZoom = false;
        this.controls.enableDamping = false;

        this.resize();

        var self = this;

        this._resizeHandler = function () {
            self.resize();
        };

        window.addEventListener(
            "resize",
            this._resizeHandler
        );

        this._animationFrame = null;

        this.setCameraPreset("FRONT");

        this.animate();
    }


    Manager.prototype.resize = function () {

        if (!this.canvas) {
            return;
        }

        var rect = this.canvas.getBoundingClientRect();

        var width = Math.max(
            1,
            this.canvas.clientWidth || rect.width || 1
        );

        var height = Math.max(
            1,
            this.canvas.clientHeight || rect.height || 1
        );

        this.renderer.setSize(
            width,
            height,
            false
        );

        this.camera.aspect = width / height;

        this.camera.updateProjectionMatrix();
    };


    Manager.prototype.setCameraPreset = function (view) {

        var d = CONFIG.DIMENSIONS;

        var name = String(
            view || "FRONT"
        ).toUpperCase();

        var position;
        var target;


        /*
         * ========================================================
         * FRONT
         * ========================================================
         *
         * Đây là góc chính của showroom.
         *
         * Camera hơi lệch sang phải nhưng KHÔNG quá mạnh.
         * Lùi đủ xa để:
         *
         * - thấy toàn bộ chiều cao cabin
         * - thấy trần
         * - thấy sàn
         * - không bị UI/cabin che mất phần trên
         */

        if (name === "FRONT") {

            position = new THREE.Vector3(
                d.width * 0.30,
                d.height * 0.72,
                d.depth * 2.75
            );

            target = new THREE.Vector3(
                0,
                d.height * 0.48,
                0
            );
        }


        /*
         * ========================================================
         * REAR
         * ========================================================
         */

        else if (name === "REAR") {

            position = new THREE.Vector3(
                -d.width * 0.25,
                d.height * 0.70,
                -d.depth * 2.65
            );

            target = new THREE.Vector3(
                0,
                d.height * 0.48,
                0
            );
        }


        /*
         * ========================================================
         * LEFT
         * ========================================================
         */

        else if (name === "LEFT") {

            position = new THREE.Vector3(
                -d.width * 2.45,
                d.height * 0.68,
                d.depth * 0.25
            );

            target = new THREE.Vector3(
                0,
                d.height * 0.48,
                0
            );
        }


        /*
         * ========================================================
         * RIGHT
         * ========================================================
         */

        else if (name === "RIGHT") {

            position = new THREE.Vector3(
                d.width * 2.45,
                d.height * 0.68,
                d.depth * 0.25
            );

            target = new THREE.Vector3(
                0,
                d.height * 0.48,
                0
            );
        }


        /*
         * ========================================================
         * CEILING
         * ========================================================
         */

        else if (name === "CEILING") {

            position = new THREE.Vector3(
                d.width * 0.42,
                d.height * 2.00,
                d.depth * 1.05
            );

            target = new THREE.Vector3(
                0,
                d.height * 0.86,
                0
            );
        }


        /*
         * ========================================================
         * FLOOR
         * ========================================================
         */

        else if (name === "FLOOR") {

            position = new THREE.Vector3(
                d.width * 0.42,
                d.height * 0.82,
                d.depth * 2.45
            );

            target = new THREE.Vector3(
                0,
                0.04,
                0
            );
        }


        /*
         * ========================================================
         * FALLBACK
         * ========================================================
         */

        else {

            position = new THREE.Vector3(
                d.width * 0.30,
                d.height * 0.72,
                d.depth * 2.75
            );

            target = new THREE.Vector3(
                0,
                d.height * 0.48,
                0
            );
        }


        this.camera.position.copy(position);

        this.camera.lookAt(target);

        this.controls.target.copy(target);

        this.controls.update();

        this.render();
    };


    Manager.prototype.setPresetView = function (view) {

        this.setCameraPreset(view);
    };


    Manager.prototype.render = function () {

        if (
            !this.renderer ||
            !this.scene ||
            !this.camera
        ) {
            return;
        }

        this.renderer.render(
            this.scene,
            this.camera
        );
    };


    Manager.prototype.animate = function () {

        var self = this;

        this._animationFrame =
            requestAnimationFrame(function () {
                self.animate();
            });

        self.render();
    };


    return Manager;

})();