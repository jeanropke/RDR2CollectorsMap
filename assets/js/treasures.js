class Treasure {
  // requires MapBase.map, Menu.reorderMenu, Settings.some and DOM ready
  // not idempotent
  static init() {
    this.treasures = [];
    this.layer = L.layerGroup();
    this.layer.addTo(MapBase.map);
    const pane = MapBase.map.createPane('treasureX');
    pane.style.zIndex = 450; // X-markers on top of circle, but behind “normal” markers/shadows
    pane.style.pointerEvents = 'none';
    this.context = document.querySelector('.menu-hidden[data-type=treasure]');
    this.crossIcon = L.icon({
      iconUrl: './assets/images/icons/cross.png',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    this.onSettingsChanged();
    document.querySelectorAll('.menu-hidden[data-type="treasure"] > *:first-child button').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const showAll = e.target.getAttribute('data-text') === 'menu.show_all';
        Treasure.treasures.forEach((treasure) => (treasure.onMap = showAll));
      })
    );
    return Loader.promises['treasures'].consumeJson(data => {
      data.forEach(item => this.treasures.push(new Treasure(item)));
      this.onLanguageChanged();
      console.info('%c[Treasures] Loaded!', 'color: #bada55; background: #242424');
    });
  }
  static onLanguageChanged() {
    Menu.reorderMenu(this.context);
  }
  static onSettingsChanged(markerSize = Settings.markerSize, shadow = Settings.isShadowsEnabled) {
    this.mainIcon = L.divIcon({
      iconSize: [35 * markerSize, 45 * markerSize],
      iconAnchor: [17 * markerSize, 42 * markerSize],
      popupAnchor: [1 * markerSize, -29 * markerSize],
      html: `
        <img class="icon" src="./assets/images/icons/treasure.png" alt="Icon">
        <img class="background" src="./assets/images/icons/marker_${MapBase.colorOverride || 'beige'}.png" alt="Background">
        ${shadow ? `<img class="shadow" width="${35 * markerSize}" height="${16 * markerSize}"
            src="./assets/images/markers-shadow.png" alt="Shadow">` : ''}
      `
    });
    this.treasures.forEach(treasure => treasure.reinitMarker());
  }
  // not idempotent (on the environment)
  constructor(preliminary) {
    Object.assign(this, preliminary);
    this._shownKey = `rdr2collector.shown.${this.text}`;
    this.element = document.createElement('div');
    this.element.classList.add('collectible-wrapper');
    this.element.setAttribute('data-help', 'item');
    this.element.addEventListener('click', () => this.onMap = !this.onMap);
    this.element.innerHTML = `<p class="collectible" data-text="${this.text}"></p>`;
    Language.translateDom(this.element);
    this.reinitMarker();
    Treasure.context.appendChild(this.element);
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
      radius: this.radius,
    })
      .bindPopup(this.popupContent.bind(this), { minWidth: 300 })
    );
    this.locations.forEach(cross =>
      this.marker.addLayer(L.marker([cross.x, cross.y], {
        icon: Treasure.crossIcon,
        pane: 'treasureX',
      })
        .bindPopup(this.popupContent.bind(this), { minWidth: 300 })
      )
    );
    this.onMap = this.onMap;
  }
  popupContent() {
    const snippet = document.createElement('div');
    snippet.classList.add('handover-wrapper-with-no-influence');
    snippet.innerHTML = `
        <h1 data-text="${this.text}"></h1>
        <button type="button" class="btn btn-info remove-button" data-text="map.remove"></button>
    `;
    Language.translateDom(snippet);
    snippet.querySelector('button').addEventListener('click', () => this.onMap = false);
    return snippet;
  }
  set onMap(state) {
    if (state) {
      const method = enabledCategories.includes('treasure') ? 'addLayer' : 'removeLayer';
      Treasure.layer[method](this.marker);
      this.element.classList.remove('disabled');
      localStorage.setItem(this._shownKey, 'true');
    } else {
      Treasure.layer.removeLayer(this.marker);
      this.element.classList.add('disabled');
      localStorage.removeItem(this._shownKey);
    }
  }
  get onMap() {
    return !!localStorage.getItem(this._shownKey);
  }
  static onCategoryToggle() {
    Treasure.treasures.forEach(treasure => treasure.onMap = treasure.onMap);
  }
}