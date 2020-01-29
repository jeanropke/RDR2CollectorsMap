//Since Moonshiners update, R* changed how cycles works.
//Instead of 1 cycle for each collection in the day, each collection has your own cycle.
//Eg: Coins can be on cycle 1, Eggs on cycle 3, Flowers on 5... and so on

var searchTerms = [];
var uniqueSearchMarkers = [];

var categories = [
  'american_flowers', 'antique_bottles', 'arrowhead', 'bird_eggs', 'coin', 'family_heirlooms', 'lost_bracelet',
  'lost_earrings', 'lost_necklaces', 'lost_ring', 'card_cups', 'card_pentacles', 'card_swords', 'card_wands', 'nazar',
  'fast_travel', 'treasure', 'random', 'treasure_hunter', 'tree_map', 'egg_encounter', 'dog_encounter', 'grave_robber',
  'wounded_animal', 'fame_seeker', 'moonshiner_camp', 'user_pins'
];

var categoriesDisabledByDefault = [
  'treasure', 'random', 'treasure_hunter', 'tree_map', 'egg_encounter', 'dog_encounter', 'grave_robber',
  'wounded_animal', 'fame_seeker', 'moonshiner_camp'
]

var enabledCategories = categories;
var categoryButtons = $(".clickable[data-type]");

var fastTravelData;

var weeklySetData = [];
var date;

var wikiLanguage = [];

var tempInventory = [];

var debugMarkersArray = [];
var tempCollectedMarkers = "";

function init() {
  wikiLanguage['de-de'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/RDO-Sammler-Landkarte-Benutzerhandbuch-(Deutsch)';
  wikiLanguage['en-us'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/RDO-Collectors-Map-User-Guide-(English)';
  wikiLanguage['fr-fr'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/RDO-Collectors-Map-Guide-d\'Utilisateur-(French)';
  wikiLanguage['pt-br'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/Guia-do-Usu%C3%A1rio---Mapa-de-Colecionador-(Portuguese)';

  //sometimes, cookies are saved in the wrong order
  var cookiesList = [];
  $.each($.cookie(), function (key, value) {
    if (key.startsWith('removed-items')) {
      cookiesList.push(key);
    }
  });
  cookiesList.sort();
  $.each(cookiesList, function (key, value) {
    tempCollectedMarkers += $.cookie(value);
  });

  //If the collect markers does not contains ':', need be converted to inventory system
  if (!tempCollectedMarkers.includes(':')) {
    $.each(tempCollectedMarkers.split(';'), function (key, value) {
      tempInventory += `${value}:1:1;`;
    });
  } else {
    tempInventory = tempCollectedMarkers;
  }

  tempInventory = tempInventory.split(';');

  Inventory.load();

  if (typeof $.cookie('alert-closed-1') == 'undefined') {
    $('.map-alert').show();
  }
  else {
    $('.map-alert').hide();
  }

  if (typeof $.cookie('disabled-categories') !== 'undefined')
    categoriesDisabledByDefault = $.cookie('disabled-categories').split(',');

  categoriesDisabledByDefault = categoriesDisabledByDefault.filter(function (item) {
    return ['texas_bluebonnet', 'bitterweed', 'agarita', 'wild_rhubarb', 'cardinal',
      'creek_plum', 'blood_flower', 'chocolate_daisy', 'wisteria'].indexOf(item) === -1;
  });

  enabledCategories = enabledCategories.filter(function (item) {
    return categoriesDisabledByDefault.indexOf(item) === -1;
  });

  if (typeof $.cookie('map-layer') === 'undefined' || isNaN(parseInt($.cookie('map-layer'))))
    $.cookie('map-layer', 0, { expires: 999 });

  if (!Language.availableLanguages.includes(Settings.language))
    Settings.language = 'en-us';

  if (typeof $.cookie('remove-markers-daily') === 'undefined') {
    Settings.resetMarkersDaily = true;
    $.cookie('remove-markers-daily', '1', { expires: 999 });
  }

  if (typeof $.cookie('marker-cluster') === 'undefined') {
    Settings.markerCluster = true;
    $.cookie('marker-cluster', '1', { expires: 999 });
  }

  if (typeof $.cookie('enable-marker-popups') === 'undefined') {
    Settings.isPopupsEnabled = true;
    $.cookie('enable-marker-popups', '1', { expires: 999 });
  }

  if (typeof $.cookie('enable-marker-shadows') === 'undefined') {
    Settings.isShadowsEnabled = true;
    $.cookie('enable-marker-shadows', '1', { expires: 999 });
  }

  if (typeof $.cookie('enable-dclick-zoom') === 'undefined') {
    Settings.isDoubleClickZoomEnabled = true;
    $.cookie('enable-dclick-zoom', '1', { expires: 999 });
  }

  if (typeof $.cookie('show-help') === 'undefined') {
    Settings.showHelp = true;
    $.cookie('show-help', '1', { expires: 999 });
  }

  if (typeof $.cookie('marker-opacity') === 'undefined') {
    Settings.markerOpacity = 1;
    $.cookie('marker-opacity', '1', { expires: 999 });
  }

  if (typeof $.cookie('overlay-opacity') === 'undefined') {
    Settings.overlayOpacity = 0.5;
    $.cookie('overlay-opacity', '0.5', { expires: 999 });
  }

  MapBase.init();
  MapBase.setOverlays(Settings.overlayOpacity);

  Language.setMenuLanguage();

  setMapBackground($.cookie('map-layer'));

  if (Settings.isMenuOpened)
    $('.menu-toggle').click();

  $('#tools').val(Settings.toolType);
  $('#language').val(Settings.language);
  $('#marker-opacity').val(Settings.markerOpacity);
  $('#overlay-opacity').val(Settings.overlayOpacity);

  $('#reset-markers').prop("checked", Settings.resetMarkersDaily);
  $('#marker-cluster').prop("checked", Settings.markerCluster);
  $('#enable-marker-popups').prop("checked", Settings.isPopupsEnabled);
  $('#enable-marker-shadows').prop("checked", Settings.isShadowsEnabled);
  $('#enable-dclick-zoom').prop("checked", Settings.isDoubleClickZoomEnabled);
  $('#pins-place-mode').prop("checked", Settings.isPinsPlacingEnabled);
  $('#pins-edit-mode').prop("checked", Settings.isPinsEditingEnabled);
  $('#show-help').prop("checked", Settings.showHelp);
  $('#show-coordinates').prop("checked", Settings.isCoordsEnabled);
  $('#sort-items-alphabetically').prop("checked", Settings.sortItemsAlphabetically);
  $("#enable-right-click").prop('checked', $.cookie('right-click') != null);

  if (Settings.showHelp) {
    $("#help-container").show();
  } else {
    $("#help-container").hide();
  }

  Pins.addToMap();
  changeCursor();
}

function isLocalHost() {
  return location.hostname === "localhost" || location.hostname === "127.0.0.1";
}

function setMapBackground(mapIndex) {
  switch (parseInt(mapIndex)) {
    default:
    case 0:
      $('#map').css('background-color', '#d2b790');
      MapBase.isDarkMode = false;
      break;

    case 1:
      $('#map').css('background-color', '#d2b790');
      MapBase.isDarkMode = false;
      break;

    case 2:
      $('#map').css('background-color', '#3d3d3d');
      MapBase.isDarkMode = true;
      break;
  }
  MapBase.setOverlays();
  $.cookie('map-layer', mapIndex, { expires: 999 });
}

function changeCursor() {
  if (Settings.isCoordsEnabled || Routes.customRouteEnabled)
    $('.leaflet-grab').css('cursor', 'pointer');
  else
    $('.leaflet-grab').css('cursor', 'grab');
}
function addZeroToNumber(number) {
  if (number < 10)
    number = '0' + number;
  return number;
}

function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

//Copy text to clipboard
function setClipboardText(text) {
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el)
}

// Simple download function
function downloadAsFile(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

setInterval(function () {

  // Clock in game created by Michal__d
  var display_24 = false,
    newDate = new Date(),
    startTime = newDate.valueOf(),
    factor = 30,
    correctTime = new Date(startTime * factor);
  correctTime.setHours(correctTime.getUTCHours());
  correctTime.setMinutes(correctTime.getUTCMinutes() - 3); //for some reason time in game is 3 sec. delayed to normal time

  if (display_24)
    $('#time-in-game').text(addZeroToNumber(correctTime.getHours()) + ":" + addZeroToNumber(correctTime.getMinutes()));

  else {
    $('#time-in-game').text(addZeroToNumber(correctTime.getHours() % 12) + ":" + addZeroToNumber(correctTime.getMinutes()));
    $('#am-pm-time').text(((correctTime.getHours() < 12) ? "AM" : "PM"));
  }

  //Countdown for the next cycle
  var nextGMTMidnight = new Date();
  var hours = 23 - nextGMTMidnight.getUTCHours();
  var minutes = 59 - nextGMTMidnight.getUTCMinutes();
  var seconds = 59 - nextGMTMidnight.getUTCSeconds();
  $('#countdown').text(addZeroToNumber(hours) + ':' + addZeroToNumber(minutes) + ':' + addZeroToNumber(seconds));

  if (correctTime.getHours() >= 22 || correctTime.getHours() < 5) {
    $('#day-cycle').css('background', 'url(assets/images/moon.png)');
    $('[data-marker*="flower_agarita"], [data-marker*="flower_blood"]').css('filter', 'drop-shadow(0 0 .5rem #fff) drop-shadow(0 0 .25rem #fff)');
  }
  else {
    $('#day-cycle').css('background', 'url(assets/images/sun.png)');
    $('[data-marker*="flower_agarita"], [data-marker*="flower_blood"]').css('filter', 'none');
  }
}, 1000);

// toggle timer and clock after click the container
$('.timer-container, .clock-container').on('click', function () {
  $('.timer-container, .clock-container').toggleClass("display-in-front");
});

/**
 * jQuery triggers
 */

//Toggle debug container
$("#toggle-debug").on("click", function () {
  $("#debug-container").toggleClass('opened');
});

//Show all markers on map
$("#show-all-markers").on("change", function () {
  Settings.showAllMarkers = $("#show-all-markers").prop('checked');
  MapBase.addMarkers();
});

// Give me back my right-click
$('#enable-right-click').on("change", function () {
  if ($("#enable-right-click").prop('checked')) {
    $.cookie('right-click', '1', { expires: 999 });
  } else {
    $.removeCookie('right-click');
  }
});

//Disable menu category when click on input
$('.menu-option.clickable input').on('click', function (e) {
  e.stopPropagation();
});

//change cycle by collection
$('.menu-option.clickable input').on('change', function (e) {
  var el = $(e.target);
  Cycles.data.cycles[Cycles.data.current][el.attr("name")] = parseInt(el.val());
  MapBase.addMarkers();
  Menu.refreshMenu();
});

//Search system on menu
$("#search").on("input", function () {
  MapBase.onSearch($('#search').val());
});

$("#copy-search-link").on("click", function () {
  setClipboardText(`http://jeanropke.github.io/RDR2CollectorsMap/?search=${$('#search').val()}`)
});

//Change & save tool type
$("#tools").on("change", function () {
  Settings.toolType = $("#tools").val();
  $.cookie('tools', Settings.toolType, { expires: 999 });
  MapBase.addMarkers();
});

//Change & save markers reset daily or manually
$("#reset-markers").on("change", function () {
  Settings.resetMarkersDaily = $("#reset-markers").prop('checked');
  $.cookie('remove-markers-daily', Settings.resetMarkersDaily ? '1' : '0', { expires: 999 });
});

$("#clear-markers").on("click", function () {
  $.each(MapBase.markers, function (key, value) {
    if (Inventory.items[value.text])
      Inventory.items[value.text].isCollected = false;

    value.isCollected = false;

    if (Inventory.isEnabled)
      value.canCollect = value.amount < Inventory.stackSize;
    else
      value.canCollect = true;
  });

  Inventory.save();
  Menu.refreshMenu();

  Menu.refreshItemsCounter();
  MapBase.addMarkers();
})

//Clear inventory on menu
$("#clear-inventory").on("click", function () {

  $.each(MapBase.markers, function (key, marker) {
    if (marker.day == Cycles.data.cycles[Cycles.data.current][marker.category] && (marker.amount > 0 || marker.isCollected)) {
      if (Inventory.items[marker.text])
        Inventory.items[marker.text].amount = 0;

      marker.amount = 0;

      if (Inventory.isEnabled)
        marker.canCollect = marker.amount < Inventory.stackSize && !marker.isCollected;
      else
        marker.canCollect = !marker.isCollected;
    }
  });

  Inventory.save();
  MapBase.addMarkers();
  Menu.refreshMenu();
});

//Enable & disable custom routes on menu
$("#custom-routes").on("change", function () {
  Routes.customRouteEnabled = $("#custom-routes").prop('checked');
  $.cookie('custom-routes-enabled', Routes.customRouteEnabled ? '1' : '0', { expires: 999 });

  changeCursor();
});

$("#clear-custom-routes").on("click", function () {
  Routes.customRouteConnections = [];
  MapBase.map.removeLayer(Routes.polylines);
});

//When map-alert is clicked
$('.map-alert').on('click', function () {
  $.cookie('alert-closed-1', 'true', { expires: 999 });
  $('.map-alert').hide();
});

$('.map-cycle-alert').on('click', function () {
  $('.map-cycle-alert').hide();
});

//Enable & disable show coordinates on menu
$('#show-coordinates').on('change', function () {
  Settings.isCoordsEnabled = $("#show-coordinates").prop('checked');
  $.cookie('coords-enabled', Settings.isCoordsEnabled ? '1' : '0', { expires: 999 });

  changeCursor();
});

//Change & save language option
$("#language").on("change", function () {
  Settings.language = $("#language").val();
  $.cookie('language', Settings.language, { expires: 999 });
  Language.setMenuLanguage();
  MapBase.addMarkers();
  Menu.refreshMenu();
  Cycles.setLocaleDate();
});

//Change & save overlay opacity
$("#marker-opacity").on("change", function () {
  var parsed = parseFloat($("#marker-opacity").val());
  Settings.markerOpacity = parsed ? parsed : 1;
  $.cookie('marker-opacity', Settings.markerOpacity, { expires: 999 });
  MapBase.addMarkers();
});

$("#overlay-opacity").on("change", function () {
  var parsed = parseFloat($("#overlay-opacity").val());
  Settings.overlayOpacity = parsed ? parsed : 0.5;
  $.cookie('overlay-opacity', Settings.overlayOpacity, { expires: 999 });
  MapBase.setOverlays(parsed);
});

//Disable & enable collection category
$('.clickable').on('click', function () {
  var menu = $(this);
  if (typeof menu.data('type') === 'undefined') return;

  $('[data-type=' + menu.data('type') + ']').toggleClass('disabled');
  var isDisabled = menu.hasClass('disabled');

  if (isDisabled) {
    enabledCategories = $.grep(enabledCategories, function (value) {
      return value != menu.data('type');
    });

    categoriesDisabledByDefault.push(menu.data('type'));
  } else {
    enabledCategories.push(menu.data('type'));

    categoriesDisabledByDefault = $.grep(categoriesDisabledByDefault, function (value) {
      return value != menu.data('type');
    });
  }

  $.cookie('disabled-categories', categoriesDisabledByDefault.join(','), { expires: 999 });

  if (menu.data('type') == 'treasure')
    Treasures.addToMap();
  else if (menu.data('type') == 'user_pins')
    Pins.addToMap();
  else
    MapBase.addMarkers();
});

//Open collection submenu
$('.open-submenu').on('click', function (e) {
  e.stopPropagation();
  $(this).parent().parent().children('.menu-hidden').toggleClass('opened');
  $(this).toggleClass('rotate');
});

$('.submenu-only').on('click', function (e) {
  e.stopPropagation();
  $(this).parent().children('.menu-hidden').toggleClass('opened');
  $(this).children('.open-submenu').toggleClass('rotate');
});

//Sell collections on menu
$('.collection-sell').on('click', function (e) {
  var collectionType = $(this).parent().parent().data('type');
  var getMarkers = MapBase.markers.filter(_m => _m.category == collectionType && _m.day == Cycles.data.cycles[Cycles.data.current][_m.category]);

  $.each(getMarkers, function (key, value) {
    if (value.subdata) {
      if (value.text.endsWith('_1') || !value.text.match('[0-9]$'))
        Inventory.changeMarkerAmount(value.subdata, -1);
    }
    else {
      Inventory.changeMarkerAmount(value.text, -1);
    }
  });
});

// Reset collections on menu
$('.collection-reset').on('click', function (e) {
  var collectionType = $(this).parent().parent().data('type');
  var getMarkers = MapBase.markers.filter(_m => _m.category == collectionType && _m.day == Cycles.data.cycles[Cycles.data.current][_m.category]);

  $.each(getMarkers, function (key, value) {
    if (value.canCollect)
      return;

    if (Inventory.items[value.text])
      Inventory.items[value.text].isCollected = false;

    value.isCollected = false;
    value.canCollect = true;

    // .changeMarkerAmount() must run to check whether to remove "disabled" class
    if (value.subdata)
      Inventory.changeMarkerAmount(value.subdata, (Inventory.resetButtonUpdatesInventory ? -1 : 0));
    else
      Inventory.changeMarkerAmount(value.text, (Inventory.resetButtonUpdatesInventory ? -1 : 0));

    $(this).removeClass('disabled');
  });
  Inventory.save();
});

//Remove item from map when using the menu
$(document).on('click', '.collectible-wrapper[data-type]', function () {
  var collectible = $(this).data('type');
  var category = $(this).parent().data('type');

  MapBase.removeItemFromMap(Cycles.data.cycles[Cycles.data.current][category], collectible, collectible, category, true);
});

//Open & close side menu
$('.menu-toggle').on('click', function () {
  $('.side-menu').toggleClass('menu-opened');

  if ($('.side-menu').hasClass('menu-opened')) {
    $('.menu-toggle').text('X');
    $.cookie('menu-opened', '1');
  } else {
    $('.menu-toggle').text('>');
    $.cookie('menu-opened', '0');
  }
  $('.timer-container').toggleClass('timer-menu-opened');
  $('.counter-container').toggleClass('counter-menu-opened');
  $('.clock-container').toggleClass('timer-menu-opened');
});
//Enable & disable markers cluster
$('#marker-cluster').on("change", function () {
  Settings.markerCluster = $("#marker-cluster").prop('checked');
  $.cookie('marker-cluster', Settings.markerCluster ? '1' : '0', { expires: 999 });

  MapBase.map.removeLayer(Layers.itemMarkersLayer);
  MapBase.addMarkers();
});

$('#enable-marker-popups').on("change", function () {
  Settings.isPopupsEnabled = $("#enable-marker-popups").prop('checked');
  $.cookie('enable-marker-popups', Settings.isPopupsEnabled ? '1' : '0', { expires: 999 });

  MapBase.map.removeLayer(Layers.itemMarkersLayer);
  MapBase.addMarkers();
});

$('#enable-marker-shadows').on("change", function () {
  Settings.isShadowsEnabled = $("#enable-marker-shadows").prop('checked');
  $.cookie('enable-marker-shadows', Settings.isShadowsEnabled ? '1' : '0', { expires: 999 });

  MapBase.map.removeLayer(Layers.itemMarkersLayer);
  MapBase.addMarkers();
});

$('#enable-dclick-zoom').on("change", function () {
  Settings.isDoubleClickZoomEnabled = $("#enable-dclick-zoom").prop('checked');
  $.cookie('enable-dclick-zoom', Settings.isDoubleClickZoomEnabled ? '1' : '0', { expires: 999 });

  if (Settings.isDoubleClickZoomEnabled) {
    MapBase.map.doubleClickZoom.enable();
  } else {
    MapBase.map.doubleClickZoom.disable();
  }
});

$('#sort-items-alphabetically').on("change", function () {
  Settings.sortItemsAlphabetically = $("#sort-items-alphabetically").prop('checked');
  $.cookie('sort-items-alphabetically', Settings.sortItemsAlphabetically ? '1' : '0', { expires: 999 });
  Menu.refreshMenu();
});

/**
 * User Pins
 */

$('#pins-place-mode').on("change", function () {
  Settings.isPinsPlacingEnabled = $("#pins-place-mode").prop('checked');
  $.cookie('pins-place-enabled', Settings.isPinsPlacingEnabled ? '1' : '0', { expires: 999 });
});

$('#pins-edit-mode').on("change", function () {
  Settings.isPinsEditingEnabled = $("#pins-edit-mode").prop('checked');
  $.cookie('pins-edit-enabled', Settings.isPinsEditingEnabled ? '1' : '0', { expires: 999 });

  Pins.addToMap();
});

$('#pins-place-new').on("click", function () {
  Pins.addPinToCenter();
})

$('#pins-export').on("click", function () {
  try {
    Pins.exportPins();
  } catch (error) {
    console.error(error);
    alert(Language.get('alerts.feature_not_supported'));
  }
});

$('#pins-import').on('click', function () {
  try {
    var file = $('#pins-import-file').prop('files')[0];

    if (!file) {
      alert(Language.get('alerts.file_not_found'));
      return;
    }

    file.text().then(function (text) {
      Pins.importPins(text);
    })
  } catch (error) {
    console.error(error);
    alert(Language.get('alerts.feature_not_supported'));
  }
});

/**
 * Inventory
 */

//Enable & disable inventory on menu
$('#enable-inventory').on("change", function () {
  Inventory.isEnabled = $("#enable-inventory").prop('checked');
  $.cookie('inventory-enabled', Inventory.isEnabled ? '1' : '0', { expires: 999 });

  MapBase.addMarkers();

  Inventory.toggleMenuItemsDisabled();

  if (Inventory.isEnabled)
    $('.collection-sell, .counter').show();
  else
    $('.collection-sell, .counter').hide();
});

$('#enable-inventory-popups').on("change", function () {
  Inventory.isPopupEnabled = $("#enable-inventory-popups").prop('checked');
  $.cookie('inventory-popups-enabled', Inventory.isPopupEnabled ? '1' : '0', { expires: 999 });

  MapBase.addMarkers();
});

$('#enable-inventory-menu-update').on("change", function () {
  Inventory.isMenuUpdateEnabled = $("#enable-inventory-menu-update").prop('checked');
  $.cookie('inventory-menu-update-enabled', Inventory.isMenuUpdateEnabled ? '1' : '0', { expires: 999 });
});

$('#reset-collection-updates-inventory').on("change", function () {
  Inventory.resetButtonUpdatesInventory = $('#reset-collection-updates-inventory').prop('checked');
  $.cookie('reset-updates-inventory-enabled', Inventory.resetButtonUpdatesInventory ? '1' : '0', { expires: 999 });
});

if (Inventory.isEnabled)
  $('.collection-sell, .counter').show();
else
  $('.collection-sell, .counter').hide();

//Enable & disable inventory on menu
$('#inventory-stack').on("change", function () {
  var inputValue = parseInt($('#inventory-stack').val());
  inputValue = !isNaN(inputValue) ? inputValue : 10;
  $.cookie('inventory-stack', inputValue, { expires: 999 });
  Inventory.stackSize = inputValue;
});

/**
 * Cookie import/exporting
 */

$('#cookie-export').on("click", function () {
  try {
    var cookies = $.cookie();
    var storage = localStorage;

    // Remove irrelevant properties.
    delete cookies['_ga'];
    delete storage['randid'];
    delete storage['pinned-items'];

    var settings = {
      'cookies': cookies,
      'local': storage
    };

    var settingsJson = JSON.stringify(settings, null, 4);

    downloadAsFile("collectible-map-settings.json", settingsJson);
  } catch (error) {
    console.error(error);
    alert(Language.get('alerts.feature_not_supported'));
  }
});

$('#cookie-import').on('click', function () {
  try {
    var file = $('#cookie-import-file').prop('files')[0];

    if (!file) {
      alert(Language.get('alerts.file_not_found'));
      return;
    }

    file.text().then(function (res) {
      var settings = null;

      try {
        settings = JSON.parse(res);
      } catch (error) {
        alert(Language.get('alerts.file_not_valid'));
        return;
      }

      // Remove all current settings.
      $.each($.cookie(), function (key, value) {
        $.removeCookie(key);
      })

      $.each(localStorage, function (key, value) {
        localStorage.removeItem(key);
      })

      // Import all the settings from the file.
      if (typeof settings.cookies === 'undefined' && typeof settings.local === 'undefined') {
        $.each(settings, function (key, value) {
          $.cookie(key, value, { expires: 999 });
        });
      }

      $.each(settings.cookies, function (key, value) {
        $.cookie(key, value, { expires: 999 });
      });

      $.each(settings.local, function (key, value) {
        localStorage.setItem(key, value);
      });

      // Do this for now, maybe look into refreshing the menu completely (from init) later.
      location.reload();
    })
  } catch (error) {
    console.error(error);
    alert(Language.get('alerts.feature_not_supported'));
  }
});

/**
 * Path generator by Senexis
 */

$('#generate-route-generate-on-visit').on("change", function () {
  Routes.runOnStart = $("#generate-route-generate-on-visit").prop('checked');
  $.cookie('generator-path-generate-on-visit', Routes.runOnStart ? '1' : '0', { expires: 999 });
});

$('#generate-route-ignore-collected').on("change", function () {
  Routes.ignoreCollected = $("#generate-route-ignore-collected").prop('checked');
  $.cookie('generator-path-ignore-collected', Routes.ignoreCollected ? '1' : '0', { expires: 999 });

  Routes.generatePath();
});

$('#generate-route-auto-update').on("change", function () {
  Routes.autoUpdatePath = $("#generate-route-auto-update").prop('checked');
  $.cookie('generator-path-auto-update', Routes.autoUpdatePath ? '1' : '0', { expires: 999 });
});

$('#generate-route-distance').on("change", function () {
  var inputValue = parseInt($('#generate-route-distance').val());
  inputValue = !isNaN(inputValue) && inputValue > 0 ? inputValue : 25;
  $.cookie('generator-path-distance', inputValue, { expires: 999 });
  Routes.maxDistance = inputValue;

  Routes.generatePath();
});

$('#generate-route-start').on("change", function () {
  var inputValue = $('#generate-route-start').val();
  $.cookie('generator-path-start', inputValue, { expires: 999 });

  var startLat = null;
  var startLng = null;

  $('#generate-route-start-lat').parent().hide();
  $('#generate-route-start-lng').parent().hide();

  switch (inputValue) {
    case "Custom":
      $('#generate-route-start-lat').parent().show();
      $('#generate-route-start-lng').parent().show();
      return;

    case "N":
      startLat = -11.875;
      startLng = 86.875;
      break;

    case "NE":
      startLat = -27.4375;
      startLng = 161.2813;
      break;

    case "SE":
      startLat = -100.75;
      startLng = 131.125;
      break;

    case "SW":
    default:
      startLat = -119.9063;
      startLng = 8.0313;
      break;
  }

  $('#generate-route-start-lat').val(startLat);
  $('#generate-route-start-lng').val(startLng);

  $.cookie('generator-path-start-lat', startLat, { expires: 999 });
  $.cookie('generator-path-start-lng', startLng, { expires: 999 });

  Routes.startMarkerLat = startLat;
  Routes.startMarkerLng = startLng;

  Routes.generatePath();
});

$('#generate-route-start-lat').on("change", function () {
  var inputValue = parseFloat($('#generate-route-start-lat').val());
  inputValue = !isNaN(inputValue) ? inputValue : -119.9063;
  $.cookie('generator-path-start-lat', inputValue, { expires: 999 });
  Routes.startMarkerLat = inputValue;

  Routes.generatePath();
});

$('#generate-route-start-lng').on("change", function () {
  var inputValue = parseFloat($('#generate-route-start-lng').val());
  inputValue = !isNaN(inputValue) ? inputValue : 8.0313;
  $.cookie('generator-path-start-lng', inputValue, { expires: 999 });
  Routes.startMarkerLng = inputValue;

  Routes.generatePath();
});

$('#generate-route-use-pathfinder').on("change", function () {
  Routes.usePathfinder = $("#generate-route-use-pathfinder").prop('checked');
  $.cookie('generator-path-use-pathfinder', Routes.usePathfinder ? '1' : '0', { expires: 999 });

  // Hide incompatible options.
  if (Routes.usePathfinder) {
    $('#generate-route-distance').parent().hide();
    $('#generate-route-auto-update').parent().parent().hide();
    $('#generate-route-allow-fasttravel').parent().parent().show();
  } else {
    $('#generate-route-distance').parent().show();
    $('#generate-route-auto-update').parent().parent().show();
    $('#generate-route-allow-fasttravel').parent().parent().hide();
  }

  // Prevent both routes being stuck on screen.
  Routes.clearPath();

  Routes.generatePath();
});

$('#generate-route-allow-fasttravel').on("change", function () {
  Routes.allowFasttravel = $("#generate-route-allow-fasttravel").prop('checked');
  $.cookie('generator-path-allow-fasttravel', Routes.allowFasttravel ? '1' : '0', { expires: 999 });

  Routes.generatePath();
});

/**
 * Tutorial logic
 */
$('[data-help]').hover(function (e) {
  var attr = $(this).attr('data-help');
  $('#help-container p').attr('data-text', `help.${attr}`).text(Language.get(`help.${attr}`));
}, function () {
  $('#help-container p').attr('data-text', `help.default`).text(Language.get(`help.default`));
});

$('#show-help').on("change", function () {
  Settings.showHelp = $("#show-help").prop('checked');
  $.cookie('show-help', Settings.isHelpEnabled ? '1' : '0', { expires: 999 });

  if (Settings.showHelp) {
    $("#help-container").show();
  } else {
    $("#help-container").hide();
  }
});

/**
 * Leaflet plugins
 */
L.DivIcon.DataMarkup = L.DivIcon.extend({
  _setIconStyles: function (img, name) {
    L.DivIcon.prototype._setIconStyles.call(this, img, name);
    if (this.options.marker)
      img.dataset.marker = this.options.marker;
  }
});

L.LayerGroup.include({
  getLayerById: function (id) {
    for (var i in this._layers) {
      if (this._layers[i].id == id) {
        return this._layers[i];
      }
    }
  }
});

// Disable annoying menu on right mouse click
$('*').on('contextmenu', function (event) {
  if ($.cookie('right-click') != null)
    return;
  event.preventDefault();
});

/**
 * Event listeners
 */

$(function () {
  init();
  Cycles.load();
  Inventory.init();
  MapBase.loadWeeklySet();
  MapBase.loadFastTravels();
  MadamNazar.loadMadamNazar();
  Treasures.load();
  Encounters.load();
  MapBase.loadMarkers();
  Routes.init();
});
