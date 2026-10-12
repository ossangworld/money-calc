(function () {
  'use strict';
  function run() {
    var r = Calc.annualLeave({ start: UI.val('start'), base: UI.val('base') });
    var pay = Calc.annualLeavePay({ hourly: UI.num('hourly'), unusedDays: UI.num('unused') });
    UI.set('r-label', r.firstYear ? '지금까지 생긴 연차 (1년 미만)' : '올해 연차 (근속 ' + r.years + '년 기준)');
    UI.set('r-days', r.days + '일');
    UI.set('r-tenure', r.years + '년 ' + (r.months % 12) + '개월');
    UI.set('r-pay', UI.won(pay));
    UI.set('r-note', r.firstYear ? '입사 1년이 되는 날 15일이 추가로 생깁니다.' : '');
    UI.show('result');
  }
  document.getElementById('go').addEventListener('click', run);
})();
