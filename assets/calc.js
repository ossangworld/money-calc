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

  // 부동소수점 오차(27000이 26999.999…가 되는 것) 때문에 아주 작은 값을 더한다
  function floor10(n) { return Math.floor(n / 10 + 1e-9) * 10; }

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


  // 고용보험 사업주 부담 중 고용안정·직업능력개발사업 요율 (기업 규모별)
  var EMPLOYER_EMPLOYMENT_EXTRA = {
    under150: 0.0025,   // 150인 미만
    priority: 0.0045,   // 150인 이상 우선지원대상기업
    under1000: 0.0065,  // 150인 이상 1,000인 미만
    over1000: 0.0085    // 1,000인 이상, 국가·지자체
  };

  /**
   * 4대보험 근로자·사업주 부담. 산재보험은 업종마다 달라 사업주 합계에서 뺀다.
   * opts: { monthly(월 보수, 비과세 제외), companySize }
   */
  function socialInsurance(opts) {
    var m = opts.monthly;
    var pensionBase = Math.min(Math.max(m, RATES.pensionMin), RATES.pensionMax);
    var pension = floor10(pensionBase * RATES.pension);
    var health = floor10(m * RATES.health);
    var care = floor10(health * RATES.longTermCare);
    var employment = floor10(m * RATES.employment);
    var extra = EMPLOYER_EMPLOYMENT_EXTRA[opts.companySize] || EMPLOYER_EMPLOYMENT_EXTRA.under150;
    var employer = {
      pension: pension, health: health, care: care,
      employment: floor10(m * (RATES.employment + extra))
    };
    employer.total = employer.pension + employer.health + employer.care + employer.employment;
    var worker = { pension: pension, health: health, care: care, employment: employment };
    worker.total = pension + health + care + employment;
    return { worker: worker, employer: employer, total: worker.total + employer.total };
  }

  /**
   * 시급, 월급, 연봉 서로 바꾸기. 월 209시간(주 40시간 + 주휴 8시간 기준).
   * opts: { amount, unit: 'hourly'|'monthly'|'annual', monthlyHours }
   */
  function wageConvert(opts) {
    var h = opts.monthlyHours || 209;
    var hourly = opts.unit === 'hourly' ? opts.amount
      : opts.unit === 'monthly' ? opts.amount / h
      : opts.amount / 12 / h;
    return {
      hourly: Math.round(hourly),
      daily: Math.round(hourly * 8),
      monthly: Math.round(hourly * h),
      annual: Math.round(hourly * h * 12),
      belowMinimum: hourly < RATES.minimumWage - 0.5
    };
  }

  // 6+6 부모육아휴직제 첫 6개월 월 상한 (부모 각각)
  var SIX_PLUS_SIX_CAPS = [2500000, 2500000, 3000000, 3500000, 4000000, 4500000];

  /**
   * 육아휴직급여. 2025년 개편 기준(사후지급금 폐지).
   * 1~3개월 100%(상한 250만), 4~6개월 100%(상한 200만), 7개월~ 80%(상한 160만), 하한 70만.
   * opts: { monthlyWage(월 통상임금), months, sixPlusSix(부모 모두 사용) }
   */
  function parentalLeave(opts) {
    var w = opts.monthlyWage, rows = [], total = 0;
    for (var i = 1; i <= opts.months; i++) {
      var rate, cap;
      if (opts.sixPlusSix && i <= 6) { rate = 1; cap = SIX_PLUS_SIX_CAPS[i - 1]; }
      else if (i <= 3) { rate = 1; cap = 2500000; }
      else if (i <= 6) { rate = 1; cap = 2000000; }
      else { rate = 0.8; cap = 1600000; }
      var pay = Math.max(Math.min(w * rate, cap), 700000);
      pay = floor10(pay);
      rows.push({ month: i, rate: rate, cap: cap, pay: pay });
      total += pay;
    }
    return { rows: rows, total: total };
  }


  /**
   * 대출 상환. method: 'equal'(원리금균등), 'principal'(원금균등), 'bullet'(만기일시)
   * opts: { principal, annualRate(%), months, method }
   */
  function loan(opts) {
    var P = opts.principal, n = opts.months, r = opts.annualRate / 100 / 12;
    var rows = [], balance = P, totalInterest = 0;
    var fixed = r === 0 ? P / n : P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    for (var i = 1; i <= n; i++) {
      var interest = balance * r, principalPart;
      if (opts.method === 'principal') principalPart = P / n;
      else if (opts.method === 'bullet') principalPart = i === n ? balance : 0;
      else principalPart = fixed - interest;
      if (i === n) principalPart = balance;
      balance -= principalPart;
      totalInterest += interest;
      rows.push({ month: i, payment: Math.round(principalPart + interest), principal: Math.round(principalPart), interest: Math.round(interest), balance: Math.max(0, Math.round(balance)) });
    }
    return { rows: rows, firstPayment: rows[0].payment, totalInterest: Math.round(totalInterest), totalPayment: Math.round(P + totalInterest) };
  }

  /**
   * 퇴직소득세 (2023년 이후 기준, 지방소득세 포함).
   * opts: { amount(퇴직금), start, end(퇴직일) } 근속연수는 1년 미만 끝수를 1년으로 본다.
   */
  function retirementTax(opts) {
    var days = daysBetween(parseDate(opts.start), parseDate(opts.end));
    var months = Math.ceil(days / 365.25 * 12 - 1e-9);
    var years = Math.max(1, Math.ceil(months / 12));
    var amount = opts.amount;
    var serviceDeduction =
      years <= 5 ? 1000000 * years :
      years <= 10 ? 5000000 + 2000000 * (years - 5) :
      years <= 20 ? 15000000 + 2500000 * (years - 10) :
      40000000 + 3000000 * (years - 20);
    serviceDeduction = Math.min(serviceDeduction, amount);
    var converted = (amount - serviceDeduction) * 12 / years;
    var convDeduction =
      converted <= 8000000 ? converted :
      converted <= 70000000 ? 8000000 + (converted - 8000000) * 0.6 :
      converted <= 100000000 ? 45200000 + (converted - 70000000) * 0.55 :
      converted <= 300000000 ? 61700000 + (converted - 100000000) * 0.45 :
      151700000 + (converted - 300000000) * 0.35;
    var base = Math.max(0, converted - convDeduction);
    var tax = Math.floor(progressiveTax(base) * years / 12);
    var local = Math.floor(tax * 0.1);
    return {
      years: years, serviceDeduction: serviceDeduction, converted: Math.round(converted),
      convDeduction: Math.round(convDeduction), base: Math.round(base),
      tax: tax, localTax: local, totalTax: tax + local, net: amount - tax - local,
      effectiveRate: amount > 0 ? (tax + local) / amount : 0
    };
  }

  /**
   * 연봉 인상 전후 실수령 비교.
   * opts: { annual, raisePercent, nonTaxableMonthly, dependents, children }
   */
  function salaryRaise(opts) {
    var after = Math.round(opts.annual * (1 + opts.raisePercent / 100));
    var base = { nonTaxableMonthly: opts.nonTaxableMonthly, dependents: opts.dependents, children: opts.children };
    var before = netSalary(Object.assign({ annual: opts.annual }, base));
    var afterNet = netSalary(Object.assign({ annual: after }, base));
    return {
      newAnnual: after, before: before, after: afterNet,
      monthlyGrossDiff: afterNet.monthly - before.monthly,
      monthlyNetDiff: afterNet.netMonthly - before.netMonthly
    };
  }

  var Calc = {
    RATES: RATES,
    netSalary: netSalary,
    severance: severance,
    weeklyHolidayPay: weeklyHolidayPay,
    unemployment: unemployment,
    annualLeave: annualLeave,
    annualLeavePay: annualLeavePay,
    socialInsurance: socialInsurance,
    wageConvert: wageConvert,
    parentalLeave: parentalLeave,
    loan: loan,
    retirementTax: retirementTax,
    salaryRaise: salaryRaise,
    _internal: { earnedIncomeDeduction: earnedIncomeDeduction, progressiveTax: progressiveTax }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Calc;
  else root.Calc = Calc;
})(this);
