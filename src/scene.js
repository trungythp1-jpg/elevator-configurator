window.SceneManager = (function () {

    function Manager(canvas) {

        if (!canvas) {
            throw new Error("SceneManager: canvas not found");
        }

        if (typeof THREE === "undefined") {
            throw new Error("SceneManager: THREE.js not loaded");
        }

        if (typeof THREE.OrbitControls === "undefined") {
            throw new Error("SceneManager: OrbitControls not loaded");
        }

        this.canvas = canvas;

        /*
         * ========================================================
         * RENDERER
         * ========================================================
         */

        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: false,
            powerPreference: "high-performance"
        });

        this.renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio || 1,
                2
            )
        );

        /*
         * Three.js r128
         */
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        this.renderer.toneMapping =
            THREE.ACESFilmicToneMapping;

        this.renderer.toneMappingExposure = 1.08;

        /*
         * Không cần shadow map toàn cảnh ở giai đoạn này.
         * Giữ renderer nhẹ hơn trên mobile.
         */


        /*
         * ========================================================
         * SCENE
         * ========================================================
         */

        this.scene = new THREE.Scene();

        /*
         * Nền showroom sáng, trung tính.
         */
        this.scene.background =
            new THREE.Color(0xe3e8ea);


        /*
         * ========================================================
         * CAMERA
         * ========================================================
         *
         * FOV 48 giúp cabin không bị quá "zoom".
         *
         * Camera chính được đặt:
         * - hơi lệch sang phải
         * - hơi cao hơn trung tâm
         * - lùi đủ xa
         *
         * để tạo cảm giác giống ảnh showroom mẫu.
         */

        this.camera =
            new THREE.PerspectiveCamera(
                48,
                1,
                0.05,
                100
            );


        /*
         * ========================================================
         * ORBIT CONTROLS
         * ========================================================
         *
         * Chỉ sử dụng OrbitControls để camera preset
         * hoạt động ổn định.
         *
         * Người dùng KHÔNG được:
         * - xoay
         * - pan
         * - zoom
         */

        this.controls =
            new THREE.OrbitControls(
                this.camera,
                canvas
            );

        this.controls.enableRotate = false;
        this.controls.enablePan = false;
        this.controls.enableZoom = false;
        this.controls.enableDamping = false;


        /*
         * ========================================================
         * RESIZE
         * ========================================================
         */

        this.resize();

        var self = this;

        this._resizeHandler = function () {
            self.resize();
        };

        window.addEventListener(
            "resize",
            this._resizeHandler
        );


        /*
         * ========================================================
         * CAMERA DEFAULT
         * ========================================================
         */

        this._currentView = "FRONT";

        this.setCameraPreset("FRONT");


        /*
         * ========================================================
         * SINGLE RENDER LOOP
         * ========================================================
         */

        this._animationFrame = null;

        this.animate();
    }


    /*
     * ============================================================
     * RESIZE
     * ============================================================
     */

    Manager.prototype.resize = function () {

        if (!this.canvas || !this.renderer || !this.camera) {
            return;
        }

        var rect =
            this.canvas.getBoundingClientRect();

        var width =
            Math.max(
                1,
                this.canvas.clientWidth ||
                rect.width ||
                1
            );

        var height =
            Math.max(
                1,
                this.canvas.clientHeight ||
                rect.height ||
                1
            );

        this.renderer.setSize(
            width,
            height,
            false
        );

        this.camera.aspect =
            width / height;

        this.camera.updateProjectionMatrix();
    };


    /*
     * ============================================================
     * CAMERA PRESETS
     * ============================================================
     */

    Manager.prototype.setCameraPreset =
        function (view) {

            var d = CONFIG.DIMENSIONS;

            var name =
                String(
                    view || "FRONT"
                ).toUpperCase();

            var position;
            var target;


            /*
             * ====================================================
             * FRONT
             * ====================================================
             *
             * View chính.
             *
             * Đây là góc quan trọng nhất.
             *
             * Camera:
             * - lệch nhẹ sang phải
             * - cao hơn trung tâm một chút
             * - đứng ngoài cabin đủ xa
             *
             * Kết quả mong muốn:
             *
             *       thấy trần
             *          ↓
             *      ┌─────────┐
             *     /│         │
             *    / │  CABIN  │
             *   /  │         │
             *  └─────────────┘
             *        ↑
             *       sàn
             */

            if (name === "FRONT") {

                position =
                    new THREE.Vector3(
                        d.width * 0.34,
                        d.height * 0.74,
                        d.depth * 2.95
                    );

                target =
                    new THREE.Vector3(
                        0,
                        d.height * 0.52,
                        0
                    );
            }


            /*
             * ====================================================
             * REAR
             * ====================================================
             */

            else if (name === "REAR") {

                position =
                    new THREE.Vector3(
                        -d.width * 0.28,
                        d.height * 0.74,
                        -d.depth * 2.85
                    );

                target =
                    new THREE.Vector3(
                        0,
                        d.height * 0.52,
                        0
                    );
            }


            /*
             * ====================================================
             * LEFT
             * ====================================================
             */

            else if (name === "LEFT") {

                position =
                    new THREE.Vector3(
                        -d.width * 2.70,
                        d.height * 0.72,
                        d.depth * 0.38
                    );

                target =
                    new THREE.Vector3(
                        0,
                        d.height * 0.52,
                        0
                    );
            }


            /*
             * ====================================================
             * RIGHT
             * ====================================================
             */

            else if (name === "RIGHT") {

                position =
                    new THREE.Vector3(
                        d.width * 2.70,
                        d.height * 0.72,
                        d.depth * 0.38
                    );

                target =
                    new THREE.Vector3(
                        0,
                        d.height * 0.52,
                        0
                    );
            }


            /*
             * ====================================================
             * CEILING
             * ====================================================
             *
             * View từ phía trước và phía trên.
             *
             * Dùng để kiểm tra:
             * - thiết kế trần
             * - CNC
             * - shadow gap
             * - LED
             */

            else if (name === "CEILING") {

                position =
                    new THREE.Vector3(
                        d.width * 0.48,
                        d.height * 1.95,
                        d.depth * 1.35
                    );

                target =
                    new THREE.Vector3(
                        0,
                        d.height * 0.92,
                        0
                    );
            }


            /*
             * ====================================================
             * FLOOR
             * ====================================================
             *
             * View thấp từ phía trước.
             *
             * Dùng để kiểm tra:
             * - sàn
             * - họa tiết
             * - tỷ lệ sàn
             */

            else if (name === "FLOOR") {

                position =
                    new THREE.Vector3(
                        d.width * 0.42,
                        d.height * 0.62,
                        d.depth * 2.65
                    );

                target =
                    new THREE.Vector3(
                        0,
                        0.10,
                        0
                    );
            }


            /*
             * ====================================================
             * FALLBACK
             * ====================================================
             */

            else {

                position =
                    new THREE.Vector3(
                        d.width * 0.34,
                        d.height * 0.74,
                        d.depth * 2.95
                    );

                target =
                    new THREE.Vector3(
                        0,
                        d.height * 0.52,
                        0
                    );
            }


            /*
             * ====================================================
             * APPLY CAMERA
             * ====================================================
             */

            this._currentView = name;

            this.camera.position.copy(
                position
            );

            this.camera.lookAt(
                target
            );

            this.controls.target.copy(
                target
            );

            this.controls.update();


            /*
             * Render ngay sau khi đổi view.
             */

            this.render();
        };


    /*
     * ============================================================
     * COMPATIBILITY ALIAS
     * ============================================================
     */

    Manager.prototype.setPresetView =
        function (view) {

            this.setCameraPreset(view);
        };


    /*
     * ============================================================
     * RENDER
     * ============================================================
     */

    Manager.prototype.render =
        function () {

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


    /*
     * ============================================================
     * ANIMATION LOOP
     * ============================================================
     *
     * Chỉ có MỘT render loop.
     */

    Manager.prototype.animate =
        function () {

            var self = this;

            this._animationFrame =
                requestAnimationFrame(
                    function () {
                        self.animate();
                    }
                );

            self.render();
        };


    /*
     * ============================================================
     * RETURN
     * ============================================================
     */

    return Manager;

})();