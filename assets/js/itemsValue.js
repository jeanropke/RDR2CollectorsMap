class Collection {
  constructor(preliminary) {
    Object.assign(this, preliminary);
  }
}

class Item {
  constructor(preliminary) {
    Object.assign(this, preliminary);
  }
  static init() {
    this.items = Object.create(null);
    Collection.collections = Object.create(null);
    return $.getJSON('data/items_value.json?nocache=' + nocache)
      .then(data => {
        Object.entries(data.items).forEach(([itemId, value]) =>
          this.items[itemId] = new Item({itemId, value}));
        Object.entries(data.full).forEach(([category, value]) =>
          Collection.collections[category] = new Collection({category, value}));
        ItemsValue.reloadInventoryItems();
      });
  }
}

var ItemsValue = {
  collectedItemsData: {},
  finalValue: 0,
  collectionsNames: ['flower', 'cups', 'swords', 'wands', 'pentacles', 'bracelet', 'earring', 'necklace', 'ring', 'bottle', 'egg', 'arrowhead', 'heirlooms', 'coin'],

  reloadInventoryItems: function () {
    'use strict';
    this.finalValue = 0;
    this.collectionsNames.forEach(collection => {
      this.collectedItemsData[collection] = [];
      this.collectedItemsData[`${collection}_amount`] = [];
    });

    let inventoryItems = {};
    if (InventorySettings.isEnabled) {
      inventoryItems = Inventory.items;
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

    this.collectionsNames.forEach(name => this.collectionsCount(name));

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