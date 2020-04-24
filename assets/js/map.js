/**
 * Created by Jean on 2019-10-09.
 */

var fastTravelData;

var MapBase = {
  minZoom: 2,
  maxZoom: 7,
  map: null,
  overlays: [],
  // see building interiors in overlays; might not be rotated right
  // (you also have to load overlays_beta.json instead of overlays.json in loader.js)
  interiors: false,
  importantItems: [],
  isDarkMode: false,
  updateLoopAvailable: true,
  requestLoopCancel: false,
  showAllMarkers: false,

  mapInit: function () {
    'use strict';

    const mapBoundary = L.latLngBounds(L.latLng(-144, 0), L.latLng(0, 176));
    //Please, do not use the GitHub map tiles. Thanks
    const mapLayers = {
      'map.layers.default':
        L.tileLayer('https://s.rsg.sc/sc/images/games/RDR2/map/game/{z}/{x}/{y}.jpg', {
          noWrap: true,
          bounds: mapBoundary,
          attribution: '<a href="https://www.rockstargames.com/" target="_blank">Rockstar Games</a>'
        }),
      'map.layers.detailed':
        L.tileLayer((isLocalHost() ? '' : 'https://jeanropke.b-cdn.net/') + 'assets/maps/detailed/{z}/{x}_{y}.jpg', {
          noWrap: true,
          bounds: mapBoundary,
          attribution: '<a href="https://rdr2map.com/" target="_blank">RDR2Map</a>'
        }),
      'map.layers.dark':
        L.tileLayer((isLocalHost() ? '' : 'https://jeanropke.b-cdn.net/') + 'assets/maps/darkmode/{z}/{x}_{y}.jpg', {
          noWrap: true,
          bounds: mapBoundary,
          attribution: '<a href="https://github.com/TDLCTV" target="_blank">TDLCTV</a>'
        }),
    };

    // Override bindPopup to include mouseover and mouseout logic.
    L.Layer.include({
      bindPopup: function (content, options) {
        // TODO: Check if we can move this from here.
        if (content instanceof L.Popup) {
          L.Util.setOptions(content, options);
          this._popup = content;
          content._source = this;
        } else {
          if (!this._popup || options) {
            this._popup = new L.Popup(options, this);
          }
          this._popup.setContent(content);
        }

        if (!this._popupHandlersAdded) {
          this.on({
            click: this._openPopup,
            keypress: this._onKeyPress,
            remove: this.closePopup,
            move: this._movePopup
          });
          this._popupHandlersAdded = true;
        }

        this.on('mouseover', function (e) {
          if (!Settings.isPopupsHoverEnabled) return;
          this.openPopup();
        });

        this.on('mouseout', function (e) {
          if (!Settings.isPopupsHoverEnabled) return;

          var that = this;
          var timeout = setTimeout(function () {
            that.closePopup();
          }, 100);

          $('.leaflet-popup').on('mouseover', function (e) {
            clearTimeout(timeout);
            $('.leaflet-popup').off('mouseover');
          });
        });

        return this;
      }
    });

    MapBase.map = L.map('map', {
      preferCanvas: true,
      attributionControl: false,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
      zoomControl: false,
      crs: L.CRS.Simple,
      layers: [mapLayers[Settings.baseLayer]],
    }).setView([-70, 111.75], 3);

    MapBase.map.addControl(
      L.control.attribution({
        position: 'bottomleft',
        prefix: '<span data-text="map.attribution_prefix">Tiles provided by</span>'
      })
    );

    L.control.zoom({
      position: 'bottomright'
    }).addTo(MapBase.map);

    L.control.layers(mapLayers).addTo(MapBase.map);

    // Leaflet leaves the layer names here, with a space in front of them.
    $('.leaflet-control-layers-list span').each(function (index, node) {
      // Move the layer name (which is chosen to be our language key) into a
      // new tightly fitted span for use with our localization.
      const langKey = node.textContent.trim();
      $(node).html([' ', $('<span>').attr('data-text', langKey).text(langKey)]);
    });

    MapBase.map.on('baselayerchange', function (e) {
      Settings.baseLayer = e.name;
      MapBase.setMapBackground();
    });

    $('#overlay-opacity').val(Settings.overlayOpacity);
    $("#overlay-opacity").on("change", function () {
      Settings.overlayOpacity = Number($("#overlay-opacity").val());
      MapBase.setOverlays();
    });

    MapBase.map.on('click', function (e) {
      MapBase.addCoordsOnMap(e);
    });

    MapBase.map.doubleClickZoom[Settings.isDoubleClickZoomEnabled ? 'enable' : 'disable']();

    var southWest = L.latLng(-160, -120),
      northEast = L.latLng(25, 250),
      bounds = L.latLngBounds(southWest, northEast);
    MapBase.map.setMaxBounds(bounds);

    Layers.oms = new OverlappingMarkerSpiderfier(MapBase.map, { keepSpiderfied: true });
    Layers.oms.addListener('spiderfy', function (markers) {
      MapBase.map.closePopup();
    });
  },

  loadOverlays: function () {
    return Loader.promises['overlays'].consumeJson(data => {
      MapBase.overlays = data;
      MapBase.setMapBackground();
      console.info('%c[Overlays] Loaded!', 'color: #bada55; background: #242424');
    });
  },

  setMapBackground: function () {
    'use strict';
    MapBase.isDarkMode = Settings.baseLayer === 'map.layers.dark' ? true : false;
    $('#map').css('background-color', MapBase.isDarkMode ? '#3d3d3d' : '#d2b790');
    MapBase.setOverlays();
    Inventory.updateItemHighlights();
  },

  setOverlays: function () {
    'use strict';
    Layers.overlaysLayer.clearLayers();

    if (Settings.overlayOpacity === 0) return;

    let subDir = MapBase.isDarkMode ? 'dark' : 'normal';
    if (MapBase.interiors) {
      subDir += '/game';
    }
    const addOverlay = function (key, value) {
      const file = MapBase.interiors ? value.name : key;
      const overlay = `assets/overlays/${subDir}/${file}.png?nocache=${nocache}`;
      let bounds = value;
      if (MapBase.interiors) {
        const scale = 0.00076;
        const x = (value.width / 2) * scale;
        const y = (value.height / 2) * scale;
        bounds = [
          [(value.lat + y), (value.lng - x)],
          [(value.lat - y), (value.lng + x)]
        ];
      }
      Layers.overlaysLayer.addLayer(L.imageOverlay(overlay, bounds, {
        opacity: Settings.overlayOpacity
      }));
    };

    $.each(MapBase.overlays, addOverlay);
    Layers.overlaysLayer.addTo(MapBase.map);
  },

  loadMarkers: function () {
    'use strict';
    MapBase.markers = [];
    return Loader.promises['items'].consumeJson(data => {
      $.each(data, (category, allCycles) => {
        $.each(allCycles, (cycleName, markers) => {
          markers.forEach(marker => MapBase.markers.push(new Marker(marker, cycleName, category)));
        });
      });
    });
  },

  runOncePostLoad: function () {
    'use strict';
    uniqueSearchMarkers = MapBase.markers;

    // Reset markers daily.
    var date = new Date().toISOUTCDateString();

    if (localStorage.getItem('main.date') === null || date != localStorage.getItem('main.date')) {
      MapBase.markers.forEach(marker => {
        if (Settings.resetMarkersDaily || marker.category === 'random') {
          marker.isCollected = false;
        }
        if (InventorySettings.resetInventoryDaily && marker.category !== 'random') {
          marker.item.amount = 0;
        }
      });
      Inventory.updateItemHighlights();
      Menu.refreshMenu();
    }

    localStorage.setItem('main.date', date);

    MapBase.addMarkers(true);

    // Do search via URL.
    const searchParam = getParameterByName('search');
    if (searchParam) {
      $('#search').val(searchParam);
      MapBase.onSearch(searchParam);
    }

    // Navigate to marker via URL.
    const markerParam = getParameterByName('m');
    if (markerParam) {
      const goTo = MapBase.markers.find(_m => _m.text === markerParam && _m.isCurrent);
      if (!goTo) return;
      MapBase.map.setView([goTo.lat, goTo.lng], 6);

      //check if marker category is enabled, if not, enable it
      if (!Layers.itemMarkersLayer.getLayerById(goTo.text)) {
        enabledCategories.push(goTo.category);
        MapBase.addMarkers();
        $(`[data-type="${goTo.category}"]`).removeClass('disabled');
      }

      Layers.itemMarkersLayer.getLayerById(goTo.text).openPopup();
    }
  },

  onSearch: function (searchString) {

    Menu.hasSearchFilters = !!searchString;

    Menu.updateHasFilters();

    searchTerms = [];
    $.each(searchString.split(';'), function (key, value) {
      if ($.inArray(value.trim(), searchTerms) == -1) {
        if (value.length > 0)
          searchTerms.push(value.trim());
      }
    });

    if (searchTerms.length == 0) {
      uniqueSearchMarkers = MapBase.markers;
    } else {
      Layers.itemMarkersLayer.clearLayers();
      var searchMarkers = [];
      uniqueSearchMarkers = [];
      $.each(searchTerms, function (id, term) {

        searchMarkers = searchMarkers.concat(MapBase.markers.filter(_marker =>
          Language.get(_marker.itemTranslationKey).toLowerCase().includes(term.toLowerCase()) ||
          _marker.itemNumberStr === term
        ));

        $.each(searchMarkers, function (i, el) {
          if ($.inArray(el, uniqueSearchMarkers) === -1) uniqueSearchMarkers.push(el);
        });
      });

    }

    MapBase.addMarkers();
  },

  addMarkers: function (refreshMenu = false) {
    if (!MapBase.updateLoopAvailable) {
      MapBase.requestLoopCancel = true;
      setTimeout(() => {
        MapBase.addMarkers(refreshMenu);
      }, 0);
      return;
    }

    Menu.hasToolFilters = Settings.toolType !== 3 ? true : false;

    Menu.updateHasFilters();

    if (Layers.itemMarkersLayer != null)
      Layers.itemMarkersLayer.clearLayers();

    MapBase.updateLoopAvailable = false;
    MapBase.yieldingLoop(
      MapBase.markers.length,
      25,
      function (i) {
        if (MapBase.requestLoopCancel) return;

        MapBase.addMarkerOnMap(MapBase.markers[i], Settings.markerOpacity);
      },
      function () {
        MapBase.updateLoopAvailable = true;
        MapBase.requestLoopCancel = false;
        Menu.refreshItemsCounter();
        MapBase.loadImportantItems();
        Inventory.updateItemHighlights();
        Routes.getCustomRoute();
      }
    );

    Layers.itemMarkersLayer.addTo(MapBase.map);
    Layers.pinsLayer.addTo(MapBase.map);

    MapBase.addFastTravelMarker();

    MadamNazar.addMadamNazar();

    if (refreshMenu) {
      Menu.refreshMenu();
    }
    else {
      Routes.generatePath();
      return;
    }

    if (RouteSettings.generateOnVisit)
      Routes.generatePath(true);
  },

  removeItemFromMap: function (day, text, subdata, category, skipInventory = false) {
    var markers = MapBase.markers.filter(function (marker) {
      return marker.day == day && (marker.text == text || marker.subdata == subdata);
    });

    if (markers == null) return;

    var subdataCategoryIsDisabled =
      (text == subdata && !$(`[data-type=${subdata}]`).hasClass('disabled'));

    $.each(markers, function (key, marker) {
      if (text != subdata && marker.text != text) return;

      var changeAmount = 0;

      if (marker.isCurrent) {
        if ((marker.subdata == subdata && subdataCategoryIsDisabled) || marker.canCollect) {
          marker.isCollected = true;
          changeAmount = 1;
        } else {
          marker.isCollected = false;
          changeAmount = -1;
        }
      }

      Inventory.changeMarkerAmount(marker.legacyItemId, changeAmount, skipInventory);

      if (!InventorySettings.isEnabled) {
        if (marker.isCollected && marker.isCurrent) {
          $(`[data-marker=${marker.text}]`).css('opacity', Settings.markerOpacity / 3);
          $(`[data-type=${marker.legacyItemId}]`).addClass('disabled');
        } else {
          $(`[data-marker=${marker.text}]`).css('opacity', Settings.markerOpacity);
          $(`[data-type=${marker.legacyItemId}]`).removeClass('disabled');
        }
        if (marker.isCurrent && ['egg', 'flower'].includes(marker.category)) {
          $(`[data-type=${marker.legacyItemId}]`).toggleClass('disabled',
            markers.every(m => !m.canCollect));
        }
      }

      try {
        if (PathFinder !== undefined) {
          PathFinder.wasRemovedFromMap(marker);
        }
      } catch (error) {
        alert(Language.get('alerts.feature_not_supported'));
        console.error(error);
      }
    });

    if (RouteSettings.ignoreCollected)
      Routes.generatePath();

    Menu.refreshItemsCounter();
  },

  getIconColor: function (marker) {
    if (marker.isWeekly) {
      return "green";
    }

    if (InventorySettings.isEnabled && InventorySettings.highlightLowAmountItems &&
      (InventorySettings.highlightStyle === Inventory.highlightStyles.STATIC_RECOMMENDED || InventorySettings.highlightStyle === Inventory.highlightStyles.ANIMATED_RECOMMENDED)) {
      return MapBase.isDarkMode ? "darkblue" : "orange";
    }

    if (Settings.markerCustomColor === 1) {
      return MapBase.getCategoryIconColor(marker.category);
    }

    var dailyColor = Settings.markerCustomColor === 0 || Settings.markerCustomColor === 1 ? marker.day : Settings.markerCustomColor - 1;
    return MapBase.getDailyIconColor(dailyColor);
  },

  getContourColor: function (baseColor) {
    var contourColors = {
      beige: "darkblue",
      black: "white",
      blue: "orange",
      cadetblue: "lightred",
      darkblue: "red",
      darkgreen: "purple",
      darkpurple: "green",
      darkred: "blue",
      green: "pink",
      lightred: "cadetblue",
      orange: "lightblue",
      purple: "lightgreen",
      white: "gray"
    };

    if (InventorySettings.highlightLowAmountItems &&
      (InventorySettings.highlightStyle === Inventory.highlightStyles.STATIC_RECOMMENDED ||
        InventorySettings.highlightStyle === Inventory.highlightStyles.ANIMATED_RECOMMENDED)) {
      return MapBase.isDarkMode ? "orange" : "darkblue";
    }

    return contourColors[baseColor] || "darkblue";
  },

  getDailyIconColor: function (day) {
    // Array order defines correspondence to week days (0-5 and default "lightred")
    var dailyColors = ["blue", "orange", "purple", "darkpurple", "darkred", "darkblue"];
    return dailyColors[day - 1] || "lightred";
  },

  getCategoryIconColor: function (markerCategory) {
    // object with category colors for fast lookup
    var categoryColors = {
      flower: "darkred",
      cups: "blue",
      swords: "blue",
      wands: "blue",
      pentacles: "blue",
      bracelet: "beige",
      necklace: "orange",
      ring: "orange",
      earring: "orange",
      bottle: "cadetblue",
      egg: "white",
      arrowhead: "darkpurple",
      heirlooms: "purple",
      coin: "lightred"
    };
    return categoryColors[markerCategory] || "lightred";
  },

  getToolName: function (type) {
    switch (type) {
      default:
      case '0':
        return 'random';
      case '1':
        return 'shovel';
      case '2':
        return 'magnet';
    }
  },

  addMarkerOnMap: function (marker, opacity = 1) {
    if (!marker.isVisible) return;

    var toolType = Settings.toolType;
    var markerTool = parseInt(marker.tool);
    if (toolType >= 0) {
      if (toolType < markerTool) return;
    } else {
      if (toolType == -1 && markerTool != 1) return;
      if (toolType == -2 && markerTool != 2) return;
    }

    var overlay = '';

    var markerBackgroundColor = MapBase.getIconColor(marker);
    var icon = `./assets/images/icons/${marker.category}.png?v=${nocache}`;
    var background = `./assets/images/icons/marker_${markerBackgroundColor}.png?v=${nocache}`;
    var markerContourColor = MapBase.getContourColor(markerBackgroundColor);
    var markerContour = `./assets/images/icons/contours/contour_marker_${markerContourColor}.png?v=${nocache}`;
    var shadow = Settings.isShadowsEnabled ? '<img class="shadow" width="' + 35 * Settings.markerSize + '" height="' + 16 * Settings.markerSize + '" src="./assets/images/markers-shadow.png" alt="Shadow">' : '';

    // Random items override
    if (marker.category === 'random') {
      var color = (Settings.markerCustomColor === 1 ? (marker.tool == 2 ? "black" : "lightgray") : "lightgray");
      icon = `./assets/images/icons/${MapBase.getToolName(marker.tool)}.png`;
      background = `./assets/images/icons/marker_${color}.png`;
    }

    // highlight unknown cycles markers on red
    if (marker.day == Cycles.unknownCycleNumber)
      background = './assets/images/icons/marker_red.png';

    // Height overlays
    if (marker.height == '1') {
      overlay = '<img class="overlay" src="./assets/images/icons/overlay_high.png" alt="Overlay">';
    }

    if (marker.height == '-1') {
      overlay = '<img class="overlay" src="./assets/images/icons/overlay_low.png" alt="Overlay">';
    }

    // Timed flower overlay override
    if (['flower_agarita', 'flower_blood_flower'].includes(marker.itemId)) {
      overlay = '<img class="overlay" src="./assets/images/icons/overlay_time.png" alt="Overlay">';
    }

    if (marker.tool == '-1') {
      overlay = '<img class="overlay" src="./assets/images/icons/overlay_cross.png" alt="Overlay">';
    }

    marker.lMarker = L.marker([marker.lat, marker.lng], {
      opacity: marker.canCollect ? opacity : opacity / 3,
      icon: new L.DivIcon.DataMarkup({
        iconSize: [35 * Settings.markerSize, 45 * Settings.markerSize],
        iconAnchor: [17 * Settings.markerSize, 42 * Settings.markerSize],
        popupAnchor: [0 * Settings.markerSize, -28 * Settings.markerSize],
        html: `
          ${overlay}
          <img class="marker-contour" src="${markerContour}" alt="markerContour">
          <img class="icon" src="${icon}" alt="Icon">
          <img class="background" src="${background}" alt="Background">
          ${shadow}
        `,
        marker: marker.text
      })
    });

    marker.lMarker.id = marker.text;

    if (Settings.isPopupsEnabled) {
      marker.lMarker.bindPopup(marker.popupContent.bind(marker), { minWidth: 300, maxWidth: 400 });
    }

    marker.lMarker.on("click", function (e) {
      if (!Settings.isPopupsEnabled) {
        MapBase.removeItemFromMap(marker.day, marker.text, marker.subdata || '', marker.category);
      }

      Routes.addMarkerOnCustomRoute(marker.text);
      if (RouteSettings.customRouteEnabled) e.target.closePopup();
    });

    marker.lMarker.on("contextmenu", function (e) {
      MapBase.removeItemFromMap(marker.day, marker.text, marker.subdata || '', marker.category);
    });

    Layers.itemMarkersLayer.addLayer(marker.lMarker);
    if (Settings.isMarkerClusterEnabled)
      Layers.oms.addMarker(marker.lMarker);
  },

  gameToMap: function (lat, lng, name = "Debug Marker") {
    MapBase.debugMarker((0.01552 * lng + -63.6), (0.01552 * lat + 111.29), name);
  },

  game2Map: function ({ x, y, z }) {
    MapBase.debugMarker((0.01552 * y + -63.6), (0.01552 * x + 111.29), z);
  },

  highlightImportantItem: function (text, category = '') {
    if (category == 'flower' || category == 'egg')
      text = text.replace(/(_\d+)/, '');

    var textMenu = text.replace(/egg_|flower_/, '');

    $(`[data-type=${textMenu}]`).toggleClass('highlight-important-items-menu');

    $.each($(`[data-marker*=${text}]`), function (key, marker) {
      var markerData = null;

      if (category !== 'random' && category !== '')
        markerData = $(this).data('marker').replace(/_\d/, '');
      else
        markerData = $(this).data('marker');

      if (markerData === text)
        $(this).toggleClass('highlight-items');
    });

    if ($(`[data-marker*=${text}].highlight-items`).length)
      MapBase.importantItems.push(text);
    else
      MapBase.importantItems.splice(MapBase.importantItems.indexOf(text), 1);

    localStorage.setItem('importantItems', JSON.stringify(MapBase.importantItems));
  },

  clearImportantItems: function () {
    $('.highlight-items').removeClass('highlight-items');
    $('.highlight-important-items-menu').removeClass('highlight-important-items-menu');
    MapBase.importantItems = [];
    localStorage.setItem('importantItems', JSON.stringify(MapBase.importantItems));
  },

  loadImportantItems: function () {
    if (localStorage.getItem('importantItems') === undefined)
      MapBase.importantItems = [];
    else
      MapBase.importantItems = JSON.parse(localStorage.getItem('importantItems')) || [];

    $.each(MapBase.importantItems, function (key, value) {
      if (/random_item_\d+/.test(value))
        $(`[data-marker=${value}]`).addClass('highlight-items');
      else
        $(`[data-marker*=${value}]`).addClass('highlight-items');

      var textMenu = value.replace(/egg_|flower_/, '');
      $(`[data-type=${textMenu}]`).addClass('highlight-important-items-menu');
    });
  },

  loadFastTravels: function () {
    return Loader.promises['fasttravels'].consumeJson(data => {
      fastTravelData = data;
      console.info('%c[Fast travels] Loaded!', 'color: #bada55; background: #242424');
    });
  },

  addFastTravelMarker: function () {
    if (enabledCategories.includes('fast_travel')) {
      $.each(fastTravelData, function (key, value) {
        var shadow = Settings.isShadowsEnabled ? '<img class="shadow" width="' + 35 * Settings.markerSize + '" height="' + 16 * Settings.markerSize + '" src="./assets/images/markers-shadow.png" alt="Shadow">' : '';
        var marker = L.marker([value.x, value.y], {
          icon: L.divIcon({
            iconSize: [35 * Settings.markerSize, 45 * Settings.markerSize],
            iconAnchor: [17 * Settings.markerSize, 42 * Settings.markerSize],
            popupAnchor: [0 * Settings.markerSize, -28 * Settings.markerSize],
            html: `
              <img class="icon" src="./assets/images/icons/fast_travel.png" alt="Icon">
              <img class="background" src="./assets/images/icons/marker_gray.png" alt="Background">
              ${shadow}
            `
          })
        });

        marker.bindPopup(`<h1>${Language.get(value.text + '.name')}</h1><p></p>`);

        Layers.itemMarkersLayer.addLayer(marker);
      });
    }
  },

  debugMarker: function (lat, long, name = 'Debug Marker') {
    var shadow = Settings.isShadowsEnabled ? '<img class="shadow" width="' + 35 * Settings.markerSize + '" height="' + 16 * Settings.markerSize + '" src="./assets/images/markers-shadow.png" alt="Shadow">' : '';
    var marker = L.marker([lat, long], {
      icon: L.divIcon({
        iconSize: [35 * Settings.markerSize, 45 * Settings.markerSize],
        iconAnchor: [17 * Settings.markerSize, 42 * Settings.markerSize],
        popupAnchor: [0 * Settings.markerSize, -28 * Settings.markerSize],
        html: `
          <img class="icon" src="./assets/images/icons/random.png" alt="Icon">
          <img class="background" src="./assets/images/icons/marker_darkblue.png" alt="Background">
          ${shadow}
        `
      })
    });

    marker.bindPopup(`<h1>${name}</h1><p>Lat.: ${lat}<br>Long.: ${long}</p>`, { minWidth: 300 });
    Layers.itemMarkersLayer.addLayer(marker);
  },

  addCoordsOnMap: function (coords) {
    // Show clicked coordinates (like google maps)
    if (Settings.isCoordsOnClickEnabled) {
      $('.lat-lng-container').css('display', 'block');

      var lat = parseFloat(coords.latlng.lat.toFixed(4));
      var lng = parseFloat(coords.latlng.lng.toFixed(4));
      $('.lat-lng-container p').html(`Latitude: ${lat}<br>Longitude: ${lng}<br><a href="javascript:void(0)" onclick="Routes.setCustomRouteStart('${lat}', '${lng}')">${Language.get('routes.set_as_route_start')}</a>`);

      $('#lat-lng-container-close-button').click(function () {
        $('.lat-lng-container').css('display', 'none');
      });
    }

    if (Settings.isPinsPlacingEnabled)
      Pins.addPin(coords.latlng.lat, coords.latlng.lng);
  },

  updateOnDayChange: function () {
    // put here all functions that needs to be executed on day change
    Routes.clearCustomRoutes(true);
  },

  yieldingLoop: function (count, chunksize, callback, finished) {
    var i = 0;
    (function chunk() {
      var end = Math.min(i + chunksize, count);
      for (; i < end; ++i) {
        callback.call(null, i);
      }
      if (i < count) {
        setTimeout(chunk, 0);
      } else {
        finished.call(null);
      }
    })();
  }

};