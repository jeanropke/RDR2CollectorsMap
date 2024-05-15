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
  _insertWeeklyMenuElement(listParent) {
    const snippet = document.createElement('div');
    snippet.classList.add('weekly-item-listing');
    this.legacyItemId && snippet.setAttribute('data-type', this.legacyItemId);
    snippet.setAttribute('data-help', this.weeklyHelpKey);
    snippet.innerHTML = `
        <span>
          <div class="icon-wrapper"><img class="icon"
            src="./assets/images/icons/game/${this.itemId}.png" alt="Weekly item icon"></div>
          <span class="collectible" data-text="${this.itemTranslationKey}"></span>
        </span>
        <small class="counter-number counter-number-weekly">${this.amount}</small>
    `;
    Language.translateDom(snippet);
    this.weeklyMenuButton = snippet;
    this.weeklyMenuButton.rdoItem = this;
    listParent.appendChild(this.weeklyMenuButton);
    Loader.mapModelLoaded.then(() => {
      SettingProxy.addListener(InventorySettings, 'isEnabled stackSize', () => {
        const counterNum = this.weeklyMenuButton.querySelector('.counter-number');
        counterNum.style.display = InventorySettings.isEnabled ? '' : 'none';
        counterNum.classList.toggle('text-danger', this.amount >= InventorySettings.stackSize);
      })();
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
  constructor(preliminary) {
    super(preliminary);
    this.collection = Collection.collections.find(({ category }) => category === this.category);
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
      data.forEach(({ category, itemsList }) =>
        itemsList.forEach((interimItem) =>
          this.items.push(new Item({ category, ...interimItem }))
        )
      );
      return Weekly.init();
    });
  }
  static _installEventHandlers() {
    const sideMenu = document.querySelector('.side-menu');
    sideMenu.addEventListener('contextmenu', event => {
      const item = event.target.propSearchUp('rdoItem');
      // clicked inside of the collectible, but outside of its counter part?
      if (item && !event.target.closest('.counter')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        item.isImportant = !item.isImportant;
      }
    });
    sideMenu.addEventListener('click', event => {
      // `.on()` can’t register to capture phase
      const target = event.target;
      if (target.classList.contains('counter-button')) {
        event.stopImmediatePropagation();
        target.closest('.collectible-wrapper').rdoItem.changeAmountWithSideEffects(target.textContent === '-' ? -1 : 1);
      } else if (target.classList.contains('open-submenu')) {
        event.stopPropagation();
        target.classList.toggle('rotate');
        target.parentElement.parentElement.querySelector('.menu-hidden').classList.toggle('opened');
      }
    }, true);
  }
  _insertMenuElement() {
    const menuBtn = document.createElement('div');
    menuBtn.classList.add('collectible-wrapper');
    menuBtn.setAttribute('data-type', this.legacyItemId);
    menuBtn.setAttribute('data-help', ['provision_wldflwr_agarita', 'provision_wldflwr_blood_flower'].includes(this.itemId) ? 'item_night_only' : 'item');
    menuBtn.innerHTML = `
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
    `;
    Language.translateDom(menuBtn);
    this.menuButton =menuBtn;
    this.menuButton.rdoItem = this;
    this.amount = this.amount; // trigger counter update
    this.collection.submenu.appendChild(this.menuButton);
    Loader.mapModelLoaded.then(() => {
      SettingProxy.addListener(InventorySettings, 'isEnabled', () => {
        this.menuButton.querySelector('.counter').style.display = InventorySettings.isEnabled ? '' : 'none';
      })();
    });
  }
  get amount() {
    return +localStorage.getItem(this._amountKey);
  }
  set amount(value) {
    value = value < 0 ? 0 : value;
    value ? localStorage.setItem(this._amountKey, value) : localStorage.removeItem(this._amountKey);
    [this.menuButton.querySelector('.counter-number'), this.weeklyMenuButton && this.weeklyMenuButton.querySelector('.counter-number')].forEach(btn => {
      if (!btn) return;  
      btn.textContent = value;  
      btn.classList.toggle('text-danger', value >= InventorySettings.stackSize);
    });
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

    this.menuButton.dataset.help = (() => {
        if (isBugged) {
          return 'item_unavailable';
        } else if (isRandom && parentCategories.jewelry_random.includes(this.category) && !!MapBase.jewelryTimestamps[this.itemId]) {
          return 'jewelry_random_timestamp';
        } else if (isRandom) {
          return 'item_random';
        } else if (['provision_wldflwr_agarita', 'provision_wldflwr_blood_flower'].includes(this.itemId)) {
          return 'item_night_only';
        } else if (this.isWeekly()) {
          return 'item_weekly';
        } else {
          return 'item';
        }
    })();
    this.menuButton.classList.toggle('weekly-item', this.isWeekly());
    const collectibleTextP = this.menuButton.querySelector('.collectible-text p');
    collectibleTextP.classList.toggle('disabled', isCollected);
    collectibleTextP.classList.toggle('not-found', isBugged);
    this.menuButton.querySelector('.counter').style.display = InventorySettings.isEnabled ? '' : 'none';
    this.menuButton.querySelector('.collectible-icon.random-spot').style.display = isRandom ? '' : 'none';
    this.menuButton.querySelector('.counter-number').classList.toggle('not-found', isRandom);

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
          document.querySelectorAll(`[data-type="${marker.legacyItemId}"] .collectible-text p`).forEach(collectibleText => {
            collectibleText.classList.toggle('disabled', this.markers.filter(m => m.cycleName === marker.cycleName).every(m => !m.canCollect));
          });
        }
      });
    }

    Inventory.updateItemHighlights();
    Menu.refreshItemsCounter();
  }

  static initImportedItems() {
    this.items.forEach(item => item.isImportant = item.isImportant);
  }
  
  static reinitImpItemsOnCat(category) {
    this.items
      .filter((item) => item.category === category)
      .forEach((item) => (item.isImportant = item.isImportant));
  }

  set isImportant(state) {
    const textKey = `rdr2collector.important.${this.itemId}`;
    if (state)
      localStorage.setItem(textKey, 'true');
    else
      localStorage.removeItem(textKey);

    this.highlightImportantItem();
    clockTick();
  }

  get isImportant() {
    return !!localStorage.getItem(`rdr2collector.important.${this.itemId}`);
  }

  highlightImportantItem() {
    const selector = ['egg', 'flower'].includes(this.category) ? `[data-marker*="${this.itemId}"]` : `[data-marker="${this.itemId}"]`;
    document.querySelectorAll(selector).forEach(element => {
      element.classList.toggle('highlight-items', this.isImportant);
    });
    document.querySelectorAll(`[data-type="${this.legacyItemId}"]`).forEach(element => {
      element.classList.toggle('highlight-important-items-menu', this.isImportant);
    });
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