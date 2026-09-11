(function () {

    function App() {

        this.state =
            JSON.parse(
                JSON.stringify(
                    CONFIG.DEFAULT_STATE
                )
            );

        /*
         * Generation token.
         *
         * Mỗi lần rebuild sẽ tăng token.
         * Các promise cũ sẽ tự vô hiệu hóa.
         */

        this.token = 0;

        /*
         * Door animation frame.
         */

        this.animation = null;


        /*
         * ========================================================
         * THREE SCENE
         * ========================================================
         */

        var canvas =
            document.getElementById(
                'webgl-canvas'
            );


        if (!canvas) {
            throw new Error(
                'Elevator Configurator: #webgl-canvas not found'
            );
        }


        this.scene =
            new SceneManager(
                canvas
            );


        /*
         * ========================================================
         * LIGHTING
         * ========================================================
         */

        this.lighting =
            new LightingManager(
                this.scene.scene
            );


        /*
         * ========================================================
         * CABIN
         * ========================================================
         */

        this.cabin =
            new CabinBuilder(
                this.scene.scene
            );


        /*
         * ========================================================
         * UI
         * ========================================================
         */

        this.ui =
            new UIManager();
    }


    /*
     * ============================================================
     * VALIDATE STATE
     * ============================================================
     */

    App.prototype.valid = function (raw) {

        var state =
            JSON.parse(
                JSON.stringify(
                    CONFIG.DEFAULT_STATE
                )
            );


        if (
            !raw ||
            typeof raw !== 'object' ||
            Array.isArray(raw)
        ) {
            return state;
        }


        var groups = {

            cabinModel: 'CABIN_MODELS',

            wallLeft: 'WALLS',
            wallBack: 'WALLS',
            wallRight: 'WALLS',

            material: 'MATERIALS',

            etched: 'ETCHEDS',

            floor: 'FLOORS',

            ceiling: 'CEILINGS',

            handrail: 'HANDRAILS',

            cop: 'COPS',

            lighting: 'LIGHTINGS',

            colorTone: 'COLORS'
        };


        Object.keys(groups).forEach(
            function (key) {

                var value =
                    raw[key];

                var list =
                    CONFIG.CATALOGS[
                        groups[key]
                    ] || [];


                if (
                    list.some(
                        function (item) {
                            return item.id === value;
                        }
                    )
                ) {
                    state[key] =
                        value;
                }
            }
        );


        /*
         * Wall mode
         */

        if (
            raw.wallMode === 'SAME' ||
            raw.wallMode === 'INDEPENDENT'
        ) {
            state.wallMode =
                raw.wallMode;
        }


        /*
         * Custom color
         */

        if (
            /^#[0-9a-f]{6}$/i.test(
                raw.customColor || ''
            )
        ) {
            state.customColor =
                raw.customColor;
        }


        /*
         * Door state
         */

        if (
            raw.doorState === 'OPEN' ||
            raw.doorState === 'CLOSED'
        ) {
            state.doorState =
                raw.doorState;
        }


        /*
         * SAME mode:
         * all three walls follow wallLeft.
         */

        if (
            state.wallMode === 'SAME'
        ) {

            state.wallBack =
                state.wallLeft;

            state.wallRight =
                state.wallLeft;
        }


        return state;
    };


    /*
     * ============================================================
     * LOAD STATE
     * ============================================================
     */

    App.prototype.loadState = function () {

        var encoded =
            new URLSearchParams(
                location.search
            ).get('config');


        /*
         * Shared URL configuration
         */

        if (encoded) {

            try {

                var decoded =
                    decodeURIComponent(
                        escape(
                            atob(encoded)
                        )
                    );


                this.state =
                    this.valid(
                        JSON.parse(decoded)
                    );


                return;

            } catch (error) {

                console.warn(
                    'Invalid shared configuration:',
                    error
                );
            }
        }


        /*
         * Local saved configuration
         */

        var saved =
            localStorage.getItem(
                'elevator_config_state'
            );


        if (saved) {

            try {

                this.state =
                    this.valid(
                        JSON.parse(saved)
                    );

            } catch (error) {

                console.warn(
                    'Invalid saved configuration:',
                    error
                );

                localStorage.removeItem(
                    'elevator_config_state'
                );
            }
        }
    };


    /*
     * ============================================================
     * EVENT BINDING
     * ============================================================
     */

    App.prototype.bind = function () {

        var self = this;


        /*
         * Camera
         */

        this.ui.on(
            'camera',
            function (view) {

                self.scene.setCameraPreset(
                    view
                );
            }
        );


        /*
         * Configuration selection
         */

        this.ui.on(
            'select',
            function (option) {

                if (
                    !option ||
                    !option.key
                ) {
                    return;
                }


                self.state[
                    option.key
                ] = option.value;


                /*
                 * SAME mode
                 */

                if (
                    option.key === 'wallMode' &&
                    option.value === 'SAME'
                ) {

                    self.state.wallBack =
                        self.state.wallLeft;

                    self.state.wallRight =
                        self.state.wallLeft;
                }


                /*
                 * Changing left wall while SAME:
                 * synchronize all three walls.
                 */

                if (
                    option.key === 'wallLeft' &&
                    self.state.wallMode === 'SAME'
                ) {

                    self.state.wallBack =
                        option.value;

                    self.state.wallRight =
                        option.value;
                }


                self.rebuild();
            }
        );


        /*
         * Custom color
         */

        this.ui.on(
            'customColor',
            function (hex) {

                if (
                    !/^#[0-9a-f]{6}$/i.test(
                        hex || ''
                    )
                ) {
                    return;
                }


                self.state.customColor =
                    hex;


                self.rebuild();
            }
        );


        /*
         * Door
         */

        this.ui.on(
            'door',
            function () {
                self.toggleDoor();
            }
        );


        /*
         * Save
         */

        this.ui.on(
            'save',
            function () {

                localStorage.setItem(
                    'elevator_config_state',
                    JSON.stringify(
                        self.state
                    )
                );


                self.ui.toast(
                    'Đã lưu cấu hình.'
                );
            }
        );


        /*
         * Share
         */

        this.ui.on(
            'share',
            function () {
                self.share();
            }
        );


        /*
         * Reset
         */

        this.ui.on(
            'reset',
            function () {

                self.cancelAnimation();


                self.token++;


                self.state =
                    JSON.parse(
                        JSON.stringify(
                            CONFIG.DEFAULT_STATE
                        )
                    );


                localStorage.removeItem(
                    'elevator_config_state'
                );


                history.replaceState(
                    {},
                    document.title,
                    location.pathname
                );


                self.rebuild();


                self.ui.toast(
                    'Đã đặt lại cấu hình.'
                );
            }
        );


        /*
         * Quote
         */

        this.ui.on(
            'quote',
            function () {
                self.openQuote();
            }
        );


        /*
         * Close quote
         */

        this.ui.on(
            'closeQuote',
            function () {
                self.ui.closeQuote();
            }
        );


        /*
         * Submit quote
         */

        this.ui.on(
            'submitQuote',
            function () {

                self.ui.toast(
                    'Thông tin báo giá đã được ghi nhận.'
                );
            }
        );
    };


    /*
     * ============================================================
     * TOTAL PRICE
     * ============================================================
     */

    App.prototype.total = function () {

        var state =
            this.state;

        var catalogs =
            CONFIG.CATALOGS;

        var total = 0;


        function price(
            group,
            id
        ) {

            var item =
                (catalogs[group] || [])
                    .find(
                        function (entry) {
                            return entry.id === id;
                        }
                    );


            return item
                ? Number(item.price) || 0
                : 0;
        }


        /*
         * Cabin
         */

        total += price(
            'CABIN_MODELS',
            state.cabinModel
        );


        /*
         * Walls
         */

        if (
            state.wallMode === 'SAME'
        ) {

            total +=
                price(
                    'WALLS',
                    state.wallLeft
                ) * 3;

        } else {

            total +=
                price(
                    'WALLS',
                    state.wallLeft
                );

            total +=
                price(
                    'WALLS',
                    state.wallBack
                );

            total +=
                price(
                    'WALLS',
                    state.wallRight
                );
        }


        /*
         * Remaining categories
         */

        [
            [
                'MATERIALS',
                state.material
            ],
            [
                'ETCHEDS',
                state.etched
            ],
            [
                'FLOORS',
                state.floor
            ],
            [
                'CEILINGS',
                state.ceiling
            ],
            [
                'HANDRAILS',
                state.handrail
            ],
            [
                'COPS',
                state.cop
            ],
            [
                'LIGHTINGS',
                state.lighting
            ]

        ].forEach(
            function (entry) {

                total +=
                    price(
                        entry[0],
                        entry[1]
                    );
            }
        );


        return total;
    };


    /*
     * ============================================================
     * REBUILD
     * ============================================================
     */

    App.prototype.rebuild = function () {

        var self = this;


        /*
         * New generation.
         */

        var token =
            ++this.token;


        /*
         * Stop door animation.
         */

        this.cancelAnimation();


        /*
         * Update UI immediately.
         */

        this.ui.render(
            this.state
        );


        this.ui.loading(
            true,
            'Đang dựng cabin 3D…'
        );


        this.ui.doorButton(
            this.state.doorState
        );


        /*
         * ========================================================
         * LIGHTING
         * ========================================================
         *
         * LightingManager expects ID:
         *
         * L01 / L02 / L03 / L04
         */

        self.lighting.updateLighting(
            self.state.lighting
        );


        /*
         * ========================================================
         * CABIN BUILD
         * ========================================================
         *
         * CabinBuilder contract:
         *
         * build(
         *     state,
         *     token,
         *     isCurrent
         * )
         *
         * isCurrent must be supplied because CabinBuilder
         * checks asynchronous generation validity.
         */

        this.cabin.build(
            this.state,
            token,
            function (generation) {

                return (
                    generation ===
                    self.token
                );
            }
        )

        .then(
            function () {

                /*
                 * Ignore stale generation.
                 */

                if (
                    token !== self.token
                ) {
                    return;
                }


                /*
                 * Set final door state.
                 */

                self.cabin.setDoorProgress(
                    self.state.doorState === 'OPEN'
                        ? 1
                        : 0
                );


                /*
                 * Price.
                 */

                self.ui.price(
                    self.total()
                );


                /*
                 * Hide loading.
                 */

                self.ui.loading(
                    false
                );


                /*
                 * Render.
                 */

                if (
                    self.scene &&
                    typeof self.scene.render === 'function'
                ) {
                    self.scene.render();
                }
            }
        )

        .catch(
            function (error) {

                if (
                    token !== self.token
                ) {
                    return;
                }


                console.error(
                    'Elevator Configurator build error:',
                    error
                );


                self.ui.price(
                    self.total()
                );


                self.ui.loading(
                    false
                );


                self.ui.toast(
                    'Có lỗi khi dựng cấu hình 3D.'
                );
            }
        );
    };


    /*
     * ============================================================
     * CANCEL DOOR ANIMATION
     * ============================================================
     */

    App.prototype.cancelAnimation =
        function () {

            if (
                this.animation !== null
            ) {

                cancelAnimationFrame(
                    this.animation
                );

                this.animation =
                    null;
            }
        };


    /*
     * ============================================================
     * TOGGLE DOOR
     * ============================================================
     */

    App.prototype.toggleDoor = function () {

        var self = this;


        /*
         * CabinBuilder contract:
         *
         * door.left
         * door.right
         * door.progress
         */

        if (
            !this.cabin ||
            !this.cabin.door ||
            !this.cabin.door.left ||
            !this.cabin.door.right
        ) {
            return;
        }


        this.cancelAnimation();


        var from =
            Number(
                this.cabin.door.progress
            );


        /*
         * Current state OPEN means
         * current door progress = 1.
         *
         * Toggle target:
         *
         * OPEN -> CLOSED = 0
         * CLOSED -> OPEN = 1
         */

        var to =
            this.state.doorState === 'OPEN'
                ? 0
                : 1;


        var start =
            performance.now();


        var duration =
            650;


        /*
         * Update logical state immediately.
         */

        this.state.doorState =
            to === 1
                ? 'OPEN'
                : 'CLOSED';


        this.ui.doorButton(
            this.state.doorState
        );


        function step(now) {

            var progress =
                Math.min(
                    1,
                    (now - start) /
                    duration
                );


            /*
             * Smooth ease-in-out.
             */

            var eased =
                progress < 0.5

                    ? 2 *
                      progress *
                      progress

                    : 1 -
                      Math.pow(
                          -2 * progress + 2,
                          2
                      ) / 2;


            self.cabin.setDoorProgress(
                from +
                (to - from) *
                eased
            );


            if (
                progress < 1
            ) {

                self.animation =
                    requestAnimationFrame(
                        step
                    );

            } else {

                self.animation =
                    null;

                self.cabin.setDoorProgress(
                    to
                );
            }
        }


        this.animation =
            requestAnimationFrame(
                step
            );
    };


    /*
     * ============================================================
     * SHARE
     * ============================================================
     */

    App.prototype.share =
        async function () {

            try {

                var encoded =
                    btoa(
                        unescape(
                            encodeURIComponent(
                                JSON.stringify(
                                    this.state
                                )
                            )
                        )
                    );


                var url =
                    location.origin +
                    location.pathname +
                    '?config=' +
                    encoded;


                if (
                    !navigator.clipboard
                ) {
                    throw new Error(
                        'clipboard unavailable'
                    );
                }


                await navigator.clipboard.writeText(
                    url
                );


                this.ui.toast(
                    'Đã sao chép liên kết chia sẻ.'
                );

            } catch (error) {

                console.warn(
                    'Share error:',
                    error
                );


                this.ui.toast(
                    'Không thể sao chép liên kết trên trình duyệt này.'
                );
            }
        };


    /*
     * ============================================================
     * QUOTE
     * ============================================================
     */

    App.prototype.openQuote =
        function () {

            var state =
                this.state;

            var catalogs =
                CONFIG.CATALOGS;

            var rows = [];


            function find(
                group,
                id
            ) {

                return (
                    catalogs[group] || []
                ).find(
                    function (item) {
                        return item.id === id;
                    }
                );
            }


            function add(
                label,
                group,
                id
            ) {

                var item =
                    find(
                        group,
                        id
                    );


                if (
                    item &&
                    Number(item.price) > 0
                ) {

                    rows.push({
                        label:
                            label +
                            ' — ' +
                            item.name,

                        price:
                            Number(item.price)
                    });
                }
            }


            /*
             * Cabin
             */

            add(
                'Mẫu cabin',
                'CABIN_MODELS',
                state.cabinModel
            );


            /*
             * Walls
             */

            var leftWall =
                find(
                    'WALLS',
                    state.wallLeft
                );


            if (
                leftWall &&
                Number(leftWall.price) > 0
            ) {

                rows.push({

                    label:
                        state.wallMode === 'SAME'

                            ? '3 vách — ' +
                              leftWall.name

                            : 'Vách trái — ' +
                              leftWall.name,

                    price:
                        Number(leftWall.price) *
                        (
                            state.wallMode === 'SAME'
                                ? 3
                                : 1
                        )
                });
            }


            /*
             * Independent walls
             */

            if (
                state.wallMode === 'INDEPENDENT'
            ) {

                var backWall =
                    find(
                        'WALLS',
                        state.wallBack
                    );


                var rightWall =
                    find(
                        'WALLS',
                        state.wallRight
                    );


                if (
                    backWall &&
                    Number(backWall.price) > 0
                ) {

                    rows.push({

                        label:
                            'Vách sau — ' +
                            backWall.name,

                        price:
                            Number(backWall.price)
                    });
                }


                if (
                    rightWall &&
                    Number(rightWall.price) > 0
                ) {

                    rows.push({

                        label:
                            'Vách phải — ' +
                            rightWall.name,

                        price:
                            Number(rightWall.price)
                    });
                }
            }


            /*
             * Remaining categories
             */

            add(
                'Vật liệu',
                'MATERIALS',
                state.material
            );


            add(
                'Hoa văn',
                'ETCHEDS',
                state.etched
            );


            add(
                'Sàn',
                'FLOORS',
                state.floor
            );


            add(
                'Trần',
                'CEILINGS',
                state.ceiling
            );


            add(
                'Tay vịn',
                'HANDRAILS',
                state.handrail
            );


            add(
                'COP',
                'COPS',
                state.cop
            );


            add(
                'Ánh sáng',
                'LIGHTINGS',
                state.lighting
            );


            this.ui.quote(
                rows,
                this.total()
            );
        };


    /*
     * ============================================================
     * BOOT
     * ============================================================
     */

    document.addEventListener(
        'DOMContentLoaded',
        function () {

            try {

                var app =
                    new App();


                window.ElevatorConfigurator =
                    app;


                app.loadState();

                app.bind();

                app.ui.bind();


                /*
                 * Initial camera.
                 */

                app.scene.setCameraPreset(
                    'FRONT'
                );


                /*
                 * Initial build.
                 */

                app.rebuild();

            } catch (error) {

                console.error(
                    'Elevator Configurator initialization error:',
                    error
                );


                var loading =
                    document.getElementById(
                        'loading-overlay'
                    );


                if (loading) {

                    loading.classList.add(
                        'hidden'
                    );
                }


                var toast =
                    document.getElementById(
                        'toast'
                    );


                if (toast) {

                    toast.textContent =
                        'Không thể khởi tạo bộ cấu hình 3D. Vui lòng kiểm tra Console.';

                    toast.classList.remove(
                        'hidden'
                    );
                }
            }
        }
    );

})();