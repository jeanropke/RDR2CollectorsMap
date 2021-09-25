const Inventory = {
  init: function () {
    $('#enable-inventory-menu-update').prop("checked", InventorySettings.isMenuUpdateEnabled);
    $('#enable-inventory-popups').prop("checked", InventorySettings.isPopupsEnabled);
    $('#enable-inventory').prop("checked", InventorySettings.isEnabled);
    $('#highlight_low_amount_items').prop("checked", InventorySettings.highlightLowAmountItems);
    $('#inventory-container').toggleClass("opened", InventorySettings.isEnabled);
    $('#inventory-stack').val(InventorySettings.stackSize);
    $('#soft-flowers-inventory-stack').val(InventorySettings.flowersSoftStackSize);
    $('#auto-enable-sold-items').prop("checked", InventorySettings.autoEnableSoldItems);
    $('#reset-inventory-daily').prop("checked", InventorySettings.resetInventoryDaily);
    $('#enable-additional-inventory-options').prop("checked", InventorySettings.enableAdvancedInventoryOptions);
    $('#filter-min-amount-items').val(InventorySettings.maxAmountLowInventoryItems);

    // disable dropdown menu if highlight low amount items is disabled:
    $('[data-help="highlight_style"]').toggleClass('disabled', !InventorySettings.highlightLowAmountItems);
    $('#highlight_low_amount_items').on('change', function () {
      $('[data-help="highlight_style"]').toggleClass('disabled', !InventorySettings.highlightLowAmountItems);
    });

    $('#import-rdo-inventory').on('click', function () {

      const file = $('#rdo-inventory-import-file').prop('files')[0];

      try {
        file.text().then((text) => {
          try {
            Inventory.import(text);
          } catch (error) {
            alert(Language.get('alerts.file_not_valid'));
            return;
          }
        });
      } catch (error) {
        alert(Language.get('alerts.file_not_valid'));
        console.log(error);
        return;
      }
    });

    $('#inventory-script').on('click', function () {
      this.select();
      navigator.clipboard.writeText(this.value);
    });
  },

  import: function (json) {
    try {
      let data = JSON.parse(json);
      Collection.collections.forEach((collection) => {
        collection.items.forEach((item) => {
          let _item = data.find(scItem => scItem.itemid == item.enumHash);

          if (_item == null) {
            item.amount = 0;
            return;
          }

          item.amount = _item.quantity;
        });
      });

      InventorySettings.isEnabled = true;
      
      $('#import-rdo-inventory-modal').modal('hide');
    } catch (error) {
      alert(Language.get('alerts.file_not_valid'));
      return;
    }

  },

  updateItemHighlights: function myself(fromTimer) {
    'use strict';
    if (!InventorySettings.isEnabled || !InventorySettings.highlightLowAmountItems) return;

    if (fromTimer) {
      delete myself.timer;
    } else {
      if (!myself.timer) {
        myself.timer = setTimeout(myself, 0, true);
      }
      return;
    }

    Collection.collections.forEach((collection) => {
      if (['arrowhead', 'coin', 'fossils_random', 'jewelry_random'].includes(collection.category)) return;

      const contourImg = $(`[data-marker*=${collection.category}] img.marker-contour`);
      contourImg.removeClass(function (index, className) {
        return (className.match(/highlight-low-amount-items-\S+/gm) || []).join(' ');
      });
      contourImg.css('--animation-target-opacity', 0.0);
      contourImg.css("opacity", 0.0);

      if (!enabledCategories.includes(collection.category)) return;

      const markers = MapBase.markers.filter(_m => _m.category === collection.category && _m.isCurrent);

      const collectionAverage = collection.averageAmount();
      markers.map(_m => {
        _m.updateColor();

        if (!_m.canCollect) return;

        const weight = Math.max(0, ((collectionAverage - _m.item.amount) /
          InventorySettings.stackSize));
        const scaledWeight = Math.min(1, weight * 2.4);

        const contourImg = $(`[data-marker=${_m.text}] img.marker-contour`);
        if (weight < 0.02) {
          contourImg.css('opacity', 0.0);
        } else if (weight < 0.3 || InventorySettings.highlightStyle === 'static') {
          contourImg.css('opacity', scaledWeight);
        } else {
          contourImg.css('--animation-target-opacity', scaledWeight);
          contourImg.addClass(`highlight-low-amount-items-animated`);
        }
      });
    });
  },
};