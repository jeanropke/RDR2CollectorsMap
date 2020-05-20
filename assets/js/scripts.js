/*
- these statements have no requirements
- code at multiple places depend on these
*/
Object.defineProperty(String.prototype, 'includesOneOf', {
  value: function (...elements) {
    var include = false;
    for (var str of elements) {
      if (this.includes(str)) {
        include = true;
        break;
      }
    }
    return include;
  }
});

Object.defineProperty(String.prototype, 'filename', {
  value: function (extension) {
    let s = this.replace(/\\/g, '/');
    s = s.substring(s.lastIndexOf('/') + 1);
    return extension ? s.replace(/[?#].+$/, '') : s.split('.')[0];
  }
});

var searchTerms = [];
var uniqueSearchMarkers = [];

var categories = [
  'flower', 'bottle', 'arrowhead', 'egg', 'coin', 'heirlooms', 'bracelet',
  'earring', 'necklace', 'ring', 'cups', 'pentacles', 'swords', 'wands', 'nazar',
  'fast_travel', 'treasure', 'random', 'user_pins'
];

var enabledCategories = JSON.parse(localStorage.getItem("enabled-categories"));
if (!enabledCategories) {
  const disabledCats = JSON.parse(localStorage.getItem("disabled-categories")) || ['random'];
  enabledCategories = categories.filter(item => !disabledCats.includes(item));
}

/*
- Leaflet extentions require Leaflet loaded
- guaranteed by this script’s position in index.html
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

/*
- DOM will be ready, all scripts will be loaded (all loaded via DOM script elements)
- everything in this file here will be executed
- they can depend on their order here
- unfortunately some async dependencies are not properly taken care of (yet)
*/
$(function () {
  try {
    init();
  }
  catch (e) {
    if (getParameterByName('show-alert') == '1') {
      alert(e);
    }
    console.error(e);
  }
});

function init() {
  const navLang = navigator.language;
  SettingProxy.addSetting(Settings, 'language', {
    default: Language.availableLanguages.includes(navLang) ? navLang : 'en',
  });

  Settings.language = Language.availableLanguages.includes(Settings.language) ? Settings.language : 'en';

  // Item.items (without .markers), Collection.collections, Collection.weekly*
  const itemsCollectionsWeekly = Item.init();
  itemsCollectionsWeekly.then(MapBase.loadOverlays);
  MapBase.mapInit(); // MapBase.map
  Language.init();
  Language.setMenuLanguage();
  Pins.addToMap();
  changeCursor();
  // MapBase.markers (without .lMarker), Item.items[].markers
  const markers = itemsCollectionsWeekly.then(Marker.init);
  const cycles = Promise.all([itemsCollectionsWeekly, markers]).then(Cycles.load);
  Inventory.init();
  MapBase.loadFastTravels();
  MadamNazar.loadMadamNazar();
  FME.init();
  const treasures = Treasure.init();
  Promise.all([cycles, markers]).then(MapBase.runOncePostLoad);
  Routes.init();
  // depends on MapBase, Treasure, Pins
  Promise.all([treasures, markers]).then(Menu.activateHandlers);
  Promise.all([itemsCollectionsWeekly, markers, cycles, treasures])
    .then(Loader.resolveMapModelLoaded);

  if (Settings.isMenuOpened) $('.menu-toggle').click();

  $('.map-alert').toggle(!Settings.alertClosed);

  $('#tools').val(Settings.toolType);
  $('#language').val(Settings.language);
  $('#marker-opacity').val(Settings.markerOpacity);
  $('#marker-size').val(Settings.markerSize);
  $('#reset-markers').prop("checked", Settings.resetMarkersDaily);
  $('#marker-cluster').prop("checked", Settings.isMarkerClusterEnabled);
  $('#enable-marker-popups').prop("checked", Settings.isPopupsEnabled);
  $('#enable-marker-popups-hover').prop("checked", Settings.isPopupsHoverEnabled);
  $('#enable-marker-shadows').prop("checked", Settings.isShadowsEnabled);
  $('#enable-dclick-zoom').prop("checked", Settings.isDoubleClickZoomEnabled);
  $('#pins-place-mode').prop("checked", Settings.isPinsPlacingEnabled);
  $('#pins-edit-mode').prop("checked", Settings.isPinsEditingEnabled);
  $('#show-help').prop("checked", Settings.showHelp);
  $('#show-coordinates').prop("checked", Settings.isCoordsOnClickEnabled);
  $('#timestamps-24').prop("checked", Settings.isClock24Hour);
  $('#enable-cycle-input').prop("checked", Settings.isCycleInputEnabled);
  $("#enable-right-click").prop('checked', Settings.isRightClickEnabled);
  $("#enable-debug").prop('checked', Settings.isDebugEnabled);
  $("#enable-cycle-changer").prop('checked', Settings.isCycleChangerEnabled);

  $("#show-utilities").prop('checked', Settings.showUtilitiesSettings);
  $("#show-customization").prop('checked', Settings.showCustomizationSettings);
  $("#show-routes").prop('checked', Settings.showRoutesSettings);
  $("#show-import-export").prop('checked', Settings.showImportExportSettings);
  $("#show-debug").prop('checked', Settings.showDebugSettings);

  $("#help-container").toggle(Settings.showHelp);

  $('.input-cycle').toggleClass('hidden', !(Settings.isCycleInputEnabled));
  $('.cycle-icon').toggleClass('hidden', Settings.isCycleInputEnabled);
  $('#cycle-changer-container').toggleClass('hidden', !(Settings.isCycleChangerEnabled));

  $("#utilities-container").toggleClass('opened', Settings.showUtilitiesSettings);
  $("#customization-container").toggleClass('opened', Settings.showCustomizationSettings);
  $("#routes-container").toggleClass('opened', Settings.showRoutesSettings);
  $("#import-export-container").toggleClass('opened', Settings.showImportExportSettings);
  $("#debug-container").toggleClass('opened', Settings.showDebugSettings);

  updateTopWidget();
}

function isLocalHost() {
  return location.hostname === "localhost" || location.hostname === "127.0.0.1";
}

function changeCursor() {
  if (Settings.isCoordsOnClickEnabled || RouteSettings.customRouteEnabled)
    $('.leaflet-grab').css('cursor', 'pointer');
  else {
    $('.leaflet-grab').css('cursor', 'grab');
    $('.lat-lng-container').css('display', 'none');
  }
}

function updateTopWidget() {
  $('#countdown').toggleClass('hidden', Settings.topWidgetState !== 0);
  $('#time-in-game').toggleClass('hidden', Settings.topWidgetState !== 1);
  $('#item-counter').toggleClass('hidden', Settings.topWidgetState !== 2);
  $('#item-counter-percentage').toggleClass('hidden', Settings.topWidgetState !== 3);
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

function setClipboardText(text) {
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

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
  'use strict';
  const now = new Date();
  const gameTime = new Date(now * 30);
  const gameHour = gameTime.getUTCHours();
  const nightTime = gameHour >= 22 || gameHour < 5;
  const clockFormat = {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: Settings.isClock24Hour ? 'h23' : 'h12',
  };

  $('#time-in-game').text(gameTime.toLocaleString(Settings.language, clockFormat));

  const file = $('#day-cycle').attr('src').filename();
  if ((nightTime && file !== "moon") || (!nightTime && file !== "sun"))
    $('#day-cycle').removeClass('hidden').attr('src', `./assets/images/${nightTime ? 'moon' : 'sun'}.png`);

  const cycleResetTime = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const delta = new Date(cycleResetTime - now);
  const deltaFormat = {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  };

  $('#countdown').text(delta.toLocaleString([], deltaFormat));

  $('[data-marker*="flower_agarita"], [data-marker*="flower_blood"]').css('filter',
    nightTime ? 'drop-shadow(0 0 .5rem #fff) drop-shadow(0 0 .25rem #fff)' : 'none');
}

/*
- clockTick() relies on DOM and jquery
- guaranteed only by this script’s position at end of index.html
*/
setInterval(clockTick, 1000);

/*
- rest of file: event handler registrations (and some more functions)
- registrations require DOM ready and jquery
  - guaranteed only by this script’s position at end of index.html
- some handlers require scripts to be initialized and data loaded
  - NOT GUARANTEED
  - only hope: user does not do anything until that happens
- please move them out of here to their respective owners
*/
$('.top-widget > p').on('click', function () {
  $('.top-widget > p').toggleClass('hidden');

  Settings.topWidgetState++;
  Settings.topWidgetState %= 4;
  updateTopWidget();
});

$('.update-warning').on('click', function () {
  $(this).hide();
});

$("#show-all-markers").on("change", function () {
  MapBase.showAllMarkers = $("#show-all-markers").prop('checked');
  MapBase.addMarkers();
});

$('#enable-right-click').on("change", function () {
  Settings.isRightClickEnabled = $("#enable-right-click").prop('checked');
});

$("#show-utilities").on("change", function () {
  Settings.showUtilitiesSettings = $("#show-utilities").prop('checked');
  $("#utilities-container").toggleClass('opened', Settings.showUtilitiesSettings);
});

$("#show-customization").on("change", function () {
  Settings.showCustomizationSettings = $("#show-customization").prop('checked');
  $("#customization-container").toggleClass('opened', Settings.showCustomizationSettings);
});

$("#show-routes").on("change", function () {
  Settings.showRoutesSettings = $("#show-routes").prop('checked');
  $("#routes-container").toggleClass('opened', Settings.showRoutesSettings);
});

$("#show-import-export").on("change", function () {
  Settings.showImportExportSettings = $("#show-import-export").prop('checked');
  $("#import-export-container").toggleClass('opened', Settings.showImportExportSettings);
});

$("#show-debug").on("change", function () {
  Settings.showDebugSettings = $("#show-debug").prop('checked');
  $("#debug-container").toggleClass('opened', Settings.showDebugSettings);
});

$('#enable-debug').on("change", function () {
  Settings.isDebugEnabled = $("#enable-debug").prop('checked');
});

$('#enable-cycle-changer').on("change", function () {
  Settings.isCycleChangerEnabled = $("#enable-cycle-changer").prop('checked');
  $('#cycle-changer-container').toggleClass('hidden', !Settings.isCycleChangerEnabled);
  if (!Settings.isCycleChangerEnabled) {
    Cycles.resetCycle();
  }
});

// “random” category still needs this (other collectibles have handlers in their class)
$('.menu-option.clickable input').on('click', function (e) {
  e.stopPropagation();
});
$('.menu-option.clickable input').on('change', function (e) {
  var el = $(e.target);
  Cycles.categories[el.attr("name")] = parseInt(el.val());
  MapBase.addMarkers();
  Menu.refreshMenu();
});

$("#search").on("input", function () {
  MapBase.onSearch($('#search').val());
});

$("#copy-search-link").on("click", function () {
  setClipboardText(`http://jeanropke.github.io/RDR2CollectorsMap/?search=${$('#search').val()}`);
});

$("#clear-search").on("click", function () {
  $("#search").val('').trigger("input");
});

$("#tools").on("change", function () {
  Settings.toolType = Number($("#tools").val());
  MapBase.addMarkers();
});

$("#reset-markers").on("change", function () {
  Settings.resetMarkersDaily = $("#reset-markers").prop('checked');
});

$("#clear-markers").on("click", function () {
  $.each(MapBase.markers, function (key, marker) {
    marker.isCollected = false;
  });

  Menu.refreshMenu();
  Menu.refreshItemsCounter();
  MapBase.addMarkers();
});

$("#clear-inventory").on("click", function () {
  Item.items.forEach(item => item.amount = 0);
  Inventory.updateItemHighlights();
  Menu.refreshMenu();
  MapBase.addMarkers();
});

$("#custom-routes").on("change", function () {
  RouteSettings.customRouteEnabled = $("#custom-routes").prop('checked');
  changeCursor();
  var mapRoute = Routes.customRouteConnections.join(',');
  RouteSettings.customRoute = mapRoute;
});

$("#clear-custom-routes").on("click", Routes.clearCustomRoutes);

$('.map-alert').on('click', function () {
  Settings.alertClosed = true;
  $('.map-alert').addClass('hidden');
});

$('.map-cycle-alert').on('click', function () {
  $('.map-cycle-alert').addClass('hidden');
});

$('.filter-alert').on('click', function () {
  $('.filter-alert').addClass('hidden');
});

$('#show-coordinates').on('change', function () {
  Settings.isCoordsOnClickEnabled = $("#show-coordinates").prop('checked');
  changeCursor();
});

$('#timestamps-24').on('change', function () {
  Settings.isClock24Hour = $("#timestamps-24").prop('checked');
  clockTick();
});

$("#language").on("change", function () {
  Settings.language = $("#language").val();
  Language.setMenuLanguage();
  Menu.refreshMenu();
  Cycles.setLocaleDate();
  MapBase.addMarkers();
  Treasure.onLanguageChanged();
});

$("#marker-opacity").on("change", function () {
  Settings.markerOpacity = Number($("#marker-opacity").val());
  MapBase.addMarkers();
});

$("#marker-size").on("change", function () {
  Settings.markerSize = Number($("#marker-size").val());
  MapBase.addMarkers();
  Treasure.onSettingsChanged();
});

$("#enable-cycle-input").on("change", function () {
  Settings.isCycleInputEnabled = $("#enable-cycle-input").prop('checked');
  $('.input-cycle').toggleClass('hidden', !(Settings.isCycleInputEnabled));
  $('.cycle-icon').toggleClass('hidden', Settings.isCycleInputEnabled);
});

// Remove item from map when using the menu
$(document).on('click', '.collectible-wrapper[data-type]', function () {
  var collectible = $(this).data('type');
  var category = $(this).parent().data('type');

  MapBase.removeItemFromMap(Cycles.categories[category], collectible, collectible, category, true);
});

$('.menu-toggle').on('click', function () {
  const menu = $('.side-menu').toggleClass('menu-opened');
  Settings.isMenuOpened = menu.hasClass('menu-opened');

  $('.menu-toggle').text(Settings.isMenuOpened ? 'X' : '>');

  $('.top-widget').toggleClass('top-widget-menu-opened', Settings.isMenuOpened);
  $('#fme-container').toggleClass('fme-menu-opened', Settings.isMenuOpened);
});

$('#marker-cluster').on("change", function () {
  Settings.isMarkerClusterEnabled = $("#marker-cluster").prop('checked');
  MapBase.addMarkers();
});

$('#enable-marker-popups').on("change", function () {
  Settings.isPopupsEnabled = $("#enable-marker-popups").prop('checked');
  MapBase.addMarkers();
});

$('#enable-marker-popups-hover').on("change", function () {
  Settings.isPopupsHoverEnabled = $("#enable-marker-popups-hover").prop('checked');
});

$('#enable-marker-shadows').on("change", function () {
  Settings.isShadowsEnabled = $("#enable-marker-shadows").prop('checked');
  Treasure.onSettingsChanged();
  MapBase.addMarkers();
});

$('#enable-dclick-zoom').on("change", function () {
  Settings.isDoubleClickZoomEnabled = $("#enable-dclick-zoom").prop('checked');
  if (Settings.isDoubleClickZoomEnabled) {
    MapBase.map.doubleClickZoom.enable();
  } else {
    MapBase.map.doubleClickZoom.disable();
  }
});

$('#pins-place-mode').on("change", function () {
  Settings.isPinsPlacingEnabled = $("#pins-place-mode").prop('checked');
});

$('#pins-edit-mode').on("change", function () {
  Settings.isPinsEditingEnabled = $("#pins-edit-mode").prop('checked');
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

$('#enable-inventory').on("change", function () {
  InventorySettings.isEnabled = $("#enable-inventory").prop('checked');

  MapBase.addMarkers();
  Menu.refreshTotalInventoryValue();

  $('#inventory-container').toggleClass("opened", InventorySettings.isEnabled);
});

$('#enable-inventory-popups').on("change", function () {
  InventorySettings.isPopupsEnabled = $("#enable-inventory-popups").prop('checked');

  MapBase.addMarkers();
});

$('#reset-inventory-daily').on("change", function () {
  InventorySettings.resetInventoryDaily = $("#reset-inventory-daily").prop('checked');
});

$('#enable-additional-inventory-options').on("change", function () {
  InventorySettings.enableAdvancedInventoryOptions = $("#enable-additional-inventory-options").prop('checked');
});

$('#highlight_low_amount_items').on("change", function () {
  InventorySettings.highlightLowAmountItems = $('#highlight_low_amount_items').prop("checked");

  MapBase.addMarkers();
});

$('#enable-inventory-menu-update').on("change", function () {
  InventorySettings.isMenuUpdateEnabled = $("#enable-inventory-menu-update").prop('checked');
});

$('#reset-collection-updates-inventory').on("change", function () {
  InventorySettings.resetButtonUpdatesInventory = $('#reset-collection-updates-inventory').prop('checked');
});

$('#auto-enable-sold-items').on("change", function () {
  InventorySettings.autoEnableSoldItems = $('#auto-enable-sold-items').prop('checked');
});

$('#inventory-stack').on("change", function () {
  var inputValue = parseInt($('#inventory-stack').val());
  inputValue = !isNaN(inputValue) ? inputValue : 10;
  InventorySettings.stackSize = inputValue;
});

$('#soft-flowers-inventory-stack').on("change", function () {
  var inputValue = parseInt($('#soft-flowers-inventory-stack').val());
  inputValue = !isNaN(inputValue) ? inputValue : 10;
  InventorySettings.flowersSoftStackSize = inputValue;
});

$('#cookie-export').on("click", function () {
  try {
    var settings = localStorage;

    // Remove irrelevant properties (permanently from localStorage):
    delete settings.randid;
    delete settings['inventory'];

    // Remove irrelevant properties (from COPY of localStorage, only to do not export them):
    settings = $.extend(true, {}, localStorage);
    delete settings['pinned-items'];
    delete settings['routes.customRoute'];

    // Set file version
    settings.version = 2;

    var settingsJson = JSON.stringify(settings, null, 4);
    var exportDate = new Date().toISOUTCDateString();

    downloadAsFile(`collectible-map-settings-(${exportDate}).json`, settingsJson);
  } catch (error) {
    console.error(error);
    alert(Language.get('alerts.feature_not_supported'));
  }
});

function setSettings(settings) {
  // Sorry, old settings! :-(
  if (settings.version === undefined) {
    location.reload();
    return;
  }

  delete settings.version;

  $.each(settings, function (key, value) {
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

    $.each(localStorage, function (key, value) {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error(error);
    alert(Language.get('alerts.feature_not_supported'));
  }
});

$('#generate-route-generate-on-visit').on("change", function () {
  RouteSettings.runOnStart = $("#generate-route-generate-on-visit").prop('checked');
});

$('#generate-route-ignore-collected').on("change", function () {
  RouteSettings.ignoreCollected = $("#generate-route-ignore-collected").prop('checked');
  Routes.generatePath();
});

$('#generate-route-important-only').on("change", function () {
  RouteSettings.importantOnly = $("#generate-route-important-only").prop('checked');
  Routes.generatePath();
});

$('#generate-route-auto-update').on("change", function () {
  RouteSettings.autoUpdatePath = $("#generate-route-auto-update").prop('checked');
});

$('#generate-route-distance').on("change", function () {
  var inputValue = parseInt($('#generate-route-distance').val());
  inputValue = !isNaN(inputValue) && inputValue > 0 ? inputValue : 25;
  RouteSettings.maxDistance = inputValue;
  Routes.generatePath();
});

$('#generate-route-start').on("change", function () {
  var inputValue = $('#generate-route-start').val();
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

  RouteSettings.genPathStart = inputValue;
  RouteSettings.startMarkerLat = startLat;
  RouteSettings.startMarkerLng = startLng;

  Routes.generatePath();
});

$('#generate-route-start-lat').on("change", function () {
  var inputValue = parseFloat($('#generate-route-start-lat').val());
  inputValue = !isNaN(inputValue) ? inputValue : -119.9063;
  RouteSettings.startMarkerLat = inputValue;
  Routes.generatePath();
});

$('#generate-route-start-lng').on("change", function () {
  var inputValue = parseFloat($('#generate-route-start-lng').val());
  inputValue = !isNaN(inputValue) ? inputValue : 8.0313;
  RouteSettings.startMarkerLng = inputValue;
  Routes.generatePath();
});

$('#generate-route-use-pathfinder').on("change", function () {
  RouteSettings.usePathfinder = $("#generate-route-use-pathfinder").prop('checked');

  // Hide incompatible options.
  if (RouteSettings.usePathfinder) {
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
  RouteSettings.fasttravelWeight = parseFloat($("#generate-route-fasttravel-weight").val());
  Routes.generatePath();
});

$('#generate-route-railroad-weight').on("change", function () {
  RouteSettings.railroadWeight = parseFloat($("#generate-route-railroad-weight").val());
  Routes.generatePath();
});

$('#show-help').on("change", function () {
  Settings.showHelp = $("#show-help").prop('checked');
  $("#help-container").toggle(Settings.showHelp);
});

$(document).on('contextmenu', function (e) {
  if (!Settings.isRightClickEnabled) e.preventDefault();
});

$('#delete-all-settings').on('click', function () {
  $.each(localStorage, function (key) {
    localStorage.removeItem(key);
  });

  location.reload(true);
});

/*
Reload convenience shortcut requested by @Adam Norton#6811.
Map’s tile area is reduced to a smaller area after lock-unlock cycle on iOS
if opened via iOS homescreen bookmarks. (Which has no reload button.)
*/
$('#reload-map').on('click', function () {
  location.reload(true);
});

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