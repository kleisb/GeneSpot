define   (['jquery', 'underscore', 'backbone', 'hbs!templates/data_dropdown_menu'],
function ( $,        _,            Backbone,   Template) {

return Backbone.View.extend({
    tagName: 'ul',

    events:{
        "click .selected-data-item":function (e) {
            this.trigger("select-data-item", {
                "unitId":$(e.target).data("unitid"),
                "itemId":$(e.target).data("itemid")
            });
        }
    },

    initialize:function (options) {
        _.extend(this, options);
    },

    render: function() {
        var menus = _.map(this.section, function (unit, unitId) {
            if (unit.catalog && !_.isEmpty(unit.catalog)) {
                return {
                    "label":unit.label,
                    "items":_.map(unit.catalog, function (item, itemId) {
                        return {
                            "label":item.label || itemId,
                            "unitId":unitId,
                            "itemId":itemId
                        };
                    })
                };
            }
        });

        this.$el.append(Template({ "label":this.section.label, "items":_.compact(menus) }));
        return this;
    }
});

// end define
});