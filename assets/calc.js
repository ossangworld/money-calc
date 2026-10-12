/* 계산 로직 모음. 화면 코드와 분리해 두어 node에서도 테스트할 수 있다. */
(function (root) {
  'use strict';

  // 2026년 기준값. 매년 1월, 7월(국민연금 상하한)에 확인해서 바꾼다.
  var RATES = {
    year: 2026,
    pension: 0.0475,            // 국민연금 근로자 부담 (총 9.5%)
    pensionMin: 410000,         // 기준소득월액 하한 (2026.7~2027.6)
    pensionMax: 6590000,        // 기준소득월액 상한 (2026.7~2027.6)
    health: 0.03595,            // 건강보험 근로자 부담 (총 7.19%)
    longTermCare: 0.9448 / 7.19, // 장기요양 = 건강보험료 x 13.14%
    employment: 0.009,          // 고용보험 근로자 부담
    minimumWage: 10320,         // 최저시급
    ubMax: 68100,               // 구직급여 1일 상한
    ubMinRatio: 0.8             // 구직급여 1일 하한 = 최저시급 x 80% x 소정근로시간
  };

  var TAX_BRACKETS = [
    [14000000, 0.06], [50000000, 0.15], [88000000, 0.24], [150000000, 0.35],
    [300000000, 0.38], [500000000, 0.40], [1000000000, 0.42], [Infinity, 0.45]
  ];

  function floor10(n) { return Math.floor(n / 10) * 10; }

  function earnedIncomeDeduction(gross) {
    var d;
    if (gross <= 5000000) d = gross * 0.7;
    else if (gross <= 15000000) d = 3500000 + (gross - 5000000) * 0.4;
    else if (gross <= 45000000) d = 7500000 + (gross - 15000000) * 0.15;
    else if (gross <= 100000000) d = 12000000 + (gross - 45000000) * 0.05;
    else d = 14750000 + (gross - 100000000) * 0.02;
    return Math.min(d, 20000000);
  }

  function progressiveTax(base) {
    var tax = 0, prev = 0;
    for (var i = 0; i < TAX_BRACKETS.length; i++) {
      var cap = TAX_BRACKETS[i][0], rate = TAX_BRACKETS[i][1];
      if (base <= prev) break;
      tax += (Math.min(base, cap) - prev) * rate;
      prev = cap;
    }
    return tax;
  }

  function earnedIncomeTaxCredit(calculated, gross) {
    var credit = calculated <= 1300000 ? calculated * 0.55 : 715000 + (calculated - 1300000) * 0.3;
    var limit;
    if (gross <= 33000000) limit = 740000;
    else if (gross <= 70000000) limit = Math.max(740000 - (gross - 33000000) * 0.008, 660000);
    else if (gross <= 120000000) limit = Math.max(660000 - (gross - 70000000) * 0.5, 500000);
    else limit = Math.max(500000 - (gross - 120000000) * 0.5, 200000);
    return Math.min(credit, limit);
  }

  function childTaxCredit(children) {
    if (children <= 0) return 0;
    if (children === 1) return 250000;
    if (children === 2) return 550000;
    return 550000 + (children - 2) * 400000;
  }

  /**
   * 연봉 실수령액. 소득세는 연간 결정세액을 12로 나눈 추정치다.
   * opts: { annual, nonTaxableMonthly, dependents(본인 포함), children(8세 이상 20세 이하) }
   */
  function netSalary(opts) {
    var annual = opts.annual;
    var nonTax = Math.min(opts.nonTaxableMonthly || 0, annual / 12);
    var dependents = Math.max(1, opts.dependents || 1);
    var children = Math.max(0, opts.children || 0);

    var monthly = annual / 12;
    var taxableMonthly = monthly - nonTax;

    var pensionBase = Math.min(Math.max(taxableMonthly, RATES.pensionMin), RATES.pensionMax);
    var pension = floor10(pensionBase * RATES.pension);
    var health = floor10(taxableMonthly * RATES.health);
    var care = floor10(health * RATES.longTermCare);
    var employment = floor10(taxableMonthly * RATES.employment);

    var gross = taxableMonthly * 12;
    var earnedIncome = gross - earnedIncomeDeduction(gross);
    var deductions = 1500000 * dependents + pension * 12 + (health + care + employment) * 12;
    var taxBase = Math.max(0, earnedIncome - deductions);
    var calculated = progressiveTax(taxBase);
    var decided = calculated - earnedIncomeTaxCredit(calculated, gross) - childTaxCredit(children) - 130000;
    decided = Math.max(0, decided);

    var incomeTax = floor10(decided / 12);
    var localTax = floor10(incomeTax * 0.1);
    var totalDeduction = pension + health + care + employment + incomeTax + localTax;

    return {
      monthly: Math.round(monthly),
      pension: pension, health: health, care: care, employment: employment,
      incomeTax: incomeTax, localTax: localTax,
      totalDeduction: totalDeduction,
      netMonthly: Math.round(monthly - totalDeduction),
      netAnnual: Math.round(monthly - totalDeduction) * 12
    };
  }

  function daysBetween(a, b) {
    return Math.round((b - a) / 86400000);
  }

  function parseDate(s) {
    var p = String(s).split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  }

  /**
   * 퇴직금. 평균임금 = (퇴직 전 3개월 임금 + 연간상여 x 3/12 + 연차수당 x 3/12) / 3개월 일수
   * opts: { start, end (마지막 근무일 다음 날 = 퇴직일), monthlyPay, annualBonus, annualLeavePay }
   */
  function severance(opts) {
    var start = parseDate(opts.start), end = parseDate(opts.end);
    var workDays = daysBetween(start, end);
    var threeMonthsAgo = new Date(end.getTime());
    threeMonthsAgo.setUTCMonth(threeMonthsAgo.getUTCMonth() - 3);
    var periodDays = daysBetween(threeMonthsAgo, end);
    var wages = opts.monthlyPay * 3 + (opts.annualBonus || 0) * 3 / 12 + (opts.annualLeavePay || 0) * 3 / 12;
    var avgDaily = wages / periodDays;
    var eligible = workDays >= 365;
    return {
      workDays: workDays,
      periodDays: periodDays,
      avgDaily: Math.round(avgDaily),
      eligible: eligible,
      amount: eligible ? Math.round(avgDaily * 30 * workDays / 365) : 0
    };
  }

  /**
   * 주휴수당. 주 15시간 이상, 소정근로일 개근 시 발생. 주 40시간을 넘는 부분은 반영하지 않는다.
   * opts: { hourly, weeklyHours }
   */
  function weeklyHolidayPay(opts) {
    var hours = opts.weeklyHours;
    if (hours < 15) return { eligible: false, hours: 0, weekly: 0, monthly: 0 };
    var holidayHours = Math.min(hours, 40) / 40 * 8;
    var weekly = Math.round(holidayHours * opts.hourly);
    var weeksPerMonth = 365 / 7 / 12; // 약 4.345주
    return {
      eligible: true,
      hours: Math.round(holidayHours * 100) / 100,
      weekly: weekly,
      monthly: Math.round(weekly * weeksPerMonth),
      // 월 소정근로시간은 관례대로 시간 단위로 반올림 (주 40시간이면 209시간)
      monthlyHours: Math.round((hours + holidayHours) * weeksPerMonth),
      monthlyWithBase: Math.round(Math.round((hours + holidayHours) * weeksPerMonth) * opts.hourly)
    };
  }

  var UB_DAYS = {
    // 고용보험 가입기간: 1년 미만, 1~3년, 3~5년, 5~10년, 10년 이상
    under50: [120, 150, 180, 210, 240],
    over50: [120, 180, 210, 240, 270]
  };

  /**
   * 실업급여(구직급여).
   * opts: { monthlyPay(퇴직 전 3개월 평균 월급), dailyHours(1일 소정근로시간), age, insuredYears, disabled }
   */
  function unemployment(opts) {
    var avgDaily = opts.monthlyPay * 3 / 91; // 3개월 = 약 91일
    var hours = Math.min(Math.max(opts.dailyHours || 8, 1), 8);
    var min = RATES.minimumWage * RATES.ubMinRatio * hours;
    var max = RATES.ubMax;
    var daily = avgDaily * 0.6;
    var appliedRule = 'rate';
    if (daily > max) { daily = max; appliedRule = 'max'; }
    if (daily < min) { daily = min; appliedRule = 'min'; }
    var y = opts.insuredYears, idx = y < 1 ? 0 : y < 3 ? 1 : y < 5 ? 2 : y < 10 ? 3 : 4;
    var table = (opts.age >= 50 || opts.disabled) ? UB_DAYS.over50 : UB_DAYS.under50;
    var days = table[idx];
    daily = Math.floor(daily);
    return { avgDaily: Math.round(avgDaily), daily: daily, days: days, total: daily * days, rule: appliedRule, min: Math.floor(min), max: max };
  }

  /**
   * 연차 일수. 입사 1년 미만은 개근한 달마다 1일(최대 11일),
   * 1년 이상은 15일에 3년차부터 2년마다 1일 가산(최대 25일).
   * opts: { start, base(기준일) }
   */
  function annualLeave(opts) {
    var start = parseDate(opts.start), base = parseDate(opts.base);
    var months = (base.getUTCFullYear() - start.getUTCFullYear()) * 12 + (base.getUTCMonth() - start.getUTCMonth());
    if (base.getUTCDate() < start.getUTCDate()) months -= 1;
    months = Math.max(0, months);
    var years = Math.floor(months / 12);
    if (years < 1) return { years: 0, months: months, days: Math.min(months, 11), firstYear: true };
    var extra = Math.floor((years - 1) / 2);
    return { years: years, months: months, days: Math.min(15 + extra, 25), firstYear: false };
  }

  function annualLeavePay(opts) {
    // opts: { hourly, unusedDays, dailyHours }
    return Math.round(opts.hourly * (opts.dailyHours || 8) * opts.unusedDays);
  }

  var Calc = {
    RATES: RATES,
    netSalary: netSalary,
    severance: severance,
    weeklyHolidayPay: weeklyHolidayPay,
    unemployment: unemployment,
    annualLeave: annualLeave,
    annualLeavePay: annualLeavePay,
    _internal: { earnedIncomeDeduction: earnedIncomeDeduction, progressiveTax: progressiveTax }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Calc;
  else root.Calc = Calc;
})(this);
