import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

export const Providers = new Mongo.Collection('providers');

export const Datasets = new Mongo.Collection('datasets');

export const Series = new Mongo.Collection('series');

export const SeriesArchives = new Mongo.Collection('series_archives');

export const Tags = new Mongo.Collection('tags');

//import { Schemas } from '../common.js';

Providers.publicFields = {
  metadata: 0,
};

Datasets.publicFields = {
  //name: 1,
  //dataset_code: 1,
  metadata: 0,
  codelists: 0,
  tags: 0,
  concepts: 0,
  notes: 0
};

Series.publicFields = {
  //tags: 0,
  //'values.value': 0,
  //'values.attributes': 0,
  notes: 0
};

