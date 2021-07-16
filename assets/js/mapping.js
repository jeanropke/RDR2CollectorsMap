class Mapping {
    static init() {
        this.mapping = [];
        return Loader.promises['mapping'].consumeJson(data => {
            data.forEach(item => this.mapping.push(new Mapping(item)));
            console.info('%c[Mapping] Loaded!', 'color: #bada55; background: #242424');
        });
    }

    constructor(preliminary) {
        Object.assign(this, preliminary);
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