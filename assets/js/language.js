/**
 * Created by Jean on 2019-10-09.
 */

var Language = {};

Language.load = function(isChanged)
{
    languageData = [];

    $.getJSON('langs/item/'+lang+'.json?nocache='+nocache, {}, function(data)
    {
        $.each(data, function(key, value) {
            languageData[value.key] = value.value;

        });

        $.getJSON('langs/menu/'+lang+'.json?nocache='+nocache, {}, function(data)
        {
            $.each(data, function(key, value) {
                languageData[value.key] = value.value;
            });

            Language.setMenuLanguage();
            if(isChanged)
                Map.addMarkers();

            Menu.refreshMenu();

        });
    });


    if(wikiLanguage[lang] != null)
        $('.wiki-page').attr('href', wikiLanguage[lang]);
    else
        $('.wiki-page').attr('href', wikiLanguage['en-us']);
};

Language.setMenuLanguage = function ()
{
    $.each($('[data-text]'), function (key, value)
    {
        var temp = $(value);
        if(languageData[temp.data('text')] == null) {
            console.error('[LANG]['+lang+']: Text not found: \''+temp.data('text')+'\'');
        }

        $(temp).text(languageData[temp.data('text')]);
    });

    ///Special cases:
    $('#search').attr("placeholder", languageData['menu.search_placeholder']);
};