import React, { useState } from 'react';
import {
  Plus,
  Search,
  FileDown,
  Trash2,
  Edit2,
  Building2,
  MapPin,
  Users,
  Fuel,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Lock,
  Shield
} from 'lucide-react';
import { Party, Place, Broker, Card, User } from '../types';
import { useTMSStore } from '../store/useTMSStore';
import { ThemeStyles } from '../utils/theme';
import { fmtDate, exportToExcel } from '../utils/formatters';
import { canEditRecord, canDeleteRecord, canManageUsers } from '../utils/permissions';

interface MastersViewProps {
  store: ReturnType<typeof useTMSStore>;
  themeStyles: ThemeStyles;
  subType: 'parties' | 'places' | 'brokers' | 'cards' | 'users';
}

export const MastersView: React.FC<MastersViewProps> = ({ store, themeStyles, subType }) => {
  const { parties, places, brokers, cards, users, currentUser } = store.state;
  const isSuperAdmin = canManageUsers(currentUser);
  const canEdit = canEditRecord(currentUser);
  const canDelete = canDeleteRecord(currentUser);

  const [searchTerm, setSearchTerm] = useState('');
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form states for each master type
  const [partyForm, setPartyForm] = useState<Partial<Party>>({ party_name: '', contact: '', gst: '', status: 'ACTIVE' });
  const [placeForm, setPlaceForm] = useState<Partial<Place>>({ place_name: '', state_code: '' });
  const [brokerForm, setBrokerForm] = useState<Partial<Broker>>({
    broker_name: '',
    primary_acc_no: '',
    ifsc: '',
    secondary_acc_no: '',
    secondary_ifsc: '',
    contact_no: '',
    status: 'ACTIVE'
  });
  const [cardForm, setCardForm] = useState<Partial<Card>>({ card_display: '' });
  const [userForm, setUserForm] = useState<Partial<User>>({ username: '', password: '', display_name: '', role: 'USER', status: 'ACTIVE' });

  const handleOpenCreate = () => {
    setEditingItem(null);
    if (subType === 'parties') setPartyForm({ party_name: '', contact: '', gst: '', status: 'ACTIVE' });
    if (subType === 'places') setPlaceForm({ place_name: '', state_code: '' });
    if (subType === 'brokers') {
      setBrokerForm({
        broker_name: '',
        primary_acc_no: '',
        ifsc: '',
        secondary_acc_no: '',
        secondary_ifsc: '',
        contact_no: '',
        status: 'ACTIVE'
      });
    }
    if (subType === 'cards') setCardForm({ card_display: '' });
    if (subType === 'users') setUserForm({ username: '', password: '', display_name: '', role: 'ADMIN', status: 'ACTIVE' });
    setIsOpenModal(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    if (subType === 'parties') setPartyForm({ ...item });
    if (subType === 'places') setPlaceForm({ ...item });
    if (subType === 'brokers') setBrokerForm({ ...item });
    if (subType === 'cards') setCardForm({ ...item });
    if (subType === 'users') setUserForm({ ...item, password: '' });
    setIsOpenModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (subType === 'parties') store.saveParty({ ...partyForm, id: editingItem?.id });
    if (subType === 'places') store.savePlace({ ...placeForm, id: editingItem?.id });
    if (subType === 'brokers') store.saveBroker({ ...brokerForm, id: editingItem?.id });
    if (subType === 'cards') store.saveCard({ ...cardForm, id: editingItem?.id });
    if (subType === 'users') store.saveUser({ ...userForm, id: editingItem?.id });
    setIsOpenModal(false);
  };

  return (
    <div className="space-y-6 p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Superadmin restricted notice for Users tab */}
      {subType === 'users' && !isSuperAdmin && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>User Management Notice:</strong> Only Superadmin (<strong>SFMPL</strong>) has privileges to add or edit users. Active role: <code className="bg-amber-500/20 px-1 py-0.5 rounded">{currentUser.role}</code>.
            </span>
          </div>
        </div>
      )}

      {/* Control bar */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${subType}...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`w-full rounded-lg pl-9 pr-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder} focus:outline-none`}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const data =
                subType === 'parties' ? parties :
                subType === 'places' ? places :
                subType === 'brokers' ? brokers :
                subType === 'cards' ? cards : users;
              exportToExcel(data, `SFMPL_${subType}`);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>
          
          {/* Add button - for users tab, restricted to Superadmin; for others, both Superadmin and Admin can add */}
          {(subType !== 'users' || isSuperAdmin) && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span className="capitalize">Add {subType.slice(0, -1)}</span>
            </button>
          )}
        </div>
      </div>

      {/* Table based on master type */}
      <div className={`rounded-xl border overflow-hidden ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
        <div className="overflow-x-auto">
          {subType === 'parties' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                  <th className="py-3 px-4 font-semibold">PARTY / CLIENT NAME</th>
                  <th className="py-3 px-4 font-semibold">CONTACT NUMBER</th>
                  <th className="py-3 px-4 font-semibold">GST NUMBER</th>
                  <th className="py-3 px-4 font-semibold text-center">STATUS</th>
                  <th className="py-3 px-4 font-semibold text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {parties
                  .filter(p => p.party_name.toLowerCase().includes(searchTerm.toLowerCase()) || p.gst.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(p => (
                    <tr key={p.id} className={themeStyles.tableRowHover}>
                      <td className="py-3 px-4 font-semibold text-slate-100">{p.party_name}</td>
                      <td className="py-3 px-4 text-slate-300">{p.contact || '—'}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{p.gst || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit ? (
                            <button onClick={() => handleOpenEdit(p)} className="p-1.5 rounded text-slate-400 hover:text-slate-200" title="Edit Party">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="p-1 text-slate-600" title="Edit restricted to Superadmin"><Lock className="h-3 w-3 inline opacity-50" /></span>
                          )}
                          {canDelete && (
                            <button onClick={() => store.deleteParty(p.id)} className="p-1.5 rounded text-slate-400 hover:text-rose-400" title="Delete Party">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {subType === 'places' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                  <th className="py-3 px-4 font-semibold">TERMINAL / PLACE NAME</th>
                  <th className="py-3 px-4 font-semibold">STATE CODE</th>
                  <th className="py-3 px-4 font-semibold text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {places
                  .filter(pl => pl.place_name.toLowerCase().includes(searchTerm.toLowerCase()) || pl.state_code.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(pl => (
                    <tr key={pl.id} className={themeStyles.tableRowHover}>
                      <td className="py-3 px-4 font-semibold text-slate-100">{pl.place_name}</td>
                      <td className="py-3 px-4 font-mono text-blue-400 font-bold">{pl.state_code}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit ? (
                            <button onClick={() => handleOpenEdit(pl)} className="p-1.5 rounded text-slate-400 hover:text-slate-200" title="Edit Place">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="p-1 text-slate-600" title="Edit restricted to Superadmin"><Lock className="h-3 w-3 inline opacity-50" /></span>
                          )}
                          {canDelete && (
                            <button onClick={() => store.deletePlace(pl.id)} className="p-1.5 rounded text-slate-400 hover:text-rose-400" title="Delete Place">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {subType === 'brokers' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                  <th className="py-3 px-4 font-semibold">BROKER / TRANSPORTER</th>
                  <th className="py-3 px-4 font-semibold">CONTACT NUMBER</th>
                  <th className="py-3 px-4 font-semibold">PRIMARY BANK A/C</th>
                  <th className="py-3 px-4 font-semibold">SECONDARY BANK A/C</th>
                  <th className="py-3 px-4 font-semibold text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {brokers
                  .filter(b => b.broker_name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(b => (
                    <tr key={b.id} className={themeStyles.tableRowHover}>
                      <td className="py-3 px-4 font-semibold text-slate-100">{b.broker_name}</td>
                      <td className="py-3 px-4 text-slate-300 font-mono">{b.contact_no}</td>
                      <td className="py-3 px-4 font-mono text-slate-200">
                        {b.primary_acc_no} ({b.ifsc})
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {b.secondary_acc_no ? `${b.secondary_acc_no} (${b.secondary_ifsc})` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit ? (
                            <button onClick={() => handleOpenEdit(b)} className="p-1.5 rounded text-slate-400 hover:text-slate-200" title="Edit Broker">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="p-1 text-slate-600" title="Edit restricted to Superadmin"><Lock className="h-3 w-3 inline opacity-50" /></span>
                          )}
                          {canDelete && (
                            <button onClick={() => store.deleteBroker(b.id)} className="p-1.5 rounded text-slate-400 hover:text-rose-400" title="Delete Broker">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {subType === 'cards' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                  <th className="py-3 px-4 font-semibold">FLEET FUEL CARD IDENTIFIER</th>
                  <th className="py-3 px-4 font-semibold text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {cards
                  .filter(c => c.card_display.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(c => (
                    <tr key={c.id} className={themeStyles.tableRowHover}>
                      <td className="py-3 px-4 font-semibold text-slate-100 flex items-center gap-2">
                        <Fuel className="h-4 w-4 text-amber-400" />
                        <span>{c.card_display}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit ? (
                            <button onClick={() => handleOpenEdit(c)} className="p-1.5 rounded text-slate-400 hover:text-slate-200" title="Edit Card">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="p-1 text-slate-600" title="Edit restricted to Superadmin"><Lock className="h-3 w-3 inline opacity-50" /></span>
                          )}
                          {canDelete && (
                            <button onClick={() => store.deleteCard(c.id)} className="p-1.5 rounded text-slate-400 hover:text-rose-400" title="Delete Card">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {subType === 'users' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px]`}>
                  <th className="py-3 px-4 font-semibold">USER DISPLAY NAME</th>
                  <th className="py-3 px-4 font-semibold">USERNAME / LOGIN ID</th>
                  <th className="py-3 px-4 font-semibold">SYSTEM ROLE</th>
                  <th className="py-3 px-4 font-semibold text-center">STATUS</th>
                  <th className="py-3 px-4 font-semibold text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users
                  .filter(u => u.display_name.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(u => (
                    <tr key={u.id} className={themeStyles.tableRowHover}>
                      <td className="py-3 px-4 font-semibold text-slate-100 flex items-center gap-1.5">
                        {u.role === 'SUPERADMIN' && <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        <span>{u.display_name}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300 font-semibold">@{u.username}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          u.role === 'SUPERADMIN'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : u.role === 'ADMIN'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-slate-500/20 text-slate-300'
                        }`}>
                          {u.role}
                        </span>
                        {u.role === 'ADMIN' && (
                          <span className="block text-[9px] text-slate-500 mt-0.5">No Edit/Delete</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isSuperAdmin ? (
                            <>
                              <button onClick={() => handleOpenEdit(u)} className="p-1.5 rounded text-slate-400 hover:text-slate-200" title="Edit User">
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              {u.username.toUpperCase() !== 'SFMPL' && (
                                <button onClick={() => store.deleteUser(u.id)} className="p-1.5 rounded text-slate-400 hover:text-rose-400" title="Delete User">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-600 p-1" title="User management restricted to Superadmin">
                              <Lock className="w-3.5 h-3.5 inline opacity-50" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Dynamic Master Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${themeStyles.cardBg} ${themeStyles.cardBorder} my-8`}>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className={`text-base font-bold ${themeStyles.textPrimary} capitalize`}>
                {editingItem ? 'Edit' : 'Add'} {subType.slice(0, -1)}
              </h3>
              <button onClick={() => setIsOpenModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {subType === 'parties' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Party Name *</label>
                    <input
                      type="text"
                      value={partyForm.party_name}
                      onChange={e => setPartyForm({ ...partyForm, party_name: e.target.value })}
                      className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={partyForm.contact}
                      onChange={e => setPartyForm({ ...partyForm, contact: e.target.value })}
                      className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">GSTIN Number</label>
                    <input
                      type="text"
                      value={partyForm.gst}
                      onChange={e => setPartyForm({ ...partyForm, gst: e.target.value.toUpperCase() })}
                      className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    />
                  </div>
                </>
              )}

              {subType === 'places' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Place / Terminal Name *</label>
                    <input
                      type="text"
                      value={placeForm.place_name}
                      onChange={e => setPlaceForm({ ...placeForm, place_name: e.target.value })}
                      className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">State Code (e.g. MH, DL, GJ) *</label>
                    <input
                      type="text"
                      value={placeForm.state_code}
                      onChange={e => setPlaceForm({ ...placeForm, state_code: e.target.value.toUpperCase() })}
                      className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                      required
                    />
                  </div>
                </>
              )}

              {subType === 'brokers' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Broker / Transporter Name *</label>
                    <input
                      type="text"
                      value={brokerForm.broker_name}
                      onChange={e => setBrokerForm({ ...brokerForm, broker_name: e.target.value })}
                      className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={brokerForm.contact_no}
                      onChange={e => setBrokerForm({ ...brokerForm, contact_no: e.target.value })}
                      className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Primary A/C *</label>
                      <input
                        type="text"
                        value={brokerForm.primary_acc_no}
                        onChange={e => setBrokerForm({ ...brokerForm, primary_acc_no: e.target.value })}
                        className={`w-full rounded px-2.5 py-1.5 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Primary IFSC *</label>
                      <input
                        type="text"
                        value={brokerForm.ifsc}
                        onChange={e => setBrokerForm({ ...brokerForm, ifsc: e.target.value.toUpperCase() })}
                        className={`w-full rounded px-2.5 py-1.5 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Secondary A/C (Balance)</label>
                      <input
                        type="text"
                        value={brokerForm.secondary_acc_no}
                        onChange={e => setBrokerForm({ ...brokerForm, secondary_acc_no: e.target.value })}
                        className={`w-full rounded px-2.5 py-1.5 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Secondary IFSC</label>
                      <input
                        type="text"
                        value={brokerForm.secondary_ifsc}
                        onChange={e => setBrokerForm({ ...brokerForm, secondary_ifsc: e.target.value.toUpperCase() })}
                        className={`w-full rounded px-2.5 py-1.5 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                      />
                    </div>
                  </div>
                </>
              )}

              {subType === 'cards' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Card Display Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. BPCL Fleet Card #9021"
                    value={cardForm.card_display}
                    onChange={e => setCardForm({ card_display: e.target.value })}
                    className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    required
                  />
                </div>
              )}

              {subType === 'users' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Display Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Operations Manager"
                      value={userForm.display_name}
                      onChange={e => setUserForm({ ...userForm, display_name: e.target.value })}
                      className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">User ID / Username *</label>
                    <input
                      type="text"
                      placeholder="e.g. SFMPL_OP"
                      value={userForm.username}
                      onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                      className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Password {editingItem ? '(Leave empty to keep existing password)' : '*'}
                    </label>
                    <input
                      type="text"
                      placeholder={editingItem ? 'Keep current password' : 'Enter user password'}
                      value={userForm.password || ''}
                      onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                      className={`w-full rounded-lg px-3 py-2 text-xs border font-mono ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                      required={!editingItem}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Role & Permissions *</label>
                    <select
                      value={userForm.role}
                      onChange={e => setUserForm({ ...userForm, role: e.target.value as any })}
                      className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    >
                      <option value="SUPERADMIN">SUPERADMIN (Full Power + Edit/Delete + User Mgmt)</option>
                      <option value="ADMIN">ADMIN (Full Operations: Leaving Edit & Delete)</option>
                      <option value="USER">USER (Operator)</option>
                    </select>
                    <div className="text-[10px] text-slate-400 mt-1.5 p-2 rounded bg-black/30 border border-white/5">
                      {userForm.role === 'SUPERADMIN' && (
                        <span className="text-amber-300">
                          <strong>Superadmin:</strong> Full unrestricted access, user creation, record edit and deletion.
                        </span>
                      )}
                      {userForm.role === 'ADMIN' && (
                        <span className="text-blue-300">
                          <strong>Admin:</strong> Full operational power like Superadmin (create orders, allocate lorries, dispatches, payments, reports), but <em>leaving edit and delete</em> options.
                        </span>
                      )}
                      {userForm.role === 'USER' && (
                        <span className="text-slate-300">
                          <strong>User:</strong> Standard operator with routine viewing and entry permissions.
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Account Status</label>
                    <select
                      value={userForm.status || 'ACTIVE'}
                      onChange={e => setUserForm({ ...userForm, status: e.target.value as any })}
                      className={`w-full rounded-lg px-3 py-2 text-xs border ${themeStyles.inputBg} ${themeStyles.inputBorder}`}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 shadow-xs"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
