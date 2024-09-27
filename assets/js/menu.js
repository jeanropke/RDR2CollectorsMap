class Menu {
  static init() {
    this._warnings = new Set();

    SettingProxy.addSetting(Settings, 'toolType', { default: 3 });
    SettingProxy.addSetting(Settings, 'filterType', { default: 'none' });

    this.addMapZoomSettings();
    this.tippyInstances = [];
    this.tippyRangeInstances = [];
    Loader.mapModelLoaded.then(this.activateHandlers.bind(this));
  }

  static toggleFilterWarning(warning, active) {
    const method = active ? 'add' : 'delete';
    this._warnings[method](warning);
    const filterAlert = document.querySelector('.filter-alert');
    // Preview mode removes this element.
    if (!filterAlert) return;
    filterAlert.style.display = this._warnings.size > 0 ? '' : 'none';
    if (this._warnings.size > 0) {
      filterAlert.setAttribute('data-text', this._warnings.size > 1 ? 'map.has_multi_filter_alert' : this._warnings.values().next().value);
      filterAlert.textContent = Language.get('map.has_multi_filter_alert');
    }

    clearTimeout(this.toggleFilterWarning.timeout);
    this.toggleFilterWarning.timeout = setTimeout(() => {
      filterAlert.style.display = 'none';
    }, 10000);
  }

  /**
   * Add or remove layer of the given list of markers based on the provided method.
   * @param {Array} markers - The list of markers to process.
   * @param {boolean} method - The processing method to apply.
   */
  static onCollectionCategoryToggle(markers, method) {
    markers.forEach(marker => {
      if (method) {
        Layers.itemMarkersLayer.removeLayer(marker.lMarker);
      } else {
        marker.recreateLMarker();
        Layers.itemMarkersLayer.addLayer(marker.lMarker);
        MapBase.updateTippy('tooltip');
      }
    });
  }

  static reorderMenu(menu) {
    if (!menu) return;
    Array.from(menu.children)
      .sort((a, b) => a.textContent.toLowerCase().localeCompare(b.textContent.toLowerCase()))
      .forEach((child) => menu.appendChild(child));
  }

  static addCycleWarning(element, isSameCycle) {
    const category = document.querySelector(element);
    const parentParent = category.parentElement.parentElement;
    const hasCycleWarning = parentParent.querySelector('.same-cycle-warning-menu') !== null;
    if (isSameCycle && !hasCycleWarning) {
      parentParent.setAttribute('data-help', 'item_category_same_cycle');
      const img = document.createElement('img');
      img.classList.add('same-cycle-warning-menu');
      img.src = './assets/images/same-cycle-alert.png';
      category.appendChild(img);
    } else if (!isSameCycle && hasCycleWarning) {
      parentParent.setAttribute('data-help', 'item_category');
      const cycleWarning = category.querySelector('.same-cycle-warning-menu');
      cycleWarning.parentNode.removeChild(cycleWarning);
    }
  }

  static refreshMenu() {
    Collection.updateMenu();
    Menu.addCycleWarning('[data-text="menu.random_spots"]', Cycles.isSameAsYesterday('random'));
    categories.forEach(cat => {
      if (!enabledCategories.includes(cat)) document.querySelectorAll(`.menu-option[data-type="${cat}"]`).forEach(element => { element.classList.add('disabled'); });
    });
  }
  static refreshItemsCounter() {
    const _markers = MapBase.markers.filter(marker => marker.isCurrent && marker.isVisible && marker.toolAccepted());
    const count = _markers.filter(marker => marker.isCollected).length;
    const max = _markers.length;

    // Preview mode removes these elements.
    const collectablesCounter = document.querySelector('.collectables-counter');
    if (collectablesCounter)
      collectablesCounter.textContent = Language.get('menu.collectables_counter')
        .replace('{count}', count)
        .replace('{max}', max);

    const itemCounter = document.getElementById('item-counter');
    if (itemCounter)
      itemCounter.textContent = Language.get('menu.collection_counter')
        .replace('{count}', count)
        .replace('{max}', max);

    const itemCounterPercentage = document.getElementById('item-counter-percentage');
    if (itemCounterPercentage)
      itemCounterPercentage.textContent = Language.get('menu.collection_counter_percentage')
        .replace('{count}', (max ? (count / max * 100) : 0).toFixed(2));

    const itemsValue = document.getElementById('items-value');
    if (itemsValue && Collection.collections) {
      const startValue = parseFloat(itemsValue.textContent.replace('$', '')) || 0;
      const endValue = Collection.totalValue();
      animateValue(itemsValue, startValue, endValue, 1000);
      Collection.collections.forEach(collection => collection.updateCounter());
    }
  }

  static addMapZoomSettings() {
    SettingProxy.addSetting(Settings, 'zoomSnap', { default: 0 });
    SettingProxy.addSetting(Settings, 'zoomDelta', { default: 0.5 });
    SettingProxy.addSetting(Settings, 'wheelDebounceTime', { default: 150 });
    SettingProxy.addSetting(Settings, 'wheelPxPerZoomLevel', { default: 70 });

    const inputsMap = new Map();

    function createInputContainer({ key, min, max, value, defaultValue, step = 1, isFloat = false }) {
      const id = key.replace(/_/g, '-');
      const settingsKey = key
        .replace(/^map_/, '')
        .split('_')
        .map((part, idx) => idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
      const container = document.querySelector(`.input-container[data-help="${key}"]`);
      const isDesktop = window.matchMedia('(min-width: 768px)').matches;
      const inputType = isDesktop ? 'range' : 'number';
    
      container.innerHTML = `
        <label for="${id}" data-text="menu.${key}"></label>
        <input id="${id}" class="input-text ${isDesktop ? 'type-range zoom-wheel-type-range' : 'narrow-select-menu'}" type="${inputType}" min="${min}" max="${max}" value="${value}" step="${step}" data-tippy-content-range=""/>
        ${inputType === 'range' ? `<div class="type-range-tooltip"></div>` : ''}
      `;
    
      const input = document.getElementById(id);
      inputsMap.set(input, defaultValue);

      input.addEventListener('change', function () {
        let inputValue = isFloat ? parseFloat(this.value) : parseInt(this.value);
        if (isNaN(inputValue) || inputValue < min || inputValue > max) inputValue = defaultValue;
        this.value = isFloat ? inputValue.toFixed(1) : Math.round(inputValue);
        Settings[settingsKey] = inputValue;
        MapBase.map.options[settingsKey] = inputValue;
      });
    }

    createInputContainer({ 
      key: 'map_zoom_snap',
      min: 0, max: 3, value: Settings.zoomSnap, defaultValue: 0,
      step: 0.1, isFloat: true,
    });
    createInputContainer({
      key: 'map_zoom_delta',
      min: 0, max: 2, value: Settings.zoomDelta, defaultValue: 0.5,
      step: 0.1, isFloat: true,
    });
    createInputContainer({
      key: 'map_wheel_debounce_time',
      min: 40, max: 200, value: Settings.wheelDebounceTime, defaultValue: 150,
      step: 10, isFloat: false,
    });
    createInputContainer({
      key: 'map_wheel_px_per_zoom_level',
      min: 20, max: 150, value: Settings.wheelPxPerZoomLevel, defaultValue: 70,
      step: 10, isFloat: false,
    });

    const reset = document.getElementById('reset-map-zoom');
    reset.addEventListener('click', () => {
      const zoomSettings = ['map_zoom_snap', 'map_zoom_delta', 'map_wheel_debounce_time', 'map_wheel_px_per_zoom_level'
      ].map((key) =>
        key
          .replace(/^map_/, '')
          .split('_')
          .map((part, idx) => idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
          .join('')
      );
      Object.keys(localStorage)
        .filter((key) => zoomSettings.some((k) => key.includes(k)))
        .forEach((key) => localStorage.removeItem(key));

      inputsMap.forEach((defaultValue, input) => {
        input.value = defaultValue;
        input.dispatchEvent(new Event('change'));
      });

      Menu.updateRangeTippy();
    })
  }

  static updateFancySelect() {
    document.querySelectorAll('select:not(.fsb-ignore)').forEach((selectEl) => FancySelect.update(selectEl));

    const tempSpan = document.createElement('span');
    Object.assign(tempSpan.style, { visibility: 'hidden', position: 'absolute', whiteSpace: 'nowrap' });
    document.body.appendChild(tempSpan);
    document.querySelectorAll('.fsb-option').forEach((option) => {
      tempSpan.textContent = option.textContent;
      const textWidth = tempSpan.offsetWidth;
      option.style.fontSize = `${Math.min(Math.max(10, 32 - textWidth / 10), 13)}px`;
    });
    document.body.removeChild(tempSpan);

    document.querySelectorAll('.fsb-select').forEach((selectWrapper) => {
      const fsbBtn = selectWrapper.querySelector('.fsb-button');
      const text = fsbBtn.querySelector('span').textContent;
      fsbBtn.setAttribute('title', text);
      selectWrapper.querySelectorAll('.fsb-option').forEach((option) => {
        option.addEventListener('click', () => fsbBtn.setAttribute('title', option.textContent));
      });
    });

    document.querySelectorAll('.fsb-button').forEach((el) => {
      el.addEventListener('click', () => {
        const scrollPos = document.querySelector('aside').scrollTop;
        setTimeout(() => document.querySelector('aside').scrollTop = scrollPos, 0);
      });
    });
  }

  static activateHandlers() {
    document.getElementById('clear_highlights').addEventListener('click', function () {
      Item.clearImportantItems();
    });

    // change cycles from menu (if debug options are enabled)
    document.getElementById('cycle-prev').addEventListener('click', Cycles.prevCycle);
    document.getElementById('cycle-next').addEventListener('click', Cycles.nextCycle);

    //toggle one collection category or disable/enable all at once
    document.querySelectorAll('.menu-option[data-type], .links-container button[data-text^="menu."][data-text$="_all"]').forEach(item => {
      item.addEventListener('click', function() {
        const category = this.getAttribute('data-type');
        const toEnable = category ? this.classList.contains('disabled') : this.getAttribute('data-text') === 'menu.show_all';
        const allButtons = document.querySelectorAll('.menu-option[data-type], .menu-hidden[data-type]');
        const buttons = category ? [...allButtons].filter(btn => btn.getAttribute('data-type') === category) : allButtons;

        buttons.forEach(btn => btn.classList.toggle('disabled', !toEnable));

        if (category && toEnable) {
          enabledCategories.push(category);

          if (enabledCategories.arrayContains(parentCategories['jewelry_random']) && parentCategories['jewelry_random'].includes(category)) {
            enabledCategories.push('jewelry_random');
          } else if (enabledCategories.arrayContains(parentCategories['fossils_random']) && parentCategories['fossils_random'].includes(category)) {
            enabledCategories.push('fossils_random');
          }

          if (Weekly.current && Weekly.current.items.every(item => enabledCategories.includes(item.category)) && !enabledCategories.includes('weekly')) {
            enabledCategories.push('weekly');
          }

        } else if (category) { // disable
          enabledCategories = enabledCategories.filter(cat => cat !== category);

          if (!enabledCategories.arrayContains(parentCategories['jewelry_random'])) {
            enabledCategories = enabledCategories.filter(cat => cat !== 'jewelry_random');
          } else if (!enabledCategories.arrayContains(parentCategories['fossils_random'])) {
            enabledCategories = enabledCategories.filter(cat => cat !== 'fossils_random');
          }

          if (Weekly.current && Weekly.current.items.reduce((acc, item) => acc + +(item.category == category), 0)) {
            enabledCategories = enabledCategories.filter(cat => cat !== 'weekly');
          }

        } else {
          enabledCategories = toEnable ? categories : [];
        }
        localStorage.setItem("rdr2collector.enabled-categories", JSON.stringify(enabledCategories));

        if (!category) {
          MapBase.addMarkers();
          Treasure.onCategoryToggle();
          Legendary.onCategoryToggle();
          Pins.onCategoryToggle();
        } else if (
          ['nazar', 'fast_travel', 'user_pins', 'treasure', 'legendary_animals'].includes(category)
        ) {
          switch (category) {
            case 'nazar':
              MadamNazar.addMadamNazar();
              break;
            case 'fast_travel':
              MapBase.onFastTravelToggle();
              break;
            case 'user_pins':
              Pins.onCategoryToggle();
              break;
            case 'treasure':
              Treasure.onCategoryToggle();
              break;
            case 'legendary_animals':
              Legendary.onCategoryToggle();
              break;
          }
        } else if (Settings.toolType !== 3 || Settings.filterType !== 'none' || document.getElementById('search').value || Settings.isDebugEnabled) {
            MapBase.addMarkers();
        } else if (parentCategories['fossils_random'].includes(category)) {
            const markers = MapBase.markers.filter(marker => marker.cycleName == Cycles.categories[category] && marker.category === 'fossils_random');
            const totalEnabled = parentCategories['fossils_random'].reduce((total, type) => total + (document.querySelector(`.menu-option[data-type="${type}"]`).classList.contains('disabled') ? 0 : 1), 0);
            
            if (totalEnabled === 0 || (toEnable && totalEnabled === 1)) {
              Menu.onCollectionCategoryToggle(markers, totalEnabled === 0);
            }
        } else if (parentCategories['jewelry_random'].includes(category)) {
            const totalEnabled = parentCategories['jewelry_random'].reduce((total, type) => total + (document.querySelector(`.menu-option[data-type="${type}"]`).classList.contains('disabled') ? 0 : 1), 0);
            
            if (totalEnabled === 0 || (toEnable && totalEnabled === 1)) {
              const markers = MapBase.markers.filter(marker => marker.cycleName == Cycles.categories[category] && (marker.category === category || marker.category === 'jewelry_random'));

              Menu.onCollectionCategoryToggle(markers, !toEnable || totalEnabled === 0);
            } else {
                const markers = MapBase.markers.filter(marker => marker.cycleName == Cycles.categories[category] && (marker.category === category));

                Menu.onCollectionCategoryToggle(markers, !toEnable);
            }

            Item.reinitImpItemsOnCat(category);
        } else {
            const markers = MapBase.markers.filter(marker => marker.cycleName == Cycles.categories[category] && marker.category === category);

            Menu.onCollectionCategoryToggle(markers, !toEnable);
            
            if (['flower', 'cups', 'swords', 'wands', 'pentacles', 'bottle', 'egg', 'heirlooms'].includes(category)) {
              Item.reinitImpItemsOnCat(category);
            }
        }
      });
    });  
    const help = document.getElementById('help-container');
    const helpParagraph = help.querySelector('p');
    document.querySelectorAll('.side-menu, .top-widget, .lat-lng-container').forEach(element => {
      element.addEventListener('mouseover', event => {
        const target = event.target;
        // keep current help if pointer jumped to help container or it overgrew current pointer pos.
        if (help.contains(target)) return;
        const helpTransId = target.closest('[data-help]')?.getAttribute('data-help') || 'default';
        // Used only for jewelry that appears in some cycles
        if (helpTransId.includes('timestamp')) {
          const itemId = target.closest('[data-help]')?.getAttribute('data-type');
          const timestamp = MapBase.jewelryTimestamps[itemId];
          helpParagraph.innerHTML = Language.get(`help.${helpTransId}`)
            .replace('{day}', new Date(timestamp * 1000).toLocaleDateString(Settings.language, { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }));
          return;
        }
        helpParagraph.innerHTML = Language.get(`help.${helpTransId}`);
      });
    });

    const tools = document.getElementById('tools');
    tools.addEventListener('change', function () {
      Settings.toolType = +this.value;
      MapBase.addMarkers();
    });
    tools.value = Settings.toolType;

    SettingProxy.addListener(Settings, 'toolType', () =>
      this.toggleFilterWarning('map.has_tool_filter_alert', Settings.toolType !== 3))();

    SettingProxy.addListener(Settings, 'filterType', () => {
      this.toggleFilterWarning('map.has_filter_type_alert', Settings.filterType !== 'none');
      document.getElementById('filter-min-amount-items').parentNode.style.display = ['lowInventoryItems', 'lowInventoryItemsAndRandom'].includes(Settings.filterType) && InventorySettings.isEnabled ? '' : 'none';
      filterMapMarkers();
    })();

    SettingProxy.addListener(InventorySettings, 'maxAmountLowInventoryItems', () => {
      filterMapMarkers();
    });

    SettingProxy.addListener(Settings, 'markerColor', () => document.getElementById('open-custom-marker-color-modal').style.display = Settings.markerColor === 'custom' ? '' : 'none')();

    SettingProxy.addListener(InventorySettings, 'isEnabled', () => {
      document.getElementById('filter-min-amount-items').parentNode.style.display = (['lowInventoryItems', 'lowInventoryItemsAndRandom'].includes(Settings.filterType) && InventorySettings.isEnabled) ? '' : 'none';
      document.querySelector('#filter-type option[value="lowInventoryItems"]').style.display = InventorySettings.isEnabled ? '' : 'none';
    })();

    // Preview mode removes this element.
    const filterAlert = document.querySelector('.filter-alert');
    if (filterAlert)
      filterAlert.addEventListener('click', function () {
        this.style.display = 'none';
      });

    // “random” category still needs this (other collectibles have handlers in their class)
    document.querySelectorAll('.menu-option.clickable input').forEach(input => {
      input.addEventListener('click', function (event) {
        event.stopPropagation();
      });

      input.addEventListener('change', function (event) {
        const el = event.target;
        Cycles.categories[el.getAttribute("name")] = parseInt(el.value);
        MapBase.addMarkers();
        Menu.refreshMenu();
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === ' ') {
        document.querySelector('.menu-toggle').click();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        if (overrideSearch.checked) {
          event.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
      }
    });
  }

  static updateTippy() {
    Menu.tippyInstances.forEach(instance => instance.destroy());
    Menu.tippyInstances = [];

    Menu.tippyInstances = tippy('[data-tippy-content]', { theme: 'menu-theme' });
  }

  static updateRangeTippy() {
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    if (isDesktop) {
      Menu.tippyRangeInstances.forEach((instance) => instance.destroy());
      Menu.tippyRangeInstances = [];
  
      Menu.tippyRangeInstances = tippy('[data-tippy-content-range]', {
        theme: 'menu-theme',
        hideOnClick: false,
        arrow: false,
        placement: 'top',
        offset: [0, 12],
        content: (reference) => reference.value,
        trigger: 'mouseenter input pointerdown pointerup',
        onTrigger: (instance, event) => {
          if (event.type === 'input' || event.type === 'pointerdown') {
            instance.setContent(instance.reference.value);
            instance.show();
          }
          if (event.type === 'pointerup') {
            setTimeout(() => instance.hide(), 0);
          }
        }
      });
    }
  }
}