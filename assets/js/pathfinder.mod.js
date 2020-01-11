var PathFinder = require('geojson-path-finder')
//var nearest = require('turf-nearest')
var point = require('turf-point')
var featurecollection = require('turf-featurecollection')

var ambarino = null, lemoyne = null, newAustin = null, newHanover = null, westElizabeth = null

function loadGeoJsonData(path) {
	return new Promise((res) => {
		$.getJSON(path + '?nocache=' + nocache)
			.done(function(data){
				console.log('geojson ' + path.substr(path.lastIndexOf('/')+1) + ' loaded')
				res(data)
			})
			.fail(function(){
				console.error('failed to load geojson ' + path.substr(path.lastIndexOf('/')+1))
				// resolve to empty featurecollection so the rest doesn't break
				res({"type":"FeatureCollection","features":[]})
			})
	})
}

async function loadAllGeoJson() {
	ambarino = await loadGeoJsonData('data/geojson/ambarino.json')
	lemoyne = await loadGeoJsonData('data/geojson/lemoyne.json')
	newAustin = await loadGeoJsonData('data/geojson/new-austin.json')
	newHanover = await loadGeoJsonData('data/geojson/new-hanover.json')
	westElizabeth = await loadGeoJsonData('data/geojson/west-elizabeth.json')

	var completeGeoJson = {"type":"FeatureCollection","features":[]}
	completeGeoJson.features = completeGeoJson.features.concat(ambarino.features)
	completeGeoJson.features = completeGeoJson.features.concat(lemoyne.features)
	completeGeoJson.features = completeGeoJson.features.concat(newAustin.features)
	completeGeoJson.features = completeGeoJson.features.concat(newHanover.features)
	completeGeoJson.features = completeGeoJson.features.concat(westElizabeth.features)

	PF._geoJson = completeGeoJson
}


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
	_geoJson: null
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
	if(PF._geoJson === null) {
		console.error('geojson not fully loaded yet')
		return
	}
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

// Append stylesheet to head
$('head').append($('<link />').attr({'rel': 'stylesheet', 'href': 'assets/css/pathfinder.css'}))

// Overwrite route generator functions
Routes.generatePath = function() { PF.pathfinderStart() }
Routes.orgClearPath = Routes.clearPath
Routes.clearPath = function() {  PF.pathfinderClear(); Routes.orgClearPath() }

// Load geojson now
loadAllGeoJson()