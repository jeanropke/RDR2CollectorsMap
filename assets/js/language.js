var Language = {
    availableLanguages: ['ar-ar', 'de-de', 'en-us', 'es-es', 'fr-fr', 'hu-hu', 'it-it', 'ko', 'pt-br', 'pl', 'ru', 'th-th', 'zh-hans', 'zh-hant'],

    get: function (value) {
        if (Language.data[Settings.language][value])
            return Language.data[Settings.language][value];
        else if (Language.data['en-us'][value])
            return Language.data['en-us'][value];
        else if (Settings.isDebugEnabled)
            return value;
        else
            return '';
    },

    setMenuLanguage: function () {
        const wikiBase = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/';
        const wikiPages = {
            'de-de': 'RDO-Sammler-Landkarte-Benutzerhandbuch-(German)',
            'en-us': 'RDO-Collectors-Map-User-Guide-(English)',
            'fr-fr': 'RDO-Collectors-Map-Guide-d\'Utilisateur-(French)',
            'pt-br': 'Guia-do-Usu%C3%A1rio---Mapa-de-Colecionador-(Portuguese)',
        };
        const wikiLang = Settings.language in wikiPages ? Settings.language : 'en-us';
        $('.wiki-page').attr('href', wikiBase + wikiPages[wikiLang]);

        $.each($('[data-text]'), function (key, value) {
            var temp = $(value);
            var string = Language.get(temp.data('text'));

            if (string == '') return;

            $(temp).text(string);
        });

        // Special cases:
        $('#search').attr("placeholder", Language.get('menu.search_placeholder'));

        $('.leaflet-control-layers-list span').each(function (key, value) {
            var element = $(value);

            switch (key) {
                case 0:
                    element.text(' ' + Language.get('map.layers.default'));
                    break;
                case 1:
                    element.text(' ' + Language.get('map.layers.detailed'));
                    break;
                case 2:
                    element.text(' ' + Language.get('map.layers.dark'));
                    break;
                default:
                    break;
            }
        });
    },

    // A helper function to "compile" all language files into a single JSON file.
    getLanguageJson: function () {
        var object = {};

        // Loop through all available languages and try to retrieve both the `menu.json` and `item.json` files.
        this.availableLanguages.forEach(language => {
            try {
                // Menu language strings.
                $.ajax({
                    url: `./langs/menu/${language}.json`,
                    dataType: 'json',
                    async: false,
                    success: function (json) {
                        // Convert from object to property.
                        var langObject = {};

                        json.forEach(element => {
                            langObject[element.key] = element.value;
                        });

                        object[language] = langObject;
                    }
                });

                // Item language strings.
                $.ajax({
                    url: `./langs/item/${language}.json`,
                    dataType: 'json',
                    async: false,
                    success: function (json) {
                        // Convert from object to property.
                        var langObject = {};

                        json.forEach(element => {
                            langObject[element.key] = element.value;
                        });

                        $.extend(object[language], langObject);
                    }
                });
            } catch (error) {
                // Do nothing for this language in case of a 404-error.
                return;
            }
        });

        // Download the object to a `language.json` file.
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(object)));
        element.setAttribute('download', 'language.json');

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }
};
