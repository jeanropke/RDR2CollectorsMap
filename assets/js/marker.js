class Marker {
  constructor(text, lat, lng, tool, day, category, subdata, video, height) {
    this.text = text;
    this.lat = lat;
    this.lng = lng;
    this.tool = tool;
    this.title = Language.get(`${text}.name`);
    this.day = day;
    this.category = category;
    this.subdata = subdata;
    this.video = video;
    this.height = height;
    this.description = (this.subdata == 'agarita' || this.subdata == 'blood_flower' ? Language.get('map.flower_type.night_only') : '') + Language.get(`${this.text}_${this.day}.desc`);
    this.isVisible = enabledCategories.includes(this.category);
    this.amount = Inventory.items[this.text.replace(/_\d/, '')] || 0;
    this.isCollected = MapBase.collectedItems[this.text] || false;
    this.canCollect = Inventory.isEnabled ? (this.amount < Inventory.stackSize && !this.isCollected) : !this.isCollected;
  }
}

