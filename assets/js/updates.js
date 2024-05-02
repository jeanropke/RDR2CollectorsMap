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

    const modalBody = document.querySelector('#map-updates-modal .modal-body');
    if (!modalBody) return;
    modalBody.innerHTML = '';

    const data = this._json;
    const snippet = document.createElement('p');
    snippet.textContent = data.message;
    data.lists.forEach(list => {
      const listElement = document.createElement('div');
      listElement.classList.add('modal-list');
      const listTitle = document.createElement('h4');
      listTitle.textContent = list.text;
      listElement.appendChild(listTitle);
      list.items.forEach(item => {
        const listItem = document.createElement('p');
        listItem.textContent = `- ${item}`;
        listElement.appendChild(listItem);
      });
      snippet.appendChild(listElement);
    });

    if (data.links.length > 0) {
      const actionsDiv = document.createElement('div');
      actionsDiv.classList.add('modal-actions');
      const actionsTitle = document.createElement('h4');
      actionsTitle.setAttribute('data-text', 'menu.modal_map_updates_actions');
      actionsDiv.appendChild(actionsTitle);
      data.links.forEach(link => {
        const linkEl = document.createElement('a');
        linkEl.classList.add('btn');
        linkEl.classList.add(`btn-${link.class || "link"}`);
        linkEl.href = link.url;
        linkEl.target = '_blank';
        linkEl.rel = 'noopener noreferrer';
        linkEl.textContent = link.text;
        actionsDiv.appendChild(linkEl);
      });
      snippet.appendChild(actionsDiv);
    }
    
    modalBody.appendChild(Language.translateDom(snippet));
    $('#map-updates-modal').modal('show');
  }
}