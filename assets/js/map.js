/**
 * Created by Jean on 2019-10-09.
 */

var Map = {
    minZoom: 2,
    maxZoom: 7
};

Map.init = function ()
{
    var southWestTiles = L.latLng(-144, 0),
        northEastTiles = L.latLng(0, 176),
        boundsTiles = L.latLngBounds(southWestTiles, northEastTiles);

    var mapLayers = [];
    mapLayers['Default'] = L.tileLayer('https://s.rsg.sc/sc/images/games/RDR2/map/game/{z}/{x}/{y}.jpg', { noWrap: true, bounds: boundsTiles });
    mapLayers['Detailed'] = L.tileLayer('assets/maps/detailed/{z}/{x}_{y}.jpg', { noWrap: true, bounds: boundsTiles});
    mapLayers['Dark'] = L.tileLayer('assets/maps/darkmode/{z}/{x}_{y}.jpg', { noWrap: true, bounds: boundsTiles});

    map = L.map('map', {
        preferCanvas: true,
        minZoom: Map.minZoom,
        maxZoom: Map.maxZoom,
        zoomControl: false,
        crs: L.CRS.Simple,
        layers: [mapLayers[$.cookie('map-layer')]]
    }).setView([-70, 111.75], 3);

    var baseMaps = {
        "Default": mapLayers['Default'],
        "Detailed": mapLayers['Detailed'],
        "Dark": mapLayers['Dark']
    };

    L.control.zoom({
        position:'bottomright'
    }).addTo(map);

    L.control.layers(baseMaps).addTo(map);

    map.on('click', function (e)
    {
       Map.addCoordsOnMap(e);
    });

    map.on('popupopen', function()
    {
        $('.remove-button').click(function(e)
        {
            Map.removeItemFromMap($(event.target).data("item"));
        });
    });

    map.on('baselayerchange', function (e)
    {
        setMapBackground(e.name);
    });

    var southWest = L.latLng(-170.712, -25.227),
        northEast = L.latLng(10.774, 200.125),
        bounds = L.latLngBounds(southWest, northEast);

    map.setMaxBounds(bounds);
    Map.loadWeeklySet();
};

Map.loadMarkers = function()
{
    markers = [];
    $.getJSON('data/items.json?nocache='+nocache)
        .done(function(data) {
            markers = data;
            Map.addMarkers();
        });
};

Map.addMarkers = function() {

    markersLayer.clearLayers();

    visibleMarkers = [];
    $.each(markers, function (key, value)
    {

        if(parseInt(toolType) < parseInt(value.tool) && toolType !== "3")
            return;

        if(enabledTypes.includes(value.icon))
        {
            if (value.day == day || $.cookie('ignore-days') == 'true')
            {
                if (languageData[value.text+'.name'] == null)
                {
                    console.error('[LANG]['+lang+']: Text not found: '+value.text);
                }

                if (searchTerms.length > 0)
                {
                    $.each(searchTerms, function (id, term)
                    {
                        if (languageData[value.text+'.name'].toLowerCase().indexOf(term.toLowerCase()) !== -1)
                        {
                            if (visibleMarkers[value.text] == null)
                            {
                                Map.addMarkerOnMap(value);
                            }
                        }
                    });
                }
                else {
                    Map.addMarkerOnMap(value);
                }

            }
        }
    });

    markersLayer.addTo(map);
    Menu.refreshItemsCounter();

    Map.addFastTravelMarker();
    Map.setTreasures();
    Map.addMadamNazar();
    Map.removeCollectedMarkers();

    Menu.refreshMenu();

};

Map.loadWeeklySet = function()
{
    $.getJSON('data/weekly.json?nocache='+nocache)
        .done(function(data) {
            weeklySetData = data[weeklySet];
            Map.loadFastTravels();
        });
};

Map.removeItemFromMap = function(itemName)
{

    if(itemName.endsWith('_treasure'))
    {
        if(treasureDisabled.includes(itemName.toString()))
        {
            treasureDisabled = $.grep(treasureDisabled, function (value)
            {
                return value != itemName.toString();
            });
        }
        else
        {
            treasureDisabled.push(itemName.toString());
        }
        Map.addTreasuresToMap();
    }
    else
    {
        if (disableMarkers.includes(itemName.toString())) {
            disableMarkers = $.grep(disableMarkers, function (value) {
                $.each(routesData, function (key, j) {
                    if (disableMarkers.includes(value.key)) {
                        delete value.hidden;
                    }
                });
                return value != itemName.toString();

            });

            if (visibleMarkers[itemName] == null)
                console.warn('[INFO]: \'' + itemName + '\' type is disabled!');
            else
                $(visibleMarkers[itemName]._icon).css('opacity', '1');

            $('[data-type=' + itemName + ']').removeClass('disabled');

        }
        else {
            disableMarkers.push(itemName.toString());
            $.each(routesData[day], function (b, value) {
                if (disableMarkers.includes(value.key)) {
                    value.hidden = true;
                }
            });
            if (visibleMarkers[itemName] == null)
                console.warn('[INFO]: \'' + itemName + '\' type is disabled!');
            else
                $(visibleMarkers[itemName]._icon).css('opacity', '0.35');
            $('[data-type=' + itemName + ']').addClass('disabled');
        }

        $.cookie('removed-items', disableMarkers.join(';'), {expires: resetMarkersDaily ? 1 : 999});

        if ($("#routes").val() == 1)
            Map.drawLines();

        Menu.refreshItemsCounter();
    }
};


Map.addMarkerOnMap = function(value)
{
    var isWeekly = weeklySetData.filter(weekly => {
            return weekly.item === value.text;
    }).length > 0;

    var tempMarker = L.marker([value.x, value.y], {icon: L.AwesomeMarkers.icon({iconUrl: './assets/images/icons/' + value.icon + '.png', markerColor: isWeekly ? 'green' : 'day_' + value.day})});

    tempMarker
      .bindPopup(
        '<h1>'+languageData[value.text + ".name"]+' - '+ languageData["menu.day"] + ' ' + value.day+'</h1>' +
        '<p>'+Map.getToolIcon(value.tool) + ' ' + languageData[value.text + "_" + value.day + ".desc"] +'</p>' +
        '<p align="center" style="padding: 5px;"><a href="'+value.gtaSeriesVideoYTLink+'" target="_blank">Video</a></p>' +
        '<p class="remove-button" data-item="'+value.text+'">'+languageData["map.remove_add"]+'</p>'
      )
      .on("click", function(e) {
        Routes.addMarkerOnCustomRoute(value.text);
        if (customRouteEnabled) e.target.closePopup();
      });

    visibleMarkers[value.text] = tempMarker;
    markersLayer.addLayer(tempMarker);
};

Map.getToolIcon = function (type) {
    switch(type)
    {
        case '0':
            return '';
            break;
        case '1':
            return '⛏';
            break;
        case '2':
            return '🧲';
            break;
    }
};

Map.removeCollectedMarkers = function()
{
    $.each(markers, function (key, value)
    {
        if(visibleMarkers[value.text] != null)
        {
            if (disableMarkers.includes(value.text.toString()))
            {
                $(visibleMarkers[value.text]._icon).css('opacity', '.35');
            }
            else
            {
                $(visibleMarkers[value.text]._icon).css('opacity', '1');
            }
        }
    });
};

Map.loadFastTravels = function () {
    $.getJSON('data/fasttravels.json?nocache='+nocache)
        .done(function(data) {
            fastTravelData = data;
            Map.loadMadamNazar();
        });
};

Map.addFastTravelMarker = function()
{
    if(enabledTypes.includes('fast-travel'))
    {
        $.each(fastTravelData, function (key, value)
        {
            var marker = L.marker([value.x, value.y], {
                icon: L.AwesomeMarkers.icon({
                    iconUrl: './assets/images/icons/fast-travel.png',
                    markerColor: 'gray'
                })
            });

            if (languageData[value.text+'.name'] == null) {
                console.error('[LANG]['+lang+']: Text not found: \''+value.text+'\'');
            }
            marker.bindPopup(`<h1> ${languageData[value.text+'.name']}</h1><p>  </p>`);

            markersLayer.addLayer(marker);
        });
    }
};

Map.debugMarker = function (lat, long)
{
    var marker = L.marker([lat, long], {
    icon: L.AwesomeMarkers.icon({
        iconUrl: './assets/images/icons/help.png',
        markerColor: 'darkblue'
    })
});

    marker.bindPopup(`<h1>Debug Marker</h1><p>  </p>`);
    markersLayer.addLayer(marker);
};

Map.addCoordsOnMap = function(coords)
{
    // Show clicked coordinates (like google maps)
    if (showCoordinates)
    {
        $('.lat-lng-container').css('display', 'block');

        $('.lat-lng-container p').html(`lat: ${coords.latlng.lat} <br> lng: ${coords.latlng.lng}`);

        $('#lat-lng-container-close-button').click(function() {
            $('.lat-lng-container').css('display', 'none');
        });
    }

    //console.log(`{"text": "_treasure", "x": "${coords.latlng.lat}", "y": "${coords.latlng.lng}", "radius": "5"},`);


};

Map.loadMadamNazar = function()
{
    $.getJSON('data/nazar.json?nocache='+nocache)
        .done(function(data) {
            nazarLocations = data;
            Map.loadTreasures();
    });
};

Map.addMadamNazar = function ()
{
    if(enabledTypes.includes('nazar'))
    {
        var marker = L.marker([nazarLocations[nazarCurrentLocation].x, nazarLocations[nazarCurrentLocation].y], {
            icon: L.AwesomeMarkers.icon({
                iconUrl: './assets/images/icons/nazar.png',
                markerColor: 'nazar'
            })
        });

        marker.bindPopup(`<h1>${languageData['madam_nazar.name']} - ${nazarCurrentDate}</h1><p>Wrong location? Follow <a href='https://twitter.com/MadamNazarIO' target="_blank">@MadamNazarIO</a>.</p>`);
        markersLayer.addLayer(marker);
    }
};

Map.loadTreasures = function() {
    $.getJSON('data/treasures.json?nocache='+nocache)
        .done(function (data) {
            treasureData = data;
            Map.loadMarkers();
    });
};

Map.setTreasures = function ()
{
    treasureMarkers = [];
    if(enabledTypes.includes('treasure')) {
        $.each(treasureData, function (key, value) {
            var circle = L.circle([value.x, value.y], {
                color: "#fff79900",
                fillColor: "#fff799",
                fillOpacity: 0.5,
                radius: value.radius
            });
            var marker = L.marker([value.x, value.y], {
                icon: L.AwesomeMarkers.icon({
                    iconUrl: './assets/images/icons/treasure.png',
                    markerColor: 'beige'
                })
            });

            if (languageData[value.text] == null) {
                console.error('[LANG]['+lang+']: Text not found: \''+value.text+'\'');
            }
            marker.bindPopup(`<h1> ${languageData[value.text]}</h1><p>  </p>`);

            treasureMarkers.push({treasure: value.text, marker: marker, circle: circle});
            treasureDisabled.push(value.text);
        });
        Map.addTreasuresToMap();
    }
};

Map.addTreasuresToMap = function () {

    treasuresLayer.clearLayers();

    $.each(treasureMarkers, function(key, value)
    {
        if(!treasureDisabled.includes(value.treasure)) {
            treasuresLayer.addLayer(value.marker);
            treasuresLayer.addLayer(value.circle);
        }
    });

    treasuresLayer.addTo(map);


};

Map.drawLines = function() {
    var connections = [];
    $.each(routesData[day], function(nodeKey, nodeValue)
    {

        var marker = markers.filter(item => {
            if(item.day == day)
                return item.text === nodeValue.key;
        })[0];//Need this 0 because its an array with 1 element

        if (marker.text == nodeValue.key && marker.day ==day && !disableMarkers.includes(nodeValue.key) && enabledTypes.includes(marker.icon))
        {
            var connection = [marker.x, marker.y];
            connections.push(connection);
        }
    });

    if (polylines instanceof L.Polyline)
    {
        map.removeLayer(polylines);
    }

    polylines = L.polyline(connections, {'color': '#9a3033'});
    map.addLayer(polylines);
};

