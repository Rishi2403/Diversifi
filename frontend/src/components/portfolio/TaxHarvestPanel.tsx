function formatINR(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

interface TaxHolding {
  symbol: string;
  name: string;
  is_mf: boolean;
  holding_days: number;
  unrealized_pnl: number;
  estimated_ltcg_tax?: number;
  estimated_stcg_tax?: number;
}

interface HarvestOpp {
  symbol: string;
  name: string;
  unrealized_pnl: number;
  potential_saving: number;
  is_ltcg: boolean;
}

interface TaxData {
  ltcg_holdings: TaxHolding[];
  stcg_holdings: TaxHolding[];
  harvest_opportunities: HarvestOpp[];
  total_ltcg_gain: number;
  total_stcg_gain: number;
  estimated_ltcg_tax: number;
  estimated_stcg_tax: number;
  total_tax_liability: number;
  total_harvestable_loss: number;
  note?: string;
}

interface Props {
  tax: TaxData;
}

export function TaxHarvestPanel({ tax }: Props) {
  const hasTax = tax.total_tax_liability > 0;
  const hasHarvest = tax.harvest_opportunities.length > 0;

  return (
    <div className="space-y-5">
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "LTCG Gains", val: formatINR(tax.total_ltcg_gain), sub: ">1 yr equity", color: "text-emerald-500" },
          { label: "STCG Gains", val: formatINR(tax.total_stcg_gain), sub: "≤1 yr equity", color: "text-yellow-500" },
          { label: "LTCG Tax (est.)", val: formatINR(tax.estimated_ltcg_tax), sub: "12.5% after ₹1.25L exempt", color: "text-orange-400" },
          { label: "STCG Tax (est.)", val: formatINR(tax.estimated_stcg_tax), sub: "20% flat", color: "text-red-400" },
        ].map((item) => (
          <div key={item.label} className="text-center p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
            <p className="text-[10px] text-gray-500 dark:text-white/40 uppercase tracking-widest mb-1">{item.label}</p>
            <p className={`text-lg font-black ${item.color}`}>{item.val}</p>
            <p className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Total liability banner */}
      {hasTax && (
        <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3">
          <div>
            <p className="text-xs font-bold text-orange-400">Estimated Total Tax Liability (FY2025-26)</p>
            <p className="text-[10px] text-gray-500 dark:text-white/40 mt-0.5">LTCG ₹1.25L exemption already applied</p>
          </div>
          <p className="text-xl font-black text-orange-400">{formatINR(tax.total_tax_liability)}</p>
        </div>
      )}

      {/* Tax Loss Harvesting */}
      {hasHarvest && (
        <div>
          <p className="text-xs font-bold text-gray-700 dark:text-white/70 mb-2">
            Tax Loss Harvesting Opportunities
            <span className="ml-2 text-[10px] font-normal text-gray-500 dark:text-white/40">
              Sell these to offset {formatINR(tax.total_harvestable_loss)} in losses
            </span>
          </p>
          <div className="space-y-2">
            {tax.harvest_opportunities.map((opp, i) => (
              <div key={i} className="flex items-center justify-between bg-blue-500/5 border border-blue-500/15 rounded-xl px-4 py-2.5">
                <div>
                  <p className="text-xs font-bold text-gray-800 dark:text-white">{opp.name || opp.symbol}</p>
                  <p className="text-[10px] text-gray-500 dark:text-white/40">
                    {opp.is_ltcg ? "LTCG (>1yr)" : "STCG (≤1yr)"} - Loss: {formatINR(Math.abs(opp.unrealized_pnl))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-blue-400">Save ~{formatINR(opp.potential_saving)}</p>
                  <p className="text-[10px] text-gray-400 dark:text-white/30">tax saving</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasTax && !hasHarvest && (
        <p className="text-xs text-gray-400 dark:text-white/30 text-center py-4">
          No tax liability estimated - holdings may lack buy date or have no gains.
        </p>
      )}

      {tax.note && (
        <p className="text-[10px] text-gray-400 dark:text-white/25 leading-relaxed border-t border-gray-200 dark:border-white/5 pt-3">
          * {tax.note}
        </p>
      )}
    </div>
  );
}
