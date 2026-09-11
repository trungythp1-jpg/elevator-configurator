window.UIManager = (function () {
    function UIManager(app) {
        this.app = app;
        this.container = document.getElementById('config-panels');
        this.totalPriceElem = document.getElementById('total-price');
        this.doorBtn = document.getElementById('btn-toggle-door');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.quoteModal = document.getElementById('quote-modal');
        this.quoteBreakdown = document.getElementById('quote-breakdown');
        
        this.bindGlobalEvents();
    }

    UIManager.prototype.bindGlobalEvents = function () {
        // Camera Toolbar
        const cameraButtons = document.querySelectorAll('.btn-camera[data-view]');
        cameraButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                cameraButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const view = e.target.getAttribute('data-view');
                this.app.sceneManager.setCameraView(view);
            });
        });

        // Door Toggle Button
        if (this.doorBtn) {
            this.doorBtn.addEventListener('click', () => {
                const current = this.app.state.doorState;
                const next = current === 'OPEN' ? 'CLOSED' : 'OPEN';
                this.app.updateDoorState(next);
            });
        }

        // Action Buttons
        document.getElementById('btn-reset')?.addEventListener('click', () => this.app.resetConfig());
        document.getElementById('btn-save')?.addEventListener('click', () => this.app.saveConfig());
        document.getElementById('btn-share')?.addEventListener('click', () => this.app.shareConfig());
        document.getElementById('btn-quote')?.addEventListener('click', () => this.showQuoteModal());
        document.getElementById('modal-close')?.addEventListener('click', () => this.quoteModal.classList.add('hidden'));
    };

    UIManager.prototype.renderAll = function () {
        if (!this.container) return;
        this.container.innerHTML = '';

        const catalogs = window.CONFIG.CATALOGS;
        const state = this.app.state;

        // Cabin Models
        this.renderSection('Mẫu Cabin', catalogs.CABIN_MODELS, state.cabinModel, (id) => this.app.updateState({ cabinModel: id }));

        // Wall Mode
        this.renderWallModeSection();

        // Walls
        if (state.wallMode === 'SAME') {
            this.renderSection('Vách Cabin (Tất cả)', catalogs.WALLS, state.wallLeft, (id) => {
                this.app.updateState({ wallLeft: id, wallBack: id, wallRight: id });
            });
        } else {
            this.renderSection('Vách Trái', catalogs.WALLS, state.wallLeft, (id) => this.app.updateState({ wallLeft: id }));
            this.renderSection('Vách Sau', catalogs.WALLS, state.wallBack, (id) => this.app.updateState({ wallBack: id }));
            this.renderSection('Vách Phải', catalogs.WALLS, state.wallRight, (id) => this.app.updateState({ wallRight: id }));
        }

        // Material
        this.renderSection('Chất Liệu Inox', catalogs.MATERIALS, state.material, (id) => this.app.updateState({ material: id }));

        // Color & Custom Hex
        this.renderColorSection();

        // Etched Pattern
        this.renderSection('Hoa Văn Etched', catalogs.ETCHEDS, state.etched, (id) => this.app.updateState({ etched: id }));

        // Floor
        this.renderSection('Sàn Cabin', catalogs.FLOORS, state.floor, (id) => this.app.updateState({ floor: id }));

        // Ceiling
        this.renderSection('Trần Cabin', catalogs.CEILINGS, state.ceiling, (id) => this.app.updateState({ ceiling: id }));

        // Handrail
        this.renderSection('Tay Vịn', catalogs.HANDRAILS, state.handrail, (id) => this.app.updateState({ handrail: id }));

        // COP
        this.renderSection('Bảng Điều Khiển (COP)', catalogs.COPS, state.cop, (id) => this.app.updateState({ cop: id }));

        // Lighting
        this.renderSection('Hệ Thống Chiếu Sáng', catalogs.LIGHTINGS, state.lighting, (id) => this.app.updateState({ lighting: id }));

        this.updatePriceDisplay();
        this.syncDoorButton();
    };

    UIManager.prototype.renderSection = function (title, items, currentId, onSelect) {
        const sec = document.createElement('div');
        sec.className = 'config-section';

        const h3 = document.createElement('h3');
        h3.innerText = title;
        sec.appendChild(h3);

        const grid = document.createElement('div');
        grid.className = 'options-grid';

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = `option-card ${item.id === currentId ? 'selected' : ''}`;
            
            if (item.texturePath) {
                const img = document.createElement('img');
                img.className = 'option-thumb';
                img.src = item.texturePath;
                img.alt = item.name;
                card.appendChild(img);
            }

            const name = document.createElement('div');
            name.className = 'option-title';
            name.innerText = item.name;
            card.appendChild(name);

            if (item.price > 0) {
                const price = document.createElement('div');
                price.className = 'option-price';
                price.innerText = `+${item.price.toLocaleString('vi-VN')} VNĐ`;
                card.appendChild(price);
            }

            card.addEventListener('click', () => onSelect(item.id));
            grid.appendChild(card);
        });

        sec.appendChild(grid);
        this.container.appendChild(sec);
    };

    UIManager.prototype.renderWallModeSection = function () {
        const sec = document.createElement('div');
        sec.className = 'config-section';
        const h3 = document.createElement('h3');
        h3.innerText = 'Chế Độ Chọn Vách';
        sec.appendChild(h3);

        const grid = document.createElement('div');
        grid.className = 'options-grid';

        const modes = [
            { id: 'SAME', name: 'Đồng nhất 3 vách' },
            { id: 'INDEPENDENT', name: 'Tùy chỉnh riêng' }
        ];

        modes.forEach(m => {
            const card = document.createElement('div');
            card.className = `option-card ${this.app.state.wallMode === m.id ? 'selected' : ''}`;
            const name = document.createElement('div');
            name.className = 'option-title';
            name.innerText = m.name;
            card.appendChild(name);

            card.addEventListener('click', () => {
                this.app.updateState({ wallMode: m.id });
            });
            grid.appendChild(card);
        });

        sec.appendChild(grid);
        this.container.appendChild(sec);
    };

    UIManager.prototype.renderColorSection = function () {
        const catalogs = window.CONFIG.CATALOGS;
        this.renderSection('Tông Màu', catalogs.COLORS, this.app.state.colorTone, (id) => this.app.updateState({ colorTone: id }));

        if (this.app.state.colorTone === 'CUSTOM') {
            const sec = document.createElement('div');
            sec.className = 'config-section color-input-container';

            const label = document.createElement('label');
            label.innerText = 'Màu tùy chỉnh: ';
            
            const picker = document.createElement('input');
            picker.type = 'color';
            picker.value = this.app.state.customColor || '#ffffff';
            picker.addEventListener('input', (e) => {
                this.app.updateState({ customColor: e.target.value });
            });

            sec.appendChild(label);
            sec.appendChild(picker);
            this.container.appendChild(sec);
        }
    };

    UIManager.prototype.syncDoorButton = function () {
        if (!this.doorBtn) return;
        this.doorBtn.innerText = this.app.state.doorState === 'OPEN' ? 'Đóng cửa' : 'Mở cửa';
    };

    UIManager.prototype.updatePriceDisplay = function () {
        if (this.totalPriceElem) {
            const total = this.app.calculateTotalPrice();
            this.totalPriceElem.innerText = `${total.toLocaleString('vi-VN')} VNĐ`;
        }
    };

    UIManager.prototype.setLoading = function (loading) {
        if (this.loadingOverlay) {
            if (loading) this.loadingOverlay.classList.remove('hidden');
            else this.loadingOverlay.classList.add('hidden');
        }
    };

    UIManager.prototype.showToast = function (msg) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.innerText = msg;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    };

    UIManager.prototype.showQuoteModal = function () {
        if (!this.quoteModal || !this.quoteBreakdown) return;

        const breakdown = this.app.getQuoteBreakdown();
        let html = '<ul style="list-style:none; padding:0; margin-bottom:16px;">';
        breakdown.items.forEach(item => {
            html += `<li style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #333;">
                <span>${item.label}</span>
                <span>${item.price > 0 ? '+' + item.price.toLocaleString('vi-VN') + ' VNĐ' : 'Mặc định'}</span>
            </li>`;
        });
        html += '</ul>';
        html += `<div style="display:flex; justify-content:space-between; font-weight:bold; font-size:16px; margin-top:12px;">
            <span>TỔNG CỘNG:</span>
            <span style="color:#0088ff">${breakdown.total.toLocaleString('vi-VN')} VNĐ</span>
        </div>`;

        this.quoteBreakdown.innerHTML = html;
        this.quoteModal.classList.remove('hidden');
    };

    return UIManager;
})();
