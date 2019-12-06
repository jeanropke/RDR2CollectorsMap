var CondorEgg = {
    load: function () {
        $.getJSON('data/condoregg.json?nocache=' + nocache)
            .done(function (data) {
                condorData = data;
                CondorEgg.set();
            });
    },
    set: function () {
        var condorIcon = L.icon({
            iconUrl: './assets/images/icons/bird_eggs_beige.png',
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

        $.each(condorData, function (key, value) {
            var circle = L.circle([value.x, value.y], {
                color: "#fff79900",
                fillColor: "#fff799",
                fillOpacity: 0.5,
                radius: value.radius
            });
            var marker = L.marker([value.x, value.y], {
                icon: condorIcon
            });

            var condorCross = [];
            $.each(value.locations, function (crossKey, crossValue) {
                condorCross.push(L.marker([crossValue.x, crossValue.y], {
                    icon: crossIcon
                }));
            });


            marker.bindPopup(`<h1> ${Language.get('condor_egg.name')}</h1><p>${Language.get('condor_egg.desc')}</p>`);

            condorMarkers.push({ condor: value.text, marker: marker, circle: circle, condorCross: condorCross });
        });
        CondorEgg.addToMap();
    },

    addToMap: function () {
        if (!enabledCategories.includes('condor_egg'))
            return;

        $.each(condorMarkers, function (key, value) {
            miscLayer.addLayer(value.marker);
            miscLayer.addLayer(value.circle);

            $.each(value.condorCross, function (crossKey, crossValue) {
                miscLayer.addLayer(crossValue);
            });
        });

        miscLayer.addTo(MapBase.map);
    }
}
