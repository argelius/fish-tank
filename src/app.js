var Vue = require('vue');
var onsen = require('onsenui');
var Firebase = require('firebase');
var Chart = require('chart.js');
var $ = require('jquery');

var chartData = {
  date: (function() {
    var d = new Date();
    var yyyy = d.getFullYear().toString();
    var mm = (d.getMonth()+1).toString(); // getMonth() is zero-based
    var dd  = d.getDate().toString();
    return [yyyy, (mm[1]?mm:'0'+mm[0]), (dd[1]?dd:'0'+dd[0])].join('-'); // padding
  })()
}

var dateSelectDialog = new Vue({
  el: '#date-select-dialog',
  data: chartData,
  methods: {
    show: function() {
      this.$el.show();
    },

    hide: function() {
      this.$el.hide();
    }
  }
});

$(document).on('init', '#temp', function() {
  var app = new Vue({
    el: '#current-temperature',
    data: {
      scale: 'celsius',
      temperature: 0.0
    },

    created: function() {
      this.firebaseRef = new Firebase("https://fish-tank.firebaseio.com/temperature").orderByChild('timestamp').limitToLast(1);
      this.fetchTemperature()
    },

    methods: {
      fetchTemperature: function() {
        var self = this;

        this.firebaseRef.on('value', function(snapshot) {
          var val = snapshot.val();

          for (key in val) {
            if (val.hasOwnProperty(key)) {
              self.temperature = val[key].temperature;
            }
          }
        });
      },

      celsiusToFahrenheit: function(celsius) {
        return Number(1.8 * celsius + 32).toFixed(2);
      },

      beforeDestroy: function() {
        this.firebaseRef.off('value');
      }
    }
  });

  $(this).one('destroy', function() {
    app.$destroy(true);
    app = undefined;
  });
});

$(document).on('init', '#stats', function() {
  var app = new Vue({
    el: '#stats',

    data: chartData,

    created: function() {
      this.firebaseRef = new Firebase("https://fish-tank.firebaseio.com/temperature").orderByChild('timestamp');

      var labels = [],
        values = [];

      for (var i = 0; i <= 24; i++) {
        var k = i === 24 ? 0 : 45;

        for (var j = 0; j <= k; j += 15) { 
          if (i % 2 === 0 && j == 0) {
            labels.push((('0' + i).slice(-2) + ':' + ('0' + j).slice(-2)));
          }
          else {
            labels.push('');
          }
          values.push(0.0);
        }
      }

      this.chartData = {
        labels: labels,
        datasets: [{
          label: 'Temperature',
          fillColor: 'rgba(220,220,220,0.2)',
          strokeColor: '#009688',
          pointColor: 'rgba(220,220,220,1)',
          pointStrokeColor: '#fff',
          pointHighlightFill: '#fff',
          pointHighlightStroke: 'rgba(220,220,220,1)',
          data: values
        }]
      };

      this.chartOptions = {
        scaleShowGridLines: false,
        scaleGridLineColor: "rgba(0,0,0,.05)",
        scaleGridLineWidth: 1,
        scaleShowHorizontalLines: true,
        scaleShowVerticalLines: true,
        bezierCurve: true,
        bezierCurveTension: 0.5,
        pointDot: false,
        pointDotRadius: 4,
        pointDotStrokeWidth: 1,
        pointHitDetectionRadius: 0,
        datasetStroke: true,
        datasetStrokeWidth: 2,
        datasetFill: true
      };

    },

    compiled: function() {
      var ctx = document.getElementById('temperature-chart').getContext('2d');
      this.chart = new Chart(ctx).Line(this.chartData, this.chartOptions);
      this.renderChart();
    },

    watch: {
      'date': function() {
        this.renderChart();
      }
    },

    methods: {
      showDateSelectDialog: function() {
        dateSelectDialog.show();
      },

      renderChart: function() {
        var from = new Date(Date.parse(this.date)).setHours(0);
        var to = new Date(Date.parse(this.date)).setHours(24);
        var self = this;

        this.firebaseRef.startAt(from).endAt(to).once('value', function(snapshot) {
          var inc = 1000 * 60 * 15;
          var points = {};

          for (var i = from; i <= to; i += inc) {
            points[i] = 0.0;
          }

          snapshot.forEach(function(child) {
            var v = child.val();
            var ts = v.timestamp;

            ts = ts - (ts % inc);
            points[ts] = v.temperature;
          });

          var data = Object.keys(points).map(function(k) { return points[k]; });

          points = self.chart.datasets[0].points;

          for (var i = 0; i < points.length; i++) {
            points[i].value = data[i];
          }

          self.chart.update();
        });
      },

      beforeDestroy: function() {
        this.firebaseRef.off('value');
        this.firebaseRef = undefined;
      }
    }
  });

  $(this).one('destroy', function() {
    app.$destroy(true);
    app = undefined;
  });
});
