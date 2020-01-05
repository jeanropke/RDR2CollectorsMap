/**
 * Created by Jean on 2019-10-09.
 */

var Layers = {
  itemMarkersLayer: new L.LayerGroup(),
  miscLayer: new L.LayerGroup(),
  encountersLayer: new L.LayerGroup(),
  oms: null
};

var MapBase = {
  minZoom: 2,
  maxZoom: 7,
  map: null,
  overlays: [],
  markers: [],

  init: function () {
    var southWestTiles = L.latLng(-144, 0),
      northEastTiles = L.latLng(0, 176),
      boundsTiles = L.latLngBounds(southWestTiles, northEastTiles);

    var mapLayers = [];
    mapLayers['Default'] = L.tileLayer('https://s.rsg.sc/sc/images/games/RDR2/map/game/{z}/{x}/{y}.jpg', {
      noWrap: true,
      bounds: boundsTiles
    });
    mapLayers['Detailed'] = L.tileLayer('assets/maps/detailed/{z}/{x}_{y}.jpg', {
      noWrap: true,
      bounds: boundsTiles
    });
    mapLayers['Dark'] = L.tileLayer('assets/maps/darkmode/{z}/{x}_{y}.jpg', {
      noWrap: true,
      bounds: boundsTiles
    });

    MapBase.map = L.map('map', {
      preferCanvas: true,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
      zoomControl: false,
      crs: L.CRS.Simple,
      layers: [mapLayers[$.cookie('map-layer')]]
    }).setView([-70, 111.75], 3);

    var baseMapsLayers = {
      "Default": mapLayers['Default'],
      "Detailed": mapLayers['Detailed'],
      "Dark": mapLayers['Dark']
    };

    L.control.zoom({
      position: 'bottomright'
    }).addTo(MapBase.map);

    L.control.layers(baseMapsLayers).addTo(MapBase.map);

    MapBase.map.on('click', function (e) {
      MapBase.addCoordsOnMap(e);
    });

    MapBase.map.on('baselayerchange', function (e) {
      setMapBackground(e.name);
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
    $.each(data, function (_category, _cycles) {
      $.each(_cycles, function (day, _markers) {
        $.each(_markers, function (key, marker) {
          MapBase.markers.push(new Marker(marker.text, marker.lat, marker.lng, marker.tool, day, _category, marker.subdata, marker.video, true));

        });
      });
    });
    uniqueSearchMarkers = MapBase.markers;
    MapBase.addMarkers(true);

    if (goTo = MapBase.markers.filter(_m => _m.text == getParameterByName('m') && _m.day == Cycles.data.cycles[Cycles.data.current][_m.category])[0]) {
      MapBase.map.setView([goTo.lat, goTo.lng], 6);
      if (Layers.itemMarkersLayer.getLayerById(goTo.text) == null) {
        enabledCategories.push(goTo.category);
        MapBase.addMarkers();
        $(`[data-type="${goTo.category}"]`).removeClass('disabled');
      }
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

    MapBase.addFastTravelMarker(!refreshMenu);
    MapBase.addMadamNazar(refreshMenu);

    Menu.refreshItemsCounter();
    Treasures.addToMap();
    Encounters.addToMap();

    if (refreshMenu)
      Menu.refreshMenu();

    if (Routes.generateOnVisit)
      Routes.generatePath();
  },

  loadWeeklySet: function () {
    $.getJSON('data/weekly.json?nocache=' + nocache)
      .done(function (data) {
        weeklySetData = data;
      });

    console.log('weekly sets loaded');
  },

  removeItemFromMap: function (itemName, category) {
    if (itemName.endsWith('_treasure')) {

      if (Treasures.enabledTreasures.includes(itemName))
        Treasures.enabledTreasures = $.grep(Treasures.enabledTreasures, function (treasure) {
          return treasure !== itemName;
        });
      else
        Treasures.enabledTreasures.push(itemName);

      $(`[data-type=${itemName}]`).toggleClass('disabled');

      Treasures.addToMap();
      Treasures.save();
    } else {
      var _marker = MapBase.markers.filter(function (marker) {
        return (marker.text == itemName || (marker.subdata == category));
      });

      if (_marker == null)
        return;

      var isDisabled = $(`[data-type=${category}]`).hasClass('disabled');
      $.each(_marker, function (key, marker) {

        if (marker.text != itemName && (marker.subdata != category || (_marker.length > 1 && itemName != category)))
          return;

        if (itemName == category && marker.subdata == category) {
          if (!isDisabled) {
            if (marker.day == Cycles.data.cycles[Cycles.data.current][marker.category]) {
              marker.isCollected = true;
              Inventory.changeMarkerAmount(marker.subdata || marker.text, 1);
            }
            $('[data-marker=' + marker.text + ']').css('opacity', '.35');
            $(`[data-type=${marker.subdata || marker.text}]`).addClass('disabled');
            marker.canCollect = false;
          }
          else {
            if (marker.day == Cycles.data.cycles[Cycles.data.current][marker.category]) {
              marker.isCollected = false;
              Inventory.changeMarkerAmount(marker.subdata || marker.text, -1);
            }
            $('[data-marker=' + marker.text + ']').css('opacity', '1');
            $(`[data-type=${marker.subdata}]`).removeClass('disabled');
            marker.canCollect = true;
          }
        }
        else {
          if (marker.canCollect) {
            if (marker.day == Cycles.data.cycles[Cycles.data.current][marker.category]) {
              marker.isCollected = true;
              Inventory.changeMarkerAmount(marker.subdata || marker.text, 1);
            }
            marker.canCollect = false;
          } else {
            if (marker.day == Cycles.data.cycles[Cycles.data.current][marker.category]) {
              marker.isCollected = false;
              Inventory.changeMarkerAmount(marker.subdata || marker.text, -1);
            }
            marker.canCollect = true;
          }
        }
      });
    }

    if (Routes.lastPolyline != null && Routes.ignoreCollected)
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
        return "darkgreen";
        break;
      case "day_7":
        return "cadetblue";
        break;
      case "day_8":
        return "lightred";
        break;
      case "day_9":
        return "darkblue";
        break;
      case "weekly":
        return "green";
        break;
    }
  },


  updateMarkerContent: function (marker) {
    var popupContent = null;

    if (marker.category == 'random') {
      popupContent = Language.get("random_item.desc");
    }
    else {
      var weeklyText = marker.weeklyCollection != null ? Language.get("weekly.desc").replace('{collection}', Language.get('weekly.desc.' + marker.weeklyCollection)) : '';
      popupContent = (marker.tool == '-1' ? Language.get('map.item.unable') : '') + ' ' + marker.description + ' ' + weeklyText;
    }

    var shareText = `<a href="javascript:void(0)" onclick="copyMarkerLink('https://jeanropke.github.io/RDR2CollectorsMap/?m=${marker.text}')">Copy marker link</a>`;
    var videoText = marker.video != null ? ' | <a href="' + marker.video + '" target="_blank">Video</a>' : '';
    var linksElement = $('<p>').addClass('marker-popup-links').append(shareText).append(videoText);

    var buttons = marker.category == 'random' ? '' : `<div class="marker-popup-buttons">
    <button class="btn btn-danger" onclick="Inventory.changeMarkerAmount('${marker.subdata || marker.text}', -1)">↓</button>
    <small data-item="${marker.text}">${marker.amount}</small>
    <button class="btn btn-success" onclick="Inventory.changeMarkerAmount('${marker.subdata || marker.text}', 1)">↑</button>
    </div>`;

    return `<h1>${marker.title} - ${Language.get("menu.day")} ${marker.day}</h1>
        <p>${MapBase.getToolIcon(marker.tool)} ${popupContent}</p>
        ${linksElement.prop('outerHTML')}
        ${Inventory.isEnabled ? buttons : ''}
        <button type="button" class="btn btn-info remove-button" onclick="MapBase.removeItemFromMap('${marker.text}', '${marker.subdata}')" data-item="${marker.text}">${Language.get("map.remove_add")}</button>
        `;
  },

  addMarkerOnMap: function (marker) {
    if (marker.day != Cycles.data.cycles[Cycles.data.current][marker.category] && !Settings.showAllMarkers) return;

    if (!uniqueSearchMarkers.includes(marker))
      return;

    if (!enabledCategories.includes(marker.category)) return;

    if (parseInt(toolType) < parseInt(marker.tool)) return;

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
    else if (marker.subdata == 'duck' || marker.subdata == 'goose')
      marker.description = Language.get(`${marker.text}_${marker.day}.desc`) + ' ' + Language.get('map.egg_type.ground');
    else
      marker.description = Language.get(`${marker.text}_${marker.day}.desc`);

    tempMarker.bindPopup(MapBase.updateMarkerContent(marker), { maxWidth: 400 })
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
  }
};

MapBase.getToolIcon = function (type) {
  switch (type) {
    default:
    case '0':
      return '';
      break;
    case '1':
      return '<img class="tool-type" src="assets/images/shovel.png">';
      break;
    case '2':
      return '<img class="tool-type" src="assets/images/magnet.png">';
      break;
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

      marker.bindPopup(`<h1> ${Language.get(value.text + '.name')}</h1><p>  </p>`);

      Layers.itemMarkersLayer.addLayer(marker);
    });
  }
};

MapBase.submitDebugForm = function () {
  var lat = $('input[name=debug-marker-lat]').val();
  var lng = $('input[name=debug-marker-lng]').val();
  if (!isNaN(lat) || !isNaN(lng))
    MapBase.debugMarker(lat, lng);
},

  MapBase.debugMarker = function (lat, long, name = 'Debug Marker') {
    var marker = L.marker([lat, long], {
      icon: L.icon({
        iconUrl: './assets/images/icons/random_darkblue.png',
        iconSize: [35, 45],
        iconAnchor: [17, 42],
        popupAnchor: [1, -32],
        shadowAnchor: [10, 12],
        shadowUrl: './assets/images/markers-shadow.png'

      })
    });
    var customMarkerName = ($('#debug-marker-name').val() != '' ? $('#debug-marker-name').val() : name);
    marker.bindPopup(`<h1>${customMarkerName}</h1><p>  </p>`);
    Layers.itemMarkersLayer.addLayer(marker);
  };

MapBase.addCoordsOnMap = function (coords) {
  // Show clicked coordinates (like google maps)
  if (Settings.isCoordsEnabled) {
    $('.lat-lng-container').css('display', 'block');

    $('.lat-lng-container p').html(`lat: ${coords.latlng.lat} <br> lng: ${coords.latlng.lng}`);

    $('#lat-lng-container-close-button').click(function () {
      $('.lat-lng-container').css('display', 'none');
    });
    // Auto fill debug markers inputs
    Menu.liveUpdateDebugMarkersInputs(coords.latlng.lat, coords.latlng.lng);
  }


  //console.log(`{"text": "_treasure", "x": "${coords.latlng.lat}", "y": "${coords.latlng.lng}", "radius": "5"},`);
  if (debugTool != null)
    console.log(`{"text": "random_item_", "day": ["1", "2", "3"], "tool": "${debugTool}", "icon": "random", "x": "${coords.latlng.lat}", "y": "${coords.latlng.lng}"},`);

};

MapBase.loadMadamNazar = function () {

  $.getJSON('https://pepegapi.jeanropke.net/rdo/nazar')
    .done(function (nazar) {
      nazarCurrentLocation = nazar.nazar_id - 1;
      nazarCurrentDate = nazar.date;
    }).always(function () {
      $.getJSON('data/nazar.json?nocache=' + nocache)
        .done(function (data) {
          nazarLocations = data;
          MapBase.addMadamNazar(false);
        });
    });
};

MapBase.addMadamNazar = function (firstLoad) {
  if (firstLoad)
    return;

  if (nazarCurrentLocation == null) {
    console.error('Unable to get Nazar position. Try again later.');
    return;
  }
  if (enabledCategories.includes('nazar')) {
    var marker = L.marker([nazarLocations[nazarCurrentLocation].x, nazarLocations[nazarCurrentLocation].y], {
      icon: L.icon({
        iconUrl: './assets/images/icons/nazar_red.png',
        iconSize: [35, 45],
        iconAnchor: [17, 42],
        popupAnchor: [1, -32],
        shadowAnchor: [10, 12],
        shadowUrl: './assets/images/markers-shadow.png'
      })
    });

    marker.bindPopup(`<h1>${Language.get('madam_nazar.name')} - ${MapBase.formatDate(nazarCurrentDate)}</h1><p>Wrong location? Follow <a href='https://twitter.com/MadamNazarIO' target="_blank">@MadamNazarIO</a>.</p>`);
    Layers.itemMarkersLayer.addLayer(marker);
  }
};
MapBase.formatDate = function (date) {
  var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var _day = date.split('/')[2];
  var _month = monthNames[date.split('/')[1] - 1];
  var _year = date.split('/')[0];
  return `${_month} ${_day}, ${_year}`;
};
