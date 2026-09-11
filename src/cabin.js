window.CabinBuilder = (function () {

    function findCatalog(group, id) {
        var list = CONFIG.CATALOGS[group] || [];

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

        this.mm = MaterialManager.getInstance();

        this.loader = new THREE.GLTFLoader();

        this.gltfCache = new Map();

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
            this.root.remove(this.root.children[0]);
        }

        this.door.left = null;
        this.door.right = null;
        this.door.progress = 1;
    };


    /*
     * ============================================================
     * LOAD GLTF
     * ============================================================
     */

    Builder.prototype.load = function (path) {

        if (!path) {
            return Promise.reject(
                new Error("CabinBuilder: missing asset path")
            );
        }

        if (this.gltfCache.has(path)) {
            return this.gltfCache.get(path);
        }

        var self = this;

        var promise = new Promise(function (resolve, reject) {

            self.loader.load(
                path,
                resolve,
                undefined,
                reject
            );

        });

        this.gltfCache.set(path, promise);

        return promise;
    };


    /*
     * ============================================================
     * MESH HELPER
     * ============================================================
     */

    Builder.prototype.mesh = function (
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

        mesh.position.set(x, y, z);

        mesh.name = name || "Mesh";

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        parent.add(mesh);

        return mesh;
    };


    /*
     * ============================================================
     * UPDATE CABIN
     * ============================================================
     *
     * Contract chuẩn:
     *
     * updateCabin(
     *     state,
     *     generationToken,
     *     tokenCheckCallback
     * )
     *
     * ============================================================
     */

    Builder.prototype.updateCabin = function (
        state,
        generationToken,
        tokenCheckCallback
    ) {

        var self = this;

        var d = CONFIG.DIMENSIONS;
        var c = CONFIG.CATALOGS;

        function current() {

            if (!tokenCheckCallback) {
                return true;
            }

            return tokenCheckCallback(generationToken);
        }


        /*
         * Nếu request cũ đã bị thay thế,
         * không dựng tiếp.
         */

        if (!current()) {
            return Promise.resolve();
        }


        /*
         * ========================================================
         * FIND CATALOG ITEMS
         * ========================================================
         */

        var wallLeft =
            findCatalog("WALLS", state.wallLeft) ||
            c.WALLS[0];

        var wallBack =
            findCatalog("WALLS", state.wallBack) ||
            c.WALLS[0];

        var wallRight =
            findCatalog("WALLS", state.wallRight) ||
            c.WALLS[0];

        var base =
            findCatalog("MATERIALS", state.material) ||
            c.MATERIALS[0];

        var etched =
            findCatalog("ETCHEDS", state.etched) ||
            c.ETCHEDS[0];

        var floor =
            findCatalog("FLOORS", state.floor) ||
            c.FLOORS[0];

        var tone =
            findCatalog("COLORS", state.colorTone);

        var hex =
            state.colorTone === "CUSTOM"
                ? state.customColor
                : (tone && tone.hex);


        /*
         * ========================================================
         * MATERIALS
         * ========================================================
         */

        return Promise.all([

            self.mm.getWallMaterial(
                wallLeft,
                base,
                hex,
                etched,
                d.depth,
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

            if (!current()) {
                return;
            }


            /*
             * ====================================================
             * CLEAR OLD CABIN
             * ====================================================
             */

            self.clear();


            /*
             * ====================================================
             * INTERIOR SHELL
             * ====================================================
             */

            var shell =
                new THREE.Group();

            shell.name =
                "InteriorShell";

            self.root.add(shell);


            /*
             * Wall thickness
             */

            var wallThickness = 0.035;


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
             * CEILING
             */

            self.buildCeiling();


            /*
             * DOOR
             */

            self.buildDoor();


            /*
             * OPTIONAL COMPONENTS
             */

            return self.buildComponents(
                state,
                generationToken,
                tokenCheckCallback
            );

        });

    };


    /*
     * Compatibility alias.
     *
     * Không dùng làm API chính.
     */

    Builder.prototype.buildCabin = function (
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


    /*
     * ============================================================
     * CEILING
     * ============================================================
     */

    Builder.prototype.buildCeiling = function () {

        var d = CONFIG.DIMENSIONS;

        var group =
            new THREE.Group();

        group.name =
            "ArchitecturalCeiling";

        this.root.add(group);


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
                emissiveIntensity: 1.8
            });


        /*
         * Outer recessed frame
         */

        this.mesh(
            group,
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
         * Shadow gap
         */

        this.mesh(
            group,
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
         * Inner ceiling
         */

        this.mesh(
            group,
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
         * Central CNC panel
         */

        this.mesh(
            group,
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
         * Hidden LED strips
         */

        [-0.39, 0.39].forEach(function (x) {

            this.mesh(
                group,
                new THREE.BoxGeometry(
                    0.028,
                    0.012,
                    d.depth - 0.34
                ),
                glow,
                x,
                d.height + 0.014,
                0,
                "HiddenLED"
            );

        }, this);

    };


    /*
     * ============================================================
     * DOOR
     * ============================================================
     */

    Builder.prototype.buildDoor = function () {

        var d = CONFIG.DIMENSIONS;


        /*
         * Cửa chiếm khoảng 60% chiều rộng cabin.
         */

        var doorWidth =
            d.width * 0.30;

        var doorHeight =
            d.height * 0.87;


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
         * Door frame
         */

        var frame =
            new THREE.Group();

        frame.name =
            "DoorFrame";

        this.root.add(frame);


        this.mesh(
            frame,
            new THREE.BoxGeometry(
                0.04,
                doorHeight + 0.04,
                0.055
            ),
            frameMaterial,
            -d.width / 2 + 0.02,
            doorHeight / 2,
            frontZ + 0.035,
            "FrameL"
        );


        this.mesh(
            frame,
            new THREE.BoxGeometry(
                0.04,
                doorHeight + 0.04,
                0.055
            ),
            frameMaterial,
            d.width / 2 - 0.02,
            doorHeight / 2,
            frontZ + 0.035,
            "FrameR"
        );


        this.mesh(
            frame,
            new THREE.BoxGeometry(
                d.width,
                0.04,
                0.055
            ),
            frameMaterial,
            0,
            doorHeight + 0.02,
            frontZ + 0.035,
            "FrameTop"
        );


        /*
         * ========================================================
         * TWO DOOR PANELS
         * ========================================================
         */

        this.door.left =
            this.mesh(
                this.root,
                new THREE.BoxGeometry(
                    doorWidth,
                    doorHeight,
                    0.05
                ),
                doorMaterial,
                -doorWidth / 2,
                doorHeight / 2,
                frontZ,
                "DoorLeft"
            );


        this.door.right =
            this.mesh(
                this.root,
                new THREE.BoxGeometry(
                    doorWidth,
                    doorHeight,
                    0.05
                ),
                doorMaterial,
                doorWidth / 2,
                doorHeight / 2,
                frontZ,
                "DoorRight"
            );


        /*
         * Mặc định mở.
         */

        this.setDoorProgress(1);

    };


    /*
     * ============================================================
     * COMPONENTS
     * ============================================================
     */

    Builder.prototype.buildComponents = function (
        state,
        generationToken,
        tokenCheckCallback
    ) {

        var self = this;

        var d = CONFIG.DIMENSIONS;


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
                self.assetOrFallback(
                    handrail,
                    "Handrail",
                    new THREE.Vector3(
                        0,
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
                self.assetOrFallback(
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
     * ASSET OR FALLBACK
     * ============================================================
     */

    Builder.prototype.assetOrFallback = function (
        item,
        name,
        position,
        target,
        generationToken,
        tokenCheckCallback
    ) {

        var self = this;


        function current() {

            if (!tokenCheckCallback) {
                return true;
            }

            return tokenCheckCallback(
                generationToken
            );
        }


        if (!item.modelPath) {

            if (current()) {
                self.fallback(
                    item,
                    name,
                    position
                );
            }

            return Promise.resolve();

        }


        return this.load(item.modelPath)
            .then(function (gltf) {

                if (!current()) {
                    return;
                }


                var object =
                    gltf.scene.clone(true);


                var box =
                    new THREE.Box3()
                        .setFromObject(object);


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


                object.scale.setScalar(scale);


                object.position.set(
                    position.x - center.x * scale,
                    position.y - center.y * scale,
                    position.z - center.z * scale
                );


                object.name =
                    name + "Asset";


                object.traverse(function (o) {

                    if (o.isMesh) {
                        o.castShadow = true;
                        o.receiveShadow = true;
                    }

                });


                self.root.add(object);

            })
            .catch(function () {

                if (current()) {

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
     * FALLBACK COMPONENT
     * ============================================================
     */

    Builder.prototype.fallback = function (
        item,
        name,
        position
    ) {

        var group =
            new THREE.Group();

        group.name =
            name + "Fallback";

        this.root.add(group);


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
                        1.0,
                        24
                    ),
                    material
                );

            bar.rotation.z =
                Math.PI / 2;

            bar.position.copy(
                position
            );

            group.add(bar);

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

            group.add(panel);

        }

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
     *
     * Quan trọng:
     * CLOSED => hai cánh gặp nhau chính xác tại x = 0.
     *
     * ============================================================
     */

    Builder.prototype.setDoorProgress = function (progress) {

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


        var d =
            CONFIG.DIMENSIONS;


        var doorWidth =
            d.width * 0.30;


        /*
         * Khoảng mở tối đa.
         */

        var openDistance =
            d.width * 0.42;


        /*
         * CLOSED:
         *
         * left  = -doorWidth / 2
         * right = +doorWidth / 2
         *
         * Hai cánh chạm nhau, không có khe giữa.
         */

        var offset =
            openDistance *
            this.door.progress;


        this.door.left.position.x =
            -doorWidth / 2 -
            offset;


        this.door.right.position.x =
            doorWidth / 2 +
            offset;

    };


    /*
     * Compatibility alias.
     */

    Builder.prototype.updateDoorProgress =
        function (progress) {

            this.setDoorProgress(
                progress
            );

        };


    return Builder;

})();