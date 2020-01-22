var Inventory = {
  isEnabled: $.cookie('inventory-enabled') == '1',
  isPopupEnabled: $.cookie('inventory-popups-enabled') == '1',
  isMenuUpdateEnabled: $.cookie('inventory-menu-update-enabled') == '1',
  stackSize: parseInt($.cookie('inventory-stack')) ? parseInt($.cookie('inventory-stack')) : 10,
  resetButtonUpdatesInventory: $.cookie('reset-updates-inventory-enabled') == '1',

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

  changeMarkerAmount: function (name, amount, skipInventory = false) {
    var marker = MapBase.markers.filter(_m => {
      return (_m.text == name || _m.subdata == name);
    });

    $.each(marker, function (key, _m) {
      if (Inventory.isEnabled && (!skipInventory || skipInventory && Inventory.isMenuUpdateEnabled)) {
        _m.amount = parseInt(_m.amount) + amount;

        if (_m.amount >= Inventory.stackSize)
          _m.amount = Inventory.stackSize;

        if (_m.amount < 0)
          _m.amount = 0;
      }

      _m.canCollect = _m.amount < Inventory.stackSize && !_m.isCollected;

      if ((_m.isCollected || _m.amount >= Inventory.stackSize) && _m.day == Cycles.data.cycles[Cycles.data.current][_m.category]) {
        $(`[data-marker=${_m.text}]`).css('opacity', Settings.markerOpacity / 3);
        $(`[data-type=${_m.subdata || _m.text}]`).addClass('disabled');
      } else if (_m.day == Cycles.data.cycles[Cycles.data.current][_m.category]) {
        $(`[data-marker=${_m.text}]`).css('opacity', Settings.markerOpacity);
        $(`[data-type=${_m.subdata || _m.text}]`).removeClass('disabled');
      }

      $(`small[data-item=${name}]`).text(marker[0].amount);
      $(`[data-type=${name}] .counter-number`).text(marker[0].amount);

      //If the category is disabled, no needs to update popup
      if (Settings.isPopupsEnabled && Layers.itemMarkersLayer.getLayerById(_m.text) != null && _m.day == Cycles.data.cycles[Cycles.data.current][_m.category])
        Layers.itemMarkersLayer.getLayerById(_m.text)._popup.setContent(MapBase.updateMarkerContent(_m));
    });

    if ($("#routes").val() == 1)
      Routes.drawLines();

    MapBase.save();
    Menu.refreshItemsCounter();
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
}