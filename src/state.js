/* State.js v1.3.1 by iDev Games */
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

    decodeHTMLEntities(str) {
        return str
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
    }

    evaluateCalc(calcExpression, sourceElement) {
        let expr = calcExpression.trim();
        if (expr.startsWith('calc(') && expr.endsWith(')')) {
            expr = expr.slice(5, -1);
        }

        const tempEl = document.createElement('div');
        tempEl.style.position = 'absolute';
        tempEl.style.visibility = 'hidden';
        const computedStyle = window.getComputedStyle(sourceElement);
        for (let i = 0; i < computedStyle.length; i++) {
            const prop = computedStyle[i];
            if (prop.startsWith('--state-')) {
                tempEl.style.setProperty(prop, computedStyle.getPropertyValue(prop));
            }
        }

        tempEl.style.width = `calc((${expr}) * 1px)`;
        document.body.appendChild(tempEl);
        const result = parseFloat(window.getComputedStyle(tempEl).width) || 0;
        document.body.removeChild(tempEl);

        return result;
    }

    evaluateCondition(conditionStr, sourceElement) {
        try {
            const decoded = this.decodeHTMLEntities(conditionStr);
            const processed = decoded.replace(/([a-zA-Z][\w-]*)/g, (match) => {
                const keywords = ['true', 'false', 'null', 'undefined', 'and', 'or', 'not'];
                if (keywords.includes(match.toLowerCase())) {
                    return match;
                }
                const value = sourceElement.getAttribute(`data-${match}`);
                return value !== null ? value : match;
            });
            const normalized = processed
                .replace(/\band\b/gi, '&&')
                .replace(/\bor\b/gi, '||');
            return Function('"use strict"; return (' + normalized + ')')();
        } catch (e) {
            console.warn('State.js: Invalid condition expression:', conditionStr, e);
            return false;
        }
    }

    stateInit() {
        this.observer = new IntersectionObserver(this.stateObserver);
        this.states = document.querySelectorAll('body,.enable-state,[data-state],[data-state-toggles],[data-state-watch],[data-state-trigger],[data-state-include]');
        this.states.forEach((element, index) => {
            element.index = index;
            this.setupElement(element);
        });
    }

    setupElement(element) {
        if (element.hasAttribute('data-state-include')) {
            this.setupInclude(element);
            return;
        }

        if (document.body !== element) {
            if (!element.classList.contains('state')) {
                element.classList.add('state', 'state-visible');
            }
        }
        this.observer.observe(element);
        this.setupMutationObserver(element);
        if (element.tagName === 'INPUT' || element.tagName === 'SELECT' ||
            element.tagName === 'TEXTAREA' || element.tagName === 'METER' ||
            element.tagName === 'PROGRESS') {
            this.setupFormElement(element);
        }
        if (element.tagName === 'VIDEO' || element.tagName === 'AUDIO') {
            this.setupMediaElement(element);
        }
        if (element.hasAttribute('data-state-trigger')) {
            this.setupTriggerElement(element);
        }
        if (element.hasAttribute('data-state-interval')) {
            this.setupIntervalTrigger(element);
        }
        if (element.hasAttribute('data-state-text')) {
            this.setupTextElement(element);
        }
        if (element.hasAttribute('data-state-class')) {
            this.setupClassElement(element);
        }
        if (element.hasAttribute('data-state-persist')) {
            this.setupPersist(element);
        }
        if (element.hasAttribute('data-state-compute')) {
            this.setupComputedState(element);
        }
        this.updateElement(element);
    }

    setupMutationObserver(element) {
        const config = this.getStateConfig(element);
        let attrsToWatch = [];
        if (Array.isArray(config.watchAttrs)) {
            if (config.watchAttrs.includes('none')) {
                attrsToWatch = [];
            } else {
                attrsToWatch = [...config.watchAttrs];
            }
        } else {
            attrsToWatch = Array.from(element.attributes)
                .map(a => a.name)
                .filter(name => name.startsWith('data-'))
                .map(name => name.replace('data-', ''));
        }
        attrsToWatch.push(...config.toggleAttrs);
        if (attrsToWatch.length === 0) {
            return; 
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

        const bindAttr = element.getAttribute('data-state-bind');
        if (bindAttr) {
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
        if (inputElement.type === 'checkbox') {
            inputValue = inputElement.checked ? 'true' : 'false';
        }

        targetIds.forEach(targetId => {
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.setAttribute(`data-${attrName}`, inputValue);
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
        let bindAttr = element.getAttribute('data-state-bind');
        const chainAttr = element.getAttribute('data-state-trigger-chain');
        const condition = element.getAttribute('data-state-condition');

        if (!bindAttr && !chainAttr) {
            const parentState = element.closest('[data-state]');
            if (parentState && parentState.id) {
                bindAttr = parentState.id;
            } else {
                return;
            }
        }

        element.addEventListener('click', (e) => {
            this.handleTriggerClick(element, bindAttr);
        });
        element.style.cursor = 'pointer';
        if (condition && bindAttr) {
            this.updateTriggerCondition(element, bindAttr, condition);
        }
    }

    updateTriggerCondition(triggerElement, bindAttr, condition) {
        const targetIds = bindAttr.split(',').map(id => id.trim());
        const targetElement = document.getElementById(targetIds[0]);

        if (targetElement) {
            const conditionMet = this.evaluateCondition(condition, targetElement);
            const wasDisabled = triggerElement.classList.contains('state-disabled');

            if (conditionMet) {
                triggerElement.classList.remove('state-disabled');
                const autofire = triggerElement.getAttribute('data-state-autofire') === 'true';
                if (autofire && wasDisabled) {
                    triggerElement.click();
                }
            } else {
                triggerElement.classList.add('state-disabled');
            }
        }
    }

    updateConditionalTriggers(targetId) {
        const triggers = document.querySelectorAll(`[data-state-trigger][data-state-condition][data-state-bind*="${targetId}"]`);

        triggers.forEach(trigger => {
            const bindAttr = trigger.getAttribute('data-state-bind');
            const condition = trigger.getAttribute('data-state-condition');
            if (bindAttr && condition) {
                this.updateTriggerCondition(trigger, bindAttr, condition);
            }
        });
    }

    handleTriggerClick(triggerElement, bindAttr) {
        const soundName = triggerElement.getAttribute('data-state-sound');
        if (soundName) {
            this.playSound(soundName);
        }

        const attrName = triggerElement.getAttribute('data-state-attr');
        const attrValue = triggerElement.getAttribute('data-state-value');
        const toggleAttr = triggerElement.getAttribute('data-state-toggle');
        const incrementValue = triggerElement.getAttribute('data-state-increment');
        const decrementValue = triggerElement.getAttribute('data-state-decrement');
        const setValue = triggerElement.getAttribute('data-state-set');
        const chainTriggers = triggerElement.getAttribute('data-state-trigger-chain');
        const condition = triggerElement.getAttribute('data-state-condition');
        if (condition && bindAttr) {
            const targetIds = bindAttr.split(',').map(id => id.trim());
            const targetElement = document.getElementById(targetIds[0]);

            if (targetElement && !this.evaluateCondition(condition, targetElement)) {
                triggerElement.classList.add('state-disabled');
                return;
            } else {
                triggerElement.classList.remove('state-disabled');
            }
        }

        if (bindAttr) {
            const targetIds = bindAttr.split(',').map(id => id.trim());

            targetIds.forEach(targetId => {
                const targetElement = document.getElementById(targetId);
                if (!targetElement) return;

                if (toggleAttr) {
                const oldValue = targetElement.getAttribute(`data-${toggleAttr}`);
                const newValue = oldValue === 'true' ? 'false' : 'true';
                targetElement.setAttribute(`data-${toggleAttr}`, newValue);
                this.dispatchStateEvent(triggerElement, bindAttr, toggleAttr, oldValue, newValue);
            } else if (attrName && incrementValue !== null) {
                let currentAttr = targetElement.getAttribute(`data-${attrName}`) || '0';
                const currentValue = parseFloat(currentAttr);
                if (isNaN(currentValue)) {
                    console.warn(`State.js: Attribute data-${attrName} is not numeric:`, currentAttr);
                    return;
                }
                let increment;
                if (incrementValue.includes('calc(')) {
                    increment = this.evaluateCalc(incrementValue, targetElement);
                } else {
                    increment = parseFloat(incrementValue);
                }
                if (isNaN(increment)) {
                    console.warn(`State.js: Increment value is not numeric:`, incrementValue);
                    return;
                }

                let newValue = currentValue + increment;
                const minValue = targetElement.getAttribute(`data-${attrName}-min`);
                const maxValue = targetElement.getAttribute(`data-${attrName}-max`);
                if (minValue !== null) {
                    newValue = Math.max(parseFloat(minValue), newValue);
                }
                if (maxValue !== null) {
                    newValue = Math.min(parseFloat(maxValue), newValue);
                }

                const oldValue = currentAttr;
                targetElement.setAttribute(`data-${attrName}`, String(newValue));
                this.logTrace(targetElement, attrName, oldValue, String(newValue));
                this.dispatchStateEvent(triggerElement, bindAttr, attrName, oldValue, String(newValue));
                const displayElement = targetElement.querySelector(`[data-state-display="${attrName}"]`) ||
                                     document.getElementById(`${targetId}-${attrName}`);
                if (displayElement) {
                    displayElement.textContent = String(newValue);
                }
                this.updateConditionalTriggers(targetId);
            } else if (attrName && decrementValue !== null) {
                let currentAttr = targetElement.getAttribute(`data-${attrName}`) || '0';
                const currentValue = parseFloat(currentAttr);
                if (isNaN(currentValue)) {
                    console.warn(`State.js: Attribute data-${attrName} is not numeric:`, currentAttr);
                    return;
                }
                let decrement;
                if (decrementValue.includes('calc(')) {
                    decrement = this.evaluateCalc(decrementValue, targetElement);
                } else {
                    decrement = parseFloat(decrementValue);
                }
                if (isNaN(decrement)) {
                    console.warn(`State.js: Decrement value is not numeric:`, decrementValue);
                    return;
                }

                let newValue = currentValue - decrement;
                const minValue = targetElement.getAttribute(`data-${attrName}-min`);
                const maxValue = targetElement.getAttribute(`data-${attrName}-max`);
                if (minValue !== null) {
                    newValue = Math.max(parseFloat(minValue), newValue);
                }
                if (maxValue !== null) {
                    newValue = Math.min(parseFloat(maxValue), newValue);
                }

                const oldValue = currentAttr;
                targetElement.setAttribute(`data-${attrName}`, String(newValue));
                this.logTrace(targetElement, attrName, oldValue, String(newValue));
                this.dispatchStateEvent(triggerElement, bindAttr, attrName, oldValue, String(newValue));
                const displayElement = targetElement.querySelector(`[data-state-display="${attrName}"]`) ||
                                     document.getElementById(`${targetId}-${attrName}`);
                if (displayElement) {
                    displayElement.textContent = String(newValue);
                }
                this.updateConditionalTriggers(targetId);
            } else if (attrName && setValue !== null) {
                let finalValue;
                if (setValue.includes('calc(')) {
                    finalValue = String(this.evaluateCalc(setValue, targetElement));
                } else {
                    finalValue = setValue;
                }

                const oldValue = targetElement.getAttribute(`data-${attrName}`) || '';
                targetElement.setAttribute(`data-${attrName}`, finalValue);
                this.dispatchStateEvent(triggerElement, bindAttr, attrName, oldValue, finalValue);
                const displayElement = targetElement.querySelector(`[data-state-display="${attrName}"]`) ||
                                     document.getElementById(`${targetId}-${attrName}`);
                if (displayElement) {
                    displayElement.textContent = finalValue;
                }
                this.updateConditionalTriggers(targetId);
            } else if (attrName && attrValue !== null) {
                let finalValue;
                if (attrValue.includes('calc(')) {
                    finalValue = String(this.evaluateCalc(attrValue, targetElement));
                } else {
                    finalValue = attrValue;
                }

                const oldValue = targetElement.getAttribute(`data-${attrName}`) || '';
                targetElement.setAttribute(`data-${attrName}`, finalValue);
                this.dispatchStateEvent(triggerElement, bindAttr, attrName, oldValue, finalValue);
                const displayElement = targetElement.querySelector(`[data-state-display="${attrName}"]`) ||
                                     document.getElementById(`${targetId}-${attrName}`);
                if (displayElement) {
                    displayElement.textContent = finalValue;
                }
                this.updateConditionalTriggers(targetId);
            }
            });
        }

        if (chainTriggers) {
            const chainIds = chainTriggers.split(',').map(id => id.trim());
            chainIds.forEach(chainId => {
                const chainElement = document.getElementById(chainId);
                if (chainElement && chainElement.hasAttribute('data-state-trigger')) {
                    chainElement.click();
                }
            });
        }
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
        this.updateVisibilityVars(element, styleTarget, idSuffix);
        if (config.enableDimensions) {
            this.updateDimensionVars(element, styleTarget, idSuffix);
        }
        if (config.watchAttrs === null || config.watchAttrs.length > 0) {
            this.updateWatchedVars(element, config, styleTarget, idSuffix);
        }

        if (config.toggleAttrs.length > 0) {
            this.updateToggleVars(element, config, styleTarget, idSuffix);
        }

        if (element.hasAttribute('data-state-compute')) {
            this.updateComputedState(element, styleTarget, idSuffix);
        }

        if (this.formElements.has(element)) {
            this.updateFormVars(element, styleTarget, idSuffix);
        }

        if (this.mediaElements.has(element) && config.enableMedia) {
            this.updateMediaVars(element, styleTarget, idSuffix);
        }

        if (element === document.body) {
            this.updateBodyState(element);
        }
    }

    updateVisibilityVars(element, styleTarget, idSuffix) {
        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const isVisible = rect.top < viewportHeight && rect.bottom > 0 ? 1 : 0;
        styleTarget.setProperty(`--state-visible${idSuffix}`, isVisible);
        const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
        const intersectionRatio = Math.max(0, Math.min(100, (visibleHeight / rect.height) * 100));
        styleTarget.setProperty(`--state-intersection${idSuffix}`, `${Math.round(intersectionRatio)}%`);
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
        let attrs = config.watchAttrs;

        if (attrs === null) {
            attrs = Array.from(element.attributes)
                .map(a => a.name)
                .filter(name => name.startsWith('data-'))
                .map(name => name.replace('data-', ''));
        }

        if (!Array.isArray(attrs) || attrs.length === 0) return;

        attrs.forEach(attr => {
            let value = element.getAttribute(`data-${attr.toLowerCase()}`);

            if (value !== null) {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                    value = numValue;
                }
                styleTarget.setProperty(`--state-${attr}${idSuffix}`, isNaN(numValue) ? value : numValue);
                if (!isNaN(numValue)) {
                    const min = parseFloat(element.getAttribute(`data-${attr}-min`) || '0');
                    const max = parseFloat(element.getAttribute(`data-${attr}-max`) || '100');
                    const percent = ((numValue - min) / (max - min)) * 100;
                    const clampedPercent = Math.max(0, Math.min(100, percent));
                    styleTarget.setProperty(`--state-${attr}-percent${idSuffix}`, `${Math.round(clampedPercent)}%`);
                    styleTarget.setProperty(`--state-${attr}-normalized${idSuffix}`, (clampedPercent / 100).toFixed(2));
                    styleTarget.setProperty(`--state-${attr}-deg${idSuffix}`, `${Math.round((clampedPercent / 100) * 360)}deg`);
                    styleTarget.setProperty(`--state-${attr}-reverse${idSuffix}`, `${Math.round(100 - clampedPercent)}%`);
                    const incrementedValue = Math.round(numValue / config.increment) * config.increment;
                    if (element.getAttribute(`data-state-${attr}`) !== String(incrementedValue)) {
                        element.setAttribute(`data-state-${attr}`, String(incrementedValue));
                    }
                }
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
            if (boolValue === 1) {
                element.classList.add(`state-${attr}`);
            } else {
                element.classList.remove(`state-${attr}`);
            }
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

        if (isPlaying) {
            element.classList.add('state-playing');
        } else {
            element.classList.remove('state-playing');
        }
    }

    updateBodyState(element) {
        element.classList.add('state-ready');
    }
    intervalTriggers = new Map();
    intervalScheduler = null;

    setupIntervalTrigger(element) {
        const interval = element.getAttribute('data-state-interval');
        if (!interval) return;

        const ms = parseFloat(interval);
        if (isNaN(ms) || ms <= 0) {
            console.warn('State.js: Invalid interval value:', interval);
            return;
        }

        this.intervalTriggers.set(element, {
            interval: ms,
            lastFire: performance.now(),
            element: element
        });

        if (!this.intervalScheduler) {
            this.intervalScheduler = setInterval(() => {
                const now = performance.now();
                this.intervalTriggers.forEach((data, el) => {
                    if (now - data.lastFire >= data.interval) {
                        const condition = el.getAttribute('data-state-condition');
                        let bindAttr = el.getAttribute('data-state-bind');

                        if (condition && !bindAttr) {
                            const parentState = el.closest('[data-state]');
                            if (parentState && parentState.id) {
                                bindAttr = parentState.id;
                            }
                        }

                        let shouldFire = true;
                        if (condition && bindAttr) {
                            const targetIds = bindAttr.split(',').map(id => id.trim());
                            const targetElement = document.getElementById(targetIds[0]);
                            if (targetElement) {
                                shouldFire = this.evaluateCondition(condition, targetElement);
                            }
                        }

                        if (shouldFire) {
                            el.click();
                        }
                        data.lastFire = now;
                    }
                });
            }, 16);
        }
    }
    textElements = new Map();

    setupTextElement(element) {
        const template = element.getAttribute('data-state-text');
        const bindAttr = element.getAttribute('data-state-bind');
        if (!template || !bindAttr) return;

        const targetIds = bindAttr.split(',').map(id => id.trim());
        const targetElement = document.getElementById(targetIds[0]);
        if (!targetElement) return;

        this.textElements.set(element, {
            template: template,
            targetElement: targetElement
        });

        this.updateTextElement(element);
        const textObserver = new MutationObserver(() => {
            this.textElements.forEach((data, el) => {
                if (data.targetElement === targetElement) {
                    this.updateTextElement(el);
                }
            });
        });
        const watchAttr = targetElement.getAttribute('data-state-watch');
        const attributeFilter = watchAttr ?
            watchAttr.split(',').map(a => `data-${a.trim()}`) :
            null;

        if (attributeFilter) {
            textObserver.observe(targetElement, { attributes: true, attributeFilter: attributeFilter });
        } else {
            textObserver.observe(targetElement, { attributes: true });
        }
    }

    updateTextElement(element) {
        const data = this.textElements.get(element);
        if (!data) return;

        let text = data.template;
        const tokens = text.match(/\{([a-zA-Z][\w-]*)\}/g);
        if (tokens) {
            tokens.forEach(token => {
                const attr = token.slice(1, -1).toLowerCase();
                const value = data.targetElement.getAttribute(`data-${attr}`) || '';
                text = text.replace(token, value);
            });
        }
        element.textContent = text;
    }
    classElements = new Map();

    setupClassElement(element) {
        const bindAttr = element.getAttribute('data-state-bind');
        if (!bindAttr) return;

        const targetIds = bindAttr.split(',').map(id => id.trim());
        const targetElement = document.getElementById(targetIds[0]);
        if (!targetElement) return;

        const classes = [];
        for (let i = 1; i <= 10; i++) {
            const suffix = i === 1 ? '' : `-${i}`;
            const className = element.getAttribute(`data-state-class${suffix}`);
            const condition = element.getAttribute(`data-state-class-condition${suffix}`);
            if (className && condition) {
                classes.push({ className, condition });
            }
        }

        if (classes.length === 0) return;

        this.classElements.set(element, {
            classes: classes,
            targetElement: targetElement
        });

        this.updateClassElement(element);
        const classObserver = new MutationObserver(() => {
            this.classElements.forEach((data, el) => {
                if (data.targetElement === targetElement) {
                    this.updateClassElement(el);
                }
            });
        });
        const watchAttr = targetElement.getAttribute('data-state-watch');
        const attributeFilter = watchAttr ?
            watchAttr.split(',').map(a => `data-${a.trim()}`) :
            null;

        if (attributeFilter) {
            classObserver.observe(targetElement, { attributes: true, attributeFilter: attributeFilter });
        } else {
            classObserver.observe(targetElement, { attributes: true });
        }
    }

    updateClassElement(element) {
        const data = this.classElements.get(element);
        if (!data) return;

        data.classes.forEach(({ className, condition }) => {
            const result = this.evaluateCondition(condition, data.targetElement);
            if (result) {
                element.classList.add(className);
            } else {
                element.classList.remove(className);
            }
        });
    }

    computedStateCache = new Map();
    computeDepth = 0;
    maxComputeDepth = 10;

    setupComputedState(element) {
        const computeAttr = element.getAttribute('data-state-compute');
        if (!computeAttr) return;

        const computations = computeAttr.split(';').map(c => c.trim()).filter(c => c.length > 0);
        const parsed = [];

        computations.forEach(comp => {
            const eqIndex = comp.indexOf('=');
            if (eqIndex === -1) return;
            const name = comp.substring(0, eqIndex).trim();
            const expr = comp.substring(eqIndex + 1).trim();
            if (name && expr) {
                parsed.push({ name, expr });
            }
        });

        if (parsed.length > 0) {
            this.computedStateCache.set(element, parsed);
        }
    }

    updateComputedState(element, styleTarget, idSuffix) {
        const computations = this.computedStateCache.get(element);
        if (!computations) return;

        if (this.computeDepth >= this.maxComputeDepth) {
            console.warn('State.js: Max compute depth reached, possible circular dependency');
            return;
        }

        this.computeDepth++;

        computations.forEach(({ name, expr }) => {
            try {
                const value = this.evaluateExpression(expr, element);
                element.setAttribute(`data-${name}`, String(value));
                styleTarget.setProperty(`--state-${name}${idSuffix}`, value);

                const displayElements = element.querySelectorAll(`[data-state-display="${name}"]`);
                displayElements.forEach(displayEl => {
                    displayEl.textContent = value;
                });
            } catch (e) {
                console.warn('State.js: Error computing', name, ':', e);
            }
        });

        this.computeDepth--;
    }

    evaluateExpression(expr, sourceElement) {
        try {
            const decoded = this.decodeHTMLEntities(expr);
            const processed = decoded.replace(/([a-zA-Z][\w-]*)/g, (match) => {
                const keywords = ['true', 'false', 'null', 'undefined'];
                if (keywords.includes(match.toLowerCase())) {
                    return match;
                }
                const value = sourceElement.getAttribute(`data-${match}`);
                if (value !== null) {
                    const numValue = parseFloat(value);
                    return isNaN(numValue) ? `"${value}"` : numValue;
                }
                return match;
            });

            return Function('"use strict"; return (' + processed + ')')();
        } catch (e) {
            console.warn('State.js: Invalid expression:', expr, e);
            return 0;
        }
    }

    audioContext = null;
    soundBuffers = {};

    initAudioContext() {
        if (this.audioContext) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContextClass();
        } catch (e) {
            console.warn('State.js: Web Audio API not supported');
        }
    }

    playSound(soundName) {
        if (!soundName) return;

        if (!this.audioContext) {
            this.initAudioContext();
            if (!this.audioContext) return;
        }

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        switch(soundName.toLowerCase()) {
            case 'click': {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sawtooth';
                osc.frequency.value = 440;
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
                break;
            }
            case 'levelup': {
                [261.63, 329.63, 392.00].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    const start = now + i * 0.12;
                    gain.gain.setValueAtTime(0.2, start);
                    gain.gain.exponentialRampToValueAtTime(0.01, start + 0.12);
                    osc.start(start);
                    osc.stop(start + 0.12);
                });
                break;
            }
            case 'buy': {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.value = 600;
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            }
            case 'error': {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'square';
                osc.frequency.value = 120;
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
                break;
            }
            case 'coin': {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, now);
                osc.frequency.linearRampToValueAtTime(1200, now + 0.06);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
                osc.start(now);
                osc.stop(now + 0.06);
                break;
            }
            default:
                if (soundName.startsWith('http') || soundName.endsWith('.mp3') || soundName.endsWith('.wav')) {
                    console.warn('State.js: External sound URLs not yet supported:', soundName);
                }
        }
    }

    includeCache = new Map();

    setupInclude(element) {
        const src = element.getAttribute('data-state-include');
        if (!src) return;

        const loadAndInject = (html) => {
            const temp = document.createElement('div');
            temp.innerHTML = html.trim();
            const imported = temp.firstElementChild;

            if (!imported) {
                console.warn('State.js: Invalid include content:', src);
                return;
            }

            Array.from(element.attributes).forEach(attr => {
                if (!attr.name.startsWith('data-state-include')) {
                    imported.setAttribute(attr.name, attr.value);
                }
            });

            element.replaceWith(imported);

            imported.querySelectorAll('[data-state],[data-state-trigger]').forEach(el => {
                this.setupElement(el);
            });
            this.setupElement(imported);
        };

        if (src.startsWith('#')) {
            const templateId = src.slice(1);
            const template = document.getElementById(templateId);

            if (!template) {
                console.warn('State.js: Template not found:', src);
                return;
            }

            if (template.tagName === 'TEMPLATE') {
                const clone = template.content.cloneNode(true);
                const temp = document.createElement('div');
                temp.appendChild(clone);
                loadAndInject(temp.innerHTML);
            } else {
                loadAndInject(template.innerHTML);
            }
            return;
        }

        if (this.includeCache.has(src)) {
            loadAndInject(this.includeCache.get(src));
        } else {
            fetch(src)
                .then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return r.text();
                })
                .then(html => {
                    this.includeCache.set(src, html);
                    loadAndInject(html);
                })
                .catch(e => {
                    console.warn('State.js: Failed to load include:', src, e);
                });
        }
    }

    persistElements = new Set();
    persistDebounceTimers = new Map();

    setupPersist(element) {
        const persist = element.getAttribute('data-state-persist');
        if (persist !== 'true') return;

        const key = element.getAttribute('data-state-persist-key') ||
                    (element.id ? `state-persist-${element.id}` : null);

        if (!key) {
            console.warn('State.js: data-state-persist requires element id or data-state-persist-key');
            return;
        }
        this.loadPersisted(element, key);
        this.persistElements.add({ element, key });
        const watchAttr = element.getAttribute('data-state-watch');
        const attributeFilter = watchAttr ?
            watchAttr.split(',').map(a => `data-${a.trim()}`) :
            null;

        const observer = new MutationObserver(() => {
            this.debounceSave(element, key);
        });

        if (attributeFilter) {
            observer.observe(element, { attributes: true, attributeFilter: attributeFilter });
        } else {
            observer.observe(element, { attributes: true });
        }
    }

    loadPersisted(element, key) {
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const data = JSON.parse(stored);
                Object.keys(data).forEach(attr => {
                    element.setAttribute(`data-${attr}`, data[attr]);
                });
            }
        } catch (e) {
            console.warn('State.js: Failed to load persisted state:', e);
        }
    }

    debounceSave(element, key) {
        if (this.persistDebounceTimers.has(key)) {
            clearTimeout(this.persistDebounceTimers.get(key));
        }

        const timer = setTimeout(() => {
            this.savePersisted(element, key);
            this.persistDebounceTimers.delete(key);
        }, 500);

        this.persistDebounceTimers.set(key, timer);
    }

    savePersisted(element, key) {
        try {
            const watchAttr = element.getAttribute('data-state-watch');
            if (!watchAttr) return;

            const attrs = watchAttr.split(',').map(a => a.trim());
            const data = {};
            attrs.forEach(attr => {
                const value = element.getAttribute(`data-${attr}`);
                if (value !== null) {
                    data[attr] = value;
                }
            });

            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.warn('State.js: Failed to save persisted state:', e);
        }
    }


    dispatchStateEvent(triggerElement, bindAttr, attrName, oldValue, newValue) {
        const eventName = triggerElement.getAttribute('data-state-event');
        if (!eventName) return;

        const targetIds = bindAttr ? bindAttr.split(',').map(id => id.trim()) : [];
        const detail = {
            element: triggerElement,
            attr: attrName,
            oldValue: oldValue,
            newValue: newValue,
            boundId: targetIds[0] || null
        };

        const event = new CustomEvent(`state:${eventName}`, {
            detail: detail,
            bubbles: true,
            cancelable: false
        });

        document.dispatchEvent(event);
    }

    traceEnabled = new Map();

    inspectAll() {
        const result = [];
        this.states.forEach(element => {
            if (element && element.id) {
                result.push(this.inspect(`#${element.id}`));
            }
        });
        return result;
    }

    inspect(selector) {
        const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (!element) return null;

        const config = this.getStateConfig(element);
        const state = {};

        const watchAttrs = config.watchAttrs || [];
        watchAttrs.forEach(attr => {
            const value = element.getAttribute(`data-${attr}`);
            if (value !== null) {
                state[attr] = value;
            }
        });

        config.toggleAttrs.forEach(attr => {
            const value = element.getAttribute(`data-${attr}`);
            state[attr] = value;
        });

        return {
            element: element,
            id: element.id || '(no id)',
            state: state,
            config: config
        };
    }

    trace(attrName, enabled = true) {
        if (enabled) {
            this.traceEnabled.set(attrName, true);
            console.log(`State.js: Tracing enabled for attribute "${attrName}"`);
        } else {
            this.traceEnabled.delete(attrName);
            console.log(`State.js: Tracing disabled for attribute "${attrName}"`);
        }
    }

    logTrace(element, attrName, oldValue, newValue) {
        if (this.traceEnabled.has(attrName)) {
            console.log(`State.js [${attrName}]:`, {
                element: element,
                id: element.id || '(no id)',
                attribute: attrName,
                oldValue: oldValue,
                newValue: newValue
            });
        }
    }
}

window.state = new State();

window.addEventListener('load', state.stateInit, { passive: true });
window.addEventListener('resize', () => {
    state.states.forEach((element) => {
        state.updateElement(element);
    });
}, { passive: true });