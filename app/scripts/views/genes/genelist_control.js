define(["jquery", "underscore", "backbone",
    "views/genes/itemizer", "views/genes/typeahead",
    "hbs!templates/genes/genelist_container",
    "models/genes/default_genelist"],
    function ($, _, Backbone, Itemizer, TypeAhead, Tpl, DefaultGenelistModel) {
        var do_alert = function(alertEl, timeout) {
            $(alertEl).show();
            _.delay(function() {
                $(alertEl).hide({ "effect": "fade" });
            }, timeout || 2000);
        };

        return Backbone.View.extend({
            genelists_collection: new Backbone.Collection([], { "url": "svc/collections/genelists" }),
            itemizers: {},

            events: {
                "click .add-new-list": function() {
                    this.$el.find(".alert").hide();

                    var newname = this.$el.find(".new-list-name").val();
                    this.$el.find(".new-list-name").val("");

                    if (_.isEmpty(newname)) {
                        do_alert(this.$el.find(".invalid-list-name"), 3000);
                        return;
                    }

                    var listlabels = _.map(this.genelists_collection["models"], function(gl_model) {
                        return gl_model.get("label");
                    });
                    if (listlabels.indexOf(newname) >= 0) {
                        do_alert(this.$el.find(".duplicate-list-name"), 3000);
                        return;
                    }

                    Backbone.sync("create", new Backbone.Model({ "label": newname, "genes": [] }), {
                        "url": "svc/collections/genelists", "success": this.refreshGeneLists
                    });

                    do_alert(this.$el.find(".list-added-success"));
                },

                "click .list-remover": function(e) {
                    console.log("remove list");

                    var listid = $(e.target).data("id");

                    Backbone.sync("delete", new Backbone.Model({}), {
                        "url": "svc/collections/genelists/" + listid, "success": this.refreshGeneLists
                    });
                }
            },

            initialize: function() {
                _.bindAll(this, "loadGeneLists", "refreshGeneLists");
                _.defer(this.refreshGeneLists);

                this.genelists_collection.on("change", function(item) {
                    if (_.isEmpty(item)) return;
                    Backbone.sync("update", item, {
                        "url": "svc/collections/genelists/" + item.get("id"), "success": this.refreshGeneLists
                    });
                });
            },

            refreshGeneLists: function() {
                this.genelists_collection.fetch({ "success": this.loadGeneLists });
            },

            loadGeneLists: function() {
                var genelists = _.map(this.genelists_collection["models"], function(gl_model) {
                    return { "id": gl_model.get("id"), "label": gl_model.get("label") };
                });

                var default_gl = {
                    "id": "default-list",
                    "label": "Default List",
                    "genes": this.options["default_genelist"],
                    "sort": 1,
                    "isDefault": true
                };
                genelists.push(default_gl);

                this.$el.html(Tpl({ "genelists": _.sortBy(genelists, "sort") }));
                this.renderGeneLists(new DefaultGenelistModel(default_gl));
                _.each(this.genelists_collection["models"], this.renderGeneLists, this);
            },

            renderGeneLists: function(gl_model) {
                var $geneSelector = this.$el.find("#tab-glists-glist-" + gl_model.get("id")).find(".gene-selector");
                var itemizer = this.itemizers[gl_model.get("id")] = new Itemizer({"el": $geneSelector, "model": gl_model });
                itemizer.render();

                var $geneTypeahead = this.$el.find("#tab-glists-glist-" + gl_model["id"]).find(".genes-typeahead");
                var typeahead = new TypeAhead({ "el": $geneTypeahead });
                typeahead.render();
                typeahead.on("typed", function(gene) {
                    var genes_from_model = _.map(gl_model.get("genes"), function(g) {return g;});
                    if (genes_from_model.indexOf(gene) >= 0) {
                        console.log("genes/genelist_control:typeahead.typed(" + gene + "):duplicate:ignore:" + genes_from_model);
                        // todo: show duplicate gene message
                        return;
                    }

                    genes_from_model.push(gene);
                    gl_model.set("genes", genes_from_model);
                }, this);
            },

            getCurrentGeneList: function() {
                var currentGeneListId = this.$el.find(".nav-tabs").find("li.active").data("id");
                return this.itemizers[currentGeneListId].model.get("genes");
            }
        });
    });
