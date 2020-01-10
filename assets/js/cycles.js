var Cycles = {
    data: [],
    load: function () {
        $.getJSON('data/cycles.json?nocache=' + nocache)
            .done(function (_data) {
                Cycles.data = _data;
                Cycles.setCycles();

                Cycles.setLocaleDate();
            });
        console.log('cycles loaded');
    },
    setCycles: function () {
        $.each(Cycles.data.cycles[Cycles.data.current], function (key, value) {
            $(`input[name=${key}]`).val(value);
        });
    },
    setLocaleDate: function () {
        var _date = Cycles.data.updated_at.split(' ');

        $('.cycle-data').text(
            Language.get('menu.date')
                .replace('{month}', Language.get(`menu.month.${_date[0]}`))
                .replace('{day}', _date[1])
        );
        return _date[1];
    }
}

// show alert when cycles are not up to date
setInterval(function () {
    var day = new Date().getUTCDate();

    if (day != Cycles.setLocaleDate())
        $('.map-cycle-alert').removeClass('hidden');
    else
        $('.map-cycle-alert').addClass('hidden');
}, 1000 * 60);