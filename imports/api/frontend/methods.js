import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { Series, Datasets, SeriesArchives } from './collections.js';
import { series_list_to_csv, seriesArchivesTransform } from './utils.js';

export const export_csv = new ValidatedMethod({
  name: 'series.export_csv',
  validate: new SimpleSchema({
    slugs: { type: [String] },
  }).validator(),
  run(slugs) {
    var collection = Series.find({"slug": {"$in": slugs.slugs}}, {"tags": 0, "notes": 0}).fetch();
    return series_list_to_csv(collection);
  },
});

// Return dataset datas for generate list and field dataset list
export const datasets_list_light = new ValidatedMethod({
  name: 'datasets.list_light',
  validate: new SimpleSchema({
    provider_name: { type: String },
  }).validator(),
  //run(options) {
  run: function(options) {
    if (Meteor.isServer){
      return _.map(Datasets.find({"provider_name": options.provider_name}).fetch(), function(item) {
        return {
            name: item.name,
            dataset_code: item.dataset_code,
            slug: item.slug
        }
      });
    }
  },
});

export const sendmail_postmaster = new ValidatedMethod({
  name: 'sendmail.postmaster',
  validate: new SimpleSchema({
    subject: { type: String },
    text: { type: String }
  }).validator(),
  run(options) {
    this.unblock();
    if (Meteor.isServer){
        options.to = process.env.WIDUKIND_EMAIL_POSTMASTER;
        options.from = process.env.WIDUKIND_EMAIL_SENDER;
        console.log("email options : ", options);
        check([options.to, options.from], [String]);
        Email.send(options);
    }
  },
});

export const loadSeriesArchives = new ValidatedMethod({
  name: 'series.loadSeriesArchives',
  validate: new SimpleSchema({
    slug: { type: String },
    version: { type: Number, optional: true },
  }).validator(),
  run: function(options) {
    if (Meteor.isServer){
      let query = {};
      query.slug = options.slug;

      if (options.version){
          query.version = options.version;
      }

      console.log("loadSeriesArchives query : ", query);
      var series_list = [];
      SeriesArchives.find(query).forEach(function (item) {
          console.log("archives item.slug : ", item.slug);
          series_list.push(seriesArchivesTransform(item));
      });
      return series_list;
    }
  },
});

/*
if (Meteor.isServer){
  Meteor.methods({
    "series.loadSeriesArchives2": function(options){
      let query = {};
      console.log("loadSeriesArchives2 options : ", options);
      query.slug = options.slug;

      if (options.version){
          query.version = options.version;
      }

      console.log("loadSeriesArchives query : ", query);
      var series_list = [];
      SeriesArchives.find(query).forEach(function (item) {
          console.log("archives item.slug : ", item.slug);
          series_list.push(seriesArchivesTransform(item));
      });
      return series_list;
    }
  });
}
*/