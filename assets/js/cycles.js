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
    var newDate = new Date(),
        day = newDate.getUTCDate(),
        hour = newDate.getUTCHours(),
        minute = newDate.getUTCMinutes();
    
    if (hour < 1 && minute <= 20)
        $('.map-alert').css('opacity', '1');
    
    if (day != Cycles.setLocaleDate()) {
        $('.map-alert').css('opacity', '1');
        return;
    }
    else
        $('.map-alert').css('opacity', '0');
    
}, 1000 * 60);