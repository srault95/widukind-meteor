
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Tracker } from 'meteor/tracker';
import { Blaze } from 'meteor/blaze';
import { $ } from 'meteor/jquery';
import { Spacebars } from 'meteor/spacebars';

import Humanize from 'humanize-plus';

import { _ } from 'meteor/underscore';
import { lodash } from 'meteor/stevezhu:lodash';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Bert } from 'meteor/themeteorchef:bert';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { saveAs } from 'meteor/pfafman:filesaver';
import { moment } from 'meteor/momentjs:moment';

import { Counts } from 'meteor/tmeasday:publish-counts';

import 'meteor/natestrauser:select2';

import './explorer.html';

import '../../common.js';
import { SeriesSubs } from '../../common.js'; //, ProvidersSubs, DatasetsSubs
import { Providers, Datasets, Series } from '../../../api/frontend/collections.js';
import {
  datasets_list_light,
  loadSeriesArchives,
  sendmail_postmaster,
  export_csv
} from '../../../api/frontend/methods.js';

import {
  get_datetime_from_period ,
  transform_revisions,
  seriesChartDatas
} from '../../../api/common.js';

const CountSeries = new ReactiveVar(0);
const SeriesLimit = new ReactiveVar(10);
const SeriesCurrentSort = new ReactiveVar('name:asc');
const DatasetBySlug = new ReactiveVar();
const DatasetByCode = new ReactiveVar();
const DatasetList = new ReactiveVar();
const SeriesSearchText = new ReactiveVar();
const SeriesSelection = new ReactiveVar({});
const SeriesCart = new ReactiveVar({});

const CurrentProvider = new ReactiveVar('BIS');
const CurrentDataset = new ReactiveVar();
const CurrentDatasetSlug = new ReactiveVar();
const CurrentDimensionsFilter = new ReactiveVar({});
const CurrentSeriesQuery = new ReactiveVar({});
const CurrentCart = new ReactiveVar({});

const CurrentSeriesSlug = new ReactiveVar({});
const CurrentSeriesDatas = new ReactiveVar({});
const CurrentSeriesListDatas = new ReactiveVar([]);
const CurrentSeriesListDatasReady = new ReactiveVar(false);
const SeriesListDisplayReady = new ReactiveVar(false);

const getCartSlugs = function(){
  return _.map(SeriesCart.get(), function(item){
    return item.slug
  });
};

const exportCSV = function(slugs){
  const nameFile = 'widukind-series-export.csv';
  //Meteor.call('series.export_csv', {slugs}, function(err, res) {
  export_csv.call({slugs}, (err, res) => {
    if (err){
      Bert.alert(err, 'error', 'growl-top-right' );
    }
    else {
      const blob = new Blob([res], {type: "text/csv;charset=utf-8"});
      saveAs(blob, nameFile);
    }
  });
}

Tracker.autorun(function () {
  CurrentSeriesQuery.set({
    "provider_name": CurrentProvider.get(),
    "dataset_code": CurrentDataset.get(),
    "dimension_filters": CurrentDimensionsFilter.get(),
    "search": SeriesSearchText.get(),
    "limit": SeriesLimit.get()
  });
});

Tracker.autorun(function () {
  const provider_name = CurrentProvider.get();
  if (provider_name){
    const result = {};
    const result_bycode = {};
    const datasets = [];
    //Meteor.call('datasets.list_light', {provider_name}, {wait: true}, function(err, res) {
    datasets_list_light.call({provider_name}, (err, res) => {
      if (err){
        //console.error("dataset list error : ", err);
        Bert.alert(err, 'error', 'growl-top-right' );
      } else {
        _.each(res, function(item){
          datasets.push(item);
          result[item.slug] = item.dataset_code;
          result_bycode[item.dataset_code] = item.slug;
        });
        DatasetBySlug.set(result);
        DatasetByCode.set(result_bycode);
        DatasetList.set(datasets);
      }
    });
  }
});

const transformSeriesQuery = function(options){
    var query = {};
    query.provider_name = options.provider_name;

    if (options.search){
        query.$text = {"$search": lodash.trim(options.search)};
    }

    if (options.dataset_code){
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

    var limit = options.limit || 10;
    var projection = {fields: Series.publicFields, limit: limit}; //
    if (options.search){
        projection.score = {'$meta': 'textScore'}
    }

    return [query, projection]
}

Tracker.autorun(function () {
  Meteor.subscribe('Series.byProviderAndDatasetCode', CurrentSeriesQuery.get());
  var handler = SeriesSubs.subscribe('Series.byProviderAndDatasetCode', CurrentSeriesQuery.get());
  SeriesListDisplayReady.set(handler.ready());
  const sort = SeriesCurrentSort.get().split(':');
  const query = transformSeriesQuery(CurrentSeriesQuery.get());
  const result = Series.find(query[0], query[1]).fetch();
  CurrentSeriesListDatasReady.set(false);
  if (!lodash.isEmpty(result)){
    lodash.sortBy(result, sort[0]);
    if (sort[1] == 'desc'){
      lodash.reverse(result);
    }
    CurrentSeriesListDatas.set(result);
    CountSeries.set(lodash.size(CurrentSeriesListDatas.get()));
    CurrentSeriesListDatasReady.set(true);
  }
});

Tracker.autorun(function () {
  const series = CurrentSeriesSlug.get();
  if (series && series.slug){
    const query = {slug: series.slug, provider_name: series.provider_name, dataset_code: series.dataset_code};
    Meteor.subscribe('Series.More', query, {
      onReady: function(){
        const result = {
          series: Series.findOne({slug: series.slug}),
          provider: Providers.findOne({name: series.provider_name}),
          dataset: Datasets.findOne({dataset_code: series.dataset_code}),
          chart: null,
          revisions: new ReactiveVar(null),
        };
        result.chart = seriesChartDatas(result.series);
        if (series.version > 0){
          loadSeriesArchives.call({slug: series.slug}, (err, res) => {
              if (err) {
                console.log("Archive ERROR : ", err);
              } else {
                result.revisions.set(transform_revisions(res, _.size(result.series.values)));
              }
          });
        }
        CurrentSeriesDatas.set(result);
      }
    });
  }
});


Template.explorer.helpers({
    countSeries() {
        return Humanize.formatNumber(CountSeries.get());
    },
    countSeriesFull() {
        return Humanize.formatNumber(Counts.get('series.count'));
    },
    selectProvider(){
        if (CurrentProvider.get()){
          return CurrentProvider.get();
        } else {
          return "All"
        }
    },
    selectDataset(){
        if (CurrentDataset.get()){
          return CurrentDataset.get()
        } else {
          return "All"
        }
    },
    currentSearch(){
      return SeriesSearchText.get()
    },
    CurrentSeriesSlug(){
      return CurrentSeriesSlug.get().slug ? CurrentSeriesSlug.get(): null;
    },
    seriesSelectionCount(){
      return lodash.size(SeriesSelection.get());
    },
    seriesSelectionDisable(){
      return lodash.size(SeriesSelection.get()) === 0;
    },
    seriesCartCount(){
      return lodash.size(SeriesCart.get());
    },
    seriesCartDisable(){
      return lodash.size(SeriesCart.get()) === 0;
    },
});

Template.explorer.onCreated(function(){
  Blaze._allowJavascriptUrls();
});

Template.explorer.events({
  'click #export-csv': function(event) {
      const slugs = _.map(SeriesSelection.get(), function(item){
        return item.slug
      });
      exportCSV(slugs);
      /*
      var options = {subject: "test", text: "test body"};
      sendmail_postmaster.call(options, (err, res) => {
        if (err){
          console.log("sendmail_postmaster error : ", err);
        }
        else {
          console.log("sendmail_postmaster OK : ", res);
        }
      });
      */
  },
  'click #viewCart': function(event) {
    Modal.show('viewCartModal', function () {
        const slugs = getCartSlugs();
        return Series.find({slug: {"$in": slugs}});
    });
  }
});

/*
Template.series.onCreated(function() {
  this.currentSort = new ReactiveVar();
  this.autorun(() => {
    this.currentSort.set(SeriesCurrentSort.get());
    this.subscribe('Series.byProviderAndDatasetCode', CurrentSeriesQuery.get());
  });
});
*/

//return JSON.stringify(Datasets.findOne({provider_name: CurrentProvider.get()}));

Template.series.helpers({
  ready(){
    return SeriesListDisplayReady.get() === true && lodash.isEmpty(CurrentSeriesListDatas.get()) === false;
    /*
    return CurrentSeriesListDatasReady.get();
    console.log("series helpers list : ", CurrentSeriesListDatas.get());
    */
  },
  series_list(){
      return CurrentSeriesListDatas.get();
  },
  is_array(){
      return Session.get("is_array")
  },
  settings() {
      console.log("settings array...");
      return {
          rowsPerPage: 10,
          showFilter: false,
          showRowCount: true,
          showColumnToggles: true,
          multiColumnSort: false,
          //ready: Template.instance().ready.get(),
          fields: [
              { key: 'slug', label: '', sortable: false, tmpl: Template.series_buttons, headerClass: 'col-md-1'},//width="120px"
              { key: 'key', label: 'Key' },
              { key: 'name', label: 'Name' },
              { key: 'provider_name', label: 'Provider', sortable: false },
              { key: 'dataset_code', label: 'Dataset' },
              { key: 'frequency', label: 'Freq' },
              //{ key: 'startDate', label: 'Period', fn: function (value, object, key) { return _.first(object.values).period + ' To ' + _.last(object.values).period; } },
              { key: 'version', label: 'Version' },
              //{ key: 'last_update_ds', label: 'Last Update', sortable: true, fn: ToMoment, sortByValue: true },
          ]
      };
  }
});

Template.dataset_unit.onCreated(function() {
  this.autorun(() => {
    let slug = FlowRouter.getParam('slug');
    this.subscribe('Datasets.unit', slug);
  });
});

Template.field_provider.onCreated(function(){

  const provider = FlowRouter.getParam('provider');
  if (provider){
    CurrentProvider.set(provider.toUpperCase());
  }
  this.autorun(() => {
    this.subscribe('providers');
  });
});

Template.field_provider.helpers({
  provider_options(){
    return _.sortBy(_.map(Providers.find().fetch(), function(item) {
        try {
          return {
            label: item.long_name + ' - ('+ item.name + ')',
            value: item.name,
            attrs: item.name === CurrentProvider.get() ? 'selected': '',
          };
        } catch(error){
            console.log("ProviderSelect error : ", error);
            return {label: "", value: ""};
        }
    }), 'label');
  }
});

Template.explorer.onRendered(function() {
  $(document).ready(function() {
    $('.field-select2').select2({theme: "bootstrap"});
  });
});

Template.field_provider.onRendered(function() {
  //this.$('select[name=provider]').select2({theme: "bootstrap"});
});

Template.field_provider.events({
  'change [name=provider]': function(event){
    event.preventDefault();
    const provider_name = event.target.value;
    if (provider_name){
      if (!CurrentProvider.get() || CurrentProvider.get() != provider_name){
        console.log("change provider : ", provider_name);
        CurrentProvider.set(provider_name);
        CurrentDataset.set("ALL");
        CurrentDatasetSlug.set(null);
        CurrentDimensionsFilter.set({});
        CurrentSeriesSlug.set(null);
        SeriesSearchText.set(null);
        FlowRouter.go('explorer.provider', { provider: provider_name.toLowerCase() });
      }
    }
  }
});

Template.field_dataset.onCreated(function(){
  this.autorun(() => {
    let dataset = FlowRouter.getParam('dataset');
    if (dataset){
      CurrentDatasetSlug.set(dataset);
    }
    if (CurrentDatasetSlug.get()){
      this.subscribe('Datasets_unit', CurrentDatasetSlug.get());
    }
    if (CurrentDatasetSlug.get() && DatasetBySlug.get()){
      CurrentDataset.set(DatasetBySlug.get()[CurrentDatasetSlug.get()])
    }
  });
});

Template.field_dataset.helpers({
    ready(){
        return lodash.size(DatasetList.get()) > 0;
    },
    dataset_options(){
      if (!DatasetList.get()){
        return [];
      }
      const datasetList = _.map(DatasetList.get(), function(item) {
        return {
            label: item.name + ' - ('+ item.dataset_code + ')',
            value: item.dataset_code,
            attrs: item.dataset_code === CurrentDataset.get() ? 'selected': '',
        };
      });
      datasetList.unshift({label: "All", value: "ALL"});
      return datasetList
    },
});

Template.field_dataset.onRendered(function() {
  //$('select[name=dataset]').select2({theme: "bootstrap"});
});

Template.field_dataset.events({
  'change [name=dataset]': function(event){
    event.preventDefault();
    const dataset_code = event.target.value;
    //var dataset_code = AutoForm.getFieldValue('dataset', 'providerForm');
    if (dataset_code){
        CurrentDataset.set(dataset_code);
        CurrentSeriesSlug.set(null);
        CurrentDimensionsFilter.set({});
        if (dataset_code === "ALL"){
          FlowRouter.go('explorer.provider', { provider: CurrentProvider.get().toLowerCase() });
        } else {
          const dataset_slug = DatasetByCode.get()[dataset_code];
          CurrentDatasetSlug.set(dataset_slug);
          FlowRouter.go('explorer.provider.dataset', { provider: CurrentProvider.get().toLowerCase(), dataset: dataset_slug });
        }
    }
  }
});


Template.field_dimensions.onCreated(function(){
  this.dimensions = new ReactiveVar([]);

  this.autorun(() => {
    if (!CurrentDatasetSlug.get()){
      this.dimensions.set([]);
      return;
    }

    const dataset = Datasets.findOne({slug: CurrentDatasetSlug.get() });
    if (!dataset){
      return;
    }
    const dimensions = [];
    _.each(dataset.dimension_keys, function(item){
      let dimension = {
        fieldName: item,
        fieldLabel: dataset.concepts[item],
        options: []
      };
      _.each(dataset.codelists[item], function(label, value){
        dimension.options.push({value: value, label: label});
      });
      dimensions.push(dimension);
    });
    this.dimensions.set(dimensions);

  });
});

Template.field_dimensions.helpers({
  dimensions(){
      return Template.instance().dimensions.get();
  }
});

Template.dimension_filter_select.onRendered(function() {
  $('.field-select2').select2({theme: "bootstrap"});
});

Template.dimension_filter_select.events({
  'change .field-select2': function(event){
    event.preventDefault();
    const fieldName = Template.currentData().fieldName;
    const value = event.target.value;
    const new_values = [];

    const filter = CurrentDimensionsFilter.get() || {};

    _.each($(event.target).select2('data'), function(item){
      new_values.push(item.id);
    });

    if (_.size(new_values) === 0 && filter[fieldName]){
      delete filter[fieldName];
    }

    if (_.size(new_values) > 0){
      filter[fieldName] = new_values;
    }

    CurrentDimensionsFilter.set(filter);
  }
});

Template.field_search.helpers({
  search_value(){
    if (SeriesSearchText.get()){
      return SeriesSearchText.get()
    } else {
      return ''
    }
  }
});

Template.field_search.events({
  'click #search_btn_search': function(event){
    event.preventDefault();
    const search = $('input[name=search]').val();
    SeriesSearchText.set(search);
  },
  'click #search_btn_reset': function(event){
    event.preventDefault();
    $('input[name=search]').val('');
    SeriesSearchText.set(null);
  }
});

Template.field_search.onRendered(function() {
  $('#search_btn_help').popover({
    content: Blaze.toHTML(Template.field_search_help),
    html: true,
    placement: 'auto',
    container: 'body',
    //delay: { "show": 500, "hide": 100 }
  });
});

Template.series.events({
  'click #display-grid': function(event){
    event.preventDefault();
    Session.set("is_array", false);
  },
  'click #display-list': function(event){
    event.preventDefault();
    Session.set("is_array", true);
  },
  'change #modal_enable': function(event){
    event.preventDefault();
    const checked = event.target.checked;
    if (checked){
      Session.set("modalEnable", true);
      $('#modal_enable').prop('checked', true);
    } else {
      Session.set("modalEnable", false);
      $('#modal_enable').prop('checked', false);
    }
  },

});

Template.series_unit.onCreated(function() {
  this.loop_count = -1;
});

Template.series_unit.helpers({
  ready(){
    return _.isEmpty(CurrentSeriesDatas.get()) === false;
  },
  series(){
    return CurrentSeriesDatas.get().series;
  },
  provider(){
    return CurrentSeriesDatas.get().provider;
  },
  dataset(){
    return CurrentSeriesDatas.get().dataset;
  },
  seriesChart(){
    return CurrentSeriesDatas.get().chart;
  },
  revisions(){
    return CurrentSeriesDatas.get().revisions.get();
  },
  loop_count(){
    return Template.instance().loop_count
  },
  loop_count_incr(){
    Template.instance().loop_count++;
  },
  is_rev(values){
    let v = values[Template.instance().loop_count];
    if (v){
      return true
    } else {
      return false
    }
  },
  rev_value(values){
    return values[Template.instance().loop_count].value;
  },
});

Template.series_unit.events({
  'click .close-modal': function(event){
    //event.preventDefault();
    CurrentSeriesSlug.set(null);
    if (Session.get("modalEnable")){
      Modal.hide('series_unit');
    }
  },
});

Template.series_unit.onRendered(function(){
  //$('body').scrollspy({ target: '#seriesRevisions' });
});


Template.series_line.onRendered(function() {
  $('.spark').sparkline('html', { type:'line', width: '85px', height:'60px'});// barColor:'green', spotColor: false,
});

Template.series_line.events({
  /*
  'click .list-group-item': function(event){
    event.preventDefault();
    $(event.currentTarget).toggleClass('active');
    //Session.set("CurrentSeriesSlug", $(event.currentTarget).attr('data-series-slug'));
  },
  */
  'click .series-show': function(event, template){
    event.preventDefault();
    let d = template.data;
    CurrentSeriesSlug.set({slug: d.slug, provider_name: d.provider_name, dataset_code: d.dataset_code, version: d.version });
    if (Session.get("modalEnable")){
      Modal.show('series_unit');
    }
  },
  'click .series-export-csv': function(event, template){
    event.preventDefault();
    exportCSV([template.data.slug]);
  },
  'click .series-show-graph': function(event, template){
    event.preventDefault();
    let d = template.data;
    CurrentSeriesSlug.set({slug: d.slug, provider_name: d.provider_name, dataset_code: d.dataset_code, version: d.version });
    Modal.show('series_unit_chart_modal');
  },
  'click .series-add-cart': function(event, template){
    event.preventDefault();
    const slug = template.data.slug;
    const version = template.data.version;
    const currentCart = SeriesCart.get();
    if (slug && !currentCart[slug]){
      currentCart[slug] = {slug: slug, version: version};
      SeriesCart.set(currentCart);
      Bert.alert('Series add to cart.', 'success', 'growl-top-right' );
    }
  },
  'click .series-remove-cart': function(event, template){
    event.preventDefault();
    const slug = template.data.slug;
    const version = template.data.version;
    const currentCart = SeriesCart.get();
    if (slug && currentCart[slug]){
      delete currentCart[slug]
      SeriesCart.set(currentCart);
      Bert.alert('Series remove from cart.', 'success', 'growl-top-right' );
    }
  },
  //'click input[type=checkbox]': function(event, template) {
  'click .series-add-selection': function(event, template) {
    const slug = Template.currentData().slug;
    const version = Template.currentData().version;
    const currentSelection = SeriesSelection.get();
    if (slug && !currentSelection[slug]){
      currentSelection[slug] = {slug: slug, version: version};
      SeriesSelection.set(currentSelection);
    }
  },
  'click .series-remove-selection': function(event, template) {
    const slug = Template.currentData().slug;
    const version = Template.currentData().version;
    const currentSelection = SeriesSelection.get();
    if (slug && currentSelection[slug]){
      delete currentSelection[slug];
      SeriesSelection.set(currentSelection);
    }
  }
});

Template.series_line.helpers({
  sparkline_datas(){
    const d = _.map(Template.currentData().values, function(item){
      try {
        return lodash.toInteger(item.value);
      }
      catch(error){
        console.log("error : ", error, item.value);
        return 0;
      }
    });
    return lodash.join(d);
  },
  last_update_ds(){
    return moment(Template.currentData().last_update_ds).locale(Session.get("currentLang")).format('L');
  },
  dataset(){
    return Datasets.findOne({provider_name: Template.currentData().provider_name, dataset_code: Template.currentData().dataset_code });
  },
  provider(){
    return Providers.findOne({name: Template.currentData().provider_name});
  },
  first_period(values){
    return _.first(values).period
  }
});

Template.series_buttons.helpers({
  button_cart(){
    const slug = Template.currentData().slug;
    if (SeriesCart.get() && lodash.isEmpty(SeriesCart.get()[slug])){
      return new Spacebars.SafeString('<button title="Add to cart" type="button" class="btn btn-default series-add-cart" href="javascript:void(0)"><i class="fa fa-shopping-cart"></i></button>');
    } else {
      return new Spacebars.SafeString('<button title="Remove from cart" type="button" class="btn btn-default series-remove-cart" href="javascript:void(0)"><i class="fa fa-spin fa-cart-arrow-down"></i></button>');
    }
  },
  button_select(){
    const slug = Template.currentData().slug;
    if (SeriesSelection.get() && lodash.isEmpty(SeriesSelection.get()[slug])){
      return new Spacebars.SafeString('<button title="Select for action" type="button" class="btn btn-default series-add-selection" href="javascript:void(0)"><i class="fa fa-square-o"></i></button>');
    } else {
      return new Spacebars.SafeString('<button title="Select for action" type="button" class="btn btn-default series-remove-selection" href="javascript:void(0)"><i class="fa fa-spin fa-check-square-o"></i></button>');
    }
  }
});


Template.series_unit_chart.onCreated(function() {
  this.autorun(() => {
    if (CurrentSeriesSlug.get()){
      let slug = CurrentSeriesSlug.get().slug;
      this.subscribe('Series.bySlug', slug);
    }
  });
});

Template.series_unit_chart.helpers({
  size_with(){
    return '900px;'
  },
  seriesChart(){
    let series = Series.findOne({slug: CurrentSeriesSlug.get().slug});
    if (!series){
      console.log("not series...");
      return {};
    }
    return seriesChartDatas(series);
  },
});

Template.series_limit.helpers({
  options(){
    return _.map([10, 50, 100, 200], function(item){
      return {
        label: new String(item) + " Series",
        value: new String(item),
        attrs: item === SeriesLimit.get() ? 'selected': '',
      }
    });
  }
});

Template.series_actions.helpers({
  options(){
    return [
      {value: "export-csv", label: "CSV Export"},
    ];
  }
});

Template.series_sort.helpers({
  options(){
    const sort_options = [
      {value: "name:asc", label: "Sort by Name ASC"},
      {value: "name:desc", label: "Sort by Name DESC"},
      {value: "key:asc", label: "Sort by Key ASC"},
      {value: "key:desc", label: "Sort by Key DESC"},
      {value: "start_ts:asc", label: "Sort by Start Date ASC"},
      {value: "start_ts:desc", label: "Sort by Start Date DESC"},
      {value: "end_ts:asc", label: "Sort by End Date ASC"},
      {value: "end_ts:desc", label: "Sort by End Date DESC"},
      {value: "version:asc", label: "Sort by Version ASC"},
      {value: "version:desc", label: "Sort by Version DESC"},
    ];
    return _.map(sort_options, function(item){
      return {
        label: item.label,
        value: item.value,
        attrs: item.value === SeriesCurrentSort.get() ? 'selected': '',
      }
    });
  }
});

Template.series_limit.events({
  'change #series-limit': function(event){
    event.preventDefault();
    SeriesLimit.set(parseInt(event.target.value));
  }
});

Template.series_actions.events({
  'change #series-actions': function(event){
    event.preventDefault();
    console.log("action : ", event.target.value);
  }
});

Template.series_sort.events({
  'change #series-sort': function(event){
    event.preventDefault();
    console.log("change sort : ", event.target.value);
    SeriesCurrentSort.set(event.target.value);
  }
});

/*
TODO: DATA TREE

    query = {"provider_name": provider_name,
             "enable": True}

    cursor = queries.col_categories().find(query, {"_id": False})
    cursor = cursor.sort([("position", 1), ("category_code", 1)])

    categories = OrderedDict([(doc["category_code"], doc ) for doc in cursor])
    ds_codes = []

    for_remove = []
    for cat in categories.values():
        if cat.get("parent"):
            parent = categories[cat.get("parent")]
            if not "children" in parent:
                parent["children"] = []
            parent["children"].append(cat)
            for_remove.append(cat["category_code"])
        if cat.get("datasets"):
            for ds in cat.get("datasets"):
                ds_codes.append(ds["dataset_code"])

    for r in for_remove:
        categories.pop(r)

    ds_query = {'provider_name': provider_name,
                "enable": True,
                "dataset_code": {"$in": list(set(ds_codes))}}
    ds_projection = {"_id": True, "dataset_code": True, "slug": True}
    cursor = queries.col_datasets().find(ds_query, ds_projection)

    dataset_codes = {}
    for doc in cursor:
        dataset_codes[doc['dataset_code']] = {
            "slug": doc['slug'],
            "url": url_for('.dataset-by-slug', slug=doc["slug"])
        }

    context = dict(
        provider=_provider,
        categories=categories,
        dataset_codes=dataset_codes
    )

*/

Template.viewCart.onCreated(function(){
  this.slugs = new ReactiveVar();
  this.selected = new ReactiveVar({});
  this.autorun(() => {
    this.slugs = getCartSlugs();
    this.subscribe("Series.bySlug", this.slugs);
  });
});

Template.cart_series_line.onRendered(function(){
  //$('.switch').bootstrapSwitch();
});

Template.viewCart.events({
  'click #cart-export-csv': function(event){
    event.preventDefault();
    const slugs = _.map(Template.instance().selected.get(), function(item){
      return item.slug
    });
    exportCSV(slugs);
  },
  'click #cart-checkAll': function(event){
    event.preventDefault();
    //$('input[type=checkbox]').prop('checked', true);
    let selected = {};
    _.each(Template.instance().slugs, function(item){
      selected[item] = {
        slug: item,
        version: 0
      }
    });
    Template.instance().selected.set(selected);
  },
  'click #cart-uncheckAll': function(event){
    event.preventDefault();
    //$('input[type=checkbox]').prop('checked', false);
    Template.instance().selected.set({});
  },
  'click #cart-deleteAll': function(event, template){
    event.preventDefault();
    Template.instance().selected.set({});
    SeriesCart.set({});
    Modal.hide('viewCartModal');
  },
});

Template.viewCart.helpers({
  series_list(){
      return Series.find({slug: {"$in": Template.instance().slugs}});
  },
  selectionDisable(){
    return lodash.size(Template.instance().selected.get()) === 0;
  },
});

Template.cart_series_line.events({
  'click .series-show': function(event, template){
    event.preventDefault();
    //TODO: show in cart
    //CurrentSeriesSlug.set(template.data.slug);
  },
  'click .series-remove-cart': function(event, template){
    event.preventDefault();
    const slug = template.data.slug;
    const version = template.data.version;
    const currentCart = SeriesCart.get();
    if (slug && currentCart[slug]){
      delete currentCart[slug];
      SeriesCart.set(currentCart);
      Bert.alert('Series remove from cart.', 'success', 'growl-top-right' );
    }
    if (lodash.size(SeriesCart.get()) === 0){
      Modal.hide('viewCartModal');
    }
  },
  'click input[type=checkbox]': function(event, template) {
    const slug = Template.currentData().slug;
    const version = Template.currentData().version;
    const checked = event.target.checked;
    const currentSelection = Template.instance().parent().selected.get();
    if (checked){
      console.log("add checked : ", slug);
      currentSelection[slug] = {slug: slug, version: version};
    } else {
      delete currentSelection[slug];
      console.log("remove checked : ", slug);
    }
    Template.instance().parent().selected.set(currentSelection);
  },
  'click .series-add-selection': function(event, template) {
    const slug = Template.currentData().slug;
    const version = Template.currentData().version;
    const currentSelection = Template.instance().parent().selected.get();
    if (slug && !currentSelection[slug]){
      currentSelection[slug] = {slug: slug, version: version};
      Template.instance().parent().selected.set(currentSelection);
    }
  },
  'click .series-remove-selection': function(event, template) {
    const slug = Template.currentData().slug;
    const version = Template.currentData().version;
    const currentSelection = Template.instance().parent().selected.get();
    if (slug && currentSelection[slug]){
      delete currentSelection[slug];
      Template.instance().parent().selected.set(currentSelection);
    }
  }
});

Template.cart_series_line.helpers({
  last_update_ds(){
    return moment(Template.currentData().last_update_ds).locale(Session.get("currentLang")).format('L');
  },
  dataset(){
    return Datasets.findOne({provider_name: Template.currentData().provider_name, dataset_code: Template.currentData().dataset_code });
  },
  provider(){
    return Providers.findOne({name: Template.currentData().provider_name});
  },
  /*
  isChecked(){
    let selected = Template.instance().parent().selected.get();
    let checked = selected[Template.currentData().slug];
    return (checked != undefined ? 'checked' : false);
  },
  */
});

Template.cart_series_buttons.helpers({
  button_select(){
    const selected = Template.instance().parent().parent().selected.get();
    const slug = Template.currentData().slug;
    if (selected && lodash.isEmpty(selected[slug])){
      return new Spacebars.SafeString('<button title="Select for action" type="button" class="btn btn-default series-add-selection" href="javascript:void(0)"><i class="fa fa-square-o"></i></button>');
    } else {
      return new Spacebars.SafeString('<button title="Select for action" type="button" class="btn btn-default series-remove-selection" href="javascript:void(0)"><i class="fa fa-spin fa-check-square-o"></i></button>');
    }
  },
});

