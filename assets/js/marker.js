var Marker = function(text, lat, lng, tool, day, category, subdata, video) {
  this.text = text;
  this.lat = lat;
  this.lng = lng;
  this.tool = tool;
  this.title = Language.get(`${text}.name`);
  this.description = Language.get(`${text}_${day}.desc`);
  this.day = day;
  this.category = category;
  this.subdata = subdata;
  this.video = video;
  this.isVisible = enabledCategories.includes(category);
  this.isCollected = collectedItems.includes(text);
}
