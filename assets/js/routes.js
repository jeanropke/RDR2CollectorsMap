/**
 * Created by Jean on 2019-10-09.
 */

var Routes = {
  init: function () {
    $('#custom-routes').prop("checked", RouteSettings.customRouteEnabled);

    $('#generate-route-use-pathfinder').prop("checked", RouteSettings.usePathfinder);
    $('#generate-route-generate-on-visit').prop("checked", RouteSettings.generateOnVisit);
    $('#generate-route-ignore-collected').prop("checked", RouteSettings.ignoreCollected);
    $("#generate-route-important-only").prop("checked", RouteSettings.importantOnly);
    $('#generate-route-auto-update').prop("checked", RouteSettings.autoUpdatePath);
    $('#generate-route-distance').val(RouteSettings.maxDistance);
    $('#generate-route-start-lat').val(RouteSettings.startMarkerLat);
    $('#generate-route-start-lng').val(RouteSettings.startMarkerLng);

    $('#generate-route-fasttravel-weight').val(RouteSettings.fasttravelWeight);
    $('#generate-route-railroad-weight').val(RouteSettings.railroadWeight);

    // Pathfinder / Generator toggle
    if (RouteSettings.usePathfinder) {
      $('#generate-route-distance').parent().hide();
      $('#generate-route-auto-update').parent().parent().hide();
      $('#generate-route-fasttravel-weight').parent().show();
      $('#generate-route-railroad-weight').parent().show();
    } else {
      $('#generate-route-distance').parent().show();
      $('#generate-route-auto-update').parent().parent().show();
      $('#generate-route-fasttravel-weight').parent().hide();
      $('#generate-route-railroad-weight').parent().hide();
    }

    // Route starts at
    $('#generate-route-start').val(RouteSettings.genPathStart);

    if (RouteSettings.genPathStart != "Custom") {
      $('#generate-route-start-lat').parent().hide();
      $('#generate-route-start-lng').parent().hide();
    }
  },

  loadCustomRoute: function (input) {
    try {
      var connections = [];

      input = input.replace(/\r?\n|\r/g, '').replace(/\s/g, '').split(',');

      $.each(input, function (key, value) {
        var _marker = MapBase.markers.filter(marker => marker.text == value && marker.day == Cycles.categories[marker.category])[0];
        if (_marker == null) {
          console.error(`Item not found on map: '${value}'`);
        } else {
          connections.push([_marker.lat, _marker.lng]);
        }
      });

      if (Routes.polylines instanceof L.Polyline) {
        MapBase.map.removeLayer(Routes.polylines);
      }

      Routes.polylines = L.polyline(connections, {
        'color': '#9a3033'
      });
      MapBase.map.addLayer(Routes.polylines);
    } catch (e) {
      alert(Language.get('routes.invalid'));
      console.error(e);
    }
  },

  addMarkerOnCustomRoute: function (value) {
    if (RouteSettings.customRouteEnabled) {
      if (Routes.customRouteConnections.includes(value)) {
        Routes.customRouteConnections = Routes.customRouteConnections.filter(function (item) {
          return item !== value;
        });
      } else {
        Routes.customRouteConnections.push(value);
      }

      var connections = [];

      $.each(Routes.customRouteConnections, function (key, item) {
        var _marker = MapBase.markers.filter(marker => marker.text == item && marker.day == Cycles.categories[marker.category])[0];
        connections.push([_marker.lat, _marker.lng]);
      });

      if (Routes.polylines instanceof L.Polyline) {
        MapBase.map.removeLayer(Routes.polylines);
      }

      Routes.polylines = L.polyline(connections, {
        'color': '#9a3033'
      });
      MapBase.map.addLayer(Routes.polylines);
    }
  },

  exportCustomRoute: function () {
    setClipboardText(Routes.customRouteConnections.join(','));
    alert(Language.get('routes.exported'));
  },

  importCustomRoute: function () {
    var input = prompt(Language.get('routes.import_prompt'), "");

    if (input == null || input == "") {
      alert(Language.get('routes.empty'));
    } else {
      Routes.loadCustomRoute(input);
    }
  },


  routesData: [],
  polylines: null,
  customRouteConnections: [],

  /**
   * Path generator by Senexis
   */
  // The point to start the path generator from, default is SW edge.
  startMarker: function () {
    return { lat: RouteSettings.startMarkerLat, lng: RouteSettings.startMarkerLng };
  },

  // Needed to keep track of the previously drawn path so we can remove it later.
  lastPolyline: null,

  // Simple utility to get the distance between two markers in Leaflet.
  getDistance: function (marker1, marker2) {
    var latlng1 = L.latLng([marker1.lat, marker1.lng]);
    var latlng2 = L.latLng([marker2.lat, marker2.lng]);

    return MapBase.map.distance(latlng1, latlng2);
  },

  // Simple utility to check whether the two given markers are the same.
  isSameMarker: function (marker1, marker2) {
    return marker1.lat == marker2.lat && marker1.lng == marker2.lng;
  },

  // Simple utility to clear the given polyline from Leaflet.
  clearPath: function (starting = false) {
    try {
      if (!starting && RouteSettings.usePathfinder) {
        PathFinder.routegenClear();
      }
    } catch (error) {
      alert(Language.get('alerts.feature_not_supported'));
      console.error(error);
    }

    if (!Routes.lastPolyline) return;

    Routes.lastPolyline.remove(MapBase.map);
    Routes.lastPolyline = null;
  },

  // Find the nearest neighbor to the given marker.
  // Needs to have an array of the possible markers and currently chosen paths and the maximum distance a path can be.
  nearestNeighborTo: function (marker, possibleNeighbors, polylines, maxDistance) {
    var resDistance = null;
    for (var i = 0; i < possibleNeighbors.length; i++) {
      var element = possibleNeighbors[i];

      // Calculate closest path.
      var distance = Routes.getDistance(marker, element);

      // Skip any distance over maxDistance.
      if (maxDistance != -1 && distance > maxDistance) continue;

      // Skip the current marker.
      if (Routes.isSameMarker(marker, element)) continue;

      // Skip existing paths in polylines.
      var pathExists = false;
      var markerNodeCount = 0;
      var elementNodeCount = 0;

      polylines.forEach((polyline) => {
        // Check if the path is already drawn to prevent looping paths.
        // {element, marker} exists
        if (Routes.isSameMarker(polyline[0], element) && Routes.isSameMarker(polyline[1], marker)) {
          pathExists = true;
        }

        // {marker, element} exists
        if (Routes.isSameMarker(polyline[0], marker) && Routes.isSameMarker(polyline[1], element)) {
          pathExists = true;
        }

        // Count how many paths the element and marker is in already to prevent more than two path lines from each marker.
        // {element, Any} or {Any, element} exists
        if (Routes.isSameMarker(polyline[0], element) || Routes.isSameMarker(polyline[1], element)) {
          elementNodeCount++;
        }

        // {marker, Any} or {Any, marker} exists
        if (Routes.isSameMarker(polyline[0], marker) || Routes.isSameMarker(polyline[1], marker)) {
          markerNodeCount++;
        }
      });

      // The path already is present in the path list.
      if (pathExists) continue;

      // The current marker already has a path chosen for it.
      if (markerNodeCount > 1) continue;

      // We are drawing a one-way path, in other words we can only go to uncharted nodes.
      if (elementNodeCount != 0) continue;

      // If resDistance is empty, set it to the first valid marker.
      // If you put this anywhere else, a bug is possible where the first Array item gets chosen incorrectly.
      if (!resDistance) {
        resIndex = i;
        resMarker = element;
        resDistance = distance;
      }

      // If distance is less than previous distance, set the current path as more optimal than the last.
      if (distance < resDistance) {
        resIndex = i;
        resMarker = element;
        resDistance = distance;
      }
    }

    // Return the most optimal path.
    return {
      index: resIndex,
      marker: resMarker,
      distance: resDistance,
    };
  },

  // Generate a path using a nearest neighbor algorithm.
  // force: Whether the path should be generated with or without checking the restrictions.
  generatePath: function (force = false) {
    if (!force) {
      // Only run when an update is needed.
      if (Routes.lastPolyline == null) return;

      // Only run when the autoUpdatePath option is selected.
      if (!RouteSettings.autoUpdatePath) return;
    }

    // Clean up before generating.
    Routes.clearPath(true);

    // Setup variables.
    var newMarkers = MapBase.markers.filter((marker) => {
      if (!marker.isVisible) return false;

      var toolType = Settings.toolType;
      var markerTool = parseInt(marker.tool);
      if (toolType >= 0) {
        if (toolType < markerTool) return false;
      } else {
        if (toolType == -1 && markerTool != 1) return false;
        if (toolType == -2 && markerTool != 2) return false;
      }

      return true;
    });

    // Optionally ignore the already collected markers.
    if (RouteSettings.ignoreCollected) {
      newMarkers = newMarkers.filter((marker) => { return marker.canCollect && !marker.isCollected; });
    }

    if (RouteSettings.importantOnly) {
      newMarkersImp = newMarkers.filter((marker) => { return MapBase.importantItems.indexOf(marker.text) >= 0; });
      if (newMarkers.length > 0 && newMarkersImp.length == 0) {
        if (!confirm(Language.get('dialog.generate_route_important_only_ignore'))) {
          return;
        }
      } else {
        newMarkers = newMarkersImp;
      }
    }

    if (newMarkers.length <= 1) {
      return;
    }

    var polylines = [];

    // The starting point of the path.
    var first = null;

    // Grab the nearest marker to the start of the path.
    first = Routes.nearestNeighborTo(Routes.startMarker(), newMarkers, polylines, -1);

    // The last marker from the loop.
    var last = first.marker;

    // Use path finder when enabled
    try {
      if (RouteSettings.usePathfinder) {
        PathFinder.routegenStart(last, newMarkers, RouteSettings.fasttravelWeight, RouteSettings.railroadWeight);
        return;
      }
    } catch (error) {
      alert(Language.get('alerts.feature_not_supported'));
      console.error(error);
    }

    // Loop through all markers and pick the nearest neighbor to that marker.
    for (var i = 0; i < newMarkers.length; i++) {
      var current = Routes.nearestNeighborTo(last, newMarkers, polylines, RouteSettings.maxDistance);
      if (!current) break;
      current = current.marker;

      // A last fallback to not draw paths that are too long.
      if (Routes.getDistance(last, current) < RouteSettings.maxDistance) {
        polylines.push([{ lat: last.lat, lng: last.lng }, { lat: current.lat, lng: current.lng }]);
      }

      last = current;
    }

    // Draw all paths on the map, and save the instance of the polyline to be able to clean it up later.
    Routes.lastPolyline = L.polyline(polylines).addTo(MapBase.map);
  },

  setCustomRouteStart: function (lat, lng) {
    lat = parseFloat(lat) ? parseFloat(lat) : -119.9063;
    lng = parseFloat(lng) ? parseFloat(lng) : 8.0313;

    $('#generate-route-start').val("Custom");
    $('#generate-route-start-lat').val(lat);
    $('#generate-route-start-lat').parent().show();
    $('#generate-route-start-lng').val(lng);
    $('#generate-route-start-lng').parent().show();

    RouteSettings.genPathStart = 'Custom';
    RouteSettings.startMarkerLat = lat;
    RouteSettings.startMarkerLng = lng;
  }
};