const MadamNazar = {
  possibleLocations: [
    { "x": -40.7817, "y": 109.4863, "id": "der", "key": "MPSW_LOCATION_10" },
    { "x": -43.1046, "y": 132.8263, "id": "grz", "key": "MPSW_LOCATION_07" },
    { "x": -36.5097, "y": 154.1859, "id": "bbr", "key": "MPSW_LOCATION_11" },
    { "x": -56.1619, "y": 78.5000, "id": "bgv", "key": "MPSW_LOCATION_04" },
    { "x": -63.8927, "y": 105.3496, "id": "hrt_w", "key": "MPSW_LOCATION_06" },
    { "x": -60.9622, "y": 130.6067, "id": "hrt_e", "key": "MPSW_LOCATION_05" },
    { "x": -65.9688, "y": 150.4468, "id": "blu", "key": "MPSW_LOCATION_09" },
    { "x": -84.2973, "y": 82.4512, "id": "tal", "key": "MPSW_LOCATION_03" },
    { "x": -90.0802, "y": 135.6969, "id": "scm", "key": "MPSW_LOCATION_08" },
    { "x": -100.0742, "y": 49.0765, "id": "cho", "key": "MPSW_LOCATION_01" },
    { "x": -104.7679, "y": 85.7222, "id": "hen", "key": "MPSW_LOCATION_02" },
    { "x": -123.9039, "y": 34.8213, "id": "rio", "key": "MPSW_LOCATION_00" }
  ],
  currentLocation: null,
  currentDate: null,

  loadMadamNazar: function () {
    Layers.nazarLayer.addTo(MapBase.map);

    const _nazarParam = getParameterByName('nazar') || getParameterByName('cycles');
    if (_nazarParam && _nazarParam > 0 && _nazarParam <= MadamNazar.possibleLocations.length) {
      MadamNazar.currentLocation = _nazarParam;
      MadamNazar.currentDate = '';
      MadamNazar.addMadamNazar();
      return Promise.resolve();
    } else {
      return Loader.promises['nazar'].consumeJson(data => {
        MadamNazar.currentLocation = MadamNazar.possibleLocations.findIndex(({ key }) => key === data.nazar) + 1;
        MadamNazar.currentDate = {
          locale: new Date(data.date).toLocaleString([], {
            day: "2-digit", month: "long", year: "numeric"
          }),
          isoString: data.date,
        }
        MadamNazar.addMadamNazar();
        console.info('%c[Nazar] Loaded!', 'color: #bada55; background: #242424');
      })
        .catch((e) => {
          console.info('%c[Nazar] Unable to load!', 'color: #FF6969; background: #242424');
        });
    }
  },

  addMadamNazar: function () {
    Layers.nazarLayer.clearLayers();

    if (MadamNazar.currentLocation == null || !enabledCategories.includes('nazar'))
      return;

    const isCustomLocation = Settings.nazarCustomLocation === 0 ? MadamNazar.currentLocation : Settings.nazarCustomLocation;
    const cl = MadamNazar.possibleLocations[isCustomLocation - 1];
    if (!cl) {
      console.error("Madam Nazar location could not be found.");
      return;
    }

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
              <img class="background" src="./assets/images/icons/marker_${MapBase.colorOverride || 'red'}.png" alt="Background">
              ${shadow}
            `
      })
    });
    marker.bindPopup(MadamNazar.popupContent(), { minWidth: 300 });

    Layers.nazarLayer.addLayer(marker);

    if (getParameterByName('q'))
      MapBase.map.setView([cl.x, cl.y], 6);
  },
  popupContent: function () {
    const popup$ = $(`
        <div>
          <h1><span data-text="menu.madam_nazar"></span> - ${MadamNazar.currentDate.locale || "#" + MadamNazar.currentLocation}</h1>
          <p style="text-align: center;" data-text="map.madam_nazar.desc"></p>
          <button class="btn btn-default reload-nazar" onclick="MadamNazar.reloadNazar();" data-text="menu.madam_nazar_reload_position"></button>
        </div>`)
      .translate();

    return popup$.html();
  },
  reloadNazar: function () {
    const nazarDate = new Date(Date.now() - 21600000).toISOUTCDateString();
    if (MadamNazar.currentDate.isoString !== nazarDate) {
      Loader.reloadData('nazar');
      MadamNazar.loadMadamNazar();
    }
  }
};