import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Match } from 'meteor/check';
import { _ } from 'meteor/underscore';

import { lodash } from 'meteor/stevezhu:lodash';

import { Providers, Datasets, Series } from '../collections.js';

Meteor.publish('providers', function () {
    console.log("publish providers...");
    return Providers.find({}, {fields: Providers.publicFields});
});

Meteor.publish('Providers.unit', function (query) {
    console.log("publish Providers.unit : ", query);
    check(query, Object);
    return Providers.find(query, {fields: Providers.publicFields});
});

Meteor.publish('Datasets.byProvider', function (provider_name) {
    if (!provider_name){
        return this.ready();
    }
    check(provider_name, String);
    return Datasets.find({provider_name: provider_name}, {fields: Datasets.publicFields});
});

Meteor.publish('Series.byProviderAndDatasetCode', function (options) {
    console.log("publish series - options : ", options);
    if (!options || !options.provider_name){
        return this.ready();
    }

    var query = {};
    check(options.provider_name, String);

    query.provider_name = options.provider_name;

    if (options.search){
        check(options.search, String);
        query.$text = {"$search": lodash.trim(options.search)};
    }

    if (options.dataset_code){
        check(options.dataset_code, String);
        //check(options.dataset_code, [String]);
        //query.dataset_code = {"$in": options.dataset_code};
        if (options.dataset_code != "ALL"){
            query.dataset_code = options.dataset_code;
        }
    }

    if (options.dimension_filters){
        var dimensions = []
        _.each(options.dimension_filters, function(values, key){
          var fieldKey = "dimensions." + key;
          var item = {};
          item[fieldKey] = {"$in": values};
          dimensions.push(item);
        });
        if (_.size(dimensions) > 0){
          query["$and"] = dimensions
        }
    }

    if (options.limit){
        check(options.limit, Match.Integer);
    }

    var limit = options.limit || 10;
    var projection = {fields: Series.publicFields, limit: limit};
    var projection_count = {limit: limit};
    if (options.search){
        projection.score = {'$meta': 'textScore'}
        projection_count = {'$meta': 'textScore'}
    }

    Counts.publish(this, 'series.count', Series.find(query, projection_count));

    console.log("publish series - query      : ", query);
    console.log("publish series - projection : ", projection);
    return Series.find(query, projection);
});

Meteor.publish('Datasets_unit', function (slug) {
    console.log("publish Datasets_unit : ", slug);
    if (!slug){
        return this.ready();
    }
    new SimpleSchema({
        slug: {type: String}
    }).validate({ slug });
    //check(slug, String);
    return Datasets.find({slug: slug});
});

Meteor.publish('Series.bySlug', function (slug) {
    if (!slug){
        return this.ready();
    }
    var slugs = [];
    if (!_.isArray(slug)){
        check(slug, String);
        slugs = [slug]
    } else {
        slugs = slug
    }
    console.log("Series.bySlug : ", slugs);
    return Series.find({slug: {"$in": slugs}});
});

Meteor.publish('Series.More', function (options) {
    if (!options){
        return this.ready();
    }
    console.log("Series.More : ", options);
    check(options.slug, String);
    check(options.provider_name, String);
    check(options.dataset_code, String);
    return [
        Series.find({slug: options.slug}),
        Providers.find({name: options.provider_name}),
        Datasets.find({provider_name: options.provider_name, dataset_code: options.dataset_code})
    ]
});
