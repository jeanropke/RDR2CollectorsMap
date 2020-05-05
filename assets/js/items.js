class Collection {
  constructor(preliminary) {
    Object.assign(this, preliminary);
    this.items = []; // filled by new Item()s
  }
  static init(collections) {
    this.collections = Object.create(null);
    Object.entries(collections).forEach(([category, price]) =>
      this.collections[category] = new Collection({category, price}));
    return Loader.promises['weekly'].consumeJson(data => {
      const nameViaParam = getParameterByName('weekly');
      this.weeklySetName = data.sets[nameViaParam] ? nameViaParam : data.current;
      this.weeklyItems = data.sets[this.weeklySetName];
      console.info('%c[Weekly Set] Loaded!', 'color: #bada55; background: #242424');
    });
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
    this.collection = Collection.collections[this.category];
    this.collection.items.push(this);
    this.itemTranslationKey = `${this.itemId}.name`;
    this.legacyItemId = this.itemId.replace(/^flower_|^egg_/, '');
    this.markers = [];  // filled by Marker.init();
    this._amountKey = `amount.${this.itemId}`;
  }
  static init() {
    this.items = Object.create(null);
    return Loader.promises['items_value'].consumeJson(data => {
      const weekly = Collection.init(data.full);
      Object.entries(data.items).forEach(([itemId, price]) =>
        this.items[itemId] = new Item({itemId, price}));
      this.compatInit();
      return weekly;
    });
  }
  // prefill whenever “new” inventory is empty and “old” inventory exists
  static compatInit() {
    const oldAmounts = JSON.parse(localStorage.getItem("inventory"));
    if (oldAmounts && !Object.keys(localStorage).some(key => key.startsWith('amount.'))) {
      Object.entries(Item.items).forEach(([itemId, item]) => item.amount = oldAmounts[itemId]);
      console.log('old amounts converted');
      localStorage.removeItem('inventory');
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
  // use the following marker based property only after Marker.init()!
  effectiveAmount() {
    if (InventorySettings.isEnabled) {
      return this.amount;
    } else {
      return this.markers.filter(marker => marker.isCurrent && marker.isCollected).length;
    }
  }
}