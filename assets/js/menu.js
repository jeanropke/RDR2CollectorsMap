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
  $.each(categories, function (key, category) {

    $('.menu-hidden[data-type=' + category + ']').children('p.collectible').remove();

    if (categoriesDisabledByDefault.includes(category))
      $('.menu-option.clickable[data-type=' + category + ']').children('span').addClass('disabled');

    $.each(markers, function (_key, marker) {
      if (marker.day == day && marker.category == category) {
        if (marker.subdata) {
          //This is for plants only
          if ($(`.menu-hidden[data-type='american_flowers']`).children(`p.collectible[data-type=${marker.subdata}]`).length > 0)
            return;

          var collectibleElement = $('<p>').addClass('collectible').attr('data-type', marker.subdata).text(Language.get(`${marker.text}.name`).split('#')[0]);

          $('.menu-hidden[data-type=' + marker.category + ']').append(collectibleElement);
        } else {
          //All others items
          $(`.menu-hidden[data-type=${category}]`).append(`<p class="collectible" data-type="${marker.text}">${marker.title}</p>`);
        }
      }
    });
    $('.menu-hidden[data-type=treasure]').children('p.collectible').remove();

    treasureData.filter(function (item) {
      $('.menu-hidden[data-type=treasure]').append('<p class="collectible" data-type="' + item.text + '">' + Language.get(item.text) + '</p>');
    });
  });
  $.each(collectedItems, function (key, value) {
    if (value.length > 0) {
      $(`[data-type=${value}]`).addClass('disabled');
    }
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
  var counterCollected = 0;
  collectedItems.filter(function (marker) {
    markers.filter(
      function (item) {
        if (item.text == marker && item.day == day && item.isVisible && item.isCollected) {
          counterCollected++;
        }
      });
  });
  $('.collectables-counter').text(Language.get('menu.collectables_counter')
    .replace('{count}', (counterCollected))
    .replace('{max}', markers.filter(item => (item.day == day || item.day.includes(day)) && item.isVisible).length));
};
