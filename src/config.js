window.CONFIG = {
    DIMENSIONS: {
        width: 1.4,   // 1400 mm
        depth: 1.2,   // 1200 mm
        height: 2.4   // 2400 mm
    },
    DEFAULT_STATE: {
        cabinModel: 'GV-001',
        wallMode: 'SAME',
        wallLeft: 'I03',
        wallBack: 'I03',
        wallRight: 'I03',
        material: 'S01',
        floor: 'T01',
        ceiling: 'C01',
        doorState: 'OPEN',
        handrail: 'NONE',
        cop: 'NONE',
        lighting: 'L01',
        colorTone: 'DEFAULT',
        customColor: '#ffffff',
        etched: 'NONE'
    },
    CATALOGS: {
        CABIN_MODELS: [
            { id: 'GV-001', name: 'GV-001 Standard', price: 0, modelPath: './assets/models/cabin_gv001.glb' },
            { id: 'GV-002', name: 'GV-002 Deluxe', price: 15000000, modelPath: './assets/models/cabin_gv002.glb' },
            { id: 'GV-003', name: 'GV-003 Panoramic', price: 30000000, modelPath: './assets/models/cabin_gv003.glb' }
        ],
        WALLS: [
            { id: 'I01', name: 'Inox Sọc Tóc (Hairline)', price: 0, texturePath: './assets/textures/inox_hairline.jpg' },
            { id: 'I02', name: 'Inox Gương (Mirror)', price: 2000000, texturePath: './assets/textures/inox_mirror.jpg' },
            { id: 'I03', name: 'Inox Hoa Văn Etched', price: 5000000, texturePath: './assets/textures/inox_etched.jpg' }
        ],
        MATERIALS: [
            { id: 'S01', name: 'Inox 304 Tiêu Chuẩn', price: 0, color: '#d0d0d0', roughness: 0.3, metalness: 0.9 },
            { id: 'S02', name: 'Inox Vàng Gương (Gold Mirror)', price: 4000000, color: '#e5b842', roughness: 0.1, metalness: 0.95 },
            { id: 'S03', name: 'Inox Đen Nhám (Black Matt)', price: 3500000, color: '#222222', roughness: 0.6, metalness: 0.8 }
        ],
        FLOORS: [
            { id: 'T01', name: 'Đá Granite Xám', price: 0, texturePath: './assets/textures/floor_granite.jpg', color: '#555555' },
            { id: 'T02', name: 'Đá Hoa Văn Cổ Điển', price: 3000000, texturePath: './assets/textures/floor_pattern.jpg', color: '#8c6d53' }
        ],
        CEILINGS: [
            { id: 'C01', name: 'Trần Đèn Led Hiện Đại', price: 0, modelPath: './assets/models/ceiling_c01.glb' },
            { id: 'C02', name: 'Trần CNC Sang Trọng', price: 2500000, modelPath: './assets/models/ceiling_c02.glb' }
        ],
        HANDRAILS: [
            { id: 'NONE', name: 'Không tay vịn', price: 0 },
            { id: 'H01', name: 'Tay vịn tròn đơn', price: 1200000, modelPath: './assets/models/handrail_h01.glb' },
            { id: 'H02', name: 'Tay vịn dẹp đôi', price: 2200000, modelPath: './assets/models/handrail_h02.glb' },
            { id: 'H03', name: 'Tay vịn cao cấp', price: 3500000, modelPath: './assets/models/handrail_h03.glb' }
        ],
        COPS: [
            { id: 'NONE', name: 'Không COP', price: 0 },
            { id: 'P01', name: 'Bảng điều khiển P01', price: 3000000, modelPath: './assets/models/cop_p01.glb' },
            { id: 'P02', name: 'Bảng điều khiển P02', price: 5000000, modelPath: './assets/models/cop_p02.glb' },
            { id: 'P03', name: 'Bảng điều khiển P03 Touch', price: 8000000, modelPath: './assets/models/cop_p03.glb' },
            { id: 'P04', name: 'Bảng điều khiển P04 Premium', price: 12000000, modelPath: './assets/models/cop_p04.glb' }
        ],
        LIGHTINGS: [
            { id: 'L01', name: 'Ánh sáng Trắng (6000K)', price: 0, color: '#ffffff', intensity: 1.0 },
            { id: 'L02', name: 'Ánh sáng Vàng (3000K)', price: 0, color: '#ffcc77', intensity: 1.1 },
            { id: 'L03', name: 'Ánh sáng Trung tính (4000K)', price: 0, color: '#fffaed', intensity: 1.0 },
            { id: 'L04', name: 'Ánh sáng Showroom Premium', price: 1500000, color: '#ffffff', intensity: 1.3 }
        ],
        COLORS: [
            { id: 'DEFAULT', name: 'Gốc (Mặc định)', hex: null },
            { id: 'CUSTOM', name: 'Tùy chỉnh Hex', hex: '#ffffff' }
        ],
        ETCHEDS: [
            { id: 'NONE', name: 'Không hoa văn', price: 0 },
            { id: 'E01', name: 'Hoa văn Hoạ Tiết A', price: 1500000, texturePath: './assets/textures/etched_a.png' },
            { id: 'E02', name: 'Hoa văn Hình Học B', price: 1500000, texturePath: './assets/textures/etched_b.png' }
        ]
    }
};
