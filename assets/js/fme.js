/**
 * Display various Free Mode Events.
 * 
 * Created by Richard Westenra, stripped to only display next 2 events.
 * For the full experience, please visit his websites at:
 * 
 * Website: https://www.richardwestenra.com/rdr2-free-roam-event-schedule
 * Patreon: https://www.patreon.com/bePatron?u=24592842
 * GitHub: https://github.com/richardwestenra
 * 
 * License: MIT
 */

const FME = {
  /**
   * The last retrieved events JSON
   */
  _eventsJson: null,

  /**
   * A list of notifications that have already been sent to prevent dupes.
   * Doesn't account for people refreshing just in time.
   * Maybe make this persistent later, but there's no real need for it.
   */
  _sentNotifications: [],

  /**
   * A list of flags to use for the FME enabled settings
   */
  flags: {
    none: 0,
    fme_archery: 1,
    fme_dead_drop: 2,
    fme_fishing_challenge: 4,
    fme_golden_hat: 8,
    fme_hot_property: 16,
    fme_king_of_the_castle: 32,
    fme_king_of_the_rail: 64,
    fme_random: 128,
    fme_role_animal_tagging: 256,
    fme_role_condor_egg: 512,
    fme_role_greatest_bounty_hunter: 1024,
    fme_role_protect_legendary_animal: 2048,
    fme_role_round_up: 4096,
    fme_role_supply_train: 8192,
    fme_role_wildlife_photographer: 16384,
    fme_role_wreckage: 32768,
    fme_wild_animal_kills: 65536,
  },

  /**
   * DOM elements for the FME card
   */
  elements: {
    general: {
      nextEventImage: document.getElementById('next-general-image'),
      nextEventName: document.getElementById('next-general-name'),
      nextEventEta: document.getElementById('next-general-eta'),
      nextEventBodyMobile: document.getElementById('next-general-mobile'),
    },
    role: {
      nextEventImage: document.getElementById('next-role-image'),
      nextEventName: document.getElementById('next-role-name'),
      nextEventEta: document.getElementById('next-role-eta'),
      nextEventBodyMobile: document.getElementById('next-role-mobile'),
    }
  },

  /**
   * Update the FME data
   * @param {Array} schedule List of event times
   */
  updateEvent: function (schedule, key) {
    const frequencies = {
      general: Settings.fmeDisplayGeneralPeriod,
      role: Settings.fmeDisplayRolePeriod
    };

    const elements = FME.elements[key];
    const frequency = FME.minutesToMilliseconds(frequencies[key]);
    let hasValidNext = false;

    schedule.forEach(function (e, i) {
      const event = FME.getEventObject(e, frequency);

      if (!(Settings.fmeEnabledEvents & FME.flags[event.name])) return;
      if (event.eta > 0 && event.eta < frequency) {
        hasValidNext = true;

        // No need to update DOM when it's not visible.
        if (Settings.isFmeDisplayEnabled) {
          const fmeName = event.nameText;
          const fmeBody = Language.get('menu.fme.time.starts_in').replace('{time}', event.etaText);

          if (elements.nextEventImage.src.filename() !== event.imageSrc.filename())
            elements.nextEventImage.src = event.imageSrc;

          elements.nextEventName.innerHTML = fmeName;
          elements.nextEventEta.innerHTML = fmeBody;
          elements.nextEventBodyMobile.innerHTML = `${fmeName} - ${event.etaText}`;
        }

        FME.notify(event);
      }
    });

    $(`#next-${key}-event`).toggle(hasValidNext);
  },

  /**
   * Convert minutes to milliseconds
   * @param {number} time Time in minutes
   * @return {number} Time in milliseconds
   */
  minutesToMilliseconds: function (time) {
    return time * 60 * 1000;
  },

  /**
   * Format the event date and perform time-zone calculations
   * @param {Array} event Event data coming from the FME.json file
   * @return {Object} Formatted event data
   */
  getEventObject: function (d, frequency) {
    var eventTime = d[0];
    var now = Date.now();
    var oneDay = this.minutesToMilliseconds(24 * 60);
    var dateTime = this.getDateTime(now, eventTime);
    var eta = dateTime - now;

    // Ensure that event dates are not in the past or too far
    // in the future, where timezone is not UTC
    if (eta > frequency) {
      dateTime = this.getDateTime(now - oneDay, eventTime);
      eta = dateTime - now;
    }

    // Ensure that all event dates are in the future, to fix timezone bug
    if (eta <= 0) {
      dateTime = this.getDateTime(now + oneDay, eventTime);
      eta = dateTime - now;
    }

    return {
      id: d[1],
      dateTime: dateTime,
      name: d[1],
      nameText: Language.get(`menu.fme.${d[1]}`),
      image: `${d[1]}.png`,
      imageSrc: `./assets/images/fme/${d[1]}.png`,
      eta: eta,
      etaText: FME.getEtaText(eta),
    };
  },

  getDateTime: function (date, eventTime) {
    return new Date(
      [new Date(date).toDateString(), eventTime, "UTC"].join(" ")
    );
  },

  /**
   * Display time remaining in minutes or seconds
   * @param {number} t Time in milliseconds
   * @return {string} Translated string
   */
  getEtaText: function (time) {
    time = time / 1000; // convert to seconds
    function pluralize(time) {
      return time === 1 ? '' : 's';
    }
    if (time < 60) {
      return Language.get('menu.fme.time.less_than_a_minute');
    }
    time = Math.round(time / 60); // convert to minutes
    return Language.get('menu.fme.time.minute' + pluralize(time)).replace('{minutes}', time);
  },

  /**
   * Update the FME card
   */
  update: function () {
    if (!Settings.isFmeDisplayEnabled && !Settings.isFmeNotificationEnabled) {
      FME.updateVisiblity();
      return;
    }

    if (FME._eventsJson === null) return;

    FME.updateEvent(FME._eventsJson.general, "general");
    FME.updateEvent(FME._eventsJson.role, "role");

    FME.updateVisiblity();
  },

  /**
   * Update the visibility of the FME card
   */
  updateVisiblity: function () {
    $('#fme-container').toggle(Settings.isFmeDisplayEnabled);
  },

  markNotSupported: function () {
    Settings.isFmeNotificationEnabled = false;
    $('#fme-notification').prop('checked', false).prop('disabled', true);
    $('#fme-notification').parent().parent().addClass('disabled').prop('disabled', true).attr('data-help', 'fme_notification.no_support');
    $('#fme-notification-period').parent().hide();
  },

  markPermissionDenied: function () {
    Settings.isFmeNotificationEnabled = false;
    $('#fme-notification').prop('checked', false).prop('disabled', true);
    $('#fme-notification').parent().parent().addClass('disabled').prop('disabled', true).attr('data-help', 'fme_notification.denied');
    $('#fme-notification-period').parent().hide();
  },

  /**
   * Retrieve the FME data from FME.json
   */
  init: function () {
    $('#fme-display').on("change", function () {
      Settings.isFmeDisplayEnabled = $("#fme-display").prop('checked');
      $('#fme-display-general-period, #fme-display-role-period').parent().toggle(Settings.isFmeDisplayEnabled);
      $('#open-fme-enabled-events-modal').toggle((Settings.isFmeDisplayEnabled || Settings.isFmeNotificationEnabled));
      FME.update();
    });

    $('#fme-display-general-period').on("change", function () {
      let inputValue = parseInt($('#fme-display-general-period').val());
      inputValue = !isNaN(inputValue) ? inputValue : 30;
      if (inputValue < 10 || inputValue > 45) inputValue = 30;
      Settings.fmeDisplayGeneralPeriod = inputValue;
      FME.update();
    });

    $('#fme-display-role-period').on("change", function () {
      let inputValue = parseInt($('#fme-display-role-period').val());
      inputValue = !isNaN(inputValue) ? inputValue : 60;
      if (inputValue < 10 || inputValue > 90) inputValue = 60;
      Settings.fmeDisplayRolePeriod = inputValue;
      FME.update();
    });

    $('#fme-notification').on("change", function () {
      Settings.isFmeNotificationEnabled = $("#fme-notification").prop('checked');

      Notification.requestPermission().then(function (permission) {
        if (permission === "denied") {
          FME.markPermissionDenied();
        }
      });

      $('#fme-notification-period').parent().toggle(Settings.isFmeNotificationEnabled);
      $('#open-fme-enabled-events-modal').toggle((Settings.isFmeDisplayEnabled || Settings.isFmeNotificationEnabled));
    });

    $('#fme-notification-period').on("change", function () {
      let inputValue = parseInt($('#fme-notification-period').val());
      inputValue = !isNaN(inputValue) ? inputValue : 10;
      if (inputValue < 1 || inputValue > 30) inputValue = 10;
      Settings.fmeNotificationPeriod = inputValue;
    });

    if (!("Notification" in window)) {
      this.markNotSupported();
    } else if (Notification.permission === "denied") {
      this.markPermissionDenied();
    }

    $("#fme-display").prop('checked', Settings.isFmeDisplayEnabled);
    $("#fme-display-general-period").val(Settings.fmeDisplayGeneralPeriod).parent().toggle(Settings.isFmeDisplayEnabled);
    $("#fme-display-role-period").val(Settings.fmeDisplayRolePeriod).parent().toggle(Settings.isFmeDisplayEnabled);
    $("#fme-notification").prop('checked', Settings.isFmeNotificationEnabled);
    $("#fme-notification-period").val(Settings.fmeNotificationPeriod);
    $('#fme-notification-period').parent().toggle(Settings.isFmeNotificationEnabled);
    $('#open-fme-enabled-events-modal').toggle((Settings.isFmeDisplayEnabled || Settings.isFmeNotificationEnabled));

    $("input[name='fme-enabled-events[]']").each(function (i, v) {
      const id = $(this).attr('id');
      $(this).prop('checked', (Settings.fmeEnabledEvents & FME.flags[id]));
    });

    $('#open-fme-enabled-events-modal').on('click', function () {
      $('#fme-enabled-events-modal').modal();
    });

    $.getJSON(`data/fme.json?nocache=${nocache}`)
      .done(function (data) {
        FME._eventsJson = data;
        FME.update();
        FME.initModal();
        window.setInterval(FME.update, 10000);
        console.info('%c[FME] Loaded!', 'color: #bada55; background: #242424');
      });
  },

  initModal: function () {
    Object.keys(this.flags).forEach(f => {
      if (f === "none") return;
      var snippet = $(`
        <div class="input-container">
          <label for="${f}" data-text="menu.fme.${f}"></label>
          <div class="input-checkbox-wrapper">
            <input class="input-checkbox" type="checkbox" name="fme-enabled-events[]" value="${this.flags[f]}"
              id="${f}" ${(Settings.fmeEnabledEvents & FME.flags[f]) ? "checked" : ""} />
            <label class="input-checkbox-label" for="${f}"></label>
          </div>
        </div>
      `);

      snippet.change(function () {
        let total = 0;
        $("input[name='fme-enabled-events[]']:checked").each(function (i, v) {
          const value = parseInt($(this).val());
          total += value;
        });
        Settings.fmeEnabledEvents = total;
        FME.update();
      });

      $('#fme-enabled-events-modal #events').append(Language.translateDom(snippet)[0]);
    });

    var items = $('#fme-enabled-events-modal #events').children('.input-container').get();
    items.sort(function (a, b) {
      return $(a).find('label').text().toLowerCase().localeCompare($(b).find('label').text().toLowerCase());
    });
    $.each(items, function (i, e) {
      $('#fme-enabled-events-modal #events').append(e);
    });
  },

  /**
   * Notify a user when an event is coming up in 10 minutes
   * @param {Object} event The event to send a notification for
   */
  notify: function (event) {
    // Disabled in settings.
    if (!Settings.isFmeNotificationEnabled) return;

    // No support.
    if (!("Notification" in window)) {
      this.markNotSupported();
      return;
    }

    // Already sent.
    if (this._sentNotifications.includes(event.eventDateTime)) return;

    // Only send a notification if it's +-20 seconds away from the notification period.
    const timeMax = FME.minutesToMilliseconds(Settings.fmeNotificationPeriod);
    const timeMin = FME.minutesToMilliseconds(Settings.fmeNotificationPeriod - 0.33);
    if (!(event.eta > timeMin && event.eta < timeMax)) return;

    // Use the formatted time in case we want to change the notification period later
    const notificationBody = Language.get('notification.fme.body')
      .replace('{name}', event.nameText)
      .replace('{time}', event.etaText);

    if (Notification.permission === "granted") {
      new Notification(event.nameText, {
        body: notificationBody,
        icon: event.imageSrc,
        lang: Settings.language,
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(function (permission) {
        if (permission === "granted") {
          new Notification(event.nameText, {
            body: notificationBody,
            icon: event.imageSrc,
            lang: Settings.language,
          });
        }
      });
    }

    if (Notification.permission === "denied") {
      this.markPermissionDenied();
    }

    // Always add this to really make sure there's no dupes, even when the user denied permissions.
    this._sentNotifications.push(event.eventDateTime);
  }
};