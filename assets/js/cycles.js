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
        var yesterdayCycle = Cycles.data.cycles[Cycles.data.current - 1][category];

        return todayCycle == yesterdayCycle;
    },

    getInGameCycle: function (category) {
        var _cycles = [];

        //'old cycle': 'new cycle'
        switch (category) {
            case "arrowhead":
            case "antique_bottles":
            case "lost_bracelet":
            case "lost_earrings":
            case "lost_necklaces":
            case "lost_ring":
                _cycles = {
                    '2': 1,
                    '3': 2,
                    '1': 3,
                    '6': 4,
                    '4': 5,
                    '5': 6
                }
                break;

            case "bird_eggs":
            case "family_heirlooms":
                _cycles = {
                    '2': 1,
                    '3': 2,
                    '1': 3,
                    '6': 4,
                    '5': 5,
                    '4': 6
                }
                break;

            case "coin":
                _cycles = {
                    '2': 1,
                    '3': 2,
                    '1': 3,
                    '4': 4,
                    '6': 5,
                    '5': 6
                }
                break;
            case "card_cups":
            case "card_pentacles":
            case "card_swords":
            case "card_wands":
            case "american_flowers":
                _cycles = {
                    '2': 1,
                    '3': 2,
                    '1': 3,
                    '4': 4,
                    '5': 5,
                    '6': 6
                }
                break;

            default:
                console.log(`Category '${category}' invalid`);
                break;
        }
        return _cycles;
    },
    exportTable: function (inGameCycles = false) {
        var tempTable = new Object();
        $.each(Cycles.data.cycles, function (key, value) {
            tempTable[key] = new Object();
            $.each(value, function (_k, _c) {
                if (_k == "card_pentacles" || _k == "card_swords" || _k == "card_wands" || _k == "lost_bracelet" || _k == "lost_earrings" || _k == "lost_necklaces")
                    return;
                tempTable[key][[_k]] = inGameCycles ? Cycles.getInGameCycle(_k)[_c] : _c;
            });
        });

        console.table(tempTable);
    }
}

// show alert when cycles are not up to date
setInterval(function () {
    Cycles.checkForUpdate();
}, 1000 * 60);