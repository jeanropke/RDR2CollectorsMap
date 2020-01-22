var Settings = {
    isMenuOpened: $.cookie('menu-opened') == '1',
    isCoordsEnabled: $.cookie('coords-enabled') == '1',
    isPopupsEnabled: $.cookie('enable-marker-popups') == '1',
    isDoubleClickZoomEnabled: $.cookie('enable-dclick-zoom') == '1',
    isPinsPlacingEnabled: $.cookie('pins-place-enabled') == '1',
    isPinsEditingEnabled: $.cookie('pins-edit-enabled') == '1',
    markerOpacity: parseFloat($.cookie('marker-opacity')) ? parseFloat($.cookie('marker-opacity')) : 1,
    overlayOpacity: parseFloat($.cookie('overlay-opacity')) ? parseFloat($.cookie('overlay-opacity')) : 0.5,
    markerCluster: $.cookie('marker-cluster') == '1',
    showAllMarkers: false,
    showHelp: $.cookie('show-help') == '1',
    resetMarkersDaily: $.cookie('remove-markers-daily') == '1',
    toolType: $.cookie('tools') ? $.cookie('tools') : '3',
    language: $.cookie('language') ? $.cookie('language') : navigator.language.toLowerCase()
 }