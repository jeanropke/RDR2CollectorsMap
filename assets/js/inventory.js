var Inventory = {
  items: {},
  highlightStyles: { STATIC_RECOMMENDED: 0, STATIC_DEFAULT: 1, ANIMATED_RECOMMENDED: 2, ANIMATED_DEFAULT: 3 },

  init: function () {
    $('#enable-inventory-menu-update').prop("checked", InventorySettings.isMenuUpdateEnabled);
    $('#enable-inventory-popups').prop("checked", InventorySettings.isPopupsEnabled);
    $('#enable-inventory').prop("checked", InventorySettings.isEnabled);
    $('#highlight_low_amount_items').prop("checked", InventorySettings.highlightLowAmountItems);
    $('#highlight_style').val(InventorySettings.highlightStyle);
    $('#inventory-container').toggleClass("opened", InventorySettings.isEnabled);
    $('#inventory-stack').val(InventorySettings.stackSize);
    $('#soft-flowers-inventory-stack').val(InventorySettings.flowersSoftStackSize);
    $('#reset-collection-updates-inventory').prop("checked", InventorySettings.resetButtonUpdatesInventory);
    $('#auto-enable-sold-items').prop("checked", InventorySettings.autoEnableSoldItems);
    $('#reset-inventory-daily').prop("checked", InventorySettings.resetInventoryDaily);
    $('#enable-additional-inventory-options').prop("checked", InventorySettings.enableAdvancedInventoryOptions);


    // disable dropdown menu if highlight low amount items is disabled:
    $('[data-help="highlight_style"]').toggleClass('disabled', !InventorySettings.highlightLowAmountItems);
    $('#highlight_low_amount_items').on('change', function () {
      $('[data-help="highlight_style"]').toggleClass('disabled', !InventorySettings.highlightLowAmountItems);
    });
    $('.collection-value-bottom').toggleClass('hidden', !InventorySettings.enableAdvancedInventoryOptions);
  },

  updateItemHighlights: function myself(fromTimer) {
    'use strict';
    if (!InventorySettings.isEnabled || !InventorySettings.highlightLowAmountItems) {
      return;
    }
    if (fromTimer) {
      delete myself.timer;
    } else {
      if (!myself.timer) {
        myself.timer = setTimeout(myself, 0, true);
      }
      return;
    }
    Object.entries(Collection.collections).forEach(([category, collection]) => {
      const contourImg = $(`[data-marker*=${category}] > img.marker-contour`);
      contourImg.removeClass(function (index, className) {
        return (className.match(/highlight-low-amount-items-\S+/gm) || []).join(' ');
      });
      contourImg.css('--animation-target-opacity', 0.0);
      contourImg.css("opacity", 0.0);

      if (!enabledCategories.includes(category)) return;

      var markers = MapBase.markers.filter(_m => _m.category === category && _m.isCurrent);

      const collectionAverage = collection.averageAmount();
      markers.map(_m => {
        Inventory.updateMarkerColor(_m);

        if (!_m.canCollect) return;

        const weight = Math.max(0, ((collectionAverage - _m.item.amount) /
          InventorySettings.stackSize));
        const scaledWeight = Math.min(1, weight * 2.4);

        const contourImg = $(`[data-marker=${_m.text}] > img.marker-contour`);
        if (weight < 0.02) {
          contourImg.css('opacity', 0.0);
        }
        else if (weight < 0.3 ||
          InventorySettings.highlightStyle < Inventory.highlightStyles.ANIMATED_RECOMMENDED) {
            contourImg.css('opacity', scaledWeight);
        }
        else {
          contourImg.css('--animation-target-opacity', scaledWeight);
          contourImg.addClass(`highlight-low-amount-items-animated`);
        }
      });
    });
  },

  updateMarkerColor: function (marker) {
    var markerBackgroundColor = MapBase.getIconColor(marker);
    var markerContourColor = MapBase.getContourColor(markerBackgroundColor);

    var markerSrc = `./assets/images/icons/marker_${markerBackgroundColor}.png?v=${nocache}`;
    var markerContourSrc = `./assets/images/icons/contours/contour_marker_${markerContourColor}.png?v=${nocache}`;

    $(`[data-marker=${marker.text}] > img.marker-contour`).attr('src', markerContourSrc);
    $(`[data-marker=${marker.text}] > img.background`).attr('src', markerSrc);
  },

  changeMarkerAmount: function (legacyItemId, changeAmount, skipInventory = false) {
    var sameItemMarkers = MapBase.markers.filter(marker => marker.legacyItemId === legacyItemId);

    const item = sameItemMarkers[0].item;
    if (item && (!skipInventory || skipInventory && InventorySettings.isMenuUpdateEnabled)) {
      item.amount += changeAmount;
    }

    sameItemMarkers.forEach(marker => {
      if (!InventorySettings.isEnabled) return;

      const popup = marker.lMarker && marker.lMarker.getPopup();
      if (popup) popup.update();

      const amount = marker.item && marker.item.amount;
      $(`[data-type=${legacyItemId}] .counter-number`)
        .text(amount)
        .toggleClass('text-danger', amount >= InventorySettings.stackSize);

      if ((marker.isCollected ||
        (InventorySettings.isEnabled && amount >= InventorySettings.stackSize)) &&
        marker.isCurrent ||
        (marker.category === 'flower' && amount >= InventorySettings.flowersSoftStackSize)) {
        $(`[data-marker=${marker.text}]`).css('opacity', Settings.markerOpacity / 3);
        $(`[data-type=${marker.legacyItemId}]`).addClass('disabled');
      }
      else if (marker.isCurrent) {
        $(`[data-marker=${marker.text}]`).css('opacity', Settings.markerOpacity);
        $(`[data-type=${marker.legacyItemId}]`).removeClass('disabled');
      }

      if (marker.isCurrent && ['egg', 'flower'].includes(marker.category)) {
        $(`[data-type=${marker.legacyItemId}]`).toggleClass('disabled',
          sameItemMarkers.filter(m => m.cycleName === marker.cycleName).every(m => !m.canCollect));
      }

      Menu.refreshCollectionCounter(marker.category);
    });

    if ($("#routes").val() == 1)
      Routes.drawLines();

    Inventory.updateItemHighlights();
    Menu.refreshItemsCounter();
    Menu.refreshWeeklyItems();
  }
};