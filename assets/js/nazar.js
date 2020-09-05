const MadamNazar = {
  possibleLocations: [
    { "x": -40.7817, "y": 109.4863, "id": "der" },
    { "x": -43.1046, "y": 132.8263, "id": "grz" },
    { "x": -36.5097, "y": 154.1859, "id": "bbr" },
    { "x": -56.1619, "y": 78.5000, "id": "bgv" },
    { "x": -63.8927, "y": 105.3496, "id": "hrt_w" },
    { "x": -60.9622, "y": 130.6067, "id": "hrt_e" },
    { "x": -65.9688, "y": 150.4468, "id": "blu" },
    { "x": -84.2973, "y": 82.4512, "id": "tal" },
    { "x": -90.0802, "y": 135.6969, "id": "scm" },
    { "x": -100.0742, "y": 49.0765, "id": "cho" },
    { "x": -104.7679, "y": 85.7222, "id": "hen" },
    { "x": -123.9039, "y": 34.8213, "id": "rio" },
  ],
  currentLocation: null,
  currentDate: null,

  loadMadamNazar: function () {
    const _nazarParam = getParameterByName('nazar') || getParameterByName('cycles');
    if (_nazarParam && _nazarParam > 0 && _nazarParam <= MadamNazar.possibleLocations.length) {
      MadamNazar.currentLocation = _nazarParam;
      MadamNazar.currentDate = '';
      MadamNazar.addMadamNazar();
      return Promise.resolve();
    } else {
      return Loader.promises['nazar'].consumeJson(nazar => {
        MadamNazar.currentLocation = nazar.nazar_id;
        MadamNazar.currentDate = new Date(nazar.date).toLocaleString(Settings.language, {
          day: "2-digit", month: "long", year: "numeric"
        });
        MadamNazar.addMadamNazar();
        console.info('%c[Nazar] Loaded!', 'color: #bada55; background: #242424');
      });
    }
  },

  addMadamNazar: function () {
    if (MadamNazar.currentLocation == null || !enabledCategories.includes('nazar'))
      return;

    const cl = MadamNazar.possibleLocations[MadamNazar.currentLocation - 1];
    const markerSize = Settings.markerSize;
    const shadow = Settings.isShadowsEnabled ?
      `<img class="shadow"
          width="${35 * markerSize}"
          height="${16 * markerSize}"
          src="./assets/images/markers-shadow.png"
          alt="Shadow">` :
      '';

    const marker = L.marker([cl.x, cl.y], {
      icon: L.divIcon({
        iconSize: [35 * markerSize, 45 * markerSize],
        iconAnchor: [17 * markerSize, 42 * markerSize],
        popupAnchor: [1 * markerSize, -29 * markerSize],
        html: `
              <img class="icon" src="./assets/images/icons/nazar.png" alt="Icon">
              <img class="background" src="./assets/images/icons/marker_red.png" alt="Background">
              ${shadow}
            `
      })
    });
    marker.bindPopup($(`
        <div>
          <h1><span data-text="menu.madam_nazar"></span> - ${MadamNazar.currentDate || "#" + MadamNazar.currentLocation}</h1>
          <p style="text-align: center;" data-text="map.madam_nazar.desc"></p>
        </div>`).translate().html(), { minWidth: 300 });

    Layers.itemMarkersLayer.addLayer(marker);

    if (getParameterByName('q'))
      MapBase.map.setView([cl.x, cl.y], 6);
  }
};