const Inventory = {
  init: function () {
    document.getElementById('enable-inventory-menu-update').checked = InventorySettings.isMenuUpdateEnabled;
    document.getElementById('enable-inventory-popups').checked = InventorySettings.isPopupsEnabled;
    document.getElementById('enable-inventory').checked = InventorySettings.isEnabled;
    document.getElementById('highlight_low_amount_items').checked = InventorySettings.highlightLowAmountItems;
    document.getElementById('inventory-container').classList.toggle("opened", InventorySettings.isEnabled);
    document.getElementById('inventory-stack').value = InventorySettings.stackSize;
    document.getElementById('soft-flowers-inventory-stack').value = InventorySettings.flowersSoftStackSize;
    document.getElementById('auto-enable-sold-items').checked = InventorySettings.autoEnableSoldItems;
    document.getElementById('reset-inventory-daily').checked = InventorySettings.resetInventoryDaily;
    document.getElementById('enable-additional-inventory-options').checked = InventorySettings.enableAdvancedInventoryOptions;
    document.getElementById('filter-min-amount-items').value = InventorySettings.maxAmountLowInventoryItems;

    // disable dropdown menu if highlight low amount items is disabled:
    document.querySelector('[data-help="highlight_style"]').classList.toggle('disabled', !InventorySettings.highlightLowAmountItems);
    document.getElementById('highlight_low_amount_items').addEventListener('change', function() {
      document.querySelector('[data-help="highlight_style"]').classList.toggle('disabled', !InventorySettings.highlightLowAmountItems);
    });

    document.getElementById('import-rdo-inventory').addEventListener('click', function () {

      const file = document.getElementById('rdo-inventory-import-file').files[0];

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

    document.getElementById('inventory-script').addEventListener('click', function () {
      this.select();

      if (navigator && navigator.clipboard)
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

      importRDOInventoryModal.hide();
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

    Collection.collections.forEach(collection => {
      if (['arrowhead', 'coin', 'fossils_random', 'jewelry_random'].includes(collection.category)) return;
      const contourImgs = document.querySelectorAll(`[data-marker*=${collection.category}] img.marker-contour`);
      contourImgs.forEach(img => {
        img.classList.remove(...Array.from(img.classList).filter(className => (className.match(/highlight-low-amount-items-\S+/gm) || []).join(' ')));
        img.style.setProperty('--animation-target-opacity', '0.0');
        img.style.opacity = '0.0';
      });

      if (!enabledCategories.includes(collection.category)) return;

      const markers = MapBase.markers.filter(_m => _m.category === collection.category && _m.isCurrent);

      const collectionAverage = collection.averageAmount();
      markers.map(_m => {
        _m.updateColor();

        if (!_m.canCollect) return;

        const weight = Math.max(0, ((collectionAverage - _m.item.amount) /
          InventorySettings.stackSize));
        const scaledWeight = Math.min(1, weight * 2.4);

        const contourImg = document.querySelector(`[data-marker=${_m.text}] img.marker-contour`);
        if (!contourImg) return;
        if (weight < 0.02) {
          contourImg.style.opacity = '0.0';
        } else if (weight < 0.3 || InventorySettings.highlightStyle === 'static') {
          contourImg.style.opacity = scaledWeight;
        } else {
          contourImg.style.setProperty('--animation-target-opacity', scaledWeight);
          contourImg.classList.add('highlight-low-amount-items-animated');
        }
      });
    });
  },
};