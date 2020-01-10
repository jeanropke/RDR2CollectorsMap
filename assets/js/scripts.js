//Since Moonshiners update, R* changed how cycles works.
//Instead of 1 cycle for each collection in the day, each collection has your own cycle.
//Eg: Coins can be on cycle 1, Eggs on cycle 3, Flowers on 5... and so on

var searchTerms = [];
var uniqueSearchMarkers = [];

var categories = [
  'american_flowers', 'antique_bottles', 'arrowhead', 'bird_eggs', 'coin', 'family_heirlooms', 'lost_bracelet',
  'lost_earrings', 'lost_necklaces', 'lost_ring', 'card_cups', 'card_pentacles', 'card_swords', 'card_wands', 'nazar',
  'fast_travel', 'treasure', 'random', 'treasure_hunter', 'tree_map', 'egg_encounter', 'dog_encounter', 'grave_robber',
  'wounded_animal', 'fame_seeker'
];

var categoriesDisabledByDefault = [
  'treasure', 'random', 'treasure_hunter', 'tree_map', 'egg_encounter', 'dog_encounter', 'grave_robber',
  'wounded_animal', 'fame_seeker'
]

var enabledCategories = categories;
var categoryButtons = document.getElementsByClassName("menu-option clickable");

var availableLanguages = ['ar-ar', 'de-de', 'en-us', 'es-es', 'fr-fr', 'hu-hu', 'it-it', 'ko', 'pt-br', 'pl', 'ru', 'th-th', 'zh-s', 'zh-t'];

var fastTravelData;

var weeklySetData = [];
var date;

var wikiLanguage = [];

var inventory = [];
var tempInventory = [];

var debugMarkersArray = [];

function init() {

  wikiLanguage['de-de'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/RDO-Sammler-Landkarte-Benutzerhandbuch-(Deutsch)';
  wikiLanguage['en-us'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/RDO-Collectors-Map-User-Guide-(English)';
  wikiLanguage['fr-fr'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/RDO-Collectors-Map-Guide-d\'Utilisateur-(French)';
  wikiLanguage['pt-br'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/Guia-do-Usu%C3%A1rio---Mapa-de-Colecionador-(Portuguese)';


  var tempCollectedMarkers = "";
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

  $.each(tempInventory, function (key, value) {
    if (!value.includes(':'))
      return;
    var tempItem = value.split(':');
    inventory[tempItem[0]] = {
      'isCollected': tempItem[1] == '1',
      'amount': tempItem[2]
    };

  });

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
    $.cookie('map-layer', 1, { expires: 999 });

  if (!availableLanguages.includes(Settings.language))
    Settings.language = 'en-us';

  if (typeof $.cookie('remove-markers-daily') === 'undefined') {
    Settings.resetMarkersDaily = true;
    $.cookie('remove-markers-daily', '1', { expires: 999 });
  }

  if (typeof $.cookie('marker-cluster') === 'undefined') {
    Settings.markerCluster = true;
    $.cookie('marker-cluster', '1', { expires: 999 });
  }

  var curDate = new Date();
  date = curDate.getUTCFullYear() + '-' + (curDate.getUTCMonth() + 1) + '-' + curDate.getUTCDate();

  //Reset markers daily
  if (date != $.cookie('date')) {
    if (Settings.resetMarkersDaily) {
      $.each(MapBase.markers, function (key, value) {
        if (inventory[value.text])
          inventory[value.text].isCollected = false;

        value.isCollected = false;
        value.canCollect = value.amount < Inventory.stackSize;
      });
      MapBase.save();
    }
  }
  $.cookie('date', date, { expires: 7 });

  MapBase.init();
  Language.setMenuLanguage();

  setMapBackground($.cookie('map-layer'));

  if (Settings.isMenuOpened)
    $('.menu-toggle').click();

  $('#tools').val(Settings.toolType);
  $('#language').val(Settings.language);

  $('#reset-markers').prop("checked", Settings.resetMarkersDaily);
  $('#marker-cluster').prop("checked", Settings.markerCluster);
  $('#pins-place-mode').prop("checked", Settings.isPinsPlacingEnabled);
  $('#pins-edit-mode').prop("checked", Settings.isPinsEditingEnabled);
  $('#show-coordinates').prop("checked", Settings.isCoordsEnabled);

  Pins.loadAllPins();
  changeCursor();
}

function setMapBackground(mapIndex) {
  switch (parseInt(mapIndex)) {
    default:
    case 0:
      $('#map').css('background-color', '#d2b790');
      break;

    case 1:
      $('#map').css('background-color', '#d2b790');
      break;

    case 2:
      $('#map').css('background-color', '#3d3d3d');
      break;
  }

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
    $('#am-pm-time').text(((correctTime.getHours() > 12) ? "PM" : "AM"));
  }

  //Countdown for the next cycle
  var nextGMTMidnight = new Date();
  var hours = 23 - nextGMTMidnight.getUTCHours();
  var minutes = 59 - nextGMTMidnight.getUTCMinutes();
  var seconds = 59 - nextGMTMidnight.getUTCSeconds();
  $('#countdown').text(addZeroToNumber(hours) + ':' + addZeroToNumber(minutes) + ':' + addZeroToNumber(seconds));

  if (correctTime.getHours() >= 22 || correctTime.getHours() < 5)
    $('#day-cycle').css('background', 'url(assets/images/moon.png)');
  else
    $('#day-cycle').css('background', 'url(assets/images/sun.png)');
}, 1000);

// toggle timer and clock after click the container
$('.timer-container').on('click', function () {
  $(this).toggleClass("display-in-front");
  $('.clock-container').toggleClass("display-in-front");
});
$('.clock-container').on('click', function () {
  $(this).toggleClass("display-in-front");
  $('.timer-container').toggleClass("display-in-front");
});


/**
 * jQuery triggers
 */

//Show all markers on map
$("#show-all-markers").on("change", function () {
  Settings.showAllMarkers = $("#show-all-markers").prop('checked');
  MapBase.addMarkers();
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
  searchTerms = [];
  $.each($('#search').val().split(';'), function (key, value) {
    if ($.inArray(value.trim(), searchTerms) == -1) {
      if (value.length > 0)
        searchTerms.push(value.trim());
    }
  });
  MapBase.onSearch();
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
    if (inventory[value.text])
      inventory[value.text].isCollected = false;

    value.isCollected = false;
    value.canCollect = value.amount < Inventory.stackSize;
  });

  MapBase.save();
  Menu.refreshMenu();

  Menu.refreshItemsCounter();
  MapBase.addMarkers();
})

//Clear inventory on menu
$("#clear-inventory").on("click", function () {
  $.each(Object.keys(inventory), function (key, value) {
    inventory[value].amount = 0;
    var marker = MapBase.markers.filter(function (marker) {
      return marker.text == value && marker.day == Cycles.data.cycles[Cycles.data.current][marker.category];
    })[0];

    if (marker != null)
      marker.amount = 0;
  });

  MapBase.save();
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

//Disable & enable collection category
$('.menu-option.clickable').on('click', function () {
  var menu = $(this);

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

  if (menu.data('type') !== 'treasure') {
    MapBase.addMarkers();
  }
  else {
    Treasures.addToMap();
  }

});

//Open collection submenu
$('.open-submenu').on('click', function (e) {
  e.stopPropagation();
  $(this).parent().parent().children('.menu-hidden').toggleClass('opened');
  $(this).toggleClass('rotate');
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

//Remove item from map when using the menu
$(document).on('click', '.collectible-wrapper', function () {
  var collectible = $(this).data('type');
  var category = $(this).parent().data('type');

  MapBase.removeItemFromMap(Cycles.data.cycles[Cycles.data.current][category], collectible, collectible, category);
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


/**
 * User pins
 */

$('#pins-place-mode').on("change", function () {
  Settings.isPinsPlacingEnabled = $("#pins-place-mode").prop('checked');
  $.cookie('pins-place-enabled', Settings.isPinsPlacingEnabled ? '1' : '0', { expires: 999 });
});

$('#pins-edit-mode').on("change", function () {
  Settings.isPinsEditingEnabled = $("#pins-edit-mode").prop('checked');
  $.cookie('pins-edit-enabled', Settings.isPinsEditingEnabled ? '1' : '0', { expires: 999 });

  Pins.loadAllPins();
});

$('#pins-export').on("click", function () {
  try {
    Pins.exportPins();
  } catch (error) {
    console.error(error);
    alert("This feature is not supported by your browser.");
  }
});

$('#pins-import').on('click', function () {
  try {
    var file = $('#pins-import-file').prop('files')[0];

    if (!file) {
      alert("Please select a file in the field above the import button, then try again.");
      return;
    }

    file.text().then(function (text) {
      Pins.importPins(text);
    })
  } catch (error) {
    console.error(error);
    alert("This feature is not supported by your browser.");
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

  if (Inventory.isEnabled)
    $('.collection-sell, small.counter').show();
  else
    $('.collection-sell, small.counter').hide();
});

if (Inventory.isEnabled)
  $('.collection-sell, small.counter').show();
else
  $('.collection-sell, small.counter').hide();

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

    // Google Analytics cookie isn't relevant.
    delete cookies._ga;

    var cookiesJson = JSON.stringify(cookies, null, 4);

    downloadAsFile("collectible-map-settings.json", cookiesJson);
  } catch (error) {
    console.error(error);
    alert("This feature is not supported by your browser.");
  }
});

$('#cookie-import').on('click', function () {
  try {
    var file = $('#cookie-import-file').prop('files')[0];

    if (!file) {
      alert("Please select a file in the field above the import button, then try again.");
      return;
    }

    file.text().then(function (res) {
      var json = null;

      try {
        json = JSON.parse(res);
      } catch (error) {
        alert("The file you selected was not valid. Please select a different file.");
        return;
      }

      // Remove all current cookies.
      var currentCookies = $.cookie();

      Object.keys(currentCookies).forEach(cookie => {
        $.removeCookie(cookie);
      });

      // Import all the cookies from the file.
      Object.keys(json).forEach(key => {
        $.cookie(key, json[key], { expires: 999 });
      });

      // Do this for now, maybe look into refreshing the menu completely (from init) later.
      location.reload();
    })
  } catch (error) {
    console.error(error);
    alert("This feature is not supported by your browser.");
  }
});

/**
 * Path generator by Senexis
 */

$('#generate-route-ignore-collected').on("change", function () {
  Routes.ignoreCollected = $("#generate-route-ignore-collected").prop('checked');
  $.cookie('generator-path-ignore-collected', Routes.ignoreCollected ? '1' : '0', { expires: 999 });

  if (Routes.lastPolyline != null)
    Routes.generatePath();
});

$('#generate-route-generate-on-visit').on("change", function () {
  Routes.runOnStart = $("#generate-route-generate-on-visit").prop('checked');
  $.cookie('generator-path-generate-on-visit', Routes.runOnStart ? '1' : '0', { expires: 999 });
});

$('#generate-route-distance').on("change", function () {
  var inputValue = parseInt($('#generate-route-distance').val());
  inputValue = !isNaN(inputValue) && inputValue > 0 ? inputValue : 25;
  $.cookie('generator-path-distance', inputValue, { expires: 999 });
  Routes.maxDistance = inputValue;

  if (Routes.lastPolyline != null)
    Routes.generatePath();
});

$('#generate-route-start').on("change", function () {
  var inputValue = $('#generate-route-start').val();
  $.cookie('generator-path-start', inputValue, { expires: 999 });

  var startLat = null;
  var startLng = null;

  $('#generate-route-start-lat').prop('disabled', true);
  $('#generate-route-start-lng').prop('disabled', true);

  switch (inputValue) {
    case "Custom":
      $('#generate-route-start-lat').prop('disabled', false);
      $('#generate-route-start-lng').prop('disabled', false);
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

  if (Routes.lastPolyline != null)
    Routes.generatePath();
});

$('#generate-route-start-lat').on("change", function () {
  var inputValue = parseFloat($('#generate-route-start-lat').val());
  inputValue = !isNaN(inputValue) ? inputValue : -119.9063;
  $.cookie('generator-path-start-lat', inputValue, { expires: 999 });
  Routes.startMarkerLat = inputValue;

  if (Routes.lastPolyline != null)
    Routes.generatePath();
});

$('#generate-route-start-lng').on("change", function () {
  var inputValue = parseFloat($('#generate-route-start-lng').val());
  inputValue = !isNaN(inputValue) ? inputValue : 8.0313;
  $.cookie('generator-path-start-lng', inputValue, { expires: 999 });
  Routes.startMarkerLng = inputValue;

  if (Routes.lastPolyline != null)
    Routes.generatePath();
});

/**
 * Leaflet plugins
 */
L.Icon.DataMarkup = L.Icon.extend({
  _setIconStyles: function (img, name) {
    L.Icon.prototype._setIconStyles.call(this, img, name);
    if (this.options.marker) {
      img.dataset.marker = this.options.marker;
    }
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

/**
 * Event listeners
 */
window.addEventListener("DOMContentLoaded", init);
window.addEventListener("DOMContentLoaded", Cycles.load());
window.addEventListener("DOMContentLoaded", Inventory.init());
window.addEventListener("DOMContentLoaded", MapBase.loadWeeklySet());
window.addEventListener("DOMContentLoaded", MapBase.loadFastTravels());
window.addEventListener("DOMContentLoaded", MadamNazar.loadMadamNazar());
window.addEventListener("DOMContentLoaded", Treasures.load());
window.addEventListener("DOMContentLoaded", Encounters.load());
window.addEventListener("DOMContentLoaded", MapBase.loadMarkers());
window.addEventListener("DOMContentLoaded", Routes.init());
