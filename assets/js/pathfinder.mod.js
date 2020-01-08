var PathFinder = require('geojson-path-finder')
//var nearest = require('turf-nearest')
var point = require('turf-point')
var featurecollection = require('turf-featurecollection')
//var lemoyne = require('./../../data/geojson/lemoyne.json')


class Chunk {

	constructor() {
		this.markers = []
		this.bounds = null
	}

	_calcBounds() {
		var latMin = null
		var lngMin = null
		var latMax = null
		var lngMax = null
		for(var i = 0; i < this.markers.length; i++) {
			this.markers[i].lat = parseFloat(this.markers[i].lat)
			this.markers[i].lng = parseFloat(this.markers[i].lng)
			if(latMin === null || this.markers[i].lat < latMin) latMin = this.markers[i].lat
			if(lngMin === null || this.markers[i].lng < lngMin) lngMin = this.markers[i].lng
			if(latMax === null || this.markers[i].lat > latMax) latMax = this.markers[i].lat
			if(lngMax === null || this.markers[i].lng > lngMax) lngMax = this.markers[i].lng
		}
		if(latMin == latMax) latMax += 0.000001
		if(lngMin == lngMax) lngMax += 0.000001

		this.bounds = L.latLngBounds({ lat: latMin, lng: lngMin }, { lat: latMax, lng: lngMax })
	}

	_canAdd(marker) {
		if(this.bounds == null) return true
		var d = MapBase.map.distance(marker, this.bounds.getCenter())
		return d < 10
	}

	addMarker(marker) {
		if(this._canAdd(marker)) {
			this.markers.push(marker)
			this._calcBounds()
			return true
		} else {
			return false
		}
	}

	getBounds() {
		return this.bounds
	}

}

window.PF = {
	router: null,
	_PathFinder: null,
	_points: [],
	_chunks: []
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

PF.generateChunks = function() {
	var markers = MapBase.markers.filter((marker) => { return marker.isVisible; })

	var chunks = [new Chunk()]
	for(var i = 0; i < markers.length; i++) {
		var added = false
		for(var j = 0; j < chunks.length; j++) {
			if(chunks[j].addMarker(markers[i])) {
				added = true
				break
			}
		}
		if(!added) {
			var c = new Chunk()
			c.addMarker(markers[i])
			chunks.push(c)
		}
	}

	console.log(chunks.length)
	for(var j = 0; j < chunks.length; j++) {
		L.rectangle(chunks[j].getBounds(), {color: "#ff7800", weight: 1}).addTo(MapBase.map);
	}
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

	PF.generateChunks()
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

PF.findNearestTravelItem = async function(start, markers, maxWeight) {
	if(PF._PathFinder === null) PF.createPathFinder()

	var startPoint = PF.getNearestNode(start)

	var markerPoints = markers.map(function(mark){
		return PF.getNearestNode(mark)
	})

	var shortest = {weight: Number.MAX_SAFE_INTEGER, marker: null}
	for(let i = 0; i < markerPoints.length; i++) {
		if(markerPoints[i] == null) continue
		var path = await (new Promise((res) => { window.requestAnimationFrame(() => {
			res(PF._PathFinder.findPath(startPoint, markerPoints[i]))
		}) }))
		if(path !== null) {
			if(maxWeight <= path.weight && path.weight < shortest.weight) {
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