var PathFinder = require('geojson-path-finder')
//var nearest = require('turf-nearest')
var point = require('turf-point')
var featurecollection = require('turf-featurecollection')
//var lemoyne = require('./../../data/geojson/lemoyne.json')

window.PF = {
	router: null,
	_PathFinder: null,
	_points: []
}

PF.getNearestNode = function(point, collection) {
	var pointLatLng = PF.PointToLatLng(point)
	var pointBounds = L.latLngBounds([
		[pointLatLng.lat-10, pointLatLng.lng-10],
		[pointLatLng.lat+10, pointLatLng.lng+10]
	])

	var filtered = collection.features.filter((p) => {
		return pointBounds.contains(PF.PointToLatLng(p));
	})
	var n = {distance: Number.MAX_SAFE_INTEGER, point: null}
	for(let i = 0; i < filtered.length; i++) {
		var distance = MapBase.map.distance(
			pointLatLng, 
			PF.PointToLatLng(filtered[i])
		);
		if(distance < n.distance) {
			n.distance = distance
			n.point = filtered[i]
		}
	}

	return n.point
}

PF.createPathFinder = function() {
	window.PF._PathFinder = new PathFinder(MapBase.drawnItems.toGeoJSON(), {
		precision: 0.04,
		weightFn: function(a, b, props) {
			var dx = a[0] - b[0];
			var dy = a[1] - b[1];
			return Math.sqrt(dx * dx + dy * dy);
		}
	})
	var _vertices = window.PF._PathFinder._graph.vertices;
	window.PF._points = featurecollection(
		Object
			.keys(_vertices)
			.filter(function(nodeName) {
				return Object.keys(_vertices[nodeName]).length
			})
			.map(function(nodeName) {
				var vertice = window.PF._PathFinder._graph.sourceVertices[nodeName]
				return point(vertice)
			})
	);
}

PF.latLngToPoint = function(latlng) {
	return {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[latlng.lng, latlng.lat]}}
}
PF.PointToLatLng = function(point) {
	return L.latLng(point.geometry.coordinates[1], point.geometry.coordinates[0])
}

PF.createControler = function() {
	if(PF.router !== null) {
		MapBase.map.removeControl(PF.router)
	}

	PF.router = L.Routing.control({
		showAlternatives: false,
		fitSelectedRoutes: false,
		plan: L.Routing.plan([], { draggableWaypoints: false, createMarker: function(){} }),
		router: { route: function(waypoints, callback, context) {
			if(PF._PathFinder === null) PF.createPathFinder()
			console.log('Finding route...')
		
			let pick = []
			for(let i = 0; i < waypoints.length; i++) {
				var point = PF.latLngToPoint(waypoints[i].latLng)
				var realpoint = PF.getNearestNode(point, PF._points)
				if(realpoint !== null)
					pick.push(realpoint)
			}
			try {
				var pathWaypoints = [{latLng: PF.PointToLatLng(pick[0])}]
				var pathPoints = []
				var weight = 0
	
				for(let i = 1; i < pick.length; i++) {
					pathWaypoints.push({latLng: PF.PointToLatLng(pick[i])})
					var p = PF._PathFinder.findPath(
						pick[i-1],
						pick[i]
					)
					if(p !== null) {
						pathPoints = pathPoints.concat(p.path)
						weight += p.weight
					}
				}
	
				if(pathPoints.length > 1) {
					var path = []
					for(var i = 0; i < pathPoints.length; i++) {
						path.push(L.latLng(pathPoints[i][1], pathPoints[i][0]))
					}
	
					var r = [{
						name: '',
						waypoints: pathWaypoints,
						inputWaypoints: waypoints,
						summary: {totalTime: (weight*20) * 0.1, totalDistance: weight*20},
						coordinates: path,
						instructions: []
					}]
					callback.call(context, null, r)
				} else {
					callback.call(context, {status: 'failed', message: 'No path found'}, null)
				}
			} catch(e) {
				console.error(e)
				callback.call(context, {status: 'failed', message: e.message}, null)
			}
		} }
	}).addTo(MapBase.map)
}

PF.findNearestTravelItem = function(start, markers) {
	if(PF._PathFinder === null) PF.createPathFinder()

}

PF.pathfinderStart = function(markers) {
	if(PF.router === null)
		PF.createControler()

	if(typeof(markers) === 'undefined') markers = MapBase.markers.filter((marker) => { return marker.isVisible; })
	var markersWaypoints = []
	for(let i = 0; i < markers.length; i++) {
		if(markers[i].lat < -61 && markers[i].lng > 120) {
			markersWaypoints.push([parseFloat(markers[i].lat), parseFloat(markers[i].lng)])
		}
	}
	PF.router.setWaypoints(markersWaypoints)
	//window.router.route()
}