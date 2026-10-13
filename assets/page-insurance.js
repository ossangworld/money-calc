(function () {
  'use strict';
  function run() {
    var monthly = UI.num('monthly');
    var r = Calc.socialInsurance({ monthly: monthly, companySize: UI.val('size') });
    UI.set('r-worker', UI.won(r.worker.total));
    ['pension', 'health', 'care', 'employment', 'total'].forEach(function (k) {
      UI.set('w-' + k, UI.won(r.worker[k]));
      UI.set('e-' + k, UI.won(r.employer[k]));
    });
    UI.set('r-cost', UI.won(monthly + r.employer.total));
    UI.show('result');
  }
  document.getElementById('go').addEventListener('click', run);
})();
