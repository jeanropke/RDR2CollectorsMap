/**
 * Created by Jean on 2019-10-09.
 */

var Menu = {};
Menu.refreshMenu = function () {
    $.each(categories, function (key, value) {

        if(markers[value] == null)
            return;

        $('.menu-hidden[data-type=' + value + ']').children('p.collectible').remove();

        markers[value].filter(function (item) {
            if (item.day == day) {
                if (item.subdata == null) {
                    $('.menu-hidden[data-type=' + value + ']').append('<p class="collectible" data-type="' + item.text + '">' + languageData[lang][item.text + '.name'] + '</p>');
                }
                else {
                    if ($(`.menu-hidden[data-type='american_flowers']`).children(`p.collectible[data-type='${item.subdata}']`).length > 0)
                        return;

                    var tempName = languageData[lang][item.text + '.name'];


                    $('.menu-hidden[data-type=' + value + ']').append('<p class="collectible" data-type="' + item.subdata + '">' + tempName.split('#')[0] + '</p>');
                }
            }
        });

        $('.menu-hidden[data-type=treasure]').children('p.collectible').remove();

        treasureData.filter(function (item) {
            $('.menu-hidden[data-type=treasure]').append('<p class="collectible" data-type="' + item.text + '">' + languageData[lang][item.text] + '</p>');
        });
    });
    $.each(disableMarkers, function (key, value) {
        if (value.length > 0) {
            $('[data-type=' + value + ']').addClass('disabled');
        }
    });

    $.each(plantsDisabled, function (key, value) {
        if (value.length > 0) {
            $('[data-type=' + value + ']').addClass('disabled');
        }
    });
};


Menu.showAll = function() {
    $.each (categoryButtons, function (key, value) {
        $(value).children('span').removeClass("disabled")
    });
    enabledTypes = categories;
    MapBase.addMarkers();
};

Menu.hideAll = function()
{
    $.each (categoryButtons, function (key, value) {
        $(value).children('span').addClass("disabled")
    });

    enabledTypes = [];
    MapBase.addMarkers();
};

Menu.refreshItemsCounter = function()
{
    $('.collectables-counter').text(languageData[lang]['menu.collectables_counter'].replace('{count}', (disableMarkers.length)).replace('{max}', Object.keys(visibleMarkers).length));
};

