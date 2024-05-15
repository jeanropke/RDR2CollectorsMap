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

        let amount = localStorage.getItem(`amount.${this.value}`);
        let collected = localStorage.getItem(`collected.${this.value}`);

        if (amount != null) {
            localStorage.setItem(`rdr2collector.amount.${this.key}`, amount);
            localStorage.removeItem(`amount.${this.value}`);
        }

        if (collected != null) {
            localStorage.setItem(`rdr2collector.collected.${this.key}`, collected);
            localStorage.removeItem(`collected.${this.value}`);
        }

    }

    //open typing `Mapping.showModal()` on console (yes, i'm that lazy :))
    //compare both images, just to be sure I didnt messed up
    //not in use anymore, but I'll keep just in case
    static showModal() {
        if (!Settings.isDebugEnabled) return;
        const snippet = document.createElement('div');

        this.mapping.forEach(value => {
            const div = document.createElement('div');
            div.style.borderBottom = '3px dashed #aaa';
            div.innerHTML = `
                    <img src="../RDR2CollectorsMap/assets/images/icons/game/done/${value.value}.png">
                    <img src="../RDR2CollectorsMap/assets/images/icons/game/pm_collectors_bag_mp/${value.key}.png">                    
            `;
            snippet.appendChild(div);
        });
        document.querySelector('#mapping-modal .modal-body').appendChild(snippet);
        new bootstrap.Modal(document.getElementById('mapping-modal')).show();
    }
}