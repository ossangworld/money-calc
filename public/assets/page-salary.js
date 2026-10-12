(function () {
  'use strict';
  function run() {
    var r = Calc.netSalary({
      annual: UI.num('annual'),
      nonTaxableMonthly: UI.num('nontax'),
      dependents: Number(UI.val('dependents')),
      children: Number(UI.val('children'))
    });
    UI.set('r-net', UI.won(r.netMonthly));
    UI.set('r-monthly', UI.won(r.monthly));
    UI.set('r-pension', '-' + UI.won(r.pension));
    UI.set('r-health', '-' + UI.won(r.health));
    UI.set('r-care', '-' + UI.won(r.care));
    UI.set('r-employment', '-' + UI.won(r.employment));
    UI.set('r-income', '-' + UI.won(r.incomeTax));
    UI.set('r-local', '-' + UI.won(r.localTax));
    UI.set('r-total', '-' + UI.won(r.totalDeduction));
    UI.set('r-annual', UI.won(r.netAnnual));
    UI.show('result');
  }
  document.getElementById('go').addEventListener('click', run);
})();
