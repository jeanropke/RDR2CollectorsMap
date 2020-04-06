class Marker {
  constructor(preliminaryMarker, cycleName, category) {
    Object.assign(this, preliminaryMarker);
    const match = this.text.match(/^(.+?)(?:_(\d+))?$/);
    this.itemId = match[1];
    this.itemNumberStr = match[2] ? `#${match[2]}` : '';
    this.itemTranslationKey = `${this.itemId}.name`
    this.day = cycleName;
    this.category = category;
    this.isVisible = enabledCategories.includes(this.category);
    this.amount = Inventory.items[this.itemId] || 0;
    this._collectedKey = `collected.${this.text}`;
    this.descriptionKey = (() => {
      switch (this.subdata) {
        case 'agarita':
        case 'blood_flower':
          return 'map.flower_type.night_only';
        case 'creek_plum':
          return 'map.flower_type.bush';
        case 'spoonbill':
        case 'heron':
        case 'eagle':
        case 'hawk':
        case 'egret':
          return 'map.egg_type.tree';
        case 'vulture':
          return 'map.egg_type.stump';
        case 'duck':
        case 'goose':
        case 'loon':
          return 'map.egg_type.ground';
        default:
          if (this.category === 'random') {
            return "map.random_spot.desc";
          } else {
            return `${this.text}_${this.day}.desc`;
          }
      }
    })();
  }
  get isCollected() {
    return !!localStorage.getItem(this._collectedKey);
  }
  set isCollected(value) {
    if (value) {
      localStorage.setItem(this._collectedKey, "true");
    } else {
      localStorage.removeItem(this._collectedKey);
    }
  }
  get canCollect() {
    if (this.isCollected) {
      return false;
    } else if (InventorySettings.isEnabled) {
      const stackName = (this.category === 'flower') ? 'flowersSoftStackSize' : 'stackSize';
      return this.amount < InventorySettings[stackName];
    } else {
      return true;
    }
  }
  get isWeekly() {
    return weeklySetData.sets[weeklySetData.current].map(item => item.item).includes(this.itemId);
  }

  popupContent() {
    // cycle names are strings or numbers and are called “day”, “number” or …
    const unknownCycle = this.day == Cycles.unknownCycleNumber;
    const snippet = $(`<div class="handover-wrapper-with-no-influence">
      <h1>
        <span data-text="${this.itemTranslationKey}"></span>
        ${this.itemNumberStr} -
        <span data-text="menu.day"></span>
        <span data-text="${unknownCycle ? 'map.unknown_cycle' : this.day}"></span>
      </h1>
      <span class="marker-warning-wrapper">
        <div>
          <img class="warning-icon" src="./assets/images/same-cycle-alert.png" alt="Alert">
        </div>
        <p data-text="map.unknown_cycle_description"></p>
        <p data-text="map.same_cycle_yesterday"></p>
      </span>
      <span class="marker-content-wrapper">
          <div>${MapBase.getToolIcon(this.tool)}</div>
          <p>
            <span data-text="map.item.unable"></span>
            <span data-text="${this.descriptionKey}" data-text-optional="true"></span>
            <span data-text="weekly.desc"></span>
          </p>
      </span>
      <p class='marker-popup-links'>
        <a href="javascript:void(0)"
          onclick="setClipboardText('https://jeanropke.github.io/RDR2CollectorsMap/?m=${this.text}')"
          data-text="map.copy_link"></a>
        <span>| <a href="${this.video}" target="_blank" data-text="map.video"></a></span>
        <span>| <a href="javascript:void(0)"
                  onclick="MapBase.highlightImportantItem('${this.text}', '${this.category}')"
                  data-text="map.mark_important"></a></span>
      </p>
      <small class="popupContentDebug">Latitude: ${this.lat} / Longitude: ${this.lng}</small>
      <div class="marker-popup-buttons">
          <button class="btn btn-danger" onclick="Inventory.changeMarkerAmount('${this.subdata || this.text}', -1)">↓</button>
          <small data-item="${this.text}">${this.amount}</small>
          <button class="btn btn-success" onclick="Inventory.changeMarkerAmount('${this.subdata || this.text}', 1)">↑</button>
      </div>
      <button type="button" class="btn btn-info remove-button" data-item="${this.text}"
        data-text="map.remove_add" onclick="MapBase.removeItemFromMap(
          '${this.day || ''}',
          '${this.text || ''}',
          '${this.subdata || ''}',
          '${this.category || ''}'
        )">
      </button>
    </div>`);

    if (!Cycles.isSameAsYesterday(this.category) && !unknownCycle) {
      snippet.find('.marker-warning-wrapper').hide();
    } else {
      if (unknownCycle) {
        snippet.find('[data-text="map.same_cycle_yesterday"]').hide();
      } else {
        snippet.find('[data-text="map.unknown_cycle_description"]').hide();
      }
    }
    if (this.tool != '-1') snippet.find('[data-text="map.item.unable"]').hide();
    if (!this.isWeekly) snippet.find('[data-text="weekly.desc"]').hide();
    if (!Settings.isDebugEnabled) snippet.find('.popupContentDebug').hide();
    if (!this.video) snippet.find('[data-text="map.video"]').parent().hide();
    if (['agarita', 'blood_flower'].includes(this.subdata)) {
      snippet.find('[data-text="map.mark_important"]').parent().hide();
    }
    if (InventorySettings.isEnabled && InventorySettings.isPopupsEnabled &&
      this.category !== 'random') {
        snippet.find('.marker-popup-buttons small').toggleClass('text-danger',
          this.amount >= InventorySettings.stackSize);
    } else {
        snippet.find('.marker-popup-buttons').hide();
    }

    return Language.translateDom(snippet)[0];
  }
}
