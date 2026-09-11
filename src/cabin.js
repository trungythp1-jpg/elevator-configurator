window.CabinBuilder = (function () {

    function findCatalog(group, id) {
        var list = CONFIG.CATALOGS[group] || [];
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) return list[i];
        }
        return null;
    }

    function isCurrent(generationToken, tokenCheckCallback) {
        if (!generationToken) return true;
        if (generationToken.cancelled) return false;
        if (typeof tokenCheckCallback === "function") {
            return tokenCheckCallback(generationToken.id);
        }
        return true;
    }

    function colorFromState(state) {
        var tone = state && state.colorTone ? state.colorTone : "DEFAULT";

        if (tone === "CUSTOM") {
            return state.customColor || "#ffffff";
        }

        var colors = CONFIG.CATALOGS.COLORS || [];

        for (var i = 0; i < colors.length; i++) {
            if (colors[i].id === tone) {
                return colors[i].hex || null;
            }
        }

        return null;
    }

    function Manager(scene) {

        if (!scene) {
            throw new Error("CabinBuilder: scene not found");
        }

        this.scene = scene;

        this.root = new THREE.Group();
        this.root.name = "Cabin";

        scene.add(this.root);

        this.materialManager =
            window.MaterialManager &&
            typeof window.MaterialManager.getInstance === "function"
                ? window.MaterialManager.getInstance()
                : null;

        this.loader =
            typeof THREE.GLTFLoader === "function"
                ? new THREE.GLTFLoader()
                : null;

        this.gltfCache = new Map();

        this.door = {
            left: null,
            right: null,
            progress: 1
        };

        this._doorAnimationFrame = null;
        this._generation = 0;
    }


    /* =========================================================
       CLEANUP
       ========================================================= */

    Manager.prototype._disposeGeneratedGeometry = function (object) {

        if (!object) return;

        object.traverse(function (node) {

            if (!node.isMesh) return;

            /*
             * GLB assets may share geometry/material.
             * Never dispose shared imported assets here.
             */
            if (node.userData && node.userData.sharedAsset) {
                return;
            }

            if (node.geometry) {
                node.geometry.dispose();
            }
        });
    };


    Manager.prototype.clear = function () {

        if (this._doorAnimationFrame) {
            cancelAnimationFrame(this._doorAnimationFrame);
            this._doorAnimationFrame = null;
        }

        while (this.root.children.length) {

            var child = this.root.children[0];

            this.root.remove(child);

            this._disposeGeneratedGeometry(child);
        }

        this.door.left = null;
        this.door.right = null;
        this.door.progress = 1;
    };


    /* =========================================================
       GLTF
       ========================================================= */

    Manager.prototype._loadGLTF = function (path) {

        if (!path || !this.loader) {
            return Promise.resolve(null);
        }

        if (this.gltfCache.has(path)) {
            return this.gltfCache.get(path);
        }

        var self = this;

        var promise = new Promise(function (resolve) {

            self.loader.load(
                path,
                function (gltf) {
                    resolve(gltf);
                },
                undefined,
                function () {
                    resolve(null);
                }
            );

        });

        this.gltfCache.set(path, promise);

        return promise;
    };


    Manager.prototype._cloneGLTF = function (gltf) {

        if (!gltf || !gltf.scene) {
            return null;
        }

        var source = gltf.scene;
        var clone = source.clone(true);

        clone.traverse(function (node) {

            if (node.isMesh) {
                node.userData.sharedAsset = true;
            }

        });

        return clone;
    };


    /* =========================================================
       BASIC MESH
       ========================================================= */

    Manager.prototype._mesh = function (
        geometry,
        material,
        name,
        position,
        rotation
    ) {

        var mesh = new THREE.Mesh(geometry, material);

        mesh.name = name || "Mesh";

        mesh.position.copy(
            position || new THREE.Vector3()
        );

        if (rotation) {
            mesh.rotation.copy(rotation);
        }

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        return mesh;
    };


    Manager.prototype._box = function (
        width,
        height,
        depth,
        material,
        name,
        x,
        y,
        z
    ) {

        var geometry = new THREE.BoxGeometry(
            width,
            height,
            depth
        );

        var mesh = this._mesh(
            geometry,
            material,
            name,
            new THREE.Vector3(x || 0, y || 0, z || 0)
        );

        mesh.userData.generated = true;

        return mesh;
    };


    /* =========================================================
       MATERIAL
       ========================================================= */

    Manager.prototype._wallMaterial = function (
        wallId,
        state,
        width,
        height
    ) {

        var wall =
            findCatalog("WALLS", wallId) ||
            findCatalog("WALLS", "I03");

        var base =
            findCatalog("MATERIALS", state.material) ||
            findCatalog("MATERIALS", "S01");

        var etched =
            findCatalog("ETCHEDS", state.etched) ||
            findCatalog("ETCHEDS", "NONE");

        var color = colorFromState(state);

        if (
            this.materialManager &&
            typeof this.materialManager.getWallMaterial === "function"
        ) {

            return this.materialManager.getWallMaterial(
                wall,
                base,
                color,
                etched,
                width,
                height
            );
        }

        var fallbackColor = 0xb8bdc0;

        if (wallId === "I02") fallbackColor = 0xe2e5e6;
        if (wallId === "I06") fallbackColor = 0xd4b04a;
        if (wallId === "I07") fallbackColor = 0xc6a354;
        if (wallId === "I08") fallbackColor = 0x8e6654;

        var material = new THREE.MeshStandardMaterial({
            color: fallbackColor,
            metalness: 0.88,
            roughness: wallId === "I02" ? 0.14 : 0.27,
            side: THREE.DoubleSide
        });

        if (color) {
            material.color.set(color);
        }

        return Promise.resolve(material);
    };


    Manager.prototype._floorMaterial = function (state, width, depth) {

        var floor =
            findCatalog("FLOORS", state.floor) ||
            findCatalog("FLOORS", "T01");

        if (
            this.materialManager &&
            typeof this.materialManager.getFloorMaterial === "function"
        ) {

            return this.materialManager.getFloorMaterial(
                floor,
                width,
                depth
            );
        }

        return Promise.resolve(
            new THREE.MeshStandardMaterial({
                color: 0xc7c0b6,
                metalness: 0.08,
                roughness: 0.68
            })
        );
    };


    /* =========================================================
       PANEL STATE
       
       New optional panel fields are supported now so app.js/UI.js
       can be upgraded later without rewriting cabin.js again.

       Fallback remains compatible with the existing baseline state.
       ========================================================= */

    Manager.prototype._panelWallId = function (state, panelId) {

        var directKey = "panel" + panelId;

        if (
            state &&
            state[directKey] &&
            findCatalog("WALLS", state[directKey])
        ) {
            return state[directKey];
        }

        /*
         * Group-specific future state.
         */
        var groupMap = {
            "1": "panel12",
            "2": "panel12",

            "3": "panel35",
            "5": "panel35",

            "4": "panel4",

            "6": "panel68",
            "8": "panel68",

            "7": "panel7",

            "9": "panel911",
            "11": "panel911",

            "10": "panel10"
        };

        var groupKey = groupMap[String(panelId)];

        if (
            groupKey &&
            state &&
            state[groupKey] &&
            findCatalog("WALLS", state[groupKey])
        ) {
            return state[groupKey];
        }

        /*
         * Existing 3-wall baseline fallback.
         */
        if (panelId === 1 || panelId === 2 ||
            panelId === 3 || panelId === 4 ||
            panelId === 5) {

            return state.wallLeft || "I03";
        }

        if (panelId === 6 ||
            panelId === 7 ||
            panelId === 8) {

            return state.wallBack || "I03";
        }

        return state.wallRight || "I03";
    };


    /* =========================================================
       11-PANEL INTERIOR GEOMETRY

       Front
          1          2
       return      return

       LEFT WALL
          3 | 4 | 5

       BACK WALL
          6 | 7 | 8

       RIGHT WALL
          9 | 10 | 11

       4 / 7 / 10 = large center panels
       ========================================================= */

    Manager.prototype._buildPanels = function (
        state,
        generationToken,
        tokenCheckCallback
    ) {

        var self = this;

        var d = CONFIG.DIMENSIONS;

        var width = d.width;
        var depth = d.depth;
        var height = d.height;

        var wallHeight = height - 0.08;
        var wallY = 0.08 + wallHeight / 2;

        var thickness = 0.022;

        /*
         * Side wall depth allocation:

         * 1 / 2 = front door returns
         * 3 / 9 = small
         * 4 / 10 = large
         * 5 / 11 = small
         *
         * Total = 1.20 m
         */
        var frontReturnDepth = 0.16;
        var smallDepth = 0.22;
        var largeDepth = 0.66;
        var rearSmallDepth = 0.16;

        var zFront = depth / 2;

        var z1 =
            zFront - frontReturnDepth / 2;

        var z3 =
            zFront -
            frontReturnDepth -
            smallDepth / 2;

        var z4 =
            zFront -
            frontReturnDepth -
            smallDepth -
            largeDepth / 2;

        var z5 =
            -depth / 2 +
            rearSmallDepth / 2;

        /*
         * Back wall:
         *
         * 6 = small
         * 7 = large
         * 8 = small
         */
        var backSmallWidth = 0.20;
        var backLargeWidth =
            width - backSmallWidth * 2;

        var x6 =
            -width / 2 +
            backSmallWidth / 2;

        var x7 = 0;

        var x8 =
            width / 2 -
            backSmallWidth / 2;

        return Promise.all([

            /* 1 */
            self._wallMaterial(
                self._panelWallId(state, 1),
                state,
                frontReturnDepth,
                wallHeight
            ),

            /* 2 */
            self._wallMaterial(
                self._panelWallId(state, 2),
                state,
                frontReturnDepth,
                wallHeight
            ),

            /* 3 */
            self._wallMaterial(
                self._panelWallId(state, 3),
                state,
                smallDepth,
                wallHeight
            ),

            /* 4 */
            self._wallMaterial(
                self._panelWallId(state, 4),
                state,
                largeDepth,
                wallHeight
            ),

            /* 5 */
            self._wallMaterial(
                self._panelWallId(state, 5),
                state,
                rearSmallDepth,
                wallHeight
            ),

            /* 6 */
            self._wallMaterial(
                self._panelWallId(state, 6),
                state,
                backSmallWidth,
                wallHeight
            ),

            /* 7 */
            self._wallMaterial(
                self._panelWallId(state, 7),
                state,
                backLargeWidth,
                wallHeight
            ),

            /* 8 */
            self._wallMaterial(
                self._panelWallId(state, 8),
                state,
                backSmallWidth,
                wallHeight
            ),

            /* 9 */
            self._wallMaterial(
                self._panelWallId(state, 9),
                state,
                smallDepth,
                wallHeight
            ),

            /* 10 */
            self._wallMaterial(
                self._panelWallId(state, 10),
                state,
                largeDepth,
                wallHeight
            ),

            /* 11 */
            self._wallMaterial(
                self._panelWallId(state, 11),
                state,
                rearSmallDepth,
                wallHeight
            )

        ]).then(function (materials) {

            if (!isCurrent(generationToken, tokenCheckCallback)) {
                return false;
            }

            var m1 = materials[0];
            var m2 = materials[1];
            var m3 = materials[2];
            var m4 = materials[3];
            var m5 = materials[4];
            var m6 = materials[5];
            var m7 = materials[6];
            var m8 = materials[7];
            var m9 = materials[8];
            var m10 = materials[9];
            var m11 = materials[10];

            /*
             * LEFT WALL
             */

            self.root.add(
                self._box(
                    thickness,
                    wallHeight,
                    frontReturnDepth,
                    m1,
                    "Panel01_DoorReturn",
                    -width / 2 + thickness / 2,
                    wallY,
                    z1
                )
            );

            self.root.add(
                self._box(
                    thickness,
                    wallHeight,
                    smallDepth,
                    m3,
                    "Panel03_LeftSmallFront",
                    -width / 2 + thickness / 2,
                    wallY,
                    z3
                )
            );

            self.root.add(
                self._box(
                    thickness,
                    wallHeight,
                    largeDepth,
                    m4,
                    "Panel04_LeftLargeCenter",
                    -width / 2 + thickness / 2,
                    wallY,
                    z4
                )
            );

            self.root.add(
                self._box(
                    thickness,
                    wallHeight,
                    rearSmallDepth,
                    m5,
                    "Panel05_LeftSmallRear",
                    -width / 2 + thickness / 2,
                    wallY,
                    z5
                )
            );


            /*
             * BACK WALL
             */

            self.root.add(
                self._box(
                    backSmallWidth,
                    wallHeight,
                    thickness,
                    m6,
                    "Panel06_BackSmallLeft",
                    x6,
                    wallY,
                    -depth / 2 + thickness / 2
                )
            );

            self.root.add(
                self._box(
                    backLargeWidth,
                    wallHeight,
                    thickness,
                    m7,
                    "Panel07_BackLargeCenter",
                    x7,
                    wallY,
                    -depth / 2 + thickness / 2
                )
            );

            self.root.add(
                self._box(
                    backSmallWidth,
                    wallHeight,
                    thickness,
                    m8,
                    "Panel08_BackSmallRight",
                    x8,
                    wallY,
                    -depth / 2 + thickness / 2
                )
            );


            /*
             * RIGHT WALL
             */

            self.root.add(
                self._box(
                    thickness,
                    wallHeight,
                    frontReturnDepth,
                    m2,
                    "Panel02_DoorReturn",
                    width / 2 - thickness / 2,
                    wallY,
                    z1
                )
            );

            self.root.add(
                self._box(
                    thickness,
                    wallHeight,
                    smallDepth,
                    m9,
                    "Panel09_RightSmallFront",
                    width / 2 - thickness / 2,
                    wallY,
                    z3
                )
            );

            self.root.add(
                self._box(
                    thickness,
                    wallHeight,
                    largeDepth,
                    m10,
                    "Panel10_RightLargeCenter",
                    width / 2 - thickness / 2,
                    wallY,
                    z4
                )
            );

            self.root.add(
                self._box(
                    thickness,
                    wallHeight,
                    rearSmallDepth,
                    m11,
                    "Panel11_RightSmallRear",
                    width / 2 - thickness / 2,
                    wallY,
                    z5
                )
            );

            return true;
        });
    };


    /* =========================================================
       FLOOR
       ========================================================= */

    Manager.prototype._buildFloor = function (state) {

        var self = this;
        var d = CONFIG.DIMENSIONS;

        return this._floorMaterial(
            state,
            d.width,
            d.depth
        ).then(function (material) {

            var floorThickness = 0.045;

            var mesh = self._box(
                d.width - 0.035,
                floorThickness,
                d.depth - 0.035,
                material,
                "CabinFloor",
                0,
                floorThickness / 2,
                0
            );

            self.root.add(mesh);

            return true;
        });
    };


    /* =========================================================
       CEILING
       ========================================================= */

    Manager.prototype._buildCeiling = function (state) {

        var d = CONFIG.DIMENSIONS;

        var ceilingY = d.height - 0.035;

        var outerMaterial =
            new THREE.MeshStandardMaterial({
                color: 0xf1f1ed,
                metalness: 0.04,
                roughness: 0.72,
                side: THREE.DoubleSide
            });

        var innerMaterial =
            new THREE.MeshStandardMaterial({
                color: 0xf7f6f1,
                metalness: 0.02,
                roughness: 0.58,
                side: THREE.DoubleSide
            });

        var accentMaterial =
            new THREE.MeshStandardMaterial({
                color: 0xe9e6dc,
                metalness: 0.04,
                roughness: 0.48,
                side: THREE.DoubleSide
            });

        /*
         * Outer ceiling plate.
         */

        var outer = this._box(
            d.width - 0.055,
            0.045,
            d.depth - 0.055,
            outerMaterial,
            "Ceiling_Outer",
            0,
            ceilingY,
            0
        );

        this.root.add(outer);


        /*
         * Recessed inner layer.
         */

        var innerWidth = d.width - 0.23;
        var innerDepth = d.depth - 0.23;

        var inner = this._box(
            innerWidth,
            0.035,
            innerDepth,
            innerMaterial,
            "Ceiling_Recessed",
            0,
            ceilingY - 0.048,
            0
        );

        this.root.add(inner);


        /*
         * Shadow-gap frame.
         */

        var frameThickness = 0.035;
        var frameDepth = 0.055;

        var frontFrame = this._box(
            innerWidth,
            frameDepth,
            frameThickness,
            accentMaterial,
            "Ceiling_ShadowGapFront",
            0,
            ceilingY - 0.028,
            innerDepth / 2 - frameThickness / 2
        );

        var rearFrame = this._box(
            innerWidth,
            frameDepth,
            frameThickness,
            accentMaterial,
            "Ceiling_ShadowGapRear",
            0,
            ceilingY - 0.028,
            -innerDepth / 2 + frameThickness / 2
        );

        var leftFrame = this._box(
            frameThickness,
            frameDepth,
            innerDepth,
            accentMaterial,
            "Ceiling_ShadowGapLeft",
            -innerWidth / 2 + frameThickness / 2,
            ceilingY - 0.028,
            0
        );

        var rightFrame = this._box(
            frameThickness,
            frameDepth,
            innerDepth,
            accentMaterial,
            "Ceiling_ShadowGapRight",
            innerWidth / 2 - frameThickness / 2,
            ceilingY - 0.028,
            0
        );

        this.root.add(
            frontFrame,
            rearFrame,
            leftFrame,
            rightFrame
        );


        /*
         * Central architectural CNC panel.
         */

        var cncWidth = innerWidth * 0.54;
        var cncDepth = innerDepth * 0.46;

        var cnc = this._box(
            cncWidth,
            0.025,
            cncDepth,
            accentMaterial,
            "Ceiling_CNC_Central",
            0,
            ceilingY - 0.070,
            -0.015
        );

        this.root.add(cnc);


        /*
         * Subtle recessed LED strip.
         * No visible bulbs.
         */

        var ledMaterial =
            new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: 0xffffff,
                emissiveIntensity: 1.8,
                metalness: 0,
                roughness: 0.35
            });

        var ledW = cncWidth * 0.82;
        var ledD = 0.018;

        var ledFront = this._box(
            ledW,
            0.008,
            ledD,
            ledMaterial,
            "Ceiling_HiddenLED_Front",
            0,
            ceilingY - 0.085,
            cncDepth / 2 - 0.025
        );

        var ledRear = this._box(
            ledW,
            0.008,
            ledD,
            ledMaterial,
            "Ceiling_HiddenLED_Rear",
            0,
            ceilingY - 0.085,
            -cncDepth / 2 + 0.025
        );

        this.root.add(
            ledFront,
            ledRear
        );

        return true;
    };


    /* =========================================================
       DOOR
       ========================================================= */

    Manager.prototype._buildDoor = function () {

        var d = CONFIG.DIMENSIONS;

        /*
         * Door opening occupies almost the entire cabin width.
         * This prevents the previous large side gaps when closed.
         */

        var frameWidth = 0.025;

        var openingWidth =
            d.width - frameWidth * 2;

        var doorWidth =
            openingWidth / 2;

        var doorHeight =
            d.height * 0.88;

        var doorY =
            0.08 + doorHeight / 2;

        var doorZ =
            d.depth / 2 + 0.018;

        var doorMaterial =
            new THREE.MeshStandardMaterial({
                color: 0xd6d9da,
                metalness: 0.88,
                roughness: 0.23,
                side: THREE.DoubleSide
            });

        var frameMaterial =
            new THREE.MeshStandardMaterial({
                color: 0x9fa4a6,
                metalness: 0.90,
                roughness: 0.22,
                side: THREE.DoubleSide
            });


        /*
         * Door frame.
         */

        var leftFrame = this._box(
            frameWidth,
            doorHeight,
            0.045,
            frameMaterial,
            "DoorFrameLeft",
            -openingWidth / 2,
            doorY,
            doorZ
        );

        var rightFrame = this._box(
            frameWidth,
            doorHeight,
            0.045,
            frameMaterial,
            "DoorFrameRight",
            openingWidth / 2,
            doorY,
            doorZ
        );

        var topFrame = this._box(
            openingWidth + frameWidth * 2,
            0.035,
            0.045,
            frameMaterial,
            "DoorFrameTop",
            0,
            0.08 + doorHeight,
            doorZ
        );

        this.root.add(
            leftFrame,
            rightFrame,
            topFrame
        );


        /*
         * Door panels.
         *
         * Closed positions touch at the center.
         * There is no intentional gap between door panels.
         */

        var leftDoor = this._box(
            doorWidth,
            doorHeight - 0.035,
            0.025,
            doorMaterial,
            "DoorPanelLeft",
            -doorWidth / 2,
            doorY,
            doorZ + 0.015
        );

        var rightDoor = this._box(
            doorWidth,
            doorHeight - 0.035,
            0.025,
            doorMaterial,
            "DoorPanelRight",
            doorWidth / 2,
            doorY,
            doorZ + 0.015
        );

        this.root.add(
            leftDoor,
            rightDoor
        );

        this.door.left = leftDoor;
        this.door.right = rightDoor;

        /*
         * Default:
         * open = 1
         */
        this.setDoorProgress(1);

        return true;
    };


    /* =========================================================
       HANDRAIL
       ========================================================= */

    Manager.prototype._buildHandrail = function (state) {

        if (!state.handrail || state.handrail === "NONE") {
            return Promise.resolve(true);
        }

        var self = this;

        var item =
            findCatalog("HANDRAILS", state.handrail);

        if (!item) {
            return Promise.resolve(true);
        }

        if (item.modelPath) {

            return this._loadGLTF(item.modelPath)
                .then(function (gltf) {

                    if (!gltf) {
                        self._buildFallbackHandrail();
                        return true;
                    }

                    var object =
                        self._cloneGLTF(gltf);

                    if (!object) {
                        self._buildFallbackHandrail();
                        return true;
                    }

                    var d = CONFIG.DIMENSIONS;

                    object.name = "Handrail_" + item.id;

                    object.position.set(
                        0,
                        0.82,
                        -d.depth / 2 + 0.055
                    );

                    object.rotation.y = 0;

                    object.scale.setScalar(1);

                    self.root.add(object);

                    return true;
                });

        }

        self._buildFallbackHandrail();

        return Promise.resolve(true);
    };


    Manager.prototype._buildFallbackHandrail = function () {

        var d = CONFIG.DIMENSIONS;

        var material =
            new THREE.MeshStandardMaterial({
                color: 0xc8cbcc,
                metalness: 0.91,
                roughness: 0.20
            });

        var radius = 0.025;

        var length =
            d.width * 0.68;

        var geometry =
            new THREE.CylinderGeometry(
                radius,
                radius,
                length,
                24
            );

        var rail =
            this._mesh(
                geometry,
                material,
                "Handrail_Fallback",
                new THREE.Vector3(
                    0,
                    0.88,
                    -d.depth / 2 + 0.055
                ),
                new THREE.Euler(
                    0,
                    0,
                    Math.PI / 2
                )
            );

        rail.userData.generated = true;

        this.root.add(rail);

        /*
         * Small mounting brackets.
         */

        var bracketGeometry =
            new THREE.CylinderGeometry(
                0.018,
                0.018,
                0.10,
                16
            );

        var bracket1 =
            this._mesh(
                bracketGeometry.clone(),
                material,
                "HandrailBracketLeft",
                new THREE.Vector3(
                    -length * 0.30,
                    0.82,
                    -d.depth / 2 + 0.055
                )
            );

        var bracket2 =
            this._mesh(
                bracketGeometry.clone(),
                material,
                "HandrailBracketRight",
                new THREE.Vector3(
                    length * 0.30,
                    0.82,
                    -d.depth / 2 + 0.055
                )
            );

        this.root.add(
            bracket1,
            bracket2
        );
    };


    /* =========================================================
       COP
       ========================================================= */

    Manager.prototype._buildCOP = function (state) {

        if (!state.cop || state.cop === "NONE") {
            return Promise.resolve(true);
        }

        var self = this;

        var item =
            findCatalog("COPS", state.cop);

        if (!item) {
            return Promise.resolve(true);
        }

        /*
         * COP is intentionally located on the right front
         * door return / "cánh gà".
         *
         * It does NOT sit on the main right wall.
         */

        if (item.modelPath) {

            return this._loadGLTF(item.modelPath)
                .then(function (gltf) {

                    if (!gltf) {
                        self._buildFallbackCOP();
                        return true;
                    }

                    var object =
                        self._cloneGLTF(gltf);

                    if (!object) {
                        self._buildFallbackCOP();
                        return true;
                    }

                    var d = CONFIG.DIMENSIONS;

                    object.name =
                        "COP_" + item.id;

                    object.position.set(
                        d.width / 2 - 0.045,
                        0.96,
                        d.depth / 2 - 0.105
                    );

                    /*
                     * Face toward the cabin interior.
                     */
                    object.rotation.y = -Math.PI / 2;

                    self.root.add(object);

                    return true;
                });

        }

        self._buildFallbackCOP();

        return Promise.resolve(true);
    };


    Manager.prototype._buildFallbackCOP = function () {

        var d = CONFIG.DIMENSIONS;

        var bodyMaterial =
            new THREE.MeshStandardMaterial({
                color: 0x26282a,
                metalness: 0.72,
                roughness: 0.24
            });

        var trimMaterial =
            new THREE.MeshStandardMaterial({
                color: 0xcfd2d3,
                metalness: 0.86,
                roughness: 0.19
            });

        /*
         * Small vertical COP body on the right door return.
         */

        var bodyWidth = 0.075;
        var bodyHeight = 0.34;
        var bodyDepth = 0.032;

        var body = this._box(
            bodyDepth,
            bodyHeight,
            bodyWidth,
            bodyMaterial,
            "COP_Fallback_Body",
            d.width / 2 - 0.040,
            1.02,
            d.depth / 2 - 0.105
        );

        this.root.add(body);


        /*
         * Decorative trim.
         */

        var trim = this._box(
            bodyDepth + 0.008,
            bodyHeight + 0.012,
            bodyWidth + 0.012,
            trimMaterial,
            "COP_Fallback_Trim",
            d.width / 2 - 0.044,
            1.02,
            d.depth / 2 - 0.105
        );

        /*
         * Put body slightly in front of trim.
         */

        body.position.x -= 0.006;

        this.root.add(trim);


        /*
         * Buttons.
         */

        var buttonMaterial =
            new THREE.MeshStandardMaterial({
                color: 0xf0f1f1,
                metalness: 0.62,
                roughness: 0.20
            });

        for (var i = 0; i < 3; i++) {

            var button =
                new THREE.Mesh(
                    new THREE.CylinderGeometry(
                        0.018,
                        0.018,
                        0.012,
                        20
                    ),
                    buttonMaterial
                );

            button.rotation.z = Math.PI / 2;

            button.position.set(
                d.width / 2 - 0.061,
                1.12 - i * 0.085,
                d.depth / 2 - 0.105
            );

            button.castShadow = true;

            this.root.add(button);
        }
    };


    /* =========================================================
       CABIN MODEL
       ========================================================= */

    Manager.prototype._buildCabinModel = function (state) {

        /*
         * The 11-panel procedural interior is authoritative for
         * the current configurator baseline.
         *
         * External cabin GLBs are therefore not inserted into the
         * structural shell here, preventing duplicate walls and
         * exterior geometry from corrupting the interior preview.
         *
         * The cabinModel selection remains available in state and
         * can later control visual variants without changing the
         * structural contract.
         */

        return Promise.resolve(true);
    };


    /* =========================================================
       UPDATE CABIN
       ========================================================= */

    Manager.prototype.updateCabin = function (
        state,
        generationToken,
        tokenCheckCallback
    ) {

        var self = this;

        state = state || CONFIG.DEFAULT_STATE;

        if (!isCurrent(
            generationToken,
            tokenCheckCallback
        )) {
            return Promise.resolve(false);
        }

        this.clear();

        return this._buildCabinModel(state)

            .then(function () {

                if (!isCurrent(
                    generationToken,
                    tokenCheckCallback
                )) {
                    return false;
                }

                return self._buildPanels(
                    state,
                    generationToken,
                    tokenCheckCallback
                );
            })

            .then(function (ok) {

                if (!ok) return false;

                if (!isCurrent(
                    generationToken,
                    tokenCheckCallback
                )) {
                    return false;
                }

                return self._buildFloor(state);
            })

            .then(function (ok) {

                if (!ok) return false;

                if (!isCurrent(
                    generationToken,
                    tokenCheckCallback
                )) {
                    return false;
                }

                return self._buildCeiling(state);
            })

            .then(function (ok) {

                if (!ok) return false;

                if (!isCurrent(
                    generationToken,
                    tokenCheckCallback
                )) {
                    return false;
                }

                return self._buildDoor();
            })

            .then(function (ok) {

                if (!ok) return false;

                if (!isCurrent(
                    generationToken,
                    tokenCheckCallback
                )) {
                    return false;
                }

                return self._buildHandrail(state);
            })

            .then(function (ok) {

                if (!ok) return false;

                if (!isCurrent(
                    generationToken,
                    tokenCheckCallback
                )) {
                    return false;
                }

                return self._buildCOP(state);
            })

            .then(function (ok) {

                if (!ok) return false;

                if (!isCurrent(
                    generationToken,
                    tokenCheckCallback
                )) {
                    return false;
                }

                /*
                 * Reapply current door state after all objects exist.
                 */
                this.setDoorProgress(
                    state.doorState === "OPEN" ? 1 : 0
                );

                return true;

            }.bind(this));
    };


    /* =========================================================
       DOOR ANIMATION
       ========================================================= */

    Manager.prototype.setDoorProgress = function (progress) {

        progress =
            Math.max(
                0,
                Math.min(
                    1,
                    Number(progress) || 0
                )
            );

        this.door.progress = progress;

        if (!this.door.left || !this.door.right) {
            return;
        }

        var d = CONFIG.DIMENSIONS;

        var frameWidth = 0.025;

        var openingWidth =
            d.width - frameWidth * 2;

        var panelWidth =
            openingWidth / 2;

        /*
         * Closed:
         *
         * left  = -panelWidth / 2
         * right = +panelWidth / 2
         *
         * Panels touch exactly in the center.
         */

        var closedLeft =
            -panelWidth / 2;

        var closedRight =
            panelWidth / 2;

        /*
         * Open:
         *
         * Move panels toward the side returns.
         * The travel is large enough to expose the interior.
         */

        var openDistance =
            panelWidth + 0.055;

        var leftX =
            closedLeft -
            openDistance * progress;

        var rightX =
            closedRight +
            openDistance * progress;

        this.door.left.position.x = leftX;
        this.door.right.position.x = rightX;
    };


    Manager.prototype.updateDoorProgress = function (progress) {
        this.setDoorProgress(progress);
    };


    /* =========================================================
       COMPATIBILITY ALIASES
       ========================================================= */

    Manager.prototype.buildCabin = function (
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


    return Manager;

})();