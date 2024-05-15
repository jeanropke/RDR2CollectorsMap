class Menu {
  static init() {
    this._warnings = new Set();

    SettingProxy.addSetting(Settings, 'toolType', {
      default: 3
    });
    SettingProxy.addSetting(Settings, 'filterType', {
      default: 'none'
    });
    Loader.mapModelLoaded.then(this.activateHandlers.bind(this));
  }

  static toggleFilterWarning(warning, active) {
    const method = active ? 'add' : 'delete';
    this._warnings[method](warning);
    const filterAlert = document.querySelector('.filter-alert');
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

    document.querySelector('.collectables-counter').textContent = Language.get('menu.collectables_counter')
      .replace('{count}', count)
      .replace('{max}', max);

    document.getElementById('item-counter').textContent = Language.get('menu.collection_counter')
      .replace('{count}', count)
      .replace('{max}', max);

    document.getElementById('item-counter-percentage').textContent = Language.get('menu.collection_counter_percentage')
      .replace('{count}', (max ? (count / max * 100) : 0).toFixed(2));

    document.getElementById('items-value').textContent = `$${Collection.totalValue().toFixed(2)}`;

    Collection.collections.forEach(collection => collection.updateCounter());
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

    document.querySelector('.filter-alert').addEventListener('click', function () {
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
      if (event.keyCode === 32 && event.ctrlKey) {
        document.querySelector('.menu-toggle').click();
      }
    });
  }
}