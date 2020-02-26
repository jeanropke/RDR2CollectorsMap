//Since Moonshiners update, R* changed how cycles works.
//Instead of 1 cycle for each collection in the day, each collection has your own cycle.
//Eg: Coins can be on cycle 1, Eggs on cycle 3, Flowers on 5... and so on

var searchTerms = [];
var uniqueSearchMarkers = [];

var categories = [
  'american_flowers', 'antique_bottles', 'arrowhead', 'bird_eggs', 'coin', 'family_heirlooms', 'lost_bracelet',
  'lost_earrings', 'lost_necklaces', 'lost_ring', 'card_cups', 'card_pentacles', 'card_swords', 'card_wands', 'nazar',
  'fast_travel', 'treasure', 'random', 'treasure_hunter', 'tree_map', 'egg_encounter', 'dog_encounter', 'grave_robber',
  'wounded_animal', 'rival_collector', 'user_pins'
];

var categoriesDisabledByDefault = [
  'treasure', 'random', 'treasure_hunter', 'tree_map', 'egg_encounter', 'dog_encounter', 'grave_robber',
  'wounded_animal', 'rival_collector'
]

var enabledCategories = categories;
var categoryButtons = $(".clickable[data-type]");

var fastTravelData;

var weeklySetData = [];
var date;

var wikiLanguage = [];

var debugMarkersArray = [];

function init() {
  wikiLanguage['de-de'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/RDO-Sammler-Landkarte-Benutzerhandbuch-(Deutsch)';
  wikiLanguage['en-us'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/RDO-Collectors-Map-User-Guide-(English)';
  wikiLanguage['fr-fr'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/RDO-Collectors-Map-Guide-d\'Utilisateur-(French)';
  wikiLanguage['pt-br'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/Guia-do-Usu%C3%A1rio---Mapa-de-Colecionador-(Portuguese)';

  if (localStorage.getItem("inventory-items") !== null) {
    var _items = localStorage.getItem("inventory-items");

    if (_items == null) return;

    _items.split(';').forEach(item => {
      if (item == '') return;

      var properties = item.split(':');

      if (Inventory.items[properties[0].replace(/_\d/, '')] === undefined)
        Inventory.items[properties[0].replace(/_\d/, '')] = 0;

      Inventory.items[properties[0].replace(/_\d/, '')]++;
      MapBase.collectedItems[properties[0]] = properties[1] == '1';
    });

    localStorage.clear("inventory-items");

    MapBase.saveCollectedItems();
    Inventory.save();
  }

  MapBase.loadCollectedItems();
  Inventory.load();

  $('.map-alert').toggle($.cookie('alert-closed-1') === undefined);

  if ($.cookie('disabled-categories') !== undefined)
    categoriesDisabledByDefault = $.cookie('disabled-categories').split(',');

  categoriesDisabledByDefault = categoriesDisabledByDefault.filter(function (item) {
    return ['texas_bluebonnet', 'bitterweed', 'agarita', 'wild_rhubarb', 'cardinal',
      'creek_plum', 'blood_flower', 'chocolate_daisy', 'wisteria'].indexOf(item) === -1;
  });

  enabledCategories = enabledCategories.filter(function (item) {
    return categoriesDisabledByDefault.indexOf(item) === -1;
  });

  if ($.cookie('map-layer') === undefined || isNaN(parseInt($.cookie('map-layer'))))
    $.cookie('map-layer', 0, { expires: 999 });

  if (!Language.availableLanguages.includes(Settings.language))
    Settings.language = 'en-us';

  if ($.cookie('remove-markers-daily') === undefined) {
    Settings.resetMarkersDaily = true;
    $.cookie('remove-markers-daily', '1', { expires: 999 });
  }

  if ($.cookie('marker-cluster') === undefined) {
    Settings.markerCluster = true;
    $.cookie('marker-cluster', '1', { expires: 999 });
  }

  if ($.cookie('enable-marker-popups') === undefined) {
    Settings.isPopupsEnabled = true;
    $.cookie('enable-marker-popups', '1', { expires: 999 });
  }

  if ($.cookie('enable-marker-shadows') === undefined) {
    Settings.isShadowsEnabled = true;
    $.cookie('enable-marker-shadows', '1', { expires: 999 });
  }

  if ($.cookie('enable-dclick-zoom') === undefined) {
    Settings.isDoubleClickZoomEnabled = true;
    $.cookie('enable-dclick-zoom', '1', { expires: 999 });
  }

  if ($.cookie('show-help') === undefined) {
    Settings.showHelp = true;
    $.cookie('show-help', '1', { expires: 999 });
  }

  if ($.cookie('marker-opacity') === undefined) {
    Settings.markerOpacity = 1;
    $.cookie('marker-opacity', '1', { expires: 999 });
  }

  if ($.cookie('marker-size') === undefined) {
    Settings.markerSize = 1;
    $.cookie('marker-size', '1', { expires: 999 });
  }

  if ($.cookie('overlay-opacity') === undefined) {
    Settings.overlayOpacity = 0.5;
    $.cookie('overlay-opacity', '0.5', { expires: 999 });
  }

  if ($.cookie('clock-or-timer') === undefined) {
    Settings.displayClockHideTimer = false;
    $.cookie('clock-or-timer', 'false', { expires: 999 });
  }

  if ($.cookie('timestamps-24') === undefined) {
    Settings.display24HoursTimestamps = false;
    $.cookie('timestamps-24', 'false', { expires: 999 });
  }

  if ($.cookie('show-utilities') === undefined) {
    Settings.showUtilitiesSettings = 1;
    $.cookie('show-utilities', '1', { expires: 999 });
  }

  if ($.cookie('show-customization') === undefined) {
    Settings.showCustomizationSettings = 1;
    $.cookie('show-customization', '1', { expires: 999 });
  }

  if ($.cookie('show-routes') === undefined) {
    Settings.showRoutesSettings = 1;
    $.cookie('show-routes', '1', { expires: 999 });
  }

  if ($.cookie('show-import-export') === undefined) {
    Settings.showImportExportSettings = 1;
    $.cookie('show-import-export', '1', { expires: 999 });
  }

  if ($.cookie('custom-markers-color') === undefined) {
    Settings.markersCustomColor = 0;
    $.cookie('custom-markers-color', '0', { expires: 999 });
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
  $('#marker-size').val(Settings.markerSize);
  $('#overlay-opacity').val(Settings.overlayOpacity);
  $('#custom-marker-color').val(Settings.markersCustomColor);

  $('#reset-markers').prop("checked", Settings.resetMarkersDaily);
  $('#marker-cluster').prop("checked", Settings.markerCluster);
  $('#enable-marker-popups').prop("checked", Settings.isPopupsEnabled);
  $('#enable-marker-popups-hover').prop("checked", Settings.isPopupsHoverEnabled);
  $('#enable-marker-shadows').prop("checked", Settings.isShadowsEnabled);
  $('#enable-dclick-zoom').prop("checked", Settings.isDoubleClickZoomEnabled);
  $('#pins-place-mode').prop("checked", Settings.isPinsPlacingEnabled);
  $('#pins-edit-mode').prop("checked", Settings.isPinsEditingEnabled);
  $('#show-help').prop("checked", Settings.showHelp);
  $('#show-coordinates').prop("checked", Settings.isCoordsEnabled);
  $('#timestamps-24').prop("checked", Settings.display24HoursTimestamps);
  $('#sort-items-alphabetically').prop("checked", Settings.sortItemsAlphabetically);
  $('#enable-cycle-input').prop("checked", Settings.isCycleInputEnabled);
  $("#enable-right-click").prop('checked', $.cookie('right-click') != null);
  $("#enable-debug").prop('checked', $.cookie('debug') != null);
  $("#enable-cycle-changer").prop('checked', $.cookie('cycle-changer-enabled') != null);

  $("#show-utilities").prop('checked', Settings.showUtilitiesSettings);
  $("#show-customization").prop('checked', Settings.showCustomizationSettings);
  $("#show-routes").prop('checked', Settings.showRoutesSettings);
  $("#show-import-export").prop('checked', Settings.showImportExportSettings);
  $("#show-debug").prop('checked', Settings.showDebugSettings);

  $("#help-container").toggle(Settings.showHelp);

  $('.timer-container').toggleClass('hidden', Settings.displayClockHideTimer);
  $('.clock-container').toggleClass('hidden', !(Settings.displayClockHideTimer));
  $('.input-cycle').toggleClass('hidden', !(Settings.isCycleInputEnabled));
  $('.cycle-icon').toggleClass('hidden', Settings.isCycleInputEnabled);
  $('#cycle-changer-container').toggleClass('hidden', !(Settings.isCycleChangerEnabled));

  $("#utilities-container").toggleClass('opened', Settings.showUtilitiesSettings);
  $("#customization-container").toggleClass('opened', Settings.showCustomizationSettings);
  $("#routes-container").toggleClass('opened', Settings.showRoutesSettings);
  $("#import-export-container").toggleClass('opened', Settings.showImportExportSettings);
  $("#debug-container").toggleClass('opened', Settings.showDebugSettings);

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
  else {
    $('.leaflet-grab').css('cursor', 'grab');
    $('.lat-lng-container').css('display', 'none');
  }
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
  document.body.removeChild(el);
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

function clockTick() {
  // Clock in game created by Michal__d
  var display_24 = Settings.display24HoursTimestamps;
  var newDate = new Date();
  var startTime = newDate.valueOf();
  var factor = 30;
  var correctTime = new Date(startTime * factor);

  correctTime.setHours(correctTime.getUTCHours());
  correctTime.setMinutes(correctTime.getUTCMinutes() - 3); //for some reason time in game is 3 sec. delayed to normal time

  if (display_24) {
    $('#time-in-game').text(addZeroToNumber(correctTime.getHours()) + ":" + addZeroToNumber(correctTime.getMinutes()));
  } else {
    $('#time-in-game').text((addZeroToNumber(correctTime.getHours() % 12) == '00' ? '12' : addZeroToNumber(correctTime.getHours() % 12)) + ":" + addZeroToNumber(correctTime.getMinutes()) + " " + ((correctTime.getHours() < 12) ? "AM" : "PM"));
  }

  if (correctTime.getHours() >= 22 || correctTime.getHours() < 5) {
    $('.day-cycle').css('background', 'url(assets/images/moon.png)');
  } else {
    $('.day-cycle').css('background', 'url(assets/images/sun.png)');
  }

  //Countdown for the next cycle
  var nextGMTMidnight = new Date();
  var hours = 23 - nextGMTMidnight.getUTCHours();
  var minutes = 59 - nextGMTMidnight.getUTCMinutes();
  var seconds = 59 - nextGMTMidnight.getUTCSeconds();
  $('#countdown').text(addZeroToNumber(hours) + ':' + addZeroToNumber(minutes) + ':' + addZeroToNumber(seconds));

  if (correctTime.getHours() >= 22 || correctTime.getHours() < 5) {
    $('[data-marker*="flower_agarita"], [data-marker*="flower_blood"]').css('filter', 'drop-shadow(0 0 .5rem #fff) drop-shadow(0 0 .25rem #fff)');
  }
  else {
    $('[data-marker*="flower_agarita"], [data-marker*="flower_blood"]').css('filter', 'none');
  }
}

setInterval(clockTick, 1000);

// toggle timer and clock after click the container
$('.timer-container, .clock-container').on('click', function () {
  $('.timer-container, .clock-container').toggleClass('hidden');
  Settings.displayClockHideTimer = !Settings.displayClockHideTimer;
  $.cookie('clock-or-timer', Settings.displayClockHideTimer, { expires: 999 });
});

/**
 * jQuery triggers
 */

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

//Toggle settings containers
$("#show-utilities").on("change", function () {
  Settings.showUtilitiesSettings = $("#show-utilities").prop('checked');
  $.cookie('show-utilities', Settings.showUtilitiesSettings ? '1' : '0', { expires: 999 });

  $("#utilities-container").toggleClass('opened', Settings.showUtilitiesSettings);
});

$("#show-customization").on("change", function () {
  Settings.showCustomizationSettings = $("#show-customization").prop('checked');
  $.cookie('show-customization', Settings.showCustomizationSettings ? '1' : '0', { expires: 999 });

  $("#customization-container").toggleClass('opened', Settings.showCustomizationSettings);
});

$("#show-routes").on("change", function () {
  Settings.showRoutesSettings = $("#show-routes").prop('checked');
  $.cookie('show-routes', Settings.showRoutesSettings ? '1' : '0', { expires: 999 });

  $("#routes-container").toggleClass('opened', Settings.showRoutesSettings);
});

$("#show-import-export").on("change", function () {
  Settings.showImportExportSettings = $("#show-import-export").prop('checked');
  $.cookie('show-import-export', Settings.showImportExportSettings ? '1' : '0', { expires: 999 });

  $("#import-export-container").toggleClass('opened', Settings.showImportExportSettings);
});

$("#show-debug").on("change", function () {
  Settings.showDebugSettings = $("#show-debug").prop('checked');
  $.cookie('show-debug', Settings.showDebugSettings ? '1' : '0', { expires: 999 });

  $("#debug-container").toggleClass('opened', Settings.showDebugSettings);
});

// :-)
$('#enable-debug').on("change", function () {
  if ($("#enable-debug").prop('checked')) {
    Settings.isDebugEnabled = true;
    $.cookie('debug', '1', { expires: 999 });
  } else {
    Settings.isDebugEnabled = false;
    $.removeCookie('debug');
  }
});

$('#enable-cycle-changer').on("change", function () {
  if ($("#enable-cycle-changer").prop('checked')) {
    Settings.isCycleChangerEnabled = true;
    $.cookie('cycle-changer-enabled', '1', { expires: 999 });

    $('#cycle-changer-container').removeClass('hidden');
  } else {
    Settings.isCycleChangerEnabled = false;
    $.removeCookie('cycle-changer-enabled');

    $('#cycle-changer-container').addClass('hidden');
    Cycles.resetCycle();
  }
});

//Disable menu category when click on input
$('.menu-option.clickable input').on('click', function (e) {
  e.stopPropagation();
});

//change cycle by collection
$('.menu-option.clickable input').on('change', function (e) {
  var el = $(e.target);
  Cycles.categories[el.attr("name")] = parseInt(el.val());
  MapBase.addMarkers();
  Menu.refreshMenu();
});

//Search system on menu
$("#search").on("input", function () {
  MapBase.onSearch($('#search').val());
});

$("#copy-search-link").on("click", function () {
  setClipboardText(`http://jeanropke.github.io/RDR2CollectorsMap/?search=${$('#search').val()}`);
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
});

//Clear inventory on menu
$("#clear-inventory").on("click", function () {

  $.each(MapBase.markers, function (key, marker) {
    if (marker.day == Cycles.categories[marker.category] && (marker.amount > 0 || marker.isCollected)) {
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

$('#timestamps-24').on('change', function () {
  Settings.display24HoursTimestamps = $("#timestamps-24").prop('checked');
  $.cookie('timestamps-24', Settings.display24HoursTimestamps ? '1' : '0', { expires: 999 });
  clockTick();
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

//Change & save marker size
$("#marker-size").on("change", function () {
  var parsed = parseFloat($("#marker-size").val());
  Settings.markerSize = parsed ? parsed : 1;
  $.cookie('marker-size', Settings.markerSize, { expires: 999 });
  MapBase.addMarkers();
  Treasures.set();
});

//Enable cycle input
$("#enable-cycle-input").on("change", function () {
  Settings.isCycleInputEnabled = $("#enable-cycle-input").prop('checked');
  $.cookie('cycle-input-enabled', Settings.isCycleInputEnabled ? '1' : '0', { expires: 999 });
  $('.input-cycle').toggleClass('hidden', !(Settings.isCycleInputEnabled));
  $('.cycle-icon').toggleClass('hidden', Settings.isCycleInputEnabled);
});

$('#custom-marker-color').on("change", function () {
  var parsed = parseFloat($("#custom-marker-color").val());
  Settings.markersCustomColor = parsed ? parsed : 0;
  $.cookie('custom-markers-color', Settings.markersCustomColor, { expires: 999 });
  MapBase.addMarkers();
})

//Disable & enable collection category
$('.clickable').on('click', function () {
  var menu = $(this);
  if (menu.data('type') === undefined) return;

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
  var getMarkers = MapBase.markers.filter(_m => _m.category == collectionType && _m.day == Cycles.categories[_m.category]);

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
  var getMarkers = MapBase.markers.filter(_m => !_m.canCollect && _m.category == collectionType && _m.day == Cycles.categories[_m.category]);

  $.each(getMarkers, function (key, marker) {
    MapBase.removeItemFromMap(marker.day, marker.text, marker.subdata, marker.category);
  });

  $(this).removeClass('disabled');
});

//Remove item from map when using the menu
$(document).on('click', '.collectible-wrapper[data-type]', function () {
  var collectible = $(this).data('type');
  var category = $(this).parent().data('type');

  MapBase.removeItemFromMap(Cycles.categories[category], collectible, collectible, category, true);
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

$('#enable-marker-popups-hover').on("change", function () {
  Settings.isPopupsHoverEnabled = $("#enable-marker-popups-hover").prop('checked');
  $.cookie('enable-marker-popups-hover', Settings.isPopupsHoverEnabled ? '1' : '0', { expires: 999 });
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
});

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
    var fallback = false;

    if (!file) {
      alert(Language.get('alerts.file_not_found'));
      return;
    }

    try {
      file.text().then((text) => {
        Pins.importPins(text);
      });
    } catch (error) {
      fallback = true;
    }

    if (fallback) {
      var reader = new FileReader();

      reader.addEventListener('loadend', (e) => {
        var text = e.srcElement.result;
        Pins.importPins(text);
      });

      reader.readAsText(file);
    }
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
  ItemsValue.reloadInventoryItems();
  $('.collection-sell, .counter').toggle(Inventory.isEnabled);
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

$('.collection-sell, .counter').toggle(Inventory.isEnabled);

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

function setSettings(settings) {
  // Import all the settings from the file.
  if (settings.cookies === undefined && settings.local === undefined) {
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
}

$('#cookie-import').on('click', function () {
  try {
    var settings = null;
    var file = $('#cookie-import-file').prop('files')[0];
    var fallback = false;

    if (!file) {
      alert(Language.get('alerts.file_not_found'));
      return;
    }

    try {
      file.text().then((text) => {
        try {
          settings = JSON.parse(text);

          setSettings(settings);

        } catch (error) {
          alert(Language.get('alerts.file_not_valid'));
          return;
        }
      });
    } catch (error) {
      fallback = true;
    }

    if (fallback) {
      var reader = new FileReader();

      reader.addEventListener('loadend', (e) => {
        var text = e.srcElement.result;

        try {
          settings = JSON.parse(text);
          setSettings(settings);
        } catch (error) {
          alert(Language.get('alerts.file_not_valid'));
          return;
        }
      });

      reader.readAsText(file);
    }

    // Remove all current settings.
    $.each($.cookie(), function (key, value) {
      $.removeCookie(key);
    });

    $.each(localStorage, function (key, value) {
      localStorage.removeItem(key);
    });

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

$('#generate-route-important-only').on("change", function () {
  Routes.importantOnly = $("#generate-route-important-only").prop('checked');
  $.cookie('generator-path-important-only', Routes.importantOnly ? '1' : '0', { expires: 999 });

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
    $('#generate-route-fasttravel-weight').parent().show();
    $('#generate-route-railroad-weight').parent().show();
  } else {
    $('#generate-route-distance').parent().show();
    $('#generate-route-auto-update').parent().parent().show();
    $('#generate-route-fasttravel-weight').parent().hide();
    $('#generate-route-railroad-weight').parent().hide();
  }

  // Prevent both routes being stuck on screen.
  Routes.clearPath();

  Routes.generatePath();
});

$('#generate-route-fasttravel-weight').on("change", function () {
  Routes.fasttravelWeight = parseFloat($("#generate-route-fasttravel-weight").val());
  $.cookie('generator-path-fasttravel-weight', Routes.fasttravelWeight.toString(), { expires: 999 });

  Routes.generatePath();
});

$('#generate-route-railroad-weight').on("change", function () {
  Routes.railroadWeight = parseFloat($("#generate-route-railroad-weight").val());
  $.cookie('generator-path-railroad-weight', Routes.railroadWeight.toString(), { expires: 999 });

  Routes.generatePath();
});

/**
 * Tutorial logic
 */
var defaultHelpTimeout;
$('[data-help]').hover(function (e) {
  var attr = $(this).attr('data-help');
  clearTimeout(defaultHelpTimeout);
  $('#help-container p').attr('data-text', `help.${attr}`).text(Language.get(`help.${attr}`));
}, function () {
  defaultHelpTimeout = setTimeout(function () {
    $('#help-container p').attr('data-text', `help.default`).text(Language.get(`help.default`));
  }, 100);
});

$('#show-help').on("change", function () {
  Settings.showHelp = $("#show-help").prop('checked');
  $.cookie('show-help', Settings.showHelp ? '1' : '0', { expires: 999 });

  $("#help-container").toggle(Settings.showHelp);
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
$('*').on('contextmenu', function (e) {
  if ($.cookie('right-click') == null)
    e.preventDefault();
});

// reset all settings & cookies
$('#delete-all-settings').on('click', function () {
  var cookies = $.cookie();
  for (var cookie in cookies) {
    $.removeCookie(cookie);
  }

  $.each(localStorage, function (key) {
    localStorage.removeItem(key);
  });

  location.reload(true);
});

/**
 * Modals
 */
$('#open-clear-markers-modal').on('click', function () {
  $('#clear-markers-modal').modal();
});

$('#open-clear-important-items-modal').on('click', function () {
  $('#clear-important-items-modal').modal();
});

$('#open-clear-inventory-modal').on('click', function () {
  $('#clear-inventory-modal').modal();
});

$('#open-clear-routes-modal').on('click', function () {
  $('#clear-routes-modal').modal();
});

$('#open-delete-all-settings-modal').on('click', function () {
  $('#delete-all-settings-modal').modal();
});

/**
 * Event listeners
 */

$(function () {
  init();
  MapBase.loadWeeklySet();
  Cycles.load();
  Inventory.init();
  MapBase.loadFastTravels();
  MadamNazar.loadMadamNazar();
  Treasures.load();
  Encounters.load();
  MapBase.loadMarkers();
  Routes.init();
});
