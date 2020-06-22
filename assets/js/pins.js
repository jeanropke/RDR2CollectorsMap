const Pins = {
  pinsList: [],

  addToMap: function () {
    if (!enabledCategories.includes('user_pins'))
      this.removeAllPins();
    else
      this.loadAllPins();
  },

  addPin: function (lat, lng, id = null, name = null, desc = null, icon = null, doSave = true, markerSize = Settings.markerSize) {
    if (lat === null || lat === undefined || lng === null || lng === undefined) return;

    const pinAtPositionExists = this.pinsList.some(function (marker) {
      return marker._latlng.lat == lat && marker._latlng.lng == lng;
    });
    if (pinAtPositionExists) return;

    icon = icon == null ? 'pin' : icon;
    const shadow = Settings.isShadowsEnabled ? '<img class="shadow" src="./assets/images/markers-shadow.png" alt="Shadow">' : '';
    const marker = L.marker([lat, lng], {
      id: id == null ? this.generatePinHash(`${lat}_${lng}_${Date.now()}`) : id,
      name: name == null ? Language.get('map.user_pins.default_title') : name,
      desc: desc == null ? Language.get('map.user_pins.default_desc') : desc,
      icon_name: icon,
      draggable: Settings.isPinsEditingEnabled,
      icon: L.divIcon({
        iconSize: [35 * markerSize, 45 * markerSize],
        iconAnchor: [17 * markerSize, 42 * markerSize],
        popupAnchor: [1 * markerSize, -29 * markerSize],
        shadowAnchor: [10 * markerSize, 12 * markerSize],
        html:
            `<img class="icon" src="./assets/images/icons/${icon}.png" alt="Icon">
            <img class="background" src="./assets/images/icons/marker_red.png" alt="Background">
            ${shadow}`
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
    const center = MapBase.map.getCenter();
    this.addPin(center.lat, center.lng);
  },

  savePin: function (id, name, desc, icon) {
    const markerIndex = this.pinsList.findIndex(function (marker) {
      return marker.options.id == id;
    });

    const marker = this.pinsList[markerIndex];
    marker.options.name = name.replace(/[\:\;<\>\"]/gi, '');
    marker.options.desc = desc.replace(/[\:\;<\>\"]/gi, '');
    marker.options.icon_name = icon;

    this.updatePopup(marker);
    this.saveAllPins();
  },

  removePin: function (id, doSave = true) {
    const markerIndex = this.pinsList.findIndex(function (marker) {
      return marker.options.id == id;
    });

    const marker = this.pinsList[markerIndex];
    Layers.pinsLayer.removeLayer(marker);

    this.pinsList = this.pinsList.filter(function (marker) {
      return marker.options.id != id;
    });
    if (doSave) this.saveAllPins();
  },

  saveAllPins: function () {
    let pinnedItems = "";

    this.pinsList.forEach(pin => {
      pinnedItems += `${pin._latlng.lat}:${pin._latlng.lng}:${pin.options.id}:${pin.options.name}:${pin.options.desc}:${pin.options.icon_name};`;
    });

    localStorage.setItem("pinned-items", pinnedItems);
    this.loadAllPins();
  },

  loadAllPins: function () {
    if (this.pinsList.length > 0) this.removeAllPins();

    const pinnedItems = localStorage.getItem("pinned-items");

    if (pinnedItems == null)
      return;

    pinnedItems.split(';').forEach(pinnedItem => {
      if (pinnedItem == '') return;

      const properties = pinnedItem.split(':');
      this.addPin(properties[0], properties[1], properties[2] || null, properties[3] || null, properties[4] || null, properties[5] || null, false);
    });
  },

  removeAllPins: function () {
    MapBase.map.closePopup();
    this.pinsList.forEach(pin => {
      this.removePin(pin.options.id, false);
    });
  },

  updatePopup: function (marker) {
    const markerId = marker.options.id;
    let markerContent = `
      <h1 id="${markerId}_name">${marker.options.name}</h1>
      <p id="${markerId}_desc">${marker.options.desc}</p>`;

    if (Settings.isPinsEditingEnabled) {
      const markerIcons = ["pin", "random", "shovel", "magnet", "flower", "bottle", "arrowhead", "egg", "cups", "pentacles", "swords", "wands", "coin", "heirlooms", "fast_travel", "bracelet", "earring", "necklace", "ring", "nazar", "treasure", "camp"];
      const markerIconSelect = $('<select>').attr('id', `${markerId}_icon`).addClass('marker-popup-pin-input-icon');

      markerIcons.forEach(icon => {
        const option = $('<option></option>').attr('value', icon).attr('data-text', `map.user_pins.icon.${icon}`).text(Language.get(`map.user_pins.icon.${icon}`));
        if (icon == marker.options.icon_name) option.attr('selected', 'selected');
        markerIconSelect.append(option);
      });

      markerContent =
        `<h1><input id="${markerId}_name" class="marker-popup-pin-input-name"
            type="text" value="${marker.options.name}"
            placeholder="${Language.get('map.user_pins.placeholder_title')}"></h1>
        <p><textarea id="${markerId}_desc" class="marker-popup-pin-input-desc"
            rows="5" value="${marker.options.desc}"
            placeholder="${Language.get('map.user_pins.placeholder_desc')}">${marker.options.desc}</textarea></p>
        <hr class="marker-popup-pin-input-divider">
        <label for="${markerId}_icon" class="marker-popup-pin-label"
            data-text="map.user_pins.icon">${Language.get('map.user_pins.icon')}</label>
        ${markerIconSelect.prop('outerHTML')}
        <small class="popupContentDebug">Latitude: ${marker._latlng.lat.toFixed(4)} / Longitude: ${marker._latlng.lng.toFixed(4)}</small>
        <button type="button" class="btn btn-info save-button"
            onclick="Pins.savePin(${markerId}, $('#${markerId}_name').val(),
            $('#${markerId}_desc').val(), $('#${markerId}_icon').val())"
            data-text="map.user_pins.save">${Language.get('map.user_pins.save')}</button>
        <button type="button" class="btn btn-danger remove-button"
            onclick="Pins.removePin(${markerId})"
            data-text="map.user_pins.remove">${Language.get('map.user_pins.remove')}</button>`;
    }

    marker.bindPopup(markerContent, {
      minWidth: 300,
      maxWidth: 300
    });
  },

  updateAllPopups: function () {
    MapBase.map.closePopup();
    this.pinsList.forEach(pin => {
      this.updatePopup(pin);
    });
  },

  exportPins: function () {
    const text = localStorage.getItem("pinned-items");
    const filename = 'pinned-items.txt';

    if (text === null || !text.includes(':') || !text.includes(';')) {
      alert(Language.get('alerts.nothing_to_export'));
      return;
    }

    const element = document.createElement('a');
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
    let hash = 0;

    if (str.length == 0) return hash;

    for (let i = 0, l = str.length; i < l; i++) {
      let char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }

    return hash;
  },

  createChunkedString: function (str, size) {
    const numChunks = Math.ceil(str.length / size);
    const chunks = new Array(numChunks);

    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      chunks[i] = str.substr(o, size);
    }

    return chunks;
  }
};