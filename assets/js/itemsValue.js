var ItemsValue = {
  data: [],
  finalValue: 0,

  collectedItemsData: {
    flower: [],
    cups: [],
    swords: [],
    wands: [],
    pentacles: [],
    bracelet: [],
    earring: [],
    necklace: [],
    ring: [],
    bottle: [],
    egg: [],
    arrowhead: [],
    heirlooms: [],
    coin: [],

    flower_amount: [],
    cups_amount: [],
    swords_amount: [],
    wands_amount: [],
    pentacles_amount: [],
    bracelet_amount: [],
    earring_amount: [],
    necklace_amount: [],
    ring_amount: [],
    bottle_amount: [],
    egg_amount: [],
    arrowhead_amount: [],
    heirlooms_amount: [],
    coin_amount: []
  },

  load: function () {
    $.getJSON('data/items_value.json?nocache=' + nocache)
      .done(function (_data) {
        ItemsValue.data = _data;
        ItemsValue.reloadInventoryItems();
      });
  },

  reloadInventoryItems: function () {

    ItemsValue.resetItemsData();

    var _items = localStorage.getItem("inventory-items") || tempCollectedMarkers;
    var sepItems = _items.split(';');

    $.each(sepItems, function (key, item) {
      if (item == '') {
        ItemsValue.finalValue = 0;
        ItemsValue.updateValue();
        return;
      }
      else if (/random_item_\d+/.test(item)) {
        return;
      }

      var itemProperty = item.split(":");
      var itemName = itemProperty[0];
      itemName = itemName.replace(/_\d/, '');
      var itemAmount = (Inventory.isEnabled ? itemProperty[2] : itemProperty[1]);
      var tempCategory = itemProperty[0].split("_")[0];

      if (ItemsValue.collectedItemsData[tempCategory].indexOf(itemName) == -1) {
        ItemsValue.collectedItemsData[tempCategory].push(itemName);
        ItemsValue.collectedItemsData[`${tempCategory}_amount`].push(itemAmount);
      }
    });

    ItemsValue.checkArrLength();
  },

  fullCollectionsCount: function (category) {
    var tempArr = ItemsValue.collectedItemsData[`${category}_amount`].slice();
    var collections = tempArr.sort((a, b) => a - b)[0];
    ItemsValue.collectedItemsData[`${category}_amount`] = ItemsValue.collectedItemsData[`${category}_amount`].map(item => item - collections);

    ItemsValue.finalValue += ItemsValue.data.full[category] * collections;
  },

  notFullCollectionsCount: function (category) {
    $.each(ItemsValue.collectedItemsData[category], function (key, item) {
      var multiplier = ItemsValue.collectedItemsData[`${category}_amount`][key];
      var itemName = ItemsValue.collectedItemsData[category][key];
      var itemValue = ItemsValue.data.items[itemName];

      ItemsValue.finalValue += itemValue * multiplier;
    });

    ItemsValue.updateValue();
  },

  checkArrLength: function () {
    var collectionsLength = [
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
      ['coin', 15],
    ];

    $.each(collectionsLength, function (key, value) {
      if (ItemsValue.collectedItemsData[collectionsLength[key][0]].length === collectionsLength[key][1])
        ItemsValue.fullCollectionsCount(collectionsLength[key][0]);

      ItemsValue.notFullCollectionsCount(collectionsLength[key][0]);
    });

  },

  resetItemsData: function () {
    ItemsValue.finalValue = 0;
    $.each(ItemsValue.collectedItemsData, function (key, item) {
      ItemsValue.collectedItemsData[key] = [];
    });
  },

  updateValue: function () {
    $('#items-value').text(` / ${ItemsValue.finalValue.toFixed(2)}$`);
  }

};