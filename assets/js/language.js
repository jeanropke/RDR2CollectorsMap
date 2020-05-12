jQuery.fn.translate = function () {
  return Language.translateDom(this);
};

var Language = {
  data: {},
  availableLanguages: ['en', 'af', 'ar', 'ca', 'cs', 'da', 'de', 'el', 'en-GB', 'es', 'fi', 'fr', 'he', 'hu', 'it', 'ja', 'ko', 'no', 'pl', 'pt', 'pt-BR', 'ro', 'ru', 'sr', 'sv', 'th', 'tr', 'uk', 'vi', 'zh-Hans', 'zh-Hant'],

  init: function () {
    'use strict';
    let langs = ['en'];

    if (Settings.language !== 'en') {
      langs.push(Settings.language);
    }

    langs.forEach(language => {
      $.ajax({
        url: `./langs/${language.replace('-', '_')}.json?nocache=${nocache}`,
        async: false,
        dataType: 'json',
        success: function (json) {
          let result = {};

          for (let propName in json) {
            if (json[propName] !== "" && ($.isEmptyObject(Language.data.en) || Language.data.en[propName] !== json[propName])) {
              result[propName] = json[propName];
            }
          }

          Language.data[language] = result;
        }
      });
    });
  },

  _links: {
    'GitHub': ['https://github.com/jeanropke/RDR2CollectorsMap/issues', 'GitHub'],
    'Discord': ['https://discord.gg/WWru8cP', 'Discord'],
    'int.nazar.link': ['https://twitter.com/MadamNazarIO', '@MadamNazarIO'],
    'int.random_spot.link': ['https://github.com/jeanropke/RDR2CollectorsMap/wiki/Random-Item-Possible-Loot'],
  },

  _externalLink: function (key) {
    'use strict';
    const [url, text] = Language._links[key];
    return `<a href="${url}" target="_blank">${text ? `${text}</a>` : ''}`;
  },

  get: function (transKey, optional) {
    'use strict';
    let translation = false;

    if (Settings.isDebugEnabled) optional = false;

    if (Language._links.propertyIsEnumerable(transKey)) {
      translation = Language._externalLink(transKey);
    } else if (transKey === 'int.end.link') {
      translation = '</a>';
    } else if (transKey === 'collection') {
      transKey = `weekly.desc.${Collection.weeklySetName}`;
    } else if (transKey === 'weekly_flavor') {
      transKey = `weekly.flavor.${Collection.weeklySetName}`;
    } else if (['count', 'max', 'minutes', 'time'].includes(transKey)) {
      return `{${transKey}}`;
    }

    translation =
      translation ||
      Language.data[Settings.language][transKey] ||
      Language.data.en[transKey] ||
      (optional ? '' : transKey);

    return translation.replace(/\{([\w.]+)\}/g, (full, key) =>
      this.get(key, true) || `{${key}}`);
  },

  translateDom: function (context) {
    'use strict';
    $('[data-text]', context).html(function () {
      const $this = $(this);
      const string = Language.get($this.attr('data-text'), $this.data('text-optional'));

      // Don't dump raw variables out to the user here, instead make them appear as if they are loading.
      return string.replace(/\{([\w.]+)\}/g, '---');
    });
    return context;
  },

  setMenuLanguage: function () {
    'use strict';

    if (Language.data[Settings.language] === undefined) {
      $.ajax({
        url: `./langs/${Settings.language.replace('-', '_')}.json?nocache=${nocache}`,
        async: false,
        dataType: 'json',
        success: function (json) {
          let result = {};

          for (let propName in json) {
            if (json[propName] !== "" && ($.isEmptyObject(Language.data.en) || Language.data.en[propName] !== json[propName])) {
              result[propName] = json[propName];
            }
          }

          Language.data[Settings.language] = result;
        }
      });
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

    FME.update();
  }
};