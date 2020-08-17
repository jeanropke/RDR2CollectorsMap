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
    $('.filter-alert')
      .toggle(this._warnings.size > 0)
      .attr('data-text', this._warnings.size > 1 ? 'map.has_multi_filter_alert' :
        this._warnings.values().next().value)
      .translate();
  }

  static reorderMenu(menu) {
    $(menu).children().sort(function (a, b) {
      return a.textContent.toLowerCase().localeCompare(b.textContent.toLowerCase());
    }).appendTo(menu);
  }

  static addCycleWarning(element, isSameCycle) {
    const hasCycleWarning = $(`${element} .same-cycle-warning-menu`).length > 0;
    const category = $(element);
    if (isSameCycle && !hasCycleWarning) {
      category.parent().parent().attr('data-help', 'item_category_same_cycle');
      category.append(`<img class="same-cycle-warning-menu" src="./assets/images/same-cycle-alert.png">`);
    } else if (!isSameCycle && hasCycleWarning) {
      category.parent().parent().attr('data-help', 'item_category');
      category.children('.same-cycle-warning-menu').remove();
    }
  }

  static refreshMenu() {
    Collection.updateMenu();
    Menu.addCycleWarning('[data-text="menu.random_spots"]', Cycles.isSameAsYesterday('random'));
    categories.forEach(cat => {
      if (!enabledCategories.includes(cat)) $(`[data-type="${cat}"]`).addClass('disabled');
    });
  }

  static refreshCollectionCounter(category) {
    const collectiblesElement = $(`.menu-hidden[data-type="${category}"]`);
    collectiblesElement.find('.collection-collected').text(Language.get('menu.collection_counter')
      .replace('{count}', collectiblesElement.find('.disabled').length)
      .replace('{max}', collectiblesElement.find('.collectible-wrapper').length));
  }

  static refreshItemsCounter() {
    const _markers = MapBase.markers.filter(marker => marker.isCurrent && marker.isVisible);
    const count = _markers.filter(marker => marker.isCollected).length;
    const max = _markers.length;

    $('.collectables-counter').text(Language.get('menu.collectables_counter')
      .replace('{count}', count)
      .replace('{max}', max));

    $('#item-counter').text(Language.get('menu.collection_counter')
      .replace('{count}', count)
      .replace('{max}', max));

    $('#item-counter-percentage').text(Language.get('menu.collection_counter_percentage')
      .replace('{count}', (count / max * 100).toFixed(2)));

    Menu.refreshTotalInventoryValue();

    $.each($(".menu-hidden[data-type]"), function (key, value) {
      const category = $(value).attr('data-type');
      Menu.refreshCollectionCounter(category);
    });
  }

  static refreshTotalInventoryValue() {
    $('#items-value').text(`$${Collection.totalValue().toFixed(2)}`);
  }

  static activateHandlers() {
    $('#clear_highlights').on('click', function () {
      MapBase.clearImportantItems();
    });

    // change cycles from menu (if debug options are enabled)
    $('#cycle-prev').on('click', Cycles.prevCycle);
    $('#cycle-next').on('click', Cycles.nextCycle);

    //toggle one collection category or disable/enable all at once
    $('.menu-option[data-type], .links-container a[data-text^="menu."][data-text$="_all"]')
      .on('click', function () {
        const $this = $(this);
        const category = $this.attr('data-type');
        const toEnable = category ? $this.hasClass('disabled') :
          $this.attr('data-text') === 'menu.show_all';
        const $allButtons = $('.menu-option[data-type], .menu-hidden[data-type]');
        const $buttons = category ? $allButtons.filter(`[data-type="${category}"]`) :
          $allButtons;

        $buttons.toggleClass('disabled', !toEnable);

        if (category && toEnable) {
          enabledCategories.push(category);

          if (enabledCategories.arrayContains(parentCategories['jewelry_random']) && parentCategories['jewelry_random'].includes(category)) {
            enabledCategories.push('jewelry_random');
          } else if (enabledCategories.arrayContains(parentCategories['fossils_random']) && parentCategories['fossils_random'].includes(category)) {
            enabledCategories.push('fossils_random');
          } else if (category === 'heirlooms' && !enabledCategories.includes('heirlooms_random')) {
            enabledCategories.push('heirlooms_random');
          }

          if (Weekly.current.items.every(item => enabledCategories.includes(item.category)) && !enabledCategories.includes('weekly')) {
            enabledCategories.push('weekly');
          }

        } else if (category) { // disable
          enabledCategories = enabledCategories.filter(cat => cat !== category);

          if (!enabledCategories.arrayContains(parentCategories['jewelry_random'])) {
            enabledCategories = enabledCategories.filter(cat => cat !== 'jewelry_random');
          } else if (!enabledCategories.arrayContains(parentCategories['fossils_random'])) {
            enabledCategories = enabledCategories.filter(cat => cat !== 'fossils_random');
          } else if (category === 'heirlooms') {
            enabledCategories = enabledCategories.filter(cat => cat !== 'heirlooms_random');
          }

          if (Weekly.current.items.reduce((acc, item) => acc + +(item.category === category), 0)) {
            enabledCategories = enabledCategories.filter(cat => cat !== 'weekly');
          }

        } else {
          enabledCategories = toEnable ? categories : [];
        }
        localStorage.setItem("enabled-categories", JSON.stringify(enabledCategories));

        if (!category) {
          MapBase.addMarkers();
          Treasure.onCategoryToggle();
          Pins.addToMap();
        } else if (category === 'user_pins') {
          Pins.addToMap();
        } else if (category === 'treasure') {
          Treasure.onCategoryToggle();
        } else {
          MapBase.addMarkers();
        }
      });
    const help = document.getElementById('help-container');
    const $helpParagraph = $(help).children('p');
    $('.side-menu, .top-widget, .lat-lng-container')
      .on('mouseover mouseout', event => {
        const target = event.type === 'mouseover' ? event.target : event.relatedTarget;
        // keep current help if pointer jumped to help container or it overgrew current pointer pos.
        if (help.contains(target)) return;
        const helpTransId = $(target).closest('[data-help]').attr('data-help') || 'default';
        $helpParagraph.html(Language.get(`help.${helpTransId}`));
      });

    SettingProxy.addListener(Settings, 'toolType', () =>
      this.toggleFilterWarning('map.has_tool_filter_alert', Settings.toolType !== 3))();
    $('#tools')
      .on('change', function () {
        Settings.toolType = +$(this).val();
        MapBase.addMarkers();
      })
      .val(Settings.toolType);

    SettingProxy.addListener(Settings, 'filterType', () =>
      this.toggleFilterWarning('map.has_filter_type_alert', Settings.filterType !== 'none'))();
    $('#filter-type')
      .on('change', function () {
        Settings.filterType = $(this).val();
        filterMapMarkers();
      })
      .val(Settings.filterType)
      .triggerHandler('change');

    $('.filter-alert').on('click', function () {
      $(this).hide();
    });
  }
}