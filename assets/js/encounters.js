const Encounters = {
  markers: [],
  load: function () {
    $.getJSON('data/encounters.json?nocache=' + nocache)
      .done(function (data) {
        Encounters.set(data);
      });
    console.info('%c[Encounters] Loaded!', 'color: #bada55; background: #242424');
  },
  set: function (data) {
    $.each(data, function (category, markers) {
      $.each(markers, function (_, marker) {
        Encounters.markers.push(new Marker(marker.text, marker.x, marker.y, null, null, category, null, null, true));
      });
    });

    Encounters.addToMap();
  },

  updateMarkerContent: function (marker) {
    const popupContent = marker.description;

    const linksElement = $('<p>');
    const debugDisplayLatLng = $('<small>').text(`Latitude: ${marker.lat} / Longitude: ${marker.lng}`);

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
    $.each(Encounters.markers, function (_, marker) {

      if (!enabledCategories.includes(marker.category))
        return;

      const shadow = Settings.isShadowsEnabled ? '<img class="shadow" src="./assets/images/markers-shadow.png" alt="Shadow">' : '';
      const tempMarker = L.marker([marker.lat, marker.lng], {
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
    });
    Layers.encountersLayer.addTo(MapBase.map);
  }
};
