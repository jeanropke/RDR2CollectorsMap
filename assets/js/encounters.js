var Encounters = {
  markers: [],
  load: function(){
    $.getJSON('data/encounters.json?nocache='+nocache)
        .done(function (data) {
            Encounters.set(data);
    });
    console.info('%c[Encouters] Loaded!', 'color: #bada55');
  },
  set: function(data){
    $.each(data, function(_category, _markers) {
      $.each(_markers, function(key, marker) {
        Encounters.markers.push(new Marker(marker.text, marker.x, marker.y, null, null, _category, null, null, true));
      });
    });

    Encounters.addToMap();
  },

  addToMap: function() {
    Layers.encountersLayer.clearLayers();
    $.each(Encounters.markers, function(key, marker) {

      if(!enabledCategories.includes(marker.category))
        return;

      var tempMarker = L.marker([marker.lat, marker.lng], {
        icon: L.icon({
          iconUrl: './assets/images/icons/' + marker.category + '_lightred.png',
          iconSize: [35,45],
          iconAnchor: [17,42],
          popupAnchor: [1,-32],
          shadowAnchor: [10,12],
          shadowUrl: './assets/images/markers-shadow.png'
        })
      });
      
      marker.title = Language.get(`${marker.category}.name`);
      marker.description = Language.get(`${marker.category}.desc`);

      tempMarker.bindPopup(`<h1>${marker.title}</h1><p>${marker.description}</p>`, { minWidth: 300 });
      Layers.encountersLayer.addLayer(tempMarker);
    });
    Layers.encountersLayer.addTo(MapBase.map);
  }
}
