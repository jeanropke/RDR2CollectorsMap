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
          if ($(`.menu-hidden[data-type=${category}]`).children(`p.collectible[data-type=${marker.subdata}]`).length > 0)
            return;


          var colelctibleName = null;
          if ((marker.category == 'american_flowers'))
            colelctibleName = Language.get(`flower_${marker.subdata}.name`);
          else if (marker.category == 'bird_eggs')
            colelctibleName = Language.get(`egg_${marker.subdata}.name`);

          var collectibleElement = $('<p>').addClass('collectible').attr('data-type', marker.subdata).text(colelctibleName);
          var collectibleCountElement = $('<small>').addClass('counter').text(marker.amount);

          $('.menu-hidden[data-type=' + marker.category + ']').append(collectibleElement.append(collectibleCountElement));
          if (marker.amount == 10) {
            $(`p[data-type=${marker.subdata}]`).addClass('disabled');
          }
          if (marker.lat.length == 0)
            $(`p[data-type=${marker.subdata}]`).addClass('not-found');
          
          //set green color of weekly collection items (flowers and eggs)
          for (var i = 0, weeklyItemsLength = weeklyItems.length; i < weeklyItemsLength; i++) {
            if ((`flower_${marker.subdata}`) == weeklyItems[i].item || (`egg_${marker.subdata}`) == weeklyItems[i].item) {
              $(`p[data-type=${marker.subdata}]`).addClass('weekly-item');
            }
          }
        } else {
          //All others items
          var collectibleElement = $('<p>').addClass('collectible').attr('data-type', marker.text).text(marker.title);
          var buttonsElement = $('div').addClass('');
          var collectibleCountElement = $('<small>').addClass('counter').text(marker.amount);
          $(`.menu-hidden[data-type=${category}]`).append(collectibleElement.append(collectibleCountElement));

          if (marker.lat.length == 0)
            $(`[data-type=${marker.text}]`).addClass('not-found');

          if (!marker.canCollect) {
            $(`[data-type=${marker.text}]`).addClass('disabled');
          }
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

// Auto fill debug markers inputs, when show coordinates on click is enabled
Menu.liveUpdateDebugMarkersInputs = function (lat, lng) {
  $('#debug-marker-lat').val(lat);
  $('#debug-marker-lng').val(lng);
  // Auto remove coordinates when show coordinates on click is disabled
  $('#show-coordinates').on('change', function () {
    $('#debug-marker-lat').val('');
    $('#debug-marker-lng').val('');
    $('#debug-marker-name').val('')
  });
}