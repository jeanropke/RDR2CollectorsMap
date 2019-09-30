var day;
var map;
var markers = [];
var markersLayer = new L.LayerGroup();
var searchTerms = [];
var visibleMarkers = [];
var disableMarkers = [];
var categories = [
    'american-flowers', 'antique-bottles', 'arrowhead', 'bird-eggs', 'coin', 'family-heirlooms', 'lost-bracelet',
    'lost-earrings', 'lost-necklaces', 'lost-ring', 'card-cups', 'card-pentacles', 'card-swords', 'card-wands'
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
var avaliableLanguages = ['de-de', 'en-us', 'pt-br', 'pl', 'zh-s'];
var lang;
var languageData = [];

function init()
{
    if(typeof Cookies.get('removed-items') === 'undefined')
        Cookies.set('removed-items', '', { expires: 1 });

    if(typeof Cookies.get('language') === 'undefined')
    {
        if(avaliableLanguages.includes(navigator.language.toLowerCase()))
            Cookies.set('language', navigator.language.toLowerCase());
        else
            Cookies.set('language', 'en-us');
    }


    lang = Cookies.get('language');


    disableMarkers = Cookies.get('removed-items').split(';');

    var minZoom = 2;
    var maxZoom = 7;

    var defaultLayer = L.tileLayer('https://s.rsg.sc/sc/images/games/RDR2/map/game/{z}/{x}/{y}.jpg', { noWrap: true});
    var detailLayer = L.tileLayer('assets/maps/dark/{z}/{x}_{y}.jpg', { noWrap: true});


    // create the map
    map = L.map('map', {
        minZoom: minZoom,
        maxZoom: maxZoom,
        zoomControl: false,
        crs: L.CRS.Simple,
        layers: [defaultLayer, detailLayer]
    }).setView([-70, 111.75], 3);

    var baseMaps = {
        "Default": defaultLayer,
        "Detailed": detailLayer
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
            var itemId = $(event.target).data("item");
            if(disableMarkers.includes(itemId.toString()))
            {
                disableMarkers = $.grep(disableMarkers, function(value) {
                    return value != itemId.toString();
                });
                $(visibleMarkers[itemId]._icon).css('opacity', '1');
            }
            else
            {
                disableMarkers.push(itemId.toString());
                $(visibleMarkers[itemId]._icon).css('opacity', '0.35');
            }

            Cookies.set('removed-items', disableMarkers.join(';'), { expires: 1 });



        });
    });

    loadLanguage();
    setCurrentDayCycle();
    loadMarkers();
    loadRoutesData();
}

function loadLanguage()
{
    languageData = [];
    $.getJSON(`langs/${lang}.json`, {}, function(data)
    {
        $.each(data, function(key, value) {
            languageData[value.key] = value.value;

        });
        addMarkers();
    });
}

function setCurrentDayCycle()
{
    //day1: 2 4 6
    //day2: 0 3
    //day3: 1 5
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
            Cookies.set('removed-items', '', { expires: 1 });
        }
    }
}

function loadRoutesData()
{
    routesData = [];
    $.getJSON("routes.json", {}, function(data)
    {
        routesData = data;
    });
}

function drawLines()
{
    var connections = [];
    $.each(routesData, function (key, value)
    {
        if(value.day == day)
        {
            connections.push(value.data);
        }
    });

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
    $.getJSON("items.json?nocache=2", {}, function(data)
    {
        markers = data;

        addMarkers();
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
            if (value.day == day)
            {
                if (searchTerms.length > 0)
                {
                    $.each(searchTerms, function (id, term)
                    {
                        if (languageData[value.text+'.name'] == null)
                        {
                            //TODO: this error is triggered when language is changed
                            console.error(`[LANG][${lang}]: Text not found: '${value.text}'`);
                        }
                        if (languageData[value.text+'.name'].toLowerCase().indexOf(term.toLowerCase()) !== -1)
                        {
                            var tempMarker = L.marker([value.x, value.y], {icon: L.AwesomeMarkers.icon({iconUrl: 'icon/' + value.icon + '.png', markerColor: 'day_' + value.day})}).bindPopup(`<h1> ${languageData[value.text+'.name']} - Day ${value.day}</h1><p> ${languageData[value.text+'_'+value.day+'.desc']} </p><p class="remove-button" data-item="${key}">Remove/Add from map</p>`).on('click', addCoordsOnMap);
                            visibleMarkers[key] = tempMarker;
                            markersLayer.addLayer(tempMarker);
                        }
                    });
                }
                else
                {
                    if (languageData[value.text+'.name'] == null)
                    {
                        //TODO: this error is triggered when language is changed
                        console.error(`[LANG][${lang}]: Text not found: '${value.text}'`);
                    }

                    var tempMarker = L.marker([value.x, value.y], {icon: L.AwesomeMarkers.icon({iconUrl: 'icon/' + value.icon + '.png', markerColor: 'day_' + value.day})}).bindPopup(`<h1> ${languageData[value.text+'.name']} - Day ${value.day}</h1><p> ${languageData[value.text+'_'+value.day+'.desc']} </p><p class="remove-button" data-item="${key}">Remove/Add from map</p>`).on('click', addCoordsOnMap);
                    visibleMarkers[key] = tempMarker;
                    markersLayer.addLayer(tempMarker);
                }
            }
        }
    });
    markersLayer.addTo(map);

    removeCollectedMarkers();
}

function removeCollectedMarkers()
{

    $.each(markers, function (key, value)
    {
        if (disableMarkers.includes(key.toString()))
        {
            if(visibleMarkers[key] != null)
            {
                $(visibleMarkers[key]._icon).css('opacity', '.35');
            }
        }
    });
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
                    display: 'none',
                })
            })
        } else {
            $('.lat-lng-container').css({
                display: '',
            });
            $('.lat-lng-container div p').html('lat: ' + coords.latlng.lat + '<br> lng: ' + coords.latlng.lng);
        }
    }


    // Add custom routes
    if(customRouteEnabled)
    {
        if(event.ctrlKey)
            customRouteConnections.pop();
        else
            customRouteConnections.push(coords.latlng);

        if (customRoute instanceof L.Polyline)
        {
            map.removeLayer(customRoute);
        }

        customRoute = L.polyline(customRouteConnections);
        map.addLayer(customRoute);
    }
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

$("#custom-routes").on("change", function()
{
    customRouteConnections = [];
    map.removeLayer(customRoute);
    customRouteEnabled = $("#custom-routes").val() == '1';
});

$('#show-coordinates').on('change', function() {
    showCoordinates = $('#show-coordinates').val() == '1';
});

$("#language").on("change", function()
{
    lang = $("#language").val();
    Cookies.set('language', lang);
    loadLanguage();
    addMarkers();
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
    else {
        enabledTypes.push(menu.data('type'));
    }
    addMarkers();
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
