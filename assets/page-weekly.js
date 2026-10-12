(function () {
  'use strict';
  function run() {
    var hourly = UI.num('hourly');
    var r = Calc.weeklyHolidayPay({ hourly: hourly, weeklyHours: UI.num('hours') });
    if (!r.eligible) {
      UI.set('r-weekly', '0원');
      UI.set('r-hours', '0시간');
      UI.set('r-monthly', '0원');
      UI.set('r-total', UI.won(UI.num('hours') * 365 / 7 / 12 * hourly));
      UI.set('r-note', '주 15시간 미만이면 주휴수당이 발생하지 않습니다.');
    } else {
      UI.set('r-weekly', UI.won(r.weekly));
      UI.set('r-hours', r.hours + '시간');
      UI.set('r-monthly', UI.won(r.monthly));
      UI.set('r-total', UI.won(r.monthlyWithBase));
      UI.set('r-note', hourly < Calc.RATES.minimumWage ? '입력한 시급이 2026년 최저시급(10,320원)보다 낮습니다.' : '');
    }
    UI.show('result');
  }
  document.getElementById('go').addEventListener('click', run);
})();
