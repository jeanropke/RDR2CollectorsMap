/*
How to use

// domain name ('main') is to enable multiple simultaneous SettingProxies
PersistedSettings = SettingProxy.createSettingProxy('main');
// one of the following 4 equivalent lines:
const configObject = {default: false, type: Boolean}; // type is any function
const configObject = {default: false};  // type determined from default if possible
const configObject = {};  // if no type, default default is false
const configObject = {settingName: "main.isSuperHero"} // please don’t set name for no reason
SettingProxy.addSetting(PersistedSettings, 'isSuperHero', configObject)
// now it is automatically persisted (read/write) as Setting; use like this...
if (PersistedSettings.isSuperHero) { console.log('yes!') };
PersistedSettings.isSuperHero = true;

Details

- setting is consulted on first read and cached
- setting is written on set if not default value via: JSON.stringify()
- empty config object means {type: Boolean, default: false, settingName: "domain.propertyname"}
- setting read is: type(JSON.parse(localStorage.getItem(settingName)))
- returns default on error
- if you want to persist “complicated” objects, implement methods to support JSON.stringify()
- ...and use own type function to construct on read
- default has a default as well: call the type function without argument
- we could do without “setting registration”
- ...but I prefer an exception on misspelled PersistedSettings.isSuprHero

Example for more complex object

SettingProxy.addSetting(Settings, 'day', {type: (str) => new Date(str), default: new Date(0)});
// Date is already stringify()able (as UTC string representation)
// string is understood by `new Date()`
// without default type() is used
// ...and `new Date(undefined)` is a Date() object which calls itself invalid

SettingProxy.addListener(Settings, 'day secondSetting', callback)
// whenever Settings.day or Settings.secondSetting are assigned, callback is called.
// addListener() returns the callback for convenient immediate invocation by adding () to the line

*/

const SettingProxy = function () {
  'use strict';
  const _domain = Symbol('domain');
  const _proxyConfig = Symbol('proxyConfig');
  const settingHandler = {
    _checkAndGetSettingConfig: function (proxyConfig, name, errorType) {
      if (!proxyConfig.has(name)) {
        throw new errorType(`"${name}" is not configured as a persisted setting.`);
      } else {
        return proxyConfig.get(name);
      }
    },
    get: function (proxyConfig, name) {
      if (name === _proxyConfig) return proxyConfig;

      const config = settingHandler._checkAndGetSettingConfig(proxyConfig, name, ReferenceError);
      if ('value' in config) return config.value;

      let value = localStorage.getItem(config.settingName);

      if (value === null) {
        value = config.default;
      } else {
        try {
          // JSON.parse might raise SyntaxError, bc the setting is malformed
          value = config.type(JSON.parse(value));
        }
        catch (e) {
          value = config.default;
        }
      }

      value = config.filter(value) ? value : config.default;

      config.value = value;

      return config.value;
    },
    set: function (proxyConfig, name, value) {
      const config = settingHandler._checkAndGetSettingConfig(proxyConfig, name, TypeError);
      if (value === config.default) {
        localStorage.removeItem(config.settingName);
      } else {
        localStorage.setItem(config.settingName, JSON.stringify(value));
      }
      if (!('value' in config) || config.value !== value) {
        const resolved = Promise.resolve();
        config.listeners.forEach(callback => resolved.then(callback));
      }
      config.value = value;
      return true;
    },
  };

  return {
    createSettingProxy: function (domain) {
      return new Proxy(new Map([[_domain, domain]]), settingHandler);
    },
    addSetting: function (settingProxy, name, config = {}) {
      const proxyConfig = settingProxy[_proxyConfig];
      if (proxyConfig.has(name)) {
        throw new TypeError(`A setting was already registered as ${name}.`);
      }
      config = Object.assign(Object.create(null), config);
      delete config.value;
      config.listeners = [];
      if (!('default' in config)) {
        config.default = 'type' in config ? config.type() : false;
      }
      if (!('type' in config)) {
        const defaultType = typeof config.default;
        const basicTypes = { 'boolean': Boolean, 'string': String, 'number': Number };
        config.type = defaultType in basicTypes ? basicTypes[defaultType] : x => x;
      }
      if (!('filter' in config)) {
        config.filter = x => true;
      }
      if (!('settingName' in config)) {
        config.settingName = `${proxyConfig.get(_domain)}.${name}`;
      }
      proxyConfig.set(name, config);
    },
    addListener: function (settingProxy, names, callback) {
      const proxyConfig = settingProxy[_proxyConfig];
      names.split(' ').forEach(name => {
        settingHandler._checkAndGetSettingConfig(proxyConfig, name, ReferenceError)
          .listeners.push(callback)
      });
      return callback;
    },
  };
}();

// General settings
const Settings = SettingProxy.createSettingProxy('rdr2collector');
Object.entries({
  lastVersion: { default: 0 },
  alertClosed: { default: false },
  baseLayer: { default: 'map.layers.default' },
  fmeDisplayGeneralPeriod: { default: 30 },
  fmeDisplayRolePeriod: { default: 60 },
  fmeNotificationPeriod: { default: 10 },
  isClock24Hour: { default: false },
  isCoordsOnClickEnabled: { default: false },
  isCyclesVisible: { default: false },
  isCycleChangerEnabled: { default: false },
  isCycleInputEnabled: { default: false },
  isDebugEnabled: { default: false },
  isDoubleClickZoomEnabled: { default: true },
  isFmeDisplayEnabled: { default: true },
  isFmeNotificationEnabled: { default: false },
  isMarkerClusterEnabled: { default: true },
  isPinsEditingEnabled: { default: true },
  isPinsPlacingEnabled: { default: false },
  isPopupsEnabled: { default: true },
  isPopupsHoverEnabled: { default: false },
  isRightClickEnabled: { default: false },
  isShadowsEnabled: { default: true },
  isLaBgEnabled: { default: true },
  isMapBoundariesEnabled: {default: true },
  markerOpacity: { default: 1 },
  isInvisibleRemovedMarkers: { default: false },
  markerSize: { default: 1 },
  overlayOpacity: { default: 0.5 },
  resetMarkersDaily: { default: true },
  showCustomizationSettings: { default: true },
  showDebugSettings: { default: false },
  showHelp: { default: true },
  showImportExportSettings: { default: true },
  showRoutesSettings: { default: true },
  showUtilitiesSettings: { default: true },
  topWidgetState: { default: 0 },
  legendarySpawnIconType: { default: 'head' },
  legendarySpawnIconSize: { default: 1 },
  showTooltipsMap: { default: 1 },
}).forEach(([name, config]) => SettingProxy.addSetting(Settings, name, config));

// Inventory settings
const InventorySettings = SettingProxy.createSettingProxy('rdr2collector.inventory');
Object.entries({
  highlightLowAmountItems: { default: false },
  isEnabled: { default: false },
  isMenuUpdateEnabled: { default: true },
  isPopupsEnabled: { default: true },
  resetInventoryDaily: { default: false },
  stackSize: { default: 10 },
  flowersSoftStackSize: { default: 10 },
  enableAdvancedInventoryOptions: { default: true },
  autoEnableSoldItems: { default: true },
  maxAmountLowInventoryItems: { default: 5 }
}).forEach(([name, config]) => SettingProxy.addSetting(InventorySettings, name, config));

// Route settings
const RouteSettings = SettingProxy.createSettingProxy('rdr2collector.routes');
Object.entries({
  allowFasttravel: { default: false },
  allowRailroad: { default: false },
  autoUpdatePath: { default: false },
  customRouteEnabled: { default: false },
  fasttravelWeight: { default: 1 },
  generateOnVisit: { default: false },
  genPathStart: { default: 'SW' },
  ignoreCollected: { default: true },
  importantOnly: { default: false },
  maxDistance: { default: 25 },
  railroadWeight: { default: 1 },
  runOnStart: { default: false },
  startMarkerLat: { default: -119.9063 },
  startMarkerLng: { default: 8.0313 },
  usePathfinder: { default: true },
  customRoute: { default: '' }
}).forEach(([name, config]) => SettingProxy.addSetting(RouteSettings, name, config));