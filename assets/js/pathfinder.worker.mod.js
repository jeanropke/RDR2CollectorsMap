var GeoJSONPathFinder = require('geojson-path-finder')

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
const L = WorkerL;

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
		].map(part => this._jsonFetch(`../../data/geojson/${part}.json`))

		return Promise.all(featureCollectionPromises).then(fcs => ({
				"type": "FeatureCollection",
				"features": [].concat(...fcs.map(fc => fc.features)),
			})
		)
	}

    static init() {
        this.geojsonPromise = this._loadAllGeoJson();
    }

	/**
	 * Creating the GeoJSON Path Finder object from geojson data and extracting all nodes
	 * @static
	 * @param {Number} fastTravelWeight Multiplier for fast travel road weights
	 * @param {Number} railroadWeight Multiplier for rail road weights
	 */
	static createPathFinder(geojson, fastTravelWeight, railroadWeight) {
		PathFinder._PathFinder = new GeoJSONPathFinder(geojson, {
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

		PathFinder._points = Object.entries(PathFinder._PathFinder._graph.vertices)
			.filter(([nodeName, node]) => Object.keys(node).length)
			.map(([nodeName, node]) => {
				const coordinates = PathFinder._PathFinder._graph.sourceVertices[nodeName];
				return {lng: coordinates[0], lat: coordinates[1]};
			})

		PathFinder._nodeCache = {}
	}

	/**
	 * Searches for nodes nearby on the roadmap
	 * @static
	 * @param {LatLng|Marker} target Can be LatLng, Marker
	 * @param {Number} [searchDistance=5] Optional “radius” around the point to search for nodes.
	 * @returns {Object} GeoJSON point feature or null
	 */
	static getNearestNode(target, searchDistance=5) {
		const targetLatLng = {lat: +target.lat, lng: +target.lng};
		const cacheKey = targetLatLng.lat + '|' + targetLatLng.lng;

		if (PathFinder._nodeCache[cacheKey]) {
			return PathFinder._nodeCache[cacheKey];
		}

		const searchArea = L.latLngBounds([
			[targetLatLng.lat-searchDistance, targetLatLng.lng-searchDistance],
			[targetLatLng.lat+searchDistance, targetLatLng.lng+searchDistance]
		])

		let distance = Infinity;
		let point = null;
		PathFinder._points
			.filter(p => searchArea.contains(p))
			.forEach(p => {
				const newDistance = WorkerL.distance(targetLatLng, p);
				if (newDistance < distance) {
					distance = newDistance;
					point = p;
				}
			})

		const pointFeature = point ? {type: 'Feature', geometry: {type: 'Point', coordinates: [point.lng, point.lat]}} : null;
		PathFinder._nodeCache[cacheKey] = pointFeature;
		return pointFeature;
	}

	/**
	 * Find the closest Chunk to the marker by road length
	 * @static
	 * @param {Marker} marker 
	 * @param {Chunk} markerChunk Chunk the marker is in. Just to rule that one out.
	 * @returns {Chunk|null}
	 */
	static findNearestChunk(marker, markerChunk) {
		const c = {weight: Infinity, c: null};

		const markerNode = PathFinder.getNearestNode(marker);
		for(var i = 0; i < Chunk.chunks.length; i++) {
			if(Chunk.chunks[i].isDone) continue
			if(Chunk.chunks[i] == markerChunk) continue

			const chunkNode = PathFinder.getNearestNode(Chunk.chunks[i].getBounds().getCenter(),
				15);
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
	 * @returns {Object} Containes the properties weight, marker and path. On error, `.marker`
	 * will be `null`.
	 */
	static findNearestTravelItem(start, markers) {
		const shortest = {weight: Number.MAX_SAFE_INTEGER, marker: null, path: null};
		if(PathFinder._currentChunk == null) {
			PathFinder._currentChunk = Chunk.chunks.find(chunk => chunk.markers.includes(start));
			if(PathFinder._currentChunk == null) {
				console.error('[pathfinder] Could not find starting marker in any chunk.', start);
				return shortest;
			}
		}
		const startPoint = PathFinder.getNearestNode(start);

		while(shortest.marker === null) {
			var availableInChunk = PathFinder._currentChunk.markers.filter(m =>
				markers.includes(m));

			// if current chunk is empty or done, fetch a new one
			if(PathFinder._currentChunk.isDone || availableInChunk.length <= 0) {
				PathFinder._currentChunk.isDone = true

				PathFinder._currentChunk = PathFinder.findNearestChunk(start,
					PathFinder._currentChunk);

				if(PathFinder._currentChunk == null) return shortest;
				availableInChunk = PathFinder._currentChunk.markers.filter(m =>
					markers.includes(m));
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
						shortest.marker = marker;
						path.path.unshift([start.lng, start.lat])
						path.path.push([marker.lng, marker.lat]);
						shortest.path = path.path.map(c => [c[1], c[0]])
					}
				}
			});

			if (shortest.marker === null) {
				PathFinder._currentChunk.isDone = true
			}
		}

		return shortest
	}

	static async routegenStartWorker(startingMarker, markers, fastTravelWeight, railroadWeight) {
		PathFinder.createPathFinder(await PathFinder.geojsonPromise,
			fastTravelWeight, railroadWeight);

		Chunk.generateChunks(markers);

		let current = {marker: startingMarker};
		markers = markers.filter(m => m !== current.marker);
		const markersNum = markers.length;
		PathFinder._currentChunk = null;  // used in `.findNearestTravelItem()`
		for (let i = 0; i < markersNum; i++) {
			current = PathFinder.findNearestTravelItem(current.marker, markers);
			if (current.marker == null) break;

			markers = markers.filter(m => m !== current.marker);
			self.postMessage({res: 'route-progress', newPath: current.path});
		}
    }
}

PathFinder.init();
self.addEventListener('message', function(e) {
    const data = e.data;
    switch(data.cmd) {
        case 'start':
            PathFinder.routegenStartWorker(data.startingMarker, data.markers,
                data.fastTravelWeight, data.railroadWeight, true)
                .then(result => self.postMessage({ res: 'route-done', result }))
            break;
    }
})
