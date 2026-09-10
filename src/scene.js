import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneManager {
  constructor(container) {
    this.container = container;

    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 2. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf4f6f8);

    // 3. Camera Frontal Showroom View
    this.camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 100);
    this.setPresetView('front');

    // 4. Orbit Controls (Giới hạn kiểm soát)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = false; // Tắt zoom tự do ở demo
    this.controls.enablePan = false;  // Tắt pan
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05; // Không chui xuống sàn

    window.addEventListener('resize', () => this.onWindowResize());
  }

  setPresetView(preset) {
    const target = new THREE.Vector3(0, 1.2, 0);
    let camPos = new THREE.Vector3();

    switch (preset) {
      case 'front':
        camPos.set(0, 1.2, -4.2);
        break;
      case 'left':
        camPos.set(-3.2, 1.2, -2.2);
        break;
      case 'right':
        camPos.set(3.2, 1.2, -2.2);
        break;
      case 'ceiling':
        camPos.set(0, 0.2, -1.8);
        target.set(0, 2.2, 0);
        break;
      case 'floor':
        camPos.set(0, 2.2, -1.8);
        target.set(0, 0.1, 0);
        break;
    }

    this.camera.position.copy(camPos);
    this.camera.lookAt(target);
    if (this.controls) this.controls.target.copy(target);
  }

  rotateCamera(angle) {
    const x = this.camera.position.x;
    const z = this.camera.position.z;
    this.camera.position.x = x * Math.cos(angle) - z * Math.sin(angle);
    this.camera.position.z = x * Math.sin(angle) + z * Math.cos(angle);
    this.camera.lookAt(0, 1.2, 0);
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
