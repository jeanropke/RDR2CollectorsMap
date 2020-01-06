var Cycles = {
    data: [],
    load: function () {
        $.getJSON('data/cycles.json?nocache=' + nocache)
            .done(function (_data) {
                Cycles.data = _data;
                Cycles.setCycles();

                var _date = Cycles.data.updated_at.split(' ');

                $('.cycle-data').text(
                    Language.get('menu.date')
                    .replace('{month}', Language.get(`menu.month.${_date[0]}`))
                    .replace('{day}', _date[1])
                    );
            });
        console.log('cycles loaded');
    },
    setCycles: function () {
        $.each(Cycles.data.cycles[Cycles.data.current], function (key, value) {
            $(`input[name=${key}]`).val(value);
        });
    }
}