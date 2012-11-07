from tornado.options import options, logging
import tornado.web
import pymongo

class MongoDbLookupHandler(tornado.web.RequestHandler):

    def get(self, identity):
        logging.info("uri=%s [%s] [%s]" % (self.request.uri, identity, self.request.arguments))

        # TODO : Improve this logic to correctly parse arguments and convert to a proper mongo DB query
        args = self.request.arguments
        query = {}
        for key in args.keys():
            query[key] = args[key][0]

        ids = identity.split("/")

        collection = open_collection(ids[1])

        json_items = []
        for item in collection.find(query):
            json_item = self.jsonable_item(item)
            json_item["uri"] = self.request.uri + "/" + json_item["id"]
            json_items.append(json_item)

        self.write({ "items": json_items })
        self.set_status(200)
        return

    def jsonable_item(self, item):
        json_item = {}
        for k in item.iterkeys():
            if k == "_id":
                json_item["id"] = str(item["_id"])
            elif "[]" in k:
                json_item[k.replace("[]", "")] = item[k]
            else:
                json_item[k] = item[k]
        return json_item

def open_collection(collection_name):
    #if options.verbose:
    logging.info("open_collection(%s)" % collection_name)

    connection = pymongo.Connection(options.mongo_lookup_uri)
    qed_db = connection["qed_lookups"]
    return qed_db[collection_name]
