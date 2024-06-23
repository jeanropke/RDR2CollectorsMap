/*
 * Leaflet.ZoomEx v1.0.1 - 2024-06-15
 *
 * Copyright 2024 mfhsieh
 * mfhsieh@gmail.com
 *
 * Licensed under the MIT license.
 *
 * Demos:
 * https://mfhsieh.github.io/leaflet-zoomex/
 *
 * Source:
 * git@github.com:mfhsieh/leaflet-zoomex.git
 *
 */
(function (factory) {

  if (typeof define === 'function' && define.amd) {  // eslint-disable-line no-undef
      // define an AMD module that relies on 'leaflet'
      define(['leaflet'], factory);  // eslint-disable-line no-undef

  } else if (typeof exports === 'object') {
      // define a Common JS module that relies on 'leaflet'
      module.exports = factory(require('leaflet'));  // eslint-disable-line no-undef

  } else if (typeof window !== 'undefined') {
      // attach your plugin to the global 'L' variable
      if (typeof window.L === "undefined") throw "Leaflet must be loaded first.";
      window.L.Control.ZoomEx = factory(window.L);
  }
})(function (L) {
  "use strict";

  const ZoomEx = L.Control.extend({

      options: {
          className: "",
          zoomOutHtml: `
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
<path d="M 8,0.5 A 7.5,7.5 0 0 0 0.5,8 7.5,7.5 0 0 0 8,15.5 7.5,7.5 0 0 0 15.5,8 7.5,7.5 0 0 0 8,0.5 Z m -3.5,6 h 7 c 0.554,0 1,0.446 1,1 v 1 c 0,0.554 -0.446,1 -1,1 h -7 c -0.554,0 -1,-0.446 -1,-1 v -1 c 0,-0.554 0.446,-1 1,-1 z" />
</svg>`,
          zoomInHtml: `
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
<path d="M 8,0.5 A 7.5,7.5 0 0 0 0.5,8 7.5,7.5 0 0 0 8,15.5 7.5,7.5 0 0 0 15.5,8 7.5,7.5 0 0 0 8,0.5 Z m -0.5,3 h 1 c 0.554,0 1,0.446 1,1 v 2 h 2 c 0.554,0 1,0.446 1,1 v 1 c 0,0.554 -0.446,1 -1,1 h -2 v 2 c 0,0.554 -0.446,1 -1,1 h -1 c -0.554,0 -1,-0.446 -1,-1 v -2 h -2 c -0.554,0 -1,-0.446 -1,-1 v -1 c 0,-0.554 0.446,-1 1,-1 h 2 v -2 c 0,-0.554 0.446,-1 1,-1 z" />
</svg>`,
          zoomOutTitle: "Map Zoom Out",
          zoomInTitle: "Map Zoom In",
          sliderTitle: "Map Zoom In / Zoom Out Slider",
          zoomOutAriaLabel: "",
          zoomInAriaLabel: "",
          sliderAriaLabel: "",
          afterZoomEnd: null,
      },

      initialize: function (options) {
          L.Util.setOptions(this, options);
      },

      onAdd: function (map) {
          this._map = map;

          const container = L.DomUtil.create("div", "leaflet-zoomex");
          if (this.options.className) L.DomUtil.addClass(container, this.options.className);
          L.DomEvent.disableClickPropagation(container);

          this._zoomOutButton = this._createButton(this.options.zoomOutHtml, "leaflet-zoomex-out", container, this._zoomOut, this.options.zoomOutTitle, this.options.zoomOutAriaLabel);

          this._sliderContainer = L.DomUtil.create("div", "leaflet-zoomex-slider-container", container);
          this._slider = L.DomUtil.create("input", "leaflet-zoomex-slider", this._sliderContainer);
          this._slider.type = "range";
          this._slider.min = map.getMinZoom();
          this._slider.max = map.getMaxZoom();
          this._slider.value = map.getZoom();
          this._slider.step = 1;

          this._slider.title = this.options.sliderTitle;
          this._slider.setAttribute("aria-label", this.options.sliderAriaLabel ? this.options.sliderAriaLabel : this.options.sliderTitle);
          this._slider.setAttribute("aria-valuemin", this._slider.min);
          this._slider.setAttribute("aria-valuemax", this._slider.max);
          this._slider.setAttribute("aria-valuenow", this._slider.value);

          L.DomEvent.on(this._slider, "change", this._onSliderInput, this);
          map.on("zoomend", this._updateSlider, this);

          this._zoomInButton = this._createButton(this.options.zoomInHtml, "leaflet-zoomex-in", container, this._zoomIn, this.options.zoomInTitle, this.options.zoomOutAriaLabel);

          return container;
      },

      _zoomOut: function () {
          this._map.zoomOut();
      },

      _zoomIn: function () {
          this._map.zoomIn();
      },

      _onSliderInput: function () {
          this._map.setZoom(this._slider.value);
      },

      _updateSlider: function () {
          this._slider.value = this._map.getZoom();
          this._slider.setAttribute("aria-valuenow", this._slider.value);
          if (this.options.afterZoomEnd) this.options.afterZoomEnd();
      },

      _createButton: function (innerHTML, className, container, callback, title, ariaLabel) {
          const button = L.DomUtil.create("button", className, container);
          button.innerHTML = innerHTML;

          button.title = title;
          button.setAttribute("aria-label", ariaLabel ? ariaLabel : title);

          L.DomEvent.on(button, "click", callback, this);

          return button;
      },
  });

  L.control.zoomEx = function (options) {
      return new ZoomEx(options);
  };

  return ZoomEx;
});