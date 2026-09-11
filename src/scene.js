window.SceneManager = (function () {

    function Manager(canvas) {

        if (!canvas) {
            throw new Error(
                'SceneManager: canvas not found'
            );
        }

        this.canvas = canvas;


        /*
         * ========================================================
         * RENDERER
         * ========================================================
         */

        this.renderer =
            new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: true,
                powerPreference: 'high-performance'
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

        this.renderer.outputEncoding =
            THREE.sRGBEncoding;

        this.renderer.toneMapping =
            THREE.ACESFilmicToneMapping;

        this.renderer.toneMappingExposure =
            1.05;


        /*
         * ========================================================
         * SCENE
         * ========================================================
         */

        this.scene =
            new THREE.Scene();

        this.scene.background =
            new THREE.Color(
                0xdfe4e6
            );


        /*
         * ========================================================
         * CAMERA
         * ========================================================
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
         * Chỉ giữ compatibility.
         * Người dùng không được tự do xoay / pan / zoom.
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

        this._resizeHandler =
            function () {
                self.resize();
            };

        window.addEventListener(
            'resize',
            this._resizeHandler
        );


        /*
         * ========================================================
         * DEFAULT CAMERA
         * ========================================================
         */

        this.setCameraPreset(
            'FRONT'
        );


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

    Manager.prototype.resize =
        function () {

            if (!this.canvas) {
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

            var d =
                CONFIG.DIMENSIONS;

            var name =
                String(
                    view || 'FRONT'
                ).toUpperCase();


            /*
             * ====================================================
             * FRONT / SHOWROOM 3/4
             * ====================================================
             *
             * Đây là góc chính.
             *
             * Camera:
             * - đứng phía trước cabin
             * - lệch nhẹ sang phải
             * - cao hơn tâm cabin
             * - nhìn hơi xuống
             *
             * Mục tiêu:
             * nhìn thấy vách trái + vách sau + vách phải,
             * đồng thời thấy sàn và một phần trần.
             */

            if (name === 'FRONT') {

                var frontTarget =
                    new THREE.Vector3(
                        0,
                        d.height * 0.43,
                        0
                    );


                /*
                 * Với cabin:
                 *
                 * width  = 1.4 m
                 * depth  = 1.2 m
                 * height = 2.4 m
                 *
                 * Camera lệch ngang khoảng 0.60 m.
                 */

                var frontPosition =
                    new THREE.Vector3(
                        d.width * 0.43,
                        d.height * 0.67,
                        d.depth * 2.55
                    );


                this.camera.position.copy(
                    frontPosition
                );

                this.camera.lookAt(
                    frontTarget
                );

                this.controls.target.copy(
                    frontTarget
                );

                this.controls.update();

                this.render();

                return;
            }


            /*
             * ====================================================
             * REAR
             * ====================================================
             */

            if (name === 'REAR') {

                var rearTarget =
                    new THREE.Vector3(
                        0,
                        d.height * 0.46,
                        0
                    );


                var rearPosition =
                    new THREE.Vector3(
                        -d.width * 0.22,
                        d.height * 0.60,
                        -d.depth * 2.55
                    );


                this.camera.position.copy(
                    rearPosition
                );

                this.camera.lookAt(
                    rearTarget
                );

                this.controls.target.copy(
                    rearTarget
                );

                this.controls.update();

                this.render();

                return;
            }


            /*
             * ====================================================
             * LEFT
             * ====================================================
             */

            if (name === 'LEFT') {

                var leftTarget =
                    new THREE.Vector3(
                        0,
                        d.height * 0.46,
                        0
                    );


                var leftPosition =
                    new THREE.Vector3(
                        -d.width * 2.35,
                        d.height * 0.60,
                        d.depth * 0.25
                    );


                this.camera.position.copy(
                    leftPosition
                );

                this.camera.lookAt(
                    leftTarget
                );

                this.controls.target.copy(
                    leftTarget
                );

                this.controls.update();

                this.render();

                return;
            }


            /*
             * ====================================================
             * RIGHT
             * ====================================================
             */

            if (name === 'RIGHT') {

                var rightTarget =
                    new THREE.Vector3(
                        0,
                        d.height * 0.46,
                        0
                    );


                var rightPosition =
                    new THREE.Vector3(
                        d.width * 2.35,
                        d.height * 0.60,
                        d.depth * 0.25
                    );


                this.camera.position.copy(
                    rightPosition
                );

                this.camera.lookAt(
                    rightTarget
                );

                this.controls.target.copy(
                    rightTarget
                );

                this.controls.update();

                this.render();

                return;
            }


            /*
             * ====================================================
             * CEILING
             * ====================================================
             *
             * Camera nhìn từ trên xuống nhưng vẫn giữ
             * perspective để thấy chiều sâu của trần.
             */

            if (name === 'CEILING') {

                var ceilingTarget =
                    new THREE.Vector3(
                        0,
                        d.height * 0.76,
                        0
                    );


                var ceilingPosition =
                    new THREE.Vector3(
                        d.width * 0.48,
                        d.height * 2.05,
                        d.depth * 0.95
                    );


                this.camera.position.copy(
                    ceilingPosition
                );

                this.camera.lookAt(
                    ceilingTarget
                );

                this.controls.target.copy(
                    ceilingTarget
                );

                this.controls.update();

                this.render();

                return;
            }


            /*
             * ====================================================
             * FLOOR
             * ====================================================
             *
             * Camera thấp hơn, nhìn vào sàn theo perspective.
             */

            if (name === 'FLOOR') {

                var floorTarget =
                    new THREE.Vector3(
                        0,
                        0.04,
                        0
                    );


                var floorPosition =
                    new THREE.Vector3(
                        d.width * 0.55,
                        d.height * 0.82,
                        d.depth * 2.30
                    );


                this.camera.position.copy(
                    floorPosition
                );

                this.camera.lookAt(
                    floorTarget
                );

                this.controls.target.copy(
                    floorTarget
                );

                this.controls.update();

                this.render();

                return;
            }


            /*
             * ====================================================
             * FALLBACK
             * ====================================================
             */

            var fallbackTarget =
                new THREE.Vector3(
                    0,
                    d.height * 0.43,
                    0
                );


            var fallbackPosition =
                new THREE.Vector3(
                    d.width * 0.43,
                    d.height * 0.67,
                    d.depth * 2.55
                );


            this.camera.position.copy(
                fallbackPosition
            );

            this.camera.lookAt(
                fallbackTarget
            );

            this.controls.target.copy(
                fallbackTarget
            );

            this.controls.update();

            this.render();
        };


    /*
     * ============================================================
     * COMPATIBILITY ALIAS
     * ============================================================
     */

    Manager.prototype.setPresetView =
        function (view) {

            this.setCameraPreset(
                view
            );
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