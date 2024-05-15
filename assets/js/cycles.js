const Cycles = {
  categories: [],
  data: [],
  offset: 0,
  unknownCycleNumber: 0,
  forwardMaxOffset: 1,
  backwardMaxOffset: 7,
  yesterday: [],

  load: function () {
    return Loader.promises['cycles'].consumeJson(_data => {
      Cycles.data = _data;
      console.info('%c[Cycles] Loaded!', 'color: #bada55; background: #242424');
      Cycles.getTodayCycle();
      Cycles.checkForUpdate();
    });
  },

  getFreshSelectedDay: function (offset = Cycles.offset) {
    const now = MapBase.mapTime();
    return new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + offset,
    ));
  },
  getTodayCycle: function () {
    'use strict';
    const selectedDay = Cycles.getFreshSelectedDay();
    const selectedDayStr = selectedDay.toISOUTCDateString();
    const cycleIndex = Cycles.data.findIndex(element => element.date === selectedDayStr);
    let fallback = null;

    document.querySelectorAll('div>span.cycle-date').forEach(element => { element.classList.toggle('not-found', Cycles.offset !== 0); });

    if (cycleIndex < 1) {
      // either -1 (not found) or 0 (first day) for which there is no yesterday
      console.error('[Cycles] Cycle not found: ' + selectedDayStr);

      if (!MapBase.isPreviewMode)
        document.querySelector('.map-cycle-alert').classList.remove('hidden');

      fallback = {
        arrowhead: 1,
        bottle: 1,
        coin: 1,
        egg: 1,
        flower: 1,
        heirlooms: 1,
        lost_jewelry: 1,
        random: 1,
        tarot_cards: 1,
        fossils: 1,
      }
    }

    const _data = fallback || Cycles.data[cycleIndex];
    Cycles.yesterday = Cycles.data[cycleIndex - 1];
    Cycles.selectedDay = selectedDay;
    Cycles.categories.flower = _data.flower;
    Cycles.categories.cups = _data.tarot_cards;
    Cycles.categories.pentacles = _data.tarot_cards;
    Cycles.categories.swords = _data.tarot_cards;
    Cycles.categories.wands = _data.tarot_cards;
    Cycles.categories.jewelry_random = _data.lost_jewelry;
    Cycles.categories.bracelet = _data.lost_jewelry;
    Cycles.categories.earring = _data.lost_jewelry;
    Cycles.categories.necklace = _data.lost_jewelry;
    Cycles.categories.ring = _data.lost_jewelry;
    Cycles.categories.bottle = _data.bottle;
    Cycles.categories.egg = _data.egg;
    Cycles.categories.arrowhead = _data.arrowhead;
    Cycles.categories.heirlooms = _data.heirlooms;
    Cycles.categories.coin = _data.coin;
    Cycles.categories.fossils_random = _data.fossils;
    Cycles.categories.coastal = _data.fossils;
    Cycles.categories.oceanic = _data.fossils;
    Cycles.categories.megafauna = _data.fossils;
    Cycles.categories.random = _data.random;
    Cycles.setLocaleDate();
    Cycles.nextDayDataExists();
    Cycles.setCustomCycles();
    Cycles.setCycles();
  },

  setCustomCycles: function () {
    const param = getParameterByName('cycles');
    if (param == null)
      return;

    if (param.includes(',')) {
      const _cycles = param.split(',');
      if (_cycles.length === 9) {
        if (_cycles.some(isNaN) || _cycles.some((e) => e < 1 || e > 6)) {
          console.warn('Cycles parameters invalid for items.');
        } else {
          Cycles.categories.flower = _cycles[0];
          Cycles.categories.cups = _cycles[1];
          Cycles.categories.pentacles = _cycles[1];
          Cycles.categories.swords = _cycles[1];
          Cycles.categories.wands = _cycles[1];
          Cycles.categories.bracelet = _cycles[2];
          Cycles.categories.earring = _cycles[2];
          Cycles.categories.necklace = _cycles[2];
          Cycles.categories.ring = _cycles[2];
          Cycles.categories.bottle = _cycles[3];
          Cycles.categories.egg = _cycles[4];
          Cycles.categories.arrowhead = _cycles[5];
          Cycles.categories.heirlooms = _cycles[6];
          Cycles.categories.coin = _cycles[7];
          Cycles.categories.random = _cycles[8];
        }
      } else {
        console.warn('Cycles parameters invalid for items.');
      }
    } else if (!isNaN(param) && param > 0 && param < 7) {
      for (const key in Cycles.categories) {
        if (Cycles.categories.hasOwnProperty(key))
          Cycles.categories[key] = param;
      }
    } else {
      console.warn('Cycles parameters invalid for items.');
    }
  },

  setCycles: function () {
    for (const category in Cycles.categories) {
      const cycle = Cycles.categories[category];
      document.querySelectorAll(`input[name="${category}"]`).forEach(element => { element.value = cycle; });
      document.querySelectorAll(`.cycle-icon[data-type="${category}"]`).forEach(element => {
        element.setAttribute("src", `./assets/images/cycle_${cycle}.png`);
        element.setAttribute("alt", `Cycle ${cycle}`);
      });
    }

    MapBase.addMarkers(true);
  },
  setLocaleDate: function () {
    'use strict';
    if (Cycles.selectedDay === undefined) return;
    const options = { timeZone: 'UTC', month: 'long', day: 'numeric' };
    document.querySelectorAll('.cycle-date').forEach(element => { element.textContent = Cycles.selectedDay.toLocaleString(Settings.language, options); });
  },

  checkForUpdate: function () {
    'use strict';
    if (Cycles.selectedDay === undefined) return;
    const remainingTime = Cycles.getFreshSelectedDay(1).valueOf() - MapBase.mapTime();
    setTimeout(() => {
      if (Cycles.offset !== 1) {
        Cycles.offset = 0;
        Cycles.getTodayCycle();
      } else {
        Cycles.offset = 0;
        document.querySelectorAll('div>span.cycle-date').forEach(element => { element.classList.remove('not-found'); });
      }
      MapBase.runOnDayChange();
      Cycles.checkForUpdate();
    }, remainingTime);
  },

  isSameAsYesterday: function (category) {
    if (!Cycles.yesterday) return;

    const todayCycle = Cycles.categories[category];
    const yesterdayCycle = Cycles.yesterday[Cycles.getCyclesMainCategory(category)];

    return todayCycle === yesterdayCycle;
  },

  nextDayDataExists: function () {
    const newDate = MapBase.mapTime();
    newDate.setUTCDate(newDate.getUTCDate() + Cycles.forwardMaxOffset);
    const nextDayCycle = Cycles.data.findIndex(element => element.date === newDate.toISOUTCDateString());
    if (nextDayCycle === -1 && Cycles.forwardMaxOffset > 0) {
      Cycles.forwardMaxOffset--;
      Cycles.nextDayDataExists();
      return;
    }
    if (Cycles.forwardMaxOffset === 0 && Cycles.offset === 0)
      document.getElementById('cycle-next').classList.add('disable-cycle-changer-arrow');
    else if (Cycles.offset === 0)
      document.getElementById('cycle-next').classList.remove('disable-cycle-changer-arrow');
  },

  getCyclesMainCategory: function (category) {
    switch (category) {
      case "cups":
      case "pentacles":
      case "swords":
      case "wands":
        return "tarot_cards";
      case "bracelet":
      case "earring":
      case "necklace":
      case "ring":
        return "lost_jewelry";
      case "oceanic":
      case "coastal":
      case "megafauna":
        return "fossils"
      default:
        return category;
    }
  },

  getInGameCycle: function (category) {
    let _cycles = [];

    //'old cycle': 'new cycle'
    switch (category) {
      case "arrowhead":
      case "bottle":
      case "bracelet":
      case "earring":
      case "necklace":
      case "ring":
        _cycles = {
          '2': 1,
          '3': 2,
          '1': 3,
          '6': 4,
          '4': 5,
          '5': 6
        };
        break;

      case "egg":
      case "heirlooms":
        _cycles = {
          '2': 1,
          '3': 2,
          '1': 3,
          '6': 4,
          '5': 5,
          '4': 6
        };
        break;

      case "coin":
        _cycles = {
          '2': 1,
          '3': 2,
          '1': 3,
          '4': 4,
          '6': 5,
          '5': 6
        };
        break;
      case "cups":
      case "pentacles":
      case "swords":
      case "wands":
      case "flower":
        _cycles = {
          '2': 1,
          '3': 2,
          '1': 3,
          '4': 4,
          '5': 5,
          '6': 6
        };
        break;
      case "oceanic":
      case "coastal":
      case "megafauna":
        _cycles = {
          '1': 1,
          '2': 2,
          '3': 3,
          '4': 4,
          '5': 5,
          '6': 6
        };
        break;

      default:
        console.error(`Category '${category}' invalid.`);
        break;
    }
    return _cycles;
  },
  getCycleColor: function (cycle) {
    let color = "";
    switch (cycle) {
      case 1:
        color = "#35a0d0";
        break;
      case 2:
        color = "#ef932f";
        break;
      case 3:
        color = "#c74db0";
        break;
      case 4:
        color = "#573767";
        break;
      case 5:
        color = "#993033";
        break;
      case 6:
        color = "#005f9a";
        break;
    }
    return color;
  },

  prevCycle: function () {
    Cycles.offset--;

    document.getElementById('cycle-next').classList.remove('disable-cycle-changer-arrow');

    if (Cycles.offset <= -Cycles.backwardMaxOffset)
      document.getElementById('cycle-prev').classList.add('disable-cycle-changer-arrow');

    if (Cycles.offset < -Cycles.backwardMaxOffset) {
      Cycles.offset = -Cycles.backwardMaxOffset;
      return;
    }

    Cycles.getTodayCycle();
  },

  nextCycle: function () {
    Cycles.offset++;

    document.getElementById('cycle-prev').classList.remove('disable-cycle-changer-arrow');

    if (Cycles.offset >= Cycles.forwardMaxOffset)
      document.getElementById('cycle-next').classList.add('disable-cycle-changer-arrow');

    if (Cycles.offset > Cycles.forwardMaxOffset) {
      Cycles.offset = Cycles.forwardMaxOffset;
      return;
    }

    Cycles.getTodayCycle();
  },

  resetCycle: function () {
    Cycles.offset = 0;
    Cycles.getTodayCycle();
  }
};