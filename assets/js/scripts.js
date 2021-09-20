/*
- these statements have no requirements
- code at multiple places depend on these
*/

Object.defineProperty(String.prototype, 'filename', {
  value: function (extension) {
    let s = this.replace(/\\/g, '/');
    s = s.substring(s.lastIndexOf('/') + 1);
    return extension ? s.replace(/[?#].+$/, '') : s.split('.')[0];
  }
});

// Check if an array contains another array. Used to enable random categories set (jewerly & fossils)
Object.defineProperty(Array.prototype, 'arrayContains', {
  value: function (sub) {
    const result = sub.filter(item => this.indexOf(item) > -1);
    return result.length > 0;
  }
});

jQuery.fn.firstAncestorOrSelf = function (func) {
  'use strict';
  if (this.length !== 1) throw new TypeError('Not implemented (yet?) for selection length != 1.');
  let node = this[0];
  while (node) {
    if (func(node)) return this.pushStack([node]);
    node = node.parentNode;
  }
}
jQuery.fn.propSearchUp = function (property) {
  'use strict';
  const element = this.firstAncestorOrSelf(element => element[property]);
  return element && element.prop(property);
}

let uniqueSearchMarkers = [];

const categories = [
  'arrowhead', 'bottle', 'bracelet', 'coastal', 'coin', 'cups', 'earring', 'egg',
  'fast_travel', 'flower', 'fossils_random', 'heirlooms',
  'jewelry_random', 'megafauna', 'nazar', 'necklace', 'oceanic', 'pentacles',
  'random', 'ring', 'swords', 'treasure', 'user_pins', 'wands', 'weekly', 'legendary_animals'
];

const parentCategories = {
  jewelry_random: ['bracelet', 'earring', 'necklace', 'ring'],
  fossils_random: ['coastal', 'megafauna', 'oceanic']
};

let enabledCategories = JSON.parse(localStorage.getItem("rdr2collector.enabled-categories") || localStorage.getItem("enabled-categories")) || [...categories];

/*
- Leaflet extentions require Leaflet loaded
- guaranteed by this script’s position in index.html
*/
L.DivIcon.DataMarkup = L.DivIcon.extend({
  _setIconStyles: function (img, name) {
    L.DivIcon.prototype._setIconStyles.call(this, img, name);
    if (this.options.marker)
      img.dataset.marker = this.options.marker;

    if (this.options.time) {
      const from = parseInt(this.options.time[0]);
      const to = parseInt(this.options.time[1]);

      img.dataset.time = timeRange(from, to);
    }

    if (this.options.tippy)
      img.dataset.tippy = this.options.tippy;
  }
});

// Glowing icon (legendary animals)
L.Icon.TimedData = L.Icon.extend({
  _setIconStyles: function (img, name) {
    L.Icon.prototype._setIconStyles.call(this, img, name);
    if (this.options.time && this.options.time !== []) {
      img.dataset.time = this.options.time;
    }
  },
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
  } catch (e) {
    if (getParameterByName('show-alert') == '1') {
      alert(e);
    }
    console.error(e);
  }
});

function init() {
  try {
    Sentry.init({ release: nocache, tracesSampleRate: isLocalHost() ? 1 : 0.3 });
  } catch (err) {
    console.log(`Sentry: ${err}`);
  }

  const navLang = navigator.language;
  SettingProxy.addSetting(Settings, 'language', {
    default: Language.availableLanguages.includes(navLang) ? navLang : 'en',
  });

  Settings.language = Language.availableLanguages.includes(Settings.language) ? Settings.language : 'en';

  //Convert some old settings here
  //amount and collected items are converted in mapping
  Object.keys(localStorage).forEach(key => {
    if(key.startsWith('main.')) {
      localStorage.setItem(`rdr2collector.${key.replace('main.', '')}`, localStorage.getItem(key));
      localStorage.removeItem(key);
    }
    else if(key == 'customMarkersColors') {
      localStorage.setItem(`rdr2collector.${key}`, localStorage.getItem(key));
      localStorage.removeItem(key);
    }
    else if(key.startsWith('routes.')) {
      localStorage.setItem(`rdr2collector.${key}`, localStorage.getItem(key));
      localStorage.removeItem(key);
    }
    else if(key.startsWith('inventory.')) {
      localStorage.setItem(`rdr2collector.${key}`, localStorage.getItem(key));
      localStorage.removeItem(key);
    }
    else if(key == 'enabled-categories') {
      localStorage.setItem(`rdr2collector.${key}`, localStorage.getItem(key));
      localStorage.removeItem(key);
    }
  });

  const mapping = Mapping.init();
  Menu.init();
  const lootTables = MapBase.loadLootTable();
  const itemsCollectionsWeekly = Promise.all([mapping]).then(() => Item.init()); // Item.items (without .markers), Collection.collections, Collection.weekly*
  itemsCollectionsWeekly.then(MapBase.loadOverlays);
  MapBase.mapInit(); // MapBase.map
  Language.init();
  Language.setMenuLanguage();
  Pins.init();
  changeCursor();
  // MapBase.markers (without .lMarker), Item.items[].markers
  const markers = Promise.all([itemsCollectionsWeekly, lootTables]).then(Marker.init);
  const cycles = Promise.all([itemsCollectionsWeekly, markers]).then(Cycles.load);
  Inventory.init();
  MapBase.loadFastTravels();
  const filters = MapBase.loadFilters();
  FME.init();

  const treasures = Treasure.init();
  const legendaries = Legendary.init();
  Promise.all([cycles, markers]).then(MapBase.afterLoad);
  Routes.init();
  Promise.all([itemsCollectionsWeekly, markers, cycles, treasures, legendaries, filters])
    .then(Loader.resolveMapModelLoaded);

  if (!MapBase.isPreviewMode)
    MadamNazar.loadMadamNazar();

  if (Settings.isMenuOpened) $('.menu-toggle').click();

  $('.map-alert').toggle(!Settings.alertClosed);

  $('#language').val(Settings.language);
  $('#marker-opacity').val(Settings.markerOpacity);
  $('#filter-type').val(Settings.filterType);
  $('#marker-size').val(Settings.markerSize);
  $('#reset-markers').prop("checked", Settings.resetMarkersDaily);
  $('#marker-cluster').prop("checked", Settings.isMarkerClusterEnabled);
  $('#tooltip-map').prop('checked', Settings.showTooltipsMap);
  $('#enable-marker-popups').prop("checked", Settings.isPopupsEnabled);
  $('#enable-marker-popups-hover').prop("checked", Settings.isPopupsHoverEnabled);
  $('#enable-marker-shadows').prop("checked", Settings.isShadowsEnabled);
  $('#enable-legendary-backgrounds').prop("checked", Settings.isLaBgEnabled);
  $('#legendary-animal-marker-type').val(Settings.legendarySpawnIconType);
  $('#legendary-animal-marker-size').val(Settings.legendarySpawnIconSize);
  $('#enable-dclick-zoom').prop("checked", Settings.isDoubleClickZoomEnabled);
  $('#pins-place-mode').prop("checked", Settings.isPinsPlacingEnabled);
  $('#pins-edit-mode').prop("checked", Settings.isPinsEditingEnabled);
  $('#show-help').prop("checked", Settings.showHelp);
  $('#show-coordinates').prop("checked", Settings.isCoordsOnClickEnabled);
  $('#map-boundaries').prop("checked", Settings.isMapBoundariesEnabled);
  $('#timestamps-24').prop("checked", Settings.isClock24Hour);
  $('#enable-cycles').prop("checked", Settings.isCyclesVisible);
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

  $('.input-cycle').toggleClass('hidden', !Settings.isCycleInputEnabled);
  $('.cycle-icon').toggleClass('hidden', !Settings.isCyclesVisible || Settings.isCycleInputEnabled);
  $('.cycle-display').toggleClass('hidden', !Settings.isCyclesVisible);
  $('#cycle-changer-container').toggleClass('hidden', !(Settings.isCycleChangerEnabled));

  $("#utilities-container").toggleClass('opened', Settings.showUtilitiesSettings);
  $("#customization-container").toggleClass('opened', Settings.showCustomizationSettings);
  $("#routes-container").toggleClass('opened', Settings.showRoutesSettings);
  $("#import-export-container").toggleClass('opened', Settings.showImportExportSettings);
  $("#debug-container").toggleClass('opened', Settings.showDebugSettings);

  if (!MapBase.isPreviewMode)
    Updates.init();

  updateTopWidget();

  /*
  - clockTick() relies on DOM and jquery
  - guaranteed only by this script’s position at end of index.html
  */
  setInterval(clockTick, 1000);
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
  const pElements = $('.top-widget > p');

  [].forEach.call(pElements, (element, index) => {
    $(element).toggleClass('hidden', Settings.topWidgetState !== index);
  });
}

function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
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
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function clockTick() {
  'use strict';
  const now = Cycles.mapTime();
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

  // Preview mode can remove this.
  if ($('#day-cycle').length) {
    const file = $('#day-cycle').attr('src').filename();
    if ((nightTime && file !== "moon") || (!nightTime && file !== "sun"))
      $('#day-cycle').removeClass('hidden').attr('src', `./assets/images/${nightTime ? 'moon' : 'sun'}.png`);
  }

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

  $('[data-marker*="provision_wldflwr_agarita"], [data-marker*="provision_wldflwr_blood_flower"]').css('filter', (function () {
    if (MapBase.isPreviewMode) return 'none';
    const isImportant = $(this).hasClass('highlight-items');
    const whiteGlow = 'drop-shadow(0 0 .5rem #fff) drop-shadow(0 0 .3rem #fff)';
    const redGlow = 'drop-shadow(0 0 .5rem #cc0000) drop-shadow(0 0 .4rem #cc0000';
    const pinkGlow = 'drop-shadow(0 0 .5rem #ff6fc7) drop-shadow(0 0 .3rem #ff6fc7';
    if (isImportant && nightTime)
      return pinkGlow;
    if (isImportant)
      return redGlow;
    return nightTime ? whiteGlow : 'none';
  }));

  $('.leaflet-marker-icon[data-time]').each(function () {
    let time = $(this).data('time') + '';
    if (time === null || time === '') return;
    if (time.split(',').includes(gameHour + '') && !MapBase.isPreviewMode) {
      $(this).css('filter', 'drop-shadow(0 0 .5rem #fff) drop-shadow(0 0 .25rem #fff)');
    } else {
      $(this).css('filter', 'none');
    }
  });
}

/*
- rest of file: event handler registrations (and some more functions)
- registrations require DOM ready and jquery
  - guaranteed only by this script’s position at end of index.html
- some handlers require scripts to be initialized and data loaded
  - NOT GUARANTEED
  - only hope: user does not do anything until that happens
- please move them out of here to their respective owners
*/
$('.side-menu').on('scroll', function () {
  // These are not equality checks because of mobile weirdness.
  const atTop = $(this).scrollTop() <= 0;
  const atBottom = $(this).scrollTop() + $(document).height() >= $(this).prop("scrollHeight");
  $('.scroller-line-tp').toggle(atTop);
  $('.scroller-arrow-tp').toggle(!atTop);
  $('.scroller-line-bt').toggle(atBottom);
  $('.scroller-arrow-bt').toggle(!atBottom);
});

$('.top-widget > p').on('click', function () {
  const pElements = $('.top-widget > p').length;
  Settings.topWidgetState = (Settings.topWidgetState + 1) % pElements;
  updateTopWidget();
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
$('.menu-option.clickable input').on('click', function (event) {
  event.stopPropagation();
});

$('.menu-option.clickable input').on('change', function (event) {
  const el = $(event.target);
  Cycles.categories[el.attr("name")] = parseInt(el.val());
  MapBase.addMarkers();
  Menu.refreshMenu();
});

$("#search").on("input", function () {
  MapBase.onSearch($('#search').val());
  $("#filter-type").val('none');
});

$("#copy-search-link").on("click", function () {
  setClipboardText(`http://jeanropke.github.io/RDR2CollectorsMap/?search=${$('#search').val()}`);
});

$("#clear-search").on("click", function () {
  $("#search").val('').trigger("input");
});

$("#reset-markers").on("change", function () {
  Settings.resetMarkersDaily = $("#reset-markers").prop('checked');
});

$("#clear-markers").on("click", function () {
  $.each(MapBase.markers, function (key, marker) {
    marker.isCollected = false;
  });

  Menu.refreshMenu();
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
  const mapRoute = Routes.customRouteConnections.join(',');
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

$('#show-coordinates').on('change', function () {
  Settings.isCoordsOnClickEnabled = $("#show-coordinates").prop('checked');
  changeCursor();
});

$('#map-boundaries').on('change', function () {
  Settings.isMapBoundariesEnabled = $("#map-boundaries").prop('checked');
  MapBase.map.setMaxBounds(); //Remove boundaries
  MapBase.updateMapBoundaries();
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
  Legendary.onLanguageChanged();
});

$("#marker-opacity").on("change", function () {
  Settings.markerOpacity = Number($("#marker-opacity").val());
  MapBase.addMarkers();
});

$("#marker-size").on("change", function () {
  Settings.markerSize = Number($("#marker-size").val());
  MapBase.addMarkers();
  Treasure.onSettingsChanged();
  Legendary.onSettingsChanged();
});

$('#filter-type').on('change', function () {
  Settings.filterType = $(this).val();
});

$('#filter-min-amount-items').on("change", function () {
  InventorySettings.maxAmountLowInventoryItems = $(this).val();
});

$("#enable-cycles").on("change", function () {
  Settings.isCyclesVisible = $("#enable-cycles").prop('checked');
  $('.cycle-icon').toggleClass('hidden', !Settings.isCyclesVisible || Settings.isCycleInputEnabled);
  $('.cycle-display').toggleClass('hidden', !Settings.isCyclesVisible);
  MapBase.addMarkers();
});

$("#enable-cycle-input").on("change", function () {
  Settings.isCycleInputEnabled = $("#enable-cycle-input").prop('checked');
  $('.input-cycle').toggleClass('hidden', !Settings.isCycleInputEnabled);
  $('.cycle-icon').toggleClass('hidden', !Settings.isCyclesVisible || Settings.isCycleInputEnabled);
});

// Remove item from map when using the menu
$(document).on('click', '.collectible-wrapper[data-type]', function () {
  const collectible = $(this).data('type');
  const category = $(this).parent().data('type');

  MapBase.removeItemFromMap(Cycles.categories[category], collectible, collectible, category, !InventorySettings.isMenuUpdateEnabled);
});

$('.menu-toggle').on('click', function () {
  const menu = $('.side-menu').toggleClass('menu-opened');
  Settings.isMenuOpened = menu.hasClass('menu-opened');

  $('.menu-toggle').text(Settings.isMenuOpened ? 'X' : '>');

  $('.top-widget').toggleClass('top-widget-menu-opened', Settings.isMenuOpened);
  $('#fme-container').toggleClass('fme-menu-opened', Settings.isMenuOpened);
});

$('#tooltip-map').on('change', function () {
  Settings.showTooltipsMap = $('#tooltip-map').prop('checked');
  MapBase.updateTippy('tooltip');
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
  Legendary.onSettingsChanged();
  MapBase.addMarkers();
});

$("#enable-legendary-backgrounds").on("change", function () {
  Settings.isLaBgEnabled = $("#enable-legendary-backgrounds").prop('checked');
  Legendary.onSettingsChanged();
});

$("#legendary-animal-marker-type").on("change", function () {
  Settings.legendarySpawnIconType = $("#legendary-animal-marker-type").val();
  Legendary.onSettingsChanged();
});

$("#legendary-animal-marker-size").on("change", function () {
  Settings.legendarySpawnIconSize = Number($("#legendary-animal-marker-size").val());
  Legendary.onSettingsChanged();
});

$('#enable-dclick-zoom').on("change", function () {
  Settings.isDoubleClickZoomEnabled = $("#enable-dclick-zoom").prop('checked');
  if (Settings.isDoubleClickZoomEnabled) {
    MapBase.map.doubleClickZoom.enable();
  } else {
    MapBase.map.doubleClickZoom.disable();
  }
});

$('#enable-inventory').on("change", function () {
  InventorySettings.isEnabled = $("#enable-inventory").prop('checked');

  MapBase.addMarkers();

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

$('#auto-enable-sold-items').on("change", function () {
  InventorySettings.autoEnableSoldItems = $('#auto-enable-sold-items').prop('checked');
});

$('#inventory-stack').on("change", function () {
  let inputValue = parseInt($('#inventory-stack').val());
  inputValue = !isNaN(inputValue) ? inputValue : 10;
  InventorySettings.stackSize = inputValue;
});

$('#soft-flowers-inventory-stack').on("change", function () {
  let inputValue = parseInt($('#soft-flowers-inventory-stack').val());
  inputValue = !isNaN(inputValue) ? inputValue : 10;
  InventorySettings.flowersSoftStackSize = inputValue;
});

$('#cookie-export').on("click", function () {
  try {
    let settings = localStorage;

    const exportDate = new Date().toISOUTCDateString();
    localStorage.setItem('rdr2collector.date', exportDate);

    // Remove irrelevant properties (permanently from localStorage):
    delete settings.randid;

    // Remove irrelevant properties (from COPY of localStorage, only to do not export them):
    settings = $.extend(true, {}, localStorage);

    //Now we can just export this map settings :)
    Object.keys(settings).forEach(function(key){
      if(!key.startsWith('rdr2collector.'))
        delete settings[key];
    });

    delete settings['pinned-items'];
    delete settings['rdr2collector.pinned-items'];
    delete settings['rdr2collector.routes.customRoute'];

    // Set file version
    settings.version = 2;

    const settingsJson = JSON.stringify(settings, null, 4);

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
    //Skip `rdo.` keys.
    if(!key.startsWith('rdo.'))
      localStorage.setItem(key, value);
  });

  // Do this for now, maybe look into refreshing the menu completely (from init) later.
  location.reload();
}

$('#cookie-import').on('click', function () {
  try {
    let settings = null;
    const file = $('#cookie-import-file').prop('files')[0];
    let fallback = false;

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
      const reader = new FileReader();

      reader.addEventListener('loadend', (e) => {
        const text = e.srcElement.result;

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
  let inputValue = parseInt($('#generate-route-distance').val());
  inputValue = !isNaN(inputValue) && inputValue > 0 ? inputValue : 25;
  RouteSettings.maxDistance = inputValue;
  Routes.generatePath();
});

$('#generate-route-start').on("change", function () {
  let inputValue = $('#generate-route-start').val();
  let startLat = null;
  let startLng = null;

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
  let inputValue = parseFloat($('#generate-route-start-lat').val());
  inputValue = !isNaN(inputValue) ? inputValue : -119.9063;
  RouteSettings.startMarkerLat = inputValue;
  Routes.generatePath();
});

$('#generate-route-start-lng').on("change", function () {
  let inputValue = parseFloat($('#generate-route-start-lng').val());
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
    if(key.startsWith('rdr2collector.'))
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

$('#open-remove-all-pins-modal').on('click', function () {
  $('#remove-all-pins-modal').modal();
});

$('#open-updates-modal').on('click', function () {
  Updates.showModal();
});

$('#open-import-rdo-inventory-modal').on('click', function () {
  $('#import-rdo-inventory-modal').modal();
});

function formatLootTableLevel(table, rate = 1, level = 0) {
  const result = $("<div>");

  const items = MapBase.lootTables.loot[table];
  const hasItems = !!items;

  // Max. 2 digits but no trailing.
  const formatted = Number((rate * 100).toPrecision(2));

  if (hasItems) {
    const title = $(`<span class="loot-table-title level-${level + 1}">`);
    if (level === 0) {
      title.append($(`<h4 data-text="menu.${table}">`));
    } else {
      title.append($(`<h5 data-text="menu.${table}">`));
      title.append($(`<h5 class="rate">`).text(formatted + "%"));
    }
    result.append(title);

    const wrapper = $(`<div class="loot-table-wrapper level-${level + 1}">`);
    Object.keys(items).forEach(key => {
      wrapper.append(formatLootTableLevel(key, rate * items[key], level + 1));
    });
    result.append(wrapper);
  } else {
    const item = $(`<div class="loot-table-item"><span data-text="${table}.name"></span><span class="rate">~${formatted}%</span></div>`);
    result.append(item);
  }

  return result.children();
}

$('#loot-table-modal').on('show.bs.modal', function (event) {
  // Get related loot table.
  const button = $(event.relatedTarget);
  const table = button.attr('data-loot-table');
  let wrapper = $('<div class="loot-tables-wrapper">');

  // Format loot table.
  const tables = MapBase.lootTables.categories[table];
  tables.forEach(table => {
    wrapper.append(formatLootTableLevel(table));
  });

  // Append loot table to modal.
  const translatedContent = Language.translateDom(wrapper)[0];
  $('#loot-table-modal #loot').html(translatedContent);
});


$('#open-custom-marker-color-modal').on('click', event => {
  const markerColors = ['aquagreen', 'beige', 'black', 'blue', 'brown', 'cadetblue', 'darkblue', 'darkgreen', 'darkorange', 'darkpurple', 'darkred', 'gray', 'green', 'lightblue', 'lightgray', 'lightgreen', 'lightorange', 'lightred', 'orange', 'pink', 'purple', 'red', 'white', 'yellow']
    .sort((...args) => {
      const [a, b] = args.map(color => Language.get(`map.user_pins.color.${color}`));
      return a.localeCompare(b, Settings.language, { sensitivity: 'base' });
    });
  const baseColors = { arrowhead: 'purple', bottle: 'brown', coin: 'darkorange', egg: 'white', flower: 'red', fossils_random: 'darkgreen', cups: 'blue', swords: 'blue', wands: 'blue', pentacles: 'blue', jewelry_random: 'yellow', bracelet: 'yellow', necklace: 'yellow', ring: 'yellow', earring: 'yellow', heirlooms: 'pink', random: 'lightgray', random_spot_metal: 'lightgray', random_spot_shovel: 'lightgray' };
  const randomCategories = ['random_spot_metal', 'random_spot_shovel']; // divide random spots to metal detector and shovel
  const itemCollections = Collection.collections;
  const possibleCategories = [...new Set(MapBase.markers.map(({ category }) => category))]
    // fossils categories => fossils_random, random => random_spot_metal & random_spot_shovel
    .filter(category => !['coastal', 'oceanic', 'megafauna', 'random'].includes(category));
  const categories = [
    ...possibleCategories,
    ...randomCategories,
  ].sort((...args) => {
    const [a, b] = args.map(element => {
      const index = itemCollections.map(({ category }) => category).indexOf(element);
      return index !== -1 ? index : itemCollections.length;
    });
    return a - b;
  });
  const savedColors = Object.assign(baseColors, JSON.parse(localStorage.getItem('rdr2collector.customMarkersColors') || localStorage.getItem('customMarkersColors')) || {});
  const wrapper = $('<div id="custom-markers-colors"></div>');

  categories.forEach(category => {
    const snippet = $(`
      <div class="input-container" id="${category}-custom-color" data-help="custom_marker_color">
        <label for="custom-marker-color" data-text="menu.${category}"></label>
        <select class="input-text wide-select-menu" id="${category}-custom-marker-color"></select>
      </div>`);

    markerColors.forEach(color => {
      const option = $(`<option value="${color}" data-text="map.user_pins.color.${color}"></option>`)
        .attr('selected', savedColors[category] === color);
      $('select', snippet).append(option);
    });
    wrapper.append(snippet);
  });

  const translatedContent = Language.translateDom(wrapper);
  $('#custom-marker-color-modal #custom-colors').html(translatedContent);
  $('#custom-marker-color-modal').modal('show');

  $('.input-container', wrapper).on('change', event => {
    baseColors[event.target.id.split('-')[0]] = event.target.value;
    localStorage.setItem('rdr2collector.customMarkersColors', JSON.stringify(baseColors));
    MapBase.addMarkers();
  });
});

function filterMapMarkers() {
  uniqueSearchMarkers = [];
  let filterType = () => true;
  let enableMainCategory = true;

  if (Settings.filterType === 'none') {
    if ($('#search').val())
      MapBase.onSearch($('#search').val());
    else
      uniqueSearchMarkers = MapBase.markers;

    MapBase.addMarkers();
    return;
  }
  else if (['moonshiner', 'naturalist'].includes(Settings.filterType)) {
    const roleItems = [].concat(...Object.values(MapBase.filtersData[Settings.filterType]));
    filterType = marker => roleItems.includes(marker.itemId);
  }
  else if (Settings.filterType === 'weekly') {
    const weeklyItems = Weekly.current.collectibleItems.map(item => item.itemId);
    filterType = marker => weeklyItems.includes(marker.itemId);
  }
  else if (Settings.filterType === 'important') {
    const importantItems = Item.items.filter(item => item.isImportant).map(item => item.itemId);
    filterType = marker => importantItems.includes(marker.itemId);
  }
  else if (Settings.filterType === 'static') {
    filterType = marker => !marker.legacyItemId.includes('random');
  }
  // hides only flowers not belongs to any moonshine recipe
  else if (Settings.filterType === 'hideFlowers') {
    const roleItems = [].concat(...Object.values(MapBase.filtersData['moonshiner']));
    filterType = marker => roleItems.includes(marker.itemId) || marker.category !== 'flower';
  }
  else if (Settings.filterType === 'coinsSpots') {
    filterType = marker => ['coin', 'random'].includes(marker.category) && marker.tool === 2;
  }
  else if (Settings.filterType === 'lowInventoryItems') {
    enableMainCategory = false;
    const maxAmount = InventorySettings.maxAmountLowInventoryItems;
    const lowItems = Item.items.filter(item => item.amount < maxAmount).map(item => item.itemId);
    filterType = marker => lowItems.includes(marker.itemId);
  }

  MapBase.markers
    .filter(filterType)
    .forEach(marker => {
      uniqueSearchMarkers.push(marker);
      if (!enabledCategories.includes(marker.category) && enableMainCategory) {
        enabledCategories.push(marker.category);
        $(`[data-type="${marker.category}"]`).removeClass('disabled');
      }
    });

  MapBase.addMarkers();
}

/**
  linear proportion with cut values out of range:
  value - number to convert,
  iMin - input range minimum,
  iMax - input range maximum,
  oMin - output range minimum,
  oMax - output range maximum;
**/
function linear(value, iMin, iMax, oMin, oMax) {
  const clamp = (num, min, max) => {
    return num <= min ? min : num >= max ? max : num;
  }
  return clamp((((value - iMin) / (iMax - iMin)) * (oMax - oMin) + oMin), oMin, oMax);
}

// converts number to correct 12/24 hours time:
function convertToTime(hours = '00', minutes = '00') {
  return Settings.isClock24Hour ?
    `${hours}:${minutes}` :
    `${+hours % 12 || 12}:${minutes} ${+hours >= 12 ? 'PM' : 'AM'}`;
}

// returns an Array with all hours between from...to
function timeRange(from, to) {
  const times = [];

  let hour = from;
  while (hour !== to) {
    times.push(hour);
    hour = (hour + 1) % 24;
    if (times.length >= 24) break;
  }
  return times;
}