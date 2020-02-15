const MadamNazar = {
  possibleLocations: [
    { "x": "-40.5625", "y": "109.078125" },
    { "x": "-43", "y": "132.828125" },
    { "x": "-36.75", "y": "153.6875" },
    { "x": "-56.171875", "y": "78.59375" },
    { "x": "-63.6640625", "y": "105.671875" },
    { "x": "-60.421875", "y": "130.640625" },
    { "x": "-66.0156", "y": "150.5" },
    { "x": "-84.4375", "y": "82.03125" },
    { "x": "-90.53125", "y": "135.65625" },
    { "x": "-100.140625", "y": "48.8125" },
    { "x": "-105.0703125", "y": "84.9765625" },
    { "x": "-123.8438", "y": "34.7656" }
  ],
  currentLocation: null,
  currentDate: null,

  loadMadamNazar: function () {
    const nazarParam = getParameterByName('nazar');
    if (nazarParam < MadamNazar.possibleLocations.length && nazarParam) {
      MadamNazar.currentLocation = nazarParam;
      MadamNazar.currentDate = '';
      MadamNazar.addMadamNazar();
    } else {
      $.getJSON('https://pepegapi.jeanropke.net/rdo/nazar')
        .done((nazar) => {
          MadamNazar.currentLocation = nazar.nazar_id - 1;
          MadamNazar.currentDate = MapBase.formatDate(nazar.date);
          MadamNazar.addMadamNazar();
          console.info('%c[Nazar] Loaded!', 'color: #bada55; background: #242424');
        });
    }
  },

  addMadamNazar: function () {
    if (MadamNazar.currentLocation == null)
      return;

    if (enabledCategories.includes('nazar')) {
      const shadow = Settings.isShadowsEnabled ? '<img class="shadow" width="' + 35 * Settings.markerSize + '" height="' + 16 * Settings.markerSize + '" src="./assets/images/markers-shadow.png" alt="Shadow">' : '';
      const marker = L.marker([MadamNazar.possibleLocations[MadamNazar.currentLocation].x, MadamNazar.possibleLocations[MadamNazar.currentLocation].y], {
        icon: L.divIcon({
          iconSize: [35 * Settings.markerSize, 45 * Settings.markerSize],
          iconAnchor: [17 * Settings.markerSize, 42 * Settings.markerSize],
          popupAnchor: [0 * Settings.markerSize, -28 * Settings.markerSize],
          html: `
            <img class="icon" src="./assets/images/icons/nazar.png" alt="Icon">
            <img class="background" src="./assets/images/icons/marker_red.png" alt="Background">
            ${shadow}
          `
        })
      });
      marker.bindPopup(`<h1>${Language.get('menu.madam_nazar')} - ${MadamNazar.currentDate}</h1><p style="text-align: center;">${Language.get('map.madam_nazar.desc').replace('{link}', '<a href="https://twitter.com/MadamNazarIO" target="_blank">@MadamNazarIO</a>')}</p>`, { minWidth: 300 });
      Layers.itemMarkersLayer.addLayer(marker);
    }
  }
};
