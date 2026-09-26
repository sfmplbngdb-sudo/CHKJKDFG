import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  FileDown,
  CheckCircle2,
  Clock,
  Send,
  Building,
  ArrowRight,
  Filter
} from 'lucide-react';
import { AccountRecord } from '../types';
import { useTMSStore } from '../store/useTMSStore';
import { ThemeStyles } from '../utils/theme';
import { fmtCurrency, fmtNum, fmtDate, exportToExcel } from '../utils/formatters';

interface AccountViewProps {
  store: ReturnType<typeof useTMSStore>;
  themeStyles: ThemeStyles;
}

export const AccountView: React.FC<AccountViewProps> = ({ store, themeStyles }) => {
  const { accounts, brokers } = store.state;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'BAL_PENDING' | 'COMPLETED'>('ALL');

  // Payout Modals
  const [activeAccount, setActiveAccount] = useState<AccountRecord | null>(null);
  const [payModalType, setPayModalType] = useState<'ADVANCE' | 'BALANCE' | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [txnId, setTxnId] = useState<string>('');

  const handleOpenPay = (acct: AccountRecord, type: 'ADVANCE' | 'BALANCE') => {
    setActiveAccount(acct);
    setPayModalType(type);
    if (type === 'ADVANCE') {
      setPayoutAmount(acct.advance_amount - acct.adv_paid_amount);
      setTxnId(`NEFT-${Math.floor(100000 + Math.random() * 900000)}`);
    } else {
      setPayoutAmount(acct.balance_amount - acct.bal_paid_amount);
      setTxnId(`RTGS-${Math.floor(100000 + Math.random() * 900000)}`);
    }
  };

  const handleConfirmPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount || !payModalType) return;

    if (payModalType === 'ADVANCE') {
      store.saveAdvancePayment(activeAccount.mf_no, payoutAmount, txnId);
    } else {
      store.saveBalancePayment(activeAccount.mf_no, payoutAmount, txnId);
    }

    setPayModalType(null);
    setActiveAccount(null);
  };

  const filtered = accounts.filter(a => {
    const matchesSearch =
      (a.mf_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.lorry_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.broker_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.adv_txn_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.bal_txn_id || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || a.overall_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalAdvanceDue = accounts.reduce((s, a) => s + (a.advance_amount - a.adv_paid_amount), 0);
  const totalBalanceDue = accounts.reduce((s, a) => s + (a.balance_amount - a.bal_paid_amount), 0);
  const totalPaidOut = accounts.reduce((s, a) => s + a.adv_paid_amount + a.bal_paid_amount, 0);

  return (
    <div className="space-y-6 p-4 lg:p-8 max-w-7xl mx-auto">
      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <div className="text-xs text-slate-400">Pending Advances Due</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
            {fmtCurrency(totalAdvanceDue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {accounts.filter(a => a.adv_status === 'PENDING').length} Unpaid advances
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <div className="text-xs text-slate-400">Pending Balances Due</div>
          <div className="text-xl font-bold font-mono text-purple-400 mt-1 tabular-nums">
            {fmtCurrency(totalBalanceDue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {accounts.filter(a => a.bal_status === 'PENDING' && a.adv_status === 'ADV_PAID').length} Final settlements awaiting release
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <div className="text-xs text-slate-400">Total Settled Bank Disbursements</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            {fmtCurrency(totalPaidOut)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {accounts.filter(a => a.overall_status === 'COMPLETED').length} Fully cleared trips
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search MF #, lorry, broker, Txn ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full rounded-lg pl-9 pr-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder} focus:outline-none`}
            />
          </div>

          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/5 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({accounts.length})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'PENDING' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Adv Pending
            </button>
            <button
              onClick={() => setStatusFilter('BAL_PENDING')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'BAL_PENDING' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bal Pending
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'COMPLETED' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        <button
          onClick={() => exportToExcel(filtered, 'SFMPL_Account_Disbursements')}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
        >
          <FileDown className="h-3.5 w-3.5" />
          <span>Export Balance Sheet</span>
        </button>
      </div>

      {/* Account Records Table */}
      <div className={`rounded-xl border overflow-hidden ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                <th className="py-3 px-4 font-semibold">MF & LORRY</th>
                <th className="py-3 px-4 font-semibold">BROKER & BANK A/C</th>
                <th className="py-3 px-4 font-semibold text-right">ADVANCE DETAILS</th>
                <th className="py-3 px-4 font-semibold text-right">BALANCE DETAILS</th>
                <th className="py-3 px-4 font-semibold text-center">OVERALL STATUS</th>
                <th className="py-3 px-4 font-semibold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <CreditCard className="h-8 w-8 mx-auto opacity-40 mb-2" />
                    <p className="text-sm font-medium">No account ledger entries found</p>
                    <p className="text-xs text-slate-500 mt-1">Generating Money Freight automatically creates ledger payout items</p>
                  </td>
                </tr>
              ) : (
                filtered.map(a => (
                  <tr key={a.id} className={themeStyles.tableRowHover}>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-100">{a.mf_no}</div>
                      <div className="font-semibold text-slate-200 mt-0.5">{a.lorry_no}</div>
                      <div className="text-[10px] text-blue-400 font-mono">{a.so_number}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{a.broker_name || 'Direct Broker'}</div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        Adv A/C: {a.adv_acc_no || '—'} ({a.adv_ifsc || ''})
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        Bal A/C: {a.bal_acc_no || a.adv_acc_no || '—'} ({a.bal_ifsc || a.adv_ifsc || ''})
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <div className="font-bold text-slate-100">{fmtCurrency(a.advance_amount)}</div>
                      {a.adv_status === 'ADV_PAID' ? (
                        <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                          ✓ Paid: {a.adv_txn_id}
                        </div>
                      ) : (
                        <span className="text-[10px] text-amber-400">Pending Authorization</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <div className="font-bold text-slate-100">{fmtCurrency(a.balance_amount)}</div>
                      {a.bal_status === 'BAL_PAID' ? (
                        <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                          ✓ Settled: {a.bal_txn_id}
                        </div>
                      ) : (
                        <span className="text-[10px] text-purple-400">Pending Settlement</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold ${
                        a.overall_status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : a.overall_status === 'BAL_PENDING'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {a.overall_status}
                      </span>
                      {a.settlement_date && (
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          {fmtDate(a.settlement_date)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {a.adv_status === 'PENDING' && (
                          <button
                            onClick={() => handleOpenPay(a, 'ADVANCE')}
                            className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium text-[11px] inline-flex items-center gap-1 transition-colors"
                          >
                            <Send className="h-3 w-3" />
                            <span>Pay Adv</span>
                          </button>
                        )}
                        {a.adv_status === 'ADV_PAID' && a.bal_status === 'PENDING' && (
                          <button
                            onClick={() => handleOpenPay(a, 'BALANCE')}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] inline-flex items-center gap-1 transition-colors"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Settle Bal</span>
                          </button>
                        )}
                        {a.overall_status === 'COMPLETED' && (
                          <span className="text-xs text-slate-400 font-mono">Cleared ✓</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout Modal */}
      {payModalType && activeAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${themeStyles.cardBg} ${themeStyles.cardBorder} my-8`}>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-400" />
                <h3 className={`text-base font-bold ${themeStyles.textPrimary}`}>
                  Record {payModalType === 'ADVANCE' ? 'Advance Payment' : 'Final Balance Settlement'}
                </h3>
              </div>
              <button
                onClick={() => setPayModalType(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPayout} className="mt-5 space-y-4">
              <div className="p-3 rounded-lg border border-white/5 bg-black/20 text-xs space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Manifest No:</span>
                  <span className="font-mono font-bold text-slate-100">{activeAccount.mf_no}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Vehicle Registration:</span>
                  <span className="font-bold text-slate-100">{activeAccount.lorry_no}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Bank Account Target:</span>
                  <span className="font-mono text-blue-400">
                    {payModalType === 'ADVANCE'
                      ? `${activeAccount.adv_acc_no} (${activeAccount.adv_ifsc})`
                      : `${activeAccount.bal_acc_no || activeAccount.adv_acc_no} (${activeAccount.bal_ifsc || activeAccount.adv_ifsc})`}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="1"
                  value={payoutAmount}
                  onChange={e => setPayoutAmount(parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Bank Reference / UTR / Transaction ID *
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC-NEFT-883910"
                  value={txnId}
                  onChange={e => setTxnId(e.target.value.toUpperCase())}
                  className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setPayModalType(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-xs ${
                    payModalType === 'ADVANCE' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  Confirm Bank Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
