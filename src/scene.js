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
         *
         * FOV được tăng nhẹ để phù hợp với màn hình mobile
         * và góc nhìn showroom.
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
     * CAMERA DISTANCE HELPERS
     * ============================================================
     *
     * Tính khoảng cách dựa trên kích thước thật của cabin.
     *
     * Đây là phần quan trọng nhất để tránh trường hợp
     * vách sau chiếm toàn bộ màn hình trên mobile.
     */

    Manager.prototype.fitDistance =
        function (height) {

            var fov =
                THREE.MathUtils.degToRad(
                    this.camera.fov
                );


            /*
             * Khoảng cách cần thiết để chiều cao
             * của cabin nằm gọn trong khung hình.
             */

            var distance =
                (
                    height * 0.5
                ) /
                Math.tan(
                    fov * 0.5
                );


            /*
             * Margin showroom.
             *
             * Không đặt cabin sát mép màn hình.
             */

            return distance * 1.22;
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
             * Camera target.
             *
             * Hơi thấp hơn tâm hình học để nhìn được
             * cả trần và sàn trong cabin.
             */

            var target =
                new THREE.Vector3(
                    0,
                    d.height * 0.49,
                    0
                );


            var position;


            /*
             * =================================================
             * FRONT
             * =================================================
             *
             * Đây là view quan trọng nhất.
             *
             * Camera đứng ngoài cửa cabin.
             * Không nhìn quá sát vách sau.
             */

            if (name === 'FRONT') {

                var frontDistance =
                    this.fitDistance(
                        d.height
                    );


                /*
                 * Trên mobile portrait, chiều cao là
                 * giới hạn chính.
                 *
                 * Bảo đảm khoảng cách tối thiểu.
                 */

                frontDistance =
                    Math.max(
                        frontDistance,
                        d.depth * 2.35
                    );


                position =
                    new THREE.Vector3(
                        0,
                        d.height * 0.49,
                        frontDistance
                    );
            }


            /*
             * =================================================
             * REAR
             * =================================================
             */

            else if (name === 'REAR') {

                var rearDistance =
                    this.fitDistance(
                        d.height
                    );


                rearDistance =
                    Math.max(
                        rearDistance,
                        d.depth * 2.35
                    );


                position =
                    new THREE.Vector3(
                        0,
                        d.height * 0.49,
                        -rearDistance
                    );
            }


            /*
             * =================================================
             * LEFT
             * =================================================
             */

            else if (name === 'LEFT') {

                var leftDistance =
                    this.fitDistance(
                        d.height
                    );


                leftDistance =
                    Math.max(
                        leftDistance,
                        d.width * 2.35
                    );


                position =
                    new THREE.Vector3(
                        -leftDistance,
                        d.height * 0.49,
                        0
                    );
            }


            /*
             * =================================================
             * RIGHT
             * =================================================
             */

            else if (name === 'RIGHT') {

                var rightDistance =
                    this.fitDistance(
                        d.height
                    );


                rightDistance =
                    Math.max(
                        rightDistance,
                        d.width * 2.35
                    );


                position =
                    new THREE.Vector3(
                        rightDistance,
                        d.height * 0.49,
                        0
                    );
            }


            /*
             * =================================================
             * CEILING
             * =================================================
             *
             * Nhìn xuống để thấy toàn bộ trần.
             */

            else if (name === 'CEILING') {

                position =
                    new THREE.Vector3(
                        0,
                        d.height * 2.05,
                        0.35
                    );


                target.set(
                    0,
                    d.height * 0.72,
                    0
                );
            }


            /*
             * =================================================
             * FLOOR
             * =================================================
             *
             * Nhìn xuống sàn từ phía trước.
             */

            else if (name === 'FLOOR') {

                position =
                    new THREE.Vector3(
                        0,
                        d.height * 0.82,
                        d.depth * 2.10
                    );


                target.set(
                    0,
                    0.04,
                    0
                );
            }


            /*
             * =================================================
             * FALLBACK
             * =================================================
             */

            else {

                var fallbackDistance =
                    this.fitDistance(
                        d.height
                    );


                fallbackDistance =
                    Math.max(
                        fallbackDistance,
                        d.depth * 2.35
                    );


                position =
                    new THREE.Vector3(
                        0,
                        d.height * 0.49,
                        fallbackDistance
                    );
            }


            /*
             * =================================================
             * APPLY CAMERA
             * =================================================
             */

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
             * Render ngay lập tức.
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