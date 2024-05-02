class Legendary {
  static init() {
    const start = Date.now();

    this.animals = [];
    this.layer = L.layerGroup();
    this.layer.addTo(MapBase.map);
    this.context = document.querySelector('.menu-hidden[data-type=legendary_animals]');
    const pane = MapBase.map.createPane('animalSpawnPoint');
    pane.style.zIndex = 450; // markers on top of circle, but behind “normal” markers/shadows
    pane.style.pointerEvents = 'none';

    this.onSettingsChanged();
    document.querySelectorAll('.menu-hidden[data-type="legendary_animals"] > *:first-child a').forEach((a) =>
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const showAll = e.target.getAttribute('data-text') === 'menu.show_all';
        Legendary.animals.forEach(animal => animal.onMap = showAll);
      })
    );

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
    this._shownKey = `rdr2collector.shown.${this.text}`;
    this.element = document.createElement('div');
    this.element.classList.add('collectible-wrapper');
    this.element.setAttribute('data-help', 'item');
    this.element.addEventListener('click', () => this.onMap = !this.onMap);
    this.element.innerHTML = `<p class="collectible" data-text="${this.text}"></p>`;
    Language.translateDom(this.element);
    this.species = this.text.replace(/^mp_animal_|_legendary_\d+$/g, '');
    this.animalSpeciesKey = `rdr2collector.Legendaries_category_time_${this.species}`;
    this.preferred_weather = Language.get(`map.weather.${this.preferred_weather}`);
    this.trader_materials = this.trader_materials || Language.get('map.cant_be_picked_up');
    this.trapper_value = this.trapper_value ? `$${this.trapper_value.toFixed(2)}` : Language.get('map.cant_be_picked_up');
    this.trapper_pelt_value = `$${this.trapper_pelt_value.toFixed(2)}`;
    this.trapper_part_value = `$${this.trapper_part_value.toFixed(2)}`;
    this.sample_value = `$${this.sample_value.toFixed(2)}`;
    this.reinitMarker();
    Legendary.context.appendChild(this.element);
  }
  // auto remove marker? from map, recreate marker, auto add? marker
  reinitMarker() {
    if (this.marker) Legendary.layer.removeLayer(this.marker);
    this.marker = L.layerGroup();
    if (Settings.isLaBgEnabled) {
      this.marker.addLayer(L.circle([this.x, this.y], {
          color: this.isGreyedOut ? '#c4c4c4' : '#fdc607',
          fillColor: this.isGreyedOut ? '#c4c4c4' : '#fdc607',
          fillOpacity: linear(Settings.overlayOpacity, 0, 1, .1, .2),
          radius: this.radius,
          opacity: linear(Settings.overlayOpacity, 0, 1, .2, .6),
        })
        .bindPopup(this.popupContent.bind(this), { minWidth: 400 })
      );
    }

    const iconType = Settings.legendarySpawnIconType;
    const spawnIconSize = Settings.legendarySpawnIconSize;
    const isGold = MapBase.isDarkMode() ? 'gold_' : '';

    this.spawnIcon = new L.Icon.TimedData({
      iconUrl: `./assets/images/icons/game/animals/legendaries/small/${iconType}_${isGold}${this.species}.png?nocache=${nocache}`,
      iconSize: [16 * spawnIconSize, 16 * spawnIconSize],
      iconAnchor: [8 * spawnIconSize, 8 * spawnIconSize],
      time: this.spawn_time.reduce((acc, [start, end]) => [...acc, ...timeRange(start, end)], []),
    });
    this.locations.forEach(point =>
      this.marker.addLayer(L.marker([point.x, point.y], {
          icon: this.spawnIcon,
          pane: 'animalSpawnPoint',
          opacity: this.isGreyedOut ? .25 : 1,
        })
        .bindPopup(this.popupContent.bind(this), {
          minWidth: 400
        })
      )
    );
    if (!MapBase.isPreviewMode && Settings.isLaBgEnabled) {
      const overlay = `assets/images/icons/game/animals/legendaries/${this.text}.svg?nocache=${nocache}`;
      this.marker.addLayer(L.imageOverlay(overlay, [
        [this.x - this.radius, this.y - this.radius * 2],
        [this.x + this.radius, this.y + this.radius * 2]
      ], {
        opacity: MapBase.isDarkMode() ? linear(Settings.overlayOpacity, 0, 1, .1, .5) : linear(Settings.overlayOpacity, 0, 1, .5, .8),
      }));
    }
    this.onMap = this.onMap;
  }
  popupContent() {
    const snippet = document.createElement('div');
    snippet.classList.add('handover-wrapper-with-no-influence');
    snippet.innerHTML = `
      <img class="legendary-animal-popup-image" src="assets/images/icons/game/animals/legendaries/${this.text}.svg" alt="Animal">
      <h1 data-text="${this.text}"></h1>
      <p class="legendary-cooldown-timer" data-text="map.legendary_animal_cooldown_end_time"></p>
      <p data-text="${Language.get(this.text + '.desc')}"></p>
      <br><p data-text="map.legendary_animal.desc"></p>
      <span class="legendary-properties">
        <p class="legendary-spawn-time" data-text="map.legendary.spawn_time_string"></p>
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
    `;
    Language.translateDom(snippet);

    this.spawn_time_string = this.spawn_time.map(timeRange => timeRange.map(hour => convertToTime(hour)).join(' - ')).join(', ');

    snippet.querySelectorAll('span > p').forEach(p => {
      const propertyText = Language.get(p.getAttribute('data-text')).replace(/{([a-z_]+)}/, (full, key) => this[key]);
      p.textContent = propertyText;
    });

    if (this.isGreyedOut) {
      const cooldownTimer = snippet.querySelector('.legendary-cooldown-timer');
      cooldownTimer.textContent = Language.get(cooldownTimer.getAttribute('data-text'))
        .replace('{timer}', () => {
          const timeMilliseconds = +localStorage.getItem(this.animalSpeciesKey);
          return new Date(timeMilliseconds)
            .toLocaleString(Settings.language, {
              weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
            });
      });
    }
    snippet.querySelector('.legendary-cooldown-timer').style.display = this.isGreyedOut ? '' : 'none';
    snippet.querySelector('button.remove-animal-category').style.display = !this.isGreyedOut ? '' : 'none';
    snippet.querySelector('button.remove-animal-category').addEventListener('click', () => this.isGreyedOut = true);
    snippet.querySelector('button.reset-animal-timer').style.display = this.isGreyedOut ? '' : 'none';
    snippet.querySelector('button.reset-animal-timer').addEventListener('click', () => this.isGreyedOut = false);
    snippet.querySelector('button.remove-animal').addEventListener('click', () => this.onMap = false);

    return snippet;
  }
  static toggleAnimalSpecies(animalSpecies) {
    Legendary.animals.forEach(animal => {
      if (animal.species === animalSpecies)
        animal.reinitMarker();
    });
  }
  static checkSpawnTime() {
    const animalSpeciesSet = new Set();
    Legendary.animals.forEach(animal => {
      animalSpeciesSet.add(animal.species);
    });

    setInterval(() => {
      animalSpeciesSet.forEach(animalSpecies => {
        const key = `rdr2collector.Legendaries_category_time_${animalSpecies}`;
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
      this.element.classList.remove('disabled');
      if (!MapBase.isPrewviewMode)
        localStorage.setItem(this._shownKey, 'true');
    } else {
      Legendary.layer.removeLayer(this.marker);
      this.element.classList.add('disabled');
      if (!MapBase.isPrewviewMode)
        localStorage.removeItem(this._shownKey);
    }
  }
  get onMap() {
    return !!localStorage.getItem(this._shownKey);
  }
  static onCategoryToggle() {
    Legendary.animals.forEach(animal => animal.onMap = animal.onMap);
  }
}