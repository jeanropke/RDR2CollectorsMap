var Cycles = {
    data: [],
    load: function () {
        $.getJSON('data/cycles.json?nocache=' + nocache)
            .done(function (_data) {
                Cycles.data = _data;
                Cycles.setCycles();
            });
        console.log('cycles loaded');
    },
    setCycles: function(){
        $.each(Cycles.data.cycles[currentCycle], function(key, value) {
            $(`input[name=${key}]`).val(value);
        });
    }
}