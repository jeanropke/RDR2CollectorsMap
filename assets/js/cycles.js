var Cycles = {
    data: [],
    load: function () {
        $.getJSON('data/cycles.json?nocache=' + nocache)
            .done(function (_data) {
                Cycles.data = _data;
                Cycles.setCycles();

                Cycles.setLocaleDate();
                Cycles.checkForUpdate();
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
    },
    checkForUpdate: function () {
        var day = new Date().getUTCDate();

        if (day != Cycles.setLocaleDate())
            $('.map-cycle-alert').removeClass('hidden');
        else
            $('.map-cycle-alert').addClass('hidden');
    }
}

// show alert when cycles are not up to date
setInterval(function () {
    Cycles.checkForUpdate();
}, 1000 * 60);