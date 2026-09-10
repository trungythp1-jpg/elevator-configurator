import * as THREE from 'three';
import { CABIN_SIZE, state } from './config.js';
import { getWallMaterial, getFloorMaterial, getDoorMaterial, createCNCPatternTexture } from './materials.js';

export class CabinBuilder {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.meshes = {};
    this.buildBaseCabin();
  }

  buildBaseCabin() {
    const W = CABIN_SIZE.WIDTH;
    const D = CABIN_SIZE.DEPTH;
    const H = CABIN_SIZE.HEIGHT;
    const T = CABIN_SIZE.WALL_THICKNESS;

    // --- 1. SÀN CABIN ---
    const floorGeo = new THREE.BoxGeometry(W, T, D);
    const floorMat = getFloorMaterial(state.floor);
    this.meshes.floor = new THREE.Mesh(floorGeo, floorMat);
    this.meshes.floor.position.set(0, -T / 2, 0);
    this.meshes.floor.receiveShadow = true;
    this.group.add(this.meshes.floor);

    // --- 2. VÁCH CABIN (Trái, Sau, Phải) ---
    const wallLeftGeo = new THREE.BoxGeometry(T, H, D);
    const wallBackGeo = new THREE.BoxGeometry(W, H, T);
    const wallRightGeo = new THREE.BoxGeometry(T, H, D);

    this.meshes.wallLeft = new THREE.Mesh(wallLeftGeo, getWallMaterial(state.walls.left));
    this.meshes.wallLeft.position.set(-W / 2 + T / 2, H / 2, 0);

    this.meshes.wallBack = new THREE.Mesh(wallBackGeo, getWallMaterial(state.walls.back));
    this.meshes.wallBack.position.set(0, H / 2, D / 2 - T / 2);

    this.meshes.wallRight = new THREE.Mesh(wallRightGeo, getWallMaterial(state.walls.right));
    this.meshes.wallRight.position.set(W / 2 - T / 2, H / 2, 0);

    [this.meshes.wallLeft, this.meshes.wallBack, this.meshes.wallRight].forEach(m => {
      m.castShadow = true;
      m.receiveShadow = true;
      this.group.add(m);
    });

    // --- 3. TRẦN ÂM ARCHITECTURAL RECESSED (5 LỚP) ---
    this.buildRecessedCeiling(W, D, H);

    // --- 4. CỬA CABIN (2 CÁNH) ---
    this.buildDoors(W, H, D);

    // --- 5. TAY VỊN & COP CONTAINER ---
    this.addonGroup = new THREE.Group();
    this.group.add(this.addonGroup);
    this.updateAddons();
  }

  buildRecessedCeiling(W, D, H) {
    this.ceilingGroup = new THREE.Group();
    this.ceilingGroup.position.set(0, H, 0);

    const ivoryMat = new THREE.MeshStandardMaterial({ color: 0xfdfbf7, roughness: 0.3 });
    const shadowGapMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    // Lớp 1: Khung Viền Ngoài
    const outerFrame = new THREE.Mesh(new THREE.BoxGeometry(W, 0.04, D), ivoryMat);
    outerFrame.position.y = 0.02;
    this.ceilingGroup.add(outerFrame);

    // Lớp 2: Shadow Gap (Khe âm)
    const gap = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, 0.01, D - 0.1), shadowGapMat);
    gap.position.y = -0.005;
    this.ceilingGroup.add(gap);

    // Lớp 3: Panel Âm Trung Tâm
    const innerPanel = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, 0.03, D - 0.2), ivoryMat);
    innerPanel.position.y = -0.015;
    this.ceilingGroup.add(innerPanel);

    // Lớp 4: Panel CNC Trung Tâm Trang Trí
    const cncGeo = new THREE.PlaneGeometry(W - 0.4, D - 0.4);
    const cncTex = createCNCPatternTexture();
    const cncMat = new THREE.MeshStandardMaterial({
      map: cncTex,
      roughness: 0.4,
      transparent: true,
      opacity: 0.9
    });
    const cncMesh = new THREE.Mesh(cncGeo, cncMat);
    cncMesh.rotation.x = Math.PI / 2;
    cncMesh.position.y = -0.031;
    this.ceilingGroup.add(cncMesh);

    this.group.add(this.ceilingGroup);
  }

  buildDoors(W, H, D) {
    this.doorGroup = new THREE.Group();
    const doorW = W / 2;
    const doorGeo = new THREE.BoxGeometry(doorW, H, 0.03);
    const doorMat = getDoorMaterial(state.door);

    this.doorLeft = new THREE.Mesh(doorGeo, doorMat);
    this.doorRight = new THREE.Mesh(doorGeo, doorMat);

    this.doorLeft.position.set(-doorW / 2, H / 2, -D / 2);
    this.doorRight.position.set(doorW / 2, H / 2, -D / 2);

    this.doorGroup.add(this.doorLeft, this.doorRight);
    this.group.add(this.doorGroup);

    this.animateDoor(false);
  }

  animateDoor(immediate = false) {
    const W = CABIN_SIZE.WIDTH;
    const doorW = W / 2;
    const isOpen = state.doorState === 'open';

    const targetLeftX = isOpen ? -doorW * 0.95 : -doorW / 2;
    const targetRightX = isOpen ? doorW * 0.95 : doorW / 2;

    if (immediate) {
      this.doorLeft.position.x = targetLeftX;
      this.doorRight.position.x = targetRightX;
    } else {
      const startTime = performance.now();
      const startLeft = this.doorLeft.position.x;
      const startRight = this.doorRight.position.x;

      const step = (time) => {
        const progress = Math.min((time - startTime) / 400, 1);
        this.doorLeft.position.x = THREE.MathUtils.lerp(startLeft, targetLeftX, progress);
        this.doorRight.position.x = THREE.MathUtils.lerp(startRight, targetRightX, progress);
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }

  updateMaterials() {
    this.meshes.wallLeft.material = getWallMaterial(state.walls.left);
    this.meshes.wallBack.material = getWallMaterial(state.walls.back);
    this.meshes.wallRight.material = getWallMaterial(state.walls.right);
    this.meshes.floor.material = getFloorMaterial(state.floor);

    const dMat = getDoorMaterial(state.door);
    this.doorLeft.material = dMat;
    this.doorRight.material = dMat;
  }

  updateAddons() {
    // Xóa sạch addons cũ
    while (this.addonGroup.children.length > 0) {
      this.addonGroup.remove(this.addonGroup.children[0]);
    }

    // Tải Tay Vịn nếu chọn khác NONE
    if (state.handrail !== 'NONE') {
      const railGeo = new THREE.CylinderGeometry(0.02, 0.02, CABIN_SIZE.WIDTH - 0.2);
      const railMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(0, 1.0, CABIN_SIZE.DEPTH / 2 - 0.08);
      this.addonGroup.add(rail);
    }

    // Tải COP nếu chọn khác NONE
    if (state.cop !== 'NONE') {
      const copGeo = new THREE.BoxGeometry(0.2, 1.0, 0.02);
      const copMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });
      const cop = new THREE.Mesh(copGeo, copMat);
      cop.position.set(CABIN_SIZE.WIDTH / 2 - 0.02, 1.2, 0);
      cop.rotation.y = -Math.PI / 2;
      this.addonGroup.add(cop);
    }
  }
}
