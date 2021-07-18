class BaseItem {
  constructor(preliminary) {
    Object.assign(this, preliminary);
    this.itemTranslationKey = `${this.itemId}.name`;
  }
  isWeekly() {
    // Don't use weekly when in preview mode.
    if (getParameterByName('q')) return false;
    //Check if weekly is valid to load markers on map
    if(!Weekly.current) return false;

    return Weekly.current.items.includes(this);
  }
  // requires Marker and Cycles to be loaded
  currentMarkers() {
    return this.markers.filter(marker => marker.isCurrent);
  }
  _insertWeeklyMenuElement($listParent) {
    this.$weeklyMenuButton = $(`
      <div class="weekly-item-listing" ${this.legacyItemId ? `data-type="${this.legacyItemId}"` : ""} data-help="${this.weeklyHelpKey}">
        <span>
          <div class="icon-wrapper"><img class="icon"
            src="./assets/images/icons/game/${this.itemId}.png" alt="Weekly item icon"></div>
          <span class="collectible" data-text="${this.itemTranslationKey}"></span>
        </span>
        <small class="counter-number counter-number-weekly">${this.amount}</small>
      </div>
    `).translate();
    this.$weeklyMenuButton[0].rdoItem = this;
    this.$weeklyMenuButton.appendTo($listParent);
    Loader.mapModelLoaded.then(() => {
      SettingProxy.addListener(InventorySettings, 'isEnabled stackSize', () =>
        this.$weeklyMenuButton
          .find('.counter-number')
          .toggle(InventorySettings.isEnabled)
          .toggleClass('text-danger', this.amount >= InventorySettings.stackSize)
          .end()
      )();
    });
  }
}

class NonCollectible extends BaseItem {
  constructor(preliminary) {
    super(preliminary);
    Object.defineProperty(this, 'amount', { configurable: false, enumerable: true, writable: false, value: '?' });
    this.markers = [];
    this.weeklyHelpKey = `weekly_${this.itemId}`;
  }
}

class Item extends BaseItem {
  constructor(preliminary, category) {
    super(preliminary);
    this.category = category;
    this.collection = Collection.collections[this.category];

    this.collection.items.push(this);
    this.legacyItemId = this.itemId.replace(/^_flower|^_egg/, '');
    this.weeklyHelpKey = 'weekly_item_collectable';
    this.markers = []; // filled by Marker.init();
    this._amountKey = `rdr2collector.amount.${this.itemId}`;
    this._insertMenuElement();
  }
  // `.init()` needs DOM ready and jquery, but no other map realted scripts initialized
  static init() {
    this._installEventHandlers();
    this.items = [];
    return Loader.promises['items_value'].consumeJson(data => {
      Collection.init(data);
      return Weekly.init();
    });
  }
  static _installEventHandlers() {
    $('.side-menu')
      .on('contextmenu', event => {
        const item = $(event.target).propSearchUp('rdoItem');
        // clicked inside of the collectible, but outside of its counter part?
        if (item && !event.target.closest('.counter')) {
          event.preventDefault();
          event.stopImmediatePropagation();
          item.isImportant = !item.isImportant;
        }
      })[0].addEventListener('click', event => { // `.on()` can’t register to capture phase
        if (event.target.classList.contains('counter-button')) {
          event.stopImmediatePropagation();
          const $target = $(event.target);
          $target.closest('.collectible-wrapper')[0].rdoItem.changeAmountWithSideEffects($target.text() === '-' ? -1 : 1);
        } else if (event.target.classList.contains('open-submenu')) {
          event.stopPropagation();
          $(event.target)
            .toggleClass('rotate')
            .parent().parent().children('.menu-hidden')
            .toggleClass('opened');
        }
      }, { capture: true });
  }
  _insertMenuElement() {
    this.$menuButton = $(`
      <div class="collectible-wrapper" data-type="${this.legacyItemId}"
        data-help="${['provision_wldflwr_agarita', 'provision_wldflwr_blood_flower'].includes(this.itemId) ? 'item_night_only' : 'item'}">
        <img class="collectible-icon" src="assets/images/icons/game/${this.itemId}.png" alt="Set icon">
        <img class="collectible-icon random-spot" src="assets/images/icons/random_overlay.png" alt="Random set icon">
        <span class="collectible-text">
          <p class="collectible" data-text="${this.itemTranslationKey}"></p>
          <span class="counter">
            <div class="counter-button">-</div><!--
            --><div class="counter-number"></div><!--
            --><div class="counter-button">+</div>
          </span>
        </span>
      </div>
    `).translate();
    this.$menuButton[0].rdoItem = this;
    this.amount = this.amount; // trigger counter update
    this.$menuButton
      .appendTo(this.collection.$submenu)
    Loader.mapModelLoaded.then(() => {
      SettingProxy.addListener(InventorySettings, 'isEnabled', () =>
        this.$menuButton
          .find('.counter')
          .toggle(InventorySettings.isEnabled)
          .end()
      )();
    });
  }
  get amount() {
    return +localStorage.getItem(this._amountKey);
  }
  set amount(value) {
    if (value < 0) value = 0;
    if (value) {
      localStorage.setItem(this._amountKey, value);
    } else {
      localStorage.removeItem(this._amountKey);
    }
    this.$menuButton.add(this.$weeklyMenuButton)
      .find('.counter-number')
      .text(value)
      .toggleClass('text-danger', value >= InventorySettings.stackSize);
    this.markers.forEach(m => m.updateOpacity());
  }
  // use the following marker based property only after Marker.init()!
  effectiveAmount() {
    if (InventorySettings.isEnabled) {
      return this.amount;
    } else {
      return this.markers.filter(marker => marker.isCurrent && marker.isCollected).length;
    }
  }
  updateMenu() {
    const currentMarkers = this.currentMarkers();
    const isBugged = !!(currentMarkers.length && currentMarkers.every(marker => marker.buggy));
    const isCollected = currentMarkers.every(marker => !marker.canCollect);
    const isRandom = currentMarkers.every(marker => marker.isRandomizedItem);

    this.$menuButton
      .attr('data-help', () => {
        if (isBugged) {
          return 'item_unavailable';
        } else if (isRandom) {
          return 'item_random';
        } else if (['provision_wldflwr_agarita', 'provision_wldflwr_blood_flower'].includes(this.itemId)) {
          return 'item_night_only';
        } else if (this.isWeekly()) {
          return 'item_weekly';
        } else {
          return 'item';
        }
      })
      .toggleClass('weekly-item', this.isWeekly())
      .find('.collectible-text p')
      .toggleClass('disabled', isCollected)
      .toggleClass('not-found', isBugged)
      .end()
      .find('.counter')
      .toggle(InventorySettings.isEnabled)
      .end()
      .find('.collectible-icon.random-spot')
      .toggle(isRandom)
      .end()
      .find('.counter-number')
      .toggleClass('not-found', isRandom)
      .end();

    return {
      isBugged,
      isRandom,
    };
  }
  changeAmountWithSideEffects(changeAmount) {
    this.amount += changeAmount;

    if (InventorySettings.isEnabled) {
      this.markers.forEach(marker => {
        const popup = marker.lMarker && marker.lMarker.getPopup();
        popup && popup.isOpen() && popup.update();

        if (marker.isCurrent) {
          $(`[data-type=${marker.legacyItemId}] .collectible-text p`).toggleClass('disabled',
            this.markers.filter(m => m.cycleName === marker.cycleName).every(m => !m.canCollect));
        }
      });
    }

    Inventory.updateItemHighlights();
    Menu.refreshItemsCounter();
  }

  static initImportedItems() {
    this.items.forEach(item => item.isImportant = item.isImportant);
  }

  set isImportant(state) {
    const textKey = `rdr2collector.important.${this.itemId}`;
    if (state)
      localStorage.setItem(textKey, 'true');
    else
      localStorage.removeItem(textKey);

    this.highlightImportantItem();
  }

  get isImportant() {
    return !!localStorage.getItem(`rdr2collector.important.${this.itemId}`);
  }

  highlightImportantItem() {
    $(`[data-marker*="${this.itemId}"]`).toggleClass('highlight-items', this.isImportant);
    $(`[data-type="${this.legacyItemId}"]`).toggleClass('highlight-important-items-menu', this.isImportant);
  }

  static clearImportantItems() {
    this.items.forEach(item => item.isImportant = false);
  }

  static convertImportantItems() {
    const oldItems = JSON.parse(localStorage.getItem('importantItems'));
    if (!oldItems) return;
    const newItems = this.items.filter(marker => oldItems.includes(marker.itemId));
    [...new Set(newItems)].forEach(item => item.isImportant = true);
    localStorage.removeItem('importantItems');
  }
}