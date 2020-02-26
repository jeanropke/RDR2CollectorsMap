var ItemsValue = {
  data: [],
  collectedItemsData: {},
  finalValue: 0,

  collectionsLength: [
    ['flower', 9],
    ['cups', 14],
    ['swords', 14],
    ['wands', 14],
    ['pentacles', 14],
    ['bracelet', 8],
    ['earring', 11],
    ['necklace', 9],
    ['ring', 11],
    ['bottle', 9],
    ['egg', 9],
    ['arrowhead', 12],
    ['heirlooms', 15],
    ['coin', 15]
  ],

  load: function () {
    $.getJSON('data/items_value.json?nocache=' + nocache)
      .done(function (_data) {
        ItemsValue.data = _data;
        ItemsValue.reloadInventoryItems();
      });
  },

  reloadInventoryItems: function () {
    this.resetItemsData();

    var inventoryItems = [];
    if (Inventory.isEnabled) {
      inventoryItems = Inventory.items;
    } else {
      inventoryItems = MapBase.collectedItems.filter(function (marker) { return marker.indexOf('random_item') === 0; });
    }

    $.each(inventoryItems, function (key, value) {
      var itemName = key;
      itemName = itemName.replace(/_\d/, '');

      var itemAmount = (Inventory.isEnabled ? value : value ? 1 : 0);
      var tempCategory = itemName.split("_")[0];

      if (ItemsValue.collectedItemsData[tempCategory].indexOf(itemName) === -1) {
        ItemsValue.collectedItemsData[tempCategory].push(itemName);
        ItemsValue.collectedItemsData[`${tempCategory}_amount`].push(itemAmount);
      }
    });

    this.checkArrLength();
  },

  fullCollectionsCount: function (category) {
    var tempArr = ItemsValue.collectedItemsData[`${category}_amount`].slice();
    var collections = tempArr.sort((a, b) => a - b)[0];
    this.collectedItemsData[`${category}_amount`] = this.collectedItemsData[`${category}_amount`].map(item => item - collections);

    this.finalValue += this.data.full[category] * collections;
  },

  notFullCollectionsCount: function (category) {
    $.each(this.collectedItemsData[category], function (key, item) {
      var multiplier = ItemsValue.collectedItemsData[`${category}_amount`][key];
      var itemName = ItemsValue.collectedItemsData[category][key];
      var itemValue = ItemsValue.data.items[itemName];

      ItemsValue.finalValue += itemValue * multiplier;
    });

    this.updateValue();
  },

  checkArrLength: function () {
    $.each(this.collectionsLength, function (key, value) {
      if (ItemsValue.collectedItemsData[ItemsValue.collectionsLength[key][0]].length === ItemsValue.collectionsLength[key][1])
        ItemsValue.fullCollectionsCount(ItemsValue.collectionsLength[key][0]);

      ItemsValue.notFullCollectionsCount(ItemsValue.collectionsLength[key][0]);
    });

  },

  resetItemsData: function () {
    this.finalValue = 0;
    $.each(this.collectionsLength, function (key, collection) {
      ItemsValue.collectedItemsData[collection[0]] = [];
      ItemsValue.collectedItemsData[`${collection[0]}_amount`] = [];
    });
  },

  updateValue: function () {
    $('#items-value').text(` - $${this.finalValue.toFixed(2)}`);
  }

};