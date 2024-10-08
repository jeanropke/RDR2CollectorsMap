const MapBase = {
  minZoom: 2,
  maxZoom: 7,
  map: null,
  markers: [],
  fuseOnSearch: null,
  fuseOnQuerySuggestions: null,
  overlays: [],
  lootTables: [],
  fastTravelData: [],
  loadedFallbackFonts: [],
  // see building interiors in overlays; might not be rotated right
  // (you also have to load overlays_beta.json instead of overlays.json in loader.js)
  interiors: false,
  updateLoopAvailable: true,
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

          document.querySelectorAll('.leaflet-popup').forEach(el => {
            el.addEventListener('mouseover', function mouseOverHandler(e) {
              clearTimeout(timeout);
              el.removeEventListener('mouseover', mouseOverHandler);
            });
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
      zoomSnap: Settings.zoomSnap,
      zoomDelta: Settings.zoomDelta,
      wheelPxPerZoomLevel: Settings.wheelPxPerZoomLevel,
      wheelDebounceTime: Settings.wheelDebounceTime,
      layers: [mapLayers[this.themeOverride || Settings.baseLayer]],
    }).setView([this.viewportX, this.viewportY], this.viewportZoom);

    MapBase.map.addControl(
      L.control.attribution({
        position: 'bottomright',
        prefix: '<a target="_blank" href="https://github.com/jeanropke/RDR2CollectorsMap/blob/master/CONTRIBUTORS.md" data-text="map.attribution_prefix">Collectors Map Contributors</a>'
      })
    );

    new L.Control.ZoomEx({
      position: "bottomright",
      className: "leaflet-zoomex-rightbottom",
    }).addTo(MapBase.map);

    L.control.layers(mapLayers).addTo(MapBase.map);

    // Leaflet leaves the layer names here, with a space in front of them.
    document.querySelectorAll('.leaflet-control-layers-list span span').forEach(node => {
      // changes: Apply double span selector here using Leaflet 1.8.0+
      // Move the layer name (which is chosen to be our language key) into a
      // new tightly fitted span for use with our localization.
      const langKey = node.textContent.trim();
      node.innerHTML = ` <span data-text="${langKey}">${langKey}</span>`;
    });

    MapBase.map.on('baselayerchange', function (e) {
      Settings.baseLayer = e.name;
      MapBase.setMapBackground();
      Legendary.onSettingsChanged();
    });
    
    const overlayOpacity = document.getElementById('overlay-opacity');
    overlayOpacity.value = Settings.overlayOpacity;
    overlayOpacity.addEventListener('change', function () {
      Settings.overlayOpacity = Number(overlayOpacity.value);
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

  isSameUtcDay: function(timestamp1, timestamp2 = MapBase.mapTime().valueOf()) {
    if (!timestamp1 || typeof timestamp1 !== 'number' || typeof timestamp2 !== 'number') {
      return false;
    }
    const [date1, date2] = [timestamp1, timestamp2].map((time) => new Date(time).toISOUTCDateString());
    return date1 === date2;
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
    document.getElementById('map').style.backgroundColor = MapBase.isDarkMode() ? ((this.themeOverride || Settings.baseLayer) === 'map.layers.black' ? '#000' : '#3d3d3d') : '#d2b790';
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

  Object.entries(MapBase.overlays).forEach(([key, value]) => {
    addOverlay(key, value);
  });
    Layers.overlaysLayer.addTo(MapBase.map);
  },

  setFallbackFonts: async function () {
    const fontsData = {
      ja: {
        content: 'MotoyaExGothic',
        contentUrls: { woff2: 'assets/fonts/fallback/MotoyaExGothic-W4-KP.woff2' },
        title: 'MotoyaAporo',
        titleUrls: { woff2: 'assets/fonts/fallback/MotoyaAporo-Std-W7.woff2' }
      },
      ko: {
        content: 'YDMyungjo240Pro',
        contentUrls: { woff2: 'assets/fonts/fallback/YDMyungjo-240-Pro.woff2' },
        title: 'Yoon-GogooryoM',
        titleUrls: { woff2: 'assets/fonts/fallback/Yoon-GogooryoM.woff2' }
      },
      'zh-Hans': {
        content: 'LXGWNeoZhiSong',
        contentUrls: { woff2: 'assets/fonts/fallback/LXGWNeoZhiSong.woff2' },
        title: 'MLiPRC',
        titleUrls: { woff2: 'assets/fonts/fallback/MLiPRC-Bold.woff2' }
      },
      'zh-Hant': {
        content: 'MSungHK',
        contentUrls: { woff2: 'assets/fonts/fallback/MSungHK-Medium.woff2' },
        title: 'YaYuanGuYin',
        titleUrls: { woff2: 'assets/fonts/fallback/YaYuanGuYin.woff2' }
      }
    };

    this.loadedFallbackFonts.forEach(font => document.fonts.delete(font));
    this.loadedFallbackFonts = [];
    const rootStyles = document.documentElement.style;

    if (fontsData[Settings.language]) {
      const { content, contentUrls, title, titleUrls } = fontsData[Settings.language];
      const [contentFontFace, titleFontFace] = await Promise.all([
        loadFont(content, contentUrls),
        loadFont(title, titleUrls)
      ]);
      this.loadedFallbackFonts.push(contentFontFace, titleFontFace);

      rootStyles.setProperty('--content-font', `var(--default-content-font), ${content}, serif`);
      rootStyles.setProperty('--title-font', `var(--default-title-font), ${title}, serif`);     
    }
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
    MapBase.initFuse();
    Menu.updateTippy();
    Menu.updateRangeTippy();

    // Preview mode.
    const previewParam = getParameterByName('q');
    if (previewParam) {
      MapBase.isPreviewMode = true;

      document.querySelector('.menu-toggle').remove();
      document.querySelector('.top-widget').remove();
      document.querySelector('.filter-alert').remove();
      document.getElementById('fme-container').remove();
      document.querySelector('.side-menu').classList.remove('menu-opened');
      document.querySelector('.leaflet-top.leaflet-right').remove();
      document.querySelector('.leaflet-zoomex.leaflet-zoomex-rightbottom.leaflet-control').remove();

      const isValidCategory = categories.includes(previewParam);
      if (isValidCategory) {
        enabledCategories = [previewParam];
        if (previewParam === "ring" || previewParam === "earring" || previewParam === "bracelet" || previewParam === "necklace") enabledCategories.push("jewelry_random");
        if (previewParam === "coastal" || previewParam === "megafauna" || previewParam === "oceanic") enabledCategories.push("fossils_random");

        MapBase.addMarkers();
      } else {
        enabledCategories = [];
        MapBase.addMarkers(false, true);
        searchInput.value = previewParam;
        MapBase.onSearch(previewParam, true);

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
      searchInput.value = searchParam;
      MapBase.onSearch(searchParam, true);
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
        document.querySelector(`[data-type="${goTo.category}"]`).classList.remove('disabled');
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

  initFuse: function() {
    const dataForSearch = MapBase.markers.map((marker) => ({
      itemId: marker.itemId,
      itemTranslationKey: Language.get(marker.itemTranslationKey).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    }));
    const dataForQuerySuggestions = [
      ...new Set(
        MapBase.markers.map((marker) => Language.get(marker.itemTranslationKey))
      )
    ].map((name) => ({ name }));

    this.fuseOnSearch = new Fuse(dataForSearch, { keys: ['itemTranslationKey'], threshold: 0.4 });
    this.fuseOnQuerySuggestions = new Fuse(dataForQuerySuggestions, { keys: ['name'], threshold: 0.6 });
  },

  onSearch: function (searchString, immediate = false) {
    Menu.toggleFilterWarning('map.has_search_filter_alert', !!searchString);

    // Wait 500ms before search items to do not search not full term
    clearTimeout(MapBase.onSearch.delaySearch);

    MapBase.onSearch.delaySearch = setTimeout(() => {
      const searchTerms = [
        ...new Set(searchString
          .replace(/^[;\s]+|[;\s]+$/g, '')
          .split(';')
          .filter((element) => element)
          .map((term) => term.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
        )
      ];

      if (!searchTerms.length) {
        if (Settings.filterType !== 'none') document.getElementById('filter-type').value = Settings.filterType;
        filterMapMarkers();
        return;
      }

      Layers.itemMarkersLayer.clearLayers();
      uniqueSearchMarkers = MapBase.markers.filter((marker) =>
        searchTerms.some((term) =>
          marker.itemId === term ||
          marker.itemNumberStr === term ||
          Language.get(marker.itemTranslationKey).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term)
        )
      );

      if (!uniqueSearchMarkers.length && this.fuseOnSearch) {
        searchTerms.forEach((term) => {
          const bestMatches = this.fuseOnSearch.search(term);
          if (bestMatches.length) {
            uniqueSearchMarkers.push(
              ...MapBase.markers.filter(
                (marker) => bestMatches[0].item.itemId === marker.itemId
              )
            );
          }
        });
      }

      uniqueSearchMarkers.forEach(({ category }) => {
        if (!enabledCategories.includes(category))
          enabledCategories.push(category);
      });

      MapBase.addMarkers();
    }, immediate ? 0 : (!!searchString ? 500 : 0));
  },

  onQuerySuggestions: function (searchString) {
    const queries = searchString
      .toLowerCase()
      .split(';')
      .map((query) => query.trim())
      .filter(Boolean);
    const query = queries[queries.length - 1];
    
    if (!query) {
      suggestionsContainer.style.display = 'none';
      return;
    }

    if (searchString.endsWith(';')) {
      suggestionsContainer.innerHTML = '';
      return;
    }

    const results = this.fuseOnQuerySuggestions.search(query).slice(0, 15);

    if (!results.length) {
      suggestionsContainer.style.display = 'none';
      return;
    }

    suggestionsContainer.innerHTML = results
      .map(({item}) => `<div class="query-suggestion">${item.name}</div>`)
      .join('');
    suggestionsContainer.style.display = '';

    activeSuggestionIndex = -1;
  
    suggestionsContainer.querySelectorAll('.query-suggestion').forEach((el) => {
      el.addEventListener('click', (e) => {
        const splitStr = searchString.split(';');
        const baseStr = splitStr.length > 1 ? splitStr.slice(0, -1).join(';') + '; ' : '';
        searchInput.value = `${baseStr}${e.target.textContent}; `;
        suggestionsContainer.style.display = 'none';
        MapBase.onSearch(searchInput.value, true);
      });
    });
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
      (text == subdata && !document.querySelector(`[data-type="${subdata}"] .collectible-text p`).classList.contains('disabled'));

    markers.forEach(marker => {
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
        const markerEl = document.querySelector(`[data-type="${marker.legacyItemId}"] .collectible-text p`);
        if (marker.isCollected && marker.isCurrent) {
          markerEl?.classList.add('disabled');
        } else {
          markerEl?.classList.remove('disabled');
        }
        if (marker.isCurrent && ['egg', 'flower'].includes(marker.category)) {
          markerEl.classList.toggle('disabled', markers.every(m => !m.canCollect));
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
      Object.entries(MapBase.fastTravelData).forEach(([key, value]) => {
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
    const container = document.querySelector('.lat-lng-container');

    if (Settings.isCoordsOnClickEnabled) {
      if (container.style.display = 'none') container.style.display = 'block';
      container.title ||= Language.get('map.draggable');
      draggableLatLngCtn ||= new PlainDraggable(container);
      
      const lat = coords.latlng.lat.toFixed(4);
      const lng = coords.latlng.lng.toFixed(4);
      document.querySelector('.lat-value').textContent = lat;
      document.querySelector('.lng-value').textContent = lng;
      ['click', 'touchend'].forEach((event) => {
        document.getElementById('lat-lng-container-start').addEventListener((event), () => Routes.setCustomRouteStart(lat, lng), { once: true });
        document.getElementById('lat-lng-container-generate').addEventListener((event), () => Routes.setCustomRouteStart(lat, lng, true), { once: true });
        document.getElementById('lat-lng-container-close-button').addEventListener((event), () =>{ 
          container.style.display = 'none';
          if (draggableLatLngCtn) {
            draggableLatLngCtn.remove();
            draggableLatLngCtn = null;
          }
        }, { once: true });
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

    for (let key in localStorage) {
      if (key.startsWith('rdr2collector.pickup.')) {
          localStorage.removeItem(key);
      }
    }
  },

  yieldingLoop: function (count, chunksize, callback, finished) {
    if (MapBase.isPreviewMode) chunksize = count;
    let i = 0;
    (function chunk() {
      const end = Math.min(i + chunksize, count);
      const promises = [];
      for (; i < end; ++i) {
        promises.push(callback.call(null, i));
      }
      Promise.all(promises).then(() => {
        if (i < count) {
          setTimeout(chunk, 0);
        } else {
          finished.call(null);
        }
      });
    })();
  },

  updateTippy: function (loc = '') {
    if (Settings.isDebugEnabled)
      console.log('UpdateTippy called from', loc);

    // This is here to deal with stacked onMap updates (show all/hide all)
    return new Promise(resolve => setTimeout(resolve, 300)).then(() => {
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
    });
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