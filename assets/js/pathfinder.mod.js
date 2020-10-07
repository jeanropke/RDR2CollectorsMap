var GeoJSONPathFinder = require('geojson-path-finder')
var point = require('turf-point')
var featurecollection = require('turf-featurecollection')

class WorkerLatLng {
	constructor(lat, lng) {
		this.lat = parseFloat(lat)
		this.lng = parseFloat(lng)
	}
}

class WorkerLatLngBounds {

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
			return L.latLng(
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


class WorkerL {

	static latLngBounds(pointA, pointB) {
		if(Array.isArray(pointA)) {
			if(Array.isArray(pointA[0])) {
				pointB = pointA[0]
				pointA = pointA[1]
			}
			pointA = new WorkerLatLng(pointA[0], pointA[1])
		}
		if(Array.isArray(pointB)) {
			pointB = new WorkerLatLng(pointB[0], pointB[1])
		}
		return new WorkerLatLngBounds(pointA, pointB)
	}

	static latLng(lat, lng) {
		if(Array.isArray(lat)) {
			lng = lat[1]
			lat = lat[0]
		}
		return new WorkerLatLng(lat, lng)
	}

	static distance(pointA, pointB) {
		var dx = pointB.lng - pointA.lng,
			dy = pointB.lat - pointA.lat;

		return Math.sqrt(dx * dx + dy * dy);
	}

}
const L = (typeof(window) === 'undefined' ? WorkerL : window.L)

/**
 * Helping class to hold markers, that are nearby
 */
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

	/**
	 * Checks if the marker can be added to the chunk and returns true if it was added
	 * @param {Marker} marker 
	 * @returns {Boolean}
	 */
	_addMarker(marker) {
		marker.lat = parseFloat(marker.lat)
		marker.lng = parseFloat(marker.lng)
		if(this.bounds == null || WorkerL.distance(marker, this.bounds.getCenter()) < 10) {
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
		return this.markers.includes(marker);
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
	 * Sorts markers into new chunks.
	 * @static
	 * @param {Array<Marker>} markers
	 */
	static generateChunks(markers) {
		Chunk.chunks = [];
		markers.forEach(marker => {
			var added = false;
			for(var j = 0; j < Chunk.chunks.length; j++) {
				if(Chunk.chunks[j]._addMarker(marker)) {
					added = true;
				}
			}
			if(!added) {
				const c = new Chunk();
				Chunk.chunks.push(c);
				c._addMarker(marker);
			}
		});
	}
}

if(typeof(window) !== 'undefined') {
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
			L.DomEvent.on(this._beforeButton, 'mouseup', () => { this.selectPath(-1) })

			this._currentButton.style.fontWeight =  'bold'
			this._currentButton.innerHTML = '0 / 0 <small>k</small>'
			L.DomEvent.on(this._currentButton, 'mouseup', () => { this.selectPath(0) })

			this._afterButton.innerHTML = '&gt;<small>l</small>'
			this._afterButton.setAttribute('disabled', true)
			L.DomEvent.on(this._afterButton, 'mouseup', () => { this.selectPath(1) })

			const self = this
			this.onKeyPress = (e) => {
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

				var hlpath = this._paths[(this.currentPath-1)]
				var lastpoint = hlpath[hlpath.length-1]
				PathFinder.highlightPath(hlpath)

				this._lastMarker = MapBase.markers.find(m =>
					m.lng == lastpoint[1] && m.lat == lastpoint[0]);
				// Wait for the camera to move
				setTimeout(() => this._lastMarker.lMarker.openPopup(), 300);
			}
		}

	}

	window.RouteControl = RouteControl
}

/**
 * Main path finder class; all properties are static
 */
class PathFinder {
	static _jsonFetch(...args) {
		return fetch(...args).then(response => {
				if (!response.ok) {
					throw new Error(`${response.status} ${response.statusText} on ${response.url}`);
				} else {
					return response.json();
				}
			}
		);
	}

	static _loadAllGeoJson() {
		const featureCollectionPromises = [
			'ambarino', 'lemoyne', 'new-austin', 'new-hanover', 'west-elizabeth',
			'fasttravel', 'railroads',
		].map(part => this._jsonFetch(`/data/geojson/${part}.json`))

		return Promise.all(featureCollectionPromises).then(fcs => ({
				"type": "FeatureCollection",
				"features": [].concat(...fcs.map(fc => fc.features)),
			})
		)
	}

	/**
	 * Initiates properties and starts loading geojson data
	 * @static
	 * @returns {PathFinder}
	 */
	static init() {
		PathFinder._PathFinder = null
		PathFinder._points = []
		PathFinder._layerGroup = null
		PathFinder._layerControl = null
		PathFinder._currentPath = null
		PathFinder._running = false
		PathFinder._geoJson = null
		PathFinder._nodeCache = {}
		PathFinder._cancel = false
		PathFinder._pathfinderFTWeight = 0.9
		PathFinder._pathfinderRRWeight = 1.1
		PathFinder._worker = null
		PathFinder._drawing = false
		PathFinder._redrawWhenFinished = false

		return PathFinder
	}
	static workerInit() {
		PathFinder.geojsonPromise = this._loadAllGeoJson();
	}
	
	/**
	 * Creating the GeoJSON Path Finder object from geojson data and extracting all nodes
	 * @static
	 * @param {Number} fastTravelWeight Multiplier for fast travel road weights
	 * @param {Number} railroadWeight Multiplier for rail road weights
	 */
	static createPathFinder(fastTravelWeight, railroadWeight) {
		if(typeof(fastTravelWeight) !== 'number') fastTravelWeight = PathFinder._pathfinderFTWeight
		if(typeof(railroadWeight) !== 'number') railroadWeight = PathFinder._pathfinderRRWeight

		if(
			PathFinder._PathFinder !== null &&
			PathFinder._pathfinderFTWeight == fastTravelWeight && PathFinder._pathfinderRRWeight == railroadWeight
		) return

		PathFinder._PathFinder = new GeoJSONPathFinder(PathFinder._geoJson, {
			precision: 0.04,
			weightFn: function(a, b, props) {
				var dx = a[0] - b[0];
				var dy = a[1] - b[1];
				var r = Math.sqrt(dx * dx + dy * dy);
				if(props.type === 'railroad') r *= railroadWeight;
				if(props.type === 'fasttravel') r *= fastTravelWeight;
				return r
			}
		})
		PathFinder._pathfinderFTWeight = fastTravelWeight
		PathFinder._pathfinderRRWeight = railroadWeight
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
	 * Draw a path to the path finder layer group
	 * @static
	 * @param {Array<[Number, Number]>} path 
	 * @param {String} color 
	 * @param {Number} weight
	 * @param {Number} opacity Between 0 and 1
	 * @returns {Polyline}
	 */
	static drawPath(path, color, weight, opacity, layer) {
		if(typeof(MapBase) === 'undefined') return
		if(typeof(color) === 'undefined') color = '#0000ff'

		if(typeof(weight) !== 'number') weight = 5
		if(typeof(opacity) !== 'number') opacity = 1
		if(typeof(layer) === 'undefined') layer = PathFinder._layerGroup

		let pathGroup = L.layerGroup().addTo(layer)
		let last = path[0]
		let pathBuffer = [last]
		for(let i = 1; i < path.length; i++) {
			if(MapBase.map.distance(last, path[i]) > 10) {
				if(pathBuffer.length > 1) {
					L.polyline(pathBuffer, {color: color, opacity: opacity, weight: weight }).addTo(pathGroup)
					pathBuffer = []
				}
				L.polyline([last, path[i]], {color: color, opacity: opacity, weight: weight, dashArray: '10 10' }).addTo(pathGroup)
			}
			pathBuffer.push(path[i])
			last = path[i]
		}
		if(pathBuffer.length > 1) {
			L.polyline(pathBuffer, {color: color, opacity: opacity, weight: weight }).addTo(pathGroup)
		}
	
		return L.polyline(path, { stroke: false })
	}

	/**
	 * Draw a fancy path to the path finder layer group and removes the fancy path that was drawn before
	 * @static
	 * @param {Array<[Number, Number]>} path 
	 */
	static highlightPath(path) {
		if(typeof(window) === 'undefined') return
		window.requestAnimationFrame(function(){
			if(PathFinder._currentPath !== null) {
				MapBase.map.removeLayer(PathFinder._currentPath)
			}
			PathFinder._currentPath = L.layerGroup().addTo(MapBase.map)
		

			var line = PathFinder.drawPath(path, '#000000', 9, 0.5, PathFinder._currentPath)
			PathFinder.drawPath(path, '#ffffff', 7, 1, PathFinder._currentPath)
			PathFinder.drawPath(path, '#00bb00', 3, 1, PathFinder._currentPath)
			MapBase.map.fitBounds(line.getBounds(), { padding: [100, 100], maxZoom: 7 })
		})
	}

	/**
	 * Draw an entire route/multiple paths
	 * @static
	 * @param {Array<Array<[Number, Number]>>} paths 
	 */
	static drawRoute(paths) {
		if(typeof(MapBase) === 'undefined') return
		if(PathFinder._drawing) {
			PathFinder._redrawWhenFinished = paths
		} else {
			PathFinder._drawing = true
			window.requestAnimationFrame(function(){
				PathFinder._layerGroup.clearLayers()
				PathFinder._currentPath = null
				for(var i = 0; i < paths.length; i++) {
					PathFinder.drawPath(paths[i], '#bb0000')
				}
				PathFinder._drawing = false
				if(PathFinder._redrawWhenFinished !== false) {
					PathFinder.drawRoute(PathFinder._redrawWhenFinished)
					PathFinder._redrawWhenFinished = false
				}
			})
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
			var distance = WorkerL.distance(
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
	 * Finds the nearest marker in markers from start. This function uses the created chunks, so
	 * make sure to re-create the chunks when you start the route generator
	 * @static
	 * @param {Marker} start 
	 * @param {Array<Marker>} markers This array of markers must not include start or any already
	 * visited markers
	 * @returns {Promise<Object>} Resolving Object containes the properties weight, marker and path
	 */
	static findNearestTravelItem(start, markers) {
		const shortest = {weight: Number.MAX_SAFE_INTEGER, marker: null, path: null};
		if(PathFinder._currentChunk == null) {
			PathFinder._currentChunk = Chunk.chunks.find(chunk => chunk.markers.includes(start));
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
				PathFinder._currentChunk.isDone = true

				PathFinder._currentChunk = PathFinder.findNearestChunk(start,
					PathFinder._currentChunk);

				if(PathFinder._currentChunk == null) return null
				availableInChunk = PathFinder._currentChunk.markers.filter((m) => { return markers.includes(m) })
			}

			availableInChunk.forEach(marker => {
				let path;
				// Find the nearest road node to all the markers
				const markerPoint = PathFinder.getNearestNode(marker);
				if (markerPoint !== null) {
					path = PathFinder._PathFinder.findPath(startPoint, markerPoint);
				} else {
					console.error('[pathfinder] No node found to ', marker);
					path = null;
				}
				if (path !== null) {
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

	static wasRemovedFromMap(marker) {
		if(PathFinder._layerControl && PathFinder._layerControl._lastMarker === marker) {
			PathFinder._layerControl.selectPath(1)
		}
	}

	/**
	 * Cancels the route generation and resolves the returning Promise when route generation has stopped.
	 * @static
	 * @returns {Promise}
	 */
	static async routegenCancel() {
		if(PathFinder._running) {
			if(PathFinder._worker === null) {
				PathFinder._cancel = true
				while(PathFinder._running) {
					await new Promise((r) => { window.setTimeout(() => { r() }, 100) })
				}
				PathFinder._cancel = false
			} else {
				PathFinder._worker.terminate()
				PathFinder._worker = null
				PathFinder._running = false
			}
		}
	}

	/**
	 * Removes controler and layer group from map and canceles route generation when running
	 * @static
	 * @returns {Promise}
	 */
	static async routegenClearAndCancel() {
		if(PathFinder._running) {
			await PathFinder.routegenCancel()
		}
		if(PathFinder._layerControl !== null) MapBase.map.removeControl(PathFinder._layerControl)
		if(PathFinder._layerGroup !== null) MapBase.map.removeLayer(PathFinder._layerGroup)
		if(PathFinder._currentPath !== null) MapBase.map.removeLayer(PathFinder._currentPath)
	}

	/**
	 * Finds unreachable points in the roadmap and shows you on the map. It takes a random node and tries to find a way
	 * to every other node in the map. If no path could be found a blue circle will be drawn around the node.
	 * The starting node will be highlighted by a red circle.
	 * @static
	 * @returns {Promise}
	 */
	static async findHoles() {
		PathFinder.createPathFinder(false)

		if(PathFinder._layerControl !== null) MapBase.map.removeControl(PathFinder._layerControl)
		if(PathFinder._layerGroup !== null) MapBase.map.removeLayer(PathFinder._layerGroup)

		PathFinder._layerGroup = L.layerGroup([]).addTo(MapBase.map)
		PathFinder._layerControl = (new RouteControl()).addTo(MapBase.map)

		var sourcePoint = PathFinder._points.features[Math.floor(Math.random() * PathFinder._points.features.length)]
		L.circle([sourcePoint.geometry.coordinates[1], sourcePoint.geometry.coordinates[0]], { color: '#ff0000', radius: 0.5 }).addTo(PathFinder._layerGroup)
		PathFinder._points.features.forEach(f => {
			if (PathFinder._PathFinder.findPath(sourcePoint, f) == null) {
				L.circle([f.geometry.coordinates[1], f.geometry.coordinates[0]], { radius: 0.04 })
					.addTo(PathFinder._layerGroup)
			}
		})
	}

	/**
	 * Adds controls to the map and starts route generation. It will also cancel ongoing route generation.
	 * @static
	 * @param {Marker} startingMarker Where to start
	 * @param {Array<Marker>} markers Contains markers a route should be generated for. Must contain startingMarker.
	 * @param {Number} fastTravelWeight Multiplier for fast travel road weights
	 * @param {Number} railroadWeight Multiplier for rail road weights
	 * @param {Boolean} [forceNoWorker=false] Forces to skip the worker (mainly used inside the worker)
	 * @returns {Promise<Boolean>} false if geojson isn't fully loaded or route generation was canceled
	 */
	static routegenStart(startingMarker, markers, fastTravelWeight, railroadWeight) {
		PathFinder.routegenClearAndCancel();
		PathFinder._layerGroup = L.layerGroup([]).addTo(MapBase.map);
		PathFinder._layerControl = (new RouteControl()).addTo(MapBase.map);

		return new Promise((res) => {
			var paths = [];
			PathFinder._worker = new Worker('assets/js/pathfinder.js')
			PathFinder._worker.addEventListener('message', function(e) {
				var data = e.data
				switch(data.res) {
					case 'route-progress':
						PathFinder._layerControl.addPath(data.newPath)
						paths.push(data.newPath)
						PathFinder.drawRoute(paths)
						break
					case 'route-done':
						window.setTimeout(function(){
							PathFinder._layerControl.selectPath(1, true)
						}, 100)
						res(data.result)
						break
				}
			})
			PathFinder._worker.postMessage({ cmd: 'start', startingMarker, markers,
				fastTravelWeight, railroadWeight });
		})
	}

	static async routegenStartWorker(startingMarker, markers, fastTravelWeight, railroadWeight) {
		PathFinder.createPathFinder(await PathFinder.geojsonPromise,
			fastTravelWeight, railroadWeight);

		Chunk.generateChunks(markers);

		markers = markers.filter(m => m !== startingMarker);
		let current = {marker: startingMarker};

		var last = current.marker
		var paths = []

		var markersNum = markers.length
		try {
			for (var i = 0; i < markersNum; i++) {
				current = await PathFinder.findNearestTravelItem(last, markers);
				if(current == null || current.marker == null) break

				markers = markers.filter(m => m !== current.marker);
				last = current.marker
		
				if(typeof(window) !== 'undefined') {
					// add route to controller and draw the current route
					PathFinder._layerControl.addPath(current.path)
					paths.push(current.path)
					PathFinder.drawRoute(paths)
				} else {
					self.postMessage({ res: 'route-progress', newPath: current.path, val: i, max: markersNum })
				}

				if(PathFinder._cancel) break
			}
		} catch(e) {
			// catching all errors, just in case
			console.error('[pathfinder]', e)
		}
	
		var canceled = PathFinder._cancel
		if (!canceled && typeof(window) !== 'undefined') window.setTimeout(function(){ PathFinder._layerControl.selectPath(1, true) }, 100)

		PathFinder._running = false

		return !canceled
	}

}

if(typeof(window) === 'undefined') {
	PathFinder.workerInit();
	self.addEventListener('message', function(e){
		const data = e.data;
		switch(data.cmd) {
			case 'start':
				PathFinder.routegenStartWorker(data.startingMarker, data.markers,
					data.fastTravelWeight, data.railroadWeight, true)
					.then(result => self.postMessage({ res: 'route-done', result }))
				break;
		}
	})
} else {
	PathFinder.init();
	window.PathFinder = PathFinder;
}