var Marker = function (text, lat, lng, tool, day, category, subdata, video) {
  this.text = text;
  this.lat = lat;
  this.lng = lng;
  this.tool = tool;
  this.title = Language.get(`${text}.name`);
  this.day = day;
  this.category = category;
  this.subdata = subdata;
  this.video = video;
  this.description = (this.subdata == 'agarita' || this.subdata == 'blood_flower' ? Language.get('map.flower_type.night_only') : '') + Language.get(`${text}_${this.day}.desc`);
  this.isVisible = enabledCategories.includes(category);
  this.amount = Inventory.items[text] == null ? 0 : Inventory.items[text].amount;
  this.isCollected = Inventory.items[text] == null ? false : (Inventory.items[text].isCollected);//collectedItems.includes(text);
  this.canCollect = Inventory.isEnabled ? (this.amount < Inventory.stackSize && !this.isCollected) : !this.isCollected;
}
