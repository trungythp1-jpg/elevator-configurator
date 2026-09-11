window.SceneManager = (function () {

    function Manager(canvas) {

        if (!canvas) {
            throw new Error('SceneManager: canvas not found');
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

        /*
         * Bright neutral showroom background.
         */
        this.scene.background =
            new THREE.Color(0xdfe4e6);


        /*
         * ========================================================
         * CAMERA
         * ========================================================
         */

        this.camera =
            new THREE.PerspectiveCamera(
                42,
                1,
                0.05,
                100
            );


        /*
         * ========================================================
         * ORBIT CONTROLS
         * ========================================================
         *
         * Controls tồn tại để giữ compatibility với
         * hệ thống camera hiện tại, nhưng người dùng
         * không được tự do xoay/pan/zoom.
         */

        this.controls =
            new THREE.OrbitControls(
                this.camera,
                canvas
            );

        this.controls.enableRotate = false;
        this.controls.enablePan = false;
        this.controls.enableZoom = false;

        /*
         * Không damping để tránh animation không cần thiết.
         */
        this.controls.enableDamping = false;


        /*
         * ========================================================
         * INITIAL RESIZE
         * ========================================================
         */

        this.resize();


        /*
         * ========================================================
         * RESIZE HANDLER
         * ========================================================
         */

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

        this.setCameraPreset('FRONT');


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

        if (!this.canvas) {
            return;
        }

        /*
         * clientWidth/clientHeight đôi khi bằng 0 trong
         * thời điểm DOM vừa layout trên mobile.
         *
         * Dùng bounding rect làm fallback.
         */

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

            var dimensions =
                CONFIG.DIMENSIONS;

            /*
             * Target mặc định nằm gần trung tâm cabin.
             */
            var target =
                new THREE.Vector3(
                    0,
                    dimensions.height * 0.48,
                    0
                );


            var position;


            switch (String(view || 'FRONT').toUpperCase()) {

                /*
                 * =================================================
                 * FRONT
                 * =================================================
                 *
                 * Nhìn thẳng vào cabin từ phía cửa.
                 */

                case 'FRONT':

                    position =
                        new THREE.Vector3(
                            0,
                            dimensions.height * 0.48,
                            dimensions.depth * 1.38
                        );

                    break;


                /*
                 * =================================================
                 * REAR
                 * =================================================
                 */

                case 'REAR':

                    position =
                        new THREE.Vector3(
                            0,
                            dimensions.height * 0.48,
                            -dimensions.depth * 1.45
                        );

                    break;


                /*
                 * =================================================
                 * LEFT
                 * =================================================
                 */

                case 'LEFT':

                    position =
                        new THREE.Vector3(
                            -dimensions.width * 1.45,
                            dimensions.height * 0.48,
                            0
                        );

                    break;


                /*
                 * =================================================
                 * RIGHT
                 * =================================================
                 */

                case 'RIGHT':

                    position =
                        new THREE.Vector3(
                            dimensions.width * 1.45,
                            dimensions.height * 0.48,
                            0
                        );

                    break;


                /*
                 * =================================================
                 * CEILING
                 * =================================================
                 */

                case 'CEILING':

                    position =
                        new THREE.Vector3(
                            0,
                            dimensions.height * 1.52,
                            0.02
                        );

                    target.set(
                        0,
                        dimensions.height * 0.78,
                        0
                    );

                    break;


                /*
                 * =================================================
                 * FLOOR
                 * =================================================
                 */

                case 'FLOOR':

                    position =
                        new THREE.Vector3(
                            0,
                            dimensions.height * 0.66,
                            0.02
                        );

                    target.set(
                        0,
                        0.08,
                        0
                    );

                    break;


                /*
                 * Fallback.
                 */

                default:

                    position =
                        new THREE.Vector3(
                            0,
                            dimensions.height * 0.48,
                            dimensions.depth * 1.38
                        );

                    break;
            }


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
             * Render ngay lập tức để camera đổi view
             * không phải chờ frame tiếp theo.
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


    /*
     * ============================================================
     * ANIMATION LOOP
     * ============================================================
     *
     * Chỉ một render loop duy nhất.
     */

    Manager.prototype.animate = function () {

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