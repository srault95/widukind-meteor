
import { Template } from 'meteor/templating';

import '../stylesheets/main.css';
//https://github.com/select2/select2-bootstrap-theme
import '../stylesheets/select2-bootstrap.css';
import './footer.html';
import './nav.html';
import './master_layout.html';

Template.nav.onRendered(function() {
  this.$('[data-toggle="dropdown"]').dropdown();
});

