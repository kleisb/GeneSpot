define([
    "jquery", "underscore", "backbone",
    "hbs!templates/gs/atlas",
    "hbs!templates/gs/maps_list_container",
    "views/gs/atlas_map",
    "views/gs/atlas_quick_tutorial",
    "views/gs/atlas_maptext_view",
    "views/gs/seqpeek_view",
    "views/gs/mutsig_grid_view",
    "views/gs/stacksvis",
    "views/gs/feature_matrix_distributions",
    "views/gs/seqpeek_view_v2",
    "views/genes/genelist_control",
    "views/clinvarlist/control",
    "views/gs/tumor_types_control"
],
    function ($, _, Backbone, AtlasTpl, MapsListContainerTpl, AtlasMapView,
              QuickTutorialView, MapTextView, SeqPeekView, MutsigGridView, StacksVisView, FeatureMatrixDistributionsView, SeqPeekViewV2,
              GenelistControl, ClinicalListControl, TumorTypesControl) {

        return Backbone.View.extend({
            "atlasMapViews": [],
            "last-z-index": 10,
            "currentZoomLevel": 1.0,
            "lastPosition": {
                "top": 0, "left": 0
            },

            events: {
                "click a.refresh-loaded": "reloadAllMaps",
                "click a.zoom-in": function () {
                    this.currentZoomLevel = this.currentZoomLevel * 1.15;
                    this.zoom(this.currentZoomLevel);
                },
                "click a.zoom-out": function () {
                    this.currentZoomLevel = this.currentZoomLevel * 0.85;
                    this.zoom(this.currentZoomLevel);
                },
                "click a.zoom-home": function () {
                    this.currentZoomLevel = 1.0;
                    this.zoom(this.currentZoomLevel);
                },
                "click a.resize-item": function (e) {
                    var li = $(e.target).parents("li");
                    if (li.hasClass("active")) {
                        this.$el.find(".atlas-map").resizable("destroy");
                    } else {
                        this.$el.find(".atlas-map").resizable({ "ghost": true});
                    }
                    li.toggleClass("active");
                },
                "click .open-map": function (e) {
                    var mapId = $(e.target).data("id");
                    _.each(this.options.model.get("maps"), function (map) {
                        if (_.isEqual(map.id, mapId)) {
                            map.isOpen = true;
                            this.appendAtlasMap(map);
                        }
                    }, this);
                },
                "click div.atlas-map": function (e) {
                    var $target = $(e.target);
                    if (!$target.hasClass("atlas-map")) {
                        $target = $(e.target).parents(".atlas-map");
                    }

                    $target.css("z-index", this.nextZindex());
                }
            },

            initialize: function () {
                _.bindAll(this, "appendAtlasMap", "reloadAllMaps", "loadMapData");

                this.options.model.on("load", this.initGenelistControl, this);
                this.options.model.on("load", this.initClinicalListControl, this);
                this.options.model.on("load", this.initTumorTypes, this);

                WebApp.Sessions.Producers["atlas_maps"] = this;

                WebApp.Views["atlas_quick_tutorial"] = QuickTutorialView;
                WebApp.Views["atlas_maptext"] = MapTextView;
                WebApp.Views["seqpeek"] = SeqPeekView;
                WebApp.Views["mutsig_grid"] = MutsigGridView;
                WebApp.Views["stacksvis"] = StacksVisView;
                WebApp.Views["feature_matrix_distributions"] = FeatureMatrixDistributionsView;
                WebApp.Views["seqpeekv2"] = SeqPeekViewV2;

                console.log("atlas:registered views");
            },

            render: function() {
                this.$el.html(AtlasTpl());
                this.$el.find(".atlas-zoom").draggable({ "scroll": true, "cancel": "div.atlas-map" });
                return this;
            },

            initGenelistControl: function() {
                this.genelistControl = new GenelistControl({ "default_genelist": this.options.model.get("default_genelist") });
                this.genelistControl.on("ready", this.initMaps, this);
                this.genelistControl.on("updated", function (ev) {
                    console.log("atlas:genelistControl:updated:" + JSON.stringify(ev));
                    if (ev["reorder"]) {
                        console.log("atlas:genelistControl:updated:reorder:ignore");
                        return;
                    }

                    this.reloadAllMaps();
                }, this);

                this.$el.find("#genelist-container").html(this.genelistControl.render().el);
            },

            initClinicalListControl: function() {
                this.clinicalListControl = new ClinicalListControl({});
                this.clinicalListControl.on("updated", function (ev) {
                    console.log("atlas:clinicalListControl:updated:" + JSON.stringify(ev));
                    if (ev["reorder"]) {
                        console.log("atlas:clinicalListControl:updated:reorder:ignore");
                        return;
                    }

                    this.reloadAllMaps();
                }, this);

                this.$el.find("#clinvarlist-container").html(this.clinicalListControl.render().el);
            },

            initTumorTypes: function() {
                this.tumorTypesControl = new TumorTypesControl({});

                var reloadFn = _.debounce(this.reloadAllMaps, 1000);
                this.tumorTypesControl.on("updated", reloadFn, this);
                this.$el.find("#tumor-types-container").html(this.tumorTypesControl.render().el);
            },

            initMaps: function () {
                var maps = this.options["model"].get("maps");
                _.each(maps, function (map) {
                    if (!_.has(map, "id")) map["id"] = Math.round(Math.random() * 10000);
                    if (map.isOpen) _.defer(this.appendAtlasMap, map);
                }, this);

                this.$el.find(".maps-list-container").html(MapsListContainerTpl({ "maps": _.sortBy(maps, "label") }));

                if (WebApp.Sessions.Active) {
                    var session_atlas = WebApp.Sessions.Active.get("atlas_maps");
                    if (session_atlas) {
                        // TODO : Restore selected genes from session
                        // TODO : Restore selected tumor types from session

                        if (session_atlas.maps) {
                            maps = _.compact(_.map(session_atlas.maps, function (mapFromSession) {
                                var matchedMap = _.find(maps, function (m) {
                                    return _.isEqual(m.id, mapFromSession.id);
                                });
                                if (matchedMap) {
                                    return _.extend({}, matchedMap, mapFromSession);
                                }
                                return null;
                            }));
                        }
                    }
                }
            },

            appendAtlasMap: function (map) {
                var atlasMapView = new AtlasMapView(_.extend({
                    "assignedPosition": map["position"] || this.nextPosition(),
                    "assignedZindex": map["zindex"] || this.nextZindex()
                }, map));
                atlasMapView.on("refresh", function() {
                    this.loadMapData(atlasMapView);
                }, this);
                if (map["isOpen"]) {
                    this.$el.find(".atlas-zoom").append(atlasMapView.render().el);
                }

                this.atlasMapViews.push(atlasMapView);
                this.loadMapData(atlasMapView);
            },

            reloadAllMaps: function() {
                console.log("atlas:reloadAllMaps");
                _.each(this.atlasMapViews, this.loadMapData, this);
            },

            loadMapData: function (atlasMapView) {
                var tumor_type_list = _.pluck(WebApp.UserPreferences.get("selected_tumor_types"), "id");
                var geneList = this.genelistControl.getCurrentGeneList();
                var clinvarList = this.clinicalListControl.getCurrentClinvarList() || [];

                var v_options = { "genes": geneList, "cancers": tumor_type_list, "clinical_variables": clinvarList };
                var queries = { "gene": geneList, "cancer": tumor_type_list };

                _.each(atlasMapView["options"]["views"], function(view_spec) {
                    this.loadView(view_spec, v_options, queries, clinvarList);
                }, this);
                return null;
            },

            loadView: function (view_spec, options, query, clinvarList) {
                console.log("atlas:loadView:" + view_spec["view"]);
                // TODO : Specify download links
                var ViewClass = WebApp.Views[view_spec["view"]];
                if (ViewClass) {
                    var query_options = { "query": query };
                    if (view_spec["by_tumor_type"]) query_options = { "query": _.omit(query, "cancer") };
                    if (view_spec["query_all_genes"]) query_options = { "query": _.omit(query, "gene") };

                    // 1. Lookup model specification(s) for datamodel(s)
                    var modelspecs = [];
                    var cvars_modelspecs = [];
                    var appendModelSpecsFn = function(modelspec, datamodel_key) {
                        if (modelspec["by_tumor_type"] && options["cancers"]) {
                            _.each(options["cancers"], function(tumor_type) {
                                var ms_tt = modelspec["by_tumor_type"][tumor_type];
                                var dk_tt = { "datamodel_key": datamodel_key, "tumor_type": tumor_type };
                                modelspecs.push(_.extend(dk_tt, query_options, ms_tt));

                                if (view_spec["query_clinical_variables"] && !_.isEmpty(clinvarList)) {
                                    cvars_modelspecs.push(_.extend({
                                            "query": { "id": _.pluck(clinvarList, "id") },
                                            "datamodel_key": datamodel_key,
                                            "tumor_type": tumor_type
                                        }, ms_tt));
                                }
                            });
                        } else if (modelspec["single"]) {
                            modelspecs.push(_.extend({ "datamodel_key": datamodel_key }, query_options, modelspec["single"]));

                            if (view_spec["query_clinical_variables"] && !_.isEmpty(clinvarList)) {
                                cvars_modelspecs.push(_.extend({
                                    "datamodel_key": datamodel_key,
                                    "clinical_variables": _.pluck(clinvarList, "id"),
                                    "query": { "id": clinvarList }
                                }, modelspec["single"]));
                            }
                        }
                    };

                    if (view_spec["datamodels"]) {
                        _.each(view_spec["datamodels"], function(datamodel, datamodel_key) {
                            appendModelSpecsFn(WebApp.Datamodel.find_modelspecs(datamodel), datamodel_key);
                        });
                    } else if (view_spec["datamodel"]) {
                        appendModelSpecsFn(WebApp.Datamodel.find_modelspecs(view_spec["datamodel"]), "model");
                    } else {
                        var view = new ViewClass(_.extend({}, options, view_spec));
                        $(view_spec["$targetEl"]).html(view.render().el);
                    }

                    var model_bucket = {};
                    var cvars_model_bucket = {};
                    var createViewFn = _.after(modelspecs.length + cvars_modelspecs.length, function () {
                        // NOTE: May seem out of order, but is called after all modelspecs are turned to models
                        // 3. Create view and pass model_bucket
                        var model_obj = { "models": model_bucket, "clinicalvars_models": cvars_model_bucket };
                        var model_arr = _.values(model_bucket);
                        if (model_arr.length === 1) {
                            if (view_spec["by_tumor_type"]) {
                                var by_tumor_type = {};
                                _.each(_.omit(_.first(model_arr), "by_tumor_type"), function(ttModel, tt) {
                                    by_tumor_type[tt] = ttModel;
                                });
                                model_obj["models"] = by_tumor_type;
                                model_arr = _.values(by_tumor_type);
                            } else {
                                model_obj["model"] = _.first(model_arr);
                            }
                        }

                        var cvars_model_arr = _.values(cvars_model_bucket);
                        if (cvars_model_arr.length === 1) {
                            if (view_spec["by_tumor_type"]) {
                                var cvars_by_tumor_type = {};
                                _.each(_.omit(_.first(cvars_model_arr), "by_tumor_type"), function(ttModel, tt) {
                                    cvars_by_tumor_type[tt] = ttModel;
                                });
                                model_obj["clinicalvars_models"] = cvars_by_tumor_type;
                                cvars_model_arr = _.values(cvars_by_tumor_type);
                            } else {
                                model_obj["clinicalvars_model"] = _.first(cvars_model_arr);
                            }
                        }

                        var view = new ViewClass(_.extend({}, options, view_spec, model_obj));
                        $(view_spec["$targetEl"]).html(view.render().el);

                        // 4. Fetch data and load models
                        var fetchModel = function(model) {
                            _.defer(function () {
                                model.fetch({
                                    "url": model.get("url"),
                                    "data": model.get("query"),
                                    "traditional": true,
                                    "success": function () {
                                        model.trigger("load");
                                    }
                                });
                            });
                        };

                        _.each(model_arr, fetchModel);
                        _.each(cvars_model_arr, fetchModel);
                    });

                    // 2. Create model(s) from model specifications
                    var createModelFromSpec = function(bucket, modelspec) {
                        var prepModelFn = function (Model) {
                            var model = new Model(modelspec);
                            if (view_spec["url_suffix"]) {
                                model.set("url", model.get("url") + view_spec["url_suffix"]);
                            }

                            if (modelspec["tumor_type"]) {
                                var modelspec_group = bucket[modelspec["datamodel_key"]];
                                if (!modelspec_group) modelspec_group = bucket[modelspec["datamodel_key"]] = {};
                                modelspec_group[modelspec["tumor_type"]] = model;
                            } else {
                                bucket[modelspec["datamodel_key"]] = model;
                            }
                            createViewFn();
                        };

                        if (modelspec["model"]) {
                            require([modelspec["model"]], prepModelFn);
                        } else {
                            prepModelFn(Backbone.Model);
                        }
                    };

                    _.each(modelspecs, function(mspec) {
                        createModelFromSpec(model_bucket, mspec);
                    });
                    _.each(cvars_modelspecs, function(mspec) {
                        createModelFromSpec(cvars_model_bucket, mspec);
                    });
                }
            },

            outputTsvQuery: function (query) {
                var qsarray = [];
                _.each(query, function (values, key) {
                    if (_.isArray(values)) {
                        _.each(values, function (value) {
                            qsarray.push(key + "=" + value);
                        })
                    } else {
                        qsarray.push(key + "=" + values);
                    }
                });
                qsarray.push("output=tsv");
                return qsarray.join("&");
            },

            zoom: function (zoomLevel) {
                this.$el.find(".atlas-zoom").zoomTo({
                    "duration": 1000,
                    "scalemode": "both",
                    "easing": "ease",
                    "nativeanimation": true,
                    "root": this.$el.find(".atlas-canvas"),
                    "closeclick": false,
                    "targetsize": zoomLevel
                });
            },

            nextZindex: function () {
                var nextZindex = 1 + this["last-z-index"];
                this["last-z-index"] = nextZindex;
                return nextZindex;
            },

            nextPosition: function () {
                var lastPos = {
                    "left": this.lastPosition.left + 50,
                    "top": this.lastPosition.top + 50
                };
                this.lastPosition = lastPos;
                return lastPos;
            },

            currentState: function () {
                var openMaps = _.map(this.$el.find(".atlas-map"), function (map) {
                    var mapid = $(map).data("mapid");
                    var top = map.style["top"].replace("px", "");
                    var left = map.style["left"].replace("px", "");
                    var zindex = map.style["z-index"];
                    return { "id": mapid, "isOpen": true, "position": { "top": top, "left": left }, "zindex": zindex };
                });

                var tumor_type_list = _.pluck(WebApp.UserPreferences.get("selected_tumor_types"), "id");
                return {
                    "genes": this.genelistControl.getCurrentGeneList(),
                    "tumor_types": tumor_type_list,
                    "maps": openMaps
                }
            }
        });
    });