(function () {

    function App() {

        this.state =
            JSON.parse(
                JSON.stringify(
                    CONFIG.DEFAULT_STATE
                )
            );


        this.token = 0;

        this.animation = null;


        this.scene =
            new SceneManager(
                document.getElementById(
                    "webgl-canvas"
                )
            );


        this.lighting =
            new LightingManager(
                this.scene.scene
            );


        this.cabin =
            new CabinBuilder(
                this.scene.scene
            );


        this.ui =
            new UIManager();
    }


    /*
     * ============================================================
     * VALIDATE STATE
     * ============================================================
     */

    App.prototype.valid =
        function (raw) {

            var s =
                JSON.parse(
                    JSON.stringify(
                        CONFIG.DEFAULT_STATE
                    )
                );


            if (
                !raw ||
                typeof raw !== "object" ||
                Array.isArray(raw)
            ) {
                return s;
            }


            var groups = {

                cabinModel:
                    "CABIN_MODELS",

                wallLeft:
                    "WALLS",

                wallBack:
                    "WALLS",

                wallRight:
                    "WALLS",

                material:
                    "MATERIALS",

                etched:
                    "ETCHEDS",

                floor:
                    "FLOORS",

                ceiling:
                    "CEILINGS",

                handrail:
                    "HANDRAILS",

                cop:
                    "COPS",

                lighting:
                    "LIGHTINGS",

                colorTone:
                    "COLORS"
            };


            Object.keys(groups)
                .forEach(function (key) {

                    var value =
                        raw[key];

                    var list =
                        CONFIG.CATALOGS[
                            groups[key]
                        ] || [];


                    for (
                        var i = 0;
                        i < list.length;
                        i++
                    ) {

                        if (
                            list[i].id === value
                        ) {

                            s[key] = value;

                            break;
                        }
                    }

                });


            if (
                raw.wallMode === "SAME" ||
                raw.wallMode === "INDEPENDENT"
            ) {

                s.wallMode =
                    raw.wallMode;
            }


            if (
                /^#[0-9a-f]{6}$/i
                    .test(
                        raw.customColor || ""
                    )
            ) {

                s.customColor =
                    raw.customColor;
            }


            if (
                raw.doorState === "OPEN" ||
                raw.doorState === "CLOSED"
            ) {

                s.doorState =
                    raw.doorState;
            }


            /*
             * SAME:
             * vách trái là nguồn.
             */

            if (
                s.wallMode === "SAME"
            ) {

                s.wallBack =
                    s.wallLeft;

                s.wallRight =
                    s.wallLeft;
            }


            return s;
        };


    /*
     * ============================================================
     * LOAD STATE
     * ============================================================
     */

    App.prototype.loadState =
        function () {

            var params =
                new URLSearchParams(
                    location.search
                );


            var encoded =
                params.get("config");


            if (encoded) {

                try {

                    this.state =
                        this.valid(
                            JSON.parse(
                                decodeURIComponent(
                                    escape(
                                        atob(encoded)
                                    )
                                )
                            )
                        );

                    return;

                } catch (e) {

                    console.warn(
                        "Invalid shared configuration",
                        e
                    );

                }

            }


            var saved =
                localStorage.getItem(
                    "elevator_config_state"
                );


            if (saved) {

                try {

                    this.state =
                        this.valid(
                            JSON.parse(saved)
                        );

                } catch (e) {

                    localStorage.removeItem(
                        "elevator_config_state"
                    );

                }

            }

        };


    /*
     * ============================================================
     * BIND EVENTS
     * ============================================================
     */

    App.prototype.bind =
        function () {

            var self = this;


            this.ui.on(
                "camera",
                function (view) {

                    self.scene
                        .setCameraPreset(
                            view
                        );

                }
            );


            this.ui.on(
                "select",
                function (option) {

                    self.state[
                        option.key
                    ] = option.value;


                    /*
                     * SAME:
                     * vách trái điều khiển
                     * cả 3 vách.
                     */

                    if (
                        option.key ===
                            "wallMode" &&
                        option.value ===
                            "SAME"
                    ) {

                        self.state.wallBack =
                            self.state.wallLeft;

                        self.state.wallRight =
                            self.state.wallLeft;
                    }


                    if (
                        option.key ===
                            "wallLeft" &&
                        self.state.wallMode ===
                            "SAME"
                    ) {

                        self.state.wallBack =
                            option.value;

                        self.state.wallRight =
                            option.value;
                    }


                    self.rebuild();

                }
            );


            this.ui.on(
                "customColor",
                function (hex) {

                    self.state.customColor =
                        hex;

                    self.rebuild();

                }
            );


            this.ui.on(
                "door",
                function () {

                    self.toggleDoor();

                }
            );


            this.ui.on(
                "save",
                function () {

                    localStorage.setItem(
                        "elevator_config_state",
                        JSON.stringify(
                            self.state
                        )
                    );


                    self.ui.toast(
                        "Đã lưu cấu hình."
                    );

                }
            );


            this.ui.on(
                "share",
                function () {

                    self.share();

                }
            );


            this.ui.on(
                "reset",
                function () {

                    self.cancelAnimation();


                    self.state =
                        JSON.parse(
                            JSON.stringify(
                                CONFIG.DEFAULT_STATE
                            )
                        );


                    localStorage.removeItem(
                        "elevator_config_state"
                    );


                    history.replaceState(
                        {},
                        document.title,
                        location.pathname
                    );


                    self.rebuild();


                    self.ui.toast(
                        "Đã đặt lại cấu hình."
                    );

                }
            );


            this.ui.on(
                "quote",
                function () {

                    self.openQuote();

                }
            );


            this.ui.on(
                "closeQuote",
                function () {

                    self.ui.closeQuote();

                }
            );


            this.ui.on(
                "submitQuote",
                function () {

                    self.ui.toast(
                        "Thông tin báo giá đã được ghi nhận."
                    );

                }
            );

        };


    /*
     * ============================================================
     * PRICE
     * ============================================================
     */

    App.prototype.total =
        function () {

            var s =
                this.state;

            var catalogs =
                CONFIG.CATALOGS;


            var total = 0;


            function price(
                group,
                id
            ) {

                var list =
                    catalogs[group] || [];


                for (
                    var i = 0;
                    i < list.length;
                    i++
                ) {

                    if (
                        list[i].id === id
                    ) {

                        return list[i].price || 0;
                    }

                }


                return 0;
            }


            total +=
                price(
                    "CABIN_MODELS",
                    s.cabinModel
                );


            if (
                s.wallMode === "SAME"
            ) {

                total +=
                    price(
                        "WALLS",
                        s.wallLeft
                    ) * 3;

            } else {

                total +=
                    price(
                        "WALLS",
                        s.wallLeft
                    );

                total +=
                    price(
                        "WALLS",
                        s.wallBack
                    );

                total +=
                    price(
                        "WALLS",
                        s.wallRight
                    );

            }


            total +=
                price(
                    "MATERIALS",
                    s.material
                );


            total +=
                price(
                    "ETCHEDS",
                    s.etched
                );


            total +=
                price(
                    "FLOORS",
                    s.floor
                );


            total +=
                price(
                    "CEILINGS",
                    s.ceiling
                );


            total +=
                price(
                    "HANDRAILS",
                    s.handrail
                );


            total +=
                price(
                    "COPS",
                    s.cop
                );


            total +=
                price(
                    "LIGHTINGS",
                    s.lighting
                );


            return total;
        };


    /*
     * ============================================================
     * REBUILD
     * ============================================================
     */

    App.prototype.rebuild =
        function () {

            var self = this;


            var token =
                ++this.token;


            this.cancelAnimation();


            this.ui.render(
                this.state
            );


            this.ui.loading(
                true,
                "Đang dựng cabin 3D…"
            );


            this.ui.doorButton(
                this.state.doorState
            );


            /*
             * ====================================================
             * LIGHTING
             * ====================================================
             */

            var lightingId =
                this.state.lighting;


            if (
                this.lighting.updateLighting
            ) {

                this.lighting.updateLighting(
                    lightingId
                );

            } else if (
                this.lighting.applyPreset
            ) {

                var list =
                    CONFIG.CATALOGS
                        .LIGHTINGS || [];


                var item = null;


                for (
                    var i = 0;
                    i < list.length;
                    i++
                ) {

                    if (
                        list[i].id ===
                        lightingId
                    ) {

                        item = list[i];

                        break;
                    }

                }


                if (item) {

                    this.lighting.applyPreset(
                        item
                    );

                }

            }


            /*
             * ====================================================
             * GENERATION TOKEN
             * ====================================================
             */

            var generationToken = {
                cancelled: false,
                id: token
            };


            /*
             * Callback kiểm tra generation.
             */

            function isCurrent(
                currentToken
            ) {

                return (
                    currentToken &&
                    currentToken.id ===
                        self.token &&
                    currentToken.cancelled !== true
                );
            }


            /*
             * ====================================================
             * BUILD
             * ====================================================
             */

            Promise.resolve()
                .then(function () {

                    return self.cabin.updateCabin(
                        self.state,
                        generationToken,
                        isCurrent
                    );

                })
                .then(function () {

                    if (
                        token !== self.token
                    ) {
                        return;
                    }


                    /*
                     * Door state.
                     */

                    self.cabin.setDoorProgress(
                        self.state.doorState ===
                            "OPEN"
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
                     * Camera.
                     */

                    self.scene.setCameraPreset(
                        "FRONT"
                    );


                    /*
                     * Finish.
                     */

                    self.ui.loading(
                        false
                    );

                })
                .catch(function (error) {

                    if (
                        token !== self.token
                    ) {
                        return;
                    }


                    console.error(
                        "Elevator Configurator build error:",
                        error
                    );


                    self.ui.price(
                        self.total()
                    );


                    self.ui.loading(
                        false
                    );


                    self.ui.toast(
                        "Có lỗi khi dựng cấu hình 3D."
                    );

                });

        };


    /*
     * ============================================================
     * CANCEL
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

                this.animation = null;
            }

        };


    /*
     * ============================================================
     * DOOR
     * ============================================================
     */

    App.prototype.toggleDoor =
        function () {

            var self = this;


            if (
                !this.cabin.door.left ||
                !this.cabin.door.right
            ) {

                return;
            }


            this.cancelAnimation();


            var from =
                this.cabin.door.progress;


            var to =
                this.state.doorState ===
                    "OPEN"
                    ? 0
                    : 1;


            var start =
                performance.now();


            var duration =
                650;


            this.state.doorState =
                to === 1
                    ? "OPEN"
                    : "CLOSED";


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


                var eased =
                    progress < 0.5
                        ? 2 *
                          progress *
                          progress
                        : 1 -
                          Math.pow(
                              -2 *
                                  progress +
                                  2,
                              2
                          ) /
                              2;


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
                    "?config=" +
                    encoded;


                if (
                    !navigator.clipboard
                ) {

                    throw new Error(
                        "clipboard"
                    );

                }


                await navigator.clipboard
                    .writeText(url);


                this.ui.toast(
                    "Đã sao chép liên kết chia sẻ."
                );


            } catch (error) {

                this.ui.toast(
                    "Không thể sao chép liên kết trên trình duyệt này."
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

            var self = this;

            var s =
                this.state;


            var catalogs =
                CONFIG.CATALOGS;


            var rows = [];


            function find(
                group,
                id
            ) {

                var list =
                    catalogs[group] || [];


                for (
                    var i = 0;
                    i < list.length;
                    i++
                ) {

                    if (
                        list[i].id === id
                    ) {

                        return list[i];
                    }

                }


                return null;
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
                    item.price > 0
                ) {

                    rows.push({

                        label:
                            label +
                            " — " +
                            item.name,

                        price:
                            item.price

                    });

                }

            }


            add(
                "Mẫu cabin",
                "CABIN_MODELS",
                s.cabinModel
            );


            var wall =
                find(
                    "WALLS",
                    s.wallLeft
                );


            if (
                wall &&
                wall.price > 0
            ) {

                rows.push({

                    label:
                        s.wallMode ===
                            "SAME"
                            ? "3 vách — " +
                              wall.name
                            : "Vách trái — " +
                              wall.name,

                    price:
                        wall.price *
                        (
                            s.wallMode ===
                                "SAME"
                                ? 3
                                : 1
                        )

                });

            }


            if (
                s.wallMode ===
                "INDEPENDENT"
            ) {

                var back =
                    find(
                        "WALLS",
                        s.wallBack
                    );


                var right =
                    find(
                        "WALLS",
                        s.wallRight
                    );


                if (
                    back &&
                    back.price > 0
                ) {

                    rows.push({

                        label:
                            "Vách sau — " +
                            back.name,

                        price:
                            back.price

                    });

                }


                if (
                    right &&
                    right.price > 0
                ) {

                    rows.push({

                        label:
                            "Vách phải — " +
                            right.name,

                        price:
                            right.price

                    });

                }

            }


            add(
                "Vật liệu",
                "MATERIALS",
                s.material
            );


            add(
                "Hoa văn",
                "ETCHEDS",
                s.etched
            );


            add(
                "Sàn",
                "FLOORS",
                s.floor
            );


            add(
                "Trần",
                "CEILINGS",
                s.ceiling
            );


            add(
                "Tay vịn",
                "HANDRAILS",
                s.handrail
            );


            add(
                "COP",
                "COPS",
                s.cop
            );


            add(
                "Ánh sáng",
                "LIGHTINGS",
                s.lighting
            );


            this.ui.quote(
                rows,
                this.total()
            );

        };


    /*
     * ============================================================
     * INIT
     * ============================================================
     */

    document.addEventListener(
        "DOMContentLoaded",
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
                 * Camera FRONT mới.
                 */

                app.scene.setCameraPreset(
                    "FRONT"
                );


                app.rebuild();


            } catch (error) {

                console.error(
                    "Elevator Configurator initialization error:",
                    error
                );

            }

        }
    );

})();