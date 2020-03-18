var Treasures = {
  enabledTreasures: [],
  data: [],
  markers: [],

  load: function () {
    Treasures.enabledTreasures = JSON.parse(localStorage.getItem("treasures-enabled"));
    if (Treasures.enabledTreasures === null) Treasures.enabledTreasures = [];

    $.getJSON('data/treasures.json?nocache=' + nocache)
      .done(function (data) {
        Treasures.data = data;
        Treasures.set();
      });

    console.info('%c[Treasures] Loaded!', 'color: #bada55; background: #242424');
  },

  set: function () {
    Treasures.markers = [];
    var shadow = Settings.isShadowsEnabled ? '<img class="shadow" width="' + 35 * Settings.markerSize + '" height="' + 16 * Settings.markerSize + '" src="./assets/images/markers-shadow.png" alt="Shadow">' : '';
    var treasureIcon = L.divIcon({
      iconSize: [35 * Settings.markerSize, 45 * Settings.markerSize],
      iconAnchor: [17 * Settings.markerSize, 42 * Settings.markerSize],
      popupAnchor: [0 * Settings.markerSize, -28 * Settings.markerSize],
      html: `
        <img class="icon" src="./assets/images/icons/treasure.png" alt="Icon">
        <img class="background" src="./assets/images/icons/marker_beige.png" alt="Background">
        ${shadow}
      `
    });
    var crossIcon = L.icon({
      iconUrl: './assets/images/icons/cross.png',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    $.each(Treasures.data, function (key, value) {
      var circle = L.circle([value.x, value.y], {
        color: "#fff79900",
        fillColor: "#fff799",
        fillOpacity: 0.5,
        radius: value.radius
      });
      var marker = L.marker([value.x, value.y], {
        icon: treasureIcon
      });

      var treasuresCross = [];
      $.each(value.treasures, function (crossKey, crossValue) {
        treasuresCross.push(L.marker([crossValue.x, crossValue.y], {
          icon: crossIcon
        }));
      });

      marker.bindPopup(`<h1>${Language.get(value.text)}</h1><button type="button" class="btn btn-info remove-button" onclick="MapBase.removeItemFromMap('${value.text}', '${value.text}')" data-item="${marker.text}">${Language.get("map.remove_add")}</button>`, { minWidth: 300 });

      Treasures.markers.push({
        treasure: value.text,
        marker: marker,
        circle: circle,
        treasuresCross: treasuresCross
      });
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
        $.each(value.treasuresCross, function (crossKey, crossValue) {
          Layers.miscLayer.addLayer(crossValue);
        });
      }
    });

    Layers.miscLayer.addTo(MapBase.map);
    Menu.refreshTreasures();
  },

  save: function () {
    localStorage.setItem("treasures-enabled", JSON.stringify(Treasures.enabledTreasures));
  },

  showHideAll: function (isToHide) {
    if (isToHide) {
      Treasures.enabledTreasures = [];
    } else {
      Treasures.enabledTreasures = Treasures.data.map(_treasure => _treasure.text);
    }
    Treasures.addToMap();
    Treasures.save();
  }
};