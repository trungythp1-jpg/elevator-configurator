window.SceneManager = (function () {
    function SceneManager(canvasId) {
        this.canvas = document.getElementById(canvasId);
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f0f0f);

        this.camera = new THREE.PerspectiveCamera(45, this.getAspectRatio(), 0.1, 100);
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        this.setupResize();
        this.setCameraView('FRONT');
    }

    SceneManager.prototype.getAspectRatio = function () {
        const width = this.canvas.clientWidth || window.innerWidth;
        const height = this.canvas.clientHeight || window.innerHeight;
        return height > 0 ? width / height : 1.0;
    };

    SceneManager.prototype.setupResize = function () {
        window.addEventListener('resize', () => {
            const width = this.canvas.clientWidth;
            const height = this.canvas.clientHeight;
            if (height === 0) return;

            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height, false);
        });
    };

    SceneManager.prototype.setCameraView = function (viewName) {
        const dims = window.CONFIG.DIMENSIONS;
        const target = new THREE.Vector3(0, dims.height / 2, 0);

        switch (viewName) {
            case 'FRONT':
                this.camera.position.set(0, dims.height / 2, dims.depth * 2.2);
                break;
            case 'REAR':
                this.camera.position.set(0, dims.height / 2, -dims.depth * 0.8);
                break;
            case 'LEFT':
                this.camera.position.set(-dims.width * 0.8, dims.height / 2, 0);
                break;
            case 'RIGHT':
                this.camera.position.set(dims.width * 0.8, dims.height / 2, 0);
                break;
            case 'CEILING':
                this.camera.position.set(0, dims.height * 0.3, 0.1);
                target.set(0, dims.height, 0);
                break;
            case 'FLOOR':
                this.camera.position.set(0, dims.height * 0.8, 0.1);
                target.set(0, 0, 0);
                break;
            default:
                this.camera.position.set(0, dims.height / 2, dims.depth * 2.2);
        }

        this.camera.lookAt(target);
    };

    SceneManager.prototype.render = function () {
        this.renderer.render(this.scene, this.camera);
    };

    return SceneManager;
})();
