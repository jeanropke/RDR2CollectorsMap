var Inventory = {
  isEnabled: $.cookie('inventory-enabled') == '1',
  isPopupEnabled: $.cookie('inventory-popups-enabled') == '1',
  isMenuUpdateEnabled: $.cookie('inventory-menu-update-enabled') == '1',
  stackSize: parseInt($.cookie('inventory-stack')) ? parseInt($.cookie('inventory-stack')) : 10,
  resetButtonUpdatesInventory: $.cookie('reset-updates-inventory-enabled') == '1',
  items: {},

  init: function () {
    if ($.cookie('inventory-popups-enabled') === undefined) {
      Inventory.isPopupEnabled = true;
      $.cookie('inventory-popups-enabled', '1', { expires: 999 });
    }

    if ($.cookie('inventory-menu-update-enabled') === undefined) {
      Inventory.isMenuUpdateEnabled = true;
      $.cookie('inventory-menu-update-enabled', '1', { expires: 999 });
    }

    if ($.cookie('reset-updates-inventory-enabled') === undefined) {
      Inventory.resetButtonUpdatesInventory = false;
      $.cookie('reset-updates-inventory-enabled', '0', { expires: 999 });
    }

    $('#enable-inventory').prop("checked", Inventory.isEnabled);
    $('#enable-inventory-popups').prop("checked", Inventory.isPopupEnabled);
    $('#enable-inventory-menu-update').prop("checked", Inventory.isMenuUpdateEnabled);
    $('#reset-collection-updates-inventory').prop("checked", Inventory.resetButtonUpdatesInventory);
    $('#inventory-stack').val(Inventory.stackSize);

    this.toggleMenuItemsDisabled();
  },

  load: function () {
    if (localStorage.getItem("inventory-items") !== null) {
      var _items = localStorage.getItem("inventory-items");

      if (_items == null) return;

      _items.split(';').forEach(item => {
        if (item == '') return;
        var properties = item.split(':');
        Inventory.items[properties[0]] = parseInt(properties[2]);
      });

      localStorage.clear("inventory-items");
      localStorage.setItem("inventory", JSON.stringify(Inventory.items));
    }

    Inventory.items = JSON.parse(localStorage.getItem("inventory"));
    if (Inventory.items === null) Inventory.items = {};

    ItemsValue.load();
  },

  changeMarkerAmount: function (name, amount, skipInventory = false) {
    if (!Inventory.isEnabled) return;

    var marker = MapBase.markers.filter(marker => {
      return (marker.text == name || marker.subdata == name);
    });

    $.each(marker, function (key, marker) {
      if (!skipInventory || skipInventory && Inventory.isMenuUpdateEnabled) {
        marker.amount = parseInt(marker.amount) + amount;

        if (marker.amount >= Inventory.stackSize)
          marker.amount = Inventory.stackSize;

        if (marker.amount < 0)
          marker.amount = 0;
      }

      var small = $(`small[data-item=${name}]`).text(marker.amount);
      var cntnm = $(`[data-type=${name}] .counter-number`).text(marker.amount);

      small.toggleClass('text-danger', marker.amount >= Inventory.stackSize);
      cntnm.toggleClass('text-danger', marker.amount >= Inventory.stackSize);

      //If the category is disabled, no needs to update popup
      if (Settings.isPopupsEnabled && Layers.itemMarkersLayer.getLayerById(marker.text) != null && marker.day == Cycles.categories[marker.category])
        Layers.itemMarkersLayer.getLayerById(marker.text)._popup.setContent(MapBase.updateMarkerContent(marker));
    });

    if ($("#routes").val() == 1)
      Routes.drawLines();

    Inventory.save();
    Menu.refreshItemsCounter();
    ItemsValue.reloadInventoryItems();
  },

  stackHasSpace: function (marker) {
    return marker.amount < Inventory.stackSize;
  },

  save: function () {
    $.each(MapBase.markers, function (key, marker) {
      if (marker.category == 'random') return;

      if (marker.subdata)
        Inventory.items[`${marker.category}_${marker.subdata}`] = marker.amount;
      else
        Inventory.items[marker.text] = marker.amount;
    });

    localStorage.setItem("inventory", JSON.stringify(Inventory.items));
  },

  toggleMenuItemsDisabled: function () {
    if (!Inventory.isEnabled) {
      $('#enable-inventory-popups').parent().parent().hide();
      $('#enable-inventory-menu-update').parent().parent().hide();
      $('#reset-collection-updates-inventory').parent().parent().hide();
      $('#inventory-stack').parent().hide();
      $('#open-clear-inventory-modal').hide();
    } else {
      $('#enable-inventory-popups').parent().parent().show();
      $('#enable-inventory-menu-update').parent().parent().show();
      $('#reset-collection-updates-inventory').parent().parent().show();
      $('#inventory-stack').parent().show();
      $('#open-clear-inventory-modal').show();
    }
  }
};