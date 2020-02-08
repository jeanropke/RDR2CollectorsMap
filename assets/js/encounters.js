var Encounters = {
  markers: [],
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
    Layers.encountersLayer.clearLayers();
    $.each(Encounters.markers, function (key, marker) {

      if (!enabledCategories.includes(marker.category))
        return;

      var shadow = Settings.isShadowsEnabled ? '<img class="shadow" src="./assets/images/markers-shadow.png" alt="Shadow">' : '';
      var tempMarker = L.marker([marker.lat, marker.lng], {
        icon: L.divIcon({
          iconSize: [35, 45],
          iconAnchor: [17, 42],
          popupAnchor: [1, -32],
          shadowAnchor: [10, 12],
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
    });
    Layers.encountersLayer.addTo(MapBase.map);
  }
};
