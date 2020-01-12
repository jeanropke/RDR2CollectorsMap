// Simple utility to get the distance between two markers in Leaflet.
function getDistance(marker1, marker2) {
    var latlng1 = L.latLng([marker1.lat, marker1.lng]);
    var latlng2 = L.latLng([marker2.lat, marker2.lng]);

    return MapBase.map.distance(latlng1, latlng2);
}

// Simple utility to check whether the two given markers are the same.
function isSameMarker(marker1, marker2) {
    return marker1.lat == marker2.lat && marker1.lng == marker2.lng
}

// Find the nearest neighbor to the given marker.
// Needs to have an array of the possible markers and currently chosen paths and the maximum distance a path can be.
function nearestNeighborTo(marker, possibleNeighbors, polylines, maxDistance) {
    var resDistance = null;
    for (var i = 0; i < possibleNeighbors.length; i++) {
        var element = possibleNeighbors[i];

        // Calculate closest path.
        var distance = getDistance(marker, element);

        // Skip any distance over maxDistance.
        if (distance > maxDistance) continue;

        // Skip the current marker.
        if (isSameMarker(marker, element)) continue;

        // Skip existing paths in polylines.
        var pathExists = false;
        var markerNodeCount = 0;
        var elementNodeCount = 0;

        polylines.forEach((polyline) => {
            // Check if the path is already drawn to prevent looping paths.
            // {element, marker} exists
            if (isSameMarker(polyline[0], element) && isSameMarker(polyline[1], marker)) {
                pathExists = true;
            }

            // {marker, element} exists
            if (isSameMarker(polyline[0], marker) && isSameMarker(polyline[1], element)) {
                pathExists = true;
            }

            // Count how many paths the element and marker is in already to prevent more than two path lines from each marker.
            // {element, Any} or {Any, element} exists
            if (isSameMarker(polyline[0], element) || isSameMarker(polyline[1], element)) {
                elementNodeCount++;
            }

            // {marker, Any} or {Any, marker} exists
            if (isSameMarker(polyline[0], marker) || isSameMarker(polyline[1], marker)) {
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
    }
}

// Needed to keep track of the previously drawn path so we can remove it later.
var previousPath = null;

// Generate a path using a nearest neighbor algorithm.
// maxDistance: The maximum distance a path can be in points.
// - This number might need to be tweaked depending on how many markers there are.
// - 25 seems optimal for everything, a higher number is needed for less markers.
// - If the number is too low, the path will end prematurely.
// - If the number is too high, undesirable paths might be drawn (across Iron Lake for example).
function generatePath(maxDistance = 25) {
    // Allows for clearing the drawn path.
    if (previousPath) previousPath.remove(MapBase.map);

    // Setup variables.
    var newMarkers = markers.filter((marker) => { return marker.isVisible; });
    var polylines = [];

    // The starting point of the path.
    var first = nearestNeighborTo({ lat: -119.9063, lng: 8.0313 }, newMarkers, polylines, maxDistance);

    // The last marker from the loop.
    var last = first.marker;

    // Loop through all markers and pick the nearest neighbor to that marker.
    for (var i = 0; i < newMarkers.length; i++) {
        var current = nearestNeighborTo(last, newMarkers, polylines, maxDistance);
        if (!current) break;
        current = current.marker;

        if (getDistance(last, current) < maxDistance) {
            polylines.push([{ lat: last.lat, lng: last.lng }, { lat: current.lat, lng: current.lng }]);
        }

        last = current;
    }

    // Draw all paths on the map.
    previousPath = L.polyline(polylines).addTo(MapBase.map);
}

var defaultMaxDistance = 25;
var maxDistance = prompt(`Please enter the maximum length of any one path. ${defaultMaxDistance} is the default and recommended if you have all markers enabled. If you don't have all markers enabled, try something higher, like 50. Feel free to experiment!`, defaultMaxDistance);

if (maxDistance == null || maxDistance == "" || isNaN(maxDistance)) {
    maxDistance = defaultMaxDistance;
    alert(`The maximum path length has been set to the default of ${maxDistance} because you didn't enter anything valid.`);
}

generatePath(maxDistance);