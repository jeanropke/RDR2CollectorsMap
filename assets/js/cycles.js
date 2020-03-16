var Cycles = {
  categories: [],
  data: [],
  offset: 0,
  unknownCycleNumber: 7,
  forwardMaxOffset: 1,
  backwardMaxOffset: 7,
  yesterday: [],

  load: function () {
    var date = new Date();
    var dateString = (date.getUTCMonth() + 1) + '-' + date.getUTCDate() + '-' + date.getUTCFullYear();

    $.getJSON(`data/cycles.json?nocache=${nocache}&date=${dateString}`)
      .done(function (_data) {
        Cycles.data = _data;
        Cycles.getTodayCycle();
      });
    console.info('%c[Cycles] Loaded!', 'color: #bada55; background: #242424');
  },
  getFreshSelectedDay: function () {
    'use strict';
    const now = new Date();
    return new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + Cycles.offset
    ));
  },
  getTodayCycle: function () {
    'use strict';
    const selectedDay = Cycles.getFreshSelectedDay();
    const selectedDayStr = selectedDay.toISOString().split('T')[0];
    const cycleIndex = Cycles.data.findIndex(element => element.date === selectedDayStr);

    $('div>span.cycle-data').toggleClass('not-found', Cycles.offset !== 0);

    if (cycleIndex < 1) {
      // either -1 (not found) or 0 (first day) for which there is no yesterday
      console.error('[Cycles] Cycle not found: ' + selectedDayStr);
      $('.map-cycle-alert').removeClass('hidden');
      return;
    }

    const _data = Cycles.data[cycleIndex];
    Cycles.yesterday = Cycles.data[cycleIndex - 1];
    Cycles.selectedDay = selectedDay;
    Cycles.categories.american_flowers = _data.american_flowers;
    Cycles.categories.card_cups = _data.tarot_cards;
    Cycles.categories.card_pentacles = _data.tarot_cards;
    Cycles.categories.card_swords = _data.tarot_cards;
    Cycles.categories.card_wands = _data.tarot_cards;
    Cycles.categories.lost_bracelet = _data.lost_jewelry;
    Cycles.categories.lost_earrings = _data.lost_jewelry;
    Cycles.categories.lost_necklaces = _data.lost_jewelry;
    Cycles.categories.lost_ring = _data.lost_jewelry;
    Cycles.categories.antique_bottles = _data.antique_bottles;
    Cycles.categories.bird_eggs = _data.bird_eggs;
    Cycles.categories.arrowhead = _data.arrowhead;
    Cycles.categories.family_heirlooms = _data.family_heirlooms;
    Cycles.categories.coin = _data.coin;
    Cycles.categories.random = _data.random;
    Cycles.setCustomCycles();
    Cycles.setCycles();
    Cycles.setLocaleDate();
    Cycles.nextDayDataExists();
  },

  setCustomCycles: function () {

    if (getParameterByName('cycles') == null)
      return;

    if (getParameterByName('cycles').includes(',')) {
      var _cycles = getParameterByName('cycles').split(',');
      if (_cycles.length == 9) {
        if (_cycles.some(isNaN)) {
          console.warn('Cycles parameters invalid');
        }
        else {
          Cycles.categories.american_flowers = _cycles[0];
          Cycles.categories.card_cups,
          Cycles.categories.card_pentacles,
          Cycles.categories.card_swords,
          Cycles.categories.card_wands = _cycles[1];
          Cycles.categories.lost_bracelet,
          Cycles.categories.lost_earrings,
          Cycles.categories.lost_necklaces,
          Cycles.categories.lost_ring = _cycles[2];
          Cycles.categories.antique_bottles = _cycles[3];
          Cycles.categories.bird_eggs = _cycles[4];
          Cycles.categories.arrowhead = _cycles[5];
          Cycles.categories.family_heirlooms = _cycles[6];
          Cycles.categories.coin = _cycles[7];
          Cycles.categories.random = _cycles[8];
        }

      } else {
        console.warn('Cycles parameters invalid');
      }
    }
  },

  setCycles: function () {
    for (var category in Cycles.categories) {
      var cycle = Cycles.categories[category];
      $(`input[name=${category}]`).val(cycle);
      $(`.cycle-icon[data-type=${category}]`).attr("src", `./assets/images/cycle_${cycle}.png`).attr("alt", `Cycle ${cycle}`);
    }

    MapBase.addMarkers(true);
  },
  setLocaleDate: function () {
    'use strict';
    const options = { timeZone: "UTC", day: "2-digit", month: "long" };
    $('.cycle-data').text(Cycles.selectedDay.toLocaleString(Settings.language, options));
  },

  checkForUpdate: function () {
    'use strict';
    if (Cycles.getFreshSelectedDay().valueOf() !== Cycles.selectedDay.valueOf()) {
      if (Cycles.offset !== 1) {
        Cycles.offset = 0;
        Cycles.getTodayCycle();
      }
      else {
        Cycles.offset = 0;
        $('div>span.cycle-data').removeClass('not-found');
      }
    }
  },

  isSameAsYesterday: function (category) {
    if (!Cycles.yesterday)
      return;

    var todayCycle = Cycles.categories[category];
    var yesterdayCycle = Cycles.yesterday[Cycles.getCyclesMainCategory(category)];

    return todayCycle == yesterdayCycle;
  },

  nextDayDataExists: function () {
    var newDate = new Date();
    newDate.setUTCDate(newDate.getUTCDate() + Cycles.forwardMaxOffset);
    var nextDayCycle = Cycles.data.findIndex(element => element.date === newDate.toISOString().split('T')[0]);
    if (nextDayCycle === -1 && Cycles.forwardMaxOffset > 0) {  // protect function, otherwise with no data function can loop to -infinity
      Cycles.forwardMaxOffset--;
      Cycles.nextDayDataExists();
      return;
    }
    if (Cycles.forwardMaxOffset === 0 && Cycles.offset === 0)
      $('#cycle-next').addClass('disable-cycle-changer-arrow');
    else if (Cycles.offset === 0)
      $('#cycle-next').removeClass('disable-cycle-changer-arrow');
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
    var _cycles = [];

    //'old cycle': 'new cycle'
    switch (category) {
      case "arrowhead":
      case "antique_bottles":
      case "lost_bracelet":
      case "lost_earrings":
      case "lost_necklaces":
      case "lost_ring":
        _cycles = {
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
      case "card_cups":
      case "card_pentacles":
      case "card_swords":
      case "card_wands":
      case "american_flowers":
        _cycles = {
          '2': 1,
          '3': 2,
          '1': 3,
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
    var color = "";
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

    $('#cycle-next').removeClass('disable-cycle-changer-arrow');

    if (Cycles.offset <= -Cycles.backwardMaxOffset)
      $('#cycle-prev').addClass('disable-cycle-changer-arrow');

    if (Cycles.offset < -Cycles.backwardMaxOffset) {
      Cycles.offset = -Cycles.backwardMaxOffset;
      return;
    }

    Cycles.getTodayCycle();
  },

  nextCycle: function () {
    Cycles.offset++;

    $('#cycle-prev').removeClass('disable-cycle-changer-arrow');

    if (Cycles.offset >= Cycles.forwardMaxOffset)
      $('#cycle-next').addClass('disable-cycle-changer-arrow');

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

// update to the next cycle
setInterval(Cycles.checkForUpdate, 1000 * 10);