/**
 * Created by Jean on 2019-10-09.
 */

var MapBase = {
    minZoom: 2,
    maxZoom: 7
};

MapBase.init = function ()
{
    var southWestTiles = L.latLng(-144, 0),
        northEastTiles = L.latLng(0, 176),
        boundsTiles = L.latLngBounds(southWestTiles, northEastTiles);

    var mapLayers = [];
    mapLayers['Default'] = L.tileLayer('https://s.rsg.sc/sc/images/games/RDR2/map/game/{z}/{x}/{y}.jpg', { noWrap: true, bounds: boundsTiles });
    mapLayers['Detailed'] = L.tileLayer('assets/maps/detailed/{z}/{x}_{y}.jpg', { noWrap: true, bounds: boundsTiles});
    mapLayers['Dark'] = L.tileLayer('assets/maps/darkmode/{z}/{x}_{y}.jpg', { noWrap: true, bounds: boundsTiles});

    baseMap = L.map('map', {
        preferCanvas: true,
        minZoom: MapBase.minZoom,
        maxZoom: MapBase.maxZoom,
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
        position:'bottomright'
    }).addTo(baseMap);

    L.control.layers(baseMapsLayers).addTo(baseMap);

    baseMap.on('click', function (e)
    {
       MapBase.addCoordsOnMap(e);
    });

    baseMap.on('popupopen', function()
    {
        $('.remove-button').click(function(e)
        {
            MapBase.removeItemFromMap($(event.target).data("item"));
        });
    });

    baseMap.on('baselayerchange', function (e)
    {
        setMapBackground(e.name);
    });

    var southWest = L.latLng(-170.712, -25.227),
        northEast = L.latLng(10.774, 200.125),
        bounds = L.latLngBounds(southWest, northEast);

    baseMap.setMaxBounds(bounds);

    miscMarkersLayer.addTo(baseMap);
};

MapBase.loadMarkers = function()
{
    markers = [];
    $.getJSON('data/items.json?nocache='+nocache)
        .done(function(data) {
            markers = data;
            MapBase.addMarkers(true);
        });
};

MapBase.addMarkers = function(refreshMenu = false) {

    itemMarkersLayer.clearLayers();

    visibleMarkers = [];
    $.each(enabledTypes, function (key, value)
    {
        $.each(markers[value], function(mKey, marker)
        {
            if(parseInt(toolType) < parseInt(marker.tool) && toolType !== "3")
                return;

            if(marker.subdata != null)
                if(plantsDisabled.includes(marker.subdata))
                    return;

            if (marker.day == day || marker.day.includes(day))
            {
                if (value != 'random' && languageData[lang][marker.text+'.name'] == null)
                {
                    console.error('[LANG]['+lang+']: Text not found: '+value.text);
                    return;
                }

                if (searchTerms.length > 0)
                {
                    $.each(searchTerms, function (id, term)
                    {
                        if(marker.title == null)
                            return;
                        if (marker.title.toLowerCase().indexOf(term.toLowerCase()) !== -1)
                        {
                            if (visibleMarkers[marker.text] == null)
                            {
                                MapBase.addMarkerOnMap(marker, value);
                            }
                        }
                    });
                }
                else {
                    MapBase.addMarkerOnMap(marker, value);
                }
            }

        });
    });

    itemMarkersLayer.addTo(baseMap);
    Menu.refreshItemsCounter();
    MapBase.removeCollectedMarkers();

    if(refreshMenu)
        Menu.refreshMenu();

};

MapBase.loadWeeklySet = function()
{
    $.getJSON('data/weekly.json?nocache='+nocache)
        .done(function(data) {
            weeklySetData = data[weeklySet];
        });
};

MapBase.removeItemFromMap = function(itemName)
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
        MapBase.addTreasuresToMap();
    }
    else
    {
        if(plantsCategories.includes(itemName))
        {
            if(plantsDisabled.includes(itemName)) {
                plantsDisabled = $.grep(plantsDisabled, function(data) {
                    return data != itemName;
                });
            }
            else {
                plantsDisabled.push(itemName);
            }
            MapBase.addMarkers();
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

                if (visibleMarkers[itemName] == null) {
                    console.warn('[INFO]: \'' + itemName + '\' type is disabled!');
                }
                else {
                    $(visibleMarkers[itemName]._icon).css('opacity', '1');
                }

                $('[data-type=' + itemName + ']').removeClass('disabled');

            }
            else
            {
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
        }

        var disabledMarkersString = disableMarkers.join(';').replace(/;;/g, '');

        if(disabledMarkersString.length > 3200)
        {
            $.cookie('removed-items', disabledMarkersString.substr(0, 3200), {expires: resetMarkersDaily ? 1 : 999});
            $.cookie('removed-items-2', disabledMarkersString.substr(3200, disabledMarkersString.length), {expires: resetMarkersDaily ? 1 : 999});
        }
        else {
            $.cookie('removed-items', disabledMarkersString, {expires: resetMarkersDaily ? 1 : 999});
        }

        if ($("#routes").val() == 1)
            MapBase.drawLines();

        Menu.refreshItemsCounter();
    }
};

MapBase.getIconColor = function (value)
{
    switch(value){
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
};

MapBase.addMarkerOnMap = function(value, category)
{
    var isWeekly = weeklySetData.filter(weekly => {
            return weekly.item === value.text;
    }).length > 0;

    var tempMarker = L.marker([value.x, value.y], {
        icon: L.icon(
            {
                iconUrl: './assets/images/icons/' + category + '_' + MapBase.getIconColor(isWeekly ? 'weekly' : 'day_' + day)+'.png',
                iconSize: [35,45],
                iconAnchor: [17,42],
                popupAnchor: [1,-32],
                shadowAnchor: [10,12],
                shadowUrl: './assets/images/markers-shadow.png'
            }
        )
    });

    var videoText = value.video != null ? '<p align="center" style="padding: 5px;"><a href="'+value.video+'" target="_blank">Video</a></p>' : '';
    var popupTitle = (category == 'random') ? languageData[lang]["random_item.name"] +value.text.replace('random_item_', '') : languageData[lang][value.text + ".name"]+' - '+ languageData[lang]["menu.day"] + ' ' + value.day;
    var popupContent = (category == 'random') ? 'Random items resets 24 hours after picking up' : languageData[lang][value.text + "_" + day + ".desc"];
    value.title = popupTitle;
    tempMarker
      .bindPopup(
        '<h1>'+ popupTitle +'</h1>' +
        '<p>'+ MapBase.getToolIcon(value.tool) + popupContent +'</p>' +
        videoText +
        '<p class="remove-button" data-item="'+value.text+'">'+languageData[lang]["map.remove_add"]+'</p>'
      )
      .on("click", function(e) {
        Routes.addMarkerOnCustomRoute(value.text);
        if (customRouteEnabled) e.target.closePopup();
      });


    visibleMarkers[value.text] = tempMarker;
    itemMarkersLayer.addLayer(tempMarker);
};

MapBase.getToolIcon = function (type) {
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

MapBase.removeCollectedMarkers = function()
{
    $.each(enabledTypes, function(key, value)
    {
        $.each(markers[value], function (mKey, marker)
        {
            if(visibleMarkers[marker.text] != null)
            {
                if (disableMarkers.includes(marker.text.toString()))
                {
                    $(visibleMarkers[marker.text]._icon).css('opacity', '.35');
                }
                else
                {
                    $(visibleMarkers[marker.text]._icon).css('opacity', '1');
                }
            }
        });
    });
};

MapBase.loadFastTravels = function () {
    $.getJSON('data/fasttravels.json?nocache='+nocache)
        .done(function(data) {
            fastTravelData = data;
            MapBase.addFastTravelMarker();
        });
};

MapBase.addFastTravelMarker = function()
{
    if(enabledTypes.includes('fast_travel'))
    {
        $.each(fastTravelData, function (key, value)
        {
            var marker = L.marker([value.x, value.y], {
                icon: L.icon({
                    iconUrl: './assets/images/icons/fast_travel_gray.png',
                    iconSize: [35,45],
                    iconAnchor: [17,42],
                    popupAnchor: [1,-32],
                    shadowAnchor: [10,12],
                    shadowUrl: './assets/images/markers-shadow.png'
                })
            });

            if (languageData[lang][value.text+'.name'] == null) {
                console.error('[LANG]['+lang+']: Text not found: \''+value.text+'\'');
            }
            marker.bindPopup(`<h1> ${languageData[lang][value.text+'.name']}</h1><p>  </p>`);

            miscMarkersLayer.addLayer(marker);
        });
    }
};

MapBase.debugMarker = function (lat, long)
{
    var marker = L.marker([lat, long], {
    icon: L.icon({
        iconUrl: './assets/images/icons/random_darkblue.png',
        iconSize: [35,45],
        iconAnchor: [17,42],
        popupAnchor: [1,-32],
        shadowAnchor: [10,12],
        shadowUrl: './assets/images/markers-shadow.png'

    })
});

    marker.bindPopup(`<h1>Debug Marker</h1><p>  </p>`);
    itemMarkersLayer.addLayer(marker);
};

MapBase.addCoordsOnMap = function(coords)
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
    if(debugTool != null)
        console.log(`{"text": "random_item_", "day": ["1", "2", "3"], "tool": "${debugTool}", "icon": "random", "x": "${coords.latlng.lat}", "y": "${coords.latlng.lng}"},`);

};

MapBase.loadMadamNazar = function()
{

    $.getJSON('https://pepegapi.jeanropke.net/nazar.php')
        .done(function(nazar) {
            nazarCurrentLocation = nazar.nazar_id-1;
            nazarCurrentDate = nazar.date;
        }).always(function() {
            $.getJSON('data/nazar.json?nocache='+nocache)
                .done(function(data) {
                    nazarLocations = data;
                    MapBase.addMadamNazar();
            });
        });
};

MapBase.addMadamNazar = function ()
{
    if(nazarCurrentLocation == null)
    {
        console.error('Unable to get Nazar position. Try again later.');
        return;
    }
    if (enabledTypes.includes('nazar')) {
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

        marker.bindPopup(`<h1>${languageData[lang]['madam_nazar.name']} - ${nazarCurrentDate}</h1><p>Wrong location? Follow <a href='https://twitter.com/MadamNazarIO' target="_blank">@MadamNazarIO</a>.</p>`);
        miscMarkersLayer.addLayer(marker);
    }
};

MapBase.loadTreasures = function() {
    $.getJSON('data/treasures.json?nocache='+nocache)
        .done(function (data) {
            treasureData = data;
            MapBase.setTreasures();
    });
};

MapBase.setTreasures = function ()
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
                icon: L.icon({
                    iconUrl: './assets/images/icons/treasure_beige.png',
                    iconSize: [35,45],
                    iconAnchor: [17,42],
                    popupAnchor: [1,-32],
                    shadowAnchor: [10,12],
                    shadowUrl: './assets/images/markers-shadow.png'
                })
            });

            if (languageData[lang][value.text] == null) {
                console.error('[LANG]['+lang+']: Text not found: \''+value.text+'\'');
            }
            marker.bindPopup(`<h1> ${languageData[lang][value.text]}</h1><p>  </p>`);

            treasureMarkers.push({treasure: value.text, marker: marker, circle: circle});
            treasureDisabled.push(value.text);
        });
        MapBase.addTreasuresToMap();
    }
};

MapBase.addTreasuresToMap = function () {

    treasuresLayer.clearLayers();

    $.each(treasureMarkers, function(key, value)
    {
        if(!treasureDisabled.includes(value.treasure)) {
            treasuresLayer.addLayer(value.marker);
            treasuresLayer.addLayer(value.circle);
        }
    });

    treasuresLayer.addTo(baseMap);


};

MapBase.drawLines = function() {
    var connections = [];
    $.each(routesData[day], function(nodeKey, nodeValue)
    {
        $.each(enabledTypes, function (key, value) {
            if (markers[value] == null)
                return;

            var marker = markers[value].filter(item => {
                if (item.day == day)
                    return item.text === nodeValue.key;
            })[0];//Need this 0 because its an array with 1 element

            if (marker == null)
                return;

            if (marker.text == nodeValue.key && marker.day == day && !disableMarkers.includes(nodeValue.key))// && enabledTypes.includes(marker.icon))
            {
                var connection = [marker.x, marker.y];
                connections.push(connection);
            }
        });
    });


    if (polylines instanceof L.Polyline)
    {
        baseMap.removeLayer(polylines);
    }

    polylines = L.polyline(connections, {'color': '#9a3033'});
    baseMap.addLayer(polylines);
};

