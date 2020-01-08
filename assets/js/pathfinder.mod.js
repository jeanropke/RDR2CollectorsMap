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

PF.getNearestNode = function(point, drawBounds) {
	var pointLatLng = point
	if(typeof(point.lat) == 'undefined') {
		pointLatLng = PF.PointToLatLng(point)
	} else {
		pointLatLng.lat = parseFloat(pointLatLng.lat)
		pointLatLng.lng = parseFloat(pointLatLng.lng)
	}
	var pointBounds = L.latLngBounds([
		[pointLatLng.lat-5, pointLatLng.lng-5],
		[pointLatLng.lat+5, pointLatLng.lng+5]
	])
	if(typeof(drawBounds) === 'boolean' && drawBounds) {
		L.rectangle(pointBounds, {color: "#ff7800", weight: 3}).addTo(MapBase.map);
	}

	var filtered = PF._points.features.filter((p) => {
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
	PF._PathFinder = new PathFinder(MapBase.drawnItems.toGeoJSON(), {
		precision: 0.04,
		weightFn: function(a, b, props) {
			var dx = a[0] - b[0];
			var dy = a[1] - b[1];
			return Math.sqrt(dx * dx + dy * dy);
		}
	})
	var _vertices = PF._PathFinder._graph.vertices;
	PF._points = featurecollection(
		Object
			.keys(_vertices)
			.filter(function(nodeName) {
				return Object.keys(_vertices[nodeName]).length
			})
			.map(function(nodeName) {
				var vertice = PF._PathFinder._graph.sourceVertices[nodeName]
				return point(vertice)
			})
	);
}

PF.latLngToPoint = function(latlng) {
	return {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[parseFloat(latlng.lng), parseFloat(latlng.lat)]}}
}
PF.PointToLatLng = function(point) {
	return L.latLng(point.geometry.coordinates[1], point.geometry.coordinates[0])
}

PF.createController = function() {
	if(PF.router !== null) {
		MapBase.map.removeControl(PF.router)
	}

	PF.router = L.Routing.control({
		showAlternatives: false,
		fitSelectedRoutes: false,
		plan: L.Routing.plan([], { draggableWaypoints: false, createMarker: function(){} }),
		lineOptions: {
			styles: [{color: 'black', opacity: 0.15, weight: 9}, {color: 'white', opacity: 0.8, weight: 6}, {color: 'blue', opacity: 1, weight: 2}],
			addWaypoints: false
		},
		router: { route: function(waypoints, callback, context) {
			if(PF._PathFinder === null) PF.createPathFinder()
			console.log('Finding route...')
		
			let pick = []
			for(let i = 0; i < waypoints.length; i++) {
				var point = PF.latLngToPoint(waypoints[i].latLng)
				var realpoint = PF.getNearestNode(point)
				if(realpoint !== null)
					pick.push(realpoint)
			}
			try {
				var pathWaypoints = [{latLng: PF.PointToLatLng(pick[0])}]
				var pathPoints = []
				var weight = 0
	
				for(let i = 1; i < pick.length; i++) {
					var p = PF._PathFinder.findPath(
						pick[i-1],
						pick[i]
					)
					if(p !== null) {
						pathWaypoints.push({latLng: PF.PointToLatLng(pick[i])})

						if(pathPoints.length == 0)
							pathPoints.push(pick[i-1].geometry.coordinates)

						pathPoints = pathPoints.concat(p.path)
						pathPoints.push(PF.latLngToPoint(waypoints[i].latLng).geometry.coordinates)

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

PF.findNearestTravelItem = async function(start, markers) {
	if(PF._PathFinder === null) PF.createPathFinder()

	var startPoint = PF.getNearestNode(start)

	var markerPoints = markers.map(function(mark){
		return PF.getNearestNode(mark)
	})

	var shortest = {weight: Number.MAX_SAFE_INTEGER, marker: false}
	for(let i = 0; i < markerPoints.length; i++) {
		if(markerPoints[i] == null) continue
		var path = await (new Promise((res) => { window.requestAnimationFrame(() => {
			res(PF._PathFinder.findPath(startPoint, markerPoints[i]))
		}) }))
		if(path !== null) {
			if(path.weight < shortest.weight) {
				shortest.weight = path.weight
				shortest.marker = markers[i]
			}
		}
	}
	
	return shortest.marker
}

PF.pathfinderStart = function(markers) {
	if(PF.router === null)
		PF.createController()

	if(typeof(markers) === 'undefined') markers = MapBase.markers.filter((marker) => { return marker.isVisible; })
	var markersWaypoints = []
	for(let i = 0; i < markers.length; i++) {
		markersWaypoints.push([parseFloat(markers[i].lat), parseFloat(markers[i].lng)])
	}
	PF.router.setWaypoints(markersWaypoints)
	//window.router.route()
}