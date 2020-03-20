/**
 * Created by Jean on 2019-10-09.
 */

var Menu = {
  hasSearchFilters: false,
  hasToolFilters: false,

  updateHasFilters: function () {
    if (Menu.hasSearchFilters && Menu.hasToolFilters) {
      $('.filter-alert span').html(Language.get('map.has_multi_filter_alert'));
      $('.filter-alert').removeClass('hidden');
    } else if (Menu.hasSearchFilters) {
      $('.filter-alert span').html(Language.get('map.has_search_filter_alert'));
      $('.filter-alert').removeClass('hidden');
    } else if (Menu.hasToolFilters) {
      $('.filter-alert span').html(Language.get('map.has_tool_filter_alert'));
      $('.filter-alert').removeClass('hidden');
    } else {
      $('.filter-alert').addClass('hidden');
    }
  },

  reorderMenu: function (menu) {
    $(menu).children().sort(function (a, b) {
      return a.textContent.toLowerCase().localeCompare(b.textContent.toLowerCase());
    }).appendTo(menu);
  },

  refreshTreasures: function () {
    $('.menu-hidden[data-type=treasure]').children('.collectible-wrapper').remove();

    Treasures.data.filter(function (item) {
      var collectibleElement = $('<div>').addClass('collectible-wrapper').attr('data-help', 'item').attr('data-type', item.text);
      var collectibleTextElement = $('<p>').addClass('collectible').text(Language.get(item.text));

      if (!Treasures.enabledTreasures.includes(item.text))
        collectibleElement.addClass('disabled');

      $('.menu-hidden[data-type=treasure]').append(collectibleElement.append(collectibleTextElement));
    });
    Menu.reorderMenu('.menu-hidden[data-type=treasure]');
  }
};

Menu.addCycleWarning = function (element, isSameCycle) {
  var hasCycleWarning = $(`${element} .same-cycle-warning-menu`).length > 0;
  var category = $(element);
  if (isSameCycle && !hasCycleWarning) {
    category.parent().attr('data-help', 'item_category_same_cycle');
    category.append(`<img class="same-cycle-warning-menu" src="./assets/images/same-cycle-alert.png">`);
  } else if (!isSameCycle && hasCycleWarning) {
    category.parent().attr('data-help', 'item_category');
    category.children('.same-cycle-warning-menu').remove();
  }
};

Menu.refreshMenu = function () {
  $('.menu-hidden[data-type]').children('.collectible-wrapper').remove();

  var weeklyItems = [];
  if (weeklySetData.sets !== null) {
    weeklyItems = weeklySetData.sets[weeklySetData.current];
  }

  var anyUnavailableCategories = [];

  $.each(MapBase.markers, function (_key, marker) {
    if (marker.day != Cycles.categories[marker.category]) return;

    // Only add subdata markers once.
    if (marker.subdata && $(`.menu-hidden[data-type=${marker.category}]`).children(`[data-type=${marker.subdata}]`).length > 0) return;

    var collectibleKey = null;
    var collectibleText = null;

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
    } else {
      collectibleText = marker.text;
    }
    
    var collectibleTitle = Language.get(`${collectibleKey}.name`);
    var collectibleImage = null;

    // Prevents 404 errors. If doing the if-statement the other way round, jQuery tries to load the images.
    if (marker.category !== 'random')
      collectibleImage = $('<img>').attr('src', `./assets/images/icons/game/${collectibleKey}.png`).attr('alt', 'Set icon').addClass('collectible-icon');

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

    collectibleElement.on('contextmenu', function (e) {
      if (!Settings.isRightClickEnabled)
        e.preventDefault();

      if (marker.subdata !== 'agarita' && marker.subdata !== 'blood_flower') {
        var prefix = '';
        if (marker.category === 'american_flowers')
          prefix = 'flower_';

        else if (marker.category === 'bird_eggs')
          prefix = 'egg_';
        MapBase.highlightImportantItem(prefix + collectibleText, marker.category);
      }
    });

    var collectibleCountElement = $('<span>').addClass('counter').append(collectibleCountDecreaseElement).append(collectibleCountTextElement).append(collectibleCountIncreaseElement);

    if (!InventorySettings.isEnabled)
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

    collectibleCountTextElement.toggleClass('text-danger', marker.amount >= InventorySettings.stackSize);

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
      if (!marker.canCollect) collectibleElement.addClass('disabled');
    }

    $.each(weeklyItems, function (key, weeklyItem) {
      if (collectibleKey == weeklyItem.item) {
        collectibleElement.attr('data-help', 'item_weekly');
        collectibleElement.addClass('weekly-item');
      }
    });

    collectibleElement.hover(function () {
        $('#help-container p').text(Language.get(`help.${$(this).data('help')}`));
      }, function () {
        $('#help-container p').text(Language.get(`help.default`));
      });

    $(`.menu-hidden[data-type=${marker.category}]`).append(collectibleElement.append(collectibleImage).append(collectibleTextWrapperElement.append(collectibleTextElement).append(collectibleCountElement)));
  });

  $('.menu-hidden[data-type]').each(function (key, value) {
    var category = $(this);

    if (category.data('type') == 'treasure') return;

    // if the cycle is the same as yesterday highlight category in menu;
    var isSameCycle = Cycles.isSameAsYesterday(category.data('type'));
    var element = `[data-text="menu.${category.data('type')}"]`;

    Menu.addCycleWarning(element, isSameCycle);
    Menu.refreshCollectionCounter(category.data('type'));

    if (!Settings.sortItemsAlphabetically) return;
    if (category.data('type').includes('card_')) return;

    var children = category.children('.collectible-wrapper');

    children.sort(function (a, b) {
      return a.innerText.toLowerCase().localeCompare(b.innerText.toLowerCase());
    }).appendTo(this);
  });

  // Check cycle warning for random spots
  Menu.addCycleWarning('[data-text="menu.random_spots"]', Cycles.isSameAsYesterday('random'));

  Menu.refreshTreasures();

  $.each(categoriesDisabledByDefault, function (key, value) {
    if (value.length > 0) {
      $('[data-type=' + value + ']').addClass('disabled');
    }
  });

  Menu.refreshWeeklyItems();

  $('.map-cycle-alert span').html(Language.get('map.refresh_for_updates_alert'));
};

Menu.refreshCollectionCounter = function (category) {
  var collectiblesElement = $(`.menu-hidden[data-type="${category}"]`);
  collectiblesElement.find('.collection-collected').text(Language.get('menu.collection_counter')
    .replace('{count}', collectiblesElement.find('.disabled').length)
    .replace('{max}', collectiblesElement.find('.collectible-wrapper').length));
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
};

Menu.refreshItemsCounter = function () {
  var _markers = MapBase.markers.filter(marker => marker.day == Cycles.categories[marker.category] && marker.isVisible);

  $('.collectables-counter').text(Language.get('menu.collectables_counter')
    .replace('{count}', _markers.filter(marker => marker.isCollected).length)
    .replace('{max}', _markers.length));

  // refresh items value counter
  ItemsValue.reloadInventoryItems();

  $.each($(".menu-hidden[data-type]"), function (key, value) {
    var category = $(value).attr('data-type');
    Menu.refreshCollectionCounter(category);
  });
};

Menu.refreshWeeklyItems = function () {
  var weeklyItems = weeklySetData.sets[weeklySetData.current];

  $('#weekly-container .weekly-item-listings').children('.weekly-item-listing').remove();
  $('#weekly-container .weekly-item-title').text(Language.get('collection'));

  $.each(weeklyItems, function (key, value) {
    var inventoryCount = '';

    if (InventorySettings.isEnabled) {
      var amount = Inventory.items[value.item];

      if (amount !== undefined) {
        inventoryCount = $(`<small class="counter-number">${amount}</small>`);
        inventoryCount.toggleClass('text-danger', amount >= InventorySettings.stackSize);
        inventoryCount = inventoryCount.prop('outerHTML');
      }
    }

    var element = `
      <div class="weekly-item-listing">
        <span>
          <img class="icon" src="./assets/images/icons/game/${value.item}.png" alt="Weekly item icon" />
          <span>${Language.get(value.item + '.name')}</span>
        </span>
        ${inventoryCount}
      </div>
    `;

    $('#weekly-container .weekly-item-listings').append(element);
  });
};

// Remove highlight from all important items
$('#clear_highlights').on('click', function () {
  MapBase.clearImportantItems();
});

// change cycles from menu (if debug options are enabled)
$('#cycle-prev').on('click', Cycles.prevCycle);
$('#cycle-next').on('click', Cycles.nextCycle);
