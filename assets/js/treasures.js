var Treasures = {
  load: function () {
    $.getJSON('data/treasures.json?nocache=' + nocache)
      .done(function (data) {
        treasureData = data;
        Treasures.set();
      });
  },
  set: function () {
    var treasureIcon = L.icon({
      iconUrl: './assets/images/icons/treasure_beige.png',
      iconSize: [35, 45],
      iconAnchor: [17, 42],
      popupAnchor: [1, -32],
      shadowAnchor: [10, 12],
      shadowUrl: './assets/images/markers-shadow.png'
    });
    var crossIcon = L.icon({
      iconUrl: './assets/images/icons/cross.png',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    $.each(treasureData, function (key, value) {
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


      marker.bindPopup(`<h1> ${Language.get(value.text)}</h1><p class="remove-button" data-item="${value.text}">${Language.get("map.remove_add")}</p>`);

      treasureMarkers.push({ treasure: value.text, marker: marker, circle: circle, treasuresCross: treasuresCross });
    });
    Treasures.addToMap();
  },

  addToMap: function () {
    if (!enabledCategories.includes('treasure'))
      return;

    $.each(treasureMarkers, function (key, value) {
      if (inventory[value.treasure.toString()]) {
        Layers.miscLayer.addLayer(value.marker);
        Layers.miscLayer.addLayer(value.circle);
        $.each(value.treasuresCross, function (crossKey, crossValue) {
          Layers.miscLayer.addLayer(crossValue);
        });
      }
    });

    Layers.miscLayer.addTo(MapBase.map);
  }
}
