import { state, CATALOG, ASSETS_PATH } from './config.js';

export class UIManager {
  constructor(cabinBuilder, sceneManager) {
    this.cabin = cabinBuilder;
    this.scene = sceneManager;
    this.activeCategory = 'walls';

    this.initCategoryNav();
    this.initViewControls();
    this.initHeaderActions();
    this.renderOptionsPanel();
    this.updateSummary();
  }

  initCategoryNav() {
    const nav = document.getElementById('categoryToolbar');
    const categories = [
      { id: 'cabin', name: 'Cabin', icon: '📦' },
      { id: 'walls', name: 'Vách', icon: '🖼️' },
      { id: 'floor', name: 'Sàn', icon: '📐' },
      { id: 'ceiling', name: 'Trần', icon: '💡' },
      { id: 'doors', name: 'Cửa', icon: '🚪' },
      { id: 'handrails', name: 'Tay vịn', icon: '🥖' },
      { id: 'cops', name: 'Bảng ĐK', icon: '🎛️' }
    ];

    nav.innerHTML = categories.map(cat => `
      <button class="nav-item ${cat.id === this.activeCategory ? 'active' : ''}" data-cat="${cat.id}">
        <span>${cat.icon}</span>
        <span>${cat.name}</span>
      </button>
    `).join('');

    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-item');
      if (!btn) return;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.activeCategory = btn.dataset.cat;
      this.renderOptionsPanel();
    });
  }

  renderOptionsPanel() {
    const title = document.getElementById('panelTitle');
    const content = document.getElementById('panelContent');

    if (this.activeCategory === 'walls') {
      title.textContent = 'Tùy chỉnh Vách Cabin';
      content.innerHTML = `
        <div class="mode-toggle">
          <button class="mode-btn ${state.wallMode === 'sync' ? 'active' : ''}" id="btnSync">Đồng bộ 3 vách</button>
          <button class="mode-btn ${state.wallMode === 'independent' ? 'active' : ''}" id="btnIndep">Độc lập từng vách</button>
        </div>
        <div class="cards-grid">
          ${CATALOG.walls.map(w => `
            <div class="option-card ${state.walls.back === w.code ? 'active' : ''}" data-code="${w.code}">
              <div class="option-thumb" style="background-image: url('${ASSETS_PATH}walls/${w.code}.png'), linear-gradient(135deg, #ccc, #eee)"></div>
              <div class="option-title">${w.name}</div>
              <div class="option-code">${w.code}</div>
            </div>
          `).join('')}
        </div>
      `;

      document.getElementById('btnSync').onclick = () => { state.wallMode = 'sync'; this.renderOptionsPanel(); };
      document.getElementById('btnIndep').onclick = () => { state.wallMode = 'independent'; this.renderOptionsPanel(); };

    } else if (this.activeCategory === 'floor') {
      title.textContent = 'Mẫu Sàn Cabin';
      content.innerHTML = `
        <div class="cards-grid">
          ${CATALOG.floors.map(f => `
            <div class="option-card ${state.floor === f.code ? 'active' : ''}" data-code="${f.code}">
              <div class="option-thumb" style="background-image: url('${ASSETS_PATH}floor/${f.code}.png'), linear-gradient(135deg, #333, #666)"></div>
              <div class="option-title">${f.name}</div>
              <div class="option-code">${f.code}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      title.textContent = 'Tùy chọn cấu hình';
      content.innerHTML = `<p style="font-size: 0.85rem; color: #6b7280;">Đã sẵn sàng tùy chỉnh thuộc tính sản phẩm.</p>`;
    }

    this.bindCardEvents();
  }

  bindCardEvents() {
    document.querySelectorAll('.option-card').forEach(card => {
      card.onclick = () => {
        const code = card.dataset.code;
        if (this.activeCategory === 'walls') {
          if (state.wallMode === 'sync') {
            state.walls.left = state.walls.back = state.walls.right = code;
          } else {
            state.walls.back = code;
          }
        } else if (this.activeCategory === 'floor') {
          state.floor = code;
        }
        this.cabin.updateMaterials();
        this.renderOptionsPanel();
        this.updateSummary();
      };
    });
  }

  initViewControls() {
    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.onclick = (e) => {
        document.querySelectorAll('[data-preset]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.scene.setPresetView(e.target.dataset.preset);
      };
    });

    document.getElementById('btnRotateLeft').onclick = () => this.scene.rotateCamera(Math.PI / 12);
    document.getElementById('btnRotateRight').onclick = () => this.scene.rotateCamera(-Math.PI / 12);

    const btnDoor = document.getElementById('btnToggleDoor');
    btnDoor.onclick = () => {
      state.doorState = state.doorState === 'open' ? 'closed' : 'open';
      btnDoor.textContent = state.doorState === 'open' ? 'Đóng cửa' : 'Mở cửa';
      this.cabin.animateDoor();
    };
  }

  initHeaderActions() {
    document.getElementById('btnSave').onclick = () => {
      localStorage.setItem('elevator_config', JSON.stringify(state));
      this.showToast('Đã lưu cấu hình thành công!');
    };

    document.getElementById('btnExport').onclick = () => {
      const dataURL = this.scene.renderer.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Elevator-Config-${Date.now()}.png`;
      link.href = dataURL;
      link.click();
      this.showToast('Đã xuất file ảnh Canvas thành công!');
    };
  }

  updateSummary() {
    const summary = document.getElementById('summaryContent');
    summary.innerHTML = `
      <div class="summary-item"><span>Mẫu Cabin</span><span>${state.cabin}</span></div>
      <div class="summary-item"><span>Vách Trái</span><span>${state.walls.left}</span></div>
      <div class="summary-item"><span>Vách Sau</span><span>${state.walls.back}</span></div>
      <div class="summary-item"><span>Vách Phải</span><span>${state.walls.right}</span></div>
      <div class="summary-item"><span>Sàn</span><span>${state.floor}</span></div>
      <div class="summary-item"><span>Trần</span><span>${state.ceiling}</span></div>
      <div class="summary-item"><span>Cửa</span><span>${state.door}</span></div>
    `;
  }

  showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }
}
