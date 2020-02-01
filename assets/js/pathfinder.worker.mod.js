var GeoJSONPathFinder = require('geojson-path-finder')
var point = require('turf-point')
var featurecollection = require('turf-featurecollection')

const PathFinder = require('./pathfinder.mod')

PathFinder.init()
self.addEventListener('message', function(e){
	var data = e.data
	switch(data.cmd) {
		case 'data':
			PathFinder._geoJson = data.geojson
			break
		case 'start':
			PathFinder.routegenStart(data.startingMarker, data.markers, data.fastTravelWeight, data.railroadWeight, true).then((result) => {
				self.postMessage({ res: 'route-done', result: result })
			})
			break
	}
})