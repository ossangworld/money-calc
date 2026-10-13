(function () {
  'use strict';
  function run() {
    var r = Calc.salaryRaise({
      annual: UI.num('annual'),
      raisePercent: Number(UI.val('raise')) || 0,
      nonTaxableMonthly: UI.num('nontax'),
      dependents: Number(UI.val('dependents'))
    });
    var sign = r.monthlyNetDiff >= 0 ? '+' : '';
    UI.set('r-diff', sign + UI.won(r.monthlyNetDiff));
    UI.set('b-annual', UI.won(UI.num('annual')));
    UI.set('a-annual', UI.won(r.newAnnual));
    UI.set('b-monthly', UI.won(r.before.monthly));
    UI.set('a-monthly', UI.won(r.after.monthly));
    UI.set('b-ded', UI.won(r.before.totalDeduction));
    UI.set('a-ded', UI.won(r.after.totalDeduction));
    UI.set('b-net', UI.won(r.before.netMonthly));
    UI.set('a-net', UI.won(r.after.netMonthly));
    var ratio = r.monthlyGrossDiff ? Math.round(r.monthlyNetDiff / r.monthlyGrossDiff * 100) : 0;
    UI.set('r-note', r.monthlyGrossDiff > 0 ? '세전 월급이 ' + UI.won(r.monthlyGrossDiff) + ' 늘 때 실수령은 ' + ratio + '%만 늘어납니다.' : '');
    UI.show('result');
  }
  document.getElementById('go').addEventListener('click', run);
})();
