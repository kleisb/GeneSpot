define(["jquery", "underscore", "backbone",
    "hbs!templates/shared_selection"
],
    function ($, _, Backbone, SharedSelectionTpl) {

        return Backbone.View.extend({
            initialize: function () {
                _.bindAll(this, "render", "addSelection");

                this.model.on("add-selection", this.addSelection);
            },

            render: function () {
                var sharedSelection = this.model.get("selections") || {
                    "selections": [
                        {
                            "user": {
                                "fullname": "Jon Stewart",
                                "pic": "http://www.terrific-tubes.com/profile_dummy.jpg",
                                "profileLink": "https://plus.google.com"
                            },
                            "description": "this user selected gene AKT1",
                            "active": true
                        },
                        {
                            "user": {
                                "fullname": "Jon Stewart",
                                "pic": "http://www.terrific-tubes.com/profile_dummy.jpg",
                                "profileLink": "https://plus.google.com"
                            },
                            "description": "this user selected gene ATF3",
                            "active": true
                        }
                    ],
                    "comments": []
                };

                this.$el.html(SharedSelectionTpl(sharedSelection));

                return this;
            },

            addSelection: function(s) {
                console.log("addSelection(" + s + ")");
            }
        });
    });