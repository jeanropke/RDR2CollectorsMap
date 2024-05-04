class Category { }
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
    return Promise.all([
      Loader.promises['weekly_sets'].consumeJson(({ sets }) => sets),
      Loader.promises['weekly'].consumeJson(({ set }) => set.replace('AWARD_ROLE_COLLECTOR_', '').toLowerCase()),
    ])
      .then(([sets, current]) => {
        this.current = new Weekly({ sets, current });
        this._installSettingsAndEventHandlers();
        console.info('%c[Weekly Set] Loaded!', 'color: #bada55; background: #242424');
      })
      .catch(() => {
        console.info('%c[Weekly Set] Unable to load!', 'color: #FF6969; background: #242424');
      });
  }
  // needs Item.items ready
  constructor(data) {
    super();
    const nameViaParam = getParameterByName('weekly');
    this.weeklyId = data.sets[nameViaParam] ? nameViaParam : data.current;
    this.weeklySetValue = data.sets[this.weeklyId].value;
    this.items = data.sets[this.weeklyId].items.map(itemId =>
      Item.items.find(i => i.itemId === itemId) || new NonCollectible({ itemId }));
    this.collectibleItems = this.items.filter(item => item.constructor === Item);
    this._insertMenuElements();
  }
  _insertMenuElements() {
    const menuEntry = document.createElement('div');
    menuEntry.id = 'weekly-container';
    menuEntry.innerHTML = `
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
          <span class="weekly-set-value" data-help="item_value">$${this.weeklySetValue.toFixed(2)}</span>
          <span class="collection-sell" data-text="menu.sell" data-help="item_sell">Sell</span>
        </div>
      </div>
    `;
    Language.translateDom(menuEntry);
    const insertation = document.querySelector('.links-container');
    insertation.parentNode.insertBefore(menuEntry, insertation);
    this.menuEntry = menuEntry;
    this.menuEntry.rdoCollection = this;
    this.listParent = this.menuEntry.querySelector('.weekly-item-listings');
    this.items.forEach(item => item._insertWeeklyMenuElement(this.listParent));
    Loader.mapModelLoaded.then(() => {
      SettingProxy.addListener(InventorySettings, 'isEnabled', () =>{
        this.menuEntry.querySelector('.collection-value').style.display = (InventorySettings.isEnabled || this.weeklySetValue !== 0) ? '' : 'none';
        this.menuEntry.querySelector('.collection-sell').style.display = InventorySettings.isEnabled ? '' : 'none';
        this.menuEntry.querySelector('.weekly-set-value').style.display = (this.weeklySetValue !== 0) ? '' : 'none';
      })();
    });
  }
  static _installSettingsAndEventHandlers() {
    SettingProxy.addSetting(Settings, 'showWeeklySettings', { default: true });
    const weeklyCheckbox = document.getElementById('show-weekly');
    Loader.mapModelLoaded.then(() => {
      SettingProxy.addListener(Settings, 'showWeeklySettings', () => {
        this.current.menuEntry.classList.toggle('opened', Settings.showWeeklySettings);
        weeklyCheckbox.checked = Settings.showWeeklySettings;
      })();
      weeklyCheckbox.addEventListener('change', () => {
        Settings.showWeeklySettings = weeklyCheckbox.checked;
        MapBase.addMarkers();
      });
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
    collections.forEach(({ category, price }) => this.collections.push(new Collection({ category, price })));
  }
  static updateMenu() {
    this.collections.forEach(collection => collection.updateMenu());
  }
  static switchCycle(categoriesArray, cycle) {
    categoriesArray.forEach(category => {
      document.querySelectorAll(`.input-cycle[name="${category}"]`).forEach(input => input.value = cycle);
      Cycles.categories[category] = cycle;
    });
  }
  static _installSettingsAndEventHandlers() {
    SettingProxy.addSetting(Settings, 'sortItemsAlphabetically', { default: false });
    Loader.mapModelLoaded.then(() => {
      const checkbox = document.getElementById('sort-items-alphabetically');
      checkbox.checked = Settings.sortItemsAlphabetically;
      checkbox.addEventListener('change', () => Settings.sortItemsAlphabetically = checkbox.checked);
      SettingProxy.addListener(Settings, 'sortItemsAlphabetically language', () =>
        Collection.collections.forEach(collection =>
          collection.menuSort(Settings.sortItemsAlphabetically)))();
        const sideMenu = document.querySelector('.side-menu');
        sideMenu.addEventListener('change', event => {
          const input = event.target;
          const collection = input.propSearchUp('rdoCollection');
          if (collection && input.classList.contains('input-cycle')) {
            event.stopImmediatePropagation();
            switch (collection.category) {
              case 'cups':
              case 'swords':
              case 'wands':
              case 'pentacles':
                this.switchCycle(['cups', 'swords', 'wands', 'pentacles'], +input.value);
                break;
              case 'bracelet':
              case 'earring':
              case 'necklace':
              case 'ring':
                this.switchCycle(['bracelet', 'earring', 'necklace', 'ring', 'jewelry_random'], +input.value);
                break;
              case 'coastal':
              case 'oceanic':
              case 'megafauna':
                this.switchCycle(['coastal', 'oceanic', 'megafauna', 'fossils_random'], +input.value);
                break;
              default:
                this.switchCycle([collection.category], +input.value);
                break;
            }
            MapBase.addMarkers();
            Menu.refreshMenu();
          }
        }, true);
        // on capture phase to override more generic handler in scripts.js
        sideMenu.addEventListener('click', event => {
          const etcL = event.target.classList;
          if (etcL.contains('input-cycle')) {
            // handled by browser _alone_: avoid own category enabled/disabled handler
          } else if (etcL.contains('collection-sell') || etcL.contains('collection-collect-all')) {
            const collection = event.target.propSearchUp('rdoCollection');
            const changeAmount = etcL.contains('collection-sell') ? -1 : 1;
            collection.items.forEach(i => i.changeAmountWithSideEffects(changeAmount));
            collection.currentMarkers().forEach(marker => {
              if (InventorySettings.autoEnableSoldItems && marker.item.amount === 0 && marker.isCollected) {
                MapBase.removeItemFromMap(marker.cycleName, marker.text, marker.subdata, marker.category, false);
              }
            });
          } else if (etcL.contains('collection-reset')) {
            const collection = event.target.propSearchUp('rdoCollection');
            collection.currentMarkers().filter(marker => !marker.canCollect).forEach(marker => {
              MapBase.removeItemFromMap(marker.cycleName, marker.text, marker.subdata, marker.category, true);
            });
          } else if (etcL.contains('disable-collected-items')) {
            const collection = event.target.propSearchUp('rdoCollection');
            collection.currentMarkers()
              .filter(marker => marker.canCollect && marker.item.amount > 0)
              .forEach(marker => {
                document.querySelector(`[data-type=${marker.legacyItemId}] .collectible-text p`).classList.add('disabled');
                MapBase.removeItemFromMap(marker.cycleName, marker.text, marker.subdata, marker.category, true);
              });
          } else {
            return; // event not for “us”
          }
          event.stopImmediatePropagation();
        }, true);
    });
  }
  _insertMenuElement() {
    const element = document.createElement('div');
    element.innerHTML = `
        <div class="menu-option clickable" data-type="${this.category}" data-help="item_category">
          <span>
            <img class="icon" src="assets/images/icons/${this.category}.png" alt="${this.category}">
            <span>
              <span class="menu-option-text" data-text="menu.${this.category}"></span>
              <img class="same-cycle-warning-menu" src="assets/images/same-cycle-alert.png">
            </span>
          </span>
          <input class="input-text input-cycle hidden" type="number" min="1" max="6"
            name="${this.category}" data-help="item_manual_cycle">
          <img class="cycle-icon hidden" src="assets/images/cycle_1.png" alt="Cycle 1"
            data-type="${this.category}">
          <div class="open-submenu"></div>
        </div>
        <div class="menu-hidden" data-type="${this.category}">
          <div class="collection-value">
            <span class="collection-collected" data-help="collection_collected"></span>
            <span data-help="item_value">$${this.price.toFixed(2)}</span>
            <span class="collection-reset" data-text="menu.reset" data-help="item_reset">Reset</span>
            <span class="collection-sell" data-text="menu.sell" data-help="item_sell">Sell</span>
          </div>
          <div class="collection-value-bottom">
            <span class="disable-collected-items" data-text="menu.disable_collected_items" data-help="disable_collected_items">Disable collected</span>
            <span class="collection-collect-all" data-text="menu.collection_collect_all" data-help="collection_collect_all">Collect all</span>
          </div>
        </div>
      </div>
    `;
    Language.translateDom(element);
    element.querySelector('.input-cycle').classList.add('hidden');
    element.querySelector('.cycle-icon').classList.add('hidden');
    // improve visuals during initial loading
    const insertation = document.getElementById('collection-insertion-before-point');
    insertation.parentNode.insertBefore(element, insertation);
    element.rdoCollection = this;
    this.menuButton = element.children[0];
    this.submenu = element.children[1];
    this.menuButton.querySelector('.same-cycle-warning-menu').style.display = 'none';
    Loader.mapModelLoaded.then(() => {
      SettingProxy.addListener(Settings, 'isCycleInputEnabled', () => {
        this.menuButton.querySelector('.input-cycle').classList.toggle('hidden', !Settings.isCycleInputEnabled);
        this.menuButton.querySelector('.cycle-icon').classList.toggle('hidden', !Settings.isCyclesVisible || Settings.isCycleInputEnabled);
      })();
      SettingProxy.addListener(InventorySettings, 'isEnabled enableAdvancedInventoryOptions', () => {
        this.submenu.querySelector('.collection-sell').style.display = InventorySettings.isEnabled ? '' : 'none';
        this.submenu.querySelector('.collection-value-bottom').style.display = (InventorySettings.isEnabled && InventorySettings.enableAdvancedInventoryOptions) ? '' : 'none';
      })();
    });
  }
  updateMenu() {
    const categoryItems = this.items.map(item => item.updateMenu());
    const containsBuggedItems = categoryItems.some(item => item.isBugged);
    const containsRandomItems = categoryItems.some(item => item.isRandom);
    const isSameCycle = Cycles.isSameAsYesterday(this.category);
    this.menuButton.dataset.help = (() => {
      if (isSameCycle) {
        return 'item_category_same_cycle';
      } else if (containsBuggedItems && containsRandomItems) {
        return 'item_category_unavailable_items';
      } else if (containsBuggedItems) {
        return 'item_category_bugged_items';
      } else if (containsRandomItems) {
        return 'item_category_random_items';
      } else {
        return 'item_category';
      }
    })();
    this.menuButton.classList.toggle('random-category', containsRandomItems);
    this.menuButton.classList.toggle('not-found', containsBuggedItems);
    this.menuButton.querySelector('.same-cycle-warning-menu').style.display = isSameCycle !== false ? '' : 'none';
    this.updateCounter();
  }
  updateCounter() {
    this.submenu.querySelector('.collection-collected').textContent = Language.get('menu.collection_counter')
      .replace('{count}', this.submenu.querySelectorAll('.disabled').length)
      .replace('{max}', this.items.length);;
  }
  menuSort(alphabetically) {
    if (['cups', 'swords', 'wands', 'pentacles'].includes(this.category)) return;
    const items = !alphabetically ? this.items : [...this.items].sort((...args) => {
      const [a, b] = args.map(item => Language.get(item.itemTranslationKey));
      return a.localeCompare(b, Settings.language, { sensitivity: 'base' });
    });
    items.forEach(item => this.submenu.appendChild(item.menuButton));
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