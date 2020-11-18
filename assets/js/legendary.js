class Legendary {
  static init() {
    const start = Date.now();

    this.animals = [];
    this.layer = L.layerGroup();
    this.layer.addTo(MapBase.map);
    this.context = $('.menu-hidden[data-type=legendary_animals]');
    const pane = MapBase.map.createPane('animalSpawnPoint');
    pane.style.zIndex = 450; // markers on top of circle, but behind “normal” markers/shadows
    pane.style.pointerEvents = 'none';

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
      this.checkSpawnTime();
    });
  }
  static onLanguageChanged() {
    Menu.reorderMenu(this.context);
    this.onSettingsChanged();
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
    this.species = this.text.replace(/^mp_animal_|_legendary_\d+$/g, '');
    this.animalSpeciesKey = `rdr2collector:Legendaries_category_time_${this.species}`;
    this.reinitMarker();
    this.element.appendTo(Legendary.context);
  }
  // auto remove marker? from map, recreate marker, auto add? marker
  reinitMarker() {
    if (this.marker) Legendary.layer.removeLayer(this.marker);
    this.marker = L.layerGroup();
    if (Settings.isLaBgEnabled) {
      this.marker.addLayer(L.circle([this.x, this.y], {
        color: this.isGreyedOut ? '#c4c4c4' : "#fdc607",
        fillColor: this.isGreyedOut ? '#c4c4c4' : "#fdc607",
        fillOpacity: linear(Settings.overlayOpacity, 0, 1, 0.1, 0.5),
        radius: this.radius,
      })
        .bindPopup(this.popupContent.bind(this), { minWidth: 400 }));
    }
    this.spawnIcon = L.icon({
      iconUrl: `./assets/images/icons/legendary_animal_heads/blip_mp_${this.species}.png`,
      iconSize: [16 * Settings.markerSize, 16 * Settings.markerSize],
      iconAnchor: [8 * Settings.markerSize, 8 * Settings.markerSize],
    });
    this.locations.forEach(point =>
      this.marker.addLayer(L.marker([point.x, point.y], {
          icon: this.spawnIcon,
          pane: 'animalSpawnPoint',
          opacity: this.isGreyedOut ? .25 : 1,
        })
        .bindPopup(this.popupContent.bind(this), { minWidth: 400 }))
    );
    if (!MapBase.isPreviewMode && Settings.isLaBgEnabled) {
      const overlay = `assets/images/icons/game/animals/legendaries/${this.text}.svg?nocache=${nocache}`;
      this.marker.addLayer(L.imageOverlay(overlay, [
        [this.x - this.radius, this.y - this.radius * 2],
        [this.x + this.radius, this.y + this.radius * 2]
      ], {
        opacity: linear(Settings.overlayOpacity, 0, 1, 0.5, 1),
      }));
    }
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
      animalSpecies: this.species,
      spawn_time: spawnTime,
      preferred_weather: Language.get(`map.weather.${this.preferred_weather}`),
      trader_materials: this.trader_materials ? this.trader_materials : Language.get('map.cant_be_picked_up'),
      trader_pelt_materials: this.trader_pelt_materials,
      trapper_value: this.trapper_value ? `$${this.trapper_value.toFixed(2)}` : Language.get('map.cant_be_picked_up'),
      trapper_pelt_value: `$${this.trapper_pelt_value.toFixed(2)}`,
      trapper_part_value: `$${this.trapper_part_value.toFixed(2)}`,
      sample_value: `$${this.sample_value.toFixed(2)}`,
      animal_category: this.animal_category,
    };
  }
  popupContent() {
    const properties = this.getAnimalProperties();
    const snippet = $(`
      <div class="handover-wrapper-with-no-influence">
        <h1 data-text="${this.text}"></h1>
        <p class="legendary-cooldown-timer" data-text="map.legendary_animal_cooldown_end_time"></p>
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
        <button type="button" class="btn btn-info remove-button remove-animal-category" data-text="map.remove.animal_category"></button>
        <button type="button" class="btn btn-info remove-button reset-animal-timer" data-text="map.reset_animal_timer"></button>
        <button type="button" class="btn btn-info remove-button remove-animal" data-text="map.remove"></button>
      </div>`)
      .translate();

    const pElements = $('span > p', snippet);
    [...pElements].forEach(p => {
      const propertyText = Language.get($(p).attr('data-text')).replace(/{([a-z_]+)}/, (full, key) => properties[key]);
      $(p).text(propertyText);
    });

    if (this.isGreyedOut) {
      const $cooldownTimer = $('.legendary-cooldown-timer', snippet);
      $cooldownTimer.text(Language.get($cooldownTimer.attr('data-text'))
        .replace('{timer}', () => {
          const timeMilliseconds = +localStorage.getItem(this.animalSpeciesKey);
          const timer = new Date(timeMilliseconds)
            .toLocaleString(Settings.language, {
              weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
            });
          return `[${timer}]`;
        })
      );
    }

    snippet
      .find('.legendary-cooldown-timer')
        .toggle(this.isGreyedOut)
      .end()
      .find('button.remove-animal-category')
        .toggle(!this.isGreyedOut)
        .on('click', () => this.isGreyedOut = true)
      .end()
      .find('button.reset-animal-timer')
        .toggle(this.isGreyedOut)
        .on('click', () => this.isGreyedOut = false)
      .end()
      .find('button.remove-animal')
        .on('click', () => this.onMap = false)
      .end();

    return snippet[0];
  }
  static toggleAnimalSpecies(animalSpecies) {
    Legendary.animals.forEach(animal => {
      const _prop = animal.getAnimalProperties();
      if (_prop.animalSpecies === animalSpecies)
        animal.reinitMarker();
    });
  }
  static checkSpawnTime() {
    const animalSpeciesSet = new Set();
    Legendary.animals.forEach(animal => {
      const _prop = animal.getAnimalProperties();
      animalSpeciesSet.add(_prop.animalSpecies);
    });

    setInterval(() => {
      animalSpeciesSet.forEach(animalSpecies => {
        const key = `rdr2collector:Legendaries_category_time_${animalSpecies}`;
        if (!(key in localStorage)) return;

        const time = localStorage.getItem(key);
        if (time <= Date.now()) {
          localStorage.removeItem(key);
          Legendary.toggleAnimalSpecies(animalSpecies);
        }
      });
    }, 2000);
  }
  set isGreyedOut(state) {
    if (state)
      localStorage.setItem(this.animalSpeciesKey, Date.now() + 259200000); // 259200000 ms = 72 hours
    else
      localStorage.removeItem(this.animalSpeciesKey);

    Legendary.toggleAnimalSpecies(this.species);
  }
  get isGreyedOut() {
    return !!localStorage.getItem(this.animalSpeciesKey);
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