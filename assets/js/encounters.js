var Encounters = {
  markers: [],
  updateLoopAvailable: true,
  requestLoopCancel: false,

  load: function () {
    $.getJSON('data/encounters.json?nocache=' + nocache)
      .done(function (data) {
        Encounters.set(data);
      });
    console.info('%c[Encounters] Loaded!', 'color: #bada55; background: #242424');
  },
  set: function (data) {
    $.each(data, function (_category, _markers) {
      $.each(_markers, function (key, marker) {
        Encounters.markers.push(new Marker(marker.text, marker.x, marker.y, null, null, _category, null, null, true));
      });
    });

    Encounters.addToMap();
  },

  updateMarkerContent: function (marker) {
    var popupContent = marker.description;

    var linksElement = $('<p>');
    var debugDisplayLatLng = $('<small>').text(`Latitude: ${marker.lat} / Longitude: ${marker.lng}`);

    return `<h1>${marker.title}</h1>
        <span class="marker-content-wrapper">
        <p>${popupContent}</p>
        </span>
        ${linksElement.prop('outerHTML')}
        ${Settings.isDebugEnabled ? debugDisplayLatLng.prop('outerHTML') : ''}
        `;
  },

  addToMap: function () {
    if (!Encounters.updateLoopAvailable) {
      Encounters.requestLoopCancel = true;
      setTimeout(function () {
        Encounters.addToMap();
      }, 0);
      return;
    }

    Layers.encountersLayer.clearLayers();

    Encounters.updateLoopAvailable = false;
    MapBase.yieldingLoop(
      Encounters.markers.length,
      25,
      function (i) {
        if (Encounters.requestLoopCancel) return;

        var marker = Encounters.markers[i];

        if (!enabledCategories.includes(marker.category)) return;

        var shadow = Settings.isShadowsEnabled ? '<img class="shadow" src="./assets/images/markers-shadow.png" alt="Shadow">' : '';
        var tempMarker = L.marker([marker.lat, marker.lng], {
          icon: L.divIcon({
            iconSize: [35 * Settings.markerSize, 45 * Settings.markerSize],
            iconAnchor: [17 * Settings.markerSize, 42 * Settings.markerSize],
            popupAnchor: [0 * Settings.markerSize, -28 * Settings.markerSize],
            shadowAnchor: [10 * Settings.markerSize, 12 * Settings.markerSize],
            html: `
              <img class="icon" src="./assets/images/icons/${marker.category}.png" alt="Icon">
              <img class="background" src="./assets/images/icons/marker_lightred.png" alt="Background">
              ${shadow}
            `
          })
        });

        marker.title = Language.get(`${marker.category}.name`);
        marker.description = Language.get(`${marker.category}.desc`);

        tempMarker.bindPopup(Encounters.updateMarkerContent(marker), { minWidth: 300 });
        Layers.encountersLayer.addLayer(tempMarker);
      },
      function () {
        Encounters.updateLoopAvailable = true;
        Encounters.requestLoopCancel = false;
      }
    );

    Layers.encountersLayer.addTo(MapBase.map);
  }
};
