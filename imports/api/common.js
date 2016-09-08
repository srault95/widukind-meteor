import { _ } from 'meteor/underscore';
import { lodash } from 'meteor/stevezhu:lodash';
import { moment } from 'meteor/momentjs:moment';

export const Schemas = {};

export const logger = function(value){
    console.log(value);
};

const get_year = function(value){
  if (lodash.includes(value, '-')){
    return value.split('-')[0] //2016
  } else {
    return value.substring(0, 4) //2016
  }
};

const get_month = function(value){
  if (lodash.includes(value, '-')){
    return value.split('-')[1] //2016-01
  } else {
    return value.substring(4, 6) //201601
  }
};

const get_day = function(value){
  if (lodash.includes(value, '-')){
    return value.split('-')[2] //2016-01-01
  } else {
    return value.substring(6, 8) //20160101
  }
};

export const get_datetime_from_period = function(date_str, frequency){

    let year = null;
    let month = 0;
    let day = 1;

    switch (frequency) {
      case 'A':
        year = parseInt(get_year(date_str));
        break;
      case 'M':
        year = parseInt(get_year(date_str));
        month = parseInt(get_month(date_str)) -1;
        break;
      case 'D':
        year = parseInt(get_year(date_str));
        month = parseInt(get_month(date_str)) -1;
        day = parseInt(get_day(date_str));
        break;
      case 'Q':
        year = parseInt(get_year(date_str));
        let month_str = get_month(date_str);
        //lodash.startsWith(month_str, 'Q')
        switch (month_str){
            case "Q1":
                month = 0
                break;
            case "Q2":
                month = 3
                break;
            case "Q3":
                month = 6
                break;
            case "Q4":
                month = 9
                break;
          //TODO: else error

        }
        break;
      case 'W':
        year = parseInt(get_year(date_str));
        //TODO: error
      case 'B':
        year = parseInt(get_year(date_str));
        //TODO: error
      case 'S':
        year = parseInt(get_year(date_str));
        switch (date_str){
            case date_str.endswith("S1"):
                month = 0
                break;
            case date_str.endswith("S2"):
                month = 6
                break;
            //TODO: else error
        }
    }

  return Date.UTC(year, month, day)

};

export const seriesChartDatas = function(series){
    let data = [];
    let frequency = series.frequency;
    let start_ts = moment.utc(series.start_ts);

    _.each(series.values, function(item){
      try {
        //let d = start_ts.toDate();
        let period = get_datetime_from_period(item.period, frequency);
        //console.log("period : ", frequency, item.period, period, moment(period).format('LL'));
        data.push([period, parseFloat(item.value)]);
        //data.push([Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()), parseFloat(item.value)]);
        //start_ts = start_ts.add(step[0], step[1]);
      }
      catch(error){
        console.log("error : ", error, item);
        //return 0;
      }
    });

    return {
      chart: {
        //type: 'area',
        zoomType: 'x'
      },
      title: {
        text: series.key + ' - ' + series.name
      },
      tooltip: {
          pointFormat: '{series.name} produced <b>{point.y:,.0f}</b><br/>warheads in {point.x}'
      },
      xAxis: {
        type: 'datetime',
      },
      yAxis: {
        /*
        title: {
            text: 'Nuclear weapon states'
        },
        */
        labels: {
            formatter: function () {
                return this.value;// / 1000 + 'k';
            }
        }
      },
      legend: {
        enabled: false
      },
      series: [{
        type: 'area',
        name: series.name,
        data: data
      }]
    }
};


export const transform_revisions = function(revisions, count_values){
  const new_revisions = [];
  _.each(revisions, function(series_rev){
    let values = lodash.reverse(_.clone(series_rev.values));
    let empty_element = count_values - values.length;
    _.each(_.range(empty_element), function(i){
      values.unshift(null);
    });
    new_revisions.push({
        "last_update_ds": series_rev.last_update_ds,
        "version": series_rev.version,
        "values": values,
        "name": series_rev.name,
        //"url": url_for('.series-by-slug-version', slug=slug, version=series_rev['version'])}
        })
  });
  return new_revisions;
}

