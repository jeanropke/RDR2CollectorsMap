var PathFinder = require('geojson-path-finder')
var nearest = require('turf-nearest')
var point = require('turf-point')
var featurecollection = require('turf-featurecollection')
//var lemoyne = require('./../../data/geojson/lemoyne.json')


window.router = null

function createControler() {
	window._PathFinder = new PathFinder(MapBase.drawnItems.toGeoJSON(), { precision: 0.1 })
	var _vertices = window._PathFinder._graph.vertices;
	window._points = featurecollection(
		Object
			.keys(_vertices)
			.filter(function(nodeName) {
				return Object.keys(_vertices[nodeName]).length
			})
			.map(function(nodeName) {
				var vertice = window._PathFinder._graph.sourceVertices[nodeName]
				return point(vertice)
			})
	);

	if(window.router !== null) {
		MapBase.map.removeControl(window.router)
	}

	window.router = L.Routing.control({
		showAlternatives: false,
		router: { route: function(waypoints, callback, context) {
			console.log('Finding route...')
		
			let pick = []
			for(let i = 0; i < waypoints.length; i++) {
				var point = {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[waypoints[i].latLng.lng, waypoints[i].latLng.lat]}}
				var realpoint = nearest(point, window._points)
				pick.push(realpoint)
			}
			try {
				var pathWaypoints = [{latLng: L.latLng(pick[0].geometry.coordinates[1], pick[0].geometry.coordinates[0])}]
				var pathPoints = []
	
				for(let i = 1; i < pick.length; i++) {
					pathWaypoints.push({latLng: L.latLng(pick[i].geometry.coordinates[1], pick[i].geometry.coordinates[0])})
					var p = window._PathFinder.findPath(
						pick[i-1],
						pick[i]
					)
					if(p !== null) {
						pathPoints = pathPoints.concat(p.path)
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
						summary: {totalTime: 0, totalDistance: 0},
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

window.pathfinderStart = function() {
	createControler()

	var markers = MapBase.markers.filter((marker) => { return marker.isVisible; })
	var markersWaypoints = []
	for(let i = 0; i < markers.length; i++) {
		if(markers[i].lat < -61 && markers[i].lng > 120) {
			markersWaypoints.push([parseFloat(markers[i].lat), parseFloat(markers[i].lng)])
		}
	}
	window.router.setWaypoints(markersWaypoints)
	//window.router.route()
}