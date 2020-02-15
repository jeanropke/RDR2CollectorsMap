const Treasures = {
  enabledTreasures: $.cookie('treasures-enabled') ? $.cookie('treasures-enabled').split(';') : [],
  data: [],
  markers: [],
  load: function () {
    $.getJSON('data/treasures.json?nocache=' + nocache)
      .done(function (data) {
        Treasures.data = data;
        Treasures.set();
      });
    console.info('%c[Treasures] Loaded!', 'color: #bada55; background: #242424');
  },
  set: function () {
    Treasures.markers = [];
    const shadow = Settings.isShadowsEnabled ? '<img class="shadow" width="' + 35 * Settings.markerSize + '" height="' + 16 * Settings.markerSize + '" src="./assets/images/markers-shadow.png" alt="Shadow">' : '';
    const treasureIcon = L.divIcon({
      iconSize: [35 * Settings.markerSize, 45 * Settings.markerSize],
      iconAnchor: [17 * Settings.markerSize, 42 * Settings.markerSize],
      popupAnchor: [0 * Settings.markerSize, -28 * Settings.markerSize],
      html: `
        <img class="icon" src="./assets/images/icons/treasure.png" alt="Icon">
        <img class="background" src="./assets/images/icons/marker_beige.png" alt="Background">
        ${shadow}
      `
    });
    const crossIcon = L.icon({
      iconUrl: './assets/images/icons/cross.png',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    $.each(Treasures.data, function (_, value) {
      const circle = L.circle([value.x, value.y], {
        color: "#fff79900",
        fillColor: "#fff799",
        fillOpacity: 0.5,
        radius: value.radius
      });
      const marker = L.marker([value.x, value.y], {
        icon: treasureIcon
      });

      const treasuresCross = [];
      $.each(value.treasures, function (_, value) {
        treasuresCross.push(L.marker([value.x, value.y], {
          icon: crossIcon
        }));
      });

      marker.bindPopup(`<h1>${Language.get(value.text)}</h1><button type="button" class="btn btn-info remove-button" onclick="MapBase.removeItemFromMap('${value.text}', '${value.text}')" data-item="${marker.text}">${Language.get("map.remove_add")}</button>`, { minWidth: 300 });

      Treasures.markers.push({ treasure: value.text, marker: marker, circle: circle, treasuresCross: treasuresCross });
    });
    Treasures.addToMap();
  },

  addToMap: function () {

    Layers.miscLayer.clearLayers();

    if (!enabledCategories.includes('treasure'))
      return;

    $.each(Treasures.markers, function (key, value) {
      if (Treasures.enabledTreasures.includes(value.treasure)) {
        Layers.miscLayer.addLayer(value.marker);
        Layers.miscLayer.addLayer(value.circle);
        $.each(value.treasuresCross, function (_, value) {
          Layers.miscLayer.addLayer(value);
        });
      }
    });

    Layers.miscLayer.addTo(MapBase.map);
    Menu.refreshTreasures();
  },
  save: function () {
    $.cookie('treasures-enabled', Treasures.enabledTreasures.join(';'), { expires: 999 });
  },
  showHideAll: function (isToHide) {
    if (isToHide) {
      Treasures.enabledTreasures = [];
    } else {
      Treasures.enabledTreasures = Treasures.data.map(treasure => treasure.text);
    }
    Treasures.addToMap();
    Treasures.save();
  }
};
