window.CONFIG = {

    /*
     * ============================================================
     * DIMENSIONS
     * ============================================================
     */

    DIMENSIONS: {
        width: 1.4,
        depth: 1.2,
        height: 2.4
    },


    /*
     * ============================================================
     * DEFAULT STATE
     *
     * 11 PANEL SYSTEM
     *
     * 1  ↔ 2
     * 3  ↔ 5
     * 4
     * 6  ↔ 8
     * 7
     * 9  ↔ 11
     * 10
     *
     * LEFT:
     *  3 - 4 - 5
     *
     * BACK:
     *  6 - 7 - 8
     *
     * RIGHT:
     *  9 - 10 - 11
     *
     * DOOR RETURNS:
     *  1 / 2
     * ============================================================
     */

    DEFAULT_STATE: {

        cabinModel: 'GV-001',

        wallMode: 'SAME',

        /*
         * Legacy wall state.
         * Giữ lại để tương thích hệ thống cũ.
         */

        wallLeft: 'I03',
        wallBack: 'I03',
        wallRight: 'I03',

        /*
         * ========================================================
         * 11-PANEL GROUP STATE
         * ========================================================
         */

        panel12: 'I03',
        panel35: 'I03',
        panel4: 'I03',
        panel68: 'I03',
        panel7: 'I03',
        panel911: 'I03',
        panel10: 'I03',

        /*
         * ========================================================
         * COMMON MATERIAL SETTINGS
         * ========================================================
         */

        material: 'S01',
        etched: 'NONE',
        floor: 'T01',
        ceiling: 'C01',
        doorState: 'OPEN',
        handrail: 'NONE',
        cop: 'NONE',
        lighting: 'L01',
        colorTone: 'DEFAULT',
        customColor: '#ffffff'
    },


    /*
     * ============================================================
     * CATALOGS
     * ============================================================
     */

    CATALOGS: {

        /*
         * ========================================================
         * CABIN MODELS
         *
         * GLB thực tế nằm trong assets/cabin.
         * Không khai báo PNG thumbnail vì repository hiện không có
         * GV-001.png / GV-002.png / GV-003.png.
         * ========================================================
         */

        CABIN_MODELS: [

            {
                id: 'GV-001',
                name: 'Gia Đình Tiêu Chuẩn',
                price: 0,
                modelPath: './assets/cabin/GV-001.glb'
            },

            {
                id: 'GV-002',
                name: 'Hiện Đại Thương Mại',
                price: 15000000,
                modelPath: './assets/cabin/GV-002.glb'
            },

            {
                id: 'GV-003',
                name: 'Sang Trọng Khách Sạn',
                price: 30000000,
                modelPath: './assets/cabin/GV-003.glb'
            }

        ],


        /*
         * ========================================================
         * WALLS
         *
         * Thumbnail thật:
         * assets/walls/I01.png ... I08.png
         * ========================================================
         */

        WALLS: [

            {
                id: 'I01',
                name: 'Inox Sọc Sắc Cạnh (Hairline)',
                price: 0,
                texturePath: './assets/walls/I01.png'
            },

            {
                id: 'I02',
                name: 'Inox Gương Bóng (Mirror)',
                price: 2000000,
                texturePath: './assets/walls/I02.png'
            },

            {
                id: 'I03',
                name: 'Inox Xước Mờ (Brushed)',
                price: 1000000,
                texturePath: './assets/walls/I03.png'
            },

            {
                id: 'I04',
                name: 'Inox Hoa Văn Khắc A1',
                price: 3500000,
                texturePath: './assets/walls/I04.png'
            },

            {
                id: 'I05',
                name: 'Inox Hoa Văn Khắc A2',
                price: 3500000,
                texturePath: './assets/walls/I05.png'
            },

            {
                id: 'I06',
                name: 'Inox Vàng Gương',
                price: 5000000,
                texturePath: './assets/walls/I06.png'
            },

            {
                id: 'I07',
                name: 'Inox Vàng Xước',
                price: 4500000,
                texturePath: './assets/walls/I07.png'
            },

            {
                id: 'I08',
                name: 'Inox Đồng Cổ',
                price: 6000000,
                texturePath: './assets/walls/I08.png'
            }

        ],


        /*
         * ========================================================
         * MATERIALS
         * ========================================================
         */

        MATERIALS: [

            {
                id: 'S01',
                name: 'Thép Không Gỉ 304',
                price: 0
            },

            {
                id: 'S02',
                name: 'Thép Phủ Titan Vàng',
                price: 4000000
            },

            {
                id: 'S03',
                name: 'Thép Phủ Titan Đen',
                price: 4500000
            },

            {
                id: 'S04',
                name: 'Thép Phủ Đồng Hồng',
                price: 5000000
            },

            {
                id: 'S05',
                name: 'Nhôm Hợp Kim Cao Cấp',
                price: 3000000
            },

            {
                id: 'S06',
                name: 'Thép Sơn Tĩnh Điện Custom',
                price: 2000000
            }

        ],


        /*
         * ========================================================
         * FLOORS
         *
         * ID giao diện vẫn là T01-T06.
         * Asset thật là S01-S06.png trong assets/floor.
         * ========================================================
         */

        FLOORS: [

            {
                id: 'T01',
                name: 'Đá Đá Hoa Cương Granite T01',
                price: 0,
                texturePath: './assets/floor/S01.png'
            },

            {
                id: 'T02',
                name: 'Đá Cẩm Thạch Marble T02',
                price: 3000000,
                texturePath: './assets/floor/S02.png'
            },

            {
                id: 'T03',
                name: 'Thảm Đá Hoa Văn T03',
                price: 5000000,
                texturePath: './assets/floor/S03.png'
            },

            {
                id: 'T04',
                name: 'Đá Nhân Tạo Cao Cấp T04',
                price: 4000000,
                texturePath: './assets/floor/S04.png'
            },

            {
                id: 'T05',
                name: 'Sàn Sợi Thủy T05',
                price: 2500000,
                texturePath: './assets/floor/S05.png'
            },

            {
                id: 'T06',
                name: 'Sàn Kim Loại Nhám T06',
                price: 2000000,
                texturePath: './assets/floor/S06.png'
            }

        ],


        /*
         * ========================================================
         * CEILINGS
         *
         * ID giao diện C01-C06.
         * Asset thật là T01-T06.png trong assets/ceiling.
         * ========================================================
         */

        CEILINGS: [

            {
                id: 'C01',
                name: 'Trần Đèn Led Chiếu Sáng C01',
                price: 0,
                texturePath: './assets/ceiling/T01.png'
            },

            {
                id: 'C02',
                name: 'Trần Hoa Văn CNC Mica C02',
                price: 3000000,
                texturePath: './assets/ceiling/T02.png'
            },

            {
                id: 'C03',
                name: 'Trần Vòm Hắt Sáng C03',
                price: 4500000,
                texturePath: './assets/ceiling/T03.png'
            },

            {
                id: 'C04',
                name: 'Trần Đèn Vuông Âm Trần C04',
                price: 2500000,
                texturePath: './assets/ceiling/T04.png'
            },

            {
                id: 'C05',
                name: 'Trần Đèn Dải LED Hiện Đại C05',
                price: 3500000,
                texturePath: './assets/ceiling/T05.png'
            },

            {
                id: 'C06',
                name: 'Trần Khắc Kim Loại Cao Cấp C06',
                price: 6000000,
                texturePath: './assets/ceiling/T06.png'
            }

        ],


        /*
         * ========================================================
         * HANDRAILS
         *
         * Repository hiện có PNG H01-H04, không có GLB.
         * cabin.js sẽ dùng fallback 3D khi không có modelPath.
         * ========================================================
         */

        HANDRAILS: [

            {
                id: 'NONE',
                name: 'Không Sử Dụng',
                price: 0
            },

            {
                id: 'H01',
                name: 'Tay Vịn Tròn Inox H01',
                price: 1200000,
                texturePath: './assets/handrail/H01.png'
            },

            {
                id: 'H02',
                name: 'Tay Vịn Dẹt Bản Rộng H02',
                price: 1800000,
                texturePath: './assets/handrail/H02.png'
            },

            {
                id: 'H03',
                name: 'Tay Vịn Đôi Tròn H03',
                price: 2500000,
                texturePath: './assets/handrail/H03.png'
            }

        ],


        /*
         * ========================================================
         * COPS
         *
         * Repository có PNG P01-P04, không có GLB.
         * cabin.js sẽ dùng fallback 3D khi không có modelPath.
         * ========================================================
         */

        COPS: [

            {
                id: 'NONE',
                name: 'Chưa Chọn Bảng Điều Khiển',
                price: 0
            },

            {
                id: 'P01',
                name: 'Bảng Bút Bấm Nổi P01',
                price: 3000000,
                texturePath: './assets/cop/P01.png'
            },

            {
                id: 'P02',
                name: 'Bảng Cảm Ứng Hiện Đại P02',
                price: 7000000,
                texturePath: './assets/cop/P02.png'
            },

            {
                id: 'P03',
                name: 'Bảng Cột Dọc Đầy Đủ P03',
                price: 5500000,
                texturePath: './assets/cop/P03.png'
            },

            {
                id: 'P04',
                name: 'Bảng Điều Khiển Đôi P04',
                price: 9000000,
                texturePath: './assets/cop/P04.png'
            }

        ],


        /*
         * ========================================================
         * LIGHTINGS
         * ========================================================
         */

        LIGHTINGS: [

            {
                id: 'L01',
                name: 'Ánh Sáng Trắng Warm Showroom (4000K)',
                price: 0,
                texturePath: './assets/lighting/L01.png'
            },

            {
                id: 'L02',
                name: 'Ánh Sáng Trắng Lạnh Cool White (6000K)',
                price: 0,
                texturePath: './assets/lighting/L02.png'
            },

            {
                id: 'L03',
                name: 'Ánh Sáng Vàng Vàng Ấm (3000K)',
                price: 0,
                texturePath: './assets/lighting/L03.png'
            },

            {
                id: 'L04',
                name: 'Ánh Sáng Sang Trọng Studio Ambient',
                price: 1000000,
                texturePath: './assets/lighting/L04.png'
            }

        ],


        /*
         * ========================================================
         * COLORS
         * ========================================================
         */

        COLORS: [

            {
                id: 'DEFAULT',
                name: 'Mặc Định Vật Liệu',
                hex: null
            },

            {
                id: 'WHITE',
                name: 'Sáng Bạch Kim',
                hex: '#f0f0f0'
            },

            {
                id: 'BLACK',
                name: 'Đen Titan Satin',
                hex: '#222225'
            },

            {
                id: 'GOLD',
                name: 'Vàng Hoàng Gia 24K',
                hex: '#e6c619'
            },

            {
                id: 'CHAMPAGNE',
                name: 'Vàng Sâm Panh Light',
                hex: '#d8c596'
            },

            {
                id: 'CUSTOM',
                name: 'Tự Chọn Màu Custom',
                hex: '#ffffff'
            }

        ],


        /*
         * ========================================================
         * ETCHEDS
         *
         * Repository hiện chưa có assets/textures/etched.
         * Bỏ bumpPath để tránh request asset không tồn tại.
         * ========================================================
         */

        ETCHEDS: [

            {
                id: 'NONE',
                name: 'Trơn Không Khắc',
                price: 0
            },

            {
                id: 'E01',
                name: 'Khắc Axit Sọc Dọc E01',
                price: 1500000
            },

            {
                id: 'E02',
                name: 'Khắc Hoa Văn Cổ Điển E02',
                price: 2000000
            },

            {
                id: 'E03',
                name: 'Khắc Ô Vuông Hiện Đại E03',
                price: 1800000
            },

            {
                id: 'E04',
                name: 'Khắc Hình Thoi E04',
                price: 1800000
            },

            {
                id: 'E05',
                name: 'Khắc Vảy Cá E05',
                price: 2500000
            },

            {
                id: 'E06',
                name: 'Khắc Sóng Biển E06',
                price: 2500000
            }

        ]

    }

};
