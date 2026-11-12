// ==UserScript==
// @name         Red Dead Online - Collectors Inventory Sync
// @namespace    https://github.com/jeanropke/RDR2CollectorsMap
// @version      1.0
// @description  Sync your satchel with RDO Collectors Map.
// @author       Jeanropke
// @match        *://localhost*/*
// @match        *://127.0.0.1*/*
// @match        *://jeanropke.github.io/RDR2CollectorsMap/*
// @match        https://socialclub.rockstargames.com/games/rdo/overview
// @icon         https://jeanropke.github.io/RDR2CollectorsMap/apple-touch-icon.png
// @license      MIT
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_addStyle
// ==/UserScript==

(async function () {
  ('use strict');

  const RDOInventory = {
    Items: [],
    TokenName: null,

    getCookie: (name) =>
      document.cookie.match(`(^|;) ?${name}=([^;]*)(;|$)`)?.[2] ?? null,

    fetchWithProgress: async function (url, options, onProgress) {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`Fetch error: ${response.statusText}`);

      const contentLength = response.headers.get('content-length');
      if (!contentLength) return response;

      const total = parseInt(contentLength, 10);
      let loaded = 0;

      const reader = response.body.getReader();
      const stream = new ReadableStream({
        async start(controller) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }
            loaded += value.byteLength;
            onProgress({ loaded, total });
            controller.enqueue(value);
          }
        }
      });

      return new Response(stream, { headers: response.headers });
    },

    doRequest: async function (object) {
      try {
        const response = await requestWithRetry(async () => {
          const bearerToken = this.getCookie(RDOInventory.TokenName);
          const response = await this.fetchWithProgress(
            object.url,
            {
              method: object.method,
              credentials: 'include',
              headers: {
                authorization: `Bearer ${bearerToken}`,
                'x-requested-with': 'XMLHttpRequest'
              }
            },
            (progressEvent) => {
              window.dispatchEvent(
                new CustomEvent('onProgressChanged', {
                  detail: { progress: progressEvent }
                })
              );
            }
          );
  
          if (!response.ok) throw response;
          return response;
        });
  
        const json = await response.json();
        if (!json.status) throw new Error('Request failed');
        object.success(json);
      } catch (error) {
        if (error instanceof Response) {
          switch (error.status) {
            case 401:
              this.doRefreshRequest(object);
              break;
            case 429:
              object.error(new Error('Rate limited.'));
              break;
            default:
              object.error(new Error(`Request failed: ${error.status} - ${error.statusText}`));
              break;
          }
        } else {
          object.error(new Error(`An error occurred: ${error}`));
        }
      }
    },

    doRefreshRequest: async function (object) {
      try {
        if (object.triedRefresh) throw new Error('Could not refresh access.');
        object.triedRefresh = true;

        const bearerToken = this.getCookie(RDOInventory.TokenName);
        if (!bearerToken) throw new Error('No bearer token found');
        const response = await fetch(
          'https://socialclub.rockstargames.com/connect/refreshaccess',
          {
            method: 'POST',
            body: `accessToken=${bearerToken}`,
            credentials: 'include',
            headers: {
              'content-type':
                'application/x-www-form-urlencoded; charset=utf-8',
              'x-requested-with': 'XMLHttpRequest'
            }
          }
        );

        if (!response.ok) throw new Error('Could not refresh access.');

        this.doRequest(object);
      } catch (error) {
        console.error('An error occurred:', error);
        object.error(new Error('An unexpected error occurred.'));
      }
    },

    copy: (text) =>
      navigator.clipboard
        .writeText(text)
        .catch((err) => console.error('Could not copy text:', err)),

    download: (filename, text) => {
      const element = document.createElement('a');
      element.setAttribute(
        'href',
        'data:text/plain;charset=utf-8,' + encodeURIComponent(text)
      );
      element.setAttribute('download', filename);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const syncManager = {
    map: () => {
      const supportedPlatforms = [
        { text: 'PC', value: 'pc' },
        { text: 'PlayStation', value: 'ps4' },
        { text: 'Xbox', value: 'xboxone' }
      ];

      window.addEventListener('load', () => {
        checkNotificationPermission();
        const platform = document.getElementById('platform');
        if (platform) platform.value = GM_getValue('rdo-platform') || 'pc';
        collectorsMap();
      });

      function collectorsMap() {
        const mainBox = document.createElement('div');
        mainBox.id = 'main-box';
        mainBox.innerHTML = `
          <div id="main-box-close">X</div>
          <div>
            <select class="input-text wide-select-menu" id="platform" style="height: 34px"></select>
            <button class="btn btn-primary" id="sync-button" data-text="extension.inventory_sync_button">Sync</button>
            <p id="sync-text" data-text="extension.inventory_sync_status">Press sync button</p>
          </div>`;
        Language.translateDom(mainBox);
        document.body.appendChild(mainBox);

        mainBox.setAttribute('title', Language.get('extension.inventory_sync_title'));
        mainBox.querySelectorAll('[data-text]').forEach((el) =>
          (el.textContent = Language.get(el.getAttribute('data-text')))
        );

        draggify(mainBox, { storageKey: 'rdr2collector.syncBoxPosition' });

        const syncText = document.getElementById('sync-text');
        supportedPlatforms.forEach(({ text, value }) => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = text;
          document.getElementById('platform').appendChild(option);
        });

        document.getElementById('sync-button').addEventListener('click', () => {
          GM_deleteValue('rdo-inventory');
          const platformValue = document.getElementById('platform').value;
          if (platformValue) GM_setValue('rdo-platform', platformValue);
          syncText.textContent = Language.get('extension.inventory_sync_syncing');

          const openedWindow = window.open('https://socialclub.rockstargames.com/games/rdo/overview', '_blank');
          openedWindow.focus();

          const listenerId = GM_addValueChangeListener(
            'rdo-inventory',
            (name, oldValue, newValue, remote) => {
              GM_removeValueChangeListener(listenerId);
              if (openedWindow.closed) {
                syncText.textContent = Language.get('extension.inventory_sync_window_closed');
                notify(Language.get('notification.extension.inventory_sync_window_closed'));
                return;
              }

              if (!newValue) return;

              if (newValue !== 'error') {
                runInPageContext(
                  (inventory) => Inventory.import(inventory),
                  newValue
                );
                syncText.textContent = Language.get('extension.inventory_sync_success');
                notify(Language.get('notification.extension.inventory_sync_success'), 'success');
              } else {
                syncText.textContent = Language.get('extension.inventory_sync_failed');
                notify(Language.get('notification.extension.inventory_sync_failed'), 'error');
              }
            }
          );
        });

        document.getElementById('main-box-close').addEventListener('click', () =>
          document.getElementById('main-box').remove()
        );
      };

      function runInPageContext(fn, ...args) {
        const script = document.createElement('script');
        script.textContent = `(${fn})(${args.map(arg => JSON.stringify(arg)).join(',')});`;
        document.documentElement.appendChild(script);
        script.remove();
      }
    },

    socialclub: () => {
      window.addEventListener('onProgressChanged', (e) => {
        document.getElementById('progress-changed').textContent = ` ${Math.round(
          (e.detail.progress.loaded / e.detail.progress.total) * 100
        )}%`;
      });

      window.addEventListener('load', () => window.opener && openSocialClub());

      async function openSocialClub() {
        const windowVars = getWindowVariables([
          'siteMaster.locale',
          'siteMaster.isLoggedIn',
          'siteMaster.authRockstarId',
          'siteMaster.scauth.tokenCookieName'
        ]);
        // const locale = windowVars['siteMaster.locale'];

        if (windowVars['siteMaster.isLoggedIn'] == 'false') return;

        document.documentElement.style.overflow = 'hidden';
        const socialclubBox = document.createElement('div');
        socialclubBox.id = 'socialclub-box';
        socialclubBox.innerHTML = `
          <div class="content">
            <img class="loading-spin" src="https://s.rsg.sc/sc/images/games/RDR2/spinner_full_small.png">
            <div><span id="sync-status" data-text="socialclub.inventory_sync_status_loading">Loading inventory...</span><small id="progress-changed"></small></div>
            <div id="error"></div>
          </div>`;
        document.body.appendChild(socialclubBox);

        const syncStatus = document.getElementById('sync-status');
        const platformEl = document.getElementById('platform');
        const rdoPlatformVal = platformEl ? platformEl.value : GM_getValue('rdo-platform');

        RDOInventory.TokenName = windowVars['siteMaster.scauth.tokenCookieName'];
        RDOInventory.doRequest({
          url: `https://scapi.rockstargames.com/games/rdo/inventory/character?platform=${rdoPlatformVal}&forRockstarId=${windowVars['siteMaster.authRockstarId']}`,
          method: 'GET',
          success: (json) => {
            RDOInventory.Items = json.items
              .filter((item) => item.slotid == '1084182731')
              .filter(
                (item, idx, self) =>
                  self.findIndex((_item) => _item.itemid === item.itemid) === idx
              )
              .map((item) => ({
                itemid: item.itemid,
                quantity: json.items
                  .filter((_item) => _item.itemid === item.itemid)
                  .sort((a, b) => b.quantity - a.quantity)[0].quantity
              }));

            GM_setValue('rdo-inventory', JSON.stringify(RDOInventory.Items));

            let countdown = 2;
            const countdownInterval = setInterval(() => {
              document.getElementById('progress-changed').textContent = '';
              syncStatus.textContent =
                countdown > 0
                  ? `Loading complete, closing this window in ${countdown--}s...`
                  : (clearInterval(countdownInterval), window.close());
            }, 1000);
          },
          error: (error) => {
            syncStatus.textContent = 'Something went wrong :(';
            document.getElementById('error').textContent = `ERROR: ${error}`;
            GM_setValue('rdo-inventory', 'error');
          }
        });
      };

      function getWindowVariables(variables) {
        const ret = {};
        const dataAttrPrefix = 'data-tmp-';
        const scriptContent = variables
          .map(
            (variable) =>
              `if (typeof ${variable} !== 'undefined') document.body.setAttribute('${dataAttrPrefix}${variable}', ${variable});`
          )
          .join('\n');

        const script = document.createElement('script');
        script.textContent = scriptContent;
        document.body.appendChild(script);

        variables.forEach((variable) => {
          const value = document.body.getAttribute(
            `${dataAttrPrefix}${variable}`
          );
          ret[variable] = value ?? undefined;
          document.body.removeAttribute(`${dataAttrPrefix}${variable}`);
        });

        script.remove();
        return ret;
      };
    }
  };

  const hostname = window.location.hostname;
  const pageKey =
    hostname.includes('127.0.0.1') ||
    hostname.includes('localhost') ||
    hostname.includes('jeanropke')
      ? 'map'
      : 'socialclub';

  syncManager[pageKey]?.();

  addStyle();
})();

async function requestWithRetry(fn, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

function checkNotificationPermission() {
  if (Notification.permission === 'granted') {
    return true;
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        console.log('Notifications enabled');
      }
    });
  }
  return false;
}

function notify(message, type = 'info') {
  if (!checkNotificationPermission()) return;

  const options = { body: message };

  switch (type) {
    case 'success':
      options.body = `✔️ ${message}`;
      break;
    case 'error':
      options.body = `❌ ${message}`;
      break;
    case 'info':
    default:
      options.body = `ℹ️ ${message}`;
      break;
  }

  new Notification(Language.get('notification.extension.inventory_sync_title'), options);
}

function addStyle() {
  let css = `#main-box {
    position: absolute;
    width: 350px;
    height: 100px;
    bottom: 25px;
    right: 50px;
    z-index: 9999;
    background-image: url(./assets/images/fme_background.png);
    background-size: 100% 100%;
    color: #fff;
    justify-content: center;
    align-items: center;
    display: flex;
  }

  #sync-text {
      text-align: center;
      padding: 5px;
  }

  #main-box-close {
      position: absolute;
      left: 10px;
      top: 10px;
      cursor: pointer;
      user-select: none;
  }

  #socialclub-box {
      font-family: RDR-Lino;
      position: absolute;
      margin: 0;
      width: 100%;
      height: 100%;
      background: #0f0f0ffa;
      z-index: 9999;
      top: 0;
      justify-content: center;
      display: flex;
      color: #eee;
  }

  #socialclub-box .content {
      top: 45%;
      position: absolute;
      text-align: center;
  }

  #socialclub-box p {    
      font-size: 20pt;
  }

  #socialclub-box #progress-changed {
      font-size: 20px;
  }

  #socialclub-box #error {
      color: #900c0c;
      font-family: Hapna;
  }

  .loading-spin {
      position: absolute;
      height: 35px;
      width: 35px;
      margin: -10px -44px;
      animation: spin 1s ease-in-out infinite;
  }

  @keyframes spin { 100% { -webkit-transform: rotate(60deg); transform:rotate(60deg); } }
  `;

  GM_addStyle(css);
}