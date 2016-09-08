
import { ReactiveVar } from 'meteor/reactive-var';
import { _ } from 'meteor/underscore';
import { Spacebars } from 'meteor/spacebars';
import { $ } from 'meteor/jquery';


import { moment } from 'meteor/momentjs:moment';
import { lodash } from 'meteor/stevezhu:lodash';

import Humanize from 'humanize-plus';

import { Providers } from '../../../api/frontend/collections.js';
import { StatsRun } from '../../../api/backend/collections.js';
import { datasets_list_light } from '../../../api/frontend/methods.js';

import './admin.html';

//var DatasetByCode = new ReactiveVar();
var DatasetList = new ReactiveVar([]);

var Query = new ReactiveDict();
Query.setDefault({
    provider_name: "ALL",
    dataset_code: null,
    created: null,
    limit: 10,
});

Template.admin_field_provider.onCreated(function(){
    this.autorun(() => {
        this.subscribe('providers');
    });
});

Template.admin_field_dataset.onCreated(function(){
    this.autorun(() => {
        var provider_name = Query.get("provider_name");
        if (provider_name && provider_name != 'ALL'){
          //var result = {};
          //var result_bycode = {};
          var datasets = [];
          datasets_list_light.call({provider_name}, (err, res) => {
            if (err){
              console.log("dataset list error : ", err);
            }
            else {
              _.each(res, function(item){
                datasets.push(item);
                //result[item.slug] = item.dataset_code;
                //result_bycode[item.dataset_code] = item.slug;
              });
              //DatasetBySlug.set(result);
              //DatasetByCode.set(result_bycode);
              DatasetList.set(datasets)
              //self.ready.set(lodash.size(datasets) > 0);
            }
          });
        }
    });
});

Template.admin_field_provider.helpers({
    provider_options(){
      var options = _.sortBy(_.map(Providers.find().fetch(), function(item) {
          try {
            return {
              label: item.long_name + ' - ('+ item.name + ')',
              value: item.name,
              attrs: item.name ===  Query.get("provider_name") ? 'selected': '',
            };
          } catch(error){
              console.log("ProviderSelect error : ", error);
              return {label: "", value: ""};
          }
      }), 'label');
      options.unshift({label: "All", value: "ALL"});
      return options;
    }
});

Template.admin_field_provider.onRendered(function() {
  $('select[name=provider]').select2();
});

var setCreated = function(){
    var created = $('#created').data('daterangepicker');
    if (created){
        var startDate = created.startDate.format('YYYY-MM-DD');
        var endDate = created.endDate.format('YYYY-MM-DD');
        Query.set("created", {startDate: startDate, endDate: endDate});
    }
};

Template.admin_field_created.onRendered(function() {
    var today = moment();
    var last_week = moment().subtract(6, 'days');

    $('#created').daterangepicker({
    	alwaysShowCalendars: false,
    	//maxDate: today,
    	startDate: last_week,
    	endDate: today,
    	autoUpdateInput: true,
    	showDropdowns: true,
        ranges: {
            'Today': [moment(), moment()],
            'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
            'Last week': [moment().subtract(6, 'days'), moment()],
            'This Month': [moment().startOf('month'), moment().endOf('month')],
            'Last Month': [moment().subtract(1, 'month'), moment()]
         }
    });
    setCreated();

});

Template.admin_field_created.events({
  'apply.daterangepicker #created': function(event, template, picker){
    event.preventDefault();
    setCreated();
    return true;
  },
});

Template.admin_field_provider.events({
  'change [name=provider]': function(event){
    event.preventDefault();
    var provider_name = event.target.value;
    if (provider_name){
        Query.set("provider_name", provider_name.toUpperCase());
    }
  }
});

Template.admin_field_dataset.helpers({
    ready(){
      return lodash.size(DatasetList.get()) > 0;
    },
    dataset_options(){
      if (!DatasetList.get()){
        return [];
      }
      var datasetList = _.map(DatasetList.get(), function(item) {
        return {
            label: item.name + ' - ('+ item.dataset_code + ')',
            value: item.dataset_code,
            attrs: item.dataset_code === Query.get("dataset_code") ? 'selected': '',
        };
      });
      datasetList.unshift({label: "All", value: "ALL"});
      return datasetList
    },
});

Template.admin_field_dataset.onRendered(function() {
  $('select[name=dataset]').select2();
});

Template.admin_field_dataset.events({
  'change [name=dataset]': function(event){
    event.preventDefault();
    var dataset_code = event.target.value;
    if (dataset_code){
        Query.set("dataset_code", dataset_code);
    }
  }
});


Template.stats_run.onCreated(function() {
  this.autorun(() => {
    var provider_name = Query.get("provider_name");
    var dataset_code = Query.get("dataset_code");
    var startDate = Query.get("created") ? Query.get("created").startDate: null;
    var endDate = Query.get("created") ? Query.get("created").endDate: null;
    var limit = Query.get("limit");
    var query = {};
    if (provider_name){
        query.provider_name = provider_name;
    }
    if (limit){
        query.limit = limit;
    }
    if (dataset_code){
        query.dataset_code = dataset_code;
    }
    if (startDate){
        query.startDate = startDate;
    }
    if (endDate){
        query.endDate = endDate;
    }
    this.subscribe('admin.stats_run', query);
  });
});

Template.stats_run_limit.helpers({
  options(){
    return _.map([0, 10, 50, 100, 200], function(item){
      return {
        label: item == 0 ? 'All': new String(item),
        value: new String(item),
        attrs: item === Query.get("limit") ? 'selected': '',
      }
    });
  }
});

Template.stats_run_limit.events({
  'change #stats_run_limit': function(event){
    event.preventDefault();
    Query.set("limit", parseInt(event.target.value));
  }
});


Template.stats_run.helpers({
  datas(){
    return StatsRun.find().fetch();
  },
  settings() {
      return {
          rowsPerPage: 10,
          showFilter: false,
          showRowCount: true,
          showColumnToggles: true,
          multiColumnSort: false,
          ready: Template.instance().subscriptionsReady(),
          fields: [
              /*
            <th data-field="avg_all" data-formatter="numberFormatter" data-align="right" data-sortable="true" data-title-tooltip="Average run">Avg</th>
            <th data-field="avg_write" data-formatter="numberFormatter" data-align="right" data-sortable="true" data-title-tooltip="Average run for write operations only">Avg.W</th>
            <th data-field="bulk_size" data-formatter="numberFormatter" data-align="right" data-sortable="true" data-title-tooltip="Bulk size">Bulk</th>
            <th data-field="enable" data-visible="false" data-title-tooltip="Dataset enable">Enable</th>
            <th data-field="logger_level" data-title-tooltip="Logging level">log</th>
            <th data-field="fetcher_errors" data-title-tooltip="Error. Fetcher level">Err.G</th>
            <th data-field="async_mode" data-visible="false" data-title-tooltip="Async mode">async</th>
            <th data-field="pool_size" data-visible="false" data-title-tooltip="Pool size (async_mode only)">Pool</th>
            <th data-field="fetcher_version" data-visible="false" data-title-tooltip="">Ver.</th>
            <th data-field="is_trace" data-visible="false" data-title-tooltip="Enable trace debug">Trace</th>
            <th data-field="schema_validation_disable" data-visible="false" data-title-tooltip="Schema validation disable">valid.</th>
              */
              { key: 'created',
                label: 'Date',
                fn: function (v,o,k) {return moment(v).locale(Session.get("currentLang")).format('YYYY-MM-DD - HH:mm');}
              },
              { key: 'provider_name', label: 'Provider' },
              { key: 'dataset_code', label: 'Dataset' },
              { key: 'count_accepts',
                label: function () { return new Spacebars.SafeString('<span title="Accepted">Acc.</span>') },
                fn: function (v,o,k) { return Humanize.formatNumber(v)}
              },
              { key: 'count_inserts',
                label: function () { return new Spacebars.SafeString('<span title="Inserted">Ins.</span>') },
                fn: function (v,o,k) { return Humanize.formatNumber(v)}
              },
              { key: 'count_updates',
                label: function () { return new Spacebars.SafeString('<span title="Updated (revised)">Upd.</span>') },
                fn: function (v,o,k) { return Humanize.formatNumber(v)}
              },
              { key: 'count_rejects',
                label: function () { return new Spacebars.SafeString('<span title="Rejected">Rej.</span>') },
                fn: function (v,o,k) { return Humanize.formatNumber(v)},
                hidden: true
              },
              { key: 'count_errors',
                label: function () { return new Spacebars.SafeString('<span title="Error. Dataset level">Err.</span>') },
                fn: function (v,o,k) { return Humanize.formatNumber(v)},
                //hidden: true,
                isVisible: false
              },
              { key: 'duration',
                label: function () { return new Spacebars.SafeString('<span title="Duration (minuts)">Dur. (mn)</span>') },
                fn: function (v,o,k) { return Math.round(v / 60, 2) }
              },
          ]
      };
  }
});
