var Language = {
    availableLanguages: ['ar-ar', 'de-de', 'en-us', 'es-es', 'fr-fr', 'hu-hu', 'it-it', 'ko', 'pt-br', 'pl', 'ru', 'sv-se', 'th-th', 'zh-hans', 'zh-hant'],

    get: function (transKey, optional) {
        'use strict';
        let translation = false;
        if (transKey === 'GitHub') {
            translation = '<a href="https://github.com/jeanropke/RDR2CollectorsMap/issues" target="_blank">GitHub</a>';
        } else if (transKey === 'Discord') {
            translation = '<a href="https://discord.gg/WWru8cP" target="_blank">Discord</a>';
        } else if (transKey === 'int.random_spot.link') {
            translation = '<a href="https://github.com/jeanropke/RDR2CollectorsMap/wiki/Random-Item-Possible-Loot" target="_blank">';
        } else if (transKey === 'int.end.link') {
            translation = '</a>';
        } else if (transKey === 'collection') {
            transKey = `weekly.desc.${weeklySetData.current}`;
        }
        translation =
            translation ||
            Language.data[Settings.language][transKey] ||
            Language.data['en-us'][transKey] ||
            (optional ? '' : transKey);

        return translation.replace(/\{([\w.]+)\}/g,
            (full, key) => this.get(key, true) || `{${key}}`);
    },

    translateDom: function (context) {
        'use strict';
        $('[data-text]', context).html(function () {
            const $this = $(this);
            return Language.get($this.attr('data-text'), $this.data('text-optional'));
        });
        return context;
    },

    setMenuLanguage: function () {
        'use strict';
        const wikiBase = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/';
        const wikiPages = {
            'de-de': 'RDO-Sammler-Landkarte-Benutzerhandbuch-(German)',
            'en-us': 'RDO-Collectors-Map-User-Guide-(English)',
            'fr-fr': 'RDO-Collectors-Map-Guide-d\'Utilisateur-(French)',
            'pt-br': 'Guia-do-Usu%C3%A1rio---Mapa-de-Colecionador-(Portuguese)',
        };
        const wikiLang = Settings.language in wikiPages ? Settings.language : 'en-us';
        $('.wiki-page').attr('href', wikiBase + wikiPages[wikiLang]);

        this.translateDom();

        $('#search').attr("placeholder", Language.get('menu.search_placeholder'));
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
                    async: false,
                    dataType: 'json',
                    success: function (json) {
                        object[language] = json;
                    }
                });
                
                // Item language strings.
                $.ajax({
                    url: `./langs/item/${language}.json`,
                    async: false,
                    dataType: 'json',
                    success: function (json) {
                        $.extend(object[language], json);
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
