/**
 * Created by Jean on 2019-10-09.
 */

var Menu = {
  reorderMenu: function (menu) {
    $(menu).children().sort(function (a, b) {
      return a.textContent.localeCompare(b.textContent);
    }).appendTo(menu);
  }
};
Menu.refreshMenu = function () {
  var weeklyItems = weeklySetData.sets[weeklySetData.current];
  $.each(categories, function (key, category) {

    $('.menu-hidden[data-type=' + category + ']').children('p.collectible').remove();

    if (categoriesDisabledByDefault.includes(category))
      $('.menu-option.clickable[data-type=' + category + ']').children('span').addClass('disabled');

    $.each(markers, function (_key, marker) {
      if (marker.day == Cycles.data.cycles[Cycles.data.current][category] && marker.category == category) {
        if (marker.subdata) {
          //This is for items with subdata to merge them
          if ($(`.menu-hidden[data-type=${category}]`).children(`[data-type=${marker.subdata}]`).length > 0)
            return;

          var collectibleImage = null;
          var collectibleName = null;

          if (marker.category == 'american_flowers') {
            collectibleImage = $('<img>').attr('src', `./assets/images/icons/game/flower_${marker.subdata}.png`).addClass('collectible-icon');
            collectibleName = Language.get(`flower_${marker.subdata}.name`);
          } else if (marker.category == 'bird_eggs') {
            collectibleImage = $('<img>').attr('src', `./assets/images/icons/game/egg_${marker.subdata}.png`).addClass('collectible-icon');
            collectibleName = Language.get(`egg_${marker.subdata}.name`);
          }

          var collectibleElement = $('<div>').addClass('collectible-wrapper').attr('data-type', marker.subdata);
          var collectibleTextElement = $('<p>').addClass('collectible').addClass(marker.text).text(collectibleName);
          var collectibleCountElement = $('<small>').addClass('counter').text(marker.amount);

          $('.menu-hidden[data-type=' + marker.category + ']').append(collectibleElement.append(collectibleImage).append(collectibleTextElement.append(collectibleCountElement)));

          if (marker.amount == 10)
            $(`[data-type=${marker.subdata}]`).addClass('disabled');

          if (marker.lat.length == 0)
            $(`[data-type=${marker.subdata}]`).addClass('not-found');

          //set green color of weekly collection items (flowers and eggs)
          for (var i = 0, weeklyItemsLength = weeklyItems.length; i < weeklyItemsLength; i++) {
            if ((`flower_${marker.subdata}`) == weeklyItems[i].item || (`egg_${marker.subdata}`) == weeklyItems[i].item) {
              $(`[data-type=${marker.subdata}]`).addClass('weekly-item');
            }
          }
        } else {
          //All others items
          var collectibleImage = null;

          switch (marker.category) {
            // Random items don't even have a openable menu, don't do anything.
            case 'random':
              collectibleImage = null;
              break;
            // Use the generic cards icons for now, might improve later. Keep for now...
            case 'card_cups':
              collectibleImage = $('<img>').attr('src', `./assets/images/icons/game/card_cups.png`).addClass('collectible-icon');
              break;
            case 'card_pentacles':
              collectibleImage = $('<img>').attr('src', `./assets/images/icons/game/card_pentacles.png`).addClass('collectible-icon');
              break;
            case 'card_swords':
              collectibleImage = $('<img>').attr('src', `./assets/images/icons/game/card_swords.png`).addClass('collectible-icon');
              break;
            case 'card_wands':
              collectibleImage = $('<img>').attr('src', `./assets/images/icons/game/card_wands.png`).addClass('collectible-icon');
              break;
            // Everything else can be obtained from `{marker.text}.png`.
            default:
              collectibleImage = $('<img>').attr('src', `./assets/images/icons/game/${marker.text}.png`).addClass('collectible-icon')
              break;
          }

          var collectibleElement = $('<div>').addClass('collectible-wrapper').attr('data-type', marker.text);
          var collectibleTextElement = $('<p>').addClass('collectible').addClass(marker.text).text(marker.title);
          var collectibleCountElement = $('<small>').addClass('counter').text(marker.amount);

          $(`.menu-hidden[data-type=${category}]`).append(collectibleElement.append(collectibleImage).append(collectibleTextElement.append(collectibleCountElement)));

          if (marker.lat.length == 0)
            $(`[data-type=${marker.text}]`).addClass('not-found');

          if (!marker.canCollect)
            $(`[data-type=${marker.text}]`).addClass('disabled');

          // set green color of weekly collection items (other items)
          for (var i = 0, weeklyItemsLength = weeklyItems.length; i < weeklyItemsLength; i++) {
            if ((marker.text) == weeklyItems[i].item) {
              $(`[data-type=${marker.text}]`).addClass('weekly-item');
            }
          }
        }
      }
    });
    $('.menu-hidden[data-type=treasure]').children('p.collectible').remove();

    treasureData.filter(function (item) {
      $('.menu-hidden[data-type=treasure]').append('<p class="collectible disabled" data-type="' + item.text + '">' + Language.get(item.text) + '</p>');
    });
  });

  $.each(categoriesDisabledByDefault, function (key, value) {
    if (value.length > 0) {
      $('span[data-type=' + value + ']').addClass('disabled');
      $('p[data-type=' + value + ']').addClass('disabled');
    }
  });

  Menu.reorderMenu('.menu-hidden[data-type=treasure]');
};

Menu.showAll = function () {
  $.each(categoryButtons, function (key, value) {
    $(value).children('span').removeClass("disabled")
  });
  enabledCategories = categories;
  MapBase.addMarkers();
};

Menu.hideAll = function () {
  $.each(categoryButtons, function (key, value) {
    $(value).children('span').addClass("disabled")
  });

  enabledCategories = [];
  MapBase.addMarkers();
  Treasures.addToMap();
  Encounters.addToMap();
};

Menu.refreshItemsCounter = function () {

  $('.collectables-counter').text(Language.get('menu.collectables_counter')
    .replace('{count}', markers.filter(item => item.day == Cycles.data.cycles[Cycles.data.current][item.category] && item.isVisible && (item.isCollected || item.amount == 10)).length)
    .replace('{max}', markers.filter(item => item.day == Cycles.data.cycles[Cycles.data.current][item.category] && item.isVisible).length));
};