
import { Template } from 'meteor/templating';

import { Providers } from '../../api/frontend/collections.js';

import './home.html';

Template.home.onCreated(function(){
    this.autorun(() => {
        this.subscribe('providers');
    });
});

Template.home.helpers({
    providers(){
        var result = {};
        Providers.find().forEach(function (item) {
            result[item.slug] = item;
        });
        return result;
    },
});

Template.card.helpers({
    logo(){
        return '/imgs/logos/provider-'+ Template.currentData().provider.slug + '.png'
    },
});

