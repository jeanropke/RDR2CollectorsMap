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
    if (marker.day == Cycles.data.cycles[Cycles.data.current][marker.category]) {
      if (marker.subdata) {
        //This is for items with subdata to merge them
        if ($(`.menu-hidden[data-type=${marker.category}]`).children(`[data-type=${marker.subdata}]`).length > 0)
          return;

        var collectibleImage = null;
        var collectibleName = null;

        if (marker.category == 'american_flowers') {
          collectibleImage = $('<img>').attr('src', `./assets/images/icons/game/flower_${marker.subdata}.png`).addClass('collectible-icon');
          collectibleName = Language.get(`flower_${marker.subdata}.name`);
        } else if (marker.category == 'bird_eggs') {
          collectibleImage = $('<img>').attr('src', `./assets/images/icons/game/egg_${marker.subdata}.png`).addClass('collectible-icon');
          collectibleName = Language.get(`egg_${marker.subdata}.name`);
        }

        var collectibleElement = $('<div>').addClass('collectible-wrapper').attr('data-type', marker.subdata);
        var collectibleTextWrapperElement = $('<span>').addClass('collectible-text');
        var collectibleTextElement = $('<p>').addClass('collectible').text(collectibleName);

        var collectibleCountDecreaseElement = $('<div>').addClass('counter-button').text('-');
        var collectibleCountTextElement = $('<div>').addClass('counter-number').text(marker.amount);
        var collectibleCountIncreaseElement = $('<div>').addClass('counter-button').text('+');

        collectibleCountDecreaseElement.on('click', function (e) {
          e.stopPropagation();
          Inventory.changeMarkerAmount(marker.subdata, -1)
        });

        collectibleCountIncreaseElement.on('click', function (e) {
          e.stopPropagation();
          Inventory.changeMarkerAmount(marker.subdata, 1)
        });

        var collectibleCountElement = $('<span>').addClass('counter').append(collectibleCountDecreaseElement).append(collectibleCountTextElement).append(collectibleCountIncreaseElement);

        if (!Inventory.isEnabled)
          collectibleCountElement.hide();

        $(`.menu-hidden[data-type=${marker.category}]`).append(collectibleElement.append(collectibleImage).append(collectibleTextWrapperElement.append(collectibleTextElement).append(collectibleCountElement)));

        if (marker.lat.length == 0)
          $(`[data-type=${marker.subdata}]`).addClass('not-found');

        if (marker.amount >= Inventory.stackSize)
          $(`[data-type=${marker.subdata}]`).addClass('disabled');

        var _markers = MapBase.markers.filter(function (_marker) {
          if (marker.subdata != _marker.subdata)
            return false;

          if (_marker.day != Cycles.data.cycles[Cycles.data.current][_marker.category])
            return false;

          return true;
        });

        if ((_markers.length == 1 && !_markers[0].canCollect) || _markers.every(function (marker) { return !marker.canCollect; }))
          $(`[data-type=${marker.subdata}]`).addClass('disabled');

      } else {
        //All others items
        var collectibleImage = null;

        // Prevents 404 errors. If doing the if-statement the other way round, jQuery tries to load the images.
        if (marker.category != 'random')
          collectibleImage = $('<img>').attr('src', `./assets/images/icons/game/${marker.text}.png`).addClass('collectible-icon');

        var collectibleElement = $('<div>').addClass('collectible-wrapper').attr('data-type', marker.text);
        var collectibleTextWrapperElement = $('<span>').addClass('collectible-text');
        var collectibleTextElement = $('<p>').addClass('collectible').text(marker.title);

        var collectibleCountDecreaseElement = $('<div>').addClass('counter-button').text('-');
        var collectibleCountTextElement = $('<div>').addClass('counter-number').text(marker.amount);
        var collectibleCountIncreaseElement = $('<div>').addClass('counter-button').text('+');

        collectibleCountDecreaseElement.on('click', function (e) {
          e.stopPropagation();
          Inventory.changeMarkerAmount(marker.text, -1)
        });

        collectibleCountIncreaseElement.on('click', function (e) {
          e.stopPropagation();
          Inventory.changeMarkerAmount(marker.text, 1)
        });

        var collectibleCountElement = $('<span>').addClass('counter').append(collectibleCountDecreaseElement).append(collectibleCountTextElement).append(collectibleCountIncreaseElement);

        if (!Inventory.isEnabled)
          collectibleCountElement.hide();

        $(`.menu-hidden[data-type=${marker.category}]`).append(collectibleElement.append(collectibleImage).append(collectibleTextWrapperElement.append(collectibleTextElement).append(collectibleCountElement)));

        if (marker.lat.length == 0)
          $(`[data-type=${marker.text}]`).addClass('not-found');

        if (marker.amount >= Inventory.stackSize)
          $(`[data-type=${marker.text}]`).addClass('disabled');

        if (!marker.canCollect)
          $(`[data-type=${marker.text}]`).addClass('disabled');
      }
      
      // set green color of weekly collection items
      $.each(weeklyItems, function (key, weeklyItem) {
        if (`flower_${marker.subdata}` == weeklyItem.item || `egg_${marker.subdata}` == weeklyItem.item)
          $(`[data-type=${marker.subdata}]`).addClass('weekly-item');
        // All other items
        if (marker.text == weeklyItem.item)
          $(`[data-type=${marker.text}]`).addClass('weekly-item');
      });
    }
  });

  $('.menu-hidden[data-type]').each(function (key, value) {
    var category = $(this);

    if (category.data('type') == 'treasure') return;

    // if the cycle is the same as yesterday highlight category in menu;
    if (Cycles.isSameAsYesterday(category.data('type'))) {
      if ($(`[data-text="menu.${category.data('type')}"]span span`).hasClass('same-cycle-warning-menu')) return;
        $(`[data-text="menu.${category.data('type')}"]`).append(`<span class="same-cycle-warning-menu"> ! </span>`);
    }
    else {
      if ($(`[data-text="menu.${category.data('type')}"]span span`).hasClass('same-cycle-warning-menu'))
        $(`[data-text="menu.${category.data('type')}"]span`).find('span').remove();
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

  $('.collectables-counter').text(Language.get('menu.collectables_counter')
    .replace('{count}', MapBase.markers.filter(item => item.day == Cycles.data.cycles[Cycles.data.current][item.category] && item.isVisible && (item.isCollected || item.amount == 10)).length)
    .replace('{max}', MapBase.markers.filter(item => item.day == Cycles.data.cycles[Cycles.data.current][item.category] && item.isVisible).length));
};

// Auto fill debug markers inputs, when "show coordinates on click" is enabled
Menu.liveUpdateDebugMarkersInputs = function (lat, lng) {
  $('#debug-marker-lat').val(lat);
  $('#debug-marker-lng').val(lng);
}
// Auto remove debug markers coordinates when "show coordinates on click" is disabled
$('#show-coordinates').on('change', function () {
  $('#debug-marker-lat').val('');
  $('#debug-marker-lng').val('');
  $('#debug-marker-name').val('');
});