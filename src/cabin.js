window.CabinBuilder = (function () {
    function CabinBuilder(scene) {
        this.scene = scene;
        this.cabinGroup = new THREE.Group();
        this.scene.add(this.cabinGroup);

        this.gltfLoader = new THREE.GLTFLoader();
        this.materialManager = window.MaterialManager.getInstance();
        
        this.modelCache = new Map();
        this.promiseCache = new Map();

        this.doorLeftMesh = null;
        this.doorRightMesh = null;
        this.doorProgress = 1.0; // 1.0 OPEN, 0.0 CLOSED
    }

    CabinBuilder.prototype.loadGLTF = function (path) {
        if (this.modelCache.has(path)) {
            return Promise.resolve(this.modelCache.get(path).clone());
        }
        if (this.promiseCache.has(path)) {
            return this.promiseCache.get(path).then(gltf => gltf.clone());
        }

        const promise = new Promise((resolve, reject) => {
            this.gltfLoader.load(
                path,
                (gltf) => {
                    this.modelCache.set(path, gltf.scene);
                    this.promiseCache.delete(path);
                    resolve(gltf.scene.clone());
                },
                undefined,
                (err) => {
                    this.promiseCache.delete(path);
                    reject(err);
                }
            );
        });

        this.promiseCache.set(path, promise);
        return promise;
    };

    CabinBuilder.prototype.clearCurrentProcedural = function () {
        while (this.cabinGroup.children.length > 0) {
            const child = this.cabinGroup.children[0];
            this.cabinGroup.remove(child);

            child.traverse((node) => {
                if (node.isMesh) {
                    if (node.geometry) node.geometry.dispose();
                    // DO NOT dispose cached materials/textures managed by MaterialManager
                }
            });
        }
        this.doorLeftMesh = null;
        this.doorRightMesh = null;
    };

    CabinBuilder.prototype.buildCabin = async function (state, generationToken) {
        this.clearCurrentProcedural();

        const dims = window.CONFIG.DIMENSIONS;
        const catalogs = window.CONFIG.CATALOGS;

        const modelConfig = catalogs.CABIN_MODELS.find(m => m.id === state.cabinModel);
        let loadedGlb = null;

        if (modelConfig && modelConfig.modelPath) {
            try {
                loadedGlb = await this.loadGLTF(modelConfig.modelPath);
            } catch (e) {
                // Procedural fallback
            }
        }

        if (generationToken && generationToken.cancelled) return;

        if (loadedGlb) {
            this.cabinGroup.add(loadedGlb);
            await this.applyCustomizationsToGLB(loadedGlb, state);
        } else {
            await this.buildProceduralCabin(state, dims, catalogs);
        }

        if (generationToken && generationToken.cancelled) return;

        this.updateDoorProgress(state.doorState === 'OPEN' ? 1.0 : 0.0);
    };

    CabinBuilder.prototype.buildProceduralCabin = async function (state, dims, catalogs) {
        const matMgr = this.materialManager;
        const colorHex = state.colorTone === 'CUSTOM' ? state.customColor : null;
        const etchedConfig = catalogs.ETCHEDS.find(e => e.id === state.etched);
        const materialConfig = catalogs.MATERIALS.find(m => m.id === state.material);

        // Resolve Walls
        const leftWallConfig = catalogs.WALLS.find(w => w.id === state.wallLeft);
        const backWallConfig = catalogs.WALLS.find(w => w.id === state.wallBack);
        const rightWallConfig = catalogs.WALLS.find(w => w.id === state.wallRight);

        const leftMat = await matMgr.getWallMaterial(leftWallConfig, materialConfig, colorHex, etchedConfig, dims.depth, dims.height);
        const backMat = await matMgr.getWallMaterial(backWallConfig, materialConfig, colorHex, etchedConfig, dims.width, dims.height);
        const rightMat = await matMgr.getWallMaterial(rightWallConfig, materialConfig, colorHex, etchedConfig, dims.depth, dims.height);

        // Left Wall
        const leftGeo = new THREE.PlaneGeometry(dims.depth, dims.height);
        const leftMesh = new THREE.Mesh(leftGeo, leftMat);
        leftMesh.position.set(-dims.width / 2, dims.height / 2, 0);
        leftMesh.rotation.y = Math.PI / 2;
        this.cabinGroup.add(leftMesh);

        // Right Wall
        const rightGeo = new THREE.PlaneGeometry(dims.depth, dims.height);
        const rightMesh = new THREE.Mesh(rightGeo, rightMat);
        rightMesh.position.set(dims.width / 2, dims.height / 2, 0);
        rightMesh.rotation.y = -Math.PI / 2;
        this.cabinGroup.add(rightMesh);

        // Back Wall
        const backGeo = new THREE.PlaneGeometry(dims.width, dims.height);
        const backMesh = new THREE.Mesh(backGeo, backMat);
        backMesh.position.set(0, dims.height / 2, -dims.depth / 2);
        this.cabinGroup.add(backMesh);

        // Floor
        const floorConfig = catalogs.FLOORS.find(f => f.id === state.floor);
        const floorMat = await matMgr.getFloorMaterial(floorConfig, dims.width, dims.depth);
        const floorGeo = new THREE.PlaneGeometry(dims.width, dims.depth);
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.position.set(0, 0, 0);
        floorMesh.rotation.x = -Math.PI / 2;
        this.cabinGroup.add(floorMesh);

        // Ceiling
        await this.buildCeiling(state, dims, catalogs);

        // Handrail
        await this.buildHandrail(state, dims, catalogs);

        // COP
        await this.buildCOP(state, dims, catalogs);

        // Doors
        this.buildDoors(dims, leftMat);
    };

    CabinBuilder.prototype.buildCeiling = async function (state, dims, catalogs) {
        const ceilingConfig = catalogs.CEILINGS.find(c => c.id === state.ceiling);
        let ceilingLoaded = false;

        if (ceilingConfig && ceilingConfig.modelPath) {
            try {
                const model = await this.loadGLTF(ceilingConfig.modelPath);
                model.position.set(0, dims.height, 0);
                this.cabinGroup.add(model);
                ceilingLoaded = true;
            } catch (e) {}
        }

        if (!ceilingLoaded) {
            const ceilingGroup = new THREE.Group();
            ceilingGroup.position.set(0, dims.height, 0);

            const baseGeo = new THREE.PlaneGeometry(dims.width, dims.depth);
            const baseMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.8, side: THREE.DoubleSide });
            const baseMesh = new THREE.Mesh(baseGeo, baseMat);
            baseMesh.rotation.x = Math.PI / 2;
            ceilingGroup.add(baseMesh);

            // Frame gap
            const frameGeo = new THREE.BoxGeometry(dims.width - 0.1, 0.02, dims.depth - 0.1);
            const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
            const frameMesh = new THREE.Mesh(frameGeo, frameMat);
            frameMesh.position.set(0, -0.01, 0);
            ceilingGroup.add(frameMesh);

            this.cabinGroup.add(ceilingGroup);
        }
    };

    CabinBuilder.prototype.buildHandrail = async function (state, dims, catalogs) {
        if (state.handrail === 'NONE') return;

        const handrailConfig = catalogs.HANDRAILS.find(h => h.id === state.handrail);
        let loaded = false;

        if (handrailConfig && handrailConfig.modelPath) {
            try {
                const model = await this.loadGLTF(handrailConfig.modelPath);
                model.position.set(0, 1.0, -dims.depth / 2 + 0.05);
                this.cabinGroup.add(model);
                loaded = true;
            } catch (e) {}
        }

        if (!loaded) {
            const group = new THREE.Group();
            const railGeo = new THREE.CylinderGeometry(0.02, 0.02, dims.width - 0.2);
            const railMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
            const railMesh = new THREE.Mesh(railGeo, railMat);
            railMesh.rotation.z = Math.PI / 2;
            railMesh.position.set(0, 1.0, -dims.depth / 2 + 0.05);
            group.add(railMesh);
            this.cabinGroup.add(group);
        }
    };

    CabinBuilder.prototype.buildCOP = async function (state, dims, catalogs) {
        if (state.cop === 'NONE') return;

        const copConfig = catalogs.COPS.find(c => c.id === state.cop);
        let loaded = false;

        if (copConfig && copConfig.modelPath) {
            try {
                const model = await this.loadGLTF(copConfig.modelPath);
                model.position.set(dims.width / 2 - 0.02, 1.2, 0);
                this.cabinGroup.add(model);
                loaded = true;
            } catch (e) {}
        }

        if (!loaded) {
            const panelGeo = new THREE.BoxGeometry(0.01, 1.0, 0.25);
            const panelMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 });
            const panelMesh = new THREE.Mesh(panelGeo, panelMat);
            panelMesh.position.set(dims.width / 2 - 0.01, 1.2, 0);
            this.cabinGroup.add(panelMesh);
        }
    };

    CabinBuilder.prototype.buildDoors = function (dims, material) {
        const doorWidth = dims.width / 2;
        const doorGeo = new THREE.BoxGeometry(doorWidth, dims.height, 0.02);

        this.doorLeftMesh = new THREE.Mesh(doorGeo, material);
        this.doorRightMesh = new THREE.Mesh(doorGeo, material);

        this.doorLeftMesh.position.set(-doorWidth / 2, dims.height / 2, dims.depth / 2);
        this.doorRightMesh.position.set(doorWidth / 2, dims.height / 2, dims.depth / 2);

        this.cabinGroup.add(this.doorLeftMesh);
        this.cabinGroup.add(this.doorRightMesh);
    };

    CabinBuilder.prototype.applyCustomizationsToGLB = async function (glbScene, state) {
        // Direct GLB mapping hook if nodes exist
    };

    CabinBuilder.prototype.updateDoorProgress = function (progress) {
        this.doorProgress = Math.max(0.0, Math.min(1.0, progress));
        if (!this.doorLeftMesh || !this.doorRightMesh) return;

        const dims = window.CONFIG.DIMENSIONS;
        const doorWidth = dims.width / 2;
        const closedLeftX = -doorWidth / 2;
        const closedRightX = doorWidth / 2;

        const openOffset = doorWidth * 0.9;

        this.doorLeftMesh.position.x = closedLeftX - (openOffset * this.doorProgress);
        this.doorRightMesh.position.x = closedRightX + (openOffset * this.doorProgress);
    };

    return CabinBuilder;
})();
