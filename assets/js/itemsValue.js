var ItemsValue = {
  data: [],
  collectedItemsData: {},
  finalValue: 0,
  collectionsNames: ['flower', 'cups', 'swords', 'wands', 'pentacles', 'bracelet', 'earring', 'necklace', 'ring', 'bottle', 'egg', 'arrowhead', 'heirlooms', 'coin'],

  load: function () {
    $.getJSON('data/items_value.json?nocache=' + nocache)
      .done(function (_data) {
        ItemsValue.data = _data;
        ItemsValue.reloadInventoryItems();
      });
  },

  reloadInventoryItems: function () {
    this.resetItemsData();

    var inventoryItems = InventorySettings.isEnabled ? Inventory.items : MapBase.collectedItems;

    $.each(inventoryItems, function (key, value) {
      if (key.indexOf('random_item') !== -1)
        return;

      var itemName = key.replace(/_\d/, '');
      var itemAmount = (InventorySettings.isEnabled ? value : value ? 1 : 0);
      var tempCategory = itemName.split("_")[0];

      if (ItemsValue.collectedItemsData[tempCategory].indexOf(itemName) === -1) {
        ItemsValue.collectedItemsData[tempCategory].push(itemName);
        ItemsValue.collectedItemsData[`${tempCategory}_amount`].push(itemAmount);
      }
    });

    $.each(this.collectionsNames, function (key, name) {
      ItemsValue.collectionsCount(name);
    });
  },

  collectionsCount: function (category) {
    var tempArr = this.collectedItemsData[`${category}_amount`].slice();
    var collections = tempArr.sort((a, b) => a - b)[0];
    this.collectedItemsData[`${category}_amount`] = this.collectedItemsData[`${category}_amount`].map(item => item - collections);

    this.finalValue += this.data.full[category] * collections;

    $.each(this.collectedItemsData[category], function (key, item) {
      var multiplier = ItemsValue.collectedItemsData[`${category}_amount`][key];
      var itemName = ItemsValue.collectedItemsData[category][key];
      var itemValue = ItemsValue.data.items[itemName];

      ItemsValue.finalValue += itemValue * multiplier;
    });

    this.updateValue();
  },

  resetItemsData: function () {
    this.finalValue = 0;
    $.each(this.collectionsNames, function (key, collection) {
      ItemsValue.collectedItemsData[collection] = [];
      ItemsValue.collectedItemsData[`${collection}_amount`] = [];
    });
  },

  updateValue: function () {
    $('#items-value').text(`$${this.finalValue.toFixed(2)}`);
  }
};