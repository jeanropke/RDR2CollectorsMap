/**
 * Created by Jean on 2019-10-09.
 */

var MapBase = {
  minZoom: 2,
  maxZoom: 7,

  init: function() {
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

    baseMap = L.map('map', {
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
    }).addTo(baseMap);

    L.control.layers(baseMapsLayers).addTo(baseMap);

    baseMap.on('click', function(e) {
      MapBase.addCoordsOnMap(e);
    });

    baseMap.on('popupopen', function() {
      $('.remove-button').click(function(e) {
        MapBase.removeItemFromMap($(event.target).data("item"));
      });
    });

    baseMap.on('baselayerchange', function(e) {
      setMapBackground(e.name);
    });

    var southWest = L.latLng(-170.712, -25.227),
      northEast = L.latLng(10.774, 200.125),
      bounds = L.latLngBounds(southWest, northEast);
    baseMap.setMaxBounds(bounds);
  },

  loadMarkers: function() {
    $.getJSON('data/items.json?nocache=' + nocache)
      .done(function(data) {
        MapBase.setMarkers(data);
      });
  },

  setMarkers: function(data) {
    $.each(data, function(_category, _markers) {
      $.each(_markers, function(key, marker) {
        markers.push(new Marker(marker.text, marker.x, marker.y, marker.tool, marker.day, _category, marker.subdata, marker.video, true));
      });
    });
    MapBase.addMarkers(true);
  },

  onSearch: function() {
    if (searchTerms.length > 0) {
      itemMarkersLayer.clearLayers();
      var searchMarkers = [];
      var uniqueMarkers = [];
      $.each(searchTerms, function(id, term) {

        searchMarkers = searchMarkers.concat(markers.filter(function(_marker) {
          return _marker.title.toLowerCase().includes(term.toLowerCase())
        }));

        $.each(searchMarkers, function(i, el) {
          if ($.inArray(el, uniqueMarkers) === -1) uniqueMarkers.push(el);
        });
      });

      $.each(uniqueMarkers, function(key, marker) {
        MapBase.addMarkerOnMap(marker);
      });
    } else {
      MapBase.addMarkers();
    }
  },

  addMarkers: function(refreshMenu = false) {

    itemMarkersLayer.clearLayers();

    $.each(markers, function(key, marker) {
      //Set isVisible to false. addMarkerOnMap will set to true if needs
      marker.isVisible = false;
      marker.isCollected = collectedItems.includes(marker.text);

      if (marker.subdata != null)
        if (plantsDisabled.includes(marker.subdata))
          return;

      MapBase.addMarkerOnMap(marker);
    });

    itemMarkersLayer.addTo(baseMap);

    MapBase.addFastTravelMarker(!refreshMenu);
    MapBase.addMadamNazar(refreshMenu);

    Menu.refreshItemsCounter();
    Treasures.addToMap();

    if (refreshMenu)
      Menu.refreshMenu();

  },

  loadWeeklySet: function() {
    $.getJSON('data/weekly.json?nocache=' + nocache)
      .done(function(data) {
        weeklySetData = data[weeklySet];
      });
  },

  removeItemFromMap: function(itemName) {

    if (itemName.endsWith('_treasure')) {
      if (collectedItems.includes(itemName.toString())) {
        collectedItems = $.grep(collectedItems, function(value) {
          return value != itemName.toString();
        });
      } else {
        collectedItems.push(itemName.toString());
      }
      Treasures.addToMap();
    } else {
      if (plantsCategories.includes(itemName)) {
        if (plantsDisabled.includes(itemName)) {
          plantsDisabled = $.grep(plantsDisabled, function(data) {
            return data != itemName;
          });
        } else {
          plantsDisabled.push(itemName);
        }
        //TODO: only re-add plants
        MapBase.addMarkers();
      } else {
        var marker = markers.filter(function(marker) {
          return marker.text == itemName && (marker.day == day || marker.day.includes(day));
        })[0];

        if (marker.isCollected) {
          collectedItems = $.grep(collectedItems, function(value) {
            return value != marker.text;
          });

          $('[data-marker=' + marker.text + ']').css('opacity', '1');
        } else {
          collectedItems.push(marker.text);

          $('[data-marker=' + marker.text + ']').css('opacity', '.35');
        }

        marker.isCollected = !marker.isCollected;
      }
    }
    $('[data-type=' + itemName + ']').toggleClass('disabled');

    if ($("#routes").val() == 1)
      Routes.drawLines();

    Menu.refreshItemsCounter();
    MapBase.save();
  },

  getIconColor: function(value) {
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
      case "weekly":
        return "green";
        break;
    }
  },

  addMarkerOnMap: function(marker) {
    if (marker.day != day && !marker.day.includes(day)) return;

    if (!enabledCategories.includes(marker.category)) return;

    if (parseInt(toolType) < parseInt(marker.tool)) return;

    var isWeekly = weeklySetData.filter(weekly => {
      return weekly.item === marker.text;
    }).length > 0;

    var tempMarker = L.marker([marker.lat, marker.lng], {
      opacity: marker.isCollected ? .35 : 1,
      icon: new L.Icon.DataMarkup({
        iconUrl: './assets/images/icons/' + marker.category + '_' + (marker.category == 'random' ? 'lightgray' : MapBase.getIconColor(isWeekly ? 'weekly' : 'day_' + day)) + '.png',
        iconSize: [35, 45],
        iconAnchor: [17, 42],
        popupAnchor: [1, -32],
        shadowAnchor: [10, 12],
        shadowUrl: './assets/images/markers-shadow.png',
        marker: marker.text
      })
    });
    marker.isVisible = true;

    marker.title = (marker.category == 'random') ? Language.get("random_item.name") + marker.text.replace('random_item_', '') : Language.get(`${marker.text}.name`);
    marker.description = Language.get(`${marker.text}_${day}.desc`);
    var videoText = marker.video != null ? '<p align="center" style="padding: 5px;"><a href="' + marker.video + '" target="_blank">Video</a></p>' : '';
    var popupTitle = `${marker.title} - ${Language.get("menu.day")} ${day}`;
    var popupContent = (marker.category == 'random') ? 'Random items resets 24 hours after picking up' : marker.description;

    tempMarker
      .bindPopup(
        '<h1>' + popupTitle + '</h1>' +
        '<p>' + MapBase.getToolIcon(marker.tool) + popupContent + '</p>' +
        videoText +
        '<p class="remove-button" data-item="' + marker.text + '">' + Language.get("map.remove_add") + '</p>'
      )
      .on("click", function(e) {
        Routes.addMarkerOnCustomRoute(marker.text);
        if (customRouteEnabled) e.target.closePopup();
      });
    itemMarkersLayer.addLayer(tempMarker);
  },

  save: function() {
    //Before saving, remove previous cookies peepoSmart
    $.removeCookie('removed-items');
    $.each($.cookie(), function(key, value) {
      if (key.startsWith('removed-items')) {
        $.removeCookie(key)
      }
    });
    var collectedItemsArray = collectedItems.join(';').replace(/;;/g, '').match(/.{1,3200}/g);

    $.each(collectedItemsArray, function(key, value) {
      $.cookie('removed-items-' + key, value, {
        expires: resetMarkersDaily ? 1 : 999
      });
    });
  }
};

MapBase.getToolIcon = function(type) {
  switch (type) {
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

MapBase.loadFastTravels = function() {
  $.getJSON('data/fasttravels.json?nocache=' + nocache)
    .done(function(data) {
      fastTravelData = data;
    });
};

MapBase.addFastTravelMarker = function() {
  if (enabledCategories.includes('fast_travel')) {
    $.each(fastTravelData, function(key, value) {

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

      marker.bindPopup(`<h1> ${Language.get(value.text+'.name')}</h1><p>  </p>`);

      itemMarkersLayer.addLayer(marker);
    });
  }
};

MapBase.debugMarker = function(lat, long) {
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

  marker.bindPopup(`<h1>Debug Marker</h1><p>  </p>`);
  itemMarkersLayer.addLayer(marker);
};

MapBase.addCoordsOnMap = function(coords) {
  // Show clicked coordinates (like google maps)
  if (showCoordinates) {
    $('.lat-lng-container').css('display', 'block');

    $('.lat-lng-container p').html(`lat: ${coords.latlng.lat} <br> lng: ${coords.latlng.lng}`);

    $('#lat-lng-container-close-button').click(function() {
      $('.lat-lng-container').css('display', 'none');
    });
  }

  //console.log(`{"text": "_treasure", "x": "${coords.latlng.lat}", "y": "${coords.latlng.lng}", "radius": "5"},`);
  if (debugTool != null)
    console.log(`{"text": "random_item_", "day": ["1", "2", "3"], "tool": "${debugTool}", "icon": "random", "x": "${coords.latlng.lat}", "y": "${coords.latlng.lng}"},`);

};

MapBase.loadMadamNazar = function() {

  $.getJSON('https://pepegapi.jeanropke.net/rdo/nazar')
    .done(function(nazar) {
      nazarCurrentLocation = nazar.nazar_id - 1;
      nazarCurrentDate = nazar.date;
    }).always(function() {
      $.getJSON('data/nazar.json?nocache=' + nocache)
        .done(function(data) {
          nazarLocations = data;
          MapBase.addMadamNazar(false);
        });
    });
};

MapBase.addMadamNazar = function(firstLoad) {
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
    itemMarkersLayer.addLayer(marker);
  }
};
MapBase.formatDate = function(date) {
  var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var _day = date.split('/')[2];
  var _month = monthNames[date.split('/')[1] - 1];
  var _year = date.split('/')[0];
  return `${_month} ${_day}, ${_year}`;
};
