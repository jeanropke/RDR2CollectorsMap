var GeoJSONPathFinder = require('geojson-path-finder')
var point = require('turf-point')
var featurecollection = require('turf-featurecollection')

var ambarino = null, lemoyne = null, newAustin = null, newHanover = null, westElizabeth = null, fasttravel = null

function loadGeoJsonData(path) {
	return new Promise((res) => {
		$.getJSON(path + '?nocache=' + nocache)
			.done(function(data){
				console.log('[pathfinder] geojson ' + path.substr(path.lastIndexOf('/')+1) + ' loaded')
				res(data)
			})
			.fail(function(){
				console.error('[pathfinder] failed to load geojson ' + path.substr(path.lastIndexOf('/')+1))
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
	fasttravel = await loadGeoJsonData('data/geojson/fasttravel.json')

	var completeGeoJson = {"type":"FeatureCollection","features":[]}
	completeGeoJson.features = completeGeoJson.features.concat(ambarino.features)
	completeGeoJson.features = completeGeoJson.features.concat(lemoyne.features)
	completeGeoJson.features = completeGeoJson.features.concat(newAustin.features)
	completeGeoJson.features = completeGeoJson.features.concat(newHanover.features)
	completeGeoJson.features = completeGeoJson.features.concat(westElizabeth.features)

	PathFinder._geoJson = completeGeoJson
	var completeGeoJsonFT = Object.assign({}, completeGeoJson)
	completeGeoJsonFT.features = completeGeoJson.features.concat(fasttravel.features)
	PathFinder._geoJsonFT = completeGeoJsonFT
}


/**
 * Helping class to hold markers, that are nearby
 */
class Chunk {

	constructor() {
		this.markers = []
		this.bounds = null
		this.isDone = false
	}

	/**
	 * Calculates the bounds of the chunk
	 */
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

	/**
	 * Checks if the marker can be added to the chunk
	 * This is the case if the marker is now further away than 10 from the center of the chunk
	 * @param {Marker} marker 
	 * @returns {Boolean}
	 */
	_canAdd(marker) {
		if(this.bounds == null) return true
		var d = MapBase.map.distance(marker, this.bounds.getCenter())
		return d < 10
	}

	/**
	 * Checks if the marker can be added to the chunk and returns true if it was added
	 * @param {Marker} marker 
	 * @returns {Boolean}
	 */
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

	/**
	 * Returns true if chunks contains marker
	 * @param {Marker} marker 
	 * @returns {Boolean}
	 */
	contains(marker) {
		for(var i = 0; i < this.markers.length; i++) {
			if(this.markers[i].text == marker.text && this.markers[i].lat == marker.lat)
				return true
		}
		return false
	}

	/**
	 * Returns the bounds of the chunk
	 * @see {@link https://leafletjs.com/reference-1.6.0.html#latlngbounds|LatLngBounds}
	 * @returns {LatLngBounds}
	 */
	getBounds() {
		return this.bounds
	}

	/**
	 * Returns all availabe chunks
	 * @static
	 * @readonly
	 * @returns {Array<Chunk>}
	 */
	static get chunks() {
		if(typeof(Chunk._chunks) === 'undefined') return []
		return Chunk._chunks
	}

	/**
	 * Creates and returns a new Chunk
	 * @static
	 * @returns {Chunk}
	 */
	static newChunk() {
		if(typeof(Chunk._chunks) === 'undefined') Chunk.clearChunks()
		var c = new Chunk()
		Chunk._chunks.push(c)
		return c
	}

	/**
	 * Removes all saved chunks
	 * @static
	 */
	static clearChunks() {
		Chunk._chunks = []
	}

	/**
	 * Sorts the marker into all chunks that are suitable.
	 * If it wasn't sorted into an existing chunk, a new chunk is created.
	 * @static
	 * @param {Marker} marker 
	 */
	static sortMarker(marker) {
		var added = false
		for(var j = 0; j < Chunk.chunks.length; j++) {
			if(Chunk.chunks[j].addMarker(marker)) {
				added = true
			}
		}
		if(!added) {
			var c = Chunk.newChunk()
			c.addMarker(marker)
		}
	}

	/**
	 * Searches for the marker in all chunks and returns the first chunk it's found in or null if it's in no chunk
	 * @static
	 * @param {Marker} marker 
	 * @returns {Chunk|null}
	 */
	static getChunkByMarker(marker) {
		for(var j = 0; j < Chunk.chunks.length; j++) {
			if(Chunk.chunks[j].contains(marker)) {
				return Chunk.chunks[j]
			}
		}
		return null
	}

}

/**
 * Leaflet control class for the path finder
 */
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
		
		this._beforeButton.innerHTML = '&lt;<small>j</small>'
		this._beforeButton.setAttribute('disabled', true)
		L.DomEvent.on(this._beforeButton, 'click', () => { this.selectPath(-1) })

		this._currentButton.style.fontWeight =  'bold'
		this._currentButton.innerHTML = '0 / 0 <small>k</small>'
		L.DomEvent.on(this._currentButton, 'click', () => { this.selectPath(0) })

		this._afterButton.innerHTML = '&gt;<small>l</small>'
		this._afterButton.setAttribute('disabled', true)
		L.DomEvent.on(this._afterButton, 'click', () => { this.selectPath(1) })

		const self = this
		this.onKeyPress = (e) => {
			console.log(e.originalEvent)
			// press on J
			if(e.originalEvent.keyCode == 74) {
				self.selectPath(-1)
				
			// press on K
			} else if(e.originalEvent.keyCode == 75) {
				self.selectPath(0)
				
			// press on L
			} else if(e.originalEvent.keyCode == 76) {
				self.selectPath(1)
			}
		}
		MapBase.map.on('keydown', this.onKeyPress)

		return this._element;
	}

	onRemove() {
		delete this._element;
		MapBase.map.off('keydown', this.onKeyPress)
	}

	addPath(path) {
		this._paths.push(path)
		this.updateButtons()
	}

	updateButtons() {
		this._currentButton.innerHTML = this.currentPath + ' / ' + this._paths.length + ' <small>k</small>'

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
			PathFinder.highlightPath(this._paths[(this.currentPath-1)])
		}
	}

}

/**
 * Main path finder class; all properties are static
 */
class PathFinder {

	/**
	 * Initiates properties and starts loading geojson data
	 * @static
	 * @returns {PathFinder}
	 */
	static init() {
		PathFinder._PathFinder = null
		PathFinder._points = []
		PathFinder._currentChunk = null
		PathFinder._layerGroup = null
		PathFinder._layerControl = null
		PathFinder._currentPath = null
		PathFinder._running = false
		PathFinder._geoJson = null
		PathFinder._geoJsonFT = null
		PathFinder._nodeCache = {}
		PathFinder._cancel = false
		PathFinder._pathfinderFT = false

		loadAllGeoJson()

		return PathFinder
	}

	/**
	 * Start sorting markers into chunks
	 * @static
	 * @param {Array<Marker>} markers
	 */
	static generateChunks(markers) {
		console.log('[pathfinder] Sorting markers into chunks')
		Chunk.clearChunks()
	
		for(var i = 0; i < markers.length; i++) {
			Chunk.sortMarker(markers[i])
		}
	
		/*for(var j = 0; j < Chunk.chunks.length; j++) {
			L.rectangle(Chunk.chunks[j].getBounds(), {color: "#ff7800", weight: 1}).addTo(MapBase.map);
		}*/
	}
	
	/**
	 * Creating the GeoJSON Path Finder object from geojson data and extracting all nodes
	 * @static
	 * @param {Boolean} allowFastTravel Wether or not to include fast travel nodes
	 */
	static createPathFinder(allowFastTravel) {
		if(typeof(allowFastTravel) !== 'boolean') allowFastTravel = PathFinder._pathfinderFT
		if(PathFinder._PathFinder !== null && PathFinder._pathfinderFT == allowFastTravel) return

		console.log('[pathfinder] Creating geojson path finder ' + (allowFastTravel ? 'with' : 'without') + ' fasttravel')
		PathFinder._PathFinder = new GeoJSONPathFinder(allowFastTravel ? PathFinder._geoJsonFT : PathFinder._geoJson, {
			precision: 0.04,
			weightFn: function(a, b, props) {
				var dx = a[0] - b[0];
				var dy = a[1] - b[1];
				var r = Math.sqrt(dx * dx + dy * dy);
				if(typeof(props.type) === 'string' && props.type == 'fasttravel') r = r * 0.5
				return r
			}
		})
		PathFinder._pathfinderFT = allowFastTravel
		var _vertices = PathFinder._PathFinder._graph.vertices;
		PathFinder._points = featurecollection(
			Object
				.keys(_vertices)
				.filter(function(nodeName) {
					return Object.keys(_vertices[nodeName]).length
				})
				.map(function(nodeName) {
					var vertice = PathFinder._PathFinder._graph.sourceVertices[nodeName]
					return point(vertice)
				})
		);
	}
	
	/**
	 * Draw a path to the path finder layer group
	 * @static
	 * @param {Array<[Number, Number]>} path 
	 * @param {String} color 
	 * @returns {Polyline}
	 */
	static drawPath(path, color) {
		if(typeof(color) === 'undefined') color = '#0000ff'
	
		return L.polyline(path, {color: color, opacity: 0.6, weight: 5 }).addTo(PathFinder._layerGroup)
	}

	/**
	 * Draw a fancy path to the path finder layer group and removes the fancy path that was drawn before
	 * @static
	 * @param {Array<[Number, Number]>} path 
	 */
	static highlightPath(path) {
		if(PathFinder._currentPath !== null) {
			PathFinder._layerGroup.removeLayer(PathFinder._currentPath)
		}
		PathFinder._currentPath = L.layerGroup().addTo(PathFinder._layerGroup)
	
		var line = L.polyline(path, {color: '#000000', opacity: 0.5, weight: 9 }).addTo(PathFinder._currentPath)
		L.polyline(path, {color: '#ffffff', opacity: 1, weight: 7 }).addTo(PathFinder._currentPath)
		L.polyline(path, {color: '#00bb00', opacity: 1, weight: 3 }).addTo(PathFinder._currentPath)
		MapBase.map.fitBounds(line.getBounds(), { padding: [30, 30], maxZoom: 7 })
	}

	/**
	 * Draw an entire route/multiple paths
	 * @static
	 * @param {Array<Array<[Number, Number]>>} paths 
	 */
	static drawRoute(paths) {
		PathFinder._layerGroup.clearLayers()
		PathFinder._currentPath = null
		for(var i = 0; i < paths.length; i++) {
			PathFinder.drawPath(paths[i], '#ff0000')
		}
	}

	/**
	 * Turns an LatLng object into a GeoJSON point
	 * @static
	 * @param {LatLng} latlng 
	 * @returns {Object}
	 */
	static latLngToPoint(latlng) {
		var p = {"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[parseFloat(latlng.lng), parseFloat(latlng.lat)]}}
		if(typeof(latlng.text) === 'string') p.properties.text = latlng.text
		return p
	}
	
	/**
	 * Turns GeoJSON point into a LatLng object
	 * @static
	 * @param {Object} point 
	 * @returns {LatLng}
	 */
	static pointToLatLng(point) {
		return L.latLng(point.geometry.coordinates[1], point.geometry.coordinates[0])
	}
	
	
	static getNearestNode(point, searchArea) {
		var pointLatLng = point
		if(typeof(point.lat) == 'undefined') {
			pointLatLng = PathFinder.pointToLatLng(point)
		} else {
			pointLatLng.lat = parseFloat(pointLatLng.lat)
			pointLatLng.lng = parseFloat(pointLatLng.lng)
		}

		// Check if we already picked a point
		if(typeof(PathFinder._nodeCache[pointLatLng.lat + '|' + pointLatLng.lng]) !== 'undefined') {
			return PathFinder._nodeCache[pointLatLng.lat + '|' + pointLatLng.lng]
		}

		if(typeof(searchArea) === 'undefined')
			searchArea = 5
		var pointBounds = L.latLngBounds([
			[pointLatLng.lat-searchArea, pointLatLng.lng-searchArea],
			[pointLatLng.lat+searchArea, pointLatLng.lng+searchArea]
		])
	
		var filtered = PathFinder._points.features.filter((p) => {
			return pointBounds.contains(PathFinder.pointToLatLng(p));
		})
		var n = {distance: Number.MAX_SAFE_INTEGER, point: null}
		for(let i = 0; i < filtered.length; i++) {
			var distance = MapBase.map.distance(
				pointLatLng, 
				PathFinder.pointToLatLng(filtered[i])
			);
			if(distance < n.distance) {
				n.distance = distance
				n.point = filtered[i]
			}
		}
	
		PathFinder._nodeCache[pointLatLng.lat + '|' + pointLatLng.lng] = n.point
		return n.point
	}

	static findNearestChunk(marker, markerChunk) {
		var c = {weight: Number.MAX_SAFE_INTEGER, c: null}
	
		var markerNode = PathFinder.getNearestNode(PathFinder.latLngToPoint(marker))
		for(var i = 0; i < Chunk.chunks.length; i++) {
			if(Chunk.chunks[i].isDone) continue
			if(Chunk.chunks[i] == markerChunk) continue
	
			var chunkNode = PathFinder.getNearestNode(PathFinder.latLngToPoint(Chunk.chunks[i].getBounds().getCenter()), 15)
			var p = PathFinder._PathFinder.findPath(markerNode, chunkNode)
			if(p.weight < c.weight) {
				c.weight = p.weight
				c.c = Chunk.chunks[i]
			}
		}
		return c.c
	}

	static findMarkerByPoint(point, markers) {
		for(var i = 0; i < markers.length; i++) {
			if(point.properties.text == markers[i].text)
				return markers[i]
		}
		return null
	}

	static async findNearestTravelItem(start, markers) {
		if(PathFinder._PathFinder === null) PathFinder.createPathFinder()
	
		if(PathFinder._currentChunk === null) {
			PathFinder._currentChunk = Chunk.getChunkByMarker(start)
			if(PathFinder._currentChunk == null) {
				console.error('[pathfinder] Starting marker is not in chunk', start)
				return null
			}
		}
		var startPoint = PathFinder.getNearestNode(start)
	
		var shortest = {weight: Number.MAX_SAFE_INTEGER, marker: null, path: null}
		while(shortest.marker === null) {
			var availableInChunk = PathFinder._currentChunk.markers.filter((m) => { return markers.includes(m) })

			// if current chunk is empty or done, fetch a new one
			if(PathFinder._currentChunk.isDone || availableInChunk.length <= 0) {
				// mark this chunk as done to skip it when searching a new one
				PathFinder._currentChunk.isDone = true
				PathFinder._currentChunk = await (new Promise((res) => { window.requestAnimationFrame(() => {
					res(PathFinder.findNearestChunk(start, PathFinder._currentChunk))
				}) }))
				if(PathFinder._currentChunk == null) return null
				availableInChunk = PathFinder._currentChunk.markers.filter((m) => { return markers.includes(m) })
			}
	
			for(let i = 0; i < availableInChunk.length; i++) {
				// Request animation frame to unblock browser
				var path = await (new Promise((res) => { window.requestAnimationFrame(() => {
					// Find the nearest road node to all the markers
					var markerPoint = PathFinder.getNearestNode(availableInChunk[i])
					if(markerPoint !== null) {
						// Find path and resolve
						res(PathFinder._PathFinder.findPath(startPoint, markerPoint))
					} else {
						console.error('[pathfinder] No node found to ', availableInChunk[i])
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
				PathFinder._currentChunk.isDone = true
			}
		}
		
		return shortest
	}

	static pathfinderCancel() {
		return new Promise(async (res) => {
			if(PathFinder._running) {
				PathFinder._cancel = true
				while(PathFinder._running) {
					await new Promise((r) => { window.setTimeout(() => { r() }, 100) })
				}
				PathFinder._cancel = false
				res()
			} else {
				res()
			}
		})
	}

	static async pathfinderClear() {
		if(PathFinder._running) {
			await PathFinder.pathfinderCancel()
		}
		if(PathFinder._layerControl !== null) MapBase.map.removeControl(PathFinder._layerControl)
		if(PathFinder._layerGroup !== null) MapBase.map.removeLayer(PathFinder._layerGroup)
	}

	static async findHoles() {
		console.log('[pathfinder] Searching for holes')
		PathFinder.createPathFinder(false)
	
		if(PathFinder._layerControl !== null) MapBase.map.removeControl(PathFinder._layerControl)
		if(PathFinder._layerGroup !== null) MapBase.map.removeLayer(PathFinder._layerGroup)
	
		PathFinder._layerGroup = L.layerGroup([]).addTo(MapBase.map)
		PathFinder._layerControl = (new RouteControl()).addTo(MapBase.map)
		
		var sourcePoint = PathFinder._points.features[0]
		L.circle([sourcePoint.geometry.coordinates[1], sourcePoint.geometry.coordinates[0]], { color: '#ff0000', radius: 0.5 }).addTo(PathFinder._layerGroup)
		for(var i = 1; i < PathFinder._points.features.length; i++) {
			var path = await new Promise(res => {
				window.requestAnimationFrame(function(){
					res(PathFinder._PathFinder.findPath(sourcePoint, PathFinder._points.features[i]))
				})
			})
			if(path == null) {
				L.circle([PathFinder._points.features[i].geometry.coordinates[1], PathFinder._points.features[i].geometry.coordinates[0]], { radius: 0.04 }).addTo(PathFinder._layerGroup)
				console.log('[pathfinder] No path found to ', sourcePoint, PathFinder._points.features[i])
			}
		}
		console.log('[pathfinder] Done finding holes')
	}

	static async pathfinderStart(allowFastTravel) {
		if(PathFinder._geoJson === null) {
			console.error('[pathfinder] geojson not fully loaded yet')
			return
		}
		if(PathFinder._running) {
			await PathFinder.pathfinderCancel()
		}

		console.log('[pathfinder] Starting route generation')

		PathFinder._running = true
		PathFinder._currentChunk = null
		PathFinder._nodeCache = {}
	
		var startTime = new Date().getTime()
	
		if(typeof(allowFastTravel) !== 'boolean') allowFastTravel = false
		PathFinder.createPathFinder(allowFastTravel)
	
		if(PathFinder._layerControl !== null) MapBase.map.removeControl(PathFinder._layerControl)
		if(PathFinder._layerGroup !== null) MapBase.map.removeLayer(PathFinder._layerGroup)
	
		PathFinder._layerGroup = L.layerGroup([]).addTo(MapBase.map)
		PathFinder._layerControl = (new RouteControl()).addTo(MapBase.map)
	
		var markers = MapBase.markers.filter((marker) => { return (marker.isVisible && (!Routes.ignoreCollected || !marker.isCollected)); });
		PathFinder.generateChunks(markers)
	
		var current = Routes.nearestNeighborTo(Routes.startMarker(), markers, [], -1)
		markers = markers.filter((m, i) => { return (m.text != current.marker.text || m.lat != current.marker.lat); })
	
	
		var last = current.marker
		var waypoints = [L.latLng(last.lat, last.lng)]
		var paths = []
	
		var markersNum = markers.length

		try {
			for (var i = 0; i < markersNum; i++) {
				var current = await PathFinder.findNearestTravelItem(last, markers)
				if(current == null || current.marker == null) break
				markers = markers.filter((m, i) => { return (m.text != current.marker.text || m.lat != current.marker.lat); })
				last = current.marker
		
				waypoints.push(L.latLng(last.lat, last.lng))
				PathFinder._layerControl.addPath(current.path)
				paths.push(current.path)
				PathFinder.drawRoute(paths)

				if(PathFinder._cancel) break
			}
		} catch(e) {
			// catching all errors, just in case
			console.error('[pathfinder]', e)
		}
	
		PathFinder._running = false
	
		var endTime = new Date().getTime();
	
		if(PathFinder._cancel) console.log(`[pathfinder] Pathfinding was canceled`)
		else PathFinder._layerControl.selectPath(1, true)

		console.log(`[pathfinder] ${(endTime - startTime) / 1000} seconds for ${markersNum} items`)
	}

}

// Make Pathfinder publicly accessible
window.PathFinder = PathFinder.init()

// Append stylesheet to head
$('head').append($('<link />').attr({'rel': 'stylesheet', 'href': 'assets/css/pathfinder.css'}))

// Overwrite route generator functions
Routes.generatePath = function() { PathFinder.pathfinderStart() }
Routes.orgClearPath = Routes.clearPath
Routes.clearPath = function() {  PathFinder.pathfinderClear(); Routes.orgClearPath() }