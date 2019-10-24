/**
 * Created by Jean on 2019-10-09.
 */

var Menu = {};

Menu.refreshMenu = function ()
{
    $.each(categories, function (key, value)
    {
        $('.menu-hidden[data-type='+value+']').children('p.collectible').remove();

        markers.filter(function(item)
        {
            if(item.day == day && item.icon == value)
            {
                //if(item.subdata == null)
                {
                    $('.menu-hidden[data-type=' + value + ']').append('<p class="collectible" data-type="' + item.text + '">' + languageData[item.text + '.name'] + '</p>');
                }
                /*else
                {
                    if($(`.menu-hidden[data-type='american-flowers']`).children(`p.collectible[data-type='${item.subdata}']`).length > 0)
                        return;

                    var tempName = languageData[item.text + '.name'];


                    $('.menu-hidden[data-type=' + value + ']').append('<p class="collectible" data-type="' + item.subdata + '" data-text="'+item.subdata +'">'+ tempName.split('#')[0]+'</p>');
                }*/
            }
        });

        treasureData.filter(function(item)
        {
            $('.menu-hidden[data-type=treasure]').append('<p class="collectible" data-type="'+item.text+'">'+languageData[item.text]+'</p>');
        });
    });
    $.each(disableMarkers, function (key, value)
    {
        if(value.length > 0)
        {
            $('[data-type=' + value + ']').addClass('disabled');
        }
    });

    $.each(treasureDisabled, function (key, value)
    {
        if(value.length > 0)
        {
            $('[data-type=' + value + ']').addClass('disabled');
        }
    });

};

Menu.showAll = function() {
    $.each (categoryButtons, function (key, value) {
        $(value).children('span').removeClass("disabled")
    });
    enabledTypes = categories;
    Map.addMarkers();
};

Menu.hideAll = function()
{
    $.each (categoryButtons, function (key, value) {
        $(value).children('span').addClass("disabled")
    });

    enabledTypes = [];
    Map.addMarkers();
};

Menu.refreshItemsCounter = function()
{
    console.log('Collected '+(disableMarkers.length-1)+' of '+Object.keys(visibleMarkers).length);
    $('#item-counter').text((disableMarkers.length-1)+' of '+Object.keys(visibleMarkers).length);
};

