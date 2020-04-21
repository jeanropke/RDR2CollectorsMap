class Collection {
  constructor(preliminary) {
    Object.assign(this, preliminary);
    this.items = Object.values(Item.items).filter(item => item.category === this.category);
  }
}

class Item {
  constructor(preliminary) {
    Object.assign(this, preliminary);
    this.category = this.itemId.split('_', 1)[0];
    this.legacyItemId = this.itemId.replace(/^flower_|^egg_/, '');
    this._amountKey = `amount.${this.itemId}`;
  }
  static init() {
    this.items = Object.create(null);
    Collection.collections = Object.create(null);
    return Loader.promises['items_value'].consumeJson(data => {
      Object.entries(data.items).forEach(([itemId, value]) =>
        this.items[itemId] = new Item({itemId, value}));
      Object.entries(data.full).forEach(([category, value]) =>
        Collection.collections[category] = new Collection({category, value}));
      this.compatInit();
      ItemsValue.reloadInventoryItems();
    });
  }
  // prefill whenever “new” inventory is empty and “old” inventory exists
  // avoids deleting old inventory for the moment
  static compatInit() {
    const oldAmounts = JSON.parse(localStorage.getItem("inventory"));
    if (oldAmounts && !Object.keys(localStorage).some(key => key.startsWith('amount.'))) {
      Object.entries(Item.items).forEach(([itemId, item]) => item.amount = oldAmounts[itemId]);
      console.log('old amounts converted');
    }
  }
  get amount() {
    return +localStorage.getItem(this._amountKey);
  }
  set amount(value) {
    if (value) {
      localStorage.setItem(this._amountKey, value);
    } else {
      localStorage.removeItem(this._amountKey);
    }
  }
  static overwriteAmountFromMarkers() {
    MapBase.markers.forEach(marker => {
      if (marker.category !== 'random') Item.items[marker.itemId].amount = marker.amount;
    });
    Inventory.updateLowAmountItems();
  }
}

var ItemsValue = {
  collectedItemsData: {},
  finalValue: 0,

  reloadInventoryItems: function () {
    'use strict';
    this.finalValue = 0;
    Object.keys(Collection.collections).forEach(collection => {
      this.collectedItemsData[collection] = [];
      this.collectedItemsData[`${collection}_amount`] = [];
    });

    let inventoryItems = {};
    if (InventorySettings.isEnabled) {
      inventoryItems = Object.fromEntries(Object.entries(Item.items)
        .map(([itemId, item]) => [itemId, item.amount]));
    } else {
      MapBase.markers.forEach(marker => inventoryItems[marker.text] = marker.isCollected);
    }

    $.each(inventoryItems, (key, value) => {
      if (key.indexOf('random_item') !== -1)
        return;

      var itemName = key.replace(/_\d/, '');
      var itemAmount = (InventorySettings.isEnabled ? value : value ? 1 : 0);
      var tempCategory = itemName.split("_")[0];

      if (this.collectedItemsData[tempCategory].indexOf(itemName) === -1) {
        this.collectedItemsData[tempCategory].push(itemName);
        this.collectedItemsData[`${tempCategory}_amount`].push(itemAmount);
      }
    });

    Object.keys(Collection.collections).forEach(name => this.collectionsCount(name));

    $('#items-value').text(!isNaN(this.finalValue) ? `$${this.finalValue.toFixed(2)}` : '$0.00');
  },

  collectionsCount: function (category) {
    var tempArr = this.collectedItemsData[`${category}_amount`].slice();
    var collections = tempArr.sort((a, b) => a - b)[0];
    this.collectedItemsData[`${category}_amount`] = this.collectedItemsData[`${category}_amount`].map(item => item - collections);

    this.finalValue += Collection.collections[category].value * collections;

    $.each(this.collectedItemsData[category], (key, item) => {
      var multiplier = this.collectedItemsData[`${category}_amount`][key];
      var itemId = this.collectedItemsData[category][key];
      var itemValue = Item.items[itemId].value;

      this.finalValue += itemValue * multiplier;
    });
  }
};