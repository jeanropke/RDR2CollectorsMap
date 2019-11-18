/**
 * Created by Jean on 2019-10-09.
 */

var Menu = {};
Menu.refreshMenu = function() {
  $.each(categories, function(key, category) {

    $('.menu-hidden[data-type=' + category + ']').children('p.collectible').remove();
    $.each(markers, function(_key, marker) {
      if (marker.day == day && marker.category == category) {
        if (marker.subdata) {
          //This is for plants only
          if ($(`.menu-hidden[data-type='american_flowers']`).children(`p.collectible[data-type=${marker.subdata}]`).length > 0)
            return;

          var tempName = Language.get(`${marker.text}.name`);
          $('.menu-hidden[data-type=' + marker.category + ']').append(`<p class="collectible" data-type="${marker.subdata}">${tempName.split('#')[0]}</p>`);
        } else {
          //All others items
          $(`.menu-hidden[data-type=${category}]`).append(`<p class="collectible" data-type="${marker.text}">${marker.title}</p>`);
        }
      }
    });
    $('.menu-hidden[data-type=treasure]').children('p.collectible').remove();

    treasureData.filter(function(item) {
      $('.menu-hidden[data-type=treasure]').append('<p class="collectible" data-type="' + item.text + '">' + Language.get(item.text) + '</p>');
    });
  });
  $.each(collectedItems, function(key, value) {
    if (value.length > 0) {
      $(`[data-type=${value}]`).addClass('disabled');
    }
  });

  $.each(plantsDisabled, function(key, value) {
    if (value.length > 0) {
      $('[data-type=' + value + ']').addClass('disabled');
    }
  });
};


Menu.showAll = function() {
  $.each(categoryButtons, function(key, value) {
    $(value).children('span').removeClass("disabled")
  });
  enabledCategories = categories;
  MapBase.addMarkers();
  Treasures.addToMap();
};

Menu.hideAll = function() {
  $.each(categoryButtons, function(key, value) {
    $(value).children('span').addClass("disabled")
  });

  enabledCategories = [];
  MapBase.addMarkers();
  Treasures.addToMap();
};

Menu.refreshItemsCounter = function() {
  $('.collectables-counter').text(Language.get('menu.collectables_counter').replace('{count}', (collectedItems.length)).replace('{max}', markers.filter(item => (item.day == day || item.day.includes(day)) && item.isVisible).length));
};
