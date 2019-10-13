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
    'fast-travel', 'treasure'
];
var enabledTypes = categories;
var categoryButtons = document.getElementsByClassName("menu-option clickable");

var treasureData = [];

var routesData = [];
var polylines;

var customRouteEnabled = false;
var customRoute = [];
var customRouteConnections = [];

var showCoordinates = false;

var toolType = '3'; //All type of tools
var avaliableLanguages = ['de-de', 'es-es', 'en-us', 'fr-fr', 'it-it', 'pt-br', 'pl', 'ru', 'zh-s', 'zh-t'];
var lang;
var languageData = [];

var nazarLocations = [];
var nazarCurrentLocation = 4;
var nazarCurrentDate = '13th October';

var fastTravelData;

var weeklySetData = [];
var date;
var nocache = 20;

var wikiLanguage = [];

function init()
{

    wikiLanguage['en-us'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/RDO-Collectors-Map-User-Guide-(English)';
    //wikiLanguage['pt-br'] = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/RDO-Collectors-Map-User-Guide-(Portugues)';



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

    var curDate = new Date();
    date = `${curDate.getUTCFullYear()}-${curDate.getUTCMonth()+1}-${curDate.getUTCDate()}`;

    lang = Cookies.get('language');
    $("#language").val(lang);

    disableMarkers = Cookies.get('removed-items').split(';');

    Language.load();

    Map.init();

    setMapBackground(Cookies.get('map-layer'));


    setCurrentDayCycle();
    Routes.loadRoutesData();
    var pos = [-53.2978125, 68.7596875];
    var offset = 1.15;
    L.imageOverlay('./assets/overlays/cave_01.png', [[pos], [pos[0] + offset, pos[1] + offset]]).addTo(map);

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
    if(typeof Cookies.get('date') === 'undefined')
    {
        Cookies.set('date', date, { expires: 2 });
    }
    //if exists, remove markers if the days arent the same
    else
    {
        if(Cookies.get('date') != date.toString())
        {
            Cookies.set('date', date, { expires: 2 });
            if(resetMarkersDaily)
            {
                Cookies.set('removed-items', '', {expires: 1});
                disableMarkers = [];
            }
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
    Cookies.remove('ignore-days')

    day = $('#day').val();
    Map.addMarkers();

    if($("#routes").val() == 1)
        Map.drawLines();


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
    Map.addMarkers();
});

$("#routes").on("change", function()
{
    if($("#routes").val() == 0) {
        if (polylines instanceof L.Polyline) {
            map.removeLayer(polylines);
        }
    }
    else {
        Map.drawLines();
    }
});

$("#tools").on("change", function()
{
    toolType = $("#tools").val();
    Map.addMarkers();
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


    Map.removeCollectedMarkers();
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
    Language.load(true);
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
    Map.addMarkers();
    if($("#routes").val() == 1)
        Map.drawLines();
});

$('.open-submenu').on('click', function(e) {
    e.stopPropagation();
    $(this).parent().parent().children('.menu-hidden').toggleClass('opened');
});

$(document).on('click', '.collectible', function(){
    var collectible = $(this);
    collectible.toggleClass('disabled');

    Map.removeItemFromMap(collectible.data('type'));

    if($("#routes").val() == 1)
        Map.drawLines();
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
    $('.counter-container').toggleClass('counter-menu-opened');

});

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

