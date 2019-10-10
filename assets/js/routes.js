/**
 * Created by Jean on 2019-10-09.
 */

var Routes = {};

Routes.loadRoutesData = function()
{

    $.getJSON(`data/routes/day_1.json`, {}, function (data) {
        routesData[1] = data;
    });
    $.getJSON(`data/routes/day_2.json`, {}, function (data) {
        routesData[2] = data;
    });
    $.getJSON(`data/routes/day_3.json`, {}, function (data) {
        routesData[3] = data;
    });
};

Routes.exportCustomRoute = function ()
{
    const el = document.createElement('textarea');
    el.value = customRouteConnections.join(',');
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el)

    alert('Route copied to clipboard!');
};

Routes.importCustomRoute = function() {
    var input = prompt("Enter the route code", "");

    if (input == null || input == "")
    {
        alert('Empty route');
    }
    else
    {
        Routes.loadCustomRoute(input);
    }
};

Routes.loadCustomRoute = function(input)
{
    try
    {
        var connections = [];
        input = input.replace(/\r?\n|\r/g, '').replace(/\s/g, '');
        $.each(input.split(','), function (key, value) {
            connections.push(visibleMarkers[value]._latlng);
        });

        if (polylines instanceof L.Polyline) {
            map.removeLayer(polylines);
        }

        polylines = L.polyline(connections, {'color': '#9a3033'});
        map.addLayer(polylines);
    }
    catch(e)
    {
        alert('Invalid route');
    }
};


Routes.addMarkerOnCustomRoute = function(value)
{
    if(customRouteEnabled)
    {
        if(customRouteConnections.includes(value))
        {
            customRouteConnections = customRouteConnections.filter(function(item) {
                return item !== value
            })
        }
        else
            customRouteConnections.push(value);


        var connections = [];

        $.each(customRouteConnections, function (key, item)
        {
            connections.push(visibleMarkers[item]._latlng);
        });


        if (polylines instanceof L.Polyline)
        {
            map.removeLayer(polylines);
        }

        polylines = L.polyline(connections, {'color': '#9a3033'});
        map.addLayer(polylines);

    }

};