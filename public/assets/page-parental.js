(function () {
  'use strict';
  function run() {
    var r = Calc.parentalLeave({
      monthlyWage: UI.num('wage'),
      months: Number(UI.val('months')),
      sixPlusSix: document.getElementById('six').checked
    });
    UI.set('r-total', UI.won(r.total));
    var table = document.getElementById('r-rows');
    table.innerHTML = '';
    r.rows.forEach(function (row) {
      var tr = document.createElement('tr');
      var a = document.createElement('td');
      var b = document.createElement('td');
      a.textContent = row.month + '개월 차 (' + Math.round(row.rate * 100) + '%, 상한 ' + (row.cap / 10000) + '만)';
      b.textContent = UI.won(row.pay);
      tr.appendChild(a); tr.appendChild(b); table.appendChild(tr);
    });
    UI.set('r-note', Number(UI.val('months')) > 12 ? '12개월을 넘는 기간은 부모 모두 3개월 이상 사용 등 연장 조건을 채워야 합니다.' : '');
    UI.show('result');
  }
  document.getElementById('go').addEventListener('click', run);
})();
