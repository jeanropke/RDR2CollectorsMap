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
    Inventory.items = JSON.parse(localStorage.getItem("inventory"));
    if (Inventory.items === null) Inventory.items = {};

    $.each(MapBase.markers, function (key, marker) {
      if (marker.category == 'random') return;
      marker.amount = Inventory.items[marker.text.replace(/_\d/, '')];
    });

    ItemsValue.load();
  },

  save: function () {
    $.each(MapBase.markers, function (key, marker) {
      if (marker.category == 'random') return;
      Inventory.items[marker.text.replace(/_\d/, '')] = marker.amount;
    });

    localStorage.setItem("inventory", JSON.stringify(Inventory.items));
  },

  changeMarkerAmount: function (name, amount, skipInventory = false) {
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

      if (!Inventory.isEnabled) return;

      marker.canCollect = marker.amount < Inventory.stackSize && !marker.isCollected;

      var small = $(`small[data-item=${name}]`).text(marker.amount);
      var cntnm = $(`[data-type=${name}] .counter-number`).text(marker.amount);

      small.toggleClass('text-danger', marker.amount >= Inventory.stackSize);
      cntnm.toggleClass('text-danger', marker.amount >= Inventory.stackSize);

      // If the category is disabled, no needs to update popup
      if (Settings.isPopupsEnabled && marker.day == Cycles.categories[marker.category] && Layers.itemMarkersLayer.getLayerById(marker.text) != null)
        Layers.itemMarkersLayer.getLayerById(marker.text)._popup.setContent(MapBase.updateMarkerContent(marker));

      if ((marker.isCollected || (Inventory.isEnabled && marker.amount >= Inventory.stackSize)) && marker.day == Cycles.categories[marker.category]) {
        $(`[data-marker=${marker.text}]`).css('opacity', Settings.markerOpacity / 3);
        $(`[data-type=${marker.subdata || marker.text}]`).addClass('disabled');
      } else if (marker.day == Cycles.categories[marker.category]) {
        $(`[data-marker=${marker.text}]`).css('opacity', Settings.markerOpacity);
        $(`[data-type=${marker.subdata || marker.text}]`).removeClass('disabled');
      }

      MapBase.toggleCollectibleMenu(marker.day, marker.text, marker.subdata, marker.category);
    });

    if ($("#routes").val() == 1)
      Routes.drawLines();

    Inventory.save();
    Menu.refreshItemsCounter();
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