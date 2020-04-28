class Collection {
  // Collection.collections and more is constructed in `Item.init()`
  constructor(preliminary) {
    Object.assign(this, preliminary);
    this.items = Object.values(Item.items).filter(item => item.category === this.category);
  }
  averageAmount() {
    return this.items.reduce((sum, item) => sum + item.amount, 0) / this.items.length;
  }
  effectiveAmount() {
    return Math.min(...this.items.map(item => item.effectiveAmount()));
  }
  totalValue() {
    const collectionAmount = this.effectiveAmount();
    return this.items
      .map(item => (item.effectiveAmount() - collectionAmount) * item.price)
      .reduce((a, b) => a + b, 0) +
      collectionAmount * this.price;
  }
  static totalValue() {
    return Object.values(this.collections)
      .reduce((sum, collection) => sum + collection.totalValue(), 0);
  }
}

class Item {
  constructor(preliminary) {
    Object.assign(this, preliminary);
    this.category = this.itemId.split('_', 1)[0];
    this.legacyItemId = this.itemId.replace(/^flower_|^egg_/, '');
    this._amountKey = `amount.${this.itemId}`;
  }
  static init() {
    this.items = Object.create(null);
    Collection.collections = Object.create(null);
    const itemAndCollection = Loader.promises['items_value'].consumeJson(data => {
      Object.entries(data.items).forEach(([itemId, price]) =>
        this.items[itemId] = new Item({itemId, price}));
      Object.entries(data.full).forEach(([category, price]) =>
        Collection.collections[category] = new Collection({category, price}));
      this.compatInit();
    });
    const weekly = Loader.promises['weekly'].consumeJson(data => {
      const nameViaParam = getParameterByName('weekly');
      const setViaParam = data.sets[nameViaParam];
      Collection.weeklySetName = setViaParam ? nameViaParam : data.current;
      Collection.weeklyItems = setViaParam || data.sets[Collection.weeklySetName];
      console.info('%c[Weekly Set] Loaded!', 'color: #bada55; background: #242424');
    });
    return Promise.all([itemAndCollection, weekly]);
  }
  // prefill whenever “new” inventory is empty and “old” inventory exists
  // avoids deleting old inventory for the moment
  static compatInit() {
    const oldAmounts = JSON.parse(localStorage.getItem("inventory"));
    if (oldAmounts && !Object.keys(localStorage).some(key => key.startsWith('amount.'))) {
      Object.entries(Item.items).forEach(([itemId, item]) => item.amount = oldAmounts[itemId]);
      console.log('old amounts converted');
    }
  }
  get amount() {
    return +localStorage.getItem(this._amountKey);
  }
  set amount(value) {
    if (value < 0) value = 0;
    if (value) {
      localStorage.setItem(this._amountKey, value);
    } else {
      localStorage.removeItem(this._amountKey);
    }
  }
  // use the following marker based properties only after Markers are initialized!
  firstMarker() {
    return MapBase.markers.find(marker => marker.itemId === this.itemId);
  }
  effectiveAmount() {
    if (InventorySettings.isEnabled) {
      return this.amount;
    } else {
      return this.firstMarker().isCollected ? 1 : 0;
    }
  }
}