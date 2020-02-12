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
  var anyUnavailableCategories = [];

  $.each(MapBase.markers, function (_key, marker) {
    if (marker.day != Cycles.categories[marker.category]) return;

    // Only add subdata markers once.
    if (marker.subdata && $(`.menu-hidden[data-type=${marker.category}]`).children(`[data-type=${marker.subdata}]`).length > 0) return;

    var collectibleKey = null;
    var collectibleText = null;
    var collectibleTitle = null;

    switch (marker.category) {
      case 'american_flowers':
        collectibleKey = `flower_${marker.subdata}`;
        break;
      case 'bird_eggs':
        collectibleKey = `egg_${marker.subdata}`;
        break;
      default:
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

    var collectibleElement = $('<div>').addClass('collectible-wrapper').attr('data-help', 'item').attr('data-type', collectibleText);
    var collectibleTextWrapperElement = $('<span>').addClass('collectible-text');
    var collectibleTextElement = $('<p>').addClass('collectible').text(collectibleTitle);

    var collectibleCountDecreaseElement = $('<div>').addClass('counter-button').text('-');
    var collectibleCountTextElement = $('<div>').addClass('counter-number').text(marker.amount);
    var collectibleCountIncreaseElement = $('<div>').addClass('counter-button').text('+');

    collectibleCountDecreaseElement.on('click', function (e) {
      e.stopPropagation();
      Inventory.changeMarkerAmount(collectibleText, -1);
    });

    collectibleCountIncreaseElement.on('click', function (e) {
      e.stopPropagation();
      Inventory.changeMarkerAmount(collectibleText, 1);
    });

    collectibleElement.on('contextmenu', function (event) {
      if ($.cookie('right-click') != null)
        return;

      event.preventDefault();
      if (marker.subdata != 'agarita' && marker.subdata != 'blood_flower')
        MapBase.highlightImportantItem(marker.subdata || marker.text);

    });

    var collectibleCountElement = $('<span>').addClass('counter').append(collectibleCountDecreaseElement).append(collectibleCountTextElement).append(collectibleCountIncreaseElement);

    if (!Inventory.isEnabled)
      collectibleCountElement.hide();

    var collectibleCategory = $(`.menu-option[data-type=${marker.category}]`);
    if (marker.lat.length == 0 || marker.tool == -1) {
      if (!anyUnavailableCategories.includes(marker.category))
        anyUnavailableCategories.push(marker.category);

      collectibleElement.attr('data-help', 'item_unavailable').addClass('not-found');
      collectibleCategory.attr('data-help', 'item_category_unavailable_items').addClass('not-found');
    }

    if (collectibleCategory.hasClass('not-found') && !anyUnavailableCategories.includes(marker.category))
      collectibleCategory.attr('data-help', 'item_category').removeClass('not-found');

    if (Inventory.isEnabled && marker.amount >= Inventory.stackSize)
      collectibleElement.addClass('disabled');

    if (marker.subdata) {
      if (marker.subdata == 'agarita' || marker.subdata == 'blood_flower')
        collectibleElement.attr('data-help', 'item_night_only');

      var currentSubdataMarkers = MapBase.markers.filter(function (_marker) {
        if (marker.subdata != _marker.subdata)
          return false;

        if (_marker.day != Cycles.categories[_marker.category])
          return false;

        return true;
      });

      if (currentSubdataMarkers.every(function (marker) { return !marker.canCollect; }))
        collectibleElement.addClass('disabled');
    } else {
      if (!marker.canCollect)
        collectibleElement.addClass('disabled');
    }

    $.each(weeklyItems, function (key, weeklyItem) {
      if (collectibleKey == weeklyItem.item) {
        collectibleElement.attr('data-help', 'item_weekly');
        collectibleElement.addClass('weekly-item');
      }
    });

    var defaultHelpTimeout;
    collectibleElement.hover(function (e) {
      clearTimeout(defaultHelpTimeout);
      var language = Language.get(`help.${$(this).data('help')}`);

      if (language.indexOf('{collection}') !== -1) {
        language = language.replace('{collection}', Language.get('weekly.desc.' + weeklySetData.current));
      }

      $('#help-container p').text(language);
    }, function () {
      defaultHelpTimeout = setTimeout(function () {
        $('#help-container p').text(Language.get(`help.default`));
      }, 100);
    });

    $(`.menu-hidden[data-type=${marker.category}]`).append(collectibleElement.append(collectibleImage).append(collectibleTextWrapperElement.append(collectibleTextElement).append(collectibleCountElement)));
  });

  $('.menu-hidden[data-type]').each(function (key, value) {
    var category = $(this);

    if (category.data('type') == 'treasure') return;

    // if the cycle is the same as yesterday highlight category in menu;
    var isSameCycle = Cycles.isSameAsYesterday(category.data('type'));
    var element = `[data-text="menu.${category.data('type')}"]`;
    addCycleWarning(element, isSameCycle);

    if (!Settings.sortItemsAlphabetically) return;
    if (category.data('type').includes('card_')) return;

    var children = category.children('.collectible-wrapper');

    children.sort(function (a, b) {
      return a.innerText.toLowerCase().localeCompare(b.innerText.toLowerCase());
    }).appendTo(this);
  });

  // Check cycle warning for random spots
  addCycleWarning('[data-text="menu.random_spots"]', Cycles.isSameAsYesterday('random'));

  function addCycleWarning(element, isSameCycle) {
    var hasCycleWarning = $(`${element} .same-cycle-warning-menu`).length > 0;
    var category = $(element);
    if (isSameCycle && !hasCycleWarning) {
      category.parent().attr('data-help', 'item_category_same_cycle');
      category.append(`<img class="same-cycle-warning-menu" src="./assets/images/same-cycle-alert.png">`);
    } else if (!isSameCycle && hasCycleWarning) {
      category.parent().attr('data-help', 'item_category');
      category.children('.same-cycle-warning-menu').remove();
    }
  }

  Menu.refreshTreasures();

  $.each(categoriesDisabledByDefault, function (key, value) {
    if (value.length > 0) {
      $('[data-type=' + value + ']').addClass('disabled');
    }
  });

  Menu.reorderMenu('.menu-hidden[data-type=treasure]');
  MapBase.loadImportantItems();

  $('.map-cycle-alert span').html(Language.get('map.refresh_for_updates_alert'));
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
  var _markers = MapBase.markers.filter(item => item.day == Cycles.categories[item.category] && item.isVisible);

  $('.collectables-counter').text(Language.get('menu.collectables_counter')
    .replace('{count}', _markers.filter(item => item.isCollected || (Inventory.isEnabled && item.amount >= Inventory.stackSize)).length)
    .replace('{max}', _markers.length));
};

// Auto fill debug markers inputs, when "show coordinates on click" is enabled
Menu.liveUpdateDebugMarkersInputs = function (lat, lng) {
  $('#debug-marker-lat').val(lat);
  $('#debug-marker-lng').val(lng);
};

// Remove highlight from all important items
$('#clear_highlights').on('click', function () {
  var tempArray = MapBase.itemsMarkedAsImportant;
  $.each(tempArray, function () {
    MapBase.highlightImportantItem(tempArray[0]);
  });
});

// change cycles from menu (if debug options are enabled)
$('#cycle-prev').on('click', function () {
  Cycles.offset--;
  if (Cycles.offset < -Settings.cyclesOffsetMaxBackward) {
    Cycles.offset = -Settings.cyclesOffsetMaxBackward;
    return;
  }

  Inventory.save();
  Cycles.load();
});
$('#cycle-next').on('click', function () {
  Cycles.offset++;
  if (Cycles.offset > Settings.cyclesOffsetMaxForward) {
    Cycles.offset = Settings.cyclesOffsetMaxForward;
    return;
  }

  Inventory.save();
  Cycles.load();
});
