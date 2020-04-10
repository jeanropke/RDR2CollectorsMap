jQuery.fn.translate = function () {
    return Language.translateDom(this);
}

var Language = {
    availableLanguages: ['en', 'af', 'ar', 'ca', 'cs', 'da', 'de', 'el', 'en-GB', 'es', 'fi', 'fr', 'he', 'hu', 'it', 'ja', 'ko', 'no', 'pl', 'pt', 'pt-BR', 'ro', 'ru', 'sr', 'sv', 'th', 'tr', 'uk', 'vi', 'zh-Hans', 'zh-Hant'],

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
            (Language.data[Settings.language] !== undefined && Language.data[Settings.language][transKey]) ||
            Language.data['en'][transKey] ||
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
        let hasUntranslated = false;

        Language.availableLanguages.forEach(language => {
            if (Language.data[language] === undefined || Language.data[language] === null || $.isEmptyObject(Language.data[language])) {
                hasUntranslated = true;
                $(`#language option[value="${language}"]`).attr('disabled', 'disabled').insertAfter($("#language option:last"));
            }
        });

        if (hasUntranslated && $('#language option:contains(-- Untranslated languages --)').length === 0) {
            $('<option>').text('-- Untranslated languages --').attr('disabled', 'disabled').insertAfter($("#language option:enabled:last"));
        }

        const wikiBase = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/';
        const wikiPages = {
            'en': 'RDO-Collectors-Map-User-Guide-(English)',
            'de': 'RDO-Sammler-Landkarte-Benutzerhandbuch-(German)',
            'fr': 'RDO-Collectors-Map-Guide-d\'Utilisateur-(French)',
            'pt': 'Guia-do-Usu%C3%A1rio---Mapa-de-Colecionador-(Portuguese)',
        };
        const wikiLang = Settings.language in wikiPages ? Settings.language : 'en';
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
                    url: `./langs/menu/${language.replace('-', '_')}.json`,
                    async: false,
                    dataType: 'json',
                    success: function (json) {
                        var result = {};

                        for (var propName in json) {
                            if (json[propName] !== "" && ($.isEmptyObject(object['en']) || object['en'][propName] !== json[propName])) {
                                result[propName] = json[propName];
                            }
                        }

                        if (!$.isEmptyObject(result)) {
                            object[language] = result;
                        }
                    }
                });

                // Item language strings.
                $.ajax({
                    url: `./langs/item/${language.replace('-', '_')}.json`,
                    async: false,
                    dataType: 'json',
                    success: function (json) {
                        var result = {};

                        for (var propName in json) {
                            if (json[propName] !== "" && ($.isEmptyObject(object['en']) || object['en'][propName] !== json[propName])) {
                                result[propName] = json[propName];
                            }
                        }

                        if (!$.isEmptyObject(result)) {
                            if (object[language] === null) {
                                object[language] = result;
                            } else {
                                $.extend(object[language], result);
                            }
                        }
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
