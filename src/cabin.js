window.CabinBuilder = (function () {

    function findCatalog(group, id) {

        var list =
            CONFIG.CATALOGS[group] || [];

        for (var i = 0; i < list.length; i++) {

            if (list[i].id === id) {
                return list[i];
            }
        }

        return null;
    }


    function Builder(scene) {

        this.scene = scene;

        this.root = new THREE.Group();

        this.root.name = "Cabin";

        scene.add(this.root);

        this.mm =
            MaterialManager.getInstance();

        this.loader =
            new THREE.GLTFLoader();

        this.gltfCache =
            new Map();

        this.door = {
            left: null,
            right: null,
            progress: 1
        };
    }


    /*
     * ============================================================
     * CLEAR
     * ============================================================
     */

    Builder.prototype.clear = function () {

        while (this.root.children.length) {

            var child =
                this.root.children[
                    this.root.children.length - 1
                ];

            this.root.remove(child);
        }

        this.door.left = null;
        this.door.right = null;
        this.door.progress = 1;
    };


    /*
     * ============================================================
     * MESH
     * ============================================================
     */

    Builder.prototype.mesh =
        function (
            parent,
            geometry,
            material,
            x,
            y,
            z,
            name
        ) {

            var mesh =
                new THREE.Mesh(
                    geometry,
                    material
                );

            mesh.position.set(
                x,
                y,
                z
            );

            mesh.name =
                name || "Mesh";

            mesh.castShadow = true;
            mesh.receiveShadow = true;

            parent.add(mesh);

            return mesh;
        };


    /*
     * ============================================================
     * UPDATE CABIN
     * ============================================================
     */

    Builder.prototype.updateCabin =
        function (
            state,
            generationToken,
            tokenCheckCallback
        ) {

            var self = this;

            var d =
                CONFIG.DIMENSIONS;

            var c =
                CONFIG.CATALOGS;


            var wallLeft =
                findCatalog(
                    "WALLS",
                    state.wallLeft
                ) ||
                c.WALLS[0];

            var wallBack =
                findCatalog(
                    "WALLS",
                    state.wallBack
                ) ||
                c.WALLS[0];

            var wallRight =
                findCatalog(
                    "WALLS",
                    state.wallRight
                ) ||
                c.WALLS[0];

            var base =
                findCatalog(
                    "MATERIALS",
                    state.material
                ) ||
                c.MATERIALS[0];

            var etched =
                findCatalog(
                    "ETCHEDS",
                    state.etched
                ) ||
                c.ETCHEDS[0];

            var floor =
                findCatalog(
                    "FLOORS",
                    state.floor
                ) ||
                c.FLOORS[0];

            var color =
                findCatalog(
                    "COLORS",
                    state.colorTone
                );

            var hex =
                state.colorTone === "CUSTOM"
                    ? state.customColor
                    : (
                        color &&
                        color.hex
                            ? color.hex
                            : null
                    );


            /*
             * ====================================================
             * MATERIALS
             * ====================================================
             */

            return Promise.all([

                self.mm.getWallMaterial(
                    wallLeft,
                    base,
                    hex,
                    etched,
                    d.width,
                    d.height
                ),

                self.mm.getWallMaterial(
                    wallBack,
                    base,
                    hex,
                    etched,
                    d.width,
                    d.height
                ),

                self.mm.getWallMaterial(
                    wallRight,
                    base,
                    hex,
                    etched,
                    d.depth,
                    d.height
                ),

                self.mm.getFloorMaterial(
                    floor,
                    d.width,
                    d.depth
                )

            ]).then(function (materials) {

                if (
                    tokenCheckCallback &&
                    !tokenCheckCallback(
                        generationToken
                    )
                ) {
                    return;
                }


                self.clear();


                /*
                 * =================================================
                 * INTERIOR SHELL
                 * =================================================
                 */

                var shell =
                    new THREE.Group();

                shell.name =
                    "InteriorShell";

                self.root.add(shell);


                var wallThickness =
                    0.035;


                /*
                 * BACK WALL
                 */

                self.mesh(
                    shell,
                    new THREE.BoxGeometry(
                        d.width,
                        d.height,
                        wallThickness
                    ),
                    materials[1],
                    0,
                    d.height / 2,
                    -d.depth / 2,
                    "BackWall"
                );


                /*
                 * LEFT WALL
                 */

                self.mesh(
                    shell,
                    new THREE.BoxGeometry(
                        wallThickness,
                        d.height,
                        d.depth
                    ),
                    materials[0],
                    -d.width / 2,
                    d.height / 2,
                    0,
                    "LeftWall"
                );


                /*
                 * RIGHT WALL
                 */

                self.mesh(
                    shell,
                    new THREE.BoxGeometry(
                        wallThickness,
                        d.height,
                        d.depth
                    ),
                    materials[2],
                    d.width / 2,
                    d.height / 2,
                    0,
                    "RightWall"
                );


                /*
                 * FLOOR
                 */

                self.mesh(
                    shell,
                    new THREE.BoxGeometry(
                        d.width,
                        0.05,
                        d.depth
                    ),
                    materials[3],
                    0,
                    0.025,
                    0,
                    "Floor"
                );


                /*
                 * =================================================
                 * CEILING
                 * =================================================
                 */

                self.buildCeiling();


                /*
                 * =================================================
                 * FRONT DOOR
                 * =================================================
                 */

                self.buildDoor();


                /*
                 * =================================================
                 * OPTIONAL COMPONENTS
                 * =================================================
                 */

                return self.buildComponents(
                    state,
                    generationToken,
                    tokenCheckCallback
                );

            });
        };


    /*
     * ============================================================
     * CEILING
     * ============================================================
     *
     * Thiết kế theo yêu cầu:
     *
     * - nhiều lớp
     * - shadow gap
     * - khung âm
     * - panel trung tâm
     * - LED hắt
     * - không bóng đèn lộ thiên
     */

    Builder.prototype.buildCeiling =
        function () {

            var d =
                CONFIG.DIMENSIONS;

            var g =
                new THREE.Group();

            g.name =
                "ArchitecturalCeiling";

            this.root.add(g);


            var outer =
                new THREE.MeshStandardMaterial({
                    color: 0xf3f0e9,
                    roughness: 0.72
                });


            var inner =
                new THREE.MeshStandardMaterial({
                    color: 0xe5e0d6,
                    roughness: 0.62
                });


            var dark =
                new THREE.MeshStandardMaterial({
                    color: 0x373a3c,
                    metalness: 0.50,
                    roughness: 0.34
                });


            var cnc =
                new THREE.MeshStandardMaterial({
                    color: 0xb8b0a3,
                    metalness: 0.32,
                    roughness: 0.42
                });


            var glow =
                new THREE.MeshStandardMaterial({
                    color: 0xfff8e8,
                    emissive: 0xffe5ad,
                    emissiveIntensity: 2.2
                });


            /*
             * OUTER FRAME
             */

            this.mesh(
                g,
                new THREE.BoxGeometry(
                    d.width - 0.08,
                    0.04,
                    d.depth - 0.08
                ),
                outer,
                0,
                d.height - 0.06,
                0,
                "CeilingOuter"
            );


            /*
             * SHADOW GAP
             */

            this.mesh(
                g,
                new THREE.BoxGeometry(
                    d.width - 0.24,
                    0.025,
                    d.depth - 0.24
                ),
                dark,
                0,
                d.height - 0.035,
                0,
                "ShadowGap"
            );


            /*
             * INNER PANEL
             */

            this.mesh(
                g,
                new THREE.BoxGeometry(
                    d.width - 0.31,
                    0.025,
                    d.depth - 0.31
                ),
                inner,
                0,
                d.height - 0.012,
                0,
                "CeilingInner"
            );


            /*
             * CENTRAL CNC PANEL
             */

            this.mesh(
                g,
                new THREE.BoxGeometry(
                    d.width * 0.46,
                    0.016,
                    d.depth * 0.42
                ),
                cnc,
                0,
                d.height + 0.004,
                0,
                "CentralCNC"
            );


            /*
             * HIDDEN LED LEFT / RIGHT
             */

            this.mesh(
                g,
                new THREE.BoxGeometry(
                    0.028,
                    0.012,
                    d.depth - 0.34
                ),
                glow,
                -0.39,
                d.height + 0.014,
                0,
                "HiddenLEDLeft"
            );


            this.mesh(
                g,
                new THREE.BoxGeometry(
                    0.028,
                    0.012,
                    d.depth - 0.34
                ),
                glow,
                0.39,
                d.height + 0.014,
                0,
                "HiddenLEDRight"
            );
        };


    /*
     * ============================================================
     * DOOR
     * ============================================================
     *
     * QUAN TRỌNG:
     *
     * Cửa không còn rộng chỉ ~47% cabin.
     *
     * Opening gần toàn bộ chiều rộng cabin.
     * Hai cánh gặp nhau chính xác tại tâm.
     *
     * Không tạo front wall phụ ở hai bên.
     */

    Builder.prototype.buildDoor =
        function () {

            var d =
                CONFIG.DIMENSIONS;


            /*
             * Cửa chiếm 92% chiều rộng cabin.
             */

            var openingWidth =
                d.width * 0.92;


            var panelWidth =
                openingWidth / 2;


            var doorHeight =
                d.height * 0.86;


            var frontZ =
                d.depth / 2 - 0.028;


            var doorMaterial =
                new THREE.MeshStandardMaterial({
                    color: 0xbfc3c5,
                    metalness: 0.88,
                    roughness: 0.22
                });


            var frameMaterial =
                new THREE.MeshStandardMaterial({
                    color: 0x2b2e31,
                    metalness: 0.65,
                    roughness: 0.30
                });


            /*
             * KHÔNG tạo hai mảng vách nhỏ
             * ở hai bên cửa.
             *
             * Chỉ giữ frame rất mảnh.
             */

            var frame =
                new THREE.Group();

            frame.name =
                "DoorFrame";

            this.root.add(frame);


            /*
             * LEFT FRAME
             */

            this.mesh(
                frame,
                new THREE.BoxGeometry(
                    0.025,
                    doorHeight + 0.06,
                    0.055
                ),
                frameMaterial,
                -openingWidth / 2,
                doorHeight / 2,
                frontZ + 0.035,
                "DoorFrameLeft"
            );


            /*
             * RIGHT FRAME
             */

            this.mesh(
                frame,
                new THREE.BoxGeometry(
                    0.025,
                    doorHeight + 0.06,
                    0.055
                ),
                frameMaterial,
                openingWidth / 2,
                doorHeight / 2,
                frontZ + 0.035,
                "DoorFrameRight"
            );


            /*
             * TOP FRAME
             */

            this.mesh(
                frame,
                new THREE.BoxGeometry(
                    openingWidth,
                    0.025,
                    0.055
                ),
                frameMaterial,
                0,
                doorHeight + 0.025,
                frontZ + 0.035,
                "DoorFrameTop"
            );


            /*
             * =================================================
             * LEFT DOOR
             * =================================================
             *
             * Mép phải của cánh trái = tâm cabin.
             */

            this.door.left =
                this.mesh(
                    this.root,
                    new THREE.BoxGeometry(
                        panelWidth,
                        doorHeight,
                        0.055
                    ),
                    doorMaterial,
                    -panelWidth / 2,
                    doorHeight / 2,
                    frontZ,
                    "DoorLeft"
                );


            /*
             * =================================================
             * RIGHT DOOR
             * =================================================
             *
             * Mép trái của cánh phải = tâm cabin.
             */

            this.door.right =
                this.mesh(
                    this.root,
                    new THREE.BoxGeometry(
                        panelWidth,
                        doorHeight,
                        0.055
                    ),
                    doorMaterial,
                    panelWidth / 2,
                    doorHeight / 2,
                    frontZ,
                    "DoorRight"
                );


            /*
             * OPEN/CLOSE DEFAULT
             */

            this.setDoorProgress(1);
        };


    /*
     * ============================================================
     * COMPONENTS
     * ============================================================
     */

    Builder.prototype.buildComponents =
        function (
            state,
            generationToken,
            tokenCheckCallback
        ) {

            var d =
                CONFIG.DIMENSIONS;

            var handrail =
                findCatalog(
                    "HANDRAILS",
                    state.handrail
                );

            var cop =
                findCatalog(
                    "COPS",
                    state.cop
                );

            var jobs = [];


            if (
                handrail &&
                handrail.id !== "NONE"
            ) {

                jobs.push(
                    this.assetOrFallback(
                        handrail,
                        "Handrail",
                        new THREE.Vector3(
                            d.width * 0.16,
                            d.height * 0.43,
                            -d.depth / 2 + 0.08
                        ),
                        0.78,
                        generationToken,
                        tokenCheckCallback
                    )
                );
            }


            if (
                cop &&
                cop.id !== "NONE"
            ) {

                jobs.push(
                    this.assetOrFallback(
                        cop,
                        "COP",
                        new THREE.Vector3(
                            d.width / 2 - 0.08,
                            d.height * 0.52,
                            0
                        ),
                        0.65,
                        generationToken,
                        tokenCheckCallback
                    )
                );
            }


            return Promise.all(jobs);
        };


    /*
     * ============================================================
     * GLTF LOAD
     * ============================================================
     */

    Builder.prototype.load =
        function (path) {

            if (!path) {
                return Promise.reject(
                    new Error("No asset path")
                );
            }

            if (
                this.gltfCache.has(path)
            ) {
                return this.gltfCache.get(path);
            }

            var self = this;

            var promise =
                new Promise(function (
                    resolve,
                    reject
                ) {

                    self.loader.load(
                        path,
                        resolve,
                        undefined,
                        reject
                    );
                });


            this.gltfCache.set(
                path,
                promise
            );

            return promise;
        };


    /*
     * ============================================================
     * ASSET / FALLBACK
     * ============================================================
     */

    Builder.prototype.assetOrFallback =
        function (
            item,
            name,
            position,
            target,
            generationToken,
            tokenCheckCallback
        ) {

            var self = this;


            if (!item.modelPath) {

                if (
                    !tokenCheckCallback ||
                    tokenCheckCallback(
                        generationToken
                    )
                ) {
                    self.fallback(
                        item,
                        name,
                        position
                    );
                }

                return Promise.resolve();
            }


            return this.load(
                item.modelPath
            )
                .then(function (gltf) {

                    if (
                        tokenCheckCallback &&
                        !tokenCheckCallback(
                            generationToken
                        )
                    ) {
                        return;
                    }

                    var g =
                        gltf.scene.clone(true);

                    var box =
                        new THREE.Box3()
                            .setFromObject(g);

                    var size =
                        box.getSize(
                            new THREE.Vector3()
                        );

                    var center =
                        box.getCenter(
                            new THREE.Vector3()
                        );

                    var max =
                        Math.max(
                            size.x,
                            size.y,
                            size.z
                        ) || 1;

                    var scale =
                        target / max;

                    g.scale.setScalar(
                        scale
                    );

                    g.position.set(
                        position.x -
                        center.x * scale,

                        position.y -
                        center.y * scale,

                        position.z -
                        center.z * scale
                    );

                    g.name =
                        name + "Asset";

                    g.traverse(function (o) {

                        if (o.isMesh) {

                            o.castShadow = true;
                            o.receiveShadow = true;
                        }
                    });

                    self.root.add(g);

                })
                .catch(function () {

                    if (
                        !tokenCheckCallback ||
                        tokenCheckCallback(
                            generationToken
                        )
                    ) {

                        self.fallback(
                            item,
                            name,
                            position
                        );
                    }
                });
        };


    /*
     * ============================================================
     * FALLBACK
     * ============================================================
     */

    Builder.prototype.fallback =
        function (
            item,
            name,
            position
        ) {

            var g =
                new THREE.Group();

            g.name =
                name + "Fallback";

            var material =
                new THREE.MeshStandardMaterial({
                    color:
                        name === "COP"
                            ? 0x202326
                            : 0xc6c9cb,

                    metalness: 0.78,
                    roughness: 0.24
                });


            if (name === "Handrail") {

                var bar =
                    new THREE.Mesh(
                        new THREE.CylinderGeometry(
                            0.022,
                            0.022,
                            0.95,
                            24
                        ),
                        material
                    );

                bar.rotation.z =
                    Math.PI / 2;

                bar.position.copy(
                    position
                );

                g.add(bar);

            } else {

                var panel =
                    new THREE.Mesh(
                        new THREE.BoxGeometry(
                            0.12,
                            0.55,
                            0.035
                        ),
                        material
                    );

                panel.position.copy(
                    position
                );

                g.add(panel);
            }


            this.root.add(g);
        };


    /*
     * ============================================================
     * DOOR PROGRESS
     * ============================================================
     *
     * progress:
     *
     * 0 = CLOSED
     * 1 = OPEN
     */

    Builder.prototype.setDoorProgress =
        function (progress) {

            var d =
                CONFIG.DIMENSIONS;


            this.door.progress =
                Math.max(
                    0,
                    Math.min(
                        1,
                        progress
                    )
                );


            if (
                !this.door.left ||
                !this.door.right
            ) {
                return;
            }


            var openingWidth =
                d.width * 0.92;

            var panelWidth =
                openingWidth / 2;


            /*
             * Khoảng trượt.
             *
             * Khi OPEN:
             *
             * cánh trái trượt hoàn toàn sang trái
             * cánh phải trượt hoàn toàn sang phải.
             */

            var slide =
                panelWidth * 0.92;


            /*
             * CLOSED
             */

            var leftClosed =
                -panelWidth / 2;

            var rightClosed =
                panelWidth / 2;


            /*
             * OPEN
             */

            var leftOpen =
                leftClosed - slide;

            var rightOpen =
                rightClosed + slide;


            /*
             * Interpolate.
             */

            this.door.left.position.x =
                THREE.MathUtils.lerp(
                    leftClosed,
                    leftOpen,
                    this.door.progress
                );


            this.door.right.position.x =
                THREE.MathUtils.lerp(
                    rightClosed,
                    rightOpen,
                    this.door.progress
                );
        };


    /*
     * ============================================================
     * COMPATIBILITY ALIASES
     * ============================================================
     */

    Builder.prototype.buildCabin =
        function (
            state,
            generationToken,
            tokenCheckCallback
        ) {

            return this.updateCabin(
                state,
                generationToken,
                tokenCheckCallback
            );
        };


    Builder.prototype.updateDoorProgress =
        function (progress) {

            this.setDoorProgress(
                progress
            );
        };


    return Builder;

})();