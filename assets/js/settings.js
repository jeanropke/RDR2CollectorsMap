var Settings = {
  display24HoursTimestamps: $.cookie('timestamps-24') == '1',
  displayClockHideTimer: $.cookie('clock-or-timer') == 'true',
  isCoordsEnabled: $.cookie('coords-enabled') == '1',
  isCycleChangerEnabled: $.cookie('cycle-changer-enabled') == '1',
  isCycleInputEnabled: $.cookie('cycle-input-enabled') == '1',
  isDebugEnabled: $.cookie('debug') == '1',
  isDoubleClickZoomEnabled: $.cookie('enable-dclick-zoom') == '1',
  isMenuOpened: $.cookie('menu-opened') == '1',
  isPinsEditingEnabled: $.cookie('pins-edit-enabled') == '1',
  isPinsPlacingEnabled: $.cookie('pins-place-enabled') == '1',
  isPopupsEnabled: $.cookie('enable-marker-popups') == '1',
  isPopupsHoverEnabled: $.cookie('enable-marker-popups-hover') == '1',
  isShadowsEnabled: $.cookie('enable-marker-shadows') == '1',
  language: $.cookie('language') ? $.cookie('language') : navigator.language.toLowerCase(),
  markerCluster: $.cookie('marker-cluster') == '1',
  markerOpacity: parseFloat($.cookie('marker-opacity')) ? parseFloat($.cookie('marker-opacity')) : 1,
  markerSize: parseFloat($.cookie('marker-size')) ? parseFloat($.cookie('marker-size')) : 1,
  overlayOpacity: parseFloat($.cookie('overlay-opacity')) ? parseFloat($.cookie('overlay-opacity')) : 0.5,
  resetMarkersDaily: $.cookie('remove-markers-daily') == '1',
  showAllMarkers: false,
  showHelp: $.cookie('show-help') == '1',
  sortItemsAlphabetically: $.cookie('sort-items-alphabetically') == '1',
  toolType: $.cookie('tools') ? $.cookie('tools') : '3',
  markersCustomColor: parseFloat($.cookie('custom-markers-color')) ? parseFloat($.cookie('custom-markers-color')) : 0,

  showUtilitiesSettings: $.cookie('show-utilities') == '1',
  showCustomizationSettings: $.cookie('show-customization') == '1',
  showRoutesSettings: $.cookie('show-routes') == '1',
  showImportExportSettings: $.cookie('show-import-export') == '1',
  showDebugSettings: $.cookie('show-debug') == '1',
};