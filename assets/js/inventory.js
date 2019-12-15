var Inventory = {
    isEnabled: $.cookie('inventory-enabled') ? $.cookie('inventory-enabled') == 'true' : typeof $.cookie('inventory-enabled') === 'undefined' ? true : false,
    stackSize: parseInt($.cookie('inventory-stack')) ? parseInt($.cookie('inventory-stack')) : 10,

    init: function(){ 
        $('#enable-inventory').val(Inventory.isEnabled.toString());
        $('#inventory-stack').val(Inventory.stackSize);
    },

    changeMarkerAmount: function (name, amount) {
        var marker = markers.filter(_m => {
          return (_m.text == name || _m.subdata == name);
        });
    
        $.each(marker, function (key, _m) {
    
          _m.amount = parseInt(_m.amount) + amount;
          if (_m.amount >= Inventory.stackSize)
            _m.amount = Inventory.stackSize;
          if (_m.amount < 0)
            _m.amount = 0;
    
          _m.canCollect = _m.amount < Inventory.stackSize && !_m.isCollected;
          if ((_m.isCollected || _m.amount >= Inventory.stackSize)/* && (_m.day == day || _m.day.includes(day))*/) {
            $('[data-marker=' + _m.text + ']').css('opacity', '.35');
            $(`[data-type=${_m.text}]`).addClass('disabled');
          } else /*if((_m.day == day || _m.day.includes(day)))*/ {
            $('[data-marker=' + _m.text + ']').css('opacity', '1');
            $(`[data-type=${_m.text}]`).removeClass('disabled');
          }
    
          $(`small[data-item=${name}]`).text(marker[0].amount);
          $(`p.collectible[data-type=${name}] > small`).text(marker[0].amount);
    
          //If the category is disabled, no needs to update popup
          if (Layers.itemMarkersLayer.getLayerById(_m.text) != null && _m.day == Cycles.data.cycles[currentCycle][_m.category])
            Layers.itemMarkersLayer.getLayerById(_m.text)._popup.setContent(MapBase.updateMarkerContent(_m));
    
        });
        //Layers.itemMarkersLayer.removeLayer(Layers.itemMarkersLayer.getLayerById(marker.text));
        //MapBase.addMarkerOnMap(marker);
        if ($("#routes").val() == 1)
          Routes.drawLines();
        MapBase.save();
      }
}