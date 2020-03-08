var MadamNazar = {
  possibleLocations: [
    { "x": "-40.5625", "y": "109.0781" },
    { "x": "-43", "y": "132.8281" },
    { "x": "-36.75", "y": "153.6875" },
    { "x": "-56.1719", "y": "78.5938" },
    { "x": "-63.9375", "y": "105.3359" },
    { "x": "-60.875", "y": "130.6172" },
    { "x": "-66.0156", "y": "150.5" },
    { "x": "-84.4375", "y": "82.0313" },
    { "x": "-90.0464", "y": "135.6875" },
    { "x": "-100.1406", "y": "48.8125" },
    { "x": "-105.0703", "y": "84.9766" },
    { "x": "-123.8438", "y": "34.7656" }
  ],
  currentLocation: null,
  currentDate: null,

  loadMadamNazar: function () {
    var _nazarParam = getParameterByName('nazar');
    if (_nazarParam < MadamNazar.possibleLocations.length && _nazarParam) {
      MadamNazar.currentLocation = _nazarParam;
      MadamNazar.currentDate = '';
      MadamNazar.addMadamNazar();
    } else {
      $.getJSON('https://pepegapi.jeanropke.net/rdo/nazar')
        .done(function (nazar) {
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
      var shadow = Settings.isShadowsEnabled ? '<img class="shadow" width="' + 35 * Settings.markerSize + '" height="' + 16 * Settings.markerSize + '" src="./assets/images/markers-shadow.png" alt="Shadow">' : '';
      var marker = L.marker([MadamNazar.possibleLocations[MadamNazar.currentLocation].x, MadamNazar.possibleLocations[MadamNazar.currentLocation].y], {
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
