window.MaterialManager = (function () {

    var instance = null;

    function Manager() {
        this.textureLoader = new THREE.TextureLoader();

        // Cache Promise texture để nhiều request cùng asset
        // không tạo nhiều HTTP request.
        this.textureCache = new Map();

        // Cache material đã tạo.
        this.materialCache = new Map();

        // Asset đã lỗi thì không thử tải lại liên tục.
        this.failedAssets = new Set();
    }

    /*
     * ============================================================
     * TEXTURE
     * ============================================================
     */

    Manager.prototype._texture = function (path, isData) {
        if (!path) {
            return Promise.resolve(null);
        }

        if (this.failedAssets.has(path)) {
            return Promise.resolve(null);
        }

        /*
         * Texture cache dùng path làm source of truth.
         * Với bump/data texture, encoding được thiết lập
         * ngay khi texture được load.
         */
        if (this.textureCache.has(path)) {
            return this.textureCache.get(path);
        }

        var self = this;

        var promise = new Promise(function (resolve) {

            self.textureLoader.load(
                path,

                function (texture) {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;

                    /*
                     * Three.js r128:
                     * - Color texture -> sRGB
                     * - Data/bump texture -> Linear
                     */
                    texture.encoding = isData
                        ? THREE.LinearEncoding
                        : THREE.sRGBEncoding;

                    resolve(texture);
                },

                undefined,

                function () {
                    self.failedAssets.add(path);
                    resolve(null);
                }
            );
        });

        this.textureCache.set(path, promise);

        return promise;
    };


    /*
     * ============================================================
     * TEXTURE REPEAT
     * ============================================================
     */

    Manager.prototype._repeat = function (texture, width, height) {

        if (!texture) {
            return;
        }

        var w = Number(width);
        var h = Number(height);

        if (!isFinite(w) || w <= 0) {
            w = 1;
        }

        if (!isFinite(h) || h <= 0) {
            h = 1;
        }

        /*
         * Cabin dimensions đang dùng mét.
         *
         * Reference:
         * width  ~ 0.7m
         * height ~ 1.8m
         */
        texture.repeat.set(
            Math.max(1, w / 0.7),
            Math.max(1, h / 1.8)
        );
    };


    /*
     * ============================================================
     * COLOR
     * ============================================================
     */

    Manager.prototype._resolveColor = function (colorTone) {

        /*
         * DEFAULT:
         * Không override màu vật liệu.
         */
        if (!colorTone || colorTone === 'DEFAULT') {
            return null;
        }

        /*
         * Nếu caller truyền trực tiếp HEX,
         * giữ nguyên khả năng tương thích.
         */
        if (
            typeof colorTone === 'string' &&
            (
                colorTone.charAt(0) === '#' ||
                colorTone.indexOf('rgb') === 0
            )
        ) {
            return new THREE.Color(colorTone);
        }

        /*
         * Ưu tiên lấy từ CONFIG.CATALOGS.COLORS.
         */
        if (
            window.CONFIG &&
            window.CONFIG.CATALOGS &&
            Array.isArray(window.CONFIG.CATALOGS.COLORS)
        ) {

            var item = window.CONFIG.CATALOGS.COLORS.find(function (x) {
                return x.id === colorTone;
            });

            if (item && item.hex) {
                return new THREE.Color(item.hex);
            }

            /*
             * CUSTOM trong CONFIG có hex mặc định.
             * Nhưng màu custom thực tế có thể được truyền
             * từ state.customColor qua caller.
             */
            if (item && item.id === 'CUSTOM' && item.hex) {
                return new THREE.Color(item.hex);
            }
        }

        return null;
    };


    /*
     * ============================================================
     * FALLBACK WALL MATERIAL
     * ============================================================
     */

    Manager.prototype._fallback = function (id) {

        var colors = {
            I01: 0xb9bec0,
            I02: 0xe2e5e6,
            I03: 0xb8bdc0,
            I04: 0xb3b8ba,
            I05: 0xb3b8ba,
            I06: 0xd4b04a,
            I07: 0xc6a354,
            I08: 0x8e6654
        };

        var material = new THREE.MeshStandardMaterial({
            color: colors[id] || 0xb9bec0,
            metalness: 0.88,
            roughness: id === 'I02' ? 0.14 : 0.27,
            side: THREE.DoubleSide
        });


        /*
         * Procedural fallback cho:
         * I01 Hairline
         * I03 Brushed
         *
         * Dùng CanvasTexture để cabin vẫn có
         * vẻ inox xước ngay cả khi chưa có ảnh texture.
         */
        if (id === 'I03' || id === 'I01') {

            var canvas = document.createElement('canvas');

            canvas.width = 256;
            canvas.height = 256;

            var context = canvas.getContext('2d');

            context.fillStyle = '#b9bec0';
            context.fillRect(0, 0, 256, 256);

            /*
             * Các đường xước dọc.
             * Không dùng màu random quá mạnh để tránh
             * mỗi lần rebuild tạo hình ảnh khác biệt.
             */
            for (var y = 0; y < 256; y += 2) {

                var alpha = 0.10 + ((y % 10) / 100);

                context.fillStyle =
                    'rgba(255,255,255,' + alpha + ')';

                context.fillRect(0, y, 256, 1);
            }

            var texture = new THREE.CanvasTexture(canvas);

            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;

            texture.repeat.set(2, 4);

            texture.encoding = THREE.sRGBEncoding;

            material.map = texture;
        }

        return material;
    };


    /*
     * ============================================================
     * WALL MATERIAL
     * ============================================================
     *
     * API giữ nguyên:
     *
     * getWallMaterial(
     *     wall,
     *     base,
     *     colorTone,
     *     etched,
     *     width,
     *     height
     * )
     *
     * Trả về Promise<THREE.Material>
     */

    Manager.prototype.getWallMaterial = function (
        wall,
        base,
        colorTone,
        etched,
        width,
        height
    ) {

        wall = wall || {};
        base = base || {};
        etched = etched || {};

        var wallId = wall.id || 'UNKNOWN_WALL';
        var baseId = base.id || 'UNKNOWN_BASE';
        var colorId = colorTone || 'DEFAULT';
        var etchedId = etched.id || 'NONE';

        var w = Number(width);
        var h = Number(height);

        if (!isFinite(w) || w <= 0) {
            w = 1;
        }

        if (!isFinite(h) || h <= 0) {
            h = 1;
        }

        /*
         * Material cache key phải phân biệt:
         * - wall
         * - base material
         * - color
         * - etched
         * - dimensions
         */
        var cacheKey =
            wallId + '|' +
            baseId + '|' +
            colorId + '|' +
            etchedId + '|' +
            w + '|' +
            h;


        if (this.materialCache.has(cacheKey)) {
            return Promise.resolve(
                this.materialCache.get(cacheKey)
            );
        }

        var self = this;

        /*
         * WALL hiện tại chủ yếu sử dụng fallback/procedural.
         * Nếu sau này catalog bổ sung texturePath,
         * hệ thống tự sử dụng texture thật.
         */
        var path = wall.texturePath || null;

        return this._texture(path, false)
            .then(function (texture) {

                var material;

                if (texture) {

                    material = new THREE.MeshStandardMaterial({
                        map: texture,
                        metalness: 0.88,
                        roughness: 0.25,
                        side: THREE.DoubleSide
                    });

                    self._repeat(texture, w, h);

                } else {

                    material = self._fallback(wallId);
                }


                /*
                 * Color override.
                 *
                 * DEFAULT -> giữ màu vật liệu.
                 * WHITE/BLACK/GOLD/CHAMPAGNE -> lấy HEX từ CONFIG.
                 */
                var color = self._resolveColor(colorTone);

                if (color) {
                    material.color.copy(color);
                }


                /*
                 * Etched / bump map.
                 */
                if (etched.bumpPath) {

                    return self._texture(
                        etched.bumpPath,
                        true
                    ).then(function (bumpTexture) {

                        if (bumpTexture) {

                            self._repeat(
                                bumpTexture,
                                w,
                                h
                            );

                            material.bumpMap = bumpTexture;
                            material.bumpScale = 0.055;
                        }

                        self.materialCache.set(
                            cacheKey,
                            material
                        );

                        return material;
                    });
                }


                self.materialCache.set(
                    cacheKey,
                    material
                );

                return material;
            });
    };


    /*
     * ============================================================
     * FLOOR MATERIAL
     * ============================================================
     */

    Manager.prototype.getFloorMaterial = function (
        floor,
        width,
        depth
    ) {

        floor = floor || {};

        var floorId = floor.id || 'UNKNOWN_FLOOR';

        var w = Number(width);
        var d = Number(depth);

        if (!isFinite(w) || w <= 0) {
            w = 1;
        }

        if (!isFinite(d) || d <= 0) {
            d = 1;
        }

        var cacheKey =
            floorId + '|' +
            w + '|' +
            d;


        if (this.materialCache.has(cacheKey)) {
            return Promise.resolve(
                this.materialCache.get(cacheKey)
            );
        }

        var self = this;

        return this._texture(
            floor.texturePath,
            false
        ).then(function (texture) {

            var material;

            if (texture) {

                material = new THREE.MeshStandardMaterial({
                    map: texture,
                    metalness: 0.10,
                    roughness: 0.62
                });

                self._repeat(
                    texture,
                    w,
                    d
                );

            } else {

                /*
                 * Fallback floor.
                 */
                material = new THREE.MeshStandardMaterial({
                    color: 0xc7c0b6,
                    metalness: 0.08,
                    roughness: 0.68
                });
            }

            self.materialCache.set(
                cacheKey,
                material
            );

            return material;
        });
    };


    /*
     * ============================================================
     * SINGLETON
     * ============================================================
     */

    Manager.prototype.getInstance = function () {
        return this;
    };


    return {

        getInstance: function () {

            if (!instance) {
                instance = new Manager();
            }

            return instance;
        }
    };

})();