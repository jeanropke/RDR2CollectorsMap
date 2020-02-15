const Inventory = {
  isEnabled: $.cookie('inventory-enabled') == '1',
  isPopupEnabled: $.cookie('inventory-popups-enabled') == '1',
  isMenuUpdateEnabled: $.cookie('inventory-menu-update-enabled') == '1',
  stackSize: parseInt($.cookie('inventory-stack')) ? parseInt($.cookie('inventory-stack')) : 10,
  resetButtonUpdatesInventory: $.cookie('reset-updates-inventory-enabled') == '1',
  items: [],

  init: function () {
    if (typeof $.cookie('inventory-popups-enabled') === 'undefined') {
      Inventory.isPopupEnabled = true;
      $.cookie('inventory-popups-enabled', '1', { expires: 999 });
    }

    if (typeof $.cookie('inventory-menu-update-enabled') === 'undefined') {
      Inventory.isMenuUpdateEnabled = true;
      $.cookie('inventory-menu-update-enabled', '1', { expires: 999 });
    }

    if (typeof $.cookie('reset-updates-inventory-enabled') === 'undefined') {
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
    const items = localStorage.getItem("inventory-items") || tempCollectedMarkers;

    if (items == null)
      return;

    items.split(';').forEach(item => {
      if (item == '') return;

      const properties = item.split(':');

      Inventory.items[properties[0]] = {
        'isCollected': properties[1] == '1',
        'amount': properties[2]
      };

    });

  },

  changeMarkerAmount: function (name, amount, skipInventory = false) {
    const markers = MapBase.markers.filter(marker => {
      return (marker.text == name || marker.subdata == name);
    });

    $.each(markers, (_, marker) => {
      if (Inventory.isEnabled && (!skipInventory || skipInventory && Inventory.isMenuUpdateEnabled)) {
        marker.amount = parseInt(marker.amount) + amount;

        if (marker.amount >= Inventory.stackSize)
          marker.amount = Inventory.stackSize;

        if (marker.amount < 0)
          marker.amount = 0;
      }

      if (Inventory.isEnabled)
        marker.canCollect = marker.amount < Inventory.stackSize && !marker.isCollected;
      else
        marker.canCollect = !marker.isCollected;

      if ((marker.isCollected || (Inventory.isEnabled && marker.amount >= Inventory.stackSize)) && marker.day == Cycles.categories[marker.category]) {
        $(`[data-marker=${marker.text}]`).css('opacity', Settings.markerOpacity / 3);
        $(`[data-type=${marker.subdata || marker.text}]`).addClass('disabled');
      } else if (marker.day == Cycles.categories[marker.category]) {
        $(`[data-marker=${marker.text}]`).css('opacity', Settings.markerOpacity);
        $(`[data-type=${marker.subdata || marker.text}]`).removeClass('disabled');
      }

      $(`small[data-item=${name}]`).text(markers[0].amount);
      $(`[data-type=${name}] .counter-number`).text(markers[0].amount);

      //If the category is disabled, no needs to update popup
      if (Settings.isPopupsEnabled && Layers.itemMarkersLayer.getLayerById(marker.text) != null && marker.day == Cycles.categories[marker.category])
        Layers.itemMarkersLayer.getLayerById(marker.text)._popup.setContent(MapBase.updateMarkerContent(marker));
    });

    if ($("#routes").val() == 1)
      Routes.drawLines();

    Inventory.save();
    Menu.refreshItemsCounter();
  },

  save: function () {
    //Remove cookies from removed items
    $.removeCookie('removed-items');
    $.each($.cookie(), (key, _) => {
      if (key.startsWith('removed-items')) {
        $.removeCookie(key);
      }
    });

    let temp = "";
    $.each(MapBase.markers, (_, marker) => {
      if (marker.day == Cycles.categories[marker.category] && (marker.amount > 0 || marker.isCollected))
        temp += `${marker.text}:${marker.isCollected ? '1' : '0'}:${marker.amount};`;
    });

    localStorage.setItem("inventory-items", temp);

  },

  toggleMenuItemsDisabled: function () {
    if (!Inventory.isEnabled) {
      $('#enable-inventory-popups').parent().parent().hide();
      $('#enable-inventory-menu-update').parent().parent().hide();
      $('#reset-collection-updates-inventory').parent().parent().hide();
      $('#inventory-stack').parent().hide();
      $('[data-target="#clear-inventory-modal"]').hide();
    } else {
      $('#enable-inventory-popups').parent().parent().show();
      $('#enable-inventory-menu-update').parent().parent().show();
      $('#reset-collection-updates-inventory').parent().parent().show();
      $('#inventory-stack').parent().show();
      $('[data-target="#clear-inventory-modal"]').show();
    }
  }
};