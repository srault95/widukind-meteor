
import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import { AccountsTemplates } from 'meteor/useraccounts:core';

import '../../ui/layouts/nav.js';
import '../../ui/pages/app-not-found.js';
import '../../ui/pages/home.js';
import '../../ui/components/explorer/explorer.js';
import '../../ui/components/admin/admin.js';

FlowRouter.route('/', {
  name: "home",
  action: function(params, queryParams) {
    BlazeLayout.render('masterLayout', {
      footer: "footer",
      main: "home",
      nav: "nav",
    });
  }
});

FlowRouter.route('/explorer', {
  name: "explorer",
  action: function(params, queryParams) {
    BlazeLayout.render('masterLayout', {
      footer: "footer",
      main: "explorer",
      nav: "nav",
    });
  }
});

FlowRouter.route('/explorer/:provider', {
  name: "explorer.provider",
  action: function(params, queryParams) {
    BlazeLayout.render('masterLayout', {
      footer: "footer",
      main: "explorer",
      nav: "nav",
    });
  }
});

FlowRouter.route('/explorer/:provider/:dataset', {
  name: "explorer.provider.dataset",
  action: function(params, queryParams) {
    BlazeLayout.render('masterLayout', {
      footer: "footer",
      main: "explorer",
      nav: "nav",
    });
  }
});

FlowRouter.route('/dataset/:slug', {
  name: "dataset.slug",
  action: function(params, queryParams) {
    BlazeLayout.render('masterLayout', {
      footer: "footer",
      main: "dataset_unit",
      nav: "nav",
    });
  }
});

FlowRouter.route('/series/:slug', {
  name: "series.slug",
  action: function(params, queryParams) {
    BlazeLayout.render('masterLayout', {
      footer: "footer",
      main: "series_unit",
      nav: "nav",
    });
  }
});

FlowRouter.route('/series/:slug/:version', {
  name: "series.slug.version",
  action: function(params, queryParams) {
    BlazeLayout.render('masterLayout', {
      footer: "footer",
      main: "series_unit",
      nav: "nav",
    });
  }
});

var adminRoutes = FlowRouter.group({
  prefix: '/admin',
  name: 'admin',
  triggersEnter: [AccountsTemplates.ensureSignedIn],
});

adminRoutes.route('/', {
  name: 'admin.stats_run',
  action: function(params, queryParams) {
    BlazeLayout.render('masterLayout', {
      footer: "footer",
      main: "stats_run",
      nav: "nav",
    });
  }
});

FlowRouter.notFound = {
  action: function() {
    BlazeLayout.render('masterLayout', {
      footer: "footer",
      main: "pageNotFound",
      nav: "nav",
    });
  }
};

AccountsTemplates.configureRoute('changePwd');
AccountsTemplates.configureRoute('forgotPwd');
AccountsTemplates.configureRoute('resetPwd');
AccountsTemplates.configureRoute('signIn');
AccountsTemplates.configureRoute('signUp');
AccountsTemplates.configureRoute('verifyEmail');
