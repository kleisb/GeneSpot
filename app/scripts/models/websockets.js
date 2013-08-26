define(["jquery", "underscore", "backbone"],
function ($, _, Backbone) {
    return Backbone.Model.extend({
        initialize:function () {
            _.extend(this, Backbone.Events);

            var self = this;

            var wsurl = "ws://" + document.domain + "/" + this.get("ws")
            self.socket = new WebSocket(wsurl);
            console.log("opening a standard websocket to: " + wsurl);

            self.socket.onopen = function(e) {
                self.trigger("open", e);
                console.log("socket opened");
            };

            self.socket.onerror = function(e) {
                self.trigger("error", e);
            };

            self.socket.onmessage = function(e) {
                self.trigger("message", e);
                self.trigger("data", e.data);
                self.trigger("add_point", JSON.parse(e.data));
            };

            self.socket.onclose = function(e) {
                self.trigger("close", e);
                console.log("socket closed");
            };
        }
    })
});