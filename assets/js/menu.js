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
      if (marker.day == Cycles.data.cycles[Cycles.data.current][category] && marker.category == category) {
        if (marker.subdata) {
          //This is for items with subdata to merge them
          //TODO: create a 'marker' to subdata with item amount
          if ($(`.menu-hidden[data-type=${category}]`).children(`p.collectible[data-type=${marker.subdata}]`).length > 0)
            return;
          
          var collectibleElement = $('<p>').addClass('collectible').attr('data-type', marker.subdata).text(Language.get(`${marker.text}.name`).split('#')[0]);
          var collectibleCountElement = $('<small>').addClass('counter').text(marker.amount);

          $('.menu-hidden[data-type=' + marker.category + ']').append(collectibleElement.append(collectibleCountElement));
          if (marker.amount == 10) {       
            $(`p[data-type=${marker.subdata}]`).addClass('disabled');
          }
        }
        else {
          //All others items
          var collectibleElement = $('<p>').addClass('collectible').attr('data-type', marker.text).text(marker.title);
          var buttonsElement = $('div').addClass('');
          var collectibleCountElement = $('<small>').addClass('counter').text(marker.amount);
          $(`.menu-hidden[data-type=${category}]`).append(collectibleElement.append(collectibleCountElement));

          if(marker.lat.length == 0)
            $(`[data-type=${marker.text}]`).addClass('not-found');

          if (!marker.canCollect) {            
            $(`[data-type=${marker.text}]`).addClass('disabled');
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
