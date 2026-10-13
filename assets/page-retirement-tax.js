(function () {
  'use strict';
  function run() {
    var r = Calc.retirementTax({ amount: UI.num('amount'), start: UI.val('start'), end: UI.val('end') });
    UI.set('r-net', UI.won(r.net));
    UI.set('r-years', r.years + '년');
    UI.set('r-service', UI.won(r.serviceDeduction));
    UI.set('r-converted', UI.won(r.converted));
    UI.set('r-conv-ded', UI.won(r.convDeduction));
    UI.set('r-base', UI.won(r.base));
    UI.set('r-tax', UI.won(r.tax));
    UI.set('r-local', UI.won(r.localTax));
    UI.set('r-total', UI.won(r.totalTax) + ' (' + (r.effectiveRate * 100).toFixed(2) + '%)');
    UI.show('result');
  }
  document.getElementById('go').addEventListener('click', run);
})();
