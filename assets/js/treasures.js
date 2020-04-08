class Treasure {
  // requires MapBase.map, Menu.reorderMenu, Settings.some and DOM ready
  // not idempotent
  static init () {
    this.treasures = [];
    this.layer = L.layerGroup();
    this.layer.addTo(MapBase.map);
    this.context = $('.menu-hidden[data-type=treasure]');
    this.crossIcon = L.icon({
      iconUrl: './assets/images/icons/cross.png',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    this.onSettingsChanged();
    $.getJSON('data/treasures.json?nocache=' + nocache)
      .done(data => {
        data.forEach(item => this.treasures.push(new Treasure(item)));
        this.onLanguageChanged();
        console.info('%c[Treasures] Loaded!', 'color: #bada55; background: #242424');
      });
  }
  static onLanguageChanged () {
    Menu.reorderMenu(this.context);
  }
  static onSettingsChanged (ms = Settings.markerSize, shadow = Settings.isShadowsEnabled) {
    this.mainIcon = L.divIcon({
      iconSize: [35 * ms, 45 * ms],
      iconAnchor: [17 * ms, 42 * ms],
      popupAnchor: [0 * ms, -28 * ms],
      html: `
        <img class="icon" src="./assets/images/icons/treasure.png" alt="Icon">
        <img class="background" src="./assets/images/icons/marker_beige.png" alt="Background">
        ${shadow ? `<img class="shadow" width="${35 * ms}" height="${16 * ms}"
            src="./assets/images/markers-shadow.png" alt="Shadow">` : ''}
      `
    });
    this.treasures.forEach(treasure => treasure.reinitMarker());
  }
  // not idempotent (on the environment)
  constructor (preliminary) {
    Object.assign(this, preliminary);
    this._shownKey = `shown.${this.text}`;
    this.element = $('<div class="collectible-wrapper" data-help="item">')
      .on('click', () => this.onMap = !this.onMap)
      .append($('<p class="collectible">').attr('data-text', this.text))
      .translate();
    this.reinitMarker();
    this.element.appendTo(Treasure.context);
  }
  // auto remove marker? from map, recreate marker, auto add? marker
  // idempotent
  reinitMarker() {
    if (this.marker) Treasure.layer.removeLayer(this.marker);
    this.marker = L.layerGroup();
    this.marker.addLayer(L.circle([this.x, this.y], {
      color: "#fff79900",
      fillColor: "#fff799",
      fillOpacity: 0.5,
      radius: this.radius
    }));
    this.marker.addLayer(L.marker([this.x, this.y], {icon: Treasure.mainIcon})
      .bindPopup(this.popupContent.bind(this), { minWidth: 300 })
    );
    this.treasures.forEach(cross =>
      this.marker.addLayer(L.marker([cross.x, cross.y], {icon: Treasure.crossIcon})));
    this.onMap = this.onMap;
  }
  popupContent() {
    const snippet = $(`<div class="handover-wrapper-with-no-influence">
        <h1 data-text="${this.text}"></h1>
        <button type="button" class="btn btn-info remove-button" data-text="map.remove_add">
          </button>
      </div>`).translate();
    snippet.find('button').on('click', () => this.onMap = false);
    return snippet[0];
  }
  set onMap (state) {
    if (state) {
      Treasure.layer.addLayer(this.marker);
      this.element.removeClass('disabled')
      localStorage.setItem(this._shownKey, 'true');
    } else {
      Treasure.layer.removeLayer(this.marker);
      this.element.addClass('disabled')
      localStorage.removeItem(this._shownKey);
    }
  }
  get onMap () {
    return !!localStorage.getItem(this._shownKey);
  }
  static toggleAll (enabled) {
    Treasure.treasures.forEach(treasure => treasure.onMap = enabled);
  }
}