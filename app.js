import { SceneManager } from './src/scene.js';
import { setupLighting } from './src/lighting.js';
import { CabinBuilder } from './src/cabin.js';
import { UIManager } from './src/ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('canvasContainer');
  const spinner = document.getElementById('loadingSpinner');

  try {
    // 1. Khởi tạo Scene Manager
    const sceneManager = new SceneManager(container);

    // 2. Cài đặt Ánh sáng Studio gián tiếp
    setupLighting(sceneManager.scene);

    // 3. Dựng Cabin 3D
    const cabinBuilder = new CabinBuilder(sceneManager.scene);

    // 4. Khởi tạo UI
    new UIManager(cabinBuilder, sceneManager);

    // 5. Game Loop
    function animate() {
      requestAnimationFrame(animate);
      sceneManager.render();
    }
    animate();

    // Ẩn Loading Overlay
    if (spinner) {
      spinner.style.opacity = '0';
      setTimeout(() => spinner.style.display = 'none', 300);
    }

  } catch (err) {
    console.error('Lỗi khởi tạo Elevator Configurator:', err);
  }
});
