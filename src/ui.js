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

                                item.classList.remove(
                                    'active'
                                );

                            });

                        button.classList.add(
                            'active'
                        );

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
                        event.target.id ===
                            'quote-modal'
                    ) {

                        self.emit(
                            'closeQuote'
                        );

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

        if (
            !root ||
            !Array.isArray(items)
        ) {
            return;
        }


        var section =
            document.createElement(
                'section'
            );

        section.className =
            'config-section';


        var heading =
            document.createElement(
                'h3'
            );

        heading.textContent =
            title;

        section.appendChild(
            heading
        );


        var grid =
            document.createElement(
                'div'
            );

        grid.className =
            'options-grid';

        section.appendChild(
            grid
        );


        var self = this;


        items.forEach(function (item) {

            var card =
                document.createElement(
                    'button'
                );

            card.type =
                'button';

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
             * ====================================================
             * THUMBNAIL
             * ====================================================
             */

            var thumb =
                document.createElement(
                    'div'
                );


            if (item.texturePath) {

                thumb.className =
                    'option-thumb';

                thumb.style.backgroundImage =
                    'url("' +
                    item.texturePath
                        .replace(/"/g, '') +
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
             * ====================================================
             * TITLE
             * ====================================================
             */

            var itemTitle =
                document.createElement(
                    'div'
                );

            itemTitle.className =
                'option-title';

            itemTitle.textContent =
                item.name ||
                item.id;

            card.appendChild(
                itemTitle
            );


            /*
             * ====================================================
             * PRICE
             * ====================================================
             */

            var price =
                document.createElement(
                    'div'
                );

            price.className =
                'option-price';


            var itemPrice =
                Number(item.price) || 0;


            price.textContent =
                itemPrice
                    ? itemPrice.toLocaleString(
                        'vi-VN'
                    ) + ' VNĐ'
                    : 'Miễn phí';


            card.appendChild(
                price
            );


            /*
             * ====================================================
             * SELECTION
             * ====================================================
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
     * WALL GROUP SECTION
     *
     * The 11-panel topology:
     *
     * 1 ↔ 2
     * 3 ↔ 5
     * 4
     * 6 ↔ 8
     * 7
     * 9 ↔ 11
     * 10
     * ============================================================
     */

    UI.prototype.panelGroupSection = function (
        root,
        title,
        key,
        items,
        current,
        description
    ) {

        if (
            !root ||
            !Array.isArray(items)
        ) {
            return;
        }


        var section =
            document.createElement(
                'section'
            );

        section.className =
            'config-section panel-group-section';


        /*
         * Heading
         */

        var heading =
            document.createElement(
                'h3'
            );

        heading.textContent =
            title;

        section.appendChild(
            heading
        );


        /*
         * Description
         */

        if (description) {

            var descriptionElement =
                document.createElement(
                    'div'
                );

            descriptionElement.className =
                'panel-group-description';

            descriptionElement.textContent =
                description;

            section.appendChild(
                descriptionElement
            );

        }


        /*
         * Grid
         */

        var grid =
            document.createElement(
                'div'
            );

        grid.className =
            'options-grid';

        section.appendChild(
            grid
        );


        var self = this;


        items.forEach(function (item) {

            var card =
                document.createElement(
                    'button'
                );

            card.type =
                'button';

            card.className =
                'option-card' +
                (
                    item.id === current
                        ? ' selected'
                        : ''
                );


            /*
             * Thumbnail
             */

            var thumb =
                document.createElement(
                    'div'
                );


            if (item.texturePath) {

                thumb.className =
                    'option-thumb';

                thumb.style.backgroundImage =
                    'url("' +
                    item.texturePath
                        .replace(/"/g, '') +
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
                document.createElement(
                    'div'
                );

            itemTitle.className =
                'option-title';

            itemTitle.textContent =
                item.name ||
                item.id;

            card.appendChild(
                itemTitle
            );


            /*
             * Price
             */

            var price =
                document.createElement(
                    'div'
                );

            price.className =
                'option-price';


            var itemPrice =
                Number(item.price) || 0;


            price.textContent =
                itemPrice
                    ? itemPrice.toLocaleString(
                        'vi-VN'
                    ) + ' VNĐ'
                    : 'Miễn phí';


            card.appendChild(
                price
            );


            /*
             * Select
             */

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
     * WALL GROUPS
     * ============================================================
     */

    UI.prototype.wallGroups =
        function (root, state) {

            var walls =
                CONFIG.CATALOGS.WALLS || [];


            /*
             * ----------------------------------------------------
             * 1 ↔ 2
             * ----------------------------------------------------
             */

            this.panelGroupSection(
                root,
                'Cánh gà cửa — Tấm 1 + 2',
                'panel12',
                walls,
                state.panel12 ||
                    state.wallLeft,
                'Hai tấm nhỏ hai bên cửa dùng chung vật liệu.'
            );


            /*
             * ----------------------------------------------------
             * 3 ↔ 5
             * ----------------------------------------------------
             */

            this.panelGroupSection(
                root,
                'Vách trái — Tấm 3 + 5',
                'panel35',
                walls,
                state.panel35 ||
                    state.wallLeft,
                'Hai tấm nhỏ hai bên tấm trung tâm 4.'
            );


            /*
             * ----------------------------------------------------
             * 4
             * ----------------------------------------------------
             */

            this.panelGroupSection(
                root,
                'Vách trái — Tấm 4',
                'panel4',
                walls,
                state.panel4 ||
                    state.wallLeft,
                'Tấm lớn trung tâm — cấu hình độc lập.'
            );


            /*
             * ----------------------------------------------------
             * 6 ↔ 8
             * ----------------------------------------------------
             */

            this.panelGroupSection(
                root,
                'Vách sau — Tấm 6 + 8',
                'panel68',
                walls,
                state.panel68 ||
                    state.wallBack,
                'Hai tấm nhỏ hai bên tấm trung tâm 7.'
            );


            /*
             * ----------------------------------------------------
             * 7
             * ----------------------------------------------------
             */

            this.panelGroupSection(
                root,
                'Vách sau — Tấm 7',
                'panel7',
                walls,
                state.panel7 ||
                    state.wallBack,
                'Tấm lớn trung tâm — cấu hình độc lập.'
            );


            /*
             * ----------------------------------------------------
             * 9 ↔ 11
             * ----------------------------------------------------
             */

            this.panelGroupSection(
                root,
                'Vách phải — Tấm 9 + 11',
                'panel911',
                walls,
                state.panel911 ||
                    state.wallRight,
                'Hai tấm nhỏ hai bên tấm trung tâm 10.'
            );


            /*
             * ----------------------------------------------------
             * 10
             * ----------------------------------------------------
             */

            this.panelGroupSection(
                root,
                'Vách phải — Tấm 10',
                'panel10',
                walls,
                state.panel10 ||
                    state.wallRight,
                'Tấm lớn trung tâm — cấu hình độc lập.'
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
         * ====================================================
         * CABIN MODEL
         * ====================================================
         */

        this.section(
            root,
            'Mẫu cabin',
            'cabinModel',
            CONFIG.CATALOGS.CABIN_MODELS,
            state.cabinModel
        );


        /*
         * ====================================================
         * WALL MODE
         *
         * Giữ lại SAME / INDEPENDENT.
         *
         * SAME vẫn tương thích với state 3 vách cũ.
         * Các nhóm 11 panel có thể được điều khiển độc lập
         * trong hệ thống mới.
         * ====================================================
         */

        var modeSection =
            document.createElement(
                'section'
            );

        modeSection.className =
            'config-section';


        var modeHeading =
            document.createElement(
                'h3'
            );

        modeHeading.textContent =
            'Chế độ vách';

        modeSection.appendChild(
            modeHeading
        );


        var modeSelector =
            document.createElement(
                'div'
            );

        modeSelector.className =
            'wall-mode-selector';


        var self = this;


        [
            'SAME',
            'INDEPENDENT'
        ].forEach(
            function (value) {

                var button =
                    document.createElement(
                        'button'
                    );

                button.type =
                    'button';

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
         * ====================================================
         * 11-PANEL CONFIGURATION
         * ====================================================
         */

        var wallHeading =
            document.createElement(
                'section'
            );

        wallHeading.className =
            'config-section wall-layout-heading';


        var wallTitle =
            document.createElement(
                'h3'
            );

        wallTitle.textContent =
            'Cấu hình 11 tấm vách nội thất';

        wallHeading.appendChild(
            wallTitle
        );


        var wallDescription =
            document.createElement(
                'div'
            );

        wallDescription.className =
            'panel-group-description';

        wallDescription.textContent =
            'Chọn vật liệu theo từng nhóm tấm. Các nhóm liên kết sẽ luôn đi cùng nhau.';

        wallHeading.appendChild(
            wallDescription
        );


        root.appendChild(
            wallHeading
        );


        this.wallGroups(
            root,
            state
        );


        /*
         * ====================================================
         * MATERIAL
         * ====================================================
         */

        this.section(
            root,
            'Vật liệu nền',
            'material',
            CONFIG.CATALOGS.MATERIALS,
            state.material
        );


        /*
         * ====================================================
         * COLOR
         * ====================================================
         */

        this.section(
            root,
            'Màu hoàn thiện',
            'colorTone',
            CONFIG.CATALOGS.COLORS,
            state.colorTone
        );


        /*
         * ====================================================
         * CUSTOM COLOR
         * ====================================================
         */

        if (
            state.colorTone ===
            'CUSTOM'
        ) {

            var customSection =
                document.createElement(
                    'section'
                );

            customSection.className =
                'config-section';


            var customHeading =
                document.createElement(
                    'h3'
                );

            customHeading.textContent =
                'Màu Custom';

            customSection.appendChild(
                customHeading
            );


            var wrapper =
                document.createElement(
                    'div'
                );

            wrapper.className =
                'color-picker-wrapper';


            var colorInput =
                document.createElement(
                    'input'
                );

            colorInput.type =
                'color';


            colorInput.value =
                /^#[0-9a-f]{6}$/i.test(
                    state.customColor || ''
                )
                    ? state.customColor
                    : '#ffffff';


            var colorText =
                document.createElement(
                    'span'
                );

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
         * ====================================================
         * ETCHED
         * ====================================================
         */

        this.section(
            root,
            'Hoa văn khắc',
            'etched',
            CONFIG.CATALOGS.ETCHEDS,
            state.etched
        );


        /*
         * ====================================================
         * FLOOR
         * ====================================================
         */

        this.section(
            root,
            'Sàn',
            'floor',
            CONFIG.CATALOGS.FLOORS,
            state.floor
        );


        /*
         * ====================================================
         * CEILING
         * ====================================================
         */

        this.section(
            root,
            'Trần',
            'ceiling',
            CONFIG.CATALOGS.CEILINGS,
            state.ceiling
        );


        /*
         * ====================================================
         * HANDRAIL
         * ====================================================
         */

        this.section(
            root,
            'Tay vịn',
            'handrail',
            CONFIG.CATALOGS.HANDRAILS,
            state.handrail
        );


        /*
         * ====================================================
         * COP
         * ====================================================
         */

        this.section(
            root,
            'Bảng điều khiển',
            'cop',
            CONFIG.CATALOGS.COPS,
            state.cop
        );


        /*
         * ====================================================
         * LIGHTING
         * ====================================================
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
            amount.toLocaleString(
                'vi-VN'
            ) +
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


        if (
            !breakdown ||
            !modal
        ) {
            return;
        }


        breakdown.innerHTML = '';


        /*
         * Rows
         */

        (rows || []).forEach(
            function (row) {

                var line =
                    document.createElement(
                        'div'
                    );

                line.className =
                    'quote-row';


                var label =
                    document.createElement(
                        'span'
                    );

                label.textContent =
                    row.label || '';


                var price =
                    document.createElement(
                        'strong'
                    );

                price.textContent =
                    (
                        Number(row.price) || 0
                    ).toLocaleString(
                        'vi-VN'
                    ) +
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
            document.createElement(
                'div'
            );

        totalRow.className =
            'quote-total';


        var totalLabel =
            document.createElement(
                'span'
            );

        totalLabel.textContent =
            'Tổng cộng';


        var totalPrice =
            document.createElement(
                'strong'
            );

        totalPrice.textContent =
            (
                Number(total) || 0
            ).toLocaleString(
                'vi-VN'
            ) +
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

    UI.prototype.closeQuote =
        function () {

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