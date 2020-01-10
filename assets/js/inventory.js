var Inventory = {
  isEnabled: $.cookie('inventory-enabled') == '1',
  stackSize: parseInt($.cookie('inventory-stack')) ? parseInt($.cookie('inventory-stack')) : 10,

  init: function () {
    $('#enable-inventory').prop("checked", Inventory.isEnabled);
    $('#inventory-stack').val(Inventory.stackSize);
  },

  changeMarkerAmount: function (name, amount) {

    var marker = MapBase.markers.filter(_m => {
      return (_m.text == name || _m.subdata == name);
    });

    $.each(marker, function (key, _m) {

      if (Inventory.isEnabled) {
        _m.amount = parseInt(_m.amount) + amount;

        if (_m.amount >= Inventory.stackSize)
          _m.amount = Inventory.stackSize;

        if (_m.amount < 0)
          _m.amount = 0;
      }

      _m.canCollect = _m.amount < Inventory.stackSize && !_m.isCollected;

      if ((_m.isCollected || _m.amount >= Inventory.stackSize) && _m.day == Cycles.data.cycles[Cycles.data.current][_m.category]) {
        $(`[data-marker=${_m.text}]`).css('opacity', '.35');
        $(`[data-type=${_m.subdata || _m.text}]`).addClass('disabled');
      } else if (_m.day == Cycles.data.cycles[Cycles.data.current][_m.category]) {
        $(`[data-marker=${_m.text}]`).css('opacity', '1');
        $(`[data-type=${_m.subdata || _m.text}]`).removeClass('disabled');
      }

      $(`small[data-item=${name}]`).text(marker[0].amount);
      $(`[data-type=${name}] .counter-number`).text(marker[0].amount);

      //If the category is disabled, no needs to update popup
      if (Layers.itemMarkersLayer.getLayerById(_m.text) != null && _m.day == Cycles.data.cycles[Cycles.data.current][_m.category])
        Layers.itemMarkersLayer.getLayerById(_m.text)._popup.setContent(MapBase.updateMarkerContent(_m));
    });

    if ($("#routes").val() == 1)
      Routes.drawLines();

    MapBase.save();
  }
}