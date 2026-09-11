window.CabinBuilder = (function () {

    function Builder(scene) {

        this.scene = scene;

        this.root = new THREE.Group();
        this.root.name = 'Cabin';

        scene.add(this.root);

        this.mm = MaterialManager.getInstance();

        this.loader = new THREE.GLTFLoader();
        this.gltfCache = new Map();

        this.door = {
            left: null,
            right: null,
            progress: 1
        };

        this.buildGeneration = 0;
    }


    /*
     * ============================================================
     * CATALOG HELPER
     * ============================================================
     *
     * Không phụ thuộc CONFIG.find().
     * CONFIG vẫn là source of truth.
     */

    Builder.prototype.findCatalog = function (group, id) {

        if (
            !window.CONFIG ||
            !CONFIG.CATALOGS ||
            !Array.isArray(CONFIG.CATALOGS[group])
        ) {
            return null;
        }

        return CONFIG.CATALOGS[group].find(function (item) {
            return item.id === id;
        }) || null;
    };


    /*
     * ============================================================
     * CLEAR
     * ============================================================
     */

    Builder.prototype.clear = function () {

        this.root.traverse(function (object) {

            if (object.isMesh && object.geometry) {
                object.geometry.dispose();
            }

            /*
             * Không dispose material ở đây.
             *
             * MaterialManager có material cache.
             * Dispose material tại đây có thể làm những cabin
             * rebuild sau bị mất material/texture.
             */
        });

        while (this.root.children.length) {
            this.root.remove(this.root.children[0]);
        }

        this.door.left = null;
        this.door.right = null;
    };


    /*
     * ============================================================
     * GLTF CACHE
     * ============================================================
     */

    Builder.prototype.load = function (path) {

        if (!path) {
            return Promise.reject(
                new Error('Missing GLTF asset path')
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

        var mesh = new THREE.Mesh(
            geometry,
            material
        );

        mesh.position.set(x, y, z);

        mesh.name = name || 'Mesh';

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        parent.add(mesh);

        return mesh;
    };


    /*
     * ============================================================
     * MAIN UPDATE API
     * ============================================================
     *
     * Chuẩn:
     *
     * updateCabin(
     *     state,
     *     generationToken,
     *     tokenCheckCallback
     * )
     */

    Builder.prototype.updateCabin = function (
        state,
        generationToken,
        tokenCheckCallback
    ) {

        var self = this;

        var token =
            generationToken !== undefined
                ? generationToken
                : (++this.buildGeneration);

        var isCurrent =
            typeof tokenCheckCallback === 'function'
                ? tokenCheckCallback
                : function () {
                    return token === self.buildGeneration;
                };

        /*
         * Nếu caller dùng token nhưng không cung cấp callback,
         * tăng generation nội bộ để bảo vệ async rebuild.
         */
        if (generationToken === undefined) {
            token = this.buildGeneration;
        }

        var dimensions = CONFIG.DIMENSIONS;
        var catalogs = CONFIG.CATALOGS;

        /*
         * --------------------------------------------------------
         * Resolve catalog
         * --------------------------------------------------------
         */

        var wallLeft =
            this.findCatalog(
                'WALLS',
                state.wallLeft
            ) ||
            catalogs.WALLS[0];

        var wallBack =
            this.findCatalog(
                'WALLS',
                state.wallBack
            ) ||
            catalogs.WALLS[0];

        var wallRight =
            this.findCatalog(
                'WALLS',
                state.wallRight
            ) ||
            catalogs.WALLS[0];

        var base =
            this.findCatalog(
                'MATERIALS',
                state.material
            ) ||
            catalogs.MATERIALS[0];

        var etched =
            this.findCatalog(
                'ETCHEDS',
                state.etched
            ) ||
            catalogs.ETCHEDS[0];

        var floor =
            this.findCatalog(
                'FLOORS',
                state.floor
            ) ||
            catalogs.FLOORS[0];

        var color =
            this.findCatalog(
                'COLORS',
                state.colorTone
            );

        /*
         * MaterialManager nhận colorTone theo contract.
         *
         * CUSTOM cần HEX thực tế.
         */
        var colorTone =
            state.colorTone === 'CUSTOM'
                ? state.customColor
                : state.colorTone;


        /*
         * --------------------------------------------------------
         * Request materials
         * --------------------------------------------------------
         */

        return Promise.all([

            self.mm.getWallMaterial(
                wallLeft,
                base,
                colorTone,
                etched,
                dimensions.width,
                dimensions.height
            ),

            self.mm.getWallMaterial(
                wallBack,
                base,
                colorTone,
                etched,
                dimensions.width,
                dimensions.height
            ),

            self.mm.getWallMaterial(
                wallRight,
                base,
                colorTone,
                etched,
                dimensions.depth,
                dimensions.height
            ),

            self.mm.getFloorMaterial(
                floor,
                dimensions.width,
                dimensions.depth
            )

        ]).then(function (materials) {

            /*
             * Async guard.
             */
            if (!isCurrent(token)) {
                return;
            }

            /*
             * Xóa cabin cũ ngay trước khi tạo cabin mới.
             */
            self.clear();

            /*
             * ----------------------------------------------------
             * Interior shell
             * ----------------------------------------------------
             */

            var shell = new THREE.Group();

            shell.name = 'InteriorShell';

            self.root.add(shell);

            var wallThickness = 0.035;


            /*
             * BACK
             */

            self.mesh(
                shell,
                new THREE.BoxGeometry(
                    dimensions.width,
                    dimensions.height,
                    wallThickness
                ),
                materials[1],
                0,
                dimensions.height / 2,
                -dimensions.depth / 2,
                'BackWall'
            );


            /*
             * LEFT
             */

            self.mesh(
                shell,
                new THREE.BoxGeometry(
                    wallThickness,
                    dimensions.height,
                    dimensions.depth
                ),
                materials[0],
                -dimensions.width / 2,
                dimensions.height / 2,
                0,
                'LeftWall'
            );


            /*
             * RIGHT
             */

            self.mesh(
                shell,
                new THREE.BoxGeometry(
                    wallThickness,
                    dimensions.height,
                    dimensions.depth
                ),
                materials[2],
                dimensions.width / 2,
                dimensions.height / 2,
                0,
                'RightWall'
            );


            /*
             * FLOOR
             */

            self.mesh(
                shell,
                new THREE.BoxGeometry(
                    dimensions.width,
                    0.05,
                    dimensions.depth
                ),
                materials[3],
                0,
                0.025,
                0,
                'Floor'
            );


            /*
             * Architectural ceiling.
             */

            self.buildCeiling();


            /*
             * Front door.
             */

            self.buildDoor();


            /*
             * Optional components.
             */

            return self.buildComponents(
                state,
                token,
                isCurrent
            );
        });
    };


    /*
     * ============================================================
     * COMPATIBILITY ALIASES
     * ============================================================
     *
     * Trong lúc đồng bộ 9 file, giữ alias để tránh app cũ
     * chết ngay khi gọi build/buildCabin.
     */

    Builder.prototype.build = function (
        state,
        token,
        isCurrent
    ) {
        return this.updateCabin(
            state,
            token,
            isCurrent
        );
    };

    Builder.prototype.buildCabin = function (
        state,
        token,
        isCurrent
    ) {
        return this.updateCabin(
            state,
            token,
            isCurrent
        );
    };


    /*
     * ============================================================
     * CEILING
     * ============================================================
     */

    Builder.prototype.buildCeiling = function () {

        var dimensions = CONFIG.DIMENSIONS;

        var group = new THREE.Group();

        group.name = 'ArchitecturalCeiling';

        this.root.add(group);


        /*
         * Outer ceiling.
         */

        var outerMaterial =
            new THREE.MeshStandardMaterial({
                color: 0xf3f0e9,
                roughness: 0.72
            });


        /*
         * Shadow-gap.
         */

        var shadowMaterial =
            new THREE.MeshStandardMaterial({
                color: 0x373a3c,
                metalness: 0.50,
                roughness: 0.34
            });


        /*
         * Inner recessed layer.
         */

        var innerMaterial =
            new THREE.MeshStandardMaterial({
                color: 0xe5e0d6,
                roughness: 0.62
            });


        /*
         * CNC central panel.
         */

        var cncMaterial =
            new THREE.MeshStandardMaterial({
                color: 0xb8b0a3,
                metalness: 0.32,
                roughness: 0.42
            });


        /*
         * Hidden ambient LED.
         */

        var glowMaterial =
            new THREE.MeshStandardMaterial({
                color: 0xfff8e8,
                emissive: 0xffe5ad,
                emissiveIntensity: 2.2
            });


        /*
         * Outer layer.
         */

        this.mesh(
            group,
            new THREE.BoxGeometry(
                dimensions.width - 0.08,
                0.04,
                dimensions.depth - 0.08
            ),
            outerMaterial,
            0,
            dimensions.height - 0.06,
            0,
            'CeilingOuter'
        );


        /*
         * Shadow gap.
         */

        this.mesh(
            group,
            new THREE.BoxGeometry(
                dimensions.width - 0.24,
                0.025,
                dimensions.depth - 0.24
            ),
            shadowMaterial,
            0,
            dimensions.height - 0.035,
            0,
            'ShadowGap'
        );


        /*
         * Inner recessed panel.
         */

        this.mesh(
            group,
            new THREE.BoxGeometry(
                dimensions.width - 0.31,
                0.025,
                dimensions.depth - 0.31
            ),
            innerMaterial,
            0,
            dimensions.height - 0.012,
            0,
            'CeilingInner'
        );


        /*
         * Central CNC decorative panel.
         */

        this.mesh(
            group,
            new THREE.BoxGeometry(
                dimensions.width * 0.46,
                0.016,
                dimensions.depth * 0.42
            ),
            cncMaterial,
            0,
            dimensions.height + 0.004,
            0,
            'CentralCNC'
        );


        /*
         * Hidden LED strips.
         */

        [-0.39, 0.39].forEach(function (x) {

            this.mesh(
                group,
                new THREE.BoxGeometry(
                    0.028,
                    0.012,
                    dimensions.depth - 0.34
                ),
                glowMaterial,
                x,
                dimensions.height + 0.014,
                0,
                'HiddenLED'
            );

        }, this);
    };


    /*
     * ============================================================
     * DOOR
     * ============================================================
     */

    Builder.prototype.buildDoor = function () {

        var dimensions = CONFIG.DIMENSIONS;

        var width = dimensions.width * 0.235;
        var height = dimensions.height * 0.87;

        var z =
            dimensions.depth / 2 - 0.045;


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


        var frame = new THREE.Group();

        frame.name = 'DoorFrame';

        this.root.add(frame);


        /*
         * Left frame.
         */

        this.mesh(
            frame,
            new THREE.BoxGeometry(
                0.04,
                height + 0.04,
                0.055
            ),
            frameMaterial,
            -dimensions.width / 2 + 0.02,
            height / 2,
            z + 0.035,
            'FrameL'
        );


        /*
         * Right frame.
         */

        this.mesh(
            frame,
            new THREE.BoxGeometry(
                0.04,
                height + 0.04,
                0.055
            ),
            frameMaterial,
            dimensions.width / 2 - 0.02,
            height / 2,
            z + 0.035,
            'FrameR'
        );


        /*
         * Top frame.
         */

        this.mesh(
            frame,
            new THREE.BoxGeometry(
                dimensions.width,
                0.04,
                0.055
            ),
            frameMaterial,
            0,
            height + 0.02,
            z + 0.035,
            'FrameTop'
        );


        /*
         * Door panels.
         */

        this.door.left = this.mesh(
            this.root,
            new THREE.BoxGeometry(
                width,
                height,
                0.05
            ),
            doorMaterial,
            -width / 2,
            height / 2,
            z,
            'DoorLeft'
        );


        this.door.right = this.mesh(
            this.root,
            new THREE.BoxGeometry(
                width,
                height,
                0.05
            ),
            doorMaterial,
            width / 2,
            height / 2,
            z,
            'DoorRight'
        );


        /*
         * Default OPEN.
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
        token,
        isCurrent
    ) {

        var self = this;

        var dimensions = CONFIG.DIMENSIONS;

        var handrail =
            this.findCatalog(
                'HANDRAILS',
                state.handrail
            );

        var cop =
            this.findCatalog(
                'COPS',
                state.cop
            );

        var jobs = [];


        /*
         * Handrail.
         */

        if (
            handrail &&
            handrail.id !== 'NONE'
        ) {

            jobs.push(
                self.assetOrFallback(
                    handrail,
                    'Handrail',
                    new THREE.Vector3(
                        0,
                        dimensions.height * 0.43,
                        -dimensions.depth / 2 + 0.08
                    ),
                    0.78,
                    token,
                    isCurrent
                )
            );
        }


        /*
         * COP.
         */

        if (
            cop &&
            cop.id !== 'NONE'
        ) {

            jobs.push(
                self.assetOrFallback(
                    cop,
                    'COP',
                    new THREE.Vector3(
                        dimensions.width / 2 - 0.08,
                        dimensions.height * 0.52,
                        0
                    ),
                    0.65,
                    token,
                    isCurrent
                )
            );
        }


        return Promise.all(jobs);
    };


    /*
     * ============================================================
     * GLB COMPONENT
     * ============================================================
     */

    Builder.prototype.assetOrFallback = function (
        item,
        name,
        position,
        targetSize,
        token,
        isCurrent
    ) {

        var self = this;

        if (!item.modelPath) {
            return Promise.resolve(
                self.fallback(
                    item,
                    name,
                    position
                )
            );
        }


        return this.load(item.modelPath)
            .then(function (gltf) {

                if (!isCurrent(token)) {
                    return;
                }

                if (
                    !gltf ||
                    !gltf.scene
                ) {
                    throw new Error(
                        'Invalid GLTF asset'
                    );
                }


                var group =
                    gltf.scene.clone(true);


                var box =
                    new THREE.Box3()
                        .setFromObject(group);


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
                    targetSize / max;


                group.scale.setScalar(scale);


                group.position.set(
                    position.x - center.x * scale,
                    position.y - center.y * scale,
                    position.z - center.z * scale
                );


                group.name =
                    name + 'Asset';


                group.traverse(function (object) {

                    if (object.isMesh) {
                        object.castShadow = true;
                        object.receiveShadow = true;
                    }

                });


                self.root.add(group);
            })
            .catch(function () {

                if (isCurrent(token)) {

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

        var group = new THREE.Group();

        group.name =
            name + 'Fallback';


        var material =
            new THREE.MeshStandardMaterial({
                color:
                    name === 'COP'
                        ? 0x202326
                        : 0xc6c9cb,
                metalness: 0.78,
                roughness: 0.24
            });


        if (name === 'Handrail') {

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


            bar.castShadow = true;
            bar.receiveShadow = true;

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


            panel.castShadow = true;
            panel.receiveShadow = true;

            group.add(panel);
        }


        this.root.add(group);

        return group;
    };


    /*
     * ============================================================
     * DOOR PROGRESS
     * ============================================================
     *
     * 0 = CLOSED
     * 1 = OPEN
     */

    Builder.prototype.setDoorProgress = function (value) {

        var progress =
            Math.max(
                0,
                Math.min(
                    1,
                    Number(value)
                )
            );

        if (!isFinite(progress)) {
            progress = 1;
        }

        this.door.progress = progress;


        if (
            !this.door.left ||
            !this.door.right
        ) {
            return;
        }


        var dimensions =
            CONFIG.DIMENSIONS;

        var width =
            dimensions.width * 0.235;

        var distance =
            dimensions.width * 0.43;


        this.door.left.position.x =
            -width / 2 -
            distance * progress;


        this.door.right.position.x =
            width / 2 +
            distance * progress;
    };


    /*
     * Compatibility alias.
     */

    Builder.prototype.updateDoorProgress =
        function (value) {
            this.setDoorProgress(value);
        };


    /*
     * ============================================================
     * RETURN PUBLIC CLASS
     * ============================================================
     */

    return Builder;

})();