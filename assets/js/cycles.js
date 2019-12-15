var Cycles = {
    data: [],
    load: function () {
        $.getJSON('data/cycles.json?nocache=' + nocache)
            .done(function (_data) {
                Cycles.data = _data;
            });
        console.log('cycles loaded');
    }
}