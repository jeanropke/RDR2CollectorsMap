class Mapping {
    static init() {
        this.mapping = [];
        return Loader.promises['mapping'].consumeJson(data => {
            data.forEach(item => this.mapping.push(new Mapping(item)));
            console.info('%c[Mapping] Loaded!', 'color: #bada55; background: #242424');
            Mapping.convert()
        });
    }

    constructor(preliminary) {
        Object.assign(this, preliminary);
    }

    static convert() {
        this.mapping.forEach(item => {
            let amount = localStorage.getItem(`amount.${item.value}`);
            let collected = localStorage.getItem(`collected.${item.value}`);

            if (amount != null) {
                localStorage.setItem(`rdr2collector.amount.${item.key}`, amount);
                localStorage.removeItem(`amount.${item.value}`);
            }

            if (collected != null) {
                localStorage.setItem(`rdr2collector.collected.${item.key}`, collected);
                localStorage.removeItem(`collected.${item.value}`);
            }
        });
    }

    //compare both images, just to be sure I didnt messed up
    static showModal() {
        const snippet = $('<div></div>');

        this.mapping.forEach(value => {
            snippet.append($(
                `<div style="border-bottom: 3px dashed #aaa;">
                    <img src="../RDR2CollectorsMap/assets/images/icons/game/done/${value.value}.png">
                    <img src="../RDR2CollectorsMap/assets/images/icons/game/pm_collectors_bag_mp/${value.key}.png">                    
                </div>`
            ));
        });
        $('#mapping-modal .modal-body').append(snippet);
        $('#mapping-modal').modal('show');
    }
}