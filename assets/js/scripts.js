var day;
var baseMap;
var markers = [];
var itemMarkersLayer = new L.LayerGroup();

var searchTerms = [];
var uniqueSearchMarkers = [];

var resetMarkersDaily;

var collectedItems = [];

var categories = [
  'american_flowers', 'antique_bottles', 'arrowhead', 'bird_eggs', 'coin', 'family_heirlooms', 'lost_bracelet',
  'lost_earrings', 'lost_necklaces', 'lost_ring', 'card_cups', 'card_pentacles', 'card_swords', 'card_wands', 'nazar',
  'fast_travel', 'treasure', 'random', 'treasure_hunter', 'tree_map', 'egg_encounter', 'grave_robber'
];

var plantsCategories = [
  'texas_bluebonnet', 'bitterweed', 'agarita', 'wild_rhubarb', 'cardinal',
  'creek_plum', 'blood_flower', 'chocolate_daisy', 'wisteria'
];
var categoriesDisabledByDefault = [
  'treasure', 'random', 'treasure_hunter', 'tree_map', 'egg_encounter', 'grave_robber'
]
var plantsDisabled = [];

var enabledCategories = categories;
var categoryButtons = document.getElementsByClassName("menu-option clickable");

var treasureData = [];
var treasureMarkers = [];
var treasuresLayer = new L.LayerGroup();

var encountersMarkers = [];
var encountersLayer = new L.LayerGroup();

var routesData = [];
var polylines;

var customRouteEnabled = false;
var customRouteConnections = [];

var showCoordinates = false;

var toolType = '3'; //All type of tools
var avaliableLanguages = ['de-de', 'es-es', 'en-us', 'fr-fr', 'it-it', 'pt-br', 'pl', 'ru', 'zh-s', 'zh-t'];
var lang;

var nazarLocations = [];
var nazarCurrentLocation;
var nazarCurrentDate;

var fastTravelData;

var weeklySet = 'bowmans_set';
var weeklySetData = [];
var date;
var nocache = 111;

var wikiLanguage = [];

var debugTool = null;
var isDebug = false;

function init() {

  wikiLanguage['de-de'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/RDO-Sammler-Landkarte-Benutzerhandbuch-(Deutsch)';
  wikiLanguage['en-us'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/RDO-Collectors-Map-User-Guide-(English)';
  wikiLanguage['fr-fr'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/RDO-Collectors-Map-Guide-d\'Utilisateur-(French)';
  wikiLanguage['pt-br'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/Guia-do-Usu%C3%A1rio---Mapa-de-Colecionador-(Portuguese)';


  var tempCollectedMarkers = "";
  $.each($.cookie(), function(key, value) {
    if (key.startsWith('removed-items')) {
      tempCollectedMarkers += value;
    }
  });
  collectedItems = tempCollectedMarkers.split(';');

  if (typeof $.cookie('tools') !== 'undefined') {
    $("#tools").val($.cookie('tools'));
    toolType = $.cookie('tools');
  }


  enabledCategories = enabledCategories.filter(function(item) {
    return categoriesDisabledByDefault.indexOf(item) === -1;
})

  if (typeof $.cookie('map-layer') === 'undefined')
    $.cookie('map-layer', 'Detailed', {
      expires: 999
    });

  if (typeof $.cookie('language') === 'undefined') {
    if (avaliableLanguages.includes(navigator.language.toLowerCase()))
      $.cookie('language', navigator.language.toLowerCase());
    else
      $.cookie('language', 'en-us');
  }

  if (!avaliableLanguages.includes($.cookie('language')))
    $.cookie('language', 'en-us');

  if (typeof $.cookie('removed-markers-daily') === 'undefined')
    $.cookie('removed-markers-daily', 'false', {
      expires: 999
    });

  resetMarkersDaily = $.cookie('removed-markers-daily') == 'true';
  $("#reset-markers").val(resetMarkersDaily.toString());

  var curDate = new Date();
  date = curDate.getUTCFullYear() + '-' + (curDate.getUTCMonth() + 1) + '-' + curDate.getUTCDate();



  collectedItems = collectedItems.filter(function(el) {
    return el != "";
  });

  lang = $.cookie('language');
  $("#language").val(lang);


  Language.setMenuLanguage();
  MapBase.init();

  setMapBackground($.cookie('map-layer'));


  setCurrentDayCycle();
  Routes.loadRoutesData();

  //Overlay tests
  var pos = [-53.2978125, 68.7596875];
  var offset = 1.15;
  L.imageOverlay('./assets/overlays/cave_01.png', [
    [pos],
    [pos[0] + offset, pos[1] + offset]
  ]).addTo(baseMap);
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

  $.cookie('map-layer', mapName, {
    expires: 999
  });
}

function setCurrentDayCycle() {
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
    $.cookie('date', date, {
      expires: 2
    });
  }
  //if exists, remove markers if the days arent the same
  else {
    if ($.cookie('date') != date.toString()) {
      $.cookie('date', date, {
        expires: 2
      });
      if (resetMarkersDaily) {
        $.each($.cookie(), function(key, value) {
          if (key.startsWith('removed-items')) {
            $.removeCookie(key)
          }
        });

        collectedItems = [];
      }
    }
  }
}

function changeCursor() {
  if (showCoordinates || customRouteEnabled)
    $('.leaflet-grab').css('cursor', 'pointer');
  else
    $('.leaflet-grab').css('cursor', 'grab');
}

$("#day").on("input", function() {
  $.cookie('ignore-days', null);

  day = parseInt($('#day').val());
  MapBase.addMarkers();

  if ($("#routes").val() == 1)
    Routes.drawLines();


});

$("#search").on("input", function() {
  searchTerms = [];
  $.each($('#search').val().split(';'), function(key, value) {
    if ($.inArray(value.trim(), searchTerms) == -1) {
      if (value.length > 0)
        searchTerms.push(value.trim());
    }
  });
  MapBase.onSearch();
});

$("#routes").on("change", function() {
  if ($("#routes").val() == 0) {
    if (polylines instanceof L.Polyline) {
      baseMap.removeLayer(polylines);
    }
  } else {
    Routes.drawLines();
  }
});

$("#tools").on("change", function() {
  toolType = $("#tools").val();
  $.cookie('tools', toolType, {
    expires: 999
  });
  MapBase.addMarkers();
  if ($("#routes").val() == 1)
    Routes.drawLines();
});

$("#reset-markers").on("change", function() {
  if ($("#reset-markers").val() == 'clear') {
    $.each($.cookie(), function(key, value) {
      if (key.startsWith('removed-items')) {
        $.removeCookie(key)
      }
    });

    collectedItems = [];
    $("#reset-markers").val(resetMarkersDaily.toString());
    Menu.refreshItemsCounter();
  }

  resetMarkersDaily = $("#reset-markers").val();
  $.cookie('removed-markers-daily', resetMarkersDaily, {
    expires: 999
  });

  MapBase.addMarkers();

  //MapBase.removeCollectedMarkers();
});

$("#custom-routes").on("change", function() {
  var temp = $("#custom-routes").val();
  customRouteEnabled = temp == '1';
  if (temp == 'clear') {
    customRouteConnections = [];
    baseMap.removeLayer(polylines);
    customRouteEnabled = true;
    $("#custom-routes").val('1');
  }

  changeCursor();


});

$('#show-coordinates').on('change', function() {
  showCoordinates = $('#show-coordinates').val() == '1';

  changeCursor();
});

$("#language").on("change", function() {
  lang = $("#language").val();
  $.cookie('language', lang, {
    expires: 999
  });
  Language.setMenuLanguage();


  MapBase.addMarkers();
  Menu.refreshMenu();
});

$('.menu-option.clickable').on('click', function() {
  var menu = $(this);
  menu.children('span').toggleClass('disabled');

  if (menu.children('span').hasClass('disabled')) {
    enabledCategories = $.grep(enabledCategories, function(value) {
      return value != menu.data('type');
    });
  } else {
    enabledCategories.push(menu.data('type'));
  }
  MapBase.addMarkers();

  if ($("#routes").val() == 1)
    Routes.drawLines();
});


$('.open-submenu').on('click', function(e) {
  e.stopPropagation();
  $(this).parent().parent().children('.menu-hidden').toggleClass('opened');
});

$(document).on('click', '.collectible', function() {
  var collectible = $(this);

  MapBase.removeItemFromMap(collectible.data('type'));

  if ($("#routes").val() == 1)
    Routes.drawLines();
});

$('.menu-toggle').on('click', function() {
  $('.side-menu').toggleClass('menu-opened');

  if ($('.side-menu').hasClass('menu-opened')) {
    $('.menu-toggle').text('X');
  } else {
    $('.menu-toggle').text('>');
  }
  $('.timer-container').toggleClass('timer-menu-opened');
  $('.counter-container').toggleClass('counter-menu-opened');

});
var timerAlert = false;
setInterval(function() {
  var nextGMTMidnight = new Date();
  nextGMTMidnight.setUTCHours(24);
  nextGMTMidnight.setUTCMinutes(0);
  nextGMTMidnight.setUTCSeconds(0);
  var countdownDate = nextGMTMidnight - new Date();

  if (countdownDate <= 10) {
    if (!timerAlert) {
      alert('Cycle is changing in 10 seconds.');
      timerAlert = true;
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

L.Icon.DataMarkup = L.Icon.extend({
  _setIconStyles: function(img, name) {
    L.Icon.prototype._setIconStyles.call(this, img, name);
    if (this.options.marker) {
      img.dataset.marker = this.options.marker;
    }
  }
});

window.addEventListener("DOMContentLoaded", init);
window.addEventListener("DOMContentLoaded", MapBase.loadWeeklySet());
window.addEventListener("DOMContentLoaded", MapBase.loadFastTravels());
window.addEventListener("DOMContentLoaded", MapBase.loadMadamNazar());
window.addEventListener("DOMContentLoaded", Treasures.load());
window.addEventListener("DOMContentLoaded", Encounters.load());
window.addEventListener("DOMContentLoaded", MapBase.loadMarkers());
