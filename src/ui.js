window.UIManager = (function () {

    function UI() {
        this.handlers = {};
        this.timer = null;
    }


    /*
     * ============================================================
     * EVENT BUS
     * ============================================================
     */

    UI.prototype.on = function (name, fn) {

        if (typeof fn !== 'function') {
            return;
        }

        if (!this.handlers[name]) {
            this.handlers[name] = [];
        }

        this.handlers[name].push(fn);
    };


    UI.prototype.emit = function (name, payload) {

        var list = this.handlers[name] || [];

        list.slice().forEach(function (fn) {

            try {
                fn(payload);
            } catch (error) {
                console.error(
                    'UI event error:',
                    name,
                    error
                );
            }

        });
    };


    /*
     * ============================================================
     * SAFE ELEMENT
     * ============================================================
     */

    UI.prototype.el = function (id) {
        return document.getElementById(id);
    };


    /*
     * ============================================================
     * BIND
     * ============================================================
     */

    UI.prototype.bind = function () {

        var self = this;


        /*
         * Camera buttons
         */

        document
            .querySelectorAll('.btn-camera')
            .forEach(function (button) {

                button.addEventListener(
                    'click',
                    function () {

                        document
                            .querySelectorAll('.btn-camera')
                            .forEach(function (item) {
                                item.classList.remove('active');
                            });

                        button.classList.add('active');

                        self.emit(
                            'camera',
                            button.dataset.view
                        );
                    }
                );
            });


        /*
         * Toggle door
         */

        var doorButton =
            this.el('btn-toggle-door');

        if (doorButton) {

            doorButton.addEventListener(
                'click',
                function () {
                    self.emit('door');
                }
            );
        }


        /*
         * Quote
         */

        var quoteButton =
            this.el('btn-quote');

        if (quoteButton) {

            quoteButton.addEventListener(
                'click',
                function () {
                    self.emit('quote');
                }
            );
        }


        /*
         * Share
         */

        var shareButton =
            this.el('btn-share');

        if (shareButton) {

            shareButton.addEventListener(
                'click',
                function () {
                    self.emit('share');
                }
            );
        }


        /*
         * Save
         */

        var saveButton =
            this.el('btn-save');

        if (saveButton) {

            saveButton.addEventListener(
                'click',
                function () {
                    self.emit('save');
                }
            );
        }


        /*
         * Reset
         */

        var resetButton =
            this.el('btn-reset');

        if (resetButton) {

            resetButton.addEventListener(
                'click',
                function () {
                    self.emit('reset');
                }
            );
        }


        /*
         * Modal close
         */

        var modalClose =
            this.el('modal-close');

        if (modalClose) {

            modalClose.addEventListener(
                'click',
                function () {
                    self.emit('closeQuote');
                }
            );
        }


        /*
         * Modal submit
         */

        var modalSubmit =
            this.el('btn-modal-submit');

        if (modalSubmit) {

            modalSubmit.addEventListener(
                'click',
                function () {
                    self.emit('submitQuote');
                }
            );
        }


        /*
         * Click outside modal
         */

        var quoteModal =
            this.el('quote-modal');

        if (quoteModal) {

            quoteModal.addEventListener(
                'click',
                function (event) {

                    if (
                        event.target &&
                        event.target.id === 'quote-modal'
                    ) {
                        self.emit('closeQuote');
                    }
                }
            );
        }
    };


    /*
     * ============================================================
     * OPTION SECTION
     * ============================================================
     */

    UI.prototype.section = function (
        root,
        title,
        key,
        items,
        current,
        disabled
    ) {

        if (!root || !Array.isArray(items)) {
            return;
        }


        var section =
            document.createElement('section');

        section.className =
            'config-section';


        var heading =
            document.createElement('h3');

        heading.textContent =
            title;

        section.appendChild(
            heading
        );


        var grid =
            document.createElement('div');

        grid.className =
            'options-grid';

        section.appendChild(
            grid
        );


        var self = this;


        items.forEach(function (item) {

            var card =
                document.createElement('button');

            card.type = 'button';

            card.className =
                'option-card' +
                (
                    item.id === current
                        ? ' selected'
                        : ''
                );


            card.disabled =
                !!disabled;


            /*
             * Thumbnail
             */

            var thumb =
                document.createElement('div');


            if (item.texturePath) {

                thumb.className =
                    'option-thumb';

                thumb.style.backgroundImage =
                    'url("' +
                    item.texturePath.replace(/"/g, '') +
                    '")';

            } else {

                thumb.className =
                    'option-thumb-fallback';

                thumb.textContent =
                    item.id;
            }


            card.appendChild(
                thumb
            );


            /*
             * Title
             */

            var itemTitle =
                document.createElement('div');

            itemTitle.className =
                'option-title';

            itemTitle.textContent =
                item.name || item.id;

            card.appendChild(
                itemTitle
            );


            /*
             * Price
             */

            var price =
                document.createElement('div');

            price.className =
                'option-price';

            var itemPrice =
                Number(item.price) || 0;

            price.textContent =
                itemPrice
                    ? itemPrice.toLocaleString('vi-VN') +
                      ' VNĐ'
                    : 'Miễn phí';

            card.appendChild(
                price
            );


            /*
             * Selection event
             */

            if (!disabled) {

                card.addEventListener(
                    'click',
                    function () {

                        self.emit(
                            'select',
                            {
                                key: key,
                                value: item.id
                            }
                        );
                    }
                );
            }


            grid.appendChild(
                card
            );

        });


        root.appendChild(
            section
        );
    };


    /*
     * ============================================================
     * RENDER
     * ============================================================
     */

    UI.prototype.render = function (state) {

        if (!state) {
            return;
        }


        var root =
            this.el('config-panels');


        if (!root) {
            return;
        }


        root.innerHTML = '';


        /*
         * Cabin model
         */

        this.section(
            root,
            'Mẫu cabin',
            'cabinModel',
            CONFIG.CATALOGS.CABIN_MODELS,
            state.cabinModel
        );


        /*
         * Wall mode
         */

        var modeSection =
            document.createElement('section');

        modeSection.className =
            'config-section';


        var modeHeading =
            document.createElement('h3');

        modeHeading.textContent =
            'Chế độ vách';

        modeSection.appendChild(
            modeHeading
        );


        var modeSelector =
            document.createElement('div');

        modeSelector.className =
            'wall-mode-selector';


        var self = this;


        ['SAME', 'INDEPENDENT'].forEach(
            function (value) {

                var button =
                    document.createElement('button');

                button.type = 'button';

                button.className =
                    'btn-tab' +
                    (
                        state.wallMode === value
                            ? ' active'
                            : ''
                    );


                button.textContent =
                    value === 'SAME'
                        ? 'Đồng bộ 3 vách'
                        : 'Độc lập';


                button.addEventListener(
                    'click',
                    function () {

                        self.emit(
                            'select',
                            {
                                key: 'wallMode',
                                value: value
                            }
                        );
                    }
                );


                modeSelector.appendChild(
                    button
                );
            }
        );


        modeSection.appendChild(
            modeSelector
        );


        root.appendChild(
            modeSection
        );


        /*
         * Walls
         */

        this.section(
            root,
            'Vách trái',
            'wallLeft',
            CONFIG.CATALOGS.WALLS,
            state.wallLeft
        );


        /*
         * Khi SAME:
         * vách sau và phải bị khóa UI.
         */

        this.section(
            root,
            'Vách sau',
            'wallBack',
            CONFIG.CATALOGS.WALLS,
            state.wallBack,
            state.wallMode === 'SAME'
        );


        this.section(
            root,
            'Vách phải',
            'wallRight',
            CONFIG.CATALOGS.WALLS,
            state.wallRight,
            state.wallMode === 'SAME'
        );


        /*
         * Material
         */

        this.section(
            root,
            'Vật liệu nền',
            'material',
            CONFIG.CATALOGS.MATERIALS,
            state.material
        );


        /*
         * Color
         */

        this.section(
            root,
            'Màu hoàn thiện',
            'colorTone',
            CONFIG.CATALOGS.COLORS,
            state.colorTone
        );


        /*
         * Custom color
         */

        if (state.colorTone === 'CUSTOM') {

            var customSection =
                document.createElement('section');

            customSection.className =
                'config-section';


            var customHeading =
                document.createElement('h3');

            customHeading.textContent =
                'Màu Custom';

            customSection.appendChild(
                customHeading
            );


            var wrapper =
                document.createElement('div');

            wrapper.className =
                'color-picker-wrapper';


            var colorInput =
                document.createElement('input');

            colorInput.type =
                'color';


            colorInput.value =
                /^#[0-9a-f]{6}$/i.test(
                    state.customColor || ''
                )
                    ? state.customColor
                    : '#ffffff';


            var colorText =
                document.createElement('span');

            colorText.textContent =
                colorInput.value;


            colorInput.addEventListener(
                'input',
                function () {

                    colorText.textContent =
                        colorInput.value;

                    self.emit(
                        'customColor',
                        colorInput.value
                    );
                }
            );


            wrapper.appendChild(
                colorInput
            );

            wrapper.appendChild(
                colorText
            );


            customSection.appendChild(
                wrapper
            );


            root.appendChild(
                customSection
            );
        }


        /*
         * Etched
         */

        this.section(
            root,
            'Hoa văn khắc',
            'etched',
            CONFIG.CATALOGS.ETCHEDS,
            state.etched
        );


        /*
         * Floor
         */

        this.section(
            root,
            'Sàn',
            'floor',
            CONFIG.CATALOGS.FLOORS,
            state.floor
        );


        /*
         * Ceiling
         */

        this.section(
            root,
            'Trần',
            'ceiling',
            CONFIG.CATALOGS.CEILINGS,
            state.ceiling
        );


        /*
         * Handrail
         */

        this.section(
            root,
            'Tay vịn',
            'handrail',
            CONFIG.CATALOGS.HANDRAILS,
            state.handrail
        );


        /*
         * COP
         */

        this.section(
            root,
            'Bảng điều khiển',
            'cop',
            CONFIG.CATALOGS.COPS,
            state.cop
        );


        /*
         * Lighting
         */

        this.section(
            root,
            'Ánh sáng',
            'lighting',
            CONFIG.CATALOGS.LIGHTINGS,
            state.lighting
        );
    };


    /*
     * ============================================================
     * LOADING
     * ============================================================
     */

    UI.prototype.loading = function (
        show,
        text
    ) {

        var overlay =
            this.el('loading-overlay');

        if (!overlay) {
            return;
        }


        overlay.classList.toggle(
            'hidden',
            !show
        );


        if (text) {

            var textElement =
                this.el('loading-text');

            if (textElement) {
                textElement.textContent =
                    text;
            }
        }
    };


    /*
     * ============================================================
     * DOOR BUTTON
     * ============================================================
     */

    UI.prototype.doorButton = function (
        state
    ) {

        var button =
            this.el('btn-toggle-door');

        if (!button) {
            return;
        }


        button.textContent =
            state === 'OPEN'
                ? 'Đóng cửa'
                : 'Mở cửa';
    };


    /*
     * ============================================================
     * PRICE
     * ============================================================
     */

    UI.prototype.price = function (
        value
    ) {

        var element =
            this.el('total-price');

        if (!element) {
            return;
        }


        var amount =
            Number(value) || 0;


        element.textContent =
            amount.toLocaleString('vi-VN') +
            ' VNĐ';
    };


    /*
     * ============================================================
     * TOAST
     * ============================================================
     */

    UI.prototype.toast = function (
        message
    ) {

        var element =
            this.el('toast');

        if (!element) {
            return;
        }


        element.textContent =
            message || '';


        element.classList.remove(
            'hidden'
        );


        clearTimeout(
            this.timer
        );


        var self = this;


        this.timer =
            setTimeout(
                function () {

                    element.classList.add(
                        'hidden'
                    );

                },
                2200
            );
    };


    /*
     * ============================================================
     * QUOTE
     * ============================================================
     */

    UI.prototype.quote = function (
        rows,
        total
    ) {

        var breakdown =
            this.el('quote-breakdown');

        var modal =
            this.el('quote-modal');


        if (!breakdown || !modal) {
            return;
        }


        breakdown.innerHTML = '';


        /*
         * Dùng DOM thay vì innerHTML với dữ liệu catalog.
         */

        (rows || []).forEach(
            function (row) {

                var line =
                    document.createElement('div');

                line.className =
                    'quote-row';


                var label =
                    document.createElement('span');

                label.textContent =
                    row.label || '';


                var price =
                    document.createElement('strong');

                price.textContent =
                    (
                        Number(row.price) || 0
                    ).toLocaleString('vi-VN') +
                    ' VNĐ';


                line.appendChild(
                    label
                );

                line.appendChild(
                    price
                );


                breakdown.appendChild(
                    line
                );
            }
        );


        /*
         * Total
         */

        var totalRow =
            document.createElement('div');

        totalRow.className =
            'quote-total';


        var totalLabel =
            document.createElement('span');

        totalLabel.textContent =
            'Tổng cộng';


        var totalPrice =
            document.createElement('strong');

        totalPrice.textContent =
            (
                Number(total) || 0
            ).toLocaleString('vi-VN') +
            ' VNĐ';


        totalRow.appendChild(
            totalLabel
        );

        totalRow.appendChild(
            totalPrice
        );


        breakdown.appendChild(
            totalRow
        );


        modal.classList.remove(
            'hidden'
        );
    };


    /*
     * ============================================================
     * CLOSE QUOTE
     * ============================================================
     */

    UI.prototype.closeQuote = function () {

        var modal =
            this.el('quote-modal');

        if (!modal) {
            return;
        }


        modal.classList.add(
            'hidden'
        );
    };


    /*
     * ============================================================
     * RETURN
     * ============================================================
     */

    return UI;

})();