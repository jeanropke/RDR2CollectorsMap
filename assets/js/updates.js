class Updates {
  static init() {
    return Loader.promises['updates'].consumeJson(data => {
      this._json = data;
      this.checkNewVersion();
      console.info('%c[Updates] Loaded!', 'color: #bada55; background: #242424');
    });
  }

  static checkNewVersion() {
    // Possibility for enhancement; "Check for new updates" functionality, re-fetching updates.json.
    // Currently only used during init, don't see much reason not to do it on interval at some point.
    const version = this._json.version;
    if (Settings.lastVersion === version) return;
    this.showModal();
    Settings.lastVersion = version;
  }

  static showModal() {
    // This next line is because I'm lazy and I should feel bad, should only be possible by clicks.
    // Not sure if the user can ever be quick enough, but this should prevent any issues if they are.
    if (!this._json) return;

    $('#map-updates-modal .modal-body').empty();

    const data = this._json;
    const snippet = $(`<p>${data.message}</p>`);

    data.lists.forEach(list => {
      snippet.append($(`
        <div class="modal-list">
          <h4>${list.text}</h4>
          ${list.items.map(item => `<p>- ${item}</p>`).join("")}
        </div>
      `));
    });

    if (data.links.length > 0) {
      snippet.append($(`
        <div class="modal-actions">
          <h4 data-text="menu.modal_map_updates_actions"></h4>
          ${data.links.map(link => `<a class="btn btn-${link.class || "link"}" href="${link.url}" target="_blank" rel="noopener noreferrer">${link.text}</a>`).join("")}
        </div>
      `));
    }

    $('#map-updates-modal .modal-body').append(Language.translateDom(snippet));
    $('#map-updates-modal').modal('show');
  }
}