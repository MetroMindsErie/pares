import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  );

/**
 * Mortgage payment estimator + PA realty transfer tax breakdown.
 * Defaults are tuned for the Erie / Warren / Crawford county market.
 */
const MortgageCalculator = ({ listPrice = 0, annualTax = null }) => {
  const [price, setPrice] = useState(listPrice > 0 ? listPrice : 250000);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(6.5);
  const [years, setYears] = useState(30);
  // PA transfer tax: 1% state + local rate (1% in most Erie-area municipalities).
  const [localTransferPct, setLocalTransferPct] = useState(1);

  const results = useMemo(() => {
    const p = Math.max(0, Number(price) || 0);
    const down = p * (Math.min(100, Math.max(0, Number(downPct) || 0)) / 100);
    const principal = p - down;
    const monthlyRate = (Math.max(0, Number(rate) || 0) / 100) / 12;
    const n = Math.max(1, Number(years) || 30) * 12;

    const monthlyPI =
      monthlyRate > 0
        ? (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
        : principal / n;

    // Property tax: use the listing's real figure when available, else Erie-area effective ~1.8%.
    const monthlyTax = (annualTax && annualTax > 0 ? annualTax : p * 0.018) / 12;
    const monthlyInsurance = 1200 / 12; // typical PA homeowners policy ballpark

    const transferTotal = p * ((1 + (Number(localTransferPct) || 0)) / 100);

    return {
      down,
      principal,
      monthlyPI,
      monthlyTax,
      monthlyInsurance,
      monthlyTotal: monthlyPI + monthlyTax + monthlyInsurance,
      transferTotal,
      transferHalf: transferTotal / 2,
    };
  }, [price, downPct, rate, years, localTransferPct, annualTax]);

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-8">
      <h2 className="text-xl font-semibold mb-1 text-gray-900">Payment Calculator</h2>
      <p className="text-sm text-gray-500 mb-4">Estimate your monthly payment and PA transfer tax for this home.</p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <label className="block col-span-2 sm:col-span-1">
          <span className="text-xs font-medium text-gray-600">Home price</span>
          <input type="number" min="0" step="1000" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Down payment %</span>
          <input type="number" min="0" max="100" step="1" value={downPct} onChange={(e) => setDownPct(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Rate %</span>
          <input type="number" min="0" max="20" step="0.125" value={rate} onChange={(e) => setRate(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Term</span>
          <select value={years} onChange={(e) => setYears(Number(e.target.value))} className={inputCls}>
            <option value={30}>30 yr</option>
            <option value={20}>20 yr</option>
            <option value={15}>15 yr</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Local transfer tax %</span>
          <input type="number" min="0" max="5" step="0.5" value={localTransferPct} onChange={(e) => setLocalTransferPct(e.target.value)} className={inputCls} />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-teal-50 border border-teal-100 rounded-lg p-4">
          <p className="text-sm text-gray-600">Estimated monthly payment</p>
          <p className="text-3xl font-bold text-teal-700">{fmt(results.monthlyTotal)}<span className="text-base font-medium text-gray-500">/mo</span></p>
          <ul className="mt-3 space-y-1 text-sm text-gray-600">
            <li className="flex justify-between"><span>Principal &amp; interest</span><span>{fmt(results.monthlyPI)}</span></li>
            <li className="flex justify-between">
              <span>Property tax{annualTax > 0 ? '' : ' (est.)'}</span>
              <span>{fmt(results.monthlyTax)}</span>
            </li>
            <li className="flex justify-between"><span>Home insurance (est.)</span><span>{fmt(results.monthlyInsurance)}</span></li>
            <li className="flex justify-between border-t border-teal-100 pt-1 mt-1"><span>Down payment</span><span>{fmt(results.down)}</span></li>
          </ul>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">PA realty transfer tax (1% state + {localTransferPct || 0}% local)</p>
          <p className="text-3xl font-bold text-slate-700">{fmt(results.transferTotal)}</p>
          <ul className="mt-3 space-y-1 text-sm text-gray-600">
            <li className="flex justify-between"><span>Customary buyer half</span><span>{fmt(results.transferHalf)}</span></li>
            <li className="flex justify-between"><span>Customary seller half</span><span>{fmt(results.transferHalf)}</span></li>
          </ul>
          <p className="mt-3 text-xs text-gray-400">
            Estimates only — rates, taxes, and insurance vary. Local transfer tax differs by municipality; ask John to confirm for this property.
          </p>
        </div>
      </div>
    </div>
  );
};

MortgageCalculator.propTypes = {
  listPrice: PropTypes.number,
  annualTax: PropTypes.number,
};

export default MortgageCalculator;
