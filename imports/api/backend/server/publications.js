import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { lodash } from 'meteor/stevezhu:lodash';
import { moment } from 'meteor/momentjs:moment';

import { StatsRun } from '../collections.js';

Meteor.publish('admin.stats_run', function (options) {
    console.log("publish admin.stats_run - options : ", options);
    if (!options){
        return this.ready();
    }

    var query = {};
    if (options.provider_name){
      check(options.provider_name, String);
      if (options.provider_name != "ALL"){
        query.provider_name = options.provider_name;
      }
    }

    if (options.dataset_code){
        check(options.dataset_code, String);
        if (options.dataset_code != "ALL"){
            query.dataset_code = options.dataset_code;
        }
    }

    if (options.startDate){
        check(options.startDate, String);
        query.created = {"$gte": moment.utc(options.startDate, "YYYY-MM-DD").toDate()};
    }

    if (options.endDate){
        check(options.endDate, String);
        if (!query.created){
          query.created ={};
        }
        query.created.$lte = moment.utc(options.endDate, "YYYY-MM-DD").toDate();
    }

    var projection = {};

    if (options.limit){
      check(options.limit, Match.Integer);
      if (options.limit === 0){
        delete options.limit;
      } else {
        projection.limit = options.limit;
      }
    } else {
      projection.limit = 10;
    }

    console.log("publish admin.stats_run - query/projection : ", query, projection);
    return StatsRun.find(query, projection);
});

