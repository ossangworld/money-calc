(function () {
  'use strict';
  function run() {
    var r = Calc.severance({
      start: UI.val('start'),
      end: UI.val('end'),
      monthlyPay: UI.num('pay'),
      annualBonus: UI.num('bonus'),
      annualLeavePay: UI.num('leave')
    });
    UI.set('r-amount', UI.won(r.amount));
    UI.set('r-days', r.workDays.toLocaleString('ko-KR') + '일');
    UI.set('r-period', r.periodDays + '일');
    UI.set('r-avg', UI.won(r.avgDaily));
    UI.set('r-note', r.workDays <= 0 ? '퇴직일이 입사일보다 뒤여야 합니다.'
      : r.eligible ? '' : '재직기간이 1년 미만이라 법정 퇴직금 대상이 아닙니다.');
    UI.show('result');
  }
  document.getElementById('go').addEventListener('click', run);
})();
