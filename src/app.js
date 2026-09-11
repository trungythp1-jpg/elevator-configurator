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

        this.generationToken = null;


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


            /*
             * ====================================================
             * 11-PANEL OPTIONAL STATE
             *
             * Các key này được hỗ trợ từ bây giờ.
             * CONFIG.DEFAULT_STATE chưa cần thay đổi.
             *
             * Group:
             * 1 ↔ 2
             * 3 ↔ 5
             * 4
             * 6 ↔ 8
             * 7
             * 9 ↔ 11
             * 10
             * ====================================================
             */

            var panelGroups = [
                "panel12",
                "panel35",
                "panel4",
                "panel68",
                "panel7",
                "panel911",
                "panel10"
            ];


            panelGroups.forEach(
                function (key) {

                    var value =
                        raw[key];

                    var list =
                        CONFIG.CATALOGS.WALLS || [];


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

                }
            );


            /*
             * ====================================================
             * INDIVIDUAL PANEL STATE
             *
             * Forward-compatible với cabin.js.
             *
             * Chưa bắt buộc UI phải dùng.
             * ====================================================
             */

            for (
                var panel = 1;
                panel <= 11;
                panel++
            ) {

                var panelKey =
                    "panel" + panel;

                var panelValue =
                    raw[panelKey];

                var wallList =
                    CONFIG.CATALOGS.WALLS || [];


                for (
                    var j = 0;
                    j < wallList.length;
                    j++
                ) {

                    if (
                        wallList[j].id ===
                        panelValue
                    ) {

                        s[panelKey] =
                            panelValue;

                        break;
                    }

                }

            }


            /*
             * ====================================================
             * WALL MODE
             * ====================================================
             */

            if (
                raw.wallMode === "SAME" ||
                raw.wallMode === "INDEPENDENT"
            ) {

                s.wallMode =
                    raw.wallMode;
            }


            /*
             * ====================================================
             * CUSTOM COLOR
             * ====================================================
             */

            if (
                /^#[0-9a-f]{6}$/i
                    .test(
                        raw.customColor || ""
                    )
            ) {

                s.customColor =
                    raw.customColor;
            }


            /*
             * ====================================================
             * DOOR
             * ====================================================
             */

            if (
                raw.doorState === "OPEN" ||
                raw.doorState === "CLOSED"
            ) {

                s.doorState =
                    raw.doorState;
            }


            /*
             * ====================================================
             * SAME
             *
             * Vách trái là nguồn.
             * ====================================================
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


            /*
             * CAMERA
             */

            this.ui.on(
                "camera",
                function (view) {

                    self.scene
                        .setCameraPreset(
                            view
                        );

                }
            );


            /*
             * STANDARD SELECT
             */

            this.ui.on(
                "select",
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
                     * =================================================
                     * SAME
                     * =================================================
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


                    /*
                     * Khi đang SAME,
                     * wallLeft là nguồn.
                     */

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


                    /*
                     * =================================================
                     * PANEL GROUPS
                     *
                     * Đồng bộ cặp theo đúng topology 11 panel.
                     * =================================================
                     */

                    if (
                        option.key ===
                        "panel12"
                    ) {

                        self.state.panel1 =
                            option.value;

                        self.state.panel2 =
                            option.value;
                    }


                    if (
                        option.key ===
                        "panel35"
                    ) {

                        self.state.panel3 =
                            option.value;

                        self.state.panel5 =
                            option.value;
                    }


                    if (
                        option.key ===
                        "panel68"
                    ) {

                        self.state.panel6 =
                            option.value;

                        self.state.panel8 =
                            option.value;
                    }


                    if (
                        option.key ===
                        "panel911"
                    ) {

                        self.state.panel9 =
                            option.value;

                        self.state.panel11 =
                            option.value;
                    }


                    /*
                     * Central panels remain independent:
                     *
                     * panel4
                     * panel7
                     * panel10
                     */


                    self.rebuild();

                }
            );


            /*
             * CUSTOM COLOR
             */

            this.ui.on(
                "customColor",
                function (hex) {

                    if (
                        /^#[0-9a-f]{6}$/i
                            .test(hex || "")
                    ) {

                        self.state.customColor =
                            hex;

                    }

                    self.rebuild();

                }
            );


            /*
             * DOOR
             */

            this.ui.on(
                "door",
                function () {

                    self.toggleDoor();

                }
            );


            /*
             * SAVE
             */

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


            /*
             * SHARE
             */

            this.ui.on(
                "share",
                function () {

                    self.share();

                }
            );


            /*
             * RESET
             */

            this.ui.on(
                "reset",
                function () {

                    self.cancelAnimation();

                    self.cancelGeneration();


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


            /*
             * QUOTE
             */

            this.ui.on(
                "quote",
                function () {

                    self.openQuote();

                }
            );


            /*
             * CLOSE QUOTE
             */

            this.ui.on(
                "closeQuote",
                function () {

                    self.ui.closeQuote();

                }
            );


            /*
             * SUBMIT QUOTE
             */

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


            /*
             * Cabin model.
             */

            total +=
                price(
                    "CABIN_MODELS",
                    s.cabinModel
                );


            /*
             * Existing 3-wall pricing contract.
             *
             * Không tự ý đổi sang 11-panel pricing
             * ở bước này vì CONFIG hiện tại vẫn định nghĩa
             * WALLS theo 3 vách.
             */

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


            /*
             * Material.
             */

            total +=
                price(
                    "MATERIALS",
                    s.material
                );


            /*
             * Etched.
             */

            total +=
                price(
                    "ETCHEDS",
                    s.etched
                );


            /*
             * Floor.
             */

            total +=
                price(
                    "FLOORS",
                    s.floor
                );


            /*
             * Ceiling.
             */

            total +=
                price(
                    "CEILINGS",
                    s.ceiling
                );


            /*
             * Handrail.
             */

            total +=
                price(
                    "HANDRAILS",
                    s.handrail
                );


            /*
             * COP.
             */

            total +=
                price(
                    "COPS",
                    s.cop
                );


            /*
             * Lighting.
             */

            total +=
                price(
                    "LIGHTINGS",
                    s.lighting
                );


            return total;
        };


    /*
     * ============================================================
     * CANCEL GENERATION
     * ============================================================
     */

    App.prototype.cancelGeneration =
        function () {

            if (
                this.generationToken
            ) {

                this.generationToken.cancelled =
                    true;
            }

        };


    /*
     * ============================================================
     * REBUILD
     * ============================================================
     */

    App.prototype.rebuild =
        function () {

            var self = this;


            /*
             * New generation.
             */

            var token =
                ++this.token;


            /*
             * Cancel previous door animation.
             */

            this.cancelAnimation();


            /*
             * IMPORTANT:
             * Cancel previous cabin generation.
             */

            this.cancelGeneration();


            /*
             * UI.
             */

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


            this.generationToken =
                generationToken;


            /*
             * ====================================================
             * CURRENT CHECK
             * ====================================================
             */

            function isCurrent(
                currentToken
            ) {

                return (
                    currentToken &&
                    currentToken.id ===
                        self.token &&
                    currentToken.cancelled !== true &&
                    self.generationToken ===
                        currentToken
                );

            }


            /*
             * ====================================================
             * BUILD
             * ====================================================
             */

            Promise.resolve()

                .then(function () {

                    if (
                        !isCurrent(
                            generationToken
                        )
                    ) {
                        return false;
                    }


                    return self.cabin
                        .updateCabin(
                            self.state,
                            generationToken,
                            isCurrent
                        );

                })

                .then(function (result) {

                    /*
                     * Build was cancelled.
                     */

                    if (
                        result === false ||
                        !isCurrent(
                            generationToken
                        )
                    ) {

                        return;

                    }


                    /*
                     * =================================================
                     * DOOR STATE
                     * =================================================
                     */

                    self.cabin
                        .setDoorProgress(
                            self.state.doorState ===
                                "OPEN"
                                ? 1
                                : 0
                        );


                    /*
                     * =================================================
                     * PRICE
                     * =================================================
                     */

                    self.ui.price(
                        self.total()
                    );


                    /*
                     * =================================================
                     * CAMERA
                     * =================================================
                     */

                    self.scene
                        .setCameraPreset(
                            "FRONT"
                        );


                    /*
                     * =================================================
                     * FINISH
                     * =================================================
                     */

                    self.ui.loading(
                        false
                    );

                })

                .catch(function (error) {

                    /*
                     * Ignore obsolete generations.
                     */

                    if (
                        !isCurrent(
                            generationToken
                        )
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


                self.cabin
                    .setDoorProgress(
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


            /*
             * Cabin model.
             */

            add(
                "Mẫu cabin",
                "CABIN_MODELS",
                s.cabinModel
            );


            /*
             * Walls.
             */

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


            /*
             * Other options.
             */

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
                 * Initial camera.
                 */

                app.scene.setCameraPreset(
                    "FRONT"
                );


                /*
                 * Initial build.
                 */

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