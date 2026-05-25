/* State.js v1.0.2 by iDev Games */
class State
{
    states = [];
    stateData = new Map();
    observer;
    mutationObservers = new Map();
    stateAttributesCache = new Map();
    formElements = new Set();
    mediaElements = new Set();

    constructor() {
        this.stateInit = this.stateInit.bind(this);
        this.stateObserver = this.stateObserver.bind(this);
        this.handleFormInput = this.handleFormInput.bind(this);
        this.handleMediaUpdate = this.handleMediaUpdate.bind(this);
        this.observer = new IntersectionObserver(this.stateObserver);
    }

    stateInit() {
        this.observer = new IntersectionObserver(this.stateObserver);
        // Select elements with data-state, .enable-state, body, OR any element with state-related attributes
        this.states = document.querySelectorAll('body,.enable-state,[data-state],[data-state-toggles],[data-state-watch],[data-state-trigger]');
        this.states.forEach((element, index) => {
            element.index = index;
            this.setupElement(element);
        });
    }

    setupElement(element) {
        // Add state classes immediately
        if (document.body !== element) {
            if (!element.classList.contains('state')) {
                element.classList.add('state', 'state-visible');
            }
        }

        // Setup intersection observer for visibility tracking (optional feature)
        this.observer.observe(element);

        // Setup mutation observer for data-* attribute changes
        this.setupMutationObserver(element);

        // Setup form input listeners
        if (element.tagName === 'INPUT' || element.tagName === 'SELECT' ||
            element.tagName === 'TEXTAREA' || element.tagName === 'METER' ||
            element.tagName === 'PROGRESS') {
            this.setupFormElement(element);
        }

        // Setup media element listeners
        if (element.tagName === 'VIDEO' || element.tagName === 'AUDIO') {
            this.setupMediaElement(element);
        }

        // Setup trigger elements (buttons, divs, etc. that can trigger state changes)
        if (element.hasAttribute('data-state-trigger')) {
            this.setupTriggerElement(element);
        }

        // Initial update
        this.updateElement(element);
    }

    setupMutationObserver(element) {
        const config = this.getStateConfig(element);

        // Build list of attributes to watch
        let attrsToWatch = [];

        // If user explicitly set watchAttrs
        if (Array.isArray(config.watchAttrs)) {
            if (config.watchAttrs.includes('none')) {
                // Watch nothing
                attrsToWatch = [];
            } else {
                // Watch only what user listed
                attrsToWatch = [...config.watchAttrs];
            }
        } else {
            // DEFAULT: watch ALL data-* attributes
            attrsToWatch = Array.from(element.attributes)
                .map(a => a.name)
                .filter(name => name.startsWith('data-'))
                .map(name => name.replace('data-', ''));
        }

        // Always include toggles
        attrsToWatch.push(...config.toggleAttrs);


        if (attrsToWatch.length === 0) {
            return; // Nothing to watch
        }

        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes') {
                    const attrName = mutation.attributeName;
                    if (attrName && attrName.startsWith('data-')) {
                        const dataKey = attrName.replace('data-', '').toLowerCase();
                        if (attrsToWatch.includes(dataKey)) {
                            shouldUpdate = true;
                        }
                    }
                }
            });

            if (shouldUpdate) {
                requestAnimationFrame(() => {
                    this.updateElement(element);
                });
            }
        });

        observer.observe(element, {
            attributes: true,
            attributeFilter: attrsToWatch.map(attr => `data-${attr}`)
        });

        this.mutationObservers.set(element, observer);
    }

    setupFormElement(element) {
        this.formElements.add(element);

        const events = ['input', 'change'];
        events.forEach(eventType => {
            element.addEventListener(eventType, this.handleFormInput, { passive: true });
        });

        // Setup automatic binding to other elements
        const bindAttr = element.getAttribute('data-state-bind');
        if (bindAttr) {
            // Use both 'input' and 'change' for better checkbox/radio support
            element.addEventListener('input', (e) => {
                this.handleInputBinding(element, bindAttr);
            }, { passive: true });
            element.addEventListener('change', (e) => {
                this.handleInputBinding(element, bindAttr);
            }, { passive: true });
        }
    }

    handleInputBinding(inputElement, bindAttr) {
        const targetIds = bindAttr.split(',').map(id => id.trim());
        let inputValue = inputElement.value;
        const attrName = inputElement.getAttribute('data-state-attr') || 'value';

        // Handle checkbox values
        if (inputElement.type === 'checkbox') {
            inputValue = inputElement.checked ? 'true' : 'false';
        }

        targetIds.forEach(targetId => {
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                // Update the target element's data attribute
                targetElement.setAttribute(`data-${attrName}`, inputValue);

                // If there's a text display element, update it too
                const displayElement = targetElement.querySelector(`[data-state-display="${attrName}"]`) ||
                                     document.getElementById(`${targetId}-${attrName}`);
                if (displayElement) {
                    displayElement.textContent = inputValue;
                }
            }
        });
    }

    setupMediaElement(element) {
        this.mediaElements.add(element);

        const events = ['timeupdate', 'play', 'pause', 'volumechange', 'loadedmetadata'];
        events.forEach(eventType => {
            element.addEventListener(eventType, this.handleMediaUpdate, { passive: true });
        });
    }

    setupTriggerElement(element) {
        const bindAttr = element.getAttribute('data-state-bind');
        if (!bindAttr) return;

        element.addEventListener('click', (e) => {
            this.handleTriggerClick(element, bindAttr);
        });

        // Add cursor pointer for better UX
        element.style.cursor = 'pointer';
    }

    handleTriggerClick(triggerElement, bindAttr) {
        const targetIds = bindAttr.split(',').map(id => id.trim());
        const attrName = triggerElement.getAttribute('data-state-attr');
        const attrValue = triggerElement.getAttribute('data-state-value');
        const toggleAttr = triggerElement.getAttribute('data-state-toggle');
        const incrementValue = triggerElement.getAttribute('data-state-increment');
        const decrementValue = triggerElement.getAttribute('data-state-decrement');

        targetIds.forEach(targetId => {
            const targetElement = document.getElementById(targetId);
            if (!targetElement) return;

            if (toggleAttr) {
                // Toggle mode: flip between true/false
                const currentValue = targetElement.getAttribute(`data-${toggleAttr}`);
                const newValue = currentValue === 'true' ? 'false' : 'true';
                targetElement.setAttribute(`data-${toggleAttr}`, newValue);
            } else if (attrName && incrementValue !== null) {
                // Increment mode: add incrementValue to current value (with optional min/max)
                const currentValue = parseFloat(targetElement.getAttribute(`data-${attrName}`) || '0');

                // Evaluate increment value (supports calc() with CSS variables)
                let increment;
                if (incrementValue.includes('calc(')) {
                    // Create temporary element to evaluate calc() expression
                    const tempEl = document.createElement('div');
                    tempEl.style.setProperty('--state-current', currentValue);

                    // Copy all CSS variables from target element to temp element
                    const computedStyle = window.getComputedStyle(targetElement);
                    for (let i = 0; i < computedStyle.length; i++) {
                        const prop = computedStyle[i];
                        if (prop.startsWith('--state-')) {
                            tempEl.style.setProperty(prop, computedStyle.getPropertyValue(prop));
                        }
                    }

                    tempEl.style.width = incrementValue;
                    document.body.appendChild(tempEl);
                    increment = parseFloat(window.getComputedStyle(tempEl).width) || 0;
                    document.body.removeChild(tempEl);
                } else {
                    increment = parseFloat(incrementValue);
                }

                let newValue = currentValue + increment;

                // Apply min/max clamping if specified
                const minValue = targetElement.getAttribute(`data-${attrName}-min`);
                const maxValue = targetElement.getAttribute(`data-${attrName}-max`);
                if (minValue !== null) {
                    newValue = Math.max(parseFloat(minValue), newValue);
                }
                if (maxValue !== null) {
                    newValue = Math.min(parseFloat(maxValue), newValue);
                }

                targetElement.setAttribute(`data-${attrName}`, String(newValue));

                // Update display element if exists
                const displayElement = targetElement.querySelector(`[data-state-display="${attrName}"]`) ||
                                     document.getElementById(`${targetId}-${attrName}`);
                if (displayElement) {
                    displayElement.textContent = String(newValue);
                }
            } else if (attrName && decrementValue !== null) {
                // Decrement mode: subtract decrementValue from current value (with optional min/max)
                const currentValue = parseFloat(targetElement.getAttribute(`data-${attrName}`) || '0');

                // Evaluate decrement value (supports calc() with CSS variables)
                let decrement;
                if (decrementValue.includes('calc(')) {
                    // Create temporary element to evaluate calc() expression
                    const tempEl = document.createElement('div');
                    tempEl.style.setProperty('--state-current', currentValue);

                    // Copy all CSS variables from target element to temp element
                    const computedStyle = window.getComputedStyle(targetElement);
                    for (let i = 0; i < computedStyle.length; i++) {
                        const prop = computedStyle[i];
                        if (prop.startsWith('--state-')) {
                            tempEl.style.setProperty(prop, computedStyle.getPropertyValue(prop));
                        }
                    }

                    tempEl.style.width = decrementValue;
                    document.body.appendChild(tempEl);
                    decrement = parseFloat(window.getComputedStyle(tempEl).width) || 0;
                    document.body.removeChild(tempEl);
                } else {
                    decrement = parseFloat(decrementValue);
                }

                let newValue = currentValue - decrement;

                // Apply min/max clamping if specified
                const minValue = targetElement.getAttribute(`data-${attrName}-min`);
                const maxValue = targetElement.getAttribute(`data-${attrName}-max`);
                if (minValue !== null) {
                    newValue = Math.max(parseFloat(minValue), newValue);
                }
                if (maxValue !== null) {
                    newValue = Math.min(parseFloat(maxValue), newValue);
                }

                targetElement.setAttribute(`data-${attrName}`, String(newValue));

                // Update display element if exists
                const displayElement = targetElement.querySelector(`[data-state-display="${attrName}"]`) ||
                                     document.getElementById(`${targetId}-${attrName}`);
                if (displayElement) {
                    displayElement.textContent = String(newValue);
                }
            } else if (attrName && attrValue !== null) {
                // Set mode: set specific attribute to specific value
                targetElement.setAttribute(`data-${attrName}`, attrValue);

                // Update display element if exists
                const displayElement = targetElement.querySelector(`[data-state-display="${attrName}"]`) ||
                                     document.getElementById(`${targetId}-${attrName}`);
                if (displayElement) {
                    displayElement.textContent = attrValue;
                }
            }
        });
    }

    handleFormInput(event) {
        const element = event.target;
        requestAnimationFrame(() => {
            this.updateElement(element);
        });
    }

    handleMediaUpdate(event) {
        const element = event.target;
        requestAnimationFrame(() => {
            this.updateElement(element);
        });
    }

    getStateConfig(element) {
        let cached = this.stateAttributesCache.get(element);

        if (!cached) {
            const watchAttr = element.getAttribute('data-state-watch');
            const togglesAttr = element.getAttribute('data-state-toggles');

            cached = {
                watchAttrs: watchAttr ? watchAttr.split(',').map(a => a.trim()) : null,
                toggleAttrs: togglesAttr ? togglesAttr.split(',').map(a => a.trim().toLowerCase()) : [],
                enableVar: element.getAttribute('data-state-var') === 'true',
                enableDimensions: element.getAttribute('data-state-dimensions') === 'true',
                enableMedia: element.getAttribute('data-state-media') === 'true',
                enableCounter: element.getAttribute('data-state-counter') === 'true',
                isGlobal: element.getAttribute('data-state-global') === 'true',
                increment: parseInt(element.getAttribute('data-state-increment') || '10')
            };

            this.stateAttributesCache.set(element, cached);
        }

        return cached;
    }

    stateObserver(entries) {
        requestAnimationFrame(() => {
            entries.forEach((entry) => {
                this.stateIntersecting(entry);
                this.updateElement(entry.target);
            });
        });

        // Don't unobserve - keep watching for visibility changes
        // entries.forEach((entry) => {
        //     this.observer.unobserve(entry.target);
        // });
    }

    stateIntersecting(entry) {
        if (document.body !== entry.target) {
            if (entry.isIntersecting) {
                if (!entry.target.classList.contains('state')) {
                    entry.target.classList.add('state', 'state-visible');
                }
            } else {
                entry.target.classList.remove('state', 'state-visible');
            }
        }
    }

    updateElement(element) {
        const config = this.getStateConfig(element);
        const styleTarget = config.isGlobal ? document.documentElement.style : element.style;
        const idSuffix = config.isGlobal && element.id ? `-${element.id}` : '';

        // Update visibility and viewport position
        this.updateVisibilityVars(element, styleTarget, idSuffix);

        // Update dimensions if enabled
        if (config.enableDimensions) {
            this.updateDimensionVars(element, styleTarget, idSuffix);
        }

        // Update watched data attributes
        if (config.watchAttrs === null || config.watchAttrs.length > 0) {
            this.updateWatchedVars(element, config, styleTarget, idSuffix);
        }

        // Update toggle attributes
        if (config.toggleAttrs.length > 0) {
            this.updateToggleVars(element, config, styleTarget, idSuffix);
        }

        // Update form input values
        if (this.formElements.has(element)) {
            this.updateFormVars(element, styleTarget, idSuffix);
        }

        // Update media element state
        if (this.mediaElements.has(element) && config.enableMedia) {
            this.updateMediaVars(element, styleTarget, idSuffix);
        }

        // Update body state if this is body element
        if (element === document.body) {
            this.updateBodyState(element);
        }
    }

    updateVisibilityVars(element, styleTarget, idSuffix) {
        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // Visibility (0 or 1)
        const isVisible = rect.top < viewportHeight && rect.bottom > 0 ? 1 : 0;
        styleTarget.setProperty(`--state-visible${idSuffix}`, isVisible);

        // Intersection ratio (0-100%)
        const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
        const intersectionRatio = Math.max(0, Math.min(100, (visibleHeight / rect.height) * 100));
        styleTarget.setProperty(`--state-intersection${idSuffix}`, `${Math.round(intersectionRatio)}%`);

        // Viewport position (0-100%)
        const viewportX = ((rect.left + rect.width / 2) / viewportWidth) * 100;
        const viewportY = ((rect.top + rect.height / 2) / viewportHeight) * 100;
        styleTarget.setProperty(`--state-viewport-x${idSuffix}`, `${Math.round(viewportX)}%`);
        styleTarget.setProperty(`--state-viewport-y${idSuffix}`, `${Math.round(viewportY)}%`);
    }

    updateDimensionVars(element, styleTarget, idSuffix) {
        const rect = element.getBoundingClientRect();
        styleTarget.setProperty(`--state-width${idSuffix}`, `${Math.round(rect.width)}px`);
        styleTarget.setProperty(`--state-height${idSuffix}`, `${Math.round(rect.height)}px`);

        const aspectRatio = rect.width / rect.height;
        styleTarget.setProperty(`--state-aspect-ratio${idSuffix}`, aspectRatio.toFixed(2));
    }

    updateWatchedVars(element, config, styleTarget, idSuffix) {
        // Determine which attributes to process
        let attrs = config.watchAttrs;

        // DEFAULT: watch all data-* attributes
        if (attrs === null) {
            attrs = Array.from(element.attributes)
                .map(a => a.name)
                .filter(name => name.startsWith('data-'))
                .map(name => name.replace('data-', ''));
        }

        // Skip if nothing to watch
        if (!Array.isArray(attrs) || attrs.length === 0) return;

        attrs.forEach(attr => {
            const value = element.getAttribute(`data-${attr.toLowerCase()}`);

            if (value !== null) {
                const numValue = parseFloat(value);

                // Set raw value
                styleTarget.setProperty(`--state-${attr}${idSuffix}`, isNaN(numValue) ? value : numValue);

                // If numeric, calculate percentage
                if (!isNaN(numValue)) {
                    const min = parseFloat(element.getAttribute(`data-${attr}-min`) || '0');
                    const max = parseFloat(element.getAttribute(`data-${attr}-max`) || '100');

                    const percent = ((numValue - min) / (max - min)) * 100;
                    const clampedPercent = Math.max(0, Math.min(100, percent));

                    styleTarget.setProperty(`--state-${attr}-percent${idSuffix}`, `${Math.round(clampedPercent)}%`);
                    styleTarget.setProperty(`--state-${attr}-normalized${idSuffix}`, (clampedPercent / 100).toFixed(2));
                    styleTarget.setProperty(`--state-${attr}-deg${idSuffix}`, `${Math.round((clampedPercent / 100) * 360)}deg`);
                    styleTarget.setProperty(`--state-${attr}-reverse${idSuffix}`, `${Math.round(100 - clampedPercent)}%`);

                    // Update data attribute in increments for CSS selectors
                    const incrementedValue = Math.round(numValue / config.increment) * config.increment;
                    if (element.getAttribute(`data-state-${attr}`) !== String(incrementedValue)) {
                        element.setAttribute(`data-state-${attr}`, String(incrementedValue));
                    }
                }

                // Update data-state-display elements
                const displayElements = element.querySelectorAll(`[data-state-display="${attr}"]`);
                displayElements.forEach(displayEl => {
                    displayEl.textContent = value;
                });
            }
        });
    }

    updateToggleVars(element, config, styleTarget, idSuffix) {
        config.toggleAttrs.forEach(attr => {
            const value = element.getAttribute(`data-${attr.toLowerCase()}`);
            const boolValue = value === 'true' || value === '1' ? 1 : 0;

            styleTarget.setProperty(`--state-${attr}${idSuffix}`, boolValue);

            // Add/remove class for easy CSS targeting
            if (boolValue === 1) {
                element.classList.add(`state-${attr}`);
            } else {
                element.classList.remove(`state-${attr}`);
            }

            // Update data-state-display elements
            const displayElements = element.querySelectorAll(`[data-state-display="${attr}"]`);
            displayElements.forEach(displayEl => {
                displayEl.textContent = value;
            });
        });
    }

    updateFormVars(element, styleTarget, idSuffix) {
        let value = null;
        let min = 0;
        let max = 100;

        if (element.tagName === 'INPUT') {
            if (element.type === 'range' || element.type === 'number') {
                value = parseFloat(element.value) || 0;
                min = parseFloat(element.min) || 0;
                max = parseFloat(element.max) || 100;
            } else if (element.type === 'checkbox') {
                value = element.checked ? 1 : 0;
                min = 0;
                max = 1;
            } else if (element.type === 'radio') {
                value = element.checked ? 1 : 0;
                min = 0;
                max = 1;
            } else {
                value = element.value;
            }
        } else if (element.tagName === 'SELECT') {
            value = element.selectedIndex;
            min = 0;
            max = element.options.length - 1;
        } else if (element.tagName === 'TEXTAREA') {
            value = element.value.length;
            min = 0;
            max = element.maxLength > 0 ? element.maxLength : 1000;
        } else if (element.tagName === 'METER') {
            value = parseFloat(element.value) || 0;
            min = parseFloat(element.min) || 0;
            max = parseFloat(element.max) || 100;
        } else if (element.tagName === 'PROGRESS') {
            value = parseFloat(element.value) || 0;
            min = 0;
            max = parseFloat(element.max) || 100;
        }

        if (value !== null && typeof value === 'number') {
            styleTarget.setProperty(`--state-value${idSuffix}`, value);
            styleTarget.setProperty(`--state-min${idSuffix}`, min);
            styleTarget.setProperty(`--state-max${idSuffix}`, max);

            const percent = ((value - min) / (max - min)) * 100;
            const clampedPercent = Math.max(0, Math.min(100, percent));

            styleTarget.setProperty(`--state-value-percent${idSuffix}`, `${Math.round(clampedPercent)}%`);
            styleTarget.setProperty(`--state-value-normalized${idSuffix}`, (clampedPercent / 100).toFixed(2));
            styleTarget.setProperty(`--state-value-deg${idSuffix}`, `${Math.round((clampedPercent / 100) * 360)}deg`);

            // Update data attribute for CSS selectors
            element.setAttribute('data-state-value', String(Math.round(value)));
        }
    }

    updateMediaVars(element, styleTarget, idSuffix) {
        const currentTime = element.currentTime || 0;
        const duration = element.duration || 1;
        const progress = (currentTime / duration) * 100;
        const volume = (element.volume || 0) * 100;
        const isPlaying = !element.paused ? 1 : 0;

        styleTarget.setProperty(`--state-time${idSuffix}`, Math.round(currentTime));
        styleTarget.setProperty(`--state-duration${idSuffix}`, Math.round(duration));
        styleTarget.setProperty(`--state-progress${idSuffix}`, `${Math.round(progress)}%`);
        styleTarget.setProperty(`--state-volume${idSuffix}`, Math.round(volume));
        styleTarget.setProperty(`--state-playing${idSuffix}`, isPlaying);

        // Add/remove playing class
        if (isPlaying) {
            element.classList.add('state-playing');
        } else {
            element.classList.remove('state-playing');
        }
    }

    updateBodyState(element) {
        // Body gets special classes for global state
        element.classList.add('state-ready');
    }
}

window.state = new State();

window.addEventListener('load', state.stateInit, { passive: true });
window.addEventListener('resize', () => {
    // Re-calculate positions on resize
    state.states.forEach((element) => {
        state.updateElement(element);
    });
}, { passive: true });
