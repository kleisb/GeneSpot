define(['jquery', 'underscore', 'backbone', 'moment',
    'hbs!templates/shared_selection',
    'hbs!templates/line_item'
],
    function ($, _, Backbone, moment, SharedSelectionTpl, LineItemTemplate) {

        return Backbone.View.extend({
            initialize: function () {
                _.bindAll(this, "render");

                this.model.on("load", this.render);
            },

            render: function () {
                var sharedSelection = this.model.get("selection") || {
                    "participants": [
                        {
                            "user": {
                                "fullname": "Jon Stewart",
                                "pic": "http://www.terrific-tubes.com/profile_dummy.jpg",
                                "profileLink": "https://plus.google.com"
                            },
                            "joinedAt": moment("Mon Aug 26 2013 12:18:04 GMT-0700 (PDT)").format("MM/DD hh:mm")
                        },
                        {
                            "user": {
                                "fullname": "James Duthie",
                                "pic": "https://si0.twimg.com/profile_images/705897652/James_Duthie_small.jpg",
                                "profileLink": "https://plus.google.com"
                            },
                            "joinedAt": moment("Mon Aug 26 2013 12:25:04 GMT-0700 (PDT)").format("MM/DD hh:mm")
                        }
                    ],
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

                $(document.body).append(SharedSelectionTpl(sharedSelection));
            }
        });
    });