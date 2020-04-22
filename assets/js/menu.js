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
};

Menu.addCycleWarning = function (element, isSameCycle) {
  var hasCycleWarning = $(`${element} .same-cycle-warning-menu`).length > 0;
  var category = $(element);
  if (isSameCycle && !hasCycleWarning) {
    category.parent().parent().attr('data-help', 'item_category_same_cycle');
    category.append(`<img class="same-cycle-warning-menu" src="./assets/images/same-cycle-alert.png">`);
  } else if (!isSameCycle && hasCycleWarning) {
    category.parent().parent().attr('data-help', 'item_category');
    category.children('.same-cycle-warning-menu').remove();
  }
};

Menu.refreshMenu = function () {
  $('.menu-hidden[data-type]:not([data-type=treasure])')
    .children('.collectible-wrapper').remove();

  var weeklyItems = [];
  if (weeklySetData.sets !== null) {
    weeklyItems = weeklySetData.sets[weeklySetData.current];
  }

  var anyUnavailableCategories = [];

  const currentItemMarkers = {}
  MapBase.markers.forEach(marker => {
    if (marker.isCurrent) {
      currentItemMarkers[marker.itemId] = marker;
    }
  });
  Object.values(currentItemMarkers).forEach(marker => {
    var collectibleTitle = Language.get(marker.itemTranslationKey);
    var collectibleImage = null;

    // Prevents 404 errors. If doing the if-statement the other way round, jQuery tries to load the images.
    if (marker.category !== 'random')
      collectibleImage = $('<img>').attr('src', `./assets/images/icons/game/${marker.itemId}.png`).attr('alt', 'Set icon').addClass('collectible-icon');

    var collectibleElement = $(`<div class="collectible-wrapper" data-help="item"
      data-type="${marker.legacyItemId}">`);
    var collectibleTextWrapperElement = $('<span class="collectible-text">');
    var collectibleTextElement = $('<p class="collectible">').text(collectibleTitle);

    var collectibleCountDecreaseElement = $('<div class="counter-button">-</div>');
    var collectibleCountTextElement = $('<div class="counter-number">').text(marker.amount);
    var collectibleCountIncreaseElement = $('<div class="counter-button">+</div>');

    collectibleCountDecreaseElement.on('click', function (e) {
      e.stopPropagation();
      Inventory.changeMarkerAmount(marker.legacyItemId, -1);
    });

    collectibleCountIncreaseElement.on('click', function (e) {
      e.stopPropagation();
      Inventory.changeMarkerAmount(marker.legacyItemId, 1);
    });

    collectibleElement.on('contextmenu', function (e) {
      if (!Settings.isRightClickEnabled) e.preventDefault();

      if (!['flower_agarita', 'flower_blood_flower'].includes(marker.itemId)) {
        MapBase.highlightImportantItem(marker.itemId, marker.category);
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

    if (['flower_agarita', 'flower_blood_flower'].includes(marker.itemId)) {
      collectibleElement.attr('data-help', 'item_night_only');
    }

    let multiMarkerItemMarkers = [marker];
    if (['egg', 'flower'].includes(marker.category)) {
      multiMarkerItemMarkers = MapBase.markers.filter(_marker =>
        (marker.itemId === _marker.itemId && _marker.isCurrent));
    }
    if (multiMarkerItemMarkers.every(marker => !marker.canCollect)) {
      collectibleElement.addClass('disabled');
    }

    weeklyItems.forEach(weeklyItemId => {
      if (marker.itemId === weeklyItemId) {
        collectibleElement.attr('data-help', 'item_weekly');
        collectibleElement.addClass('weekly-item');
      }
    });

    collectibleElement.hover(function () {
        $('#help-container p').text(Language.get(`help.${$(this).data('help')}`));
      }, function () {
        $('#help-container p').text(Language.get(`help.default`));
      });

    $(`.menu-hidden[data-type=${marker.category}]`)
      .append(collectibleElement
        .append(collectibleImage)
        .append(collectibleTextWrapperElement
          .append(collectibleTextElement)
          .append(collectibleCountElement)));
  });

  $('.menu-hidden[data-type]').each(function (key, value) {
    var category = $(this);

    if (category.data('type') == 'treasure')
      return;

    // if the cycle is the same as yesterday highlight category in menu;
    var isSameCycle = Cycles.isSameAsYesterday(category.data('type'));
    var element = `[data-text="menu.${category.data('type')}"]`;

    Menu.addCycleWarning(element, isSameCycle);
    Menu.refreshCollectionCounter(category.data('type'));

    if (Settings.sortItemsAlphabetically) {
      if (category.data('type').includesOneOf('cups', 'swords', 'wands', 'pentacles'))
        return;

      var children = category.children('.collectible-wrapper');

      children.sort(function (a, b) {
        return a.innerText.toLowerCase().localeCompare(b.innerText.toLowerCase());
      }).appendTo(this);
    }
  });

  // Check cycle warning for random spots
  Menu.addCycleWarning('[data-text="menu.random_spots"]', Cycles.isSameAsYesterday('random'));

  categories.forEach(cat => {
    if (!enabledCategories.includes(cat)) $(`[data-type="${cat}"]`).addClass('disabled');
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

Menu.refreshItemsCounter = function () {
  var _markers = MapBase.markers.filter(marker => marker.isCurrent && marker.isVisible);

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
  $('#weekly-container .weekly-flavor-text').text(Language.get('weekly_flavor'));

  weeklyItems.forEach(weeklyItemId => {
    var inventoryCount = '';

    if (InventorySettings.isEnabled) {
      const amount = Item.items[weeklyItemId].amount;
      inventoryCount = $(`<small class="counter-number">${amount}</small>`);
      inventoryCount.toggleClass('text-danger', amount >= InventorySettings.stackSize);
      inventoryCount = inventoryCount.prop('outerHTML');
    }

    var element = `
      <div class="weekly-item-listing">
        <span>
          <img class="icon" src="./assets/images/icons/game/${weeklyItemId}.png" alt="Weekly item icon" />
          <span>${Language.get(weeklyItemId + '.name')}</span>
        </span>
        ${inventoryCount}
      </div>
    `;

    $('#weekly-container .weekly-item-listings').append(element);
  });
};

Menu.activateHandlers = function () {
  $('#clear_highlights').on('click', function () {
    MapBase.clearImportantItems();
  });

  // change cycles from menu (if debug options are enabled)
  $('#cycle-prev').on('click', Cycles.prevCycle);
  $('#cycle-next').on('click', Cycles.nextCycle);

  //toggle one collection category or disable/enable all at once
  $('.menu-option[data-type], .links-container a[data-text^="menu."][data-text$="_all"]')
    .on('click', function () {
      'use strict';
      const $this = $(this);
      const category = $this.attr('data-type');
      const toEnable = category ? $this.hasClass('disabled') :
        $this.attr('data-text') === 'menu.show_all';
      const $allButtons = $('.menu-option[data-type], .menu-hidden[data-type]');
      const $buttons = category ? $allButtons.filter(`[data-type="${category}"]`) :
        $allButtons;

      $buttons.toggleClass('disabled', !toEnable);

      if (category && toEnable) {
        enabledCategories.push(category);
      } else if (category) {  // disable
        enabledCategories = enabledCategories.filter(cat => cat !== category);
      } else {
        enabledCategories = toEnable ? categories : [];
      }
      localStorage.setItem("enabled-categories", JSON.stringify(enabledCategories));

      if (!category) {
        MapBase.addMarkers();
        Treasure.onCategoryToggle();
        Pins.addToMap();
      } else if (category === 'user_pins') {
        Pins.addToMap();
      } else if (category === 'treasure') {
        Treasure.onCategoryToggle();
      } else {
        MapBase.addMarkers();
      }
  });
}