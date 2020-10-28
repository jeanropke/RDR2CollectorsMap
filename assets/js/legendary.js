class Legendary {
  static init() {

    const start = Date.now();

    this.animals = [];
    this.layer = L.layerGroup();
    this.layer.addTo(MapBase.map);

    const pane = MapBase.map.createPane('animalX');
    pane.style.zIndex = 450; // X-markers on top of circle, but behind “normal” markers/shadows
    pane.style.pointerEvents = 'none';
    this.context = $('.menu-hidden[data-type=legendary_animals]');
    this.spawnIcon = L.icon({
      iconUrl: './assets/images/la_cross.png',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      opacity: 0.75,
    });
    this.onSettingsChanged();
    $('.menu-hidden[data-type="legendary_animals"] > *:first-child a').click(e => {
      e.preventDefault();
      const showAll = $(e.target).attr('data-text') === 'menu.show_all';
      Legendary.animals.forEach(animal => animal.onMap = showAll);
    });
    return Loader.promises['animal_legendary'].consumeJson(data => {
      data.forEach(item => {
        this.animals.push(new Legendary(item));
      });
      this.onLanguageChanged();
      console.info(`%c[Legendary animals] Loaded in ${Date.now() - start}ms!`, 'color: #bada55; background: #242424');
    });
  }
  static onLanguageChanged() {
    Menu.reorderMenu(this.context);
  }
  static onSettingsChanged() {
    this.animals.forEach(animal => animal.reinitMarker());
  }
  // not idempotent (on the environment)
  constructor(preliminary) {
    Object.assign(this, preliminary);
    this._shownKey = `shown.${this.text}`;
    this.element = $('<div class="collectible-wrapper" data-help="item">')
      .on('click', () => this.onMap = !this.onMap)
      .append($('<p class="collectible">').attr('data-text', this.text))
      .translate();
    this.reinitMarker();
    this.element.appendTo(Legendary.context);
  }
  // auto remove marker? from map, recreate marker, auto add? marker
  // idempotent
  reinitMarker() {
    if (this.marker) Legendary.layer.removeLayer(this.marker);
    this.marker = L.layerGroup();
    this.marker.addLayer(L.circle([this.x, this.y], {
        color: "#fdc607",
        fillColor: "#fdc607",
        fillOpacity: linear(Settings.overlayOpacity, 0, 1, 0.1, 0.5),
        radius: this.radius,
      })
      .bindPopup(this.popupContent.bind(this), { minWidth: 400 }));
    this.locations.forEach(point =>
      this.marker.addLayer(L.marker([point.x, point.y], {
          icon: Legendary.spawnIcon,
          pane: 'animalX',
          opacity: .8,
        })
        .bindPopup(this.popupContent.bind(this), { minWidth: 400 }))
    );
    const overlay = `assets/images/icons/game/animals/legendaries/${this.text}.svg?nocache=${nocache}`;
    this.marker.addLayer(L.imageOverlay(overlay, [
      [this.x - this.radius, this.y - this.radius * 2],
      [this.x + this.radius, this.y + this.radius * 2]
    ], {
      opacity: linear(Settings.overlayOpacity, 0, 1, 0.5, 1),
    }));
    this.onMap = this.onMap;
  }
  getAnimalProperties() {
    const spawnTime = (() => {
      let timeString = '';
      const spawnTimes = [].concat(...this.spawn_time);
      spawnTimes.forEach((time, index) => {
        timeString += convertToTime(time) + (index % 2 === 0 ? ' - ' : ', ');
      });
      return timeString.replace(/,\s$/, '');
    })();

    return {
      spawn_time: spawnTime,
      preferred_weather: Language.get(`map.weather.${this.preferred_weather}`),
      trader_materials: this.trader_materials ? this.trader_materials : Language.get('map.cant_be_picked_up'),
      trader_pelt_materials: this.trader_pelt_materials,
      trapper_value: this.trapper_value ? `$${this.trapper_value.toFixed(2)}` : Language.get('map.cant_be_picked_up'),
      trapper_pelt_value: `$${this.trapper_pelt_value.toFixed(2)}`,
      trapper_part_value: `$${this.trapper_part_value.toFixed(2)}`,
      sample_value: `$${this.sample_value.toFixed(2)}`,
    };
  }
  popupContent() {
    const properties = this.getAnimalProperties();
    const snippet = $(`
      <div class="handover-wrapper-with-no-influence">
        <h1 data-text="${this.text}"></h1>
        <p data-text="${Language.get(this.text + '.desc')}"></p>
        <br><p data-text="map.legendary_animal.desc"></p>
        <span class="legendary-properties">
          <p class="legendary-spawn-time" data-text="map.legendary.spawn_time"></p>
          <p class="legendary-preferred-weather" data-text="map.legendary.preferred_weather"></p>
          <p class="legendary-trader-materials" data-text="map.legendary.trader_materials"></p>
          <p class="legendary-trader-pelt-materials" data-text="map.legendary.trader_pelt_materials"></p>
          <p class="legendary-trapper-value" data-text="map.legendary.trapper_value"></p>
          <p class="legendary-trapper-pelt-value" data-text="map.legendary.trapper_pelt_value"></p>
          <p class="legendary-trapper-part-value" data-text="map.legendary.trapper_part_value"></p>
          <p class="legendary-sample-value" data-text="map.legendary.sample_value"></p>
        </span>
        <button type="button" class="btn btn-info remove-button" data-text="map.remove"></button>
      </div>`)
      .translate();

    const pElements = $('span > p', snippet);
    [].forEach.call(pElements, p => {
      const propertyText = Language.get($(p).attr('data-text')).replace(/{([a-z_]+)}/, (full, key) => properties[key]);
      $(p).text(propertyText);
    });

    snippet.find('button').on('click', () => this.onMap = false);
    return snippet[0];
  }
  set onMap(state) {
    if (state) {
      const method = enabledCategories.includes('legendary_animals') ? 'addLayer' : 'removeLayer';
      Legendary.layer[method](this.marker);
      this.element.removeClass('disabled');
      if (!MapBase.isPrewviewMode)
        localStorage.setItem(`rdr2collector:${this._shownKey}`, 'true');
    } else {
      Legendary.layer.removeLayer(this.marker);
      this.element.addClass('disabled');
      if (!MapBase.isPrewviewMode)
        localStorage.removeItem(`rdr2collector:${this._shownKey}`);
    }
  }
  get onMap() {
    return !!localStorage.getItem(`rdr2collector:${this._shownKey}`);
  }
  static onCategoryToggle() {
    Legendary.animals.forEach(animal => animal.onMap = animal.onMap);
  }
}