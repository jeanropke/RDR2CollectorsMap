var Cycles = {
    data: [],
    load: function () {
        var date = new Date();
        var dateString = (date.getUTCMonth() + 1) + '-' + date.getUTCDate() + '-' + date.getUTCFullYear();
        $.getJSON(`data/cycles.json?nocache=${nocache}&date=${dateString}`)
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
    },
    isSameAsYesterday: function (category) {
        var todayCycle = Cycles.data.cycles[Cycles.data.current][category];
        var yesterdayCycle = Cycles.data.cycles[Cycles.data.current-1][category];

        return todayCycle == yesterdayCycle;
    }
}

// show alert when cycles are not up to date
setInterval(function () {
    Cycles.checkForUpdate();
}, 1000 * 60);