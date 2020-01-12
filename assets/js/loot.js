var Loot = {
    lootTable: {},

    load: function () {
        $.getJSON('data/random_spots_loot.json?nocache=' + nocache)
            .done(function (data) {
                Loot.lootTable = data;
            });

        console.log('Random spots loottable loaded.');
    }
}