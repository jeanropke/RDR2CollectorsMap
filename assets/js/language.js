var Language = {
    availableLanguages: ['en-US', 'af-ZA', 'ar-SA', 'ca-ES', 'cs-CZ', 'da-DK', 'de-DE', 'el-GR', 'es-ES', 'fi-FI', 'fr-FR', 'he-IL', 'hu-HU', 'it-IT', 'ja-JP', 'ko-KR', 'no-NO', 'pl-PL', 'pt-BR', 'pt-PT', 'ro-RO', 'ru-RU', 'sr-SP', 'sv-SE', 'th-TH', 'tr-TR', 'uk-UA', 'vi-VN', 'zh-CN', 'zh-TW'],

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
            Language.data['en-US'][transKey] ||
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

        if (hasUntranslated) {
            $('<option>').text('-- Untranslated languages --').attr('disabled', 'disabled').insertAfter($("#language option:enabled:last"));
        }

        const wikiBase = 'https://github.com/jeanropke/RDR2CollectorsMap/wiki/';
        const wikiPages = {
            'de-DE': 'RDO-Sammler-Landkarte-Benutzerhandbuch-(German)',
            'en-US': 'RDO-Collectors-Map-User-Guide-(English)',
            'fr-FR': 'RDO-Collectors-Map-Guide-d\'Utilisateur-(French)',
            'pt-BR': 'Guia-do-Usu%C3%A1rio---Mapa-de-Colecionador-(Portuguese)',
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
                        var result = {};

                        for (var propName in json) {
                            if (json[propName] !== "" && ($.isEmptyObject(object['en-US']) || object['en-US'][propName] !== json[propName])) {
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
                    url: `./langs/item/${language}.json`,
                    async: false,
                    dataType: 'json',
                    success: function (json) {
                        var result = {};

                        for (var propName in json) {
                            if (json[propName] !== "" && ($.isEmptyObject(object['en-US']) || object['en-US'][propName] !== json[propName])) {
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
