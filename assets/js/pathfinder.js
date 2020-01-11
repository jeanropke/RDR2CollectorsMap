(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var PathFinder = require('geojson-path-finder')
//var nearest = require('turf-nearest')
var point = require('turf-point')
var featurecollection = require('turf-featurecollection')

var ambarino = require('./../../data/geojson/ambarino.json')
var lemoyne = require('./../../data/geojson/lemoyne.json')
var newAustin = require('./../../data/geojson/new-austin.json')
var newHanover = require('./../../data/geojson/new-hanover.json')
var westElizabeth = require('./../../data/geojson/west-elizabeth.json')

var completeGeoJson = {"type":"FeatureCollection","features":[]}
completeGeoJson.features = completeGeoJson.features.concat(ambarino.features)
completeGeoJson.features = completeGeoJson.features.concat(lemoyne.features)
completeGeoJson.features = completeGeoJson.features.concat(newAustin.features)
completeGeoJson.features = completeGeoJson.features.concat(newHanover.features)
completeGeoJson.features = completeGeoJson.features.concat(westElizabeth.features)



class Chunk {

	constructor() {
		this.markers = []
		this.bounds = null
		this.isDone = false
	}

	_calcBounds() {
		var latMin = null
		var lngMin = null
		var latMax = null
		var lngMax = null
		for(var i = 0; i < this.markers.length; i++) {
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
		return d < 20
	}

	addMarker(marker) {
		marker.lat = parseFloat(marker.lat)
		marker.lng = parseFloat(marker.lng)
		if(this._canAdd(marker)) {
			this.markers.push(marker)
			this._calcBounds()
			return true
		} else {
			return false
		}
	}

	contains(marker) {
		for(var i = 0; i < this.markers.length; i++) {
			if(this.markers[i].text == marker.text && this.markers[i].lat == marker.lat)
				return true
		}
		return false
	}

	getBounds() {
		return this.bounds
	}

	static get chunks() {
		if(typeof(Chunk._chunks) === 'undefined') return []
		return Chunk._chunks
	}

	static newChunk() {
		if(typeof(Chunk._chunks) === 'undefined') Chunk.clearChunks()
		var c = new Chunk()
		Chunk._chunks.push(c)
		return c
	}

	static clearChunks() {
		Chunk._chunks = []
	}

	static sortMarker(marker) {
		var added = false
		for(var j = 0; j < Chunk.chunks.length; j++) {
			if(Chunk.chunks[j].addMarker(marker)) {
				added = true
				break
			}
		}
		if(!added) {
			var c = Chunk.newChunk()
			c.addMarker(marker)
		}
	}

	static getChunkByMarker(marker) {
		for(var j = 0; j < Chunk.chunks.length; j++) {
			if(Chunk.chunks[j].contains(marker)) {
				return Chunk.chunks[j]
			}
		}
		return null
	}

}

class RouteControl extends L.Control {

	constructor() {
		super({ position: 'topright' })

		this._element = null

		this._beforeButton = null
		this._currentButton = null
		this._afterButton = null

		this.currentPath = 0
		this._paths = []
	}

	onAdd() {
		this._element = L.DomUtil.create('div', 'leaflet-bar pathfinder-control');

		this._beforeButton = L.DomUtil.create('button', 'pathfinder-btn pathfinder-btn-before', this._element);
		this._currentButton = L.DomUtil.create('button', 'pathfinder-btn pathfinder-btn-current', this._element);
		this._afterButton = L.DomUtil.create('button', 'pathfinder-btn pathfinder-btn-after', this._element);
		
		this._beforeButton.innerHTML = '&lt;'
		this._beforeButton.setAttribute('disabled', true)
		L.DomEvent.on(this._beforeButton, 'click', () => { this.selectPath(-1) })

		this._currentButton.style.fontWeight =  'bold'
		this._currentButton.innerHTML = '0 / 0'
		L.DomEvent.on(this._currentButton, 'click', () => { this.selectPath(0) })

		this._afterButton.innerHTML = '&gt;'
		this._afterButton.setAttribute('disabled', true)
		L.DomEvent.on(this._afterButton, 'click', () => { this.selectPath(1) })

		return this._element;
	}

	onRemove() {
		delete this._element;
	}

	addPath(path) {
		this._paths.push(path)
		this.updateButtons()
	}

	updateButtons() {
		this._currentButton.innerHTML = this.currentPath + ' / ' + this._paths.length

		if(this.currentPath == 1) this._beforeButton.setAttribute('disabled', true)
		else this._beforeButton.removeAttribute('disabled', false)

		if(this.currentPath == this._paths.length) this._afterButton.setAttribute('disabled', true)
		else this._afterButton.removeAttribute('disabled', false)
	}

	selectPath(offset, absolute) {
		if(typeof(absolute) !== 'boolean') absolute = false
		var newindex = offset
		if(!absolute) newindex = this.currentPath + offset
		if(newindex >= 1 && newindex <= this._paths.length) {
			this.currentPath = newindex
			this.updateButtons()
			PF.highlightPath(this._paths[(this.currentPath-1)])
		}
	}

}

window.PF = {
	router: null,
	_PathFinder: null,
	_points: [],
	_currentChunk: null,
	_layerGroup: null,
	_layerControl: null,
	_currentPath: null,
	_running: false,
	_geoJson: completeGeoJson
}


PF.generateChunks = function() {
	Chunk.clearChunks()

	var markers = MapBase.markers.filter((marker) => { return marker.isVisible; })
	for(var i = 0; i < markers.length; i++) {
		Chunk.sortMarker(markers[i])
	}

	/*for(var j = 0; j < Chunk.chunks.length; j++) {
		L.rectangle(Chunk.chunks[j].getBounds(), {color: "#ff7800", weight: 1}).addTo(MapBase.map);
	}*/
}

PF.createPathFinder = function() {
	PF._PathFinder = new PathFinder(PF._geoJson, {
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

PF.createController = function() {
	return
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

PF.drawPath = function(path, color) {
	if(typeof(color) === 'undefined') color = '#0000ff'

	return L.polyline(path, {color: color, opacity: 0.6, weight: 5 }).addTo(PF._layerGroup)
}
PF.highlightPath = function(path) {
	if(PF._currentPath !== null) {
		PF._layerGroup.removeLayer(PF._currentPath)
	}
	PF._currentPath = L.layerGroup().addTo(PF._layerGroup)

	var line = L.polyline(path, {color: '#000000', opacity: 0.5, weight: 9 }).addTo(PF._currentPath)
	L.polyline(path, {color: '#ffffff', opacity: 1, weight: 7 }).addTo(PF._currentPath)
	L.polyline(path, {color: '#00bb00', opacity: 1, weight: 3 }).addTo(PF._currentPath)
	//MapBase.map.fitBounds(line.getBounds(), { padding: [30, 30], maxZoom: 7 })
}
PF.drawRoute = function(paths) {
	PF._layerGroup.clearLayers()
	PF._currentPath = null
	for(var i = 0; i < paths.length; i++) {
		PF.drawPath(paths[i], '#ff0000')
	}
}

PF.latLngToPoint = function(latlng) {
	var p = {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[parseFloat(latlng.lng), parseFloat(latlng.lat)]}}
	if(typeof(latlng.text) === 'string') p.properties.text = latlng.text
	return p
}
PF.PointToLatLng = function(point) {
	return L.latLng(point.geometry.coordinates[1], point.geometry.coordinates[0])
}

PF.getNearestNode = function(point, drawBounds) {
	var pointLatLng = point
	if(typeof(point.lat) == 'undefined') {
		pointLatLng = PF.PointToLatLng(point)
	} else {
		pointLatLng.lat = parseFloat(pointLatLng.lat)
		pointLatLng.lng = parseFloat(pointLatLng.lng)
	}
	var searchArea = 5
	var pointBounds = L.latLngBounds([
		[pointLatLng.lat-searchArea, pointLatLng.lng-searchArea],
		[pointLatLng.lat+searchArea, pointLatLng.lng+searchArea]
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

PF.findNearestChunk = function(marker, markerChunk) {
	var c = {weight: Number.MAX_SAFE_INTEGER, c: null}

	var markerNode = PF.getNearestNode(PF.latLngToPoint(marker))
	for(var i = 0; i < Chunk.chunks.length; i++) {
		if(Chunk.chunks[i].isDone) continue
		if(Chunk.chunks[i] == markerChunk) continue

		var chunkNode = PF.getNearestNode(PF.latLngToPoint(Chunk.chunks[i].getBounds().getCenter()))
		var p = PF._PathFinder.findPath(markerNode, chunkNode)
		if(p.weight < c.weight) {
			c.weight = p.weight
			c.c = Chunk.chunks[i]
		}
	}
	return c.c
}

PF.findMarkerByPoint = function(point, markers) {
	for(var i = 0; i < markers.length; i++) {
		if(point.properties.text == markers[i].text)
			return markers[i]
	}
	return null
}

PF.findNearestTravelItem = async function(start, markers) {
	if(PF._PathFinder === null) PF.createPathFinder()

	if(PF._currentChunk === null) {
		PF._currentChunk = Chunk.getChunkByMarker(start)
		if(PF._currentChunk == null) {
			console.error('Starting marker is not in chunk', start)
			return null
		}
	}
	var startPoint = PF.getNearestNode(start)

	var shortest = {weight: Number.MAX_SAFE_INTEGER, marker: null, path: null}
	while(shortest.marker === null) {
		var availableInChunk = PF._currentChunk.markers.filter((m) => { return markers.includes(m) })
		if(PF._currentChunk.isDone || availableInChunk.length <= 0) {
			PF._currentChunk.isDone = true
			PF._currentChunk = PF.findNearestChunk(start, PF._currentChunk)
			if(PF._currentChunk == null) return null
			availableInChunk = PF._currentChunk.markers.filter((m) => { return markers.includes(m) })
		}

		for(let i = 0; i < availableInChunk.length; i++) {
			// Request animation frame to unblock browser
			var path = await (new Promise((res) => { window.requestAnimationFrame(() => {
				// Find the nearest road node to all the markers
				var markerPoint = PF.getNearestNode(availableInChunk[i])
				if(markerPoint !== null) {
					// Find path and resolve
					res(PF._PathFinder.findPath(startPoint, markerPoint))
				} else {
					console.error('No node found to ', availableInChunk[i])
					res(null)
				}
			}) }))
			if(path !== null) {
				if(path.weight < shortest.weight) {
					shortest.weight = path.weight
					shortest.marker = availableInChunk[i]
					path.path.unshift([start.lng, start.lat])
					path.path.push([availableInChunk[i].lng, availableInChunk[i].lat])
					shortest.path = path.path.map((c) => { return [c[1], c[0]] })
				}
			}
		}

		if(shortest.marker === null) {
			PF._currentChunk.isDone = true
		}
	}
	
	return shortest
}

PF.pathfinderClear = function() {
	if(PF._running) return
	if(PF._layerControl !== null) MapBase.map.removeControl(PF._layerControl)
	if(PF._layerGroup !== null) MapBase.map.removeLayer(PF._layerGroup)
}

PF.pathfinderStart = async function() {
	if(PF._running) return
	PF._running = true
	PF._currentChunk = null

	PF.generateChunks()
	//if(PF._PathFinder === null) 
	PF.createPathFinder()
	//if(PF.router === null) PF.createController()
	
	if(PF._layerControl !== null) MapBase.map.removeControl(PF._layerControl)
	if(PF._layerGroup !== null) MapBase.map.removeLayer(PF._layerGroup)

	PF._layerGroup = L.layerGroup([]).addTo(MapBase.map)
	PF._layerControl = (new RouteControl()).addTo(MapBase.map)

	var markers = MapBase.markers.filter((marker) => { return (marker.isVisible && (!Routes.ignoreCollected || !marker.isCollected)); });

	var current = Routes.nearestNeighborTo(Routes.startMarker(), markers, [], -1)
	markers = markers.filter((m, i) => { return (m.text != current.marker.text || m.lat != current.marker.lat); })


	var last = current.marker
	var waypoints = [L.latLng(last.lat, last.lng)]
	var paths = []

	var markersNum = markers.length
	for (var i = 0; i < markersNum; i++) {
		var current = await PF.findNearestTravelItem(last, markers)
		if(current == null || current.marker == null) break
		markers = markers.filter((m, i) => { return (m.text != current.marker.text || m.lat != current.marker.lat); })
		last = current.marker

		waypoints.push(L.latLng(last.lat, last.lng))
		PF._layerControl.addPath(current.path)
		paths.push(current.path)
		PF.drawRoute(paths)
	}

	PF._layerControl.selectPath(1, true)

	PF._running = false

}
},{"./../../data/geojson/ambarino.json":2,"./../../data/geojson/lemoyne.json":3,"./../../data/geojson/new-austin.json":4,"./../../data/geojson/new-hanover.json":5,"./../../data/geojson/west-elizabeth.json":6,"geojson-path-finder":16,"turf-featurecollection":21,"turf-point":22}],2:[function(require,module,exports){
module.exports={"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[136.234375,-49.34375],[135.9375,-49.203125],[135.632813,-49.125],[135.34375,-49.015625],[135.0625,-48.898437],[134.617188,-48.679687],[134.34375,-48.445312],[134.273438,-48.171875],[134.222657,-48.035156],[134.197266,-47.966796],[134.18457,-47.932617],[134.171875,-47.898437],[134.160156,-47.868164],[134.148438,-47.83789],[134.125,-47.777343],[134.078125,-47.65625],[133.960938,-47.492187],[133.875,-47.1875],[133.773438,-46.984375],[133.664063,-46.789062],[133.515625,-46.609375],[133.414063,-46.351562],[133.359375,-46.125],[133.28125,-45.921875],[133.289063,-45.8125],[133.292969,-45.757812],[133.294922,-45.730469],[133.296875,-45.703125],[133.300293,-45.6875],[133.303711,-45.671875],[133.310547,-45.640625],[133.324219,-45.578125],[133.351563,-45.453125],[133.421875,-45.171875],[133.445313,-44.953125],[133.449219,-44.824218],[133.451172,-44.759765],[133.452149,-44.727539],[133.453125,-44.695312],[133.459961,-44.663085],[133.466797,-44.630859],[133.480469,-44.566406],[133.507813,-44.4375],[133.617188,-44.203125],[133.726563,-44.054687],[133.839844,-43.960937],[133.896484,-43.914062],[133.924805,-43.890624],[133.953125,-43.867187],[133.988281,-43.848632],[134.023438,-43.830078],[134.09375,-43.792968],[134.234375,-43.71875],[134.40625,-43.46875],[134.585938,-43.195312],[134.570313,-42.976562],[134.671875,-42.796875],[134.765625,-42.617187],[134.84375,-42.398437],[134.773438,-42.054687],[134.742188,-41.75],[134.710938,-41.367187],[134.648438,-40.945312],[134.601563,-40.640625],[134.5625,-40.375],[134.53125,-40.054687],[134.585938,-39.828125],[134.757813,-39.5],[134.984375,-39.375],[135.226563,-39.304687],[135.414063,-39.164062],[135.523438,-38.96875],[135.710938,-38.78125],[135.976563,-38.609375],[136.257813,-38.554687],[136.515625,-38.671875],[136.671875,-38.859375],[136.804688,-39.070312],[137.132813,-39.234375],[137.351563,-39.328125],[137.585938,-39.492187],[137.8125,-39.710937],[138.039063,-39.851562],[138.335938,-39.953125],[138.484376,-39.941406],[138.558594,-39.935546],[138.595704,-39.932617],[138.632813,-39.929687],[138.666016,-39.909179],[138.699219,-39.888671],[138.765626,-39.847656],[138.898438,-39.765625],[139.101563,-39.5625],[139.164063,-39.328125],[139.382813,-39.03125],[139.546875,-38.804687],[139.828125,-38.65625],[140.148438,-38.460937],[140.492188,-38.3125],[140.765625,-38.164062],[141,-37.875],[141.234375,-37.601562],[141.46875,-37.414062],[141.78125,-37.289062],[141.984375,-37.21875],[142.367188,-37.101562],[142.609375,-36.992187],[142.660156,-36.96875],[142.710938,-36.945312],[142.75,-36.921875],[142.789063,-36.898437],[142.867188,-36.851562],[143.15625,-36.75],[143.292969,-36.679687],[143.429688,-36.609375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[139.617188,-41.796875],[139.59375,-41.847656],[139.570313,-41.898437],[139.453125,-41.992187],[139.21875,-42.101562],[138.984375,-42.296875],[138.773438,-42.476562],[138.609375,-42.71875],[138.539063,-42.984375],[138.507813,-43.257812],[138.5625,-43.453125],[138.695313,-43.703125],[138.839844,-43.773437],[138.91211,-43.808594],[138.948242,-43.826172],[138.984375,-43.84375],[139.039063,-43.845703],[139.09375,-43.847656],[139.203125,-43.851562],[139.507813,-43.78125],[139.625,-43.53125],[139.765625,-43.390625],[139.9375,-43.429687],[139.96875,-43.601562],[139.960938,-43.765625],[140,-43.9375],[139.960938,-44.148437],[139.914063,-44.335937],[139.796875,-44.507812],[139.671875,-44.671875],[139.429688,-44.789062],[139.210938,-44.921875],[138.945313,-45.039062],[138.765625,-45.070312],[138.515625,-45.09375],[138.273438,-45.09375],[138.046875,-45.085937],[137.742188,-45.039062],[137.46875,-45.070312],[137.273438,-45.164062],[137.09375,-45.382812],[136.976563,-45.671875],[136.6875,-45.984375],[136.546875,-46.257812],[136.289063,-46.601562],[136.015625,-46.78125],[135.726563,-47.085937],[135.375,-47.273437],[135.054688,-47.460937],[134.734375,-47.601562],[134.46875,-47.75],[134.320313,-47.824219],[134.246094,-47.861328],[134.208984,-47.879883],[134.171875,-47.898437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[138.984375,-43.84375],[138.969727,-43.869141],[138.955078,-43.894531],[138.925782,-43.945312],[138.867188,-44.046875],[138.671875,-44.257812],[138.476563,-44.328125],[138.25,-44.21875],[138.039063,-44.109375],[137.84375,-44.0625],[137.515625,-44.109375],[137.320313,-44.179687],[137,-44.28125],[136.578125,-44.398437],[136.257813,-44.46875],[135.851563,-44.453125],[135.507813,-44.414062],[135.257813,-44.367187],[134.992188,-44.375],[134.695313,-44.4375],[134.507813,-44.570312],[134.257813,-44.757812],[134.03125,-44.992187],[133.882813,-45.21875],[133.65625,-45.398437],[133.492188,-45.5625],[133.394532,-45.632812],[133.345703,-45.667969],[133.321289,-45.685547],[133.296875,-45.703125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[138.632813,-39.929687],[138.629883,-39.963867],[138.626953,-39.998047],[138.621094,-40.066406],[138.609375,-40.203125],[138.59375,-40.585937],[138.617188,-40.84375],[138.796875,-41.078125],[138.871094,-41.164062],[138.908204,-41.207031],[138.926758,-41.228516],[138.945313,-41.25],[138.962891,-41.274414],[138.980469,-41.298828],[139.015626,-41.347656],[139.085938,-41.445312],[139.226563,-41.632812],[139.421875,-41.765625],[139.519532,-41.78125],[139.56836,-41.789062],[139.617188,-41.796875],[139.679688,-41.783203],[139.742188,-41.769531],[139.867188,-41.742187],[140.15625,-41.71875],[140.28125,-41.679687],[140.34375,-41.660156],[140.375,-41.650391],[140.40625,-41.640625],[140.4375,-41.634766],[140.46875,-41.628906],[140.53125,-41.617187],[140.65625,-41.59375],[140.859375,-41.578125],[141.085938,-41.53125],[141.335938,-41.585937],[141.625,-41.679687],[141.921875,-41.71875],[142.25,-41.75],[142.546875,-41.8125],[142.8125,-41.84375],[142.96875,-41.835937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[142.710938,-36.945312],[142.687501,-36.977539],[142.664063,-37.009765],[142.617188,-37.074218],[142.523438,-37.203125],[142.398438,-37.445312],[142.335938,-37.625],[142.382813,-37.851562],[142.40625,-38.007812],[142.359375,-38.164062],[142.296875,-38.335937],[142.308594,-38.394531],[142.320313,-38.453125],[142.336914,-38.483398],[142.353516,-38.513672],[142.386719,-38.574218],[142.453125,-38.695312],[142.625,-38.898437],[142.6875,-39.015625],[142.695313,-39.210937],[142.683594,-39.253906],[142.671875,-39.296875],[142.666016,-39.349609],[142.660157,-39.402343],[142.648438,-39.507812],[142.640625,-39.695312],[142.726563,-39.921875],[142.789063,-40.148437],[142.789063,-40.273437],[142.914063,-40.421875],[143.164063,-40.484375],[143.257813,-40.507812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[142.320313,-38.453125],[142.29004,-38.467773],[142.259766,-38.482422],[142.199219,-38.511718],[142.078125,-38.570312],[141.84375,-38.65625],[141.59375,-38.664062],[141.273438,-38.679687],[141.101563,-38.710937],[140.875,-38.804687],[140.601563,-38.804687],[140.453125,-39.023437],[140.296875,-39.296875],[140.085938,-39.609375],[139.976563,-39.726562],[139.867188,-39.695312],[139.648438,-39.835937],[139.578125,-40.101562],[139.460938,-40.25],[139.304688,-40.445312],[139.1875,-40.585937],[139.117188,-40.71875],[139.148438,-40.875],[139.132813,-41.078125],[139.023438,-41.21875],[138.984375,-41.234375],[138.945313,-41.25]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[142.671875,-39.296875],[142.605469,-39.304687],[142.539063,-39.3125],[142.421875,-39.453125],[142.132813,-39.53125],[141.914063,-39.664062],[141.679688,-39.820312],[141.515625,-39.921875],[141.195313,-40.046875],[141.039063,-40.351562],[140.914063,-40.492187],[140.796875,-40.734375],[140.703125,-40.898437],[140.585938,-41.0625],[140.492188,-41.1875],[140.382813,-41.375],[140.394532,-41.507812],[140.400391,-41.574219],[140.40332,-41.607422],[140.40625,-41.640625],[140.415039,-41.665039],[140.423828,-41.689453],[140.441407,-41.738281],[140.476563,-41.835937],[140.632813,-42.046875],[140.679688,-42.28125],[140.734375,-42.539062],[140.898438,-42.71875],[140.960938,-42.90625],[141,-43.25],[141.117188,-43.390625],[141.164063,-43.609375],[141.15625,-43.84375],[141.171875,-44.117187],[141.210938,-44.367187],[141.25,-44.554687],[141.203125,-44.929687],[141.179688,-45.109375],[141.296875,-45.351562],[141.460938,-45.554687],[141.546875,-45.695312],[141.351563,-45.820312],[141.179688,-46.046875],[141.132813,-46.234375],[141.289063,-46.382812],[141.414063,-46.578125],[141.367188,-46.757812],[141.179688,-46.820312],[141.03125,-46.882812],[141.023438,-47.164062],[140.992188,-47.390625],[140.78125,-47.640625],[140.734375,-47.820312],[140.730469,-47.933593],[140.728516,-47.990234],[140.726563,-48.046875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[124.054688,-45.648437],[124.304688,-45.640625],[124.65625,-45.5625],[124.90625,-45.539062],[125.296875,-45.601562],[125.5625,-45.6875],[125.621094,-45.714843],[125.650391,-45.728515],[125.679688,-45.742187],[125.72461,-45.751953],[125.769532,-45.761718],[125.859375,-45.78125],[126,-45.761718],[126.070313,-45.751953],[126.105469,-45.74707],[126.140625,-45.742187],[126.179688,-45.724609],[126.21875,-45.707031],[126.296875,-45.671874],[126.453125,-45.601562],[126.875,-45.429687],[127.132813,-45.210937],[127.304688,-45.039062],[127.546875,-44.695312],[127.828125,-44.523437],[128.140625,-44.367187],[128.246094,-44.269531],[128.298829,-44.220703],[128.325196,-44.196289],[128.351563,-44.171875],[128.414063,-44.169922],[128.476563,-44.167968],[128.601563,-44.164062],[128.820313,-44.28125],[129.148438,-44.273437],[129.4375,-44.320312],[129.734375,-44.4375],[130.148438,-44.570312],[130.554688,-44.53125],[130.90625,-44.445312],[131.171875,-44.492187],[131.4375,-44.695312],[131.539063,-44.976562],[131.648438,-45.226562],[132.039063,-45.40625],[132.414063,-45.382812],[132.726563,-45.226562],[133,-45.03125],[133.21875,-44.867187],[133.335938,-44.78125],[133.394531,-44.738281],[133.423828,-44.716797],[133.453125,-44.695312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[125.679688,-45.742187],[125.693359,-45.694336],[125.707031,-45.646484],[125.734375,-45.550781],[125.789063,-45.359375],[125.921875,-44.9375],[125.96875,-44.53125],[125.976563,-44.1875],[126.03125,-43.9375],[126.007813,-43.773437],[125.945313,-43.484375],[125.898438,-43.335937],[125.6875,-43.289062],[125.25,-43.546875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[124.21875,-47.15625],[124.453125,-47.15625],[124.867188,-47.148437],[125.257813,-47.101562],[125.59375,-47.132812],[126.078125,-47.109375],[126.328125,-47],[126.429688,-46.601562],[126.34375,-46.328125],[126.140625,-46.0625],[126.140625,-45.902344],[126.140625,-45.822266],[126.140625,-45.782227],[126.140625,-45.742187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[123.976563,-40.476562],[124.335938,-40.554687],[124.601563,-40.640625],[124.796875,-40.476562],[124.921875,-40.039062],[125.039063,-39.851562],[125.335938,-39.804687],[125.59375,-39.945312],[125.796875,-40.085937],[125.820313,-40.390625],[125.898438,-40.625],[126.054688,-40.851562],[126.242188,-41.015625],[126.398438,-41.046875],[126.539063,-40.929687],[126.742188,-41.03125],[127.09375,-41.023437],[127.328125,-41.039062],[127.425782,-40.999999],[127.47461,-40.980468],[127.499024,-40.970703],[127.523438,-40.960937],[127.556641,-40.966796],[127.589844,-40.972656],[127.656251,-40.984374],[127.789063,-41.007812],[128.109375,-41.101562],[128.265625,-41.203125],[128.414063,-41.382812],[128.523438,-41.425781],[128.578125,-41.447265],[128.605469,-41.458008],[128.632813,-41.46875],[128.677734,-41.464844],[128.722656,-41.460937],[128.8125,-41.453125],[129.109375,-41.4375],[129.46875,-41.445312],[129.835938,-41.445312],[130.164063,-41.453125],[130.507813,-41.5],[130.796875,-41.570312],[131.125,-41.632812],[131.304688,-41.828125],[131.484375,-42.023437],[131.6875,-42.164062],[131.929688,-42.328125],[132.179688,-42.554687],[132.34375,-42.773437],[132.492188,-43.039062],[132.710938,-43.304687],[132.9375,-43.34375],[133.226563,-43.398437],[133.414063,-43.570312],[133.640625,-43.6875],[133.820313,-43.789062],[133.886719,-43.828125],[133.919922,-43.847656],[133.953125,-43.867187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[128.632813,-41.46875],[128.610352,-41.484375],[128.587891,-41.5],[128.542969,-41.53125],[128.453125,-41.59375],[128.429688,-41.804687],[128.40625,-41.984375],[128.382813,-42.273437],[128.335938,-42.578125],[128.289063,-42.882812],[128.28125,-43.148437],[128.289063,-43.398437],[128.304688,-43.609375],[128.328125,-43.882812],[128.339844,-44.027343],[128.345703,-44.099609],[128.348633,-44.135742],[128.351563,-44.171875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[121.539063,-33.296875],[121.562501,-33.349609],[121.585938,-33.402343],[121.632813,-33.507812],[121.773438,-33.734375],[121.816407,-33.808593],[121.837891,-33.845703],[121.859375,-33.882812],[121.914063,-33.867187],[121.96875,-33.851562],[122.078125,-33.820312],[122.234375,-33.6875],[122.453125,-33.609375],[122.679688,-33.679687],[122.90625,-33.804687],[123.140625,-34.023437],[123.320313,-34.257812],[123.460938,-34.460937],[123.527344,-34.566406],[123.560547,-34.61914],[123.59375,-34.671875],[123.632813,-34.722656],[123.671875,-34.773437],[123.75,-34.875],[123.992188,-34.960937],[124.375,-34.828125],[124.765625,-34.710937],[124.90625,-34.722656],[124.976563,-34.728515],[125.046875,-34.734375],[125.098633,-34.726562],[125.150391,-34.71875],[125.253907,-34.703125],[125.460938,-34.671875],[125.628907,-34.664062],[125.712891,-34.660156],[125.754883,-34.658203],[125.796875,-34.65625],[125.850586,-34.646484],[125.904297,-34.636719],[126.011719,-34.617187],[126.226563,-34.578125],[126.679688,-34.554687],[127.109375,-34.492187],[127.617188,-34.398437],[128.117188,-34.359375],[128.515625,-34.320312],[128.921875,-34.304687],[129.242188,-34.421875],[129.421875,-34.429687],[129.65625,-34.335937],[130.046875,-34.148437],[130.523438,-33.742187],[130.90625,-33.351562],[131.289063,-33.023437],[131.625,-32.8125],[132.117188,-32.648437],[132.46875,-32.695312],[132.867188,-32.75],[133.203125,-32.78125],[133.46875,-32.5625],[133.65625,-32.164062],[134.054688,-31.835937],[134.679688,-31.445312],[134.953125,-31.289062],[135.304688,-31.171875],[135.585938,-31.09375],[135.867188,-31.203125],[136.179688,-31.359375],[136.453125,-31.476562],[136.585938,-31.546875],[136.820313,-31.53125],[137.054688,-31.71875],[137.367188,-32.125],[137.648438,-32.328125],[137.984375,-32.351562],[138.421875,-32.28125],[138.898438,-32.195312],[139.242188,-32.171875],[139.578125,-32.304687],[139.859375,-32.546875],[140.09375,-32.8125],[140.460938,-33.03125],[140.679688,-33.257812],[140.953125,-33.578125],[141.117188,-33.742187],[141.398438,-33.789062],[141.734375,-33.6875],[141.8125,-33.515625],[141.820313,-33.296875],[141.898438,-33.164062],[142.140625,-33.117187],[142.328125,-33.132812],[142.429688,-33],[142.632813,-33.1875],[142.851563,-33.148437],[143.117188,-33.039062],[143.265625,-33.148437],[143.429688,-33.265625],[143.617188,-33.085937],[143.78125,-33.09375],[143.992188,-33.25],[144.1875,-33.257812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[125.796875,-34.65625],[125.773438,-34.674805],[125.75,-34.693359],[125.703125,-34.730468],[125.609375,-34.804687],[125.550781,-34.925781],[125.521484,-34.986328],[125.492188,-35.046875],[125.494141,-35.097656],[125.496094,-35.148437],[125.5,-35.25],[125.585938,-35.53125],[125.664063,-35.773437],[125.65625,-36.015625],[125.476563,-36.09375],[125.234375,-36.0625],[125.101563,-36.085937],[125.117188,-36.226562],[125.03125,-36.484375],[125.125,-36.8125],[125.414063,-36.976562],[125.601563,-36.898437],[125.773438,-36.757812],[126,-36.851562],[126.1875,-36.9375],[126.34375,-37.039062],[126.492188,-37.117187],[126.507813,-37.320312],[126.585938,-37.476562],[126.726563,-37.609375],[127.054688,-37.609375],[127.320313,-37.539062],[127.640625,-37.539062],[127.84375,-37.625],[128.125,-37.773437],[128.398438,-37.804687],[128.609375,-37.75],[128.726563,-37.96875],[128.796875,-38.210937],[128.859375,-38.414062],[128.765625,-38.632812],[128.765625,-38.75],[128.953125,-38.789062],[129.257813,-38.664062],[129.445313,-38.515625],[129.480469,-38.449219],[129.53125,-38.421875],[129.548828,-38.458984],[129.543945,-38.514648],[129.539063,-38.570312],[129.46875,-38.796875],[129.367188,-39.070312],[129.15625,-39.484375],[128.851563,-39.765625],[128.421875,-40.070312],[128.148438,-40.289062],[127.96875,-40.507812],[127.804688,-40.734375],[127.617188,-40.890625],[127.570313,-40.925781],[127.523438,-40.960937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[121.537109,-33.296875],[121.502197,-33.333008],[121.467285,-33.36914],[121.397461,-33.441406],[121.257813,-33.585937],[121.085938,-33.835937],[121.046875,-34.054687],[121.039063,-34.335937],[121.039063,-34.640625],[120.945313,-34.851562],[120.742188,-34.96875],[120.585938,-35.109375],[120.460938,-35.273437],[120.476563,-35.59375],[120.53125,-35.703125],[120.453125,-35.929687],[120.351563,-36.101562],[120.023438,-36.1875],[119.78125,-36.367187],[119.640625,-36.507812],[119.554688,-36.804687],[119.5,-37.09375],[119.578125,-37.4375],[119.6875,-37.695312],[119.710938,-37.96875],[119.664063,-38.21875],[119.648438,-38.445312],[119.664063,-38.78125],[119.742188,-39.03125],[119.976563,-39.320312],[120.25,-39.445312],[120.703125,-39.609375],[121.210938,-39.695312],[121.367188,-39.78125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[121.210938,-35.5625],[121.257813,-35.242187],[121.3125,-34.882812],[121.296875,-34.632812],[121.304688,-34.527343],[121.308594,-34.474609],[121.3125,-34.421875],[121.3125,-34.380859],[121.3125,-34.339844],[121.3125,-34.257812],[121.3125,-34.09375],[121.382813,-33.8125],[121.46875,-33.484375],[121.50293,-33.391602],[121.52002,-33.345215],[121.537109,-33.298828],[121.547363,-33.257324],[121.557617,-33.21582],[121.578125,-33.132812],[121.71875,-32.726562],[121.710938,-32.382812],[121.65625,-32.085937],[121.679688,-31.789062],[121.71875,-31.484375],[121.71875,-31.421875],[121.71875,-31.359375],[121.689453,-31.302734],[121.660157,-31.246093],[121.601563,-31.132812],[121.453125,-30.960937],[121.265625,-30.640625],[121.09375,-30.460937],[120.835938,-30.257812],[120.664063,-30],[120.640625,-29.726562],[120.621094,-29.613281],[120.611328,-29.55664],[120.606445,-29.52832],[120.601563,-29.5],[120.588867,-29.458984],[120.576172,-29.417969],[120.550781,-29.335937],[120.5,-29.171875],[120.46875,-29.015625],[120.3125,-28.820312],[120.382813,-28.65625],[120.4375,-28.46875],[120.257813,-28.140625],[120.28125,-27.929687],[120.242188,-27.648437],[120.03125,-27.523437],[120.15625,-27.320312],[120.3125,-27.203125],[120.382813,-27.039062],[120.359375,-26.859375],[120.351563,-26.46875],[120.546875,-26.398437],[120.9375,-26.46875],[121.335938,-26.632812],[121.648438,-26.789062],[121.984375,-27.015625],[122.15625,-27.1875],[122.304688,-27.28125],[122.679688,-27.25],[123.046875,-27.132812],[123.234375,-26.945312],[123.296875,-26.789062],[123.382813,-26.632812],[123.601563,-26.75],[123.703125,-26.945312],[123.828125,-27.273437],[123.914063,-27.546875],[124.125,-27.703125],[124.414063,-27.851562],[124.5625,-27.890625],[124.695313,-28.03125],[124.796875,-28.304687],[124.96875,-28.460937],[125.25,-28.625],[125.40625,-28.796875],[125.34375,-28.976562],[125.070313,-29.210937],[124.796875,-29.390625],[124.671875,-29.59375],[124.421875,-29.664062],[124.15625,-29.632812],[123.875,-29.53125],[123.65625,-29.5],[123.476563,-29.65625],[123.203125,-29.789062],[122.953125,-29.757812],[122.742188,-29.734375],[122.546875,-29.828125],[122.429688,-30.007812],[122.390625,-30.3125],[122.398438,-30.507812],[122.351563,-30.789062],[122.25,-31.046875],[122.101563,-31.210937],[121.914063,-31.257812],[121.81836,-31.308593],[121.770508,-31.333984],[121.720703,-31.357422]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[121.314453,-34.421875],[121.353271,-34.383789],[121.39209,-34.345703],[121.469727,-34.269531],[121.625,-34.117187],[121.743164,-34],[121.802246,-33.941406],[121.831787,-33.912109],[121.861328,-33.882812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[125.046875,-34.734375],[125.102539,-34.773437],[125.158203,-34.8125],[125.269531,-34.890625],[125.380859,-34.96875],[125.436523,-35.007812],[125.492188,-35.046875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[123.59375,-34.671875],[123.537109,-34.695312],[123.480469,-34.71875],[123.367188,-34.765625],[123.28125,-34.945312],[122.984375,-35.046875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[120.601563,-29.5],[120.570313,-29.483398],[120.539063,-29.466797],[120.507813,-29.450195],[120.476563,-29.433594],[120.414063,-29.400391],[120.351563,-29.367187],[120.289063,-29.322266],[120.226563,-29.277344],[120.101563,-29.1875],[119.828125,-29.171875],[119.429688,-29.085937],[119.109375,-28.960937],[118.890625,-28.976562],[118.59375,-28.90625],[118.34375,-28.726562],[118.351563,-28.828125],[118.355469,-28.878906],[118.359375,-28.929687],[118.384766,-28.994141],[118.410156,-29.058594],[118.460938,-29.1875],[118.5,-29.316406],[118.519531,-29.380859],[118.529297,-29.413086],[118.539063,-29.445312],[118.557617,-29.477539],[118.576172,-29.509766],[118.613281,-29.574219],[118.6875,-29.703125],[118.820313,-29.9375],[118.726563,-30.210937],[118.726563,-30.453125],[118.617188,-30.726562],[118.632813,-30.953125],[118.5,-31.304687],[118.382813,-31.640625],[118.289063,-31.765625],[118.242188,-31.828125],[118.21875,-31.859375],[118.195313,-31.890625],[118.19043,-31.919922],[118.185547,-31.949219],[118.175781,-32.007812],[118.15625,-32.125],[118.234375,-32.320312],[118.46875,-32.367187],[118.789063,-32.28125],[118.902344,-32.21875],[118.958984,-32.1875],[119.015625,-32.15625],[119.039063,-32.117187],[119.0625,-32.078125],[119.109375,-32],[119.203125,-31.84375],[119.507813,-31.828125],[119.765625,-31.773437],[119.984375,-31.609375],[120.257813,-31.476562],[120.359375,-31.257812],[120.171875,-31.039062],[120.046875,-30.773437],[120.09375,-30.5],[120.265625,-30.132812],[120.296875,-29.703125],[120.324219,-29.536133],[120.337891,-29.452637],[120.351563,-29.369141]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[119.015625,-32.15625],[119,-32.210937],[118.984375,-32.265625],[118.953125,-32.375],[118.921875,-32.632812],[118.8125,-32.945312],[118.851563,-33.09375],[118.992188,-33.203125],[118.976563,-33.398437],[118.820313,-33.625],[118.703125,-33.929687],[118.585938,-34.296875],[118.5,-34.578125],[118.3125,-34.835937],[118,-35.03125],[117.914063,-35.148437],[117.835938,-35.40625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[117.78125,-35.484375],[117.859375,-35.515625],[117.96875,-35.367187],[118.085938,-35.226562],[118.226563,-35.15625],[118.210938,-35.273437],[118.164063,-35.429687],[118.328125,-35.4375],[118.429688,-35.3125],[118.539063,-35.40625],[118.632813,-35.53125],[118.734375,-35.695312],[118.8125,-35.867187],[118.859375,-35.960937],[118.859375,-36.195312],[118.734375,-36.375],[118.695313,-36.515625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[117.820313,-35.390625],[117.671875,-35.359375],[117.492188,-35.46875],[117.335938,-35.601562],[117.203125,-35.757812],[117.085938,-35.929687],[117.007813,-36.101562],[117.023438,-36.273437],[117.109375,-36.476562],[117.320313,-36.53125],[117.578125,-36.546875],[117.789063,-36.5],[118.039063,-36.507812],[118.21875,-36.460937],[118.445313,-36.429687],[118.554688,-36.382812],[118.585938,-36.226562],[118.695313,-36.140625],[118.820313,-36.132812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[117.796875,-35.460937],[117.617188,-35.601562],[117.523438,-35.742187],[117.445313,-35.867187],[117.421875,-36.015625],[117.453125,-36.1875],[117.648438,-36.257812],[117.914063,-36.28125],[118.023438,-36.28125],[117.9375,-36.382812],[117.703125,-36.421875],[117.570313,-36.460937],[117.453125,-36.539062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[118.359375,-28.929687],[118.273438,-28.917969],[118.1875,-28.90625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[118.539063,-29.445312],[118.482422,-29.445312],[118.425781,-29.445312],[118.3125,-29.445312],[118.132813,-29.367187],[118.078125,-29.3125],[118.050781,-29.285156],[118.023438,-29.257812],[118.00293,-29.232422],[117.982422,-29.207031],[117.941406,-29.15625],[117.859375,-29.054687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[118.023438,-29.257812],[118.013672,-29.302734],[118.003906,-29.347656],[117.984375,-29.4375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[118.195313,-31.890625],[118.157227,-31.907227],[118.119141,-31.923828],[118.042969,-31.957031],[117.890625,-32.023437],[117.515625,-32.195312],[116.984375,-32.3125],[116.703125,-32.359375],[116.304688,-32.453125],[116.238281,-32.503906],[116.171875,-32.554687],[116.161133,-32.594727],[116.150391,-32.634766],[116.128906,-32.714844],[116.085938,-32.875],[116.03125,-33.109375],[115.929688,-33.453125],[115.867188,-33.84375],[115.789063,-34.125],[115.648438,-34.390625],[115.53125,-34.609375],[115.453125,-34.90625],[115.382813,-35.226562],[115.375,-35.3125],[115.367188,-35.398437],[115.351563,-35.441406],[115.335938,-35.484375],[115.304688,-35.570312],[115.242188,-35.742187],[115.164063,-36.109375],[115.109375,-36.351562],[115.179688,-36.585937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[115.1875,-36.59375],[115.273438,-36.757812],[115.398438,-36.929687],[115.421875,-37.273437],[115.390625,-37.539062],[115.460938,-37.671875],[115.6875,-37.789062],[115.921875,-37.71875],[116.171875,-37.59375],[116.40625,-37.429687],[116.578125,-37.34375],[116.695313,-37.265625],[116.867188,-37.289062],[117.070313,-37.289062],[117.289063,-37.203125],[117.460938,-37.320312],[117.390625,-37.585937],[117.171875,-37.914062],[116.992188,-38.15625],[116.828125,-38.359375],[116.726563,-38.546875],[116.660156,-38.628906],[116.626953,-38.669922],[116.601563,-38.703125],[116.542969,-38.738281],[116.492188,-38.765625],[116.390625,-38.820312],[116.289063,-38.867187],[116.15625,-39.03125],[116.070313,-39.140625],[115.990234,-39.238281],[115.951172,-39.285156],[115.921875,-39.335937],[115.863281,-39.355469],[115.835938,-39.390625],[115.808594,-39.425781],[115.78125,-39.460937],[115.754883,-39.466797],[115.728516,-39.472656],[115.675781,-39.484375],[115.623047,-39.496094],[115.570313,-39.507812],[115.515625,-39.511719],[115.460938,-39.515625],[115.40625,-39.519531],[115.351563,-39.523437],[115.319336,-39.515625],[115.287109,-39.507812],[115.254883,-39.5],[115.222656,-39.492187],[115.19043,-39.484375],[115.158203,-39.476562],[115.125977,-39.46875],[115.09375,-39.460937],[115.035156,-39.453125],[114.976563,-39.445312],[114.917969,-39.4375],[114.859375,-39.429687],[114.791016,-39.394531],[114.722656,-39.359375],[114.585938,-39.289062],[114.382813,-39.234375],[114.078125,-39.15625],[113.890625,-39.070312],[113.648438,-39.390625],[113.453125,-39.546875],[113.15625,-39.570312],[112.9375,-39.546875],[112.640625,-39.5625],[112.429688,-39.398437],[112.3125,-39.28125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[115.78125,-39.460937],[115.760742,-39.477539],[115.740234,-39.494141],[115.699219,-39.527344],[115.658203,-39.560547],[115.617188,-39.59375],[115.583984,-39.59668],[115.550781,-39.599609],[115.517578,-39.602539],[115.484375,-39.605469],[115.451172,-39.608398],[115.417969,-39.611328],[115.384766,-39.614258],[115.351563,-39.617187],[115.294922,-39.615234],[115.238281,-39.613281],[115.181641,-39.611328],[115.125,-39.609375],[115.076172,-39.603516],[115.027344,-39.597656],[114.978516,-39.591797],[114.929688,-39.585937],[114.876953,-39.585937],[114.824219,-39.585937],[114.771484,-39.585937],[114.71875,-39.585937],[114.632813,-39.703125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[116.171875,-32.554687],[116.128906,-32.572266],[116.085938,-32.589844],[116,-32.625],[115.828125,-32.695312],[115.484375,-32.867187],[115.164063,-32.914062],[114.703125,-32.960937],[114.46875,-33.070312],[114.148438,-33.28125],[113.835938,-33.476562],[113.601563,-33.601562],[113.496094,-33.667969],[113.443359,-33.701172],[113.390625,-33.734375],[113.344727,-33.762695],[113.298828,-33.791016],[113.207031,-33.847656],[113.023438,-33.960937],[112.726563,-34.21875],[112.5625,-34.398437],[112.40625,-34.710937],[112.328125,-34.992187],[112.125,-35.335937],[111.96875,-35.4375],[111.789063,-35.375],[111.710938,-35.171875],[111.554688,-35.03125],[111.445313,-34.851562],[111.25,-34.570312],[111.015625,-34.453125],[110.695313,-34.492187],[110.507813,-34.6875],[110.390625,-34.914062],[110.171875,-35.039062],[109.976563,-35.09375],[109.726563,-35.25],[109.546875,-35.414062],[109.398438,-35.453125],[109.164063,-35.640625],[109.046875,-35.8125],[108.921875,-35.929687],[108.585938,-35.9375],[108.179688,-36.085937],[107.867188,-36.296875],[107.664063,-36.53125],[107.421875,-36.75],[107.234375,-37],[106.976563,-37.40625],[106.804688,-37.609375],[106.5625,-37.726562],[106.304688,-37.875],[106.125,-38.070312],[106.0625,-38.125],[106.03125,-38.152344],[106,-38.179687],[105.97168,-38.199219],[105.943359,-38.21875],[105.886719,-38.257812],[105.773438,-38.335937],[105.539063,-38.476562],[105.335938,-38.625],[105.265625,-38.828125],[105.273438,-38.984375],[105.34375,-39.1875],[105.28125,-39.351562],[105.132813,-39.523437],[104.960938,-39.773437],[104.664063,-39.929687],[104.414063,-40.132812],[104.351563,-40.335937],[104.453125,-40.609375],[104.546875,-40.859375],[104.578125,-41.078125],[104.476563,-41.304687],[104.289063,-41.59375],[104.085938,-41.78125],[103.898438,-42.101562],[103.914063,-42.390625],[103.929688,-42.734375],[103.859375,-43.164062],[103.671875,-43.507812],[103.550781,-43.65625],[103.490234,-43.730469],[103.459961,-43.767578],[103.429688,-43.804687],[103.399414,-43.841797],[103.369141,-43.878906],[103.308594,-43.953125],[103.27832,-43.990234],[103.248047,-44.027344],[103.1875,-44.101562],[102.960938,-44.320312],[102.8125,-44.460937],[102.744141,-44.476562],[102.675781,-44.492187],[102.607422,-44.507812],[102.539063,-44.523437],[102.455078,-44.525391],[102.371094,-44.527344],[102.287109,-44.529297],[102.245117,-44.530273],[102.203125,-44.53125],[102.154297,-44.547852],[102.105469,-44.564453],[102.007813,-44.597656],[101.8125,-44.664062],[101.484375,-45.015625],[101.257813,-45.296875],[101.023438,-45.523437],[100.75,-45.648437],[100.570313,-45.667969],[100.480469,-45.677734],[100.435547,-45.682617],[100.390625,-45.6875],[100.337891,-45.680664],[100.285156,-45.673828],[100.179688,-45.660156],[99.96875,-45.632812],[99.640625,-45.59375],[99.460938,-45.617187],[99.320313,-45.539062],[99.117188,-45.234375],[98.9375,-45.125],[98.792969,-45.128906],[98.720703,-45.130859],[98.648438,-45.132812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[113.390625,-33.734375],[113.455078,-33.748047],[113.519531,-33.761719],[113.648438,-33.789062],[113.796875,-33.984375],[114,-34.328125],[114.257813,-34.539062],[114.617188,-34.671875],[114.9375,-34.84375],[115.195313,-35.007812],[115.28125,-35.203125],[115.324219,-35.300781],[115.345703,-35.349609],[115.356445,-35.374023],[115.367188,-35.398437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[106,-38.179687],[105.986328,-38.149414],[105.972656,-38.119141],[105.945313,-38.058594],[105.890625,-37.9375],[105.6875,-37.773437],[105.296875,-37.5],[105.085938,-37.171875],[105.03125,-37.0625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[103.429688,-43.804687],[103.421875,-43.84082],[103.414063,-43.876953],[103.398438,-43.949219],[103.382813,-44.021484],[103.367188,-44.09375],[103.382813,-44.34375],[103.507813,-44.546875],[103.75,-44.59375],[104.007813,-44.546875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[102.8125,-44.460937],[102.74707,-44.507812],[102.681641,-44.554687],[102.636719,-44.59375],[102.546875,-44.671875],[102.488281,-44.71875],[102.429688,-44.765625],[102.453125,-44.921875],[102.5,-45.140625],[102.40625,-45.3125],[102.328125,-45.460937],[102.34375,-45.585937],[102.453125,-45.65625],[102.492188,-45.84375],[102.46875,-46.023437],[102.546875,-46.195312],[102.679688,-46.367187],[102.851563,-46.554687],[102.890625,-46.609375],[102.910156,-46.636719],[102.929688,-46.664062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[100.390625,-45.6875],[100.392578,-45.726562],[100.394531,-45.765625],[100.398438,-45.84375],[100.40625,-46],[100.40625,-46.28125],[100.296875,-46.585937],[100.429688,-46.84375],[100.320313,-47.203125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[100.265625,-52.773437],[100.214844,-52.677734],[100.164063,-52.582031],[100.0625,-52.390625],[99.90625,-52.203125],[99.8125,-51.71875],[99.796875,-51.492187],[99.8125,-51.28125],[99.851563,-51.175781],[99.871094,-51.123047],[99.890625,-51.070312],[99.923828,-51.019531],[99.957031,-50.96875],[100.023438,-50.867187],[100.132813,-50.65625],[100.3125,-50.445312],[100.507813,-50.21875],[100.671875,-50.125],[100.789063,-49.945312],[100.859375,-49.875],[100.894531,-49.839844],[100.929688,-49.804687],[100.964844,-49.769531],[101,-49.734375],[101.25,-49.648437],[101.398438,-49.445312],[101.625,-49.289062],[101.945313,-49.171875],[102.242188,-49.09375],[102.585938,-49.085937],[102.859375,-49.125],[103.132813,-49.007812],[103.367188,-48.78125],[103.429688,-48.601562],[103.460938,-48.511719],[103.492188,-48.421875],[103.510742,-48.306641],[103.52002,-48.249023],[103.525513,-48.222412],[103.531006,-48.195801],[103.541992,-48.142578],[103.554688,-48.09375],[103.613281,-48.048828],[103.671875,-48.003906],[103.730469,-47.958984],[103.828125,-47.90625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[110.53125,-39.757812],[110.347657,-39.710937],[110.164063,-39.664062],[109.992188,-39.648437],[109.859375,-39.679687],[109.695313,-39.890625],[109.546875,-40.265625],[109.453125,-40.515625],[109.28125,-40.71875],[109.046875,-40.875],[108.695313,-40.90625],[108.507813,-40.9375],[108.21875,-40.929687],[107.804688,-40.789062],[107.476563,-40.609375],[107.085938,-40.421875],[106.859375,-40.21875],[106.71875,-40.132812],[106.640625,-40.21875],[106.757813,-40.460937],[106.804688,-40.75],[106.78125,-41.0625],[106.632813,-41.257812],[106.492188,-41.4375],[106.3125,-41.5625],[106.15625,-41.828125],[106.234375,-42.054687],[106.28125,-42.4375],[106.179688,-42.742187],[106.101563,-42.929687],[106.117188,-43.21875],[106.085938,-43.46875],[105.820313,-43.664062],[105.65625,-43.773437],[105.634766,-43.826172],[105.613281,-43.878906],[105.591797,-43.931641],[105.570313,-43.984375],[105.568359,-44.048828],[105.566406,-44.113281],[105.564453,-44.177734],[105.5625,-44.242187],[105.55957,-44.283203],[105.556641,-44.324219],[105.550781,-44.40625],[105.539063,-44.570312],[105.53125,-44.671875],[105.527344,-44.722656],[105.523438,-44.773437],[105.472656,-44.796875],[105.421875,-44.820312],[105.320313,-44.867187],[105.101563,-44.890625],[104.789063,-44.929687],[104.640625,-45.039062],[104.632813,-45.203125],[104.6875,-45.335937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[104.710938,-45.359375],[104.601563,-45.421875],[104.40625,-45.359375],[104.117188,-45.335937],[103.914063,-45.351562],[103.828125,-45.523437],[103.671875,-45.65625],[103.523438,-45.726562],[103.429688,-45.914062],[103.4375,-46.109375],[103.296875,-46.367187],[103.085938,-46.492187],[103.007813,-46.578125],[102.96875,-46.621094],[102.949219,-46.642578],[102.929688,-46.664062],[102.914063,-46.685547],[102.898438,-46.707031],[102.867188,-46.75],[102.804688,-46.835937],[102.6875,-47.132812],[102.601563,-47.351562],[102.421875,-47.546875],[102.320313,-47.625],[102.269531,-47.664062],[102.244141,-47.683594],[102.21875,-47.703125],[102.179688,-47.728516],[102.140625,-47.753906],[102.0625,-47.804687],[101.890625,-48.054687],[101.796875,-48.257812],[101.609375,-48.382812],[101.375,-48.546875],[101.179688,-48.554687],[100.921875,-48.484375],[100.6875,-48.328125],[100.414063,-48.179687],[100.164063,-48.140625],[99.84375,-48.0625],[99.625,-48.03125],[99.49707,-48.0625],[99.433105,-48.078125],[99.369141,-48.09375],[99.334717,-48.129883],[99.300293,-48.166016],[99.231445,-48.238281],[99.09375,-48.382812],[99.03125,-48.710937],[99.085938,-48.992187],[99.304688,-49.242187],[99.40625,-49.390625],[99.398438,-49.625],[99.234375,-49.8125],[99.109375,-50.070312],[99.117188,-50.296875],[99.328125,-50.5],[99.546875,-50.53125],[99.5625,-50.71875],[99.382813,-50.804687],[99.257813,-51.078125],[99.3125,-51.25],[99.429688,-51.34375],[99.601563,-51.179687],[99.742188,-51.078125],[99.816406,-51.074219],[99.853516,-51.072266],[99.890625,-51.070312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[98,-47],[98.052734,-47.009766],[98.105469,-47.019531],[98.210938,-47.039062],[98.484375,-47.28125],[98.796875,-47.375],[99.054688,-47.554687],[99.15625,-47.710937],[99.289063,-48],[99.329102,-48.046875],[99.369141,-48.09375],[99.374512,-48.142578],[99.379883,-48.191406],[99.390625,-48.289062],[99.421875,-48.546875],[99.523438,-48.804687],[99.6875,-48.992187],[99.820313,-49.171875],[99.9375,-49.320312],[100.101563,-49.351562],[100.351563,-49.398437],[100.625,-49.507812],[100.765625,-49.640625],[100.847656,-49.722656],[100.888672,-49.763672],[100.929688,-49.804687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[102.21875,-47.703125],[102.210938,-47.744141],[102.203125,-47.785156],[102.1875,-47.867187],[102.15625,-48.03125],[102.179688,-48.320312],[102.4375,-48.390625],[102.695313,-48.421875],[103.007813,-48.328125],[103.179688,-48.257812],[103.257813,-48.03125],[103.316406,-47.988281],[103.375,-47.945312],[103.433594,-47.988281],[103.492188,-48.03125],[103.510742,-48.111328],[103.52002,-48.151367],[103.529297,-48.191406]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[105.5625,-44.242187],[105.583008,-44.186523],[105.603516,-44.130859],[105.617188,-44.09375],[105.630859,-44.056641],[105.644531,-44.019531],[105.658203,-43.982422],[105.671875,-43.945312],[105.709961,-43.935547],[105.748047,-43.925781],[105.786133,-43.916016],[105.824219,-43.90625],[105.976563,-43.867187],[106,-44.15625],[105.992188,-44.398437],[106.148438,-44.5],[106.390625,-44.640625],[106.257813,-44.984375],[106.242188,-45.164062],[106.304688,-45.304687],[106.539063,-45.34375],[106.695313,-45.261719],[106.773438,-45.220703],[106.8125,-45.200195],[106.851563,-45.179687],[106.874023,-45.147461],[106.896484,-45.115234],[106.941406,-45.050781],[107.03125,-44.921875],[107.210938,-44.726562],[107.3125,-44.515625],[107.34375,-44.320312],[107.132813,-44.117187],[106.976563,-43.9375],[106.890625,-43.585937],[106.84375,-43.265625],[106.921875,-43.101562],[107.03125,-43.007812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[106.851563,-45.179687],[106.90625,-45.199219],[106.960938,-45.21875],[107.070313,-45.257812],[107.289063,-45.351562],[107.484375,-45.398437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[105.523438,-44.773437],[105.544922,-44.820312],[105.566406,-44.867187],[105.609375,-44.960937],[105.65625,-45.242187],[105.703125,-45.5],[105.90625,-45.664062],[106.101563,-45.804687],[106.21875,-45.875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[102.203125,-44.53125],[102.234375,-44.582031],[102.265625,-44.632812],[102.306641,-44.666016],[102.347656,-44.699219],[102.388672,-44.732422],[102.429688,-44.765625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[96.820313,-50.046875],[96.807617,-50.06543],[96.794922,-50.083984],[96.769531,-50.121094],[96.71875,-50.195312],[96.617188,-50.34375],[96.398438,-50.601562],[96.132813,-50.875],[95.960938,-51.164062],[95.796875,-51.40625],[95.78125,-51.695312],[95.90625,-52.007812],[96.0625,-52.257812],[96.3125,-52.367187],[96.46875,-52.453125],[96.492188,-52.65625],[96.382813,-52.921875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[93.921875,-50.46875],[93.966797,-50.462891],[94.011719,-50.457031],[94.101563,-50.445312],[94.28125,-50.421875],[94.71875,-50.429687],[95.171875,-50.359375],[95.546875,-50.242187],[95.921875,-50.140625],[96.328125,-50.148437],[96.671875,-50.109375],[96.746094,-50.078125],[96.783203,-50.0625],[96.820313,-50.046875],[96.855469,-50.03125],[96.890625,-50.015625],[96.960938,-49.984375],[97.101563,-49.921875],[97.523438,-49.679687],[97.90625,-49.398437],[98.046875,-49.0625],[97.976563,-48.78125],[97.835938,-48.421875],[97.796875,-47.890625],[97.828125,-47.539062],[97.96875,-47.195312],[97.984375,-47.097656],[97.992188,-47.048828],[98,-47],[98.014648,-46.947266],[98.029297,-46.894531],[98.058594,-46.789062],[98.117188,-46.578125],[98.3125,-46.304687],[98.375,-46.054687],[98.601563,-45.664062],[98.632813,-45.382812],[98.640625,-45.257812],[98.644531,-45.195312],[98.648438,-45.132812],[98.65332,-45.084961],[98.658203,-45.037109],[98.667969,-44.941406],[98.6875,-44.75],[98.546875,-44.1875],[98.398438,-43.78125],[98.34375,-43.296875],[98.3125,-43.03125],[98.21875,-42.742187],[98.179688,-42.546875],[98.234375,-42.273437],[98.21875,-42.046875],[98.179688,-41.742187],[98.023438,-41.328125],[97.828125,-41.046875],[97.484375,-40.804687],[97.21875,-40.375],[97.148438,-40.148437],[97.164063,-39.976562],[97.007813,-39.804687],[96.75,-39.679687],[96.507813,-39.734375],[96.210938,-39.945312],[95.898438,-40.085937],[95.570313,-40.203125],[95.367188,-40.257812],[95.070313,-40.171875],[94.632813,-40.09375],[94.320313,-40.03125],[94.18457,-40.005859],[94.116699,-39.993164],[94.048828,-39.980469],[93.997559,-39.991211],[93.946289,-40.001953],[93.84375,-40.023437],[93.5,-39.859375],[93.3125,-39.804687],[93.195313,-40],[92.992188,-40.179687],[92.820313,-40.25],[92.460938,-40.0625],[92.363281,-39.957031],[92.314453,-39.904297],[92.265625,-39.851562],[92.197266,-39.837891],[92.128906,-39.824219],[91.992188,-39.796875],[91.742188,-39.71875],[91.460938,-39.664062],[91.210938,-39.609375],[90.890625,-39.507812],[90.648438,-39.476562],[90.367188,-39.25],[90.101563,-39.023437],[89.890625,-38.828125],[89.695313,-38.65625],[89.445313,-38.515625],[89.25,-38.460937],[88.921875,-38.25],[88.796875,-38.175781],[88.734375,-38.138672],[88.703125,-38.120117],[88.671875,-38.101562],[88.666016,-38.067383],[88.660156,-38.033203],[88.648438,-37.964844],[88.625,-37.828125],[88.604492,-37.773437],[88.583984,-37.71875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[94.048828,-39.980469],[94.056152,-39.930664],[94.063477,-39.880859],[94.078125,-39.78125],[94.34375,-39.695312],[94.664063,-39.609375],[94.882813,-39.507812],[95.046875,-39.34375],[94.890625,-39.125],[94.75,-38.859375],[94.75,-38.570312],[94.835938,-38.328125],[95.039063,-38.039062],[95.148438,-37.804687],[95.273438,-37.59375],[95.570313,-37.4375],[95.765625,-37.335937],[95.976563,-37.203125],[96.15625,-37.40625],[96.359375,-37.609375],[96.515625,-37.71875],[96.65625,-37.828125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[93.101563,-53.078125],[93.058594,-53.082031],[93.015625,-53.085937],[92.929688,-53.09375],[92.804688,-53.273437],[92.601563,-53.570312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[93.226563,-54.195312],[93.234375,-53.921875],[93.195313,-53.734375],[93.078125,-53.445312],[93.070313,-53.257812],[93.085938,-53.167969],[93.09375,-53.123047],[93.101563,-53.078125],[93.119141,-53.040039],[93.136719,-53.001953],[93.171875,-52.925781],[93.242188,-52.773437],[93.328125,-52.445312],[93.367188,-52.039062],[93.34375,-51.671875],[93.234375,-51.21875],[93.34375,-50.914062],[93.5625,-50.71875],[93.78125,-50.523437],[93.851563,-50.496094],[93.886719,-50.482422],[93.921875,-50.46875],[93.935547,-50.450195],[93.949219,-50.431641],[93.976563,-50.394531],[94.03125,-50.320312],[94.140625,-50.171875],[94.25,-49.953125],[94.414063,-49.71875],[94.625,-49.335937],[94.664063,-49.039062],[94.726563,-48.820312],[94.820313,-48.585937],[94.585938,-48.226562],[94.4375,-47.976562],[94.335938,-47.78125],[94.289063,-47.46875],[94.195313,-47.15625],[94.257813,-46.890625],[94.3125,-46.59375],[94.328125,-46.335937],[94.179688,-45.898437],[94.070313,-45.523437],[93.984375,-45.296875],[94,-45.03125],[93.921875,-44.757812],[93.8125,-44.609375],[93.648438,-44.5],[93.5,-44.234375],[93.179688,-43.867187],[93.03125,-43.515625],[92.984375,-43.210937],[92.9375,-43],[92.765625,-42.898437],[92.617188,-42.90625],[92.390625,-43.101562],[92.257813,-43.195312],[92.046875,-43.148437],[91.898438,-42.90625],[91.851563,-42.578125],[91.820313,-42.289062],[91.796875,-42.046875],[91.632813,-41.710937],[91.296875,-41.546875],[90.90625,-41.34375],[90.578125,-41.171875],[90.304688,-41.09375],[90.101563,-41.15625],[89.945313,-41.007812],[89.992188,-40.773437],[90.007813,-40.625],[89.796875,-40.171875],[89.53125,-39.773437],[89.382813,-39.460937],[89.234375,-39.28125],[89.0625,-39.171875],[88.867188,-39.085937],[88.71875,-38.820312],[88.6875,-38.640625],[88.625,-38.359375],[88.597656,-38.273437],[88.583984,-38.230469],[88.570313,-38.1875],[88.53125,-38.149414],[88.492188,-38.111328],[88.414063,-38.035156],[88.335938,-37.958984],[88.296875,-37.920898],[88.257813,-37.882812],[88.195313,-37.848633],[88.132813,-37.814453],[88.007813,-37.746094],[87.757813,-37.609375],[87.46875,-37.476562],[87.085938,-37.40625],[86.804688,-37.5],[86.601563,-37.578125],[86.476563,-37.597656],[86.414063,-37.607422],[86.351563,-37.617187],[86.291992,-37.603516],[86.232422,-37.589844],[86.113281,-37.5625],[85.875,-37.507812],[85.632813,-37.304687],[85.40625,-37.046875],[85.09375,-36.773437],[84.734375,-36.539062],[84.4375,-36.3125],[84.210938,-36.015625],[83.890625,-35.84375],[83.34375,-35.664062],[82.9375,-35.507812],[82.679688,-35.179687],[82.414063,-34.960937],[82.28125,-34.6875],[82.320313,-34.34375],[82.40625,-34.117187],[82.671875,-33.945312],[82.71875,-33.777344],[82.742188,-33.693359],[82.753906,-33.651367],[82.765625,-33.609375],[82.826172,-33.583984],[82.886719,-33.558594],[83.007813,-33.507812],[83.289063,-33.28125],[83.59375,-33.03125],[83.875,-32.65625],[84.078125,-32.445312],[84.257813,-32.421875],[84.4375,-32.335937],[84.429688,-32.132812],[84.265625,-31.90625],[84.117188,-31.71875],[84.070313,-31.421875],[84.234375,-31.117187],[84.351563,-30.867187],[84.410156,-30.742187],[84.439453,-30.679687],[84.46875,-30.617187],[84.519531,-30.560547],[84.570313,-30.503906],[84.671875,-30.390625],[84.984375,-30.179687],[85.234375,-30],[85.421875,-29.84375],[85.65625,-29.726562],[85.960938,-29.328125],[86.117188,-29.101562],[86.390625,-28.90625],[86.6875,-28.71875],[86.96875,-28.640625],[87.289063,-28.59375],[87.5625,-28.554687],[87.875,-28.492187],[88.140625,-28.28125],[88.367188,-28.109375],[88.570313,-27.96875],[88.742188,-27.976562],[89.085938,-27.945312],[89.28125,-27.789062],[89.460938,-27.578125],[89.609375,-27.25],[89.804688,-27.046875],[89.9375,-26.835937],[89.97168,-26.789062],[90.005859,-26.742187],[90.030518,-26.701172],[90.055176,-26.660156],[90.104492,-26.578125],[90.203125,-26.414062],[90.28125,-26.179687],[90.335938,-26.03125],[90.400391,-25.926758],[90.432617,-25.874512],[90.464844,-25.822266],[90.485352,-25.770996],[90.505859,-25.719727],[90.546875,-25.617187],[90.609375,-25.453125],[90.71875,-25.273437],[90.804688,-25.046875],[90.859375,-24.851562],[90.890625,-24.445312],[90.882813,-23.640625],[90.890625,-22.632812],[90.9375,-21.71875],[91.039063,-20.898437],[91.039063,-20.15625],[91.148438,-19.34375],[91.015625,-18.429687],[90.828125,-17.632812],[90.46875,-17.023437],[89.898438,-16.632812],[89.125,-16.296875],[88.210938,-16.070312],[87.390625,-15.398437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[90.005859,-26.742187],[90.057129,-26.777344],[90.108398,-26.8125],[90.210938,-26.882812],[90.539063,-26.921875],[90.859375,-27.03125],[90.915039,-27.045898],[90.970703,-27.060547],[91.082031,-27.089844],[91.193359,-27.119141],[91.249023,-27.133789],[91.304688,-27.148437],[91.369141,-27.130859],[91.433594,-27.113281],[91.5625,-27.078125],[91.734375,-26.9375],[91.882813,-26.960937],[91.957031,-26.972656],[92.03125,-26.984375],[92.070313,-26.931641],[92.109375,-26.878906],[92.1875,-26.773437],[92.328125,-26.523437],[92.375,-26.273437],[92.351563,-26.054687],[92.320313,-25.902344],[92.304688,-25.826172],[92.289063,-25.75],[92.220703,-25.730469],[92.152344,-25.710937],[92.015625,-25.671875],[91.726563,-25.65625],[91.53125,-25.734375],[91.242188,-25.914062],[91.054688,-26.015625],[90.765625,-25.96875],[90.578125,-25.882812],[90.521484,-25.852539],[90.464844,-25.822266]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[92.03125,-26.984375],[92.041016,-27.025391],[92.050781,-27.066406],[92.070313,-27.148437],[92.179688,-27.328125],[92.414063,-27.445312],[92.796875,-27.484375],[93.085938,-27.554687],[93.40625,-27.71875],[93.640625,-27.867187],[94.046875,-27.890625],[94.328125,-27.960937],[94.703125,-28.117187],[94.921875,-28.203125],[95.164063,-28.195312],[95.5,-28.164062],[95.65625,-28.476562],[96.0625,-28.679687],[96.3125,-28.953125],[96.507813,-29.28125],[96.546875,-29.664062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[92.289063,-25.75],[92.338867,-25.719727],[92.388672,-25.689453],[92.488281,-25.628906],[92.6875,-25.507812],[93.109375,-25.109375],[93.414063,-24.90625],[93.804688,-24.617187],[94.140625,-24.375],[94.492188,-23.976562],[94.75,-23.632812],[94.945313,-23.335937],[95.101563,-23.039062],[95.21875,-22.835937],[95.390625,-22.648437],[95.703125,-22.53125],[95.78125,-22.304687],[95.828125,-22.007812],[95.90625,-21.90625],[96.179688,-21.929687],[96.421875,-21.835937],[96.664063,-21.742187],[96.898438,-21.632812],[97.195313,-21.585937],[97.5,-21.625],[97.796875,-21.640625],[97.992188,-21.75],[98.171875,-21.789062],[98.320313,-21.71875],[98.367188,-21.59375],[98.382813,-21.304687],[98.445313,-21.132812],[98.59375,-20.992187],[98.898438,-20.84375],[99.21875,-20.828125],[99.523438,-20.765625],[99.835938,-20.570312],[99.882813,-20.335937],[100.03125,-20.171875],[100.289063,-20.132812],[100.585938,-20.179687],[100.8125,-20.023437],[101.117188,-19.984375],[101.375,-20.0625],[101.570313,-20.234375],[101.710938,-20.351562],[101.875,-20.679687],[101.96875,-20.8125],[102.09375,-20.953125],[102.132813,-21.140625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[84.46875,-30.617187],[84.43457,-30.556641],[84.400391,-30.496094],[84.332031,-30.375],[84.195313,-30.132812],[83.789063,-29.4375],[83.5,-28.804687],[83.171875,-28.359375],[82.859375,-28.179687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[88.257813,-37.882812],[88.306641,-37.865234],[88.355469,-37.847656],[88.453125,-37.8125],[88.527344,-37.757812],[88.583984,-37.71875],[88.621582,-37.658203],[88.65918,-37.597656],[88.734375,-37.476562],[88.757813,-37.414062],[88.78125,-37.351562],[88.787109,-37.297852],[88.792969,-37.244141],[88.804688,-37.136719],[88.828125,-36.921875],[88.875,-36.75],[88.945313,-36.335937],[89.039063,-36.070312],[89.15625,-35.828125],[89.234375,-35.46875],[89.265625,-35.234375],[89.359375,-35.023437],[89.492188,-34.75],[89.585938,-34.421875],[89.671875,-33.992187],[89.828125,-33.710937],[89.894531,-33.570312],[89.927734,-33.5],[89.944336,-33.464844],[89.960938,-33.429687],[89.96875,-33.385742],[89.976563,-33.341797],[89.992188,-33.253906],[90.023438,-33.078125],[90.0625,-32.8125],[90.203125,-32.453125],[90.304688,-32.226562],[90.398438,-32.039062],[90.5,-31.65625],[90.570313,-31.34375],[90.648438,-31.101562],[90.804688,-30.648437],[90.867188,-30.195312],[90.84375,-29.921875],[90.789063,-29.71875],[90.789063,-29.4375],[90.804688,-29.226562],[90.976563,-29.0625],[91.046875,-28.859375],[91.023438,-28.554687],[91.03125,-28.140625],[91.007813,-27.835937],[90.996094,-27.691406],[90.990234,-27.619141],[90.984375,-27.546875],[90.978516,-27.494141],[90.972656,-27.441406],[90.960938,-27.335937],[90.9375,-27.132812],[90.898438,-27.082031],[90.859375,-27.03125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[90.984375,-27.546875],[91.021484,-27.496094],[91.058594,-27.445312],[91.132813,-27.34375],[91.21875,-27.246094],[91.261719,-27.197266],[91.304688,-27.148437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[88.570313,-38.1875],[88.595703,-38.166016],[88.621094,-38.144531],[88.646484,-38.123047],[88.671875,-38.101562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[89.960938,-33.429687],[89.978516,-33.478516],[89.996094,-33.527344],[90.03125,-33.625],[90.203125,-33.765625],[90.375,-33.921875],[90.375,-34.164062],[90.335938,-34.429687],[90.3125,-34.703125],[90.320313,-34.875],[90.40625,-34.976562],[90.492188,-35.09375],[90.46875,-35.257812],[90.5,-35.445312],[90.585938,-35.632812],[90.6875,-35.734375],[90.898438,-35.820312],[91.023438,-35.921875],[91.070313,-36.15625],[91.148438,-36.359375],[91.195313,-36.53125],[91.28125,-36.640625],[91.273438,-36.835937],[91.3125,-36.960937],[91.265625,-37.164062],[91.253906,-37.210937],[91.242188,-37.257812],[91.210938,-37.310547],[91.179688,-37.363281],[91.117188,-37.46875],[91,-37.632812],[91,-37.78125],[91.023438,-38.085937],[91.015625,-38.28125],[91.085938,-38.507812],[91.195313,-38.710937],[91.304688,-38.9375],[91.617188,-39.164062],[91.914063,-39.390625],[92.109375,-39.617187],[92.1875,-39.734375],[92.226563,-39.792969],[92.265625,-39.851562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[88.78125,-37.351562],[88.825195,-37.345703],[88.869141,-37.339844],[88.957031,-37.328125],[89.132813,-37.304687],[89.414063,-37.265625],[89.75,-37.171875],[90.007813,-37.140625],[90.296875,-37.140625],[90.445313,-37.140625],[90.59375,-37.273437],[90.796875,-37.28125],[91.039063,-37.273437],[91.140625,-37.265625],[91.191406,-37.261719],[91.242188,-37.257812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[82.765625,-33.609375],[82.701172,-33.619141],[82.636719,-33.628906],[82.507813,-33.648437],[82.289063,-33.6875],[82.070313,-33.78125],[81.851563,-33.84375],[81.632813,-33.8125],[81.34375,-33.65625],[81.078125,-33.601562],[80.875,-33.609375],[80.679688,-33.6875],[80.421875,-33.96875],[80.265625,-34.15625],[80.117188,-34.296875],[79.945313,-34.460937],[79.90625,-34.570312],[79.984375,-34.71875],[80.046875,-34.976562],[80.140625,-35.226562],[80.1875,-35.476562],[80.21875,-35.726562],[80.257813,-35.890625],[80.351563,-36.195312],[80.484375,-36.351562],[80.640625,-36.476562],[80.992188,-36.523437],[81.34375,-36.539062],[81.6875,-36.5625],[81.976563,-36.734375],[82.257813,-37.03125],[82.484375,-37.375],[82.6875,-37.671875],[82.953125,-37.960937],[83.171875,-38.15625],[83.242188,-38.351562],[83.289063,-38.632812],[83.25,-38.898437],[83.117188,-39.132812],[82.960938,-39.375],[82.820313,-39.570312],[82.695313,-39.773437],[82.78125,-40.117187],[82.859375,-40.375],[82.90625,-40.570312],[82.894531,-40.6875],[82.888672,-40.746094],[82.882813,-40.804687],[82.894531,-40.84668],[82.90625,-40.888672],[82.929688,-40.972656],[82.976563,-41.140625],[83.109375,-41.367187],[83.273438,-41.539062],[83.453125,-41.710937],[83.640625,-41.929687],[83.859375,-42.226562],[84.070313,-42.382812],[84.242188,-42.46875],[84.359375,-42.550781],[84.417969,-42.591797],[84.447266,-42.612305],[84.476563,-42.632812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[82.882813,-40.804687],[82.854004,-40.828125],[82.825195,-40.851562],[82.767578,-40.898437],[82.652344,-40.992187],[82.421875,-41.179687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[86.351563,-37.617187],[86.347656,-37.660156],[86.34375,-37.703125],[86.335938,-37.789062],[86.179688,-38.171875],[85.992188,-38.429687],[85.75,-38.835937],[85.523438,-39.203125],[85.273438,-39.585937],[85.109375,-39.867187],[84.960938,-40.367187],[84.882813,-40.695312],[84.84375,-40.9375],[84.882813,-41.125],[85.078125,-41.289062],[85.234375,-41.421875],[85.1875,-41.765625],[84.976563,-41.953125],[84.773438,-42.132812],[84.640625,-42.320312],[84.53125,-42.492187],[84.503906,-42.5625],[84.490234,-42.597656],[84.476563,-42.632812],[84.476563,-42.660156],[84.476563,-42.6875],[84.476563,-42.742187],[84.476563,-42.796875],[84.476563,-42.824219],[84.476563,-42.851562],[84.482422,-42.870117],[84.488281,-42.888672],[84.5,-42.925781],[84.523438,-43],[84.492188,-43.039062],[84.460938,-43.078125],[84.398438,-43.15625],[84.335938,-43.351562],[84.203125,-43.539062],[84.09375,-43.75],[84.054688,-44.046875],[84.117188,-44.28125],[84.21875,-44.578125],[84.328125,-44.6875],[84.515625,-44.765625],[84.796875,-44.71875],[84.976563,-44.84375],[85.210938,-44.84375],[85.460938,-44.734375],[85.648438,-44.632812],[85.734375,-44.46875],[85.695313,-44.25],[85.648438,-44.03125],[85.640625,-43.773437],[85.703125,-43.523437],[85.851563,-43.328125],[85.953125,-43.234375],[86.203125,-43.15625],[86.390625,-43.148437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[84.476563,-42.851562],[84.460938,-42.869141],[84.445313,-42.886719],[84.414063,-42.921875],[84.382813,-42.957031],[84.351563,-42.992187],[84.291016,-43.007812],[84.230469,-43.023437],[84.109375,-43.054687],[83.9375,-42.945312],[83.78125,-42.875],[83.609375,-43],[83.359375,-43.179687],[83.125,-43.367187],[82.921875,-43.414062],[82.742188,-43.328125],[82.585938,-43.195312],[82.367188,-43.257812],[82.171875,-43.265625],[81.945313,-43.34375],[81.804688,-43.421875],[81.703125,-43.515625],[81.664063,-43.734375],[81.679688,-43.960937],[81.6875,-44.242187],[81.671875,-44.59375],[81.523438,-44.859375],[81.320313,-45.054687],[81.125,-45.257812],[80.890625,-45.46875],[80.75,-45.648437],[80.625,-45.820312],[80.460938,-46.054687],[80.414063,-46.234375],[80.390625,-46.476562],[80.375,-46.765625],[80.320313,-47],[80.195313,-47.164062],[80.054688,-47.289062],[79.929688,-47.492187]]}}]}
},{}],3:[function(require,module,exports){
module.exports={"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[126.996094,-89.382812],[126.860352,-89.392578],[126.72461,-89.402343],[126.453125,-89.421875],[126.25,-90.070312],[126.210938,-90.453125],[126.203125,-90.773437],[126.102539,-91.040039],[126.015625,-91.28125],[125.984375,-91.652344],[125.953125,-92.023437],[125.861328,-92.396484],[125.81543,-92.583008],[125.769531,-92.769531],[125.767578,-92.947265],[125.765625,-93.125],[125.769531,-93.441406],[125.773438,-93.757812],[125.777344,-94.074219],[125.78125,-94.390625],[125.847656,-94.722656],[125.914063,-95.054687],[126.027344,-95.378906],[126.140625,-95.703125],[126.523438,-96.046875],[127.015625,-96.203125],[127.53125,-96.140625],[128.03125,-96.4375],[128.875,-96.578125],[129.293946,-96.616211],[129.503418,-96.635254],[129.712891,-96.654297],[129.870606,-96.762207],[130.028321,-96.870117],[130.34375,-97.085937],[131,-97.453125],[131.195313,-97.992187],[131.523438,-98.359375],[131.789063,-98.453125],[132.109375,-98.757812],[132.289063,-98.945312],[132.546875,-98.96875],[133.9375,-98.234375],[134.296875,-98.1875],[134.625,-98.03125],[134.746094,-97.640625],[134.867188,-97.25],[134.873047,-96.830078],[134.878906,-96.410156],[134.845703,-95.912109],[134.8125,-95.414062],[134.828125,-94.890625],[134.734375,-94.421875],[134.546875,-94.132812],[134.414063,-94.058594],[134.28125,-93.984375],[134.226563,-93.867187],[134.171875,-93.75],[134.0625,-93.515625],[134.101563,-93.125],[134.105469,-92.9375],[134.109375,-92.75],[134.007813,-92.570312],[133.867188,-92.411132],[133.726563,-92.251953],[133.445313,-91.933593],[133.164063,-91.615234],[132.882813,-91.296875],[132.265625,-91.179687],[132.148438,-90.867187],[132.023438,-90.570312],[131.90625,-89.875],[131.703125,-89.601562],[131.367188,-89.34375],[131.296875,-88.550781]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[126.101563,-91.039062],[126.351563,-91.101562],[126.632813,-91.078125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[126.019531,-91.277344],[125.578125,-91.320312],[125.328125,-91.484375],[125.078125,-91.640625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[125.769531,-92.773437],[125.242188,-92.671875],[124.703125,-93.023437],[124.734375,-93.351562],[125.28125,-93.398437],[125.484375,-93.171875],[125.769531,-93.125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[124.703125,-93.03125],[125.480469,-93.171875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[129.710938,-96.65625],[129.708985,-96.455078],[129.707032,-96.253906],[129.703125,-95.851562],[130.070313,-95.695312],[130.535157,-95.675781],[131,-95.65625],[131.464844,-95.675781],[131.929688,-95.695312],[132.4375,-95.59375],[132.835938,-95.34375],[133.023438,-94.960937],[133.25,-94.640625],[133.636719,-94.527343],[134.023438,-94.414062],[134.171875,-94.203125],[134.226563,-94.09375],[134.28125,-93.984375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[125.765625,-92.773437],[125.950195,-92.779296],[126.134766,-92.785156],[126.503906,-92.796875],[126.740235,-92.785156],[126.976563,-92.773437],[127.226563,-92.781249],[127.476563,-92.789062],[127.570313,-92.507812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[126.976563,-92.773437],[126.955078,-92.599609],[126.933594,-92.425781],[126.890625,-92.078125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[126.5,-92.796875],[126.449219,-92.578125],[126.398438,-92.359375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[134.007813,-92.568359],[133.929688,-92.9375],[133.53125,-93.335937],[132.84375,-93.609375],[132.619141,-93.658203],[132.394531,-93.707031]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[132.396484,-93.707031],[132.398926,-93.480957],[132.401367,-93.254883],[132.40625,-92.802734],[132.414063,-92.557128],[132.421875,-92.311523],[132.4375,-91.820312],[131.914063,-91.822265],[131.390625,-91.824218],[130.867188,-91.826172],[130.605469,-91.827148],[130.34375,-91.828125],[130.345276,-91.947754],[130.346802,-92.067383],[130.349854,-92.30664],[130.355957,-92.785156],[130.36206,-93.263671],[130.365112,-93.502929],[130.368164,-93.742187],[130.370972,-93.910156],[130.373779,-94.078124],[130.379395,-94.414062],[130.390625,-95.085937],[132.375,-95.210937],[132.384766,-94.45996],[132.389648,-94.084472],[132.39209,-93.896728],[132.394531,-93.708984]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[132.390625,-93.703125],[132.17456,-93.712036],[131.958496,-93.720947],[131.526367,-93.738769],[131.094238,-93.756592],[130.878174,-93.765503],[130.662109,-93.774414],[130.514649,-93.7583],[130.367188,-93.742187],[130.138672,-93.728515],[129.910157,-93.714843],[129.681641,-93.701172],[129.453125,-93.6875],[129.279297,-93.705078],[129.105469,-93.722656],[128.757813,-93.757812],[128.554688,-93.789062],[128.289063,-93.875],[127.992188,-94.242187],[127.796876,-94.242187],[127.601563,-94.242187],[127.406251,-94.242187],[127.210938,-94.242187],[127.222656,-94.568359],[127.21875,-94.710937],[127.232422,-94.865234],[127.246094,-95.019531],[127.259766,-95.173828],[127.273438,-95.328125],[127.478516,-95.326172],[127.683594,-95.324218],[127.888672,-95.322265],[128.09375,-95.320312],[128.289063,-95.343749],[128.484375,-95.367187],[128.71875,-95.007812],[128.78125,-94.808594],[128.84375,-94.609375],[128.65625,-94.699218],[128.46875,-94.789062],[128.290039,-94.753906],[128.111328,-94.71875],[127.887695,-94.703125],[127.664063,-94.6875],[127.442383,-94.699218],[127.220703,-94.710937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[128.09375,-95.322266],[128.097656,-95.171387],[128.101563,-95.020508],[128.105469,-94.869629],[128.109375,-94.71875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[127.222656,-94.566406],[126.751953,-94.482422],[126.801758,-94.749023],[126.851563,-95.015625],[127.023438,-95.320312],[127.271484,-95.326172]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[126.75,-94.484375],[126.771485,-94.216797],[126.792969,-93.949218],[126.814454,-93.68164],[126.835938,-93.414062],[127.109375,-93.492187],[127.257813,-93.75],[127.236329,-93.996093],[127.214844,-94.242187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[127.257813,-93.75],[127.742188,-93.070312],[128.085938,-93.40625],[128.188477,-93.641602],[128.291016,-93.876953],[128.34375,-94.15625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[127.109375,-93.492187],[127.191406,-93.345703],[127.273438,-93.199218],[127.355469,-93.052734],[127.4375,-92.90625],[127.742188,-93.070312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[128.759766,-93.755859],[128.78125,-93.969726],[128.802734,-94.183593],[128.845703,-94.611328]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[130.664063,-93.773437],[130.660157,-93.539062],[130.656251,-93.304687],[130.648438,-92.835937],[131.527344,-92.820312],[131.966797,-92.812499],[132.186524,-92.808593],[132.40625,-92.804687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[129.451172,-93.6875],[129.45044,-93.512695],[129.449707,-93.33789],[129.448243,-92.988281],[129.446778,-92.638671],[129.445313,-92.289062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[128.552734,-93.789062],[128.512207,-93.615234],[128.47168,-93.441406],[128.390625,-93.09375],[128.109375,-92.851562],[128.080078,-92.617187],[128.050782,-92.382812],[128.021485,-92.148437],[127.992188,-91.914062],[127.984375,-91.554687],[127.97461,-91.183593],[127.964844,-90.812499],[127.955079,-90.441406],[127.945313,-90.070312],[128.203125,-89.546875],[128.634766,-89.548828],[129.066407,-89.550781],[129.498047,-89.552734],[129.929688,-89.554687],[130.072266,-90.242187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[127.992188,-91.914062],[128.320313,-91.570312],[128.757813,-91.238281],[129.195313,-90.906249],[129.632813,-90.574218],[130.070313,-90.242187],[130.1875,-90.154297],[130.484375,-89.932617],[130.78125,-89.710937],[131.3125,-89.617187],[131.773438,-89.960937],[132.007813,-91.164062],[130.859375,-91.320312],[130.601563,-91.207031],[130.34375,-91.09375],[130.343506,-91.277099],[130.343261,-91.460449],[130.342773,-91.827148]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[130.1875,-90.15625],[130.226563,-90.390625],[130.265625,-90.625],[130.304688,-90.859375],[130.34375,-91.09375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[127.984375,-91.554687],[128.320313,-91.568359]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[130.191406,-90.15625],[130.170898,-89.921875],[130.150391,-89.6875],[130.109375,-89.21875],[129.666016,-89.207031],[129.222657,-89.195312],[128.779297,-89.183594],[128.335938,-89.171875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[130.109375,-89.216797],[130.148438,-88.784179],[130.167969,-88.567871],[130.1875,-88.351562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[127,-90.054687],[127,-89.718749],[127,-89.550781],[127,-89.382812],[127.002197,-89.206298],[127.004395,-89.029785],[127.008789,-88.676757],[127.017578,-87.970703],[127.026367,-87.264648],[127.035157,-86.558593],[127.043946,-85.852539],[127.052735,-85.146484],[127.061524,-84.44043],[127.070313,-83.734375],[126.601563,-83.492187],[125.84375,-82.59375],[125.640625,-82.023437],[125.625,-81.710937],[125.617188,-81.554687],[125.613281,-81.476562],[125.609375,-81.398437],[125.61377,-81.346191],[125.618164,-81.293945],[125.626953,-81.189453],[125.644532,-80.980468],[125.66211,-80.771484],[125.670899,-80.666992],[125.675293,-80.614746],[125.679688,-80.5625],[125.668946,-80.508789],[125.658204,-80.455078],[125.636719,-80.347656],[125.59375,-80.132812],[125.140625,-79.765625],[124.742188,-79.695312],[124.589844,-79.628906],[124.513672,-79.595703],[124.4375,-79.5625],[124.373047,-79.490234],[124.308594,-79.417969],[124.179688,-79.273437],[123.992188,-78.96875],[123.976563,-78.765625],[123.960938,-78.5625],[124,-78.179687],[123.957032,-77.804687],[123.935547,-77.617187],[123.924805,-77.523437],[123.914063,-77.429687],[123.900391,-77.349609],[123.886719,-77.269531],[123.859375,-77.109375],[123.851563,-76.789062],[123.9375,-76.230468],[124.023438,-75.671875],[124.101563,-75.117187],[124.226563,-74.554687],[124.359375,-74.320312],[124.414063,-74.070312],[124.4375,-73.5625],[124.414063,-73.085937],[124.257813,-72.734375],[123.992188,-72.421875],[123.71875,-72.484375],[123.46875,-72.59375],[123.171875,-72.484375],[123.015625,-72.449218],[122.9375,-72.43164],[122.859375,-72.414062],[122.767578,-72.402343],[122.675782,-72.390624],[122.492188,-72.367187],[122.140625,-72.390625],[121.976563,-72.507812],[121.710938,-72.554687],[121.5,-72.484375],[121.191406,-72.257812],[120.882813,-72.03125],[120.625,-71.835937],[120.5625,-71.814453],[120.5,-71.792969]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[122.861328,-72.414062],[122.806152,-72.482421],[122.750977,-72.550781],[122.640625,-72.6875],[122.25,-72.765625],[121.6875,-73],[121.265625,-72.984375],[120.890625,-73.234375],[120.523438,-73.054687],[120.53125,-72.640625],[120.304688,-72.132812],[119.820313,-72.21875],[119.523438,-72.109375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[127.070313,-83.736328],[127.367188,-83.851562],[127.890625,-84.601562],[128.117188,-85.640625],[128.703125,-86.28125],[129.068359,-86.720703],[129.250977,-86.940429],[129.433594,-87.160156],[129.495118,-87.362304],[129.556641,-87.564453],[129.679688,-87.96875],[129.933594,-88.160156],[130.1875,-88.351562],[130.398438,-88.332031],[130.609375,-88.3125],[131.015625,-88.554687],[131.296875,-88.546875],[131.96875,-88.554687],[132.296875,-89.007812],[132.6875,-89.015625],[133.21875,-89.320312],[133.898438,-89.9375],[134.96875,-90],[135.507813,-90.203125],[135.777344,-90.304687],[135.912109,-90.355469],[135.979492,-90.380859],[136.046875,-90.40625],[136.128906,-90.37793],[136.210938,-90.349609],[136.375,-90.292968],[136.703125,-90.179687],[137.296875,-89.375],[137.523438,-89.120117],[137.636719,-88.992675],[137.75,-88.865234]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[127.891602,-84.602539],[129.132813,-84.789062],[129.671875,-85.757812],[129.914063,-85.929687],[130.101563,-86.179687],[130.128907,-86.49414],[130.236328,-86.776367],[130.34375,-87.058594]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[129.131836,-84.789062],[128.773438,-83.960937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[129.4375,-87.164062],[129.664063,-87.136718],[129.890625,-87.109374],[130.34375,-87.054687],[130.605469,-87.041015],[130.914063,-87.070312],[131.390625,-87],[131.503907,-87.289062],[131.617188,-87.578125],[132.078125,-87.710937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[131.96875,-88.546875],[132.101563,-88.257812],[132.078125,-87.710937],[132.265625,-87.507812],[132.367188,-86.976562],[132.5,-86.6875],[132.765625,-86.476562],[133.234375,-86.257812],[133.390625,-86.060547],[133.546875,-85.863281]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[134.882813,-96.414062],[135.71875,-96.460937],[136.273438,-96.1875],[136.507813,-95.492187],[137.09375,-95.476562],[137.664063,-95.726562],[138.34375,-95.46875],[139.09375,-94.664062],[139.285645,-94.559082],[139.381592,-94.506592],[139.429565,-94.480347],[139.477539,-94.454102],[139.458862,-94.404175],[139.440185,-94.354248],[139.402832,-94.254394],[139.328125,-94.054687],[138.992188,-93.984375],[138.632813,-93.65625],[138.164063,-93.609375],[137.765625,-93.523437],[137.585938,-93.179687],[136.921875,-92.640625],[136.429688,-91.726562],[136.574219,-91.394531],[136.646485,-91.228515],[136.682617,-91.145508],[136.71875,-91.0625],[136.78125,-91.005859],[136.84375,-90.949219],[136.96875,-90.835937],[137.21875,-90.609375],[137.695313,-90.539062],[138.141602,-90.812988],[138.364747,-90.949951],[138.476319,-91.018432],[138.532105,-91.052673],[138.587891,-91.086914],[138.632508,-91.114654],[138.677124,-91.142395],[138.766358,-91.197876],[138.944825,-91.308838],[139.301758,-91.530762],[139.658692,-91.752686],[139.837158,-91.863647],[139.926392,-91.919128],[139.971008,-91.946869],[140.015625,-91.974609],[140.074219,-92.006836],[140.132813,-92.039062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[136.044922,-90.404297],[136.087036,-90.445557],[136.12915,-90.486816],[136.213379,-90.569336],[136.381836,-90.734375],[136.550293,-90.899414],[136.634521,-90.981934],[136.676636,-91.023193],[136.71875,-91.064453]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[132.300781,-89.007812],[132.507813,-89.476562],[132.523438,-90.390625],[132.144531,-90.867187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[138.585938,-91.085937],[138.606446,-91.02246],[138.626954,-90.958984],[138.667969,-90.832031],[138.708985,-90.705078],[138.729492,-90.641602],[138.75,-90.578125],[138.76178,-90.478455],[138.77356,-90.378784],[138.797119,-90.179443],[138.844239,-89.780761],[138.938477,-88.983398]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[138.75,-90.578125],[138.8125,-90.555176],[138.875,-90.532227],[139,-90.486328],[139.25,-90.394531],[139.75,-90.210937],[139.988282,-90.207031],[140.107422,-90.205078],[140.166993,-90.204102],[140.226563,-90.203125],[140.279297,-90.215332],[140.332032,-90.227539],[140.437501,-90.251953],[140.648438,-90.300781],[140.859376,-90.349609],[140.964844,-90.374023],[141.070313,-90.398437],[141.169922,-90.399414],[141.269532,-90.40039],[141.468751,-90.402343],[141.667969,-90.404297],[141.767579,-90.405273],[141.867188,-90.40625],[141.956055,-90.337891],[142.044922,-90.269531],[142.222657,-90.132812],[142.578125,-89.859375],[142.570313,-89.226562],[141.6875,-88.492187],[141.5,-88.117187],[141.492188,-87.773437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[141.071289,-90.398437],[141.123779,-90.505859],[141.17627,-90.613281],[141.28125,-90.828125],[141.609375,-91.421875],[141.925782,-91.5],[142.083985,-91.539062],[142.242188,-91.578125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[141.867188,-90.40625],[141.830079,-90.5],[141.792969,-90.59375],[141.71875,-90.78125],[141.796875,-91.03125],[142.148438,-91.320312],[142.194824,-91.44873],[142.241211,-91.577148],[142.315552,-91.664184],[142.389893,-91.75122],[142.538574,-91.925292],[142.835938,-92.273437],[142.878907,-92.360352],[142.921875,-92.447266],[142.93457,-92.537842],[142.947266,-92.628418],[142.972657,-92.80957],[143.023438,-93.171875],[143,-93.726562],[142.429688,-94.0625],[141.992188,-93.890625],[141.335938,-94.117187],[140.414063,-94.429687],[139.632813,-94.5],[139.554688,-94.476562],[139.476563,-94.453125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[142.921875,-92.445312],[142.992188,-92.410156],[143.0625,-92.374999],[143.203125,-92.304687],[143.664063,-91.898437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[125.613281,-81.394531],[125.677246,-81.439941],[125.741211,-81.485351],[125.869141,-81.576171],[126.125,-81.757812],[126.679688,-82],[127.421875,-81.984375],[127.71875,-81.894531],[127.867188,-81.849609],[127.941406,-81.827148],[128.015625,-81.804687],[128.09668,-81.770507],[128.177734,-81.736327],[128.339844,-81.667968],[128.664063,-81.53125],[129.015625,-81.546875],[129.125,-81.582031],[129.234375,-81.617187],[129.277832,-81.681152],[129.321289,-81.745116],[129.408203,-81.873046],[129.582032,-82.128906],[129.75586,-82.384765],[129.929688,-82.640625],[130.124024,-82.68457],[130.221192,-82.706543],[130.318359,-82.728516],[130.385742,-82.754883],[130.453125,-82.78125],[130.648438,-83.148437],[131,-83.296875],[131.203125,-83.398437],[131.410157,-83.570312],[131.617188,-83.742187],[131.8125,-83.875],[132.3125,-83.984375],[132.449219,-84.074218],[132.517579,-84.11914],[132.585938,-84.164062],[132.589844,-84.230468],[132.593751,-84.296874],[132.601563,-84.429687],[132.601563,-84.517578],[132.601563,-84.605469],[132.585938,-84.665039],[132.570313,-84.724609],[132.539063,-84.84375],[132.5625,-84.904297],[132.585938,-84.964843],[132.632813,-85.085937],[132.804688,-85.328125],[133.007813,-85.523437],[133.107422,-85.601562],[133.157226,-85.640624],[133.207031,-85.679687],[133.291992,-85.726562],[133.376953,-85.773437],[133.546875,-85.867187],[133.8125,-85.882812],[134.078125,-85.898437],[134.664063,-85.578125],[134.990235,-85.542969],[135.15332,-85.525391],[135.316406,-85.507812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[123.914063,-77.427734],[124.010254,-77.427246],[124.106446,-77.426758],[124.294922,-77.419922],[124.554688,-77.390625],[124.765625,-77.4375],[124.960938,-77.648437],[125.117188,-77.8125],[125.351563,-77.882812],[125.664063,-77.742187],[126.023438,-77.546875],[126.453125,-77.546875],[126.8125,-77.765625],[127.117188,-77.90625],[127.789063,-77.976562],[128.53125,-77.78125],[128.933594,-77.75],[129.134766,-77.734375],[129.335938,-77.71875],[129.455079,-77.679687],[129.574219,-77.640625],[129.8125,-77.5625],[130.210938,-77.015625],[130.9375,-76.953125],[131.183594,-76.839843],[131.306641,-76.783203],[131.368165,-76.754882],[131.429688,-76.726562],[131.513672,-76.680664],[131.597657,-76.634765],[131.765626,-76.542968],[132.101563,-76.359375],[132.289063,-76.1875],[132.382813,-76.101562],[132.476563,-76.015625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[129.335938,-77.71875],[129.361329,-77.855469],[129.386719,-77.992187],[129.4375,-78.265625],[129.828125,-78.476562],[130.179688,-78.96875],[130.367188,-79.96875],[130.570313,-80.242187],[130.671876,-80.378906],[130.722657,-80.447266],[130.773438,-80.515625],[130.714844,-80.632812],[130.685547,-80.691406],[130.65625,-80.75],[130.597657,-80.828125],[130.539063,-80.90625],[130.546876,-80.980468],[130.554688,-81.054687],[130.570313,-81.126953],[130.585938,-81.199218],[130.617188,-81.343749],[130.679688,-81.632812],[130.656251,-81.685546],[130.632813,-81.738281],[130.583985,-81.805664],[130.535157,-81.873046],[130.4375,-82.007812],[130.378907,-82.367187],[130.34961,-82.546874],[130.334962,-82.636718],[130.320313,-82.726562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[129.234375,-81.621094],[129.316895,-81.585693],[129.399414,-81.550293],[129.564453,-81.479492],[129.894532,-81.33789],[130.22461,-81.196289],[130.389649,-81.125488],[130.472169,-81.090088],[130.554688,-81.054687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[129.238281,-81.617187],[129.302246,-81.626953],[129.366211,-81.636718],[129.494141,-81.656249],[129.75,-81.695312],[130.433594,-82.007812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[130.773438,-80.515625],[130.85791,-80.526367],[130.942383,-80.537109],[131.111328,-80.558594],[131.449219,-80.601562],[131.787109,-80.644531],[131.956055,-80.666016],[132.040527,-80.676758],[132.125,-80.6875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[130.654297,-80.75],[130.723877,-80.804687],[130.793457,-80.859375],[130.932617,-80.96875],[131.210938,-81.1875],[131.585938,-81.367187],[131.328125,-82.035156]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[130.634766,-81.740234],[130.718262,-81.783691],[130.801758,-81.827148],[130.96875,-81.914062],[131.648438,-82.164062],[131.914063,-82.648437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[134.476563,-79.722656],[133.953125,-79.882812],[133.6875,-79.996094],[133.421875,-80.109375],[133.195313,-80.296875],[132.671875,-80.429687],[132.328125,-80.523437],[132.175781,-80.646484],[132.125,-80.6875],[132.101563,-80.742187],[132.078125,-80.796875],[132.03125,-80.90625],[132.125,-81.265625],[132.222657,-81.445312],[132.271485,-81.535156],[132.295899,-81.580078],[132.320313,-81.625],[132.348633,-81.682617],[132.376954,-81.740234],[132.433594,-81.855468],[132.546875,-82.085937],[132.328125,-82.28125],[132.03125,-82.390625],[131.914063,-82.652344],[131.882813,-83.273437],[131.750001,-83.505859],[131.617188,-83.738281]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[131.328125,-82.039062],[131.78125,-81.773437],[132.050781,-81.700195],[132.185547,-81.663574],[132.25293,-81.645264],[132.320313,-81.626953],[132.379883,-81.623291],[132.439453,-81.619629],[132.558594,-81.612305],[132.677734,-81.60498],[132.737305,-81.601318],[132.796875,-81.597656],[132.838867,-81.614013],[132.880859,-81.630371],[132.964844,-81.663085],[133.132813,-81.728515],[133.300782,-81.793945],[133.384766,-81.82666],[133.46875,-81.859375],[133.522461,-81.884766],[133.576172,-81.910156],[133.683594,-81.960937],[133.898438,-82.0625],[133.992188,-82.4375],[134.085938,-82.8125],[133.976563,-83.039062],[133.734375,-83.1875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[132.796875,-81.601562],[132.826172,-81.533203],[132.855469,-81.464843],[132.914063,-81.328125],[133.296875,-81.265625],[133.382813,-81.560547],[133.425782,-81.708008],[133.447266,-81.781738],[133.46875,-81.855469]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[132.585938,-84.164062],[132.640626,-84.134765],[132.695313,-84.105468],[132.804688,-84.046875],[133.15625,-83.929687],[133.421875,-83.90625],[133.351563,-83.679687],[132.867188,-83.789062],[132.789063,-83.953125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[132.597656,-84.429687],[132.904297,-84.539062],[133.210938,-84.648437],[133.207032,-84.757812],[133.203126,-84.867187],[133.199219,-84.976562],[133.195313,-85.085937],[133.359376,-85.144531],[133.523438,-85.203125],[133.483399,-85.262695],[133.44336,-85.322265],[133.363282,-85.441406],[133.283203,-85.560546],[133.243164,-85.620117],[133.203125,-85.679687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[133.191406,-85.082031],[133.145508,-85.192383],[133.099609,-85.302734],[133.053711,-85.413085],[133.007813,-85.523437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[130.652344,-83.148437],[130.445313,-83.328125],[130.710938,-83.609375],[130.875,-83.9375],[131.15625,-84.109375],[131.4375,-84.28125],[132.019532,-84.441406],[132.310547,-84.521484],[132.456055,-84.561523],[132.528809,-84.581542],[132.601563,-84.601562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[130.710938,-83.609375],[130.90625,-83.613281],[131.199219,-83.398437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[131,-83.300781],[130.90625,-83.617187],[130.878906,-83.945312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[133.1875,-69.070312],[133.09375,-68.953124],[133,-68.835937],[132.8125,-68.601562],[132.597657,-68.488281],[132.382813,-68.375],[132.250001,-68.265625],[132.117188,-68.15625],[131.984376,-68.046875],[131.851563,-67.9375],[131.638672,-68],[131.425782,-68.0625],[131.212891,-68.125],[131,-68.1875],[129.671875,-68.328125],[129.508789,-68.470703],[129.427246,-68.541992],[129.345703,-68.613281],[129.276856,-68.725586],[129.208008,-68.837891],[129.070313,-69.0625],[128.765626,-69.335937],[128.613282,-69.472656],[128.53711,-69.541016],[128.460938,-69.609375],[128.385743,-69.705078],[128.310547,-69.800781],[128.160157,-69.992187],[127.859375,-70.375],[127.78125,-71.132812],[127.375,-71.507812],[127.375,-71.726562],[127.648438,-72.039062],[128.1875,-72.328125],[128.5,-73.0625],[129.03125,-73.6875],[129.546875,-74.835937],[129.945313,-74.976562],[130.8125,-74.867187],[131.320313,-75.078125],[131.4375,-75.257812],[131.796875,-75.375],[132.136719,-75.695312],[132.306641,-75.855468],[132.391602,-75.935547],[132.476563,-76.015625],[132.580079,-76.042969],[132.683594,-76.070312],[132.890625,-76.125],[133.367188,-76.148437],[133.741211,-76.151367],[133.928223,-76.152832],[134.021728,-76.153564],[134.115234,-76.154297]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[137.351563,-70.5625],[137.324219,-70.761718],[137.296875,-70.960937],[137.132813,-71.351562],[136.976563,-71.613281],[136.820313,-71.875],[136.460938,-72.367187],[136.125,-72.9375],[136.054688,-73.210937],[135.956055,-73.313477],[135.906739,-73.364746],[135.857422,-73.416016],[135.785401,-73.493897],[135.713379,-73.571777],[135.569336,-73.727539],[135.425293,-73.8833],[135.353272,-73.961181],[135.28125,-74.039062],[135.183594,-74.121093],[135.085938,-74.203124],[134.890625,-74.367187],[134.546875,-74.75],[134.359375,-75.101562],[134.226563,-75.539062],[134.171876,-75.847656],[134.144532,-76.001953],[134.13086,-76.079102],[134.117188,-76.15625],[134.132813,-76.242187],[134.148438,-76.328125],[134.179688,-76.5],[134.253907,-76.683593],[134.291016,-76.77539],[134.30957,-76.821289],[134.328125,-76.867187],[134.353516,-76.908203],[134.378906,-76.949218],[134.429688,-77.031249],[134.53125,-77.195312],[134.6875,-77.671875],[134.648438,-78.023437],[134.320313,-78.257812],[134.40625,-78.671875],[134.390625,-78.945312],[134.429688,-79.3125],[134.476563,-79.71875],[134.482422,-79.924805],[134.488282,-80.130859],[134.494141,-80.336914],[134.5,-80.542969],[134.421875,-80.882812],[134.492188,-81.085937],[135.40625,-82.21875],[135.369141,-83.158203],[135.350586,-83.62793],[135.341309,-83.862793],[135.33667,-83.980225],[135.332031,-84.097656],[135.331299,-84.185791],[135.330566,-84.273926],[135.329102,-84.450195],[135.326172,-84.802734],[135.323243,-85.155273],[135.321778,-85.331543],[135.320313,-85.507812],[135.378907,-85.728515],[135.4375,-85.949219],[135.501465,-86.070068],[135.56543,-86.190918],[135.69336,-86.432617],[135.949219,-86.916015],[136.460938,-87.882812],[137.105469,-88.374999],[137.427735,-88.621093],[137.588867,-88.74414],[137.75,-88.867187],[137.882813,-88.914062],[138.015625,-88.960937],[138.28125,-89.054687],[138.9375,-88.984375],[139.506836,-88.783203],[140.022949,-88.555664],[140.539063,-88.328125],[141.046875,-88.070312],[141.492188,-87.771484],[141.736328,-87.462891],[142.03125,-87.234375],[142.320313,-86.921875],[142.466797,-86.632812],[142.613281,-86.34375],[142.706055,-86.167968],[142.798828,-85.992187],[142.984375,-85.640625],[143.105469,-85.262695],[143.166016,-85.07373],[143.226563,-84.884766],[143.261719,-84.680664],[143.296875,-84.476562],[143.359375,-84.03125],[143.367188,-83.808593],[143.371094,-83.697265],[143.375,-83.585937],[143.386719,-83.464843],[143.398438,-83.343749],[143.421875,-83.101562],[143.40625,-82.640625],[143.34375,-82.007812],[143.28125,-81.375],[143.335938,-80.964843],[143.390625,-80.554687],[143.414063,-80.007812],[143.507324,-79.786133],[143.553955,-79.675293],[143.577271,-79.619873],[143.600586,-79.564453],[143.635254,-79.53125],[143.669922,-79.498046],[143.746094,-79.425781],[143.898438,-79.28125],[144.164063,-79],[144.468751,-78.718749],[144.63672,-78.589843],[144.720704,-78.52539],[144.804688,-78.460937],[144.900391,-78.423828],[144.996094,-78.386718],[145.1875,-78.3125],[145.5,-78.332031],[145.8125,-78.351562],[146.117188,-78.414062],[146.421875,-78.476562],[146.640625,-78.453125],[146.804688,-78.382812],[147.15625,-78.09375],[147.5625,-78.046875],[147.921875,-78.085937],[148.21875,-78.007812],[148.5,-77.921875],[148.949219,-77.988281],[149.398438,-78.054687],[149.574219,-78.117187],[149.66211,-78.148437],[149.75,-78.179687],[149.826172,-78.220703],[149.902344,-78.261718],[150.054688,-78.34375],[150.328125,-78.671875],[150.757813,-78.859375],[151.265625,-78.984375],[151.767579,-78.939453],[152.006837,-78.913086],[152.126465,-78.899902],[152.18628,-78.893311],[152.246094,-78.886719],[152.291016,-78.865234],[152.398194,-78.819091],[152.505371,-78.772949],[152.764649,-78.65918],[153.023926,-78.54541],[153.283204,-78.43164],[153.542481,-78.317871],[153.801758,-78.204101],[154.061036,-78.090332],[154.190675,-78.033447],[154.255494,-78.005004],[154.320313,-77.976562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[135.40625,-82.234375],[136.953125,-82.828125],[137.390625,-83.359375],[137.394532,-83.589843],[137.396485,-83.705078],[137.398438,-83.820312],[137.414063,-83.933593],[137.429688,-84.046874],[137.460938,-84.273437],[137.667969,-84.664062],[137.771485,-84.859374],[137.823242,-84.957031],[137.875,-85.054687],[137.908935,-85.17871],[137.942871,-85.302734],[138.010742,-85.550781],[138.078613,-85.798828],[138.112549,-85.922852],[138.129516,-85.984863],[138.146484,-86.046875],[138.185791,-86.143554],[138.225098,-86.240234],[138.303711,-86.433593],[138.460938,-86.820312],[138.53125,-87.072266],[138.601563,-87.395508],[138.671875,-87.71875],[138.875,-88.171875],[139.191407,-88.476562],[139.507813,-88.78125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[135.335938,-84.101562],[135.481446,-84.081543],[135.626954,-84.061523],[135.917969,-84.021484],[136.208985,-83.981445],[136.354492,-83.961426],[136.5,-83.941406],[136.613281,-83.926269],[136.726563,-83.911133],[136.953125,-83.880859],[137.179688,-83.850586],[137.292969,-83.835449],[137.40625,-83.820312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[136.5,-83.945312],[136.503907,-84.054687],[136.507813,-84.164062],[136.523438,-84.492187],[136.1875,-84.757812],[136.070313,-85.265625],[136.128907,-85.46875],[136.158203,-85.570312],[136.1875,-85.671875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[135.4375,-85.945312],[135.625,-85.871093],[135.8125,-85.796874],[136,-85.732422],[136.1875,-85.667969],[136.353516,-85.606445],[136.519532,-85.544922],[136.685547,-85.483398],[136.851563,-85.421875],[136.978516,-85.375977],[137.105469,-85.330078],[137.359376,-85.238281],[137.613282,-85.146484],[137.740235,-85.100585],[137.867188,-85.054687],[138.025391,-84.999999],[138.183594,-84.945312],[138.5,-84.835937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[136.847656,-85.423828],[136.890869,-85.532593],[136.934082,-85.641357],[137.020508,-85.858887],[137.19336,-86.293945],[137.366211,-86.729004],[137.539063,-87.164062],[137.708985,-87.49414],[137.878907,-87.824218],[138.048828,-88.154297],[138.21875,-88.484375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[137.75,-88.866211],[137.820313,-88.753418],[137.890625,-88.640625],[138.21875,-88.484375],[138.546875,-88.328125],[138.875,-88.171875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[137.539063,-87.162109],[137.77002,-87.07666],[138.000977,-86.99121],[138.231934,-86.905761],[138.462891,-86.820312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[139.423828,-88.595703],[139.21875,-88.242187],[139.039063,-87.886719],[138.816406,-87.453125],[138.679688,-86.994141],[138.453125,-86.523437],[138.635742,-86.435546],[138.81836,-86.347656],[139.183594,-86.171874],[139.548829,-85.996093],[139.972656,-85.839844],[140.050782,-86.074218],[140.1875,-86.328125],[140.265625,-86.472656],[140.34375,-86.617187],[140.40625,-86.734374],[140.46875,-86.851562],[140.59375,-87.085937],[140.804688,-87.421875],[141.015625,-87.757812],[140.816773,-87.862549],[140.61792,-87.967285],[140.419067,-88.072021],[140.220215,-88.176758],[140.021363,-88.281494],[139.82251,-88.38623],[139.623657,-88.490967],[139.424805,-88.595703]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[138.53125,-87.070312],[138.677734,-86.994141],[138.866455,-86.910645],[139.055176,-86.827149],[139.243896,-86.743653],[139.432617,-86.660156],[139.621338,-86.57666],[139.810059,-86.493164],[139.998779,-86.409668],[140.1875,-86.326172]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[140.59375,-87.085937],[140.40625,-87.185302],[140.21875,-87.284667],[140.03125,-87.384033],[139.84375,-87.483398],[139.65625,-87.582763],[139.46875,-87.682128],[139.253906,-87.784424],[139.039063,-87.886719]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[140.341797,-86.615234],[140.508301,-86.543457],[140.674805,-86.471679],[140.841309,-86.399902],[141.007813,-86.328125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[138.148438,-86.046875],[138.242188,-86.015625],[138.335938,-85.984375],[138.523438,-85.921875],[138.691407,-85.785156],[138.775391,-85.716796],[138.859375,-85.648437],[138.931641,-85.591796],[139.003907,-85.535156],[139.148438,-85.421875],[139.613282,-85.25],[140.078125,-85.078125],[140.347657,-84.976562],[140.617188,-84.875],[140.777344,-84.613281],[140.9375,-84.351562],[141.234375,-84.125],[141.410157,-83.941406],[141.585938,-83.757812],[141.695313,-83.453125],[141.523438,-83.265625],[141.261719,-83.209961],[141,-83.154297],[140.669922,-83.061523],[140.339844,-82.96875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[138.859375,-85.650391],[138.917969,-85.702637],[138.976563,-85.754883],[139.09375,-85.859375],[139.359375,-85.753906],[139.625,-85.648437],[139.796875,-85.515625],[139.96875,-85.458984],[140.140625,-85.402343],[140.484375,-85.289062],[140.742188,-85.148437],[141,-85.007812],[141.101563,-84.78125],[141.265625,-84.554687],[141.429688,-84.5],[141.460938,-84.328125],[141.234375,-84.117187],[140.949219,-83.984375],[140.664063,-83.851562],[140.375,-83.624023],[140.085938,-83.396484]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[140.257813,-82.21875],[140.257813,-82.027343],[140.257813,-81.835937],[140.378907,-81.613281],[140.5,-81.390625],[140.648438,-81.3125],[140.820313,-81.335937],[141,-81.554687],[141.011719,-81.703124],[141.017579,-81.777343],[141.020508,-81.814453],[141.023438,-81.851562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[139.648438,-83.841797],[139.9375,-84.081055],[140.226563,-84.320312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[139.796875,-82.960937],[139.859375,-83.070312],[140.216797,-83.177734]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[139.796875,-85.517578],[139.84961,-85.635742],[139.902344,-85.753906]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[140.486328,-85.291016],[140.616699,-85.550293],[140.747071,-85.80957],[140.877442,-86.068848],[140.942628,-86.198486],[141.007813,-86.328125],[141.076172,-86.46875],[141.144532,-86.609375],[141.28125,-86.890625],[141.734375,-87.460937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[141.429688,-84.5],[141.570313,-84.648437],[141.675782,-84.960937],[141.781251,-85.273437],[141.886719,-85.585937],[141.992188,-85.898437],[142.300782,-86.121093],[142.455078,-86.232422],[142.609375,-86.34375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[134.5,-80.539062],[134.714844,-80.660156],[134.929688,-80.78125],[135.312501,-80.855468],[135.695313,-80.929687],[136.119141,-80.972656],[136.542969,-81.015624],[136.966797,-81.058593],[137.390625,-81.101562],[137.773438,-81.015625],[137.968751,-80.949218],[138.066407,-80.916015],[138.115235,-80.899414],[138.139649,-80.891113],[138.164063,-80.882812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[134.492188,-81.082031],[134.664063,-80.890625],[134.929688,-80.785156]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[130.335938,-64.277344],[130.325196,-64.343262],[130.314454,-64.40918],[130.292969,-64.541015],[130.25,-64.804687],[130.273438,-64.972656],[130.285156,-65.05664],[130.296875,-65.140625],[130.349609,-65.249023],[130.402344,-65.357422],[130.507813,-65.574218],[130.71875,-66.007812],[131.132813,-66.246093],[131.339844,-66.365234],[131.443359,-66.424805],[131.495117,-66.45459],[131.546875,-66.484375],[131.597656,-66.517578],[131.648438,-66.550781],[131.75,-66.617187],[131.953125,-66.75],[132.359375,-67.015625],[132.494141,-67.216797],[132.628907,-67.417968],[132.763672,-67.61914],[132.898438,-67.820312],[132.998047,-67.988281],[133.097657,-68.156249],[133.197266,-68.324218],[133.296875,-68.492187],[133.242188,-68.781249],[133.214844,-68.925781],[133.1875,-69.070312],[133.267578,-69.214843],[133.347657,-69.359374],[133.427735,-69.503906],[133.507813,-69.648437],[133.882813,-69.664062],[134.140625,-70.398437],[134.671875,-70.742187],[135.019531,-70.779297],[135.193359,-70.797851],[135.367188,-70.816406],[135.527344,-70.785644],[135.6875,-70.754883],[136.007813,-70.693359],[136.328125,-70.631836],[136.488282,-70.601074],[136.56836,-70.585693],[136.648438,-70.570312],[136.736329,-70.569335],[136.82422,-70.568359],[137.000001,-70.566406],[137.175782,-70.564453],[137.351563,-70.5625],[137.500977,-70.561523],[137.650391,-70.560547],[137.949219,-70.558594],[138.248047,-70.556641],[138.546875,-70.554687],[138.863281,-70.5625],[139.179688,-70.570312],[139.453125,-70.527344],[139.589844,-70.505859],[139.658204,-70.495117],[139.726563,-70.484375],[139.765626,-70.458984],[139.804688,-70.433594],[139.882813,-70.382812],[140.039063,-70.28125],[140.269531,-69.988281],[140.384766,-69.841796],[140.442383,-69.768554],[140.5,-69.695312],[140.522461,-69.603027],[140.544922,-69.510741],[140.589844,-69.326171],[140.679688,-68.957031],[140.769531,-68.58789],[140.859375,-68.21875],[141.132813,-67.804687],[141.53125,-67.466797]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[130.296875,-65.142578],[130.262695,-65.276123],[130.228516,-65.409668],[130.160157,-65.676758],[130.023438,-66.210937],[130.074219,-66.277343],[130.125001,-66.343749],[130.175782,-66.410156],[130.226563,-66.476562],[130.632813,-66.648437],[131.195313,-66.53125],[131.371094,-66.507812],[131.458984,-66.496094],[131.546875,-66.484375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[128.460938,-69.609375],[128.437501,-69.513672],[128.414063,-69.417968],[128.367188,-69.226562],[128.421875,-68.710937],[128.6875,-68.15625],[128.976563,-67.140625],[129.257813,-66.796875],[129.691407,-66.570312],[129.908203,-66.457031],[130.016602,-66.400391],[130.070801,-66.37207],[130.125,-66.34375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[129.34375,-68.617187],[129.412109,-68.691406],[129.480469,-68.765625],[129.617188,-68.914062],[130.359375,-69.382812],[130.734375,-69.476562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[135.859375,-73.414062],[135.9375,-73.467773],[136.015625,-73.521484],[136.171875,-73.628906],[136.484375,-73.84375],[136.773438,-74.15625],[137.0625,-74.46875],[137.316406,-74.757812],[137.570313,-75.046875],[137.839844,-75.289062],[137.97461,-75.410156],[138.041992,-75.470703],[138.109375,-75.53125],[138.163086,-75.583008],[138.216797,-75.634765],[138.324219,-75.738281],[138.539063,-75.945312],[138.578125,-76.445312],[138.828125,-76.851562],[139.046875,-77.375],[139.191407,-77.537109],[139.263672,-77.618164],[139.335938,-77.699219],[139.44629,-77.78125],[139.556641,-77.863281],[139.777344,-78.027344],[139.855957,-78.073731],[139.934571,-78.120117],[140.091797,-78.21289],[140.40625,-78.398437],[140.898438,-78.460937],[141.367188,-78.15625],[141.585938,-78.013672],[141.695313,-77.942383],[141.804688,-77.871094],[141.878907,-77.821289],[141.953126,-77.771484],[142.101563,-77.671875],[142.59375,-77.601562],[143.007813,-77.599609],[143.214844,-77.598633],[143.318359,-77.598144],[143.421875,-77.597656],[143.512695,-77.594482],[143.603516,-77.591308],[143.785157,-77.584961],[143.966797,-77.578613],[144.057618,-77.57544],[144.148438,-77.572266]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[143.421875,-77.59375],[143.419922,-77.470703],[143.417969,-77.347656],[143.414063,-77.101562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[139.773438,-78.023437],[139.792969,-78.138671],[139.812501,-78.253906],[139.851563,-78.484374],[139.929688,-78.945312],[140.09375,-79.171875],[140.175781,-79.285156],[140.257813,-79.398437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[139.335938,-77.695312],[139.320313,-77.794921],[139.304688,-77.894531],[139.273438,-78.09375],[139.179688,-78.539062],[139.203125,-79.65625],[139.257813,-79.805176]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[138.109375,-75.533203],[138.027344,-75.579102],[137.945313,-75.625],[137.585938,-75.601562],[137.328126,-75.699218],[137.070313,-75.796874],[136.812501,-75.894531],[136.554688,-75.992187],[136.15625,-76.460937],[136.132813,-77.046875],[136.46875,-77.382812],[136.595703,-77.699218],[136.722657,-78.015624],[136.84961,-78.332031],[136.976563,-78.648437],[137.085938,-79.242187],[137.1875,-79.535156],[137.289063,-79.828125],[137.507813,-79.984375],[137.625,-80.226562],[137.789063,-80.679687],[137.976563,-80.78125],[138.070313,-80.832031],[138.117188,-80.857422],[138.140625,-80.870117],[138.164063,-80.882812],[138.193848,-80.868652],[138.223633,-80.854492],[138.283203,-80.826172],[138.402344,-80.769531],[138.640625,-80.65625],[138.875,-80.210937],[139.066407,-80.007812],[139.16211,-79.906249],[139.257813,-79.804687],[139.375,-79.664062],[139.703125,-79.609375],[139.980469,-79.503906],[140.119141,-79.451172],[140.257813,-79.398437],[140.414063,-79.396484],[140.570313,-79.394531],[140.882813,-79.390625],[141.289063,-79.1875],[141.5,-78.851562],[141.605469,-78.808593],[141.710938,-78.765625],[141.807618,-78.768555],[141.904297,-78.771484],[142.097657,-78.777343],[142.484375,-78.789062],[143.125,-78.992187],[143.5,-79.304687],[143.550782,-79.433593],[143.576172,-79.498047],[143.588868,-79.530273],[143.601563,-79.5625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[141.804688,-77.875],[141.792481,-77.98584],[141.780274,-78.09668],[141.75586,-78.318359],[141.731445,-78.540039],[141.719238,-78.650879],[141.707031,-78.761719]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[143.226563,-84.882812],[143.32422,-84.761718],[143.421876,-84.640624],[143.617188,-84.398437],[144.03125,-84.195312],[144.269532,-84.141602],[144.388672,-84.114746],[144.507813,-84.087891],[144.65088,-84.140015],[144.793946,-84.192139],[145.080079,-84.296387],[145.366211,-84.400635],[145.652344,-84.504883],[145.938477,-84.609131],[146.22461,-84.713379],[146.510742,-84.817627],[146.653809,-84.869751],[146.725342,-84.895813],[146.796875,-84.921875],[146.916931,-84.955139],[147.036988,-84.988403],[147.2771,-85.054932],[147.517212,-85.12146],[147.637268,-85.154724],[147.757324,-85.187988],[147.877472,-85.264617],[147.997619,-85.341247],[148.237915,-85.494506],[148.478211,-85.647766],[148.718506,-85.801025],[148.937378,-85.998169],[149.15625,-86.195312],[149.28711,-86.249999],[149.417969,-86.304687],[149.548829,-86.359374],[149.679688,-86.414062],[149.822266,-86.433593],[149.964844,-86.453125],[150.155274,-86.447265],[150.345704,-86.441406],[150.536134,-86.435546],[150.726563,-86.429687],[150.937501,-86.425781],[151.148438,-86.421875],[151.226319,-86.308593],[151.304199,-86.195312],[151.38208,-86.082031],[151.459961,-85.96875],[151.516846,-85.902344],[151.573731,-85.835937],[151.630615,-85.769531],[151.6875,-85.703125],[151.886719,-85.691162],[152.085938,-85.679199],[152.285157,-85.667236],[152.484375,-85.655273],[152.519532,-85.820312],[152.554688,-85.985352],[152.574219,-86.135498],[152.593751,-86.285644],[152.613282,-86.435791],[152.632813,-86.585937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[146.797852,-84.920898],[146.756714,-85.013793],[146.715577,-85.106689],[146.633301,-85.29248],[146.46875,-85.664062],[146.462891,-85.966796],[146.457032,-86.269531],[146.451172,-86.572265],[146.445313,-86.875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[147.757813,-85.1875],[147.808594,-85.113281],[147.859376,-85.039062],[147.960938,-84.890625],[148.164063,-84.59375],[148.324219,-84.285156],[148.404297,-84.130859],[148.444336,-84.05371],[148.464356,-84.015136],[148.484375,-83.976562],[148.493652,-83.940917],[148.50293,-83.905273],[148.521485,-83.833984],[148.558594,-83.691406],[148.595704,-83.548828],[148.632813,-83.40625],[148.675782,-83.277343],[148.71875,-83.148437],[148.714844,-82.991699],[148.710938,-82.834961],[148.710938,-82.620361],[148.710938,-82.405762],[148.710938,-82.191162],[148.710938,-82.083862],[148.710938,-81.976562],[148.710938,-81.816406],[148.707032,-81.660156],[148.705078,-81.501953],[148.703125,-81.34375],[148.709961,-81.171875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[148.484375,-83.978516],[148.52417,-83.989441],[148.563965,-84.000366],[148.643555,-84.022217],[148.802735,-84.065918],[148.92212,-84.098694],[149.041505,-84.13147],[149.160889,-84.164246],[149.280274,-84.197021],[149.439454,-84.240723],[149.598634,-84.284424],[149.757813,-84.328125],[149.898438,-84.328369],[150.039063,-84.328613],[150.179688,-84.328857],[150.320313,-84.329102]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[148.710938,-82.835937],[148.864259,-82.881835],[149.017579,-82.927734],[149.170899,-82.973633],[149.324219,-83.019531],[149.47754,-83.065429],[149.63086,-83.111328],[149.78418,-83.157227],[149.9375,-83.203125],[150.053711,-83.196289],[150.272461,-83.1958],[150.491211,-83.195312],[150.791748,-83.199218],[151.092285,-83.203124],[151.392822,-83.207031],[151.543091,-83.208984],[151.693359,-83.210937],[151.81543,-83.191406],[151.9375,-83.171875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[147.445801,-80.585937],[147.21875,-80.789062],[147.191407,-81.074218],[147.164063,-81.359375],[147.054688,-81.609375],[147.054688,-81.914062],[147.460938,-82],[147.882813,-81.976562],[148.297363,-81.976562],[148.504639,-81.976562],[148.608276,-81.976562],[148.711914,-81.976562],[148.881836,-81.975585],[149.051758,-81.974609],[149.22168,-81.973633],[149.391602,-81.972656],[149.561524,-81.971679],[149.731445,-81.970703],[149.901367,-81.969727],[150.071289,-81.96875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[150.070313,-81.148437],[150.070313,-81.249999],[150.070313,-81.351562],[150.070313,-81.505859],[150.070313,-81.660156],[150.070313,-81.814453],[150.070313,-81.96875],[150.06836,-82.12207],[150.066407,-82.27539],[150.064454,-82.42871],[150.062501,-82.582031],[150.060547,-82.735351],[150.058594,-82.888671],[150.056641,-83.041991],[150.054688,-83.195312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[150.492188,-83.195312],[150.496094,-83.408203],[150.500001,-83.621093],[150.503907,-83.833984],[150.507813,-84.046875],[150.414063,-84.1875],[150.320313,-84.328125],[150.195313,-84.550781],[150.132324,-84.666504],[150.069336,-84.782227],[149.992188,-85.023437],[149.992188,-85.207031],[149.992188,-85.390625],[149.980469,-85.609375],[149.96875,-85.828125],[149.966797,-85.984375],[149.964844,-86.140625],[149.962891,-86.296875],[149.960938,-86.453125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[149.992188,-85.386719],[150.179688,-85.391602],[150.367188,-85.396484],[150.554688,-85.401367],[150.742188,-85.40625],[150.722657,-85.610352],[150.703125,-85.814453],[150.708985,-85.968261],[150.714844,-86.12207],[150.720704,-86.275878],[150.726563,-86.429687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[149.970703,-85.828125],[150.153809,-85.824218],[150.336914,-85.820312],[150.52002,-85.816406],[150.703125,-85.8125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[150.070313,-84.78125],[150.205079,-84.782227],[150.339845,-84.783203],[150.47461,-84.784179],[150.609376,-84.785156],[150.744142,-84.786133],[150.878907,-84.787109],[151.013672,-84.788085],[151.148438,-84.789062],[151.262208,-84.703124],[151.375977,-84.617187],[151.541748,-84.480468],[151.70752,-84.343749],[151.873292,-84.20703],[152.039063,-84.070312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[151.375,-84.617187],[151.460938,-84.732422],[151.460938,-84.886963],[151.460938,-85.041504],[151.460938,-85.196045],[151.460938,-85.350586],[151.460938,-85.445068],[151.460938,-85.539551],[151.460938,-85.634033],[151.460938,-85.728516],[151.460938,-85.848633],[151.460938,-85.96875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[151.460938,-85.726562],[151.574219,-85.714843],[151.6875,-85.703125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[151.708984,-81.376953],[151.706055,-81.637695],[151.703125,-81.898437],[151.699219,-82.152343],[151.695313,-82.40625],[151.695313,-82.808593],[151.695313,-83.009765],[151.695313,-83.210937],[151.757813,-83.421874],[151.820313,-83.632812],[151.874756,-83.742431],[151.929199,-83.85205],[151.983643,-83.96167],[152.038086,-84.071289],[152.10553,-84.150818],[152.172974,-84.230346],[152.240418,-84.309875],[152.307862,-84.389404],[152.44275,-84.548461],[152.577637,-84.707519],[152.712525,-84.866577],[152.847413,-85.025635],[152.982301,-85.184692],[153.117188,-85.34375],[153.109376,-85.441406],[153.101563,-85.539062],[153.203126,-85.597656],[153.304688,-85.65625],[153.429688,-85.609375],[153.460938,-85.511718],[153.492188,-85.414062],[153.445313,-85.328124],[153.398438,-85.242187],[153.236328,-85.242187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[152.484375,-85.65625],[152.642579,-85.578369],[152.800782,-85.500488],[152.958985,-85.422607],[153.117188,-85.344727]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[152.554688,-85.984375],[152.675782,-85.960937],[152.796875,-85.9375],[152.923706,-85.867187],[153.050537,-85.796875],[153.177368,-85.726562],[153.304199,-85.65625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[153.429199,-85.608887],[153.55835,-85.609131],[153.6875,-85.609375],[153.84375,-85.533203],[154,-85.457031],[154.15625,-85.380859],[154.3125,-85.304687],[154.316407,-85.14453],[154.320313,-84.984374],[154.324219,-84.824218],[154.328125,-84.664062],[154.424805,-84.516602],[154.521484,-84.369141],[154.682129,-84.1792],[154.842774,-83.989258],[155.003419,-83.799316],[155.083741,-83.704346],[155.164063,-83.609375],[155.238282,-83.526367],[155.312501,-83.443359],[155.386719,-83.360351],[155.460938,-83.277343],[155.609376,-83.111327],[155.757813,-82.945312],[155.820313,-82.722656],[155.882813,-82.5],[155.859376,-82.144531],[155.847657,-81.966796],[155.835938,-81.789062],[155.839844,-81.507812],[155.84375,-81.226562],[155.775391,-80.999999],[155.707032,-80.773437],[155.638672,-80.546874],[155.604493,-80.433593],[155.570313,-80.320312],[155.472657,-80.333984],[155.375001,-80.347656],[155.277344,-80.361328],[155.179688,-80.375],[155.078126,-80.408203],[154.976563,-80.441406],[154.773438,-80.507812],[154.804688,-80.621093],[154.835938,-80.734375],[154.872071,-80.876953],[154.908204,-81.019531],[154.980469,-81.304687],[155.016602,-81.447265],[155.052735,-81.589843],[155.088867,-81.732422],[155.125,-81.875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[154.836914,-80.734375],[154.711426,-80.769531],[154.585938,-80.804687],[154.097657,-80.812499],[153.609375,-80.820312],[153.390625,-80.835937],[153.382813,-81.071289],[153.378906,-81.188965],[153.376953,-81.247803],[153.375,-81.306641],[153.370117,-81.447754],[153.365235,-81.588867],[153.355469,-81.871094],[153.345704,-82.15332],[153.335938,-82.435547],[153.343751,-82.666992],[153.351563,-82.898437],[153.40918,-83.018554],[153.466797,-83.138671],[153.582032,-83.378906],[153.697266,-83.61914],[153.8125,-83.859375],[153.914063,-83.923828],[153.964844,-83.956054],[154.015625,-83.988281],[154.142579,-84.083008],[154.269532,-84.177734],[154.396485,-84.27246],[154.523438,-84.367187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[154.837891,-82.041016],[154.929688,-81.890625],[155.123047,-81.873047],[155.300782,-81.852539],[155.478516,-81.832031],[155.65625,-81.811523],[155.833984,-81.791016]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[154.835938,-82.041016],[154.886719,-82.204102],[154.9375,-82.367187],[154.863282,-82.636718],[154.789063,-82.90625],[154.695313,-83.027343],[154.601563,-83.148437],[154.528321,-83.252929],[154.455079,-83.357421],[154.308594,-83.566406],[154.16211,-83.77539],[154.088868,-83.879883],[154.052246,-83.932129],[154.015625,-83.984375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[153.353516,-82.898437],[153.47998,-82.892578],[153.606445,-82.886719],[153.859375,-82.875],[154.210938,-82.890625],[154.406251,-83.020508],[154.503907,-83.08545],[154.601563,-83.150391],[154.671876,-83.207764],[154.742188,-83.265137],[154.882813,-83.379883],[155.023438,-83.494629],[155.093751,-83.552002],[155.164063,-83.609375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[153.375,-81.304687],[153.472657,-81.300781],[153.570313,-81.296875],[153.767579,-81.417969],[153.964844,-81.539062],[154.161133,-81.652344],[154.357422,-81.765625],[154.597656,-81.902343],[154.837891,-82.039062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[154.359375,-81.765625],[154.282227,-81.905273],[154.205078,-82.044922],[154.12793,-82.18457],[154.050782,-82.324218],[153.973633,-82.463867],[153.896485,-82.603515],[153.819336,-82.743164],[153.742188,-82.882812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[151.914063,-81.373047],[151.925782,-81.631836],[151.9375,-81.890625],[151.933594,-82.152343],[151.929688,-82.414062],[151.933594,-82.791992],[151.935547,-82.980957],[151.9375,-83.169922],[151.976563,-83.342773],[152.015625,-83.515625],[152.06836,-83.636719],[152.121094,-83.757812],[152.173829,-83.878906],[152.226563,-84],[152.352784,-84.155395],[152.479004,-84.310791],[152.605225,-84.466186],[152.731446,-84.621582],[152.857667,-84.776977],[152.983887,-84.932373],[153.110108,-85.087768],[153.236328,-85.243164]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[151.820313,-83.630859],[151.917481,-83.573731],[152.014648,-83.516602],[152.187011,-83.461426],[152.359375,-83.40625],[152.53125,-83.320312],[152.703125,-83.234375],[152.863281,-83.15625],[153.023438,-83.078125],[153.186523,-82.986328],[153.349609,-82.894531]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[151.693359,-82.40625],[151.929688,-82.414062],[152.320313,-82.420898],[152.710938,-82.427734],[153.023438,-82.432617],[153.335938,-82.4375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[147.927734,-81.229492],[148.186524,-81.294433],[148.445313,-81.359375],[148.574219,-81.351562],[148.703125,-81.34375],[148.873902,-81.344848],[149.044678,-81.345947],[149.386231,-81.348144],[149.727783,-81.350342],[150.069336,-81.352539],[150.274537,-81.355346],[150.479737,-81.358154],[150.684937,-81.360961],[150.890137,-81.363769],[151.095338,-81.366577],[151.300538,-81.369385],[151.505738,-81.372192],[151.710938,-81.375],[151.914063,-81.375],[152.106446,-81.359375],[152.298829,-81.34375],[152.491211,-81.328125],[152.683594,-81.3125],[152.856446,-81.311035],[153.029297,-81.30957],[153.202149,-81.308106],[153.288574,-81.307373],[153.375,-81.306641]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[152.685547,-81.318359],[152.691895,-81.596191],[152.698243,-81.874023],[152.70459,-82.151855],[152.710938,-82.429687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[151.914063,-81.371094],[151.617188,-81.132812],[151.229981,-81.136718],[150.842774,-81.140624],[150.455566,-81.144531],[150.068359,-81.148437],[149.729004,-81.154296],[149.389649,-81.160156],[149.050293,-81.166015],[148.710938,-81.171875],[148.384766,-81.128418],[148.058594,-81.084961],[147.984375,-80.921875],[147.871094,-80.925781],[147.757813,-80.929687],[147.757813,-81.058593],[147.757813,-81.1875],[147.928711,-81.228516]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[147.757813,-80.928711],[147.679688,-80.843017],[147.601563,-80.757324],[147.445313,-80.585937],[147.125,-80.289062],[146.804688,-79.992187],[146.484375,-79.738281],[146.164063,-79.484375],[145.835938,-79.21875],[145.507813,-78.953125],[145.157227,-78.706055],[144.981934,-78.582519],[144.894288,-78.520752],[144.806641,-78.458984],[144.736084,-78.406494],[144.665528,-78.354003],[144.524414,-78.249023],[144.242188,-78.039062],[144.195313,-77.804687],[144.171876,-77.687499],[144.148438,-77.570312],[144.151368,-77.477539],[144.154297,-77.384765],[144.160157,-77.199218],[144.171875,-76.828125],[144.050782,-76.59375],[143.929688,-76.359375],[143.875001,-75.910156],[143.820313,-75.460937],[143.929688,-75.011718],[144.039063,-74.5625],[144.066407,-74.011718],[144.09375,-73.460937],[144.09375,-73.007812],[143.648438,-72.539062],[142.8125,-72.148437],[142.382813,-71.734375],[142.351563,-71.21875],[142.46875,-70.726562],[142.703125,-70.453125],[142.796875,-70.296875],[142.84375,-70.21875],[142.890625,-70.140625],[142.890625,-70.072266],[142.890625,-70.003906],[142.890625,-69.867187],[142.890625,-69.59375],[143.171875,-69.257812],[143.515625,-69.15625],[143.851563,-69.15625],[144.226563,-69.335937],[144.367188,-69.722656],[144.507813,-70.109375],[144.601563,-70.421875],[144.78125,-70.742187],[144.992188,-70.757812],[145.203125,-70.671875],[145.625,-70.601562],[145.898438,-70.597656],[146.171875,-70.593749],[146.445313,-70.589843],[146.71875,-70.585937],[147.046875,-70.410156],[147.40625,-70.117187],[147.742188,-69.789062],[148.460938,-69.453125],[149.25,-69.554687],[150.039063,-69.171875],[150.279297,-69.117187],[150.399414,-69.089844],[150.519531,-69.0625],[150.627441,-69.161133],[150.735351,-69.259765],[150.951172,-69.457031],[151.382813,-69.851562],[151.523438,-70.695312],[151.601563,-71.359375],[152.109375,-71.945312],[152.273438,-72.414062],[152.109375,-72.824219],[152.009766,-73.102539],[151.910157,-73.380859],[151.810547,-73.65918],[151.710938,-73.9375],[151.628907,-74.203125],[151.546875,-74.46875],[151.509766,-74.761718],[151.491211,-74.908202],[151.481934,-74.981445],[151.472656,-75.054687],[151.46167,-75.114257],[151.450684,-75.173827],[151.428711,-75.292968],[151.384766,-75.531249],[151.34082,-75.769531],[151.296875,-76.007812],[151.335938,-76.304687],[151.375,-76.601562],[151.457031,-76.730713],[151.498047,-76.795288],[151.518555,-76.827576],[151.528809,-76.843719],[151.539063,-76.859863],[151.553223,-76.891602],[151.594605,-76.976807],[151.635987,-77.062012],[151.718751,-77.232422],[151.808595,-77.420898],[151.853516,-77.515137],[151.898438,-77.609375],[151.927735,-77.702148],[151.957032,-77.794921],[152.015626,-77.980468],[152.132813,-78.351562],[152.191407,-78.617187],[152.234375,-78.835937],[152.25,-78.882812],[152.257813,-78.927734],[152.300781,-79.134765],[152.351563,-79.386718],[152.453125,-79.890625],[152.59375,-80.296875],[152.640625,-80.804687],[152.664063,-81.058594],[152.6875,-81.3125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[140.5,-69.699219],[140.575195,-69.719238],[140.650391,-69.739258],[140.800781,-69.779297],[141.101563,-69.859375],[141.398438,-69.890625],[141.695313,-69.921875],[141.994141,-69.977539],[142.292969,-70.033203],[142.591797,-70.088867],[142.741211,-70.116699],[142.815918,-70.130615],[142.890625,-70.144531]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[136.203125,-61.75],[136.40625,-61.972656],[136.609375,-62.195312],[136.890625,-62.355468],[137.03125,-62.435547],[137.101563,-62.475586],[137.171875,-62.515625],[137.229492,-62.571289],[137.28711,-62.626953],[137.402344,-62.738281],[137.632813,-62.960937],[137.710938,-63.546875],[137.835938,-64.203125],[137.710938,-64.84375],[137.828126,-65.175781],[137.886719,-65.341796],[137.916016,-65.424804],[137.945313,-65.507812],[138.046876,-65.565429],[138.148438,-65.623046],[138.351563,-65.738281],[138.554688,-65.853515],[138.656251,-65.911133],[138.757813,-65.96875],[138.847657,-65.886718],[138.9375,-65.804687],[139.234375,-65.758789],[139.382813,-65.73584],[139.457031,-65.724365],[139.53125,-65.712891],[139.595703,-65.726075],[139.660157,-65.739258],[139.789063,-65.765625],[140.0625,-66.140625],[140.238281,-66.169922]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[139.53125,-65.710937],[139.521485,-65.630859],[139.511719,-65.550781],[139.492188,-65.390625],[139.34375,-65.195312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[137.945313,-65.507812],[137.929688,-65.578124],[137.914063,-65.648437],[137.882813,-65.789062],[137.640625,-65.984375],[137.65625,-66.222656],[137.664063,-66.341796],[137.671875,-66.460937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[138.757813,-65.96875],[138.708985,-66.084961],[138.660157,-66.201172],[138.5625,-66.433594],[138.203125,-66.59375],[137.9375,-66.527344],[137.804688,-66.494141],[137.671875,-66.460937],[137.523438,-66.519531],[137.375,-66.578125],[137.267578,-66.873047],[137.213867,-67.020508],[137.160156,-67.167969]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[135.367188,-70.820312],[135.218751,-70.749999],[135.070313,-70.679687],[134.773438,-70.539062],[134.515625,-70.234375],[134.46875,-69.242187],[134.6875,-68.46875],[134.984375,-68.1875],[135.367188,-68.101562],[135.464844,-67.945312],[135.562501,-67.789062],[135.660157,-67.632812],[135.757813,-67.476562],[135.996094,-67.417968],[136.234375,-67.359375],[136.648438,-67.398437],[136.851563,-67.15625],[137.007813,-67.160156],[137.164063,-67.164062],[137.250001,-67.312499],[137.335938,-67.460937],[137.289063,-68.0625],[137.585938,-68.851562],[137.75,-68.945312],[138.078125,-68.898437],[138.171875,-69.328125],[138.40625,-69.492187],[139.109375,-69.515625],[139.289063,-69.625],[139.507813,-70.054687],[139.617188,-70.269531],[139.671876,-70.376953],[139.699219,-70.430664],[139.726563,-70.484375],[139.753907,-70.529297],[139.781251,-70.574219],[139.835938,-70.664062],[139.945313,-70.84375],[140.054688,-71.023437],[140.109376,-71.113281],[140.164063,-71.203125],[140.137696,-71.300293],[140.111329,-71.397461],[140.058594,-71.591797],[139.953126,-71.980468],[139.742188,-72.757812],[140.140625,-73.601562],[140.578125,-74.382812],[140.603516,-74.621093],[140.616211,-74.740234],[140.628906,-74.859375],[140.62793,-74.96289],[140.626953,-75.066406],[140.625,-75.273437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[140.167969,-71.203125],[140.286133,-71.283203],[140.404297,-71.363281],[140.640625,-71.523437],[140.75,-72.335937],[141,-72.828125],[141.5,-73.398437],[141.875,-73.960937],[141.8125,-74.414062],[141.398438,-74.617187],[140.976563,-74.789062],[140.804688,-74.824218],[140.718751,-74.841797],[140.632813,-74.859375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[135.367188,-68.101562],[135.429688,-68.292968],[135.492188,-68.484375],[135.742188,-68.632812],[135.992188,-68.78125],[136.234375,-69.046875],[136.210938,-69.476562],[136.054688,-69.835937],[136.429688,-69.851562],[136.421875,-70.164062],[136.273438,-70.257812],[136.460938,-70.414062],[136.554688,-70.492187],[136.648438,-70.570312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[147.046875,-70.40625],[147.46875,-70.375],[147.96875,-70.558594],[148.4375,-70.6875],[148.921875,-70.945312],[149.453125,-71.140625],[149.507813,-71.601562],[149.5625,-72.0625],[150.015625,-72.523437],[150.4375,-72.984375],[150.78125,-72.9375],[151.148438,-72.742187],[151.4375,-72.609375],[151.796875,-72.648437],[152.109375,-72.828125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[150.4375,-72.984375],[150.128906,-73.25],[149.820313,-73.515625],[149.4375,-73.71875],[149.078125,-73.984375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[146.875,-75.296875],[147.15625,-75.210937],[147.4375,-75.109375],[147.679688,-74.921875],[147.78125,-74.546875],[147.867188,-74.304687],[147.984375,-74.0625],[148.367188,-73.945312],[148.78125,-73.875],[149.078125,-73.984375],[149.367188,-74.304687],[149.453125,-74.710937],[149.671875,-75.125],[149.828125,-75.53125],[149.820313,-75.984375],[149.996094,-76.304687],[150.171875,-76.625],[150.316407,-76.960937],[150.388672,-77.128906],[150.424805,-77.21289],[150.460938,-77.296875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[149.75,-78.179687],[149.793946,-78.085937],[149.837891,-77.992187],[149.925782,-77.804687],[150.101563,-77.429687],[150.281251,-77.363281],[150.371094,-77.330078],[150.460938,-77.296875],[150.595704,-77.242187],[150.730469,-77.1875],[151.000001,-77.078125],[151.269532,-76.96875],[151.404297,-76.914062],[151.47168,-76.886719],[151.505372,-76.873047],[151.522217,-76.866211],[151.539063,-76.859375],[151.570313,-76.842773],[151.774415,-76.753418],[152.009766,-76.647461],[152.245118,-76.541504],[152.480469,-76.435547],[152.715821,-76.32959],[152.951172,-76.223633],[153.186524,-76.117676],[153.304199,-76.064697],[153.363037,-76.038208],[153.421875,-76.005859]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[151.476563,-75.054687],[151.556641,-75.064453],[151.636719,-75.074218],[151.796875,-75.09375],[152.117188,-75.085937],[152.406251,-75.042968],[152.695313,-75],[152.921876,-75.160156],[153.148438,-75.320312],[153.285157,-75.664062],[153.353516,-75.835937],[153.387696,-75.921874],[153.421875,-76.007812],[153.464844,-76.100097],[153.507813,-76.192383],[153.59375,-76.376953],[153.679688,-76.561523],[153.722656,-76.653809],[153.765625,-76.746094],[153.794922,-76.823242],[153.824219,-76.90039],[153.882813,-77.054687],[154.044922,-77.363281],[154.184571,-77.671875],[154.254395,-77.826172],[154.289307,-77.90332],[154.324219,-77.980469],[154.35791,-78.024902],[154.391602,-78.069336],[154.458985,-78.158203],[154.59375,-78.335937],[154.71875,-78.613281],[154.84375,-78.890625],[154.96875,-79.21875],[155.09375,-79.554687],[155.054688,-79.984375],[155.117188,-80.179687],[155.148438,-80.277344],[155.179688,-80.375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[151.898438,-77.609375],[152.131836,-77.500977],[152.365235,-77.392578],[152.598633,-77.284179],[152.832032,-77.175781],[153.06543,-77.067383],[153.298828,-76.958984],[153.532227,-76.850585],[153.648926,-76.796386],[153.707276,-76.769286],[153.765625,-76.742187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[150.515625,-69.0625],[150.52832,-68.961914],[150.541016,-68.861328],[150.566406,-68.660156],[150.617188,-68.257812],[150.71875,-67.453125],[150.828125,-66.953125],[150.882813,-66.703125],[150.910156,-66.578125],[150.923828,-66.515625],[150.9375,-66.453125],[150.969726,-66.397461],[151.001953,-66.341797],[151.066406,-66.230469],[151.195313,-66.007812],[151.453125,-65.5625],[152.074219,-65.097656],[152.695313,-64.632812],[153.375,-64.117187],[153.664063,-63.617187],[153.609375,-63.070312],[153.632813,-62.351562],[153.555664,-61.976562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[149.460938,-65.615234],[149.882813,-66.007812],[150.460938,-66.171875],[150.699219,-66.3125],[150.81836,-66.382812],[150.87793,-66.417968],[150.9375,-66.453125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[130.335938,-64.273437],[130.372071,-64.194335],[130.408204,-64.115234],[130.480469,-63.957031],[130.625,-63.640625],[130.625,-63]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[130.333984,-64.277344],[130.272095,-64.272217],[130.210205,-64.26709],[130.086426,-64.256836],[129.838867,-64.236328],[129.34375,-64.195312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[125.675781,-80.5625],[125.725708,-80.562012],[125.775635,-80.561523],[125.875488,-80.560547],[126.075195,-80.558594],[126.47461,-80.554687],[127.273438,-80.546875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[128.015625,-81.804687],[127.991211,-81.74414],[127.966797,-81.683593],[127.917969,-81.562499],[127.820313,-81.320312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[124.4375,-79.5625],[124.369141,-79.609375],[124.300781,-79.65625],[124.164063,-79.75],[123.820313,-79.898437],[123.59375,-80.265625],[123.726563,-80.859375],[123.550782,-81.203125],[123.375,-81.546875],[123.148438,-81.871093],[122.921875,-82.195312],[122.484375,-82.3125],[121.953125,-82.375],[121.945313,-81.734375],[121.78125,-81.46875],[121.710938,-81.09375],[121.929688,-80.757812],[122.039063,-80.390625],[121.921875,-80.101562],[121.882813,-79.804687],[122.171875,-79.515625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[143.378906,-83.589844],[143.458985,-83.689453],[143.539063,-83.789062],[143.875,-83.898437],[144.191407,-83.992187],[144.34961,-84.039062],[144.507813,-84.085937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[153.118164,-85.344238],[153.237305,-85.241211]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[147.926758,-81.229492],[148.057617,-81.083984]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[140.078125,-85.076172],[139.984375,-84.828125],[140,-84.5625],[140.226563,-84.320312],[140.515625,-84.09375],[140.666016,-83.851562],[140.754883,-83.644531],[140.84375,-83.4375],[140.998047,-83.154297],[141.039063,-82.796875],[141.007813,-82.507812],[140.734375,-82.398437],[140.503906,-82.34375],[140.257813,-82.220703],[140.125,-82.390625],[140.007813,-82.617187],[139.882813,-82.757812],[139.794922,-82.962891],[139.632813,-83.179687],[139.523438,-83.335937],[139.414063,-83.492187],[139.265625,-83.632812],[139.203125,-83.804687],[139.234375,-83.9375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[139.234375,-83.9375],[139.359375,-83.9375],[139.644531,-83.841797],[139.859375,-83.648437],[140.085938,-83.398437],[140.216797,-83.177734],[140.341797,-82.96875],[140.429688,-82.726562],[140.453125,-82.4375],[140.501953,-82.34375],[140.578125,-82.195312],[140.679688,-81.984375],[140.921875,-81.921875],[140.974609,-81.885742],[141.000977,-81.867676],[141.027344,-81.849609],[141.04834,-81.864502],[141.069336,-81.879395],[141.111328,-81.90918],[141.195313,-81.96875],[141.492188,-81.929687],[141.617188,-82.101562],[141.640625,-82.445312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[135.28125,-74.039062],[135.31543,-74.117187],[135.34961,-74.195312],[135.417969,-74.351562],[135.554688,-74.664062],[135.78125,-74.570312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[123.476563,-85.9375],[124.46875,-86.179687],[125.585938,-86.203125],[126.316406,-86.027344],[127.046875,-85.851562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[140.015625,-91.976562],[140.00293,-91.908203],[139.990234,-91.839844],[139.964844,-91.703125],[139.914063,-91.429687],[139.9375,-91.125],[139.859375,-90.765625],[139.9375,-90.523437],[140.082031,-90.362305],[140.154297,-90.281738],[140.226563,-90.201172]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[131.429688,-76.726562],[131.483398,-76.751953],[131.537109,-76.777344],[131.644531,-76.828125],[131.859375,-76.929687],[132.421875,-76.929687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[132.421875,-76.929687],[132.84375,-76.84375],[133.101563,-76.9375],[133.34375,-76.859375],[133.859375,-76.914062],[134.094727,-76.890625],[134.212402,-76.878906],[134.27124,-76.873047],[134.330078,-76.867187]]}}]}
},{}],4:[function(require,module,exports){
module.exports={"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[18.171875,-115.140625],[18.140625,-115.152344],[18.109375,-115.164062],[18.046875,-115.1875],[18,-115.287109],[17.953125,-115.386718],[17.859375,-115.585937],[17.710938,-116.132812],[17.656251,-116.410156],[17.628907,-116.548828],[17.615235,-116.618164],[17.608399,-116.652832],[17.601563,-116.6875],[17.594239,-116.724121],[17.586915,-116.760742],[17.572266,-116.833984],[17.542969,-116.980468],[17.484375,-117.273437],[17.453125,-117.554687],[17.507813,-117.882812],[17.40625,-118.164062],[17.386719,-118.468749],[17.367188,-118.773437],[17.273438,-119.085937],[17.210938,-119.398437],[17.101563,-119.664062],[16.953126,-119.742187],[16.878907,-119.781249],[16.841797,-119.800781],[16.804688,-119.820312],[16.778321,-119.804687],[16.751954,-119.789062],[16.699219,-119.757812],[16.59375,-119.695312],[16.476563,-119.5],[16.570313,-119.140625],[16.789063,-118.84375],[16.90625,-118.460937],[16.539063,-118.1875],[16.164063,-118.101562],[16.078125,-117.898437],[16.242188,-117.578125],[16.632813,-117.335937],[16.75,-117.023437],[16.640625,-116.648437],[16.398438,-116.40625],[16.164063,-116.375],[15.929688,-116.4375],[15.816407,-116.617187],[15.703125,-116.796875],[15.4375,-116.898437],[15.09375,-116.9375],[14.6875,-116.96875],[14.375,-116.992187],[14.054688,-117.039062],[13.914063,-116.773437],[14.039063,-116.546875],[13.992188,-116.3125],[13.804688,-116.203125],[13.523438,-116.328125],[13.28125,-116.539062],[13.128906,-116.777343],[13.060547,-116.904297],[13.026367,-116.967773],[12.992188,-117.03125],[12.98291,-117.091797],[12.973633,-117.152344],[12.955078,-117.273437],[12.917969,-117.515624],[12.84375,-117.976562],[12.78125,-118.058593],[12.71875,-118.140624],[12.65625,-118.222656],[12.59375,-118.304687],[12.708985,-118.386718],[12.824219,-118.468749],[12.939453,-118.550781],[13.054688,-118.632812],[13.153321,-118.512695],[13.251953,-118.392578],[13.350586,-118.272461],[13.449219,-118.152343],[13.547852,-118.032226],[13.646485,-117.912109],[13.745117,-117.791992],[13.84375,-117.671875],[14.0625,-117.742187],[14.28125,-117.8125],[14.330078,-117.928711],[14.378906,-118.044922],[14.427734,-118.161133],[14.476563,-118.277343],[14.525391,-118.393554],[14.574219,-118.509765],[14.623047,-118.625976],[14.671875,-118.742187],[14.603516,-118.878906],[14.535157,-119.015624],[14.466797,-119.152343],[14.398438,-119.289062],[14.541016,-119.317382],[14.683594,-119.345703],[14.826172,-119.374023],[14.968751,-119.402343],[15.111329,-119.430664],[15.253907,-119.458984],[15.396485,-119.487305],[15.539063,-119.515625],[15.481446,-119.602539],[15.423828,-119.689453],[15.308594,-119.863281],[15.250977,-119.950195],[15.19336,-120.037109],[15.135742,-120.124023],[15.078125,-120.210937],[14.94336,-120.203124],[14.808594,-120.195312],[14.539063,-120.179687],[14.384766,-120.083984],[14.230469,-119.988281],[14.076172,-119.892578],[13.921875,-119.796875],[13.84375,-119.65625],[13.550782,-119.628906],[13.404297,-119.615234],[13.331055,-119.608398],[13.294434,-119.60498],[13.257813,-119.601562],[13.206055,-119.611328],[13.154297,-119.621093],[13.050782,-119.640624],[12.84375,-119.679687],[12.714844,-119.796874],[12.585938,-119.914062],[12.414063,-120.171875],[12.296875,-120.539062],[12.414063,-121.054687],[12.742188,-121.335937],[13.117188,-121.53125],[13.304688,-121.628906],[13.492188,-121.726562],[13.427735,-121.914062],[13.363282,-122.101562],[13.298828,-122.289062],[13.234375,-122.476562],[13.339844,-122.566406],[13.445313,-122.65625],[13.550781,-122.746094],[13.603516,-122.791016],[13.629883,-122.813477],[13.65625,-122.835937],[13.694336,-122.827148],[13.732422,-122.818359],[13.808594,-122.800781],[13.960938,-122.765625],[14.265625,-122.695312],[14.898438,-122.273437],[15.265625,-122.117187],[15.449219,-122.039062],[15.541016,-122],[15.586914,-121.980469],[15.632813,-121.960937],[15.666504,-121.95166],[15.700195,-121.942383],[15.767578,-121.923828],[15.902344,-121.886719],[16.171875,-121.8125],[16.493164,-121.750977],[16.653809,-121.720215],[16.734131,-121.704834],[16.774292,-121.697144],[16.814453,-121.689453],[16.842529,-121.663818],[16.870605,-121.638184],[16.926758,-121.586914],[17.039063,-121.484375],[17.171875,-121.210937],[17.207031,-121.003906],[17.242188,-120.796875],[17.34375,-120.589843],[17.445313,-120.382812],[17.593751,-120.207031],[17.742188,-120.031249],[17.816407,-119.943359],[17.890626,-119.855468],[17.964844,-119.767578],[18.039063,-119.679687],[18.086915,-119.544921],[18.134766,-119.410156],[18.230469,-119.140625],[18.278321,-119.005859],[18.326172,-118.871094],[18.374024,-118.736328],[18.397949,-118.668945],[18.409912,-118.635254],[18.421875,-118.601562],[18.448242,-118.577148],[18.474609,-118.552734],[18.527344,-118.503906],[18.580078,-118.443359],[18.606445,-118.413086],[18.632813,-118.382812],[18.672119,-118.359375],[18.711426,-118.335937],[18.790039,-118.289062],[18.947266,-118.195312],[19.261719,-118.007812],[19.890625,-117.632812],[20.515625,-116.6875],[20.847656,-116.65625],[21.013672,-116.640625],[21.09668,-116.632812],[21.138184,-116.628906],[21.179688,-116.625],[21.210449,-116.630859],[21.241211,-116.636719],[21.302734,-116.648437],[21.425781,-116.671875],[21.671875,-116.71875],[22.164063,-116.8125],[22.960938,-117.265625],[23.144532,-117.214843],[23.236328,-117.189453],[23.282227,-117.176757],[23.328125,-117.164062],[23.350098,-117.127929],[23.37207,-117.091796],[23.416016,-117.019531],[23.503906,-116.874999],[23.679688,-116.585937],[24.03125,-116.007812],[24.28125,-115.777343],[24.40625,-115.662109],[24.46875,-115.604492],[24.5,-115.575684],[24.53125,-115.546875],[24.570801,-115.533691],[24.610352,-115.520508],[24.689453,-115.49414],[24.847657,-115.441406],[25.164063,-115.335937],[25.488282,-115.406249],[25.650391,-115.441406],[25.731445,-115.458984],[25.771973,-115.467773],[25.8125,-115.476562],[25.839844,-115.509765],[25.867188,-115.542968],[25.921875,-115.609374],[26.03125,-115.742187],[26.59375,-115.953125],[26.828125,-116.140625],[27.367188,-116.789062],[27.601563,-117.28125],[27.679688,-117.445312],[27.718751,-117.527344],[27.738282,-117.568359],[27.757813,-117.609375],[27.788086,-117.636719],[27.81836,-117.664062],[27.878907,-117.71875],[28,-117.828125],[28.414063,-117.992187],[28.628907,-118.011718],[28.736328,-118.021484],[28.790039,-118.026367],[28.84375,-118.03125],[28.896484,-118.022461],[28.949219,-118.013672],[29.054688,-117.996093],[29.160156,-117.978515],[29.212891,-117.969726],[29.265625,-117.960937],[29.313477,-117.952148],[29.361328,-117.943359],[29.457032,-117.925781],[29.552735,-117.908203],[29.600586,-117.899414],[29.648438,-117.890625],[29.663086,-117.831055],[29.677735,-117.771484],[29.707032,-117.652343],[29.765625,-117.414062],[29.703125,-116.890625],[29.429688,-116.46875],[29.015625,-116.164062],[28.84375,-116.078124],[28.757813,-116.035156],[28.714844,-116.013671],[28.671875,-115.992187],[28.635742,-115.939453],[28.59961,-115.886718],[28.527344,-115.781249],[28.382813,-115.570312],[28.398438,-114.921875],[28.671875,-114.25],[28.925782,-114.023437],[29.052735,-113.910156],[29.116211,-113.853516],[29.14795,-113.825195],[29.179688,-113.796875],[29.211426,-113.774414],[29.243165,-113.751953],[29.306641,-113.707031],[29.433594,-113.617187],[29.6875,-113.4375],[29.835938,-113.320312],[29.984375,-113.203125],[30.003907,-113.09375],[30.013672,-113.039062],[30.018555,-113.011719],[30.023438,-112.984375],[30.00586,-112.963867],[29.988282,-112.943359],[29.953126,-112.902343],[29.882813,-112.820312],[29.664063,-112.679687],[29.179688,-112.242187],[28.921875,-111.875],[28.96875,-111.273437],[28.828125,-111.179687],[28.242188,-111.203125],[27.890625,-111.398437],[27.46875,-111.703125],[27.1875,-111.78125],[26.484375,-111.710937],[26.101563,-111.335937],[25.613282,-111.226562],[25.125,-111.117187],[25.023438,-110.765624],[24.972656,-110.589843],[24.947266,-110.501953],[24.93457,-110.458007],[24.921875,-110.414062],[24.912109,-110.346679],[24.902344,-110.279296],[24.882813,-110.144531],[24.84375,-109.874999],[24.804688,-109.605468],[24.785156,-109.470703],[24.775391,-109.40332],[24.770508,-109.369628],[24.765625,-109.335937],[24.764648,-109.298339],[24.763672,-109.260742],[24.761719,-109.185546],[24.759766,-109.110351],[24.757813,-109.035156],[24.753906,-108.884765],[24.75,-108.734375],[24.847657,-108.253906],[24.896485,-108.013671],[24.920899,-107.893554],[24.933106,-107.833496],[24.939209,-107.803466],[24.945313,-107.773437],[24.961426,-107.730957],[24.97754,-107.688476],[25.009766,-107.603515],[25.074219,-107.433593],[25.203125,-107.09375],[25.460938,-106.421875],[25.8125,-105.890625],[26.421875,-105.460937],[26.8125,-104.921875],[27.117188,-104.484375],[27.84375,-104.226562],[28.394531,-104.085937],[28.699219,-104.070312],[29.132813,-104.117187],[29.503907,-104.210937],[29.689453,-104.257812],[29.782227,-104.281249],[29.828613,-104.292968],[29.875,-104.304687],[29.904541,-104.3208],[29.934082,-104.336914],[29.993164,-104.36914],[30.111328,-104.433593],[30.347656,-104.5625],[30.820313,-104.820312],[31.339844,-105.070312],[31.859375,-105.320312],[32.246094,-105.394531],[32.439454,-105.43164],[32.536133,-105.450195],[32.584473,-105.459473],[32.632813,-105.46875],[32.687989,-105.466797],[32.743165,-105.464844],[32.853516,-105.460937],[33.074219,-105.453125],[33.515625,-105.4375],[34.101563,-105.523437],[34.546875,-105.742187],[34.976563,-105.851562],[35.476563,-105.726562],[35.984375,-105.6875],[36.570313,-105.890625],[36.929688,-106.171875],[37.585938,-106.359375],[37.890625,-106.601562],[38.242188,-106.890625],[38.890625,-107],[39.523438,-107.601562],[39.59375,-107.875],[39.828125,-108.507812],[39.820313,-108.898437],[40.078125,-109.515625],[40.3125,-109.820312],[40.789063,-110.078125],[41.273438,-110.429687],[41.742188,-110.601562],[42.375,-110.601562],[42.984375,-110.554687],[43.53125,-110.765625],[43.953125,-111.03125],[44.160156,-111.089844],[44.263672,-111.119141],[44.31543,-111.133789],[44.341309,-111.141113],[44.367188,-111.148437],[44.415039,-111.13623],[44.462891,-111.124023],[44.558594,-111.099609],[44.75,-111.050781],[45.132813,-110.953125],[46,-111.132812],[46.101563,-111.199218],[46.152344,-111.232422],[46.177734,-111.249023],[46.203125,-111.265625],[46.263184,-111.287109],[46.323242,-111.308593],[46.383301,-111.330078],[46.41333,-111.34082],[46.443359,-111.351562],[46.47174,-111.363281],[46.500122,-111.374999],[46.556885,-111.398437],[46.67041,-111.445312],[46.897461,-111.539062],[47.351563,-111.726562],[47.945313,-111.828125],[48.242188,-111.875],[48.523438,-111.898437],[48.882813,-111.890625],[49.197266,-111.710937],[49.354492,-111.621094],[49.433106,-111.576172],[49.472412,-111.553711],[49.511719,-111.53125],[49.524903,-111.47168],[49.538086,-111.412109],[49.564454,-111.292968],[49.617188,-111.054687],[49.789063,-110.601562],[49.875,-110.054687],[49.960938,-109.640625],[50.21875,-109.445312],[50.554688,-109.296875],[51.117188,-109.289062],[51.4375,-109.15625],[51.527344,-108.753906],[51.572266,-108.552734],[51.594727,-108.452148],[51.605958,-108.401855],[51.617188,-108.351562],[51.638794,-108.329833],[51.660401,-108.308105],[51.703614,-108.264648],[51.79004,-108.177734],[51.962891,-108.003906],[52.308594,-107.656249],[52.654297,-107.308593],[52.827149,-107.134765],[52.913574,-107.047851],[52.956787,-107.004394],[52.978394,-106.982665],[53,-106.960937],[53.039063,-106.935058],[53.078125,-106.909179],[53.15625,-106.857421],[53.3125,-106.753906],[53.46875,-106.65039],[53.546875,-106.598633],[53.585938,-106.572754],[53.625,-106.546875],[53.689453,-106.539062],[53.753906,-106.53125],[53.882813,-106.515625],[54.011719,-106.5],[54.076172,-106.492187],[54.108398,-106.488281],[54.140625,-106.484375],[54.202149,-106.49707],[54.263672,-106.509765],[54.386719,-106.535156],[54.632813,-106.585937],[55.1875,-106.546875],[55.625,-106.273437],[55.945313,-106],[56.359375,-105.585937],[56.695313,-105.125],[57.035156,-104.664062],[57.193359,-104.441406],[57.272461,-104.330078],[57.312012,-104.274414],[57.331787,-104.246582],[57.351563,-104.21875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[16.804688,-119.820312],[16.794922,-119.853027],[16.785156,-119.885742],[16.765625,-119.951172],[16.726563,-120.082031],[16.648438,-120.34375],[16.648438,-120.648437],[16.5625,-120.921875],[16.453125,-121.058594],[16.304688,-121.164062],[16.117188,-121.240234],[15.882813,-121.28125],[14.890625,-121.25],[14.046875,-121.148437],[13.523438,-121.039062],[13.039063,-120.820312],[12.835938,-120.601562],[12.9375,-120.0625],[13.097656,-119.832031],[13.177734,-119.716797],[13.217773,-119.65918],[13.237793,-119.630371],[13.257813,-119.601562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[12.992188,-117.03125],[12.94336,-117.022461],[12.894532,-117.013672],[12.796876,-116.996093],[12.748047,-116.987304],[12.699219,-116.978515],[12.650391,-116.969726],[12.601563,-116.960937],[12.554688,-116.993652],[12.507813,-117.026367],[12.414063,-117.091796],[12.226563,-117.222656],[12.039063,-117.353515],[11.945313,-117.418945],[11.898438,-117.45166],[11.851563,-117.484375],[11.792969,-117.539062],[11.734375,-117.59375],[11.675781,-117.648437],[11.617188,-117.703125],[11.5625,-117.769531],[11.507813,-117.835937],[11.453125,-117.902344],[11.398438,-117.96875],[11.288086,-118.02832],[11.177734,-118.087891],[11.092774,-118.172851],[11.007813,-118.257812],[11.095703,-118.351562],[11.242188,-118.40625],[11.402344,-118.371093],[11.5625,-118.335937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[17.601563,-116.6875],[17.57959,-116.65918],[17.557617,-116.630859],[17.513672,-116.574219],[17.425781,-116.460937],[17.25,-116.234375],[16.90625,-115.734375],[16.601563,-115.375],[16.515625,-115.15625],[16.320313,-114.976562],[16.367188,-114.382812],[16.328125,-113.75],[16.203125,-113.039062],[16.191407,-112.710937],[16.185547,-112.546874],[16.182618,-112.464843],[16.181153,-112.423828],[16.179688,-112.382812],[16.181153,-112.353515],[16.182618,-112.324218],[16.185547,-112.265624],[16.191407,-112.148437],[16.203125,-111.914062],[16.367188,-111.601562],[16.710938,-111.507812],[16.915039,-111.510742],[17.01709,-111.512207],[17.068115,-111.512939],[17.119141,-111.513672],[17.183105,-111.516113],[17.24707,-111.518554],[17.375,-111.523437],[17.773438,-111.679687],[18.03125,-112.007812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[16.179688,-112.382812],[16.211914,-112.359375],[16.244141,-112.335937],[16.308594,-112.289062],[16.437501,-112.195312],[16.695313,-111.992187],[16.992188,-111.984375],[17.101563,-112.169922],[17.210938,-112.355468],[17.320313,-112.541015],[17.429688,-112.726562],[17.429688,-113.039062],[17.628907,-113.167968],[17.728516,-113.232422],[17.828125,-113.296875],[17.90918,-113.246094],[17.990235,-113.195312],[18.071289,-113.144531],[18.152344,-113.09375],[18.233399,-113.042969],[18.314454,-112.992187],[18.395508,-112.941406],[18.436036,-112.916016],[18.476563,-112.890625],[18.510254,-112.896484],[18.543946,-112.902344],[18.611329,-112.914062],[18.746094,-112.9375],[18.88086,-112.960937],[19.015625,-112.984375],[19.143555,-112.918945],[19.271485,-112.853515],[19.399414,-112.788086],[19.527344,-112.722656],[19.655274,-112.657226],[19.783204,-112.591796],[19.912109,-112.525391],[19.975586,-112.493164],[20.007325,-112.47705],[20.039063,-112.460937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[18.476563,-112.890625],[18.45752,-112.919922],[18.438477,-112.949219],[18.400391,-113.007812],[18.362305,-113.066406],[18.324219,-113.125],[18.286133,-113.183594],[18.248047,-113.242187],[18.209961,-113.300781],[18.171875,-113.359375],[18.275391,-113.365234],[18.378907,-113.371093],[18.482422,-113.376953],[18.585938,-113.382812],[18.541016,-113.429687],[18.496094,-113.476562],[18.451172,-113.523437],[18.40625,-113.570312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[18.171875,-115.140625],[18.186035,-115.088867],[18.200195,-115.037109],[18.228516,-114.933594],[18.285156,-114.726562],[18.341797,-114.519531],[18.370117,-114.416016],[18.384277,-114.364258],[18.391357,-114.338379],[18.398438,-114.3125],[18.405273,-114.276367],[18.412109,-114.240234],[18.425781,-114.167968],[18.439453,-114.095703],[18.453125,-114.023437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[18.398438,-114.3125],[18.454102,-114.308594],[18.509766,-114.304687],[18.621094,-114.296875],[18.732422,-114.289062],[18.788086,-114.285156],[18.815918,-114.283203],[18.84375,-114.28125],[18.877441,-114.25708],[18.911133,-114.23291],[18.978516,-114.18457],[19.113281,-114.08789],[19.382813,-113.894531],[19.667969,-113.71289],[19.810547,-113.62207],[19.881836,-113.57666],[19.91748,-113.553955],[19.953125,-113.53125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[18.84375,-114.28125],[18.824219,-114.25],[18.804688,-114.21875],[18.765625,-114.15625],[18.726563,-114.09375],[18.707031,-114.0625],[18.6875,-114.03125],[18.686523,-114.000977],[18.685547,-113.970703],[18.683594,-113.910156],[18.679688,-113.789062],[18.677734,-113.728516],[18.675781,-113.667969],[18.673828,-113.607422],[18.671875,-113.546875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[18.6875,-114.03125],[18.626953,-114.029297],[18.566407,-114.027343],[18.509766,-114.02539],[18.453125,-114.023437],[18.426758,-114.030273],[18.400391,-114.037109],[18.347656,-114.050781],[18.242188,-114.078125],[18.189453,-114.091797],[18.136719,-114.105468],[18.083984,-114.11914],[18.03125,-114.132812],[17.982422,-114.139648],[17.933594,-114.146484],[17.884766,-114.15332],[17.835938,-114.160156],[17.787109,-114.166992],[17.738281,-114.173828],[17.689453,-114.180664],[17.640625,-114.1875],[17.609375,-114.165039],[17.578125,-114.142578],[17.546875,-114.120117],[17.515625,-114.097656],[17.484375,-114.075195],[17.453125,-114.052734],[17.421875,-114.030273],[17.390625,-114.007812],[17.386719,-113.914062],[17.382813,-113.820312],[17.378906,-113.726562],[17.375,-113.632812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[17.640625,-114.1875],[17.667969,-114.156738],[17.695313,-114.125977],[17.722656,-114.095215],[17.75,-114.064453],[17.777344,-114.033691],[17.804688,-114.002929],[17.832031,-113.972168],[17.859375,-113.941406],[17.886719,-113.910644],[17.914063,-113.879883],[17.941406,-113.849121],[17.96875,-113.818359],[17.996094,-113.787597],[18.023438,-113.756835],[18.050781,-113.726074],[18.078125,-113.695312],[18.072266,-113.749999],[18.066406,-113.804687],[18.060547,-113.859374],[18.054688,-113.914062],[18.042969,-114.023437],[18.037109,-114.078124],[18.03125,-114.132812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[18.171875,-115.142578],[18.174866,-115.16423],[18.177856,-115.185883],[18.183838,-115.229187],[18.195801,-115.315796],[18.219727,-115.489014],[18.243652,-115.662231],[18.267578,-115.835449],[18.31543,-116.181885],[18.363282,-116.52832],[18.411133,-116.874756],[18.458985,-117.221191],[18.506836,-117.567627],[18.554688,-117.914062],[18.593751,-118.148437],[18.613282,-118.265624],[18.623047,-118.324218],[18.62793,-118.353515],[18.632813,-118.382812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[18.171875,-115.142578],[18.197266,-115.175659],[18.222656,-115.20874],[18.273438,-115.274902],[18.375,-115.407227],[18.476563,-115.539551],[18.578125,-115.671875],[19.609375,-115.773437],[21.507813,-113.632812],[22.117188,-113.179687],[22.484376,-113.046874],[22.667969,-112.980468],[22.759766,-112.947265],[22.805665,-112.930664],[22.851563,-112.914062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[21.5,-113.640625],[20.65625,-113.585937],[20.4375,-113.789062],[20.195313,-113.660156],[20.074219,-113.595703],[20.013672,-113.563477],[19.983398,-113.547363],[19.953125,-113.53125],[19.972168,-113.490234],[19.991211,-113.449219],[20.029297,-113.367187],[20.105469,-113.203125],[20.257813,-112.875],[20.148438,-112.667969],[20.09375,-112.564453],[20.066406,-112.512695],[20.039063,-112.460937],[20.060547,-112.415039],[20.082031,-112.369141],[20.125,-112.277344],[20.210938,-112.09375],[20.679688,-111.304687],[20.660157,-111.148437],[20.650391,-111.070312],[20.645508,-111.03125],[20.640625,-110.992187],[20.672852,-110.96875],[20.705078,-110.945312],[20.769532,-110.898437],[20.898438,-110.804687],[21.164063,-110.648437],[21.257813,-110.460937],[21.664063,-110.148437],[22.0625,-110.015625],[22.480469,-109.707031],[22.689454,-109.552734],[22.793946,-109.475585],[22.846192,-109.437011],[22.872315,-109.417724],[22.898438,-109.398437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[17.119141,-111.513672],[17.160645,-111.479004],[17.202149,-111.444336],[17.285157,-111.375],[17.484375,-111.203125],[17.945313,-111.195312],[18.296875,-111.210937],[18.976563,-111.109375],[19.226563,-111.148437],[19.578125,-111.125],[20.03125,-111.09375],[20.335938,-111.042968],[20.488281,-111.017578],[20.564453,-111.004882],[20.602539,-110.998535],[20.640625,-110.992187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[18.421875,-118.601562],[18.426758,-118.64746],[18.431641,-118.693359],[18.441406,-118.785156],[18.460938,-118.968749],[18.480469,-119.152343],[18.5,-119.335937],[18.625,-119.542968],[18.6875,-119.646484],[18.71875,-119.698242],[18.75,-119.75],[18.768555,-119.78125],[18.78711,-119.8125],[18.824219,-119.875],[18.898438,-120],[19.070313,-120.054687],[19.156251,-120.082031],[19.199219,-120.095703],[19.242188,-120.109375],[19.271485,-120.107422],[19.300782,-120.105468],[19.330078,-120.103515],[19.359375,-120.101562],[19.404297,-120.092529],[19.449219,-120.083496],[19.539063,-120.065429],[19.71875,-120.029296],[20.078125,-119.957031],[20.4375,-119.884765],[20.796875,-119.8125],[21.230469,-120.144531],[21.447266,-120.310546],[21.555665,-120.393554],[21.609864,-120.435058],[21.636963,-120.45581],[21.664063,-120.476562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[18.75,-119.75],[18.697266,-119.759766],[18.644531,-119.769531],[18.539063,-119.789062],[18.328125,-119.828125],[18.175782,-119.945312],[18.023438,-120.0625],[17.953126,-120.199218],[17.882813,-120.335937],[17.750001,-120.449218],[17.617188,-120.5625],[17.562501,-120.726562],[17.507813,-120.890625],[17.648438,-121.101562],[17.828125,-121.265625],[18.082032,-121.386718],[18.208985,-121.447265],[18.272461,-121.477539],[18.3042,-121.492675],[18.335938,-121.507812],[18.362793,-121.523925],[18.389649,-121.540039],[18.44336,-121.572265],[18.550782,-121.636718],[18.765625,-121.765625],[19.257813,-121.953125],[19.773438,-121.914062],[20.5,-121.445312],[20.757813,-121.367187],[21.171875,-120.914062],[21.417969,-120.696289],[21.541016,-120.587402],[21.602539,-120.532959],[21.633301,-120.505737],[21.664063,-120.478516],[21.688965,-120.449097],[21.713867,-120.419678],[21.763672,-120.36084],[21.863281,-120.243164],[22.0625,-120.007812],[22.570313,-119.617187],[23.234375,-119.46875],[23.875,-119.453125],[24.460938,-119.398437],[24.578126,-119.246093],[24.636719,-119.169922],[24.666016,-119.131836],[24.695313,-119.09375],[24.727051,-119.069824],[24.75879,-119.045898],[24.822266,-118.998047],[24.949219,-118.902343],[25.203125,-118.710937],[25.625,-118.265625],[25.613282,-118.148437],[25.607422,-118.089844],[25.601563,-118.03125],[25.595215,-118.005859],[25.588868,-117.980469],[25.576172,-117.929687],[25.550782,-117.828125],[25.525391,-117.726562],[25.5,-117.625],[25.558594,-117.488281],[25.587891,-117.419922],[25.602539,-117.385742],[25.617188,-117.351562],[25.647461,-117.333008],[25.677734,-117.314453],[25.738281,-117.277344],[25.859375,-117.203125],[26.094727,-117.255859],[26.330078,-117.308594],[26.800782,-117.414062],[27.271485,-117.519531],[27.514649,-117.564453],[27.636231,-117.586914],[27.697022,-117.598145],[27.727417,-117.60376],[27.757813,-117.609375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[23.328125,-117.164062],[23.384766,-117.179687],[23.441407,-117.195312],[23.554688,-117.226562],[24.101563,-117.117187],[24.609375,-117.320312],[25.273438,-117.445312],[25.445313,-117.398437],[25.531251,-117.374999],[25.574219,-117.363281],[25.617188,-117.351562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[13.65625,-122.835937],[13.681152,-122.849121],[13.706055,-122.862304],[13.75586,-122.888671],[13.855469,-122.941406],[14.054688,-123.046875],[14.71875,-123.070312],[15.03125,-122.851562],[15.289063,-122.5625],[15.460938,-122.261718],[15.546876,-122.111328],[15.589844,-122.036132],[15.611329,-121.998535],[15.632813,-121.960937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[16.814453,-121.689453],[16.843506,-121.695068],[16.872559,-121.700684],[16.930664,-121.711914],[17.046875,-121.734375],[17.363281,-121.730469],[17.679688,-121.710937],[17.968751,-121.617187],[18.152344,-121.562499],[18.244141,-121.535156],[18.29004,-121.521484],[18.312989,-121.514648],[18.335938,-121.507812],[18.382813,-121.487304],[18.429688,-121.466796],[18.523438,-121.425781],[18.710938,-121.34375],[18.96875,-121.085937],[19.21875,-120.640625],[19.230469,-120.375],[19.236328,-120.242187],[19.239258,-120.175781],[19.240723,-120.142578],[19.242188,-120.109375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[19.359375,-120.101562],[19.371094,-120.054687],[19.382813,-120.007812],[19.40625,-119.914062],[19.453125,-119.726562],[20.046875,-118.898437],[20.148438,-118.171875],[20.875,-116.921875],[21.027344,-116.773437],[21.103516,-116.699219],[21.141602,-116.662109],[21.179688,-116.625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[25.8125,-105.882812],[25.828125,-105.085937],[25.46875,-104.113281],[25.109375,-103.140625],[25.273438,-102.398437],[25.375001,-102.035156],[25.425782,-101.853515],[25.451172,-101.762695],[25.463868,-101.717285],[25.476563,-101.671875],[25.505372,-101.64624],[25.53418,-101.620605],[25.591797,-101.569336],[25.707032,-101.466797],[25.9375,-101.261719],[26.398438,-100.851562],[26.878906,-100.46875],[27.359375,-100.085937],[28.039063,-99.898437],[28.59375,-99.84375],[28.828125,-99.746094],[28.945313,-99.697266],[29.003906,-99.672852],[29.033203,-99.660645],[29.0625,-99.648437],[29.064453,-99.694336],[29.066406,-99.740234],[29.070313,-99.832031],[29.078125,-100.015625],[29.078125,-100.1875],[29.078125,-100.273437],[29.078125,-100.316406],[29.078125,-100.359375],[29.112305,-100.400391],[29.146485,-100.441406],[29.214844,-100.523437],[29.351563,-100.6875],[29.773438,-100.976562],[30.234375,-101.015625],[30.667969,-101.003906],[31.15625,-100.992187],[31.59375,-101],[32.039063,-101.070312],[32.230469,-101.199218],[32.421875,-101.328125],[32.478516,-101.511719],[32.535157,-101.695312],[32.591797,-101.878906],[32.648438,-102.0625],[32.656251,-102.273437],[32.664063,-102.484375],[32.671876,-102.695312],[32.679688,-102.90625],[32.615235,-103.240234],[32.550782,-103.574218],[32.486329,-103.908202],[32.421875,-104.242187],[32.47461,-104.548828],[32.527344,-104.855468],[32.580079,-105.162109],[32.606446,-105.31543],[32.619629,-105.39209],[32.626221,-105.43042],[32.632813,-105.46875],[32.64502,-105.51416],[32.657227,-105.55957],[32.681641,-105.65039],[32.730469,-105.832031],[32.779297,-106.013671],[32.803711,-106.104492],[32.815918,-106.149902],[32.828125,-106.195312],[32.835205,-106.233154],[32.842285,-106.270996],[32.856445,-106.346679],[32.884766,-106.498046],[32.941407,-106.800781],[33.054688,-107.40625],[33.320313,-108.265625],[33.546875,-109.125],[33.570313,-109.859375],[33.421875,-110.28125],[33.382813,-110.566406],[33.34375,-110.851562],[33.164063,-111.062499],[32.984375,-111.273437],[32.84375,-111.507812],[32.773438,-111.624999],[32.738281,-111.683593],[32.720703,-111.71289],[32.703125,-111.742187],[32.692871,-111.771484],[32.682617,-111.800781],[32.66211,-111.859374],[32.621094,-111.976562],[32.539063,-112.210937],[32.675782,-112.310546],[32.812501,-112.410156],[32.949219,-112.509765],[33.017579,-112.55957],[33.051758,-112.584473],[33.085938,-112.609375],[33.135254,-112.609863],[33.184571,-112.610352],[33.283204,-112.611328],[33.480469,-112.613281],[33.875,-112.617187],[34.359375,-112.796875],[34.527344,-112.929687],[34.611329,-112.996094],[34.653321,-113.029297],[34.695313,-113.0625],[34.729493,-113.092773],[34.763672,-113.123047],[34.832032,-113.183593],[34.96875,-113.304687],[35.265625,-113.554687],[35.40625,-113.542968],[35.476563,-113.537109],[35.511719,-113.53418],[35.546875,-113.53125],[35.588867,-113.524414],[35.630859,-113.517578],[35.714844,-113.503906],[35.882813,-113.476562],[36.21875,-113.421875],[36.460938,-113.296875],[36.582031,-113.234375],[36.642578,-113.203125],[36.672852,-113.1875],[36.703125,-113.171875],[36.723389,-113.160644],[36.743652,-113.149414],[36.78418,-113.126953],[36.865235,-113.082031],[36.946289,-113.037109],[36.986328,-113.013672],[37.027344,-112.992187],[37.058594,-112.974609],[37.089844,-112.957031],[37.121094,-112.939453],[37.152344,-112.921875],[37.189698,-112.903809],[37.227051,-112.885742],[37.301758,-112.849609],[37.451172,-112.777343],[37.75,-112.632812],[38.390625,-112.546875],[39.09375,-112.558593],[39.796875,-112.570312],[40.367188,-112.6875],[40.84375,-112.882812],[41.140625,-113.179687],[41.328125,-113.539062],[41.421875,-114.039062],[41.46875,-114.289062],[41.492188,-114.414062],[41.503906,-114.476562],[41.515625,-114.539062],[41.525391,-114.591797],[41.535156,-114.644531],[41.554688,-114.75],[41.59375,-114.960937],[41.671875,-115.382812],[42.015625,-115.75],[42.523438,-116.015625],[43.125,-116.179687],[43.394532,-116.210937],[43.529297,-116.226562],[43.59668,-116.234374],[43.630372,-116.238281],[43.664063,-116.242187],[43.694336,-116.257812],[43.72461,-116.273437],[43.785157,-116.304687],[43.90625,-116.367187],[44.078125,-116.546875],[44.054688,-116.734375],[43.890625,-116.851562],[43.664063,-117.007812],[43.53125,-117.210937],[43.648438,-117.34375],[43.859375,-117.414062],[44.242188,-117.609375],[44.757813,-117.859375],[44.890625,-118.007812],[45.09375,-118.132812],[45.484375,-118.398437],[45.824219,-118.425781],[45.994141,-118.439453],[46.079102,-118.446289],[46.121583,-118.449707],[46.164063,-118.453125],[46.220704,-118.453125],[46.277344,-118.453125],[46.390626,-118.453125],[46.617188,-118.453125],[46.960938,-118.304687],[47.289063,-117.96875],[47.46875,-117.539062],[47.507813,-117.1875],[47.421875,-116.820312],[47.367188,-116.53125],[47.140625,-116.242187],[46.959961,-116.117187],[46.869629,-116.054687],[46.824463,-116.023437],[46.779297,-115.992187],[46.726807,-115.970703],[46.674317,-115.949218],[46.569336,-115.906249],[46.359375,-115.820312],[45.75,-115.765625],[45.15625,-115.828125],[44.53125,-115.953125],[44.097657,-116.097656],[43.88086,-116.169921],[43.772461,-116.206054],[43.718262,-116.224121],[43.691163,-116.233154],[43.664063,-116.242187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[25.476563,-101.671875],[25.421876,-101.691894],[25.367188,-101.711914],[25.257813,-101.751953],[25.039063,-101.832031],[24.601563,-101.992187],[23.625,-102.414062],[22.835938,-102.664062],[22.15625,-103],[21.570313,-103.953125],[21.425782,-104.386718],[21.353516,-104.603515],[21.317383,-104.711914],[21.299316,-104.766113],[21.28125,-104.820312],[21.28418,-104.849609],[21.287109,-104.878906],[21.292969,-104.937499],[21.304688,-105.054687],[21.328125,-105.289062],[21.392578,-105.536133],[21.426758,-105.658691],[21.443848,-105.719971],[21.460938,-105.78125],[21.47168,-105.818359],[21.482422,-105.855469],[21.503906,-105.929687],[21.546875,-106.078125],[21.632813,-106.375],[21.914063,-107.0625],[22.453125,-107.359375],[22.90625,-107.742187],[22.773438,-109.15625],[22.835938,-109.277343],[22.867188,-109.33789],[22.882813,-109.368164],[22.898438,-109.398437],[22.922852,-109.429687],[22.947266,-109.460937],[22.996094,-109.523437],[23.093751,-109.648437],[23.289063,-109.898437],[23.226563,-110.203125],[23.15625,-110.601562],[22.882813,-111.101562],[22.835938,-111.476562],[22.703125,-111.710937],[22.726563,-112.046875],[22.789063,-112.40625],[22.78125,-112.710937],[22.816407,-112.812499],[22.833985,-112.863281],[22.851563,-112.914062],[22.871094,-112.957031],[22.890626,-112.999999],[22.929688,-113.085937],[23.007813,-113.257812],[23.65625,-113.523437],[23.914063,-113.804687],[24.304688,-113.902343],[24.500001,-113.951172],[24.695313,-114],[24.816895,-114.089599],[24.938477,-114.179199],[24.999268,-114.223999],[25.060059,-114.268798],[25.12085,-114.313598],[25.151245,-114.335998],[25.181641,-114.358398],[25.209717,-114.378051],[25.237793,-114.397705],[25.293946,-114.437011],[25.40625,-114.515625],[25.585938,-114.804687],[25.65625,-115.140625],[25.734375,-115.308106],[25.773438,-115.391846],[25.792969,-115.433716],[25.8125,-115.475586]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[21.28125,-104.820312],[21.25708,-104.847168],[21.23291,-104.874023],[21.18457,-104.927734],[21.087891,-105.035156],[20.894532,-105.25],[20.701172,-105.464843],[20.604493,-105.572265],[20.556153,-105.625976],[20.531983,-105.652832],[20.507813,-105.679687],[20.478516,-105.710937],[20.449219,-105.742187],[20.390626,-105.804687],[20.273438,-105.929687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[20.507813,-105.679687],[20.538575,-105.677246],[20.569336,-105.674804],[20.63086,-105.669921],[20.753907,-105.660156],[20.876953,-105.65039],[21,-105.640625],[21.115235,-105.675781],[21.230469,-105.710937],[21.345704,-105.746094],[21.403321,-105.763672],[21.432129,-105.772461],[21.460938,-105.78125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[29.0625,-99.648437],[29.113281,-99.58789],[29.164063,-99.527343],[29.265625,-99.406249],[29.46875,-99.164062],[29.652344,-99.101562],[29.744141,-99.070312],[29.79004,-99.054687],[29.835938,-99.039062],[29.88379,-99.027343],[29.931641,-99.015624],[30.027344,-98.992187],[30.21875,-98.945312],[30.34375,-98.839843],[30.46875,-98.734375],[30.492188,-98.59375],[30.515625,-98.453125],[30.507813,-98.296875],[30.503906,-98.21875],[30.501953,-98.179687],[30.5,-98.140625],[30.537109,-98.104492],[30.574219,-98.068359],[30.648438,-97.996093],[30.796875,-97.851562],[31.113282,-97.785156],[31.429688,-97.71875],[31.550782,-97.535156],[31.611328,-97.443359],[31.671875,-97.351562],[31.539063,-97.246093],[31.40625,-97.140624],[31.140625,-96.929687],[31.025391,-96.824218],[30.910157,-96.718749],[30.794922,-96.613281],[30.737305,-96.560546],[30.679688,-96.507812],[30.593751,-96.579101],[30.507813,-96.65039],[30.421876,-96.721679],[30.335938,-96.792968],[30.250001,-96.864257],[30.164063,-96.935546],[30.078126,-97.006836],[29.992188,-97.078125],[29.945313,-97.18164],[29.898438,-97.285156],[29.851563,-97.388671],[29.828126,-97.440429],[29.816407,-97.466308],[29.804688,-97.492187],[29.803711,-97.530273],[29.802735,-97.568359],[29.800782,-97.644531],[29.796876,-97.796874],[29.789063,-98.101562],[29.765625,-98.386719],[29.742188,-98.671875],[29.788575,-98.854981],[29.811768,-98.946533],[29.823364,-98.99231],[29.834961,-99.038086]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[29.806641,-97.490234],[29.823975,-97.53833],[29.841309,-97.586425],[29.875977,-97.682617],[29.945313,-97.875],[30.223633,-98.007812],[30.362793,-98.074219],[30.432373,-98.107422],[30.467163,-98.124023],[30.501953,-98.140625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[29.078125,-100.359375],[29.061523,-100.393555],[29.044922,-100.427734],[29.009766,-100.496094],[28.941407,-100.632812],[28.804688,-100.90625],[28.871094,-101.246093],[28.9375,-101.585937],[28.992188,-102.265625],[28.96875,-102.90625],[28.980469,-102.954102],[28.992188,-103.001953],[29.015625,-103.097656],[29.0625,-103.289062],[29.398438,-103.625],[29.710938,-103.960937],[29.793946,-104.132812],[29.835449,-104.218749],[29.856201,-104.261718],[29.876953,-104.304687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[28.96875,-102.90625],[28.956055,-102.941406],[28.943359,-102.976562],[28.917969,-103.046875],[28.867188,-103.1875],[28.765625,-103.46875],[28.648438,-103.652343],[28.53125,-103.835937],[28.544922,-103.996094],[28.548828,-104.167969],[28.549805,-104.248047],[28.550293,-104.288086],[28.550781,-104.328125],[28.553955,-104.382812],[28.557129,-104.4375],[28.563477,-104.546875],[28.569824,-104.65625],[28.576172,-104.765625],[28.58252,-104.875],[28.588868,-104.984375],[28.595215,-105.09375],[28.601563,-105.203125],[28.638672,-105.262695],[28.675782,-105.322265],[28.712891,-105.381836],[28.750001,-105.441406],[28.78711,-105.500976],[28.824219,-105.560546],[28.861329,-105.620117],[28.879883,-105.649902],[28.898438,-105.679687],[28.921876,-105.722656],[28.945313,-105.765624],[28.992188,-105.851562],[29.085938,-106.023437],[29.046875,-106.765625],[29.078125,-107.4375],[29,-108.101562],[28.851563,-108.445312],[28.9375,-108.859375],[28.953125,-109.037109],[28.96875,-109.242187],[28.976563,-109.337891],[28.984375,-109.433594],[28.992188,-109.529297],[28.996094,-109.577148],[29,-109.625],[28.997559,-109.671875],[28.995117,-109.71875],[28.990235,-109.8125],[28.980469,-110],[28.960938,-110.375],[28.828125,-111.179199]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[28.550781,-104.328125],[28.583008,-104.370117],[28.615235,-104.412109],[28.675782,-104.496093],[28.796875,-104.664062],[28.789063,-104.771484],[28.78125,-104.878906],[28.773438,-104.986328],[28.765625,-105.09375],[28.824219,-105.191406],[28.882813,-105.289062],[28.941406,-105.386719],[29,-105.484375],[28.97461,-105.533691],[28.949219,-105.583008],[28.923829,-105.632325],[28.898438,-105.681641]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[29,-109.626953],[29.03418,-109.611084],[29.06836,-109.595215],[29.136719,-109.563477],[29.273438,-109.5],[29.492188,-109.359375],[29.578126,-109.144043],[29.621094,-109.037109],[29.642578,-108.98291],[29.664063,-108.928711]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[24.945313,-107.773437],[24.97583,-107.814697],[25.006348,-107.855957],[25.067383,-107.938477],[25.127442,-108.020019],[25.1875,-108.101562],[25.28711,-108.361328],[25.386719,-108.621093],[25.486329,-108.880859],[25.585938,-109.140625],[25.945313,-109.375],[26.232422,-109.341797],[26.519532,-109.308593],[26.806641,-109.27539],[26.950195,-109.258789],[27.021973,-109.250488],[27.057861,-109.246337],[27.09375,-109.242187],[27.148438,-109.239257],[27.203125,-109.236328],[27.3125,-109.230468],[27.53125,-109.21875],[27.765625,-109.257812],[27.882813,-109.277344],[27.941406,-109.287109],[27.970703,-109.291992],[28,-109.296875],[28.048828,-109.293945],[28.097656,-109.291015],[28.195313,-109.285156],[28.390625,-109.273437],[28.71875,-109.15625],[28.871094,-109.146484],[29.046875,-109.130859],[29.212891,-109.111328],[29.438477,-109.020508],[29.55127,-108.975097],[29.607666,-108.952392],[29.635865,-108.94104],[29.664063,-108.929687],[29.702149,-108.90332],[29.740235,-108.876953],[29.816407,-108.824218],[29.96875,-108.71875],[30.21875,-108.484375],[30.539063,-108.304687],[30.691407,-108.214843],[30.767578,-108.169922],[30.805664,-108.147461],[30.84375,-108.125],[30.872559,-108.081055],[30.901367,-108.037109],[30.958985,-107.949218],[31.074219,-107.773437],[31.304688,-107.421875],[31.632813,-107.078125],[31.84375,-106.710937],[32.3125,-106.296875],[32.570069,-106.245849],[32.698853,-106.220337],[32.763245,-106.20758],[32.795441,-106.201202],[32.827637,-106.194824]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[24.921875,-110.413574],[24.885742,-110.46051],[24.84961,-110.507446],[24.777344,-110.601318],[24.632813,-110.789062],[24.023438,-111.203125],[24.53125,-111.84375],[24.320313,-112.390625],[24.921875,-112.765625],[24.910156,-113.021484],[24.898438,-113.277343],[24.886719,-113.533203],[24.875,-113.789062],[24.964844,-113.908203],[25.054688,-114.027343],[25.144531,-114.146484],[25.189453,-114.206055],[25.211914,-114.23584],[25.234375,-114.265625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[26.101563,-111.336426],[26.375,-111.15625],[26.375,-110.664062],[26.507813,-110.125],[26.757813,-109.703125],[27.054688,-109.382812],[27.064209,-109.347412],[27.073731,-109.312012],[27.083252,-109.276611],[27.092773,-109.241211]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[27.999023,-109.298828],[27.976135,-109.30896],[27.953247,-109.319092],[27.907471,-109.339355],[27.815918,-109.379883],[27.632813,-109.460937],[27.203125,-109.570312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[24.765137,-109.335937],[24.726135,-109.341796],[24.687134,-109.347656],[24.609131,-109.359374],[24.453125,-109.382812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[24.530273,-115.545898],[24.550628,-115.508789],[24.570984,-115.471679],[24.611694,-115.39746],[24.693115,-115.249023],[24.855957,-114.952148],[25.018799,-114.655273],[25.10022,-114.506835],[25.140931,-114.432617],[25.161286,-114.395507],[25.171463,-114.376953],[25.181641,-114.358398],[25.195069,-114.335205],[25.208497,-114.312011],[25.221924,-114.288818],[25.235352,-114.265625],[25.262574,-114.223633],[25.289795,-114.18164],[25.344239,-114.097656],[25.453125,-113.929687],[25.671875,-113.585937],[25.960938,-113.617187],[26.367188,-113.742187],[26.679688,-113.539062],[27.109375,-113.453125],[27.625,-113.421875],[27.9375,-113.421875],[28.4375,-113.460937],[28.882813,-113.4375],[29.226563,-113.070312],[29.624512,-113.026855],[29.823487,-113.005126],[29.922974,-112.994262],[29.972717,-112.98883],[30.022461,-112.983398],[30.053604,-112.971817],[30.084747,-112.960235],[30.147034,-112.937072],[30.271607,-112.890747],[30.396179,-112.844421],[30.520752,-112.798095],[30.645325,-112.75177],[30.769898,-112.705444],[30.89447,-112.659118],[31.019043,-112.612792],[31.268189,-112.520141],[31.517334,-112.42749],[31.76648,-112.334838],[32.015625,-112.242187],[32.210938,-112.078124],[32.308594,-111.996093],[32.357422,-111.955078],[32.40625,-111.914062],[32.443359,-111.892578],[32.480469,-111.871093],[32.554688,-111.828124],[32.628906,-111.785156],[32.666016,-111.763671],[32.703125,-111.742187],[32.738037,-111.731201],[32.772949,-111.720214],[32.842774,-111.698242],[32.982422,-111.654296],[33.261719,-111.566406],[33.541016,-111.478515],[33.820313,-111.390625],[34.351563,-111.257812],[34.835938,-111.070312],[35.132813,-110.71875],[35.75,-110.351562],[36.171875,-110.289062],[36.578125,-110.132812],[37.148438,-110.226562],[37.6875,-110.257812],[38.40625,-110.101562],[39.003907,-109.957031],[39.601563,-109.8125],[39.957032,-109.816162],[40.3125,-109.819824]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[30.843262,-108.125],[30.887268,-108.166992],[30.931275,-108.208984],[31.019287,-108.292968],[31.195313,-108.460937],[31.898438,-108.960937],[32.195313,-109.375],[32.289063,-109.789062],[32.167969,-110.511718],[32.109375,-110.875],[32.046875,-111.234375],[32.195313,-111.445312],[32.414063,-111.625],[32.410157,-111.769531],[32.408203,-111.841796],[32.407227,-111.877929],[32.40625,-111.914062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[33.5625,-109.117187],[34.054688,-109.820312],[34.40625,-110.101562],[35.158203,-110.376953],[35.751953,-110.351562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[29.179688,-113.797852],[29.228516,-113.806092],[29.277344,-113.814331],[29.375001,-113.830811],[29.570313,-113.863769],[29.765626,-113.896728],[29.863282,-113.913208],[29.91211,-113.921447],[29.960938,-113.929687],[29.996094,-113.932373],[30.031251,-113.935058],[30.101563,-113.940429],[30.242188,-113.951171],[30.523438,-113.972656],[31.085938,-114.015625],[31.554688,-113.859375],[31.984375,-113.515625],[32.515625,-113.039062],[32.800781,-112.824218],[32.943359,-112.716797],[33.014648,-112.663086],[33.050293,-112.63623],[33.085938,-112.609375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[25.603516,-118.03125],[25.627686,-118.043945],[25.651855,-118.05664],[25.700195,-118.082031],[25.796875,-118.132812],[25.898438,-118.382812],[26.171875,-118.507812],[26.351563,-118.75],[26.482422,-118.832031],[26.547852,-118.873047],[26.580566,-118.893555],[26.613281,-118.914062],[26.655762,-118.929687],[26.698242,-118.945312],[26.783203,-118.976562],[26.953125,-119.039062],[27.246094,-119.277344],[27.539063,-119.515625],[27.871094,-119.609375],[28.03711,-119.65625],[28.120117,-119.679687],[28.203125,-119.703125],[28.241211,-119.657227],[28.279297,-119.611328],[28.317383,-119.565429],[28.355469,-119.519531],[28.431641,-119.427734],[28.469727,-119.381835],[28.507813,-119.335937],[28.544922,-119.24414],[28.582032,-119.152343],[28.619141,-119.060547],[28.65625,-118.96875],[28.767578,-118.892578],[28.878907,-118.816406],[28.990235,-118.740234],[29.045899,-118.702148],[29.073731,-118.683105],[29.101563,-118.664062],[29.118653,-118.639892],[29.135743,-118.615722],[29.169922,-118.567382],[29.238282,-118.470703],[29.306641,-118.374023],[29.340821,-118.325683],[29.375001,-118.277343],[29.44336,-118.180664],[29.511719,-118.083984],[29.580079,-117.987305],[29.614258,-117.938965],[29.631348,-117.914795],[29.648438,-117.890625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[28.842773,-118.030273],[28.858947,-118.069885],[28.875122,-118.109497],[28.907471,-118.18872],[28.972168,-118.347167],[29.004517,-118.426391],[29.036865,-118.505615],[29.069214,-118.584838],[29.085389,-118.62445],[29.093476,-118.644256],[29.101563,-118.664062],[29.109131,-118.699218],[29.1167,-118.734374],[29.131837,-118.804687],[29.16211,-118.945312],[29.192384,-119.085937],[29.222657,-119.226562],[29.25293,-119.367187],[29.283204,-119.507812],[29.313477,-119.648437],[29.34375,-119.789062],[29.255859,-119.892578],[29.167969,-119.996093],[29.080078,-120.099609],[29.036133,-120.151367],[28.992188,-120.203125],[28.936523,-120.202148],[28.880859,-120.201172],[28.769531,-120.199218],[28.658203,-120.197265],[28.546875,-120.195312],[28.511719,-120.082031],[28.476563,-119.968749],[28.441406,-119.855468],[28.423828,-119.798828],[28.40625,-119.742187],[28.431641,-119.640625],[28.457031,-119.539062],[28.482422,-119.4375],[28.495117,-119.386719],[28.507813,-119.335937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[28.40625,-119.742187],[28.350586,-119.755371],[28.294922,-119.768555],[28.239258,-119.781738],[28.183594,-119.794922],[28.12793,-119.808105],[28.072266,-119.821289],[28.016602,-119.834473],[27.960938,-119.847656],[27.905273,-119.86084],[27.849609,-119.874023],[27.738281,-119.900391],[27.515625,-119.953125],[27.425782,-120.125],[27.335938,-120.296875],[27.378907,-120.550781],[27.421875,-120.804687],[27.601563,-120.914062],[27.664063,-121.132812],[27.796875,-121.320312],[27.960938,-121.382812],[28.042969,-121.414062],[28.083984,-121.429687],[28.125,-121.445312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[28.992188,-120.203125],[28.983887,-120.234375],[28.975586,-120.265625],[28.958985,-120.328125],[28.925782,-120.453125],[28.859375,-120.703125],[28.636719,-120.871093],[28.414063,-121.039062],[28.261719,-121.242187],[28.19336,-121.34375],[28.15918,-121.394531],[28.125,-121.445312],[28.110352,-121.497559],[28.095703,-121.549805],[28.066406,-121.654297],[28.007813,-121.863281],[27.890625,-122.28125],[27.640625,-122.820312],[27.6875,-123.242187],[27.9375,-123.648437],[28.210938,-123.914062],[28.476563,-124.242187],[28.875,-124.59375],[29.515625,-125.140625],[30.023438,-125.382812],[30.53125,-125.625],[31.429688,-125.851562],[32.09375,-125.625],[32.460938,-125.1875],[33.070313,-124.726562],[33.867188,-124.242187],[34.257813,-124.027343],[34.453126,-123.919922],[34.550782,-123.866211],[34.59961,-123.839355],[34.648438,-123.8125],[34.694581,-123.781738],[34.740723,-123.750977],[34.833008,-123.689453],[35.017579,-123.566406],[35.202149,-123.443359],[35.294434,-123.381835],[35.340576,-123.351074],[35.363648,-123.335693],[35.386719,-123.320312],[35.413819,-123.306152],[35.440918,-123.291992],[35.495118,-123.263671],[35.603516,-123.207031],[35.711915,-123.15039],[35.820313,-123.09375],[35.927735,-123.037109],[36.035157,-122.980468],[36.142578,-122.923828],[36.25,-122.867187],[36.625,-122.835937],[37.117188,-122.84375],[37.539063,-122.828125],[37.953125,-122.742187],[38.273438,-122.625],[38.585938,-122.328125],[38.835938,-121.984375],[38.828125,-121.65625],[38.78125,-121.433593],[38.757813,-121.322265],[38.746094,-121.266601],[38.734375,-121.210937],[38.730469,-121.166992],[38.726563,-121.123046],[38.71875,-121.035156],[38.703125,-120.859375],[38.304688,-120.59375],[37.953126,-120.523437],[37.601563,-120.453125],[37.171875,-120.234375],[36.835938,-119.992187],[36.695313,-119.835937],[36.625001,-119.757812],[36.589844,-119.718749],[36.572266,-119.699218],[36.554688,-119.679687],[36.563477,-119.65039],[36.572266,-119.621093],[36.589844,-119.562499],[36.625,-119.445312],[36.921876,-119.187499],[37.10547,-118.941405],[37.289063,-118.695312],[37.425782,-118.289062],[37.5625,-117.882812],[37.699219,-117.476562],[37.835938,-117.070312],[37.917969,-116.781249],[37.958985,-116.636718],[37.979492,-116.564453],[37.989746,-116.52832],[38,-116.492187],[38.002319,-116.443359],[38.004639,-116.394531],[38.009277,-116.296874],[38.018555,-116.101562],[38.027832,-115.906249],[38.03247,-115.808593],[38.03479,-115.759765],[38.037109,-115.710937],[38.00122,-115.686523],[37.965332,-115.662109],[37.893555,-115.613281],[37.75,-115.515625],[37.3125,-115.445312],[37.023438,-115.406249],[36.878906,-115.386718],[36.806641,-115.376953],[36.770508,-115.37207],[36.734375,-115.367187],[36.724609,-115.325195],[36.714844,-115.283203],[36.695313,-115.199218],[36.65625,-115.03125],[36.773438,-114.71875],[36.832031,-114.5625],[36.861328,-114.484375],[36.875977,-114.445312],[36.890625,-114.40625],[36.87793,-114.364258],[36.865234,-114.322266],[36.839844,-114.238281],[36.789063,-114.070312],[36.6875,-113.734375],[36.695313,-113.453125],[36.699219,-113.3125],[36.701172,-113.242187],[36.702148,-113.207031],[36.703125,-113.171875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[32.702148,-111.742187],[32.736389,-111.753417],[32.77063,-111.764648],[32.839111,-111.787109],[32.976074,-111.832031],[33.25,-111.921875],[34.890625,-111.875],[35.726563,-111.960937],[36.117188,-112.140624],[36.312501,-112.230468],[36.410157,-112.27539],[36.458985,-112.297851],[36.483399,-112.309082],[36.507813,-112.320312],[36.539063,-112.348632],[36.570313,-112.376953],[36.632813,-112.433593],[36.757813,-112.546875],[36.863282,-112.679687],[36.916016,-112.746094],[36.942383,-112.779297],[36.96875,-112.8125],[36.976074,-112.834961],[36.983399,-112.857422],[36.998047,-112.902343],[37.012696,-112.947265],[37.027344,-112.992187],[37.044922,-113.033203],[37.0625,-113.074218],[37.097657,-113.156249],[37.167969,-113.320312],[37.217774,-113.447265],[37.267579,-113.574218],[37.317383,-113.701172],[37.367188,-113.828125],[37.503907,-113.896484],[37.640626,-113.964843],[37.777344,-114.033203],[37.845704,-114.067382],[37.879883,-114.084472],[37.914063,-114.101562],[37.968751,-114.102539],[38.023438,-114.103515],[38.132813,-114.105468],[38.351563,-114.109375],[38.75,-114.070312],[39.117188,-113.835937],[39.3125,-113.53125],[39.179688,-113.234375],[38.914063,-113.0625],[38.582032,-113.0625],[38.416016,-113.0625],[38.333008,-113.0625],[38.291504,-113.0625],[38.25,-113.0625],[38.192383,-113.060547],[38.134766,-113.058594],[38.019531,-113.054687],[37.789063,-113.046875],[37.558594,-113.039062],[37.328125,-113.03125],[37.240234,-112.976562],[37.196289,-112.949219],[37.152344,-112.921875],[37.106445,-112.894409],[37.060547,-112.866943],[37.014648,-112.839478],[36.991699,-112.825745],[36.96875,-112.812012]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[38.25,-113.063477],[38.219238,-113.093201],[38.188477,-113.122925],[38.126953,-113.182373],[38.003907,-113.301269],[37.757813,-113.539062],[37.710938,-113.8125],[37.812989,-113.957031],[37.864014,-114.029296],[37.889526,-114.065429],[37.915039,-114.101562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[36.890137,-114.406738],[36.922135,-114.397201],[36.954132,-114.387664],[37.018128,-114.368591],[37.146119,-114.330444],[37.274109,-114.292297],[37.4021,-114.25415],[37.658082,-114.177856],[37.786072,-114.139709],[37.850068,-114.120635],[37.882065,-114.111099],[37.914063,-114.101562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[36.506836,-112.319336],[36.511292,-112.344299],[36.515747,-112.369263],[36.524658,-112.41919],[36.54248,-112.519043],[36.560303,-112.618896],[36.578125,-112.71875],[36.320313,-112.851562],[36.09375,-113.039062],[35.609375,-113.359375],[35.578125,-113.445801],[35.5625,-113.489014],[35.546875,-113.532227]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[29.960938,-113.931641],[29.951661,-113.980835],[29.942383,-114.03003],[29.923829,-114.128418],[29.886719,-114.325195],[29.8125,-114.71875],[30.164063,-115.0625],[30.9375,-115.171875],[31.5625,-115.085937],[32.101563,-115.101562],[32.335938,-115.273437],[32.414063,-115.523437],[32.585938,-115.726562],[32.785157,-115.640624],[32.884766,-115.597656],[32.93457,-115.576171],[32.959473,-115.565429],[32.984375,-115.554687],[32.993164,-115.52246],[33.001953,-115.490234],[33.019531,-115.425781],[33.054688,-115.296874],[33.125,-115.039062],[33.6875,-114.882812],[34.085938,-114.703125],[34.328125,-114.390625],[34.359375,-114.109375],[34.484375,-113.875],[34.695313,-113.367187],[34.695313,-113.214843],[34.695313,-113.138672],[34.695313,-113.100586],[34.695313,-113.0625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[32.984375,-115.554687],[33.030762,-115.544433],[33.077149,-115.534179],[33.169922,-115.513671],[33.355469,-115.472656],[33.726563,-115.390625],[33.984375,-115.601562],[34.171875,-115.679687],[34.265625,-115.832031],[34.3125,-115.908203],[34.335938,-115.946289],[34.359375,-115.984375],[34.340332,-116.012695],[34.321289,-116.041016],[34.283203,-116.097656],[34.207032,-116.210937],[34.054688,-116.4375],[33.921875,-116.734375],[33.851563,-117.070312],[33.71875,-117.617187],[33.96875,-118.03125],[34.359375,-118.21875],[34.796875,-118.25],[35.246094,-118.078125],[35.695313,-117.90625],[36.070313,-117.523437],[36.164063,-117.253906],[36.257813,-116.984375],[36.183594,-116.601562],[36.146485,-116.410156],[36.109375,-116.21875],[36.109375,-116.043945],[36.109375,-115.956543],[36.109375,-115.912842],[36.109375,-115.869141]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[34.359375,-115.984375],[34.395508,-115.970703],[34.431641,-115.957031],[34.503907,-115.929687],[34.648438,-115.875],[35.378906,-115.871093],[35.744141,-115.86914],[35.926758,-115.868164],[36.018066,-115.867675],[36.063721,-115.867431],[36.109375,-115.867187],[36.148438,-115.855468],[36.1875,-115.843749],[36.265625,-115.820312],[36.421875,-115.773437],[36.578125,-115.570312],[36.65625,-115.468749],[36.695313,-115.417968],[36.714844,-115.392578],[36.734375,-115.367187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[38.039063,-115.710937],[38.074219,-115.727539],[38.109376,-115.74414],[38.179688,-115.777343],[38.320313,-115.84375],[38.804688,-115.78125],[39.140625,-115.796875],[39.125,-116.1875],[38.867188,-116.484375],[38.414063,-116.515625],[38.207032,-116.503906],[38.103516,-116.498046],[38.051758,-116.495117],[38,-116.492187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[38.734375,-121.210937],[38.804688,-121.203124],[38.875,-121.195312],[39.015625,-121.179687],[39.199219,-121.246093],[39.382813,-121.3125],[39.613282,-121.40625],[39.84375,-121.5],[40.015625,-121.414062],[40.1875,-121.328125],[40.328125,-121.140625],[40.390625,-120.78125],[40.523438,-120.445312],[40.59375,-119.96875],[40.546875,-119.453125],[40.421875,-119.007812],[40.171875,-118.640625],[40.117188,-118.34375],[40.0625,-118.046875],[40.085938,-117.632812],[40.34375,-117.375],[40.757813,-117.390625],[41.015625,-117.671875],[40.929688,-117.929687],[40.828125,-118.171875],[40.882813,-118.382812],[41.085938,-118.585937],[41.710938,-118.679687],[42.117188,-118.867187],[42.523438,-119.03125],[43.078125,-119.125],[43.585938,-119.15625],[44.0625,-119.125],[44.546875,-119.007812],[44.914063,-118.773437],[45.320313,-118.710937],[45.835938,-118.664062],[46,-118.558593],[46.082031,-118.505859],[46.123047,-118.479492],[46.164063,-118.453125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[36.554688,-119.679687],[36.533203,-119.70459],[36.511719,-119.729492],[36.46875,-119.779297],[36.425781,-119.827148],[36.404297,-119.851074],[36.382813,-119.875],[36.359375,-119.901978],[36.335938,-119.928955],[36.289063,-119.98291],[36.242188,-120.036865],[36.195313,-120.09082],[36.148438,-120.144776],[36.101563,-120.198731],[36.054688,-120.252686],[36.03125,-120.278687],[36.007813,-120.304687],[36.005371,-120.331055],[36.00293,-120.357422],[35.998047,-120.410156],[35.988281,-120.515625],[35.96875,-120.726562],[35.929688,-121.148437],[36.09375,-121.671875],[36.117188,-122.234375],[36.039063,-122.539062],[35.941407,-122.648437],[35.84375,-122.757812],[35.729492,-122.898437],[35.615234,-123.039062],[35.500977,-123.179687],[35.443848,-123.25],[35.415283,-123.285156],[35.401001,-123.302734],[35.386719,-123.320312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[36.382813,-119.875],[36.322022,-119.865478],[36.261231,-119.855957],[36.20044,-119.846436],[36.139649,-119.836914],[36.078857,-119.827392],[36.018066,-119.817871],[35.957275,-119.808349],[35.896484,-119.796875],[35.864502,-119.785156],[35.83252,-119.773437],[35.768555,-119.75],[35.640625,-119.703125],[35.416992,-119.702148],[35.193359,-119.701172],[34.96875,-119.921875],[34.765625,-120.25],[34.679688,-120.5],[34.453125,-120.78125],[34.273438,-121.296875],[34.085938,-121.6875],[33.976563,-122.140625],[34.03125,-122.578125],[34.398438,-123.234375],[34.570313,-123.5],[34.609376,-123.65625],[34.628907,-123.734375],[34.638672,-123.773437],[34.648438,-123.8125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[35.898438,-119.796875],[35.91211,-119.860352],[35.925782,-119.923828],[35.939454,-119.987304],[35.953126,-120.050781],[35.980469,-120.177734],[35.994141,-120.24121],[36.000977,-120.272949],[36.007813,-120.304687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[28.671875,-115.990234],[28.660156,-116.025512],[28.648438,-116.060791],[28.625,-116.131347],[28.578125,-116.27246],[28.484375,-116.554687],[28.476563,-116.882812],[28.554688,-117.25],[28.890625,-117.609375],[29.078125,-117.785156],[29.171875,-117.873047],[29.21875,-117.916992],[29.242188,-117.938965],[29.265625,-117.960937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[36,-105.671875],[36.296875,-105.3125],[36.960938,-105.660156],[37.796875,-105.296875],[38.171875,-104.835937],[38.5625,-104.984375],[38.867188,-105.234375],[39.257813,-105.6875],[39.507813,-105.820312],[39.917969,-105.785156],[40.328125,-105.75],[40.632813,-105.828125],[41.015625,-105.820312],[41.625,-105.859375],[41.96875,-105.835937],[42.3125,-105.8125],[42.664063,-105.65625],[43.078125,-105.546875],[43.34375,-105.296875],[43.648438,-105.195312],[44.09375,-105.203125],[44.546875,-105.601562],[44.804688,-105.59375],[45.085938,-105.65625],[45.71875,-105.34375],[46.078125,-105.40625],[46.734375,-105.34375],[47.03125,-105.171875],[47.3125,-104.953125],[47.765625,-104.6875],[48.09375,-104.765625],[48.75,-104.765625],[48.898438,-104.9375],[49.1875,-105.023437],[49.417969,-105.304687],[50.085938,-105.84375],[51.304688,-105.796875],[51.902344,-105.742187],[52.201172,-105.714844],[52.350586,-105.701172],[52.425293,-105.694336],[52.462647,-105.690918],[52.5,-105.6875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[36.570313,-105.888672],[36.960938,-105.660156]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[39.507813,-105.818359],[39.15625,-106.164062],[39.296875,-106.554687],[39.4375,-106.945312],[39.521484,-107.603516]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[39.59375,-107.873047],[39.421875,-108.328125],[39.1875,-108.734375],[38.890625,-109.34375],[38.539063,-109.75],[38.40625,-110.103516]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[24.695313,-119.09375],[24.734497,-119.094849],[24.773682,-119.095947],[24.852051,-119.098144],[25.008789,-119.102539],[25.322266,-119.111328],[25.945313,-119.125],[26.304688,-118.929687],[26.458985,-118.921874],[26.536133,-118.917968],[26.574707,-118.916015],[26.613281,-118.914062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[44.367188,-111.148437],[44.391602,-111.176269],[44.416016,-111.204101],[44.464844,-111.259765],[44.562501,-111.371093],[44.757813,-111.59375],[44.921876,-111.625],[45.003907,-111.640625],[45.044922,-111.648437],[45.085938,-111.65625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[46.443359,-111.351562],[46.409973,-111.355957],[46.376587,-111.360352],[46.309814,-111.369141],[46.17627,-111.386719],[45.90918,-111.421875],[45.64209,-111.457031],[45.375,-111.492187],[45.230469,-111.575195],[45.158204,-111.616699],[45.122071,-111.637451],[45.085938,-111.658203],[45.058594,-111.669311],[45.031251,-111.68042],[44.976563,-111.702637],[44.867188,-111.74707],[44.648438,-111.835937],[44.125,-111.84375],[44.03125,-112.179687],[44.382813,-112.492187],[44.15625,-113],[44.28125,-113.171875],[44.5,-113.226562],[45.0625,-113.328125],[45.008789,-113.547852],[44.981934,-113.657715],[44.968506,-113.712646],[44.955078,-113.767578],[44.926636,-113.786499],[44.898193,-113.80542],[44.841309,-113.843262],[44.727539,-113.918945],[44.5,-114.070312],[44,-114.351562],[43.132813,-114.46875],[42.273438,-114.679687],[41.894532,-114.609374],[41.705078,-114.574218],[41.610352,-114.55664],[41.562988,-114.547851],[41.515625,-114.539062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[44.953125,-113.765625],[44.990234,-113.802734],[45.027344,-113.839844],[45.101563,-113.914062],[45.25,-114.0625],[45.671875,-114.09375],[46.101563,-114],[46.578125,-113.804687],[47.171875,-113.945312],[47.617188,-114.414062],[47.582032,-114.687499],[47.564453,-114.824218],[47.555664,-114.892578],[47.546875,-114.960937],[47.52832,-114.99707],[47.509766,-115.033203],[47.472657,-115.105468],[47.398438,-115.25],[47.070313,-115.609375],[46.924805,-115.801758],[46.852051,-115.89795],[46.815674,-115.946045],[46.779297,-115.994141]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[47.546875,-114.960937],[47.578125,-114.97168],[47.609375,-114.982422],[47.671875,-115.003906],[47.796875,-115.046875],[48.074219,-115.003906],[48.351563,-114.960937],[48.644532,-115.031249],[48.9375,-115.101562],[49.203125,-115.140624],[49.46875,-115.179687],[49.804688,-115.09375],[50.039063,-114.953125],[50.136719,-114.824218],[50.185547,-114.759765],[50.210938,-114.726562],[50.234375,-114.695312],[50.243164,-114.657226],[50.251953,-114.61914],[50.269532,-114.542968],[50.304688,-114.390625],[50.296875,-114.25],[50.292969,-114.179687],[50.291016,-114.144531],[50.289063,-114.109375],[50.25293,-114.078125],[50.216797,-114.046875],[50.144531,-113.984375],[50.072266,-113.921875],[50,-113.859375],[49.851563,-113.789062],[49.703125,-113.71875],[49.648438,-113.628906],[49.59375,-113.539062],[49.703125,-113.515624],[49.8125,-113.492187],[49.929688,-113.566406],[50.046875,-113.640625],[50.15625,-113.699218],[50.265625,-113.757812],[50.382813,-113.6875],[50.363282,-113.601562],[50.34375,-113.515625],[50.207032,-113.484375],[50.138672,-113.46875],[50.070313,-113.453125],[49.984376,-113.416015],[49.898438,-113.378906],[49.812501,-113.341796],[49.726563,-113.304687],[49.761719,-113.222656],[49.796875,-113.140625],[49.88086,-113.15625],[49.964844,-113.171875],[50.048829,-113.1875],[50.132813,-113.203125],[50.212891,-113.242187],[50.292969,-113.28125],[50.373047,-113.320312],[50.453125,-113.359375],[50.535157,-113.292968],[50.617188,-113.226562],[50.574219,-113.121093],[50.53125,-113.015625],[50.473633,-112.967773],[50.416016,-112.919922],[50.358398,-112.87207],[50.32959,-112.848145],[50.300781,-112.824219],[50.26123,-112.773926],[50.22168,-112.723633],[50.142578,-112.623047],[50.0625,-112.523437],[49.984375,-112.421875],[50.070313,-112.285156],[50.15625,-112.148437],[50.089844,-111.999999],[50.023438,-111.851562],[50.166016,-111.789062],[50.308594,-111.726562],[50.451172,-111.664062],[50.59375,-111.601562],[50.648438,-111.632812],[50.703125,-111.664062],[50.757813,-111.695312],[50.8125,-111.726562],[50.867188,-111.757812],[50.921875,-111.789062],[50.976563,-111.820312],[51.03125,-111.851562],[51.09961,-111.861328],[51.167969,-111.871093],[51.236329,-111.880859],[51.304688,-111.890625],[51.339844,-111.918945],[51.375001,-111.947265],[51.410157,-111.975586],[51.445313,-112.003906],[51.480469,-112.032226],[51.515626,-112.060546],[51.550782,-112.088867],[51.585938,-112.117187],[51.63086,-112.107421],[51.675782,-112.097656],[51.720703,-112.08789],[51.765625,-112.078125],[51.810547,-112.068359],[51.855469,-112.058594],[51.900391,-112.048828],[51.945313,-112.039062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[50.300781,-112.824219],[50.347168,-112.821777],[50.393555,-112.819336],[50.486328,-112.814453],[50.580078,-112.808594],[50.671875,-112.804687],[50.707031,-112.873046],[50.742188,-112.941406],[50.777344,-113.009765],[50.8125,-113.078125],[50.814453,-113.154297],[50.816407,-113.230468],[50.81836,-113.30664],[50.820313,-113.382812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[50.289063,-114.109375],[50.319825,-114.139648],[50.350586,-114.169922],[50.41211,-114.230469],[50.535157,-114.351562],[50.658203,-114.472656],[50.719727,-114.533203],[50.750488,-114.563477],[50.78125,-114.59375],[50.806641,-114.62793],[50.832031,-114.662109],[50.882813,-114.730469],[50.984375,-114.867187],[51.1875,-115.140625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[50.235352,-114.695312],[50.26648,-114.675781],[50.297608,-114.656249],[50.359864,-114.617187],[50.484375,-114.539062],[50.632813,-114.566894],[50.707031,-114.580811],[50.744141,-114.587769],[50.78125,-114.594727]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[46.203125,-111.265625],[46.262695,-111.253906],[46.322266,-111.242187],[46.441407,-111.21875],[46.679688,-111.171875],[47.070313,-111],[47.484375,-110.6875],[47.84375,-110.335937],[48.042969,-110.046874],[48.142579,-109.902343],[48.192383,-109.830078],[48.217286,-109.793945],[48.242188,-109.757812],[48.260743,-109.728027],[48.279297,-109.698242],[48.316407,-109.638671],[48.390626,-109.519531],[48.539063,-109.28125],[48.898438,-108.882812],[49.460938,-108.382812],[49.753907,-108.156249],[50.046875,-107.929687],[50.384766,-107.783203],[50.722657,-107.636718],[51.060547,-107.490234],[51.398438,-107.34375],[51.550782,-107.34375],[51.626953,-107.34375],[51.665039,-107.34375],[51.703125,-107.34375],[51.743591,-107.331787],[51.784058,-107.319824],[51.86499,-107.295898],[52.026855,-107.248047],[52.350586,-107.152343],[52.674317,-107.05664],[52.836182,-107.008789],[52.917115,-106.984863],[52.957581,-106.9729],[52.998047,-106.960937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[45.085938,-105.65625],[45.351563,-106.007812],[45.601563,-106.257812],[46.164063,-106.828125],[46.53125,-107.007812],[46.773438,-107.390625],[47.203125,-107.984375],[47.445313,-108.492187],[47.429688,-108.742187],[47.5,-109.125],[47.671875,-109.476562],[47.957032,-109.617187],[48.09961,-109.687499],[48.170899,-109.722656],[48.206543,-109.740234],[48.242188,-109.757812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[45.71875,-105.345703],[45.617188,-104.9375],[45.242188,-104.546875],[45.226563,-104.203125],[45.265625,-103.875],[45.257813,-103.179687],[45.03125,-102.71875],[44.96875,-102.414062],[44.753906,-101.996094],[44.539063,-101.578125],[44.445313,-101.296875],[44.507813,-100.953125],[44.53125,-100.414062],[44.976563,-100.289062],[45.460938,-100.070312],[46.03125,-99.484375],[46.734375,-99.382812],[47.359375,-99.34375],[47.898438,-99.789062],[48.4375,-100.179687],[49.09375,-100.257812],[49.691407,-100.148437],[50.289063,-100.039062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[44.447266,-101.296875],[43.710938,-101.25]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[49.091797,-100.257812],[49.570313,-100.460937],[49.851563,-100.703125],[50.359375,-100.984375],[50.78125,-101.078125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[49.511719,-111.533203],[49.543579,-111.526794],[49.575439,-111.520386],[49.63916,-111.507568],[49.766602,-111.481934],[50.021484,-111.430664],[50.53125,-111.328125],[50.71875,-111.386718],[50.8125,-111.416015],[50.90625,-111.445312],[51.023438,-111.535156],[51.082031,-111.580078],[51.140625,-111.625],[51.1875,-111.665039],[51.234375,-111.705078],[51.28125,-111.745117],[51.328125,-111.785156],[51.375,-111.825195],[51.421875,-111.865234],[51.46875,-111.905273],[51.515625,-111.945312],[51.569336,-111.957031],[51.623047,-111.968749],[51.676758,-111.980468],[51.730469,-111.992187],[51.78418,-112.003906],[51.837891,-112.015624],[51.891602,-112.027343],[51.945313,-112.039062],[52.527344,-112.089843],[53.109375,-112.140625],[53.460938,-112.210937],[53.71875,-112.34375],[53.878907,-112.671875],[54.039063,-113],[54.171875,-113.328125],[54.25,-113.710937],[54.164063,-114.085937],[54.1875,-114.515625],[54.46875,-114.953125],[54.523438,-115.34375],[54.726563,-115.734375],[54.890625,-115.921875],[55.21875,-115.976562],[55.4375,-115.695312],[55.46875,-115.335937],[55.246094,-115.023437],[55.023438,-114.710937],[55.015625,-114.347656],[55.007813,-113.984375],[55.074219,-113.652344],[55.140625,-113.320312],[55.296875,-113.109375],[55.546875,-112.726562],[55.632813,-112.453125],[55.921875,-112.015625],[56.265625,-111.632812],[56.71875,-111.507812],[57.125,-111.492187],[57.492188,-111.53125],[58.234375,-111.632812],[58.757813,-111.546875],[59.210938,-111.546875],[59.625,-111.523437],[60.226563,-111.585937],[60.664063,-111.484375],[60.953125,-111.5],[61.226563,-111.445312],[61.640625,-111.453125],[62.15625,-111.648437],[62.601563,-111.625],[63.046875,-111.976562],[63.140625,-112.1875],[63.194336,-112.302734],[63.237793,-112.350585],[63.28125,-112.398437],[63.297852,-112.449218],[63.314453,-112.499999],[63.347657,-112.601562],[63.38086,-112.703124],[63.397461,-112.753906],[63.414063,-112.804687],[63.410157,-112.885742],[63.406251,-112.966796],[63.398438,-113.128906],[63.382813,-113.453125],[63.132813,-113.710937],[63.234375,-114.273437],[62.9375,-114.617187],[62.523438,-114.882812],[62.054688,-114.734375],[61.804688,-114.882812],[61.523438,-114.890625],[61.609375,-114.609375],[61.859375,-114.367187],[62.070313,-114.28125],[62.492188,-114.25],[62.507813,-113.40625],[62.757813,-113.1875],[63,-112.9375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[54.039063,-112.998047],[54.460938,-112.828125],[55.015625,-112.882812],[55.632813,-112.453125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[56.71875,-111.509766],[56.460938,-111.054687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[51.617188,-108.351562],[51.619874,-108.320068],[51.622559,-108.288574],[51.62793,-108.225585],[51.638672,-108.099609],[51.660156,-107.847656],[51.681641,-107.595703],[51.692383,-107.469727],[51.697754,-107.406738],[51.700439,-107.375244],[51.703125,-107.34375],[51.701172,-107.294922],[51.699219,-107.246094],[51.695313,-107.148437],[51.6875,-106.953125],[51.703125,-106.578125],[51.875,-106.335937],[52.085938,-106.125],[52.292969,-105.90625],[52.396485,-105.796875],[52.448242,-105.742187],[52.474121,-105.714844],[52.5,-105.6875],[52.533203,-105.658203],[52.566406,-105.628906],[52.632813,-105.570312],[52.765625,-105.453125],[52.898438,-105.335937],[52.964844,-105.277344],[53.03125,-105.21875],[53.081055,-105.151367],[53.13086,-105.083984],[53.180664,-105.016601],[53.230469,-104.949218],[53.280274,-104.881836],[53.330079,-104.814453],[53.379883,-104.74707],[53.429688,-104.679687],[53.460938,-104.61914],[53.492188,-104.558593],[53.523438,-104.498047],[53.554688,-104.4375],[53.554688,-104.367187],[53.554688,-104.296875],[53.554688,-104.226562],[53.554688,-104.15625],[53.553711,-104.097656],[53.552735,-104.039062],[53.551758,-103.980469],[53.550782,-103.921875],[53.549805,-103.863281],[53.548828,-103.804687],[53.547852,-103.746094],[53.546875,-103.6875],[53.541992,-103.600586],[53.53711,-103.513672],[53.532227,-103.426758],[53.527344,-103.339843],[53.522461,-103.252929],[53.517579,-103.166015],[53.512696,-103.079101],[53.507813,-102.992187],[53.480469,-102.956054],[53.453126,-102.919921],[53.398438,-102.847656],[53.343751,-102.77539],[53.316407,-102.739258],[53.289063,-102.703125],[53.254883,-102.671387],[53.220704,-102.639648],[53.152345,-102.576171],[53.015626,-102.449218],[52.742188,-102.195312],[52.425782,-101.894531],[52.109375,-101.59375],[51.734375,-101.460937],[51.359375,-101.328125],[50.90625,-101.210937],[50.78125,-101.079102],[50.515625,-100.328125],[50.290039,-100.039062],[49.796875,-99.570312],[49.796875,-98.976562],[49.851563,-98.367187],[49.4375,-97.828125],[49.617188,-97.585937],[50.191407,-97.425781],[50.765625,-97.265625],[51.320313,-97.3125],[51.6875,-97.523437],[51.921875,-97.859375],[52.0625,-98.351562],[52.265625,-98.828125],[52.3125,-99.15625],[52.296875,-99.875],[52.484375,-100.492187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[51.359863,-101.327637],[51.539063,-100.921875],[52.085938,-100.640625],[52.40625,-100.726562],[52.485352,-100.491699]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[49.797363,-98.976074],[49.312744,-98.48413],[48.828125,-97.992187],[48.449219,-97.343749],[48.070313,-96.695312],[47.789063,-96.234375],[47.875,-95.773437],[48.09375,-95.476562],[48.242188,-95.390625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[49.618164,-97.585937],[49.539063,-97.226562],[49.109375,-97.195312],[48.578125,-96.671875],[48.335938,-96],[48.554688,-95.71875],[48.609375,-95.4375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[49.539063,-97.226562],[49.546875,-97.023437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[53.554688,-104.15625],[53.618896,-104.1521],[53.683105,-104.147949],[53.747314,-104.143799],[53.811523,-104.139648],[53.875732,-104.135498],[53.939941,-104.131348],[54.00415,-104.127197],[54.068359,-104.123047],[54.158447,-104.120361],[54.248535,-104.117676],[54.338623,-104.11499],[54.428711,-104.112304],[54.518799,-104.109619],[54.608887,-104.106933],[54.698975,-104.104248],[54.744019,-104.102905],[54.789063,-104.101562],[54.809571,-104.07373],[54.830079,-104.045898],[54.871094,-103.990234],[54.91211,-103.93457],[54.932618,-103.906738],[54.953126,-103.878906],[54.994141,-103.823242],[55.035157,-103.767578],[55.117188,-103.65625],[55.507813,-103.703125],[55.855469,-103.828125],[56.029297,-103.890625],[56.116211,-103.921875],[56.159668,-103.9375],[56.203125,-103.953125],[56.236328,-103.962402],[56.269531,-103.97168],[56.335938,-103.990234],[56.46875,-104.027343],[56.734375,-104.101562],[57.042969,-104.160156],[57.197266,-104.189453],[57.274415,-104.204102],[57.312989,-104.211426],[57.351563,-104.21875],[57.399903,-104.234375],[57.448243,-104.25],[57.544922,-104.28125],[57.738282,-104.34375],[57.931641,-104.40625],[58.02832,-104.4375],[58.07666,-104.453125],[58.125,-104.46875],[58.152832,-104.476562],[58.180664,-104.484375],[58.236328,-104.5],[58.347657,-104.53125],[58.570313,-104.59375],[59.109375,-104.625],[59.609375,-104.585937],[60.0625,-104.5],[60.414063,-104.328125],[60.765625,-104.15625],[61.1875,-103.9375],[61.523438,-103.84375],[61.929688,-103.960937],[62.257813,-104.132812],[62.578125,-104.320312],[62.882813,-104.546875],[63.09375,-104.9375],[63.367188,-105.765625],[63.640625,-106.59375],[64.085938,-107.242187],[64.367188,-107.550781],[64.507813,-107.705078],[64.578126,-107.782227],[64.613282,-107.820801],[64.648438,-107.859375],[64.677979,-107.887451],[64.70752,-107.915527],[64.766602,-107.971679],[64.884766,-108.083984],[65.121094,-108.308593],[65.357422,-108.533202],[65.475586,-108.645507],[65.534668,-108.70166],[65.564209,-108.729736],[65.59375,-108.757812],[65.615234,-108.77539],[65.636719,-108.792968],[65.679688,-108.828124],[65.765625,-108.898437],[65.9375,-109.039062],[66.375,-109.257812],[67.023438,-109.25],[67.8125,-109.109375],[68.472657,-108.921875],[69.132813,-108.734375],[69.664063,-108.71875],[70.203125,-108.320312],[70.609375,-107.835937],[70.898438,-107.1875],[70.953125,-106.5],[71.054688,-105.898437],[71.03125,-105.320312],[71.09375,-105],[70.976563,-104.34375],[70.914063,-103.703125],[70.917969,-103.28125],[70.919922,-103.070312],[70.920898,-102.964844],[70.921387,-102.912109],[70.921875,-102.859375],[70.946289,-102.828613],[70.970703,-102.797852],[71.019531,-102.736328],[71.117188,-102.613281],[71.214844,-102.490234],[71.263672,-102.42871],[71.288086,-102.397949],[71.3125,-102.367187],[71.342285,-102.349609],[71.37207,-102.332031],[71.431641,-102.296874],[71.550782,-102.226562],[71.789063,-102.085937],[72.027344,-101.944336],[72.146485,-101.873535],[72.206055,-101.838135],[72.23584,-101.820435],[72.265625,-101.802734],[72.308106,-101.779053],[72.350586,-101.755371],[72.435547,-101.708008],[72.605469,-101.613281],[72.945313,-101.421875],[73.050782,-101.371093],[73.103516,-101.345703],[73.129883,-101.333007],[73.15625,-101.320312],[73.217773,-101.30664],[73.279297,-101.292968],[73.402344,-101.265624],[73.648438,-101.210937],[74.117188,-101.03125],[74.309571,-100.975586],[74.405762,-100.947754],[74.453857,-100.933838],[74.501953,-100.919922],[74.539551,-100.933105],[74.577148,-100.946289],[74.652344,-100.972656],[74.728516,-100.998047],[74.766602,-101.010742],[74.804688,-101.023437],[74.853516,-101.039062],[74.902344,-101.054687],[75,-101.085937],[75.234375,-101.3125],[75.507813,-101.5625],[75.8125,-101.851562],[76.125,-102.085937],[76.273438,-102.179687],[76.347656,-102.226562],[76.384766,-102.249999],[76.421875,-102.273437],[76.46582,-102.288085],[76.509766,-102.302734],[76.597657,-102.332031],[76.685547,-102.359375],[76.729492,-102.373047],[76.773438,-102.386719],[76.820313,-102.394043],[76.867188,-102.401367],[76.960938,-102.416015],[77.148438,-102.445312],[77.371094,-102.394531],[77.482422,-102.36914],[77.538086,-102.356445],[77.59375,-102.34375],[77.640137,-102.302246],[77.686523,-102.260742],[77.779297,-102.177734],[77.872071,-102.094726],[77.964844,-102.011718],[78.335938,-101.6875],[78.703125,-101.359375],[79.140625,-101.085937],[79.183594,-100.503906],[79.226563,-99.921875],[79.359375,-99.609375],[79.378907,-99.375],[79.388672,-99.257812],[79.393555,-99.199219],[79.398438,-99.138672],[79.405274,-99.083008],[79.41211,-99.02539],[79.425782,-98.910156],[79.439453,-98.794921],[79.453125,-98.679687],[79.498047,-98.529296],[79.542969,-98.378906],[79.587891,-98.228515],[79.632813,-98.078125],[79.773438,-97.8125],[79.945313,-97.5625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[58.125,-104.46875],[58.145508,-104.508789],[58.166016,-104.548828],[58.207031,-104.628906],[58.289063,-104.789062],[58.453125,-105.109375],[58.796875,-105.75],[58.976563,-106.382812],[59.226563,-107.070312],[59.507813,-107.648437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[59.227539,-107.070312],[59.71875,-107.53125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[54.789063,-104.100586],[54.794922,-104.131958],[54.800782,-104.16333],[54.812501,-104.226074],[54.824219,-104.288818],[54.830079,-104.32019],[54.835938,-104.351562],[54.832032,-104.392578],[54.828126,-104.433593],[54.824219,-104.474609],[54.820313,-104.515625],[54.813477,-104.548828],[54.806641,-104.582031],[54.792969,-104.648437],[54.765626,-104.78125],[54.710938,-105.046875],[54.21875,-105.640625],[54.180176,-106.0625],[54.160889,-106.273437],[54.151246,-106.378906],[54.146424,-106.431641],[54.141602,-106.484375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[54.835938,-104.350586],[54.879883,-104.380005],[54.923829,-104.409424],[55.011719,-104.468262],[55.1875,-104.585937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[54.820313,-104.515625],[54.775391,-104.515625],[54.730469,-104.515625],[54.640625,-104.515625],[54.398438,-104.609375],[53.710938,-104.609375],[53.664063,-104.662109],[53.617188,-104.714844],[53.570313,-104.767578],[53.523438,-104.820312],[53.476563,-104.873047],[53.429688,-104.925781],[53.382813,-104.978516],[53.335938,-105.03125],[53.317383,-105.087891],[53.298829,-105.144531],[53.280274,-105.201172],[53.261719,-105.257812],[53.243164,-105.314453],[53.22461,-105.371094],[53.206055,-105.427734],[53.1875,-105.484375],[53.205078,-105.594727],[53.222656,-105.705078],[53.240234,-105.815429],[53.257813,-105.925781],[53.275391,-106.036133],[53.292969,-106.146484],[53.310547,-106.256835],[53.328125,-106.367187],[53.476319,-106.456787],[53.550415,-106.501587],[53.587464,-106.523987],[53.624512,-106.546387]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[54.070313,-104.121094],[54.06836,-104.036133],[54.066407,-103.951172],[54.064453,-103.866211],[54.0625,-103.78125],[54.0625,-103.753906],[54.0625,-103.726562],[54.0625,-103.699219],[54.0625,-103.671875],[54.0625,-103.59375],[54.0625,-103.515625],[54.013672,-103.496094],[53.964844,-103.476562],[53.916016,-103.457031],[53.867188,-103.4375],[53.871094,-103.37793],[53.875001,-103.318359],[53.878907,-103.258789],[53.882813,-103.199218],[53.886719,-103.139648],[53.890626,-103.080078],[53.894532,-103.020507],[53.898438,-102.960937],[53.800782,-102.969238],[53.703126,-102.977539],[53.605469,-102.98584],[53.556641,-102.98999],[53.507813,-102.994141]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[54.064453,-103.78125],[54.109131,-103.78125],[54.153809,-103.78125],[54.220825,-103.78125],[54.287842,-103.78125],[54.354858,-103.78125],[54.421875,-103.78125],[54.46875,-103.746093],[54.515625,-103.710937],[54.621094,-103.710937],[54.726563,-103.710937],[54.782715,-103.752929],[54.838868,-103.794921],[54.89502,-103.836914],[54.923096,-103.85791],[54.953125,-103.878906]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[53.546875,-103.6875],[53.61145,-103.685425],[53.676026,-103.683349],[53.740601,-103.681274],[53.805176,-103.679199],[53.869751,-103.677124],[53.934327,-103.675048],[53.998902,-103.672973],[54.063477,-103.670898]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[53.289063,-102.705078],[53.298828,-102.647949],[53.308594,-102.59082],[53.328125,-102.476562],[53.273438,-102.03125],[53.210938,-101.765625],[53.167969,-101.289062],[53.125,-100.8125],[53.335938,-100.296875],[53.453125,-99.75],[53.539063,-99.117187],[53.53125,-98.4375],[53.882813,-98.304687],[54.078125,-98.109375],[54.257813,-97.71875],[54.585938,-97.429687],[55.007813,-97.414062],[55.375,-97.421875],[55.8125,-97.65625],[56.039063,-97.792968],[56.152344,-97.861328],[56.208984,-97.895507],[56.237305,-97.912597],[56.265625,-97.929687],[56.318359,-97.95996],[56.371094,-97.990234],[56.476563,-98.050781],[56.582031,-98.111328],[56.634766,-98.141602],[56.6875,-98.171875],[56.723633,-98.187012],[56.759766,-98.202148],[56.832031,-98.232422],[56.976563,-98.292968],[57.121094,-98.353515],[57.193359,-98.383789],[57.229492,-98.398925],[57.265625,-98.414062],[57.272461,-98.468749],[57.279297,-98.523437],[57.292969,-98.632812],[57.320313,-98.851562],[57.671875,-99.023437],[58.070313,-98.867187],[58.218751,-98.812255],[58.292969,-98.78479],[58.330079,-98.771057],[58.367188,-98.757324],[58.431641,-98.766174],[58.496094,-98.775024],[58.625001,-98.792724],[58.882813,-98.828125],[59.328125,-98.945312],[59.632813,-99.0625],[59.859375,-99.296875],[60.054688,-99.585937],[60.164063,-99.84375],[60.25,-100.0625],[60.617188,-100.117187],[61.101563,-100.132812],[61.375,-100.367187],[61.539063,-100.648437],[61.847657,-100.812499],[62.15625,-100.976562],[62.46875,-101.175781],[62.78125,-101.375],[63.15625,-101.601562],[63.53125,-101.828125],[63.642578,-101.841797],[63.753907,-101.855468],[63.865235,-101.86914],[63.920899,-101.875976],[63.976563,-101.882812],[64.028321,-101.889648],[64.080079,-101.896484],[64.183594,-101.910156],[64.390625,-101.9375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[57.265625,-98.414062],[57.299805,-98.402343],[57.333985,-98.390624],[57.402344,-98.367187],[57.470704,-98.343749],[57.504883,-98.332031],[57.539063,-98.320312],[57.664063,-98.308593],[57.726563,-98.302734],[57.789063,-98.296875],[57.855469,-98.277343],[57.921875,-98.257812],[57.994141,-98.269531],[58.066407,-98.281249],[58.138672,-98.292968],[58.210938,-98.304687],[58.269532,-98.320312],[58.328125,-98.335937],[58.347657,-98.546874],[58.357422,-98.652343],[58.362305,-98.705078],[58.367188,-98.757812],[58.347657,-98.80371],[58.328126,-98.849609],[58.289063,-98.941406],[58.210938,-99.125],[58.109375,-99.515625],[57.828125,-100.070312],[57.507813,-100.078125],[57.171875,-100.34375],[57.109375,-100.65625],[56.804688,-100.882812],[56.945313,-101.46875],[56.953125,-102.023437],[56.796875,-102.554687],[56.71875,-103.070312],[56.34375,-103.554687],[56.273438,-103.753906],[56.238281,-103.853515],[56.220703,-103.90332],[56.203125,-103.953125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[56.265625,-97.929687],[56.307617,-97.914062],[56.349609,-97.898437],[56.433594,-97.867187],[56.517578,-97.835937],[56.601563,-97.804687],[56.685547,-97.773437],[56.769531,-97.742187],[56.853516,-97.710937],[56.9375,-97.679687],[57.013672,-97.640624],[57.089844,-97.601562],[57.166016,-97.562499],[57.242188,-97.523437],[57.318359,-97.484374],[57.394531,-97.445312],[57.470703,-97.406249],[57.546875,-97.367187],[57.582886,-97.321899],[57.618896,-97.276611],[57.654907,-97.231323],[57.690918,-97.186035],[57.726929,-97.140747],[57.762939,-97.095459],[57.79895,-97.050171],[57.834961,-97.004883],[57.870972,-96.959595],[57.906982,-96.914306],[57.942993,-96.869018],[57.979004,-96.82373],[58.015015,-96.778442],[58.051025,-96.733154],[58.123047,-96.642578],[58.137451,-96.585693],[58.151856,-96.528808],[58.180664,-96.415039],[58.238282,-96.187499],[58.294923,-95.95703],[58.351563,-95.726562],[58.625001,-95.492187],[58.898438,-95.257812],[59.171876,-95.023437],[59.445313,-94.789062],[59.523438,-94.621093],[59.601563,-94.453125],[59.648438,-94.078125],[59.500001,-93.800781],[59.351563,-93.523437],[58.804688,-93.007812],[58.179688,-92.390625],[57.6875,-92.234375],[57.34375,-92.59375],[57.5,-93.289062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[58.125,-96.640625],[58.123047,-96.692871],[58.121094,-96.745117],[58.117188,-96.849609],[58.113281,-96.954101],[58.109375,-97.058593],[58.105469,-97.163086],[58.101563,-97.267578],[58.097656,-97.37207],[58.09375,-97.476562],[58.101196,-97.528198],[58.108643,-97.579833],[58.123535,-97.683105],[58.153321,-97.889648],[58.183106,-98.096191],[58.197998,-98.199463],[58.205445,-98.251098],[58.212891,-98.302734]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[57.919922,-98.257812],[57.93103,-98.208984],[57.942139,-98.160156],[57.964355,-98.0625],[58.008789,-97.867187],[58.053222,-97.671875],[58.075439,-97.574218],[58.086548,-97.52539],[58.097656,-97.476562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[57.539063,-98.320312],[57.572144,-98.218872],[57.605225,-98.117432],[57.642212,-98.012085],[57.679199,-97.906738],[57.716187,-97.801392],[57.753174,-97.696045],[57.790161,-97.590698],[57.827149,-97.485352],[57.864136,-97.380005],[57.901123,-97.274658],[57.93811,-97.169311],[57.975098,-97.063965],[58.011963,-96.95874],[58.048828,-96.853516],[58.085938,-96.748047],[58.104492,-96.695312],[58.123047,-96.642578]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[56.687988,-98.171387],[56.734832,-98.144074],[56.781677,-98.11676],[56.875366,-98.062134],[56.969055,-98.007507],[57.062744,-97.952881],[57.156433,-97.898254],[57.250122,-97.843628],[57.343811,-97.789001],[57.4375,-97.734375],[57.480225,-97.666016],[57.522949,-97.597656],[57.565674,-97.529297],[57.608399,-97.460937],[57.651123,-97.392578],[57.693848,-97.324219],[57.736572,-97.255859],[57.779297,-97.1875],[57.822022,-97.119141],[57.864746,-97.050781],[57.907471,-96.982422],[57.950196,-96.914062],[57.99292,-96.845703],[58.035645,-96.777344],[58.078369,-96.708984],[58.121094,-96.640625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[63.976563,-101.882812],[64.027344,-101.836914],[64.078125,-101.791016],[64.179688,-101.699219],[64.28125,-101.607422],[64.382813,-101.515625],[64.492188,-101.441406],[64.601563,-101.367187],[64.710938,-101.292969],[64.820313,-101.21875],[64.949219,-101.152344],[65.078126,-101.085937],[65.207032,-101.019531],[65.335938,-100.953125],[65.394532,-100.873047],[65.453126,-100.792969],[65.511719,-100.712891],[65.570313,-100.632812],[65.628907,-100.552734],[65.687501,-100.472656],[65.746094,-100.392578],[65.804688,-100.3125],[65.748047,-100.210937],[65.691407,-100.109375],[65.634766,-100.007812],[65.578125,-99.90625],[65.447266,-99.888672],[65.316407,-99.871093],[65.185547,-99.853515],[65.120118,-99.844726],[65.087403,-99.840332],[65.054688,-99.835937],[65.021485,-99.823242],[64.988282,-99.810546],[64.921876,-99.785156],[64.789063,-99.734374],[64.656251,-99.683593],[64.589844,-99.658203],[64.523438,-99.632812],[64.53711,-99.554687],[64.550782,-99.476562],[64.564453,-99.398437],[64.578125,-99.320312],[64.673828,-99.258789],[64.769531,-99.197266],[65.041016,-99.027344],[65.129639,-98.970215],[65.218262,-98.913086],[65.306885,-98.855957],[65.395508,-98.798828],[65.484131,-98.741699],[65.572754,-98.68457],[65.661377,-98.627441],[65.75,-98.570312],[65.716797,-98.460937],[65.683594,-98.351562],[65.650391,-98.242187],[65.617188,-98.132812],[65.554688,-98.10205],[65.492188,-98.071289],[65.429688,-98.040527],[65.367188,-98.009765],[65.304688,-97.979004],[65.242188,-97.948242],[65.179688,-97.91748],[65.117188,-97.886718],[65.054688,-97.855957],[64.992188,-97.825195],[64.929688,-97.794433],[64.867188,-97.763672],[64.804688,-97.73291],[64.742188,-97.702148],[64.679688,-97.671387],[64.617188,-97.640625],[64.649415,-97.691406],[64.681641,-97.742187],[64.746094,-97.84375],[64.778321,-97.894531],[64.810547,-97.945312],[64.842773,-97.996094],[64.875,-98.046875],[64.9375,-98.067383],[65,-98.08789],[65.0625,-98.108398],[65.125,-98.128906],[65.1875,-98.149414],[65.25,-98.169921],[65.3125,-98.190429],[65.375,-98.210937],[65.359375,-98.266601],[65.34375,-98.322265],[65.328125,-98.377929],[65.3125,-98.433593],[65.296875,-98.489258],[65.28125,-98.544922],[65.265625,-98.600586],[65.25,-98.65625],[65.196289,-98.670898],[65.142578,-98.685547],[65.088867,-98.700195],[65.035157,-98.714843],[64.981446,-98.729492],[64.927735,-98.74414],[64.874024,-98.758789],[64.820313,-98.773437],[64.773438,-98.791992],[64.726563,-98.810546],[64.632813,-98.847656],[64.539063,-98.884765],[64.445313,-98.921875],[64.384766,-99.015625],[64.324219,-99.109375],[64.263672,-99.203125],[64.203125,-99.296875],[64.1875,-99.384765],[64.171875,-99.472656],[64.15625,-99.560546],[64.140625,-99.648437],[64.195313,-99.730468],[64.25,-99.812499],[64.304688,-99.894531],[64.359375,-99.976562],[64.463867,-99.989746],[64.568359,-100.002929],[64.672852,-100.016113],[64.777344,-100.029297]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[64.820313,-98.773437],[64.833008,-98.827148],[64.845703,-98.880859],[64.871094,-98.988281],[64.939453,-99.248047],[64.958496,-99.328613],[64.977539,-99.409179],[64.996582,-99.489746],[65.015625,-99.570312],[65.106445,-99.581054],[65.197266,-99.591796],[65.288086,-99.602539],[65.378907,-99.613281],[65.469727,-99.624023],[65.560547,-99.634765],[65.651368,-99.645508],[65.742188,-99.65625],[65.820313,-99.753906],[65.898438,-99.851562],[65.976563,-99.949219],[66.054688,-100.046875],[66.059571,-100.115234],[66.064454,-100.183594],[66.069336,-100.251953],[66.074219,-100.320312],[66.079102,-100.388672],[66.083985,-100.457031],[66.088867,-100.525391],[66.09375,-100.59375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[64.390625,-101.9375],[64.542969,-101.945801],[64.695313,-101.954102],[64.847656,-101.962402],[64.923828,-101.966553],[64.961914,-101.968628],[65,-101.970703],[65.043945,-101.967529],[65.087891,-101.964355],[65.175782,-101.958008],[65.263672,-101.95166],[65.351563,-101.945312],[65.462891,-101.871093],[65.574219,-101.796874],[65.685547,-101.722656],[65.796876,-101.648437],[65.908204,-101.574218],[66.019532,-101.499999],[66.13086,-101.425781],[66.242188,-101.351562],[66.332032,-101.393554],[66.421876,-101.435546],[66.511719,-101.477539],[66.601563,-101.519531],[66.691407,-101.561523],[66.781251,-101.603515],[66.871094,-101.645508],[66.960938,-101.6875],[66.990235,-101.786133],[67.019532,-101.884765],[67.048829,-101.983398],[67.078126,-102.082031],[67.107422,-102.180664],[67.136719,-102.279296],[67.166016,-102.377929],[67.195313,-102.476562],[67.250977,-102.502929],[67.306641,-102.529296],[67.362305,-102.555664],[67.417969,-102.582031],[67.473633,-102.608398],[67.529297,-102.634765],[67.640625,-102.6875],[67.670898,-102.631836],[67.701172,-102.576172],[67.731446,-102.520508],[67.761719,-102.464843],[67.791992,-102.409179],[67.822266,-102.353515],[67.85254,-102.297851],[67.882813,-102.242187],[67.842774,-102.180664],[67.802735,-102.11914],[67.762696,-102.057617],[67.722657,-101.996093],[67.682617,-101.93457],[67.642578,-101.873047],[67.602539,-101.811523],[67.5625,-101.75],[67.578125,-101.680664],[67.59375,-101.611328],[67.609375,-101.541992],[67.625,-101.472656],[67.640625,-101.40332],[67.65625,-101.333984],[67.671875,-101.264648],[67.6875,-101.195312],[67.701172,-101.108398],[67.714844,-101.021484],[67.728516,-100.943359],[67.759766,-100.806641],[67.771484,-100.734375],[67.785645,-100.652344],[67.799805,-100.570312],[67.813965,-100.488281],[67.828125,-100.40625],[67.893555,-100.405273],[67.958985,-100.404297],[68.024414,-100.40332],[68.089844,-100.402343],[68.155274,-100.401367],[68.220704,-100.40039],[68.286133,-100.399414],[68.351563,-100.398437],[68.435547,-100.461914],[68.519532,-100.52539],[68.603516,-100.588867],[68.687501,-100.652343],[68.771485,-100.71582],[68.855469,-100.779297],[68.939454,-100.842773],[68.981446,-100.874512],[69.023438,-100.90625],[69.089844,-100.910156],[69.156251,-100.914062],[69.222657,-100.917969],[69.289063,-100.921875],[69.355469,-100.925781],[69.421876,-100.929687],[69.488282,-100.933594],[69.554688,-100.9375],[69.577149,-100.87793],[69.59961,-100.818359],[69.622071,-100.758789],[69.644532,-100.699218],[69.666992,-100.639648],[69.689453,-100.580078],[69.711914,-100.520507],[69.734375,-100.460937],[69.711914,-100.396484],[69.689453,-100.332031],[69.666992,-100.267578],[69.644532,-100.203124],[69.622071,-100.138671],[69.59961,-100.074218],[69.577149,-100.009765],[69.554688,-99.945312],[69.501465,-99.881835],[69.448242,-99.818359],[69.39502,-99.754883],[69.368408,-99.723144],[69.341797,-99.691406]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[65,-101.96875],[65.02832,-101.993164],[65.056641,-102.017578],[65.113282,-102.066406],[65.226563,-102.164062],[65.311524,-102.130859],[65.396484,-102.097656],[65.481445,-102.064453],[65.566407,-102.031249],[65.651367,-101.998046],[65.736328,-101.964843],[65.821289,-101.93164],[65.90625,-101.898437],[65.958985,-101.839843],[66.011719,-101.781249],[66.064454,-101.722656],[66.117188,-101.664062],[66.169922,-101.668945],[66.222657,-101.673828],[66.275391,-101.678711],[66.328126,-101.683593],[66.38086,-101.688476],[66.433594,-101.693359],[66.486329,-101.698242],[66.539063,-101.703125],[66.581055,-101.748047],[66.623047,-101.792969],[66.665039,-101.837891],[66.707032,-101.882812],[66.749024,-101.927734],[66.791016,-101.972656],[66.833008,-102.017578],[66.875,-102.0625],[66.873047,-102.119141],[66.871094,-102.175781],[66.869141,-102.232422],[66.867188,-102.289062],[66.865234,-102.345703],[66.863281,-102.402344],[66.861328,-102.458984],[66.859375,-102.515625],[66.885742,-102.552734],[66.91211,-102.589844],[66.938477,-102.626953],[66.964844,-102.664062],[66.991211,-102.701172],[67.017579,-102.738281],[67.043946,-102.775391],[67.070313,-102.8125],[67.119141,-102.826172],[67.167969,-102.839844],[67.216797,-102.853516],[67.265626,-102.867187],[67.314454,-102.880859],[67.363282,-102.894531],[67.41211,-102.908203],[67.460938,-102.921875],[67.538086,-102.901367],[67.615235,-102.880859],[67.692383,-102.860351],[67.769532,-102.839843],[67.84668,-102.819336],[67.923828,-102.798828],[68.000977,-102.77832],[68.078125,-102.757812],[68.078125,-102.674804],[68.078125,-102.591796],[68.078125,-102.508789],[68.078125,-102.425781],[68.078125,-102.342773],[68.078125,-102.259765],[68.078125,-102.176758],[68.078125,-102.09375],[68.039063,-102.041016],[68,-101.988281],[67.960938,-101.935547],[67.921875,-101.882812],[67.882813,-101.830078],[67.84375,-101.777344],[67.804688,-101.724609],[67.765625,-101.671875],[67.771485,-101.605469],[67.777344,-101.539062],[67.783204,-101.472656],[67.789063,-101.40625],[67.820313,-101.357422],[67.851563,-101.308594],[67.882813,-101.259766],[67.914063,-101.210937],[67.976563,-101.113281],[68.007813,-101.064453],[68.039063,-101.015625],[68.105469,-100.984375],[68.171875,-100.953125],[68.238282,-100.921875],[68.304688,-100.890625],[68.394532,-100.892517],[68.484376,-100.894409],[68.574219,-100.896301],[68.664063,-100.898193],[68.753907,-100.900086],[68.843751,-100.901978],[68.933594,-100.90387],[68.978516,-100.904816],[69.023438,-100.905762]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[67.070313,-102.8125],[67.017579,-102.8125],[66.964844,-102.8125],[66.91211,-102.8125],[66.859375,-102.8125],[66.841797,-102.773437],[66.824219,-102.734375],[66.797852,-102.675781],[66.771484,-102.617187],[66.745117,-102.558594],[66.71875,-102.5],[66.723633,-102.454102],[66.728516,-102.408203],[66.733399,-102.362304],[66.738282,-102.316406],[66.743164,-102.270508],[66.748047,-102.224609],[66.75293,-102.17871],[66.757813,-102.132812],[66.722779,-102.09729],[66.687745,-102.061767],[66.661469,-102.035125],[66.635193,-102.008484],[66.608917,-101.981842],[66.582642,-101.9552],[66.556366,-101.928558],[66.53009,-101.901917],[66.503815,-101.875275],[66.477539,-101.848633],[66.46582,-101.878906],[66.454102,-101.90918],[66.442383,-101.939453],[66.430664,-101.969727],[66.418945,-102],[66.407227,-102.030273],[66.395508,-102.060547],[66.383789,-102.09082]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[68.039063,-101.015625],[67.948242,-100.969727],[67.857422,-100.923828],[67.794922,-100.892578],[67.693359,-100.845703],[67.650391,-100.820312],[67.573242,-100.778809],[67.525879,-100.754639],[67.478516,-100.730469],[67.487671,-100.686768],[67.496827,-100.643067],[67.515137,-100.555664],[67.533448,-100.468262],[67.551758,-100.380859],[67.588379,-100.206055],[67.60669,-100.118652],[67.625,-100.03125],[67.717773,-100.009766],[67.810547,-99.988281],[67.903321,-99.966797],[67.996094,-99.945312],[68.088867,-99.923828],[68.181641,-99.902344],[68.274415,-99.880859],[68.367188,-99.859375],[68.433594,-99.842773],[68.500001,-99.826172],[68.566407,-99.80957],[68.632813,-99.792968],[68.699219,-99.776367],[68.765626,-99.759765],[68.832032,-99.743164],[68.898438,-99.726562],[69.009766,-99.717285],[69.121094,-99.708008],[69.232422,-99.69873],[69.288086,-99.694092],[69.34375,-99.689453]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[67.476563,-100.730469],[67.447266,-100.703613],[67.417969,-100.676758],[67.359376,-100.623047],[67.242188,-100.515625],[67.132813,-100.486328],[67.023438,-100.457031],[66.914063,-100.427734],[66.804688,-100.398437],[66.780274,-100.321289],[66.75586,-100.24414],[66.731446,-100.166992],[66.707032,-100.089843],[66.682617,-100.012695],[66.658203,-99.935547],[66.633789,-99.858398],[66.609375,-99.78125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[67.478516,-100.730469],[67.45874,-100.776855],[67.438965,-100.823242],[67.399414,-100.916015],[67.359864,-101.008789],[67.320313,-101.101562],[67.201172,-101.11914],[67.082032,-101.136718],[66.962891,-101.154297],[66.84375,-101.171875],[66.768555,-101.155273],[66.69336,-101.138672],[66.618164,-101.12207],[66.542969,-101.105468],[66.467774,-101.088867],[66.392579,-101.072265],[66.317383,-101.055664],[66.242188,-101.039062],[66.142579,-101.099609],[66.042969,-101.160156],[65.94336,-101.220703],[65.843751,-101.281249],[65.744141,-101.341796],[65.644532,-101.402343],[65.544922,-101.46289],[65.445313,-101.523437],[65.389893,-101.579345],[65.334473,-101.635254],[65.279053,-101.691162],[65.223633,-101.74707],[65.168213,-101.802978],[65.112793,-101.858887],[65.057373,-101.914795],[65.001953,-101.970703]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[67.625,-100.03125],[67.580567,-99.917969],[67.538086,-99.804687],[67.495606,-99.691406],[67.453125,-99.578125],[67.513672,-99.482422],[67.574219,-99.386718],[67.634766,-99.291015],[67.695313,-99.195312],[67.832032,-99.207031],[67.96875,-99.21875],[68.351563,-99.09375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[67.827637,-100.40625],[67.746826,-100.371094],[67.666016,-100.335937],[67.460693,-100.242187],[67.368958,-100.201172],[67.277222,-100.160156],[67.185486,-100.119141],[67.09375,-100.078125],[67.102539,-99.963867],[67.111328,-99.849609],[67.120117,-99.735351],[67.128907,-99.621093],[67.137696,-99.506836],[67.146485,-99.392578],[67.155274,-99.27832],[67.164063,-99.164062],[67.232422,-99.114257],[67.300782,-99.064453],[67.369141,-99.014648],[67.437501,-98.964843],[67.50586,-98.915039],[67.574219,-98.865234],[67.642579,-98.81543],[67.710938,-98.765625],[67.700196,-98.665039],[67.689454,-98.564453],[67.678711,-98.463867],[67.667969,-98.363281],[67.646485,-98.162109],[67.625,-97.960937],[67.75,-97.800781],[67.875,-97.640624],[68,-97.480468],[68.125,-97.320312],[68.052735,-97.142578],[67.980469,-96.964843],[67.908204,-96.787109],[67.835938,-96.609375],[68.101563,-96.359375],[68.398438,-96.332031],[68.695313,-96.304687],[68.853516,-96.277343],[69.011719,-96.25],[69.169922,-96.222656],[69.328125,-96.195312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[69.34375,-99.689453],[69.389648,-99.700928],[69.435547,-99.712402],[69.527344,-99.735352],[69.619141,-99.758301],[69.710938,-99.78125],[69.737305,-99.856445],[69.763672,-99.931641],[69.790039,-100.006836],[69.816407,-100.082031],[69.842774,-100.157226],[69.869141,-100.232421],[69.895508,-100.307617],[69.921875,-100.382812],[69.923828,-100.458984],[69.925781,-100.535156],[69.927734,-100.611328],[69.929688,-100.687499],[69.931641,-100.763671],[69.933594,-100.839843],[69.935547,-100.916015],[69.9375,-100.992187],[70.024414,-101.05664],[70.111328,-101.121093],[70.198242,-101.185546],[70.285157,-101.249999],[70.372071,-101.314453],[70.458985,-101.378906],[70.632813,-101.507812],[70.812501,-101.707031],[70.992188,-101.90625],[71.152344,-102.136719],[71.232422,-102.251953],[71.272461,-102.30957],[71.292481,-102.338379],[71.3125,-102.367187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[69.328125,-96.195312],[69.5625,-96.152343],[69.796875,-96.109375],[70.042969,-96.191406],[70.289063,-96.273437],[70.765625,-96.46875],[71.007813,-96.710937],[71.25,-96.953125],[71.601563,-97.226562],[71.757813,-97.507812],[71.976563,-97.796875],[72.359375,-97.90625],[72.742188,-98.273437],[72.923829,-98.319335],[73.014649,-98.342285],[73.060059,-98.353759],[73.105469,-98.365234]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[65.59375,-108.757812],[65.626953,-108.707031],[65.660157,-108.65625],[65.726563,-108.554687],[65.835938,-108.359375],[65.523438,-108.039062],[65.414063,-107.796875],[65.164063,-107.25],[65.070313,-106.773437],[64.476563,-106.296875],[64.0625,-105.796875],[63.9375,-105.398437],[63.875,-105.199219],[63.84375,-105.099609],[63.828125,-105.049805],[63.8125,-105],[63.78418,-104.943359],[63.75586,-104.886719],[63.699219,-104.773437],[63.585938,-104.546875],[63.664063,-103.960937],[64.0625,-103.59375],[64.515625,-103.507812],[64.804688,-103.5],[65.300781,-103.371093],[65.796875,-103.242187],[66.171875,-103.328125],[66.554688,-103.515625],[66.921875,-103.65625],[67.585938,-103.429687],[68.289063,-103.234375],[68.921875,-103.171875],[69.5,-103.132812],[69.867188,-102.992187],[70.304688,-103.007812],[70.613282,-102.933349],[70.767578,-102.896118],[70.844727,-102.877503],[70.883301,-102.868195],[70.921875,-102.858887]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[63.8125,-105],[63.868164,-104.949219],[63.923828,-104.898437],[64.035157,-104.796875],[64.257813,-104.59375],[64.90625,-104.398437],[65.476563,-104.601562],[65.78125,-105.25],[65.796875,-105.515625],[66.171875,-105.773437],[66.5625,-105.773437],[66.660157,-105.886718],[66.708985,-105.943359],[66.733399,-105.97168],[66.757813,-106],[66.794922,-106.022461],[66.832032,-106.044922],[66.906251,-106.089843],[67.054688,-106.179687],[67.25,-106.414062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[66.757813,-105.999023],[66.765626,-106.032348],[66.773438,-106.065673],[66.789063,-106.132324],[66.820313,-106.265625],[66.921875,-106.523437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[64.647949,-107.858887],[64.663635,-107.808167],[64.679321,-107.757446],[64.710693,-107.656006],[64.773438,-107.453125],[64.484375,-106.96875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[63.414063,-112.804687],[63.461914,-112.847656],[63.509766,-112.890625],[63.605469,-112.976562],[63.796875,-113.148437],[64.171875,-113.3125],[64.71875,-113.09375],[65.171875,-112.710937],[65.367188,-112.273437],[65.625,-111.84375],[65.90625,-111.632812],[66.125,-111.53125],[66.390625,-111.71875],[66.507813,-112.046875],[66.664063,-112.296875],[67.09375,-112.453125],[67.546875,-112.507812],[67.765625,-112.382812],[67.960938,-112.203125],[68.328125,-111.875],[69.617188,-111.8125],[70.28125,-112.03125],[70.992188,-112.09375],[71.257813,-111.992187],[71.484375,-111.789062],[71.710938,-111.765625],[71.921875,-111.835937],[72.273438,-112.226562],[72.78125,-112.265625],[73.0625,-112.117187],[73.382813,-111.210937],[73.75,-111.023437],[74.0625,-110.742187],[74.539063,-110.25],[75.132813,-110.125],[75.421875,-109.992187],[75.664063,-109.710937],[75.75,-109.421875],[75.859375,-108.679687],[76.015625,-108.53125],[76.28125,-108.484375],[76.585938,-108.4375],[76.851563,-108.601562],[77.132813,-108.695312],[77.515625,-108.65625],[77.863282,-108.414062],[78.228516,-108.273437],[78.411133,-108.203124],[78.502441,-108.167968],[78.548096,-108.15039],[78.59375,-108.132812],[78.644531,-108.117675],[78.695313,-108.102539],[78.796875,-108.072265],[79,-108.011718],[79.40625,-107.890625],[79.664063,-107.90625],[79.882813,-107.9375],[79.828125,-108.109375],[79.75,-108.265625],[79.421875,-108.375],[79.09375,-108.546875],[79.03125,-109.015625],[79.109375,-109.523437],[79.304688,-109.710937],[79.742188,-109.882812],[79.918458,-110.015624],[80.006592,-110.082031],[80.05066,-110.115234],[80.094727,-110.148437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[78.59375,-108.132812],[78.583008,-108.069336],[78.572266,-108.005859],[78.550782,-107.878906],[78.507813,-107.625],[78.234375,-107.476562],[77.976563,-107.367187],[77.6875,-107.164062],[77.699219,-106.902344],[77.710938,-106.640625],[77.628906,-106.460937],[77.414063,-106.251953],[77.328126,-106.149414],[77.285157,-106.098144],[77.242188,-106.046875],[77.223633,-105.989258],[77.205079,-105.93164],[77.167969,-105.816406],[77.09375,-105.585937],[76.835938,-105.417968],[76.578125,-105.25],[76.375,-105.050781],[76.273438,-104.951171],[76.222656,-104.901367],[76.171875,-104.851562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[72.265625,-101.802734],[72.256836,-101.837036],[72.248047,-101.871338],[72.230469,-101.939941],[72.195313,-102.077148],[72.125,-102.351562],[72.238282,-102.648437],[72.294922,-102.796874],[72.323243,-102.871093],[72.337403,-102.908203],[72.351563,-102.945312],[72.374024,-102.98291],[72.396485,-103.020507],[72.441407,-103.095703],[72.531251,-103.246093],[72.710938,-103.546875],[72.890625,-103.851562],[73.15625,-104.109375],[73.585938,-104.5],[74.0625,-104.898437],[74.460938,-105.085937],[74.859375,-105.28125],[75.078125,-105.276367],[75.1875,-105.273925],[75.242188,-105.272705],[75.296875,-105.271484],[75.351502,-105.245239],[75.406128,-105.218994],[75.515381,-105.166503],[75.733887,-105.061523],[75.952881,-104.956543],[76.062378,-104.904053],[76.117127,-104.877808],[76.171875,-104.851562],[76.208008,-104.833008],[76.244141,-104.814453],[76.316407,-104.777344],[76.460938,-104.703125],[76.804688,-104.65625],[77.203125,-104.695312],[77.53125,-104.765625],[77.914063,-105.015625],[78.296875,-105.265625],[78.632813,-105.46875],[78.800781,-105.570312],[78.884766,-105.621094],[78.926758,-105.646484],[78.96875,-105.671875],[79.007813,-105.6875],[79.046875,-105.703125],[79.125,-105.734375],[79.28125,-105.796875],[79.59375,-105.921875],[79.8125,-106.304687],[80.070313,-106.601562],[80.421875,-106.5],[80.703125,-106.484375],[80.890625,-106.9375],[81.367188,-106.9375],[81.695313,-106.742187],[81.578125,-106.296875],[81.953125,-105.859375],[82.546875,-105.773437],[83.117188,-105.421875],[83.445313,-105.3125],[83.609376,-105.257812],[83.691407,-105.230469],[83.732422,-105.216797],[83.773438,-105.203125],[83.785157,-105.136719],[83.796876,-105.070312],[83.820313,-104.9375],[83.757813,-104.625],[83.5625,-104.296875],[83.289063,-103.96875],[82.910157,-103.789062],[82.53125,-103.609375],[82.265625,-103.261718],[82.132813,-103.08789],[82.066406,-103.000976],[82.033203,-102.957519],[82,-102.914062],[81.973145,-102.887207],[81.946289,-102.860351],[81.892578,-102.80664],[81.785156,-102.699218],[81.570313,-102.484375],[81.304688,-102.296875],[80.851563,-102.039062],[80.429688,-101.710937],[80.070313,-101.445312],[80.203125,-101.070312],[79.875,-100.492187],[79.851563,-99.914062],[79.625001,-99.526367],[79.511719,-99.332519],[79.455079,-99.235596],[79.426758,-99.187134],[79.398438,-99.138672],[79.378907,-99.081299],[79.359376,-99.023926],[79.320313,-98.909179],[79.281251,-98.794433],[79.242188,-98.679687],[79.216797,-98.537109],[79.191407,-98.394531],[79.166016,-98.251953],[79.140625,-98.109375],[78.921875,-97.757812],[78.640625,-97.453125],[78.445313,-97.421875],[78.296875,-97.546875],[78.171875,-97.359375],[77.976563,-97.328125],[77.75,-97.351562],[77.46875,-97.578125],[77.25,-97.8125],[77.054688,-97.851562],[76.921875,-97.765625],[76.882813,-97.257812],[76.765625,-97.132812],[76.578125,-97.117187],[76.28125,-97.203125],[75.898438,-97.179687],[75.632813,-97.09375],[75.398438,-97.046875],[75.203125,-97.046875],[74.976563,-97.179687],[74.769531,-97.378906],[74.5625,-97.578125],[74.09375,-97.742187],[73.78125,-97.929687],[73.453125,-98.15625],[73.279297,-98.260742],[73.192383,-98.312988],[73.148926,-98.339111],[73.105469,-98.365234],[73.088379,-98.401611],[73.071289,-98.437988],[73.037109,-98.510742],[72.96875,-98.65625],[72.90625,-98.875],[72.875,-99.203125],[72.78125,-99.515625],[72.671875,-99.875],[72.5625,-100.234375],[72.5625,-100.539062],[72.609375,-100.84375],[72.859375,-101.117187],[73.007813,-101.21875],[73.082031,-101.269531],[73.119141,-101.294922],[73.15625,-101.320312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[70.921875,-102.859375],[70.975586,-102.853516],[71.029297,-102.847656],[71.136719,-102.835937],[71.351563,-102.8125],[71.828125,-102.671875],[72.089844,-102.809082],[72.220704,-102.877685],[72.286133,-102.911987],[72.318848,-102.929138],[72.351563,-102.946289],[72.382813,-102.972107],[72.414063,-102.997925],[72.476563,-103.04956],[72.601563,-103.152832],[72.851563,-103.359375],[73.351563,-103.53125],[73.734376,-103.414062],[74.117188,-103.296875],[74.617188,-103.359375],[74.851563,-103.429687],[75.132813,-103.453125],[75.476563,-103.320312],[75.742188,-103.117187],[76.000001,-103.085937],[76.128907,-103.070312],[76.19336,-103.062499],[76.225586,-103.058593],[76.257813,-103.054687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[76.773438,-102.386719],[76.747071,-102.433106],[76.720704,-102.479492],[76.667969,-102.572265],[76.5625,-102.757812],[76.410644,-102.905762],[76.334717,-102.979736],[76.296753,-103.016724],[76.258789,-103.053711],[76.234253,-103.097778],[76.209717,-103.141846],[76.160644,-103.229981],[76.0625,-103.40625],[75.835938,-103.914062],[75.65625,-104.429687],[75.554688,-104.835937],[75.445313,-105.070312],[75.372071,-105.170898],[75.335449,-105.221191],[75.298828,-105.271484]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[75.298828,-105.271484],[75.308106,-105.314941],[75.317383,-105.358398],[75.335938,-105.445312],[75.65625,-105.695312],[75.929688,-105.992187],[76.1875,-106.585937],[76.335938,-106.664062],[76.410156,-106.703124],[76.447266,-106.722656],[76.484375,-106.742187],[76.530273,-106.754882],[76.576172,-106.767578],[76.667969,-106.792968],[76.851563,-106.84375],[77.373047,-106.486328],[77.667969,-106.230469],[78.164063,-105.882812],[78.617188,-105.8125],[78.792969,-105.742187],[78.88086,-105.707031],[78.924805,-105.689453],[78.96875,-105.671875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[76.484375,-106.742187],[76.527588,-106.694336],[76.570801,-106.646484],[76.657227,-106.550781],[76.828125,-106.359375],[77.035157,-106.203125],[77.138673,-106.125],[77.19043,-106.085937],[77.242188,-106.046875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[77.59375,-102.34375],[77.646973,-102.338867],[77.700196,-102.333984],[77.806641,-102.324218],[77.913086,-102.314453],[78.019532,-102.304687],[78.445313,-102.257812],[78.71875,-102.408203],[78.992188,-102.558593],[79.265625,-102.708984],[79.539063,-102.859375],[79.890625,-102.929687],[80.242188,-103.054687],[80.393555,-103.011718],[80.469238,-102.990234],[80.50708,-102.979492],[80.544922,-102.96875],[80.581299,-102.929687],[80.617676,-102.890625],[80.69043,-102.8125],[80.835938,-102.65625],[80.96875,-102.367187],[81.203125,-101.960937],[81.4375,-101.640625],[81.640625,-101.5625],[81.750977,-101.546875],[81.806152,-101.539062],[81.861328,-101.53125],[81.935059,-101.556641],[82.008789,-101.582031],[82.15625,-101.632812],[82.289063,-101.921875],[82.484375,-102.085937],[82.9375,-102.171875],[83.351563,-102.015625],[83.695313,-101.96875],[84.078125,-101.726562],[84.507813,-101.523437],[84.828126,-101.515624],[84.988282,-101.511718],[85.06836,-101.509765],[85.148438,-101.507812],[85.214844,-101.52539],[85.28125,-101.542968],[85.414063,-101.578125],[85.546875,-101.613281],[85.679688,-101.648437],[85.921875,-101.890625],[86.226563,-102.125],[86.5,-102.148437],[86.789063,-102.0625],[86.960938,-101.871093],[87.046876,-101.77539],[87.089844,-101.727539],[87.132813,-101.679687],[87.138672,-101.626953],[87.144532,-101.574218],[87.15625,-101.46875],[87.179688,-101.257812],[87.125,-100.820312],[87.148438,-100.421875],[87.5,-100.15625],[87.929688,-100.046875],[88.152344,-100.003906],[88.263672,-99.982421],[88.319336,-99.971679],[88.375,-99.960937],[88.424805,-99.936523],[88.474609,-99.912109],[88.574219,-99.863281],[88.773438,-99.765625],[89.125,-99.523437],[89.207031,-99.195312],[89.289063,-98.867187],[89.390625,-98.5625],[89.492188,-98.257812],[89.628907,-98.132812],[89.697266,-98.070312],[89.765625,-98.007812],[89.902344,-97.882812],[90.070313,-97.78125],[90.203125,-97.648437],[90.257813,-97.46875],[90.203125,-97.3125],[90.148438,-97.15625],[90.107422,-97.072265],[90.066406,-96.988281],[90.025391,-96.904296],[89.984375,-96.820312],[89.990234,-96.734375],[89.980469,-96.644531],[89.976563,-96.468749],[89.96875,-96.117187],[90.066407,-95.753906],[90.164063,-95.390625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[81.861328,-101.53125],[81.90625,-101.47168],[81.953125,-101.412109],[82.046875,-101.292968],[82.234375,-101.054687],[82.476563,-100.9375],[82.65625,-100.726562],[82.859375,-100.296875],[83.070313,-100.105469],[83.28125,-99.914062],[83.492188,-99.722656],[83.703125,-99.53125],[84.023438,-99.539062],[84.3125,-99.601562],[84.578125,-99.90625],[84.84375,-99.890625],[84.882813,-99.511718],[84.921875,-99.132812],[85.132813,-99.023437],[85.515626,-99.109374],[85.707032,-99.152343],[85.802735,-99.173828],[85.850586,-99.18457],[85.898438,-99.195312],[85.945801,-99.188476],[85.993165,-99.18164],[86.087891,-99.167968],[86.277344,-99.140624],[86.65625,-99.085937],[87.039063,-99.125],[87.437501,-99.398437],[87.835938,-99.671875],[88.105469,-99.816406],[88.240235,-99.888672],[88.307617,-99.924805],[88.341309,-99.942871],[88.375,-99.960937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[80.544922,-102.96875],[80.596192,-102.976562],[80.647461,-102.984375],[80.75,-103],[81.203125,-102.890625],[81.554688,-102.828125],[81.777344,-102.871094],[81.888672,-102.892578],[81.944336,-102.90332],[82,-102.914062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[89.765625,-98.007812],[89.71875,-97.873046],[89.671875,-97.738281],[89.625,-97.603515],[89.578125,-97.46875],[89.671875,-97.300781],[89.765625,-97.132812],[89.833008,-97.068359],[89.900391,-97.003906],[89.941406,-96.911133],[89.982422,-96.818359]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[79.921875,-110.398437],[80.008789,-110.273437],[80.052246,-110.210937],[80.073975,-110.179687],[80.095703,-110.148437],[80.133545,-110.106445],[80.171387,-110.064453],[80.247071,-109.980469],[80.398438,-109.8125],[80.757813,-109.53125],[80.992188,-109.484375],[81.234375,-109.460937],[81.773438,-109.625],[82.304688,-109.609375],[82.570313,-109.539062],[82.726563,-109.242187],[82.914063,-109.03125],[83.187501,-108.894531],[83.460938,-108.757812],[83.8125,-108.40625],[84.171875,-108.15625],[84.298829,-107.957031],[84.425782,-107.757812],[84.552735,-107.558593],[84.616211,-107.458984],[84.679688,-107.359375],[84.773438,-107.353515],[84.867188,-107.347656],[85.054688,-107.335937],[85.429688,-107.3125],[85.546875,-107.21875],[85.558594,-107.148437],[85.570313,-107.078125],[85.500001,-107.063477],[85.429688,-107.048828],[85.289063,-107.019531],[85.007813,-106.960937],[84.40625,-106.804687],[83.78125,-106.953125],[83.359375,-106.820312],[83.515625,-106.289062],[83.825195,-105.867187],[83.979981,-105.656249],[84.057373,-105.550781],[84.09607,-105.498046],[84.134766,-105.445312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[83.773438,-105.203125],[83.818604,-105.233398],[83.86377,-105.263672],[83.954102,-105.324218],[84.044434,-105.384765],[84.134766,-105.445312],[84.192627,-105.498046],[84.250489,-105.550781],[84.366211,-105.656249],[84.597657,-105.867187],[84.830079,-106.078124],[85.0625,-106.289062],[85.351563,-106.390625],[85.507813,-106.382812],[85.664063,-106.375],[85.718751,-106.214843],[85.773438,-106.054687],[85.539063,-105.585937],[85.34375,-105.328125],[85.304688,-105.089843],[85.265625,-104.851562],[85.539063,-104.65625],[85.859375,-104.484375],[86.289063,-104.429687],[86.648438,-104.445312],[87.226563,-104.640625],[87.539063,-104.539062],[87.633301,-104.437012],[87.68042,-104.385986],[87.70398,-104.360474],[87.727539,-104.334961],[87.723511,-104.265747],[87.719482,-104.196533],[87.711426,-104.058106],[87.695313,-103.78125],[87.65625,-103.226562],[87.570313,-102.742187],[87.460938,-102.539062],[87.40625,-102.4375],[87.378907,-102.386718],[87.351563,-102.335937],[87.337952,-102.29486],[87.324341,-102.253784],[87.29712,-102.17163],[87.242676,-102.007324],[87.188233,-101.843017],[87.161011,-101.760864],[87.1474,-101.719788],[87.133789,-101.678711]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[87.726563,-104.335937],[87.781251,-104.346679],[87.835938,-104.357421],[87.945313,-104.378906],[88.164063,-104.421875],[88.351563,-104.53125],[88.539063,-104.640625],[88.660157,-104.886718],[88.78125,-105.132812],[89.15625,-105.15625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[85.148438,-101.507812],[85.207031,-101.566406],[85.265625,-101.625],[85.382813,-101.742187],[85.507813,-101.820312],[85.632813,-101.898437],[85.804688,-102.144531],[85.976563,-102.390625],[86.398438,-102.46875],[86.789063,-102.421875],[87.140625,-102.28125],[87.246094,-102.308593],[87.298829,-102.322265],[87.351563,-102.335937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[85.898438,-99.195312],[85.87677,-99.156586],[85.855103,-99.117859],[85.811768,-99.040405],[85.725098,-98.885498],[85.553711,-98.574707],[85.382325,-98.263916],[85.210938,-97.953125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[76.421875,-102.273437],[76.414063,-102.240234],[76.40625,-102.207031],[76.390625,-102.140624],[76.359375,-102.007812],[76.382813,-101.679687],[76.3125,-101.421875],[76.195313,-101.101562],[75.96875,-100.84375],[75.917969,-100.46875],[75.867188,-100.09375],[75.757813,-99.835937],[75.585938,-99.632812],[75.164063,-99.554687],[74.796875,-99.664062],[74.414063,-99.789062],[74,-99.96875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[74.804688,-101.023437],[74.799805,-100.989257],[74.794922,-100.955078],[74.785157,-100.886718],[74.765625,-100.75],[74.746094,-100.613281],[74.736328,-100.544922],[74.731445,-100.510742],[74.726563,-100.476562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[74.501953,-100.919922],[74.486084,-100.884033],[74.470215,-100.848144],[74.438477,-100.776367],[74.375,-100.632812],[74.550782,-100.554687],[74.638672,-100.515624],[74.682618,-100.496093],[74.726563,-100.476562],[74.757813,-100.444335],[74.789063,-100.412109],[74.851563,-100.347656],[74.976563,-100.21875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[63,-112.9375],[63.0625,-112.789062],[63.125,-112.640625],[63.203125,-112.519531],[63.242188,-112.458984],[63.28125,-112.398437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[52.484375,-100.492187],[52.695313,-101.023437],[52.65625,-101.554687],[52.742188,-101.898437],[52.742188,-102.195312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[64.777344,-100.029297],[64.927734,-99.953125],[64.991211,-99.894531],[65.022949,-99.865234],[65.054688,-99.835937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[11.5625,-118.335937],[11.591797,-118.265625],[11.621094,-118.195312],[11.650391,-118.125],[11.679688,-118.054687],[11.708984,-117.990234],[11.738281,-117.925781],[11.767578,-117.861328],[11.796875,-117.796875],[11.851563,-117.6875],[11.878906,-117.632812],[11.90625,-117.578125],[11.878906,-117.53125],[11.851563,-117.484375]]}}]}
},{}],5:[function(require,module,exports){
module.exports={"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[120.5,-71.792969],[120.414063,-71.77124],[120.371094,-71.760376],[120.328125,-71.749512],[120.25,-71.775024],[120.171875,-71.800537],[120.015625,-71.851562],[119.6875,-71.796875],[119.164063,-71.921875],[118.65625,-72.179687],[118.039063,-72.460937],[117.697754,-72.416504],[117.242188,-72.3125],[117.03125,-72.296875],[116.585938,-72.3125],[116.148438,-72.296875],[115.835938,-72.085937],[115.617188,-71.867187],[115.390625,-71.59375],[115.0625,-71.40625],[115.070313,-71.3125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[117.698242,-72.416504],[117.5625,-72.210937],[117.179688,-72.070312],[116.765625,-71.9375],[116.328125,-71.75],[116.0625,-71.601562],[115.703125,-71.460937],[115.453125,-71.421875],[115.1875,-71.375],[115.070313,-71.311523],[114.796875,-71.210937],[114.6875,-71.164062],[114.492188,-71.210937],[114.226563,-71.1875],[113.890625,-71.148437],[113.632813,-71.046875],[113.421875,-70.90625],[113.234375,-70.765625],[113.03125,-70.742187],[112.757813,-70.664062],[112.554688,-70.546875],[112.441407,-70.523437],[112.328125,-70.5],[112.228516,-70.505859],[112.128907,-70.511718],[111.929688,-70.523437],[111.617188,-70.570312],[111.398438,-70.609375],[111.148438,-70.53125],[110.960938,-70.492187],[110.78125,-70.492187],[110.59375,-70.570312],[110.445313,-70.671875],[110.320313,-70.765625],[110.109375,-70.796875],[109.914063,-70.742187],[109.851563,-70.730468],[109.789063,-70.71875],[109.716797,-70.708984],[109.644532,-70.699218],[109.5,-70.679687],[109.289063,-70.609375],[109.179688,-70.679687],[109.070313,-70.84375],[108.90625,-71.03125],[108.742188,-71.15625],[108.578125,-71.25],[108.484375,-71.390625],[108.34375,-71.578125],[108.179688,-71.664062],[107.914063,-71.695312],[107.75,-71.71875],[107.570313,-71.773437],[107.296875,-71.835937],[107.015625,-71.914062],[106.8125,-71.953125],[106.460938,-71.9375],[106.210938,-71.890625],[106.007813,-71.84375],[105.8125,-71.789062],[105.601563,-71.765625],[105.40625,-71.828125],[105.1875,-71.921875],[105.023438,-71.90625],[104.828125,-71.875],[104.632813,-71.78125],[104.484375,-71.671875],[104.351563,-71.609375],[104.304688,-71.523437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[117.242188,-72.3125],[117.164063,-72.507812],[117.125,-72.648437],[117.203125,-72.835937],[117.445313,-72.921875],[117.492188,-73.078125],[117.453125,-73.257812],[117.320313,-73.351562],[117.085938,-73.421875],[116.898438,-73.460937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[109.790039,-70.719727],[109.797608,-70.668701],[109.805176,-70.617676],[109.820313,-70.515625],[109.890625,-70.210937],[110.007813,-69.976562],[110.140625,-69.835937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[112.328125,-70.5],[112.304688,-70.43164],[112.28125,-70.363281],[112.234375,-70.226562],[112.148438,-69.9375],[112.148438,-69.703125],[112.25,-69.429687],[112.296875,-69.109375],[112.289063,-68.851562],[112.320313,-68.753906],[112.335938,-68.705078],[112.351563,-68.65625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[120.328125,-71.75],[120.326172,-71.669922],[120.324219,-71.589843],[120.320313,-71.429687],[120.414063,-71.234375],[120.710938,-71.1875],[121.015625,-71.054687],[121.203125,-70.875],[121.34375,-70.742187],[121.507813,-70.570312],[121.757813,-70.46875],[121.9375,-70.296875],[122.09375,-70.117187],[122.289063,-69.875],[122.492188,-69.679687],[122.6875,-69.523437],[122.8125,-69.179687],[122.835938,-68.757812],[122.867188,-68.507812],[122.929688,-68.21875],[123.132813,-67.960937],[123.296875,-67.796875],[123.460938,-67.59375],[123.546875,-67.40625],[123.550782,-67.210937],[123.552735,-67.113281],[123.554688,-67.015625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[123.552734,-67.019531],[123.646973,-66.987305],[123.741211,-66.955078],[123.929688,-66.890625],[124.195313,-66.78125],[124.4375,-66.460937],[124.679688,-66.296875],[124.960938,-66.21875],[125.085938,-66.15625],[125.25,-65.875],[125.359375,-65.726562],[125.5625,-65.53125],[125.773438,-65.34375],[125.953125,-65.1875],[126.179688,-65.148437],[126.523438,-65.140625],[126.726563,-65.242187],[127.015625,-65.234375],[127.335938,-65.25],[127.625,-65.164062],[127.867188,-64.898437],[128.039063,-64.664062],[128.359375,-64.429687],[128.695313,-64.289062],[128.921875,-64.171875],[129.015625,-64.124023],[129.109375,-64.076172]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[129.109375,-64.078125],[129.173829,-64.107421],[129.238282,-64.136718],[129.341797,-64.193359]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[129.109375,-64.076172],[129.113282,-63.975586],[129.117188,-63.875],[129.148438,-63.6875],[129.195313,-63.515625],[129.445313,-63.414062],[129.773438,-63.328125],[130,-63.242187],[130.273438,-63.078125],[130.429688,-62.921875],[130.484375,-62.782227],[130.539063,-62.642578]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[130.539063,-62.642578],[130.564453,-62.731934],[130.589844,-62.821289],[130.625,-63]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[130.539063,-62.640625],[130.554688,-62.492187],[130.570313,-62.34375],[130.632813,-62.210937],[130.796875,-62.015625],[130.90625,-61.757812],[130.898438,-61.453125],[130.910157,-61.368164],[130.921875,-61.283203]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[130.921875,-61.28125],[131.013672,-61.25],[131.105469,-61.21875],[131.289063,-61.15625],[131.804688,-61.007812],[132.203125,-60.96875],[132.4375,-60.835937],[132.734375,-60.6875],[133.0625,-60.554687],[133.130859,-60.501953],[133.165039,-60.475586],[133.199219,-60.449219]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[133.200195,-60.449219],[133.242188,-60.463867],[133.28125,-60.482421],[133.359375,-60.519531],[133.515625,-60.59375],[133.835938,-60.65625],[134.09375,-60.789062],[134.335938,-60.953125],[134.5625,-61.195312],[134.6875,-61.328125],[134.914063,-61.320312],[135.335938,-61.289062],[135.617188,-61.296875],[135.835938,-61.328125],[136.070313,-61.453125],[136.121094,-61.570312],[136.201172,-61.748047]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[133.199219,-60.449219],[133.208008,-60.391602],[133.216797,-60.333984],[133.234375,-60.21875],[133.304688,-59.929687],[133.46875,-59.773437],[133.453125,-59.46875],[133.453125,-59.039062],[133.429688,-58.796875],[133.433594,-58.722656],[133.4375,-58.648437],[133.449219,-58.515624],[133.460938,-58.382812],[133.46875,-58.132812],[133.445313,-57.898437],[133.515625,-57.648437],[133.632813,-57.539062],[133.914063,-57.460937],[134.171875,-57.328125],[134.382813,-57.25],[134.625,-57.15625],[134.773438,-57],[134.765625,-56.726562],[134.773438,-56.507812],[134.773438,-56.304687],[134.791016,-56.18164],[134.797852,-56.118164],[134.804688,-56.054687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[133.441406,-58.644531],[133.298828,-58.662109],[133.15625,-58.679687],[132.921875,-58.703125],[132.648438,-58.773437],[132.335938,-58.828125],[132.132813,-58.882812],[131.742188,-58.960937],[131.492188,-58.992187],[131.226563,-59.101562],[131.0625,-59.382812],[130.945313,-59.546875],[130.906251,-59.644531],[130.867188,-59.742187],[130.773438,-59.882812],[130.679688,-60.023437],[130.679688,-60.195312],[130.666992,-60.295898],[130.654297,-60.396484],[130.678711,-60.495117],[130.703125,-60.59375],[130.789063,-60.804687],[130.851563,-61.0625],[130.886719,-61.172852],[130.921875,-61.283203]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[130.945313,-59.548828],[130.789063,-59.575195],[130.632813,-59.601562],[130.425782,-59.667968],[130.21875,-59.734375],[130,-59.742187],[129.862305,-59.757812],[129.724609,-59.773437],[129.616211,-59.714844],[129.507813,-59.65625],[129.257813,-59.515625],[129.070313,-59.234375],[128.960938,-59.078125],[128.914063,-58.882812],[128.875,-58.71875],[128.609375,-58.476562],[128.453125,-58.257812],[128.40625,-58.160156],[128.382813,-58.111328],[128.359375,-58.0625],[128.327149,-58.034179],[128.294922,-58.005859],[128.230469,-57.949218],[128.101563,-57.835937],[127.867188,-57.601562],[127.742188,-57.507812],[127.59375,-57.359375],[127.453125,-57.332031],[127.382813,-57.318359],[127.347656,-57.311523],[127.3125,-57.304687],[127.260742,-57.307616],[127.208985,-57.310546],[127.105469,-57.316406],[126.898438,-57.328125],[126.476563,-57.414062],[126.226563,-57.421875],[126.167969,-57.4375],[126.109375,-57.453125],[126.046875,-57.462891],[125.984375,-57.472656],[125.859375,-57.492187],[125.609375,-57.53125],[125.472657,-57.545898],[125.404297,-57.553223],[125.335938,-57.560547],[125.297852,-57.558838],[125.259766,-57.557129],[125.183594,-57.553711],[125.03125,-57.546875],[124.59375,-57.570312],[124.40625,-57.601562],[124.195313,-57.648437],[123.921875,-57.71875],[123.609375,-57.75],[123.375,-57.703125],[123.148438,-57.703125],[123.039063,-57.601562],[122.867188,-57.484375],[122.710938,-57.328125],[122.539063,-57.210937],[122.296875,-57.132812],[122.078125,-57.195312],[121.757813,-57.3125],[121.492188,-57.421875],[121.234375,-57.492187],[121.054688,-57.601562],[120.882813,-57.71875],[120.65625,-57.828125],[120.429688,-57.914062],[120.179688,-57.953125],[120.015625,-57.945312],[119.898438,-57.925781],[119.839844,-57.916015],[119.78125,-57.90625],[119.734375,-57.907226],[119.6875,-57.908203],[119.59375,-57.910156],[119.40625,-57.914062],[119.289063,-57.925781],[119.230469,-57.93164],[119.171875,-57.9375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[128.359375,-58.0625],[128.416016,-58.03125],[128.472657,-58],[128.585938,-57.9375],[128.984375,-57.882812],[129.34375,-57.804687],[129.601563,-57.726562],[129.726563,-57.578125],[129.867188,-57.25],[129.96875,-57.03125],[130.054688,-56.910156],[130.097657,-56.849609],[130.119141,-56.819335],[130.140625,-56.789062],[130.176758,-56.774414],[130.212891,-56.759765],[130.285157,-56.730469],[130.429688,-56.671875],[130.65625,-56.625],[130.859375,-56.515625],[131.085938,-56.46875],[131.320313,-56.484375],[131.539063,-56.414062],[131.875,-56.398437],[132.132813,-56.414062],[132.445313,-56.367187],[132.695313,-56.273437],[132.96875,-56.132812],[133.210938,-55.984375],[133.40625,-55.914062],[133.804688,-55.867187],[134.078125,-55.875],[134.351563,-55.929687],[134.640625,-56.039062],[134.722657,-56.046874],[134.763672,-56.05078],[134.804688,-56.054687],[134.835938,-56.050781],[134.867188,-56.046874],[134.929688,-56.039062],[135.054688,-56.023437],[135.335938,-56.03125],[135.398438,-56.017578],[135.460938,-56.003906],[135.50586,-56.022216],[135.550781,-56.040527],[135.640625,-56.077148],[135.820313,-56.150391],[136.179688,-56.296875],[136.585938,-56.335937],[136.78125,-56.289062],[136.875,-56.253906],[136.921875,-56.236328],[136.96875,-56.21875],[137.016601,-56.188476],[137.064453,-56.158203],[137.160157,-56.097656],[137.351563,-55.976562],[137.515625,-55.828125],[137.71875,-55.703125],[137.859375,-55.648437],[138.007813,-55.4375],[138.109375,-55.210937],[138.234375,-55.101562],[138.484375,-54.929687],[138.664063,-54.84375],[138.763672,-54.787109],[138.81543,-54.756836],[138.867188,-54.726562],[138.918945,-54.754883],[138.970703,-54.783203],[139.078125,-54.835937],[139.304688,-55.007812],[139.445313,-55.148437],[139.640625,-55.28125],[139.773438,-55.375],[139.847656,-55.435547],[139.900391,-55.475586],[139.953125,-55.515625],[140.132813,-55.65625],[140.421875,-55.84375],[140.525391,-55.849609],[140.577148,-55.852539],[140.628906,-55.855469],[140.696289,-55.848633],[140.763672,-55.841797],[140.898438,-55.828125],[141.1875,-55.820312],[141.453125,-55.851562],[141.765625,-56.03125],[141.992188,-56.21875],[142.21875,-56.335937],[142.4375,-56.492187],[142.617188,-56.71875],[142.726563,-56.914062],[142.773438,-57.125],[142.796875,-57.335937],[142.851563,-57.546875],[143.039063,-57.625],[143.226563,-57.671875],[143.289063,-57.722656],[143.320313,-57.748047],[143.351563,-57.773437],[143.37793,-57.821289],[143.404297,-57.869141],[143.457031,-57.964844],[143.5625,-58.15625],[143.601563,-58.46875],[143.609375,-58.644531],[143.613281,-58.732422],[143.615234,-58.776367],[143.617188,-58.820312],[143.618164,-58.863281],[143.619141,-58.90625],[143.621094,-58.992187],[143.625,-59.164062],[143.601563,-59.429687],[143.554688,-59.703125],[143.5,-60.007812],[143.421875,-60.234375],[143.25,-60.382812],[142.96875,-60.492187],[142.65625,-60.59375],[142.390625,-60.546875],[142.3125,-60.535156],[142.273438,-60.529296],[142.234375,-60.523437],[142.207031,-60.540039],[142.179688,-60.55664],[142.125,-60.589843],[142.015625,-60.65625],[141.859375,-60.898437],[141.703125,-61.0625],[141.585938,-61.265625],[141.492188,-61.445312],[141.453125,-61.710937],[141.445313,-61.953125],[141.476563,-62.171875],[141.554688,-62.375],[141.621094,-62.488281],[141.654297,-62.544921],[141.6875,-62.601562],[141.726563,-62.646484],[141.765625,-62.691406],[141.84375,-62.78125],[142.015625,-62.859375],[142.28125,-63.046875],[142.523438,-63.054687],[142.835938,-63.0625],[143.125,-63.164062],[143.460938,-63.289062],[143.664063,-63.421875],[143.796875,-63.570312],[144.015625,-63.71875],[144.304688,-63.882812],[144.445313,-64.078125],[144.507813,-64.351562],[144.632813,-64.679687],[144.773438,-64.890625],[144.820313,-65.003906],[144.843751,-65.060546],[144.867188,-65.117187],[144.876954,-65.18164],[144.886719,-65.246093],[144.90625,-65.375],[144.914063,-65.476562],[144.917969,-65.527344],[144.921875,-65.578125],[144.922852,-65.617187],[144.923828,-65.65625],[144.925782,-65.734375],[144.929688,-65.890625],[144.859375,-66.085937],[144.789063,-66.242187],[144.492188,-66.328125],[144.109375,-66.34375],[143.859375,-66.25],[143.625,-66.203125],[143.429688,-66.265625],[143.117188,-66.484375],[143.039063,-66.542968],[143.000001,-66.572265],[142.960938,-66.601562],[142.921876,-66.630859],[142.882813,-66.660156],[142.804688,-66.71875],[142.5,-66.992187],[142.234375,-67.148437],[142.023438,-67.273437],[141.789063,-67.367187],[141.53125,-67.466797]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[140.238281,-66.169922],[140.445313,-66.210937],[140.585938,-66.382812],[140.695313,-66.476562],[140.960938,-66.492187],[141.390625,-66.570312],[141.6875,-66.648437],[142.117188,-66.710937],[142.539063,-66.710937],[142.789063,-66.671875],[142.875,-66.636719],[142.917969,-66.619141],[142.960938,-66.601562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[144.865234,-65.117187],[144.925049,-65.088867],[144.984863,-65.060547],[145.104492,-65.003906],[145.34375,-64.890625],[145.742188,-64.75],[145.957032,-64.666016],[146.064453,-64.624023],[146.118164,-64.603027],[146.171875,-64.582031],[146.214844,-64.557617],[146.257813,-64.533203],[146.34375,-64.484375],[146.757813,-64.453125],[146.968751,-64.480468],[147.074219,-64.49414],[147.126954,-64.500976],[147.179688,-64.507812],[147.225586,-64.511718],[147.271485,-64.515624],[147.363282,-64.523437],[147.546875,-64.539062],[147.914063,-64.632812],[148.195313,-64.742187],[148.664063,-64.828125],[148.929688,-65.023437],[149.210938,-65.273437],[149.359375,-65.46875],[149.460938,-65.617187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[146.171875,-64.585937],[146.21875,-64.644531],[146.265625,-64.703125],[146.382813,-64.921875],[146.379883,-65.045898],[146.378418,-65.10791],[146.376953,-65.169922],[146.379883,-65.219726],[146.382813,-65.269531],[146.382813,-65.398437],[146.363282,-65.492187],[146.34375,-65.585937],[146.183594,-65.574218],[146.023438,-65.5625],[145.695313,-65.554687],[145.398438,-65.546875],[145.101563,-65.570312],[145.012696,-65.575195],[144.968262,-65.577637],[144.923828,-65.580078]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[146.375,-65.171875],[146.417969,-65.11914],[146.460938,-65.066406],[146.546875,-64.960937],[146.648438,-64.757812],[146.984375,-64.640625],[147.081055,-64.574219],[147.129395,-64.541016],[147.177734,-64.507812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[141.689453,-62.599609],[141.647949,-62.61377],[141.606446,-62.62793],[141.523438,-62.65625],[141.289063,-62.820312],[141.023438,-62.953125],[140.835938,-63],[140.664063,-63.046875],[140.460938,-62.96875],[140.171875,-62.84375],[139.953125,-62.835937],[139.664063,-62.828125],[139.507813,-62.679687],[139.242188,-62.5],[139.023438,-62.296875],[138.851563,-62.070312],[138.749024,-62],[138.697754,-61.964844],[138.646484,-61.929687],[138.608643,-61.891602],[138.570801,-61.853516],[138.495117,-61.777344],[138.34375,-61.625],[138.171875,-61.390625],[138.09375,-61.109375],[138.171875,-60.921875],[138.296875,-60.648437],[138.476563,-60.265625],[138.578125,-60.085937],[138.617188,-59.988281],[138.636719,-59.939453],[138.65625,-59.890625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[136.96875,-56.21875],[137.000976,-56.264648],[137.033203,-56.310547],[137.101563,-56.398437],[137.265625,-56.507812],[137.390625,-56.679687],[137.484375,-56.835937],[137.5625,-57.023437],[137.617188,-57.28125],[137.640625,-57.539062],[137.578125,-57.859375],[137.554688,-58.054687],[137.546875,-58.25],[137.671875,-58.492187],[137.851563,-58.8125],[137.921875,-59.015625],[138.054688,-59.265625],[138.132813,-59.507812],[138.4375,-59.734375],[138.546875,-59.8125],[138.601563,-59.851562],[138.628906,-59.871094],[138.65625,-59.890625],[138.692383,-59.896484],[138.728516,-59.902344],[138.800782,-59.914062],[138.945313,-59.9375],[139.234375,-59.960937],[139.386719,-59.964843],[139.462891,-59.966797],[139.500977,-59.967773],[139.539063,-59.96875],[139.576172,-59.972656],[139.613282,-59.976562],[139.687501,-59.984375],[139.835938,-60],[140.125,-60.007812],[140.382813,-59.90625],[140.695313,-59.8125],[140.976563,-59.765625],[141.3125,-59.789062],[141.539063,-59.8125],[141.644532,-59.832031],[141.697266,-59.841797],[141.75,-59.851562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[140.628906,-55.855469],[140.641602,-55.913086],[140.654297,-55.970703],[140.679688,-56.085937],[140.742188,-56.320312],[140.789063,-56.515625],[140.992188,-56.609375],[141.203125,-56.671875],[141.398438,-56.804687],[141.585938,-56.90625],[141.726563,-57.015625],[141.6875,-57.179687],[141.554688,-57.359375],[141.453125,-57.515625],[141.359375,-57.703125],[141.359375,-57.859375],[141.554688,-58.023437],[141.757813,-58.109375],[141.945313,-58.273437],[142.125,-58.453125],[142.34375,-58.59375],[142.4375,-58.820312],[142.3125,-59.09375],[142.179688,-59.3125],[142.03125,-59.539062],[141.890625,-59.695312],[141.820313,-59.773437],[141.785156,-59.8125],[141.75,-59.851562],[141.753906,-59.900391],[141.757813,-59.949219],[141.765625,-60.046875],[141.859375,-60.210937],[142.078125,-60.359375],[142.15625,-60.441406],[142.195313,-60.482422],[142.234375,-60.523437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[139.539063,-59.96875],[139.558594,-59.927734],[139.578125,-59.886718],[139.617188,-59.804687],[139.679688,-59.492187],[139.84375,-59.234375],[140.09375,-59.132812],[140.335938,-59.03125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[129.726563,-59.771484],[129.849609,-59.812988],[129.972656,-59.854492],[130.21875,-59.9375],[130.359375,-60.054687],[130.5,-60.171875],[130.578125,-60.285156],[130.65625,-60.398437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[127.3125,-57.302734],[127.322266,-57.268066],[127.332032,-57.233398],[127.351563,-57.164062],[127.453125,-56.867187],[127.53125,-56.671875],[127.703125,-56.46875],[127.921875,-56.257812],[128.140625,-56.085937],[128.414063,-55.921875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[130.140625,-56.789062],[130.097657,-56.746093],[130.054688,-56.703124],[129.96875,-56.617187],[129.796875,-56.414062],[129.617188,-56.289062],[129.4375,-56.070312],[129.164063,-55.914062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[135.460938,-56.003906],[135.465821,-55.955078],[135.470704,-55.906249],[135.480469,-55.804687],[135.5,-55.601562],[135.507813,-55.195312],[135.53125,-54.875],[135.570313,-54.625],[135.640626,-54.484375],[135.710938,-54.34375],[135.722657,-54.25],[135.728516,-54.203125],[135.734375,-54.15625],[135.739258,-54.106445],[135.744141,-54.05664],[135.753907,-53.957031],[135.773438,-53.757812],[135.804688,-53.382812],[136.039063,-52.9375],[136.15625,-52.554687],[136.148438,-52.046875],[136.132813,-51.671875],[136.085938,-51.195312],[135.992188,-50.9375],[135.992188,-50.609375],[136.064453,-50.458984],[136.100586,-50.383789],[136.118653,-50.346191],[136.136719,-50.308594],[136.158692,-50.27002],[136.180664,-50.231445],[136.224609,-50.154297],[136.3125,-50],[136.382813,-49.765625],[136.351563,-49.578125],[136.234375,-49.34375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[135.734375,-54.15625],[135.700196,-54.128418],[135.666016,-54.100586],[135.589844,-54.041016],[135.4375,-53.921875],[135.203125,-53.671875],[135.101563,-53.453125],[135.093751,-53.269531],[135.085938,-53.085937],[135.007813,-52.789062],[134.867188,-52.46875],[134.671875,-52.054687],[134.578125,-51.78125],[134.445313,-51.445312],[134.375,-51.296875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[138.867188,-54.726562],[138.881837,-54.682616],[138.896485,-54.638671],[138.925782,-54.550781],[138.984375,-54.375],[139.007813,-54.302734],[139.023438,-54.226562],[139.039063,-54.152343],[139.09375,-53.929687],[139.0625,-53.46875],[139.0625,-53.070312],[139.0625,-52.765625],[139.054688,-52.414062],[139,-51.984375],[139.015625,-51.601562],[139.109375,-51.242187],[139.304688,-50.773437],[139.414063,-50.507812],[139.464844,-50.402343],[139.490235,-50.349609],[139.515625,-50.296875],[139.519531,-50.232422],[139.523438,-50.167968],[139.53125,-50.039062],[139.53125,-49.71875],[139.523438,-49.359375],[139.570313,-49.109375],[139.587891,-49.064453],[139.605469,-49.019531],[139.623047,-48.974609],[139.640625,-48.929687],[139.882813,-48.570312],[140.132813,-48.414062],[140.335938,-48.1875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[136.136719,-50.308594],[136.171875,-50.294922],[136.207031,-50.28125],[136.273438,-50.25],[136.40625,-50.1875],[136.59375,-50.03125],[136.765625,-49.929687],[137.085938,-49.742187],[137.382813,-49.484375],[137.648438,-49.28125],[137.828125,-49.085937],[138.101563,-48.851562],[138.367188,-48.78125],[138.609375,-48.867187],[138.851563,-49.070312],[139.078125,-49.203125],[139.375,-49.15625],[139.490234,-49.087891],[139.547852,-49.053711],[139.605469,-49.019531]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[125.335938,-57.5625],[125.343751,-57.621094],[125.351563,-57.679687],[125.367188,-57.796875],[125.390625,-58.070312],[125.414063,-58.421875],[125.28125,-58.648437],[125.195313,-58.78125],[125.3125,-59.210937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[123.552734,-67.015625],[123.523926,-66.945312],[123.495117,-66.875],[123.4375,-66.734375],[123.40625,-66.335937],[123.429688,-66.132812],[123.453125,-65.757812],[123.416016,-65.640625],[123.378906,-65.523437],[123.290527,-65.498047],[123.202148,-65.472656],[123.11377,-65.447266],[123.025391,-65.421875],[122.93457,-65.460937],[122.84375,-65.5],[122.632813,-65.742187],[122.390625,-65.953125],[122.101563,-66.09375],[121.835938,-66.265625],[121.625,-66.523437],[121.523438,-66.789062],[121.523438,-67.132812],[121.53125,-67.421875],[121.500977,-67.537109],[121.48584,-67.594727],[121.470703,-67.652344],[121.454102,-67.71289],[121.4375,-67.773437],[121.3125,-68.164062],[121.1875,-68.390625],[121.078125,-68.507812],[120.898438,-68.59375],[120.578125,-68.59375],[120.328125,-68.492187],[120.03125,-68.296875],[119.820313,-68.148437],[119.523438,-68.109375],[119.382813,-68.257812],[119.179688,-68.390625],[119.007813,-68.523437],[118.804688,-68.609375],[118.539063,-68.539062],[118.359375,-68.429687],[118.179688,-67.96875],[118.070313,-67.632812],[117.921875,-67.421875],[117.710938,-67.3125],[117.507813,-67.234375],[117.257813,-67.1875],[117.007813,-66.976562],[116.6875,-66.945312],[116.414063,-67.046875],[116.265625,-67.125],[115.96875,-67.023437],[115.710938,-66.96875],[115.320313,-66.976562],[115.085938,-67.125],[114.984375,-67.375],[114.875,-67.632812],[114.734375,-67.90625],[114.609375,-68.046875],[114.375,-68.195312],[114.101563,-68.390625],[113.867188,-68.523437],[113.554688,-68.554687],[113.117188,-68.632812],[112.796875,-68.703125],[112.573242,-68.678711],[112.461426,-68.666504],[112.405518,-68.6604],[112.349609,-68.654297],[112.285645,-68.631348],[112.22168,-68.608398],[112.09375,-68.5625],[111.851563,-68.390625],[111.679688,-68.210937],[111.664063,-67.929687],[111.570313,-67.523437],[111.476563,-67.242187],[111.442383,-67.15039],[111.408203,-67.058594]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[111.408203,-67.058594],[111.300293,-67.053711],[111.192383,-67.048828],[110.976563,-67.039062],[110.46875,-66.921875],[110.148438,-66.804687],[109.804688,-66.78125],[109.476563,-66.648437],[109.371094,-66.632812],[109.265625,-66.617187],[109.181641,-66.617187],[109.097657,-66.617187],[108.929688,-66.617187],[108.632813,-66.742187],[108.34375,-66.96875],[108.039063,-67.203125],[107.78125,-67.328125],[107.398438,-67.460937],[107.257813,-67.53125],[106.890625,-67.742187],[106.5625,-67.90625],[106.367188,-67.984375],[106.15625,-68.289062],[105.945313,-68.570312],[105.78125,-68.703125],[105.726563,-68.992187],[105.710938,-69.367187],[105.757813,-69.726562],[105.789063,-70.007812],[105.90625,-70.25],[106,-70.53125],[106.007813,-70.726562],[105.789063,-70.992187],[105.59375,-71.15625],[105.328125,-71.367187],[104.96875,-71.539062],[104.5625,-71.53125],[104.304688,-71.523437],[103.992188,-71.523437],[103.632813,-71.398437],[103.375,-71.390625],[103.09375,-71.507812],[102.71875,-71.585937],[102.367188,-71.570312],[102.101563,-71.515625],[101.835938,-71.398437],[101.65625,-71.273437],[101.453125,-71.015625],[101.257813,-70.796875],[101.054688,-70.671875],[100.84375,-70.492187],[100.75,-70.1875],[100.710938,-69.867187],[100.679688,-69.585937],[100.851563,-69.21875],[101.015625,-69],[101.21875,-68.804687],[101.445313,-68.695312],[101.757813,-68.609375],[102.109375,-68.546875],[102.40625,-68.429687],[102.710938,-68.235352],[102.851563,-68.03125],[103.070313,-67.734375],[103.367188,-67.40625],[103.585938,-67.195312],[103.679688,-66.710937],[103.804688,-66.398437],[104.195313,-66.132812],[104.625,-65.828125],[104.914063,-65.453125],[105.125,-65.101562],[105.28125,-64.820312],[105.53125,-64.3125],[105.539063,-63.929687],[105.601563,-63.585937],[105.65625,-63.039062],[105.726563,-62.664062],[105.738282,-62.531249],[105.744141,-62.464843],[105.75,-62.398437],[105.736328,-62.352539],[105.722656,-62.30664],[105.695313,-62.214843],[105.640625,-62.03125],[105.578125,-61.773437],[105.476563,-61.398437],[105.28125,-61.0625],[104.992188,-60.796875],[104.734375,-60.484375],[104.570313,-60.351562],[104.296875,-60.125],[104.070313,-60.039062],[103.859375,-59.90625],[103.753906,-59.887695],[103.701172,-59.878418],[103.648438,-59.869141],[103.608398,-59.854248],[103.568359,-59.839355],[103.488281,-59.80957],[103.328125,-59.75],[102.859375,-59.765625],[102.632813,-59.875],[102.328125,-60.007812],[102.210938,-60.171875],[102.039063,-60.25],[101.703125,-60.398437],[101.421875,-60.421875],[100.976563,-60.5],[100.601563,-60.5625],[100.296875,-60.679687],[100.109375,-60.734375],[99.882813,-60.84375],[99.710938,-61.03125],[99.390625,-61.210937],[99.265625,-61.265625],[99.054688,-61.5625],[98.953125,-61.820312],[98.789063,-61.9375],[98.640625,-62.054687],[98.570313,-62.242187],[98.421875,-62.375],[98.171875,-62.429687],[97.875,-62.46875],[97.585938,-62.46875],[97.289063,-62.398437],[96.992188,-62.351562],[96.71875,-62.289062],[96.523438,-62.554687],[96.359375,-62.765625],[96.195313,-63.007812],[95.914063,-63.28125],[95.632813,-63.375],[95.296875,-63.429687],[94.875,-63.414062],[94.570313,-63.320312],[94.40625,-63.109375],[94.28125,-62.828125],[94.132813,-62.625],[93.960938,-62.398437],[93.9375,-62.078125],[94.054688,-61.710937],[94.101563,-61.539062],[94.125001,-61.453124],[94.148438,-61.367187],[94.167969,-61.296874],[94.1875,-61.226562],[94.208984,-61.150879],[94.230469,-61.075195],[94.251953,-60.999512],[94.262695,-60.96167],[94.273438,-60.923828]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[102.710938,-68.234375],[102.757813,-68.390625],[102.90625,-68.507812],[103.179688,-68.578125],[103.507813,-68.664062],[103.6875,-68.679687],[103.789063,-68.539062],[103.945313,-68.601562],[104.257813,-68.640625],[104.460938,-68.632812],[104.664063,-68.609375],[104.875,-68.578125],[105.125,-68.453125],[105.320313,-68.445312],[105.585938,-68.4375],[105.875,-68.34375],[106.15625,-68.289062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[95.125,-56.851562],[95.257813,-57.03125],[95.179688,-57.28125],[95.039063,-57.492187],[94.914063,-57.664062],[94.703125,-57.90625],[94.617188,-58.164062],[94.648438,-58.5625],[94.578125,-58.9375],[94.554688,-59.210937],[94.570313,-59.4375],[94.492188,-59.835937],[94.429688,-60.085937],[94.367188,-60.3125],[94.328125,-60.507812],[94.296875,-60.6875],[94.291016,-60.746094],[94.285157,-60.804687],[94.279297,-60.863281],[94.273438,-60.921875],[94.281251,-60.966797],[94.289063,-61.011719],[94.304688,-61.101562],[94.320313,-61.191406],[94.335938,-61.28125],[94.376954,-61.347656],[94.417969,-61.414062],[94.5,-61.546875],[94.820313,-61.695312],[95.171875,-61.765625],[95.5625,-61.6875],[95.828125,-61.40625],[96.226563,-61.125],[96.445313,-60.8125],[96.71875,-60.570312],[96.921875,-60.40625],[97.125,-60.125],[97.359375,-59.953125],[97.710938,-59.796875],[98.109375,-59.648437],[98.445313,-59.4375],[98.625,-59.304687],[98.696289,-59.261718],[98.731934,-59.240234],[98.767578,-59.21875],[98.804443,-59.202148],[98.841309,-59.185547],[98.915039,-59.152343],[99.0625,-59.085937],[99.46875,-58.9375],[99.703125,-58.75],[99.867188,-58.5625],[100.125,-58.46875],[100.523438,-58.421875],[100.820313,-58.359375],[101.078125,-58.21875],[101.398438,-57.976562],[101.664063,-57.625],[101.828125,-57.3125],[101.894531,-57.177734],[101.972656,-57.029297],[102.03125,-56.9375],[102.171875,-56.671875],[102.328125,-56.507812],[102.441407,-56.437499],[102.498047,-56.402343],[102.554688,-56.367187],[102.609376,-56.328124],[102.664063,-56.289062],[102.773438,-56.210937],[102.867188,-56.058593],[102.914063,-55.982422],[102.937501,-55.944336],[102.949219,-55.925293],[102.960938,-55.90625],[102.968262,-55.892578],[102.975586,-55.878906],[102.990235,-55.851562],[103.019532,-55.796875],[103.078125,-55.6875],[103.148438,-55.429687],[103.234375,-55.296875],[103.515625,-55.078125],[103.78125,-55.015625],[104.210938,-54.914062],[104.601563,-54.804687],[104.820313,-54.734375],[105.039063,-54.648437],[105.34375,-54.554687],[105.601563,-54.5],[105.859375,-54.546875],[105.928711,-54.571289],[105.998047,-54.595703],[106.050049,-54.616943],[106.102051,-54.638184],[106.206055,-54.680664],[106.414063,-54.765625],[106.695313,-54.796875],[106.835938,-54.789062],[106.906251,-54.785156],[106.976563,-54.78125],[107.041016,-54.755859],[107.105469,-54.730468],[107.234375,-54.679687],[107.523438,-54.617187],[107.875,-54.59375],[108.019531,-54.603516],[108.091797,-54.608398],[108.164063,-54.613281],[108.216797,-54.619629],[108.269531,-54.625976],[108.375,-54.638672],[108.585938,-54.664062],[108.660157,-54.637207],[108.734376,-54.610351],[108.808594,-54.583496],[108.882813,-54.556641]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[108.882813,-54.554687],[108.984376,-54.562499],[109.085938,-54.570312],[109.187501,-54.578124],[109.238282,-54.582031],[109.289063,-54.585937],[109.333008,-54.582031],[109.376954,-54.578124],[109.464844,-54.570312],[109.640625,-54.554687],[110.03125,-54.648437],[110.46875,-54.554687],[110.960938,-54.484375],[111.4375,-54.492187],[111.859375,-54.648437],[111.9375,-54.679687],[112.015625,-54.710937],[112.09082,-54.742187],[112.166016,-54.773437],[112.316407,-54.835937],[112.617188,-54.960937],[113.039063,-55.039062],[113.351563,-55.195312],[113.703125,-55.4375],[114.039063,-55.734375],[114.28125,-55.976562],[114.484375,-56.164062],[114.8125,-56.259766],[115.1875,-56.25],[115.5625,-56.367187],[116,-56.484375],[116.3125,-56.5625],[116.632813,-56.570312],[116.90625,-56.734375],[117.101563,-56.820312],[117.40625,-56.875],[117.664063,-57.046875],[117.945313,-57.210937],[118.28125,-57.390625],[118.703125,-57.640625],[119,-57.789062],[119.086426,-57.86377],[119.129639,-57.901123],[119.172852,-57.938477]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[119.175781,-57.939453],[119.148926,-57.967529],[119.12207,-57.995605],[119.06836,-58.051758],[118.960938,-58.164062],[118.796875,-58.3125],[118.578125,-58.53125],[118.34375,-58.78125],[118.101563,-59],[117.96875,-59.171875],[117.894532,-59.246093],[117.857422,-59.283203],[117.820313,-59.320312],[117.791993,-59.335937],[117.763672,-59.351562],[117.707032,-59.382812],[117.59375,-59.445312],[117.398438,-59.585937],[117.09375,-59.773437],[116.84375,-59.921875],[116.5625,-60.132812],[116.296875,-60.273437],[116.007813,-60.429687],[115.789063,-60.523437],[115.546875,-60.59375],[115.273438,-60.648437],[114.921875,-60.851562],[114.71875,-60.992187],[114.539063,-61.117187],[114.46875,-61.265625],[114.484375,-61.492187],[114.492188,-61.742187],[114.46875,-62.039062],[114.34375,-62.257812],[114.140625,-62.375],[113.875,-62.453125],[113.59375,-62.523437],[113.273438,-62.6875],[112.992188,-62.882812],[112.828125,-62.976562],[112.657227,-63.063476],[112.571777,-63.106934],[112.529053,-63.128662],[112.486328,-63.150391]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[109.289063,-54.585937],[109.286133,-54.629882],[109.283204,-54.673828],[109.277344,-54.761718],[109.265625,-54.9375],[109.273438,-55.296875],[109.265625,-55.601562],[109.25,-55.90625],[109.289063,-56.117187],[109.445313,-56.4375],[109.53125,-56.640625],[109.617188,-56.875],[109.742188,-57.09375],[109.929688,-57.273437],[110.148438,-57.492187],[110.304688,-57.734375],[110.332032,-57.820312],[110.359375,-57.90625],[110.400391,-57.988281],[110.441407,-58.070312],[110.523438,-58.234375],[110.671875,-58.46875],[110.796875,-58.726562],[110.96875,-59.023437],[111.117188,-59.335937],[111.265625,-59.640625],[111.53125,-59.78125],[111.804688,-59.90625],[112.117188,-60.15625],[112.242188,-60.539062],[112.328125,-60.921875],[112.351563,-61.226562],[112.398438,-61.554687],[112.40625,-61.835937],[112.445313,-62.171875],[112.484375,-62.5],[112.445313,-62.828125],[112.466797,-62.988281],[112.477539,-63.068359],[112.48291,-63.108398],[112.488281,-63.148437],[112.48584,-63.188476],[112.483398,-63.228515],[112.478516,-63.308593],[112.46875,-63.46875],[112.445313,-63.6875],[112.382813,-63.992187],[112.195313,-64.257812],[112.023438,-64.554687],[111.8125,-64.882812],[111.695313,-65.226562],[111.59375,-65.5625],[111.554688,-66.078125],[111.515625,-66.414062],[111.5,-66.726562],[111.453125,-66.894531],[111.429688,-66.978515],[111.40625,-67.0625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[103.648438,-59.867187],[103.666016,-59.814453],[103.683594,-59.761718],[103.71875,-59.65625],[103.796875,-59.429687],[103.832032,-59.320312],[103.84961,-59.265624],[103.867188,-59.210937],[103.876954,-59.15039],[103.886719,-59.089843],[103.90625,-58.96875],[104,-58.585937],[104.132813,-58.320312],[104.289063,-58.078125],[104.554688,-57.859375],[104.765625,-57.703125],[105.078125,-57.59375],[105.335938,-57.539062],[105.441407,-57.527343],[105.546875,-57.515625],[105.625,-57.496094],[105.703125,-57.476562],[105.859375,-57.4375],[106.09375,-57.460937],[106.28125,-57.5625],[106.445313,-57.710937],[106.617188,-57.914062],[106.734375,-58.101562],[106.828125,-58.367187],[106.945313,-58.679687],[107.054688,-58.976562],[107.179688,-59.328125],[107.382813,-59.546875],[107.625,-59.65625],[107.898438,-59.75],[108.203125,-59.835937],[108.507813,-59.976562],[108.617188,-60.210937],[108.71875,-60.453125],[108.882813,-60.617187],[109.03125,-60.804687],[109.148438,-61.015625],[109.304688,-61.195312],[109.339844,-61.242187],[109.375,-61.289062],[109.401367,-61.321289],[109.427735,-61.353515],[109.480469,-61.417968],[109.585938,-61.546875],[109.78125,-61.703125],[109.960938,-61.789062],[110.018555,-61.824218],[110.076172,-61.859375],[110.135742,-61.898437],[110.195313,-61.9375],[110.398438,-62.070312],[110.578125,-62.273437],[110.742188,-62.484375],[110.870117,-62.574218],[110.934082,-62.61914],[110.966065,-62.641601],[110.998047,-62.664062],[111.049317,-62.695312],[111.100586,-62.726562],[111.203125,-62.789062],[111.492188,-62.90625],[111.75,-62.976562],[111.9375,-63.046875],[112.210938,-63.109375],[112.347657,-63.128906],[112.416016,-63.138671],[112.450195,-63.143554],[112.484375,-63.148437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[105.751953,-62.396484],[105.786865,-62.436768],[105.821777,-62.477051],[105.891602,-62.557617],[106.03125,-62.71875],[106.4375,-62.9375],[106.867188,-63.078125],[107.304688,-63.109375],[107.703125,-62.984375],[108.054688,-62.6875],[108.179688,-62.601562],[108.242188,-62.558594],[108.273438,-62.537109],[108.304688,-62.515625],[108.342774,-62.492187],[108.38086,-62.46875],[108.457032,-62.421875],[108.609375,-62.328125],[108.820313,-62.0625],[109.046875,-61.75],[109.226563,-61.429687],[109.301758,-61.360351],[109.339356,-61.325683],[109.376953,-61.291016]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[108.304688,-62.515625],[108.339844,-62.523437],[108.375,-62.53125],[108.445313,-62.546875],[108.585938,-62.578125],[108.984375,-62.640625],[109.3125,-62.8125],[109.5625,-63.078125],[109.75,-63.320312],[109.785157,-63.363281],[109.820313,-63.40625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[110.078125,-61.859375],[110.077148,-61.899414],[110.076172,-61.939453],[110.074219,-62.019531],[110.070313,-62.179687],[110.023438,-62.5],[109.96875,-62.867187],[109.90625,-63.1875],[109.863282,-63.295898],[109.841797,-63.350098],[109.820313,-63.404297]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[111,-62.664062],[110.959961,-62.704101],[110.919922,-62.74414],[110.839844,-62.824218],[110.679688,-62.984375],[110.421875,-63.304687],[110.101563,-63.609375],[109.882813,-63.71875],[109.609375,-63.835937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[109.265625,-66.617187],[109.386719,-66.546874],[109.507813,-66.476562],[109.789063,-66.195312],[109.921875,-65.804687],[110.078125,-65.453125],[110.3125,-65.117187],[110.320313,-64.78125],[110.210938,-64.375],[109.960938,-64.242187],[109.679688,-64.148437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[105.289063,-64.851562],[104.898438,-64.75],[104.554688,-64.710937],[104.226563,-64.585937],[103.960938,-64.5],[103.65625,-64.421875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[105.609375,-63.59375],[105.234375,-63.53125],[104.8125,-63.476562],[104.28125,-63.429687],[104.117188,-63.398437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[94.429688,-63.117187],[94.109375,-63.164062],[93.773438,-63.203125],[93.570313,-63.320312],[93.242188,-63.601562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[98.767578,-59.21875],[98.747559,-59.185547],[98.727539,-59.152343],[98.6875,-59.085937],[98.734375,-58.867187],[98.71875,-58.726562],[98.53125,-58.546875],[98.351563,-58.46875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[103.867188,-59.212891],[103.8125,-59.16748],[103.757813,-59.12207],[103.648438,-59.03125],[103.4375,-58.90625],[103.15625,-58.648437],[102.976563,-58.429687],[102.78125,-58.101562],[102.601563,-57.789062],[102.460938,-57.523437],[102.390626,-57.382812],[102.355469,-57.312499],[102.320313,-57.242187],[102.273438,-57.222656],[102.226563,-57.203124],[102.132813,-57.164062],[102.001953,-57.125],[101.84375,-57.078125],[101.6875,-57.023437],[101.476563,-56.835937],[101.273438,-56.554687],[101.046875,-56.335937],[100.796875,-56.164062],[100.53125,-56],[100.304688,-55.882812],[100,-55.796875],[99.773438,-55.492187],[99.65625,-55.304687],[99.773438,-54.992187],[99.960938,-54.585937],[100.101563,-54.429687],[100.226563,-54.078125],[100.273438,-53.886718],[100.296876,-53.791015],[100.308594,-53.743164],[100.320313,-53.695312],[100.325196,-53.642578],[100.330079,-53.589843],[100.339844,-53.484374],[100.359375,-53.273437],[100.367188,-53.179687],[100.371094,-53.132812],[100.375,-53.085937],[100.361328,-53.046874],[100.347656,-53.007812],[100.320313,-52.929687],[100.265625,-52.773437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[100.378906,-53.085937],[100.428711,-53.050781],[100.478516,-53.015625],[100.578125,-52.945312],[100.882813,-52.78125],[101.0625,-52.46875],[101.375,-52.335937],[101.75,-52.460937],[102.054688,-52.46875],[102.265625,-52.273437],[102.40625,-51.992187],[102.65625,-51.875],[102.856445,-51.87207],[102.956543,-51.870605],[103.006592,-51.869873],[103.056641,-51.869141],[103.128418,-51.897949],[103.200195,-51.926758],[103.34375,-51.984375],[103.585938,-51.921875],[103.992188,-51.914062],[104.359375,-51.929687],[104.742188,-51.960937],[104.882813,-51.968749],[104.953126,-51.972656],[104.988282,-51.974609],[105.023438,-51.976562],[105.076172,-51.957031],[105.128907,-51.937499],[105.234375,-51.898437],[105.53125,-51.84375],[105.742188,-51.8125],[105.837891,-51.803711],[105.885742,-51.799316],[105.933594,-51.794922]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[100.322266,-53.697266],[100.390137,-53.690918],[100.458008,-53.68457],[100.59375,-53.671875],[100.976563,-53.640625],[101.273438,-53.671875],[101.609375,-53.546875],[101.898438,-53.375],[102.109375,-53.367187],[102.367188,-53.433593],[102.625,-53.5],[102.90625,-53.476562],[103.1875,-53.453125],[103.546875,-53.359375],[103.84375,-53.09375],[104.085938,-52.960937],[104.421875,-52.78125],[104.59375,-52.46875],[104.703125,-52.265625],[104.84375,-52.09375],[104.933594,-52.035156],[104.978516,-52.005859],[105.000977,-51.991211],[105.023438,-51.976562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[103.1875,-55.328125],[103.117188,-55.101562],[102.945313,-54.890625],[102.898438,-54.6875],[103.015625,-54.390625],[103.09375,-54.1875],[103.101563,-53.921875],[103.140625,-53.734375],[103.328125,-53.46875],[103.570313,-53.34375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[104.828125,-54.695312],[104.851563,-54.429687],[104.796875,-54.117187],[104.773438,-53.90625],[104.828125,-53.734375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[102.322266,-57.238281],[102.395996,-57.227539],[102.469727,-57.216797],[102.617188,-57.195312],[102.710938,-57.007812],[102.757813,-56.71875],[102.679688,-56.476562],[102.616211,-56.421875],[102.552734,-56.367187],[102.506348,-56.324219],[102.459961,-56.28125],[102.367188,-56.195312],[102.1875,-55.953125],[102.070313,-55.703125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[102.961914,-55.907227],[102.972595,-55.920349],[102.983276,-55.933472],[103.004639,-55.959717],[103.047364,-56.012207],[103.132813,-56.117187],[103.195313,-56.453125],[103.203125,-56.75],[103.195313,-57.0625],[103.257813,-57.382812],[103.328125,-57.578125],[103.414063,-57.75]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[105.546875,-57.515625],[105.617188,-57.433594],[105.6875,-57.351562],[105.828125,-57.1875],[105.945313,-56.90625],[105.929688,-56.632812],[106,-56.382812],[106.132813,-56.210937],[106.171875,-55.898437],[106.351563,-55.765625],[106.53125,-55.59375],[106.898438,-55.453125],[107.047852,-55.378906],[107.122559,-55.341797],[107.197266,-55.304687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[106,-54.59375],[106.070313,-54.527343],[106.140625,-54.460937],[106.390625,-54.226562],[106.601563,-54.015625],[106.652344,-53.945312],[106.677735,-53.910156],[106.703125,-53.875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[106.703125,-53.875],[106.693359,-53.833008],[106.683594,-53.791015],[106.664063,-53.707031],[106.625,-53.539062],[106.523438,-53.140625],[106.390625,-52.757812],[106.242188,-52.46875],[106.046875,-52.085937],[105.992188,-51.941406],[105.964844,-51.86914],[105.951172,-51.833008],[105.9375,-51.796875],[105.941406,-51.736328],[105.945313,-51.675781],[105.953125,-51.554687],[106.023438,-51.445312],[106.242188,-51.375],[106.476563,-51.359375],[106.796875,-51.320312],[107.085938,-51.265625],[107.175782,-51.273437],[107.220703,-51.277344],[107.265625,-51.28125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[108.164063,-54.613281],[108.083008,-54.564453],[108.001953,-54.515625],[107.863282,-54.4375],[107.72461,-54.359375],[107.655274,-54.320312],[107.585938,-54.28125],[107.503907,-54.240234],[107.421876,-54.199218],[107.257813,-54.117187],[107,-54],[106.851563,-53.938476],[106.777344,-53.907715],[106.703125,-53.876953]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[108.882813,-54.554687],[108.853516,-54.498046],[108.824219,-54.441406],[108.765625,-54.328125],[108.515625,-54.15625],[108.1875,-53.960937],[108.023438,-53.820312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[107.585938,-54.28125],[107.625001,-54.230469],[107.664063,-54.179687],[107.742188,-54.078125],[108.021484,-53.820312],[108.179688,-53.5625],[108.210938,-53.273437],[108.039063,-52.90625],[107.796875,-52.601562],[107.59375,-52.257812],[107.445313,-51.992187],[107.359375,-51.671875],[107.3125,-51.476562],[107.289063,-51.378906],[107.277344,-51.330078],[107.265625,-51.28125],[107.254883,-51.245117],[107.244141,-51.208984],[107.222657,-51.136718],[107.179688,-50.992187],[107.141602,-50.870117],[107.122559,-50.809082],[107.113037,-50.778564],[107.103516,-50.748047],[107.094482,-50.708252],[107.085449,-50.668457],[107.067383,-50.588867],[107.03125,-50.429687],[107.029297,-50.363281],[107.027344,-50.296875],[107.024414,-50.253906],[107.021484,-50.210937],[107.015625,-50.125],[107.109375,-49.890625],[107.304688,-49.816406],[107.402344,-49.779297],[107.451172,-49.760742],[107.5,-49.742187],[107.528931,-49.734863],[107.557861,-49.727539],[107.615723,-49.712891],[107.731445,-49.683594],[107.847168,-49.654297],[107.905029,-49.639648],[107.962891,-49.625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[107.101563,-50.75],[107.144532,-50.735351],[107.187501,-50.720703],[107.273438,-50.691406],[107.445313,-50.632812],[107.71875,-50.3125],[107.859375,-49.90625],[107.910157,-49.765625],[107.935547,-49.695312],[107.960938,-49.625],[107.966797,-49.558594],[107.972657,-49.492187],[107.984375,-49.359375],[107.945313,-49.054687],[107.8125,-48.828125],[107.8125,-48.779297],[107.8125,-48.730468],[107.8125,-48.68164],[107.8125,-48.632812],[107.96875,-48.453125],[108.226563,-48.296875],[108.351563,-48.171875],[108.59375,-48.070312],[108.882813,-47.921875],[109.015625,-47.726562],[109.082031,-47.643554],[109.115234,-47.601562],[109.131836,-47.581055],[109.148438,-47.560547]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[109.148438,-47.5625],[109.174805,-47.551758],[109.201172,-47.541015],[109.253907,-47.519531],[109.359375,-47.476562],[109.75,-47.429687],[110.007813,-47.265625],[110.335938,-47.117187],[110.625,-46.890625],[110.695313,-46.554687],[110.750001,-46.496093],[110.777344,-46.466797],[110.791016,-46.452148],[110.804688,-46.4375],[110.830079,-46.44043],[110.855469,-46.443359],[110.906251,-46.449218],[111.007813,-46.460937],[111.226563,-46.499999],[111.445313,-46.539062],[112.023438,-46.585937],[112.429688,-46.59375],[113.039063,-46.59375],[113.289063,-46.46875],[113.65625,-46.34375],[113.953125,-46.164062],[114.304688,-45.90625],[114.554688,-45.773437],[114.714844,-45.667968],[114.794922,-45.615234],[114.875,-45.5625],[114.935547,-45.52539],[114.996094,-45.488281],[115.117188,-45.414062],[115.585938,-45.125],[115.960938,-44.945312],[116.164063,-44.882812],[116.484375,-45.023437],[116.84375,-45.046875],[117.140625,-44.984375],[117.390625,-44.960937],[117.703125,-45.023437],[118.1875,-44.953125],[118.4375,-44.9375],[118.710938,-44.890625],[119.023438,-44.8125],[119.304688,-44.539062],[119.390625,-44.304687],[119.460938,-44.085937],[119.679688,-43.757812],[119.796875,-43.476562],[119.828125,-43.171875],[119.820313,-42.945312],[119.914063,-42.773437],[120.078125,-42.585937],[120.335938,-42.5],[120.601563,-42.382812],[120.828125,-42.265625],[120.976563,-42.1875],[121.135742,-42.037109],[121.215332,-41.961914],[121.255127,-41.924316],[121.294922,-41.886719],[121.370117,-41.841797],[121.445313,-41.796875],[121.695313,-41.679687],[121.84375,-41.53125],[121.953125,-41.503906],[122.007813,-41.490234],[122.0625,-41.476562],[122.099609,-41.493164],[122.136719,-41.509765],[122.210938,-41.542968],[122.359375,-41.609375],[122.640625,-41.75],[122.90625,-41.945312],[123.195313,-42.1875],[123.304688,-42.328125],[123.476563,-42.53125],[123.570313,-42.851562],[123.554688,-43.140625],[123.53125,-43.445312],[123.484375,-43.640625],[123.507813,-43.976562],[123.578125,-44.273437],[123.640625,-44.5625],[123.710938,-44.867187],[123.707032,-44.992187],[123.705078,-45.054687],[123.703125,-45.117187],[123.689453,-45.158203],[123.675782,-45.199218],[123.648438,-45.28125],[123.539063,-45.59375],[123.445313,-45.8125],[123.398438,-46.234375],[123.40625,-46.53125],[123.398438,-46.804687],[123.445313,-47.03125],[123.468751,-47.164062],[123.480469,-47.230469],[123.486329,-47.263672],[123.492188,-47.296875],[123.513672,-47.345703],[123.535157,-47.394531],[123.578125,-47.492187],[123.71875,-47.765625],[123.835938,-47.859375],[123.894531,-47.90625],[123.923828,-47.929687],[123.953125,-47.953125],[123.995117,-47.97168],[124.03711,-47.990234],[124.121094,-48.027343],[124.289063,-48.101562],[124.484375,-48.257812],[124.734375,-48.46875],[124.796875,-48.757812],[124.867188,-48.921875],[124.890625,-49.226562],[124.960938,-49.523437],[125.007813,-49.789062],[125.015625,-50.085937],[124.984375,-50.421875],[124.945313,-50.574218],[124.925781,-50.65039],[124.916016,-50.688476],[124.911133,-50.707519],[124.90625,-50.726562],[124.90332,-50.745605],[124.900391,-50.764648],[124.894531,-50.802734],[124.882813,-50.878906],[124.859375,-51.03125],[124.835938,-51.3125],[124.789063,-51.585937],[124.710938,-51.890625],[124.695313,-52.195312],[124.59375,-52.398437],[124.4375,-52.726562],[124.304688,-52.960937],[124.226563,-53.242187],[124.3125,-53.585937],[124.398438,-53.859375],[124.492188,-54.15625],[124.648438,-54.445312],[124.742188,-54.726562],[124.804688,-55.007812],[124.835938,-55.273437],[124.757813,-55.523437],[124.734375,-55.757812],[124.75,-55.976562],[124.84375,-56.34375],[125.335938,-56.578125],[125.648438,-56.734375],[125.921875,-56.921875],[126.085938,-57.15625],[126.097657,-57.304687],[126.103516,-57.378906],[126.109375,-57.453125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[106.976563,-54.78125],[106.994141,-54.845703],[107.011719,-54.910156],[107.046875,-55.039062],[107.171875,-55.195312],[107.183594,-55.249999],[107.195313,-55.304687],[107.230469,-55.374999],[107.265626,-55.445312],[107.335938,-55.585937],[107.46875,-55.828125],[107.65625,-56.046875],[107.84375,-56.179687],[108.070313,-56.28125],[108.414063,-56.351562],[108.601563,-56.484375],[108.765625,-56.671875],[108.851563,-56.820312],[108.859375,-57.0625],[108.929688,-57.257812],[109.046875,-57.4375],[109.132813,-57.648437],[109.153321,-57.827148],[109.163574,-57.916504],[109.173828,-58.005859],[109.188477,-58.077148],[109.203125,-58.148437],[109.351563,-58.4375],[109.40625,-58.765625],[109.4375,-58.976562],[109.5,-59.210937],[109.625,-59.390625],[109.8125,-59.507812],[109.835938,-59.789062],[109.789063,-60.054687],[109.617188,-60.414062],[109.429688,-60.609375],[109.335938,-60.835937],[109.320313,-61.023437],[109.3125,-61.21875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[109.796875,-59.484375],[109.929688,-59.28125],[110.109375,-58.960937],[110.1875,-58.679687],[110.328125,-58.203125],[110.344727,-58.054687],[110.353027,-57.980469],[110.361328,-57.90625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[106.283203,-57.564453],[106.648438,-57.4375],[107.101563,-57.304687],[107.546875,-57.101562],[107.9375,-57.070312],[108.5625,-57.117187],[108.773438,-57.296875],[108.945313,-57.671875],[109.058594,-57.839843],[109.115235,-57.923828],[109.171875,-58.007812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[108.523438,-60.023437],[108.867188,-60.296875],[109.242188,-60.289062],[109.570313,-60.101562],[109.804688,-59.984375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[112.117188,-60.154297],[112.164063,-59.671875],[112.1875,-59.132812],[112.242188,-58.84375],[112.28125,-58.445312],[112.289063,-58.007812],[112.335938,-57.695312],[112.382813,-57.40625],[112.429688,-57.242187],[112.679688,-57.039062],[113.03125,-56.914062],[113.265625,-56.820312],[113.546875,-56.648437],[113.710938,-56.46875],[113.804688,-56.414062],[114.195313,-56.414062],[114.523438,-56.359375],[114.810547,-56.259766]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[107.023438,-50.296875],[106.97461,-50.293945],[106.925782,-50.291015],[106.828126,-50.285156],[106.632813,-50.273437],[106.585938,-50.054687],[106.375001,-50.027343],[106.269532,-50.013672],[106.216797,-50.006836],[106.164063,-50],[106.1792,-49.965332],[106.194336,-49.930664],[106.22461,-49.861328],[106.285157,-49.722656],[106.345703,-49.583984],[106.375977,-49.514648],[106.391113,-49.47998],[106.40625,-49.445312],[106.431641,-49.404296],[106.457031,-49.363281],[106.507813,-49.281249],[106.609375,-49.117187],[106.722656,-48.924804],[106.779297,-48.828613],[106.807617,-48.780518],[106.835938,-48.732422],[106.84668,-48.685791],[106.857422,-48.63916],[106.878906,-48.545898],[106.921875,-48.359375],[107.011719,-48.164062],[107.101563,-47.96875],[107.136719,-47.789062],[107.171875,-47.609375],[107.296875,-47.265625],[107.258789,-47.157227],[107.239746,-47.103027],[107.220703,-47.048828],[107.198975,-46.996826],[107.177246,-46.944824],[107.133789,-46.84082],[107.046875,-46.632812],[106.929688,-46.414062],[106.46875,-46.125],[106.413086,-46.055664],[106.385254,-46.020996],[106.371338,-46.003662],[106.357422,-45.986328],[106.340088,-45.972412],[106.322754,-45.958496],[106.288086,-45.930664],[106.21875,-45.875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[107.5,-49.742187],[107.46875,-49.695312],[107.4375,-49.648437],[107.375,-49.554687],[107.195313,-49.4375],[106.820313,-49.453125],[106.570313,-49.453125],[106.489258,-49.448242],[106.448731,-49.445801],[106.408203,-49.443359]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[106.166016,-50.001953],[106.122803,-49.974365],[106.07959,-49.946777],[105.993164,-49.891602],[105.820313,-49.78125],[105.4375,-49.835937],[105.3125,-49.847656],[105.25,-49.853515],[105.1875,-49.859375],[105.176758,-49.900391],[105.166016,-49.941406],[105.144532,-50.023437],[105.101563,-50.1875],[105.085938,-50.5625],[104.984375,-50.875],[105.3125,-51.070312],[105.421875,-51.171875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[105.189453,-49.861328],[105.171631,-49.80835],[105.153809,-49.755371],[105.118164,-49.649414],[105.046875,-49.4375],[105.210938,-49.34375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[103.054688,-51.867187],[103.052735,-51.80664],[103.050782,-51.746093],[103.046875,-51.625],[102.804688,-51.5],[102.664063,-51.367187],[102.679688,-51.1875],[102.898438,-50.960937],[103.09375,-50.648437],[103.15625,-50.289062],[103.171875,-49.976562],[103.210938,-49.703125],[103.359375,-49.507812],[103.554688,-49.375],[103.757813,-49.242187],[103.820313,-48.921875],[103.914063,-48.664062],[104.109375,-48.507812],[104.1875,-48.179687],[104.273438,-47.992187],[104.232422,-47.861328],[104.211914,-47.795898],[104.191406,-47.730469]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[103.828125,-47.90625],[104.011719,-47.820312],[104.103516,-47.777344],[104.148438,-47.753906],[104.193359,-47.730469],[104.251954,-47.675781],[104.308594,-47.617187],[104.421875,-47.5],[104.898438,-47.242187],[105.265625,-46.945312],[105.507813,-46.65625],[105.820313,-46.453125],[106.109375,-46.289062],[106.320313,-46.078125],[106.339844,-46.03125],[106.34961,-46.007812],[106.359375,-45.984375],[106.389648,-45.970703],[106.419922,-45.957031],[106.480469,-45.929687],[106.601563,-45.875],[106.953125,-45.773437],[107.3125,-45.710937],[107.578125,-45.617187],[107.699219,-45.562499],[107.759766,-45.535156],[107.820313,-45.507812],[107.914063,-45.499999],[108.007813,-45.492187],[108.125,-45.78125],[108.203125,-45.992187],[108.445313,-46.03125],[108.757813,-45.914062],[109.039063,-45.9375],[109.351563,-46.273437],[109.53125,-46.59375],[109.804688,-46.734375],[110.179688,-46.75],[110.375,-46.617187],[110.414063,-46.320312],[110.437989,-46.241699],[110.449951,-46.202392],[110.455933,-46.182739],[110.461914,-46.163086]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[107.816406,-45.505859],[107.850586,-45.441895],[107.884766,-45.37793],[107.953125,-45.25],[108.023438,-44.90625],[107.90625,-44.328125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[106.835938,-48.734375],[106.87793,-48.723633],[106.919922,-48.71289],[107.003907,-48.691406],[107.171875,-48.648437],[107.507813,-48.804687],[107.658203,-48.767578],[107.733399,-48.749023],[107.770996,-48.739746],[107.808594,-48.730469]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[107.21875,-47.046875],[107.263672,-47.078125],[107.308594,-47.109375],[107.398438,-47.171875],[107.578125,-47.296875],[107.929688,-47.328125],[108.242188,-47.53125],[108.617188,-47.625],[109.023438,-47.5625],[109.085449,-47.561523],[109.116455,-47.561035],[109.147461,-47.560547]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[114.873047,-45.560547],[114.904785,-45.611816],[114.936523,-45.663086],[115,-45.765625],[115.179688,-46.101562],[115.390625,-46.453125],[115.695313,-46.554687],[116.0625,-46.617187],[116.46875,-46.65625],[116.84375,-46.6875],[117.164063,-46.8125],[117.429688,-47.109375],[117.617188,-47.351562],[117.78125,-47.539062],[117.816406,-47.705078],[117.833984,-47.788086],[117.851563,-47.871094],[117.882813,-47.96289],[117.914063,-48.054687],[118.234375,-48.1875],[118.578125,-48.125],[118.765625,-48.234375],[118.824219,-48.453125],[118.853516,-48.5625],[118.868165,-48.617187],[118.882813,-48.671875],[118.894532,-48.738281],[118.906251,-48.804687],[118.929688,-48.9375],[118.992188,-49.226562],[119.15625,-49.523437],[119.242188,-49.624999],[119.285156,-49.675781],[119.328125,-49.726562],[119.369141,-49.777343],[119.410157,-49.828124],[119.492188,-49.929687],[119.578125,-50.164062],[119.585938,-50.4375],[119.46875,-50.851562],[119.4375,-51.164062],[119.414063,-51.445312],[119.367188,-51.765625],[119.40625,-52.109375],[119.460938,-52.515625],[119.468751,-52.679687],[119.472656,-52.761719],[119.476563,-52.84375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[119.472656,-52.837891],[119.520508,-52.895996],[119.56836,-52.954101],[119.664063,-53.070312],[119.796875,-53.445312],[119.78125,-53.8125],[119.570313,-54.148437],[119.210938,-54.625],[119.09375,-54.8125],[118.84375,-55.148437],[118.695313,-55.484375],[118.65625,-55.8125],[118.789063,-56.179687],[119.007813,-56.453125],[119.320313,-56.71875],[119.570313,-56.914062],[119.710938,-57.234375],[119.773438,-57.570312],[119.776856,-57.73877],[119.778564,-57.822998],[119.779419,-57.865113],[119.780273,-57.907227]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[118.78125,-55.242187],[118.726563,-55.085937],[118.71875,-54.867187],[118.664063,-54.65625],[118.585938,-54.476562],[118.625,-54.15625],[118.671875,-53.90625],[118.734375,-53.796875],[118.976563,-53.789062],[119.34375,-53.78125],[119.492188,-53.75],[119.664063,-53.703125],[119.765625,-53.734375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[118.609375,-54.359375],[118.765625,-54.414062],[118.921875,-54.46875],[119.125,-54.484375],[119.296875,-54.492187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[118.882813,-48.671875],[118.802734,-48.691406],[118.722656,-48.710937],[118.5625,-48.75],[118.3125,-48.9375],[118.242188,-49.148437],[118.140625,-49.359375],[117.789063,-49.5],[117.492188,-49.59375],[117.179688,-49.664062],[116.929688,-49.75],[116.75,-49.804687],[116.65625,-49.953125],[116.65625,-50.148437],[116.679688,-50.398437],[116.710938,-50.59375],[116.828125,-50.820312],[116.867188,-51.109375],[116.820313,-51.320312],[116.734375,-51.578125],[116.53125,-51.757812],[116.351563,-51.828125],[116.117188,-52.015625],[116.015625,-52.167969],[116,-52.19751],[115.984375,-52.227051]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[112.015625,-54.710937],[112.105469,-54.685547],[112.195313,-54.660156],[112.375,-54.609375],[112.648438,-54.585937],[112.882813,-54.539062],[113.039063,-54.625],[113.257813,-54.6875],[113.398438,-54.734375],[113.578125,-54.703125],[113.6875,-54.523437],[113.741211,-54.430664],[113.768067,-54.384277],[113.794922,-54.337891],[113.812988,-54.288574],[113.831055,-54.239258],[113.867188,-54.140625],[113.96875,-53.9375],[114.054688,-53.765625],[114.226563,-53.625],[114.507813,-53.4375],[114.757813,-53.390625],[115.03125,-53.304687],[115.226563,-53.148437],[115.398438,-52.953125],[115.585938,-52.726562],[115.742188,-52.523437],[115.851563,-52.367187],[115.917969,-52.296874],[115.951172,-52.261718],[115.984375,-52.226562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[115.984375,-52.226562],[115.988281,-52.273437],[115.992188,-52.320312],[116,-52.414062],[115.9375,-52.710937],[115.882813,-52.9375],[115.75,-53.054687],[115.578125,-53.25],[115.414063,-53.421875],[115.289063,-53.5625],[115.117188,-53.84375],[115,-54.03125],[114.953125,-54.1875],[115.039063,-54.382812],[115.125,-54.6875],[115.148438,-54.890625],[115.152344,-55.027344],[115.15625,-55.34375],[115.109375,-55.59375],[115.046875,-55.828125],[114.976563,-56.023437],[114.898438,-56.171875],[114.8125,-56.257812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[117.853516,-47.871094],[117.786621,-47.883789],[117.719727,-47.896484],[117.585938,-47.921875],[117.367188,-48.117187],[117.0625,-48.203125],[116.75,-48.140625],[116.453125,-48.039062],[116.171875,-48.046875],[115.890625,-48.101562],[115.664063,-48.234375],[115.539063,-48.335937],[115.28125,-48.421875],[115.09375,-48.546875],[114.9375,-48.726562],[114.859375,-48.859375],[114.507813,-48.96875],[114.21875,-49.070312],[113.984375,-49.328125],[113.820313,-49.554687],[113.679688,-49.78125],[113.601563,-50.054687],[113.539063,-50.4375],[113.351563,-50.820312],[113.15625,-51.148437],[112.960938,-51.390625],[112.75,-51.601562],[112.421875,-51.703125],[112.109375,-51.789062],[111.84375,-51.859375],[111.617188,-51.914062],[111.539063,-52.148437],[111.71875,-52.515625],[111.992188,-52.726562],[112.304688,-52.90625],[112.75,-53.21875],[112.976563,-53.546875],[113.296875,-53.796875],[113.445313,-54.085937],[113.620117,-54.211914],[113.70752,-54.274902],[113.751221,-54.306396],[113.794922,-54.337891],[113.835205,-54.356201],[113.875488,-54.374512],[113.956055,-54.411133],[114.117188,-54.484375],[114.351563,-54.632812],[114.601563,-54.789062],[114.875,-54.992187],[115.152344,-55.027344],[115.523438,-55.09375],[116.015625,-54.875],[116.414063,-54.523437],[116.6875,-54.132812],[116.898438,-53.796875],[117.117188,-53.539062],[117.367188,-53.195312],[117.539063,-53.054687],[117.835938,-52.851562],[118.117188,-52.703125],[118.453125,-52.726562],[118.828125,-52.734375],[119.1875,-52.78125],[119.330078,-52.8125],[119.401367,-52.828125],[119.472656,-52.84375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[110.803711,-46.438477],[110.790833,-46.429138],[110.777954,-46.4198],[110.752197,-46.401123],[110.700684,-46.363769],[110.597657,-46.289062],[110.529297,-46.226562],[110.495118,-46.195312],[110.478028,-46.179687],[110.460938,-46.164062],[110.447266,-46.150878],[110.433594,-46.137695],[110.406251,-46.111328],[110.351563,-46.058593],[110.242188,-45.953125],[109.960938,-45.664062],[109.820313,-45.320312],[109.75,-45.015625],[109.65625,-44.640625],[109.675782,-44.550781],[109.695313,-44.460937],[109.726563,-44.388671],[109.757813,-44.316406],[109.820313,-44.171875],[109.945313,-43.929687],[110.070313,-43.726562],[110.40625,-43.617187],[110.765625,-43.507812],[111.101563,-43.414062],[111.507813,-43.359375],[111.796875,-43.359375],[112,-43.429687],[112.257813,-43.484375],[112.53125,-43.492187],[112.773438,-43.617187],[113.046875,-43.671875],[113.28125,-43.609375],[113.65625,-43.53125],[113.8125,-43.515625],[114.046875,-43.492187],[114.320313,-43.375],[114.570313,-43.273437],[114.636719,-43.234374],[114.703125,-43.195312],[114.796875,-43.132812],[114.890625,-43.070312],[115.21875,-42.890625],[115.539063,-42.703125],[115.898438,-42.5625],[116.042969,-42.523437],[116.115235,-42.503906],[116.1875,-42.484375],[116.246094,-42.464844],[116.304688,-42.445312],[116.421875,-42.40625],[116.613282,-42.34375],[116.804688,-42.28125],[117.003907,-42.285156],[117.203125,-42.289062],[117.351563,-42.292968],[117.425781,-42.294922],[117.5,-42.296875],[117.564453,-42.322265],[117.628907,-42.347656],[117.757813,-42.398437],[118.070313,-42.445312],[118.34375,-42.695312],[118.609375,-42.851562],[118.820313,-43.125],[118.96875,-43.382812],[119.023438,-43.71875],[118.96875,-43.976562],[118.890625,-44.328125],[118.820313,-44.546875],[118.708984,-44.890625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[119.328125,-49.726562],[119.390625,-49.726562],[119.453125,-49.726562],[119.578125,-49.726562],[119.828125,-49.726562],[120.273438,-49.804687],[121.007813,-49.890625],[121.300782,-49.90625],[121.447266,-49.914062],[121.520508,-49.917969],[121.557129,-49.919922],[121.59375,-49.921875],[121.617188,-49.912598],[121.640625,-49.90332],[121.6875,-49.884765],[121.78125,-49.847656],[121.96875,-49.773437],[122.304688,-49.570312],[122.382813,-49.335937],[122.382813,-49.09375],[122.507813,-48.875],[122.726563,-48.75],[123.039063,-48.601562],[123.539063,-48.398437],[123.835938,-48.265625],[123.893555,-48.109375],[123.922363,-48.03125],[123.936768,-47.992187],[123.951172,-47.953125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[121.59375,-49.920898],[121.59668,-49.943481],[121.59961,-49.966064],[121.605469,-50.01123],[121.617188,-50.101562],[121.789063,-50.265625],[122.109375,-50.3125],[122.351563,-50.398437],[122.546875,-50.625],[122.695313,-50.84375],[123.023438,-50.867187],[123.304688,-50.648437],[123.492188,-50.523437],[123.632813,-50.421875],[123.890625,-50.484375],[124.15625,-50.539062],[124.421875,-50.671875],[124.695313,-50.742187],[124.80127,-50.733886],[124.854248,-50.729736],[124.880737,-50.727661],[124.907227,-50.725586]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[118.070313,-42.447266],[118.226563,-42.226562],[118.277344,-42.054687],[118.302735,-41.968749],[118.328125,-41.882812],[118.339844,-41.802734],[118.351563,-41.722656],[118.375,-41.5625],[118.625,-41.375],[118.875,-41.4375],[119.078125,-41.671875],[119.382813,-41.765625],[119.609375,-41.929687],[119.960938,-41.992187],[120.476563,-41.976562],[120.953125,-41.945312],[121.125,-41.917968],[121.210938,-41.904297],[121.253906,-41.897461],[121.296875,-41.890625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[117.498047,-42.296875],[117.521973,-42.249023],[117.545899,-42.201172],[117.593751,-42.105468],[117.644532,-42.017578],[117.695313,-41.929687],[117.679688,-41.808593],[117.664063,-41.6875],[117.492188,-41.453125],[117.414063,-41.394531],[117.34375,-41.341797],[117.265625,-41.273437],[117.054688,-41.03125],[116.90625,-40.882812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[117.697266,-41.929687],[117.801758,-41.917969],[117.90625,-41.90625],[118.195313,-41.859375],[118.260742,-41.871094],[118.326172,-41.882812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[109.697266,-44.458984],[109.645996,-44.412598],[109.594727,-44.366211],[109.492188,-44.273437],[109.460938,-43.890625],[109.398438,-43.53125],[109.390625,-43.234375],[109.40625,-43.082031],[109.421875,-42.929687],[109.46875,-42.796875],[109.410157,-42.6875],[109.351563,-42.578125],[109.351563,-42.398437],[109.359375,-42.289062],[109.423828,-42.234374],[109.488282,-42.179687],[109.552735,-42.124999],[109.617188,-42.070312],[109.576172,-42.063477],[109.535156,-42.056641],[109.494141,-42.049805],[109.453125,-42.042969],[109.412109,-42.036133],[109.371094,-42.029297],[109.313477,-42.02832],[109.289063,-42.015625],[109.320313,-41.995117],[109.362305,-41.994141],[109.398438,-41.989258],[109.433594,-41.988281],[109.464844,-41.991211],[109.5,-41.986328],[109.535156,-41.981445],[109.570313,-41.976562],[109.605469,-41.97168],[109.640625,-41.966797],[109.675781,-41.961914],[109.710938,-41.957031],[109.746094,-41.952148],[109.78125,-41.947266],[109.815674,-41.944824],[109.850098,-41.942383],[109.859863,-41.916016],[109.825684,-41.898926],[109.768555,-41.891113],[109.716309,-41.882324],[109.675293,-41.881348],[109.628418,-41.875977],[109.584961,-41.87207],[109.540039,-41.875],[109.494141,-41.874023],[109.456543,-41.874023],[109.407715,-41.875],[109.361328,-41.87207],[109.319824,-41.875488],[109.268555,-41.880859],[109.187012,-41.882812],[109.138184,-41.866211],[109.132813,-41.8125],[109.15918,-41.792969],[109.203125,-41.790039],[109.243164,-41.791016],[109.27832,-41.787109],[109.313477,-41.783203],[109.349609,-41.777344],[109.385742,-41.771484],[109.421875,-41.765625],[109.475586,-41.755859],[109.529297,-41.746094],[109.583008,-41.736328],[109.636719,-41.726562],[109.851563,-41.6875],[110.132813,-41.601562],[110.390625,-41.453125],[110.578125,-41.179687],[110.742188,-40.984375],[111.03125,-40.578125],[111.070313,-40.382812],[111.210938,-40.101562],[111.266602,-40.035156],[111.322266,-39.96875],[111.237793,-39.943359],[111.15332,-39.917968],[110.984375,-39.867187],[110.53125,-39.757812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[111.029297,-40.578125],[111.078125,-40.875],[111.195313,-41.03125],[111.484375,-41.039062],[111.601563,-41.125],[111.5625,-41.359375],[111.625,-41.539062],[111.78125,-41.703125],[111.953125,-41.96875],[112.210938,-42.242187],[112.625,-42.476562],[112.960938,-42.59375],[113.34375,-42.828125],[113.742188,-42.9375],[114.15625,-43.046875],[114.460938,-43.148437],[114.581055,-43.170898],[114.701172,-43.193359]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[111.320313,-39.96875],[111.376954,-39.941406],[111.433594,-39.914062],[111.546875,-39.859375],[111.828125,-39.828125],[112.179688,-39.890625],[112.632813,-40.015625],[112.984375,-40.117187],[113.1875,-40.25],[113.484375,-40.335937],[113.65625,-40.46875],[113.804688,-40.640625],[114.046875,-40.734375],[114.492188,-40.757812],[114.75,-40.914062],[114.960938,-40.953125],[115.328125,-40.976562],[115.492188,-41.109375],[115.710938,-41.328125],[115.960938,-41.484375],[116.136719,-41.5625],[116.3125,-41.640625],[116.416016,-41.640625],[116.493164,-41.660156],[116.570313,-41.679687],[116.777344,-41.644531],[116.984375,-41.609375],[117.210938,-41.445312],[117.277344,-41.394531],[117.34375,-41.34375],[117.410157,-41.273437],[117.476563,-41.203125],[117.75,-40.953125],[117.882813,-40.804687],[117.992188,-40.476562],[117.945313,-40.25],[117.828125,-40.085937],[117.679688,-39.992187],[117.53125,-39.851562],[117.507813,-39.617187],[117.445313,-39.421875],[117.3125,-39.296875],[117.203125,-39.171875],[117.164063,-38.96875],[116.960938,-38.90625],[116.789063,-39.03125],[116.695313,-39.140625],[116.539063,-39.289062],[116.359375,-39.40625],[116.203125,-39.554687],[116.085938,-39.648437],[115.875,-39.789062],[115.664063,-39.9375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[116.875,-38.90625],[116.773438,-38.828125],[116.601563,-38.703125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[116.164063,-39.570312],[116.039063,-39.46875],[115.921875,-39.335937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[116.1875,-42.486328],[116.199219,-42.418945],[116.210938,-42.351562],[116.359375,-42.101562],[116.414063,-41.835937],[116.414063,-41.738281],[116.414063,-41.640625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[122.060547,-41.478516],[122.01416,-41.425293],[121.967773,-41.37207],[121.875,-41.265625],[121.710938,-40.992187],[121.617188,-40.835937],[121.597657,-40.722656],[121.587891,-40.666015],[121.578125,-40.609375],[121.566406,-40.550781],[121.554688,-40.492187],[121.53125,-40.375],[121.4375,-40.09375],[121.367188,-39.78125],[121.257813,-39.421875],[121.179688,-39.132812],[121.085938,-38.882812],[120.914063,-38.585937],[120.851563,-38.398437],[120.84375,-38.164062],[120.9375,-37.96875],[120.984375,-37.796875],[120.914063,-37.546875],[120.921875,-37.265625],[120.929688,-37.03125],[121.03125,-36.820312],[121.125,-36.546875],[121.210938,-36.296875],[121.242188,-35.992187],[121.25,-35.765625],[121.210938,-35.5625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[121.580078,-40.609375],[121.623779,-40.595703],[121.667481,-40.582031],[121.754883,-40.554687],[121.929688,-40.5],[122.171875,-40.515625],[122.546875,-40.546875],[122.828125,-40.476562],[123.132813,-40.421875],[123.414063,-40.492187],[123.679688,-40.53125],[123.976563,-40.476562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[123.703125,-45.123047],[123.722656,-45.16626],[123.742188,-45.209473],[123.78125,-45.295898],[123.859375,-45.46875],[124.054688,-45.648437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[123.494141,-47.296875],[123.529053,-47.291016],[123.563965,-47.285156],[123.633789,-47.273437],[123.773438,-47.25],[124.117188,-47.164062],[124.21875,-47.15625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[117.821289,-59.321289],[117.865967,-59.379638],[117.910644,-59.437988],[118,-59.554687],[118.035157,-59.614257],[118.070313,-59.673828],[118.058594,-59.73584],[118.046876,-59.797851],[118.023438,-59.921875],[118.070313,-60.21875],[118.171875,-60.476562],[118.25,-60.710937],[118.277344,-60.777343],[118.304688,-60.84375],[118.31836,-60.885742],[118.332032,-60.927734],[118.359376,-61.011718],[118.414063,-61.179687],[118.359375,-61.460937],[118.242188,-61.78125],[118.164063,-62.046875],[118.007813,-62.328125],[117.890625,-62.539062],[117.84375,-62.8125],[117.851563,-63.023437],[117.960938,-63.234375],[118.109375,-63.390625],[118.445313,-63.523437],[118.640625,-63.554687],[118.867188,-63.710937],[119.171875,-64],[119.398438,-64.226562],[119.617188,-64.5],[119.8125,-64.695312],[119.984375,-64.890625],[120.140625,-65.125],[120.179688,-65.460937],[120.171875,-65.8125],[120.257813,-66.054687],[120.398438,-66.3125],[120.578125,-66.570312],[120.710938,-66.757812],[120.867188,-66.914062],[120.914063,-67.171875],[121.007813,-67.40625],[121.257813,-67.59375],[121.364258,-67.62207],[121.417481,-67.63623],[121.470703,-67.650391]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[118.070313,-59.671875],[118.109376,-59.708984],[118.148438,-59.746093],[118.226563,-59.820312],[118.515625,-59.835937],[118.851563,-59.828125],[118.980469,-59.847656],[119.044922,-59.857421],[119.077148,-59.862304],[119.109375,-59.867187],[119.169922,-59.86914],[119.230469,-59.871093],[119.351563,-59.875],[119.765625,-59.929687],[120.117188,-59.984375],[120.359375,-59.929687],[120.632813,-59.867187],[121.046875,-59.796875],[121.234375,-59.835937],[121.515625,-60.023437],[121.820313,-60.320312],[121.992188,-60.5625],[122.109375,-60.804687],[122.171875,-61.023437],[122.226563,-61.304687],[122.203125,-61.640625],[122.234375,-61.898437],[122.367188,-62.15625],[122.664063,-62.34375],[122.945313,-62.476562],[123.25,-62.742187],[123.34375,-62.976562],[123.476563,-63.234375],[123.585938,-63.523437],[123.632813,-63.9375],[123.625,-64.21875],[123.570313,-64.53125],[123.429688,-64.804687],[123.394532,-64.914062],[123.359375,-65.023437],[123.265625,-65.136718],[123.171875,-65.25],[123.097657,-65.335937],[123.023438,-65.421875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[118.304688,-60.84375],[118.326172,-60.767578],[118.347657,-60.691406],[118.390625,-60.539062],[118.583984,-60.320312],[118.8125,-60.179687],[119,-59.984375],[119.054688,-59.925781],[119.082031,-59.896484],[119.109375,-59.867187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[123.359375,-65.023437],[123.365235,-65.148437],[123.371094,-65.273437],[123.376954,-65.398437],[123.382813,-65.523437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[139.515625,-50.296875],[139.558594,-50.303711],[139.601563,-50.310547],[139.6875,-50.324218],[139.859375,-50.351562],[140.21875,-50.429687],[140.382813,-50.578125],[140.554688,-50.828125],[140.796875,-51.078125],[140.960938,-51.28125],[141.039063,-51.453125],[141.078125,-51.65625],[141.054688,-52.070312],[141.09375,-52.28125],[141.117188,-52.570312],[141.179688,-52.804687],[141.226563,-53.09375],[141.351563,-53.179687],[141.421875,-53.023437],[141.421875,-52.851562],[141.53125,-52.734375],[141.71875,-52.523437],[142.023438,-52.460937],[142.390625,-52.492187],[142.585938,-52.5],[142.757813,-52.65625],[142.859375,-52.890625],[143.007813,-52.984375],[143.273438,-53.070312],[143.476563,-53.25],[143.554688,-53.46875],[143.601563,-53.65625],[143.648438,-53.890625],[143.648438,-54.09375],[143.789063,-54.125],[143.9375,-53.914062],[144.09375,-53.6875],[144.328125,-53.492187],[144.625,-53.398437],[144.867188,-53.40625],[145.046875,-53.640625],[145.328125,-53.890625],[145.5625,-54.101562],[145.898438,-54.242187],[146.125,-54.21875],[146.199219,-54.199219],[146.236328,-54.189453],[146.273438,-54.179687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[153.554688,-61.976562],[153.476563,-61.71875],[153.382813,-61.539062],[153.273438,-61.328125],[153.1875,-61.078125],[153.167969,-60.917968],[153.158204,-60.83789],[153.153321,-60.797851],[153.148438,-60.757812],[153.145508,-60.713867],[153.142579,-60.669921],[153.136719,-60.582031],[153.125,-60.40625],[153.070313,-60.085937],[153.054688,-59.8125],[152.976563,-59.5625],[152.906251,-59.460937],[152.871094,-59.410156],[152.853516,-59.384766],[152.835938,-59.359375],[152.786133,-59.333008],[152.736329,-59.30664],[152.636719,-59.253906],[152.4375,-59.148437],[152.125,-58.984375],[151.851563,-58.84375],[151.65625,-58.65625],[151.46875,-58.40625],[151.398438,-58.195312],[151.375001,-58.097656],[151.363282,-58.048828],[151.351563,-58],[151.35254,-57.959961],[151.353516,-57.919922],[151.355469,-57.839843],[151.359375,-57.679687],[151.4375,-57.453125],[151.578125,-57.078125],[151.617188,-56.882812],[151.65625,-56.632812],[151.644532,-56.503906],[151.638672,-56.439453],[151.632813,-56.375],[151.618165,-56.324219],[151.603516,-56.273437],[151.574219,-56.171875],[151.515625,-55.96875],[151.453125,-55.664062],[151.417969,-55.542968],[151.400391,-55.482422],[151.382813,-55.421875],[151.382813,-55.363281],[151.382813,-55.304687],[151.382813,-55.1875],[151.421876,-55.074218],[151.441407,-55.017578],[151.460938,-54.960937],[151.513672,-54.953124],[151.566407,-54.945312],[151.671875,-54.929687],[151.921875,-54.976562],[152.203125,-54.976562],[152.359375,-54.859375],[152.53125,-54.632812],[152.828125,-54.515625],[153.15625,-54.320312],[153.382813,-54.140625],[153.640625,-53.914062],[153.84375,-53.773437],[154.053711,-53.795898],[154.158691,-53.807129],[154.211182,-53.812744],[154.263672,-53.818359],[154.318848,-53.793457],[154.374023,-53.768555],[154.484375,-53.71875],[154.742188,-53.695312],[154.953125,-53.78125],[155.140625,-53.765625],[155.25,-53.660156],[155.304688,-53.607421],[155.332031,-53.581054],[155.359375,-53.554687],[155.380859,-53.509765],[155.402344,-53.464843],[155.445313,-53.374999],[155.53125,-53.195312],[155.550781,-53.070312],[155.560547,-53.007812],[155.570313,-52.945312],[155.550781,-52.861328],[155.53125,-52.777344],[155.492188,-52.609375],[155.5,-52.3125],[155.523438,-51.96875],[155.589844,-51.890625],[155.623047,-51.851562],[155.65625,-51.8125],[155.68457,-51.780273],[155.712891,-51.748047],[155.769532,-51.683593],[155.882813,-51.554687],[155.992188,-51.398437],[156.000977,-51.3125],[156.009766,-51.226562],[156.012695,-51.171875],[156.015625,-51.117187],[155.921875,-50.726562],[155.757813,-50.5],[155.65625,-50.234375],[155.476563,-49.765625],[155.367188,-49.453125],[155.300782,-49.300781],[155.267578,-49.224609],[155.234375,-49.148437],[155.214844,-49.072265],[155.195313,-48.996093],[155.15625,-48.84375],[155.023438,-48.554687],[154.789063,-48.210937],[154.679688,-47.898437],[154.6875,-47.585937],[154.713867,-47.433593],[154.736328,-47.324219],[154.740234,-47.28125],[154.762939,-47.234375],[154.785645,-47.1875],[154.831055,-47.09375],[154.921875,-46.90625],[154.875,-46.617187],[154.96875,-46.320312],[155.054688,-46.046875],[155.1875,-45.757812],[155.40625,-45.390625],[155.59375,-45.085937],[155.890625,-44.742187],[156.09375,-44.539062],[156.367188,-44.328125],[156.46875,-44.070312],[156.648438,-43.601562],[156.773438,-43.257812],[156.898438,-42.898437],[157,-42.523437],[157.101563,-42.273437],[157.25,-41.914062],[157.507813,-41.710937],[157.796875,-41.515625],[158.007813,-41.382812],[158.082032,-41.300781],[158.15625,-41.21875],[158.066407,-41.171875],[157.976563,-41.125],[157.664063,-41.023437],[157.398438,-41.117187],[157.085938,-41.21875],[156.835938,-41.34375],[156.609375,-41.46875],[156.359375,-41.5625],[156.195313,-41.507812],[156.125,-41.359375],[156.257813,-41.140625],[156.3125,-40.96875],[156.273438,-40.65625],[156.132813,-40.492187],[156.007813,-40.486328],[155.945313,-40.483398],[155.882813,-40.480469],[155.853516,-40.512207],[155.824219,-40.543945],[155.765625,-40.607422],[155.648438,-40.734375],[155.5,-40.9375],[155.441406,-40.996094],[155.382813,-41.054687],[155.324219,-41.113281],[155.265625,-41.171875],[155.03125,-41.375],[154.835938,-41.390625],[154.761719,-41.421875],[154.6875,-41.453125],[154.654297,-41.511719],[154.621094,-41.570312],[154.554688,-41.6875],[154.511719,-41.757812],[154.474609,-41.828125],[154.461914,-41.875],[154.455078,-41.921875],[154.441407,-42.015625],[154.414063,-42.203125],[154.304688,-42.421875],[154.140625,-42.578125],[153.953125,-42.804687],[153.90625,-42.886718],[153.882813,-42.927734],[153.859375,-42.96875],[153.829102,-43.009766],[153.798828,-43.050781],[153.738282,-43.132812],[153.617188,-43.296875],[153.476563,-43.570312],[153.360352,-43.625],[153.302246,-43.652344],[153.244141,-43.679687],[153.175293,-43.654297],[153.106445,-43.628906],[152.96875,-43.578125],[152.90625,-43.375],[152.773438,-43.179687],[152.359375,-43.148437],[152.046875,-43.148437],[151.734375,-43.140625],[151.658203,-43.111328],[151.620117,-43.096679],[151.601074,-43.089355],[151.582032,-43.082031],[151.562989,-43.074707],[151.543946,-43.067382],[151.50586,-43.052734],[151.429688,-43.023437],[151.226563,-42.867187],[151.054688,-42.648437],[150.789063,-42.492187],[150.734375,-42.15625],[150.609375,-41.929687],[150.375,-41.796875],[150.158203,-41.791016],[150.049805,-41.788086],[149.941406,-41.785156]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[153.148438,-60.757812],[153.183594,-60.731445],[153.21875,-60.705078],[153.289063,-60.652344],[153.429688,-60.546875],[153.71875,-60.335937],[153.890625,-60.164062],[154.023438,-59.96875],[154.046875,-59.632812],[154.101563,-59.359375],[154.226563,-59.164062],[154.429688,-58.992187],[154.671875,-58.898437],[154.789063,-58.835937],[154.9375,-58.710937],[155.25,-58.484375],[155.460938,-58.304687],[155.585938,-58.117187],[155.546875,-57.929687],[155.515625,-57.65625],[155.671875,-57.476562],[155.929688,-57.523437],[156.117188,-57.65625],[156.34375,-57.648437],[156.460938,-57.539062],[156.585938,-57.382812],[156.645508,-57.269531],[156.675293,-57.21289],[156.705078,-57.15625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[151.632813,-56.373047],[151.691406,-56.350098],[151.75,-56.327148],[151.867188,-56.28125],[152.046875,-56.132812],[152.296875,-55.96875],[152.453125,-55.8125],[152.734375,-55.773437],[152.9375,-55.882812],[153.140625,-56.09375],[153.367188,-56.242187],[153.601563,-56.265625],[153.984375,-56.210937],[154.289063,-56.3125],[154.347657,-56.335937],[154.406251,-56.359375],[154.464844,-56.382812],[154.523438,-56.40625],[154.734375,-56.578125],[155.179688,-56.773437],[155.5,-56.898437],[155.835938,-56.914062],[156.078125,-57.023437],[156.585938,-57.054687],[156.644532,-57.105468],[156.673828,-57.130859],[156.703125,-57.15625],[156.759766,-57.162109],[156.816407,-57.167968],[156.929688,-57.179687],[157.304688,-57.203125],[157.523438,-57.125],[157.570313,-56.890625],[157.578125,-56.710937],[157.4375,-56.40625],[157.289063,-56.007812],[157.257813,-55.773437],[157.25,-55.421875],[157.257813,-55.125],[157.289063,-54.960937],[157.285157,-54.785156],[157.283203,-54.697265],[157.28125,-54.609375],[157.242188,-54.571289],[157.203125,-54.533203],[157.125,-54.457031],[157.046875,-54.380859],[157.007813,-54.342773],[156.96875,-54.304687],[156.94336,-54.253906],[156.917969,-54.203124],[156.867188,-54.101562],[156.843751,-54.035156],[156.820313,-53.972656],[156.773438,-53.920898],[156.726563,-53.869141],[156.632813,-53.765625],[156.351563,-53.640625],[156.078125,-53.484375],[155.84375,-53.21875],[155.695313,-53.070312],[155.632813,-53.007812],[155.570313,-52.945312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[157.28125,-54.607422],[157.322266,-54.582519],[157.363282,-54.557617],[157.445313,-54.507812],[157.679688,-54.515625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[156.970703,-54.306641],[156.966309,-54.362793],[156.961914,-54.418945],[156.953125,-54.53125],[156.882813,-54.757812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[156.820313,-53.972656],[156.838867,-53.934082],[156.857422,-53.895508],[156.894531,-53.818359],[156.96875,-53.664062],[157.101563,-53.367187],[157.179688,-53.101562],[157.15625,-52.6875],[157.039063,-52.421875],[157.101563,-52.109375],[157.1875,-51.757812],[157.140625,-51.476562],[156.898438,-51.257812],[156.515625,-51.203125],[156.148438,-51.242187],[156.079102,-51.234375],[156.009766,-51.226562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[155.357422,-53.550781],[155.368408,-53.594238],[155.379395,-53.637695],[155.401367,-53.724609],[155.445313,-53.898437],[155.351563,-54.289062],[155.09375,-54.625],[154.851563,-54.914062],[154.796875,-55.257812],[154.664063,-55.625],[154.523438,-55.953125],[154.429688,-56.203125],[154.417969,-56.282227],[154.40625,-56.361328]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[140.328125,-48.179687],[140.726563,-48.046875],[141.046875,-47.867187],[141.296875,-47.71875],[141.59375,-47.625],[141.945313,-47.679687],[142.367188,-47.726562],[142.695313,-47.585937],[142.921875,-47.359375],[143.164063,-47.21875],[143.617188,-47.140625],[144.109375,-47.085937],[144.195313,-47.083984],[144.238282,-47.083007],[144.28125,-47.082031],[144.31836,-47.096191],[144.355469,-47.110351],[144.429688,-47.138672],[144.578125,-47.195312],[144.773438,-47.429687],[144.734375,-47.695312],[144.5,-47.90625],[144.289063,-48.078125],[144.164063,-48.25],[144.234375,-48.476562],[144.460938,-48.742187],[144.71875,-49.046875],[144.960938,-49.289062],[145.164063,-49.554687],[145.304688,-49.75],[145.460938,-50.070312],[145.46875,-50.296875],[145.523438,-50.640625],[145.632813,-50.867187],[145.757813,-51.109375],[145.851563,-51.414062],[145.859375,-51.796875],[145.863282,-51.925781],[145.867188,-52.054687],[145.886719,-52.146484],[145.906251,-52.238281],[145.945313,-52.421875],[146.003907,-52.546875],[146.0625,-52.671875],[146.128906,-52.800781],[146.234375,-53.0625],[146.421875,-53.46875],[146.453125,-53.65625],[146.359375,-53.984375],[146.316407,-54.082031],[146.294922,-54.130859],[146.273438,-54.179687],[146.263184,-54.198242],[146.25293,-54.216796],[146.232422,-54.253906],[146.191407,-54.328124],[146.109375,-54.476562],[146.078125,-54.71875],[146.125,-55.054687],[146.132813,-55.351562],[146.101563,-55.570312],[146.093751,-55.707031],[146.089844,-55.77539],[146.087891,-55.80957],[146.085938,-55.84375],[146.079102,-55.897461],[146.072266,-55.951172],[146.058594,-56.058593],[146.03125,-56.273437],[145.914063,-56.617187],[145.84375,-56.851562],[145.8125,-57.117187],[145.757813,-57.484375],[145.742188,-57.71875],[145.742188,-58.1875],[145.734375,-58.492187],[145.742188,-58.765625],[145.726563,-58.953125],[145.780274,-59.015625],[145.807129,-59.046875],[145.833984,-59.078125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[143.351563,-57.773437],[143.386719,-57.751953],[143.421876,-57.730468],[143.492188,-57.6875],[143.632813,-57.71875],[143.820313,-57.4375],[143.96875,-57.28125],[144.21875,-57.203125],[144.453125,-57.09375],[144.554688,-56.921875],[144.648438,-56.757812],[144.96875,-56.671875],[145.382813,-56.53125],[145.625,-56.359375],[145.773438,-56.101562],[145.921875,-55.960937],[146.003906,-55.902343],[146.044922,-55.873047],[146.085938,-55.84375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[143.617188,-58.820312],[143.650391,-58.825195],[143.683594,-58.830078],[143.750001,-58.839843],[143.882813,-58.859375],[144.125,-58.898437],[144.382813,-59.023437],[144.6875,-59.101562],[145.015625,-59.101562],[145.171875,-59.203125],[145.328125,-59.34375],[145.492188,-59.34375],[145.671875,-59.210937],[145.75293,-59.144531],[145.793457,-59.111328],[145.833984,-59.078125],[145.855957,-59.027344],[145.87793,-58.976562],[145.921875,-58.875],[146.132813,-58.773437],[146.328125,-58.65625],[146.695313,-58.476562],[147.007813,-58.5],[147.234375,-58.632812],[147.53125,-58.789062],[147.71875,-58.851562],[147.898438,-59.046875],[148.046875,-59.296875],[148.164063,-59.476562],[148.195313,-59.703125],[148.335938,-59.9375],[148.59375,-60.132812],[148.851563,-60.273437],[149.117188,-60.265625],[149.429688,-60.164062],[149.71875,-60.070312],[149.785156,-60.035156],[149.851563,-60],[149.898438,-59.982422],[149.945313,-59.964843],[150.039063,-59.929687],[150.101563,-59.800781],[150.132813,-59.736328],[150.148438,-59.704101],[150.164063,-59.671875],[150.153321,-59.629883],[150.142579,-59.58789],[150.121094,-59.503906],[150.078125,-59.335937],[150.046875,-59.0625],[150.109375,-58.796875],[150.34375,-58.546875],[150.546875,-58.367187],[150.828125,-58.171875],[151.023438,-58.101562],[151.1875,-58.050781],[151.269531,-58.02539],[151.310547,-58.012695],[151.351563,-58]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[149.367188,-59.414062],[149.40625,-59.640625],[149.537109,-59.773437],[149.673828,-59.878906],[149.762695,-59.939453],[149.807129,-59.969727],[149.851563,-60]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[150.164063,-59.671875],[150.234375,-59.644531],[150.304688,-59.617187],[150.445313,-59.5625],[150.648438,-59.617187],[150.960938,-59.695312],[151.265625,-59.679687],[151.570313,-59.609375],[151.75,-59.523437],[151.90625,-59.648437],[152.125,-59.671875],[152.289063,-59.578125],[152.484375,-59.421875],[152.679688,-59.429687],[152.757813,-59.394531],[152.796875,-59.376953],[152.835938,-59.359375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[146.125,-52.796875],[146.195313,-52.695312],[146.265625,-52.59375],[146.421875,-52.472656],[146.5,-52.412109],[146.578125,-52.351562],[146.703125,-52.349609],[146.828125,-52.347656],[147.078125,-52.34375],[147.507813,-52.25],[147.671876,-52.171875],[147.753907,-52.132812],[147.835938,-52.09375],[147.951172,-52.052734],[148.066407,-52.011718],[148.296875,-51.929687],[148.671875,-51.929687],[149.039063,-52.101562],[149.421875,-52.296875],[149.59375,-52.320312],[149.679688,-52.332031],[149.722657,-52.33789],[149.765625,-52.34375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[145.863281,-52.054687],[145.950195,-52.097656],[146.03711,-52.140625],[146.210938,-52.226562],[146.394532,-52.287109],[146.486328,-52.317383],[146.578125,-52.347656]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[151.384766,-55.421875],[151.315918,-55.416015],[151.24707,-55.410156],[151.109375,-55.398437],[150.851563,-55.304687],[150.734375,-55.164062],[150.71875,-54.914062],[150.65625,-54.585937],[150.507813,-54.296875],[150.15625,-53.945312],[149.84375,-53.695312],[149.601563,-53.429687],[149.539063,-53.179687],[149.59375,-52.960937],[149.640625,-52.742187],[149.65625,-52.476562],[149.712891,-52.406249],[149.739258,-52.374999],[149.765625,-52.34375],[149.795899,-52.304687],[149.826172,-52.265624],[149.882813,-52.195312],[150.070313,-52.046875],[150.132813,-51.914062],[150.152344,-51.753906],[150.171875,-51.59375],[150.253907,-51.464843],[150.294922,-51.40039],[150.335938,-51.335937],[150.353516,-51.263671],[150.371094,-51.191406],[150.388672,-51.11914],[150.397461,-51.083008],[150.40625,-51.046875],[150.419922,-51.011719],[150.433594,-50.976562],[150.447266,-50.941406],[150.460938,-50.90625],[150.474609,-50.871094],[150.488281,-50.835937],[150.515625,-50.765625],[150.549316,-50.708496],[150.583008,-50.651367],[150.616699,-50.594238],[150.650391,-50.537109],[150.660889,-50.487549],[150.671387,-50.437988],[150.692383,-50.338867],[150.734375,-50.140625],[150.734375,-49.882812],[150.695313,-49.59375],[150.648438,-49.421875],[150.554688,-49.300781],[150.507813,-49.240234],[150.484376,-49.20996],[150.460938,-49.179687],[150.433594,-49.132812],[150.406251,-49.085937],[150.351563,-48.992187],[150.242188,-48.804687],[150.113282,-48.656249],[149.984375,-48.507812],[149.859375,-48.378906],[149.734375,-48.25],[149.578125,-48.078125],[149.480469,-47.964843],[149.431641,-47.908203],[149.407227,-47.879882],[149.382813,-47.851562],[149.345704,-47.823242],[149.308594,-47.794921],[149.234376,-47.738281],[149.085938,-47.625],[148.96875,-47.273437],[148.84375,-46.992187],[148.757813,-46.65625],[148.710938,-46.328125],[148.734375,-46.109375],[148.71875,-45.84375],[148.476563,-45.515625],[148.390625,-45.265625],[148.429688,-44.953125],[148.492188,-44.75],[148.585938,-44.5],[148.726563,-44.25],[148.929688,-44.164062],[149.226563,-44.03125],[149.429688,-43.867187],[149.445313,-43.414062],[149.539063,-43.15625],[149.625,-42.882812],[149.75,-42.5625],[149.851563,-42.320312],[149.882813,-42.085937],[149.91211,-41.935547],[149.941406,-41.785156],[149.914063,-41.617187],[149.96875,-41.390625],[150.109375,-41.210937],[150.265625,-40.867187],[150.304688,-40.718749],[150.34375,-40.570312],[150.324219,-40.425781],[150.304688,-40.28125],[150.140625,-40.039062],[149.882813,-39.679687],[149.5625,-39.390625],[149.320313,-39.125],[149.109375,-38.90625],[148.953125,-38.703125],[148.757813,-38.453125],[148.65625,-38.316406],[148.554688,-38.179687],[148.464844,-38.074219],[148.375,-37.96875],[148.09375,-37.679687],[147.78125,-37.4375],[147.53125,-37.3125],[147.242188,-37.164062],[147.203125,-36.914062],[147.085938,-36.648437],[146.953126,-36.617187],[146.886719,-36.601562],[146.820313,-36.585937],[146.781251,-36.613281],[146.742188,-36.640624],[146.664063,-36.695312],[146.557617,-36.785156],[146.504395,-36.830078],[146.451172,-36.875],[146.39502,-36.876953],[146.338867,-36.878906],[146.226563,-36.882812],[146.007813,-36.945312],[145.796875,-37.140625],[145.726563,-37.523437],[145.5625,-37.796875],[145.453125,-37.9375],[145.390625,-37.964844],[145.328125,-37.992187],[145.265625,-38.019531],[145.203125,-38.046875],[145.085938,-38.035156],[145.027344,-38.029296],[144.96875,-38.023437],[144.921875,-38.001953],[144.875,-37.980468],[144.78125,-37.9375],[144.734375,-37.765625],[144.640625,-37.445312],[144.53125,-37.203125],[144.429688,-36.96875],[144.203125,-36.710937],[144.078125,-36.5],[143.90625,-36.320312],[143.808594,-36.282226],[143.759766,-36.263183],[143.710938,-36.244141],[143.673828,-36.286621],[143.636719,-36.329101],[143.5625,-36.414062],[143.429688,-36.609375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[149.383789,-47.852539],[149.344483,-47.871826],[149.305176,-47.891113],[149.226563,-47.929687],[149.148438,-48.046875],[149.125,-48.195312],[149.257813,-48.3125],[149.382813,-48.445312],[149.414063,-48.585937],[149.53125,-48.75],[149.71875,-48.882812],[149.734375,-49.117187],[149.679688,-49.390625],[149.578125,-49.585937],[149.398438,-49.710937],[149.273438,-49.875],[149.195313,-49.992187],[149.164063,-50.15625],[149.148438,-50.3125],[149.101563,-50.546875],[149.047852,-50.597656],[148.994141,-50.648437],[148.960449,-50.689453],[148.926758,-50.730469],[148.859375,-50.8125],[148.742188,-50.867187],[148.4375,-50.867187],[148.273438,-50.9375],[148.1875,-51.085937],[148.109375,-51.359375],[148.023438,-51.539062],[147.9375,-51.765625],[147.882813,-51.929687],[147.861328,-52.013672],[147.835938,-52.09375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[148.992188,-50.648437],[149.089844,-50.648437],[149.1875,-50.648437],[149.375,-50.734375],[149.75,-50.898437],[149.984375,-50.976562],[150.179688,-51.039062],[150.292969,-51.043945],[150.34961,-51.046387],[150.40625,-51.048828]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[150.492188,-50.976562],[150.523438,-50.99414],[150.554688,-51.011718],[150.567871,-51.018799],[150.581055,-51.025879],[150.599121,-51.036377],[150.617188,-51.046875],[150.66211,-51.050781],[150.707032,-51.054687],[150.751953,-51.058594],[150.796875,-51.0625],[150.837891,-51.042969],[150.878907,-51.023437],[150.919922,-51.003906],[150.960938,-50.984375],[151.007813,-50.953125],[151.054688,-50.921875],[151.101563,-50.890625],[151.148438,-50.859375],[151.210938,-50.847656],[151.273438,-50.835937],[151.312501,-50.789062],[151.351563,-50.742187],[151.390626,-50.695312],[151.410157,-50.671874],[151.429688,-50.648437],[151.449219,-50.618164],[151.468751,-50.58789],[151.507813,-50.527343],[151.546876,-50.466797],[151.585938,-50.40625],[151.667969,-50.28125],[151.75,-50.15625],[151.890625,-49.9375],[152.039063,-49.734375],[152.21875,-49.632812],[152.429688,-49.585937],[152.500977,-49.617187],[152.572266,-49.648437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[151.460938,-54.962891],[151.456055,-54.920898],[151.451172,-54.878906],[151.429688,-54.765625],[151.421875,-54.523437],[151.398438,-54.289062],[151.390625,-53.9375],[151.289063,-53.71875],[151.101563,-53.492187],[151.023438,-53.320312],[151.070313,-53.054687],[150.96875,-52.773437],[150.859375,-52.453125],[150.78125,-52.210937],[150.710938,-52.0625],[150.71875,-51.890625],[150.820313,-51.6875],[150.858399,-51.606445],[150.877442,-51.565918],[150.896484,-51.525391],[150.934082,-51.462402],[150.97168,-51.399414],[151.009277,-51.336425],[151.046875,-51.273437],[151.09375,-51.187499],[151.140625,-51.101562],[151.174316,-51.035644],[151.208008,-50.969726],[151.241699,-50.903808],[151.258545,-50.87085],[151.275391,-50.837891]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[150.132813,-51.914062],[150.251953,-51.957031],[150.375,-52],[150.539063,-52.0625],[150.734375,-52.046875],[150.960938,-51.976562],[151.085938,-51.945312],[151.25,-52.007812],[151.40625,-52.085937],[151.5,-52.085937],[151.71875,-52.25],[151.859375,-52.351562],[151.953125,-52.476562],[151.992188,-52.671875],[152.171875,-52.695312],[152.257813,-52.648437],[152.367188,-52.726562],[152.476563,-52.773437],[152.648438,-52.695312],[152.75,-52.578125],[152.828125,-52.4375],[152.96875,-52.375],[153.101563,-52.40625],[153.226563,-52.492187],[153.28125,-52.664062],[153.351563,-52.851562],[153.492188,-53.03125],[153.710938,-53.070312],[153.835938,-53.164062],[153.890625,-53.328125],[153.851563,-53.445312],[153.921875,-53.601562],[154.0625,-53.648437],[154.21875,-53.71875],[154.242188,-53.769531],[154.265625,-53.820312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[150.898438,-51.523437],[150.863282,-51.488281],[150.828126,-51.453124],[150.757813,-51.382812],[150.660157,-51.347656],[150.5625,-51.3125],[150.503907,-51.285156],[150.445313,-51.257812],[150.460938,-51.199218],[150.476563,-51.140625],[150.519532,-51.097656],[150.5625,-51.054687],[150.572021,-51.040039],[150.581543,-51.025391],[150.590454,-51.01123],[150.599365,-50.99707],[150.617188,-50.968749],[150.644531,-50.925781],[150.671875,-50.882812],[150.701172,-50.845703],[150.730469,-50.808593],[150.759766,-50.771484],[150.789063,-50.734375],[150.847657,-50.714844],[150.906251,-50.695312],[150.964844,-50.675781],[151.023438,-50.65625],[151.082032,-50.65625],[151.140626,-50.65625],[151.199219,-50.65625],[151.228516,-50.65625],[151.257813,-50.65625],[151.294922,-50.65625],[151.332032,-50.65625],[151.380615,-50.652344],[151.404907,-50.650391],[151.429199,-50.648437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[150.648438,-50.539062],[150.705079,-50.550781],[150.761719,-50.562499],[150.875,-50.585937],[150.957032,-50.593749],[151.039063,-50.601562],[151.132813,-50.625],[151.194336,-50.640625],[151.226318,-50.648682],[151.258301,-50.656738]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[153.117188,-52.359375],[153.195313,-52.171875],[153.203125,-52.054687],[153.101563,-51.960937],[153.1875,-51.773437],[153.1875,-51.601562],[153.132813,-51.445312],[153.023438,-51.289062],[153.070313,-51.117187],[152.984375,-50.914062],[152.851563,-50.796875],[152.882813,-50.664062],[152.945313,-50.460937],[152.925782,-50.382812],[152.910156,-50.304687],[152.867188,-50.214843],[152.828125,-50.125],[152.75,-49.9375],[152.679688,-49.765625],[152.625001,-49.707031],[152.570313,-49.648437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[152.910156,-50.304687],[153.132813,-50.289062],[153.273438,-50.460937],[153.445313,-50.570312],[153.679688,-50.601562],[153.800782,-50.589843],[153.861328,-50.583984],[153.921875,-50.578125],[153.97461,-50.542969],[154.027344,-50.507812],[154.132813,-50.4375],[154.296875,-50.367187],[154.421875,-50.226562],[154.5,-50.015625],[154.640625,-49.898437],[154.75,-49.757812],[154.75,-49.507812],[154.828125,-49.375],[154.992188,-49.257812],[155.140625,-49.179687],[155.234375,-49.150391]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[153.921875,-50.578125],[153.980469,-50.595703],[154.039063,-50.613281],[154.15625,-50.648437],[154.359375,-50.734375],[154.570313,-50.804687],[154.640625,-51.070312],[154.601563,-51.304687],[154.632813,-51.453125],[154.859375,-51.523437],[155.09375,-51.546875],[155.335938,-51.5625],[155.546875,-51.742187],[155.601563,-51.777343],[155.65625,-51.8125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[151.583984,-43.082031],[151.562134,-43.087646],[151.540283,-43.093262],[151.496582,-43.104492],[151.40918,-43.126953],[151.234375,-43.171875],[150.835938,-43.140625],[150.640625,-43.203125],[150.539063,-43.375],[150.6875,-43.609375],[150.703125,-43.84375],[150.648438,-44.015625],[150.609375,-44.273437],[150.78125,-44.375],[150.921875,-44.507812],[150.828125,-44.726562],[150.796875,-44.945312],[150.898438,-45.242187],[150.992188,-45.5],[151.054688,-45.742187],[151.046875,-46.0625],[150.984375,-46.296875],[150.976563,-46.46875],[151.007813,-46.679687],[151.0625,-46.882812],[150.984375,-47.0625],[150.921875,-47.242187],[150.953125,-47.476562],[151.023438,-47.671875],[151.109375,-47.859375],[151.15625,-48.015625],[151.023438,-48.09375],[150.992188,-48.210937],[151.085938,-48.257812],[151.179688,-48.351562],[151.125,-48.429687],[151.109375,-48.472656],[151.09375,-48.515625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[150.459961,-49.179687],[150.503174,-49.169922],[150.546387,-49.160156],[150.632813,-49.140625],[150.703126,-49.152343],[150.773438,-49.164062],[150.769532,-49.113281],[150.765625,-49.0625],[150.730469,-49.015625],[150.695313,-48.96875],[150.687501,-48.910156],[150.679688,-48.851562],[150.691407,-48.804687],[150.703125,-48.757812],[150.75,-48.800781],[150.796875,-48.84375],[150.835938,-48.875],[150.875,-48.90625],[150.917969,-48.882812],[150.960938,-48.859375],[150.929688,-48.808593],[150.898438,-48.757812],[150.867188,-48.695312],[150.835938,-48.632812],[150.835938,-48.578124],[150.835938,-48.523437],[150.898438,-48.496093],[150.960938,-48.46875],[151.023438,-48.492187],[151.059082,-48.504395],[151.094727,-48.516602],[151.137207,-48.562988],[151.179688,-48.609375],[151.21875,-48.726562],[151.359375,-48.828125],[151.625,-48.859375],[151.882813,-48.90625],[152.0625,-48.960937],[152.195313,-49.09375],[152.3125,-49.265625],[152.53125,-49.320312],[152.625,-49.46875],[152.601563,-49.570312],[152.585938,-49.610351],[152.570313,-49.650391]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[153.242188,-43.679687],[153.222657,-43.728515],[153.203126,-43.777343],[153.164063,-43.875],[153.164063,-44.015625],[153.28125,-44.21875],[153.453125,-44.445312],[153.679688,-44.679687],[153.835938,-44.765625],[153.945313,-44.882812],[153.859375,-45.039062],[153.953125,-45.226562],[154.09375,-45.398437],[154.234375,-45.664062],[154.234375,-45.984375],[154.25,-46.203125],[154.3125,-46.484375],[154.421875,-46.679687],[154.539063,-46.898437],[154.679688,-47.140625],[154.722656,-47.236328],[154.742188,-47.28125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[155.382813,-41.058594],[155.408203,-41.135742],[155.433594,-41.21289],[155.484375,-41.367187],[155.53125,-41.59375],[155.578125,-41.820312],[155.46875,-42.125],[155.34375,-42.3125],[155.0625,-42.429687],[154.921875,-42.515625],[154.992188,-42.734375],[155.179688,-42.804687],[155.570313,-42.671875],[155.678711,-42.668945],[155.73291,-42.66748],[155.787109,-42.666016],[155.818848,-42.716308],[155.850586,-42.766601],[155.914063,-42.867187],[156.03125,-43.109375],[156.164063,-43.382812],[156.125,-43.65625],[156.140625,-43.953125],[156.28125,-43.992187],[156.460938,-44.0625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[155.789063,-42.664062],[155.804688,-42.613281],[155.820313,-42.562499],[155.851563,-42.460937],[155.898438,-42.28125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[146.453125,-36.875],[146.392578,-36.916015],[146.332032,-36.957031],[146.210938,-37.039062],[146.070313,-37.335937],[146.085938,-37.570312],[146.144532,-37.726562],[146.173828,-37.804687],[146.188477,-37.843749],[146.203125,-37.882812],[146.240235,-37.929687],[146.277344,-37.976562],[146.351563,-38.070312],[146.539063,-38.429687],[146.5625,-38.75],[146.367188,-38.929687],[146.171875,-39.085937],[146.046875,-39.320312],[145.976563,-39.484375],[145.8125,-39.679687],[145.75,-39.9375],[145.726563,-40.28125],[145.734375,-40.679687],[145.820313,-40.875],[145.90625,-41.242187],[146.023438,-41.5],[146.164063,-41.59375],[146.242188,-41.8125],[146.304688,-42.179687],[146.375,-42.476562],[146.59375,-42.539062],[146.867188,-42.5],[147.148438,-42.515625],[147.390625,-42.617187],[147.664063,-42.789062],[147.945313,-42.796875],[148.140625,-43.023437],[148.210938,-43.335937],[148.21875,-43.578125],[148.164063,-43.726562],[148.304688,-44.046875],[148.507813,-44.34375],[148.617188,-44.484375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[144.966797,-38.023437],[144.937988,-38.078125],[144.90918,-38.132812],[144.851563,-38.242187],[144.71875,-38.4375],[144.65625,-38.710937],[144.617188,-38.929687],[144.546875,-39.132812],[144.382813,-39.320312],[144.265625,-39.46875],[144.15625,-39.679687],[144.0625,-40.03125],[144.148438,-40.34375],[144.242188,-40.742187],[144.28125,-41.109375],[144.351563,-41.453125],[144.382813,-41.726562],[144.25,-41.9375],[143.859375,-41.90625],[143.679688,-41.789062],[143.640625,-41.570312],[143.640625,-41.359375],[143.601563,-41.308593],[143.5625,-41.257812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[143.257813,-40.507812],[143.453125,-40.625],[143.570313,-40.945312],[143.625,-41.078125],[143.59375,-41.167969],[143.578125,-41.212891],[143.5625,-41.257812],[143.552734,-41.297852],[143.542969,-41.337891],[143.523438,-41.417969],[143.484375,-41.578125],[143.46875,-41.707031],[143.460938,-41.771484],[143.453125,-41.835937],[143.445313,-41.875977],[143.4375,-41.916016],[143.421875,-41.996094],[143.390625,-42.15625],[143.414063,-42.484375],[143.421875,-42.78125],[143.421875,-43.085937],[143.484375,-43.320312],[143.546875,-43.484375],[143.679688,-43.6875],[143.84375,-43.867187],[144.125,-43.984375],[144.273438,-44.109375],[144.289063,-44.195312],[144.296876,-44.238281],[144.304688,-44.28125],[144.306641,-44.335937],[144.308594,-44.390625],[144.3125,-44.5],[144.304688,-44.757812],[144.414063,-44.992187],[144.671875,-45.164062],[144.914063,-45.320312],[145.296875,-45.445312],[145.601563,-45.609375],[145.726563,-45.757812],[145.632813,-45.90625],[145.335938,-46.109375],[145.0625,-46.03125],[144.835938,-46.132812],[144.773438,-46.382812],[144.65625,-46.609375],[144.484375,-46.820312],[144.410157,-46.910156],[144.335938,-47],[144.308594,-47.041016],[144.28125,-47.082031]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[144.304688,-44.28125],[144.359375,-44.269531],[144.414063,-44.257812],[144.523438,-44.234375],[144.6875,-44.414062],[144.898438,-44.609375],[145.132813,-44.742187],[145.25,-44.585937],[145.265625,-44.203125],[145.242188,-43.96875],[145.179688,-43.71875],[144.984375,-43.5],[144.828125,-43.335937],[144.695313,-43.203125],[144.859375,-43.132812],[145.046875,-43.210937],[145.335938,-43.265625],[145.6875,-43.34375],[146.023438,-43.453125],[146.179688,-43.664062],[146.335938,-43.890625],[146.515625,-44.023437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[143.453125,-41.835937],[143.417969,-41.836914],[143.382813,-41.83789],[143.3125,-41.839843],[143.171875,-41.84375],[142.96875,-41.835937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[145.330078,-37.990234],[145.388184,-38.021973],[145.446289,-38.053711],[145.5625,-38.117187],[145.773438,-38.007812],[146.039063,-37.875],[146.118164,-37.878906],[146.197266,-37.882812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[158.152344,-41.222656],[158.212891,-41.126953],[158.273438,-41.03125],[158.4375,-40.726562],[158.59375,-40.53125],[158.789063,-40.445312],[159.054688,-40.375],[159.320313,-40.351562],[159.492188,-40.34375],[159.695313,-40.453125],[160.03125,-40.578125],[160.257813,-40.585937],[160.554688,-40.414062],[160.671875,-40.226562],[160.71875,-40.085937],[160.632813,-39.789062],[160.296875,-39.6875],[159.984375,-39.5625],[159.78125,-39.359375],[159.4375,-39.171875],[159.289063,-38.976562],[159.179688,-38.664062],[159.140625,-38.335937],[158.921875,-38.0625],[158.570313,-37.726562],[158.234375,-37.429687],[158.054688,-37.15625],[157.875,-36.9375],[157.789063,-36.835937],[157.867188,-36.734374],[157.945313,-36.632812],[158.125,-36.359375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[157.789063,-36.839844],[157.716797,-36.786133],[157.644531,-36.732422],[157.5,-36.625],[157.296875,-36.375],[157.210938,-36.0625],[157.039063,-35.640625],[156.726563,-35.414062],[156.453125,-35.179687],[156.195313,-34.859375],[156.015625,-34.570312],[155.882813,-34.406249],[155.816406,-34.324218],[155.783203,-34.283203],[155.75,-34.242187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[155.882813,-40.476562],[155.882813,-40.427734],[155.882813,-40.378906],[155.882813,-40.28125],[156.070313,-39.859375],[156.15625,-39.5],[156.179688,-39.070312],[156.132813,-38.867187],[155.671875,-38.585937],[155.414063,-38.34375],[155.398438,-38.109375],[155.3125,-37.75],[155.53125,-37.4375],[155.476563,-37.21875],[155.59375,-36.796875],[155.648438,-36.554687],[155.679688,-36.335937],[155.632813,-36.078125],[155.695313,-35.757812],[155.851563,-35.507812],[155.882813,-35.28125],[155.820313,-35.09375],[155.640625,-34.945312],[155.65625,-34.664062],[155.710938,-34.429687],[155.730469,-34.33789],[155.740235,-34.291992],[155.750977,-34.244141],[155.757813,-34.18164],[155.765626,-34.117187],[155.769532,-34.046874],[155.773438,-33.976562],[155.75586,-33.902343],[155.738282,-33.828124],[155.703125,-33.679687],[155.632813,-33.410156],[155.5625,-33.140625],[155.492188,-32.742187],[155.226563,-32.320312],[155.140625,-32.0625],[155.046875,-31.679687],[155.101563,-31.320312],[155.28125,-31.109375],[155.476563,-30.945312],[155.625,-30.84375],[155.898438,-30.671875],[155.953125,-30.296875],[155.851563,-30.113281],[155.800781,-30.021484],[155.75,-29.929687],[155.695313,-29.839844],[155.640625,-29.75],[155.476563,-29.570312],[155.171875,-29.335937],[154.796875,-29.056641]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[154.796875,-29.054687],[154.53125,-28.871093],[154.265625,-28.6875],[153.914063,-28.558593],[153.5625,-28.429687],[152.953125,-28.476562],[152.582032,-28.597656],[152.210938,-28.71875],[151.632813,-28.953125],[151.109375,-29.242187],[150.796875,-29.390625],[150.3125,-29.390625],[150.078125,-29.308593],[149.960938,-29.267578],[149.902344,-29.24707],[149.84375,-29.226562],[149.807617,-29.213867],[149.771485,-29.201171],[149.699219,-29.175781],[149.554688,-29.125],[149.140625,-29.070312],[148.828125,-29.023437],[148.40625,-28.929687],[148.09375,-28.90625],[147.960938,-29.117187],[147.78125,-29.398437],[147.71875,-29.632812],[147.554688,-29.84375],[147.328125,-30.046875],[147.046875,-30.21875],[146.59375,-30.445312],[146.304688,-30.664062],[146.054688,-30.914062],[145.734375,-31.09375],[145.5,-31.140625],[145.09375,-31.210937],[144.890625,-31.414062],[144.71875,-31.765625],[144.46875,-32.078125],[144.304688,-32.140625],[144.296875,-32.296875],[144.367188,-32.5625],[144.382813,-32.828125],[144.304688,-33.03125],[144.210938,-33.25]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[149.84375,-29.224609],[149.860352,-29.187988],[149.876953,-29.151367],[149.910157,-29.072265],[149.976563,-28.914062],[150.070313,-28.695312],[150.3125,-28.390625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[149.84375,-29.224609],[149.84375,-29.226562],[149.858399,-29.273437],[149.873047,-29.320312],[149.902344,-29.414062],[149.960938,-29.601562],[149.992188,-29.851562],[149.96875,-30.234375],[149.960938,-30.664062],[149.960938,-31.164062],[149.968751,-31.296874],[149.976563,-31.429687],[149.988282,-31.570312],[150,-31.710937],[150.007813,-31.882812],[150.015625,-32.054687],[150.15625,-32.273437],[150.351563,-32.539062],[150.328125,-32.875],[150.054688,-33.078125],[149.75,-33.179687],[149.414063,-33.070312],[149.196289,-33.03125],[149.087402,-33.011719],[149.032959,-33.001953],[148.978516,-32.992187],[148.926758,-32.996094],[148.875,-33],[148.81836,-33.074219],[148.761719,-33.148437],[148.705079,-33.222656],[148.648438,-33.296875],[148.597657,-33.335937],[148.546875,-33.375],[148.371094,-33.402343],[148.195313,-33.429687],[148.0625,-33.460937],[147.953125,-33.710937],[147.8125,-33.898437],[147.515625,-33.992187],[147.304688,-34],[147.0625,-33.828125],[146.765625,-33.765625],[146.40625,-33.984375],[145.992188,-34.367187],[145.71875,-34.570312],[145.453125,-34.789062],[145.216797,-34.988281],[145,-35.28125],[144.714844,-35.40625],[144.392579,-35.546875],[144.070313,-35.6875],[143.859375,-35.921875],[143.785157,-36.082031],[143.748047,-36.162109],[143.729493,-36.202148],[143.710938,-36.242187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[149.980469,-31.421875],[150.040039,-31.519531],[150.099609,-31.617187],[150.21875,-31.8125],[150.515625,-32.234375],[150.710938,-32.40625],[150.835938,-32.664062],[150.6875,-33.125],[150.523438,-33.367187],[150.398438,-33.648437],[150.320313,-33.867187],[149.914063,-34.203125],[149.59375,-34.4375],[149.304688,-34.539062],[148.9375,-34.679687],[148.765625,-34.804687],[148.710938,-35.0625],[148.65625,-35.3125],[148.5,-35.5],[148.351563,-35.695312],[148.09375,-36.078125],[147.851563,-36.101562],[147.539063,-36.085937],[147.482422,-36.099609],[147.425782,-36.113281],[147.369141,-36.126953],[147.3125,-36.140625],[147.117188,-36.273437],[146.929688,-36.4375],[146.874024,-36.512695],[146.846192,-36.550293],[146.818359,-36.587891]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[148.978516,-32.991211],[148.945313,-33.042968],[148.914063,-33.093749],[148.882813,-33.144531],[148.851563,-33.195312],[148.802735,-33.271484],[148.753907,-33.347656],[148.705078,-33.423828],[148.65625,-33.5],[148.59375,-33.671875],[148.367188,-33.890625],[148.289063,-34.171875],[148.179688,-34.3125],[147.851563,-34.59375],[147.710938,-34.882812],[147.421875,-35.179687],[147.125,-35.5],[147.101563,-35.757812],[147.132813,-36.015625],[147.280274,-36.064453],[147.354004,-36.088867],[147.427734,-36.113281]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[155.773438,-33.976562],[155.722656,-33.953125],[155.671875,-33.929687],[155.5625,-33.882812],[155.421875,-33.992187],[155.351563,-34.335937],[155.226563,-34.734375],[155.117188,-35.070312],[155.054688,-35.414062],[155.046875,-35.679687],[154.890625,-36.039062],[154.695313,-36.359375],[154.582032,-36.496093],[154.525391,-36.564453],[154.46875,-36.632812],[154.4375,-36.675781],[154.40625,-36.718749],[154.34375,-36.804687],[154.21875,-36.976562],[154.007813,-37.328125],[153.804688,-37.710937],[153.617188,-38.101562],[153.53125,-38.5625],[153.570313,-38.851562],[153.640625,-39.140625],[153.71875,-39.382812],[153.289063,-39.476562],[153.203125,-39.585937],[153.265625,-39.726562],[153.429688,-39.851562],[153.546875,-39.9375],[153.5,-40.085937],[153.382813,-40.203125],[153.414063,-40.382812],[153.632813,-40.46875],[153.914063,-40.476562],[154.234375,-40.523437],[154.429688,-40.609375],[154.570313,-40.820312],[154.539063,-41.007812],[154.601563,-41.289062],[154.645508,-41.371093],[154.689453,-41.453125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[154.472656,-41.826172],[154.41211,-41.803711],[154.351563,-41.78125],[154.289063,-41.648437],[154.265625,-41.492187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[154.470703,-36.630859],[154.470215,-36.559082],[154.469727,-36.487305],[154.46875,-36.34375],[154.476563,-36.007812],[154.439453,-35.800781],[154.420899,-35.697265],[154.413574,-35.640625],[154.40625,-35.583984],[154.393555,-35.52832],[154.380859,-35.472656],[154.359375,-35.351562],[154.351563,-35.03125],[154.382813,-34.742187],[154.40625,-34.578125],[154.15625,-34.4375],[153.882813,-34.242187],[153.664063,-34.054687],[153.46875,-33.921875],[153.257813,-33.921875],[153.039063,-34.148437],[152.875,-34.429687],[152.828125,-34.6875],[152.832032,-34.800781],[152.835938,-34.914062],[152.843751,-35.066406],[152.851563,-35.21875],[153.039063,-35.375],[153.164063,-35.53125],[153.148438,-35.742187],[152.929688,-35.90625],[152.53125,-35.90625],[152.15625,-36],[151.867188,-35.992187],[151.476563,-36.039062],[151.367188,-36.070312],[151.101563,-36.296875],[151.0625,-36.632812],[151.101563,-36.984375],[151.195313,-37.21875],[151.265625,-37.5],[151.34375,-37.820312],[151.421875,-38.117187],[151.4375,-38.207031],[151.453125,-38.296875],[151.484375,-38.421875],[151.515625,-38.546875],[151.539063,-38.685547],[151.5625,-38.824219],[151.585938,-38.974609],[151.609375,-39.125],[151.671875,-39.40625],[151.71875,-39.695312],[151.664063,-39.898437],[151.5,-40.125],[151.449219,-40.21875],[151.398438,-40.3125],[151.367188,-40.433593],[151.335938,-40.554687],[151.414063,-40.757812],[151.46875,-41],[151.429688,-41.320312],[151.382813,-41.664062],[151.453125,-41.914062],[151.664063,-41.929687],[151.929688,-41.804687],[152.1875,-41.921875],[152.570313,-42.125],[152.828125,-42.367187],[153.054688,-42.65625],[153.421875,-42.828125],[153.710938,-42.859375],[153.785157,-42.913086],[153.822266,-42.939941],[153.859375,-42.966797]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[151.390625,-36.078125],[151.453125,-35.8125],[151.640625,-35.476562],[151.796875,-35.179687],[151.9375,-34.992187],[152.210938,-34.890625],[152.554688,-34.875],[152.695313,-34.894531],[152.835938,-34.914062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[154.40625,-35.585937],[154.353516,-35.558593],[154.300782,-35.531249],[154.195313,-35.476562],[154.0625,-35.570312],[153.90625,-35.5625],[153.789063,-35.664062],[153.773438,-35.84375],[153.804688,-35.976562],[153.789063,-36.109375],[153.84375,-36.203125],[153.671875,-36.375],[153.53125,-36.484375],[153.382813,-36.65625],[153.09375,-36.78125],[152.78125,-36.773437],[152.46875,-36.78125],[152.117188,-36.953125],[151.921875,-37.054687],[151.78125,-37.3125],[151.703125,-37.664062],[151.6875,-37.882812],[151.585938,-38.070312],[151.523438,-38.18164],[151.460938,-38.292969]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[148.5625,-38.179687],[148.726563,-38.222656],[148.890625,-38.265625],[149.21875,-38.421875],[149.476563,-38.5],[149.65625,-38.65625],[150.007813,-38.835937],[150.226563,-38.90625],[150.453125,-38.984375],[150.75,-38.96875],[151.070313,-38.945312],[151.429688,-38.882812],[151.5625,-38.828125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[150.34375,-40.574219],[150.457032,-40.541015],[150.570313,-40.507812],[150.875,-40.398437],[151.195313,-40.367187],[151.298828,-40.339843],[151.402344,-40.3125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[155.75,-29.929687],[155.816406,-29.880859],[155.882813,-29.832031],[156.015625,-29.734375],[156.257813,-29.445312],[156.421875,-29.21875],[156.664063,-29.039062],[156.914063,-28.867187],[157.109375,-28.945312],[157.203125,-29.195312],[157.296875,-29.34375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[137.171875,-62.515625],[137.21875,-62.46875],[137.265625,-62.421875],[137.359375,-62.328125],[137.640625,-62.203125],[138,-62.0625],[138.492188,-61.960937],[138.570313,-61.945312],[138.648438,-61.929687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[139.847656,-55.433594],[139.84082,-55.348633],[139.833984,-55.263672],[139.820313,-55.09375],[139.882813,-54.851562],[139.957031,-54.757812],[140.03125,-54.664062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[139.007813,-54.304687],[139.056641,-54.337891],[139.105469,-54.371094],[139.203125,-54.4375],[139.539063,-54.601562],[139.785156,-54.632812],[139.908203,-54.648437],[140.03125,-54.664062]]}}]}
},{}],6:[function(require,module,exports){
module.exports={"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[79.929688,-47.492187],[79.875,-47.726562],[79.835938,-48.09375],[79.828125,-48.328125],[79.742188,-48.53125],[79.546875,-48.726562],[79.367188,-48.90625],[79.296875,-48.976562],[79.261719,-49.011719],[79.226563,-49.046875],[79.191406,-49.085937],[79.15625,-49.125],[79.085938,-49.203125],[79,-49.316406],[78.957031,-49.373047],[78.935547,-49.401367],[78.914063,-49.429687],[78.895508,-49.482422],[78.876953,-49.535156],[78.839844,-49.640625],[78.765625,-49.851562],[78.648438,-50.179687],[78.578125,-50.429687],[78.5,-50.640625],[78.46875,-50.890625],[78.515625,-51.15625],[78.570313,-51.453125],[78.570313,-51.625],[78.46875,-51.921875],[78.375,-52.171875],[78.355469,-52.265625],[78.345703,-52.3125],[78.335938,-52.359375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[79.226563,-49.046875],[79.226563,-49.099609],[79.226563,-49.152344],[79.226563,-49.257812],[79.210938,-49.46875],[79.28125,-49.710937],[79.390625,-49.921875],[79.492188,-50.164062],[79.609375,-50.351562],[79.796875,-50.445312],[79.992188,-50.65625],[80.164063,-50.84375],[80.257813,-51.070312],[80.25,-51.304687],[80.140625,-51.5],[80.03125,-51.71875],[79.976563,-51.992187],[79.976563,-52.304687],[80.03125,-52.601562],[80.132813,-52.867187],[80.289063,-53.0625],[80.460938,-53.289062],[80.578125,-53.515625],[80.613281,-53.625],[80.630859,-53.679687],[80.639648,-53.707031],[80.648438,-53.734375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[78.914063,-49.429687],[78.874023,-49.456055],[78.833984,-49.482422],[78.753906,-49.535156],[78.59375,-49.640625],[78.3125,-49.726562],[78.070313,-49.78125],[77.789063,-49.851562],[77.539063,-49.96875],[77.351563,-50.140625],[77.304688,-50.335937],[77.289063,-50.609375],[77.234375,-50.8125],[77.132813,-50.96875],[77.056641,-51.068359],[77.018555,-51.118164],[76.980469,-51.167969]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[79.40625,-53.679687],[79.376953,-53.634766],[79.347656,-53.589844],[79.289063,-53.5],[79.09375,-53.289062],[78.90625,-53.085937],[78.65625,-52.867187],[78.515625,-52.664062],[78.421875,-52.5],[78.378906,-52.429687],[78.357422,-52.394531],[78.335938,-52.359375],[78.308594,-52.321289],[78.28125,-52.283203],[78.226563,-52.207031],[78.117188,-52.054687],[77.90625,-51.890625],[77.585938,-51.671875],[77.34375,-51.539062],[77.148438,-51.375],[77.064453,-51.271484],[77.022461,-51.219727],[77.001465,-51.193848],[76.980469,-51.167969],[76.950684,-51.172363],[76.920898,-51.176758],[76.861328,-51.185547],[76.742188,-51.203125],[76.453125,-51.273437],[76.242188,-51.296875],[76.117188,-51.359375],[76.039063,-51.453125],[75.796875,-51.398437],[75.601563,-51.390625],[75.445313,-51.4375],[75.425781,-51.511719],[75.416016,-51.548828],[75.40625,-51.585937],[75.421875,-51.630859],[75.4375,-51.675781],[75.46875,-51.765625],[75.492188,-51.945312],[75.507813,-52.039062],[75.515625,-52.085937],[75.523438,-52.132812],[75.526367,-52.161133],[75.529297,-52.189453],[75.535156,-52.246094],[75.546875,-52.359375],[75.578125,-52.5625],[75.65625,-52.6875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[75.523438,-52.132812],[75.490234,-52.107422],[75.457031,-52.082031],[75.390625,-52.03125],[75.210938,-52.007812],[75.078125,-52.015625],[75.019531,-51.953125],[74.990234,-51.921875],[74.960938,-51.890625],[74.925781,-51.867187],[74.890625,-51.84375],[74.820313,-51.796875],[74.65625,-51.84375],[74.492188,-51.875],[74.34375,-51.71875],[74.195313,-51.523437],[73.976563,-51.28125],[73.648438,-51.21875],[73.460938,-51.171875],[73.371094,-51.144531],[73.326172,-51.130859],[73.28125,-51.117187],[73.246094,-51.085937],[73.210938,-51.054687],[73.140625,-50.992187],[72.9375,-50.898437],[72.992188,-50.757812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[73.28125,-51.117187],[73.279297,-51.171875],[73.277344,-51.226562],[73.273438,-51.335937],[73.257813,-51.476562],[73.085938,-51.601562],[72.820313,-51.757812],[72.703125,-51.921875],[72.828125,-52.179687],[72.992188,-52.359375],[73.1875,-52.53125],[73.320313,-52.695312],[73.515625,-52.882812],[73.6875,-53.03125],[73.710938,-53.21875],[73.53125,-53.453125],[73.335938,-53.640625],[73.269531,-53.776367],[73.236328,-53.844238],[73.219727,-53.878174],[73.203125,-53.912109]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[72.28125,-53.9375],[72.326172,-53.914062],[72.371094,-53.890625],[72.460938,-53.84375],[72.710938,-53.84375],[73,-53.875],[73.101563,-53.894531],[73.152344,-53.904297],[73.203125,-53.914062],[73.25,-53.935547],[73.296875,-53.957031],[73.390625,-54],[73.671875,-54.054687],[73.90625,-54.039062],[74.203125,-53.9375],[74.429688,-53.835937],[74.71875,-53.671875],[75.046875,-53.570312],[75.328125,-53.5625],[75.585938,-53.539062],[75.8125,-53.554687],[76.03125,-53.671875],[76.3125,-53.71875],[76.546875,-53.6875],[76.835938,-53.625],[77.070313,-53.53125],[77.15918,-53.501953],[77.203613,-53.487305],[77.248047,-53.472656],[77.303711,-53.455078],[77.359375,-53.4375],[77.572266,-53.388672],[77.629883,-53.397461],[77.658691,-53.401855],[77.6875,-53.40625],[77.71875,-53.417969],[77.75,-53.429687],[77.8125,-53.453125],[77.929688,-53.53125],[78.046875,-53.609375],[78.28125,-53.710937],[78.570313,-53.710937],[78.851563,-53.640625],[79.195313,-53.632812],[79.300781,-53.65625],[79.353516,-53.667969],[79.40625,-53.679687],[79.447266,-53.68457],[79.488281,-53.689453],[79.570313,-53.699219],[79.734375,-53.71875],[80.054688,-53.65625],[80.40625,-53.695312],[80.527344,-53.714844],[80.587891,-53.724609],[80.618164,-53.729492],[80.648438,-53.734375],[80.683594,-53.736328],[80.71875,-53.738281],[80.789063,-53.742187],[80.929688,-53.75],[81.25,-53.796875],[81.507813,-53.78125],[81.75,-53.914062],[81.921875,-54.070312],[82.046875,-54.3125],[82.289063,-54.46875],[82.59375,-54.5],[82.78125,-54.539062],[83.046875,-54.65625],[83.382813,-54.757812],[83.671875,-54.789062],[83.898438,-54.875],[84.007813,-54.945312],[84.0625,-54.980469],[84.117188,-55.015625],[84.15625,-55.070312],[84.195313,-55.125],[84.273438,-55.234375],[84.445313,-55.46875],[84.570313,-55.796875],[84.640625,-56.03125],[84.726563,-56.21875],[84.8125,-56.460937],[85,-56.710937],[85.21875,-56.867187],[85.523438,-56.882812],[85.765625,-56.84375],[85.914063,-56.882812],[85.988281,-56.902344],[86.025391,-56.912109],[86.0625,-56.921875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[84.117188,-55.015625],[84.113281,-54.955078],[84.109375,-54.894531],[84.101563,-54.773437],[84.015625,-54.625],[84.054688,-54.429687],[83.757813,-54.179687],[83.695313,-53.921875],[83.546875,-53.703125],[83.375,-53.609375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[92.601563,-53.570312],[92.445313,-53.835937],[92.25,-53.976562],[92.15625,-54.035156],[92.109375,-54.064453],[92.0625,-54.09375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[93.226563,-54.195312],[93.25,-54.453125],[93.265625,-54.625],[93.28125,-54.769531],[93.289063,-54.841797],[93.292969,-54.87793],[93.296875,-54.914062],[93.298828,-54.946289],[93.300781,-54.978516],[93.304688,-55.042969],[93.3125,-55.171875],[93.40625,-55.4375],[93.515625,-55.710937],[93.632813,-56.03125],[93.71875,-56.226562],[93.765625,-56.308594],[93.789063,-56.349609],[93.8125,-56.390625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[93.296875,-54.914062],[93.246094,-54.898437],[93.195313,-54.882812],[93.09375,-54.851562],[92.992188,-54.78125],[92.914063,-54.59375],[92.679688,-54.46875],[92.4375,-54.320312],[92.203125,-54.195312],[92.132813,-54.144531],[92.097656,-54.119141],[92.0625,-54.09375],[92.025391,-54.078125],[91.988281,-54.0625],[91.914063,-54.03125],[91.765625,-53.96875],[91.414063,-54],[91.15625,-54.03125],[90.796875,-53.789062],[90.515625,-53.671875],[90.25,-53.679687],[89.976563,-53.726562],[89.78125,-53.71875],[89.632813,-53.640625],[89.558594,-53.601562],[89.521484,-53.582031],[89.484375,-53.5625],[89.480469,-53.59375],[89.476563,-53.625],[89.46875,-53.6875],[89.453125,-53.8125],[89.398438,-54.125],[89.304688,-54.3125],[89.171875,-54.523437],[89.125,-54.828125],[89.085938,-55.148437],[89.09375,-55.492187],[89.117188,-55.757812],[89.117188,-56.007812],[89.078125,-56.265625],[89.125,-56.539062],[89.273438,-56.71875],[89.4375,-56.976562],[89.625,-57.140625],[89.742188,-57.296875],[89.78125,-57.355469],[89.820313,-57.414062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[93.8125,-56.390625],[93.774414,-56.388672],[93.736328,-56.386719],[93.660156,-56.382812],[93.507813,-56.375],[93.1875,-56.398437],[92.945313,-56.351562],[92.617188,-56.28125],[92.359375,-56.179687],[92.15625,-56.273437],[92.054688,-56.5],[91.992188,-56.78125],[91.960938,-57.007812],[91.898438,-57.25],[91.757813,-57.421875],[91.5,-57.460937],[91.34375,-57.5],[91.171875,-57.648437],[90.960938,-57.640625],[90.78125,-57.546875],[90.59375,-57.492187],[90.359375,-57.507812],[90.109375,-57.390625],[89.964844,-57.402344],[89.892578,-57.408203],[89.856445,-57.411133],[89.820313,-57.414062],[89.795898,-57.432617],[89.771484,-57.451172],[89.722656,-57.488281],[89.625,-57.5625],[89.476563,-57.710937],[89.296875,-57.835937],[89.21875,-58.070312],[89.195313,-58.25],[89.09375,-58.414062],[89.050781,-58.457031],[89.007813,-58.5]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[77.248047,-53.474609],[77.276611,-53.44165],[77.305176,-53.408691],[77.362305,-53.342773],[77.476563,-53.210937],[77.582031,-53.308594],[77.634766,-53.357422],[77.661133,-53.381836],[77.6875,-53.40625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[75.40625,-51.585937],[75.371094,-51.611328],[75.335938,-51.636719],[75.265625,-51.6875],[75.101563,-51.8125],[75.03125,-51.851562],[74.996094,-51.871094],[74.978516,-51.880859],[74.969727,-51.885742],[74.960938,-51.890625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[89.484375,-53.5625],[89.486328,-53.53125],[89.488281,-53.5],[89.492188,-53.4375],[89.5,-53.3125],[89.398438,-53.109375],[89.242188,-52.9375],[89.171875,-52.429687],[89.132813,-52.03125],[89.109375,-51.695312],[89.039063,-51.460937],[89.015625,-51.164062],[88.90625,-50.960937],[88.8125,-50.757812],[88.648438,-50.46875],[88.601563,-50.210937],[88.515625,-49.796875],[88.460938,-49.484375],[88.457032,-49.359375],[88.455078,-49.296875],[88.454102,-49.265625],[88.453125,-49.234375],[88.476563,-49.185547],[88.5,-49.136718],[88.546875,-49.039062],[88.742188,-48.945312],[88.953125,-48.898437],[89.25,-48.898437],[89.53125,-49.015625],[89.804688,-48.984375],[89.984375,-48.867187],[90.039063,-48.609375],[90.03125,-48.390625],[90.109375,-48.09375],[90.117188,-47.890625],[90.078125,-47.335937],[89.882813,-47.039062],[89.703125,-46.726562],[89.601563,-46.515625],[89.632813,-46.054687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[88.453125,-49.234375],[88.425781,-49.189453],[88.398438,-49.144531],[88.34375,-49.054687],[88.242188,-48.742187],[88.132813,-48.515625],[87.9375,-48.203125],[87.640625,-47.953125],[87.414063,-47.671875],[87.257813,-47.273437],[87.09375,-47.078125],[86.703125,-46.78125],[86.476563,-46.539062],[86.453125,-46.164062],[86.421875,-46.023437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[95.125,-56.851562],[94.914063,-56.671875],[94.445313,-56.5625],[94.039063,-56.40625],[93.925781,-56.398437],[93.869141,-56.394531],[93.8125,-56.390625],[93.785156,-56.429687],[93.757813,-56.46875],[93.703125,-56.546875],[93.625,-56.8125],[93.203125,-57.007812],[92.898438,-57.195312],[92.585938,-57.570312],[92.40625,-58.046875],[92.265625,-58.375],[92.03125,-58.601562],[91.851563,-59.117187],[91.8125,-59.390625],[91.703125,-59.617187],[91.242188,-59.757812],[90.835938,-59.71875],[90.671875,-59.554687],[90.65625,-59.304687],[90.820313,-59.054687],[90.96875,-58.789062],[90.84375,-58.570312],[90.585938,-58.46875],[90.382813,-58.578125],[90.171875,-58.757812],[89.773438,-58.820312],[89.46875,-58.757812],[89.15625,-58.578125],[89.082031,-58.539062],[89.044922,-58.519531],[89.007813,-58.5],[88.969238,-58.487793],[88.930664,-58.475586],[88.853516,-58.451172],[88.699219,-58.402344],[88.390625,-58.304687],[87.9375,-58.1875],[87.5,-57.914062],[87.15625,-57.71875],[86.84375,-57.507812],[86.585938,-57.234375],[86.367188,-57.046875],[86.214844,-56.984375],[86.138672,-56.953125],[86.100586,-56.9375],[86.0625,-56.921875],[86.044922,-56.974609],[86.027344,-57.027344],[85.992188,-57.132812],[85.976563,-57.390625],[86.0625,-57.601562],[86.082031,-57.683594],[86.091797,-57.724609],[86.101563,-57.765625],[86.118164,-57.800781],[86.134766,-57.835937],[86.167969,-57.90625],[86.201172,-57.976562],[86.234375,-58.046875],[86.214844,-58.154297],[86.195313,-58.261719],[86.175781,-58.369141],[86.15625,-58.476562],[86.136719,-58.574219],[86.117188,-58.671875],[86.111328,-58.697266],[86.105469,-58.722656],[86.09375,-58.773437],[86.070313,-58.875],[86.046875,-59.21875],[86.039063,-59.570312],[86.070313,-59.882812],[85.984375,-60.328125],[85.953125,-60.78125],[86.0625,-61.125],[86.304688,-61.296875],[86.796875,-61.28125],[86.976563,-61.238281],[87.066406,-61.216797],[87.111328,-61.206055],[87.15625,-61.195312],[87.201172,-61.182617],[87.246094,-61.169922],[87.335938,-61.144531],[87.515625,-61.09375],[87.945313,-60.945312],[88.328125,-60.851562],[88.695313,-60.882812],[89.03125,-61.039062],[89.367188,-61.054687],[89.796875,-61.195312],[90.171875,-61.3125],[90.601563,-61.265625],[90.84375,-61.34375],[90.976563,-61.757812],[91.046875,-62.09375],[91.039063,-62.359375],[91.007813,-62.648437],[91.101563,-62.984375],[91.359375,-63.195312],[91.511719,-63.261719],[91.587891,-63.294922],[91.625977,-63.311523],[91.664063,-63.328125],[91.687988,-63.335449],[91.711914,-63.342773],[91.759766,-63.357422],[91.855469,-63.386719],[92.046875,-63.445312],[92.476563,-63.46875],[92.609375,-63.59375],[92.675781,-63.65625],[92.708984,-63.6875],[92.742188,-63.71875],[92.759766,-63.744141],[92.777344,-63.769531],[92.8125,-63.820312],[92.847657,-63.871093],[92.882813,-63.921875],[92.937501,-63.990234],[92.992188,-64.058594],[93.046875,-64.126953],[93.074219,-64.161133],[93.101563,-64.195312],[93.115234,-64.217773],[93.128906,-64.240234],[93.15625,-64.285156],[93.210938,-64.375],[93.320313,-64.554687],[93.515625,-64.914062],[93.675781,-65.042969],[93.755859,-65.107422],[93.795898,-65.139648],[93.835938,-65.171875],[93.876953,-65.185547],[93.917969,-65.199219],[94,-65.226562],[94.164063,-65.28125],[94.53125,-65.335937],[94.984375,-65.234375],[95.304688,-65.15625],[95.640625,-65.171875],[95.734375,-65.207031],[95.78125,-65.224609],[95.828125,-65.242187],[95.852539,-65.230469],[95.876953,-65.21875],[95.925781,-65.195312],[96.023438,-65.148437],[96.21875,-65.054687],[96.578125,-64.835937],[96.9375,-64.703125],[97.195313,-64.59375],[97.335938,-64.320312],[97.609375,-64.046875],[97.828125,-63.882812],[97.9375,-63.847656],[97.992188,-63.830078],[98.046875,-63.8125],[98.101563,-63.800781],[98.15625,-63.789062],[98.554688,-63.609375],[98.804688,-63.40625],[98.855469,-63.347656],[98.90625,-63.289062],[98.957031,-63.230469],[99.007813,-63.171875],[99.035156,-63.125],[99.0625,-63.078125],[99.089844,-63.03125],[99.103516,-63.007812],[99.117188,-62.984375],[99.445313,-62.773437],[99.625,-62.523437],[99.75,-62.46875],[99.8125,-62.441406],[99.875,-62.414062],[99.928711,-62.390625],[99.982422,-62.367187],[100.089844,-62.320312],[100.304688,-62.226562],[100.441406,-62.15625],[100.509766,-62.121094],[100.543945,-62.103516],[100.578125,-62.085937],[100.62793,-62.071289],[100.677734,-62.056641],[100.777344,-62.027344],[100.976563,-61.96875],[101.351563,-62.03125],[101.726563,-62.03125],[102.03125,-62.0625],[102.242188,-62.109375],[102.339844,-62.121094],[102.388672,-62.126953],[102.4375,-62.132812],[102.470703,-62.134766],[102.503906,-62.136719],[102.570313,-62.140625],[102.703125,-62.148437],[102.96875,-62.164062],[103.234375,-62.210937],[103.554688,-62.320312],[103.804688,-62.453125],[103.960938,-62.679687],[104.109375,-62.945312],[104.117188,-63.140625],[104.121094,-63.238281],[104.123047,-63.287109],[104.125,-63.335937],[104.117188,-63.398437],[104.101563,-63.4375],[104.078125,-63.539062],[104.054688,-63.660156],[104.042969,-63.720703],[104.03125,-63.78125],[104.020508,-63.816406],[104.009766,-63.851562],[103.988281,-63.921875],[103.974609,-63.996094],[103.967773,-64.033203],[103.960938,-64.070312],[103.9375,-64.100586],[103.914063,-64.130859],[103.867188,-64.191406],[103.765625,-64.289062],[103.708984,-64.361328],[103.65625,-64.421875],[103.621094,-64.484375],[103.603516,-64.519531],[103.578125,-64.554687],[103.533203,-64.619141],[103.445313,-64.75],[103.28125,-64.882812],[103.214844,-64.929687],[103.181641,-64.953125],[103.148438,-64.976562],[103.119141,-64.996094],[103.033203,-65.041016],[102.899414,-65.114258],[102.765625,-65.1875],[102.492188,-65.320312],[102.242188,-65.5],[102.039063,-65.609375],[101.867188,-65.75],[101.703125,-65.96875],[101.460938,-66.109375],[101.148438,-66.351562],[100.8125,-66.59375],[100.5625,-66.734375],[100.4375,-66.804687],[100.375,-66.839844],[100.34375,-66.857422],[100.3125,-66.875],[100.275391,-66.900391],[100.238281,-66.925781],[100.164063,-66.976562],[100.015625,-67.078125],[99.765625,-67.289062],[99.578125,-67.429687],[99.484375,-67.492187],[99.4375,-67.523437],[99.390625,-67.554687],[99.355469,-67.582031],[99.320313,-67.609375],[99.25,-67.664062],[99.109375,-67.773437],[98.789063,-67.953125],[98.578125,-68.203125],[98.421875,-68.367187],[98.332031,-68.4375],[98.287109,-68.472656],[98.242188,-68.507812],[98.206055,-68.537109],[98.169922,-68.566406],[98.097656,-68.625],[97.953125,-68.742187],[97.832031,-68.8125],[97.771484,-68.847656],[97.741211,-68.865234],[97.710938,-68.882812],[97.669922,-68.899414],[97.628906,-68.916016],[97.546875,-68.949219],[97.382813,-69.015625],[97.148438,-69],[96.960938,-68.976562],[96.679688,-69.132812],[96.367188,-69.320312],[95.992188,-69.539062],[95.664063,-69.640625],[95.4375,-69.828125],[95.195313,-70],[94.960938,-70.335937],[94.757813,-70.578125],[94.632813,-70.71875],[94.625,-71.15625],[94.601563,-71.46875],[94.546875,-71.710937],[94.503906,-71.776367],[94.482422,-71.809082],[94.460938,-71.841797],[94.433594,-71.862305],[94.40625,-71.882812],[94.09375,-72.023437],[93.976563,-72.074219],[93.917969,-72.099609],[93.888672,-72.112305],[93.859375,-72.125],[93.8125,-72.140625],[93.765625,-72.15625],[93.671875,-72.1875],[93.390625,-72.296875],[93.078125,-72.445312],[92.851563,-72.578125],[92.5,-72.671875],[92.101563,-72.734375],[91.851563,-72.859375],[91.742188,-72.952148],[91.6875,-72.998535],[91.660156,-73.021729],[91.632813,-73.044922],[91.610352,-73.081299],[91.587891,-73.117676],[91.542969,-73.19043],[91.453125,-73.335937],[91.371094,-73.449219],[91.330078,-73.505859],[91.30957,-73.53418],[91.289063,-73.5625],[91.265625,-73.600586],[91.242188,-73.638672],[91.195313,-73.714844],[91.101563,-73.867187],[90.898438,-74.054687],[90.71875,-74.3125],[90.539063,-74.578125],[90.46875,-74.71875],[90.617188,-74.953125],[90.820313,-75.203125],[90.71875,-75.492187],[90.3125,-75.671875],[89.992188,-75.75],[89.632813,-75.890625],[89.335938,-76.101562],[89.210938,-76.304687],[89.046875,-76.484375],[88.820313,-76.6875],[88.71875,-76.734375],[88.667969,-76.757812],[88.617188,-76.78125],[88.586914,-76.808594],[88.556641,-76.835937],[88.496094,-76.890625],[88.375,-77],[88.1875,-77.203125],[88.178711,-77.239258],[88.169922,-77.275391],[88.152344,-77.347656],[88.117188,-77.492187],[88.097656,-77.589844],[88.087891,-77.638672],[88.078125,-77.6875],[88.105469,-77.711914],[88.132813,-77.736328],[88.1875,-77.785156],[88.296875,-77.882812],[88.46875,-78.132812],[88.859375,-78.3125],[89.070313,-78.453125],[89.335938,-78.554687],[89.820313,-78.75],[90.25,-78.960937],[90.53125,-79.101562],[90.757813,-79.21875],[90.835938,-79.304687],[90.875,-79.347656],[90.914063,-79.390625],[90.924805,-79.428711],[90.935547,-79.466797],[90.957031,-79.542969],[90.978516,-79.619141],[90.989258,-79.657227],[91,-79.695312],[91.004883,-79.734375],[91.009766,-79.773437],[91.019531,-79.851562],[91.039063,-80.007812],[90.992188,-80.335937],[91,-80.632812],[91.140625,-81],[91.398438,-81.203125],[91.5,-81.492187],[91.859375,-81.679687],[92.085938,-81.78125],[92.257813,-82.023437],[92.375,-82.273437],[92.296875,-82.515625],[92.222656,-82.628906],[92.185547,-82.685547],[92.148438,-82.742187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[86.117188,-58.671875],[86.11084,-58.646973],[86.104492,-58.62207],[86.091797,-58.572266],[86.066406,-58.472656],[86.041016,-58.373047],[86.015625,-58.273437],[85.9375,-58.226562],[85.859375,-58.179687],[85.78125,-58.132812],[85.703125,-58.085937],[85.59668,-58.050781],[85.543457,-58.033203],[85.490234,-58.015625],[85.448242,-57.992187],[85.40625,-57.96875],[85.203125,-57.851562],[85.077148,-57.774414],[85.01416,-57.73584],[84.982666,-57.716553],[84.951172,-57.697266],[84.928955,-57.672607],[84.906738,-57.647949],[84.862305,-57.598633],[84.773438,-57.5],[84.554688,-57.40625],[84.171875,-57.507812],[83.796875,-57.640625],[83.546875,-57.757812],[83.1875,-57.953125],[82.742188,-58.0625],[82.3125,-57.976562],[82.054688,-57.882812],[81.984375,-57.632812],[81.828125,-57.304687],[81.796875,-56.835937],[81.726563,-56.476562],[81.632813,-56.179687],[81.234375,-56],[80.921875,-55.960937],[80.601563,-55.953125],[80.109375,-55.90625],[79.5625,-55.9375],[79.164063,-56.09375],[78.75,-56.289062],[78.101563,-56.257812],[77.5,-56.039062],[77.054688,-55.890625],[76.265625,-55.898437],[75.804688,-55.859375],[75.335938,-55.726562],[75.246094,-55.707031],[75.201172,-55.697266],[75.15625,-55.6875],[75.124512,-55.67334],[75.092773,-55.65918],[75.029297,-55.630859],[74.902344,-55.574219],[74.648438,-55.460937],[74.203125,-55.328125],[73.804688,-55.117187],[73.546875,-54.914062],[73.171875,-54.695312],[72.882813,-54.375],[72.585938,-54.15625],[72.433594,-54.046875],[72.357422,-53.992187],[72.319336,-53.964844],[72.28125,-53.9375],[72.235352,-53.932617],[72.189453,-53.927734],[72.097656,-53.917969],[71.914063,-53.898437],[71.609375,-54.09375],[71.3125,-54.1875],[71.179688,-54.40625],[71.007813,-54.75],[70.84375,-54.953125],[70.679688,-55.195312],[70.617188,-55.484375],[70.65625,-55.742187],[70.5625,-56.1875],[70.515625,-56.6875],[70.65625,-57.09375],[70.59375,-57.445312],[70.5625,-57.6875],[70.554688,-57.804687],[70.550781,-57.863281],[70.546875,-57.921875],[70.540527,-57.947754],[70.53418,-57.973633],[70.521484,-58.025391],[70.496094,-58.128906],[70.445313,-58.335937],[70.335938,-58.726562],[70.203125,-59.046875],[69.984375,-59.429687],[69.929688,-59.710937],[70.015625,-60.03125],[70.058594,-60.171875],[70.080078,-60.242187],[70.09082,-60.277344],[70.101563,-60.3125],[70.116211,-60.354492],[70.130859,-60.396484],[70.160156,-60.480469],[70.21875,-60.648437],[70.304688,-60.90625],[70.34375,-61.210937],[70.347656,-61.390625],[70.349609,-61.480469],[70.350586,-61.525391],[70.351563,-61.570312],[70.336914,-61.611328],[70.322266,-61.652344],[70.292969,-61.734375],[70.234375,-61.898437],[69.992188,-62.195312],[69.863281,-62.316406],[69.798828,-62.376953],[69.766602,-62.407227],[69.734375,-62.4375],[69.699219,-62.479492],[69.664063,-62.521484],[69.59375,-62.605469],[69.453125,-62.773437],[69.117188,-63.078125],[68.84375,-63.351562],[68.554688,-63.625],[68.429688,-63.929687],[68.390625,-64.148437],[68.46875,-64.460937],[68.625,-64.890625],[68.632813,-65.34375],[68.570313,-65.71875],[68.421875,-66.148437],[68.375,-66.460937],[68.421875,-66.8125],[68.679688,-67.265625],[68.9375,-67.679687],[69.21875,-68.039062],[69.484375,-68.328125],[69.648438,-68.375],[70.085938,-68.25],[70.445313,-68.15625],[70.820313,-68.023437],[71.164063,-68.015625],[71.59375,-68],[72.15625,-68.007812],[72.59375,-68.039062],[73.03125,-68.078125],[73.28125,-68.101562],[73.617188,-68.109375],[74.148438,-68.171875],[74.5,-68.289062],[74.664063,-68.34375],[74.746094,-68.371094],[74.787109,-68.384766],[74.828125,-68.398437],[74.869141,-68.410156],[74.945313,-68.427734],[75.0625,-68.457031],[75.296875,-68.515625],[75.430664,-68.578125],[75.497559,-68.609375],[75.531006,-68.625],[75.564453,-68.640625],[75.59082,-68.664062],[75.617188,-68.6875],[75.648438,-68.746094],[75.679688,-68.804687],[75.697266,-68.849609],[75.714844,-68.894531],[75.75,-68.984375],[75.734375,-69.414062],[75.757813,-69.882812],[75.882813,-70.085937],[76.25,-70.101562],[76.617188,-69.984375],[76.9375,-69.914062],[77.273438,-69.976562],[77.429688,-70.257812],[77.726563,-70.664062],[78.039063,-70.851562],[78.359375,-70.90625],[78.710938,-70.789062],[78.960938,-70.5],[79.296875,-70.445312],[79.726563,-70.492187],[79.894531,-70.496094],[79.978516,-70.498047],[80.020508,-70.499023],[80.0625,-70.5],[80.097656,-70.484375],[80.132813,-70.46875],[80.203125,-70.4375],[80.34375,-70.375],[80.515625,-70.03125],[80.632813,-69.671875],[80.679688,-69.554687],[80.703125,-69.496094],[80.714844,-69.466797],[80.726563,-69.4375],[80.756836,-69.395508],[80.787109,-69.353516],[80.847656,-69.269531],[80.96875,-69.101562],[81.273438,-68.953125],[81.625,-68.945312],[81.820313,-69.289062],[81.945313,-69.664062],[82.015625,-70.039062],[82.3125,-70.25],[82.496094,-70.308594],[82.587891,-70.337891],[82.633789,-70.352539],[82.679688,-70.367187],[82.730469,-70.380859],[82.78125,-70.394531],[82.882813,-70.421875],[83.15625,-70.5625],[83.246094,-70.550781],[83.291016,-70.544922],[83.335938,-70.539062],[83.359375,-70.498047],[83.382813,-70.457031],[83.429688,-70.375],[83.476563,-70.292969],[83.5,-70.251953],[83.523438,-70.210937],[83.5625,-70.181641],[83.601563,-70.152344],[83.679688,-70.09375],[83.828125,-69.851562],[83.84375,-69.777344],[83.851563,-69.740234],[83.859375,-69.703125],[83.905273,-69.729492],[83.951172,-69.755859],[84.042969,-69.808594],[84.226563,-69.914062],[84.484375,-70.070312],[84.597656,-70.144531],[84.654297,-70.181641],[84.682617,-70.200195],[84.710938,-70.21875],[84.733398,-70.264648],[84.755859,-70.310547],[84.800781,-70.402344],[84.890625,-70.585937],[85.03125,-70.851562],[85.148438,-71.0625],[85.484375,-71.132812],[85.765625,-71.304687],[86.015625,-71.398437],[86.078125,-71.449219],[86.109375,-71.474609],[86.140625,-71.5],[86.174805,-71.526367],[86.208984,-71.552734],[86.277344,-71.605469],[86.414063,-71.710937],[86.695313,-71.921875],[86.984375,-72.101562],[87.195313,-72.210937],[87.59375,-72.265625],[87.867188,-72.34375],[88.179688,-72.320312],[88.5,-72.132812],[88.617188,-72.070312],[88.675781,-72.039062],[88.734375,-72.007812],[88.798828,-72.019531],[88.863281,-72.03125],[88.992188,-72.054687],[89.273438,-72.203125],[89.601563,-72.34375],[89.9375,-72.53125],[90.234375,-72.648437],[90.5,-72.679687],[90.648438,-72.9375],[90.792969,-73.011719],[90.865234,-73.048828],[90.901367,-73.067383],[90.9375,-73.085937],[90.989258,-73.091797],[91.041016,-73.097656],[91.144531,-73.109375],[91.351563,-73.132812],[91.492188,-73.089844],[91.5625,-73.068359],[91.597656,-73.057617],[91.632813,-73.046875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[91.282227,-73.532227],[91.275391,-73.501953],[91.261719,-73.441406],[91.234375,-73.320312],[91.085938,-73.203125],[91.011719,-73.144531],[90.974609,-73.115234],[90.9375,-73.085937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[86.101563,-57.765625],[86.066406,-57.796875],[86.03125,-57.828125],[85.960938,-57.890625],[85.898438,-57.908203],[85.835938,-57.925781],[85.773438,-57.943359],[85.710938,-57.960937],[85.600586,-57.988281],[85.54541,-58.001953],[85.490234,-58.015625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[84.951172,-57.697266],[84.917236,-57.697021],[84.883301,-57.696777],[84.81543,-57.696289],[84.679688,-57.695312],[84.4375,-57.71875],[84.234375,-57.882812],[84.117188,-58.351562],[84.007813,-58.734375],[83.921875,-59.132812],[83.90625,-59.40625],[83.976563,-59.742187],[84.007813,-60.195312],[83.984375,-60.460937],[84.046875,-60.765625],[84.085938,-61.046875],[84.085938,-61.15625],[84.085938,-61.210937],[84.085938,-61.265625],[84.0625,-61.287109],[84.039063,-61.308594],[84.015625,-61.330078],[83.992188,-61.351562],[83.96875,-61.373047],[83.945313,-61.394531],[83.898438,-61.4375],[83.871094,-61.476562],[83.84375,-61.515625],[83.816406,-61.554687],[83.789063,-61.59375],[83.890625,-61.992187],[84.195313,-62.476562],[84.414063,-63],[84.523438,-63.34375],[84.585938,-63.539062],[84.554688,-63.757812],[84.492188,-64.023437],[84.585938,-64.515625],[84.867188,-64.8125],[85.078125,-64.984375],[85.296875,-65.148437],[85.265625,-65.46875],[85.375,-65.703125],[85.679688,-65.851562],[85.921875,-66.234375],[86.054688,-66.609375],[85.921875,-66.875],[85.78125,-66.933594],[85.710938,-66.962891],[85.675781,-66.977539],[85.640625,-66.992187],[85.630859,-67.022461],[85.621094,-67.052734],[85.601563,-67.113281],[85.5625,-67.234375],[85.640625,-67.664062],[85.5625,-67.890625],[85.289063,-67.929687],[85.167969,-67.898437],[85.107422,-67.882812],[85.046875,-67.867187],[84.988281,-67.84668],[84.929688,-67.826172],[84.8125,-67.785156],[84.695313,-67.744141],[84.636719,-67.723633],[84.578125,-67.703125],[84.524414,-67.688477],[84.470703,-67.673828],[84.363281,-67.644531],[84.148438,-67.585937],[83.648438,-67.4375],[83.3125,-67.484375],[83.175781,-67.554687],[83.107422,-67.589844],[83.073242,-67.607422],[83.039063,-67.625],[83.038086,-67.664062],[83.037109,-67.703125],[83.035156,-67.78125],[83.03125,-67.9375],[83.265625,-68.398437],[83.375,-68.820312],[83.382813,-69.078125],[83.386719,-69.207031],[83.388672,-69.271484],[83.390625,-69.335937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[84.578125,-67.701172],[84.52832,-67.718994],[84.478516,-67.736816],[84.378906,-67.772461],[84.179688,-67.84375],[84.039063,-68.179687],[84.03125,-68.484375],[84.140625,-68.734375],[84.375,-69.046875],[84.59375,-69.210937],[84.765625,-69.359375],[84.800781,-69.503906],[84.818359,-69.576172],[84.827148,-69.612305],[84.835938,-69.648437],[84.841797,-69.675781],[84.847656,-69.703125],[84.859375,-69.757812],[84.882813,-69.867187],[84.96875,-70.039062],[84.839844,-70.128906],[84.775391,-70.173828],[84.743164,-70.196289],[84.710938,-70.21875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[83.859375,-69.703125],[83.826172,-69.676758],[83.792969,-69.650391],[83.726563,-69.597656],[83.59375,-69.492187],[83.492188,-69.414062],[83.441406,-69.375],[83.390625,-69.335937],[83.369141,-69.364258],[83.347656,-69.392578],[83.304688,-69.449219],[83.21875,-69.5625],[83.03125,-69.828125],[82.972656,-69.917969],[82.943359,-69.962891],[82.914063,-70.007812],[82.886719,-70.064453],[82.859375,-70.121094],[82.804688,-70.234375],[82.742188,-70.300781],[82.710938,-70.333984],[82.679688,-70.367187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[82.914063,-70.007812],[82.952148,-70.019531],[82.990234,-70.03125],[83.066406,-70.054687],[83.21875,-70.101562],[83.523438,-70.210937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[80.890625,-55.960937],[80.734375,-56.421875],[80.59375,-56.90625],[80.554688,-57.25],[80.546875,-57.632812],[80.828125,-57.835937],[81.101563,-58.054687],[81.265625,-58.265625],[81.242188,-58.5625],[81.0625,-58.765625],[80.882813,-58.9375],[80.992188,-59.265625],[81.296875,-59.195312],[81.625,-59.203125],[81.9375,-59.265625],[82.257813,-59.148437],[82.601563,-59.34375],[82.75,-59.53125],[82.84375,-59.742187],[83.195313,-59.765625],[83.390625,-59.898437],[83.5625,-60.078125],[83.71875,-60.25],[83.84375,-60.523437],[83.898438,-60.84375],[83.835938,-61.140625],[83.836914,-61.1875],[83.837891,-61.234375],[83.838867,-61.28125],[83.839844,-61.328125],[83.84082,-61.375],[83.841797,-61.421875],[83.842773,-61.46875],[83.843262,-61.492187],[83.84375,-61.515625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[75.15625,-55.6875],[75.140625,-55.71875],[75.125,-55.75],[75.09375,-55.8125],[75.017578,-55.816406],[74.941406,-55.820312],[74.789063,-55.828125],[74.460938,-55.882812],[74.398438,-56.101562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[70.546875,-57.921875],[70.567383,-57.955078],[70.587891,-57.988281],[70.628906,-58.054687],[70.710938,-58.1875],[70.851563,-58.585937],[71.117188,-58.796875],[71.445313,-58.773437],[71.726563,-58.734375],[71.90625,-58.875],[71.921875,-58.960937],[71.929688,-59.003906],[71.9375,-59.046875],[71.931641,-59.084961],[71.925781,-59.123047],[71.914063,-59.199219],[71.890625,-59.351562],[71.734375,-59.640625],[71.78125,-59.859375],[71.929688,-59.898437],[72.328125,-59.734375],[72.742188,-59.585937],[73.015625,-59.5],[73.3125,-59.585937],[73.515625,-59.46875],[73.484375,-59.1875],[73.492188,-58.996094],[73.496094,-58.900391],[73.498047,-58.852539],[73.5,-58.804687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[71.9375,-59.046875],[71.986328,-59.043945],[72.035156,-59.041016],[72.132813,-59.035156],[72.328125,-59.023437],[72.742188,-59.070312],[73.132813,-59.046875],[73.316406,-58.925781],[73.408203,-58.865234],[73.454102,-58.834961],[73.5,-58.804687],[73.535156,-58.789062],[73.570313,-58.773437],[73.640625,-58.742187],[73.78125,-58.679687],[74.234375,-58.515625],[74.625,-58.421875],[74.875,-58.53125],[75.054688,-58.859375],[75.179688,-59.117187],[75.3125,-59.351562],[75.367188,-59.570312],[75.546875,-59.796875],[75.789063,-59.96875],[76.054688,-60.125],[76.195313,-60.289062],[76.296875,-60.578125],[76.476563,-60.78125],[76.734375,-60.976562],[77.054688,-61.445312],[77.257813,-61.65625],[77.601563,-61.703125],[77.765625,-61.953125],[77.992188,-62.203125],[78.058594,-62.277344],[78.091797,-62.314453],[78.125,-62.351562],[78.157227,-62.369141],[78.189453,-62.386719],[78.253906,-62.421875],[78.382813,-62.492187],[78.601563,-62.570312],[78.945313,-62.570312],[79.171875,-62.46875],[79.515625,-62.429687],[79.828125,-62.453125],[80.164063,-62.539062],[80.210938,-62.867187],[80.179688,-63.226562],[80.210938,-63.414062],[80.445313,-63.585937],[80.484375,-63.625],[80.523438,-63.664062],[80.554688,-63.69043],[80.585938,-63.716797],[80.648438,-63.769531],[80.773438,-63.875],[81.289063,-64.039062],[81.6875,-63.984375],[81.96875,-64.078125],[82.042969,-64.136719],[82.080078,-64.166016],[82.117188,-64.195312],[82.091797,-64.242187],[82.066406,-64.289062],[82.041016,-64.335937],[82.015625,-64.382812],[81.986328,-64.412109],[81.957031,-64.441406],[81.927734,-64.470703],[81.898438,-64.5],[81.869141,-64.529297],[81.839844,-64.558594],[81.810547,-64.587891],[81.78125,-64.617187],[81.792969,-64.646484],[81.804688,-64.675781],[81.816406,-64.705078],[81.828125,-64.734375],[81.865234,-64.728516],[81.902344,-64.722656],[81.939453,-64.716797],[81.976563,-64.710937],[82.013672,-64.693359],[82.050781,-64.675781],[82.087891,-64.658203],[82.125,-64.640625],[82.140625,-64.574219],[82.15625,-64.507812],[82.203125,-64.464844],[82.25,-64.421875],[82.320313,-64.417969],[82.390625,-64.414062],[82.398438,-64.46875],[82.40625,-64.523437],[82.373047,-64.556641],[82.339844,-64.589844],[82.306641,-64.623047],[82.273438,-64.65625],[82.259766,-64.691406],[82.246094,-64.726562],[82.232422,-64.761719],[82.21875,-64.796875],[82.214844,-64.837891],[82.210938,-64.878906],[82.207031,-64.919922],[82.203125,-64.960937],[82.230469,-65.019531],[82.257813,-65.078125],[82.3125,-65.195312],[82.5,-65.328125],[82.679688,-65.445312],[82.828125,-65.625],[82.851563,-65.6875],[82.875,-65.75],[82.929688,-65.796875],[82.984375,-65.84375],[83.023438,-65.875],[83.0625,-65.90625],[83.109375,-65.925781],[83.15625,-65.945312],[83.148438,-65.992187],[83.140625,-66.039062],[83.089844,-66.039062],[83.039063,-66.039062],[82.992188,-66.011719],[82.945313,-65.984375],[82.890625,-65.953125],[82.835938,-65.921875],[82.777344,-65.90625],[82.71875,-65.890625],[82.710938,-65.929687],[82.703125,-65.96875],[82.746094,-66.019531],[82.789063,-66.070312],[82.826172,-66.082031],[82.863281,-66.09375],[82.900391,-66.105469],[82.9375,-66.117187],[82.984375,-66.140625],[83.03125,-66.164062],[83.078125,-66.1875],[83.125,-66.210937],[83.181641,-66.226562],[83.238281,-66.242187],[83.351563,-66.273437],[83.5625,-66.3125],[83.8125,-66.304687],[83.96875,-66.390625],[84.101563,-66.523437],[84.28125,-66.71875],[84.546875,-66.914062],[84.742188,-66.9375],[85.078125,-66.953125],[85.359375,-66.9375],[85.5,-66.964844],[85.570313,-66.978516],[85.605469,-66.985352],[85.640625,-66.992187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[70.101563,-60.3125],[70.145508,-60.318359],[70.189453,-60.324219],[70.277344,-60.335937],[70.453125,-60.359375],[70.765625,-60.4375],[71.023438,-60.6875],[71.117188,-60.953125],[71.257813,-61.15625],[71.328125,-61.261719],[71.363281,-61.314453],[71.380859,-61.34082],[71.398438,-61.367187],[71.455078,-61.386719],[71.511719,-61.40625],[71.625,-61.445312],[71.945313,-61.59375],[72.273438,-61.640625],[72.75,-61.632812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[70.351563,-61.570312],[70.386719,-61.566406],[70.421875,-61.5625],[70.492188,-61.554687],[70.632813,-61.539062],[70.960938,-61.445312],[71.257813,-61.414062],[71.328125,-61.390625],[71.363281,-61.378906],[71.398438,-61.367187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[78.125,-62.351562],[78.104492,-62.375],[78.083984,-62.398437],[78.042969,-62.445312],[77.960938,-62.539062],[77.929688,-62.804687],[77.84375,-62.984375],[77.65625,-63.046875],[77.5,-63.21875],[77.359375,-63.492187],[77.28125,-63.609375],[76.929688,-63.625],[76.695313,-63.617187],[76.40625,-63.671875],[76.148438,-63.742187],[76.054688,-63.746094],[75.960938,-63.75],[75.855469,-63.730469],[75.75,-63.710937],[75.695313,-63.699219],[75.640625,-63.6875],[75.585938,-63.675781],[75.53125,-63.664062],[75.492188,-63.714844],[75.453125,-63.765625],[75.488281,-63.804687],[75.523438,-63.84375],[75.558594,-63.882812],[75.59375,-63.921875],[75.695313,-64],[75.796875,-64.078125],[75.804688,-64.171875],[75.8125,-64.265625],[75.71875,-64.4375],[75.53125,-64.445312],[75.375,-64.320312],[75.195313,-64.257812],[74.9375,-64.3125],[74.679688,-64.429687],[74.648438,-64.617187],[74.683594,-64.773437],[74.701172,-64.804687],[74.71875,-64.835937],[74.742188,-64.890625],[74.765625,-64.945312],[74.851563,-65.25],[74.890625,-65.382812],[74.929688,-65.515625],[74.996094,-65.554687],[75.0625,-65.59375],[75.103516,-65.550781],[75.144531,-65.507812],[75.226563,-65.421875],[75.460938,-65.328125],[75.679688,-65.34375],[75.828125,-65.507812],[75.882813,-65.75],[75.898438,-65.984375],[76.085938,-66.195312],[76.3125,-66.398437],[76.3125,-66.59375],[76.367188,-66.835937],[76.53125,-67.039062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[69.734375,-62.4375],[69.758789,-62.469727],[69.783203,-62.501953],[69.832031,-62.566406],[69.929688,-62.695312],[70.21875,-62.804687],[70.671875,-62.796875],[71.054688,-62.773437],[71.460938,-62.765625],[71.75,-62.757812],[72.117188,-62.75],[72.554688,-62.8125],[72.882813,-62.84375],[73.296875,-62.835937],[73.59375,-62.789062],[74.046875,-62.742187],[74.460938,-62.695312],[74.851563,-62.625],[75.023438,-62.515625],[75.164063,-62.335937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[71.734375,-62.765625],[71.867188,-62.9375],[71.992188,-63.226562],[72.296875,-63.5],[72.601563,-63.703125],[72.796875,-63.96875],[73.125,-64.171875],[73.390625,-64.304687],[73.71875,-64.40625],[74.046875,-64.53125],[74.460938,-64.671875],[74.589844,-64.753906],[74.654297,-64.794922],[74.686523,-64.81543],[74.71875,-64.835937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[78.617188,-66.3125],[78.679688,-66.269531],[78.742188,-66.226562],[78.679688,-66.185547],[78.617188,-66.144531],[78.554688,-66.103516],[78.492188,-66.0625],[78.425781,-66.011719],[78.359375,-65.960937],[78.292969,-65.910156],[78.226563,-65.859375],[77.960938,-65.671875],[77.882813,-65.429687],[77.914063,-65.0625],[77.867188,-64.835937],[77.734375,-64.5],[77.804688,-64.234375],[77.992188,-63.960937],[78.1875,-63.601562],[78.3125,-63.398437],[78.390625,-63.132812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[80.523438,-63.664062],[80.505859,-63.698242],[80.488281,-63.732422],[80.453125,-63.800781],[80.382813,-63.9375],[80.3125,-64.195312],[80.171875,-64.453125],[79.890625,-64.617187],[79.859375,-64.757812],[79.890625,-64.953125],[79.9375,-65.03125],[80.164063,-65.117187],[80.25,-65.21875],[80.109375,-65.335937],[79.976563,-65.375],[79.765625,-65.429687],[79.710938,-65.539062],[79.890625,-65.648437],[80.0625,-65.710937],[80.21875,-65.9375],[80.40625,-66.21875],[80.601563,-66.523437],[80.773438,-66.75],[81.085938,-66.78125],[81.40625,-66.6875],[81.570313,-66.609375],[81.652344,-66.558594],[81.693359,-66.533203],[81.734375,-66.507812],[81.773438,-66.507812],[81.8125,-66.507812],[81.890625,-66.507812],[82.15625,-66.59375],[82.289063,-66.726562],[82.5,-67.007812],[82.765625,-67.359375],[82.902344,-67.492187],[82.970703,-67.558594],[83.004883,-67.591797],[83.039063,-67.625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[81.734375,-66.507812],[81.719727,-66.537109],[81.705078,-66.566406],[81.675781,-66.625],[81.617188,-66.742187],[81.625,-67.078125],[81.640625,-67.382812],[81.6875,-67.8125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[75.5625,-68.640625],[75.619141,-68.617187],[75.675781,-68.59375],[75.732422,-68.570312],[75.789063,-68.546875],[75.8125,-68.505859],[75.835938,-68.464844],[75.882813,-68.382812],[76.0625,-68.171875],[76.164063,-67.945312],[76.117188,-67.625],[76.242188,-67.453125],[76.382813,-67.148437],[76.53125,-67.039062],[76.71875,-66.851562],[77.132813,-66.625],[77.375,-66.484375],[77.734375,-66.328125],[78.007813,-66.242187],[78.082031,-66.236328],[78.15625,-66.230469],[78.230469,-66.224609],[78.304688,-66.21875],[78.382813,-66.242187],[78.460938,-66.265625],[78.539063,-66.289062],[78.617188,-66.3125],[78.634766,-66.369141],[78.652344,-66.425781],[78.669922,-66.482422],[78.6875,-66.539062],[78.769531,-66.6875],[78.851563,-66.835937],[78.945313,-67.085937],[78.984375,-67.390625],[78.96875,-67.625],[79.023438,-67.8125],[78.945313,-68.125],[78.890625,-68.34375],[78.796875,-68.554687],[78.789063,-68.695312],[78.914063,-68.859375],[79.171875,-69.03125],[79.382813,-69.171875],[79.570313,-69.195312],[79.765625,-69.265625],[80.03125,-69.351562],[80.304688,-69.304687],[80.539063,-69.335937],[80.632813,-69.386719],[80.679688,-69.412109],[80.726563,-69.4375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[75.679688,-68.804687],[75.707031,-68.740234],[75.734375,-68.675781],[75.761719,-68.611328],[75.775391,-68.579102],[75.789063,-68.546875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[83.335938,-70.539062],[83.351563,-70.599609],[83.367188,-70.660156],[83.398438,-70.78125],[83.46875,-71.09375],[83.5625,-71.375],[83.625,-71.578125],[83.682617,-71.626953],[83.740234,-71.675781],[83.788086,-71.712891],[83.835938,-71.75],[83.917969,-71.839844],[83.958984,-71.884766],[84,-71.929687],[84.025391,-71.949219],[84.050781,-71.96875],[84.101563,-72.007812],[84.203125,-72.085937],[84.289063,-72.140625],[84.332031,-72.167969],[84.375,-72.195312],[84.405273,-72.22168],[84.435547,-72.248047],[84.496094,-72.300781],[84.617188,-72.40625],[84.796875,-72.539062],[85.046875,-72.46875],[85.257813,-72.515625],[85.523438,-72.539062],[85.664063,-72.460937],[85.710938,-72.265625],[85.796875,-72.015625],[85.9375,-71.828125],[86.117188,-71.710937],[86.128906,-71.605469],[86.134766,-71.552734],[86.140625,-71.5]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[84,-71.929687],[83.994385,-71.964844],[83.98877,-72],[83.977539,-72.070312],[83.966309,-72.140625],[83.955078,-72.210937],[83.92334,-72.263672],[83.891602,-72.316406],[83.828125,-72.421875],[83.835938,-72.710937],[83.849609,-72.803711],[83.856445,-72.850098],[83.863281,-72.896484],[83.873047,-72.94043],[83.882813,-72.984375],[83.960938,-73.242187],[83.962891,-73.283203],[83.964844,-73.324219],[83.966797,-73.365234],[83.967773,-73.385742],[83.96875,-73.40625],[83.956055,-73.448242],[83.943359,-73.490234],[83.917969,-73.574219],[83.867188,-73.742187],[83.84375,-73.921875],[83.945313,-74.234375],[84.007813,-74.46875],[84.0625,-74.726562],[84.070313,-74.9375],[84.015625,-75.226562],[83.992188,-75.46875],[84.085938,-75.640625],[84.25,-75.8125],[84.359375,-76],[84.398438,-76.25],[84.414063,-76.386719],[84.421875,-76.455078],[84.425781,-76.489258],[84.429688,-76.523437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[83.953125,-72.210937],[83.992188,-72.205078],[84.03125,-72.199219],[84.109375,-72.1875],[84.242188,-72.191406],[84.308594,-72.193359],[84.341797,-72.194336],[84.375,-72.195312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[83.738281,-71.675781],[83.711426,-71.697754],[83.68457,-71.719727],[83.630859,-71.763672],[83.523438,-71.851562],[83.335938,-72.078125],[83.195313,-72.367187],[83.132813,-72.625],[83.226563,-72.804687],[83.414063,-72.929687],[83.523438,-73.003906],[83.578125,-73.041016],[83.632813,-73.078125],[83.8125,-73.203125],[83.890625,-73.303711],[83.929688,-73.354004],[83.949219,-73.37915],[83.96875,-73.404297]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[83.632813,-73.078125],[83.669922,-73.064453],[83.707031,-73.050781],[83.78125,-73.023437],[83.801758,-72.991699],[83.822266,-72.959961],[83.842773,-72.928223],[83.863281,-72.896484]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[80.0625,-70.5],[80.084961,-70.53418],[80.107422,-70.568359],[80.152344,-70.636719],[80.242188,-70.773437],[80.476563,-71.117187],[80.609375,-71.421875],[80.648438,-71.820312],[80.671875,-72.21875],[80.765625,-72.523437],[80.945313,-72.820312],[81.125,-73.171875],[81.304688,-73.523437],[81.367188,-73.679687],[81.398438,-73.757812],[81.414063,-73.796875],[81.429688,-73.835937],[81.445313,-73.875],[81.460938,-73.914062],[81.492188,-73.992187],[81.523438,-74.070312],[81.539063,-74.109375],[81.554688,-74.148437],[81.572266,-74.1875],[81.589844,-74.226562],[81.625,-74.304687],[81.695313,-74.460937],[81.867188,-74.734375],[82.148438,-74.960937],[82.367188,-75.195312],[82.617188,-75.40625],[82.765625,-75.632812],[82.871094,-75.734375],[82.923828,-75.785156],[82.950195,-75.810547],[82.976563,-75.835937],[83.004883,-75.865234],[83.033203,-75.894531],[83.089844,-75.953125],[83.203125,-76.070312],[83.515625,-76.3125],[83.789063,-76.484375],[84.078125,-76.601562],[84.253906,-76.5625],[84.341797,-76.542969],[84.385742,-76.533203],[84.429688,-76.523437],[84.463867,-76.513672],[84.498047,-76.503906],[84.566406,-76.484375],[84.703125,-76.445312],[84.96875,-76.359375],[85.257813,-76.304687],[85.5625,-76.421875],[85.664063,-76.453125],[85.714844,-76.46875],[85.765625,-76.484375],[85.808594,-76.49707],[85.851563,-76.509766],[85.9375,-76.535156],[86.109375,-76.585937],[86.40625,-76.632812],[86.671875,-76.710937],[86.851563,-76.804687],[87.007813,-77.078125],[87.289063,-77.351562],[87.421875,-77.445312],[87.550781,-77.464844],[87.615234,-77.474609],[87.647461,-77.479492],[87.679688,-77.484375],[87.724609,-77.523437],[87.769531,-77.5625],[87.859375,-77.640625],[87.96875,-77.664062],[88.023438,-77.675781],[88.050781,-77.681641],[88.078125,-77.6875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[88.1875,-77.203125],[88.148438,-77.223633],[88.109375,-77.244141],[88.03125,-77.285156],[87.875,-77.367187],[87.777344,-77.425781],[87.728516,-77.455078],[87.679688,-77.484375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[87.15625,-61.195312],[87.160156,-61.228516],[87.164063,-61.261719],[87.171875,-61.328125],[87.1875,-61.460937],[87.273438,-61.726562],[87.375,-61.992187],[87.476563,-62.289062],[87.507813,-62.5],[87.539063,-62.65625],[87.5625,-63.085937],[87.578125,-63.320312],[87.601563,-63.609375],[87.640625,-63.875],[87.6875,-64.070312],[87.6875,-64.296875],[87.96875,-64.484375],[88.164063,-64.65625],[88.359375,-64.851562],[88.546875,-65.046875],[88.773438,-65.335937],[88.9375,-65.453125],[89.257813,-65.4375],[89.453125,-65.523437],[89.679688,-65.640625],[89.71875,-65.701172],[89.738281,-65.731445],[89.757813,-65.761719],[89.777344,-65.791992],[89.796875,-65.822266],[89.835938,-65.882812],[89.921875,-66.117187],[89.8125,-66.375],[89.726563,-66.625],[89.78125,-66.921875],[89.726563,-67.210937],[89.773438,-67.476562],[89.835938,-67.703125],[89.855469,-67.730469],[89.875,-67.757812],[89.902344,-67.771484],[89.929688,-67.785156],[89.984375,-67.8125],[90.289063,-67.984375],[90.664063,-68.125],[90.960938,-68.117187],[91.234375,-68.148437],[91.539063,-68.296875],[91.953125,-68.445312],[92.359375,-68.671875],[92.773438,-68.914062],[93.171875,-68.992187],[93.546875,-68.890625],[93.773438,-68.679687],[94.023438,-68.414062],[94.195313,-68.25],[94.28125,-68.167969],[94.324219,-68.126953],[94.367188,-68.085937],[94.399414,-68.078125],[94.431641,-68.070312],[94.466553,-68.056641],[94.501465,-68.042969],[94.571289,-68.015625],[94.710938,-67.960937],[94.96875,-67.929687],[95.15625,-67.90625],[95.421875,-67.898437],[95.648438,-67.976562],[95.953125,-68.125],[96.273438,-68.195312],[96.601563,-68.171875],[96.84375,-68.226562],[97.15625,-68.375],[97.382813,-68.453125],[97.703125,-68.476562],[97.960938,-68.453125],[98.101563,-68.480469],[98.171875,-68.494141],[98.207031,-68.500977],[98.242188,-68.507812],[98.277344,-68.516602],[98.3125,-68.525391],[98.382813,-68.542969],[98.523438,-68.578125],[98.8125,-68.570312],[99.0625,-68.625],[99.264648,-68.745117],[99.466797,-68.865234],[99.668945,-68.985352],[99.871094,-69.105469],[100.073242,-69.225586],[100.275391,-69.345703],[100.477539,-69.46582],[100.679688,-69.585937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[91.664063,-63.328125],[91.635742,-63.336914],[91.607422,-63.345703],[91.550781,-63.363281],[91.4375,-63.398437],[91.21875,-63.53125],[91.03125,-63.609375],[90.726563,-63.703125],[90.59375,-63.859375],[90.523438,-64.0625],[90.34375,-64.125],[90.125,-64.257812],[89.992188,-64.515625],[89.835938,-64.835937],[89.8125,-65.132812],[89.851563,-65.351562],[89.835938,-65.53125],[89.796875,-65.646484],[89.777344,-65.704102],[89.767578,-65.73291],[89.757813,-65.761719]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[84.5625,-63.734375],[84.820313,-63.757812],[85.140625,-63.601562],[85.445313,-63.570312],[85.78125,-63.460937],[86.078125,-63.203125],[86.304688,-62.945312],[86.429688,-62.859375],[86.773438,-62.84375],[87.039063,-62.796875],[87.304688,-62.703125],[87.546875,-62.671875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[84.609375,-64.585937],[84.578125,-64.710937],[84.601563,-64.859375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[85.046875,-67.867187],[85.042969,-67.925781],[85.039063,-67.984375],[85.03125,-68.101562],[85.09375,-68.320312],[85.21875,-68.429687],[85.367188,-68.539062],[85.351563,-68.671875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[84.837891,-69.648437],[84.881836,-69.634766],[84.925781,-69.621094],[85.015625,-69.59375],[85.078125,-69.421875],[85.046875,-69.21875],[85.03125,-69.054687],[85.117188,-68.96875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[89.875,-67.757812],[89.835938,-67.773437],[89.796875,-67.789062],[89.71875,-67.820312],[89.625,-68.085937],[89.578125,-68.382812],[89.523438,-68.734375],[89.46875,-68.882812],[89.304688,-69.03125],[89.186523,-69.074219],[89.127441,-69.095703],[89.068359,-69.117187],[89.01416,-69.125],[88.959961,-69.132812],[88.851563,-69.148437],[88.601563,-69.15625],[88.421875,-69.210937],[88.179688,-69.171875],[87.921875,-69.296875],[87.757813,-69.25],[87.601563,-68.953125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[88.734375,-72.007812],[88.755859,-71.947266],[88.777344,-71.886719],[88.820313,-71.765625],[89.078125,-71.515625],[89.203125,-71.1875],[89.203125,-70.789062],[89.296875,-70.46875],[89.4375,-70.117187],[89.382813,-69.828125],[89.226563,-69.601562],[89.125,-69.34375],[89.09668,-69.230469],[89.08252,-69.173828],[89.075439,-69.145508],[89.068359,-69.117187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[93.835938,-65.171875],[93.831055,-65.200195],[93.826172,-65.228516],[93.816406,-65.285156],[93.796875,-65.398437],[93.914063,-65.617187],[94.054688,-65.765625],[94.007813,-66.015625],[94.140625,-66.15625],[94.179688,-66.351562],[94.257813,-66.625],[94.421875,-66.875],[94.507813,-67.171875],[94.546875,-67.40625],[94.5625,-67.632812],[94.5,-67.867187],[94.464844,-67.96875],[94.447266,-68.019531],[94.438477,-68.044922],[94.429688,-68.070312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[95.828125,-65.242187],[95.859375,-65.24707],[95.890625,-65.251953],[95.953125,-65.261719],[96.078125,-65.28125],[96.609375,-65.257812],[96.828125,-65.296875],[97.234375,-65.3125],[97.546875,-65.398437],[97.6875,-65.59375],[97.945313,-65.835937],[98.226563,-65.960937],[98.578125,-66],[98.761719,-66.019531],[98.853516,-66.029297],[98.899414,-66.03418],[98.945313,-66.039062],[98.993164,-66.044922],[99.041016,-66.050781],[99.136719,-66.0625],[99.328125,-66.085937],[99.476563,-66.265625],[99.46875,-66.554687],[99.507813,-66.757812],[99.539063,-67.117187],[99.460938,-67.367187],[99.425781,-67.460937],[99.408203,-67.507812],[99.390625,-67.554687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[99.507813,-66.757812],[99.543945,-66.779297],[99.580078,-66.800781],[99.652344,-66.84375],[99.796875,-66.929687],[100.117188,-66.914062],[100.214844,-66.894531],[100.263672,-66.884766],[100.3125,-66.875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[98.945313,-66.039062],[98.981445,-66.012695],[99.017578,-65.986328],[99.089844,-65.933594],[99.234375,-65.828125],[99.65625,-65.5625],[99.976563,-65.226562],[100.148438,-65.054687],[100.140625,-64.742187],[99.914063,-64.546875],[99.75,-64.460937],[99.667969,-64.417969],[99.626953,-64.396484],[99.585938,-64.375],[99.554688,-64.356445],[99.523438,-64.337891],[99.460938,-64.300781],[99.394531,-64.271484],[99.361328,-64.256836],[99.328125,-64.242187],[99.291016,-64.228516],[99.253906,-64.214844],[99.179688,-64.1875],[99.03125,-64.132812],[98.789063,-63.953125],[98.546875,-63.867187],[98.328125,-63.867187],[98.1875,-63.839844],[98.117188,-63.826172],[98.046875,-63.8125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[99.117188,-62.984375],[99.126953,-63.017578],[99.136719,-63.050781],[99.146484,-63.083984],[99.15625,-63.117187],[99.133789,-63.149414],[99.111328,-63.181641],[99.066406,-63.246094],[99.021484,-63.310547],[98.976563,-63.375],[98.962891,-63.425781],[98.949219,-63.476562],[98.921875,-63.578125],[99.015625,-63.867187],[99.164063,-64.085937],[99.246094,-64.164062],[99.287109,-64.203125],[99.328125,-64.242187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[100.578125,-62.085937],[100.625,-62.095703],[100.671875,-62.105469],[100.765625,-62.125],[100.953125,-62.164062],[101.210938,-62.257812],[101.367188,-62.414062],[101.296875,-62.65625],[101.179688,-62.9375],[101.175781,-63.019531],[101.173828,-63.060547],[101.171875,-63.101562],[101.164063,-63.152344],[101.15625,-63.203125],[101.117188,-63.390625],[101.164063,-63.6875],[101.117188,-64.015625],[101.101563,-64.234375],[101.09375,-64.277344],[101.085938,-64.320312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[99.585938,-64.375],[99.628906,-64.37207],[99.671875,-64.369141],[99.757813,-64.363281],[99.929688,-64.351562],[100.28125,-64.34375],[100.625,-64.328125],[100.820313,-64.296875],[100.953125,-64.308594],[101.019531,-64.314453],[101.052734,-64.317383],[101.085938,-64.320312],[101.125,-64.319336],[101.164063,-64.318359],[101.242188,-64.316406],[101.398438,-64.3125],[101.695313,-64.320312],[101.929688,-64.28125],[102.140625,-64.1875],[102.320313,-64.15625],[102.5625,-64.179687],[102.796875,-64.234375],[102.863281,-64.277344],[102.896484,-64.298828],[102.929688,-64.320312],[102.942383,-64.34668],[102.955078,-64.373047],[102.980469,-64.425781],[103.03125,-64.53125],[103.15625,-64.726562],[103.152344,-64.851562],[103.150391,-64.914062],[103.149414,-64.945312],[103.148438,-64.976562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[101.171875,-63.101562],[101.195313,-63.074219],[101.21875,-63.046875],[101.265625,-62.992187],[101.359375,-62.882812],[101.710938,-62.757812],[101.945313,-62.726562],[102.164063,-62.460937],[102.210938,-62.28125],[102.324219,-62.207031],[102.380859,-62.169922],[102.4375,-62.132812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[102.929688,-64.320312],[102.956055,-64.3125],[102.982422,-64.304687],[103.035156,-64.289062],[103.140625,-64.257812],[103.398438,-64.054687],[103.765625,-63.976562],[103.898438,-63.878906],[103.964844,-63.830078],[103.998047,-63.805664],[104.03125,-63.78125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[99.875,-62.414062],[99.854492,-62.382812],[99.833984,-62.351562],[99.792969,-62.289062],[99.710938,-62.164062],[99.655274,-62.051757],[99.59961,-61.939453],[99.543946,-61.827148],[99.488282,-61.714843],[99.432617,-61.602539],[99.376953,-61.490234],[99.321289,-61.37793],[99.293457,-61.321777],[99.265625,-61.265625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[93.101563,-64.195312],[93.102295,-64.183594],[93.103027,-64.171875],[93.104492,-64.148437],[93.107422,-64.101562],[93.113281,-64.007812],[93.126953,-63.933593],[93.140625,-63.859375],[93.166016,-63.794922],[93.191406,-63.730469],[93.216797,-63.666016],[93.229492,-63.633789],[93.242188,-63.601562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[92.742188,-63.71875],[92.776367,-63.722656],[92.810547,-63.726562],[92.878906,-63.734375],[92.94043,-63.733398],[93.001953,-63.732422],[93.057617,-63.716797],[93.113281,-63.701172],[93.177734,-63.651367],[93.209961,-63.626465],[93.242188,-63.601562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[97.710938,-68.882812],[97.704102,-68.923828],[97.697266,-68.964844],[97.683594,-69.046875],[97.65625,-69.210937],[97.609375,-69.523437],[97.617188,-69.929687],[97.679688,-70.257812],[97.882813,-70.617187],[98.171875,-70.953125],[98.484375,-71.273437],[98.6875,-71.585937],[98.921875,-71.9375],[98.945313,-72.234375],[98.726563,-72.46875],[98.421875,-72.640625],[98.3125,-72.84375],[98.570313,-73.203125],[98.859375,-73.5],[99.070313,-73.8125],[99.195313,-73.976562],[99.257813,-74.058594],[99.289063,-74.099609],[99.320313,-74.140625],[99.353516,-74.172852],[99.386719,-74.205078],[99.453125,-74.269531],[99.585938,-74.398437],[99.867188,-74.65625],[100,-74.992187],[99.953125,-75.242187],[99.726563,-75.585937],[99.578125,-75.875],[99.46875,-76.039062],[99.140625,-76.140625],[98.679688,-76.054687],[98.289063,-75.882812],[97.828125,-75.671875],[97.4375,-75.492187],[97.28125,-75.4375],[97.203125,-75.410156],[97.164063,-75.396484],[97.125,-75.382812],[97.088867,-75.374512],[97.052734,-75.366211],[96.980469,-75.349609],[96.835938,-75.316406],[96.546875,-75.25],[96.046875,-74.953125],[95.625,-74.640625],[95.359375,-74.453125],[95.234375,-74.371094],[95.171875,-74.330078],[95.140625,-74.30957],[95.109375,-74.289062],[95.108398,-74.25],[95.107422,-74.210937],[95.105469,-74.132812],[95.101563,-73.976562],[95.054688,-73.851562],[95.03125,-73.789062],[95.007813,-73.726562],[94.986328,-73.664062],[94.964844,-73.601562],[94.921875,-73.476562],[94.898438,-73.265625],[94.890625,-72.921875],[94.859375,-72.765625],[94.84375,-72.6875],[94.835938,-72.648437],[94.828125,-72.609375],[94.811523,-72.569336],[94.794922,-72.529297],[94.761719,-72.449219],[94.695313,-72.289062],[94.5625,-72.0625],[94.511719,-71.953125],[94.486328,-71.898437],[94.473633,-71.871094],[94.460938,-71.84375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[93.859375,-72.125],[93.890625,-72.139648],[93.921875,-72.154297],[93.984375,-72.183594],[94.109375,-72.242187],[94.414063,-72.429687],[94.59375,-72.523437],[94.710938,-72.566406],[94.769531,-72.587891],[94.828125,-72.609375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[99.320313,-74.140625],[99.294922,-74.165039],[99.269531,-74.189453],[99.21875,-74.238281],[99.117188,-74.335937],[98.898438,-74.5625],[98.585938,-74.796875],[98.132813,-74.976562],[97.796875,-75.0625],[97.453125,-75.15625],[97.203125,-75.289062],[97.164063,-75.335937],[97.125,-75.382812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[95.109375,-74.289062],[95.054688,-74.273437],[95,-74.257812],[94.890625,-74.226562],[94.769531,-74.222656],[94.708984,-74.220703],[94.648438,-74.21875],[94.601563,-74.259766],[94.554688,-74.300781],[94.460938,-74.382812],[94.140625,-74.53125],[93.765625,-74.664062],[93.359375,-74.578125],[92.992188,-74.632812],[92.773438,-74.8125],[92.664063,-75.023437],[92.53125,-75.328125],[92.359375,-75.625],[92.203125,-75.859375],[92.023438,-76.078125],[91.6875,-76.195312],[91.351563,-76.296875],[90.851563,-76.359375],[90.445313,-76.460937],[90.234375,-76.515625],[90.171875,-76.574219],[90.140625,-76.603516],[90.109375,-76.632812],[90.078125,-76.634766],[90.046875,-76.636719],[89.984375,-76.640625],[89.765625,-76.554687],[89.585938,-76.726562],[89.429688,-76.898437],[89.273438,-77.007812],[89.070313,-76.953125],[88.773438,-76.875],[88.695313,-76.828125],[88.65625,-76.804687],[88.617188,-76.78125]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[95.007813,-73.726562],[94.966797,-73.783203],[94.925781,-73.839844],[94.84375,-73.953125],[94.746094,-74.085937],[94.697266,-74.152344],[94.648438,-74.21875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[90.914063,-79.390625],[90.908203,-79.34668],[90.902344,-79.302734],[90.890625,-79.214844],[90.867188,-79.039062],[90.640625,-78.695312],[90.382813,-78.46875],[90.289063,-78.132812],[90.367188,-77.664062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[90.109375,-76.632812],[90.137695,-76.643555],[90.166016,-76.654297],[90.222656,-76.675781],[90.335938,-76.71875],[90.601563,-76.671875],[90.84375,-76.773437],[91.195313,-76.875],[91.453125,-76.984375],[91.570313,-77.164062],[91.609375,-77.507812],[91.648438,-77.773437],[91.671875,-78.164062],[91.734375,-78.40625],[91.78125,-78.71875],[91.695313,-79.09375],[91.492188,-79.34375],[91.242188,-79.570312],[91.121094,-79.632812],[91.060547,-79.664062],[91.030273,-79.679687],[91,-79.695312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[85.765625,-76.484375],[85.771484,-76.533203],[85.777344,-76.582031],[85.789063,-76.679687],[85.78125,-77.054687],[85.703125,-77.34375],[85.640625,-77.554687],[85.609375,-77.796875],[85.742188,-78.03125],[86.007813,-78.25],[86.242188,-78.421875],[86.398438,-78.632812],[86.40625,-78.953125],[86.304688,-79.257812],[86.039063,-79.523437],[85.867188,-79.726562],[85.554688,-79.929687],[85.40625,-80.101562],[85.453125,-80.382812],[85.6875,-80.5625],[85.867188,-80.851562],[85.992188,-81.21875],[86.117188,-81.578125],[86.359375,-81.960937],[86.421875,-82.203125],[86.453125,-82.339844],[86.46875,-82.408203],[86.476563,-82.442383],[86.484375,-82.476562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[74.828125,-68.398437],[74.824219,-68.436523],[74.820313,-68.474609],[74.8125,-68.550781],[74.796875,-68.703125],[74.9375,-69],[75.164063,-69.289062],[75.21875,-69.492187],[75.1875,-69.789062],[75.257813,-70.078125],[75.226563,-70.328125],[75.34375,-70.609375],[75.351563,-70.945312],[75.328125,-71.273437],[75.351563,-71.632812],[75.492188,-71.875],[75.648438,-72.140625],[75.820313,-72.3125],[75.765625,-72.515625],[75.859375,-72.671875],[75.859375,-72.8125],[75.984375,-73.0625],[76.03125,-73.476562],[76.1875,-73.773437],[76.382813,-73.992187],[76.492188,-74.320312],[76.5625,-74.65625],[76.515625,-74.992187],[76.40625,-75.25],[76.28125,-75.492187],[76.265625,-75.59375],[76.257813,-75.644531],[76.25,-75.695312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[73.617188,-78.953125],[73.648438,-78.710937],[73.59375,-78.484375],[73.820313,-78.1875],[73.9375,-77.960937],[74.171875,-77.765625],[74.320313,-77.539062],[74.328125,-77.3125],[74.09375,-76.945312],[74,-76.632812],[74.179688,-76.34375],[74.5,-76.195312],[74.8125,-76.101562],[75.273438,-76.007812],[75.695313,-75.90625],[76,-75.78125],[76.125,-75.738281],[76.1875,-75.716797],[76.21875,-75.706055],[76.25,-75.695312],[76.298828,-75.720703],[76.347656,-75.746094],[76.445313,-75.796875],[76.492188,-75.917969],[76.539063,-76.039062],[76.675781,-76.003906],[76.8125,-75.96875],[76.878906,-75.916016],[76.945313,-75.863281],[77.011719,-75.810547],[77.044922,-75.78418],[77.078125,-75.757812],[77.125,-75.796875],[77.171875,-75.835937],[77.167969,-75.894531],[77.164063,-75.953125],[77.123047,-75.996094],[77.082031,-76.039062],[77,-76.125],[76.929688,-76.207031],[76.859375,-76.289062],[76.792969,-76.375],[76.759766,-76.417969],[76.726563,-76.460937],[76.734375,-76.523437],[76.742188,-76.585937],[76.828125,-76.578125],[76.914063,-76.570312],[76.953125,-76.537109],[76.992188,-76.503906],[77.070313,-76.4375],[77.164063,-76.339844],[77.257813,-76.242187],[77.421875,-76.148437],[77.472656,-76.148437],[77.523438,-76.148437],[77.5625,-76.191406],[77.601563,-76.234375],[77.679688,-76.320312],[77.804688,-76.632812],[77.820313,-77.023437],[77.8125,-77.398437],[77.757813,-77.625],[77.726563,-77.835937],[77.9375,-77.96875],[78.132813,-78.023437],[78.242188,-78.242187],[78.46875,-78.351562],[78.71875,-78.1875],[78.820313,-78.140625],[78.871094,-78.117187],[78.921875,-78.09375],[78.938477,-78.124023],[78.955078,-78.154297],[78.988281,-78.214844],[79.054688,-78.335937],[79.085938,-78.617187],[79.171875,-78.882812],[79.320313,-79.03125],[79.414063,-79.34375],[79.46875,-79.625],[79.757813,-79.9375],[79.890625,-80.164062],[79.914063,-80.367187],[79.851563,-80.578125],[79.703125,-80.6875],[79.546875,-80.679687],[79.257813,-80.8125],[79.03125,-80.976562],[78.828125,-81.078125],[78.578125,-81.117187],[78.453125,-81.25],[78.515625,-81.515625],[78.5,-81.703125],[78.375,-81.929687],[78.273438,-82.078125],[78.15625,-82.179687],[77.96875,-82.117187],[77.757813,-81.96875],[77.578125,-82.078125],[77.398438,-82.25],[77.296875,-82.414062],[77.171875,-82.5625],[77.082031,-82.628906],[77.037109,-82.662109],[76.992188,-82.695312],[76.919922,-82.707031],[76.847656,-82.71875],[76.775391,-82.730469],[76.739258,-82.736328],[76.703125,-82.742187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[81.429688,-73.835937],[81.400391,-73.875],[81.371094,-73.914062],[81.3125,-73.992187],[81.253906,-74.09375],[81.224609,-74.144531],[81.195313,-74.195312],[81.164063,-74.208008],[81.132813,-74.220703],[81.070313,-74.246094],[80.945313,-74.296875],[80.59375,-74.5],[80.382813,-74.71875],[80.21875,-74.929687],[80.117188,-75.070312],[80.0625,-75.28125],[79.757813,-75.421875],[79.46875,-75.398437],[79.265625,-75.367187],[79.023438,-75.367187],[78.703125,-75.359375],[78.34375,-75.382812],[78.140625,-75.507812],[77.84375,-75.804687],[77.703125,-75.945312],[77.554688,-76.0625],[77.539063,-76.105469],[77.523438,-76.148437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[81.195313,-74.195312],[81.25,-74.183594],[81.304688,-74.171875],[81.414063,-74.148437],[81.484375,-74.148437],[81.519531,-74.148437],[81.554688,-74.148437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[82.976563,-75.835937],[82.945313,-75.867187],[82.914063,-75.898437],[82.851563,-75.960937],[82.726563,-76.085937],[82.359375,-76.273437],[81.9375,-76.414062],[81.6875,-76.554687],[81.460938,-76.71875],[81.101563,-76.890625],[80.84375,-77.101562],[80.679688,-77.242187],[80.59375,-77.421875],[80.445313,-77.53125],[80.140625,-77.65625],[79.757813,-77.789062],[79.460938,-77.859375],[79.171875,-77.914062],[79.046875,-78.003906],[78.984375,-78.048828],[78.953125,-78.071289],[78.921875,-78.09375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[80.585938,-85.054687],[80.549805,-85.053711],[80.513672,-85.052734],[80.441406,-85.050781],[80.296875,-85.046875],[79.804688,-84.992187],[79.28125,-84.679687],[78.867188,-84.34375],[78.554688,-83.984375],[78.328125,-83.632812],[78.085938,-83.351562],[77.804688,-83.15625],[77.296875,-82.882812],[77.164063,-82.832031],[77.097656,-82.806641],[77.03125,-82.78125],[76.949219,-82.771484],[76.867188,-82.761719],[76.785156,-82.751953],[76.744141,-82.74707],[76.703125,-82.742187],[76.664063,-82.753906],[76.625,-82.765625],[76.546875,-82.789062],[76.390625,-82.835937],[75.992188,-83.070312],[75.726563,-83.171875],[75.257813,-83.179687],[74.976563,-83.148437],[74.46875,-83.21875],[74.023438,-83.242187],[73.765625,-83.28125],[73.484375,-83.46875],[73.15625,-83.640625],[72.75,-83.765625],[72.601563,-83.914062],[72.515625,-84.117187],[72.507813,-84.320312],[72.570313,-84.585937],[72.695313,-84.773437],[72.867188,-85.007812],[73.070313,-85.34375],[73.171875,-85.601562],[73.242188,-85.898437],[73.269531,-86.054687],[73.283203,-86.132812],[73.290039,-86.171875],[73.296875,-86.210937],[73.321289,-86.237305],[73.345703,-86.263672],[73.394531,-86.316406],[73.492188,-86.421875],[73.914063,-86.546875],[74.265625,-86.515625],[74.585938,-86.609375],[74.929688,-86.695312],[75.25,-86.789062],[75.359375,-86.898437],[75.375,-87.101562],[75.25,-87.265625],[75.148438,-87.4375],[75.148438,-87.609375],[75.117188,-87.789062],[75.113281,-87.914062],[75.111328,-87.976562],[75.109375,-88.039062],[75.152344,-88.082031],[75.195313,-88.125],[75.28125,-88.210937],[75.523438,-88.273437],[75.875,-88.265625],[76.179688,-88.304687],[76.324219,-88.332031],[76.396484,-88.345703],[76.46875,-88.359375],[76.548828,-88.384766],[76.628906,-88.410156],[76.789063,-88.460937],[77.195313,-88.671875],[77.5,-88.820312],[77.8125,-88.898437],[78.179688,-88.882812],[78.570313,-88.820312],[78.84375,-88.804687],[79.125,-88.828125],[79.367188,-88.945312],[79.414063,-89.140625],[79.4375,-89.351562],[79.554688,-89.5],[79.859375,-89.632812],[80.132813,-89.804687],[80.554688,-90.070312],[80.78125,-90.210937],[80.851563,-90.253906],[80.886719,-90.275391],[80.921875,-90.296875],[80.951172,-90.322266],[80.980469,-90.347656],[81.039063,-90.398437],[81.097656,-90.507812],[81.126953,-90.5625],[81.15625,-90.617187],[81.15332,-90.654297],[81.150391,-90.691406],[81.144531,-90.765625],[81.132813,-90.914062],[81.078125,-91.125],[81.007813,-91.257812],[81.070313,-91.476562],[81.226563,-91.71875],[81.414063,-91.914062],[81.664063,-92.085937],[81.796875,-92.234375],[81.640625,-92.382812],[81.414063,-92.507812],[81.125,-92.554687],[80.914063,-92.625],[80.75,-92.78125],[80.714844,-92.917969],[80.697266,-92.986328],[80.688477,-93.020508],[80.679688,-93.054687],[80.691406,-93.101074],[80.703125,-93.147461],[80.714844,-93.193848],[80.726563,-93.240234],[80.744141,-93.27002],[80.761719,-93.299805],[80.796875,-93.359375],[80.828125,-93.695312],[80.671875,-93.992187],[80.523438,-94.132812],[80.390625,-94.304687],[80.382813,-94.445312],[80.539063,-94.601562],[80.632813,-94.789062],[80.585938,-94.945312],[80.320313,-94.976562],[80.257813,-95.117187],[80.246094,-95.234375],[80.240234,-95.292969],[80.234375,-95.351562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[80.726563,-93.242187],[80.398438,-93.265625],[79.945313,-93.304687],[79.640625,-93.296875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[73.296875,-86.210937],[73.269531,-86.236328],[73.242188,-86.261719],[73.1875,-86.3125],[72.921875,-86.492187],[72.726563,-86.851562],[72.671875,-87.21875],[72.703125,-87.570312],[72.828125,-87.851562],[73.015625,-88.085937],[73.203125,-88.335937],[73.304688,-88.625],[73.625,-88.984375],[73.882813,-89.171875],[74.125,-89.367187],[74.328125,-89.5625],[74.53125,-89.742187],[74.734375,-90.007812],[74.851563,-90.183594],[74.910156,-90.271484],[74.939453,-90.31543],[74.966797,-90.357422],[74.975586,-90.397461],[74.982422,-90.435547],[74.996094,-90.511719],[75.023438,-90.664062],[75.03125,-90.992187],[75.023438,-91.265625],[75.03125,-91.5],[75.125,-91.78125],[75.3125,-92.078125],[75.453125,-92.429687],[75.601563,-92.757812],[75.734375,-93.125],[75.898438,-93.484375],[76.007813,-93.742187],[76.023438,-94],[76.164063,-94.210937],[76.414063,-94.335937],[76.710938,-94.320312],[77.007813,-94.21875],[77.25,-94.203125],[77.585938,-94.257812],[78.039063,-94.351562],[78.265625,-94.460937],[78.4375,-94.789062],[78.648438,-95.085937],[78.859375,-95.273437],[79.148438,-95.304687],[79.5,-95.203125],[79.648438,-95.1875],[79.789063,-95.289062],[80.007813,-95.335937],[80.121094,-95.34375],[80.177734,-95.347656],[80.234375,-95.351562],[80.283203,-95.375],[80.332031,-95.398437],[80.429688,-95.445312],[80.773438,-95.523437],[81.117188,-95.570312],[81.398438,-95.578125],[81.820313,-95.609375],[82.125,-95.625],[82.199219,-95.638672],[82.273438,-95.652344],[82.347656,-95.666016],[82.421875,-95.679687],[82.47583,-95.689453],[82.529785,-95.699219],[82.58374,-95.708984],[82.637695,-95.71875],[82.69165,-95.728516],[82.745605,-95.738281],[82.772583,-95.743164],[82.799561,-95.748047],[82.853516,-95.757812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[80.679688,-93.054687],[80.719727,-93.071289],[80.759766,-93.087891],[80.839844,-93.121094],[81,-93.1875],[81.421875,-93.234375],[81.804688,-93.375],[82.265625,-93.5],[82.734375,-93.59375],[83.21875,-93.570312],[83.585938,-93.523437],[84.140625,-93.351562],[84.4375,-93.148437],[84.679688,-92.890625],[84.875,-92.640625],[84.957031,-92.550781],[84.998047,-92.505859],[85.018555,-92.483398],[85.039063,-92.460937],[85.075195,-92.43457],[85.111328,-92.408203],[85.183594,-92.355469],[85.328125,-92.25],[85.640625,-92.125],[85.976563,-91.835937],[86.171875,-91.648437],[86.375,-91.484375],[86.640625,-91.3125],[86.78125,-91.1875],[86.894531,-91.132812],[86.951172,-91.105469],[87.007813,-91.078125],[87.064453,-91.067383],[87.121094,-91.056641],[87.234375,-91.035156],[87.460938,-90.992187],[87.75,-90.992187],[88.125,-90.992187],[88.429688,-91.007812],[88.625,-91.03125],[88.898438,-91.117187],[89.351563,-91.179687],[89.617188,-91.226562],[89.914063,-91.320312],[90.195313,-91.375],[90.351563,-91.386719],[90.429688,-91.392578],[90.46875,-91.395508],[90.507813,-91.398437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[75.109375,-88.039062],[75.058594,-88.058594],[75.007813,-88.078125],[74.90625,-88.117187],[74.710938,-88.210937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[76.46875,-88.359375],[76.443359,-88.408203],[76.417969,-88.457031],[76.367188,-88.554687],[76.3125,-88.765625],[76.203125,-88.96875],[76.03125,-89.054687],[75.6875,-89.078125],[75.421875,-89.109375],[75.132813,-89.21875],[75.039063,-89.398437],[75.007813,-89.65625],[75,-89.929687],[74.976563,-90.1875],[74.97168,-90.273437],[74.969238,-90.316406],[74.966797,-90.359375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[98.109375,-83.25],[98.048828,-83.25],[97.988281,-83.25],[97.927734,-83.25],[97.867188,-83.25],[97.787109,-83.25],[97.707031,-83.25],[97.630859,-83.246094],[97.554688,-83.242187],[97.501953,-83.236328],[97.449219,-83.230469],[97.34375,-83.21875],[97.132813,-83.195312],[96.6875,-83.09375],[96.429688,-82.890625],[96.25,-82.609375],[95.804688,-82.414062],[95.140625,-82.390625],[94.585938,-82.421875],[94.226563,-82.421875],[93.867188,-82.429687],[93.730469,-82.429687],[93.662109,-82.429687],[93.59375,-82.429687],[93.535156,-82.430664],[93.476563,-82.431641],[93.359375,-82.433594],[93.125,-82.4375],[92.890625,-82.476562],[92.476563,-82.65625],[92.3125,-82.699219],[92.21875,-82.724609],[92.148438,-82.742187],[92.095703,-82.760742],[92.042969,-82.779297],[91.9375,-82.816406],[91.726563,-82.890625],[91.46875,-82.96875],[91.054688,-82.960937],[90.695313,-82.984375],[90.398438,-83.078125],[90.265625,-83.1875],[90.199219,-83.242187],[90.166016,-83.269531],[90.132813,-83.296875],[90.094727,-83.317383],[90.056641,-83.337891],[89.980469,-83.378906],[89.828125,-83.460937],[89.515625,-83.59375],[89.140625,-83.617187],[88.953125,-83.40625],[88.796875,-83.171875],[88.554688,-82.859375],[88.320313,-82.664062],[87.953125,-82.484375],[87.507813,-82.414062],[87.101563,-82.4375],[86.726563,-82.414062],[86.605469,-82.445312],[86.544922,-82.460937],[86.484375,-82.476562],[86.451172,-82.486328],[86.417969,-82.496094],[86.351563,-82.515625],[86.21875,-82.554687],[86.09375,-82.613281],[86.03125,-82.642578],[85.96875,-82.671875],[85.919922,-82.6875],[85.871094,-82.703125],[85.773438,-82.734375],[85.578125,-82.796875],[85.125,-82.984375],[84.875,-83.15625],[84.570313,-83.351562],[84.304688,-83.445312],[83.9375,-83.554687],[83.625,-83.617187],[83.210938,-83.726562],[82.96875,-83.804687],[82.648438,-83.929687],[82.351563,-84.125],[82.125,-84.328125],[81.828125,-84.53125],[81.539063,-84.6875],[81.195313,-84.84375],[80.835938,-84.960937],[80.710938,-85.007812],[80.648438,-85.03125],[80.585938,-85.054687],[80.563965,-85.077637],[80.541992,-85.100586],[80.498047,-85.146484],[80.410156,-85.238281],[80.234375,-85.421875],[80.226563,-85.726562],[80.203125,-85.992187],[80.210938,-86.21875],[80.289063,-86.515625],[80.359375,-86.859375],[80.398438,-87.140625],[80.53125,-87.421875],[80.640625,-87.703125],[80.703125,-88],[80.828125,-88.273437],[80.929688,-88.679687],[81,-89.101562],[81.046875,-89.351562],[81.109375,-89.625],[81.152344,-89.777344],[81.173828,-89.853516],[81.18457,-89.891602],[81.195313,-89.929687],[81.259766,-89.914062],[81.324219,-89.898437],[81.400391,-89.875],[81.438477,-89.863281],[81.476563,-89.851562],[81.523438,-89.832031],[81.570313,-89.8125],[81.664063,-89.773437],[81.898438,-89.851562],[82.101563,-89.875],[82.398438,-89.78125],[82.601563,-89.78125],[82.828125,-89.773437],[83.085938,-89.90625],[83.367188,-90.179687],[83.601563,-90.382812],[83.867188,-90.546875],[84.179688,-90.53125],[84.4375,-90.421875],[84.6875,-90.359375],[84.984375,-90.289062],[85.3125,-90.296875],[85.507813,-90.390625],[85.660156,-90.441406],[85.736328,-90.466797],[85.774414,-90.479492],[85.8125,-90.492187],[85.852539,-90.493164],[85.892578,-90.494141],[85.972656,-90.496094],[86.132813,-90.5],[86.40625,-90.601562],[86.65625,-90.75],[86.875,-90.921875],[86.941406,-91.000977],[86.974609,-91.040527],[87.007813,-91.080078],[87.044922,-91.122559],[87.082031,-91.165039],[87.15625,-91.25],[87.304688,-91.484375],[87.492188,-91.757812],[87.570313,-92.007812],[87.632813,-92.328125],[87.765625,-92.539062],[87.945313,-92.84375],[88.117188,-93.09375],[88.269531,-93.210937],[88.345703,-93.269531],[88.383789,-93.298828],[88.421875,-93.328125],[88.463867,-93.350586],[88.505859,-93.373047],[88.589844,-93.417969],[88.757813,-93.507812],[88.960938,-93.75],[89.21875,-93.929687],[89.53125,-94.164062],[89.765625,-94.335937],[89.992188,-94.53125],[90.179688,-94.679687],[90.304688,-94.921875],[90.234375,-95.15625],[90.164063,-95.390625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[81.195313,-89.931641],[81.1875,-89.98584],[81.179688,-90.040039],[81.171875,-90.094238],[81.164063,-90.148437],[81.169922,-90.207031],[81.175781,-90.265625],[81.1875,-90.382812],[81.171875,-90.5],[81.164063,-90.558594],[81.15625,-90.617187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[80.921875,-90.296875],[80.957031,-90.279297],[80.992188,-90.261719],[81.0625,-90.226562],[81.113281,-90.1875],[81.164063,-90.148437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[81.476563,-89.851562],[81.489258,-89.886719],[81.501953,-89.921875],[81.527344,-89.992187],[81.578125,-90.132812],[81.726563,-90.367187],[81.953125,-90.570312],[82.203125,-90.726562],[82.515625,-90.90625],[82.875,-91.0625],[83.289063,-91.210937],[83.789063,-91.25],[84.109375,-91.320312],[84.429688,-91.484375],[84.671875,-91.695312],[84.828125,-91.992187],[84.914063,-92.265625],[84.976563,-92.363281],[85.007813,-92.412109],[85.023438,-92.436523],[85.039063,-92.460937]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[85.970703,-82.671875],[85.993652,-82.722656],[86.016602,-82.773437],[86.0625,-82.875],[86.234375,-83.125],[86.414063,-83.34375],[86.484375,-83.554687],[86.382813,-83.757812],[86.226563,-84],[86.171875,-84.1875],[86.1875,-84.570312],[86.164063,-84.835937],[86.101563,-85.078125],[86,-85.234375],[85.757813,-85.351562],[85.65625,-85.507812],[85.625,-85.78125],[85.617188,-85.976562],[85.679688,-86.289062],[85.6875,-86.484375],[85.632813,-86.796875],[85.554688,-87.125],[85.515625,-87.351562],[85.554688,-87.679687],[85.648438,-87.976562],[85.703125,-88.289062],[85.679688,-88.601562],[85.570313,-88.898437],[85.476563,-89.179687],[85.445313,-89.390625],[85.585938,-89.65625],[85.742188,-89.867187],[85.796875,-90.179687],[85.804688,-90.335937],[85.808594,-90.414062],[85.810547,-90.453125],[85.8125,-90.492187]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[90.132813,-83.296875],[90.117188,-83.329102],[90.101563,-83.361328],[90.070313,-83.425781],[90.007813,-83.554687],[89.867188,-83.851562],[89.710938,-84.117187],[89.625,-84.382812],[89.523438,-84.664062],[89.4375,-84.929687],[89.421875,-85.25],[89.507813,-85.5],[89.664063,-85.734375],[90.078125,-85.757812],[90.53125,-85.78125],[90.921875,-85.875],[91.21875,-86.039062],[91.648438,-86.304687],[92.03125,-86.523437],[92.398438,-86.71875],[92.804688,-86.90625],[93.203125,-87.007812],[93.65625,-87.0625],[94.046875,-87.039062],[94.207031,-87.003906],[94.287109,-86.986328],[94.327148,-86.977539],[94.367188,-86.96875],[94.412109,-86.955078],[94.457031,-86.941406],[94.546875,-86.914062],[94.726563,-86.859375],[95.148438,-86.632812],[95.570313,-86.453125],[95.699219,-86.324219],[95.763672,-86.259766],[95.795898,-86.227539],[95.828125,-86.195312],[95.867188,-86.164062],[95.90625,-86.132812],[95.984375,-86.070312],[96.140625,-85.945312],[96.453125,-85.726562],[96.921875,-85.53125],[97.351563,-85.445312],[97.742188,-85.453125],[97.835938,-85.437988],[97.929688,-85.422852],[98.023438,-85.407715],[98.070313,-85.400146],[98.117188,-85.392578],[98.171875,-85.384521],[98.226563,-85.376465],[98.28125,-85.368408],[98.335938,-85.360352],[98.390625,-85.352295],[98.445313,-85.344238],[98.5,-85.336182],[98.554688,-85.328125],[98.633301,-85.30957],[98.711914,-85.291016],[98.790527,-85.272461],[98.869141,-85.253906],[98.966309,-85.233398],[99.063477,-85.212891],[99.160645,-85.192383],[99.219971,-85.181152],[99.279297,-85.169922],[99.352051,-85.135254],[99.424805,-85.100586],[99.497559,-85.065918],[99.570313,-85.03125],[99.607422,-84.955078],[99.644531,-84.878906],[99.681641,-84.802734],[99.71875,-84.726562],[99.711426,-84.631348],[99.704102,-84.536133],[99.696777,-84.440918],[99.689453,-84.345703],[99.690186,-84.276123],[99.690918,-84.206543],[99.69165,-84.136963],[99.692383,-84.067383],[99.693115,-83.997803],[99.693848,-83.928223],[99.69458,-83.858643],[99.695313,-83.789062],[99.695313,-83.6875],[99.695313,-83.636719],[99.695313,-83.585937],[99.695313,-83.535156],[99.695313,-83.484375],[99.695313,-83.433594],[99.695313,-83.382812],[99.693359,-83.292969],[99.691406,-83.203125],[99.689453,-83.113281],[99.6875,-83.023437],[99.688477,-82.975586],[99.689453,-82.927734],[99.69043,-82.879883],[99.691406,-82.832031],[99.692383,-82.78418],[99.693359,-82.736328],[99.694336,-82.688477],[99.695313,-82.640625],[99.691406,-82.585937],[99.6875,-82.53125],[99.683594,-82.476562],[99.679688,-82.421875],[99.628906,-82.384766],[99.578125,-82.347656],[99.527344,-82.310547],[99.476563,-82.273437],[99.46875,-82.205078],[99.460938,-82.136719],[99.453125,-82.068359],[99.445313,-82],[99.4375,-81.933594],[99.429688,-81.867187],[99.421875,-81.800781],[99.414063,-81.734375],[99.370117,-81.728516],[99.326172,-81.722656],[99.282227,-81.716797],[99.238281,-81.710937],[99.194336,-81.705078],[99.150391,-81.699219],[99.106445,-81.693359],[99.0625,-81.6875],[99.00293,-81.688477],[98.943359,-81.689453],[98.883789,-81.69043],[98.824219,-81.691406],[98.764648,-81.692383],[98.705078,-81.693359],[98.645508,-81.694336],[98.585938,-81.695312],[98.523438,-81.700195],[98.460938,-81.705078],[98.398438,-81.709961],[98.335938,-81.714844],[98.273438,-81.719727],[98.210938,-81.724609],[98.148438,-81.729492],[98.085938,-81.734375],[98.013672,-81.732422],[97.941406,-81.730469],[97.869141,-81.728516],[97.796875,-81.726562],[97.791016,-81.791016],[97.785156,-81.855469],[97.779297,-81.919922],[97.773438,-81.984375],[97.775391,-82.050781],[97.777344,-82.117187],[97.779297,-82.183594],[97.78125,-82.25],[97.789063,-82.339844],[97.796875,-82.429687],[97.794922,-82.469727],[97.792969,-82.509766],[97.789063,-82.589844],[97.785156,-82.669922],[97.78125,-82.75],[97.783203,-82.814453],[97.785156,-82.878906],[97.787109,-82.943359],[97.789063,-83.007812],[97.867188,-83.023437],[97.945313,-83.039062],[97.984375,-83.046875],[98.023438,-83.054687],[98.0625,-83.0625],[98.101563,-83.070312],[98.151367,-83.06543],[98.201172,-83.060547],[98.250977,-83.055664],[98.300781,-83.050781],[98.350586,-83.045898],[98.400391,-83.041016],[98.450195,-83.036133],[98.5,-83.03125],[98.548828,-83.032227],[98.597656,-83.033203],[98.646484,-83.03418],[98.695313,-83.035156],[98.744141,-83.036133],[98.792969,-83.037109],[98.841797,-83.038086],[98.890625,-83.039062],[98.949219,-83.038086],[99.007813,-83.037109],[99.066406,-83.036133],[99.125,-83.035156],[99.183594,-83.03418],[99.242188,-83.033203],[99.300781,-83.032227],[99.359375,-83.03125],[99.441406,-83.029297],[99.523438,-83.027344],[99.605469,-83.025391],[99.6875,-83.023437]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[97.796875,-82.429687],[97.756836,-82.427734],[97.716797,-82.425781],[97.636719,-82.421875],[97.476563,-82.414062],[97.101563,-82.25],[96.742188,-81.992187],[96.382813,-81.8125],[95.890625,-81.78125],[95.515625,-81.851562],[95.101563,-81.851562],[94.601563,-81.898437],[94.328125,-81.984375],[93.929688,-82.109375],[93.761719,-82.269531],[93.677734,-82.349609],[93.635742,-82.389648],[93.59375,-82.429687]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[98.890625,-83.039062],[98.887207,-83.110352],[98.883789,-83.181641],[98.880371,-83.25293],[98.876953,-83.324219],[98.876465,-83.385742],[98.875977,-83.447266],[98.875488,-83.508789],[98.875,-83.570312],[98.876953,-83.630859],[98.878906,-83.691406],[98.880859,-83.751953],[98.882813,-83.8125],[98.884766,-83.875],[98.886719,-83.9375],[98.888672,-84],[98.890625,-84.0625],[98.890625,-84.134766],[98.890625,-84.207031],[98.890625,-84.279297],[98.890625,-84.351562],[98.891113,-84.401855],[98.891602,-84.452148],[98.89209,-84.502441],[98.892578,-84.552734],[98.89209,-84.611816],[98.891602,-84.670898],[98.891113,-84.72998],[98.890625,-84.789062],[98.886719,-84.837891],[98.882813,-84.886719],[98.878906,-84.935547],[98.875,-84.984375],[98.873047,-85.048828],[98.871094,-85.113281],[98.870117,-85.183594],[98.869141,-85.253906]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[98.101563,-83.070312],[98.103516,-83.115234],[98.105469,-83.160156],[98.107422,-83.205078],[98.109375,-83.25],[98.108887,-83.34082],[98.108398,-83.431641],[98.10791,-83.522461],[98.107422,-83.613281],[98.106689,-83.661621],[98.105957,-83.709961],[98.105225,-83.758301],[98.104492,-83.806641],[98.10376,-83.85498],[98.103027,-83.90332],[98.102295,-83.95166],[98.101563,-84],[98.102539,-84.046875],[98.103516,-84.09375],[98.104004,-84.160645],[98.104492,-84.227539],[98.10498,-84.294434],[98.105469,-84.361328],[98.106445,-84.411621],[98.107422,-84.461914],[98.108398,-84.512207],[98.109375,-84.5625],[98.111328,-84.625],[98.113281,-84.6875],[98.11377,-84.736328],[98.114258,-84.785156],[98.114746,-84.833984],[98.115234,-84.882812],[98.115723,-84.931641],[98.116211,-84.980469],[98.116699,-85.029297],[98.117188,-85.078125],[98.121094,-85.164062],[98.125,-85.25],[98.121094,-85.320312],[98.117188,-85.390625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[98.105469,-84.361328],[98.154541,-84.360718],[98.203613,-84.360107],[98.301758,-84.358887],[98.399902,-84.357666],[98.498047,-84.356445],[98.596191,-84.355225],[98.694336,-84.354004],[98.79248,-84.352783],[98.841553,-84.352173],[98.890625,-84.351562],[98.951172,-84.347656],[99.011719,-84.34375],[99.072266,-84.339844],[99.132813,-84.335937],[99.208984,-84.333984],[99.285156,-84.332031],[99.361328,-84.330078],[99.4375,-84.328125],[99.505859,-84.333984],[99.574219,-84.339844],[99.642578,-84.345703],[99.689453,-84.345703]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[97.554688,-83.242187],[97.554688,-83.314453],[97.554688,-83.386719],[97.554688,-83.458984],[97.554688,-83.53125],[97.554688,-83.599609],[97.554688,-83.667969],[97.554688,-83.736328],[97.554688,-83.804687],[97.552734,-83.871094],[97.550781,-83.9375],[97.548828,-84.003906],[97.546875,-84.070312],[97.550781,-84.140625],[97.554688,-84.210937],[97.558594,-84.28125],[97.5625,-84.351562],[97.5625,-84.445312],[97.5625,-84.539062]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[97.546875,-84.070312],[97.628906,-84.078125],[97.710938,-84.085937],[97.759766,-84.083984],[97.808594,-84.082031],[97.857422,-84.080078],[97.90625,-84.078125],[97.955566,-84.082031],[98.004883,-84.085937],[98.054199,-84.089844],[98.103516,-84.09375]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[97.90625,-84.078125],[97.904297,-84.136719],[97.902344,-84.195312],[97.900391,-84.253906],[97.898438,-84.3125],[97.898438,-84.371094],[97.898438,-84.429687],[97.898438,-84.488281],[97.898438,-84.546875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[98.109375,-84.5625],[98.056641,-84.558594],[98.003906,-84.554687],[97.951172,-84.550781],[97.898438,-84.546875],[97.808594,-84.542969],[97.71875,-84.539062],[97.640625,-84.539062],[97.5625,-84.539062],[97.511719,-84.544922],[97.460938,-84.550781],[97.359375,-84.5625],[97.15625,-84.585937],[96.882813,-84.632812],[96.59375,-84.734375],[96.367188,-84.890625],[96.132813,-85.09375],[95.984375,-85.234375],[95.859375,-85.484375],[95.789063,-85.773437],[95.828125,-85.984375],[95.828125,-86.089844],[95.828125,-86.142578],[95.828125,-86.195312]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[99.279297,-85.169922],[99.289551,-85.234863],[99.299805,-85.299805],[99.320313,-85.429687],[99.328125,-85.828125],[99.234375,-86.234375],[99.175781,-86.46875],[99.117188,-86.703125],[99.035156,-86.882812],[98.953125,-87.0625],[98.851563,-87.242187],[98.742188,-87.554687],[98.4375,-87.835937],[98.054688,-88.101562],[97.765625,-88.296875],[97.609375,-88.4375],[97.328125,-88.789062],[97.109375,-89.164062],[97.015625,-89.484375],[97.132813,-89.914062],[97.382813,-90.21875],[97.71875,-90.53125],[97.90625,-90.78125],[98,-91.0625],[98.015625,-91.375],[97.828125,-91.710937],[97.609375,-91.851562],[97.179688,-91.804687],[96.773438,-91.703125],[96.296875,-91.71875],[95.914063,-91.875],[95.671875,-92.070312],[95.359375,-92.28125],[94.929688,-92.1875],[94.476563,-92.085937],[94.023438,-92.125],[93.679688,-92.242187],[93.382813,-92.210937],[93.085938,-92.125],[92.921875,-92.132812],[92.570313,-91.875],[92.464844,-91.820312],[92.412109,-91.792969],[92.359375,-91.765625],[92.318359,-91.740234],[92.277344,-91.714844],[92.195313,-91.664062],[92.03125,-91.5625],[91.816406,-91.492187],[91.708984,-91.457031],[91.655273,-91.439453],[91.601563,-91.421875],[91.571289,-91.40918],[91.541016,-91.396484],[91.480469,-91.371094],[91.359375,-91.320312],[91.214844,-91.292969],[91.142578,-91.279297],[91.106445,-91.272461],[91.070313,-91.265625],[91.023438,-91.280273],[90.976563,-91.294922],[90.882813,-91.324219],[90.695313,-91.382812],[90.601563,-91.390625],[90.554688,-91.394531],[90.507813,-91.398437],[90.475586,-91.419922],[90.443359,-91.441406],[90.378906,-91.484375],[90.25,-91.570312],[89.960938,-91.789062],[89.65625,-91.976562],[89.382813,-92.140625],[89.054688,-92.414062],[88.851563,-92.617187],[88.796875,-92.890625],[88.671875,-93.125],[88.546875,-93.226562],[88.484375,-93.277344],[88.453125,-93.302734],[88.421875,-93.328125],[88.371094,-93.344727],[88.320313,-93.361328],[88.21875,-93.394531],[88.015625,-93.460937],[87.4375,-93.453125],[86.992188,-93.625],[86.585938,-93.882812],[86.382813,-94.101562],[86.109375,-94.398437],[85.75,-94.703125],[85.460938,-94.804687],[85.132813,-94.90625],[84.726563,-94.96875],[84.546875,-94.988281],[84.457031,-94.998047],[84.412109,-95.00293],[84.367188,-95.007812],[84.356445,-95.041016],[84.345703,-95.074219],[84.324219,-95.140625],[84.28125,-95.273437],[84.421875,-95.625],[84.390625,-95.710937],[84.375,-95.753906],[84.359375,-95.796875],[84.319336,-95.807617],[84.279297,-95.818359],[84.199219,-95.839843],[84.039063,-95.882812],[83.585938,-95.890625],[83.28125,-95.875],[83.067383,-95.816406],[82.960449,-95.787109],[82.906982,-95.772461],[82.853516,-95.757812],[82.822632,-95.76123],[82.791748,-95.764648],[82.760864,-95.768066],[82.72998,-95.771484],[82.668213,-95.77832],[82.606445,-95.785156],[82.544922,-95.792969],[82.48291,-95.798828],[82.421143,-95.805664],[82.359375,-95.8125],[82.288086,-95.827148],[82.216797,-95.841797],[82.145508,-95.856445],[82.074219,-95.871094],[81.789063,-95.929687],[81.4375,-96.023437],[81.179688,-96.164062],[80.875,-96.445312],[80.65625,-96.742187],[80.554688,-97.03125],[80.320313,-97.296875],[80.078125,-97.414062],[79.945313,-97.5625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[82.853516,-95.757812],[82.841553,-95.720703],[82.82959,-95.683594],[82.805664,-95.609375],[82.757813,-95.460937],[82.742188,-95.234375],[82.84375,-95.054687],[83.078125,-94.9375],[83.492188,-94.898437],[83.78125,-94.835937],[84.074219,-94.921875],[84.220703,-94.964844],[84.293945,-94.986328],[84.330566,-94.99707],[84.367188,-95.007812]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[91.601563,-91.421875],[91.624023,-91.466797],[91.646484,-91.511719],[91.691406,-91.601562],[91.78125,-91.78125],[91.890625,-91.941406],[91.945313,-92.021484],[91.972656,-92.061523],[92,-92.101562],[91.993164,-92.132812],[91.986328,-92.164062],[91.972656,-92.226562],[91.945313,-92.351562],[92.039063,-92.617187],[92.046875,-92.992187],[92.085938,-93.195312],[92.34375,-93.25],[92.5,-93.238281],[92.578125,-93.232422],[92.617188,-93.229492],[92.65625,-93.226562],[92.724609,-93.232422],[92.792969,-93.238281],[92.929688,-93.25],[93.265625,-93.265625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[92.65625,-93.228516],[92.669922,-93.276855],[92.683594,-93.325195],[92.710938,-93.421875],[92.546875,-93.671875]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[94.367188,-86.96875],[94.34375,-87.015625],[94.320313,-87.0625],[94.273438,-87.15625],[94.179688,-87.34375],[94.078125,-87.679687],[93.84375,-88.007812],[93.625,-88.257812],[93.554688,-88.726562],[93.445313,-89.164062],[93.132813,-89.390625],[92.90625,-89.539062],[92.703125,-89.679687],[92.367188,-89.859375],[92.148438,-90.023437],[91.90625,-90.398437],[91.6875,-90.726562],[91.4375,-90.953125],[91.226563,-91.148437],[91.148438,-91.207031],[91.109375,-91.236328],[91.070313,-91.265625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[92.359375,-91.765625],[92.320801,-91.778809],[92.282227,-91.791992],[92.205078,-91.818359],[92.0625,-91.921875],[92.03125,-92.011719],[92.015625,-92.056641],[92,-92.101562]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[18.289063,-116.640625]]}},{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[84.359375,-95.796875],[84.375,-95.836914],[84.390625,-95.876953],[84.421875,-95.957031],[84.484375,-96.117187],[84.578125,-96.445312],[84.710938,-96.78125],[84.835938,-97.125],[85,-97.375],[85.101563,-97.632812],[85.210938,-97.953125]]}}]}
},{}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var invariant_1 = require("@turf/invariant");
var helpers_1 = require("@turf/helpers");
//http://en.wikipedia.org/wiki/Haversine_formula
//http://www.movable-type.co.uk/scripts/latlong.html
/**
 * Calculates the distance between two {@link Point|points} in degrees, radians, miles, or kilometers.
 * This uses the [Haversine formula](http://en.wikipedia.org/wiki/Haversine_formula) to account for global curvature.
 *
 * @name distance
 * @param {Coord} from origin point
 * @param {Coord} to destination point
 * @param {Object} [options={}] Optional parameters
 * @param {string} [options.units='kilometers'] can be degrees, radians, miles, or kilometers
 * @returns {number} distance between the two points
 * @example
 * var from = turf.point([-75.343, 39.984]);
 * var to = turf.point([-75.534, 39.123]);
 * var options = {units: 'miles'};
 *
 * var distance = turf.distance(from, to, options);
 *
 * //addToMap
 * var addToMap = [from, to];
 * from.properties.distance = distance;
 * to.properties.distance = distance;
 */
function distance(from, to, options) {
    if (options === void 0) { options = {}; }
    var coordinates1 = invariant_1.getCoord(from);
    var coordinates2 = invariant_1.getCoord(to);
    var dLat = helpers_1.degreesToRadians((coordinates2[1] - coordinates1[1]));
    var dLon = helpers_1.degreesToRadians((coordinates2[0] - coordinates1[0]));
    var lat1 = helpers_1.degreesToRadians(coordinates1[1]);
    var lat2 = helpers_1.degreesToRadians(coordinates2[1]);
    var a = Math.pow(Math.sin(dLat / 2), 2) +
        Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2);
    return helpers_1.radiansToLength(2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)), options.units);
}
exports.default = distance;

},{"@turf/helpers":10,"@turf/invariant":11}],8:[function(require,module,exports){
'use strict';

var meta = require('@turf/meta');
var helpers = require('@turf/helpers');

/**
 * Takes a feature or set of features and returns all positions as {@link Point|points}.
 *
 * @name explode
 * @param {GeoJSON} geojson input features
 * @returns {FeatureCollection<point>} points representing the exploded input features
 * @throws {Error} if it encounters an unknown geometry type
 * @example
 * var polygon = turf.polygon([[[-81, 41], [-88, 36], [-84, 31], [-80, 33], [-77, 39], [-81, 41]]]);
 *
 * var explode = turf.explode(polygon);
 *
 * //addToMap
 * var addToMap = [polygon, explode]
 */
function explode(geojson) {
    var points = [];
    if (geojson.type === 'FeatureCollection') {
        meta.featureEach(geojson, function (feature) {
            meta.coordEach(feature, function (coord) {
                points.push(helpers.point(coord, feature.properties));
            });
        });
    } else {
        meta.coordEach(geojson, function (coord) {
            points.push(helpers.point(coord, geojson.properties));
        });
    }
    return helpers.featureCollection(points);
}

module.exports = explode;
module.exports.default = explode;

},{"@turf/helpers":9,"@turf/meta":12}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * Earth Radius used with the Harvesine formula and approximates using a spherical (non-ellipsoid) Earth.
 */
var earthRadius = 6371008.8;

/**
 * Unit of measurement factors using a spherical (non-ellipsoid) earth radius.
 */
var factors = {
    meters: earthRadius,
    metres: earthRadius,
    millimeters: earthRadius * 1000,
    millimetres: earthRadius * 1000,
    centimeters: earthRadius * 100,
    centimetres: earthRadius * 100,
    kilometers: earthRadius / 1000,
    kilometres: earthRadius / 1000,
    miles: earthRadius / 1609.344,
    nauticalmiles: earthRadius / 1852,
    inches: earthRadius * 39.370,
    yards: earthRadius / 1.0936,
    feet: earthRadius * 3.28084,
    radians: 1,
    degrees: earthRadius / 111325,
};

/**
 * Units of measurement factors based on 1 meter.
 */
var unitsFactors = {
    meters: 1,
    metres: 1,
    millimeters: 1000,
    millimetres: 1000,
    centimeters: 100,
    centimetres: 100,
    kilometers: 1 / 1000,
    kilometres: 1 / 1000,
    miles: 1 / 1609.344,
    nauticalmiles: 1 / 1852,
    inches: 39.370,
    yards: 1 / 1.0936,
    feet: 3.28084,
    radians: 1 / earthRadius,
    degrees: 1 / 111325,
};

/**
 * Area of measurement factors based on 1 square meter.
 */
var areaFactors = {
    meters: 1,
    metres: 1,
    millimeters: 1000000,
    millimetres: 1000000,
    centimeters: 10000,
    centimetres: 10000,
    kilometers: 0.000001,
    kilometres: 0.000001,
    acres: 0.000247105,
    miles: 3.86e-7,
    yards: 1.195990046,
    feet: 10.763910417,
    inches: 1550.003100006
};

/**
 * Wraps a GeoJSON {@link Geometry} in a GeoJSON {@link Feature}.
 *
 * @name feature
 * @param {Geometry} geometry input geometry
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature} a GeoJSON Feature
 * @example
 * var geometry = {
 *   "type": "Point",
 *   "coordinates": [110, 50]
 * };
 *
 * var feature = turf.feature(geometry);
 *
 * //=feature
 */
function feature(geometry, properties, options) {
    // Optional Parameters
    options = options || {};
    if (!isObject(options)) throw new Error('options is invalid');
    var bbox = options.bbox;
    var id = options.id;

    // Validation
    if (geometry === undefined) throw new Error('geometry is required');
    if (properties && properties.constructor !== Object) throw new Error('properties must be an Object');
    if (bbox) validateBBox(bbox);
    if (id) validateId(id);

    // Main
    var feat = {type: 'Feature'};
    if (id) feat.id = id;
    if (bbox) feat.bbox = bbox;
    feat.properties = properties || {};
    feat.geometry = geometry;
    return feat;
}

/**
 * Creates a GeoJSON {@link Geometry} from a Geometry string type & coordinates.
 * For GeometryCollection type use `helpers.geometryCollection`
 *
 * @name geometry
 * @param {string} type Geometry Type
 * @param {Array<number>} coordinates Coordinates
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Geometry
 * @returns {Geometry} a GeoJSON Geometry
 * @example
 * var type = 'Point';
 * var coordinates = [110, 50];
 *
 * var geometry = turf.geometry(type, coordinates);
 *
 * //=geometry
 */
function geometry(type, coordinates, options) {
    // Optional Parameters
    options = options || {};
    if (!isObject(options)) throw new Error('options is invalid');
    var bbox = options.bbox;

    // Validation
    if (!type) throw new Error('type is required');
    if (!coordinates) throw new Error('coordinates is required');
    if (!Array.isArray(coordinates)) throw new Error('coordinates must be an Array');
    if (bbox) validateBBox(bbox);

    // Main
    var geom;
    switch (type) {
    case 'Point': geom = point(coordinates).geometry; break;
    case 'LineString': geom = lineString(coordinates).geometry; break;
    case 'Polygon': geom = polygon(coordinates).geometry; break;
    case 'MultiPoint': geom = multiPoint(coordinates).geometry; break;
    case 'MultiLineString': geom = multiLineString(coordinates).geometry; break;
    case 'MultiPolygon': geom = multiPolygon(coordinates).geometry; break;
    default: throw new Error(type + ' is invalid');
    }
    if (bbox) geom.bbox = bbox;
    return geom;
}

/**
 * Creates a {@link Point} {@link Feature} from a Position.
 *
 * @name point
 * @param {Array<number>} coordinates longitude, latitude position (each in decimal degrees)
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature<Point>} a Point feature
 * @example
 * var point = turf.point([-75.343, 39.984]);
 *
 * //=point
 */
function point(coordinates, properties, options) {
    if (!coordinates) throw new Error('coordinates is required');
    if (!Array.isArray(coordinates)) throw new Error('coordinates must be an Array');
    if (coordinates.length < 2) throw new Error('coordinates must be at least 2 numbers long');
    if (!isNumber(coordinates[0]) || !isNumber(coordinates[1])) throw new Error('coordinates must contain numbers');

    return feature({
        type: 'Point',
        coordinates: coordinates
    }, properties, options);
}

/**
 * Creates a {@link Point} {@link FeatureCollection} from an Array of Point coordinates.
 *
 * @name points
 * @param {Array<Array<number>>} coordinates an array of Points
 * @param {Object} [properties={}] Translate these properties to each Feature
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the FeatureCollection
 * @param {string|number} [options.id] Identifier associated with the FeatureCollection
 * @returns {FeatureCollection<Point>} Point Feature
 * @example
 * var points = turf.points([
 *   [-75, 39],
 *   [-80, 45],
 *   [-78, 50]
 * ]);
 *
 * //=points
 */
function points(coordinates, properties, options) {
    if (!coordinates) throw new Error('coordinates is required');
    if (!Array.isArray(coordinates)) throw new Error('coordinates must be an Array');

    return featureCollection(coordinates.map(function (coords) {
        return point(coords, properties);
    }), options);
}

/**
 * Creates a {@link Polygon} {@link Feature} from an Array of LinearRings.
 *
 * @name polygon
 * @param {Array<Array<Array<number>>>} coordinates an array of LinearRings
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature<Polygon>} Polygon Feature
 * @example
 * var polygon = turf.polygon([[[-5, 52], [-4, 56], [-2, 51], [-7, 54], [-5, 52]]], { name: 'poly1' });
 *
 * //=polygon
 */
function polygon(coordinates, properties, options) {
    if (!coordinates) throw new Error('coordinates is required');

    for (var i = 0; i < coordinates.length; i++) {
        var ring = coordinates[i];
        if (ring.length < 4) {
            throw new Error('Each LinearRing of a Polygon must have 4 or more Positions.');
        }
        for (var j = 0; j < ring[ring.length - 1].length; j++) {
            // Check if first point of Polygon contains two numbers
            if (i === 0 && j === 0 && !isNumber(ring[0][0]) || !isNumber(ring[0][1])) throw new Error('coordinates must contain numbers');
            if (ring[ring.length - 1][j] !== ring[0][j]) {
                throw new Error('First and last Position are not equivalent.');
            }
        }
    }

    return feature({
        type: 'Polygon',
        coordinates: coordinates
    }, properties, options);
}

/**
 * Creates a {@link Polygon} {@link FeatureCollection} from an Array of Polygon coordinates.
 *
 * @name polygons
 * @param {Array<Array<Array<Array<number>>>>} coordinates an array of Polygon coordinates
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the FeatureCollection
 * @returns {FeatureCollection<Polygon>} Polygon FeatureCollection
 * @example
 * var polygons = turf.polygons([
 *   [[[-5, 52], [-4, 56], [-2, 51], [-7, 54], [-5, 52]]],
 *   [[[-15, 42], [-14, 46], [-12, 41], [-17, 44], [-15, 42]]],
 * ]);
 *
 * //=polygons
 */
function polygons(coordinates, properties, options) {
    if (!coordinates) throw new Error('coordinates is required');
    if (!Array.isArray(coordinates)) throw new Error('coordinates must be an Array');

    return featureCollection(coordinates.map(function (coords) {
        return polygon(coords, properties);
    }), options);
}

/**
 * Creates a {@link LineString} {@link Feature} from an Array of Positions.
 *
 * @name lineString
 * @param {Array<Array<number>>} coordinates an array of Positions
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature<LineString>} LineString Feature
 * @example
 * var linestring1 = turf.lineString([[-24, 63], [-23, 60], [-25, 65], [-20, 69]], {name: 'line 1'});
 * var linestring2 = turf.lineString([[-14, 43], [-13, 40], [-15, 45], [-10, 49]], {name: 'line 2'});
 *
 * //=linestring1
 * //=linestring2
 */
function lineString(coordinates, properties, options) {
    if (!coordinates) throw new Error('coordinates is required');
    if (coordinates.length < 2) throw new Error('coordinates must be an array of two or more positions');
    // Check if first point of LineString contains two numbers
    if (!isNumber(coordinates[0][1]) || !isNumber(coordinates[0][1])) throw new Error('coordinates must contain numbers');

    return feature({
        type: 'LineString',
        coordinates: coordinates
    }, properties, options);
}

/**
 * Creates a {@link LineString} {@link FeatureCollection} from an Array of LineString coordinates.
 *
 * @name lineStrings
 * @param {Array<Array<number>>} coordinates an array of LinearRings
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the FeatureCollection
 * @param {string|number} [options.id] Identifier associated with the FeatureCollection
 * @returns {FeatureCollection<LineString>} LineString FeatureCollection
 * @example
 * var linestrings = turf.lineStrings([
 *   [[-24, 63], [-23, 60], [-25, 65], [-20, 69]],
 *   [[-14, 43], [-13, 40], [-15, 45], [-10, 49]]
 * ]);
 *
 * //=linestrings
 */
function lineStrings(coordinates, properties, options) {
    if (!coordinates) throw new Error('coordinates is required');
    if (!Array.isArray(coordinates)) throw new Error('coordinates must be an Array');

    return featureCollection(coordinates.map(function (coords) {
        return lineString(coords, properties);
    }), options);
}

/**
 * Takes one or more {@link Feature|Features} and creates a {@link FeatureCollection}.
 *
 * @name featureCollection
 * @param {Feature[]} features input features
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {FeatureCollection} FeatureCollection of Features
 * @example
 * var locationA = turf.point([-75.343, 39.984], {name: 'Location A'});
 * var locationB = turf.point([-75.833, 39.284], {name: 'Location B'});
 * var locationC = turf.point([-75.534, 39.123], {name: 'Location C'});
 *
 * var collection = turf.featureCollection([
 *   locationA,
 *   locationB,
 *   locationC
 * ]);
 *
 * //=collection
 */
function featureCollection(features, options) {
    // Optional Parameters
    options = options || {};
    if (!isObject(options)) throw new Error('options is invalid');
    var bbox = options.bbox;
    var id = options.id;

    // Validation
    if (!features) throw new Error('No features passed');
    if (!Array.isArray(features)) throw new Error('features must be an Array');
    if (bbox) validateBBox(bbox);
    if (id) validateId(id);

    // Main
    var fc = {type: 'FeatureCollection'};
    if (id) fc.id = id;
    if (bbox) fc.bbox = bbox;
    fc.features = features;
    return fc;
}

/**
 * Creates a {@link Feature<MultiLineString>} based on a
 * coordinate array. Properties can be added optionally.
 *
 * @name multiLineString
 * @param {Array<Array<Array<number>>>} coordinates an array of LineStrings
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature<MultiLineString>} a MultiLineString feature
 * @throws {Error} if no coordinates are passed
 * @example
 * var multiLine = turf.multiLineString([[[0,0],[10,10]]]);
 *
 * //=multiLine
 */
function multiLineString(coordinates, properties, options) {
    if (!coordinates) throw new Error('coordinates is required');

    return feature({
        type: 'MultiLineString',
        coordinates: coordinates
    }, properties, options);
}

/**
 * Creates a {@link Feature<MultiPoint>} based on a
 * coordinate array. Properties can be added optionally.
 *
 * @name multiPoint
 * @param {Array<Array<number>>} coordinates an array of Positions
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature<MultiPoint>} a MultiPoint feature
 * @throws {Error} if no coordinates are passed
 * @example
 * var multiPt = turf.multiPoint([[0,0],[10,10]]);
 *
 * //=multiPt
 */
function multiPoint(coordinates, properties, options) {
    if (!coordinates) throw new Error('coordinates is required');

    return feature({
        type: 'MultiPoint',
        coordinates: coordinates
    }, properties, options);
}

/**
 * Creates a {@link Feature<MultiPolygon>} based on a
 * coordinate array. Properties can be added optionally.
 *
 * @name multiPolygon
 * @param {Array<Array<Array<Array<number>>>>} coordinates an array of Polygons
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature<MultiPolygon>} a multipolygon feature
 * @throws {Error} if no coordinates are passed
 * @example
 * var multiPoly = turf.multiPolygon([[[[0,0],[0,10],[10,10],[10,0],[0,0]]]]);
 *
 * //=multiPoly
 *
 */
function multiPolygon(coordinates, properties, options) {
    if (!coordinates) throw new Error('coordinates is required');

    return feature({
        type: 'MultiPolygon',
        coordinates: coordinates
    }, properties, options);
}

/**
 * Creates a {@link Feature<GeometryCollection>} based on a
 * coordinate array. Properties can be added optionally.
 *
 * @name geometryCollection
 * @param {Array<Geometry>} geometries an array of GeoJSON Geometries
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature<GeometryCollection>} a GeoJSON GeometryCollection Feature
 * @example
 * var pt = {
 *     "type": "Point",
 *       "coordinates": [100, 0]
 *     };
 * var line = {
 *     "type": "LineString",
 *     "coordinates": [ [101, 0], [102, 1] ]
 *   };
 * var collection = turf.geometryCollection([pt, line]);
 *
 * //=collection
 */
function geometryCollection(geometries, properties, options) {
    if (!geometries) throw new Error('geometries is required');
    if (!Array.isArray(geometries)) throw new Error('geometries must be an Array');

    return feature({
        type: 'GeometryCollection',
        geometries: geometries
    }, properties, options);
}

/**
 * Round number to precision
 *
 * @param {number} num Number
 * @param {number} [precision=0] Precision
 * @returns {number} rounded number
 * @example
 * turf.round(120.4321)
 * //=120
 *
 * turf.round(120.4321, 2)
 * //=120.43
 */
function round(num, precision) {
    if (num === undefined || num === null || isNaN(num)) throw new Error('num is required');
    if (precision && !(precision >= 0)) throw new Error('precision must be a positive number');
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(num * multiplier) / multiplier;
}

/**
 * Convert a distance measurement (assuming a spherical Earth) from radians to a more friendly unit.
 * Valid units: miles, nauticalmiles, inches, yards, meters, metres, kilometers, centimeters, feet
 *
 * @name radiansToLength
 * @param {number} radians in radians across the sphere
 * @param {string} [units='kilometers'] can be degrees, radians, miles, or kilometers inches, yards, metres, meters, kilometres, kilometers.
 * @returns {number} distance
 */
function radiansToLength(radians, units) {
    if (radians === undefined || radians === null) throw new Error('radians is required');

    if (units && typeof units !== 'string') throw new Error('units must be a string');
    var factor = factors[units || 'kilometers'];
    if (!factor) throw new Error(units + ' units is invalid');
    return radians * factor;
}

/**
 * Convert a distance measurement (assuming a spherical Earth) from a real-world unit into radians
 * Valid units: miles, nauticalmiles, inches, yards, meters, metres, kilometers, centimeters, feet
 *
 * @name lengthToRadians
 * @param {number} distance in real units
 * @param {string} [units='kilometers'] can be degrees, radians, miles, or kilometers inches, yards, metres, meters, kilometres, kilometers.
 * @returns {number} radians
 */
function lengthToRadians(distance, units) {
    if (distance === undefined || distance === null) throw new Error('distance is required');

    if (units && typeof units !== 'string') throw new Error('units must be a string');
    var factor = factors[units || 'kilometers'];
    if (!factor) throw new Error(units + ' units is invalid');
    return distance / factor;
}

/**
 * Convert a distance measurement (assuming a spherical Earth) from a real-world unit into degrees
 * Valid units: miles, nauticalmiles, inches, yards, meters, metres, centimeters, kilometres, feet
 *
 * @name lengthToDegrees
 * @param {number} distance in real units
 * @param {string} [units='kilometers'] can be degrees, radians, miles, or kilometers inches, yards, metres, meters, kilometres, kilometers.
 * @returns {number} degrees
 */
function lengthToDegrees(distance, units) {
    return radiansToDegrees(lengthToRadians(distance, units));
}

/**
 * Converts any bearing angle from the north line direction (positive clockwise)
 * and returns an angle between 0-360 degrees (positive clockwise), 0 being the north line
 *
 * @name bearingToAzimuth
 * @param {number} bearing angle, between -180 and +180 degrees
 * @returns {number} angle between 0 and 360 degrees
 */
function bearingToAzimuth(bearing) {
    if (bearing === null || bearing === undefined) throw new Error('bearing is required');

    var angle = bearing % 360;
    if (angle < 0) angle += 360;
    return angle;
}

/**
 * Converts an angle in radians to degrees
 *
 * @name radiansToDegrees
 * @param {number} radians angle in radians
 * @returns {number} degrees between 0 and 360 degrees
 */
function radiansToDegrees(radians) {
    if (radians === null || radians === undefined) throw new Error('radians is required');

    var degrees = radians % (2 * Math.PI);
    return degrees * 180 / Math.PI;
}

/**
 * Converts an angle in degrees to radians
 *
 * @name degreesToRadians
 * @param {number} degrees angle between 0 and 360 degrees
 * @returns {number} angle in radians
 */
function degreesToRadians(degrees) {
    if (degrees === null || degrees === undefined) throw new Error('degrees is required');

    var radians = degrees % 360;
    return radians * Math.PI / 180;
}

/**
 * Converts a length to the requested unit.
 * Valid units: miles, nauticalmiles, inches, yards, meters, metres, kilometers, centimeters, feet
 *
 * @param {number} length to be converted
 * @param {string} originalUnit of the length
 * @param {string} [finalUnit='kilometers'] returned unit
 * @returns {number} the converted length
 */
function convertLength(length, originalUnit, finalUnit) {
    if (length === null || length === undefined) throw new Error('length is required');
    if (!(length >= 0)) throw new Error('length must be a positive number');

    return radiansToLength(lengthToRadians(length, originalUnit), finalUnit || 'kilometers');
}

/**
 * Converts a area to the requested unit.
 * Valid units: kilometers, kilometres, meters, metres, centimetres, millimeters, acres, miles, yards, feet, inches
 * @param {number} area to be converted
 * @param {string} [originalUnit='meters'] of the distance
 * @param {string} [finalUnit='kilometers'] returned unit
 * @returns {number} the converted distance
 */
function convertArea(area, originalUnit, finalUnit) {
    if (area === null || area === undefined) throw new Error('area is required');
    if (!(area >= 0)) throw new Error('area must be a positive number');

    var startFactor = areaFactors[originalUnit || 'meters'];
    if (!startFactor) throw new Error('invalid original units');

    var finalFactor = areaFactors[finalUnit || 'kilometers'];
    if (!finalFactor) throw new Error('invalid final units');

    return (area / startFactor) * finalFactor;
}

/**
 * isNumber
 *
 * @param {*} num Number to validate
 * @returns {boolean} true/false
 * @example
 * turf.isNumber(123)
 * //=true
 * turf.isNumber('foo')
 * //=false
 */
function isNumber(num) {
    return !isNaN(num) && num !== null && !Array.isArray(num);
}

/**
 * isObject
 *
 * @param {*} input variable to validate
 * @returns {boolean} true/false
 * @example
 * turf.isObject({elevation: 10})
 * //=true
 * turf.isObject('foo')
 * //=false
 */
function isObject(input) {
    return (!!input) && (input.constructor === Object);
}

/**
 * Validate BBox
 *
 * @private
 * @param {Array<number>} bbox BBox to validate
 * @returns {void}
 * @throws Error if BBox is not valid
 * @example
 * validateBBox([-180, -40, 110, 50])
 * //=OK
 * validateBBox([-180, -40])
 * //=Error
 * validateBBox('Foo')
 * //=Error
 * validateBBox(5)
 * //=Error
 * validateBBox(null)
 * //=Error
 * validateBBox(undefined)
 * //=Error
 */
function validateBBox(bbox) {
    if (!bbox) throw new Error('bbox is required');
    if (!Array.isArray(bbox)) throw new Error('bbox must be an Array');
    if (bbox.length !== 4 && bbox.length !== 6) throw new Error('bbox must be an Array of 4 or 6 numbers');
    bbox.forEach(function (num) {
        if (!isNumber(num)) throw new Error('bbox must only contain numbers');
    });
}

/**
 * Validate Id
 *
 * @private
 * @param {string|number} id Id to validate
 * @returns {void}
 * @throws Error if Id is not valid
 * @example
 * validateId([-180, -40, 110, 50])
 * //=Error
 * validateId([-180, -40])
 * //=Error
 * validateId('Foo')
 * //=OK
 * validateId(5)
 * //=OK
 * validateId(null)
 * //=Error
 * validateId(undefined)
 * //=Error
 */
function validateId(id) {
    if (!id) throw new Error('id is required');
    if (['string', 'number'].indexOf(typeof id) === -1) throw new Error('id must be a number or a string');
}

// Deprecated methods
function radians2degrees() {
    throw new Error('method has been renamed to `radiansToDegrees`');
}

function degrees2radians() {
    throw new Error('method has been renamed to `degreesToRadians`');
}

function distanceToDegrees() {
    throw new Error('method has been renamed to `lengthToDegrees`');
}

function distanceToRadians() {
    throw new Error('method has been renamed to `lengthToRadians`');
}

function radiansToDistance() {
    throw new Error('method has been renamed to `radiansToLength`');
}

function bearingToAngle() {
    throw new Error('method has been renamed to `bearingToAzimuth`');
}

function convertDistance() {
    throw new Error('method has been renamed to `convertLength`');
}

exports.earthRadius = earthRadius;
exports.factors = factors;
exports.unitsFactors = unitsFactors;
exports.areaFactors = areaFactors;
exports.feature = feature;
exports.geometry = geometry;
exports.point = point;
exports.points = points;
exports.polygon = polygon;
exports.polygons = polygons;
exports.lineString = lineString;
exports.lineStrings = lineStrings;
exports.featureCollection = featureCollection;
exports.multiLineString = multiLineString;
exports.multiPoint = multiPoint;
exports.multiPolygon = multiPolygon;
exports.geometryCollection = geometryCollection;
exports.round = round;
exports.radiansToLength = radiansToLength;
exports.lengthToRadians = lengthToRadians;
exports.lengthToDegrees = lengthToDegrees;
exports.bearingToAzimuth = bearingToAzimuth;
exports.radiansToDegrees = radiansToDegrees;
exports.degreesToRadians = degreesToRadians;
exports.convertLength = convertLength;
exports.convertArea = convertArea;
exports.isNumber = isNumber;
exports.isObject = isObject;
exports.validateBBox = validateBBox;
exports.validateId = validateId;
exports.radians2degrees = radians2degrees;
exports.degrees2radians = degrees2radians;
exports.distanceToDegrees = distanceToDegrees;
exports.distanceToRadians = distanceToRadians;
exports.radiansToDistance = radiansToDistance;
exports.bearingToAngle = bearingToAngle;
exports.convertDistance = convertDistance;

},{}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @module helpers
 */
/**
 * Earth Radius used with the Harvesine formula and approximates using a spherical (non-ellipsoid) Earth.
 *
 * @memberof helpers
 * @type {number}
 */
exports.earthRadius = 6371008.8;
/**
 * Unit of measurement factors using a spherical (non-ellipsoid) earth radius.
 *
 * @memberof helpers
 * @type {Object}
 */
exports.factors = {
    centimeters: exports.earthRadius * 100,
    centimetres: exports.earthRadius * 100,
    degrees: exports.earthRadius / 111325,
    feet: exports.earthRadius * 3.28084,
    inches: exports.earthRadius * 39.370,
    kilometers: exports.earthRadius / 1000,
    kilometres: exports.earthRadius / 1000,
    meters: exports.earthRadius,
    metres: exports.earthRadius,
    miles: exports.earthRadius / 1609.344,
    millimeters: exports.earthRadius * 1000,
    millimetres: exports.earthRadius * 1000,
    nauticalmiles: exports.earthRadius / 1852,
    radians: 1,
    yards: exports.earthRadius / 1.0936,
};
/**
 * Units of measurement factors based on 1 meter.
 *
 * @memberof helpers
 * @type {Object}
 */
exports.unitsFactors = {
    centimeters: 100,
    centimetres: 100,
    degrees: 1 / 111325,
    feet: 3.28084,
    inches: 39.370,
    kilometers: 1 / 1000,
    kilometres: 1 / 1000,
    meters: 1,
    metres: 1,
    miles: 1 / 1609.344,
    millimeters: 1000,
    millimetres: 1000,
    nauticalmiles: 1 / 1852,
    radians: 1 / exports.earthRadius,
    yards: 1 / 1.0936,
};
/**
 * Area of measurement factors based on 1 square meter.
 *
 * @memberof helpers
 * @type {Object}
 */
exports.areaFactors = {
    acres: 0.000247105,
    centimeters: 10000,
    centimetres: 10000,
    feet: 10.763910417,
    inches: 1550.003100006,
    kilometers: 0.000001,
    kilometres: 0.000001,
    meters: 1,
    metres: 1,
    miles: 3.86e-7,
    millimeters: 1000000,
    millimetres: 1000000,
    yards: 1.195990046,
};
/**
 * Wraps a GeoJSON {@link Geometry} in a GeoJSON {@link Feature}.
 *
 * @name feature
 * @param {Geometry} geometry input geometry
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature} a GeoJSON Feature
 * @example
 * var geometry = {
 *   "type": "Point",
 *   "coordinates": [110, 50]
 * };
 *
 * var feature = turf.feature(geometry);
 *
 * //=feature
 */
function feature(geom, properties, options) {
    if (options === void 0) { options = {}; }
    var feat = { type: "Feature" };
    if (options.id === 0 || options.id) {
        feat.id = options.id;
    }
    if (options.bbox) {
        feat.bbox = options.bbox;
    }
    feat.properties = properties || {};
    feat.geometry = geom;
    return feat;
}
exports.feature = feature;
/**
 * Creates a GeoJSON {@link Geometry} from a Geometry string type & coordinates.
 * For GeometryCollection type use `helpers.geometryCollection`
 *
 * @name geometry
 * @param {string} type Geometry Type
 * @param {Array<any>} coordinates Coordinates
 * @param {Object} [options={}] Optional Parameters
 * @returns {Geometry} a GeoJSON Geometry
 * @example
 * var type = "Point";
 * var coordinates = [110, 50];
 * var geometry = turf.geometry(type, coordinates);
 * // => geometry
 */
function geometry(type, coordinates, options) {
    if (options === void 0) { options = {}; }
    switch (type) {
        case "Point": return point(coordinates).geometry;
        case "LineString": return lineString(coordinates).geometry;
        case "Polygon": return polygon(coordinates).geometry;
        case "MultiPoint": return multiPoint(coordinates).geometry;
        case "MultiLineString": return multiLineString(coordinates).geometry;
        case "MultiPolygon": return multiPolygon(coordinates).geometry;
        default: throw new Error(type + " is invalid");
    }
}
exports.geometry = geometry;
/**
 * Creates a {@link Point} {@link Feature} from a Position.
 *
 * @name point
 * @param {Array<number>} coordinates longitude, latitude position (each in decimal degrees)
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature<Point>} a Point feature
 * @example
 * var point = turf.point([-75.343, 39.984]);
 *
 * //=point
 */
function point(coordinates, properties, options) {
    if (options === void 0) { options = {}; }
    var geom = {
        type: "Point",
        coordinates: coordinates,
    };
    return feature(geom, properties, options);
}
exports.point = point;
/**
 * Creates a {@link Point} {@link FeatureCollection} from an Array of Point coordinates.
 *
 * @name points
 * @param {Array<Array<number>>} coordinates an array of Points
 * @param {Object} [properties={}] Translate these properties to each Feature
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north]
 * associated with the FeatureCollection
 * @param {string|number} [options.id] Identifier associated with the FeatureCollection
 * @returns {FeatureCollection<Point>} Point Feature
 * @example
 * var points = turf.points([
 *   [-75, 39],
 *   [-80, 45],
 *   [-78, 50]
 * ]);
 *
 * //=points
 */
function points(coordinates, properties, options) {
    if (options === void 0) { options = {}; }
    return featureCollection(coordinates.map(function (coords) {
        return point(coords, properties);
    }), options);
}
exports.points = points;
/**
 * Creates a {@link Polygon} {@link Feature} from an Array of LinearRings.
 *
 * @name polygon
 * @param {Array<Array<Array<number>>>} coordinates an array of LinearRings
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature<Polygon>} Polygon Feature
 * @example
 * var polygon = turf.polygon([[[-5, 52], [-4, 56], [-2, 51], [-7, 54], [-5, 52]]], { name: 'poly1' });
 *
 * //=polygon
 */
function polygon(coordinates, properties, options) {
    if (options === void 0) { options = {}; }
    for (var _i = 0, coordinates_1 = coordinates; _i < coordinates_1.length; _i++) {
        var ring = coordinates_1[_i];
        if (ring.length < 4) {
            throw new Error("Each LinearRing of a Polygon must have 4 or more Positions.");
        }
        for (var j = 0; j < ring[ring.length - 1].length; j++) {
            // Check if first point of Polygon contains two numbers
            if (ring[ring.length - 1][j] !== ring[0][j]) {
                throw new Error("First and last Position are not equivalent.");
            }
        }
    }
    var geom = {
        type: "Polygon",
        coordinates: coordinates,
    };
    return feature(geom, properties, options);
}
exports.polygon = polygon;
/**
 * Creates a {@link Polygon} {@link FeatureCollection} from an Array of Polygon coordinates.
 *
 * @name polygons
 * @param {Array<Array<Array<Array<number>>>>} coordinates an array of Polygon coordinates
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the FeatureCollection
 * @returns {FeatureCollection<Polygon>} Polygon FeatureCollection
 * @example
 * var polygons = turf.polygons([
 *   [[[-5, 52], [-4, 56], [-2, 51], [-7, 54], [-5, 52]]],
 *   [[[-15, 42], [-14, 46], [-12, 41], [-17, 44], [-15, 42]]],
 * ]);
 *
 * //=polygons
 */
function polygons(coordinates, properties, options) {
    if (options === void 0) { options = {}; }
    return featureCollection(coordinates.map(function (coords) {
        return polygon(coords, properties);
    }), options);
}
exports.polygons = polygons;
/**
 * Creates a {@link LineString} {@link Feature} from an Array of Positions.
 *
 * @name lineString
 * @param {Array<Array<number>>} coordinates an array of Positions
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature<LineString>} LineString Feature
 * @example
 * var linestring1 = turf.lineString([[-24, 63], [-23, 60], [-25, 65], [-20, 69]], {name: 'line 1'});
 * var linestring2 = turf.lineString([[-14, 43], [-13, 40], [-15, 45], [-10, 49]], {name: 'line 2'});
 *
 * //=linestring1
 * //=linestring2
 */
function lineString(coordinates, properties, options) {
    if (options === void 0) { options = {}; }
    if (coordinates.length < 2) {
        throw new Error("coordinates must be an array of two or more positions");
    }
    var geom = {
        type: "LineString",
        coordinates: coordinates,
    };
    return feature(geom, properties, options);
}
exports.lineString = lineString;
/**
 * Creates a {@link LineString} {@link FeatureCollection} from an Array of LineString coordinates.
 *
 * @name lineStrings
 * @param {Array<Array<Array<number>>>} coordinates an array of LinearRings
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north]
 * associated with the FeatureCollection
 * @param {string|number} [options.id] Identifier associated with the FeatureCollection
 * @returns {FeatureCollection<LineString>} LineString FeatureCollection
 * @example
 * var linestrings = turf.lineStrings([
 *   [[-24, 63], [-23, 60], [-25, 65], [-20, 69]],
 *   [[-14, 43], [-13, 40], [-15, 45], [-10, 49]]
 * ]);
 *
 * //=linestrings
 */
function lineStrings(coordinates, properties, options) {
    if (options === void 0) { options = {}; }
    return featureCollection(coordinates.map(function (coords) {
        return lineString(coords, properties);
    }), options);
}
exports.lineStrings = lineStrings;
/**
 * Takes one or more {@link Feature|Features} and creates a {@link FeatureCollection}.
 *
 * @name featureCollection
 * @param {Feature[]} features input features
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {FeatureCollection} FeatureCollection of Features
 * @example
 * var locationA = turf.point([-75.343, 39.984], {name: 'Location A'});
 * var locationB = turf.point([-75.833, 39.284], {name: 'Location B'});
 * var locationC = turf.point([-75.534, 39.123], {name: 'Location C'});
 *
 * var collection = turf.featureCollection([
 *   locationA,
 *   locationB,
 *   locationC
 * ]);
 *
 * //=collection
 */
function featureCollection(features, options) {
    if (options === void 0) { options = {}; }
    var fc = { type: "FeatureCollection" };
    if (options.id) {
        fc.id = options.id;
    }
    if (options.bbox) {
        fc.bbox = options.bbox;
    }
    fc.features = features;
    return fc;
}
exports.featureCollection = featureCollection;
/**
 * Creates a {@link Feature<MultiLineString>} based on a
 * coordinate array. Properties can be added optionally.
 *
 * @name multiLineString
 * @param {Array<Array<Array<number>>>} coordinates an array of LineStrings
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature<MultiLineString>} a MultiLineString feature
 * @throws {Error} if no coordinates are passed
 * @example
 * var multiLine = turf.multiLineString([[[0,0],[10,10]]]);
 *
 * //=multiLine
 */
function multiLineString(coordinates, properties, options) {
    if (options === void 0) { options = {}; }
    var geom = {
        type: "MultiLineString",
        coordinates: coordinates,
    };
    return feature(geom, properties, options);
}
exports.multiLineString = multiLineString;
/**
 * Creates a {@link Feature<MultiPoint>} based on a
 * coordinate array. Properties can be added optionally.
 *
 * @name multiPoint
 * @param {Array<Array<number>>} coordinates an array of Positions
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature<MultiPoint>} a MultiPoint feature
 * @throws {Error} if no coordinates are passed
 * @example
 * var multiPt = turf.multiPoint([[0,0],[10,10]]);
 *
 * //=multiPt
 */
function multiPoint(coordinates, properties, options) {
    if (options === void 0) { options = {}; }
    var geom = {
        type: "MultiPoint",
        coordinates: coordinates,
    };
    return feature(geom, properties, options);
}
exports.multiPoint = multiPoint;
/**
 * Creates a {@link Feature<MultiPolygon>} based on a
 * coordinate array. Properties can be added optionally.
 *
 * @name multiPolygon
 * @param {Array<Array<Array<Array<number>>>>} coordinates an array of Polygons
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature<MultiPolygon>} a multipolygon feature
 * @throws {Error} if no coordinates are passed
 * @example
 * var multiPoly = turf.multiPolygon([[[[0,0],[0,10],[10,10],[10,0],[0,0]]]]);
 *
 * //=multiPoly
 *
 */
function multiPolygon(coordinates, properties, options) {
    if (options === void 0) { options = {}; }
    var geom = {
        type: "MultiPolygon",
        coordinates: coordinates,
    };
    return feature(geom, properties, options);
}
exports.multiPolygon = multiPolygon;
/**
 * Creates a {@link Feature<GeometryCollection>} based on a
 * coordinate array. Properties can be added optionally.
 *
 * @name geometryCollection
 * @param {Array<Geometry>} geometries an array of GeoJSON Geometries
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature<GeometryCollection>} a GeoJSON GeometryCollection Feature
 * @example
 * var pt = turf.geometry("Point", [100, 0]);
 * var line = turf.geometry("LineString", [[101, 0], [102, 1]]);
 * var collection = turf.geometryCollection([pt, line]);
 *
 * // => collection
 */
function geometryCollection(geometries, properties, options) {
    if (options === void 0) { options = {}; }
    var geom = {
        type: "GeometryCollection",
        geometries: geometries,
    };
    return feature(geom, properties, options);
}
exports.geometryCollection = geometryCollection;
/**
 * Round number to precision
 *
 * @param {number} num Number
 * @param {number} [precision=0] Precision
 * @returns {number} rounded number
 * @example
 * turf.round(120.4321)
 * //=120
 *
 * turf.round(120.4321, 2)
 * //=120.43
 */
function round(num, precision) {
    if (precision === void 0) { precision = 0; }
    if (precision && !(precision >= 0)) {
        throw new Error("precision must be a positive number");
    }
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(num * multiplier) / multiplier;
}
exports.round = round;
/**
 * Convert a distance measurement (assuming a spherical Earth) from radians to a more friendly unit.
 * Valid units: miles, nauticalmiles, inches, yards, meters, metres, kilometers, centimeters, feet
 *
 * @name radiansToLength
 * @param {number} radians in radians across the sphere
 * @param {string} [units="kilometers"] can be degrees, radians, miles, or kilometers inches, yards, metres,
 * meters, kilometres, kilometers.
 * @returns {number} distance
 */
function radiansToLength(radians, units) {
    if (units === void 0) { units = "kilometers"; }
    var factor = exports.factors[units];
    if (!factor) {
        throw new Error(units + " units is invalid");
    }
    return radians * factor;
}
exports.radiansToLength = radiansToLength;
/**
 * Convert a distance measurement (assuming a spherical Earth) from a real-world unit into radians
 * Valid units: miles, nauticalmiles, inches, yards, meters, metres, kilometers, centimeters, feet
 *
 * @name lengthToRadians
 * @param {number} distance in real units
 * @param {string} [units="kilometers"] can be degrees, radians, miles, or kilometers inches, yards, metres,
 * meters, kilometres, kilometers.
 * @returns {number} radians
 */
function lengthToRadians(distance, units) {
    if (units === void 0) { units = "kilometers"; }
    var factor = exports.factors[units];
    if (!factor) {
        throw new Error(units + " units is invalid");
    }
    return distance / factor;
}
exports.lengthToRadians = lengthToRadians;
/**
 * Convert a distance measurement (assuming a spherical Earth) from a real-world unit into degrees
 * Valid units: miles, nauticalmiles, inches, yards, meters, metres, centimeters, kilometres, feet
 *
 * @name lengthToDegrees
 * @param {number} distance in real units
 * @param {string} [units="kilometers"] can be degrees, radians, miles, or kilometers inches, yards, metres,
 * meters, kilometres, kilometers.
 * @returns {number} degrees
 */
function lengthToDegrees(distance, units) {
    return radiansToDegrees(lengthToRadians(distance, units));
}
exports.lengthToDegrees = lengthToDegrees;
/**
 * Converts any bearing angle from the north line direction (positive clockwise)
 * and returns an angle between 0-360 degrees (positive clockwise), 0 being the north line
 *
 * @name bearingToAzimuth
 * @param {number} bearing angle, between -180 and +180 degrees
 * @returns {number} angle between 0 and 360 degrees
 */
function bearingToAzimuth(bearing) {
    var angle = bearing % 360;
    if (angle < 0) {
        angle += 360;
    }
    return angle;
}
exports.bearingToAzimuth = bearingToAzimuth;
/**
 * Converts an angle in radians to degrees
 *
 * @name radiansToDegrees
 * @param {number} radians angle in radians
 * @returns {number} degrees between 0 and 360 degrees
 */
function radiansToDegrees(radians) {
    var degrees = radians % (2 * Math.PI);
    return degrees * 180 / Math.PI;
}
exports.radiansToDegrees = radiansToDegrees;
/**
 * Converts an angle in degrees to radians
 *
 * @name degreesToRadians
 * @param {number} degrees angle between 0 and 360 degrees
 * @returns {number} angle in radians
 */
function degreesToRadians(degrees) {
    var radians = degrees % 360;
    return radians * Math.PI / 180;
}
exports.degreesToRadians = degreesToRadians;
/**
 * Converts a length to the requested unit.
 * Valid units: miles, nauticalmiles, inches, yards, meters, metres, kilometers, centimeters, feet
 *
 * @param {number} length to be converted
 * @param {Units} [originalUnit="kilometers"] of the length
 * @param {Units} [finalUnit="kilometers"] returned unit
 * @returns {number} the converted length
 */
function convertLength(length, originalUnit, finalUnit) {
    if (originalUnit === void 0) { originalUnit = "kilometers"; }
    if (finalUnit === void 0) { finalUnit = "kilometers"; }
    if (!(length >= 0)) {
        throw new Error("length must be a positive number");
    }
    return radiansToLength(lengthToRadians(length, originalUnit), finalUnit);
}
exports.convertLength = convertLength;
/**
 * Converts a area to the requested unit.
 * Valid units: kilometers, kilometres, meters, metres, centimetres, millimeters, acres, miles, yards, feet, inches
 * @param {number} area to be converted
 * @param {Units} [originalUnit="meters"] of the distance
 * @param {Units} [finalUnit="kilometers"] returned unit
 * @returns {number} the converted distance
 */
function convertArea(area, originalUnit, finalUnit) {
    if (originalUnit === void 0) { originalUnit = "meters"; }
    if (finalUnit === void 0) { finalUnit = "kilometers"; }
    if (!(area >= 0)) {
        throw new Error("area must be a positive number");
    }
    var startFactor = exports.areaFactors[originalUnit];
    if (!startFactor) {
        throw new Error("invalid original units");
    }
    var finalFactor = exports.areaFactors[finalUnit];
    if (!finalFactor) {
        throw new Error("invalid final units");
    }
    return (area / startFactor) * finalFactor;
}
exports.convertArea = convertArea;
/**
 * isNumber
 *
 * @param {*} num Number to validate
 * @returns {boolean} true/false
 * @example
 * turf.isNumber(123)
 * //=true
 * turf.isNumber('foo')
 * //=false
 */
function isNumber(num) {
    return !isNaN(num) && num !== null && !Array.isArray(num) && !/^\s*$/.test(num);
}
exports.isNumber = isNumber;
/**
 * isObject
 *
 * @param {*} input variable to validate
 * @returns {boolean} true/false
 * @example
 * turf.isObject({elevation: 10})
 * //=true
 * turf.isObject('foo')
 * //=false
 */
function isObject(input) {
    return (!!input) && (input.constructor === Object);
}
exports.isObject = isObject;
/**
 * Validate BBox
 *
 * @private
 * @param {Array<number>} bbox BBox to validate
 * @returns {void}
 * @throws Error if BBox is not valid
 * @example
 * validateBBox([-180, -40, 110, 50])
 * //=OK
 * validateBBox([-180, -40])
 * //=Error
 * validateBBox('Foo')
 * //=Error
 * validateBBox(5)
 * //=Error
 * validateBBox(null)
 * //=Error
 * validateBBox(undefined)
 * //=Error
 */
function validateBBox(bbox) {
    if (!bbox) {
        throw new Error("bbox is required");
    }
    if (!Array.isArray(bbox)) {
        throw new Error("bbox must be an Array");
    }
    if (bbox.length !== 4 && bbox.length !== 6) {
        throw new Error("bbox must be an Array of 4 or 6 numbers");
    }
    bbox.forEach(function (num) {
        if (!isNumber(num)) {
            throw new Error("bbox must only contain numbers");
        }
    });
}
exports.validateBBox = validateBBox;
/**
 * Validate Id
 *
 * @private
 * @param {string|number} id Id to validate
 * @returns {void}
 * @throws Error if Id is not valid
 * @example
 * validateId([-180, -40, 110, 50])
 * //=Error
 * validateId([-180, -40])
 * //=Error
 * validateId('Foo')
 * //=OK
 * validateId(5)
 * //=OK
 * validateId(null)
 * //=Error
 * validateId(undefined)
 * //=Error
 */
function validateId(id) {
    if (!id) {
        throw new Error("id is required");
    }
    if (["string", "number"].indexOf(typeof id) === -1) {
        throw new Error("id must be a number or a string");
    }
}
exports.validateId = validateId;
// Deprecated methods
function radians2degrees() {
    throw new Error("method has been renamed to `radiansToDegrees`");
}
exports.radians2degrees = radians2degrees;
function degrees2radians() {
    throw new Error("method has been renamed to `degreesToRadians`");
}
exports.degrees2radians = degrees2radians;
function distanceToDegrees() {
    throw new Error("method has been renamed to `lengthToDegrees`");
}
exports.distanceToDegrees = distanceToDegrees;
function distanceToRadians() {
    throw new Error("method has been renamed to `lengthToRadians`");
}
exports.distanceToRadians = distanceToRadians;
function radiansToDistance() {
    throw new Error("method has been renamed to `radiansToLength`");
}
exports.radiansToDistance = radiansToDistance;
function bearingToAngle() {
    throw new Error("method has been renamed to `bearingToAzimuth`");
}
exports.bearingToAngle = bearingToAngle;
function convertDistance() {
    throw new Error("method has been renamed to `convertLength`");
}
exports.convertDistance = convertDistance;

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var helpers_1 = require("@turf/helpers");
/**
 * Unwrap a coordinate from a Point Feature, Geometry or a single coordinate.
 *
 * @name getCoord
 * @param {Array<number>|Geometry<Point>|Feature<Point>} coord GeoJSON Point or an Array of numbers
 * @returns {Array<number>} coordinates
 * @example
 * var pt = turf.point([10, 10]);
 *
 * var coord = turf.getCoord(pt);
 * //= [10, 10]
 */
function getCoord(coord) {
    if (!coord) {
        throw new Error("coord is required");
    }
    if (!Array.isArray(coord)) {
        if (coord.type === "Feature" && coord.geometry !== null && coord.geometry.type === "Point") {
            return coord.geometry.coordinates;
        }
        if (coord.type === "Point") {
            return coord.coordinates;
        }
    }
    if (Array.isArray(coord) && coord.length >= 2 && !Array.isArray(coord[0]) && !Array.isArray(coord[1])) {
        return coord;
    }
    throw new Error("coord must be GeoJSON Point or an Array of numbers");
}
exports.getCoord = getCoord;
/**
 * Unwrap coordinates from a Feature, Geometry Object or an Array
 *
 * @name getCoords
 * @param {Array<any>|Geometry|Feature} coords Feature, Geometry Object or an Array
 * @returns {Array<any>} coordinates
 * @example
 * var poly = turf.polygon([[[119.32, -8.7], [119.55, -8.69], [119.51, -8.54], [119.32, -8.7]]]);
 *
 * var coords = turf.getCoords(poly);
 * //= [[[119.32, -8.7], [119.55, -8.69], [119.51, -8.54], [119.32, -8.7]]]
 */
function getCoords(coords) {
    if (Array.isArray(coords)) {
        return coords;
    }
    // Feature
    if (coords.type === "Feature") {
        if (coords.geometry !== null) {
            return coords.geometry.coordinates;
        }
    }
    else {
        // Geometry
        if (coords.coordinates) {
            return coords.coordinates;
        }
    }
    throw new Error("coords must be GeoJSON Feature, Geometry Object or an Array");
}
exports.getCoords = getCoords;
/**
 * Checks if coordinates contains a number
 *
 * @name containsNumber
 * @param {Array<any>} coordinates GeoJSON Coordinates
 * @returns {boolean} true if Array contains a number
 */
function containsNumber(coordinates) {
    if (coordinates.length > 1 && helpers_1.isNumber(coordinates[0]) && helpers_1.isNumber(coordinates[1])) {
        return true;
    }
    if (Array.isArray(coordinates[0]) && coordinates[0].length) {
        return containsNumber(coordinates[0]);
    }
    throw new Error("coordinates must only contain numbers");
}
exports.containsNumber = containsNumber;
/**
 * Enforce expectations about types of GeoJSON objects for Turf.
 *
 * @name geojsonType
 * @param {GeoJSON} value any GeoJSON object
 * @param {string} type expected GeoJSON type
 * @param {string} name name of calling function
 * @throws {Error} if value is not the expected type.
 */
function geojsonType(value, type, name) {
    if (!type || !name) {
        throw new Error("type and name required");
    }
    if (!value || value.type !== type) {
        throw new Error("Invalid input to " + name + ": must be a " + type + ", given " + value.type);
    }
}
exports.geojsonType = geojsonType;
/**
 * Enforce expectations about types of {@link Feature} inputs for Turf.
 * Internally this uses {@link geojsonType} to judge geometry types.
 *
 * @name featureOf
 * @param {Feature} feature a feature with an expected geometry type
 * @param {string} type expected GeoJSON type
 * @param {string} name name of calling function
 * @throws {Error} error if value is not the expected type.
 */
function featureOf(feature, type, name) {
    if (!feature) {
        throw new Error("No feature passed");
    }
    if (!name) {
        throw new Error(".featureOf() requires a name");
    }
    if (!feature || feature.type !== "Feature" || !feature.geometry) {
        throw new Error("Invalid input to " + name + ", Feature with geometry required");
    }
    if (!feature.geometry || feature.geometry.type !== type) {
        throw new Error("Invalid input to " + name + ": must be a " + type + ", given " + feature.geometry.type);
    }
}
exports.featureOf = featureOf;
/**
 * Enforce expectations about types of {@link FeatureCollection} inputs for Turf.
 * Internally this uses {@link geojsonType} to judge geometry types.
 *
 * @name collectionOf
 * @param {FeatureCollection} featureCollection a FeatureCollection for which features will be judged
 * @param {string} type expected GeoJSON type
 * @param {string} name name of calling function
 * @throws {Error} if value is not the expected type.
 */
function collectionOf(featureCollection, type, name) {
    if (!featureCollection) {
        throw new Error("No featureCollection passed");
    }
    if (!name) {
        throw new Error(".collectionOf() requires a name");
    }
    if (!featureCollection || featureCollection.type !== "FeatureCollection") {
        throw new Error("Invalid input to " + name + ", FeatureCollection required");
    }
    for (var _i = 0, _a = featureCollection.features; _i < _a.length; _i++) {
        var feature = _a[_i];
        if (!feature || feature.type !== "Feature" || !feature.geometry) {
            throw new Error("Invalid input to " + name + ", Feature with geometry required");
        }
        if (!feature.geometry || feature.geometry.type !== type) {
            throw new Error("Invalid input to " + name + ": must be a " + type + ", given " + feature.geometry.type);
        }
    }
}
exports.collectionOf = collectionOf;
/**
 * Get Geometry from Feature or Geometry Object
 *
 * @param {Feature|Geometry} geojson GeoJSON Feature or Geometry Object
 * @returns {Geometry|null} GeoJSON Geometry Object
 * @throws {Error} if geojson is not a Feature or Geometry Object
 * @example
 * var point = {
 *   "type": "Feature",
 *   "properties": {},
 *   "geometry": {
 *     "type": "Point",
 *     "coordinates": [110, 40]
 *   }
 * }
 * var geom = turf.getGeom(point)
 * //={"type": "Point", "coordinates": [110, 40]}
 */
function getGeom(geojson) {
    if (geojson.type === "Feature") {
        return geojson.geometry;
    }
    return geojson;
}
exports.getGeom = getGeom;
/**
 * Get GeoJSON object's type, Geometry type is prioritize.
 *
 * @param {GeoJSON} geojson GeoJSON object
 * @param {string} [name="geojson"] name of the variable to display in error message
 * @returns {string} GeoJSON type
 * @example
 * var point = {
 *   "type": "Feature",
 *   "properties": {},
 *   "geometry": {
 *     "type": "Point",
 *     "coordinates": [110, 40]
 *   }
 * }
 * var geom = turf.getType(point)
 * //="Point"
 */
function getType(geojson, name) {
    if (geojson.type === "FeatureCollection") {
        return "FeatureCollection";
    }
    if (geojson.type === "GeometryCollection") {
        return "GeometryCollection";
    }
    if (geojson.type === "Feature" && geojson.geometry !== null) {
        return geojson.geometry.type;
    }
    return geojson.type;
}
exports.getType = getType;

},{"@turf/helpers":10}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var helpers = require('@turf/helpers');

/**
 * Callback for coordEach
 *
 * @callback coordEachCallback
 * @param {Array<number>} currentCoord The current coordinate being processed.
 * @param {number} coordIndex The current index of the coordinate being processed.
 * @param {number} featureIndex The current index of the Feature being processed.
 * @param {number} multiFeatureIndex The current index of the Multi-Feature being processed.
 * @param {number} geometryIndex The current index of the Geometry being processed.
 */

/**
 * Iterate over coordinates in any GeoJSON object, similar to Array.forEach()
 *
 * @name coordEach
 * @param {FeatureCollection|Feature|Geometry} geojson any GeoJSON object
 * @param {Function} callback a method that takes (currentCoord, coordIndex, featureIndex, multiFeatureIndex)
 * @param {boolean} [excludeWrapCoord=false] whether or not to include the final coordinate of LinearRings that wraps the ring in its iteration.
 * @returns {void}
 * @example
 * var features = turf.featureCollection([
 *   turf.point([26, 37], {"foo": "bar"}),
 *   turf.point([36, 53], {"hello": "world"})
 * ]);
 *
 * turf.coordEach(features, function (currentCoord, coordIndex, featureIndex, multiFeatureIndex, geometryIndex) {
 *   //=currentCoord
 *   //=coordIndex
 *   //=featureIndex
 *   //=multiFeatureIndex
 *   //=geometryIndex
 * });
 */
function coordEach(geojson, callback, excludeWrapCoord) {
    // Handles null Geometry -- Skips this GeoJSON
    if (geojson === null) return;
    var j, k, l, geometry, stopG, coords,
        geometryMaybeCollection,
        wrapShrink = 0,
        coordIndex = 0,
        isGeometryCollection,
        type = geojson.type,
        isFeatureCollection = type === 'FeatureCollection',
        isFeature = type === 'Feature',
        stop = isFeatureCollection ? geojson.features.length : 1;

    // This logic may look a little weird. The reason why it is that way
    // is because it's trying to be fast. GeoJSON supports multiple kinds
    // of objects at its root: FeatureCollection, Features, Geometries.
    // This function has the responsibility of handling all of them, and that
    // means that some of the `for` loops you see below actually just don't apply
    // to certain inputs. For instance, if you give this just a
    // Point geometry, then both loops are short-circuited and all we do
    // is gradually rename the input until it's called 'geometry'.
    //
    // This also aims to allocate as few resources as possible: just a
    // few numbers and booleans, rather than any temporary arrays as would
    // be required with the normalization approach.
    for (var featureIndex = 0; featureIndex < stop; featureIndex++) {
        geometryMaybeCollection = (isFeatureCollection ? geojson.features[featureIndex].geometry :
            (isFeature ? geojson.geometry : geojson));
        isGeometryCollection = (geometryMaybeCollection) ? geometryMaybeCollection.type === 'GeometryCollection' : false;
        stopG = isGeometryCollection ? geometryMaybeCollection.geometries.length : 1;

        for (var geomIndex = 0; geomIndex < stopG; geomIndex++) {
            var multiFeatureIndex = 0;
            var geometryIndex = 0;
            geometry = isGeometryCollection ?
                geometryMaybeCollection.geometries[geomIndex] : geometryMaybeCollection;

            // Handles null Geometry -- Skips this geometry
            if (geometry === null) continue;
            coords = geometry.coordinates;
            var geomType = geometry.type;

            wrapShrink = (excludeWrapCoord && (geomType === 'Polygon' || geomType === 'MultiPolygon')) ? 1 : 0;

            switch (geomType) {
            case null:
                break;
            case 'Point':
                if (callback(coords, coordIndex, featureIndex, multiFeatureIndex, geometryIndex) === false) return false;
                coordIndex++;
                multiFeatureIndex++;
                break;
            case 'LineString':
            case 'MultiPoint':
                for (j = 0; j < coords.length; j++) {
                    if (callback(coords[j], coordIndex, featureIndex, multiFeatureIndex, geometryIndex) === false) return false;
                    coordIndex++;
                    if (geomType === 'MultiPoint') multiFeatureIndex++;
                }
                if (geomType === 'LineString') multiFeatureIndex++;
                break;
            case 'Polygon':
            case 'MultiLineString':
                for (j = 0; j < coords.length; j++) {
                    for (k = 0; k < coords[j].length - wrapShrink; k++) {
                        if (callback(coords[j][k], coordIndex, featureIndex, multiFeatureIndex, geometryIndex) === false) return false;
                        coordIndex++;
                    }
                    if (geomType === 'MultiLineString') multiFeatureIndex++;
                    if (geomType === 'Polygon') geometryIndex++;
                }
                if (geomType === 'Polygon') multiFeatureIndex++;
                break;
            case 'MultiPolygon':
                for (j = 0; j < coords.length; j++) {
                    if (geomType === 'MultiPolygon') geometryIndex = 0;
                    for (k = 0; k < coords[j].length; k++) {
                        for (l = 0; l < coords[j][k].length - wrapShrink; l++) {
                            if (callback(coords[j][k][l], coordIndex, featureIndex, multiFeatureIndex, geometryIndex) === false) return false;
                            coordIndex++;
                        }
                        geometryIndex++;
                    }
                    multiFeatureIndex++;
                }
                break;
            case 'GeometryCollection':
                for (j = 0; j < geometry.geometries.length; j++)
                    if (coordEach(geometry.geometries[j], callback, excludeWrapCoord) === false) return false;
                break;
            default:
                throw new Error('Unknown Geometry Type');
            }
        }
    }
}

/**
 * Callback for coordReduce
 *
 * The first time the callback function is called, the values provided as arguments depend
 * on whether the reduce method has an initialValue argument.
 *
 * If an initialValue is provided to the reduce method:
 *  - The previousValue argument is initialValue.
 *  - The currentValue argument is the value of the first element present in the array.
 *
 * If an initialValue is not provided:
 *  - The previousValue argument is the value of the first element present in the array.
 *  - The currentValue argument is the value of the second element present in the array.
 *
 * @callback coordReduceCallback
 * @param {*} previousValue The accumulated value previously returned in the last invocation
 * of the callback, or initialValue, if supplied.
 * @param {Array<number>} currentCoord The current coordinate being processed.
 * @param {number} coordIndex The current index of the coordinate being processed.
 * Starts at index 0, if an initialValue is provided, and at index 1 otherwise.
 * @param {number} featureIndex The current index of the Feature being processed.
 * @param {number} multiFeatureIndex The current index of the Multi-Feature being processed.
 * @param {number} geometryIndex The current index of the Geometry being processed.
 */

/**
 * Reduce coordinates in any GeoJSON object, similar to Array.reduce()
 *
 * @name coordReduce
 * @param {FeatureCollection|Geometry|Feature} geojson any GeoJSON object
 * @param {Function} callback a method that takes (previousValue, currentCoord, coordIndex)
 * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
 * @param {boolean} [excludeWrapCoord=false] whether or not to include the final coordinate of LinearRings that wraps the ring in its iteration.
 * @returns {*} The value that results from the reduction.
 * @example
 * var features = turf.featureCollection([
 *   turf.point([26, 37], {"foo": "bar"}),
 *   turf.point([36, 53], {"hello": "world"})
 * ]);
 *
 * turf.coordReduce(features, function (previousValue, currentCoord, coordIndex, featureIndex, multiFeatureIndex, geometryIndex) {
 *   //=previousValue
 *   //=currentCoord
 *   //=coordIndex
 *   //=featureIndex
 *   //=multiFeatureIndex
 *   //=geometryIndex
 *   return currentCoord;
 * });
 */
function coordReduce(geojson, callback, initialValue, excludeWrapCoord) {
    var previousValue = initialValue;
    coordEach(geojson, function (currentCoord, coordIndex, featureIndex, multiFeatureIndex, geometryIndex) {
        if (coordIndex === 0 && initialValue === undefined) previousValue = currentCoord;
        else previousValue = callback(previousValue, currentCoord, coordIndex, featureIndex, multiFeatureIndex, geometryIndex);
    }, excludeWrapCoord);
    return previousValue;
}

/**
 * Callback for propEach
 *
 * @callback propEachCallback
 * @param {Object} currentProperties The current Properties being processed.
 * @param {number} featureIndex The current index of the Feature being processed.
 */

/**
 * Iterate over properties in any GeoJSON object, similar to Array.forEach()
 *
 * @name propEach
 * @param {FeatureCollection|Feature} geojson any GeoJSON object
 * @param {Function} callback a method that takes (currentProperties, featureIndex)
 * @returns {void}
 * @example
 * var features = turf.featureCollection([
 *     turf.point([26, 37], {foo: 'bar'}),
 *     turf.point([36, 53], {hello: 'world'})
 * ]);
 *
 * turf.propEach(features, function (currentProperties, featureIndex) {
 *   //=currentProperties
 *   //=featureIndex
 * });
 */
function propEach(geojson, callback) {
    var i;
    switch (geojson.type) {
    case 'FeatureCollection':
        for (i = 0; i < geojson.features.length; i++) {
            if (callback(geojson.features[i].properties, i) === false) break;
        }
        break;
    case 'Feature':
        callback(geojson.properties, 0);
        break;
    }
}


/**
 * Callback for propReduce
 *
 * The first time the callback function is called, the values provided as arguments depend
 * on whether the reduce method has an initialValue argument.
 *
 * If an initialValue is provided to the reduce method:
 *  - The previousValue argument is initialValue.
 *  - The currentValue argument is the value of the first element present in the array.
 *
 * If an initialValue is not provided:
 *  - The previousValue argument is the value of the first element present in the array.
 *  - The currentValue argument is the value of the second element present in the array.
 *
 * @callback propReduceCallback
 * @param {*} previousValue The accumulated value previously returned in the last invocation
 * of the callback, or initialValue, if supplied.
 * @param {*} currentProperties The current Properties being processed.
 * @param {number} featureIndex The current index of the Feature being processed.
 */

/**
 * Reduce properties in any GeoJSON object into a single value,
 * similar to how Array.reduce works. However, in this case we lazily run
 * the reduction, so an array of all properties is unnecessary.
 *
 * @name propReduce
 * @param {FeatureCollection|Feature} geojson any GeoJSON object
 * @param {Function} callback a method that takes (previousValue, currentProperties, featureIndex)
 * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
 * @returns {*} The value that results from the reduction.
 * @example
 * var features = turf.featureCollection([
 *     turf.point([26, 37], {foo: 'bar'}),
 *     turf.point([36, 53], {hello: 'world'})
 * ]);
 *
 * turf.propReduce(features, function (previousValue, currentProperties, featureIndex) {
 *   //=previousValue
 *   //=currentProperties
 *   //=featureIndex
 *   return currentProperties
 * });
 */
function propReduce(geojson, callback, initialValue) {
    var previousValue = initialValue;
    propEach(geojson, function (currentProperties, featureIndex) {
        if (featureIndex === 0 && initialValue === undefined) previousValue = currentProperties;
        else previousValue = callback(previousValue, currentProperties, featureIndex);
    });
    return previousValue;
}

/**
 * Callback for featureEach
 *
 * @callback featureEachCallback
 * @param {Feature<any>} currentFeature The current Feature being processed.
 * @param {number} featureIndex The current index of the Feature being processed.
 */

/**
 * Iterate over features in any GeoJSON object, similar to
 * Array.forEach.
 *
 * @name featureEach
 * @param {FeatureCollection|Feature|Geometry} geojson any GeoJSON object
 * @param {Function} callback a method that takes (currentFeature, featureIndex)
 * @returns {void}
 * @example
 * var features = turf.featureCollection([
 *   turf.point([26, 37], {foo: 'bar'}),
 *   turf.point([36, 53], {hello: 'world'})
 * ]);
 *
 * turf.featureEach(features, function (currentFeature, featureIndex) {
 *   //=currentFeature
 *   //=featureIndex
 * });
 */
function featureEach(geojson, callback) {
    if (geojson.type === 'Feature') {
        callback(geojson, 0);
    } else if (geojson.type === 'FeatureCollection') {
        for (var i = 0; i < geojson.features.length; i++) {
            if (callback(geojson.features[i], i) === false) break;
        }
    }
}

/**
 * Callback for featureReduce
 *
 * The first time the callback function is called, the values provided as arguments depend
 * on whether the reduce method has an initialValue argument.
 *
 * If an initialValue is provided to the reduce method:
 *  - The previousValue argument is initialValue.
 *  - The currentValue argument is the value of the first element present in the array.
 *
 * If an initialValue is not provided:
 *  - The previousValue argument is the value of the first element present in the array.
 *  - The currentValue argument is the value of the second element present in the array.
 *
 * @callback featureReduceCallback
 * @param {*} previousValue The accumulated value previously returned in the last invocation
 * of the callback, or initialValue, if supplied.
 * @param {Feature} currentFeature The current Feature being processed.
 * @param {number} featureIndex The current index of the Feature being processed.
 */

/**
 * Reduce features in any GeoJSON object, similar to Array.reduce().
 *
 * @name featureReduce
 * @param {FeatureCollection|Feature|Geometry} geojson any GeoJSON object
 * @param {Function} callback a method that takes (previousValue, currentFeature, featureIndex)
 * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
 * @returns {*} The value that results from the reduction.
 * @example
 * var features = turf.featureCollection([
 *   turf.point([26, 37], {"foo": "bar"}),
 *   turf.point([36, 53], {"hello": "world"})
 * ]);
 *
 * turf.featureReduce(features, function (previousValue, currentFeature, featureIndex) {
 *   //=previousValue
 *   //=currentFeature
 *   //=featureIndex
 *   return currentFeature
 * });
 */
function featureReduce(geojson, callback, initialValue) {
    var previousValue = initialValue;
    featureEach(geojson, function (currentFeature, featureIndex) {
        if (featureIndex === 0 && initialValue === undefined) previousValue = currentFeature;
        else previousValue = callback(previousValue, currentFeature, featureIndex);
    });
    return previousValue;
}

/**
 * Get all coordinates from any GeoJSON object.
 *
 * @name coordAll
 * @param {FeatureCollection|Feature|Geometry} geojson any GeoJSON object
 * @returns {Array<Array<number>>} coordinate position array
 * @example
 * var features = turf.featureCollection([
 *   turf.point([26, 37], {foo: 'bar'}),
 *   turf.point([36, 53], {hello: 'world'})
 * ]);
 *
 * var coords = turf.coordAll(features);
 * //= [[26, 37], [36, 53]]
 */
function coordAll(geojson) {
    var coords = [];
    coordEach(geojson, function (coord) {
        coords.push(coord);
    });
    return coords;
}

/**
 * Callback for geomEach
 *
 * @callback geomEachCallback
 * @param {Geometry} currentGeometry The current Geometry being processed.
 * @param {number} featureIndex The current index of the Feature being processed.
 * @param {Object} featureProperties The current Feature Properties being processed.
 * @param {Array<number>} featureBBox The current Feature BBox being processed.
 * @param {number|string} featureId The current Feature Id being processed.
 */

/**
 * Iterate over each geometry in any GeoJSON object, similar to Array.forEach()
 *
 * @name geomEach
 * @param {FeatureCollection|Feature|Geometry} geojson any GeoJSON object
 * @param {Function} callback a method that takes (currentGeometry, featureIndex, featureProperties, featureBBox, featureId)
 * @returns {void}
 * @example
 * var features = turf.featureCollection([
 *     turf.point([26, 37], {foo: 'bar'}),
 *     turf.point([36, 53], {hello: 'world'})
 * ]);
 *
 * turf.geomEach(features, function (currentGeometry, featureIndex, featureProperties, featureBBox, featureId) {
 *   //=currentGeometry
 *   //=featureIndex
 *   //=featureProperties
 *   //=featureBBox
 *   //=featureId
 * });
 */
function geomEach(geojson, callback) {
    var i, j, g, geometry, stopG,
        geometryMaybeCollection,
        isGeometryCollection,
        featureProperties,
        featureBBox,
        featureId,
        featureIndex = 0,
        isFeatureCollection = geojson.type === 'FeatureCollection',
        isFeature = geojson.type === 'Feature',
        stop = isFeatureCollection ? geojson.features.length : 1;

    // This logic may look a little weird. The reason why it is that way
    // is because it's trying to be fast. GeoJSON supports multiple kinds
    // of objects at its root: FeatureCollection, Features, Geometries.
    // This function has the responsibility of handling all of them, and that
    // means that some of the `for` loops you see below actually just don't apply
    // to certain inputs. For instance, if you give this just a
    // Point geometry, then both loops are short-circuited and all we do
    // is gradually rename the input until it's called 'geometry'.
    //
    // This also aims to allocate as few resources as possible: just a
    // few numbers and booleans, rather than any temporary arrays as would
    // be required with the normalization approach.
    for (i = 0; i < stop; i++) {

        geometryMaybeCollection = (isFeatureCollection ? geojson.features[i].geometry :
            (isFeature ? geojson.geometry : geojson));
        featureProperties = (isFeatureCollection ? geojson.features[i].properties :
            (isFeature ? geojson.properties : {}));
        featureBBox = (isFeatureCollection ? geojson.features[i].bbox :
            (isFeature ? geojson.bbox : undefined));
        featureId = (isFeatureCollection ? geojson.features[i].id :
            (isFeature ? geojson.id : undefined));
        isGeometryCollection = (geometryMaybeCollection) ? geometryMaybeCollection.type === 'GeometryCollection' : false;
        stopG = isGeometryCollection ? geometryMaybeCollection.geometries.length : 1;

        for (g = 0; g < stopG; g++) {
            geometry = isGeometryCollection ?
                geometryMaybeCollection.geometries[g] : geometryMaybeCollection;

            // Handle null Geometry
            if (geometry === null) {
                if (callback(null, featureIndex, featureProperties, featureBBox, featureId) === false) return false;
                continue;
            }
            switch (geometry.type) {
            case 'Point':
            case 'LineString':
            case 'MultiPoint':
            case 'Polygon':
            case 'MultiLineString':
            case 'MultiPolygon': {
                if (callback(geometry, featureIndex, featureProperties, featureBBox, featureId) === false) return false;
                break;
            }
            case 'GeometryCollection': {
                for (j = 0; j < geometry.geometries.length; j++) {
                    if (callback(geometry.geometries[j], featureIndex, featureProperties, featureBBox, featureId) === false) return false;
                }
                break;
            }
            default:
                throw new Error('Unknown Geometry Type');
            }
        }
        // Only increase `featureIndex` per each feature
        featureIndex++;
    }
}

/**
 * Callback for geomReduce
 *
 * The first time the callback function is called, the values provided as arguments depend
 * on whether the reduce method has an initialValue argument.
 *
 * If an initialValue is provided to the reduce method:
 *  - The previousValue argument is initialValue.
 *  - The currentValue argument is the value of the first element present in the array.
 *
 * If an initialValue is not provided:
 *  - The previousValue argument is the value of the first element present in the array.
 *  - The currentValue argument is the value of the second element present in the array.
 *
 * @callback geomReduceCallback
 * @param {*} previousValue The accumulated value previously returned in the last invocation
 * of the callback, or initialValue, if supplied.
 * @param {Geometry} currentGeometry The current Geometry being processed.
 * @param {number} featureIndex The current index of the Feature being processed.
 * @param {Object} featureProperties The current Feature Properties being processed.
 * @param {Array<number>} featureBBox The current Feature BBox being processed.
 * @param {number|string} featureId The current Feature Id being processed.
 */

/**
 * Reduce geometry in any GeoJSON object, similar to Array.reduce().
 *
 * @name geomReduce
 * @param {FeatureCollection|Feature|Geometry} geojson any GeoJSON object
 * @param {Function} callback a method that takes (previousValue, currentGeometry, featureIndex, featureProperties, featureBBox, featureId)
 * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
 * @returns {*} The value that results from the reduction.
 * @example
 * var features = turf.featureCollection([
 *     turf.point([26, 37], {foo: 'bar'}),
 *     turf.point([36, 53], {hello: 'world'})
 * ]);
 *
 * turf.geomReduce(features, function (previousValue, currentGeometry, featureIndex, featureProperties, featureBBox, featureId) {
 *   //=previousValue
 *   //=currentGeometry
 *   //=featureIndex
 *   //=featureProperties
 *   //=featureBBox
 *   //=featureId
 *   return currentGeometry
 * });
 */
function geomReduce(geojson, callback, initialValue) {
    var previousValue = initialValue;
    geomEach(geojson, function (currentGeometry, featureIndex, featureProperties, featureBBox, featureId) {
        if (featureIndex === 0 && initialValue === undefined) previousValue = currentGeometry;
        else previousValue = callback(previousValue, currentGeometry, featureIndex, featureProperties, featureBBox, featureId);
    });
    return previousValue;
}

/**
 * Callback for flattenEach
 *
 * @callback flattenEachCallback
 * @param {Feature} currentFeature The current flattened feature being processed.
 * @param {number} featureIndex The current index of the Feature being processed.
 * @param {number} multiFeatureIndex The current index of the Multi-Feature being processed.
 */

/**
 * Iterate over flattened features in any GeoJSON object, similar to
 * Array.forEach.
 *
 * @name flattenEach
 * @param {FeatureCollection|Feature|Geometry} geojson any GeoJSON object
 * @param {Function} callback a method that takes (currentFeature, featureIndex, multiFeatureIndex)
 * @example
 * var features = turf.featureCollection([
 *     turf.point([26, 37], {foo: 'bar'}),
 *     turf.multiPoint([[40, 30], [36, 53]], {hello: 'world'})
 * ]);
 *
 * turf.flattenEach(features, function (currentFeature, featureIndex, multiFeatureIndex) {
 *   //=currentFeature
 *   //=featureIndex
 *   //=multiFeatureIndex
 * });
 */
function flattenEach(geojson, callback) {
    geomEach(geojson, function (geometry, featureIndex, properties, bbox, id) {
        // Callback for single geometry
        var type = (geometry === null) ? null : geometry.type;
        switch (type) {
        case null:
        case 'Point':
        case 'LineString':
        case 'Polygon':
            if (callback(helpers.feature(geometry, properties, {bbox: bbox, id: id}), featureIndex, 0) === false) return false;
            return;
        }

        var geomType;

        // Callback for multi-geometry
        switch (type) {
        case 'MultiPoint':
            geomType = 'Point';
            break;
        case 'MultiLineString':
            geomType = 'LineString';
            break;
        case 'MultiPolygon':
            geomType = 'Polygon';
            break;
        }

        for (var multiFeatureIndex = 0; multiFeatureIndex < geometry.coordinates.length; multiFeatureIndex++) {
            var coordinate = geometry.coordinates[multiFeatureIndex];
            var geom = {
                type: geomType,
                coordinates: coordinate
            };
            if (callback(helpers.feature(geom, properties), featureIndex, multiFeatureIndex) === false) return false;
        }
    });
}

/**
 * Callback for flattenReduce
 *
 * The first time the callback function is called, the values provided as arguments depend
 * on whether the reduce method has an initialValue argument.
 *
 * If an initialValue is provided to the reduce method:
 *  - The previousValue argument is initialValue.
 *  - The currentValue argument is the value of the first element present in the array.
 *
 * If an initialValue is not provided:
 *  - The previousValue argument is the value of the first element present in the array.
 *  - The currentValue argument is the value of the second element present in the array.
 *
 * @callback flattenReduceCallback
 * @param {*} previousValue The accumulated value previously returned in the last invocation
 * of the callback, or initialValue, if supplied.
 * @param {Feature} currentFeature The current Feature being processed.
 * @param {number} featureIndex The current index of the Feature being processed.
 * @param {number} multiFeatureIndex The current index of the Multi-Feature being processed.
 */

/**
 * Reduce flattened features in any GeoJSON object, similar to Array.reduce().
 *
 * @name flattenReduce
 * @param {FeatureCollection|Feature|Geometry} geojson any GeoJSON object
 * @param {Function} callback a method that takes (previousValue, currentFeature, featureIndex, multiFeatureIndex)
 * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
 * @returns {*} The value that results from the reduction.
 * @example
 * var features = turf.featureCollection([
 *     turf.point([26, 37], {foo: 'bar'}),
 *     turf.multiPoint([[40, 30], [36, 53]], {hello: 'world'})
 * ]);
 *
 * turf.flattenReduce(features, function (previousValue, currentFeature, featureIndex, multiFeatureIndex) {
 *   //=previousValue
 *   //=currentFeature
 *   //=featureIndex
 *   //=multiFeatureIndex
 *   return currentFeature
 * });
 */
function flattenReduce(geojson, callback, initialValue) {
    var previousValue = initialValue;
    flattenEach(geojson, function (currentFeature, featureIndex, multiFeatureIndex) {
        if (featureIndex === 0 && multiFeatureIndex === 0 && initialValue === undefined) previousValue = currentFeature;
        else previousValue = callback(previousValue, currentFeature, featureIndex, multiFeatureIndex);
    });
    return previousValue;
}

/**
 * Callback for segmentEach
 *
 * @callback segmentEachCallback
 * @param {Feature<LineString>} currentSegment The current Segment being processed.
 * @param {number} featureIndex The current index of the Feature being processed.
 * @param {number} multiFeatureIndex The current index of the Multi-Feature being processed.
 * @param {number} geometryIndex The current index of the Geometry being processed.
 * @param {number} segmentIndex The current index of the Segment being processed.
 * @returns {void}
 */

/**
 * Iterate over 2-vertex line segment in any GeoJSON object, similar to Array.forEach()
 * (Multi)Point geometries do not contain segments therefore they are ignored during this operation.
 *
 * @param {FeatureCollection|Feature|Geometry} geojson any GeoJSON
 * @param {Function} callback a method that takes (currentSegment, featureIndex, multiFeatureIndex, geometryIndex, segmentIndex)
 * @returns {void}
 * @example
 * var polygon = turf.polygon([[[-50, 5], [-40, -10], [-50, -10], [-40, 5], [-50, 5]]]);
 *
 * // Iterate over GeoJSON by 2-vertex segments
 * turf.segmentEach(polygon, function (currentSegment, featureIndex, multiFeatureIndex, geometryIndex, segmentIndex) {
 *   //=currentSegment
 *   //=featureIndex
 *   //=multiFeatureIndex
 *   //=geometryIndex
 *   //=segmentIndex
 * });
 *
 * // Calculate the total number of segments
 * var total = 0;
 * turf.segmentEach(polygon, function () {
 *     total++;
 * });
 */
function segmentEach(geojson, callback) {
    flattenEach(geojson, function (feature$$1, featureIndex, multiFeatureIndex) {
        var segmentIndex = 0;

        // Exclude null Geometries
        if (!feature$$1.geometry) return;
        // (Multi)Point geometries do not contain segments therefore they are ignored during this operation.
        var type = feature$$1.geometry.type;
        if (type === 'Point' || type === 'MultiPoint') return;

        // Generate 2-vertex line segments
        var previousCoords;
        if (coordEach(feature$$1, function (currentCoord, coordIndex, featureIndexCoord, mutliPartIndexCoord, geometryIndex) {
            // Simulating a meta.coordReduce() since `reduce` operations cannot be stopped by returning `false`
            if (previousCoords === undefined) {
                previousCoords = currentCoord;
                return;
            }
            var currentSegment = helpers.lineString([previousCoords, currentCoord], feature$$1.properties);
            if (callback(currentSegment, featureIndex, multiFeatureIndex, geometryIndex, segmentIndex) === false) return false;
            segmentIndex++;
            previousCoords = currentCoord;
        }) === false) return false;
    });
}

/**
 * Callback for segmentReduce
 *
 * The first time the callback function is called, the values provided as arguments depend
 * on whether the reduce method has an initialValue argument.
 *
 * If an initialValue is provided to the reduce method:
 *  - The previousValue argument is initialValue.
 *  - The currentValue argument is the value of the first element present in the array.
 *
 * If an initialValue is not provided:
 *  - The previousValue argument is the value of the first element present in the array.
 *  - The currentValue argument is the value of the second element present in the array.
 *
 * @callback segmentReduceCallback
 * @param {*} previousValue The accumulated value previously returned in the last invocation
 * of the callback, or initialValue, if supplied.
 * @param {Feature<LineString>} currentSegment The current Segment being processed.
 * @param {number} featureIndex The current index of the Feature being processed.
 * @param {number} multiFeatureIndex The current index of the Multi-Feature being processed.
 * @param {number} geometryIndex The current index of the Geometry being processed.
 * @param {number} segmentIndex The current index of the Segment being processed.
 */

/**
 * Reduce 2-vertex line segment in any GeoJSON object, similar to Array.reduce()
 * (Multi)Point geometries do not contain segments therefore they are ignored during this operation.
 *
 * @param {FeatureCollection|Feature|Geometry} geojson any GeoJSON
 * @param {Function} callback a method that takes (previousValue, currentSegment, currentIndex)
 * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
 * @returns {void}
 * @example
 * var polygon = turf.polygon([[[-50, 5], [-40, -10], [-50, -10], [-40, 5], [-50, 5]]]);
 *
 * // Iterate over GeoJSON by 2-vertex segments
 * turf.segmentReduce(polygon, function (previousSegment, currentSegment, featureIndex, multiFeatureIndex, geometryIndex, segmentIndex) {
 *   //= previousSegment
 *   //= currentSegment
 *   //= featureIndex
 *   //= multiFeatureIndex
 *   //= geometryIndex
 *   //= segmentInex
 *   return currentSegment
 * });
 *
 * // Calculate the total number of segments
 * var initialValue = 0
 * var total = turf.segmentReduce(polygon, function (previousValue) {
 *     previousValue++;
 *     return previousValue;
 * }, initialValue);
 */
function segmentReduce(geojson, callback, initialValue) {
    var previousValue = initialValue;
    var started = false;
    segmentEach(geojson, function (currentSegment, featureIndex, multiFeatureIndex, geometryIndex, segmentIndex) {
        if (started === false && initialValue === undefined) previousValue = currentSegment;
        else previousValue = callback(previousValue, currentSegment, featureIndex, multiFeatureIndex, geometryIndex, segmentIndex);
        started = true;
    });
    return previousValue;
}

/**
 * Callback for lineEach
 *
 * @callback lineEachCallback
 * @param {Feature<LineString>} currentLine The current LineString|LinearRing being processed
 * @param {number} featureIndex The current index of the Feature being processed
 * @param {number} multiFeatureIndex The current index of the Multi-Feature being processed
 * @param {number} geometryIndex The current index of the Geometry being processed
 */

/**
 * Iterate over line or ring coordinates in LineString, Polygon, MultiLineString, MultiPolygon Features or Geometries,
 * similar to Array.forEach.
 *
 * @name lineEach
 * @param {Geometry|Feature<LineString|Polygon|MultiLineString|MultiPolygon>} geojson object
 * @param {Function} callback a method that takes (currentLine, featureIndex, multiFeatureIndex, geometryIndex)
 * @example
 * var multiLine = turf.multiLineString([
 *   [[26, 37], [35, 45]],
 *   [[36, 53], [38, 50], [41, 55]]
 * ]);
 *
 * turf.lineEach(multiLine, function (currentLine, featureIndex, multiFeatureIndex, geometryIndex) {
 *   //=currentLine
 *   //=featureIndex
 *   //=multiFeatureIndex
 *   //=geometryIndex
 * });
 */
function lineEach(geojson, callback) {
    // validation
    if (!geojson) throw new Error('geojson is required');

    flattenEach(geojson, function (feature$$1, featureIndex, multiFeatureIndex) {
        if (feature$$1.geometry === null) return;
        var type = feature$$1.geometry.type;
        var coords = feature$$1.geometry.coordinates;
        switch (type) {
        case 'LineString':
            if (callback(feature$$1, featureIndex, multiFeatureIndex, 0, 0) === false) return false;
            break;
        case 'Polygon':
            for (var geometryIndex = 0; geometryIndex < coords.length; geometryIndex++) {
                if (callback(helpers.lineString(coords[geometryIndex], feature$$1.properties), featureIndex, multiFeatureIndex, geometryIndex) === false) return false;
            }
            break;
        }
    });
}

/**
 * Callback for lineReduce
 *
 * The first time the callback function is called, the values provided as arguments depend
 * on whether the reduce method has an initialValue argument.
 *
 * If an initialValue is provided to the reduce method:
 *  - The previousValue argument is initialValue.
 *  - The currentValue argument is the value of the first element present in the array.
 *
 * If an initialValue is not provided:
 *  - The previousValue argument is the value of the first element present in the array.
 *  - The currentValue argument is the value of the second element present in the array.
 *
 * @callback lineReduceCallback
 * @param {*} previousValue The accumulated value previously returned in the last invocation
 * of the callback, or initialValue, if supplied.
 * @param {Feature<LineString>} currentLine The current LineString|LinearRing being processed.
 * @param {number} featureIndex The current index of the Feature being processed
 * @param {number} multiFeatureIndex The current index of the Multi-Feature being processed
 * @param {number} geometryIndex The current index of the Geometry being processed
 */

/**
 * Reduce features in any GeoJSON object, similar to Array.reduce().
 *
 * @name lineReduce
 * @param {Geometry|Feature<LineString|Polygon|MultiLineString|MultiPolygon>} geojson object
 * @param {Function} callback a method that takes (previousValue, currentLine, featureIndex, multiFeatureIndex, geometryIndex)
 * @param {*} [initialValue] Value to use as the first argument to the first call of the callback.
 * @returns {*} The value that results from the reduction.
 * @example
 * var multiPoly = turf.multiPolygon([
 *   turf.polygon([[[12,48],[2,41],[24,38],[12,48]], [[9,44],[13,41],[13,45],[9,44]]]),
 *   turf.polygon([[[5, 5], [0, 0], [2, 2], [4, 4], [5, 5]]])
 * ]);
 *
 * turf.lineReduce(multiPoly, function (previousValue, currentLine, featureIndex, multiFeatureIndex, geometryIndex) {
 *   //=previousValue
 *   //=currentLine
 *   //=featureIndex
 *   //=multiFeatureIndex
 *   //=geometryIndex
 *   return currentLine
 * });
 */
function lineReduce(geojson, callback, initialValue) {
    var previousValue = initialValue;
    lineEach(geojson, function (currentLine, featureIndex, multiFeatureIndex, geometryIndex) {
        if (featureIndex === 0 && initialValue === undefined) previousValue = currentLine;
        else previousValue = callback(previousValue, currentLine, featureIndex, multiFeatureIndex, geometryIndex);
    });
    return previousValue;
}

/**
 * Finds a particular 2-vertex LineString Segment from a GeoJSON using `@turf/meta` indexes.
 *
 * Negative indexes are permitted.
 * Point & MultiPoint will always return null.
 *
 * @param {FeatureCollection|Feature|Geometry} geojson Any GeoJSON Feature or Geometry
 * @param {Object} [options={}] Optional parameters
 * @param {number} [options.featureIndex=0] Feature Index
 * @param {number} [options.multiFeatureIndex=0] Multi-Feature Index
 * @param {number} [options.geometryIndex=0] Geometry Index
 * @param {number} [options.segmentIndex=0] Segment Index
 * @param {Object} [options.properties={}] Translate Properties to output LineString
 * @param {BBox} [options.bbox={}] Translate BBox to output LineString
 * @param {number|string} [options.id={}] Translate Id to output LineString
 * @returns {Feature<LineString>} 2-vertex GeoJSON Feature LineString
 * @example
 * var multiLine = turf.multiLineString([
 *     [[10, 10], [50, 30], [30, 40]],
 *     [[-10, -10], [-50, -30], [-30, -40]]
 * ]);
 *
 * // First Segment (defaults are 0)
 * turf.findSegment(multiLine);
 * // => Feature<LineString<[[10, 10], [50, 30]]>>
 *
 * // First Segment of 2nd Multi Feature
 * turf.findSegment(multiLine, {multiFeatureIndex: 1});
 * // => Feature<LineString<[[-10, -10], [-50, -30]]>>
 *
 * // Last Segment of Last Multi Feature
 * turf.findSegment(multiLine, {multiFeatureIndex: -1, segmentIndex: -1});
 * // => Feature<LineString<[[-50, -30], [-30, -40]]>>
 */
function findSegment(geojson, options) {
    // Optional Parameters
    options = options || {};
    if (!helpers.isObject(options)) throw new Error('options is invalid');
    var featureIndex = options.featureIndex || 0;
    var multiFeatureIndex = options.multiFeatureIndex || 0;
    var geometryIndex = options.geometryIndex || 0;
    var segmentIndex = options.segmentIndex || 0;

    // Find FeatureIndex
    var properties = options.properties;
    var geometry;

    switch (geojson.type) {
    case 'FeatureCollection':
        if (featureIndex < 0) featureIndex = geojson.features.length + featureIndex;
        properties = properties || geojson.features[featureIndex].properties;
        geometry = geojson.features[featureIndex].geometry;
        break;
    case 'Feature':
        properties = properties || geojson.properties;
        geometry = geojson.geometry;
        break;
    case 'Point':
    case 'MultiPoint':
        return null;
    case 'LineString':
    case 'Polygon':
    case 'MultiLineString':
    case 'MultiPolygon':
        geometry = geojson;
        break;
    default:
        throw new Error('geojson is invalid');
    }

    // Find SegmentIndex
    if (geometry === null) return null;
    var coords = geometry.coordinates;
    switch (geometry.type) {
    case 'Point':
    case 'MultiPoint':
        return null;
    case 'LineString':
        if (segmentIndex < 0) segmentIndex = coords.length + segmentIndex - 1;
        return helpers.lineString([coords[segmentIndex], coords[segmentIndex + 1]], properties, options);
    case 'Polygon':
        if (geometryIndex < 0) geometryIndex = coords.length + geometryIndex;
        if (segmentIndex < 0) segmentIndex = coords[geometryIndex].length + segmentIndex - 1;
        return helpers.lineString([coords[geometryIndex][segmentIndex], coords[geometryIndex][segmentIndex + 1]], properties, options);
    case 'MultiLineString':
        if (multiFeatureIndex < 0) multiFeatureIndex = coords.length + multiFeatureIndex;
        if (segmentIndex < 0) segmentIndex = coords[multiFeatureIndex].length + segmentIndex - 1;
        return helpers.lineString([coords[multiFeatureIndex][segmentIndex], coords[multiFeatureIndex][segmentIndex + 1]], properties, options);
    case 'MultiPolygon':
        if (multiFeatureIndex < 0) multiFeatureIndex = coords.length + multiFeatureIndex;
        if (geometryIndex < 0) geometryIndex = coords[multiFeatureIndex].length + geometryIndex;
        if (segmentIndex < 0) segmentIndex = coords[multiFeatureIndex][geometryIndex].length - segmentIndex - 1;
        return helpers.lineString([coords[multiFeatureIndex][geometryIndex][segmentIndex], coords[multiFeatureIndex][geometryIndex][segmentIndex + 1]], properties, options);
    }
    throw new Error('geojson is invalid');
}

/**
 * Finds a particular Point from a GeoJSON using `@turf/meta` indexes.
 *
 * Negative indexes are permitted.
 *
 * @param {FeatureCollection|Feature|Geometry} geojson Any GeoJSON Feature or Geometry
 * @param {Object} [options={}] Optional parameters
 * @param {number} [options.featureIndex=0] Feature Index
 * @param {number} [options.multiFeatureIndex=0] Multi-Feature Index
 * @param {number} [options.geometryIndex=0] Geometry Index
 * @param {number} [options.coordIndex=0] Coord Index
 * @param {Object} [options.properties={}] Translate Properties to output Point
 * @param {BBox} [options.bbox={}] Translate BBox to output Point
 * @param {number|string} [options.id={}] Translate Id to output Point
 * @returns {Feature<Point>} 2-vertex GeoJSON Feature Point
 * @example
 * var multiLine = turf.multiLineString([
 *     [[10, 10], [50, 30], [30, 40]],
 *     [[-10, -10], [-50, -30], [-30, -40]]
 * ]);
 *
 * // First Segment (defaults are 0)
 * turf.findPoint(multiLine);
 * // => Feature<Point<[10, 10]>>
 *
 * // First Segment of the 2nd Multi-Feature
 * turf.findPoint(multiLine, {multiFeatureIndex: 1});
 * // => Feature<Point<[-10, -10]>>
 *
 * // Last Segment of last Multi-Feature
 * turf.findPoint(multiLine, {multiFeatureIndex: -1, coordIndex: -1});
 * // => Feature<Point<[-30, -40]>>
 */
function findPoint(geojson, options) {
    // Optional Parameters
    options = options || {};
    if (!helpers.isObject(options)) throw new Error('options is invalid');
    var featureIndex = options.featureIndex || 0;
    var multiFeatureIndex = options.multiFeatureIndex || 0;
    var geometryIndex = options.geometryIndex || 0;
    var coordIndex = options.coordIndex || 0;

    // Find FeatureIndex
    var properties = options.properties;
    var geometry;

    switch (geojson.type) {
    case 'FeatureCollection':
        if (featureIndex < 0) featureIndex = geojson.features.length + featureIndex;
        properties = properties || geojson.features[featureIndex].properties;
        geometry = geojson.features[featureIndex].geometry;
        break;
    case 'Feature':
        properties = properties || geojson.properties;
        geometry = geojson.geometry;
        break;
    case 'Point':
    case 'MultiPoint':
        return null;
    case 'LineString':
    case 'Polygon':
    case 'MultiLineString':
    case 'MultiPolygon':
        geometry = geojson;
        break;
    default:
        throw new Error('geojson is invalid');
    }

    // Find Coord Index
    if (geometry === null) return null;
    var coords = geometry.coordinates;
    switch (geometry.type) {
    case 'Point':
        return helpers.point(coords, properties, options);
    case 'MultiPoint':
        if (multiFeatureIndex < 0) multiFeatureIndex = coords.length + multiFeatureIndex;
        return helpers.point(coords[multiFeatureIndex], properties, options);
    case 'LineString':
        if (coordIndex < 0) coordIndex = coords.length + coordIndex;
        return helpers.point(coords[coordIndex], properties, options);
    case 'Polygon':
        if (geometryIndex < 0) geometryIndex = coords.length + geometryIndex;
        if (coordIndex < 0) coordIndex = coords[geometryIndex].length + coordIndex;
        return helpers.point(coords[geometryIndex][coordIndex], properties, options);
    case 'MultiLineString':
        if (multiFeatureIndex < 0) multiFeatureIndex = coords.length + multiFeatureIndex;
        if (coordIndex < 0) coordIndex = coords[multiFeatureIndex].length + coordIndex;
        return helpers.point(coords[multiFeatureIndex][coordIndex], properties, options);
    case 'MultiPolygon':
        if (multiFeatureIndex < 0) multiFeatureIndex = coords.length + multiFeatureIndex;
        if (geometryIndex < 0) geometryIndex = coords[multiFeatureIndex].length + geometryIndex;
        if (coordIndex < 0) coordIndex = coords[multiFeatureIndex][geometryIndex].length - coordIndex;
        return helpers.point(coords[multiFeatureIndex][geometryIndex][coordIndex], properties, options);
    }
    throw new Error('geojson is invalid');
}

exports.coordEach = coordEach;
exports.coordReduce = coordReduce;
exports.propEach = propEach;
exports.propReduce = propReduce;
exports.featureEach = featureEach;
exports.featureReduce = featureReduce;
exports.coordAll = coordAll;
exports.geomEach = geomEach;
exports.geomReduce = geomReduce;
exports.flattenEach = flattenEach;
exports.flattenReduce = flattenReduce;
exports.segmentEach = segmentEach;
exports.segmentReduce = segmentReduce;
exports.lineEach = lineEach;
exports.lineReduce = lineReduce;
exports.findSegment = findSegment;
exports.findPoint = findPoint;

},{"@turf/helpers":13}],13:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],14:[function(require,module,exports){
'use strict';

module.exports = {
    compactNode: compactNode,
    compactGraph: compactGraph
};

function findNextEnd(prev, v, vertices, ends, vertexCoords, edgeData, trackIncoming, options) {
    var weight = vertices[prev][v],
        reverseWeight = vertices[v][prev],
        coordinates = [],
        path = [],
        reducedEdge = options.edgeDataSeed;
        
    if (options.edgeDataReduceFn) {
        reducedEdge = options.edgeDataReduceFn(reducedEdge, edgeData[v][prev]);
    }

    while (!ends[v]) {
        var edges = vertices[v];

        if (!edges) { break; }

        var next = Object.keys(edges).filter(function notPrevious(k) { return k !== prev; })[0];
        weight += edges[next];

        if (trackIncoming) {
            reverseWeight += vertices[next][v];

            if (path.indexOf(v) >= 0) {
                ends[v] = vertices[v];
                break;
            }
            path.push(v);
        }

        if (options.edgeDataReduceFn) {
            reducedEdge = options.edgeDataReduceFn(reducedEdge, edgeData[v][next]);
        }

        coordinates.push(vertexCoords[v]);
        prev = v;
        v = next;
    }

    return {
        vertex: v,
        weight: weight,
        reverseWeight: reverseWeight,
        coordinates: coordinates,
        reducedEdge: reducedEdge
    };
}

function compactNode(k, vertices, ends, vertexCoords, edgeData, trackIncoming, options) {
    options = options || {};
    var neighbors = vertices[k];
    return Object.keys(neighbors).reduce(function compactEdge(result, j) {
        var neighbor = findNextEnd(k, j, vertices, ends, vertexCoords, edgeData, trackIncoming, options);
        var weight = neighbor.weight;
        var reverseWeight = neighbor.reverseWeight;
        if (neighbor.vertex !== k) {
            if (!result.edges[neighbor.vertex] || result.edges[neighbor.vertex] > weight) {
                result.edges[neighbor.vertex] = weight;
                result.coordinates[neighbor.vertex] = [vertexCoords[k]].concat(neighbor.coordinates);
                result.reducedEdges[neighbor.vertex] = neighbor.reducedEdge;
            }
            if (trackIncoming && 
                !isNaN(reverseWeight) && (!result.incomingEdges[neighbor.vertex] || result.incomingEdges[neighbor.vertex] > reverseWeight)) {
                result.incomingEdges[neighbor.vertex] = reverseWeight;
                var coordinates = [vertexCoords[k]].concat(neighbor.coordinates);
                coordinates.reverse();
                result.incomingCoordinates[neighbor.vertex] = coordinates;
            }
        }
        return result;
    }, {edges: {}, incomingEdges: {}, coordinates: {}, incomingCoordinates: {}, reducedEdges: {}});
}

function compactGraph(vertices, vertexCoords, edgeData, options) {
    options = options || {};
    var progress = options.progress;
    var ends = Object.keys(vertices).reduce(function findEnds(es, k, i, vs) {
        var vertex = vertices[k];
        var edges = Object.keys(vertex);
        var numberEdges = edges.length;
        var remove;

        if (numberEdges === 1) {
            var other = vertices[edges[0]];
            remove = !other[k];
        } else if (numberEdges === 2) {
            remove = edges.filter(function(n) {
                return vertices[n][k];
            }).length === numberEdges;
        } else {
            remove = false;
        }

        if (!remove) {
            es[k] = vertex;
        }

        if (i % 1000 === 0 && progress) {
            progress('compact:ends', i, vs.length);
        }

        return es;
    }, {});

    return Object.keys(ends).reduce(function compactEnd(result, k, i, es) {
        var compacted = compactNode(k, vertices, ends, vertexCoords, edgeData, false, options);
        result.graph[k] = compacted.edges;
        result.coordinates[k] = compacted.coordinates;

        if (options.edgeDataReduceFn) {
            result.reducedEdges[k] = compacted.reducedEdges;
        }

        if (i % 1000 === 0 && progress) {
            progress('compact:nodes', i, es.length);
        }

        return result;
    }, {graph: {}, coordinates: {}, reducedEdges: {}});
};

},{}],15:[function(require,module,exports){
var Queue = require('tinyqueue');

module.exports = function(graph, start, end) {
    var costs = {};
    costs[start] = 0;
    var initialState = [0, [start], start];
    var queue = new Queue([initialState], function(a, b) { return a[0] - b[0]; });
    var explored = {};

    while (queue.length) {
        var state = queue.pop();
        var cost = state[0];
        var node = state[2];
        if (node === end) {
            return state.slice(0, 2);
        }

        var neighbours = graph[node];
        Object.keys(neighbours).forEach(function(n) {
            var newCost = cost + neighbours[n];
            if (!(n in costs) || newCost < costs[n]) {
                costs[n] = newCost;
                var newState = [newCost, state[1].concat([n]), n];
                queue.push(newState);
            }
        });
    }

    return null;
}
},{"tinyqueue":20}],16:[function(require,module,exports){
'use strict';

var findPath = require('./dijkstra'),
    preprocess = require('./preprocessor'),
    compactor = require('./compactor'),
    roundCoord = require('./round-coord');

module.exports = PathFinder;

function PathFinder(graph, options) {    
    options = options || {};

    if (!graph.compactedVertices) {
        graph = preprocess(graph, options);
    }

    this._graph = graph;
    this._keyFn = options.keyFn || function(c) {
        return c.join(',');
    };
    this._precision = options.precision || 1e-5;
    this._options = options;

    if (Object.keys(this._graph.compactedVertices).filter(function(k) { return k !== 'edgeData'; }).length === 0) {
        throw new Error('Compacted graph contains no forks (topology has no intersections).');
    }
}

PathFinder.prototype = {
    findPath: function(a, b) {
        var start = this._keyFn(roundCoord(a.geometry.coordinates, this._precision)),
            finish = this._keyFn(roundCoord(b.geometry.coordinates, this._precision));

        // We can't find a path if start or finish isn't in the
        // set of non-compacted vertices
        if (!this._graph.vertices[start] || !this._graph.vertices[finish]) {
            return null;
        }

        var phantomStart = this._createPhantom(start);
        var phantomEnd = this._createPhantom(finish);

        var path = findPath(this._graph.compactedVertices, start, finish);

        if (path) {
            var weight = path[0];
            path = path[1];
            return {
                path: path.reduce(function buildPath(cs, v, i, vs) {
                    if (i > 0) {
                        cs = cs.concat(this._graph.compactedCoordinates[vs[i - 1]][v]);
                    }

                    return cs;
                }.bind(this), []).concat([this._graph.sourceVertices[finish]]),
                weight: weight,
                edgeDatas: this._graph.compactedEdges 
                    ? path.reduce(function buildEdgeData(eds, v, i, vs) {
                        if (i > 0) {
                            eds.push({
                                reducedEdge: this._graph.compactedEdges[vs[i - 1]][v]
                            });
                        }

                        return eds;
                    }.bind(this), [])
                    : undefined
            };
        } else {
            return null;
        }

        this._removePhantom(phantomStart);
        this._removePhantom(phantomEnd);
    },

    serialize: function() {
        return this._graph;
    },

    _createPhantom: function(n) {
        if (this._graph.compactedVertices[n]) return null;

        var phantom = compactor.compactNode(n, this._graph.vertices, this._graph.compactedVertices, this._graph.sourceVertices, this._graph.edgeData, true, this._options);
        this._graph.compactedVertices[n] = phantom.edges;
        this._graph.compactedCoordinates[n] = phantom.coordinates;

        if (this._graph.compactedEdges) {
            this._graph.compactedEdges[n] = phantom.reducedEdges;
        }

        Object.keys(phantom.incomingEdges).forEach(function(neighbor) {
            this._graph.compactedVertices[neighbor][n] = phantom.incomingEdges[neighbor];
            this._graph.compactedCoordinates[neighbor][n] = phantom.incomingCoordinates[neighbor];
            if (this._graph.compactedEdges) {
                this._graph.compactedEdges[neighbor][n] = phantom.reducedEdges[neighbor];
            }
        }.bind(this));

        return n;
    },

    _removePhantom: function(n) {
        if (!n) return;

        Object.keys(this._graph.compactedVertices[n]).forEach(function(neighbor) {
            delete this._graph.compactedVertices[neighbor][n];
        }.bind(this));
        Object.keys(this._graph.compactedCoordinates[n]).forEach(function(neighbor) {
            delete this._graph.compactedCoordinates[neighbor][n];
        }.bind(this));
        if (this._graph.compactedEdges) {
            Object.keys(this._graph.compactedEdges[n]).forEach(function(neighbor) {
                delete this._graph.compactedEdges[neighbor][n];
            }.bind(this));
        }

        delete this._graph.compactedVertices[n];
        delete this._graph.compactedCoordinates[n];

        if (this._graph.compactedEdges) {
            delete this._graph.compactedEdges[n];
        }
    }
};

},{"./compactor":14,"./dijkstra":15,"./preprocessor":17,"./round-coord":18}],17:[function(require,module,exports){
'use strict';

var topology = require('./topology'),
    compactor = require('./compactor'),
    distance = require('@turf/distance').default,
    roundCoord = require('./round-coord'),
    point = require('turf-point');

module.exports = function preprocess(graph, options) {
    options = options || {};
    var weightFn = options.weightFn || function defaultWeightFn(a, b) {
            return distance(point(a), point(b));
        },
        topo;

    if (graph.type === 'FeatureCollection') {
        // Graph is GeoJSON data, create a topology from it
        topo = topology(graph, options);
    } else if (graph.edges) {
        // Graph is a preprocessed topology
        topo = graph;
    }

    var graph = topo.edges.reduce(function buildGraph(g, edge, i, es) {
        var a = edge[0],
            b = edge[1],
            props = edge[2],
            w = weightFn(topo.vertices[a], topo.vertices[b], props),
            makeEdgeList = function makeEdgeList(node) {
                if (!g.vertices[node]) {
                    g.vertices[node] = {};
                    if (options.edgeDataReduceFn) {
                        g.edgeData[node] = {};
                    }
                }
            },
            concatEdge = function concatEdge(startNode, endNode, weight) {
                var v = g.vertices[startNode];
                v[endNode] = weight;
                if (options.edgeDataReduceFn) {
                    g.edgeData[startNode][endNode] = options.edgeDataReduceFn(options.edgeDataSeed, props);
                }
            };

        if (w) {
            makeEdgeList(a);
            makeEdgeList(b);
            if (w instanceof Object) {
                if (w.forward) {
                    concatEdge(a, b, w.forward);
                }
                if (w.backward) {
                    concatEdge(b, a, w.backward);
                }
            } else {
                concatEdge(a, b, w);
                concatEdge(b, a, w);
            }
        }

        if (i % 1000 === 0 && options.progress) {
            options.progress('edgeweights', i,es.length);
        }

        return g;
    }, {edgeData: {}, vertices: {}});

    var compact = compactor.compactGraph(graph.vertices, topo.vertices, graph.edgeData, options);

    return {
        vertices: graph.vertices,
        edgeData: graph.edgeData,
        sourceVertices: topo.vertices,
        compactedVertices: compact.graph,
        compactedCoordinates: compact.coordinates,
        compactedEdges: options.edgeDataReduceFn ? compact.reducedEdges : null
    };
};

},{"./compactor":14,"./round-coord":18,"./topology":19,"@turf/distance":7,"turf-point":22}],18:[function(require,module,exports){
module.exports = function roundCoord(c, precision) {
    return [
        Math.round(c[0] / precision) * precision,
        Math.round(c[1] / precision) * precision,
    ];
};

},{}],19:[function(require,module,exports){
'use strict';

var explode = require('@turf/explode'),
    roundCoord = require('./round-coord');

module.exports = topology;

function geoJsonReduce(geojson, fn, seed) {
    if (geojson.type === 'FeatureCollection') {
        return geojson.features.reduce(function reduceFeatures(a, f) {
            return geoJsonReduce(f, fn, a);
        }, seed);
    } else {
        return fn(seed, geojson);
    }
}

function geoJsonFilterFeatures(geojson, fn) {
    var features = [];
    if (geojson.type === 'FeatureCollection') {
        features = features.concat(geojson.features.filter(fn));
    }

    return {
        type: 'FeatureCollection',
        features: features
    };
}

function isLineString(f) {
    return f.geometry.type === 'LineString';
}

function topology(geojson, options) {
    options = options || {};
    var keyFn = options.keyFn || function defaultKeyFn(c) {
            return c.join(',');
        },
        precision = options.precision || 1e-5;

    var lineStrings = geoJsonFilterFeatures(geojson, isLineString);
    var explodedLineStrings = explode(lineStrings);
    var vertices = explodedLineStrings.features.reduce(function buildTopologyVertices(cs, f, i, fs) {
            var rc = roundCoord(f.geometry.coordinates, precision);
            cs[keyFn(rc)] = f.geometry.coordinates;

            if (i % 1000 === 0 && options.progress) {
                options.progress('topo:vertices', i, fs.length);
            }

            return cs;
        }, {}),
        edges = geoJsonReduce(lineStrings, function buildTopologyEdges(es, f, i, fs) {
            f.geometry.coordinates.forEach(function buildLineStringEdges(c, i, cs) {
                if (i > 0) {
                    var k1 = keyFn(roundCoord(cs[i - 1], precision)),
                        k2 = keyFn(roundCoord(c, precision));
                    es.push([k1, k2, f.properties]);
                }
            });

            if (i % 1000 === 0 && options.progress) {
                options.progress('topo:edges', i, fs.length);
            }

            return es;
        }, []);

    return {
        vertices: vertices,
        edges: edges
    };
}

},{"./round-coord":18,"@turf/explode":8}],20:[function(require,module,exports){
(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
typeof define === 'function' && define.amd ? define(factory) :
(global = global || self, global.TinyQueue = factory());
}(this, function () { 'use strict';

var TinyQueue = function TinyQueue(data, compare) {
    if ( data === void 0 ) data = [];
    if ( compare === void 0 ) compare = defaultCompare;

    this.data = data;
    this.length = this.data.length;
    this.compare = compare;

    if (this.length > 0) {
        for (var i = (this.length >> 1) - 1; i >= 0; i--) { this._down(i); }
    }
};

TinyQueue.prototype.push = function push (item) {
    this.data.push(item);
    this.length++;
    this._up(this.length - 1);
};

TinyQueue.prototype.pop = function pop () {
    if (this.length === 0) { return undefined; }

    var top = this.data[0];
    var bottom = this.data.pop();
    this.length--;

    if (this.length > 0) {
        this.data[0] = bottom;
        this._down(0);
    }

    return top;
};

TinyQueue.prototype.peek = function peek () {
    return this.data[0];
};

TinyQueue.prototype._up = function _up (pos) {
    var ref = this;
        var data = ref.data;
        var compare = ref.compare;
    var item = data[pos];

    while (pos > 0) {
        var parent = (pos - 1) >> 1;
        var current = data[parent];
        if (compare(item, current) >= 0) { break; }
        data[pos] = current;
        pos = parent;
    }

    data[pos] = item;
};

TinyQueue.prototype._down = function _down (pos) {
    var ref = this;
        var data = ref.data;
        var compare = ref.compare;
    var halfLength = this.length >> 1;
    var item = data[pos];

    while (pos < halfLength) {
        var left = (pos << 1) + 1;
        var best = data[left];
        var right = left + 1;

        if (right < this.length && compare(data[right], best) < 0) {
            left = right;
            best = data[right];
        }
        if (compare(best, item) >= 0) { break; }

        data[pos] = best;
        pos = left;
    }

    data[pos] = item;
};

function defaultCompare(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

return TinyQueue;

}));

},{}],21:[function(require,module,exports){
/**
 * Takes one or more {@link Feature|Features} and creates a {@link FeatureCollection}
 *
 * @module turf/featurecollection
 * @category helper
 * @param {Feature} features input Features
 * @returns {FeatureCollection} a FeatureCollection of input features
 * @example
 * var features = [
 *  turf.point([-75.343, 39.984], {name: 'Location A'}),
 *  turf.point([-75.833, 39.284], {name: 'Location B'}),
 *  turf.point([-75.534, 39.123], {name: 'Location C'})
 * ];
 *
 * var fc = turf.featurecollection(features);
 *
 * //=fc
 */
module.exports = function(features){
  return {
    type: "FeatureCollection",
    features: features
  };
};

},{}],22:[function(require,module,exports){
/**
 * Takes coordinates and properties (optional) and returns a new {@link Point} feature.
 *
 * @module turf/point
 * @category helper
 * @param {number} longitude position west to east in decimal degrees
 * @param {number} latitude position south to north in decimal degrees
 * @param {Object} properties an Object that is used as the {@link Feature}'s
 * properties
 * @return {Point} a Point feature
 * @example
 * var pt1 = turf.point([-75.343, 39.984]);
 *
 * //=pt1
 */
var isArray = Array.isArray || function(arg) {
  return Object.prototype.toString.call(arg) === '[object Array]';
};
module.exports = function(coordinates, properties) {
  if (!isArray(coordinates)) throw new Error('Coordinates must be an array');
  if (coordinates.length < 2) throw new Error('Coordinates must be at least 2 numbers long');
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: coordinates
    },
    properties: properties || {}
  };
};

},{}]},{},[1]);
