(function () {
  'use strict';
  function run() {
    var r = Calc.unemployment({
      monthlyPay: UI.num('pay'),
      dailyHours: UI.num('daily'),
      age: UI.num('age'),
      insuredYears: Number(UI.val('years')),
      disabled: document.getElementById('disabled').checked
    });
    UI.set('r-total', UI.won(r.total));
    UI.set('r-avg', UI.won(r.avgDaily));
    UI.set('r-daily', UI.won(r.daily));
    UI.set('r-days', r.days + '일');
    UI.set('r-month', UI.won(r.daily * 30));
    UI.set('r-note', r.rule === 'max' ? '평균임금의 60%가 상한액을 넘어 상한액 68,100원이 적용됐습니다.'
      : r.rule === 'min' ? '평균임금의 60%가 하한액보다 낮아 하한액 ' + UI.won(r.min) + '이 적용됐습니다.' : '');
    UI.show('result');
  }
  document.getElementById('go').addEventListener('click', run);
})();
