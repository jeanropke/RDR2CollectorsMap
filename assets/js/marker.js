class Marker {
  /**
   * use:
   *   .markerId: "flower_wild_rhubarb_6_2"
   *   .itemId: "flower_wild_rhubarb"
   *   .category: "flower"
   *   .cycleName: "2"
   *   .itemNumber: 6  (1 if available only once per cycle)
   *   .itemNumberStr: "#6"  ("" if available only once per cycle)
   *   .legacyItemId: "wild_rhubarb"
   *     is an item id, sometimes unequal to `.itemId`, but also unique of course
   *     internally incoherent (sometimes contains category, sometimes not)
   *     use `.itemId` unless persistent storage with `.legacyItemId` data is involved
   *   .descriptionKey: "flower_wild_rhubarb_6_2.desc"
   *   .itemTranslationKey: "flower_wild_rhubarb.name"
   * do not use:
   *   .text
   *   .subdata
   *     if you want to check for egg&flower, use `['egg', 'flower'].includes(marker.category)`
   *     if you need a unique item id, use `.itemId`
   *     if you use `marker.subdata || marker.text` use `.legacyItemId` now and `.itemId` soon
   *   .day
   *     renamed to .cycleName, was and is a string
   */
  constructor(preliminaryMarker, cycleName, category) {
    Object.assign(this, preliminaryMarker);
    const match = this.text.match(/^(.+?)(?:_(\d+))?$/);
    this.itemId = match[1];
    this.itemNumber = match[2] ? +match[2] : 1;
    this.itemNumberStr = match[2] ? `#${this.itemNumber}` : '';
    this.itemTranslationKey = `${this.itemId}.name`;
    this.cycleName = cycleName;
    this.day = this.cycleName;
    this.markerId = `${this.text}_${this.cycleName}`;
    this.category = category;
    this.subdata = ['egg', 'flower'].includes(this.category) ?
      this.itemId.replace(`${this.category}_`, '') : undefined;
    this.legacyItemId = this.subdata || this.text;
    this.item = this.category === 'random' ? undefined : Item.items.find(item =>
      item.itemId === this.itemId);

    /**
     * `._collectedKey` is the key for the `.isCollected` accessors
     * - the data they represent are best described as “legacy non-sense”, if I’m allowed to say
     * - it is not per-marker (so it can’t properly represent “spot _is collected_”)
     * - it is not per-item (so it can’t properly show/hide an item)
     * - it is one marker per cycle
     * - it covers an item for items available once per day/cycle
     * - for items with several markers per day/cycle, it covers one of them
     *   - and it covers the same share for tomorrow as well (and so forth)
     * Dependings on the “reset marker daily” setting, the user will use this
     * property either for visibility purposes (show/fade/hide) (→do not reset daily),
     * or actually for remembering what was collected (→reset daily).
     * There should be two properties, one for “collected” per marker (i.e. Marker class),
     * and one for “visibility” per item (in a new Item class).
     * Both should drive how faded the marker is going to be.
     */
    this._collectedKey = `collected.${this.text}`;

    /**
     * Used to display per-item descriptions.
     * Kept in case we need to change this later.
     * 
     * @returns {string} The translatable key of the primary description.
     */
    this.primaryDescriptionKey = (() => {
      if (this.category === 'random') {
        return `${this.text}.desc`;
      } else if (this.category === 'arrowhead') {
        return "arrowhead_random.desc";
      } else if (this.category === 'coin') {
        return "coin_random.desc";
      } else if (this.category === 'fossils_random') {
        return "fossils_random.desc";
      } else if (this.category === 'jewelry_random') {
        return "jewelry_random.desc";
      } else if (this.category === 'heirlooms_random') {
        return "heirlooms_random.desc";
      } else {
        return `${this.markerId}.desc`;
      }
    })();

    /**
     * Used to display descriptions per category.
     * 
     * @returns {string} The translatable key of the secondary description.
     */
    this.secondaryDescriptionKey = (() => {
      if (this.category === 'random') {
        return 'map.random_spot.desc';
      }

      switch (this.itemId) {
        case 'flower_agarita':
        case 'flower_blood_flower':
          return 'map.flower_type.night_only';
        case 'flower_creek_plum':
          return 'map.flower_type.bush';
        case 'egg_spoonbill':
        case 'egg_heron':
        case 'egg_eagle':
        case 'egg_hawk':
        case 'egg_egret':
          return 'map.egg_type.tree';
        case 'egg_vulture':
          return 'map.egg_type.stump';
        case 'egg_duck':
        case 'egg_goose':
        case 'egg_loon':
          return 'map.egg_type.ground';
        default:
          return '';
      }
    })();
  }

  get isCollected() {
    return !!localStorage.getItem(this._collectedKey);
  }
  set isCollected(value) {
    if (value) {
      localStorage.setItem(this._collectedKey, 'true');
    } else {
      localStorage.removeItem(this._collectedKey);
    }
  }
  get canCollect() {
    if (this.isCollected) {
      return false;
    } else if (this.category === 'random') {
      return true;
    } else if (InventorySettings.isEnabled && this.item) {
      const stackName = (this.category === 'flower') ? 'flowersSoftStackSize' : 'stackSize';
      return this.item.amount < InventorySettings[stackName];
    } else {
      return true;
    }
  }
  get isCurrent() {
    // Cycles might serve numbers instead of strings
    return this.cycleName == Cycles.categories[this.category];
  }
  get isVisible() {
    if (
      this.category === 'heirlooms_random' &&
      !enabledCategories.includes('heirlooms')
    ) return false;
    if (
      this.category === 'jewelry_random' &&
      !enabledCategories.includes('bracelet') &&
      !enabledCategories.includes('earring') &&
      !enabledCategories.includes('necklace') &&
      !enabledCategories.includes('ring')
    ) return false;
    if (
      this.category === 'fossils_random' &&
      !enabledCategories.includes('coastal') &&
      !enabledCategories.includes('oceanic') &&
      !enabledCategories.includes('megafauna')
    ) return false;

    return (this.isCurrent || MapBase.showAllMarkers) &&
      uniqueSearchMarkers.includes(this) &&
      (
        enabledCategories.includes(this.category) ||
        (this.item && this.item.isWeekly() && enabledCategories.includes("weekly"))
      );
  }

  toolAccepted() {
    return Settings.toolType >= this.tool || Settings.toolType === -this.tool ? true : false;
  }

  colorUrls() {
    const url = ([base, contour]) => [
      `assets/images/icons/marker_${base}.png`,
      `assets/images/icons/contours/contour_marker_${contour}.png`,
    ];
    const markerColor = Settings.markerColor;
    if (markerColor.startsWith('auto')) {
      const [, normal, dark] = markerColor.split('_');
      return url(MapBase.isDarkMode ? [dark, normal] : [normal, dark]);
    }

    let base;
    if (this.item && this.item.isWeekly()) {
      base = 'green';
    } else if (markerColor === 'by_category') {
      base = {
        flower: 'darkred',
        cups: 'blue',
        swords: 'blue',
        wands: 'blue',
        pentacles: 'blue',
        bracelet: 'beige',
        necklace: 'orange',
        ring: 'orange',
        earring: 'orange',
        bottle: 'cadetblue',
        egg: 'white',
        arrowhead: 'darkpurple',
        heirlooms: 'purple',
        coin: 'lightred'
      } [this.category] || 'lightred';
    } else if (markerColor === 'by_cycle') {
      base = ['blue', 'orange', 'purple', 'darkpurple', 'darkred', 'darkblue'][+this.cycleName - 1] || 'lightred';
    } else {
      base = markerColor;
    }
    const contour = {
      beige: 'darkblue',
      black: 'white',
      blue: 'orange',
      cadetblue: 'lightred',
      darkblue: 'red',
      darkgreen: 'purple',
      darkpurple: 'green',
      darkred: 'blue',
      green: 'pink',
      lightred: 'cadetblue',
      orange: 'lightblue',
      purple: 'lightgreen',
      white: 'gray'
    } [base] || 'darkblue';
    return url([base, contour]);
  }

  popupContent() {
    const unknownCycle = this.cycleName == Cycles.unknownCycleNumber;
    const snippet = $(`<div class="handover-wrapper-with-no-influence">
      <h1>
        <span data-text="${this.itemTranslationKey}"></span>
        ${this.itemNumberStr} -
        <span data-text="menu.day"></span>
        <span data-text="${unknownCycle ? 'map.unknown_cycle' : this.cycleName}"></span>
      </h1>
      <span class="marker-warning-wrapper">
        <div>
          <img class="warning-icon" height=32 width=32 src="./assets/images/same-cycle-alert.png" alt="Alert">
        </div>
        <p data-text="map.unknown_cycle_description"></p>
        <p data-text="map.same_cycle_yesterday"></p>
      </span>
      <span class="marker-content-wrapper">
          <div>
            <img class="tool-type" height=32 width=32 src="assets/images/shovel.png">
          </div>
          <div>
            <p class="unavailable-item" data-text="map.item.unable"></p>
            <p class="primary-description" data-text="${this.primaryDescriptionKey}" data-text-optional="true"></p>
            <p class="secondary-description" data-text="${this.secondaryDescriptionKey}" data-text-optional="true"></p>
            <p class="weekly-item" data-text="weekly.desc"></p>
          </div>
      </span>
      <p class='marker-popup-links'>
        <a href="" data-text="map.copy_link"></a>
        <span>| <a href="${this.video}" target="_blank" data-text="map.video"></a></span>
        <span>| <a href="" data-text="map.mark_important"></a></span>
      </p>
      <small class="popupContentDebug">Latitude: ${this.lat} / Longitude: ${this.lng}</small>
      <div class="marker-popup-buttons">
          <button class="btn btn-danger">↓</button>
          <small></small>
          <button class="btn btn-success">↑</button>
      </div>
      <button type="button" class="btn btn-info remove-button" data-item="${this.text}"
        data-text="map.remove_add">
      </button>
    </div>`);

    snippet.find('.marker-popup-links')
      .find('[data-text="map.copy_link"]')
      .click((e) => {
        e.preventDefault();
        setClipboardText(`https://jeanropke.github.io/RDR2CollectorsMap/?m=${this.text}`);
      })
      .end()
      .find('[data-text="map.mark_important"]')
      .click((e) => {
        e.preventDefault();
        MapBase.highlightImportantItem(this.text, this.category);
      });
    snippet.find('.remove-button').click(() =>
      MapBase.removeItemFromMap(this.cycleName, this.text, this.subdata || '', this.category));
    if (!Cycles.isSameAsYesterday(this.category) && !unknownCycle) {
      snippet.find('.marker-warning-wrapper').hide();
    } else {
      if (unknownCycle) {
        snippet.find('[data-text="map.same_cycle_yesterday"]').hide();
      } else {
        snippet.find('[data-text="map.unknown_cycle_description"]').hide();
      }
    }
    snippet
      .find('[data-text="weekly.desc"]').toggle(this.item && this.item.isWeekly()).end()
      .find('[data-text="map.item.unable"]').toggle(this.buggy).end()
    const toolImg = snippet.find('.tool-type');
    if (!this.buggy && this.tool === 0) {
      toolImg.hide();
    } else {
      const imgName = this.buggy ? 'cross' : {1: 'shovel', 2: 'magnet'}[this.tool];
      toolImg.attr('src', `assets/images/${imgName}.png`);
    }
    if (!Settings.isDebugEnabled) snippet.find('.popupContentDebug').hide();
    if (!this.video) snippet.find('[data-text="map.video"]').parent().hide();
    if (['flower_agarita', 'flower_blood_flower'].includes(this.itemId) ||
    ['random', 'fossils_random', 'heirlooms_random', 'jewelry_random', 'coin', 'arrowhead'].includes(this.category)) {
      snippet.find('[data-text="map.mark_important"]').parent().hide();
    }
    const inventoryButtons = snippet.find('.marker-popup-buttons')
    if (InventorySettings.isEnabled && InventorySettings.isPopupsEnabled &&
      this.category !== 'random' && this.item) {
      inventoryButtons.find('small')
        .toggleClass('text-danger', this.item.amount >= InventorySettings.stackSize)
        .attr('data-item', this.text)
        .text(this.item.amount);
      inventoryButtons.find('button').click(e =>
        Inventory.changeMarkerAmount(this.legacyItemId,
          $(e.target).hasClass('btn-danger') ? -1 : 1));
    } else {
      inventoryButtons.hide();
    }

    return Language.translateDom(snippet)[0];
  }
  updateColor() {
    if (!this.lMarker) return;
    const [bgUrl, contourUrl] = this.colorUrls();
    $(this.lMarker.getElement())
      .find('img.marker-contour').attr('src', contourUrl)
      .end()
      .find('img.background').attr('src', bgUrl);
  }
  recreateLMarker(opacity = Settings.markerOpacity, markerSize = Settings.markerSize) {
    const icon = this.category !== 'random' ? this.category :
      (this.tool === 1 ? 'shovel' : 'magnet');
    const [bgUrl, contourUrl] = this.colorUrls();
    const aii = 'assets/images/icons';
    const snippet = $(`<div>
      <img class="overlay" src="${aii}/overlay_cross.png" alt="crossed out">
      <img class="marker-contour" src="${contourUrl}" alt="markerContour">
      <img class="icon" src="${aii}/${icon}.png" alt="Icon">
      <img class="background" src="${bgUrl}" alt="Background">
      <img class="shadow" width="${35 * markerSize}"
        height="${16 * markerSize}" src="./assets/images/markers-shadow.png" alt="Shadow">
    </div>`);

    Settings.isShadowsEnabled || snippet.find('.shadow').remove();
    {
      let detail = false;
      if (this.buggy) {
        detail = ['cross', 'crossed out'];
      } else if (['flower_agarita', 'flower_blood_flower'].includes(this.itemId)) {
        detail = ['time', 'timed'];
      } else if (this.height === 1) {
        detail = ['high', 'high ground'];
      } else if (this.height === -1) {
        detail = ['low', 'underground/low ground'];
      }
      const extra = snippet.find('.overlay');
      detail ?
        extra.attr('src', `${aii}/overlay_${detail[0]}.png`).attr('alt', detail[1]) :
        extra.remove();
    }

    this.lMarker = L.marker([this.lat, this.lng], {
      opacity: this.canCollect ? opacity : opacity / 3,
      icon: new L.DivIcon.DataMarkup({
        iconSize: [35 * markerSize, 45 * markerSize],
        iconAnchor: [17 * markerSize, 42 * markerSize],
        popupAnchor: [1 * markerSize, -29 * markerSize],
        html: snippet[0],
        marker: this.text
      })
    });

    this.lMarker.id = this.text;

    if (Settings.isPopupsEnabled) {
      this.lMarker.bindPopup(this.popupContent.bind(this), { minWidth: 300, maxWidth: 400 });
    }

    this.lMarker.on('click', e => {
      if (!Settings.isPopupsEnabled) {
        MapBase.removeItemFromMap(this.day, this.text, this.subdata || '', this.category);
      }

      Routes.addMarkerOnCustomRoute(this.text);
      if (RouteSettings.customRouteEnabled) e.target.closePopup();
    });

    this.lMarker.on('contextmenu', () => {
      MapBase.removeItemFromMap(this.day, this.text, this.subdata || '', this.category);
    });
  }
  static init() {
    [
      [Settings, 'markerColor', 'by_cycle', '#marker-color'],
      [InventorySettings, 'highlightStyle', 'animated', '#highlight_style'],
    ].forEach(([proxy, settingName, settingDefault, domSelector]) => {
      SettingProxy.addSetting(proxy, settingName, { default: settingDefault });
      $(domSelector)
        .find(`option[data-text$="${proxy[settingName]}"]`).prop('selected', true).end()
        .on('change', e => {
          proxy[settingName] = $(e.target.selectedOptions[0]).attr('data-text').split('.').pop();
          MapBase.addMarkers();
        });
    });
    MapBase.markers = [];
    return Loader.promises['items'].consumeJson(data => {
      $.each(data, (category, allCycles) => {
        $.each(allCycles, (cycleName, markers) => {
          markers.forEach(preliminaryMarker => {
            const marker = new Marker(preliminaryMarker, cycleName, category);
            MapBase.markers.push(marker);

            if (!marker.item) return;
            if (!marker.category.includes(['fossils_random', 'heirlooms_random', 'jewelry_random', 'random'])) marker.item.markers.push(marker);
          });
        });
      });
    });
  }
}