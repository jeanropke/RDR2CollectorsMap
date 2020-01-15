/**
 * Created by Jean on 2019-10-09.
 */

var Layers = {
  itemMarkersLayer: new L.LayerGroup(),
  miscLayer: new L.LayerGroup(),
  encountersLayer: new L.LayerGroup(),
  pinsLayer: new L.LayerGroup(),
  oms: null
};

var MapBase = {
  minZoom: 2,
  maxZoom: 7,
  map: null,
  overlays: [],
  markers: [],

  init: function () {
    var mapLayers = [
      L.tileLayer('https://s.rsg.sc/sc/images/games/RDR2/map/game/{z}/{x}/{y}.jpg', {
        noWrap: true,
        bounds: L.latLngBounds(L.latLng(-144, 0), L.latLng(0, 176))
      }),
      L.tileLayer('assets/maps/detailed/{z}/{x}_{y}.jpg', {
        noWrap: true,
        bounds: L.latLngBounds(L.latLng(-144, 0), L.latLng(0, 176))
      }),
      L.tileLayer('assets/maps/darkmode/{z}/{x}_{y}.jpg', {
        noWrap: true,
        bounds: L.latLngBounds(L.latLng(-144, 0), L.latLng(0, 176))
      })
    ];

    MapBase.map = L.map('map', {
      preferCanvas: true,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
      zoomControl: false,
      crs: L.CRS.Simple,
      layers: [mapLayers[parseInt($.cookie('map-layer'))]]
    }).setView([-70, 111.75], 3);

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
        MapBase.setOverlays();

        console.log('overlays loaded');
      });
  },

  setOverlays: function () {
    $.each(MapBase.overlays, function (key, value) {
      L.imageOverlay(value.img, value.bounds).addTo(MapBase.map);
    });
  },

  devGameToMap: function (t) {
    var image = [48841, 38666];
    var topLeft = [-7168, 4096];
    var bottomRight = [5120, -5632];

    var i = image[0]
      , n = image[1]
      , e = MapBase._normal_xy(topLeft, bottomRight)
      , s = MapBase._normal_xy(topLeft, t);
    console.log(t);
    return [i * (s[0] / e[0]), n * (s[1] / e[1])]
  },
  _normal_xy: function (t, i) {
    console.log(`MapBase._num_distance(${t[0]}, ${i[0]})`);
    return [MapBase._num_distance(t[0], i[0]), MapBase._num_distance(t[1], i[1])]
  },
  _num_distance: function (t, i) {
    return t > i ? t - i : i - t;
  },

  loadMarkers: function () {
    $.getJSON('data/items.json?nocache=' + nocache)
      .done(function (data) {
        MapBase.setMarkers(data);
      });
  },

  setMarkers: function (data) {
    console.log(`Categories disabled: ${categoriesDisabledByDefault}`);
    $.each(data, function (_category, _cycles) {
      $.each(_cycles, function (day, _markers) {
        $.each(_markers, function (key, marker) {
          MapBase.markers.push(new Marker(marker.text, marker.lat, marker.lng, marker.tool, day, _category, marker.subdata, marker.video, marker.loot_table));

        });
      });
    });
    uniqueSearchMarkers = MapBase.markers;
    MapBase.addMarkers(true);

    //if a marker is passed on url, check if is valid
    if (goTo = MapBase.markers.filter(_m => _m.text == getParameterByName('m') && _m.day == Cycles.data.cycles[Cycles.data.current][_m.category])[0]) {

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

  onSearch: function () {
    if (searchTerms.length == 0) {
      uniqueSearchMarkers = MapBase.markers;
    } else {
      Layers.itemMarkersLayer.clearLayers();
      var searchMarkers = [];
      uniqueSearchMarkers = [];
      $.each(searchTerms, function (id, term) {

        searchMarkers = searchMarkers.concat(MapBase.markers.filter(function (_marker) {
          if (_marker.title != null)
            return _marker.title.toLowerCase().includes(term.toLowerCase())
        }));

        $.each(searchMarkers, function (i, el) {
          if ($.inArray(el, uniqueSearchMarkers) === -1) uniqueSearchMarkers.push(el);
        });
      });

    }

    MapBase.addMarkers();
  },

  addMarkers: function (refreshMenu = false) {

    if (Layers.itemMarkersLayer != null)
      Layers.itemMarkersLayer.clearLayers();
    if (Layers.miscLayer != null)
      Layers.miscLayer.clearLayers();

    $.each(MapBase.markers, function (key, marker) {
      //Set isVisible to false. addMarkerOnMap will set to true if needs
      marker.isVisible = false;

      if (marker.subdata != null)
        if (categoriesDisabledByDefault.includes(marker.subdata))
          return;

      MapBase.addMarkerOnMap(marker);
    });

    Layers.itemMarkersLayer.addTo(MapBase.map);
    Layers.pinsLayer.addTo(MapBase.map);

    MapBase.addFastTravelMarker();
    MadamNazar.addMadamNazar(refreshMenu);

    Menu.refreshItemsCounter();
    Treasures.addToMap();
    Encounters.addToMap();

    if (refreshMenu)
      Menu.refreshMenu();
    else {
      Routes.generatePath();
      return;
    }

    if (Routes.generateOnVisit)
      Routes.generatePath(true);
  },

  loadWeeklySet: function () {
    $.getJSON('data/weekly.json?nocache=' + nocache)
      .done(function (data) {
        weeklySetData = data;
      });
    console.log('weekly sets loaded');
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
      var _marker = MapBase.markers.filter(function (marker) {
        return marker.day == day && (marker.text == text || marker.subdata == subdata);
      });

      if (_marker == null)
        return;

      var subdataCategoryIsDisabled = (text == subdata && !$(`[data-type=${subdata}]`).hasClass('disabled'));

      $.each(_marker, function (key, marker) {
        if (text != subdata && marker.text != text)
          return;

        if ((marker.subdata == subdata && subdataCategoryIsDisabled) || marker.canCollect) {
          if (marker.day == Cycles.data.cycles[Cycles.data.current][marker.category]) {
            marker.isCollected = true;

            Inventory.changeMarkerAmount(marker.subdata || marker.text, 1, skipInventory);
          }

          marker.canCollect = false;
        } else {
          if (marker.day == Cycles.data.cycles[Cycles.data.current][marker.category]) {
            marker.isCollected = false;

            Inventory.changeMarkerAmount(marker.subdata || marker.text, -1, skipInventory);
          }

          marker.canCollect = true;
        }
      });

      if (subdata != '' && day != null && day == Cycles.data.cycles[Cycles.data.current][category]) {
        if ((_marker.length == 1 && !_marker[0].canCollect) || _marker.every(function (marker) { return !marker.canCollect; })) {
          $(`[data-type=${subdata}]`).addClass('disabled');
        } else {
          $(`[data-type=${subdata}]`).removeClass('disabled');
        }
      }
    }

    if (Routes.ignoreCollected)
      Routes.generatePath();

    Menu.refreshItemsCounter();
  },

  getIconColor: function (value) {
    switch (value) {
      case "day_1":
        return "blue";
        break;
      case "day_2":
        return "orange";
        break;
      case "day_3":
        return "purple";
        break;
      case "day_4":
        return "darkpurple";
        break;
      case "day_5":
        return "darkred";
        break;
      case "day_6":
        return "darkblue";
        break;
      case "weekly":
        return "green";
        break;
      default:
        return "lightred";
        break;
    }
  },


  updateMarkerContent: function (marker) {
    var popupContent = '';

    var warningText = Cycles.isSameAsYesterday(marker.category) ? `<span class="marker-warning-wrapper"><div><img class="warning-icon" src="./assets/images/same-cycle-alert.png" alt="Alert"></div><p>${Language.get("map.same_cycle_yesterday")}</p></span>` : '';

    if (marker.category != 'random') {
      var weeklyText = marker.weeklyCollection != null ? Language.get("weekly.desc").replace('{collection}', Language.get('weekly.desc.' + marker.weeklyCollection)) : '';
      popupContent += (marker.tool == '-1' ? Language.get('map.item.unable') : '') + ' ' + marker.description + ' ' + weeklyText;
    } else {
      popupContent += Language.get('menu.loot_table.table_' + (marker.lootTable || 'unknown') + '.desc');
    }

    var shareText = `<a href="javascript:void(0)" onclick="setClipboardText('https://jeanropke.github.io/RDR2CollectorsMap/?m=${marker.text}')">${Language.get('map.copy_link')}</a>`;
    var lootText = marker.category == 'random' ? ` | <a href="javascript:void(0)" data-toggle="modal" data-target="#detailed-loot-modal" data-table="${marker.lootTable || 'unknown'}">${Language.get('menu.loot_table.view_loot')}</a>` : '';
    var videoText = marker.video != null ? ' | <a href="' + marker.video + '" target="_blank">' + Language.get('map.video') + '</a>' : '';
    var linksElement = $('<p>').addClass('marker-popup-links').append(shareText).append(lootText).append(videoText);

    var buttons = marker.category == 'random' ? '' : `<div class="marker-popup-buttons">
    <button class="btn btn-danger" onclick="Inventory.changeMarkerAmount('${marker.subdata || marker.text}', -1)">↓</button>
    <small data-item="${marker.text}">${marker.amount}</small>
    <button class="btn btn-success" onclick="Inventory.changeMarkerAmount('${marker.subdata || marker.text}', 1)">↑</button>
    </div>`;

    return `<h1>${marker.title} - ${Language.get("menu.day")} ${marker.day}</h1>
        ${warningText}
        <span class="marker-content-wrapper">
        <div>${MapBase.getToolIcon(marker.tool)}</div>
        <p>${popupContent}</p>
        </span>
        ${linksElement.prop('outerHTML')}
        ${(Inventory.isEnabled && Inventory.isPopupEnabled) ? buttons : ''}
        <button type="button" class="btn btn-info remove-button" onclick="MapBase.removeItemFromMap('${marker.day || ''}', '${marker.text || ''}', '${marker.subdata || ''}', '${marker.category || ''}')" data-item="${marker.text}">${Language.get("map.remove_add")}</button>
        `;
  },

  addMarkerOnMap: function (marker) {
    if (marker.day != Cycles.data.cycles[Cycles.data.current][marker.category] && !Settings.showAllMarkers) return;

    if (!uniqueSearchMarkers.includes(marker))
      return;

    if (!enabledCategories.includes(marker.category)) return;

    if (parseInt(Settings.toolType) < parseInt(marker.tool)) return;

    var isWeekly = weeklySetData.sets[weeklySetData.current].filter(weekly => {
      return weekly.item === (marker.text).replace(/_\d+/, "");
    }).length > 0;

    var tempMarker = L.marker([marker.lat, marker.lng], {
      opacity: marker.canCollect ? 1 : .35,
      icon: new L.Icon.DataMarkup({
        iconUrl: './assets/images/icons/' + marker.category + '_' + (marker.category == 'random' ? `lightgray_${marker.tool}` : MapBase.getIconColor(isWeekly ? 'weekly' : 'day_' + marker.day)) + '.png',
        iconSize: [35, 45],
        iconAnchor: [17, 42],
        popupAnchor: [1, -32],
        shadowAnchor: [10, 12],
        shadowUrl: './assets/images/markers-shadow.png',
        marker: marker.text
      })
    });


    tempMarker.id = marker.text;
    marker.isVisible = true;
    marker.weeklyCollection = isWeekly ? weeklySetData.current : null;

    if (marker.category == 'random')
      marker.title = `${Language.get("random_item.name")} #${marker.text.split('_').pop()}`
    else if (marker.category == 'american_flowers')
      marker.title = `${Language.get(`flower_${marker.subdata}.name`)} #${marker.text.split('_').pop()}`
    else if (marker.category == 'bird_eggs' && (marker.subdata == 'eagle' || marker.subdata == 'hawk'))
      marker.title = `${Language.get(`egg_${marker.subdata}.name`)} #${marker.text.split('_').pop()}`
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

    tempMarker.bindPopup(MapBase.updateMarkerContent(marker), { minWidth: 300, maxWidth: 400 })
      .on("click", function (e) {
        Routes.addMarkerOnCustomRoute(marker.text);
        if (Routes.customRouteEnabled) e.target.closePopup();
      });
    Layers.itemMarkersLayer.addLayer(tempMarker);
    if (Settings.markerCluster)
      Layers.oms.addMarker(tempMarker);
  },

  save: function () {
    //Before saving, remove previous cookies peepoSmart
    $.removeCookie('removed-items');
    $.each($.cookie(), function (key, value) {
      if (key.startsWith('removed-items')) {
        $.removeCookie(key)
      }
    });
    var temp = "";
    $.each(MapBase.markers, function (key, marker) {
      if (marker.day == Cycles.data.cycles[Cycles.data.current][marker.category] && (marker.amount > 0 || marker.isCollected))
        temp += `${marker.text}:${marker.isCollected ? '1' : '0'}:${marker.amount};`;
    });

    var collectedItemsArray = temp.match(/.{1,2000}/g);

    $.each(collectedItemsArray, function (key, value) {
      $.cookie('removed-items-' + key, value, {
        expires: 999
      });
    });
    console.log('saved');
  },
  gameToMap: function (lat, lng, name = "Debug Marker") {
    MapBase.debugMarker((0.01552 * lng + -63.6), (0.01552 * lat + 111.29), name);
  },
  game2Map: function ({x, y, z}) {
    MapBase.debugMarker((0.01552 * y + -63.6), (0.01552 * x + 111.29), z);
  }
};

MapBase.getToolIcon = function (type) {
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
};

MapBase.loadFastTravels = function () {
  $.getJSON('data/fasttravels.json?nocache=' + nocache)
    .done(function (data) {
      fastTravelData = data;
    });

  console.log('fast travels loaded');
};

MapBase.addFastTravelMarker = function () {
  if (enabledCategories.includes('fast_travel')) {
    $.each(fastTravelData, function (key, value) {

      var marker = L.marker([value.x, value.y], {
        icon: L.icon({
          iconUrl: './assets/images/icons/fast_travel_gray.png',
          iconSize: [35, 45],
          iconAnchor: [17, 42],
          popupAnchor: [1, -32],
          shadowAnchor: [10, 12],
          shadowUrl: './assets/images/markers-shadow.png'
        })
      });

      marker.bindPopup(`<h1>${Language.get(value.text + '.name')}</h1><p></p>`);

      Layers.itemMarkersLayer.addLayer(marker);
    });
  }
};

MapBase.submitDebugForm = function () {
  var lat = $('input[name=debug-marker-lat]').val();
  var lng = $('input[name=debug-marker-lng]').val();
  if (!isNaN(lat) || !isNaN(lng))
    MapBase.debugMarker(lat, lng);
};

MapBase.debugMarker = function (lat, long, name = 'Debug Marker') {
  var marker = L.marker([lat, long], {
    icon: L.icon({
      iconUrl: './assets/images/icons/random_lightred.png',
      iconSize: [35, 45],
      iconAnchor: [17, 42],
      popupAnchor: [1, -32],
      shadowAnchor: [10, 12],
      shadowUrl: './assets/images/markers-shadow.png'
    })
  });
  var customMarkerName = ($('#debug-marker-name').val() != '' ? $('#debug-marker-name').val() : name);
  marker.bindPopup(`<h1>${customMarkerName}</h1><p>Lat.: ${lat}<br>Long.: ${long}</p>`, { minWidth: 300 });
  Layers.itemMarkersLayer.addLayer(marker);
  var tempArray = [];
  tempArray.push(lat || 0, long || 0, customMarkerName);
  debugMarkersArray.push(tempArray);
};

MapBase.addCoordsOnMap = function (coords) {
  // Show clicked coordinates (like google maps)
  if (Settings.isCoordsEnabled) {
    $('.lat-lng-container').css('display', 'block');

    $('.lat-lng-container p').html(`Latitude: ${parseFloat(coords.latlng.lat.toFixed(4))}<br>Longitude: ${parseFloat(coords.latlng.lng.toFixed(4))}`);

    $('#lat-lng-container-close-button').click(function () {
      $('.lat-lng-container').css('display', 'none');
    });

    // Auto fill debug markers inputs
    Menu.liveUpdateDebugMarkersInputs(coords.latlng.lat, coords.latlng.lng);
  }

  if (Settings.isPinsPlacingEnabled)
    Pins.addPin(coords.latlng.lat, coords.latlng.lng);
};

MapBase.formatDate = function (date) {
  var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var _day = date.split('/')[2];
  var _month = monthNames[date.split('/')[1] - 1];
  var _year = date.split('/')[0];
  return `${_month} ${_day}, ${_year}`;
};

/**
 * Madam Nazar functions
 */
var MadamNazar = {

  possibleLocations: [],
  currentLocation: null,
  currentDate: null,

  loadMadamNazar: function () {
    $.getJSON('https://pepegapi.jeanropke.net/rdo/nazar')
      .done(function (nazar) {
        MadamNazar.currentLocation = nazar.nazar_id - 1;
        MadamNazar.currentDate = nazar.date;
      }).always(function () {
        $.getJSON('data/nazar.json?nocache=' + nocache)
          .done(function (data) {
            MadamNazar.possibleLocations = data;
            MadamNazar.addMadamNazar(false);
          });
      });
  },

  addMadamNazar: function (firstLoad) {
    if (firstLoad)
      return;

    if (MadamNazar.currentLocation == null) {
      console.error('Unable to get Nazar position. Try again later.');
      return;
    }
    if (enabledCategories.includes('nazar')) {
      var marker = L.marker([MadamNazar.possibleLocations[MadamNazar.currentLocation].x, MadamNazar.possibleLocations[MadamNazar.currentLocation].y], {
        icon: L.icon({
          iconUrl: './assets/images/icons/nazar_red.png',
          iconSize: [35, 45],
          iconAnchor: [17, 42],
          popupAnchor: [1, -32],
          shadowAnchor: [10, 12],
          shadowUrl: './assets/images/markers-shadow.png'
        })
      });

      marker.bindPopup(`<h1>${Language.get('menu.madam_nazar')} - ${MapBase.formatDate(MadamNazar.currentDate)}</h1><p style="text-align: center;">${Language.get('map.madam_nazar.desc').replace('{link}', '<a href="https://twitter.com/MadamNazarIO" target="_blank">@MadamNazarIO</a>')}</p>`, { minWidth: 300 });
      Layers.itemMarkersLayer.addLayer(marker);
    }
  }
}
