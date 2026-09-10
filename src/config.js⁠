// Cấu hình Kích thước chuẩn Cabins (mm)
export class CABIN_SIZE {
  static WIDTH = 1.4;   // 1400 mm
  static DEPTH = 1.2;   // 1200 mm
  static HEIGHT = 2.4;  // 2400 mm
  static WALL_THICKNESS = 0.02;
}

// Đường dẫn Assets chuẩn
export const ASSETS_PATH = './assets/';

// Central State Manager
export const state = {
  cabin: 'GV-001',
  wallMode: 'sync', // 'sync' | 'independent'
  walls: {
    left: 'I03',
    back: 'I03',
    right: 'I03'
  },
  floor: 'S01',
  ceiling: 'T01',
  door: 'C01',
  doorState: 'open', // 'open' | 'closed'
  handrail: 'NONE',  // 'NONE' | 'H01' | 'H02' | 'H03' | 'H04'
  cop: 'NONE',       // 'NONE' | 'P01' | 'P02' | 'P03' | 'P04'
  lighting: 'L01',
  color: 'silver'
};

// Catalog Mẫu sản phẩm
export const CATALOG = {
  cabins: [
    { code: 'GV-001', name: 'Champagne Classic', desc: 'Thiết kế sang trọng cổ điển' },
    { code: 'GV-002', name: 'Black Luxury', desc: 'Phong cách hiện đại quyền lực' },
    { code: 'GV-003', name: 'Silver Minimal', desc: 'Tối giản tinh tế sắc sảo' }
  ],
  walls: [
    { code: 'I01', name: 'Inox Bạc', color: '#d0d4d9', metalness: 0.9, roughness: 0.25 },
    { code: 'I02', name: 'Inox Champagne', color: '#d4af37', metalness: 0.85, roughness: 0.2 },
    { code: 'I03', name: 'Inox Hairline Sáng', color: '#e2e8f0', metalness: 0.95, roughness: 0.18 }, // Mặc định
    { code: 'I04', name: 'Inox Titanium Tối', color: '#334155', metalness: 0.9, roughness: 0.3 },
    { code: 'I05', name: 'Inox Rose Gold', color: '#b76e79', metalness: 0.88, roughness: 0.22 },
    { code: 'I06', name: 'Inox Gương Đen', color: '#0f172a', metalness: 0.98, roughness: 0.05 },
    { code: 'I07', name: 'Inox Ăn Mòn Hoa Văn 1', color: '#cbd5e1', etched: true, pattern: 'geometric' },
    { code: 'I08', name: 'Inox Ăn Mòn Hoa Văn 2', color: '#e2e8f0', etched: true, pattern: 'floral' }
  ],
  floors: [
    { code: 'S01', name: 'Đá Đen Vân Mây', color: '#1e293b' },
    { code: 'S02', name: 'Đá Xám Granite', color: '#475569' },
    { code: 'S03', name: 'Đá Marble Trắng', color: '#f8fafc' },
    { code: 'S04', name: 'Inox Xước Kim Loại', color: '#94a3b8', metallic: true },
    { code: 'S05', name: 'Đá Warm Granite', color: '#78350f' },
    { code: 'S06', name: 'Gỗ Ấm Cao Cấp', color: '#451a03' }
  ],
  ceilings: [
    { code: 'T01', name: 'Trần Âm CNC Hình Học', color: '#fafafa' },
    { code: 'T02', name: 'Trần Khung Đèn Linear', color: '#f4f4f5' },
    { code: 'T03', name: 'Trần Viền Gold Frame', color: '#fffbeb' },
    { code: 'T04', name: 'Trần Hiện Đại Black Frame', color: '#f8fafc' }
  ],
  doors: [
    { code: 'C01', name: 'Cửa Inox Champagne', color: '#d4af37' },
    { code: 'C02', name: 'Cửa Inox Bạc', color: '#e2e8f0' },
    { code: 'C03', name: 'Cửa Titanium Đen', color: '#1e293b' },
    { code: 'C04', name: 'Cửa Rose Gold', color: '#b76e79' },
    { code: 'C05', name: 'Cửa Đồng Bronze', color: '#78350f' },
    { code: 'C06', name: 'Cửa Inox Gương', color: '#f1f5f9', mirror: true }
  ],
  handrails: [
    { code: 'NONE', name: 'Không sử dụng' },
    { code: 'H01', name: 'Tay vịn Tròn Bạc' },
    { code: 'H02', name: 'Tay vịn Tròn Vàng' },
    { code: 'H03', name: 'Tay vịn Vuông Đen' },
    { code: 'H04', name: 'Tay vịn Gỗ Cổ Điển' }
  ],
  cops: [
    { code: 'NONE', name: 'Không sử dụng' },
    { code: 'P01', name: 'Bảng Điều Khiển Inox Slim' },
    { code: 'P02', name: 'Bảng Kính Đen Cảm Ứng' },
    { code: 'P03', name: 'Bảng Viền Vàng Hoàng Gia' },
    { code: 'P04', name: 'Bảng Full-Height Cao Cấp' }
  ]
};
