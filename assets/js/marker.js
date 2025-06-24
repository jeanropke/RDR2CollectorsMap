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
    this.item = this.category === 'random' ? undefined : Item.items.find(item => item.itemId === this.itemId);

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
    this._collectedKey = `rdr2collector.collected.${this.text}`;
    this._pickupTimeKey = `rdr2collector.pickup.${this.text}`;

    /**
     * Used to display per-item descriptions.
     * Kept in case we need to change this later.
     *
     * @returns {string} The translatable key of the primary description.
     */
    this.primaryDescriptionKey = (() => {
      if (this.category === 'random') {
        return `${this.text}.desc`;
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
        if (this.tool === 1) {
          return 'map.random_spot_shovel.desc';
        }
        return `map.random_spot_metal_detector_${this.type}.desc`;
      } else if (this.category === 'arrowhead') {
        return "arrowhead_random.desc";
      } else if (this.category === 'coin') {
        return "coin_random.desc";
      } else if (this.category === 'fossils_random') {
        return "fossils_random.desc";
      } else if (this.category === 'jewelry_random') {
        return "jewelry_random.desc";
      }
      switch (this.itemId) {
        case 'provision_wldflwr_agarita':
        case 'provision_wldflwr_blood_flower':
          return 'map.flower_type.night_only';
        case 'provision_wldflwr_creek_plum':
          return 'map.flower_type.bush';
        case 'provision_spoonbill_egg':
        case 'provision_heron_egg':
        case 'provision_eagle_egg':
        case 'provision_hawk_egg':
        case 'provision_egret_egg':
          return 'map.egg_type.tree';
        case 'provision_vulture_egg':
          return 'map.egg_type.stump';
        case 'provision_duck_egg':
        case 'provision_goose_egg':
        case 'provision_loon_egg':
          return 'map.egg_type.ground';
        default:
          return '';
      }
    })();

    /**
     * Used to get the loot table key per category.
     *
     * @returns {string} The key of the loot table.
     */
    this.lootTable = (() => {
      switch (this.category) {
        case 'fossils_random': {
          if (this.text.includes('_mud_'))
            return 'fossils_buried_mud';
          else if (this.text.includes('_snow_dirt_'))
            return 'fossils_buried_dirt_snow';
          else if (this.text.includes('_snow_'))
            return 'fossils_buried_snow';
          else if (this.text.includes('_water_'))
            return 'fossils_buried_water';
        }
        case 'arrowhead': {
          if (this.tool === 1) {
            return 'arrowhead_buried_mounds';
          }
          return 'arrowhead';
        }
        case 'random': {
          return `random_buried_${this.type}`;
        }
        default:
          return this.category;
      }
    })();

    /**
     * if it's random spot, get list of all items you can pick up from this spot
     * @returns { Array | undefined } (undefined for static categories)
     */
    this.possibleItems = (() => {
      const { categories, loot } = MapBase.lootTables;
      const randomCategories = categories[this.lootTable];
      if (!randomCategories) return;

      function getItems(key) {
        const items = loot[key];
        if (!items) {
          return key;
        }
        return Object.keys(items)
          .map(getItems)
          .reduce((acc, value) => acc.concat(value), []);
      }

      const items = [];
      randomCategories.forEach(category => items.push(...getItems(category)));
      return [...new Set(items)];
    })();
  }
  get pickupTime() {
    return +localStorage.getItem(this._pickupTimeKey);
  }
  get isCollected() {
    return !!localStorage.getItem(this._collectedKey);
  }
  set isCollected(value) {
    if (value) {
      localStorage.setItem(this._collectedKey, 'true');
      localStorage.setItem(this._pickupTimeKey, MapBase.mapTime().valueOf());
    } else {
      localStorage.removeItem(this._collectedKey);
    }
    this.updateOpacity();
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
    if (!getParameterByName('q')) {
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
    }

    return (this.isCurrent || MapBase.showAllMarkers) &&
      uniqueSearchMarkers.includes(this) &&
      (
        enabledCategories.includes(this.category) ||
        (this.item && this.item.isWeekly() && enabledCategories.includes("weekly"))
      );
  }

  get isRandomizedItem() {
    return ['arrowhead', 'coin', 'fossils_random', 'jewelry_random', 'random'].includes(this.category);
  }

  toolAccepted() {
    return Settings.toolType >= this.tool || Settings.toolType === -this.tool ? true : false;
  }

  colorUrls() {
    const url = ([base, contour]) => [
      `assets/images/icons/marker_${MapBase.colorOverride || base}.png`,
      `assets/images/icons/contours/contour_marker_${contour}.png`,
    ];
    const markerColor = MapBase.isPreviewMode ? 'by_cycle' : Settings.markerColor;
    if (markerColor.startsWith('auto')) {
      const [, normal, dark] = markerColor.split('_');
      return url(MapBase.isDarkMode() ? [dark, normal] : [normal, dark]);
    }

    let base = {
      arrowhead: 'purple',
      bottle: 'brown',
      coin: 'darkorange',
      egg: 'white',
      flower: 'lightdarkred',
      fossils_random: 'darkgreen',

      cups: 'blue',
      swords: 'blue',
      wands: 'blue',
      pentacles: 'blue',

      jewelry_random: 'yellow',
      bracelet: 'yellow',
      necklace: 'yellow',
      ring: 'yellow',
      earring: 'yellow',

      heirlooms: 'pink',

      random: (() => {
        if (this.tool === 1) {
          return 'lightergray';
        }
        if (this.type === 'chest') {
          return 'gray';
        }
        return 'lightgray';
      })(),
    };

    if (this.item && this.item.isWeekly() && Settings.showWeeklySettings) {
      base = 'green';
    }
    else if (markerColor === 'by_category') {
      base = base[this.category] || 'lightred';
    }
    else if (markerColor === 'custom') {
      const settingsColor = JSON.parse(localStorage.getItem('rdr2collector.customMarkersColors') || localStorage.getItem('customMarkersColors'));
      const colors = Object.assign(base, settingsColor || {});
      colors.random = (() => {
        if (this.tool === 1) {
          return colors.random_spot_shovel;
        }
        return colors[`random_spot_metal_detector_${this.type}`];
      })();
      base = base[this.category] || 'lightred';
    }
    else if (markerColor === 'by_cycle') {
      base = ['blue', 'orange', 'pink', 'darkpurple', 'darkred', 'darkblue'][+this.cycleName - 1] || 'lightred';
    }
    else {
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
    const videoUrl = this[`video_${Settings.language}`] || this.video;
    const unknownCycle = this.cycleName == Cycles.unknownCycleNumber;
    const snippet = document.createElement('div');
    snippet.classList.add('handover-wrapper-with-no-influence');
    snippet.innerHTML = `
      <button type="button" class="btn marker-troubleshooting" title="${Language.get('map.marker_troubleshooting')}"></button>
      <h1>
        <span data-text="${this.itemTranslationKey}"></span> ${this.itemNumberStr}
        <span class="cycle-display hidden">
          -&nbsp;<span data-text="menu.day"></span>
          <span data-text="${unknownCycle ? 'map.unknown_cycle' : this.cycleName}"></span>
        </span>
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
      <p class="marker-popup-links">
        <span class="popup-link-container">
          <a href="" data-text="map.video" data-bs-toggle="modal" data-bs-target="#video-modal" data-video-url="${videoUrl}"></a>
        </span>
        <span class="popup-link-container">
          <a href="" data-text="map.view_loot" data-bs-toggle="modal" data-bs-target="#loot-table-modal" data-loot-table="${this.lootTable}"></a>
        </span>
        <span class="popup-link-container">
          <a href="" data-text="${this.item && this.item.isImportant ? 'map.unmark_important' : 'map.mark_important'}"></a>
        </span>
        <span class="popup-link-container">
          <a href="" data-text="map.copy_link"></a>
        </span>
      </p>
      <small class="popupContentDebug">
        Latitude: ${this.lat} / Longitude: ${this.lng}<br>
        Description key: ${this.primaryDescriptionKey}
      </small>
      <div class="marker-popup-buttons">
        <button class="btn btn-danger count-down"></button>
        <small></small>
        <button class="btn btn-success count-up"></button>
      </div>
      <button type="button" class="btn btn-info remove-button ${this.isCollected ? 'active' : ''}" data-bs-toggle="button" data-item="${this.text}"
        data-text="${this.isCollected ? 'map.add' : 'map.remove'}" aria-pressed="${this.isCollected ? 'true' : ''}">
      </button>
    `;

    snippet.querySelector('.cycle-display').classList.toggle('hidden', !Settings.isCyclesVisible);

    snippet.querySelector('.marker-troubleshooting').addEventListener('click', () => markerTRBLModal.show());

    snippet.querySelector('.marker-popup-links').querySelector('[data-text="map.copy_link"]').addEventListener('click', (e) => {
      e.preventDefault();
      setClipboardText(`https://jeanropke.github.io/RDR2CollectorsMap/?m=${this.text}`);
      const currTarget = e.currentTarget;
      currTarget.setAttribute('data-text', 'map.link_copied');
      currTarget.textContent = Language.get('map.link_copied');
      setTimeout(() => {
        currTarget.setAttribute('data-text', 'map.copy_link');
        currTarget.textContent = Language.get('map.copy_link');
      }, 1000);
    });

    const importanceBtn = snippet.querySelector('.marker-popup-links').querySelector('[data-text="map.mark_important"], [data-text="map.unmark_important"]');
    importanceBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.item.isImportant = !this.item.isImportant;
      const currTarget = e.currentTarget;
      currTarget.setAttribute('data-text', this.item.isImportant ? 'map.unmark_important' : 'map.mark_important');
      currTarget.textContent = this.item.isImportant ? Language.get('map.unmark_important') : Language.get('map.mark_important');
    });
    importanceBtn.parentElement.style.display = !this.isRandomizedItem ? '' : 'none';
    
    const buttonEl = snippet.querySelector('.remove-button');
    buttonEl.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      MapBase.removeItemFromMap(this.cycleName, this.text, this.subdata || '', this.category);
      if (this.isCollected) {
        buttonEl.classList.add('active');
        buttonEl.setAttribute('aria-pressed', "true");
        e.currentTarget.textContent = Language.get('map.add');
      } else {
        buttonEl.classList.remove('active');
        buttonEl.removeAttribute('aria-pressed');
        e.currentTarget.textContent = Language.get('map.remove');
      }
    });
    
    if (!Cycles.isSameAsYesterday(this.category) && !unknownCycle) {
      snippet.querySelector('.marker-warning-wrapper').style.display = 'none';
    } else {
      if (unknownCycle) {
        snippet.querySelector('[data-text="map.same_cycle_yesterday"]').style.display = 'none';
      } else {
        snippet.querySelector('[data-text="map.unknown_cycle_description"]').style.display = 'none';
      }
    };
    snippet.querySelector('[data-text="weekly.desc"]').style.display = this.item && this.item.isWeekly() ? '' : 'none';
    snippet.querySelector('[data-text="map.item.unable"]').style.display = this.buggy ? '' : 'none';
    const toolImg = snippet.querySelector('.tool-type');
    if (!this.buggy && this.tool === 0) {
      toolImg.style.display = 'none';
    } else {
      const imgName = this.buggy ? 'cross' : { 1: 'shovel', 2: 'magnet' }[this.tool];
      toolImg.src = `assets/images/${imgName}.png`;
    }
    if (!Settings.isDebugEnabled) snippet.querySelector('.popupContentDebug').style.display = 'none';
    if (!this.isRandomizedItem) snippet.querySelector('[data-text="map.view_loot"]').parentNode.style.display = 'none';
    if (!videoUrl) snippet.querySelector('[data-text="map.video"]').parentNode.style.display = 'none';
    const inventoryButtons = snippet.querySelector('.marker-popup-buttons');
    if (InventorySettings.isEnabled && InventorySettings.isPopupsEnabled &&
      this.category !== 'random' && this.item) {
      const small = inventoryButtons.querySelector('small');
      small.classList.toggle('text-danger', this.item.amount >= InventorySettings.stackSize);
      small.setAttribute('data-item', this.text);
      small.textContent = this.item.amount;
      inventoryButtons.querySelectorAll('button').forEach((button) => {
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.item.changeAmountWithSideEffects(
            e.target.classList.contains('btn-danger') ? -1 : 1
          );
        });
      });
    } else {
      inventoryButtons.style.display = 'none';
    }

    return Language.translateDom(snippet);
  }

  updateColor() {
    if (!this.lMarker) return;
    const [bgUrl, contourUrl] = this.colorUrls();
    const lMarkerEl = this.lMarker.getElement();
    lMarkerEl?.querySelector('img.marker-contour').setAttribute('src', contourUrl);
    lMarkerEl?.querySelector('img.background')?.setAttribute('src', bgUrl);
  }

  updateOpacity(opacity = Settings.markerOpacity, isInvisibleRemovedMarkers = Settings.isInvisibleRemovedMarkers) {
    let targetOpacity;
    if (this.canCollect) {
      targetOpacity = opacity;
    } else {
      targetOpacity = isInvisibleRemovedMarkers ? 0 : opacity / 3;
    }

    this.lMarker && this.lMarker.setOpacity(targetOpacity);
  }

  recreateLMarker(isShadowsEnabled = Settings.isShadowsEnabled, markerSize = Settings.markerSize) {
    const icon = this.category !== 'random' ? this.category : (this.tool === 1 ? 'shovel' : 'magnet');
    const [bgUrl, contourUrl] = this.colorUrls();
    const aii = 'assets/images/icons';
    const match = bgUrl.match(/marker_#(?<hex>[0-9a-fA-F]{6})(?<alpha>[0-9a-fA-F]{2})?\.png$/);
    const hexColor = match ? `#${match.groups.hex}${match.groups.alpha || ''}` : null;
    const background = match ? `
      <div class="background">
        <svg width="${45 * markerSize}px" height="${45 * markerSize}px" viewBox="1.1 -0.9 16.80 16.80" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="${hexColor}" stroke="${hexColor}" stroke-width="0.00015"><path d="M7.5,0C5.0676,0,2.2297,1.4865,2.2297,5.2703
        C2.2297,7.8378,6.2838,13.5135,7.5,15c1.0811-1.4865,5.2703-7.027,5.2703-9.7297C12.7703,1.4865,9.9324,0,7.5,0z"></path> </g></svg>
      </div>
    ` : `<img class="background" src="${bgUrl}" alt="Background">`

    const snippet = document.createElement('div');
    snippet.innerHTML = `
      <img class="overlay" src="${aii}/overlay_cross.png" alt="crossed out">
      <img class="marker-contour" src="${contourUrl}" alt="markerContour">
      <img class="icon" src="${aii}/${icon}.png" alt="Icon">
      ${background}
      <img class="shadow" width="${35 * markerSize}"
        height="${16 * markerSize}" src="./assets/images/markers-shadow.png" alt="Shadow">
    `;

    isShadowsEnabled || snippet.querySelector('.shadow').remove();
    {
      let detail = false;
      if (this.buggy) {
        detail = ['cross', 'crossed out'];
      } else if (['provision_wldflwr_agarita', 'provision_wldflwr_blood_flower'].includes(this.itemId)) {
        detail = ['time', 'timed'];
      } else if (this.height === 1) {
        detail = ['high', 'high ground'];
      } else if (this.height === -1) {
        detail = ['low', 'underground/low ground'];
      }
      const extra = snippet.querySelector('.overlay');
      if (detail) {
        extra.setAttribute('src', `${aii}/overlay_${detail[0]}.png`);
        extra.setAttribute('alt', detail[1]);
      } else {
        extra.remove();
      }
    }

    let itemString = `${Language.get(this.itemTranslationKey)} ${this.itemNumberStr}`;

    const unknownCycle = this.cycleName == Cycles.unknownCycleNumber;
    if (!unknownCycle && Settings.isCyclesVisible)
      itemString += ` - ${Language.get('menu.day')} ${this.cycleName}`;

    this.lMarker = L.marker([this.lat, this.lng], {
      icon: new L.DivIcon.DataMarkup({
        iconSize: [35 * markerSize, 45 * markerSize],
        iconAnchor: [17 * markerSize, 42 * markerSize],
        popupAnchor: [1 * markerSize, -29 * markerSize],
        html: snippet,
        marker: this.text,
        tippy: `
          <div class="tippy-box hint">
            ${itemString} ${this.tool > 0 ? `<img class="icon" src="${aii}/${this.tool === 1 ? 'shovel' : 'magnet'}.png" alt="Icon">` : ''}
          </div>
        `,
      })
    });

    this.updateOpacity();

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

  static createMarkerColorCustomPanel() {
    FancySelect.update(document.getElementById('marker-color'));
    
    const markerColors = Object.values(colorNameMap).sort((...args) => {
      const [a, b] = args.map((color) => Language.get(`map.user_pins.color.${color}`));
      return a.localeCompare(b, Settings.language, { sensitivity: 'base' });
    });

    const defaultColors = { arrowhead: 'purple', bottle: 'brown', coin: 'darkorange', egg: 'white', flower: 'red', fossils_random: 'darkgreen', cups: 'blue', swords: 'blue', wands: 'blue', pentacles: 'blue', jewelry_random: 'yellow', bracelet: 'yellow', necklace: 'yellow', ring: 'yellow', earring: 'yellow', heirlooms: 'pink', random: 'lightgray', random_spot_metal_detector_chest: 'lightgray', random_spot_shovel: 'lightgray', random_spot_metal_detector_shallow: 'gray' };
    const baseColors = structuredClone(defaultColors);

    const randomCategories = ['random_spot_metal_detector_chest', 'random_spot_metal_detector_shallow', 'random_spot_shovel']; // divide random spots to metal detector chest & shallow & shovel
    const itemCollections = Collection.collections;
    const possibleCategories = [...new Set(MapBase.markers.map(({ category }) => category))]
      // fossils categories => fossils_random, random => random_spot_metal & random_spot_shovel
      .filter(category => !['coastal', 'oceanic', 'megafauna', 'random'].includes(category));
      
    const categories = [...possibleCategories, ...randomCategories].sort(
      (...args) => {
        const [a, b] = args.map((element) => {
          const index = itemCollections.map(({ category }) => category).indexOf(element);
          return index !== -1 ? index : itemCollections.length;
        });
        return a - b;
      }
    );

    const savedColors = Object.assign(
      baseColors,
      JSON.parse(
        localStorage.getItem('rdr2collector.customMarkersColors') ||
          localStorage.getItem('customMarkersColors')
      ) || {}
    );

    const wrapper = document.createElement('div');
    wrapper.id = 'custom-markers-colors';

    categories.forEach((category) => {
      const snippet = document.createElement('div');
      snippet.className = 'input-container';
      snippet.id = `${category}-custom-color`;
      snippet.dataset.help = 'custom_marker_color';
    
      const inputVal = colorNameToHexMap[savedColors[category] || markerColors[0]] || savedColors[category] || markerColors[0];
      snippet.innerHTML = `
        <img class="icon" src="assets/images/icons/${category.startsWith('random_spot') ? 'random' : category}.png" alt="${category}">
        <label for="custom-marker-color" data-text="menu.${category}"></label>
        <div class="input-pickr-wrapper">
          <input type="text" class="input-text pickr-custom-marker-color" id="${category}-custom-marker-color" readonly value="${inputVal}" style="background-color: ${inputVal}">
        </div>
      `;
    
      wrapper.appendChild(snippet);
    });
  
    const translatedContent = Language.translateDom(wrapper);
    document.getElementById('custom-marker-color-modal').querySelector('#custom-colors').appendChild(translatedContent);

    wrapper.querySelectorAll('.pickr-custom-marker-color').forEach((inputEl) => {
      const cat = inputEl.id.split('-')[0];

      const pickr = Pickr.create({
        theme: 'nano',
        useAsButton: true,
        el: inputEl,
        container: `#${cat}-custom-color`,
        default: inputEl.value,
        swatches: Object.keys(colorNameMap),
        components: {
          preview: true,
          hue: true,
          opacity: true,
          interaction: {
            hex: true,
            rgba: true,
            input: true,
            save: true,
          }
        },
      }).on('save', (color) => {
        const colorStr = color.toHEXA().toString().toLowerCase();
        inputEl.style.backgroundColor = colorStr;
        inputEl.value = colorStr;
        baseColors[cat] = colorNameMap[colorStr] || colorStr;
        localStorage.setItem('rdr2collector.customMarkersColors', JSON.stringify(baseColors));
        MapBase.addMarkers();
        pickr.hide();
      }); 

      const btnSave = document.getElementById(`${cat}-custom-color`).querySelector('.pcr-save');
      const btnReset = document.createElement('input');
      btnReset.className = 'pcr-reset';
      btnReset.value = 'Reset';
      btnReset.type = 'button';
      btnReset.setAttribute('aria-label', 'reset to default');
      btnSave.insertAdjacentElement('beforebegin', btnReset);

      btnReset.addEventListener('click', () => pickr.setColor(colorNameToHexMap[defaultColors[cat]]));
    });
  }

  static init() {
    [
      [Settings, 'markerColor', 'by_category', '#marker-color'],
      [InventorySettings, 'highlightStyle', 'animated', '#highlight_style'],
    ].forEach(([proxy, settingName, settingDefault, domSelector]) => {
      SettingProxy.addSetting(proxy, settingName, { default: settingDefault });
        document.querySelector(domSelector).querySelectorAll(`option[data-text$="${proxy[settingName]}"]`).forEach(option => {
          if (option.getAttribute('data-text').endsWith(proxy[settingName])) {
            option.selected = true;
          }
        });
        document.querySelector(domSelector).addEventListener('change', e => {
          const selectedOption = e.target.selectedOptions[0];
          proxy[settingName] = selectedOption.getAttribute('data-text').split('.').pop();
          MapBase.addMarkers();
        });
    });
    MapBase.markers = [];
    return Loader.promises['items'].consumeJson(data => {
      Object.entries(data).forEach(([category, allCycles]) => {
        Object.entries(allCycles).forEach(([cycleName, markers]) => {
          markers.forEach(preliminaryMarker => {
            const marker = new Marker(preliminaryMarker, cycleName, category);
            MapBase.markers.push(marker);
            if (!marker.item) return;
            if (!['fossils_random', 'jewelry_random', 'random'].includes(marker.category)) {
              marker.item.markers.push(marker);
            }
          });
        });
      });
  });
  }
}
