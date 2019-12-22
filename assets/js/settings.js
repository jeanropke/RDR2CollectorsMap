var Settings = {
    isMenuOpened: $.cookie('menu-opened') == '1' ? true : false,
    isCoordsEnabled: $.cookie('coords-enabled') == '1' ? true : false,
    isAutoRefreshEnabled: $.cookie('auto-refresh') == 'true' ? true : false,
    markerCluster: $.cookie('marker-cluster') == '1' ? true : false
 }