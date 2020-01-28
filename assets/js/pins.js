var Pins = {
    pinsList: [],

    addToMap: function () {
        if (!enabledCategories.includes('user_pins'))
            this.removeAllPins();
        else
            this.loadAllPins();
    },

    addPin: function (lat, lng, id = null, name = null, desc = null, icon = null, doSave = true) {
        var pinAtPositionExists = this.pinsList.some(function (marker) { return marker._latlng.lat == lat && marker._latlng.lng == lng; });
        if (pinAtPositionExists) return;

        var icon = icon == null ? 'pin' : icon;
        var shadow = Settings.isShadowsEnabled ? '<img class="shadow" src="./assets/images/markers-shadow.png" alt="Shadow">' : '';
        var marker = L.marker([lat, lng], {
            id: id == null ? this.generatePinHash(`${lat}_${lng}_${Date.now()}`) : id,
            name: name == null ? Language.get('map.user_pins.default_title') : name,
            desc: desc == null ? Language.get('map.user_pins.default_desc') : desc,
            icon_name: icon,
            draggable: Settings.isPinsEditingEnabled,
            icon: L.divIcon({
                iconSize: [35, 45],
                iconAnchor: [17, 42],
                popupAnchor: [1, -32],
                shadowAnchor: [10, 12],
                html: `
                    <img class="icon" src="./assets/images/icons/${icon}.png" alt="Icon">
                    <img class="background" src="./assets/images/icons/marker_red.png" alt="Background">
                    ${shadow}
                `
            })
        });

        marker.addEventListener('dragend', function (event) {
            Pins.saveAllPins();
        }, false);

        this.pinsList.push(marker);

        this.updatePopup(marker);
        Layers.pinsLayer.addLayer(marker);

        if (doSave) this.saveAllPins();
    },

    addPinToCenter: function () {
        var center = MapBase.map.getCenter();
        this.addPin(center.lat, center.lng);
    },

    savePin: function (id, name, desc, icon) {
        var markerIndex = this.pinsList.findIndex(function (marker) { return marker.options.id == id; });

        var marker = this.pinsList[markerIndex];
        marker.options.name = name.replace(/[\:\;\<\>\"]/gi, '');
        marker.options.desc = desc.replace(/[\:\;\<\>\"]/gi, '');
        marker.options.icon_name = icon;

        this.updatePopup(marker);
        this.saveAllPins();
    },

    removePin: function (id, doSave = true) {
        var markerIndex = this.pinsList.findIndex(function (marker) { return marker.options.id == id; });

        var marker = this.pinsList[markerIndex];
        Layers.pinsLayer.removeLayer(marker);

        this.pinsList = this.pinsList.filter(function (marker) { return marker.options.id != id; });
        if (doSave) this.saveAllPins();
    },

    saveAllPins: function () {
        var pinnedItems = "";

        this.pinsList.forEach(pin => {
            pinnedItems += `${pin._latlng.lat}:${pin._latlng.lng}:${pin.options.id}:${pin.options.name}:${pin.options.desc}:${pin.options.icon_name};`;
        });

        localStorage.setItem("pinned-items", pinnedItems)
        console.log("Saved all pins!");

        this.loadAllPins();
    },

    loadAllPins: function () {
        if (this.pinsList.length > 0) this.removeAllPins();

        var pinnedItems = localStorage.getItem("pinned-items");

        if (pinnedItems == null)
            return;

        pinnedItems.split(';').forEach(pinnedItem => {
            if (pinnedItem == '') return;

            var properties = pinnedItem.split(':');
            this.addPin(properties[0], properties[1], properties[2] || null, properties[3] || null, properties[4] || null, properties[5] || null, false);
        });
    },

    removeAllPins: function () {
        MapBase.map.closePopup();
        this.pinsList.forEach(pin => { this.removePin(pin.options.id, false) });
    },

    updatePopup: function (marker) {
        var markerId = marker.options.id;
        var markerIconSelect = "";

        if (Settings.isPinsEditingEnabled) {
            var markerIcons = ["pin", "random", "shovel", "magnet", "american_flowers", "antique_bottles", "arrowhead", "bird_eggs", "card_cups", "card_pentacles", "card_swords", "card_wands", "coin", "family_heirlooms", "fast_travel", "hide", "lost_bracelet", "lost_earrings", "lost_necklaces", "lost_ring", "nazar", "treasure"];
            markerIconSelect = $('<select>').attr('id', `${markerId}_icon`).addClass('marker-popup-pin-input-icon');

            markerIcons.forEach(icon => {
                var option = $('<option></option>').attr('value', icon).attr('data-text', `map.user_pins.icon.${icon}`).text(Language.get(`map.user_pins.icon.${icon}`));
                if (icon == marker.options.icon_name) option.attr('selected', 'selected');
                markerIconSelect.append(option);
            });

            markerIconSelect = markerIconSelect.prop('outerHTML');
        }

        var markerTitle = Settings.isPinsEditingEnabled ? `<h1><input type="text" id="${markerId}_name" class="marker-popup-pin-input-name" value="${marker.options.name}" placeholder="${Language.get('map.user_pins.placeholder_title')}"></h1>` : `<h1 id="${markerId}_name">${marker.options.name}</h1>`;
        var markerDesc = Settings.isPinsEditingEnabled ? `<p><textarea id="${markerId}_desc" class="marker-popup-pin-input-desc" rows="5" value="${marker.options.desc}" placeholder="${Language.get('map.user_pins.placeholder_desc')}">${marker.options.desc}</textarea></p>` : `<p id="${markerId}_desc">${marker.options.desc}</p>`;
        var markerDivider = Settings.isPinsEditingEnabled ? `<hr class="marker-popup-pin-input-divider">` : '';
        var markerIconLabel = Settings.isPinsEditingEnabled ? `<label for="${markerId}_icon" class="marker-popup-pin-label" data-text="map.user_pins.icon">${Language.get('map.user_pins.icon')}</label>` : '';
        var markerSaveButton = Settings.isPinsEditingEnabled ? `<button type="button" class="btn btn-info save-button" onclick="Pins.savePin(${markerId}, $('#${markerId}_name').val(), $('#${markerId}_desc').val(), $('#${markerId}_icon').val())" data-text="map.user_pins.save">${Language.get('map.user_pins.save')}</button>` : '';
        var markerRemoveButton = Settings.isPinsEditingEnabled ? `<button type="button" class="btn btn-danger remove-button" onclick="Pins.removePin(${markerId})" data-text="map.user_pins.remove">${Language.get('map.user_pins.remove')}</button>` : '';
        var markerContent = markerTitle + markerDesc + markerDivider + markerIconLabel + markerIconSelect + markerSaveButton + markerRemoveButton;

        marker.bindPopup(markerContent, { minWidth: 300, maxWidth: 300 });
    },

    updateAllPopups: function () {
        MapBase.map.closePopup();
        this.pinsList.forEach(pin => { this.updatePopup(pin) });
    },

    exportPins: function () {
        var text = localStorage.getItem("pinned-items");
        var filename = 'pinned-items.txt';

        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    },

    importPins: function (text) {
        if (!text.includes(':') || !text.includes(';')) {
            alert(Language.get('alerts.file_not_valid'));
        }

        localStorage.setItem("pinned-items", text);

        try {
            this.loadAllPins();
        } catch (error) {
            this.removeAllPins();
            alert(Language.get('alerts.file_not_valid'));
        }
    },

    generatePinHash: function (str) {
        var hash = 0,
            i, char;

        if (str.length == 0) return hash;

        for (i = 0, l = str.length; i < l; i++) {
            char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }

        return hash;
    },

    createChunkedString: function (str, size) {
        var numChunks = Math.ceil(str.length / size);
        var chunks = new Array(numChunks);

        for (i = 0, o = 0; i < numChunks; ++i, o += size) {
            chunks[i] = str.substr(o, size);
        }

        return chunks;
    }
}