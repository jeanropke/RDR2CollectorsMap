var Loot = {
    lootTable: {},

    load: function () {
        $.getJSON('data/random_spots_loot.json?nocache=' + nocache)
            .done(function (data) {
                Loot.lootTable = data;
            });

        console.log('Random spots loottable loaded.');
    },

    generateTable: function (table = null) {
        var lootTableWrapper = $('<div>').addClass('loot-table-wrapper');
        $.each(this.lootTable, function (key1, value1) {
            if (table != null && key1 != table) return;

            // console.log(key1);

            lootTableWrapper.append($('<h2>').addClass('loot-table-table-title').attr('data-text', 'menu.loot_table.table_' + key1).text(Language.get('menu.loot_table.table_' + key1)));

            var lootTableCategories = $('<div>').addClass('loot-table-categories');

            $.each(value1.rates, function (key2, value2) {
                // console.log('--', value2.name, (value2.rate * 100).toFixed(2));

                var lootTableCategory = $('<div>').addClass('loot-table-category');

                var lootTableCategoryHeader = $('<div>').addClass('loot-table-category-header');
                lootTableCategoryHeader.append($('<h3>').addClass('loot-table-category-title').attr('data-text', 'menu.loot_table.' + value2.name).text(Language.get('menu.loot_table.' + value2.name)));
                lootTableCategoryHeader.append($('<span>').addClass('loot-table-category-rate').text((value2.rate * 100).toFixed(2) + '%'));

                lootTableCategory.append(lootTableCategoryHeader);

                var lootTableItems = $('<div>').addClass('loot-table-category-items');

                $.each(value2.items, function (key3, value3) {
                    // console.log('----', value3.name, (value2.rate * value3.rate * 100).toFixed(2));

                    if (!value3.name.startsWith('category_')) {
                        var lootTableItem = $('<div>').addClass('loot-table-item');
                        lootTableItem.append($('<h3>').addClass('loot-table-item-title').attr('data-text', value3.name + '.name').text(Language.get(value3.name + '.name')));
                        lootTableItem.append($('<span>').addClass('loot-table-item-rate').text((value2.rate * value3.rate * 100).toFixed(2) + '%'));

                        lootTableItems.append(lootTableItem);
                    } else {
                        var lootTableSubcategory = $('<div>').addClass('loot-table-subcategory');

                        var lootTableSubcategoryHeader = $('<div>').addClass('loot-table-subcategory-header');
                        lootTableSubcategoryHeader.append($('<h3>').addClass('loot-table-subcategory-title').attr('data-text', 'menu.loot_table.' + value2.name).text(Language.get('menu.loot_table.' + value3.name)));
                        lootTableSubcategoryHeader.append($('<span>').addClass('loot-table-subcategory-rate').text((value2.rate * value3.rate * 100).toFixed(2) + '%'));
        
                        lootTableSubcategory.append(lootTableSubcategoryHeader);

                        var lootTableSubitems = $('<div>').addClass('loot-table-subcategory-items');

                        $.each(value3.items, function (key4, value4) {
                            // console.log('------', value4.name, (value2.rate * value3.rate * value4.rate * 100).toFixed(2));

                            var lootTableSubitem = $('<div>').addClass('loot-table-item');
                            lootTableSubitem.append($('<h3>').addClass('loot-table-item-title').attr('data-text', value4.name + '.name').text(Language.get(value4.name + '.name')));
                            lootTableSubitem.append($('<span>').addClass('loot-table-item-rate').text((value2.rate * value4.rate * value4.rate * 100).toFixed(2) + '%'));
    
                            lootTableSubitems.append(lootTableSubitem);
                        });

                        lootTableSubcategory.append(lootTableSubitems);
                        lootTableItems.append(lootTableSubcategory);
                    }
                });

                lootTableCategory.append(lootTableItems);
                lootTableCategories.append(lootTableCategory);
            });

            lootTableWrapper.append(lootTableCategories);
        });
        return lootTableWrapper;
    }
}