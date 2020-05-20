/**
 * Created by Jean on 2019-10-09.
 */

var Menu = {
  hasSearchFilters: false,
  hasToolFilters: false,

  updateHasFilters: function () {
    if (Menu.hasSearchFilters && Menu.hasToolFilters) {
      $('.filter-alert span').html(Language.get('map.has_multi_filter_alert'));
      $('.filter-alert').removeClass('hidden');
    } else if (Menu.hasSearchFilters) {
      $('.filter-alert span').html(Language.get('map.has_search_filter_alert'));
      $('.filter-alert').removeClass('hidden');
    } else if (Menu.hasToolFilters) {
      $('.filter-alert span').html(Language.get('map.has_tool_filter_alert'));
      $('.filter-alert').removeClass('hidden');
    } else {
      $('.filter-alert').addClass('hidden');
    }
  },

  reorderMenu: function (menu) {
    $(menu).children().sort(function (a, b) {
      return a.textContent.toLowerCase().localeCompare(b.textContent.toLowerCase());
    }).appendTo(menu);
  },
};

Menu.addCycleWarning = function (element, isSameCycle) {
  var hasCycleWarning = $(`${element} .same-cycle-warning-menu`).length > 0;
  var category = $(element);
  if (isSameCycle && !hasCycleWarning) {
    category.parent().parent().attr('data-help', 'item_category_same_cycle');
    category.append(`<img class="same-cycle-warning-menu" src="./assets/images/same-cycle-alert.png">`);
  } else if (!isSameCycle && hasCycleWarning) {
    category.parent().parent().attr('data-help', 'item_category');
    category.children('.same-cycle-warning-menu').remove();
  }
};

Menu.refreshMenu = function () {
  Collection.updateMenu();
  Menu.addCycleWarning('[data-text="menu.random_spots"]', Cycles.isSameAsYesterday('random'));
  categories.forEach(cat => {
    if (!enabledCategories.includes(cat)) $(`[data-type="${cat}"]`).addClass('disabled');
  });
};

Menu.refreshCollectionCounter = function (category) {
  var collectiblesElement = $(`.menu-hidden[data-type="${category}"]`);
  collectiblesElement.find('.collection-collected').text(Language.get('menu.collection_counter')
    .replace('{count}', collectiblesElement.find('.disabled').length)
    .replace('{max}', collectiblesElement.find('.collectible-wrapper').length));
};

Menu.refreshItemsCounter = function () {
  var _markers = MapBase.markers.filter(marker => marker.isCurrent && marker.isVisible);
  var count = _markers.filter(marker => marker.isCollected).length;
  var max = _markers.length;

  $('.collectables-counter').text(Language.get('menu.collectables_counter')
    .replace('{count}', count)
    .replace('{max}', max));

  $('#item-counter').text(Language.get('menu.collection_counter')
    .replace('{count}', count)
    .replace('{max}', max));

  $('#item-counter-percentage').text(Language.get('menu.collection_counter_percentage')
    .replace('{count}', (count / max * 100).toFixed(2)));

  Menu.refreshTotalInventoryValue();

  $.each($(".menu-hidden[data-type]"), function (key, value) {
    var category = $(value).attr('data-type');
    Menu.refreshCollectionCounter(category);
  });
};

Menu.refreshTotalInventoryValue = function () {
  $('#items-value').text(`$${Collection.totalValue().toFixed(2)}`);
};

Menu.activateHandlers = function () {
  'use strict';
  $('#clear_highlights').on('click', function () {
    MapBase.clearImportantItems();
  });

  // change cycles from menu (if debug options are enabled)
  $('#cycle-prev').on('click', Cycles.prevCycle);
  $('#cycle-next').on('click', Cycles.nextCycle);

  //toggle one collection category or disable/enable all at once
  $('.menu-option[data-type], .links-container a[data-text^="menu."][data-text$="_all"]')
    .on('click', function () {
      'use strict';
      const $this = $(this);
      const category = $this.attr('data-type');
      const toEnable = category ? $this.hasClass('disabled') :
        $this.attr('data-text') === 'menu.show_all';
      const $allButtons = $('.menu-option[data-type], .menu-hidden[data-type]');
      const $buttons = category ? $allButtons.filter(`[data-type="${category}"]`) :
        $allButtons;

      $buttons.toggleClass('disabled', !toEnable);

      if (category && toEnable) {
        enabledCategories.push(category);
      } else if (category) { // disable
        enabledCategories = enabledCategories.filter(cat => cat !== category);
      } else {
        enabledCategories = toEnable ? categories : [];
      }
      localStorage.setItem("enabled-categories", JSON.stringify(enabledCategories));

      if (!category) {
        MapBase.addMarkers();
        Treasure.onCategoryToggle();
        Pins.addToMap();
      } else if (category === 'user_pins') {
        Pins.addToMap();
      } else if (category === 'treasure') {
        Treasure.onCategoryToggle();
      } else {
        MapBase.addMarkers();
      }
    });
  const help = document.getElementById('help-container');
  const $helpParagraph = $(help).children('p');
  $('.side-menu, .top-widget, .lat-lng-container')
    .on('mouseover mouseout', event => {
      const target = event.type === 'mouseover' ? event.target : event.relatedTarget;
      // keep current help if pointer jumped to help container or it overgrew current pointer pos.
      if (help.contains(target)) return;
      const helpTransId = $(target).closest('[data-help]').attr('data-help') || 'default';
      $helpParagraph.html(Language.get(`help.${helpTransId}`));
    })
}