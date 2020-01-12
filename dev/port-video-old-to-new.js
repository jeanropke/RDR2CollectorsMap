// Get the oldList from the current items.json, no change needed.
// Get the newList from port-source-coords-to-website-coords.js, also no change needed after that.

// !!!
// Don't forget the random items in both lists!
// !!!

// Import from items.json.
var oldList = {};

// Import from port-source-coords-to-website-coords.js.
var newList = {};

Object.keys(oldList).forEach(category => {
    if (category == "random") return;
    if (category == "american_flowers") return;

    Object.keys(oldList[category]).forEach(cycle => {
        console.log(category, cycle);

        for (var index = 0; index < oldList[category][cycle].length; index++) {
            var element = oldList[category][cycle][index];

            var otherElement = newList[category][cycle].find(item => {
                return item.text === element.text;
            })

            if (!otherElement) {
                console.log('=== SKIPPED', element.text, '===');
                continue;
            };

            var otherElementIndex = newList[category][cycle].findIndex(item => {
                return item.text === element.text;
            })

            newList[category][cycle][otherElementIndex].tool = element.tool;

            if (element.video) {
                newList[category][cycle][otherElementIndex].video = element.video;
            }
        }
    });
});


function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

download('items.json', JSON.stringify(newList, null, 4));