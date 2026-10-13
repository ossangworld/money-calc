(function () {
  'use strict';
  function run() {
    var method = UI.val('method');
    var r = Calc.loan({
      principal: UI.num('principal'),
      annualRate: UI.num('rate'),
      months: Math.max(1, Math.round(UI.num('years') * 12)),
      method: method
    });
    UI.set('r-label', method === 'equal' ? '매달 상환액' : '첫 달 상환액');
    UI.set('r-first', UI.won(r.firstPayment));
    UI.set('r-interest', UI.won(r.totalInterest));
    UI.set('r-total', UI.won(r.totalPayment));
    var table = document.getElementById('r-rows');
    table.innerHTML = '<tr><td>회차</td><td>상환액</td><td>이자</td><td>남은 원금</td></tr>';
    r.rows.slice(0, 12).forEach(function (row) {
      var tr = document.createElement('tr');
      [row.month + '회', UI.won(row.payment), UI.won(row.interest), UI.won(row.balance)].forEach(function (t) {
        var td = document.createElement('td'); td.textContent = t; tr.appendChild(td);
      });
      table.appendChild(tr);
    });
    UI.show('result');
  }
  document.getElementById('go').addEventListener('click', run);
})();
