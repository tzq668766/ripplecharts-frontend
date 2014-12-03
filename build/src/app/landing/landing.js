angular.module('ripplecharts.landing', ['ui.state']).config([
  '$stateProvider',
  function config($stateProvider) {
    $stateProvider.state('landing', {
      url: '/',
      views: {
        'main': {
          controller: 'LandingCtrl',
          templateUrl: 'landing/landing.tpl.html'
        }
      },
      data: {}
    });
  }
]).controller('LandingCtrl', [
  '$scope',
  '$rootScope',
  '$location',
  function LandingCtrl($scope, $rootScope, $location) {
    var api = new ApiHandler(API);
    var donut = new ValueSummary({ id: 'metricDetail' });
    var exchangeRates = {};
    var valueCurrencies = {
        'USD': 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
        'EUR': 'rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q',
        'JPY': 'rMAz5ZnK73nyNUL4foAvaxdreczCkG3vA6',
        'CNY': 'razqQKzJRdB4UxFPWf5NEpEG3WMkmwgcXA',
        'XRP': ''
      };
    var totalAccounts;
    var totalNetworkValueXRP;
    var transactionVolumeXRP;
    var tradeVolumeXRP;
    $scope.valueRate;
    $scope.valueCurrency = 'USD';
    $scope.metricDetail = 'tradeVolume';
    $scope.metricDetailTitle = 'Trade Volume (last 24 hours)';
    var valueSelect = d3.select('#valueCurrency').on('change', function () {
        var currency = this.value;
        setValueRate(currency, true, function (err) {
          $scope.valueCurrency = currency;
          showValue('totalNetworkValue');
          showValue('transactionVolume');
          showValue('tradeVolume');
        });
      });
    valueSelect.selectAll('option').data(d3.keys(valueCurrencies)).enter().append('option').html(function (d) {
      return d;
    }).attr('selected', function (d) {
      if (d == $scope.valueCurrency.currency)
        return true;
    });
    remote.on('transaction_all', handleNewAccount);
    remote.on('connect', function () {
      getTotalAccounts();
    });
    if (remote._connected)
      getTotalAccounts();
    var markets = new MultiMarket({
        url: API,
        id: 'topMarkets',
        fixed: true,
        clickable: true,
        updateInterval: 60
      });
    markets.list([
      {
        base: { currency: 'XRP' },
        counter: {
          currency: 'USD',
          issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'
        }
      },
      {
        base: { currency: 'XRP' },
        counter: {
          currency: 'JPY',
          issuer: 'rMAz5ZnK73nyNUL4foAvaxdreczCkG3vA6'
        }
      },
      {
        base: {
          currency: 'BTC',
          issuer: 'rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q'
        },
        counter: { currency: 'XRP' }
      },
      {
        base: { currency: 'XRP' },
        counter: {
          currency: 'CNY',
          issuer: 'rnuF96W4SZoCJmbHYBFoJZpR8eCaxNvekK'
        }
      },
      {
        base: { currency: 'XRP' },
        counter: {
          currency: 'USD',
          issuer: 'rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q'
        }
      },
      {
        base: {
          currency: 'BTC',
          issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'
        },
        counter: { currency: 'XRP' }
      }
    ]);
    markets.on('chartClick', function (chart) {
      var path = '/markets/' + chart.base.currency + (chart.base.issuer ? ':' + chart.base.issuer : '') + '/' + chart.counter.currency + (chart.counter.issuer ? ':' + chart.counter.issuer : '');
      $location.path(path);
      $scope.$apply();
    });
    if (!store.get('returning'))
      setTimeout(function () {
        d3.select('#helpButton').node().click();
      }, 100);
    $scope.$watch('metricDetail', function () {
      var ex = {
          rate: $scope.valueRate,
          currency: $scope.valueCurrency
        };
      if ($scope.metricDetail == 'totalNetworkValue') {
        $scope.metricDetailTitle = 'Total Network Value';
        donut.load(totalNetworkValueXRP, ex, true);
      } else if ($scope.metricDetail == 'transactionVolume') {
        $scope.metricDetailTitle = 'Transaction Volume (last 24 hours)';
        donut.load(transactionVolumeXRP, ex);
      } else if ($scope.metricDetail == 'tradeVolume') {
        $scope.metricDetailTitle = 'Trade Volume (last 24 hours)';
        donut.load(tradeVolumeXRP, ex);
      }
    });
    $scope.$on('$destroy', function () {
      markets.list([]);
      if (!store.get('returning') && $scope.showHelp)
        setTimeout(function () {
          d3.select('#helpButton').node().click();
        }, 50);
      store.set('returning', true);
      clearInterval(valueInterval);
    });
    function getTotalAccounts() {
      api.getTotalAccounts(null, function (err, total) {
        if (err)
          console.log(err);
        if (total)
          totalAccounts = total;
        $scope.totalAccounts = total ? commas(total) : ' ';
        $scope.$apply();
      });
    }
    function handleNewAccount(tx) {
      var meta = tx.meta;
      if (meta.TransactionResult !== 'tesSUCCESS')
        return;
      meta.AffectedNodes.forEach(function (affNode) {
        if (affNode.CreatedNode && affNode.CreatedNode.LedgerEntryType === 'AccountRoot') {
          $scope.totalAccounts = totalAccounts ? commas(++totalAccounts) : ' ';
          $scope.$apply();
        }
      });
    }
    function showValue(metric) {
      var ex = {
          rate: $scope.valueRate,
          currency: $scope.valueCurrency
        }, sign, value, precision;
      if (typeof $scope.valueRate === 'undefined')
        return;
      if (metric == 'totalNetworkValue') {
        if (typeof totalNetworkValueXRP === 'undefined')
          return;
        if (metric === $scope.metricDetail)
          donut.load(totalNetworkValueXRP, ex, true);
        value = totalNetworkValueXRP.total / $scope.valueRate;
        precision = 0;
      } else if (metric == 'transactionVolume') {
        if (typeof transactionVolumeXRP === 'undefined')
          return;
        if (metric === $scope.metricDetail)
          donut.load(transactionVolumeXRP, ex);
        value = transactionVolumeXRP.total / $scope.valueRate;
        precision = 2;
      } else if (metric == 'tradeVolume') {
        if (typeof tradeVolumeXRP === 'undefined')
          return;
        if (metric === $scope.metricDetail)
          donut.load(tradeVolumeXRP, ex);
        value = tradeVolumeXRP.total / $scope.valueRate;
        precision = 2;
      }
      switch ($scope.valueCurrency) {
      case 'USD':
        sign = '$';
        break;
      case 'JPY':
        sign = '\xa5';
        break;
      case 'CNY':
        sign = '\xa5';
        break;
      case 'EUR':
        sign = '\u20ac';
        break;
      case 'XRP':
        sign = '';
        break;
      default:
        sign = '';
        break;
      }
      $scope[metric] = value ? sign + commas(value, precision) : ' ';
      $scope.$apply();
    }
    function getValues() {
      setValueRate($scope.valueCurrency, false, function (err) {
        showValue('totalNetworkValue');
        showValue('transactionVolume');
        showValue('tradeVolume');
      });
      api.getNetworkValue(null, function (err, data) {
        if (err) {
          console.log(err);
          data = { total: 0 };
        }
        totalNetworkValueXRP = data;
        showValue('totalNetworkValue');
      });
      api.getVolume24Hours(null, function (err, data) {
        if (err) {
          console.log(err);
          data = { total: 0 };
        }
        transactionVolumeXRP = data;
        showValue('transactionVolume');
      });
      api.getTopMarkets(null, function (err, data) {
        if (err) {
          console.log(err);
          data = { total: 0 };
        }
        tradeVolumeXRP = data;
        showValue('tradeVolume');
      });
    }
    function setValueRate(currency, useCached, callback) {
      var issuer = valueCurrencies[currency];
      if (currency == 'XRP') {
        $scope.valueRate = 1;
        $scope.valueRateDisplay = '';
        return callback();
      }
      if (useCached && exchangeRates[currency + '.' + issuer]) {
        $scope.valueRate = exchangeRates[currency + '.' + issuer];
        $scope.valueRateDisplay = commas(1 / $scope.valueRate, 4) + ' XRP/' + currency;
        return callback();
      }
      getExchangeRate({
        currency: currency,
        issuer: issuer
      }, function (err) {
        if (err) {
          console.log(err);
          $scope.valueRate = 0;
          return callback(err);
        }
        $scope.valueRate = exchangeRates[currency + '.' + issuer] || 0;
        if ($scope.valueRate)
          $scope.valueRateDisplay = commas(1 / $scope.valueRate, 4) + ' XRP/' + currency;
        callback();
      });
    }
    function getExchangeRate(c, callback) {
      api.exchangeRates({
        pairs: [{
            base: {
              currency: c.currency,
              issuer: c.issuer
            },
            counter: { currency: 'XRP' }
          }]
      }, function (err, data) {
        if (err)
          return callback(err);
        data.forEach(function (d) {
          exchangeRates[d.base.currency + '.' + d.base.issuer] = d.rate;
        });
        callback(null, data);
      });
    }
    getValues();
    var valueInterval = setInterval(getValues, 300000);
  }
]);