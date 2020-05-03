/**
 * Created by Richard Westenra, stripped to only display next 2 events.
 * For the full experience, please visit his websites at:
 * 
 * Website: https://www.richardwestenra.com/rdr2-free-roam-event-schedule
 * Patreon: https://www.patreon.com/bePatron?u=24592842
 * GitHub: https://github.com/richardwestenra
 * 
 * License: MIT
 */

var FME = {
    // The last retrieved events JSON
    _eventsJson: null,

    // A list of notifications that have already been sent to prevent dupes
    // Doesn't account for people refreshing just in time
    // Maybe make this persistent later, but there's no real need for it
    _sentNotifications: [],

    flags: {
        none: 0,
        condor_egg: 1,
        day_of_reckoning: 2,
        manhunt: 4,
        salvage: 8,
        trade_route: 16,
    },

    // DOM elements for the FME card
    elements: {
        nextEventImage: document.getElementById('next-image'),
        nextEventName: document.getElementById('next-name'),
        nextEventEta: document.getElementById('next-eta'),
        nextEventBodyMobile: document.getElementById('next-body-mobile'),
    },

    /**
     * Update the FME data
     * @param {Array} schedule List of event times
     */
    updateEvent: function (schedule) {
        var elements = FME.elements;
        var frequency = FME.minutesToMilliseconds(Settings.fmeDisplayPeriod);
        var hasValidNext = false;
        schedule.forEach(function (e, i) {
            var event = FME.getEventObject(e);
            if (event.eta > 0 && event.eta < frequency && Settings.fmeEnabledEvents & FME.flags[event.name]) {
                hasValidNext = true;

                // No need to update DOM when it's not visible.
                if (Settings.isFmeDisplayEnabled) {
                    var fmeName = event.nameText;
                    var fmeBody = Language.get('menu.fme.time.starts_in').replace('{time}', event.etaText);
                    elements.nextEventImage.src = event.imageSrc;
                    elements.nextEventName.innerHTML = fmeName;
                    elements.nextEventEta.innerHTML = fmeBody;
                    elements.nextEventBodyMobile.innerHTML = `${fmeName} - ${fmeBody}`;
                }

                FME.notify(event);
            }
        });
        $('#next-event').toggle(hasValidNext);
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
    getEventObject: function (event) {
        var eventTime = event[0];
        var now = new Date();
        var eventDateTime = new Date(
            [now.toDateString(), eventTime, 'UTC'].join(' ')
        );
        var eta = eventDateTime - now;
        // Ensure that all event dates are in the future, to fix timezone bug
        if (eta <= 0) {
            var tomorrow = new Date();
            tomorrow.setDate(now.getDate() + 1);
            eventDateTime = new Date(
                [tomorrow.toDateString(), eventTime, 'UTC'].join(' ')
            );
            eta = eventDateTime - now;
        }
        return {
            id: event[1],
            dateTime: eventDateTime,
            name: event[1],
            nameText: Language.get(`menu.fme.${event[1]}`),
            image: `${event[1]}.png`,
            imageSrc: `./assets/images/fme/${event[1]}.png`,
            eta: eta,
            etaText: FME.getEtaText(eta),
        };
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
        if (!Settings.isFmeDisplayEnabled && !Settings.isFmeNotificationEnabled) return;
        if (FME._eventsJson === null) return;
        FME.updateEvent(FME._eventsJson);
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
            $('#fme-display-period').parent().toggle(Settings.isFmeDisplayEnabled);
            $('#open-fme-enabled-events-modal').toggle((Settings.isFmeDisplayEnabled || Settings.isFmeNotificationEnabled));
            FME.update();
        });

        $('#fme-display-period').on("change", function () {
            var inputValue = parseInt($('#fme-display-period').val());
            inputValue = !isNaN(inputValue) ? inputValue : 60;
            if (inputValue < 10 || inputValue > 90) inputValue = 60;
            Settings.fmeDisplayPeriod = inputValue;
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
            var inputValue = parseInt($('#fme-notification-period').val());
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
        $("#fme-display-period").val(Settings.fmeDisplayPeriod);
        $('#fme-display-period').parent().toggle(Settings.isFmeDisplayEnabled);
        $("#fme-notification").prop('checked', Settings.isFmeNotificationEnabled);
        $("#fme-notification-period").val(Settings.fmeNotificationPeriod);
        $('#fme-notification-period').parent().toggle(Settings.isFmeNotificationEnabled);
        $('#open-fme-enabled-events-modal').toggle((Settings.isFmeDisplayEnabled || Settings.isFmeNotificationEnabled));

        $("input[name='fme-enabled-events[]']").each(function (i, v) {
            var id = $(this).attr('id');
            $(this).prop('checked', (Settings.fmeEnabledEvents & FME.flags[id]));
        });

        $("input[name='fme-enabled-events[]']").change(function () {
            var total = 0;
            $("input[name='fme-enabled-events[]']:checked").each(function (i, v) {
                var value = parseInt($(this).val());
                total += value;
            });
            Settings.fmeEnabledEvents = total;
            FME.update();
        });

        $('#open-fme-enabled-events-modal').on('click', function () {
            $('#fme-enabled-events-modal').modal();
        });

        $.getJSON(`data/fme.json?nocache=${nocache}`)
            .done(function (data) {
                FME._eventsJson = data;
                FME.update();
                window.setInterval(FME.update, 10000);
                console.info('%c[FME] Loaded!', 'color: #bada55; background: #242424');
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
        var timeMax = FME.minutesToMilliseconds(Settings.fmeNotificationPeriod);
        var timeMin = FME.minutesToMilliseconds(Settings.fmeNotificationPeriod - 0.33);
        if (!(event.eta > timeMin && event.eta < timeMax)) return;

        // Use the formatted time in case we want to change the notification period later
        var notificationBody = Language.get('notification.fme.body')
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