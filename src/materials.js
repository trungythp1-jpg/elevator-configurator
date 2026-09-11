window.MaterialManager = (function () {
    let instance;

    function createInstance() {
        const textureLoader = new THREE.TextureLoader();
        const textureCache = new Map();
        const promiseCache = new Map();
        const materialCache = new Map();
        const failedAssets = new Set();

        function loadTexture(path) {
            if (!path) return Promise.reject(new Error("No path provided"));
            if (failedAssets.has(path)) {
                return Promise.reject(new Error(`Asset previously failed: ${path}`));
            }
            if (textureCache.has(path)) {
                return Promise.resolve(textureCache.get(path));
            }
            if (promiseCache.has(path)) {
                return promiseCache.get(path);
            }

            const promise = new Promise((resolve, reject) => {
                textureLoader.load(
                    path,
                    (texture) => {
                        texture.encoding = THREE.sRGBEncoding;
                        textureCache.set(path, texture);
                        promiseCache.delete(path);
                        resolve(texture);
                    },
                    undefined,
                    (err) => {
                        failedAssets.add(path);
                        promiseCache.delete(path);
                        reject(err);
                    }
                );
            });

            promiseCache.set(path, promise);
            return promise;
        }

        function createProceduralHairlineTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#cccccc';
            ctx.fillRect(0, 0, 512, 512);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            for (let i = 0; i < 2000; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                ctx.fillRect(x, y, 1, Math.random() * 40 + 10);
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            return texture;
        }

        async function getWallMaterial(wallConfig, materialConfig, colorToneHex, etchedConfig, surfaceWidth = 1.4, surfaceHeight = 2.4) {
            const cacheKey = `${wallConfig?.id}_${materialConfig?.id}_${colorToneHex}_${etchedConfig?.id}_${surfaceWidth}x${surfaceHeight}`;
            if (materialCache.has(cacheKey)) {
                return materialCache.get(cacheKey);
            }

            const matOptions = {
                color: new THREE.Color(colorToneHex || materialConfig?.color || '#d0d0d0'),
                roughness: materialConfig?.roughness ?? 0.3,
                metalness: materialConfig?.metalness ?? 0.9,
                side: THREE.DoubleSide
            };

            let texture = null;
            if (wallConfig?.texturePath) {
                try {
                    texture = await loadTexture(wallConfig.texturePath);
                } catch (e) {
                    texture = createProceduralHairlineTexture();
                }
            }

            if (texture) {
                const clonedTex = texture.clone();
                clonedTex.needsUpdate = true;
                clonedTex.wrapS = THREE.RepeatWrapping;
                clonedTex.wrapT = THREE.RepeatWrapping;
                clonedTex.repeat.set(surfaceWidth / 1.0, surfaceHeight / 1.0);
                matOptions.map = clonedTex;
            }

            if (etchedConfig && etchedConfig.id !== 'NONE' && etchedConfig.texturePath) {
                try {
                    const etchedTex = await loadTexture(etchedConfig.texturePath);
                    const clonedEtched = etchedTex.clone();
                    clonedEtched.needsUpdate = true;
                    clonedEtched.wrapS = THREE.RepeatWrapping;
                    clonedEtched.wrapT = THREE.RepeatWrapping;
                    clonedEtched.repeat.set(surfaceWidth / 1.0, surfaceHeight / 1.0);
                    matOptions.bumpMap = clonedEtched;
                    matOptions.bumpScale = 0.05;
                } catch (e) {
                    // Fallback ignoring etched bump if missing
                }
            }

            const mat = new THREE.MeshStandardMaterial(matOptions);
            materialCache.set(cacheKey, mat);
            return mat;
        }

        async function getFloorMaterial(floorConfig, width = 1.4, depth = 1.2) {
            const cacheKey = `floor_${floorConfig?.id}_${width}x${depth}`;
            if (materialCache.has(cacheKey)) {
                return materialCache.get(cacheKey);
            }

            const matOptions = {
                color: new THREE.Color(floorConfig?.color || '#555555'),
                roughness: 0.4,
                metalness: 0.1,
                side: THREE.DoubleSide
            };

            if (floorConfig?.texturePath) {
                try {
                    const texture = await loadTexture(floorConfig.texturePath);
                    const clonedTex = texture.clone();
                    clonedTex.needsUpdate = true;
                    clonedTex.wrapS = THREE.RepeatWrapping;
                    clonedTex.wrapT = THREE.RepeatWrapping;
                    clonedTex.repeat.set(width / 1.0, depth / 1.0);
                    matOptions.map = clonedTex;
                } catch (e) {
                    // Failover to pure color
                }
            }

            const mat = new THREE.MeshStandardMaterial(matOptions);
            materialCache.set(cacheKey, mat);
            return mat;
        }

        return {
            loadTexture,
            getWallMaterial,
            getFloorMaterial
        };
    }

    return {
        getInstance: function () {
            if (!instance) {
                instance = createInstance();
            }
            return instance;
        }
    };
})();
