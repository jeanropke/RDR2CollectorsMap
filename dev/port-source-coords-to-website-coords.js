// All you need to do for this to work is to format the source coordinates to match the structure in items.
// Use a simple find/replace to deal with the lang strings for the items, and don't forget to match the categories!
// The function correctDay is to make it all line up nicely with the current map data, might need to be changed later.

// !!!
// As soon as you run this, it'll download the JSON file. Don't forget to use that in port-video-old-to-new.js
// !!!

// Import from the game source, read above.
var items = {};

var newItems = {};

Object.keys(items).forEach((catKey, catValue) => {
    newItems[catKey] = {};

    for (var dayIndex = 1; dayIndex < 7; dayIndex++) {
        newItems[catKey][dayIndex] = [];
    }

    Object.keys(items[catKey]).forEach((itemKey, itemValue) => {
        if (catKey == 'bird_eggs' && items[catKey][itemKey].length == 12) {
            for (var dayIndex = 0; dayIndex < 6; dayIndex++) {
                var curItem1 = items[catKey][itemKey][0 + (dayIndex * 2)];
                var curItem2 = items[catKey][itemKey][1 + (dayIndex * 2)];

                var itemFormatted1 = {
                    text: itemKey.replace('_.name', '_1'),
                    tool: 0,
                    lat: (0.01552 * curItem1.lng + -63.6).toFixed(4),
                    lng: (0.01552 * curItem1.lat + 111.294).toFixed(4)
                }

                newItems[catKey][correctDay(catKey, dayIndex + 1)].push(itemFormatted1);

                var itemFormatted2 = {
                    text: itemKey.replace('_.name', '_2'),
                    tool: 0,
                    lat: (0.01552 * curItem2.lng + -63.6).toFixed(4),
                    lng: (0.01552 * curItem2.lat + 111.294).toFixed(4)
                }

                newItems[catKey][correctDay(catKey, dayIndex + 1)].push(itemFormatted2);
            }
        } else if (catKey == 'american_flowers') {
            for (var dayIndex = 0; dayIndex < 6; dayIndex++) {
                if (items[catKey][itemKey].length == 18) {
                    var curItem1 = items[catKey][itemKey][0 + (dayIndex * 3)];
                    var curItem2 = items[catKey][itemKey][1 + (dayIndex * 3)];
                    var curItem3 = items[catKey][itemKey][2 + (dayIndex * 3)];

                    var itemFormatted1 = {
                        text: itemKey.replace('_.name', '_1'),
                        tool: 0,
                        lat: (0.01552 * curItem1.lng + -63.6).toFixed(4),
                        lng: (0.01552 * curItem1.lat + 111.294).toFixed(4)
                    }

                    newItems[catKey][correctDay(catKey, dayIndex + 1)].push(itemFormatted1);

                    var itemFormatted2 = {
                        text: itemKey.replace('_.name', '_2'),
                        tool: 0,
                        lat: (0.01552 * curItem2.lng + -63.6).toFixed(4),
                        lng: (0.01552 * curItem2.lat + 111.294).toFixed(4)
                    }

                    newItems[catKey][correctDay(catKey, dayIndex + 1)].push(itemFormatted2);

                    var itemFormatted3 = {
                        text: itemKey.replace('_.name', '_3'),
                        tool: 0,
                        lat: (0.0155 * curItem3.lng + -63.6).toFixed(4),
                        lng: (0.01552 * curItem3.lat + 111.294).toFixed(4)
                    }

                    newItems[catKey][correctDay(catKey, dayIndex + 1)].push(itemFormatted3);
                } else if (items[catKey][itemKey].length == 36) {
                    var curItem1 = items[catKey][itemKey][0 + (dayIndex * 6)];
                    var curItem2 = items[catKey][itemKey][1 + (dayIndex * 6)];
                    var curItem3 = items[catKey][itemKey][2 + (dayIndex * 6)];
                    var curItem4 = items[catKey][itemKey][3 + (dayIndex * 6)];
                    var curItem5 = items[catKey][itemKey][4 + (dayIndex * 6)];
                    var curItem6 = items[catKey][itemKey][5 + (dayIndex * 6)];

                    var itemFormatted1 = {
                        text: itemKey.replace('_.name', '_1'),
                        tool: 0,
                        lat: (0.01552 * curItem1.lng + -63.6).toFixed(4),
                        lng: (0.01552 * curItem1.lat + 111.294).toFixed(4)
                    }

                    newItems[catKey][correctDay(catKey, dayIndex + 1)].push(itemFormatted1);

                    var itemFormatted2 = {
                        text: itemKey.replace('_.name', '_2'),
                        tool: 0,
                        lat: (0.01552 * curItem2.lng + -63.6).toFixed(4),
                        lng: (0.01552 * curItem2.lat + 111.294).toFixed(4)
                    }

                    newItems[catKey][correctDay(catKey, dayIndex + 1)].push(itemFormatted2);

                    var itemFormatted3 = {
                        text: itemKey.replace('_.name', '_3'),
                        tool: 0,
                        lat: (0.0155 * curItem3.lng + -63.6).toFixed(4),
                        lng: (0.01552 * curItem3.lat + 111.294).toFixed(4)
                    }

                    newItems[catKey][correctDay(catKey, dayIndex + 1)].push(itemFormatted3);

                    var itemFormatted4 = {
                        text: itemKey.replace('_.name', '_4'),
                        tool: 0,
                        lat: (0.01552 * curItem4.lng + -63.6).toFixed(4),
                        lng: (0.01552 * curItem4.lat + 111.294).toFixed(4)
                    }

                    newItems[catKey][correctDay(catKey, dayIndex + 1)].push(itemFormatted4);

                    var itemFormatted5 = {
                        text: itemKey.replace('_.name', '_5'),
                        tool: 0,
                        lat: (0.01552 * curItem5.lng + -63.6).toFixed(4),
                        lng: (0.01552 * curItem5.lat + 111.294).toFixed(4)
                    }

                    newItems[catKey][correctDay(catKey, dayIndex + 1)].push(itemFormatted5);

                    var itemFormatted6 = {
                        text: itemKey.replace('_.name', '_6'),
                        tool: 0,
                        lat: (0.0155 * curItem6.lng + -63.6).toFixed(4),
                        lng: (0.01552 * curItem6.lat + 111.294).toFixed(4)
                    }

                    newItems[catKey][correctDay(catKey, dayIndex + 1)].push(itemFormatted6);
                } else if (items[catKey][itemKey].length == 54) {
                    var curItem1 = items[catKey][itemKey][0 + (dayIndex * 9)];
                    var curItem2 = items[catKey][itemKey][1 + (dayIndex * 9)];
                    var curItem3 = items[catKey][itemKey][2 + (dayIndex * 9)];
                    var curItem4 = items[catKey][itemKey][3 + (dayIndex * 9)];
                    var curItem5 = items[catKey][itemKey][4 + (dayIndex * 9)];
                    var curItem6 = items[catKey][itemKey][5 + (dayIndex * 9)];
                    var curItem7 = items[catKey][itemKey][6 + (dayIndex * 9)];
                    var curItem8 = items[catKey][itemKey][7 + (dayIndex * 9)];
                    var curItem9 = items[catKey][itemKey][8 + (dayIndex * 9)];

                    var itemFormatted1 = {
                        text: itemKey.replace('_.name', '_1'),
                        tool: 0,
                        lat: (0.01552 * curItem1.lng + -63.6).toFixed(4),
                        lng: (0.01552 * curItem1.lat + 111.294).toFixed(4)
                    }

                    newItems[catKey][correctDay(catKey, dayIndex + 1)].push(itemFormatted1);

                    var itemFormatted2 = {
                        text: itemKey.replace('_.name', '_2'),
                        tool: 0,
                        lat: (0.01552 * curItem2.lng + -63.6).toFixed(4),
                        lng: (0.01552 * curItem2.lat + 111.294).toFixed(4)
                    }

                    newItems[catKey][correctDay(catKey, dayIndex + 1)].push(itemFormatted2);

                    var itemFormatted3 = {
                        text: itemKey.replace('_.name', '_3'),
                        tool: 0,
                        lat: (0.0155 * curItem3.lng + -63.6).toFixed(4),
                        lng: (0.01552 * curItem3.lat + 111.294).toFixed(4)
                    }

                    newItems[catKey][correctDay(catKey, dayIndex + 1)].push(itemFormatted3);

                    var itemFormatted4 = {
                        text: itemKey.replace('_.name', '_4'),
                        tool: 0,
                        lat: (0.01552 * curItem4.lng + -63.6).toFixed(4),
                        lng: (0.01552 * curItem4.lat + 111.294).toFixed(4)
                    }

                    newItems[catKey][correctDay(catKey, dayIndex + 1)].push(itemFormatted4);

                    var itemFormatted5 = {
                        text: itemKey.replace('_.name', '_5'),
                        tool: 0,
                        lat: (0.01552 * curItem5.lng + -63.6).toFixed(4),
                        lng: (0.01552 * curItem5.lat + 111.294).toFixed(4)
                    }

                    newItems[catKey][correctDay(catKey, dayIndex + 1)].push(itemFormatted5);

                    var itemFormatted6 = {
                        text: itemKey.replace('_.name', '_6'),
                        tool: 0,
                        lat: (0.0155 * curItem6.lng + -63.6).toFixed(4),
                        lng: (0.01552 * curItem6.lat + 111.294).toFixed(4)
                    }

                    newItems[catKey][correctDay(catKey, dayIndex + 1)].push(itemFormatted6);

                    var itemFormatted7 = {
                        text: itemKey.replace('_.name', '_7'),
                        tool: 0,
                        lat: (0.01552 * curItem7.lng + -63.6).toFixed(4),
                        lng: (0.01552 * curItem7.lat + 111.294).toFixed(4)
                    }

                    newItems[catKey][correctDay(catKey, dayIndex + 1)].push(itemFormatted7);

                    var itemFormatted8 = {
                        text: itemKey.replace('_.name', '_8'),
                        tool: 0,
                        lat: (0.01552 * curItem8.lng + -63.6).toFixed(4),
                        lng: (0.01552 * curItem8.lat + 111.294).toFixed(4)
                    }

                    newItems[catKey][correctDay(catKey, dayIndex + 1)].push(itemFormatted8);

                    var itemFormatted9 = {
                        text: itemKey.replace('_.name', '_9'),
                        tool: 0,
                        lat: (0.0155 * curItem9.lng + -63.6).toFixed(4),
                        lng: (0.01552 * curItem9.lat + 111.294).toFixed(4)
                    }

                    newItems[catKey][correctDay(catKey, dayIndex + 1)].push(itemFormatted9);
                }
            }

        } else {
            var dayIndex = 1;
            items[catKey][itemKey].forEach(item => {
                var itemFormatted = {
                    text: itemKey.replace('.name', ''),
                    tool: 0,
                    lat: (0.01552 * item.lng + -63.6).toFixed(4),
                    lng: (0.01552 * item.lat + 111.294).toFixed(4)
                }

                newItems[catKey][correctDay(catKey, dayIndex)].push(itemFormatted);
                dayIndex++;
            });
        }
    });
});

function correctDay(category, day) {
    var correctedDay = -1;
    switch (day) {
        case 1:
            correctedDay = 2;
            break;
        case 2:
            correctedDay = 3;
            break;
        case 3:
            correctedDay = 1;
            break;
        case 4:
            correctedDay = 4;

            if (category == 'arrowhead') {
                correctedDay = 6;
            }

            if (category == 'antique_bottles') {
                correctedDay = 6;
            }
            
            if (category == 'lost_bracelet' || category == 'lost_earrings' || category == 'lost_necklaces' || category == 'lost_ring') {
                correctedDay = 6;
            }

            if (category == 'bird_eggs') {
                correctedDay = 6;
            }

            if (category == 'family_heirlooms') {
                correctedDay = 6;
            }
            break;
        case 5:
            correctedDay = 5;

            if (category == 'arrowhead') {
                correctedDay = 4;
            }
            
            if (category == 'antique_bottles') {
                correctedDay = 4;
            }

            if (category == 'coin') {
                correctedDay = 6;
            }

            if (category == 'lost_bracelet' || category == 'lost_earrings' || category == 'lost_necklaces' || category == 'lost_ring') {
                correctedDay = 4;
            }

            break;
        case 6:
            correctedDay = 6;

            if (category == 'arrowhead') {
                correctedDay = 5;
            }

            if (category == 'antique_bottles') {
                correctedDay = 5;
            }

            if (category == 'bird_eggs') {
                correctedDay = 4;
            }

            if (category == 'family_heirlooms') {
                correctedDay = 4;
            }

            if (category == 'coin') {
                correctedDay = 5;
            }

            if (category == 'lost_bracelet' || category == 'lost_earrings' || category == 'lost_necklaces' || category == 'lost_ring') {
                correctedDay = 5;
            }

            break;
        default:
            correctedDay = -1;
            break;
    }
    return correctedDay;
}

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

download('items.json', JSON.stringify(newItems, null, 4));