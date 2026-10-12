/* 화면 공통 도우미: 숫자 입력에 쉼표 넣기, 금액 표시 */
(function () {
  'use strict';

  function won(n) { return Math.round(n).toLocaleString('ko-KR') + '원'; }
  function num(id) {
    var v = document.getElementById(id).value.replace(/[^0-9.]/g, '');
    return v === '' ? 0 : Number(v);
  }
  function val(id) { return document.getElementById(id).value; }
  function set(id, text) { document.getElementById(id).textContent = text; }
  function show(id) { document.getElementById(id).classList.add('show'); }

  // class="money" 입력칸은 입력하는 동안 천 단위 쉼표를 붙인다.
  document.querySelectorAll('input.money').forEach(function (el) {
    el.addEventListener('input', function () {
      var digits = el.value.replace(/[^0-9]/g, '');
      el.value = digits ? Number(digits).toLocaleString('ko-KR') : '';
    });
  });

  // 오늘 날짜 기본값
  document.querySelectorAll('input[data-today]').forEach(function (el) {
    if (!el.value) {
      var d = new Date();
      el.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
  });

  window.UI = { won: won, num: num, val: val, set: set, show: show };
})();
