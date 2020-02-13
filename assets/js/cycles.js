var Cycles = {
  categories: [],
  data: [],
  offset: 0,
  unknownCycleNumber: 7,
  forwardMaxOffset: 1,
  backwardMaxOffset: 7,

  load: function () {
    $.getJSON('data/cycles.json?nocache=' + nocache)
      .done(function (_data) {
        Cycles.data = _data;
        Cycles.getTodayCycle();
      });
    console.info('%c[Cycles] Loaded!', 'color: #bada55; background: #242424');
  },
  getTodayCycle: function () {
    var utcDate = new Date();
    var utcYesterdayDate = new Date();
    utcDate.setUTCDate(utcDate.getUTCDate() + Cycles.offset);
    utcYesterdayDate.setUTCDate(utcYesterdayDate.getUTCDate() - 1 + Cycles.offset);

    if (Cycles.offset !== 0)
      $('div>span.cycle-data').addClass('highlight-important-items-menu');
    else
      $('div>span.cycle-data').removeClass('highlight-important-items-menu');

    var yesterday_data = Cycles.data.filter(_c => { return _c.date === utcYesterdayDate.toISOString().split('T')[0] })[0];

    var _data = Cycles.data.filter(_c => { return _c.date === utcDate.toISOString().split('T')[0]})[0];

    if (_data == null) {
      console.error('[Cycles] Cycle not found: ' + utcDate.toISOString().split('T')[0]);
      return;
    }

    Cycles.categories.date = _data.date;
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
    Cycles.categories.yesterday = yesterday_data;
    Cycles.setCustomCycles();
    Cycles.setCycles();
    Cycles.setLocaleDate();
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
          Cycles.categories.card_cups = _cycles[1];
          Cycles.categories.card_pentacles = _cycles[1];
          Cycles.categories.card_swords = _cycles[1];
          Cycles.categories.card_wands = _cycles[1];
          Cycles.categories.lost_bracelet = _cycles[2];
          Cycles.categories.lost_earrings = _cycles[2];
          Cycles.categories.lost_necklaces = _cycles[2];
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
      $(`input[name=${category}]`).val(Cycles.categories[category]);
    }

    MapBase.addMarkers(true);
  },
  setLocaleDate: function () {
    var _date = Cycles.categories.date.split('-');

    $('.cycle-data').text(
      Language.get('menu.date')
        .replace('{month}', Language.get(`menu.month.${_date[1]}`))
        .replace('{day}', _date[2])
    );
    return _date[2];
  },

  checkForUpdate: function () {
    var day = new Date();
    day.setUTCDate(day.getUTCDate() + Cycles.offset);

    if (day.getUTCDate() != Cycles.setLocaleDate())
      Cycles.getTodayCycle();
  },

  isSameAsYesterday: function (category) {
    if (!Cycles.categories.yesterday)
      return;

    var todayCycle = Cycles.categories[category];
    var yesterdayCycle = Cycles.categories.yesterday[Cycles.getCyclesMainCategory(category)];

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
        console.log(`Category '${category}' invalid`);
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

  nextCycle: function () {
    Cycles.offset--;
    if (Cycles.offset < -Cycles.backwardMaxOffset) {
      Cycles.offset = -Cycles.backwardMaxOffset;
      return;
    }

    Inventory.save();
    Cycles.load();
  },

  prevCycle: function () {
    Cycles.offset++;
    if (Cycles.offset > Cycles.forwardMaxOffset) {
      Cycles.offset = Cycles.forwardMaxOffset;
      return;
    }

    Inventory.save();
    Cycles.load();
  }
};

// update to the next cycle
setInterval(function () {
  Cycles.checkForUpdate();
}, 1000 * 10);