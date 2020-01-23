/**
 * Created by Jean on 2019-10-09.
 */

var Menu = {
  reorderMenu: function (menu) {
    $(menu).children().sort(function (a, b) {
      return a.textContent.toLowerCase().localeCompare(b.textContent.toLowerCase());
    }).appendTo(menu);
  },

  refreshTreasures: function () {
    $('.menu-hidden[data-type=treasure]').children('.collectible-wrapper').remove();

    Treasures.data.filter(function (item) {
      var collectibleElement = $('<div>').addClass('collectible-wrapper').attr('data-type', item.text);
      var collectibleTextElement = $('<p>').addClass('collectible').text(Language.get(item.text));

      if (!Treasures.enabledTreasures.includes(item.text))
        collectibleElement.addClass('disabled');

      $('.menu-hidden[data-type=treasure]').append(collectibleElement.append(collectibleTextElement));
    });
  }
};

Menu.refreshMenu = function () {
  $('.menu-hidden[data-type]').children('.collectible-wrapper').remove();
  var weeklyItems = weeklySetData.sets[weeklySetData.current];

  $.each(MapBase.markers, function (_key, marker) {
    if (marker.day != Cycles.data.cycles[Cycles.data.current][marker.category]) return;

    // Only add subdata markers once.
    if (marker.subdata && $(`.menu-hidden[data-type=${marker.category}]`).children(`[data-type=${marker.subdata}]`).length > 0) return;

    var collectibleKey = null;
    var collectibleText = null;
    var collectibleTitle = null;

    if (marker.category == 'american_flowers') {
      collectibleKey = `flower_${marker.subdata}`;
    } else if (marker.category == 'bird_eggs') {
      collectibleKey = `egg_${marker.subdata}`;
    } else {
      collectibleKey = marker.text;
    }

    if (marker.subdata) {
      collectibleText = marker.subdata;
      collectibleTitle = Language.get(`${collectibleKey}.name`);
    } else {
      collectibleText = marker.text;
      collectibleTitle = marker.title;
    }

    var collectibleImage = null;

    // Prevents 404 errors. If doing the if-statement the other way round, jQuery tries to load the images.
    if (marker.category != 'random')
      collectibleImage = $('<img>').attr('src', `./assets/images/icons/game/${collectibleKey}.png`).addClass('collectible-icon');

    var collectibleElement = $('<div>').addClass('collectible-wrapper').attr('data-type', collectibleText);
    var collectibleTextWrapperElement = $('<span>').addClass('collectible-text');
    var collectibleTextElement = $('<p>').addClass('collectible').text(collectibleTitle);

    var collectibleCountDecreaseElement = $('<div>').addClass('counter-button').text('-');
    var collectibleCountTextElement = $('<div>').addClass('counter-number').text(marker.amount);
    var collectibleCountIncreaseElement = $('<div>').addClass('counter-button').text('+');

    collectibleCountDecreaseElement.on('click', function (e) {
      e.stopPropagation();
      Inventory.changeMarkerAmount(collectibleText, -1)
    });

    collectibleCountIncreaseElement.on('click', function (e) {
      e.stopPropagation();
      Inventory.changeMarkerAmount(collectibleText, 1)
    });

    var collectibleCountElement = $('<span>').addClass('counter').append(collectibleCountDecreaseElement).append(collectibleCountTextElement).append(collectibleCountIncreaseElement);

    if (!Inventory.isEnabled)
      collectibleCountElement.hide();

    if (marker.lat.length == 0)
      collectibleElement.addClass('not-found');

    if (marker.amount >= Inventory.stackSize)
      collectibleElement.addClass('disabled');

    if (marker.subdata) {
      var currentSubdataMarkers = MapBase.markers.filter(function (_marker) {
        if (marker.subdata != _marker.subdata)
          return false;

        if (_marker.day != Cycles.data.cycles[Cycles.data.current][_marker.category])
          return false;

        return true;
      });

      if (currentSubdataMarkers.every(function (marker) { return !marker.canCollect; }))
        collectibleElement.addClass('disabled');
    } else {
      if (!marker.canCollect)
        collectibleElement.addClass('disabled');
    }

    $(`.menu-hidden[data-type=${marker.category}]`).append(collectibleElement.append(collectibleImage).append(collectibleTextWrapperElement.append(collectibleTextElement).append(collectibleCountElement)));

    // set green color of weekly collection items
    $.each(weeklyItems, function (key, weeklyItem) {
      if (`flower_${marker.subdata}` == weeklyItem.item || `egg_${marker.subdata}` == weeklyItem.item)
        $(`[data-type=${marker.subdata}]`).addClass('weekly-item');
      // All other items
      if (marker.text == weeklyItem.item)
        $(`[data-type=${marker.text}]`).addClass('weekly-item');
    });
  });

  $('.menu-hidden[data-type]').each(function (key, value) {
    var category = $(this);

    if (category.data('type') == 'treasure') return;

    // if the cycle is the same as yesterday highlight category in menu;
    var isSameCycle = Cycles.isSameAsYesterday(category.data('type'));
    var hasCycleWarning = $(`[data-text="menu.${category.data('type')}"] .same-cycle-warning-menu`).length > 0;
    var element = $(`[data-text="menu.${category.data('type')}"]`);
    if (isSameCycle && !hasCycleWarning) {
      element.parent().attr('data-help', 'item_category_same_cycle');
      element.append(`<img class="same-cycle-warning-menu" src="./assets/images/same-cycle-alert.png">`);
    } else if (!isSameCycle && hasCycleWarning) {
      element.parent().attr('data-help', 'item_category');
      element.children('.same-cycle-warning-menu').remove();
    }

    if (category.data('type').includes('card_')) return;

    var children = category.children('.collectible-wrapper');

    children.sort(function (a, b) {
      return a.innerText.toLowerCase().localeCompare(b.innerText.toLowerCase());
    }).appendTo(this);
  })

  Menu.refreshTreasures();

  $.each(categoriesDisabledByDefault, function (key, value) {
    if (value.length > 0) {
      $('[data-type=' + value + ']').addClass('disabled');
    }
  });

  Menu.reorderMenu('.menu-hidden[data-type=treasure]');
};

Menu.showAll = function () {
  $.each(categoryButtons, function (key, value) {
    $(value).removeClass("disabled");
    $(`.menu-hidden[data-type=${$(value).attr('data-type')}]`).removeClass("disabled");
  });

  enabledCategories = categories;

  MapBase.addMarkers();
};

Menu.hideAll = function () {
  $.each(categoryButtons, function (key, value) {
    $(value).addClass("disabled");
    $(`.menu-hidden[data-type=${$(value).attr('data-type')}]`).addClass("disabled");
  });

  enabledCategories = [];

  MapBase.addMarkers();
  Treasures.addToMap();
  Encounters.addToMap();
};

Menu.refreshItemsCounter = function () {
  var _markers = MapBase.markers.filter(item => item.day == Cycles.data.cycles[Cycles.data.current][item.category] && item.isVisible);

  $('.collectables-counter').text(Language.get('menu.collectables_counter')
    .replace('{count}', _markers.filter(item => item.isCollected || item.amount >= Inventory.stackSize).length)
    .replace('{max}', _markers.length));
};

// Auto fill debug markers inputs, when "show coordinates on click" is enabled
Menu.liveUpdateDebugMarkersInputs = function (lat, lng) {
  $('#debug-marker-lat').val(lat);
  $('#debug-marker-lng').val(lng);
}
