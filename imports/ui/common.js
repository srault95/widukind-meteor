import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Spacebars } from 'meteor/spacebars';
import { lodash } from 'meteor/stevezhu:lodash';
import { _ } from 'meteor/underscore';

import { moment } from 'meteor/momentjs:moment';
import { SubsManager } from 'meteor/meteorhacks:subs-manager';
//export const ProvidersSubs = new SubsManager();
//export const DatasetsSubs = new SubsManager();
export const SeriesSubs = new SubsManager();

Session.set("currentLang", "en");
Session.set("modalEnable", true);
Session.set("is_array", false);

Meteor.Spinner.options = {
    lines: 13, // The number of lines to draw
    length: 10, // The length of each line
    width: 5, // The line thickness
    scale: 5.0, // Scales overall size of the spinner
    radius: 15, // The radius of the inner circle
    corners: 0.7, // Corner roundness (0..1)
    rotate: 0, // The rotation offset
    direction: 1, // 1: clockwise, -1: counterclockwise
    color: '#fff', // #rgb or #rrggbb
    speed: 1, // Rounds per second
    trail: 60, // Afterglow percentage
    shadow: true, // Whether to render a shadow
    hwaccel: false, // Whether to use hardware acceleration
    className: 'spinner', // The CSS class to assign to the spinner
    zIndex: 2e9, // The z-index (defaults to 2000000000)
    top: '50%', // Top position relative to parent in px
    left: '50%', // Left position relative to parent in px
    position: 'relative'
};

const FREQUENCIES = {
    "A": "Annually",
    "M": "Monthly",
    "Q": "Quarterly",
    "W": "Weekly",
    "W-WEB": "Weekly Wednesday",
    "D": "Daily",
    "H": "Hourly",
    "S": "SemiAnnually"
};

Template.registerHelper('frequency_name', function(frequency) {
  return FREQUENCIES[frequency.toUpperCase()]
});

Template.registerHelper('moment', function(value, format) {
    return moment(value).locale(Session.get("currentLang")).format(format);
});

Template.registerHelper('attribute_short', function(value, dataset) {
    if (lodash.isEmpty(value.attributes)){
      return new Spacebars.SafeString('&nbsp;');
    }
    const attrs = [];
    _.each(value.attributes, function(field_value, field_key){
      let concept = dataset.concepts[field_key] || field_key;
      let title = concept + ' : ' + field_key;
      if (dataset.codelists[field_key] && dataset.codelists[field_key][field_value]){
        title = concept + ' : ' + dataset.codelists[field_key][field_value];
      }
      attrs.push('<a data-toggle="tooltip" title="'+ title + '" href="javascript:void(0)">' + field_value + '</a>');
    });
    return new Spacebars.SafeString(lodash.join(attrs));
});

Template.registerHelper('website', function(provider, dataset) {
    if (!lodash.isEmpty(dataset.doc_href) && lodash.startsWith(dataset.doc_href.toLowerCase(), 'http')){
      return new Spacebars.SafeString('<a target="_blank" href="' + dataset.doc_href + '">' + dataset.doc_href + '</a>');
    } else {
      return new Spacebars.SafeString('<a target="_blank" href="' + provider.website + '">' + provider.website + '</a>');
    }
});

Template.registerHelper('period_text', function(values) {
    return _.first(values).period + ' To ' + _.last(values).period;
});

Template.registerHelper('is_modal', function(values) {
    return Session.get("modalEnable")
});

Template.registerHelper('series_values_reverse', function(values) {
    if (lodash.isEmpty(values)){
        return [];
    }
    return lodash.reverse(_.clone(values));
});

