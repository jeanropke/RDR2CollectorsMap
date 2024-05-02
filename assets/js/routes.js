/**
 * Created by Jean on 2019-10-09.
 */

const Routes = {
  routesData: [],
  polylines: null,
  customRouteConnections: [],

  init: function () {
    document.getElementById('custom-routes').checked = RouteSettings.customRouteEnabled;

    document.getElementById('generate-route-use-pathfinder').checked = RouteSettings.usePathfinder;
    document.getElementById('generate-route-generate-on-visit').checked = RouteSettings.generateOnVisit;
    document.getElementById('generate-route-ignore-collected').checked = RouteSettings.ignoreCollected;
    document.getElementById('generate-route-important-only').checked = RouteSettings.importantOnly;
    document.getElementById('generate-route-auto-update').checked = RouteSettings.autoUpdatePath;
    document.getElementById('generate-route-distance').value = RouteSettings.maxDistance;
    document.getElementById('generate-route-start-lat').value = RouteSettings.startMarkerLat;
    document.getElementById('generate-route-start-lng').value = RouteSettings.startMarkerLng;

    document.getElementById('generate-route-fasttravel-weight').value = RouteSettings.fasttravelWeight;
    document.getElementById('generate-route-railroad-weight').value = RouteSettings.railroadWeight;

    // Pathfinder / Generator toggle
    if (RouteSettings.usePathfinder) {
      document.getElementById('generate-route-distance').parentElement.style.display = 'none';
      document.getElementById('generate-route-auto-update').parentElement.parentElement.style.display = 'none';
      document.getElementById('generate-route-fasttravel-weight').parentElement.style.display = '';
      document.getElementById('generate-route-railroad-weight').parentElement.style.display = '';
    } else {
      document.getElementById('generate-route-distance').parentElement.style.display = '';
      document.getElementById('generate-route-auto-update').parentElement.parentElement.style.display = '';
      document.getElementById('generate-route-fasttravel-weight').parentElement.style.display = 'none';
      document.getElementById('generate-route-railroad-weight').parentElement.style.display = 'none';
    }

    // Route starts at
    document.getElementById('generate-route-start').value = RouteSettings.genPathStart;

    if (RouteSettings.genPathStart !== "Custom") {
      document.getElementById('generate-route-start-lat').parentElement.style.display = 'none';
      document.getElementById('generate-route-start-lng').parentElement.style.display = 'none';
    }
  },

  getCustomRoute: function () {
    const customRoute = JSON.parse(localStorage.getItem("rdr2collector.routes.customRoute") || localStorage.getItem("routes.customRoute"));

    if (!customRoute) return;

    Routes.loadCustomRoute(customRoute);
    const itemsArray = customRoute.split(",");

    for (const item of itemsArray) {
      if (!Routes.customRouteConnections.includes(item)) {
        Routes.addMarkerOnCustomRoute(item, true);
      }
    }

  },

  loadCustomRoute: function (input) {
    try {
      let connections = [];

      const items = input.replace(/\r?\n|\r/g, '').replace(/\s/g, '').split(',');

      for (const key in items) {
        if (items.hasOwnProperty(key)) {
          const value = items[key];
          const _marker = MapBase.markers.find(marker => marker.text == value && marker.isCurrent);
          if (_marker) connections.push([_marker.lat, _marker.lng]);
        }
      }

      if (Routes.polylines instanceof L.Polyline) {
        MapBase.map.removeLayer(Routes.polylines);
      }

      Routes.polylines = L.polyline(connections, {
        'color': '#9a3033'
      });
      MapBase.map.addLayer(Routes.polylines);

      if (connections.length)
        RouteSettings.customRoute = input;

    } catch (e) {
      alert(Language.get('routes.invalid'));
      console.error(e);
    }
  },

  addMarkerOnCustomRoute: function (value, autoLoad = false) {
    if (RouteSettings.customRouteEnabled || autoLoad) {
      if (Routes.customRouteConnections.includes(value)) {
        Routes.customRouteConnections = Routes.customRouteConnections.filter(function (item) {
          return item !== value;
        });
      } else {
        Routes.customRouteConnections.push(value);
      }

      let connections = [];

      Routes.customRouteConnections.forEach(function(item) {
        const _marker = MapBase.markers.filter(marker => marker.text == item && marker.day == Cycles.categories[marker.category])[0];
        if (_marker !== undefined) 
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
    const input = prompt(Language.get('routes.import_prompt'), "");

    if (input == null || input == "") {
      alert(Language.get('routes.empty'));
    } else {
      Routes.loadCustomRoute(input);
    }
  },

  clearCustomRoutes: function () {
    Routes.customRouteConnections = [];
    RouteSettings.customRoute = '';
    //this needs to be in try catch because throw an error when is no route to remove
    try {
      MapBase.map.removeLayer(Routes.polylines);
    } catch (e) {};
  },


  /**
   * Path generator by Senexis
   */
  // The point to start the path generator from, default is SW edge.
  startMarker: function () {
    return {
      lat: RouteSettings.startMarkerLat,
      lng: RouteSettings.startMarkerLng
    };
  },

  // Needed to keep track of the previously drawn path so we can remove it later.
  lastPolyline: null,

  // Simple utility to get the distance between two markers in Leaflet.
  getDistance: function (marker1, marker2) {
    const latlng1 = L.latLng([marker1.lat, marker1.lng]);
    const latlng2 = L.latLng([marker2.lat, marker2.lng]);

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
        PathFinder.routegenClearAndCancel();
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
    let resDistance = null;
    for (let i = 0; i < possibleNeighbors.length; i++) {
      const element = possibleNeighbors[i];

      // Calculate closest path.
      const distance = Routes.getDistance(marker, element);

      // Skip any distance over maxDistance.
      if (maxDistance != -1 && distance > maxDistance) continue;

      // Skip the current marker.
      if (Routes.isSameMarker(marker, element)) continue;

      // Skip existing paths in polylines.
      let pathExists = false;
      let markerNodeCount = 0;
      let elementNodeCount = 0;

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
  generatePath: function (force = false) {
    if (!force && (Routes.lastPolyline == null || !RouteSettings.autoUpdatePath)) return;

    Routes.clearPath(true);

    let newMarkers = MapBase.markers.filter(m => m.isVisible && m.toolAccepted());

    if (RouteSettings.ignoreCollected) {
      newMarkers = newMarkers.filter(marker => marker.canCollect);
    }

    if (RouteSettings.importantOnly) {
      const newMarkersImp = newMarkers.filter(marker => marker.item && marker.item.isImportant);
      if (newMarkers.length > 0 && newMarkersImp.length == 0) {
        if (!confirm(Language.get('dialog.generate_route_important_only_ignore'))) {
          return;
        }
      } else {
        newMarkers = newMarkersImp;
      }
    }

    if (newMarkers.length <= 1) return;

    const polylines = [];
    let last = Routes.nearestNeighborTo(Routes.startMarker(), newMarkers, polylines, -1).marker;

    // Use path finder when enabled
    try {
      if (RouteSettings.usePathfinder) {
        PathFinder.routegenStart(last, newMarkers, RouteSettings.fasttravelWeight,
          RouteSettings.railroadWeight, false);
        return;
      }
    } catch (error) {
      alert(Language.get('alerts.feature_not_supported'));
      console.error(error);
    }

    // Loop through all markers and pick the nearest neighbor to that marker.
    for (let i = 0; i < newMarkers.length; i++) {
      let current = Routes.nearestNeighborTo(last, newMarkers, polylines, RouteSettings.maxDistance);
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

  setCustomRouteStart: function (lat, lng, startNow) {
    lat = parseFloat(lat) ? parseFloat(lat) : -119.9063;
    lng = parseFloat(lng) ? parseFloat(lng) : 8.0313;

    document.getElementById('generate-route-start').value = 'Custom';
    document.getElementById('generate-route-start-lat').value = lat;
    $('#generate-route-start-lat').parent().show();
    document.getElementById('generate-route-start-lng').value = lng;
    $('#generate-route-start-lng').parent().show();

    RouteSettings.genPathStart = 'Custom';
    RouteSettings.startMarkerLat = lat;
    RouteSettings.startMarkerLng = lng;

    if (startNow)
      Routes.generatePath(true);
  }
};