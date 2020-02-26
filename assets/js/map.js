/**
 * Created by Jean on 2019-10-09.
 */

var MapBase = {
  minZoom: 2,
  maxZoom: 7,
  map: null,
  overlays: [],
  markers: [],
  importantItems: [],
  collectedItems: {},
  isDarkMode: false,
  updateLoopAvailable: true,
  requestLoopCancel: false,

  init: function () {

    //Please, do not use the GitHub map tiles. Thanks
    var mapLayers = [
      L.tileLayer('https://s.rsg.sc/sc/images/games/RDR2/map/game/{z}/{x}/{y}.jpg', {
        noWrap: true,
        bounds: L.latLngBounds(L.latLng(-144, 0), L.latLng(0, 176)),
        attribution: '<a href="https://www.rockstargames.com/" target="_blank">Rockstar Games</a>'
      }),
      L.tileLayer((isLocalHost() ? '' : 'https://jeanropke.b-cdn.net/') + 'assets/maps/detailed/{z}/{x}_{y}.jpg', {
        noWrap: true,
        bounds: L.latLngBounds(L.latLng(-144, 0), L.latLng(0, 176)),
        attribution: '<a href="https://rdr2map.com/" target="_blank">RDR2Map</a>'
      }),
      L.tileLayer((isLocalHost() ? '' : 'https://jeanropke.b-cdn.net/') + 'assets/maps/darkmode/{z}/{x}_{y}.jpg', {
        noWrap: true,
        bounds: L.latLngBounds(L.latLng(-144, 0), L.latLng(0, 176)),
        attribution: '<a href="https://github.com/TDLCTV" target="_blank">TDLCTV</a>'
      })
    ];

    // Override bindPopup to include mouseover and mouseout logic.
    L.Layer.include({
      bindPopup: function (content, options) {
        // TODO: Check if we can move this from here.
        if (content instanceof L.Popup) {
          Util.setOptions(content, options);
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
      layers: [mapLayers[parseInt($.cookie('map-layer'))]]
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

    var baseMapsLayers = {
      'map.layers.default': mapLayers[0],
      'map.layers.detailed': mapLayers[1],
      'map.layers.dark': mapLayers[2]
    };

    L.control.layers(baseMapsLayers).addTo(MapBase.map);

    MapBase.map.on('baselayerchange', function (e) {
      var mapIndex;

      switch (e.name) {
        case 'map.layers.default':
          mapIndex = 0;
          break;
        case 'map.layers.dark':
          mapIndex = 2;
          break;
        case 'map.layers.detailed':
        default:
          mapIndex = 1;
          break;
      }

      setMapBackground(mapIndex);
    });

    MapBase.map.on('click', function (e) {
      MapBase.addCoordsOnMap(e);
    });

    if (Settings.isDoubleClickZoomEnabled) {
      MapBase.map.doubleClickZoom.enable();
    } else {
      MapBase.map.doubleClickZoom.disable();
    }

    var southWest = L.latLng(-160, -50),
      northEast = L.latLng(25, 250),
      bounds = L.latLngBounds(southWest, northEast);
    MapBase.map.setMaxBounds(bounds);

    Layers.oms = new OverlappingMarkerSpiderfier(MapBase.map, { keepSpiderfied: true });
    Layers.oms.addListener('spiderfy', function (markers) {
      MapBase.map.closePopup();
    });

    MapBase.loadOverlays();

  },

  loadOverlays: function () {
    $.getJSON('data/overlays.json?nocache=' + nocache)
      .done(function (data) {
        MapBase.overlays = data;
        MapBase.setOverlays(Settings.overlayOpacity);
        console.info('%c[Overlays] Loaded!', 'color: #bada55; background: #242424');
      });
  },

  setOverlays: function (opacity = 0.5) {
    Layers.overlaysLayer.clearLayers();

    if (opacity == 0) return;

    $.each(MapBase.overlays, function (key, value) {
      var overlay = `assets/overlays/${(MapBase.isDarkMode ? 'dark' : 'normal')}/${key}.png?nocache=${nocache}`;
      Layers.overlaysLayer.addLayer(L.imageOverlay(overlay, value, { opacity: opacity }));
    });

    Layers.overlaysLayer.addTo(MapBase.map);
  },

  loadMarkers: function () {
    $.getJSON('data/items.json?nocache=' + nocache)
      .done(function (data) {
        MapBase.setMarkers(data);
      });
  },

  setMarkers: function (data) {
    if (Settings.isDebugEnabled)
      console.log(`Categories disabled: ${categoriesDisabledByDefault}`);

    $.each(data, function (_category, _cycles) {
      $.each(_cycles, function (day, _markers) {
        $.each(_markers, function (key, marker) {
          MapBase.markers.push(new Marker(marker.text, marker.lat, marker.lng, marker.tool, day, _category, marker.subdata, marker.video, marker.height));
        });
      });
    });
    uniqueSearchMarkers = MapBase.markers;

    // Reset markers daily.
    var curDate = new Date();
    date = curDate.getUTCFullYear() + '-' + (curDate.getUTCMonth() + 1) + '-' + curDate.getUTCDate();

    if (date != $.cookie('date') && Settings.resetMarkersDaily) {
      console.log('New day, resetting markers...');
      var markers = MapBase.markers;
      $.each(markers, function (key, value) {
        if (Inventory.items[value.text])
          Inventory.items[value.text].isCollected = false;

        markers[key].isCollected = false;

        if (Inventory.isEnabled)
          markers[key].canCollect = value.amount < Inventory.stackSize;
        else
          markers[key].canCollect = true;

        // reset all random spots at cycle change
        if (value.category == 'random') {
          value.isCollected = false;
          value.canCollect = true;
        }
      });

      MapBase.markers = markers;
      Inventory.save();
    }

    $.cookie('date', date, { expires: 999 });

    MapBase.addMarkers(true);

    // Do search via URL.
    var searchParam = getParameterByName('search');
    if (searchParam != null && searchParam) {
      $('#search').val(searchParam);
      MapBase.onSearch(searchParam);
    }

    // Navigate to marker via URL.
    var markerParam = getParameterByName('m');
    if (markerParam != null && markerParam != '') {
      var goTo = MapBase.markers.filter(_m => _m.text == markerParam && _m.day == Cycles.categories[_m.category])[0];

      //if a marker is passed on url, check if is valid
      if (goTo === undefined || goTo === null) return;

      //set map view with marker lat & lng
      MapBase.map.setView([goTo.lat, goTo.lng], 6);

      //check if marker category is enabled, if not, enable it
      if (Layers.itemMarkersLayer.getLayerById(goTo.text) == null) {
        enabledCategories.push(goTo.category);
        MapBase.addMarkers();
        $(`[data-type="${goTo.category}"]`).removeClass('disabled');
      }

      //open marker popup
      Layers.itemMarkersLayer.getLayerById(goTo.text).openPopup();
    }
  },

  onSearch: function (searchString) {
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

        searchMarkers = searchMarkers.concat(MapBase.markers.filter(function (_marker) {
          if (_marker.title != null)
            return _marker.title.toLowerCase().includes(term.toLowerCase());
        }));

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

    if (Layers.itemMarkersLayer != null)
      Layers.itemMarkersLayer.clearLayers();
    if (Layers.miscLayer != null)
      Layers.miscLayer.clearLayers();

    var opacity = Settings.markerOpacity;

    MapBase.updateLoopAvailable = false;
    MapBase.yieldingLoop(
      MapBase.markers.length,
      25,
      function (i) {
        if (MapBase.requestLoopCancel) return;

        var marker = MapBase.markers[i];

        // Set isVisible to false. addMarkerOnMap will set to true if needs
        marker.isVisible = false;

        if (marker.subdata != null)
          if (categoriesDisabledByDefault.includes(marker.subdata))
            return;

        MapBase.addMarkerOnMap(marker, opacity);
      },
      function () {
        MapBase.updateLoopAvailable = true;
        MapBase.requestLoopCancel = false;
        Menu.refreshItemsCounter();
      }
    );

    Layers.itemMarkersLayer.addTo(MapBase.map);
    Layers.pinsLayer.addTo(MapBase.map);

    MapBase.addFastTravelMarker();

    Treasures.addToMap();
    Encounters.addToMap();
    MadamNazar.addMadamNazar();

    if (refreshMenu) {
      Menu.refreshMenu();
    }
    else {
      Routes.generatePath();
      return;
    }

    if (Routes.generateOnVisit)
      Routes.generatePath(true);

    MapBase.loadImportantItems();
  },

  loadWeeklySet: function () {
    $.getJSON('data/weekly.json?nocache=' + nocache)
      .done(function (data) {
        weeklySetData = data;

        var _weekly = getParameterByName('weekly');
        if (_weekly != null) {
          if (weeklySetData.sets[_weekly]) {
            weeklySetData.current = _weekly;
          }
        }
      });
    console.info('%c[Weekly Sets] Loaded!', 'color: #bada55; background: #242424');
  },

  removeItemFromMap: function (day, text, subdata, category, skipInventory = false) {
    if (text.endsWith('_treasure')) {
      if (Treasures.enabledTreasures.includes(text))
        Treasures.enabledTreasures = $.grep(Treasures.enabledTreasures, function (treasure) {
          return treasure !== text;
        });
      else
        Treasures.enabledTreasures.push(text);

      $(`[data-type=${text}]`).toggleClass('disabled');

      Treasures.addToMap();
      Treasures.save();
    } else {
      var markers = MapBase.markers.filter(function (marker) {
        return marker.day == day && (marker.text == text || marker.subdata == subdata);
      });

      if (markers == null) return;

      var subdataCategoryIsDisabled = (text == subdata && !$(`[data-type=${subdata}]`).hasClass('disabled'));

      $.each(markers, function (key, marker) {
        if (text != subdata && marker.text != text) return;

        if (marker.day == Cycles.categories[marker.category]) {
          var changeAmount = 0;

          if ((marker.subdata == subdata && subdataCategoryIsDisabled) || marker.canCollect) {
            marker.isCollected = true;
            marker.canCollect = false;
            changeAmount = 1;
          } else {
            marker.isCollected = false;
            marker.canCollect = true;
            changeAmount = -1;
          }

          if (Inventory.isEnabled) {
            Inventory.changeMarkerAmount(marker.subdata || marker.text, changeAmount, skipInventory);
            marker.canCollect = marker.canCollect && Inventory.stackHasSpace(marker);
          }
        }

        if (marker.canCollect) {
          $(`[data-marker=${marker.text}]`).css('opacity', Settings.markerOpacity);
          $(`[data-type=${marker.subdata || marker.text}]`).removeClass('disabled');
        } else {
          $(`[data-marker=${marker.text}]`).css('opacity', Settings.markerOpacity / 3);
          $(`[data-type=${marker.subdata || marker.text}]`).addClass('disabled');
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

      if (subdata != '' && day != null && day == Cycles.categories[category]) {
        if ((markers.length == 1 && !markers[0].canCollect) || markers.every(function (marker) { return !marker.canCollect; })) {
          $(`[data-type=${subdata}]`).addClass('disabled');
        } else {
          $(`[data-type=${subdata}]`).removeClass('disabled');
        }
      }
    }

    if (Routes.ignoreCollected)
      Routes.generatePath();

    Menu.refreshItemsCounter();
    MapBase.saveCollectedItems();
  },

  loadCollectedItems: function () {
    MapBase.collectedItems = JSON.parse(localStorage.getItem("collected-items"));
    if (MapBase.collectedItems === null) MapBase.collectedItems = {};
  },

  saveCollectedItems: function () {
    $.each(MapBase.markers, function (key, marker) {
      if (marker.category == 'random') return;
      if (marker.day != Cycles.categories[marker.category]) return;

      MapBase.collectedItems[marker.text] = marker.isCollected;
    });

    localStorage.setItem("collected-items", JSON.stringify(MapBase.collectedItems));
  },

  getIconColor: function (value) {
    switch (value) {
      case "day_1":
        return "blue";
      case "day_2":
        return "orange";
      case "day_3":
        return "purple";
      case "day_4":
        return "darkpurple";
      case "day_5":
        return "darkred";
      case "day_6":
        return "darkblue";
      case "weekly":
        return "green";
      default:
        return "lightred";
    }
  },

  getFixedIconColorPerCategory: function (markerCategory) {
    switch (markerCategory) {
      case "american_flowers":
        return "darkred";
      case "card_cups":
        return "blue";
      case "card_swords":
        return "blue";
      case "card_wands":
        return "blue";
      case "card_pentacles":
        return "blue";
      case "lost_bracelet":
        return "orange";
      case "lost_necklaces":
        return "orange";
      case "lost_ring":
        return "orange";
      case "lost_earrings":
        return "orange";
      case "antique_bottles":
        return "cadetblue";
      case "bird_eggs":
        return "white";
      case "arrowhead":
        return "darkpurple";
      case "family_heirlooms":
        return "purple";
      case "coin":
        return "orange";
      case "weekly":
        return "green";
      default:
        return "lightred";
    }
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

  getToolIcon: function (type) {
    switch (type) {
      case '-1':
        return '<img class="tool-type" src="assets/images/cross.png">';
      default:
      case '0':
        return '';
      case '1':
        return '<img class="tool-type" src="assets/images/shovel.png">';
      case '2':
        return '<img class="tool-type" src="assets/images/magnet.png">';
    }
  },

  updateMarkerContent: function (marker) {
    var popupContent = '';

    var warningText = Cycles.isSameAsYesterday(marker.category) ? `<span class="marker-warning-wrapper"><div><img class="warning-icon" src="./assets/images/same-cycle-alert.png" alt="Alert"></div><p>${Language.get("map.same_cycle_yesterday")}</p></span>` : '';

    if (marker.day == Cycles.unknownCycleNumber)
      warningText = `<span class="marker-warning-wrapper"><div><img class="warning-icon" src="./assets/images/same-cycle-alert.png" alt="Alert"></div><p>${Language.get("map.unknown_cycle_description").replace('{GitHub}', '<a href="https://github.com/jeanropke/RDR2CollectorsMap/issues" target="_blank">GitHub</a>').replace('{Discord}', '<a href="https://discord.gg/WWru8cP" target="_blank">Discord</a>')}</p></span>`;

    if (marker.category != 'random') {
      var weeklyText = marker.weeklyCollection != null ? Language.get("weekly.desc").replace('{collection}', Language.get('weekly.desc.' + marker.weeklyCollection)) : '';
      popupContent += (marker.tool == '-1' ? Language.get('map.item.unable') : '') + ' ' + marker.description + ' ' + weeklyText;
    } else {
      // Todo: Maybe make this link translatable on the Wiki?
      popupContent += Language.get('map.random_spot.desc').replace('{link}', `<a href="https://github.com/jeanropke/RDR2CollectorsMap/wiki/Random-Item-Possible-Loot" target="_blank">${Language.get('map.random_spot.link')}</a>`);
    }

    var shareText = `<a href="javascript:void(0)" onclick="setClipboardText('https://jeanropke.github.io/RDR2CollectorsMap/?m=${marker.text}')">${Language.get('map.copy_link')}</a>`;
    var videoText = marker.video != null ? ' | <a href="' + marker.video + '" target="_blank">' + Language.get('map.video') + '</a>' : '';
    var importantItem = ((marker.subdata != 'agarita' && marker.subdata != 'blood_flower') ? ` | <a href="javascript:void(0)" onclick="MapBase.highlightImportantItem('${marker.text || marker.subdata}', '${marker.category}')">${Language.get('map.mark_important')}</a>` : '');

    var linksElement = $('<p>').addClass('marker-popup-links').append(shareText).append(videoText).append(importantItem);
    var debugDisplayLatLng = $('<small>').text(`Latitude: ${marker.lat} / Longitude: ${marker.lng}`);

    var buttons = marker.category == 'random' ? '' : `<div class="marker-popup-buttons">
    <button class="btn btn-danger" onclick="Inventory.changeMarkerAmount('${marker.subdata || marker.text}', -1)">↓</button>
    <small data-item="${marker.text}">${marker.amount}</small>
    <button class="btn btn-success" onclick="Inventory.changeMarkerAmount('${marker.subdata || marker.text}', 1)">↑</button>
    </div>`;

    return `<h1>${marker.title} - ${Language.get("menu.day")} ${(marker.day != Cycles.unknownCycleNumber ? marker.day : Language.get('map.unknown_cycle'))}</h1>
        ${warningText}
        <span class="marker-content-wrapper">
        <div>${MapBase.getToolIcon(marker.tool)}</div>
        <p>${popupContent}</p>
        </span>
        ${linksElement.prop('outerHTML')}
        ${Settings.isDebugEnabled ? debugDisplayLatLng.prop('outerHTML') : ''}
        ${(Inventory.isEnabled && Inventory.isPopupEnabled) ? buttons : ''}
        <button type="button" class="btn btn-info remove-button" onclick="MapBase.removeItemFromMap('${marker.day || ''}', '${marker.text || ''}', '${marker.subdata || ''}', '${marker.category || ''}')" data-item="${marker.text}">${Language.get("map.remove_add")}</button>
        `;
  },

  addMarkerOnMap: function (marker, opacity = 1) {
    if (marker.day != Cycles.categories[marker.category] && !Settings.showAllMarkers) return;

    if (!uniqueSearchMarkers.includes(marker))
      return;

    if (!enabledCategories.includes(marker.category)) return;

    var toolType = parseInt(Settings.toolType);
    var markerTool = parseInt(marker.tool);
    if (toolType > 0) {
      if (toolType < markerTool) return;
    } else {
      if (toolType == -1 && markerTool != 1) return;
      if (toolType == -2 && markerTool != 2) return;
    }

    var isWeekly = weeklySetData.sets[weeklySetData.current].filter(weekly => {
      return weekly.item === (marker.text).replace(/_\d+/, "");
    }).length > 0;

    var overlay = '';
    var markerBackgroundColor = (Settings.markersCustomColor === 7
      ? MapBase.getFixedIconColorPerCategory(isWeekly ? 'weekly' : marker.category)
      : MapBase.getIconColor(isWeekly ? 'weekly' : 'day_' + (Settings.markersCustomColor === 0 ? marker.day : Settings.markersCustomColor)));

    var icon = `./assets/images/icons/${marker.category}.png`;
    var background = `./assets/images/icons/marker_${markerBackgroundColor}.png`;
    var shadow = Settings.isShadowsEnabled ? '<img class="shadow" width="' + 35 * Settings.markerSize + '" height="' + 16 * Settings.markerSize + '" src="./assets/images/markers-shadow.png" alt="Shadow">' : '';

    // Random items override
    if (marker.category == 'random') {
      icon = `./assets/images/icons/${MapBase.getToolName(marker.tool)}.png`;
      background = './assets/images/icons/marker_lightgray.png';
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
    if (marker.subdata == 'agarita' || marker.subdata == 'blood_flower') {
      overlay = '<img class="overlay" src="./assets/images/icons/overlay_time.png" alt="Overlay">';
    }

    var tempMarker = L.marker([marker.lat, marker.lng], {
      opacity: marker.canCollect ? opacity : opacity / 3,
      icon: new L.DivIcon.DataMarkup({
        iconSize: [35 * Settings.markerSize, 45 * Settings.markerSize],
        iconAnchor: [17 * Settings.markerSize, 42 * Settings.markerSize],
        popupAnchor: [0 * Settings.markerSize, -28 * Settings.markerSize],
        html: `
          ${overlay}
          <img class="icon" src="${icon}" alt="Icon">
          <img class="background" src="${background}" alt="Background">
          ${shadow}
        `,
        marker: marker.text
      })
    });

    tempMarker.id = marker.text;
    marker.isVisible = true;
    marker.weeklyCollection = isWeekly ? weeklySetData.current : null;

    if (marker.category == 'random')
      marker.title = `${Language.get("random_item.name")} #${marker.text.split('_').pop()}`;
    else if (marker.category == 'american_flowers')
      marker.title = `${Language.get(`flower_${marker.subdata}.name`)} #${marker.text.split('_').pop()}`;
    else if (marker.category == 'bird_eggs' && (marker.subdata == 'eagle' || marker.subdata == 'hawk'))
      marker.title = `${Language.get(`egg_${marker.subdata}.name`)} #${marker.text.split('_').pop()}`;
    else
      marker.title = Language.get(`${marker.text}.name`);

    if (marker.subdata == 'agarita' || marker.subdata == 'blood_flower')
      marker.description = Language.get(`${marker.text}_${marker.day}.desc`) + ' ' + Language.get('map.flower_type.night_only');
    else if (marker.subdata == 'creek_plum')
      marker.description = Language.get(`${marker.text}_${marker.day}.desc`) + ' ' + Language.get('map.flower_type.bush');
    else if (marker.subdata == 'spoonbill' || marker.subdata == 'heron' || marker.subdata == 'eagle' || marker.subdata == 'hawk' || marker.subdata == 'egret')
      marker.description = Language.get(`${marker.text}_${marker.day}.desc`) + ' ' + Language.get('map.egg_type.tree');
    else if (marker.subdata == 'vulture')
      marker.description = Language.get(`${marker.text}_${marker.day}.desc`) + ' ' + Language.get('map.egg_type.stump');
    else if (marker.subdata == 'duck' || marker.subdata == 'goose' || marker.subdata == 'loon')
      marker.description = Language.get(`${marker.text}_${marker.day}.desc`) + ' ' + Language.get('map.egg_type.ground');
    else
      marker.description = Language.get(`${marker.text}_${marker.day}.desc`);

    if (Settings.isPopupsEnabled) {
      tempMarker.bindPopup(MapBase.updateMarkerContent(marker), { minWidth: 300, maxWidth: 400 });
    }

    tempMarker.on("click", function (e) {
      if (!Settings.isPopupsEnabled) MapBase.removeItemFromMap(marker.day || '', marker.text || '', marker.subdata || '', marker.category || '');

      Routes.addMarkerOnCustomRoute(marker.text);
      if (Routes.customRouteEnabled) e.target.closePopup();
    });

    tempMarker.on("contextmenu", function (e) {
      MapBase.removeItemFromMap(marker.day || '', marker.text || '', marker.subdata || '', marker.category || '');
    });

    Layers.itemMarkersLayer.addLayer(tempMarker);
    if (Settings.markerCluster)
      Layers.oms.addMarker(tempMarker);

    MapBase.loadImportantItems();
  },

  gameToMap: function (lat, lng, name = "Debug Marker") {
    MapBase.debugMarker((0.01552 * lng + -63.6), (0.01552 * lat + 111.29), name);
  },

  game2Map: function ({ x, y, z }) {
    MapBase.debugMarker((0.01552 * y + -63.6), (0.01552 * x + 111.29), z);
  },

  highlightImportantItem(text, category) {
    if (category === 'american_flowers' || category === 'bird_eggs')
      text = text.replace(/(egg_|flower_)(\w+)(_\d)/, '$2');

    $(`[data-type=${text}]`).toggleClass('highlight-important-items-menu');

    if (text === 'eagle') // prevent from highlight eagle coins and eggs together
      text = 'egg_eagle';

    $(`[data-marker*=${text}]`).toggleClass('highlight-items');

    if ($(`[data-marker*=${text}].highlight-items`).length)
      MapBase.importantItems.push(text);
    else
      MapBase.importantItems.splice(MapBase.importantItems.indexOf(text), 1);

    $.each(localStorage, function (key) {
      localStorage.removeItem('importantItems');
    });

    localStorage.setItem('importantItems', JSON.stringify(MapBase.importantItems));
  },

  loadImportantItems() {
    if (localStorage.importantItems === undefined)
      localStorage.importantItems = "[]";

    MapBase.importantItems = JSON.parse(localStorage.importantItems) || [];

    $.each(MapBase.importantItems, function (key, value) {
      $(`[data-marker*=${value}]`).addClass('highlight-items');
      $(`[data-type=${value}]`).addClass('highlight-important-items-menu');
    });
  },

  loadFastTravels: function () {
    $.getJSON('data/fasttravels.json?nocache=' + nocache)
      .done(function (data) {
        fastTravelData = data;
      });
    console.info('%c[Fast travels] Loaded!', 'color: #bada55; background: #242424');
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
    var customMarkerName = ($('#debug-marker-name').val() != '' ? $('#debug-marker-name').val() : name);
    marker.bindPopup(`<h1>${customMarkerName}</h1><p>Lat.: ${lat}<br>Long.: ${long}</p>`, { minWidth: 300 });
    Layers.itemMarkersLayer.addLayer(marker);
    var tempArray = [];
    tempArray.push(lat || 0, long || 0, customMarkerName);
    debugMarkersArray.push(tempArray);
  },

  addCoordsOnMap: function (coords) {
    // Show clicked coordinates (like google maps)
    if (Settings.isCoordsEnabled) {
      $('.lat-lng-container').css('display', 'block');

      $('.lat-lng-container p').html(`Latitude: ${parseFloat(coords.latlng.lat.toFixed(4))}<br>Longitude: ${parseFloat(coords.latlng.lng.toFixed(4))}`);

      $('#lat-lng-container-close-button').click(function () {
        $('.lat-lng-container').css('display', 'none');
      });
    }

    if (Settings.isPinsPlacingEnabled)
      Pins.addPin(coords.latlng.lat, coords.latlng.lng);
  },

  formatDate: function (date) {
    var pad = (e, s) => (1e3 + e + '').slice(-s);
    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var _day = date.split('/')[2];
    var _month = monthNames[date.split('/')[1] - 1];
    var _year = date.split('/')[0];
    return `${_month} ${pad(_day, 2)} ${_year}`;
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