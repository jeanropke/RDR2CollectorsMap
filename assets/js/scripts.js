//Since Moonshiners update, R* changed how cycles works.
//Instead of 1 cycle for each collection in the day, each collection has your own cycle.
//Eg: Coins can be on cycle 1, Eggs on cycle 3, Flowers on 5... and so on
var currentCycle = 15;
var markers = [];
var searchTerms = [];
var uniqueSearchMarkers = [];
var resetMarkersDaily;

var showAllMarkers = false;

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

var treasureData = [];
var treasureMarkers = [];

var encountersMarkers = [];

var routesData = [];
var polylines;

var customRouteEnabled = false;
var customRouteConnections = [];

var toolType = '3'; //All type of tools
var availableLanguages = ['ar-ar', 'de-de', 'en-us', 'es-es', 'fr-fr', 'hu-hu', 'it-it', 'ko', 'pt-br', 'pl', 'ru', 'th-th', 'zh-s', 'zh-t'];
var lang;

var nazarLocations = [];
var nazarCurrentLocation;
var nazarCurrentDate;

var fastTravelData;

var weeklySetData = [];
var date;
var nocache = 184;

var wikiLanguage = [];

var debugTool = null;
var isDebug = false;

var inventory = [];
var tempInventory = [];

function init() {

  wikiLanguage['de-de'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/RDO-Sammler-Landkarte-Benutzerhandbuch-(Deutsch)';
  wikiLanguage['en-us'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/RDO-Collectors-Map-User-Guide-(English)';
  wikiLanguage['fr-fr'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/RDO-Collectors-Map-Guide-d\'Utilisateur-(French)';
  wikiLanguage['pt-br'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/Guia-do-Usu%C3%A1rio---Mapa-de-Colecionador-(Portuguese)';


  var tempCollectedMarkers = "";
  $.each($.cookie(), function (key, value) {
    if (key.startsWith('removed-items')) {
      tempCollectedMarkers += value;
    }
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

  if (typeof $.cookie('tools') !== 'undefined') {
    $("#tools").val($.cookie('tools'));
    toolType = $.cookie('tools');
  }

  if (typeof $.cookie('alert-closed') == 'undefined') {
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

  if (typeof $.cookie('map-layer') === 'undefined')
    $.cookie('map-layer', 'Detailed', { expires: 999 });

  if (typeof $.cookie('language') === 'undefined') {
    if (availableLanguages.includes(navigator.language.toLowerCase()))
      $.cookie('language', navigator.language.toLowerCase(), { expires: 999 });
    else
      $.cookie('language', 'en-us', { expires: 999 });
  }

  if (!availableLanguages.includes($.cookie('language')))
    $.cookie('language', 'en-us', { expires: 999 });

  if (typeof $.cookie('remove-markers-daily') === 'undefined')
    $.cookie('remove-markers-daily', 'false', { expires: 999 });

  if (typeof $.cookie('auto-refresh') === 'undefined')
    $.cookie('auto-refresh', false, { expires: 999 });

  $("#auto-refresh").val(Settings.isAutoRefreshEnabled.toString());

  resetMarkersDaily = $.cookie('remove-markers-daily') == 'true';
  $("#reset-markers").val(resetMarkersDaily.toString());

  var curDate = new Date();
  date = curDate.getUTCFullYear() + '-' + (curDate.getUTCMonth() + 1) + '-' + curDate.getUTCDate();

  lang = $.cookie('language');
  $("#language").val(lang);

  Language.setMenuLanguage();
  MapBase.init();

  setMapBackground($.cookie('map-layer'));

  //setCurrentDayCycle();
  //day = 5;
  //$('#day').val(day);
  Routes.loadRoutesData();

  //Overlay tests
  var pos = [-53.2978125, 68.7596875];
  var offset = 1.15;
  L.imageOverlay('./assets/overlays/cave_01.png', [
    [pos],
    [pos[0] + offset, pos[1] + offset]
  ]).addTo(MapBase.map);


  if (Settings.isMenuOpened)
    $('.menu-toggle').click();

  $('#show-coordinates').val(Settings.isCoordsEnabled ? '1' : '0');
  $('#marker-cluster').val(Settings.markerCluster ? '1' : '0');
  changeCursor();
}

function setMapBackground(mapName) {
  switch (mapName) {
    default:
    case 'Default':
      $('#map').css('background-color', '#d2b790');
      break;

    case 'Detailed':
      $('#map').css('background-color', '#d2b790');
      break;

    case 'Dark':
      $('#map').css('background-color', '#3d3d3d');
      break;
  }

  $.cookie('map-layer', mapName, { expires: 999 });
}

function setCurrentDayCycle(dev = null) {
  //day1: 2 4 6
  //day2: 0 3
  //day3: 1 5
  var weekDay = new Date().getUTCDay();
  switch (weekDay) {
    case 2: //tuesday
    case 4: //thursday
    case 6: //saturday
      day = 1;
      break;

    case 0: //sunday
    case 3: //wednesday
      day = 2;
      break;

    case 1: //monday
    case 5: //friday
      day = 3;
      break;
  }

  $('#day').val(day);

  //Cookie day not exists? create
  if (typeof $.cookie('date') === 'undefined') {
    $.cookie('date', date, { expires: 2 });
  }
  //if exists, remove markers if the days arent the same
  else {
    if ($.cookie('date') != date.toString()) {
      $.cookie('date', date, { expires: 2 });
      if (resetMarkersDaily) {
        $.each(markers, function (key, value) {
          if (inventory[value.text])
            inventory[value.text].isCollected = false;

          value.isCollected = false;
          value.canCollect = !value.isCollected && value.amount < 10;
        });
      }
    }
  }
}

function changeCursor() {
  if (Settings.isCoordsEnabled || customRouteEnabled)
    $('.leaflet-grab').css('cursor', 'pointer');
  else
    $('.leaflet-grab').css('cursor', 'grab');
}

var timerAlert = false;
setInterval(function () {
  var nextGMTMidnight = new Date();
  nextGMTMidnight.setUTCHours(24);
  nextGMTMidnight.setUTCMinutes(0);
  nextGMTMidnight.setUTCSeconds(0);
  var countdownDate = nextGMTMidnight - new Date();

  if (countdownDate >= (24 * 60 * 60 * 1000) - 1000) {
    if (Settings.isAutoRefreshEnabled) {
      //setCurrentDayCycle();

      if (resetMarkersDaily) {
        $.each(markers, function (key, value) {
          if (inventory[value.text])
            inventory[value.text].isCollected = false;

          value.isCollected = false;
          value.canCollect = value.amount < 10;
        });
        MapBase.save();
      }

      MapBase.addMarkers();
    }
  }


  var hours = Math.floor((countdownDate % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  var minutes = Math.floor((countdownDate % (1000 * 60 * 60)) / (1000 * 60));
  var seconds = Math.floor((countdownDate % (1000 * 60)) / 1000);

  $('#countdown').text(addZeroToNumber(hours) + ':' + addZeroToNumber(minutes) + ':' + addZeroToNumber(seconds));

  if (getVirtual(new Date()).getHours() >= 22 || getVirtual(new Date()).getHours() < 5)
    $('#day-cycle').css('background', 'url(assets/images/moon.png)');
  else
    $('#day-cycle').css('background', 'url(assets/images/sun.png)');

}, 1000);

function addZeroToNumber(number) {
  if (number < 10)
    number = '0' + number.toString();
  return number;
}

/**
 *  RDR2 Free roam timer
 *  Thanks to kanintesova
 **/
var virtualOrigin = Date.parse("2019-08-15T06:00:00Z"),
  realOrigin = Date.parse("2019-08-15T14:36:00Z"),
  factor = 30;

function getVirtual(time) {
  var now = new Date(virtualOrigin + (time - realOrigin) * factor);
  return new Date(now.getTime() + now.getTimezoneOffset() * 60000);
}

// Clock in game created by Michal__d
setInterval(function () {
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

//Change day on menu
/*$("#day").on("input", function () {
  $.cookie('ignore-days', null);

  day = parseInt($('#day').val());
  MapBase.addMarkers();

  if ($("#routes").val() == 1)
    Routes.drawLines();
});
*/

//Show all markers on map
$("#show-all-markers").on("change", function () {
  showAllMarkers = $("#show-all-markers").val() == '1';
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

//Enable & disable routes on menu
$("#routes").on("change", function () {
  if ($("#routes").val() == 0) {
    if (polylines instanceof L.Polyline) {
      MapBase.map.removeLayer(polylines);
    }
  } else {
    Routes.drawLines();
  }
});

//Change & save tool type
$("#tools").on("change", function () {
  toolType = $("#tools").val();
  $.cookie('tools', toolType, { expires: 999 });
  MapBase.addMarkers();

  if ($("#routes").val() == 1)
    Routes.drawLines();
});

//Change & save markers reset daily or manually
$("#reset-markers").on("change", function () {
  if ($("#reset-markers").val() == 'clear') {
    $.each(markers, function (key, value) {
      if (inventory[value.text])
        inventory[value.text].isCollected = false;

      value.isCollected = false;
      value.canCollect = value.amount < 10;
    });

    MapBase.save();
    Menu.refreshMenu();

    $("#reset-markers").val(resetMarkersDaily.toString());
    Menu.refreshItemsCounter();
  }

  resetMarkersDaily = $("#reset-markers").val();
  $.cookie('remove-markers-daily', resetMarkersDaily, { expires: 999 });

  MapBase.addMarkers();

});

//Clear inventory on menu
$("#clear-inventory").on("change", function () {
  if ($("#clear-inventory").val() == 'true') {
    $.each(Object.keys(inventory), function (key, value) {
      inventory[value].amount = 0;
      var marker = markers.filter(function (marker) {
        return marker.text == value && marker.day == Cycles.data.cycles[Cycles.data.current][marker.category];
      })[0];

      if (marker != null)
        marker.amount = 0;
    });

    MapBase.save();
    MapBase.addMarkers();
    Menu.refreshMenu();
  }
});

//Enable & disable custom routes on menu
$("#custom-routes").on("change", function () {
  var temp = $("#custom-routes").val();
  customRouteEnabled = temp == '1';
  if (temp == 'clear') {
    customRouteConnections = [];
    MapBase.map.removeLayer(polylines);
    customRouteEnabled = true;
    $("#custom-routes").val('1');
  }
  changeCursor();
});

//When map-alert is clicked
$('.map-alert').on('click', function () {
  $.cookie('alert-closed', 'true', { expires: 999 });
  $('.map-alert').hide();
});

//Enable & disable show coordinates on menu
$('#show-coordinates').on('change', function () {
  $.cookie('coords-enabled', $('#show-coordinates').val());
  Settings.isCoordsEnabled = $('#show-coordinates').val() == '1';

  changeCursor();
});

//Change & save language option
$("#language").on("change", function () {
  lang = $("#language").val();
  $.cookie('language', lang, { expires: 999 });
  Language.setMenuLanguage();
  MapBase.addMarkers();
  Menu.refreshMenu();
});

//Change & save auto-refresh option
$("#auto-refresh").on("change", function () {
  $.cookie('auto-refresh', $("#auto-refresh").val() == 'true', { expires: 999 });

  autoRefresh = $("#auto-refresh").val() == 'true';
});


//Disable & enable collection category
$('.menu-option.clickable').on('click', function () {
  var menu = $(this);
  menu.children('span').toggleClass('disabled');

  if (menu.children('span').hasClass('disabled')) {
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

  MapBase.addMarkers();

  if ($("#routes").val() == 1)
    Routes.drawLines();
});

//Open collection submenu
$('.open-submenu').on('click', function (e) {
  e.stopPropagation();
  $(this).parent().parent().children('.menu-hidden').toggleClass('opened');
});

//Sell collections on menu
$('.collection-sell').on('click', function (e) {
  var collectionType = $(this).parent().parent().data('type');
  var getMarkers = markers.filter(_m => _m.category == collectionType && _m.day == Cycles.data.cycles[Cycles.data.current][_m.category]);

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
$(document).on('click', '.collectible', function () {
  var collectible = $(this);

  MapBase.removeItemFromMap(collectible.data('type'), collectible.data('type'));

  if ($("#routes").val() == 1)
    Routes.drawLines();
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
  var inputValue = $('#marker-cluster').val();
  $.cookie('marker-cluster', inputValue, { expires: 999 });
  Settings.markerCluster = inputValue == '1';
  MapBase.map.removeLayer(Layers.itemMarkersLayer);
  MapBase.addMarkers();
});
//Inventory triggers
//Enable & disable inventory on menu
$('#enable-inventory').on("change", function () {
  var inputValue = $('#enable-inventory').val();
  $.cookie('inventory-enabled', inputValue, { expires: 999 });
  Inventory.isEnabled = inputValue == 'true';
  MapBase.addMarkers();
});

//Enable & disable inventory on menu
$('#inventory-stack').on("change", function () {
  var inputValue = parseInt($('#inventory-stack').val());
  inputValue = !isNaN(inputValue) ? inputValue : 10;
  $.cookie('inventory-stack', inputValue, { expires: 999 });
  Inventory.stackSize = inputValue;
});

/**
 * Path generator by Senexis
 */
$('#generate-route-ignore-collected').on("change", function () {
  var inputValue = $('#generate-route-ignore-collected').val();
  inputValue = inputValue == 'true';
  $.cookie('generator-path-ignore-collected', inputValue, { expires: 999 });
  Routes.ignoreCollected = inputValue;

  if (Routes.lastPolyline != null)
    Routes.generatePath();
});

$('#generate-route-generate-on-visit').on("change", function () {
  var inputValue = $('#generate-route-generate-on-visit').val();
  inputValue = inputValue == 'true';
  $.cookie('generator-path-generate-on-visit', inputValue, { expires: 999 });
  Routes.runOnStart = inputValue;
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
window.addEventListener("DOMContentLoaded", MapBase.loadMadamNazar());
window.addEventListener("DOMContentLoaded", Treasures.load());
window.addEventListener("DOMContentLoaded", Encounters.load());
window.addEventListener("DOMContentLoaded", MapBase.loadMarkers());
window.addEventListener("DOMContentLoaded", Routes.init());
