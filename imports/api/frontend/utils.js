import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { EJSON } from 'meteor/ejson';

//import Papa from 'meteor/harrison:papa-parse';
//import CSV from 'meteor/evaisse:csv';
import { Papa } from 'meteor/harrison:papa-parse';

export const series_list_to_csv = function(collection){
    var fields = ["version", "provider", "dataset_code", "key", "slug", "name", "frequency", "period", "value"];
    var values = [];

    _.each(collection, function(doc){
        var version = doc.version;
        var provider_name = doc.provider_name;
        var dataset_code = doc.dataset_code;
        var key = doc.key;
        var slug = doc.slug;
        var name = doc.name;
        var frequency = doc.frequency;

        _.each(doc['values'], function(val){
            values.push([version, provider_name, dataset_code, key,
                slug,
                name,
                frequency,
                val.period,
                val.value
            ])
        });
    });

    if (Meteor.isServer){
        return Papa.unparse({fields: fields, data: values}, {delimiter: ",", quotes: true});
    }
}

export const seriesArchivesTransform = function(doc){
    var _datas = new Buffer(doc.datas);
    var _datas_uncompressed = inflateSync(_datas);
    var new_doc = {};
    _.extend(new_doc, EJSON.parse(_datas_uncompressed.toString('utf8')));
    new_doc.slug = doc.slug;
    new_doc.version = doc.version;
    return new_doc;
}
