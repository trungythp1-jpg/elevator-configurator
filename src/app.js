window.ElevatorConfiguratorApp = (function () {
    function ElevatorConfiguratorApp() {
        this.state = JSON.parse(JSON.stringify(window.CONFIG.DEFAULT_STATE));
        this.generationToken = { cancelled: false };

        this.sceneManager = null;
        this.lightingManager = null;
        this.cabinBuilder = null;
        this.uiManager = null;

        this.doorAnimFrame = null;
    }

    ElevatorConfiguratorApp.prototype.init = function () {
        this.sceneManager = new window.SceneManager('webgl-canvas');
        this.lightingManager = new window.LightingManager(this.sceneManager.scene);
        this.cabinBuilder = new window.CabinBuilder(this.sceneManager.scene);
        this.uiManager = new window.UIManager(this);

        this.restoreStateFromURLOrStorage();
        this.uiManager.renderAll();
        
        this.rebuildCabin();
        this.startRenderLoop();
    };

    ElevatorConfiguratorApp.prototype.startRenderLoop = function () {
        const animate = () => {
            requestAnimationFrame(animate);
            this.sceneManager.render();
        };
        animate();
    };

    ElevatorConfiguratorApp.prototype.validateState = function (rawState) {
        if (!rawState || typeof rawState !== 'object') return;

        const catalogs = window.CONFIG.CATALOGS;

        if (catalogs.CABIN_MODELS.some(c => c.id === rawState.cabinModel)) this.state.cabinModel = rawState.cabinModel;
        if (['SAME', 'INDEPENDENT'].includes(rawState.wallMode)) this.state.wallMode = rawState.wallMode;
        if (catalogs.WALLS.some(c => c.id === rawState.wallLeft)) this.state.wallLeft = rawState.wallLeft;
        if (catalogs.WALLS.some(c => c.id === rawState.wallBack)) this.state.wallBack = rawState.wallBack;
        if (catalogs.WALLS.some(c => c.id === rawState.wallRight)) this.state.wallRight = rawState.wallRight;
        if (catalogs.MATERIALS.some(c => c.id === rawState.material)) this.state.material = rawState.material;
        if (catalogs.FLOORS.some(c => c.id === rawState.floor)) this.state.floor = rawState.floor;
        if (catalogs.CEILINGS.some(c => c.id === rawState.ceiling)) this.state.ceiling = rawState.ceiling;
        if (['OPEN', 'CLOSED'].includes(rawState.doorState)) this.state.doorState = rawState.doorState;
        if (catalogs.HANDRAILS.some(c => c.id === rawState.handrail)) this.state.handrail = rawState.handrail;
        if (catalogs.COPS.some(c => c.id === rawState.cop)) this.state.cop = rawState.cop;
        if (catalogs.LIGHTINGS.some(c => c.id === rawState.lighting)) this.state.lighting = rawState.lighting;
        if (catalogs.COLORS.some(c => c.id === rawState.colorTone)) this.state.colorTone = rawState.colorTone;
        if (rawState.customColor && typeof rawState.customColor === 'string') this.state.customColor = rawState.customColor;
        if (catalogs.ETCHEDS.some(c => c.id === rawState.etched)) this.state.etched = rawState.etched;

        this.normalizeWallMode();
    };

    ElevatorConfiguratorApp.prototype.normalizeWallMode = function () {
        if (this.state.wallMode === 'SAME') {
            this.state.wallBack = this.state.wallLeft;
            this.state.wallRight = this.state.wallLeft;
        }
    };

    ElevatorConfiguratorApp.prototype.updateState = function (partialState) {
        const lightingOnly = Object.keys(partialState).length === 1 && partialState.lighting !== undefined;
        
        Object.assign(this.state, partialState);
        this.normalizeWallMode();

        this.uiManager.renderAll();

        if (lightingOnly) {
            const lightingConfig = window.CONFIG.CATALOGS.LIGHTINGS.find(l => l.id === this.state.lighting);
            this.lightingManager.applyPreset(lightingConfig);
        } else {
            this.rebuildCabin();
        }
    };

    ElevatorConfiguratorApp.prototype.updateDoorState = function (newDoorState) {
        this.state.doorState = newDoorState;
        this.uiManager.syncDoorButton();

        const targetProgress = newDoorState === 'OPEN' ? 1.0 : 0.0;
        const startProgress = this.cabinBuilder.doorProgress;
        const startTime = performance.now();
        const duration = 800; // ms

        if (this.doorAnimFrame) cancelAnimationFrame(this.doorAnimFrame);

        const animateDoor = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(1.0, elapsed / duration);
            const current = startProgress + (targetProgress - startProgress) * t;

            this.cabinBuilder.updateDoorProgress(current);

            if (t < 1.0) {
                this.doorAnimFrame = requestAnimationFrame(animateDoor);
            }
        };

        this.doorAnimFrame = requestAnimationFrame(animateDoor);
    };

    ElevatorConfiguratorApp.prototype.rebuildCabin = async function () {
        this.generationToken.cancelled = true;
        this.generationToken = { cancelled: false };
        const currentToken = this.generationToken;

        this.uiManager.setLoading(true);

        const lightingConfig = window.CONFIG.CATALOGS.LIGHTINGS.find(l => l.id === this.state.lighting);
        this.lightingManager.applyPreset(lightingConfig);

        await this.cabinBuilder.buildCabin(this.state, currentToken);

        if (!currentToken.cancelled) {
            this.uiManager.setLoading(false);
        }
    };

    ElevatorConfiguratorApp.prototype.calculateTotalPrice = function () {
        const catalogs = window.CONFIG.CATALOGS;
        let total = 0;

        const getItemPrice = (catalog, id) => catalog.find(i => i.id === id)?.price || 0;

        total += getItemPrice(catalogs.CABIN_MODELS, this.state.cabinModel);
        total += getItemPrice(catalogs.WALLS, this.state.wallLeft);
        if (this.state.wallMode === 'INDEPENDENT') {
            total += getItemPrice(catalogs.WALLS, this.state.wallBack);
            total += getItemPrice(catalogs.WALLS, this.state.wallRight);
        }
        total += getItemPrice(catalogs.MATERIALS, this.state.material);
        total += getItemPrice(catalogs.FLOORS, this.state.floor);
        total += getItemPrice(catalogs.CEILINGS, this.state.ceiling);
        total += getItemPrice(catalogs.HANDRAILS, this.state.handrail);
        total += getItemPrice(catalogs.COPS, this.state.cop);
        total += getItemPrice(catalogs.LIGHTINGS, this.state.lighting);
        total += getItemPrice(catalogs.ETCHEDS, this.state.etched);

        return total;
    };

    ElevatorConfiguratorApp.prototype.getQuoteBreakdown = function () {
        const catalogs = window.CONFIG.CATALOGS;
        const items = [];

        const add = (label, catalog, id) => {
            const item = catalog.find(i => i.id === id);
            if (item) items.push({ label: `${label}: ${item.name}`, price: item.price || 0 });
        };

        add('Mẫu Cabin', catalogs.CABIN_MODELS, this.state.cabinModel);
        add('Vách Trái', catalogs.WALLS, this.state.wallLeft);
        if (this.state.wallMode === 'INDEPENDENT') {
            add('Vách Sau', catalogs.WALLS, this.state.wallBack);
            add('Vách Phải', catalogs.WALLS, this.state.wallRight);
        }
        add('Vật Liệu Inox', catalogs.MATERIALS, this.state.material);
        add('Hoa Văn Etched', catalogs.ETCHEDS, this.state.etched);
        add('Sàn Cabin', catalogs.FLOORS, this.state.floor);
        add('Trần Cabin', catalogs.CEILINGS, this.state.ceiling);
        add('Tay Vịn', catalogs.HANDRAILS, this.state.handrail);
        add('Bảng Điều Khiển', catalogs.COPS, this.state.cop);
        add('Chiếu Sáng', catalogs.LIGHTINGS, this.state.lighting);

        return { items, total: this.calculateTotalPrice() };
    };

    ElevatorConfiguratorApp.prototype.saveConfig = function () {
        localStorage.setItem('elevator_config_state', JSON.stringify(this.state));
        this.uiManager.showToast('Đã lưu cấu hình vào máy!');
    };

    ElevatorConfiguratorApp.prototype.restoreStateFromURLOrStorage = function () {
        const params = new URLSearchParams(window.location.search);
        const urlStateRaw = params.get('config');

        if (urlStateRaw) {
            try {
                const parsed = JSON.parse(urlStateRaw);
                this.validateState(parsed);
                return;
            } catch (e) {}
        }

        const saved = localStorage.getItem('elevator_config_state');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.validateState(parsed);
            } catch (e) {}
        }
    };

    ElevatorConfiguratorApp.prototype.shareConfig = function () {
        const jsonStr = JSON.stringify(this.state);
        const url = `${window.location.origin}${window.location.pathname}?config=${encodeURIComponent(jsonStr)}`;
        navigator.clipboard.writeText(url).then(() => {
            this.uiManager.showToast('Đã sao chép liên kết cấu hình!');
        });
    };

    ElevatorConfiguratorApp.prototype.resetConfig = function () {
        this.state = JSON.parse(JSON.stringify(window.CONFIG.DEFAULT_STATE));
        this.uiManager.renderAll();
        this.rebuildCabin();
        this.uiManager.showToast('Đã đặt lại cấu hình mặc định!');
    };

    return ElevatorConfiguratorApp;
})();

// Application Entry Point
document.addEventListener('DOMContentLoaded', () => {
    const app = new window.ElevatorConfiguratorApp();
    app.init();
    window.appInstance = app;
});
