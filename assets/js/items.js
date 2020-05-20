jQuery.fn.firstAncestorOrSelf = function(func) {
  'use strict';
  if (this.length !== 1) throw new TypeError('Not implemented (yet?) for selection length != 1.');
  let node = this[0];
  while (node) {
    if (func(node)) return this.pushStack([node]);
    node = node.parentNode;
  }
}
jQuery.fn.propSearchUp = function(property) {
  'use strict';
  const element = this.firstAncestorOrSelf(element => element[property]);
  return element && element.prop(property);
}

class BaseItem {
  constructor(preliminary) {
    Object.assign(this, preliminary);
    this.itemTranslationKey = `${this.itemId}.name`;
  }
  isWeekly() {
    return Weekly.current.items.includes(this);
  }
  // requires Marker and Cycles to be loaded
  currentMarkers() {
    return this.markers.filter(marker => marker.isCurrent);
  }
  _insertWeeklyMenuElement($listParent) {
    this.$weeklyMenuButton = $(`
      <div class="weekly-item-listing" data-help="${this.weeklyHelpKey}">
        <span>
          <div class="icon-wrapper"><img class="icon"
            src="./assets/images/icons/game/${this.itemId}.png" alt="Weekly item icon"></div>
          <span data-text="${this.itemTranslationKey}"></span>
        </span>
        <small class="counter-number">${this.amount}</small>
      </div>
    `).translate().appendTo($listParent)
    Loader.mapModelLoaded.then(() => {
      SettingProxy.addListener(InventorySettings, 'isEnabled stackSize', () =>
        this.$weeklyMenuButton
          .find('.counter-number')
            .toggle(InventorySettings.isEnabled)
            .toggleClass('text-danger', this.amount >= InventorySettings.stackSize)
          .end()
      ) ();
    });
  }
}

class NonCollectible extends BaseItem {
  constructor(preliminary) {
    super(preliminary);
    this.amount = '?';
    this.markers = [];
    this.weeklyHelpKey = `weekly_${this.itemId}`;
  }
}

class Category {}
// currently only shared by Weekly and Collection
class BaseCollection extends Category {
  currentMarkers() {
    return [].concat(...this.items.map(item => item.currentMarkers()));
  }
  // “Sell” event handler shared by Weekly and Collection to be found in Collection.
  // And this comment is shorter than the overhead for splitting that handler.
}
class Weekly extends BaseCollection {
  static init() {
    return Loader.promises['weekly'].consumeJson(data => {
      this.current = new Weekly(data);
      this._installSettingsAndEventHandlers();
      console.info('%c[Weekly Set] Loaded!', 'color: #bada55; background: #242424');
      });
  }
  // needs Item.items ready
  constructor(data) {
    super();
    const nameViaParam = getParameterByName('weekly');
    this.weeklyId = data.sets[nameViaParam] ? nameViaParam : data.current;
    this.items = data.sets[this.weeklyId].map(itemId =>
      Item.items.find(i => i.itemId === itemId) || new NonCollectible({itemId}));
    this.collectibleItems = this.items.filter(item => item.constructor === Item);
    this._insertMenuElements();
  }
  _insertMenuElements() {
    this.$menuEntry = $(`
    <div id="weekly-container">
      <div class="header">
        <span class="header-border"></span>
        <h2 class="header-title weekly-item-title" data-text="weekly.desc.${this.weeklyId}">
          Weekly Collection</h2>
        <span class="header-border"></span>
      </div>
      <div class="weekly-item-listings">
        <p>
          <span class="weekly-flavor-text" data-text="weekly.flavor.${this.weeklyId}"></span>
          <span data-text="menu.weekly_item_description">Find all the items listed and sell the complete collection to Madam Nazar for an XP and RDO$ reward.</span>
        </p>
        <div class="collection-value">
          <span class="collection-sell" data-text="menu.sell" data-help="item_sell">Sell</span>
        </div>
      </div>
    </div>
    `)
      .translate()
      .insertBefore('.links-container')
    this.$menuEntry[0].rdoCollection = this;
    this.$listParent = this.$menuEntry.find('.weekly-item-listings');
    this.items.forEach(item => item._insertWeeklyMenuElement(this.$listParent));
    Loader.mapModelLoaded.then(() => {
      SettingProxy.addListener(InventorySettings, 'isEnabled', () =>
        this.$menuEntry.find('.colleciton-value')
          .toggle(InventorySettings.isEnabled)
        .end()
      ) ();
    });
  }
  static _installSettingsAndEventHandlers() {
    SettingProxy.addSetting(Settings, 'showWeeklySettings', {default: true});
    const weeklyCheckbox = $("#show-weekly");
    Loader.mapModelLoaded.then(() => {
      SettingProxy.addListener(Settings, 'showWeeklySettings', () => {
        this.current.$menuEntry.toggleClass('opened', Settings.showWeeklySettings);
        weeklyCheckbox.prop('checked', Settings.showWeeklySettings)
      }) ();
      weeklyCheckbox.on("change", () => {
        Settings.showWeeklySettings = weeklyCheckbox.prop('checked');
      })
    });
  }
}

class Collection extends BaseCollection {
  constructor(preliminary) {
    super();
    Object.assign(this, preliminary);
    this.items = []; // filled by new Item()s
    this._insertMenuElement();
  }
  static init(collections) {
    this._installSettingsAndEventHandlers();
    this.collections = [];
    collections.forEach(interim => this.collections.push(new Collection(interim)));
  }
  static updateMenu() {
    this.collections.forEach(collection => collection.updateMenu());
  }
  static _installSettingsAndEventHandlers() {
    SettingProxy.addSetting(Settings, 'sortItemsAlphabetically', { default: false });
    Loader.mapModelLoaded.then(() => {
      const checkbox = $('#sort-items-alphabetically')
        .prop("checked", Settings.sortItemsAlphabetically)
        .on("change", () => Settings.sortItemsAlphabetically = checkbox.prop('checked'))
      SettingProxy.addListener(Settings, 'sortItemsAlphabetically language', () =>
        Collection.collections.forEach(collection =>
          collection.menuSort(Settings.sortItemsAlphabetically))) ();
      $('.side-menu')
        .on('change', event => {
          const $input = $(event.target);
          const collection = $input.propSearchUp('rdoCollection');
          if (collection && $input.hasClass('input-cycle')) {
            event.stopImmediatePropagation();
            Cycles.categories[collection.category] = +$input.val();
            MapBase.addMarkers();
            Menu.refreshMenu();
          }
        // on capture phase to override more generic handler in scripts.js
        })[0].addEventListener('click', event => {
          const etcL = event.target.classList;
          if (etcL.contains('input-cycle')) {
            // handled by browser _alone_: avoid own category enabled/disabled handler
          } else if (etcL.contains('collection-sell') || etcL.contains('collection-collect-all')) {
            const collection = $(event.target).propSearchUp('rdoCollection');
            const changeAmount = etcL.contains('collection-sell') ? -1 : 1;
            collection.currentMarkers().forEach(marker => {
              if (marker.itemNumber === 1) {
                Inventory.changeMarkerAmount(marker.legacyItemId, changeAmount);
              }
              if (InventorySettings.autoEnableSoldItems && marker.item.amount === 0 &&
                marker.isCollected) {
                  MapBase.removeItemFromMap(marker.cycleName, marker.text, marker.subdata,
                    marker.category, true);
              }
            });
          } else if (etcL.contains('collection-reset')) {
            const collection = $(event.target).propSearchUp('rdoCollection');
            collection.currentMarkers().filter(marker => !marker.canCollect).forEach(marker => {
              MapBase.removeItemFromMap(marker.cycleName, marker.text, marker.subdata,
                marker.category, !InventorySettings.resetButtonUpdatesInventory);
            });
          } else if (etcL.contains('disable-collected-items')) {
            const collection = $(event.target).propSearchUp('rdoCollection');
            collection.currentMarkers()
              .filter(marker => marker.canCollect && marker.item.amount > 0)
              .forEach(marker => {
                $(`[data-type=${marker.legacyItemId}]`).addClass('disabled');
                MapBase.removeItemFromMap(marker.cycleName, marker.text, marker.subdata,
                  marker.category, true);
              });
          } else {
            return; // event not for “us”
          }
          event.stopImmediatePropagation();
        }, {capture: true});
    });
  }
  _insertMenuElement() {
    const $element = $(`
      <div>
        <div class="menu-option clickable" data-type="${this.category}" data-help="item_category">
          <span>
            <img class="icon" src="assets/images/icons/${this.category}.png" alt="${this.category}">
            <span>
              <span class="menu-option-text" data-text="menu.${this.category}"></span>
              <img class="same-cycle-warning-menu" src="assets/images/same-cycle-alert.png">
            </span>
          </span>
          <input class="input-text input-cycle" type="number" min="1" max="6"
            name="${this.category}" data-help="item_manual_cycle">
          <img class="cycle-icon" src="assets/images/cycle_1.png" alt="Cycle 1"
            data-type="${this.category}">
          <div class="open-submenu"></div>
        </div>
        <div class="menu-hidden" data-type="${this.category}">
          <div class="collection-value">
            <span class="collection-collected" data-help="collection_collected"></span>
            <span data-help="item_value">$${this.price}</span>
            <span class="collection-reset" data-text="menu.reset" data-help="item_reset">Reset</span>
            <span class="collection-sell" data-text="menu.sell" data-help="item_sell">Sell</span>
          </div>
          <div class="collection-value-bottom">
            <span class="disable-collected-items" data-text="menu.disable_collected_items" data-help="disable_collected_items">Disable collected</span>
            <span class="collection-collect-all" data-text="menu.collection_collect_all" data-help="collection_collect_all">Collect all</span>
          </div>
        </div>
      </div>
    `).translate()
      .find('.input-cycle, .cycle-icon').hide().end()  // improve visuals during initial loading
      .insertBefore('#collection-insertion-before-point');
    $element[0].rdoCollection = this;
    [this.$menuButton, this.$submenu] = $element.children().toArray().map(e => $(e));
    this.$menuButton.find('.same-cycle-warning-menu').hide().end()
    Loader.mapModelLoaded.then(() => {
      SettingProxy.addListener(Settings, 'isCycleInputEnabled', () =>
        this.$menuButton
          .find('.input-cycle').toggle(Settings.isCycleInputEnabled).end()
          .find('.cycle-icon').toggle(!Settings.isCycleInputEnabled).end()
      ) ();
      SettingProxy.addListener(InventorySettings, 'isEnabled enableAdvancedInventoryOptions', () =>
        this.$submenu
          .find('.collection-sell').toggle(InventorySettings.isEnabled).end()
          .find('.collection-value-bottom').toggle(InventorySettings.isEnabled &&
            InventorySettings.enableAdvancedInventoryOptions).end()
      ) ();
    });
  }
  updateMenu () {
    const buggy = this.items.map(item => item.updateMenu()).includes(true);
    const isSameCycle = Cycles.isSameAsYesterday(this.category);
    this.$menuButton
      .attr('data-help', () => {
        if (isSameCycle) {
          return 'item_category_same_cycle';
        } else if (buggy) {
          return 'item_category_unavailable_items';
        } else {
          return 'item_category';
        }
      })
      .toggleClass('not-found', buggy)
      .find('.same-cycle-warning-menu')
        .toggle(isSameCycle)
      .end()
    this.$submenu
      .find('.collection-collected').text(Language.get('menu.collection_counter')
        .replace('{count}', this.$submenu.find('.disabled').length)
        .replace('{max}', this.items.length)
      )
  }
  menuSort(alphabetically) {
    if (['cups', 'swords', 'wands', 'pentacles'].includes(this.category)) return;
    const items = !alphabetically ? this.items : [...this.items].sort((...args) => {
      const [a, b] = args.map(item => Language.get(item.itemTranslationKey));
      return a.localeCompare(b, Settings.language, {sensitivity: 'base'});
    });
    this.$submenu.append(items.map(item => item.$menuButton));
  }
  averageAmount() {
    return this.items.reduce((sum, item) => sum + item.amount, 0) / this.items.length;
  }
  effectiveAmount() {
    return Math.min(...this.items.map(item => item.effectiveAmount()));
  }
  totalValue() {
    const collectionAmount = this.effectiveAmount();
    return this.items
      .map(item => (item.effectiveAmount() - collectionAmount) * item.price)
      .reduce((a, b) => a + b, 0) +
      collectionAmount * this.price;
  }
  static totalValue() {
    return this.collections.reduce((sum, collection) => sum + collection.totalValue(), 0);
  }
}

class Item extends BaseItem {
  constructor(preliminary) {
    super(preliminary);
    this.category = this.itemId.split('_', 1)[0];
    this.collection = Collection.collections.find(c => c.category === this.category);
    this.collection.items.push(this);
    this.legacyItemId = this.itemId.replace(/^flower_|^egg_/, '');
    this.weeklyHelpKey = 'weekly_item_collectable';
    this.markers = [];  // filled by Marker.init();
    this._amountKey = `amount.${this.itemId}`;
    this._insertMenuElement();
  }
  // `.init()` needs DOM ready and jquery, but no other map realted scripts initialized
  static init() {
    this._installEventHandlers();
    this.items = [];
    return Loader.promises['items_value'].consumeJson(data => {
      Collection.init(data.collections);
      data.items.forEach(interimItem => this.items.push(new Item(interimItem)));
      this.compatInit();
      return Weekly.init();
    });
  }
  // prefill whenever “new” inventory is empty and “old” inventory exists
  static compatInit() {
    const oldAmounts = JSON.parse(localStorage.getItem("inventory"));
    if (oldAmounts && !Object.keys(localStorage).some(key => key.startsWith('amount.'))) {
      Item.items.forEach(item => item.amount = oldAmounts[item.itemId]);
      console.log('old amounts converted');
      localStorage.removeItem('inventory');
    }
  }
  static _installEventHandlers() {
    $('.side-menu')
      .on('contextmenu', event => {
        const item = $(event.target).propSearchUp('rdoItem');
        // clicked inside of the collectible, but outside of its counter part?
        if (item && !event.target.closest('.counter')) {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (!['flower_agarita', 'flower_blood_flower'].includes(item.itemId)) {
            MapBase.highlightImportantItem(item.itemId, item.category);
          }
        }
      })[0].addEventListener('click', event => {  // `.on()` can’t register to capture phase
        if (event.target.classList.contains('counter-button')) {
          event.stopImmediatePropagation();
          const $target = $(event.target);
          Inventory.changeMarkerAmount(
            $target.closest('.collectible-wrapper')[0].rdoItem.legacyItemId,
            $target.text() === '-' ? -1 : 1
          );
        } else if (event.target.classList.contains('open-submenu')) {
          event.stopPropagation();
          $(event.target).toggleClass('rotate')
            .parent().parent().children('.menu-hidden').toggleClass('opened')
        }
      }, {capture: true});
  }
  _insertMenuElement() {
    this.$menuButton = $(`
      <div class="collectible-wrapper" data-type="${this.legacyItemId}"
        data-help="${['flower_agarita', 'flower_blood_flower'].includes(this.itemId) ?
          'item_night_only' : 'item'}">
        <img class='collectible-icon' src="assets/images/icons/game/${this.itemId}.png"
          alt='Set icon'>
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
    this.amount = this.amount;  // trigger counter update
    this.$menuButton
      .appendTo(this.collection.$submenu)
    Loader.mapModelLoaded.then(() => {
      SettingProxy.addListener(InventorySettings, 'isEnabled', () =>
        this.$menuButton
          .find('.counter')
            .toggle(InventorySettings.isEnabled)
          .end()
      ) ();
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
    const buggy = currentMarkers.every(marker => marker.tool == -1);
    this.$menuButton
      .attr('data-help', () => {
        if (buggy) {
          return 'item_unavailable';
        } else if (['flower_agarita', 'flower_blood_flower'].includes(this.itemId)) {
          return 'item_night_only';
        } else if (this.isWeekly()) {
          return 'item_weekly';
        } else {
          return 'item';
        }
      })
      .toggleClass('not-found', buggy)
      .toggleClass('disabled', currentMarkers.every(marker => !marker.canCollect))
      .toggleClass('weekly-item', this.isWeekly())
      .find('.counter')
        .toggle(InventorySettings.isEnabled)
      .end()

    return buggy;
  }
}