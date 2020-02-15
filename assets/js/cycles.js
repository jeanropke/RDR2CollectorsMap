const Cycles = {
  categories: [],
  data: [],
  offset: 0,
  unknownCycleNumber: 7,
  forwardMaxOffset: 1,
  backwardMaxOffset: 7,
  yesterday: [],

  load: function () {
    $.getJSON('data/cycles.json?nocache=' + nocache)
      .done(function (data) {
        Cycles.data = data;
        Cycles.getTodayCycle();
      });
    console.info('%c[Cycles] Loaded!', 'color: #bada55; background: #242424');
  },

  getFreshSelectedDay: function () {
    const now = new Date();
    return new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + Cycles.offset
    ));
  },

  getTodayCycle: function () {
    const selectedDay = Cycles.getFreshSelectedDay();
    const selectedDayStr = selectedDay.toISOString().split('T')[0];
    const cycleIndex = Cycles.data.findIndex((element) => element.date === selectedDayStr);

    $('div>span.cycle-data').toggleClass('highlight-important-items-menu', Cycles.offset !== 0);

    if (cycleIndex < 1) {
      // either -1 (not found) or 0 (first day) for which there is no yesterday
      console.error('[Cycles] Cycle not found: ' + selectedDayStr);
      return;
    }

    const data = Cycles.data[cycleIndex];
    Cycles.yesterday = Cycles.data[cycleIndex - 1];
    Cycles.selectedDay = selectedDay;
    Cycles.categories.american_flowers = data.american_flowers;
    Cycles.categories.card_cups = data.tarot_cards;
    Cycles.categories.card_pentacles = data.tarot_cards;
    Cycles.categories.card_swords = data.tarot_cards;
    Cycles.categories.card_wands = data.tarot_cards;
    Cycles.categories.lost_bracelet = data.lost_jewelry;
    Cycles.categories.lost_earrings = data.lost_jewelry;
    Cycles.categories.lost_necklaces = data.lost_jewelry;
    Cycles.categories.lost_ring = data.lost_jewelry;
    Cycles.categories.antique_bottles = data.antique_bottles;
    Cycles.categories.bird_eggs = data.bird_eggs;
    Cycles.categories.arrowhead = data.arrowhead;
    Cycles.categories.family_heirlooms = data.family_heirlooms;
    Cycles.categories.coin = data.coin;
    Cycles.categories.random = data.random;
    Cycles.setCustomCycles();
    Cycles.setCycles();
    Cycles.setLocaleDate();
  },

  setCustomCycles: function () {
    if (getParameterByName('cycles') == null)
      return;

    if (getParameterByName('cycles').includes(',')) {
      const cycles = getParameterByName('cycles').split(',');
      if (cycles.length == 9) {
        if (cycles.some(isNaN)) {
          console.warn('Cycles parameters invalid');
        }
        else {
          Cycles.categories.american_flowers = cycles[0];
          Cycles.categories.card_cups = cycles[1];
          Cycles.categories.card_pentacles = cycles[1];
          Cycles.categories.card_swords = cycles[1];
          Cycles.categories.card_wands = cycles[1];
          Cycles.categories.lost_bracelet = cycles[2];
          Cycles.categories.lost_earrings = cycles[2];
          Cycles.categories.lost_necklaces = cycles[2];
          Cycles.categories.lost_ring = cycles[2];
          Cycles.categories.antique_bottles = cycles[3];
          Cycles.categories.bird_eggs = cycles[4];
          Cycles.categories.arrowhead = cycles[5];
          Cycles.categories.family_heirlooms = cycles[6];
          Cycles.categories.coin = cycles[7];
          Cycles.categories.random = cycles[8];
        }

      } else {
        console.warn('Cycles parameters invalid');
      }
    }
  },

  setCycles: function () {
    for (let category in Cycles.categories) {
      $(`input[name=${category}]`).val(Cycles.categories[category]);
    }

    MapBase.addMarkers(true);
  },
  setLocaleDate: function () {
    const locale = Settings.language;
    const options = { timeZone: "UTC", month: 'long', day: 'numeric' };
    $('.cycle-data').text(Cycles.selectedDay.toLocaleString(locale, options));
  },

  checkForUpdate: function () {
    if (Cycles.getFreshSelectedDay().valueOf() !== Cycles.selectedDay.valueOf()) {
      Cycles.load();
    }
  },

  isSameAsYesterday: function (category) {
    if (!Cycles.yesterday)
      return;

    const todayCycle = Cycles.categories[category];
    const yesterdayCycle = Cycles.yesterday[Cycles.getCyclesMainCategory(category)];

    return todayCycle == yesterdayCycle;
  },

  getCyclesMainCategory: function (category) {
    switch (category) {
      case "card_cups":
      case "card_pentacles":
      case "card_swords":
      case "card_wands":
        return "tarot_cards";
      case "lost_bracelet":
      case "lost_earrings":
      case "lost_necklaces":
      case "lost_ring":
        return "lost_jewelry";
      default:
        return category;
    }
  },

  getInGameCycle: function (category) {
    let cycles = [];

    //'old cycle': 'new cycle'
    switch (category) {
      case "arrowhead":
      case "antique_bottles":
      case "lost_bracelet":
      case "lost_earrings":
      case "lost_necklaces":
      case "lost_ring":
        cycles = {
          '2': 1,
          '3': 2,
          '1': 3,
          '6': 4,
          '4': 5,
          '5': 6
        };
        break;

      case "bird_eggs":
      case "family_heirlooms":
        cycles = {
          '2': 1,
          '3': 2,
          '1': 3,
          '6': 4,
          '5': 5,
          '4': 6
        };
        break;

      case "coin":
        cycles = {
          '2': 1,
          '3': 2,
          '1': 3,
          '4': 4,
          '6': 5,
          '5': 6
        };
        break;
      case "card_cups":
      case "card_pentacles":
      case "card_swords":
      case "card_wands":
      case "american_flowers":
        cycles = {
          '2': 1,
          '3': 2,
          '1': 3,
          '4': 4,
          '5': 5,
          '6': 6
        };
        break;

      default:
        console.log(`Category '${category}' invalid`);
        break;
    }
    return cycles;
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

  nextCycle: function () {
    Cycles.offset--;
    if (Cycles.offset < -Cycles.backwardMaxOffset) {
      Cycles.offset = -Cycles.backwardMaxOffset;
      return;
    }

    Inventory.save();
    Cycles.getTodayCycle();
  },

  prevCycle: function () {
    Cycles.offset++;
    if (Cycles.offset > Cycles.forwardMaxOffset) {
      Cycles.offset = Cycles.forwardMaxOffset;
      return;
    }

    Inventory.save();
    Cycles.getTodayCycle();
  },

  resetCycle: function () {
    Cycles.offset = 0;
    Inventory.save();
    Cycles.getTodayCycle();
  }
};

// update to the next cycle
setInterval(function () {
  Cycles.checkForUpdate();
}, 1000 * 10);