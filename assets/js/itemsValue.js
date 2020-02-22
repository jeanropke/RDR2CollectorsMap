var ItemsValue = {
  //!-- ITEMS --//
  arrowhead: [],
  egg: [],
  coin: [],
  heirlooms: [],
  bottle: [],
  cups: [],
  pentacles: [],
  swords: [],
  wands: [],
  ring: [],
  earring: [],
  bracelet: [],
  necklace: [],
  flower: [],
  arrowhead_amount: [],
  egg_amount: [],
  coin_amount: [],
  heirlooms_amount: [],
  bottle_amount: [],
  cups_amount: [],
  pentacles_amount: [],
  swords_amount: [],
  wands_amount: [],
  ring_amount: [],
  earring_amount: [],
  bracelet_amount: [],
  necklace_amount: [],
  flower_amount: [],
  //!-- ITEMS --//

  data: [],
  finalValue: 0,

  load: function () {
    $.getJSON('data/items_value.json?nocache=' + nocache)
      .done(function (_data) {
        ItemsValue.data = _data;
        ItemsValue.reloadInventoryItems();
      });
  },

  reloadInventoryItems: function () {
    ItemsValue.finalValue = 0;
    for (var i = 0; i < 14; i++) {
      ItemsValue[Object.keys(ItemsValue)[i]] = [];
      ItemsValue[`${Object.keys(ItemsValue)[i]}_amount`] = [];
    }

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
      var itemAmount = itemProperty[2];
      var tempCategory = itemProperty[0].split("_")[0];

      if (ItemsValue[tempCategory].indexOf(itemName) == -1) {
        ItemsValue[tempCategory].push(itemName);
        ItemsValue[`${tempCategory}_amount`].push(itemAmount);
      }
    });

    ItemsValue.checkArrLength();
  },

  fullCollectionsCount: function (category) {
    var tempArr = ItemsValue[`${category}_amount`].slice();
    var collections = tempArr.sort((a, b) => a - b)[0];
    ItemsValue[`${category}_amount`] = ItemsValue[`${category}_amount`].map(item => item - collections);

    ItemsValue.finalValue += ItemsValue.data.full[category] * collections;
  },

  notFullCollectionsCount: function (category) {
    $.each(ItemsValue[category], function (key, item) {
      var multiplier = ItemsValue[`${category}_amount`][key];
      var itemName = ItemsValue[category][key];
      var itemValue = ItemsValue.data.items[itemName];

      ItemsValue.finalValue += itemValue * multiplier;
    });

    ItemsValue.updateValue();
  },

  checkArrLength: function () {
    var collectionsLength = [
      ['arrowhead', 12],
      ['egg', 9],
      ['coin', 15],
      ['heirlooms', 15],
      ['bottle', 9],
      ['cups', 14],
      ['pentacles', 14],
      ['swords', 14],
      ['wands', 14],
      ['ring', 11],
      ['earring', 11],
      ['bracelet', 8],
      ['necklace', 9],
      ['flower', 9]
    ];

    $.each(collectionsLength, function (key, value) {
      if (ItemsValue[collectionsLength[key][0]].length === collectionsLength[key][1])
        ItemsValue.fullCollectionsCount(collectionsLength[key][0]);

      ItemsValue.notFullCollectionsCount(collectionsLength[key][0]);
    });

  },

  updateValue: function () {
    $('#items-value').text(` / ${ItemsValue.finalValue.toFixed(2)}$`);
  }

};