const MapBase = {
  minZoom: 2,
  maxZoom: 7,
  map: null,
  markers: [],
  overlays: [],
  lootTables: [],
  fastTravelData: [],
  // see building interiors in overlays; might not be rotated right
  // (you also have to load overlays_beta.json instead of overlays.json in loader.js)
  interiors: false,
  updateLoopAvailable: true,
  updateTippyTimer: null,
  tippyInstances: [],
  requestLoopCancel: false,
  showAllMarkers: false,
  filtersData: [],
  utcTimeCorrectionMs: 0,
  jewelryTimestamps: {},

  // Query adjustable parameters
  isPreviewMode: false,
  colorOverride: null,
  themeOverride: null,
  viewportX: -70,
  viewportY: 111.75,
  viewportZoom: 3,

  mapInit: function () {
    'use strict';

    // Parses and properly sets map preferences from query parameters.
    this.beforeLoad();

    this.tippyInstances = [];
    const mapBoundary = L.latLngBounds(L.latLng(-144, 0), L.latLng(0, 176));

    //Download map tiles here https://github.com/jeanropke/RDOMap#map-tiles
    const mapLayers = {
      'map.layers.default': L.tileLayer('https://s.rsg.sc/sc/images/games/RDR2/map/game/{z}/{x}/{y}.jpg', {
        noWrap: true,
        bounds: mapBoundary,
        attribution: '<a href="https://www.rockstargames.com/" target="_blank">Rockstar Games</a>'
      }),
      'map.layers.detailed': L.tileLayer((isLocalHost() ? 'assets/maps/' : 'https://map-tiles.b-cdn.net/assets/rdr3/') + 'webp/detailed/{z}/{x}_{y}.webp', {
        noWrap: true,
        bounds: mapBoundary,
        attribution: '<a href="https://rdr2map.com/" target="_blank">RDR2Map</a>'
      }),
      'map.layers.dark': L.tileLayer((isLocalHost() ? 'assets/maps/' : 'https://map-tiles.b-cdn.net/assets/rdr3/') + 'webp/darkmode/{z}/{x}_{y}.webp', {
        noWrap: true,
        bounds: mapBoundary,
        attribution: '<a href="https://github.com/TDLCTV" target="_blank">TDLCTV</a>'
      }),
      'map.layers.black': L.tileLayer((isLocalHost() ? 'assets/maps/' : 'https://map-tiles.b-cdn.net/assets/rdr3/') + 'webp/black/{z}/{x}_{y}.webp', {
        noWrap: true,
        bounds: mapBoundary,
        attribution: '<a href="https://github.com/AdamNortonUK" target="_blank">AdamNortonUK</a>'
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

          const that = this;
          const timeout = setTimeout(function () {
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
      layers: [mapLayers[this.themeOverride || Settings.baseLayer]],
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 150,
    }).setView([this.viewportX, this.viewportY], this.viewportZoom);

    MapBase.map.addControl(
      L.control.attribution({
        position: 'bottomright',
        prefix: '<a target="_blank" href="https://github.com/jeanropke/RDR2CollectorsMap/blob/master/CONTRIBUTORS.md" data-text="map.attribution_prefix">Collectors Map Contributors</a>'
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
      Legendary.onSettingsChanged();
    });

    $('#overlay-opacity').val(Settings.overlayOpacity);
    $("#overlay-opacity").on("change", function () {
      Settings.overlayOpacity = Number($("#overlay-opacity").val());
      MapBase.setOverlays();
      Legendary.onSettingsChanged();
    });

    MapBase.map.on('click', function (e) {
      MapBase.addCoordsOnMap(e);
    });

    MapBase.map.doubleClickZoom[Settings.isDoubleClickZoomEnabled ? 'enable' : 'disable']();

    MapBase.updateMapBoundaries();

    Layers.oms = new OverlappingMarkerSpiderfier(MapBase.map, {
      keepSpiderfied: true
    });
    Layers.oms.addListener('spiderfy', function (markers) {
      MapBase.map.closePopup();
    });
    Layers.itemMarkersLayer.addTo(MapBase.map);
  },

  mapTime: function () {
    return new Date(Date.now() - MapBase.utcTimeCorrectionMs);
  },

  setMapTime: function () {
    return Loader.promises['timezone'].consumeJson(({ time }) => {
      const difference = Date.now() - time * 1000;
      // apply correction if the difference is bigger than 10 seconds
      if (Math.abs(difference) > 1e4) {
        MapBase.utcTimeCorrectionMs = difference;
        console.info(`%c[UTC time] Corrected by ${difference}ms`, 'color: #bada55; background: #242424');
      }
    }).catch(() => {
      console.info('%c[UTC time] Unable to load!', 'color: #FF6969; background: #242424');
      // Allow to load next scripts on API error
      return Promise.resolve();
    });
  },

  updateMapBoundaries: function() {
    if(Settings.isMapBoundariesEnabled) {
      const southWest = L.latLng(-160, -120),
        northEast = L.latLng(25, 250),
        bounds = L.latLngBounds(southWest, northEast);
      MapBase.map.setMaxBounds(bounds);
    }
  },

  isDarkMode: function () {
    return ['map.layers.dark', 'map.layers.black'].includes(this.themeOverride || Settings.baseLayer);
  },

  loadOverlays: function () {
    return Loader.promises['overlays'].consumeJson(data => {
      MapBase.overlays = data;
      MapBase.setMapBackground();
      console.info('%c[Overlays] Loaded!', 'color: #bada55; background: #242424');
    });
  },

  loadFilters: function () {
    return Loader.promises['filters'].consumeJson(data => {
      MapBase.filtersData = data;
      console.info('%c[Filters] Loaded!', 'color: #bada55; background: #242424');
    });
  },

  loadJewelryTimestamps: function () {
    return Loader.promises['jewelry_timestamps'].consumeJson(data => {
      MapBase.jewelryTimestamps = data.items;
      console.info('%c[Jewelry timestamps] Loaded!', 'color: #bada55; background: #242424');
    }).catch(() => {
      console.info('%c[Jewelry timestamps] Unable to load!', 'color: #FF6969; background: #242424');
      return Promise.resolve();
    });
  },

  setMapBackground: function () {
    'use strict';
    $('#map').css('background-color', MapBase.isDarkMode() ? ((this.themeOverride || Settings.baseLayer) === 'map.layers.black' ? '#000' : '#3d3d3d') : '#d2b790');
    MapBase.setOverlays();
    if (Settings.markerColor.startsWith('auto')) {
      MapBase.markers.forEach(marker => marker.updateColor());
    }
  },

  setOverlays: function () {
    'use strict';
    Layers.overlaysLayer.clearLayers();

    if (Settings.overlayOpacity === 0) return;

    let subDir = MapBase.isDarkMode() ? 'dark' : 'normal';
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

  beforeLoad: function () {
    // Set map to preview mode before loading.
    const previewParam = getParameterByName('q');
    if (previewParam) this.isPreviewMode = true;

    // Set map theme according to param.
    const themeParam = getParameterByName('theme');
    if (themeParam && ['default', 'detailed', 'dark', 'black'].includes(themeParam))
      this.themeOverride = `map.layers.${themeParam}`;

    // Sets the map's default zoom level to anywhere between minZoom and maxZoom.
    const zoomParam = Number.parseInt(getParameterByName('z'));
    if (!isNaN(zoomParam) && this.minZoom <= zoomParam && zoomParam <= this.maxZoom)
      this.viewportZoom = zoomParam;

    // Pans the map to a specific coordinate location on the map for default focussing.
    const flyParam = getParameterByName('ft');
    if (flyParam) {
      const latLng = flyParam.split(',');
      if (latLng.filter(Number).length === 2) {
        this.viewportX = latLng[0];
        this.viewportY = latLng[1];
      }
    }

    // Sets all marker colors to static color.
    const colorParam = getParameterByName('c');
    if (colorParam) {
      const validColors = [
        'aquagreen', 'beige', 'black', 'blue', 'brown', 'cadetblue', 'darkblue', 'darkgreen', 'darkorange', 'darkpurple',
        'darkred', 'gray', 'green', 'lightblue', 'lightdarkred', 'lightgray', 'lightgreen', 'lightorange', 'lightred',
        'orange', 'pink', 'purple', 'red', 'white', 'yellow'
      ];

      if (validColors.includes(colorParam)) this.colorOverride = colorParam;
    }
  },

  afterLoad: function () {
    'use strict';
    uniqueSearchMarkers = MapBase.markers;

    // Preview mode.
    const previewParam = getParameterByName('q');
    if (previewParam) {
      MapBase.isPreviewMode = true;

      $('.menu-toggle').remove();
      $('.top-widget').remove();
      $('.filter-alert').remove();
      $('#fme-container').remove();
      $('.side-menu').removeClass('menu-opened');
      $('.leaflet-top.leaflet-right, .leaflet-control-zoom').remove();

      const isValidCategory = categories.includes(previewParam);
      if (isValidCategory) {
        enabledCategories = [previewParam];
        if (previewParam === "ring" || previewParam === "earring" || previewParam === "bracelet" || previewParam === "necklace") enabledCategories.push("jewelry_random");
        if (previewParam === "coastal" || previewParam === "megafauna" || previewParam === "oceanic") enabledCategories.push("fossils_random");

        MapBase.addMarkers();
      } else {
        enabledCategories = [];
        MapBase.addMarkers(false, true);
        $('#search').val(previewParam);
        MapBase.onSearch(previewParam);

        // Zoom in if there's only one specific item.
        const visibleItems = MapBase.markers.filter(m => m.isVisible);
        if (visibleItems.length === 1)
          MapBase.map.setView([visibleItems[0].lat, visibleItems[0].lng], 6);
      }

      // Puppeteer hack and utility for other extensions.
      // Allows utilities to wait for this global to then do their stuff.
      window.loaded = true;

      // Don't need to do anything else, just exit.
      return;
    }

    MapBase.resetMarkersDaily();

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

      if (!enabledCategories.includes(goTo.category)) {
        enabledCategories.push(goTo.category);
        MapBase.addMarkers();
        $(`[data-type="${goTo.category}"]`).removeClass('disabled');
      }

      setTimeout(() => goTo.lMarker && goTo.lMarker.openPopup(), 3000);
    }
  },

  resetMarkersDaily: function () {
    const date = MapBase.mapTime().toISOUTCDateString();

    if (localStorage.getItem('rdr2collector.date') == null || date != localStorage.getItem('rdr2collector.date')) {
      MapBase.markers.forEach(marker => {
        if (Settings.resetMarkersDaily || marker.isRandomizedItem) {
          marker.isCollected = false;
        }

        if (InventorySettings.isEnabled && !marker.isRandomizedItem && marker.item.amount === 0) {
          marker.isCollected = false;
        }

        if (InventorySettings.resetInventoryDaily && !marker.isRandomizedItem) {
          marker.item.amount = 0;
        }
      });
      Inventory.updateItemHighlights();
      Routes.clearCustomRoutes();
      Menu.refreshMenu();
    }

    localStorage.setItem('rdr2collector.date', date);
  },

  onSearch: function (searchString) {
    Menu.toggleFilterWarning('map.has_search_filter_alert', !!searchString);

    // Wait 500ms before search items to do not search not full term
    clearTimeout(MapBase.onSearch.delaySearch);

    MapBase.onSearch.delaySearch = setTimeout(() => {
      const searchTerms = [
        ...new Set(searchString
          .replace(/^[;\s]+|[;\s]+$/g, '')
          .split(';')
          .filter(element => element)
          .map(term => term.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
        )
      ];

      if (!searchTerms.length) {
        uniqueSearchMarkers = MapBase.markers;
        MapBase.addMarkers();
        return;
      }

      Layers.itemMarkersLayer.clearLayers();
      uniqueSearchMarkers = MapBase.markers.filter(marker =>
        searchTerms.some(term =>
          marker.itemId === term ||
          marker.itemNumberStr === term ||
          Language.get(marker.itemTranslationKey).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term)
        )
      );

      if (!uniqueSearchMarkers.length) {
        const markerNames = MapBase.markers.map(marker =>
          Language.get(marker.itemTranslationKey).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        )
        searchTerms.forEach(term => {
          const bestMatch = stringSimilarity.findBestMatch(term, markerNames);
          if (bestMatch.bestMatch.rating < 0.6) return;
          const bestMatchItemId = MapBase.markers[bestMatch.bestMatchIndex].itemId;
          uniqueSearchMarkers.push(...MapBase.markers.filter(marker => bestMatchItemId === marker.itemId));
        });
      }

      uniqueSearchMarkers.forEach(({ category }) => {
        if (!enabledCategories.includes(category))
          enabledCategories.push(category);
      });

      MapBase.addMarkers();
    }, !!searchString ? 500 : 0);
  },

  addMarkers: function (refreshMenu = false) {
    if (!MapBase.updateLoopAvailable) {
      MapBase.requestLoopCancel = true;
      setTimeout(() => {
        MapBase.addMarkers(refreshMenu);
      }, 0);
      return;
    }

    Layers.itemMarkersLayer.clearLayers();
    Layers.fastTravelLayer.clearLayers();

    MapBase.updateLoopAvailable = false;
    MapBase.yieldingLoop(
      MapBase.markers.length,
      25,
      function (i) {
        if (MapBase.requestLoopCancel) return;
        MapBase.addMarkerOnMap(MapBase.markers[i]);
      },
      function () {
        MapBase.updateLoopAvailable = true;
        MapBase.requestLoopCancel = false;
        Menu.refreshItemsCounter();
        Inventory.updateItemHighlights();
        Item.convertImportantItems(); // only temporary - convert old localStorage values to new
        Item.initImportedItems();
        Routes.getCustomRoute();
        MapBase.updateTippy('addMarkers');
      }
    );

    Layers.pinsLayer.addTo(MapBase.map);

    MapBase.addFastTravelMarker();

    MadamNazar.addMadamNazar();

    if (refreshMenu) {
      Menu.refreshMenu();
    } else {
      Routes.generatePath();
      return;
    }

    if (RouteSettings.generateOnVisit)
      Routes.generatePath(true);
  },

  removeItemFromMap: function (day, text, subdata, category, skipInventory = false) {
    const markers = MapBase.markers.filter(function (marker) {
      return marker.day == day && (marker.text == text || marker.subdata == subdata);
    });

    if (markers == null) return;

    const subdataCategoryIsDisabled =
      (text == subdata && !$(`[data-type=${subdata}] .collectible-text p`).hasClass('disabled'));

    $.each(markers, function (key, marker) {
      if (text != subdata && marker.text != text) return;

      let changeAmount = 0;

      if (marker.isCurrent) {
        if ((marker.subdata == subdata && subdataCategoryIsDisabled) || marker.canCollect) {
          marker.isCollected = true;
          changeAmount = 1;
        } else {
          marker.isCollected = false;
          changeAmount = -1;
        }
      }
      marker.item && marker.item.changeAmountWithSideEffects(skipInventory ? 0 : changeAmount);

      if (!InventorySettings.isEnabled) {
        if (marker.isCollected && marker.isCurrent) {
          $(`[data-type=${marker.legacyItemId}] .collectible-text p`).addClass('disabled');
        } else {
          $(`[data-type=${marker.legacyItemId}] .collectible-text p`).removeClass('disabled');
        }
        if (marker.isCurrent && ['egg', 'flower'].includes(marker.category)) {
          $(`[data-type=${marker.legacyItemId}] .collectible-text p`).toggleClass('disabled',
            markers.every(m => !m.canCollect));
        }
      }

      PathFinder.wasRemovedFromMap(marker);
    });

    if (RouteSettings.ignoreCollected)
      Routes.generatePath();

    Menu.refreshItemsCounter();
  },

  addMarkerOnMap: function (marker, ignoreToolSetting) {
    if (!(marker.isVisible && (ignoreToolSetting || marker.toolAccepted()))) return;

    marker.recreateLMarker();

    Layers.itemMarkersLayer.addLayer(marker.lMarker);
    if (Settings.isMarkerClusterEnabled)
      Layers.oms.addMarker(marker.lMarker);
  },

  gameToMap: function (lat, lng, name = "Debug Marker") {
    return MapBase.game2Map({
      x: lat,
      y: lng,
      z: name
    });
  },

  game2Map: function ({ x, y, z }) {
    return MapBase.debugMarker((0.01552 * y + -63.6), (0.01552 * x + 111.29), z);
  },

  loadFastTravels: function () {
    Layers.fastTravelLayer.addTo(MapBase.map);

    return Loader.promises['fasttravels'].consumeJson(data => {
      MapBase.fastTravelData = data;
      console.info('%c[Fast travels] Loaded!', 'color: #bada55; background: #242424');
    });
  },

  onFastTravelToggle: function () {
    Layers.fastTravelLayer.clearLayers();
    if (!enabledCategories.includes('fast_travel')) return;
    MapBase.addFastTravelMarker();
    MapBase.updateTippy('tooltip');
  },

  addFastTravelMarker: function () {
    const markerSize = Settings.markerSize;
    if (enabledCategories.includes('fast_travel')) {
      $.each(MapBase.fastTravelData, function (key, value) {
        const shadow = Settings.isShadowsEnabled ?
          '<img class="shadow" width="' + 35 * markerSize + '" height="' + 16 * markerSize + '" src="./assets/images/markers-shadow.png" alt="Shadow">' : '';
        const marker = L.marker([value.x, value.y], {
          icon: new L.DivIcon.DataMarkup({
            iconSize: [35 * markerSize, 45 * markerSize],
            iconAnchor: [17 * markerSize, 42 * markerSize],
            popupAnchor: [1 * markerSize, -29 * markerSize],
            html: `
              <img class="icon" src="./assets/images/icons/fast_travel.png" alt="Icon">
              <img class="background" src="./assets/images/icons/marker_${MapBase.colorOverride || 'gray'}.png" alt="Background">
              ${shadow}
            `,
            tippy: Language.get(value.text + '.name'),
          })
        });

        marker.bindPopup(`<h1>${Language.get(value.text + '.name')}</h1><p></p>`);

        Layers.fastTravelLayer.addLayer(marker);
      });
    }
  },

  loadLootTable: function () {
    return Loader.promises['loot'].consumeJson(data => {
      MapBase.lootTables = data;
      console.info('%c[Loot Tables] Loaded!', 'color: #bada55; background: #242424');
    });
  },

  debugMarker: function (lat, long, name = 'Debug Marker', markerSize = Settings.markerSize) {
    const shadow = Settings.isShadowsEnabled ?
      '<img class="shadow" width="' + 35 * markerSize + '" height="' + 16 * markerSize + '" src="./assets/images/markers-shadow.png" alt="Shadow">' : '';
    const marker = L.marker([lat, long], {
      icon: new L.DivIcon.DataMarkup({
        iconSize: [35 * markerSize, 45 * markerSize],
        iconAnchor: [17 * markerSize, 42 * markerSize],
        popupAnchor: [1 * markerSize, -29 * markerSize],
        html: `
          <img class="icon" src="./assets/images/icons/random.png" alt="Icon">
          <img class="background" src="./assets/images/icons/marker_${MapBase.colorOverride || 'darkblue'}.png" alt="Background">
          ${shadow}
        `,
        tippy: name,
      })
    });

    marker.bindPopup(`<h1>${name}</h1><p>Lat.: ${lat}<br>Long.: ${long}</p>`, {
      minWidth: 300
    });

    Layers.itemMarkersLayer.addLayer(marker);

    return { lat, long, name };
  },

  addCoordsOnMap: function (coords) {
    // Show clicked coordinates (like google maps)
    if (Settings.isCoordsOnClickEnabled) {
      $('.lat-lng-container').css('display', 'block');

      const lat = parseFloat(coords.latlng.lat.toFixed(4));
      const lng = parseFloat(coords.latlng.lng.toFixed(4));
      $('.lat-lng-container p').html(
        `Latitude: ${lat}<br>
        Longitude: ${lng}<br>
        <hr>
        <a href="javascript:void(0)"
        onclick="Routes.setCustomRouteStart('${lat}', '${lng}')">${Language.get('routes.set_as_route_start')}</a><br>
        <a href="javascript:void(0)"
        onclick="Routes.setCustomRouteStart('${lat}', '${lng}', true)">${Language.get('routes.generate_route_now')}</a>`);

      $('#lat-lng-container-close-button').click(function () {
        $('.lat-lng-container').css('display', 'none');
      });
    }

    if (Settings.isPinsPlacingEnabled) {
      Pins.onMap = true;
      Pins.addPin(coords.latlng);
    }
  },

  runOnDayChange: function () {
    // put here all functions that needs to be executed on day change
    MapBase.resetMarkersDaily();
  },

  yieldingLoop: function (count, chunksize, callback, finished) {
    if (MapBase.isPreviewMode) chunksize = count;
    let i = 0;
    (function chunk() {
      const end = Math.min(i + chunksize, count);
      for (; i < end; ++i) {
        callback.call(null, i);
      }
      if (i < count) {
        setTimeout(chunk, 0);
      } else {
        finished.call(null);
      }
    })();
  },

  updateTippy: function (loc = '') {
    if (Settings.isDebugEnabled)
      console.log('UpdateTippy called from', loc);

    // This is here to deal with stacked onMap updates (show all/hide all)
    clearTimeout(MapBase.updateTippyTimer);
    MapBase.updateTippyTimer = setTimeout(function () {
      if (Settings.isDebugEnabled)
        console.log('Updating MapBase Tippy...');

      MapBase.tippyInstances.forEach(instance => instance.destroy());
      MapBase.tippyInstances = [];

      if (!Settings.showTooltipsMap || Settings.isPopupsHoverEnabled) return;

      MapBase.tippyInstances = tippy('[data-tippy]', {
        theme: 'map-theme',
        placement: 'right',
        arrow: false,
        distance: 0,
        zIndex: 910,
        allowHTML: true,
        content(ref) {
          return ref.getAttribute('data-tippy');
        },
      });
    }, 300);
  },

  // Rectangle for testing.
  _rectangle: function (x, y, width, height) {
    var currentPoint = this.map.latLngToContainerPoint([x, y]);

    var xDifference = width / 2;
    var yDifference = height / 2;

    var southWest = L.point((currentPoint.x - xDifference), (currentPoint.y - yDifference));
    var northEast = L.point((currentPoint.x + xDifference), (currentPoint.y + yDifference));

    var bounds = L.latLngBounds(this.map.containerPointToLatLng(southWest), this.map.containerPointToLatLng(northEast));
    L.rectangle(bounds).addTo(this.map);
  },

  //R* converting stuff
  _debugMarker: function (coords) {
    let temp = MapBase.map.unproject(this._gameToMap(coords), 8);
    MapBase.debugMarker(temp.lat, temp.lng);
    return { 'lat': temp.lat.toFixed(4), 'lng': temp.lng.toFixed(4) };
  },

  _gameToMap: function (coords) {
    let image = [48841, 38666],
      topLeft = [-7168, 4096],
      bottomRight = [5120, -5632];

    let i = image[0],
      n = image[1],
      e = this._normal_xy(topLeft, bottomRight),
      s = this._normal_xy(topLeft, coords);
    return [i * (s[0] / e[0]), n * (s[1] / e[1])];
  },

  _normal_xy: function (t, i) {
    return [this._num_distance(t[0], i[0]), this._num_distance(t[1], i[1])];
  },

  _num_distance: function (t, i) {
    return t > i ? t - i : i - t;
  },
};