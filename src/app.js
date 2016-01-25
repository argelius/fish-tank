var Vue = require('vue');
var onsen = require('onsenui');
var Firebase = require('firebase');
var Chart = require('chart.js');
var $ = require('jquery');

Vue.config.silent = true

var celsiusToFahrenheit = function(celsius) {
  return Number(1.8 * celsius + 32).toFixed(2);
}

var globalData = {
  date: (function() {
    var d = new Date();
    var yyyy = d.getFullYear().toString();
    var mm = (d.getMonth()+1).toString(); // getMonth() is zero-based
    var dd  = d.getDate().toString();
    return [yyyy, (mm[1]?mm:'0'+mm[0]), (dd[1]?dd:'0'+dd[0])].join('-'); // padding
  })(),
  scale: 'celsius',
  temperature: 0.0
}

var dateSelectDialog = new Vue({
  el: '#date-select-dialog',
  data: globalData,
  methods: {
    show: function() {
      this.$el.show();
    },

    hide: function() {
      this.$el.hide();
    }
  }
});

var settingsDialog = new Vue({
  el: '#settings-dialog',
  data: globalData,
  methods: {
    show: function() {
      this.$el.show();
    },

    hide: function() {
      this.$el.hide();
    }
  }
});

$(document).on('init', '#app', function() {
  var app = new Vue({
    el: '#app',

    methods: {
      showSettingsDialog: settingsDialog.show
    }
  });
});

$(document).on('init', '#temp', function() {
  var app = new Vue({
    el: '#current-temperature',
    data: globalData,

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
        return celsiusToFahrenheit(celsius);
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

    data: globalData,

    created: function() {
      this.firebaseRef = new Firebase("https://fish-tank.firebaseio.com/temperature").orderByChild('timestamp');

      var labels = [],
        values = [];

      for (var i = 0; i < 24; i++) {
        for (var j = 0; j <= 45; j += 15) {
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
        datasetFill: true,
        responsive: true,
        maintainAspectRatio: false,
        scaleLabel: ' <%= Number(value).toFixed(0) %>'
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
      },
      'scale': function() {
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

        this.firebaseRef.startAt(from).endAt(to).on('value', function(snapshot) {
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
            points[i].value = self.scale === 'celsius' || data[i] === 0.0 ?
              data[i] :
              celsiusToFahrenheit(data[i]);

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
