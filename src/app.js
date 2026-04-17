const defaults = {
  gasPrice: 1.70,
  l2Hourly: 1.50,
  chargePower: 3.3,
  evConsumption: 16,
  hybridConsumption: 4.7,
};
const storageKey = 'prius-phev-cost-inputs';
const inputKeys = ['gasPrice', 'l2Hourly', 'chargePower', 'evConsumption', 'hybridConsumption'];

const els = {
  gasPrice: document.getElementById('gasPrice'),
  l2Hourly: document.getElementById('l2Hourly'),
  chargePower: document.getElementById('chargePower'),
  evConsumption: document.getElementById('evConsumption'),
  hybridConsumption: document.getElementById('hybridConsumption'),
  calcBtn: document.getElementById('calcBtn'),
  resetBtn: document.getElementById('resetBtn'),
  verdict: document.getElementById('verdict'),
  pricePerKwh: document.getElementById('pricePerKwh'),
  evCost: document.getElementById('evCost'),
  gasCost: document.getElementById('gasCost'),
  difference: document.getElementById('difference'),
  differenceText: document.getElementById('differenceText'),
  note: document.getElementById('note'),
  evConsumptionLabel: document.getElementById('evConsumptionLabel'),
  hybridConsumptionLabel: document.getElementById('hybridConsumptionLabel'),
};

function currency(value, digits = 2) {
  return `$${Number(value).toFixed(digits)}`;
}

function safeNumber(input) {
  return Number.parseFloat(input.value);
}

function saveInputs() {
  const values = Object.fromEntries(inputKeys.map(key => [key, els[key].value]));
  try {
    localStorage.setItem(storageKey, JSON.stringify(values));
  } catch {
    // Ignore storage failures so the calculator still works normally.
  }
}

function loadSavedInputs() {
  let saved;
  try {
    saved = localStorage.getItem(storageKey);
  } catch {
    return;
  }
  if (!saved) return;

  try {
    const values = JSON.parse(saved);
    inputKeys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        els[key].value = values[key];
      }
    });
  } catch {
    localStorage.removeItem(storageKey);
  }
}

function calculate() {
  const gasPrice = safeNumber(els.gasPrice);
  const l2Hourly = safeNumber(els.l2Hourly);
  const chargePower = safeNumber(els.chargePower);
  const evConsumption = safeNumber(els.evConsumption);
  const hybridConsumption = safeNumber(els.hybridConsumption);

  if ([gasPrice, l2Hourly, chargePower, evConsumption, hybridConsumption].some(v => !Number.isFinite(v) || v <= 0)) {
    els.verdict.className = 'pill bad';
    els.verdict.textContent = '输入无效';
    els.note.textContent = '请确保所有输入都为大于 0 的数字。';
    return;
  }

  const pricePerKwh = l2Hourly / chargePower;
  const evCost = pricePerKwh * evConsumption;
  const gasCost = gasPrice * hybridConsumption;
  const diff = Math.abs(evCost - gasCost);

  els.pricePerKwh.textContent = currency(pricePerKwh);
  els.evCost.textContent = currency(evCost);
  els.gasCost.textContent = currency(gasCost);
  els.difference.textContent = currency(diff);
  els.evConsumptionLabel.textContent = evConsumption.toFixed(1).replace(/\.0$/, '');
  els.hybridConsumptionLabel.textContent = hybridConsumption.toFixed(1).replace(/\.0$/, '');

  if (Math.abs(evCost - gasCost) < 0.05) {
    els.verdict.className = 'pill tie';
    els.verdict.textContent = '两者成本基本持平';
    els.differenceText.textContent = '每 100km 成本差很小';
    els.note.textContent = '当前估算下，公共 L2 充电与直接跑混动基本打平。对 Prius PHEV 来说，这通常意味着公共 L2 更偏向“方便补电”，未必是“省钱方案”。';
  } else if (evCost < gasCost) {
    els.verdict.className = 'pill good';
    els.verdict.textContent = '用电更便宜';
    els.differenceText.textContent = '每 100km 比用油少花';
    els.note.textContent = `按当前输入，纯电成本比混动油费低 ${currency(diff)} / 100km。前提是你能以这个小时费率稳定拿到约 ${chargePower.toFixed(1)} kW 的实际充电功率。`;
  } else {
    els.verdict.className = 'pill bad';
    els.verdict.textContent = '用油更便宜';
    els.differenceText.textContent = '每 100km 比用电少花';
    els.note.textContent = `按当前输入，公共 L2 充电比直接跑混动贵 ${currency(diff)} / 100km。对充电功率只有约 ${chargePower.toFixed(1)} kW 的 Prius PHEV 来说，按小时收费的公共桩经常会出现这种情况。`;
  }
}

function reset() {
  Object.entries(defaults).forEach(([key, value]) => {
    els[key].value = value;
  });
  saveInputs();
  calculate();
}

els.calcBtn.addEventListener('click', calculate);
els.resetBtn.addEventListener('click', reset);

inputKeys.map(key => els[key]).forEach(el => {
  el.addEventListener('input', saveInputs);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') calculate();
  });
});

loadSavedInputs();
calculate();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
      // The app still works without offline support if registration fails.
    });
  });
}
