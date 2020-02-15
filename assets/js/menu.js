/**
 * Created by Jean on 2019-10-09.
 */

const Menu = {
  reorderMenu: function (menu) {
    $(menu).children().sort((a, b) => {
      return a.textContent.toLowerCase().localeCompare(b.textContent.toLowerCase());
    }).appendTo(menu);
  },

  refreshTreasures: function () {
    $('.menu-hidden[data-type=treasure]').children('.collectible-wrapper').remove();

    Treasures.data.filter((item) => {
      const collectibleElement = $('<div>').addClass('collectible-wrapper').attr('data-type', item.text);
      const collectibleTextElement = $('<p>').addClass('collectible').text(Language.get(item.text));

      if (!Treasures.enabledTreasures.includes(item.text))
        collectibleElement.addClass('disabled');

      $('.menu-hidden[data-type=treasure]').append(collectibleElement.append(collectibleTextElement));
    });
  }
};

Menu.refreshMenu = function () {
  if (weeklySetData.current == null)
    return;

  $('.menu-hidden[data-type]').children('.collectible-wrapper').remove();

  const weeklyItems = weeklySetData.sets[weeklySetData.current];
  const anyUnavailableCategories = [];

  $.each(MapBase.markers, (_, marker) => {
    if (marker.day != Cycles.categories[marker.category]) return;

    // Only add subdata markers once.
    if (marker.subdata && $(`.menu-hidden[data-type=${marker.category}]`).children(`[data-type=${marker.subdata}]`).length > 0) return;

    let collectibleKey = null;
    let collectibleText = null;
    let collectibleTitle = null;

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

    let collectibleImage = null;

    // Prevents 404 errors. If doing the if-statement the other way round, jQuery tries to load the images.
    if (marker.category != 'random')
      collectibleImage = $('<img>').attr('src', `./assets/images/icons/game/${collectibleKey}.png`).addClass('collectible-icon');

    const collectibleElement = $('<div>').addClass('collectible-wrapper').attr('data-help', 'item').attr('data-type', collectibleText);
    const collectibleTextWrapperElement = $('<span>').addClass('collectible-text');
    const collectibleTextElement = $('<p>').addClass('collectible').text(collectibleTitle);

    const collectibleCountDecreaseElement = $('<div>').addClass('counter-button').text('-');
    const collectibleCountTextElement = $('<div>').addClass('counter-number').text(marker.amount);
    const collectibleCountIncreaseElement = $('<div>').addClass('counter-button').text('+');

    collectibleCountDecreaseElement.on('click', function (e) {
      e.stopPropagation();
      Inventory.changeMarkerAmount(collectibleText, -1);
    });

    collectibleCountIncreaseElement.on('click', function (e) {
      e.stopPropagation();
      Inventory.changeMarkerAmount(collectibleText, 1);
    });

    collectibleElement.on('contextmenu', function (e) {
      if ($.cookie('right-click') == null)
        e.preventDefault();

      if (marker.subdata != 'agarita' && marker.subdata != 'blood_flower')
        MapBase.highlightImportantItem(marker.subdata || marker.text);
    });

    const collectibleCountElement = $('<span>').addClass('counter').append(collectibleCountDecreaseElement).append(collectibleCountTextElement).append(collectibleCountIncreaseElement);

    if (!Inventory.isEnabled)
      collectibleCountElement.hide();

    const collectibleCategory = $(`.menu-option[data-type=${marker.category}]`);
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

      const currentSubdataMarkers = MapBase.markers.filter((marker) => {
        if (marker.subdata != marker.subdata)
          return false;

        if (marker.day != Cycles.categories[marker.category])
          return false;

        return true;
      });

      if (currentSubdataMarkers.every((marker) => { return !marker.canCollect; }))
        collectibleElement.addClass('disabled');
    } else {
      if (!marker.canCollect)
        collectibleElement.addClass('disabled');
    }

    $.each(weeklyItems, (_, weeklyItem) => {
      if (collectibleKey == weeklyItem.item) {
        collectibleElement.attr('data-help', 'item_weekly');
        collectibleElement.addClass('weekly-item');
      }
    });

    let defaultHelpTimeout;
    collectibleElement.hover(() => {
      clearTimeout(defaultHelpTimeout);
      let language = Language.get(`help.${$(this).data('help')}`);

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

  $('.menu-hidden[data-type]').each(() => {
    const category = $(this);

    if (category.data('type') == 'treasure') return;

    // if the cycle is the same as yesterday highlight category in menu;
    const isSameCycle = Cycles.isSameAsYesterday(category.data('type'));
    const element = `[data-text="menu.${category.data('type')}"]`;
    addCycleWarning(element, isSameCycle);

    if (!Settings.sortItemsAlphabetically) return;
    if (category.data('type').includes('card_')) return;

    const children = category.children('.collectible-wrapper');

    children.sort((a, b) => {
      return a.innerText.toLowerCase().localeCompare(b.innerText.toLowerCase());
    }).appendTo(this);
  });

  // Check cycle warning for random spots
  addCycleWarning('[data-text="menu.random_spots"]', Cycles.isSameAsYesterday('random'));

  function addCycleWarning(element, isSameCycle) {
    const hasCycleWarning = $(`${element} .same-cycle-warning-menu`).length > 0;
    const category = $(element);
    if (isSameCycle && !hasCycleWarning) {
      category.parent().attr('data-help', 'item_category_same_cycle');
      category.append(`<img class="same-cycle-warning-menu" src="./assets/images/same-cycle-alert.png">`);
    } else if (!isSameCycle && hasCycleWarning) {
      category.parent().attr('data-help', 'item_category');
      category.children('.same-cycle-warning-menu').remove();
    }
  }

  Menu.refreshTreasures();

  $.each(categoriesDisabledByDefault, (_, value) => {
    if (value.length > 0) {
      $('[data-type=' + value + ']').addClass('disabled');
    }
  });

  Menu.reorderMenu('.menu-hidden[data-type=treasure]');
  MapBase.loadImportantItems();

  $('.map-cycle-alert span').html(Language.get('map.refresh_for_updates_alert'));
};

Menu.showAll = function () {
  $.each(categoryButtons, (_, value) => {
    $(value).removeClass("disabled");
    $(`.menu-hidden[data-type=${$(value).attr('data-type')}]`).removeClass("disabled");
  });

  enabledCategories = categories;

  MapBase.addMarkers();
};

Menu.hideAll = function () {
  $.each(categoryButtons, (_, value) => {
    $(value).addClass("disabled");
    $(`.menu-hidden[data-type=${$(value).attr('data-type')}]`).addClass("disabled");
  });

  enabledCategories = [];

  MapBase.addMarkers();
  Treasures.addToMap();
  Encounters.addToMap();
};

Menu.refreshItemsCounter = function () {
  const markers = MapBase.markers.filter(item => item.day == Cycles.categories[item.category] && item.isVisible);

  $('.collectables-counter').text(Language.get('menu.collectables_counter')
    .replace('{count}', markers.filter(item => item.isCollected || (Inventory.isEnabled && item.amount >= Inventory.stackSize)).length)
    .replace('{max}', markers.length));
};

// Remove highlight from all important items
$('#clear_highlights').on('click', function () {
  const tempArray = MapBase.itemsMarkedAsImportant;
  $.each(tempArray, () => {
    MapBase.highlightImportantItem(tempArray[0]);
  });
});

// change cycles from menu (if debug options are enabled)
$('#cycle-prev').on('click', Cycles.nextCycle);
$('#cycle-next').on('click', Cycles.prevCycle);
