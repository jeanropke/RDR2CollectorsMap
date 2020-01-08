var Settings = {
    isMenuOpened: $.cookie('menu-opened') == '1' ? true : false,
    isCoordsEnabled: $.cookie('coords-enabled') == '1' ? true : false,
    isPinsPlacingEnabled: $.cookie('pins-place-enabled') == 'true' ? true : false,
    isPinsEditingEnabled: $.cookie('pins-edit-enabled') == 'true' ? true : false,
    markerCluster: $.cookie('marker-cluster') == '1' ? true : false,
    showAllMarkers: false,
    resetMarkersDaily: $.cookie('remove-markers-daily') == 'true',
    toolType: $.cookie('tools') ? $.cookie('tools') : '3',
    language: $.cookie('language') ? $.cookie('language') : navigator.language.toLowerCase()
 }