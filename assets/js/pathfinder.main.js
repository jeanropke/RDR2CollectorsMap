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

/**
 * Main path finder class; all properties are static
 */
class PathFinder {
	/**
	 * Draw a path to the path finder layer group
	 * @static
	 * @param {Array<[Number, Number]>} path
	 * @param {String} color
	 * @param {Number} weight
	 * @param {Number} opacity Between 0 and 1
	 * @returns {Polyline}
	 */
	static drawPath(path, color, weight=5, opacity=1, layer=this._layerGroup) {
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
		requestAnimationFrame(() => {
			this._currentPath && MapBase.map.removeLayer(this._currentPath);
			this._currentPath = L.layerGroup().addTo(MapBase.map)


			var line = this.drawPath(path, '#000000', 9, 0.5, this._currentPath)
			this.drawPath(path, '#ffffff', 7, 1, this._currentPath)
			this.drawPath(path, '#00bb00', 3, 1, this._currentPath)
			MapBase.map.fitBounds(line.getBounds(), { padding: [100, 100], maxZoom: 7 })
		})
	}

	/**
	 * Draw an entire route/multiple paths
	 * @static
	 * @param {Array<Array<[Number, Number]>>} paths
	 */
	static drawRoute(paths) {
		if(this._drawing) {
			this._redrawWhenFinished = paths
		} else {
			this._drawing = true
			requestAnimationFrame(() => {
				this._layerGroup.clearLayers()
				this._currentPath = null
				paths.forEach(p => this.drawPath(p, '#bb0000'));
				this._drawing = false
				if (this._redrawWhenFinished) {
					this.drawRoute(this._redrawWhenFinished)
					this._redrawWhenFinished = false
				}
			})
		}
	}

	static wasRemovedFromMap(marker) {
		if(this._layerControl && this._layerControl._lastMarker === marker && marker.isCollected) {
			this._layerControl.selectPath(1);

			// Skip the markers that are already collected ahead, unless already in the end of route
			while (this._layerControl && this._layerControl._lastMarker.isCollected && this._layerControl.currentPath !== this._layerControl._paths.length) {
				this._layerControl.selectPath(1);
			}
		}
	}

	/**
	 * Removes controler and layer group from map and canceles route generation when running
	 * @static
	 * @returns {Promise}
	 */
	static routegenClearAndCancel() {
		if(this._worker) {
			this._worker.terminate();
			this._worker = null;
		}
		this._layerControl && MapBase.map.removeControl(this._layerControl);
		this._layerGroup && MapBase.map.removeLayer(this._layerGroup);
		this._currentPath && MapBase.map.removeLayer(this._currentPath);
	}

	/**
	 * Adds controls to the map and starts route generation. It will also cancel ongoing route generation.
	 * @static
	 * @param {Marker} startingMarker Where to start
	 * @param {Array<Marker>} markers Contains markers a route should be generated for. Must contain startingMarker.
	 * @param {Number} fastTravelWeight Multiplier for fast travel road weights
	 * @param {Number} railroadWeight Multiplier for rail road weights
	 * @returns {Promise<Boolean>} false if geojson isn't fully loaded or route generation was canceled
	 */
	static routegenStart(startingMarker, markers, fastTravelWeight, railroadWeight) {
		this.routegenClearAndCancel();
		this._layerGroup = L.layerGroup([]).addTo(MapBase.map);
		this._layerControl = (new RouteControl()).addTo(MapBase.map);

		return new Promise(res => {
			var paths = [];
			this._worker = new Worker('assets/js/pathfinder.worker.js')
			this._worker.addEventListener('message', e => {
				var data = e.data
				switch(data.res) {
					case 'route-progress':
						this._layerControl.addPath(data.newPath)
						paths.push(data.newPath)
						this.drawRoute(paths)
						break
					case 'route-done':
						setTimeout(() => {
							this._layerControl.selectPath(1, true)
						}, 100)
						res(data.result)
						break
				}
			})
			const keysToPass = ['lat', 'lng'];
			const strippedMarkers = markers.map(marker => keysToPass.reduce((finalObj, copyKey) => {
				finalObj[copyKey] = marker[copyKey];
				return finalObj;
			}, {}));
			this._worker.postMessage({
				cmd: 'start',
				startingMarker: strippedMarkers[markers.indexOf(startingMarker)],
				markers: strippedMarkers,
				fastTravelWeight,
				railroadWeight,
			});
		})
	}
}