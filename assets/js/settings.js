/*
How to use

// domain name ('main') is to enable multiple simultaneous CookieProxies
PersistedSettings = CookieProxy.createCookieProxy('main');
// one of the following 4 equivalent lines:
const configObject = {default: false, type: Boolean}; // type is any function
const configObject = {default: false};  // type determined from default if possible
const configObject = {};  // if no type, default default is false
const configObject = {cookieName: "main.isSuperHero"} // please don’t set name for no reason
CookieProxy.addCookie(PersistedSettings, 'isSuperHero', configObject)
// now it is automatically persisted (read/write) as Cookie; use like this...
if (PersistedSettings.isSuperHero) { console.log('yes!') };
PersistedSettings.isSuperHero = true;

Details

- cookie is consulted on first read and cached
- cookie is written on set if not default value via: JSON.stringify()
- empty config object means {type: Boolean, default: false, cookieName: "domain.propertyname"}
- cookie read is: type(JSON.parse($.cookie(cookieName)))
- returns default on error
- if you want to persist “complicated” objects, implement methods to support JSON.stringify()
- ...and use own type function to construct on read
- default has a default as well: call the type function without argument
- we could do without “cookie registration”
- ...but I prefer an exception on misspelled PersistedSettings.isSuprHero

Example for more complex object

CookieProxy.addCookie(Settings, 'day', {type: (str) => new Date(str), default: new Date(0)});
// Date is already stringify()able (as UTC string representation)
// string is understood by `new Date()`
// without default type() is used
// ...and `new Date(undefined)` is a Date() object which calls itself invalid
*/

const CookieProxy = function () {
  'use strict';
  const _domain = Symbol('domain');
  const _proxyConfig = Symbol('proxyConfig');
  const cookieHandler = {
    _checkAndGetCookieConfig: function(proxyConfig, name, errorType) {
      if (!proxyConfig.has(name)) {
        throw new errorType(`"${name}" is not configured as cookie-persisted setting.`);
      } else {
        return proxyConfig.get(name);
      }
    },
    get: function(proxyConfig, name) {
      if (name === _proxyConfig) {
        return proxyConfig;
      }
      const config = cookieHandler._checkAndGetCookieConfig(proxyConfig, name, ReferenceError);
      if ('value' in config) {
        return config.value;
      }
      let value = $.cookie(config.cookieName);
      try {
        value = config.type(JSON.parse(value));
      }
      catch (e) {
        // JSON.parse might raise SyntaxError, bc the cookie is malformed or undefined
        value = config.default;
      }
      value = config.filter(value) ? value : config.default;
      return config.value = value;
    },
    set: function(proxyConfig, name, value) {
      const config = cookieHandler._checkAndGetCookieConfig(proxyConfig, name, TypeError);
      if (value === config.default) {
        $.removeCookie(config.cookieName);
      } else {
        $.cookie(config.cookieName, JSON.stringify(value), { expires: 999 });
      }
      config.value = value;
    },
  };

  return {
    createCookieProxy: function (domain) {
      return new Proxy(new Map([[_domain, domain]]), cookieHandler);
    },
    addCookie: function (cookieProxy, name, config = {}) {
      const proxyConfig = cookieProxy[_proxyConfig];
      if (proxyConfig.has(name)) {
        throw new TypeError(`A Cookie was already registered as ${name}.`);
      }
      config = Object.assign(Object.create(null), config);
      delete config.value;
      if (!('default' in config)) {
        config.default = 'type' in config ? config.type() : false;
      }
      if (!('type' in config)) {
        const defaultType = typeof config.default;
        const basicTypes = {'boolean': Boolean, 'string': String, 'number': Number};
        config.type = defaultType in basicTypes ? basicTypes[defaultType] : x => x;
      }
      if (!('filter' in config)) {
        config.filter = x => true;
      }
      if (!('cookieName' in config)) {
        config.cookieName = `${proxyConfig.get(_domain)}.${name}`
      }
      proxyConfig.set(name, config);
    },
  };
}();


const Settings = CookieProxy.createCookieProxy('main');
Object.entries({
  displayClockHideTimer: {},
  display24HoursTimestamps: {},
  isCoordsEnabled: {},
  isCycleChangerEnabled: {},
  isCycleInputEnabled: {},
  isDebugEnabled: {},
  isDoubleClickZoomEnabled: {default: true},
  isMenuOpened: {},
  isPinsPlacingEnabled: {},
  isPinsEditingEnabled: {},
  isPopupsEnabled: {default: true},
  isPopupsHoverEnabled: {},
  isShadowsEnabled: {default: true},
  markerCluster: {default: true},
  markerSize: {default: 1},
  markerOpacity: {default: 1},
  markersCustomColor: {default: 0},
  overlayOpacity: {default: .5},
  resetMarkersDaily: {default: true},
  showHelp: {default: true},
  showWeeklySettings: {default: true},
  showUtilitiesSettings: {default: true},
  showCustomizationSettings: {default: true},
  showRoutesSettings: {default: true},
  showImportExportSettings: {default: true},
  showDebugSettings: {},
  sortItemsAlphabetically: {},
  toolType: {default: 3},
}).forEach(([name, config]) => CookieProxy.addCookie(Settings, name, config));