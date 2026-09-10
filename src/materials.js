import * as THREE from 'three';
import { ASSETS_PATH, CATALOG } from './config.js';

const textureLoader = new THREE.TextureLoader();
const materialCache = new Map();

// Tạo Texture Procedural Fallback cho Brushed/Hairline Stainless Steel
function createProceduralBrushedTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 512);

  // Vẽ các đường xước Fine Vertical Lines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const h = 20 + Math.random() * 80;
    ctx.fillRect(x, y, 1, h);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

// Tạo Texture Procedural Cho Pattern CNC Trần
export function createCNCPatternTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1024, 1024);

  // Đường hoa văn hình học kiến trúc sang trọng
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 12;

  const center = 512;
  // Khung hình vuông đồng tâm
  for (let r = 100; r <= 420; r += 80) {
    ctx.strokeRect(center - r, center - r, r * 2, r * 2);
  }

  // Cắt chéo hoa văn họa tiết 45 độ
  ctx.beginPath();
  ctx.moveTo(center - 420, center - 420); ctx.lineTo(center + 420, center + 420);
  ctx.moveTo(center + 420, center - 420); ctx.lineTo(center - 420, center + 420);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

const brushedTexture = createProceduralBrushedTexture();

export function getWallMaterial(wallCode) {
  if (materialCache.has(`wall_${wallCode}`)) {
    return materialCache.get(`wall_${wallCode}`);
  }

  const info = CATALOG.walls.find(w => w.code === wallCode) || CATALOG.walls[2];
  
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(info.color),
    metalness: info.metalness ?? 0.9,
    roughness: info.roughness ?? 0.2,
    roughnessMap: brushedTexture,
    clearcoat: info.code === 'I06' ? 1.0 : 0.1,
    clearcoatRoughness: 0.1,
    reflectivity: 0.9
  });

  // Tải Texture thực tế nếu tồn tại
  textureLoader.load(
    `${ASSETS_PATH}walls/${wallCode}.png`,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      mat.map = tex;
      mat.needsUpdate = true;
    },
    undefined,
    () => { /* Sử dụng Procedural Fallback mặc định */ }
  );

  materialCache.set(`wall_${wallCode}`, mat);
  return mat;
}

export function getFloorMaterial(floorCode) {
  if (materialCache.has(`floor_${floorCode}`)) {
    return materialCache.get(`floor_${floorCode}`);
  }

  const info = CATALOG.floors.find(f => f.code === floorCode) || CATALOG.floors[0];

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(info.color),
    roughness: info.metallic ? 0.3 : 0.15,
    metalness: info.metallic ? 0.8 : 0.1
  });

  textureLoader.load(
    `${ASSETS_PATH}floor/${floorCode}.png`,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      mat.map = tex;
      mat.needsUpdate = true;
    },
    undefined,
    () => {}
  );

  materialCache.set(`floor_${floorCode}`, mat);
  return mat;
}

export function getDoorMaterial(doorCode) {
  const info = CATALOG.doors.find(d => d.code === doorCode) || CATALOG.doors[0];
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(info.color),
    metalness: info.mirror ? 0.98 : 0.85,
    roughness: info.mirror ? 0.05 : 0.25
  });
}
