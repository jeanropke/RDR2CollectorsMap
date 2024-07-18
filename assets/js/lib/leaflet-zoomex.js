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
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#000">
<path fill-rule="evenodd" clip-rule="evenodd" d="M2 4.5C2 3.11929 3.11929 2 4.5 2H19.5C20.8807 2 22 3.11929 22 4.5V19.5C22 20.8807 20.8807 22 19.5 22H4.5C3.11929 22 2 20.8807 2 19.5V4.5ZM6.5 10.5C5.94772 10.5 5.5 10.9477 5.5 11.5V12.5C5.5 13.0523 5.94772 13.5 6.5 13.5H17.5C18.0523 13.5 18.5 13.0523 18.5 12.5V11.5C18.5 10.9477 18.0523 10.5 17.5 10.5H6.5Z" fill="#333"></path></svg>`,
          zoomInHtml: `
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#000">
<path fill-rule="evenodd" clip-rule="evenodd" d="M2 4.5C2 3.11929 3.11929 2 4.5 2H19.5C20.8807 2 22 3.11929 22 4.5V19.5C22 20.8807 20.8807 22 19.5 22H4.5C3.11929 22 2 20.8807 2 19.5V4.5ZM12.5 5.5C13.0523 5.5 13.5 5.94772 13.5 6.5V10.5H17.5C18.0523 10.5 18.5 10.9477 18.5 11.5V12.5C18.5 13.0523 18.0523 13.5 17.5 13.5H13.5V17.5C13.5 18.0523 13.0523 18.5 12.5 18.5H11.5C10.9477 18.5 10.5 18.0523 10.5 17.5V13.5H6.5C5.94772 13.5 5.5 13.0523 5.5 12.5V11.5C5.5 10.9477 5.94772 10.5 6.5 10.5H10.5V6.5C10.5 5.94772 10.9477 5.5 11.5 5.5H12.5Z" fill="#333"></path></svg>`,
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