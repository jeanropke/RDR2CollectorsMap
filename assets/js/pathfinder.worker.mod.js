var GeoJSONPathFinder = require('geojson-path-finder')
var point = require('turf-point')
var featurecollection = require('turf-featurecollection')


class LatLng {
	
	constructor(lat, lng) {
		this.lat = parseFloat(lat)
		this.lng = parseFloat(lng)
	}

}

class LatLngBounds {

	constructor(pointA, pointB) {
		pointA.lat = parseFloat(pointA.lat)
		pointB.lat = parseFloat(pointB.lat)
		pointA.lng = parseFloat(pointA.lng)
		pointB.lng = parseFloat(pointB.lng)

		this.pointA = pointA
		this.pointB = pointB

		this.southEast = L.latLng(
			(pointA.lat < pointB.lat ? pointA.lat : pointB.lat),
			(pointA.lng < pointB.lng ? pointA.lng : pointB.lng)
		)
		this.northWest = L.latLng(
			(pointA.lat > pointB.lat ? pointA.lat : pointB.lat),
			(pointA.lng > pointB.lng ? pointA.lng : pointB.lng)
		)
	}

	getCenter() {
		return new LatLng(
			this.southEast.lat + ((this.northWest.lat - this.southEast.lat) / 2),
			this.southEast.lng + ((this.northWest.lng - this.southEast.lng) / 2)
		)
	}

	contains(latLng) {
		return (
			latLng.lat >= this.southEast.lat && latLng.lat <= this.northWest.lat &&
			latLng.lng >= this.southEast.lng && latLng.lng <= this.northWest.lng
		)
	}

}

class L {

	static latLngBounds(pointA, pointB) {
		if(Array.isArray(pointA)) {
			if(Array.isArray(pointA[0])) {
				pointB = pointA[0]
				pointA = pointA[1]
			}
			pointA = new LatLng(pointA[0], pointA[1])
		}
		if(Array.isArray(pointB)) {
			pointB = new LatLng(pointB[0], pointB[1])
		}
		return new LatLngBounds(pointA, pointB)
	}

	static latLng(lat, lng) {
		if(Array.isArray(lat)) {
			lng = lat[1]
			lat = lat[0]
		}
		return new LatLng(lat, lng)
	}

	static distance(pointA, pointB) {
		var dx = pointB.lng - pointA.lng,
			dy = pointB.lat - pointA.lat;

		return Math.sqrt(dx * dx + dy * dy);
	}

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
		var d = L.distance(marker, this.bounds.getCenter())
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
			if(this.markers[i].text == marker.text && parseFloat(this.markers[i].lat) == parseFloat(marker.lat))
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

		return PathFinder
	}

	/**
	 * Start sorting markers into chunks
	 * @static
	 * @param {Array<Marker>} markers
	 */
	static generateChunks(markers) {
		console.log('[pathfinder.worker] Sorting markers into chunks')
		Chunk.clearChunks()
	
		for(var i = 0; i < markers.length; i++) {
			Chunk.sortMarker(markers[i])
		}
	}
	
	/**
	 * Creating the GeoJSON Path Finder object from geojson data and extracting all nodes
	 * @static
	 * @param {Boolean} allowFastTravel Wether or not to include fast travel nodes
	 */
	static createPathFinder(allowFastTravel) {
		if(typeof(allowFastTravel) !== 'boolean') allowFastTravel = PathFinder._pathfinderFT
		if(PathFinder._PathFinder !== null && PathFinder._pathfinderFT == allowFastTravel) return

		console.log('[pathfinder.worker] Creating geojson path finder ' + (allowFastTravel ? 'with' : 'without') + ' fasttravel')
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

		PathFinder._nodeCache = {}
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
	
	/**
	 * Searches for nodes nearby on the roadmap
	 * @static
	 * @param {LatLng|Marker|Object} point Can be LatLng, Marker or GeoJSON point
	 * @param {Number} [searchArea=5] Optional radius around the point to search for nodes, defaults to 5
	 * @returns {Object} GeoJSON point
	 */
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
			var distance = L.distance(
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

	/**
	 * Find the closest Chunk to the marker by road length
	 * @static
	 * @param {Marker} marker 
	 * @param {Chunk} markerChunk Chunk the marker is in. Just to rule that one out.
	 * @returns {Chunk|null}
	 */
	static findNearestChunk(marker, markerChunk) {
		var c = {weight: Number.MAX_SAFE_INTEGER, c: null}
	
		var markerNode = PathFinder.getNearestNode(PathFinder.latLngToPoint(marker))
		for(var i = 0; i < Chunk.chunks.length; i++) {
			if(Chunk.chunks[i].isDone) continue
			if(Chunk.chunks[i] == markerChunk) continue
	
			var chunkNode = PathFinder.getNearestNode(PathFinder.latLngToPoint(Chunk.chunks[i].getBounds().getCenter()), 15)
			if(chunkNode !== null) {
				var p = PathFinder._PathFinder.findPath(markerNode, chunkNode)
				if(p.weight < c.weight) {
					c.weight = p.weight
					c.c = Chunk.chunks[i]
				}
			}
		}
		return c.c
	}

	/**
	 * Finds the nearest marker in markers from start. This function uses the created chunks, so make sure to re-create
	 * the chunks when you start the route generator
	 * @static
	 * @param {Marker} start 
	 * @param {Array<Marker>} markers This array of markers must not include start or any already visited markers
	 * @returns {Promise<Object>} Resolving Object containes the properties weight, marker and path
	 */
	static async findNearestTravelItem(start, markers) {
		if(PathFinder._PathFinder === null) PathFinder.createPathFinder()
	
		if(PathFinder._currentChunk === null) {
			PathFinder._currentChunk = Chunk.getChunkByMarker(start)
			if(PathFinder._currentChunk == null) {
				console.error('[pathfinder.worker] Starting marker is not in chunk', start)
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
				PathFinder._currentChunk = PathFinder.findNearestChunk(start, PathFinder._currentChunk)
				if(PathFinder._currentChunk == null) return null
				availableInChunk = PathFinder._currentChunk.markers.filter((m) => { return markers.includes(m) })
			}
	
			for(let i = 0; i < availableInChunk.length; i++) {
				var path = null
				// Find the nearest road node to all the markers
				var markerPoint = PathFinder.getNearestNode(availableInChunk[i])
				if(markerPoint !== null) {
					path = PathFinder._PathFinder.findPath(startPoint, markerPoint)
				} else {
					console.error('[pathfinder.worker] No node found to ', availableInChunk[i])
				}
				
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

	/**
	 * Cancels the route generation and resolves the returning Promise when route generation has stopped.
	 * @static
	 * @returns {Promise}
	 */
	static routegenCancel() {
		return new Promise(async (res) => {
			if(PathFinder._running) {
				PathFinder._cancel = true
				while(PathFinder._running) {
					await new Promise((r) => { setTimeout(() => { r() }, 100) })
				}
				PathFinder._cancel = false
				res()
			} else {
				res()
			}
		})
	}

	/**
	 * Removes controler and layer group from map and canceles route generation when running
	 * @static
	 * @returns {Promise}
	 */
	static async routegenClear() {
		if(PathFinder._running) {
			await PathFinder.routegenCancel()
		}
	}

	/**
	 * Adds controls to the map and starts route generation. It will also cancel ongoing route generation.
	 * @static
	 * @param {Marker} startingMarker Where to start
	 * @param {Array<Marker>} markers Contains markers a route should be generated for. Must contain startingMarker.
	 * @param {Boolean} [allowFastTravel=false]
	 * @returns {Promise<Boolean>} false if geojson isn't fully loaded or route generation was canceled
	 */
	static async routegenStart(startingMarker, markers, allowFastTravel) {
		if(PathFinder._geoJson === null) {
			console.error('[pathfinder.worker] geojson not fully loaded yet')
			return false
		}

		// Cancel current running route generation
		if(PathFinder._running) {
			await PathFinder.routegenCancel()
		}

		console.log('[pathfinder.worker] Starting route generation')

		PathFinder._running = true
		PathFinder._currentChunk = null

		var startTime = new Date().getTime()

		// Create GeoJSON path finder object (function will check if already created)
		if(typeof(allowFastTravel) !== 'boolean') allowFastTravel = false
		PathFinder.createPathFinder(allowFastTravel)

		// Generate Chunks
		PathFinder.generateChunks(markers)

		// Removing startingMarker from markers
		var current = {marker: startingMarker}
		markers = markers.filter((m) => { return (m.text != current.marker.text || m.lat != current.marker.lat); })

		var last = current.marker

		var markersNum = markers.length
		try {
			for (var i = 0; i < markersNum; i++) {
				// Find next marker
				var current = await PathFinder.findNearestTravelItem(last, markers)
				// if no marker was found, we're propably done
				if(current == null || current.marker == null) break

				// remove found marker from markers array
				markers = markers.filter((m) => { return (m.text != current.marker.text || m.lat != current.marker.lat); })
				last = current.marker
				
				self.postMessage({ res: 'route-progress', newPath: current.path, val: i, max: markersNum })

				if(PathFinder._cancel) break
			}
		} catch(e) {
			// catching all errors, just in case
			console.error('[pathfinder.worker]', e)
		}
	
		var endTime = new Date().getTime();

		var canceled = PathFinder._cancel
		if(canceled) console.log(`[pathfinder.worker] Pathfinding was canceled`)

		console.log(`[pathfinder.worker] ${(endTime - startTime) / 1000} seconds for ${markersNum} items`)
		PathFinder._running = false

		return !canceled
	}

}

PathFinder.init()
self.addEventListener('message', function(e){
	var data = e.data
	switch(data.cmd) {
		case 'data':
			PathFinder._geoJson = data.geojson
			PathFinder._geoJsonFT = data.geojsonFT
			break
		case 'start':
			PathFinder.routegenStart(data.startingMarker, data.markers, data.allowFastTravel).then((result) => {
				self.postMessage({ res: 'route-done', result: result })
			})
			break
	}
})