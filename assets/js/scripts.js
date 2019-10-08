var day;
var map;
var markers = [];
var markersLayer = new L.LayerGroup();
var searchTerms = [];
var visibleMarkers = [];
var resetMarkersDaily;
var disableMarkers = [];
var categories = [
    'american-flowers', 'antique-bottles', 'arrowhead', 'bird-eggs', 'coin', 'family-heirlooms', 'lost-bracelet',
    'lost-earrings', 'lost-necklaces', 'lost-ring', 'card-cups', 'card-pentacles', 'card-swords', 'card-wands', 'nazar',
    'fast-travel'
];
var enabledTypes = categories;
var categoryButtons = document.getElementsByClassName("menu-option clickable");

var routesData = [];
var polylines;

var customRouteEnabled = false;
var customRoute = [];
var customRouteConnections = [];

var showCoordinates = false;

var toolType = '3'; //All type of tools
var avaliableLanguages = ['de-de', 'es-es', 'en-us', 'fr-fr', 'pt-br', 'pl', 'zh-s', 'zh-t'];
var lang;
var languageData = [];

var nazarLocations = [
    {"id":"1", "x":"-40.5625","y":"109.078125"},
    {"id":"2", "x":"-43","y":"132.828125"},
    {"id":"3", "x":"36.75","y":"153.6875"},
    {"id":"4", "x":"-56.171875","y":"78.59375"},
    {"id":"5", "x":"-63.6640625","y":"105.671875"},
    {"id":"6", "x":"-60.421875","y":"130.640625"},
    {"id":"7", "x":"-66.046875","y":"151.03125"},
    {"id":"8", "x":"-84.4375","y":"82.03125"},
    {"id":"9", "x":"-90.53125","y":"135.65625"},
    {"id":"10","x":"-100.140625","y":"48.8125"},
    {"id":"11","x":"-105.0703125","y":"84.9765625"},
    {"id":"12","x":"-124.03125","y":"34.171875"}
];

var fastTravelLocations = [
    {"text": "fasttravel.tumbleweed", "x": "-109.3203125","y": "26.859375"},
    {"text": "fasttravel.armadillo", "x": "-104.375","y": "53.4140625"},
    {"text": "fasttravel.macfarlanes", "x": "-101.515625","y": "72.4140625"},
    {"text": "fasttravel.manzanita", "x": "-88.5859375","y": "80.7890625"},
    {"text": "fasttravel.blackwater", "x": "-82.9140625","y": "99.765625"},
    {"text": "fasttravel.strawberry", "x": "-70.03125","y": "84.296875"},
    {"text": "fasttravel.valentine", "x": "-53.578125","y": "108.3828125"},
    {"text": "fasttravel.colter", "x": "-25.9296875","y": "91.046875"},
    {"text": "fasttravel.emerald", "x": "-56.7734375","y": "134.8203125"},
    {"text": "fasttravel.rhodes", "x": "-83.6640625","y": "130.65625"},
    {"text": "fasttravel.wapiti", "x": "-29.7265625","y": "118.7890625"},
    {"text": "fasttravel.van_horn", "x": "-53.703125","y": "156.3203125"},
    {"text": "fasttravel.annesburg", "x": "-43.46875","y": "156.765625"},
    {"text": "fasttravel.saint_denis", "x": "-86.328125","y": "152.6796875"},
    {"text": "fasttravel.lagras", "x": "-72.59375","y": "143.859375"}
];

var nazarCurrentLocation = 8;
var nazarCurrentDate = '8th October';

function init()
{
    if(typeof Cookies.get('removed-items') === 'undefined')
        Cookies.set('removed-items', '', { expires: resetMarkersDaily ? 1 : 999});

    if(typeof Cookies.get('map-layer') === 'undefined')
        Cookies.set('map-layer', 'Detailed', { expires: 999 });

    if(typeof Cookies.get('language') === 'undefined')
    {
        if(avaliableLanguages.includes(navigator.language.toLowerCase()))
            Cookies.set('language', navigator.language.toLowerCase());
        else
            Cookies.set('language', 'en-us');
    }

    if(!avaliableLanguages.includes(Cookies.get('language')))
        Cookies.set('language', 'en-us');

    if(typeof Cookies.get('removed-markers-daily') === 'undefined')
        Cookies.set('removed-markers-daily', 'true', 999);

    resetMarkersDaily = Cookies.get('removed-markers-daily') == 'true';
    $("#reset-markers").val(resetMarkersDaily.toString());



    lang = Cookies.get('language');
    $("#language").val(lang);

    disableMarkers = Cookies.get('removed-items').split(';');

    var minZoom = 2;
    var maxZoom = 7;

    var mapLayers = [];
    mapLayers['Default'] = L.tileLayer('https://s.rsg.sc/sc/images/games/RDR2/map/game/{z}/{x}/{y}.jpg', { noWrap: true});
    mapLayers['Detailed'] = L.tileLayer('assets/maps/detailed/{z}/{x}_{y}.jpg', { noWrap: true});
    mapLayers['Dark'] = L.tileLayer('assets/maps/darkmode/{z}/{x}_{y}.jpg', { noWrap: true});

    setMapBackground(Cookies.get('map-layer'));


    // create the map
    map = L.map('map', {
        minZoom: minZoom,
        maxZoom: maxZoom,
        zoomControl: false,
        crs: L.CRS.Simple,
        layers: [mapLayers[Cookies.get('map-layer')]]
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
        addCoordsOnMap(e);
    });

    map.on('popupopen', function()
    {
        $('.remove-button').click(function(e)
        {
            removeItemFromMap($(event.target).data("item"));
        });
    });

    map.on('baselayerchange', function (e)
    {
        setMapBackground(e.name);
    });

    loadMarkers();
    setCurrentDayCycle();
    loadRoutesData();
    var pos = [-53.2978125, 68.7596875];
    var offset = 1.15;
    L.imageOverlay('overlays/cave_01.png', [[pos], [pos[0] + offset, pos[1] + offset]]).addTo(map);

}

function setMapBackground(mapName){
    switch(mapName) {
        default:
        case 'Default':
            $('#map').css('background-color', '#d2b790');
            break;

        case 'Detailed':
            $('#map').css('background-color', '#d2b790');
            break;

        case 'Dark':
            $('#map').css('background-color', '#3d3d3d');
            break;
    }

    Cookies.set('map-layer', mapName, { expires: 999 });
}

function refreshMenu()
{

    $.each(categories, function (key, value)
    {
        $(`.menu-hidden[data-type=${value}]`).children('p.collectible').remove();

        markers.filter(function(item)
        {
            if(item.day == 1 && item.icon == value)
            {
                $(`.menu-hidden[data-type=${value}]`).append(`<p class="collectible" data-type="${item.text}">${languageData[item.text+'.name']}</p>`);
            }
        });
    });
    $.each(disableMarkers, function (key, value)
    {
        if(value.length > 0)
        {
            $('[data-type=' + value + ']').addClass('disabled');
        }
    });
}

function getNazarPosition()
{
    $.getJSON(`https://madam-nazar-location-api.herokuapp.com/current`, {}, function(x)
    {
        nazarCurrentLocation = x.data._id - 1;
        addNazarMarker();
    });
}

function loadLanguage()
{
    languageData = [];
    $.getJSON(`langs/${lang}.json?nocache=4`, {}, function(data)
    {
        $.each(data, function(key, value) {
            languageData[value.key] = value.value;

        });
        addMarkers();
        setMenuLanguage();
        refreshMenu();
    });
}

function setMenuLanguage()
{
    $.each($('[data-text]'), function (key, value)
    {
        var temp = $(value);
        if(languageData[temp.data('text')] == null) {
            console.error(`[LANG][${lang}]: Text not found: '${temp.data('text')}'`);
        }

        $(temp).text(languageData[temp.data('text')]);
    });

    ///Special cases:
    $('#search').attr("placeholder", languageData['menu.search_placeholder']);
}

function removeItemFromMap(itemName)
{
    if(disableMarkers.includes(itemName.toString()))
    {
        disableMarkers = $.grep(disableMarkers, function(value) {
            $.each(routesData, function(key, j){
                if (disableMarkers.includes(value.key)){
                    delete value.hidden;
                }
            });
            return value != itemName.toString();

        });
        $(visibleMarkers[itemName]._icon).css('opacity', '1');
        $('[data-type=' + itemName + ']').removeClass('disabled');
    }
    else
    {
        disableMarkers.push(itemName.toString());
        $.each(routesData[day], function(b, value){
            if (disableMarkers.includes(value.key)){
                value.hidden = true;
            }
        });
        $(visibleMarkers[itemName]._icon).css('opacity', '0.35');
        $('[data-type=' + itemName + ']').addClass('disabled');
    }

    Cookies.set('removed-items', disableMarkers.join(';'), { expires: resetMarkersDaily ? 1 : 999});

    if($("#routes").val() == 1)
        drawLines();

}

function setCurrentDayCycle()
{
    //day1: 2 4 6
    //day2: 0 3
    //day3: 1 5

    // 2 3 1 2 1 3 1

    var weekDay = new Date().getUTCDay();
    switch(weekDay)
    {
        case 2: //tuesday
        case 4: //thursday
        case 6: //saturday
            day = 1;
            break;

        case 0: //sunday
        case 3: //wednesday
            day = 2;
            break;

        case 1: //monday
        case 5: //friday
            day = 3;
            break;
    }

    $('#day').val(day);

    //Cookie day not exists? create
    if(typeof Cookies.get('day') === 'undefined')
    {
        Cookies.set('day', day, { expires: 1 });
    }
    //if exists, remove markers if the days arent the same
    else
    {
        if(Cookies.get('day') != day.toString())
        {
            Cookies.set('day', day, { expires: 1 });
            if(resetMarkersDaily)
            {
                Cookies.set('removed-items', '', {expires: 1});
                disableMarkers = [];
            }
        }
    }
}

function loadRoutesData()
{

    $.getJSON(`assets/routes/day_1.json`, {}, function (data) {
        routesData[1] = data;
    });
    $.getJSON(`assets/routes/day_2.json`, {}, function (data) {
        routesData[2] = data;
    });
    $.getJSON(`assets/routes/day_3.json`, {}, function (data) {
        routesData[3] = data;
    });


}

function drawLines()
{
    var connections = [];
    for (var node of routesData[day]){
        for (var marker of markers){
            if (marker.text == node.key && marker.day ==day && !disableMarkers.includes(node.key) && enabledTypes.includes(marker.icon)){
                var connection = [marker.x, marker.y]
                connections.push(connection);
            }
        }
    }
    

    if (polylines instanceof L.Polyline)
    {
        map.removeLayer(polylines);
    }

    polylines = L.polyline(connections, {'color': '#9a3033'});
    map.addLayer(polylines);

}


function loadMarkers()
{
    markers = [];
    $.getJSON("items.json?nocache=4", {}, function(data)
    {
        markers = data;
        loadLanguage();

        addNazarMarker();
        addfastTravelMarker();

    });

}

function addMarkers()
{
    markersLayer.clearLayers();

    visibleMarkers = [];

    $.each(markers, function (key, value)
    {

        if(value.tool != toolType && toolType !== "3")
            return;

        if(enabledTypes.includes(value.icon))
        {
            if (value.day == day || isNaN(value.day)) //if is not a number, will be nazar or fast travel
            {
                if (languageData[value.text+'.name'] == null)
                {
                    console.error(`[LANG][${lang}]: Text not found: '${value.text}'`);
                }

                if (searchTerms.length > 0)
                {
                    $.each(searchTerms, function (id, term)
                    {
                        if (languageData[value.text+'.name'].toLowerCase().indexOf(term.toLowerCase()) !== -1)
                        {
                            if (visibleMarkers[value.text] == null)
                            {
                                addMarkerOnMap(value);


                                //not working as planned
                                //if (languageData[value.text+'.name'].toLowerCase().indexOf(term.toLowerCase()) == -1)
                                //{
                                //    $(tempMarker._icon).css({'filter': 'grayscale(1)', 'opacity': '0.4'});
                                //}
                            }
                        }
                    });
                }
                else {
                    addMarkerOnMap(value);
                }

            }
        }
    });

    markersLayer.addTo(map);

    removeCollectedMarkers();
}

function addMarkerOnMap(value){
    var tempMarker = L.marker([value.x, value.y], {icon: L.AwesomeMarkers.icon({iconUrl: 'icon/' + value.icon + '.png', markerColor: 'day_' + value.day})});

    switch (value.day) {
        case 'nazar':
            tempMarker.bindPopup(`<h1> ${languageData[value.text + '.name']} - ${nazarCurrentDate}</h1><p>  </p>`);
            break;
        case 'fasttravel':
            tempMarker.bindPopup(`<h1>${languageData[value.text + '.name']}</h1><p>  </p>`);
            break;
        default:
            tempMarker.bindPopup(`<h1> ${languageData[value.text + '.name']} - ${languageData['menu.day']} ${value.day}</h1><p> ${languageData[value.text + '_' + value.day + '.desc']} </p><p class="remove-button" data-item="${value.text}">${languageData['map.remove_add']}</p>`).on('click', function(e) { addMarkerOnCustomRoute(value.text); if(customRouteEnabled)e.target.closePopup();});
            break;
    }


    visibleMarkers[value.text] = tempMarker;
    markersLayer.addLayer(tempMarker);
}

function addMarkerOnCustomRoute(value)
{
    if(customRouteEnabled)
    {
        if(customRouteConnections.includes(value))
        {
            customRouteConnections = customRouteConnections.filter(function(item) {
                return item !== value
            })
        }
        else
            customRouteConnections.push(value);


        var connections = [];

        $.each(customRouteConnections, function (key, item)
        {
            connections.push(visibleMarkers[item]._latlng);
        });


        if (polylines instanceof L.Polyline)
        {
            map.removeLayer(polylines);
        }

        polylines = L.polyline(connections, {'color': '#9a3033'});
        map.addLayer(polylines);

    }


}

function removeCollectedMarkers()
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
}

//loads the current location of Nazar and adds a marker in the correct location
function addNazarMarker()
{
    markers.push({"text": "madam_nazar", "day": "nazar", "tool": "-1", "icon": "nazar", "x": nazarLocations[nazarCurrentLocation].x, "y": nazarLocations[nazarCurrentLocation].y});
}
//adds fasttravel points
function addfastTravelMarker()
{   
    $.each(fastTravelLocations, function(b, value){
        markers.push({"text": value.text, "day": "fasttravel", "tool": "-1", "icon": "fast-travel", "x": value.x, "y": value.y});

    });
}

function customMarker(coords){
    var nazarMarker = L.marker(coords, {icon: L.AwesomeMarkers.icon({iconUrl: 'icon/nazar.png', markerColor: 'day_4'})}).bindPopup(`<h1>debug</h1>`);
    markersLayer.addLayer(nazarMarker);
}

function addCoordsOnMap(coords)
{
    // Show clicked coordinates (like google maps)
    if (showCoordinates) {
        if (document.querySelectorAll('.lat-lng-container').length < 1) {
            var container = document.createElement('div');
            var innerContainer = document.createElement('div');
            var closeButton = document.createElement('button');
            $(container).addClass('lat-lng-container').append(innerContainer);
            $(closeButton).attr('id', 'lat-lng-container-close-button').html('&times;');
            $(innerContainer).html('<p>lat: ' + coords.latlng.lat + '<br> lng: ' + coords.latlng.lng + '</p>').append(closeButton);

            $('body').append(container);

            $('#lat-lng-container-close-button').click(function() {
                $(container).css({
                    display: 'none'
                })
            })
        } else {
            $('.lat-lng-container').css({
                display: ''
            });
            $('.lat-lng-container div p').html('lat: ' + coords.latlng.lat + '<br> lng: ' + coords.latlng.lng);
        }
    }
}

function changeCursor()
{
    if(showCoordinates || customRouteEnabled)
        $('.leaflet-grab').css('cursor', 'pointer');
    else
        $('.leaflet-grab').css('cursor', 'grab');
}

$("#day").on("input", function()
{
    day = $('#day').val();
    addMarkers();

    if($("#routes").val() == 1)
        drawLines();

});

$("#search").on("input", function()
{
    searchTerms = [];
    $.each($('#search').val().split(';'), function(key, value)
    {
        if($.inArray(value.trim(), searchTerms) == -1)
        {
            if(value.length > 0)
                searchTerms.push(value.trim());
        }
    });
    addMarkers();
});

$("#routes").on("change", function()
{
    if($("#routes").val() == 0) {
        if (polylines instanceof L.Polyline) {
            map.removeLayer(polylines);
        }
    }
    else {
        drawLines();
    }
});

$("#tools").on("change", function()
{
    toolType = $("#tools").val();
    addMarkers();
});

$("#reset-markers").on("change", function()
{
    if($("#reset-markers").val() == 'clear')
    {
        Cookies.set('removed-items', '', { expires: resetMarkersDaily ? 1 : 999});
        disableMarkers = Cookies.get('removed-items').split(';');
        $("#reset-markers").val('false');
    }

    resetMarkersDaily = $("#reset-markers").val() == 'true';
    Cookies.set('removed-markers-daily', resetMarkersDaily, 999);


    removeCollectedMarkers();
});

$("#custom-routes").on("change", function()
{
    var temp = $("#custom-routes").val();
    customRouteEnabled = temp == '1';
    if(temp == 'clear')
    {
        customRouteConnections = [];
        map.removeLayer(customRoute);
        customRouteEnabled = true;
        $("#custom-routes").val('1');
    }

    changeCursor();


});

$('#show-coordinates').on('change', function()
{
    showCoordinates = $('#show-coordinates').val() == '1';

    changeCursor();
});

$("#language").on("change", function()
{
    lang = $("#language").val();
    Cookies.set('language', lang);
    loadLanguage();
});

$('.menu-option.clickable').on('click', function ()
{
    var menu = $(this);
    menu.children('span').toggleClass('disabled');

    if(menu.children('span').hasClass('disabled'))
    {
        enabledTypes = $.grep(enabledTypes, function(value) {
            return value != menu.data('type');
        });
    }
    else
    {
        enabledTypes.push(menu.data('type'));
    }
    addMarkers();
    if($("#routes").val() == 1)
        drawLines();
});

$('.open-submenu').on('click', function(e) {
    e.stopPropagation();
    $(this).parent().parent().children('.menu-hidden').toggleClass('opened');
});

$(document).on('click', '.collectible', function(){
    var collectible = $(this);
    collectible.toggleClass('disabled');

    removeItemFromMap(collectible.data('type'));

    if($("#routes").val() == 1)
        drawLines();
});


$('.menu-toggle').on('click', function()
{
    $('.side-menu').toggleClass('menu-opened');

    if($('.side-menu').hasClass('menu-opened'))
    {
        $('.menu-toggle').text('X');
    }
    else
    {
        $('.menu-toggle').text('>');
    }
    $('.timer-container').toggleClass('timer-menu-opened');
});


//a hide/show all function
function showall() {
    for (i of categoryButtons){
        i.children[1].classList.remove("disabled")
    }
    enabledTypes = categories;
    addMarkers();
}
function hideall() {
    for (i of categoryButtons){
        i.children[1].classList.add("disabled")
    }
    enabledTypes = [];
    addMarkers();
}

setInterval(function()
{
    var nextGMTMidnight = new Date();
    nextGMTMidnight.setUTCHours(24);
    nextGMTMidnight.setUTCMinutes(0);
    nextGMTMidnight.setUTCSeconds(0);
    var countdownDate = nextGMTMidnight - new Date();
    if(countdownDate <= 0)
    {
        $('#countdown').text(`00:00:00`);
    }
    else
    {
        var hours = Math.floor((countdownDate % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var minutes = Math.floor((countdownDate % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((countdownDate % (1000 * 60)) / 1000);

        $('#countdown').text(`${addZeroToNumber(hours)}:${addZeroToNumber(minutes)}:${addZeroToNumber(seconds)}`);
    }



}, 1000);

function addZeroToNumber(number)
{
    if(number < 10)
        number = '0'+number.toString();
    return number;
}

function exportCustomRoute()
{

    const el = document.createElement('textarea');
    el.value = customRouteConnections.join(',');
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el)

    alert('Route copied to clipboard!');
}

function importCustomRoute() {
    var input = prompt("Enter the route code", "");

    if (input == null || input == "")
    {
        alert('Empty route');
    }
    else
    {
        loadCustomRoute(input);
    }
}

function loadCustomRoute(input)
{
    try
    {
        var connections = [];
        input = input.replace(/\r?\n|\r/g, '').replace(/\s/g, '');
        $.each(input.split(','), function (key, value) {
            connections.push(visibleMarkers[value]._latlng);
        });

        if (polylines instanceof L.Polyline) {
            map.removeLayer(polylines);
        }

        polylines = L.polyline(connections, {'color': '#9a3033'});
        map.addLayer(polylines);
    }
    catch(e)
    {
        alert('Invalid route');
    }
}