ELEVATOR CONFIGURATOR — APP.JS PATCH
=====================================

File cần sửa:
src/app.js

MỤC TIÊU:
1. Tính giá vách theo đúng 11 panel.
2. Không còn wallLeft × 3.
3. Giữ nguyên topology:
   1+2, 3+5, 4, 6+8, 7, 9+11, 10.
4. Không thay đổi các phần khác của app.js.

------------------------------------------------------------
A. THAY TOÀN BỘ HÀM App.prototype.total
------------------------------------------------------------

Tìm:

    App.prototype.total =
        function () {

        ...
        };

Xóa toàn bộ hàm cũ và thay bằng:

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

                        return Number(
                            list[i].price
                        ) || 0;

                    }

                }

                return 0;
            }


            /*
             * ====================================================
             * CABIN MODEL
             * ====================================================
             */

            total +=
                price(
                    "CABIN_MODELS",
                    s.cabinModel
                );


            /*
             * ====================================================
             * 11-PANEL WALL PRICING
             *
             * Topology:
             *
             * 1 + 2  = panel12  -> 2 tấm
             * 3 + 5  = panel35  -> 2 tấm
             * 4      = panel4   -> 1 tấm
             * 6 + 8  = panel68  -> 2 tấm
             * 7      = panel7   -> 1 tấm
             * 9 + 11 = panel911 -> 2 tấm
             * 10     = panel10  -> 1 tấm
             *
             * Tổng = 11 tấm.
             * ====================================================
             */

            total +=
                price(
                    "WALLS",
                    s.panel12 || s.wallLeft
                ) * 2;

            total +=
                price(
                    "WALLS",
                    s.panel35 || s.wallLeft
                ) * 2;

            total +=
                price(
                    "WALLS",
                    s.panel4 || s.wallLeft
                );

            total +=
                price(
                    "WALLS",
                    s.panel68 || s.wallBack
                ) * 2;

            total +=
                price(
                    "WALLS",
                    s.panel7 || s.wallBack
                );

            total +=
                price(
                    "WALLS",
                    s.panel911 || s.wallRight
                ) * 2;

            total +=
                price(
                    "WALLS",
                    s.panel10 || s.wallRight
                );


            /*
             * ====================================================
             * MATERIAL
             * ====================================================
             */

            total +=
                price(
                    "MATERIALS",
                    s.material
                );


            /*
             * ====================================================
             * ETCHED
             * ====================================================
             */

            total +=
                price(
                    "ETCHEDS",
                    s.etched
                );


            /*
             * ====================================================
             * FLOOR
             * ====================================================
             */

            total +=
                price(
                    "FLOORS",
                    s.floor
                );


            /*
             * ====================================================
             * CEILING
             * ====================================================
             */

            total +=
                price(
                    "CEILINGS",
                    s.ceiling
                );


            /*
             * ====================================================
             * HANDRAIL
             * ====================================================
             */

            total +=
                price(
                    "HANDRAILS",
                    s.handrail
                );


            /*
             * ====================================================
             * COP
             * ====================================================
             */

            total +=
                price(
                    "COPS",
                    s.cop
                );


            /*
             * ====================================================
             * LIGHTING
             * ====================================================
             */

            total +=
                price(
                    "LIGHTINGS",
                    s.lighting
                );


            return total;
        };


------------------------------------------------------------
B. SỬA REBUILD ĐỂ KHÔNG BAO GIỜ KẸT LOADING
------------------------------------------------------------

Phần catch hiện tại của app.js đã có xử lý lỗi, nhưng để tránh
một Promise/asset ngoài dự kiến giữ loading quá lâu, giữ nguyên
cấu trúc build hiện tại và thay đoạn:

    .catch(function (error) {

        ...
    });

bằng:

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


        /*
         * Luôn cập nhật giá dù một asset phụ bị lỗi.
         */

        try {

            self.ui.price(
                self.total()
            );

        } catch (priceError) {

            console.error(
                "Elevator Configurator price error:",
                priceError
            );

        }


        /*
         * QUAN TRỌNG:
         * luôn tắt loading khi generation hiện tại kết thúc
         * bằng lỗi.
         */

        self.ui.loading(
            false
        );


        self.ui.toast(
            "Đã dựng cabin với asset dự phòng."
        );

    });

------------------------------------------------------------
C. KHÔNG SỬA CÁC PHẦN SAU
------------------------------------------------------------

Không sửa:

- cabin.js topology 11 panel.
- scene.js.
- materials.js.
- lighting.js.
- ui.js.
- DIMENSIONS.
- DEFAULT_STATE.
- các event select hiện tại.

Sau khi thay config.js ở file TXT còn lại và patch total()
trong app.js:

- I01-I08 sẽ có thumbnail thật.
- Floor T01-T06 sẽ có thumbnail thật.
- Ceiling C01-C06 sẽ có thumbnail thật.
- Handrail H01-H03 sẽ có thumbnail thật.
- COP P01-P04 sẽ có thumbnail thật.
- Lighting L01-L04 sẽ có thumbnail thật.
- các GLB cabin dùng đúng đường dẫn assets/cabin.
- giá vách sẽ tính đủ 11 tấm.
