(function () {
  'use strict';
  function run() {
    var r = Calc.wageConvert({ amount: UI.num('amount'), unit: UI.val('unit'), monthlyHours: UI.num('hours') || 209 });
    UI.set('r-hourly', UI.won(r.hourly));
    UI.set('r-daily', UI.won(r.daily));
    UI.set('r-monthly', UI.won(r.monthly));
    UI.set('r-annual', UI.won(r.annual));
    UI.set('r-note', r.belowMinimum ? '환산 시급이 2026년 최저임금(10,320원)보다 낮습니다.' : '2026년 최저임금(10,320원) 이상입니다.');
    UI.show('result');
  }
  document.getElementById('go').addEventListener('click', run);
})();
