import * as THREE from 'three';

export function setupLighting(scene) {
  // 1. Ánh sáng môi trường mềm
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xdfe4ea, 1.2);
  hemiLight.position.set(0, 5, 0);
  scene.add(hemiLight);

  // 2. Directional Light gián tiếp từ cửa vào
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(0, 2.2, -3); // Đặt ngoài cửa rọi vào
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.bias = -0.0001;
  scene.add(dirLight);

  // 3. Hidden Indirect Light âm trần (Soft Soft Ceiling Glow)
  const ceilingGlow = new THREE.PointLight(0xffffff, 0.8, 3.5);
  ceilingGlow.position.set(0, 2.3, 0);
  scene.add(ceilingGlow);

  // 4. Tạo Environment Map Giả lập để kim loại phản xạ lấp lánh
  const pmremGenerator = new THREE.PMREMGenerator(scene.renderer);
  pmremGenerator.compileCubemapShader();

  const roomScene = new THREE.Scene();
  roomScene.background = new THREE.Color(0xe2e8f0);
  const renderTarget = pmremGenerator.fromScene(roomScene);
  scene.environment = renderTarget.texture;
}
