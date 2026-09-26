import { useState, useEffect } from 'react';
import {
  ThemeMode,
  User,
  Party,
  Place,
  Broker,
  Card,
  SalesOrder,
  TripDispatch,
  MoneyFreight,
  Unloading,
  Profit,
  AccountRecord
} from '../types';
import {
  initialUsers,
  initialParties,
  initialPlaces,
  initialBrokers,
  initialCards,
  initialSalesOrders,
  initialTrips,
  initialMoneyFreights,
  initialUnloadings,
  initialProfits,
  initialAccounts
} from './initialData';

const STORAGE_KEY = 'sfmpl_tms_v5_prod';
const THEME_KEY = 'sfmpl_tms_v5_theme';
export const AUTH_KEY = 'sfmpl_tms_v5_auth';

export interface TMSState {
  theme: ThemeMode;
  currentUser: User;
  isAuthenticated: boolean;
  users: User[];
  parties: Party[];
  places: Place[];
  brokers: Broker[];
  cards: Card[];
  salesOrders: SalesOrder[];
  trips: TripDispatch[];
  moneyFreights: MoneyFreight[];
  unloadings: Unloading[];
  profits: Profit[];
  accounts: AccountRecord[];
}

function loadInitialState(): TMSState {
  const savedTheme = (localStorage.getItem(THEME_KEY) as ThemeMode) || 'navy';
  const authSaved = localStorage.getItem(AUTH_KEY);
  let isAuthenticated = false;
  let currentUser = initialUsers[0];
  let users = initialUsers;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      users = parsed.users && parsed.users.length > 0 ? parsed.users : initialUsers;
      
      // Ensure SFMPL superadmin is always present with proper password
      const sfmplIdx = users.findIndex((u: User) => u.username.toUpperCase() === 'SFMPL');
      if (sfmplIdx === -1) {
        users = [initialUsers[0], ...users];
      } else {
        // Enforce the requested credentials and superadmin role
        users[sfmplIdx] = {
          ...users[sfmplIdx],
          password: users[sfmplIdx].password || 'sfmpl@1991',
          role: 'SUPERADMIN'
        };
      }

      if (authSaved) {
        try {
          const authData = JSON.parse(authSaved);
          const found = users.find(
            (u: User) =>
              u.id === authData.userId ||
              u.username.toLowerCase() === (authData.username || '').toLowerCase()
          );
          if (found && found.status === 'ACTIVE') {
            currentUser = found;
            isAuthenticated = true;
          }
        } catch (err) {}
      }

      return {
        ...parsed,
        users,
        theme: savedTheme || parsed.theme || 'navy',
        currentUser,
        isAuthenticated
      };
    }
  } catch (e) {
    console.error('Failed to load saved TMS state:', e);
  }

  if (authSaved) {
    try {
      const authData = JSON.parse(authSaved);
      const found = users.find(
        (u: User) =>
          u.id === authData.userId ||
          u.username.toLowerCase() === (authData.username || '').toLowerCase()
      );
      if (found && found.status === 'ACTIVE') {
        currentUser = found;
        isAuthenticated = true;
      }
    } catch (err) {}
  }

  return {
    theme: savedTheme,
    currentUser,
    isAuthenticated,
    users: initialUsers,
    parties: initialParties,
    places: initialPlaces,
    brokers: initialBrokers,
    cards: initialCards,
    salesOrders: initialSalesOrders,
    trips: initialTrips,
    moneyFreights: initialMoneyFreights,
    unloadings: initialUnloadings,
    profits: initialProfits,
    accounts: initialAccounts
  };
}

export function useTMSStore() {
  const [state, setState] = useState<TMSState>(loadInitialState);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem(THEME_KEY, state.theme);
    } catch (e) {
      console.error('Error saving TMS state to localStorage:', e);
    }
  }, [state]);

  const setTheme = (theme: ThemeMode) => {
    setState(prev => ({ ...prev, theme }));
  };

  const setCurrentUser = (user: User) => {
    setState(prev => ({ ...prev, currentUser: user }));
  };

  // ── Sales Orders ──
  const saveSalesOrder = (soData: Partial<SalesOrder>) => {
    setState(prev => {
      const mt = Number(soData.mt) || 0;
      const rateGiven = Number(soData.rate_given) || 0;
      const rateRec = Number(soData.rate_received) || 0;
      const loadingCharge = Number(soData.loading_charge) || 0;
      const givenLabourType = soData.given_labour_type || 'Inclusive';
      const recLabourType = soData.rec_labour_type || 'Inclusive';

      const effGiven = givenLabourType === 'Inclusive' ? rateGiven : rateGiven + loadingCharge;
      const effRec = recLabourType === 'Inclusive' ? rateRec : rateRec + loadingCharge;
      const marginPerMT = effGiven - effRec;
      const totalMargin = marginPerMT * mt;

      let soNumber = soData.so_number || '';
      if (!soNumber && soData.converted === 'YES') {
        const lastNum = prev.salesOrders.reduce((max, s) => {
          if (!s.so_number || !s.so_number.includes('/')) return max;
          const parts = s.so_number.split('/');
          const num = parseInt(parts[2] || '0', 10);
          return num > max ? num : max;
        }, 0);
        soNumber = `SFMPL/080/${String(lastNum + 1).padStart(3, '0')}`;
      }

      if (soData.id) {
        // Update
        return {
          ...prev,
          salesOrders: prev.salesOrders.map(s =>
            s.id === soData.id
              ? {
                  ...s,
                  ...soData,
                  mt,
                  rate_given: rateGiven,
                  rate_received: rateRec,
                  loading_charge: loadingCharge,
                  given_labour_type: givenLabourType,
                  rec_labour_type: recLabourType,
                  effective_given: effGiven,
                  effective_rec: effRec,
                  margin_per_mt: marginPerMT,
                  total_margin: totalMargin,
                  so_number: soNumber || s.so_number
                }
              : s
          )
        };
      } else {
        // Create
        const nextId = prev.salesOrders.reduce((max, s) => (s.id > max ? s.id : max), 0) + 1;
        const newSO: SalesOrder = {
          id: nextId,
          so_number: soNumber,
          party_id: Number(soData.party_id) || 1,
          from_id: Number(soData.from_id) || 1,
          to_id: Number(soData.to_id) || 2,
          mt,
          rate_given: rateGiven,
          given_labour_type: givenLabourType,
          rate_received: rateRec,
          rec_labour_type: recLabourType,
          loading_charge: loadingCharge,
          effective_given: effGiven,
          effective_rec: effRec,
          margin_per_mt: marginPerMT,
          total_margin: totalMargin,
          converted: soData.converted || 'NO',
          status: soData.status || 'ACTIVE',
          remarks: soData.remarks || '',
          allocated: false,
          documentation_status: false,
          mf_status: false,
          unloading_status: false,
          profit_status: false,
          created_at: new Date().toISOString(),
          created_by: prev.currentUser.display_name
        };
        return {
          ...prev,
          salesOrders: [newSO, ...prev.salesOrders]
        };
      }
    });
  };

  const deleteSalesOrder = (id: number) => {
    setState(prev => ({
      ...prev,
      salesOrders: prev.salesOrders.filter(s => s.id !== id)
    }));
  };

  // ── Trip & Dispatch ──
  const saveTrip = (tripData: Partial<TripDispatch>) => {
    setState(prev => {
      const soId = Number(tripData.so_id);
      const existing = prev.trips.find(t => t.so_id === soId);

      let updatedTrips: TripDispatch[];
      if (existing) {
        updatedTrips = prev.trips.map(t =>
          t.so_id === soId
            ? { ...t, ...tripData, trip_status: tripData.trip_status || t.trip_status }
            : t
        );
      } else {
        const nextId = prev.trips.reduce((max, t) => (t.id > max ? t.id : max), 0) + 1;
        const newTrip: TripDispatch = {
          id: nextId,
          so_id: soId,
          so_number: tripData.so_number || '',
          lorry_no: tripData.lorry_no || '',
          consignor: tripData.consignor || '',
          consignee: tripData.consignee || '',
          destination: tripData.destination || '',
          broker_id: tripData.broker_id ?? null,
          broker_acc: tripData.broker_acc || '',
          broker_ifsc: tripData.broker_ifsc || '',
          bal_acc: tripData.bal_acc || '',
          bal_ifsc: tripData.bal_ifsc || '',
          broker_contact: tripData.broker_contact || '',
          driver_contact: tripData.driver_contact || '',
          dispatch_status: 'PENDING',
          trip_status: 'RUNNING',
          created_by: prev.currentUser.display_name,
          created_at: new Date().toISOString(),
          ...tripData
        };
        updatedTrips = [newTrip, ...prev.trips];
      }

      // Mark SO as allocated
      const updatedSOs = prev.salesOrders.map(s =>
        s.id === soId ? { ...s, allocated: true } : s
      );

      return {
        ...prev,
        trips: updatedTrips,
        salesOrders: updatedSOs
      };
    });
  };

  const saveDispatch = (dispatchData: Partial<TripDispatch>) => {
    setState(prev => {
      const soId = Number(dispatchData.so_id);
      const updatedTrips = prev.trips.map(t => {
        if (t.so_id === soId) {
          return {
            ...t,
            ...dispatchData,
            dispatch_status: 'DISPATCHED' as const
          };
        }
        return t;
      });

      // Mark SO as documentation complete
      const updatedSOs = prev.salesOrders.map(s =>
        s.id === soId ? { ...s, documentation_status: true } : s
      );

      return {
        ...prev,
        trips: updatedTrips,
        salesOrders: updatedSOs
      };
    });
  };

  // ── Money Freight (MF) ──
  const saveMoneyFreight = (mfData: Partial<MoneyFreight>) => {
    setState(prev => {
      const finalMT = Number(mfData.final_mt) || 0;
      const pmtRate = Number(mfData.pmt_rate) || 0;
      const totalFreight = finalMT * pmtRate;

      const lm = Number(mfData.l_m) || 0;
      const pm = Number(mfData.p_m) || 0;
      const lmD = Number(mfData.lm_d) || 0;
      const pmD = Number(mfData.pm_d) || 0;
      const otherExp = Number(mfData.other_expense) || 0;
      // LM_D and PM_D are purely for display/record purposes and have no calculation with freight
      const freightMF = totalFreight - lm - pm + otherExp;

      const adv = Number(mfData.advance) || 0;
      const diesel = Number(mfData.diesel) || 0;
      const other = Number(mfData.other) || 0;
      const balance = freightMF - adv - diesel + other;

      const ll = Number(mfData.loading_labour) || 0;
      const food = Number(mfData.fooding) || 0;
      const con = Number(mfData.con) || 0;
      const unl = Number(mfData.unloading) || 0;
      const xerox = Number(mfData.xerox) || 0;
      const det = Number(mfData.detention) || 0;
      const ep = Number(mfData.extra_point) || 0;
      const oc = Number(mfData.other_chrg) || 0;
      const totalExp = ll + food + con + unl + xerox + det + ep + oc;

      const extraLabour = Number(mfData.extra_labour) || 0;
      const totalCost = freightMF + totalExp + extraLabour;

      const billPmt = Number(mfData.bill_pmt) || 0;
      const biltiFrt = billPmt * finalMT;

      let mfNo = mfData.mf_no || '';
      if (!mfNo) {
        const lastNum = prev.moneyFreights.reduce((max, m) => {
          if (!m.mf_no || !m.mf_no.includes('/')) return max;
          const parts = m.mf_no.split('/');
          const num = parseInt(parts[2] || '0', 10);
          return num > max ? num : max;
        }, 0);
        mfNo = `MF/25/${String(lastNum + 1).padStart(3, '0')}`;
      }

      const calculated: MoneyFreight = {
        id: mfData.id || prev.moneyFreights.reduce((max, m) => (m.id > max ? m.id : max), 0) + 1,
        mf_no: mfNo,
        so_id: Number(mfData.so_id),
        so_number: mfData.so_number || '',
        lorry_no: mfData.lorry_no || '',
        loading_point: mfData.loading_point || '',
        loading_clerk: mfData.loading_clerk || '',
        pmt_rate: pmtRate,
        final_mt: finalMT,
        total_freight: totalFreight,
        other_expense: otherExp,
        l_m: lm,
        p_m: pm,
        lm_d: lmD,
        pm_d: pmD,
        freight_mf: freightMF,
        advance: adv,
        diesel: diesel,
        diesel_paid: Number(mfData.diesel_paid) || diesel,
        diesel_payment_type: mfData.diesel_payment_type || 'Card',
        diesel_ref: mfData.diesel_ref || '',
        diesel_card: mfData.diesel_card || '',
        other: other,
        balance: balance,
        loading_labour: ll,
        fooding: food,
        con: con,
        unloading: unl,
        xerox: xerox,
        detention: det,
        extra_point: ep,
        other_chrg: oc,
        total_exp: totalExp,
        extra_labour: extraLabour,
        total_cost: totalCost,
        bill_pmt: billPmt,
        bilti_freight: biltiFrt,
        created_by: prev.currentUser.display_name,
        created_at: new Date().toISOString()
      };

      const existingIndex = prev.moneyFreights.findIndex(m => m.mf_no === mfNo);
      let updatedMFs: MoneyFreight[];
      if (existingIndex >= 0) {
        updatedMFs = prev.moneyFreights.map((m, idx) => (idx === existingIndex ? calculated : m));
      } else {
        updatedMFs = [calculated, ...prev.moneyFreights];
      }

      // Mark SO mf_status
      const updatedSOs = prev.salesOrders.map(s =>
        s.id === calculated.so_id ? { ...s, mf_status: true } : s
      );

      // Create or update account record
      const trip = prev.trips.find(t => t.so_id === calculated.so_id);
      const broker = trip && trip.broker_id ? prev.brokers.find(b => b.id === trip.broker_id) : null;
      const acctIndex = prev.accounts.findIndex(a => a.mf_no === mfNo);

      let updatedAccounts: AccountRecord[];
      if (acctIndex >= 0) {
        updatedAccounts = prev.accounts.map((a, i) =>
          i === acctIndex
            ? {
                ...a,
                advance_amount: adv,
                balance_amount: balance
              }
            : a
        );
      } else {
        const newAcct: AccountRecord = {
          id: prev.accounts.reduce((max, a) => (a.id > max ? a.id : max), 0) + 1,
          mf_no: mfNo,
          so_id: calculated.so_id,
          so_number: calculated.so_number,
          lorry_no: calculated.lorry_no,
          loading_date: trip?.loading_date,
          broker_id: trip?.broker_id,
          broker_name: broker?.broker_name || trip?.broker_contact || '',
          adv_acc_no: trip?.broker_acc || broker?.primary_acc_no || '',
          adv_ifsc: trip?.broker_ifsc || broker?.ifsc || '',
          bal_acc_no: trip?.bal_acc || broker?.secondary_acc_no || '',
          bal_ifsc: trip?.bal_ifsc || broker?.secondary_ifsc || '',
          advance_amount: adv,
          balance_amount: balance,
          adv_paid_amount: 0,
          adv_txn_id: '',
          bal_paid_amount: 0,
          bal_txn_id: '',
          adv_status: 'PENDING',
          bal_status: 'PENDING',
          overall_status: 'PENDING',
          created_by: prev.currentUser.display_name,
          created_at: new Date().toISOString()
        };
        updatedAccounts = [newAcct, ...prev.accounts];
      }

      return {
        ...prev,
        moneyFreights: updatedMFs,
        salesOrders: updatedSOs,
        accounts: updatedAccounts
      };
    });
  };

  const deleteMoneyFreight = (idOrMfNo: string | number) => {
    setState(prev => ({
      ...prev,
      moneyFreights: prev.moneyFreights.filter(m => m.id !== idOrMfNo && m.mf_no !== idOrMfNo),
      accounts: prev.accounts.filter(a => a.mf_no !== idOrMfNo)
    }));
  };

  // ── Unloading ──
  const saveUnloading = (unlData: Partial<Unloading>) => {
    setState(prev => {
      const soId = Number(unlData.so_id);
      const nextId = prev.unloadings.reduce((max, u) => (u.id > max ? u.id : max), 0) + 1;
      const newUnloading: Unloading = {
        id: nextId,
        so_id: soId,
        so_number: unlData.so_number || '',
        mf_no: unlData.mf_no || '',
        lorry_no: unlData.lorry_no || '',
        unloading_date: unlData.unloading_date || new Date().toISOString().split('T')[0],
        unloading_mt: Number(unlData.unloading_mt) || 0,
        shortage: Number(unlData.shortage) || 0,
        deduction: Number(unlData.deduction) || 0,
        created_by: prev.currentUser.display_name,
        created_at: new Date().toISOString()
      };

      const updatedSOs = prev.salesOrders.map(s =>
        s.id === soId ? { ...s, unloading_status: true } : s
      );

      return {
        ...prev,
        unloadings: [newUnloading, ...prev.unloadings],
        salesOrders: updatedSOs
      };
    });
  };

  // ── Profit ──
  const saveProfit = (profitData: Partial<Profit>) => {
    setState(prev => {
      const soId = Number(profitData.so_id);
      const bilti = Number(profitData.bilti_freight) || 0;
      const extra = Number(profitData.extra_chrg) || 0;
      const totalRev = bilti + extra;
      const cost = Number(profitData.total_cost) || 0;
      const deduct = Number(profitData.deduction) || 0;

      const grossProfit = totalRev - cost - deduct;
      const gpSale = totalRev > 0 ? parseFloat(((grossProfit / totalRev) * 100).toFixed(2)) : 0;
      const gpPurchase = cost > 0 ? parseFloat(((grossProfit / cost) * 100).toFixed(2)) : 0;

      const nextId = prev.profits.reduce((max, p) => (p.id > max ? p.id : max), 0) + 1;
      const newProfit: Profit = {
        id: nextId,
        so_id: soId,
        so_number: profitData.so_number || '',
        mf_no: profitData.mf_no || '',
        bilti_freight: bilti,
        extra_chrg: extra,
        total_revenue: totalRev,
        total_cost: cost,
        deduction: deduct,
        gross_profit: grossProfit,
        gp_on_sale: gpSale,
        gp_on_purchase: gpPurchase,
        ack_date: profitData.ack_date,
        created_by: prev.currentUser.display_name,
        created_at: new Date().toISOString()
      };

      const updatedSOs = prev.salesOrders.map(s =>
        s.id === soId ? { ...s, profit_status: true } : s
      );

      return {
        ...prev,
        profits: [newProfit, ...prev.profits],
        salesOrders: updatedSOs
      };
    });
  };

  // ── Account Payments ──
  const saveAdvancePayment = (mfNo: string, amount: number, txnId: string) => {
    setState(prev => {
      const updatedAccounts = prev.accounts.map(a => {
        if (a.mf_no === mfNo) {
          return {
            ...a,
            adv_paid_amount: amount,
            adv_txn_id: txnId,
            adv_status: 'ADV_PAID' as const,
            overall_status: a.bal_status === 'BAL_PAID' ? ('COMPLETED' as const) : ('BAL_PENDING' as const)
          };
        }
        return a;
      });
      return { ...prev, accounts: updatedAccounts };
    });
  };

  const saveBalancePayment = (mfNo: string, amount: number, txnId: string) => {
    setState(prev => {
      let soId: number | null = null;
      const updatedAccounts = prev.accounts.map(a => {
        if (a.mf_no === mfNo) {
          soId = a.so_id;
          return {
            ...a,
            bal_paid_amount: amount,
            bal_txn_id: txnId,
            bal_status: 'BAL_PAID' as const,
            overall_status: 'COMPLETED' as const,
            settlement_date: new Date().toISOString()
          };
        }
        return a;
      });

      // Mark trip as COMPLETED
      let updatedTrips = prev.trips;
      if (soId) {
        updatedTrips = prev.trips.map(t =>
          t.so_id === soId ? { ...t, trip_status: 'COMPLETED' as const } : t
        );
      }

      return {
        ...prev,
        accounts: updatedAccounts,
        trips: updatedTrips
      };
    });
  };

  // ── Masters Management ──
  const saveParty = (party: Partial<Party>) => {
    setState(prev => {
      if (party.id) {
        return {
          ...prev,
          parties: prev.parties.map(p => (p.id === party.id ? { ...p, ...party } : p))
        };
      }
      const nextId = prev.parties.reduce((max, p) => (p.id > max ? p.id : max), 0) + 1;
      return {
        ...prev,
        parties: [...prev.parties, { id: nextId, party_name: party.party_name || '', contact: party.contact || '', gst: party.gst || '', status: party.status || 'ACTIVE', created_at: new Date().toISOString() }]
      };
    });
  };

  const deleteParty = (id: number) => {
    setState(prev => ({ ...prev, parties: prev.parties.filter(p => p.id !== id) }));
  };

  const savePlace = (place: Partial<Place>) => {
    setState(prev => {
      if (place.id) {
        return {
          ...prev,
          places: prev.places.map(p => (p.id === place.id ? { ...p, ...place } : p))
        };
      }
      const nextId = prev.places.reduce((max, p) => (p.id > max ? p.id : max), 0) + 1;
      return {
        ...prev,
        places: [...prev.places, { id: nextId, place_name: place.place_name || '', state_code: place.state_code || '', created_at: new Date().toISOString() }]
      };
    });
  };

  const deletePlace = (id: number) => {
    setState(prev => ({ ...prev, places: prev.places.filter(p => p.id !== id) }));
  };

  const saveBroker = (broker: Partial<Broker>) => {
    setState(prev => {
      if (broker.id) {
        return {
          ...prev,
          brokers: prev.brokers.map(b => (b.id === broker.id ? { ...b, ...broker } : b))
        };
      }
      const nextId = prev.brokers.reduce((max, b) => (b.id > max ? b.id : max), 0) + 1;
      return {
        ...prev,
        brokers: [
          ...prev.brokers,
          {
            id: nextId,
            broker_name: broker.broker_name || '',
            primary_acc_no: broker.primary_acc_no || '',
            ifsc: broker.ifsc || '',
            secondary_acc_no: broker.secondary_acc_no || '',
            secondary_ifsc: broker.secondary_ifsc || '',
            contact_no: broker.contact_no || '',
            status: broker.status || 'ACTIVE',
            created_at: new Date().toISOString()
          }
        ]
      };
    });
  };

  const deleteBroker = (id: number) => {
    setState(prev => ({ ...prev, brokers: prev.brokers.filter(b => b.id !== id) }));
  };

  const saveCard = (card: Partial<Card>) => {
    setState(prev => {
      if (card.id) {
        return {
          ...prev,
          cards: prev.cards.map(c => (c.id === card.id ? { ...c, ...card } : c))
        };
      }
      const nextId = prev.cards.reduce((max, c) => (c.id > max ? c.id : max), 0) + 1;
      return {
        ...prev,
        cards: [...prev.cards, { id: nextId, card_display: card.card_display || '', created_at: new Date().toISOString() }]
      };
    });
  };

  const deleteCard = (id: number) => {
    setState(prev => ({ ...prev, cards: prev.cards.filter(c => c.id !== id) }));
  };

  const saveUser = (user: Partial<User>) => {
    setState(prev => {
      if (user.id) {
        return {
          ...prev,
          users: prev.users.map(u =>
            u.id === user.id
              ? {
                  ...u,
                  ...user,
                  password: user.password && user.password.trim() !== '' ? user.password.trim() : u.password
                }
              : u
          ),
          currentUser:
            prev.currentUser.id === user.id
              ? {
                  ...prev.currentUser,
                  ...user,
                  password: user.password && user.password.trim() !== '' ? user.password.trim() : prev.currentUser.password
                }
              : prev.currentUser
        };
      }
      const nextId = prev.users.reduce((max, u) => (u.id > max ? u.id : max), 0) + 1;
      const newUser: User = {
        id: nextId,
        username: (user.username || '').trim(),
        password: (user.password || 'sfmpl@123').trim(),
        display_name: (user.display_name || user.username || '').trim(),
        role: user.role || 'USER',
        status: user.status || 'ACTIVE',
        created_at: new Date().toISOString()
      };
      return {
        ...prev,
        users: [...prev.users, newUser]
      };
    });
  };

  const deleteUser = (id: number) => {
    setState(prev => {
      const userToDelete = prev.users.find(u => u.id === id);
      if (userToDelete && userToDelete.username.toUpperCase() === 'SFMPL') {
        alert('The root Superadmin account (SFMPL) cannot be deleted.');
        return prev;
      }
      return {
        ...prev,
        users: prev.users.filter(u => u.id !== id)
      };
    });
  };

  const login = (usernameInput: string, passwordInput: string): { success: boolean; message?: string } => {
    const cleanUsername = usernameInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    const user = state.users.find(
      u => u.username.toLowerCase() === cleanUsername && u.status === 'ACTIVE'
    );

    if (!user) {
      return { success: false, message: 'Invalid credentials. User ID not found or account inactive.' };
    }

    if (user.password !== cleanPassword) {
      return { success: false, message: 'Invalid password. Please check your credentials.' };
    }

    setState(prev => ({
      ...prev,
      currentUser: user,
      isAuthenticated: true
    }));

    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify({ userId: user.id, username: user.username }));
    } catch (e) {
      console.error('Failed to store auth session:', e);
    }

    return { success: true };
  };

  const logout = () => {
    setState(prev => ({
      ...prev,
      isAuthenticated: false
    }));
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch (e) {
      console.error('Failed to remove auth session:', e);
    }
  };

  const bulkImportSalesOrders = (imported: Partial<SalesOrder>[]) => {
    setState(prev => {
      let maxId = prev.salesOrders.reduce((max, s) => (s.id > max ? s.id : max), 0);
      let soIndex = prev.salesOrders.reduce((max, s) => {
        if (!s.so_number || !s.so_number.includes('/')) return max;
        const parts = s.so_number.split('/');
        const num = parseInt(parts[2] || '0', 10);
        return num > max ? num : max;
      }, 0);

      const newRecords: SalesOrder[] = imported.map(item => {
        maxId += 1;
        const mt = Number(item.mt) || 0;
        const rateGiven = Number(item.rate_given) || 0;
        const rateRec = Number(item.rate_received) || 0;
        const givenLabourType = item.given_labour_type || 'Inclusive';
        const recLabourType = item.rec_labour_type || 'Inclusive';
        const loadingCharge = Number(item.loading_charge) || 0;

        const effGiven = givenLabourType === 'Inclusive' ? rateGiven : rateGiven + loadingCharge;
        const effRec = recLabourType === 'Inclusive' ? rateRec : rateRec + loadingCharge;
        const marginPerMT = effGiven - effRec;
        const totalMargin = marginPerMT * mt;

        let soNum = item.so_number || '';
        if (!soNum && item.converted === 'YES') {
          soIndex += 1;
          soNum = `SFMPL/080/${String(soIndex).padStart(3, '0')}`;
        }

        return {
          id: maxId,
          so_number: soNum,
          party_id: Number(item.party_id) || 1,
          from_id: Number(item.from_id) || 1,
          to_id: Number(item.to_id) || 2,
          mt,
          rate_given: rateGiven,
          given_labour_type: givenLabourType,
          rate_received: rateRec,
          rec_labour_type: recLabourType,
          loading_charge: loadingCharge,
          effective_given: effGiven,
          effective_rec: effRec,
          margin_per_mt: marginPerMT,
          total_margin: totalMargin,
          converted: item.converted || 'YES',
          status: item.status || 'ACTIVE',
          remarks: item.remarks || '',
          allocated: Boolean(item.allocated),
          documentation_status: Boolean(item.documentation_status),
          mf_status: Boolean(item.mf_status),
          unloading_status: Boolean(item.unloading_status),
          profit_status: Boolean(item.profit_status),
          created_at: item.created_at || new Date().toISOString(),
          created_by: prev.currentUser.display_name
        };
      });

      return {
        ...prev,
        salesOrders: [...newRecords, ...prev.salesOrders]
      };
    });
  };

  const bulkImportTrips = (imported: Partial<TripDispatch>[]) => {
    setState(prev => {
      let maxId = prev.trips.reduce((max, t) => (t.id > max ? t.id : max), 0);
      const newTrips: TripDispatch[] = imported.map(item => {
        maxId += 1;
        return {
          id: maxId,
          so_id: Number(item.so_id) || 1,
          so_number: item.so_number || '',
          lorry_no: item.lorry_no || '',
          allocation_date: item.allocation_date || new Date().toISOString().split('T')[0],
          consignor: item.consignor || '',
          consignee: item.consignee || '',
          destination: item.destination || '',
          broker_id: item.broker_id ?? null,
          broker_acc: item.broker_acc || '',
          broker_ifsc: item.broker_ifsc || '',
          bal_acc: item.bal_acc || '',
          bal_ifsc: item.bal_ifsc || '',
          broker_contact: item.broker_contact || '',
          driver_contact: item.driver_contact || '',
          loading_date: item.loading_date,
          gc_no: item.gc_no,
          invoice_no: item.invoice_no,
          eway_bill_no: item.eway_bill_no,
          eway_expiry: item.eway_expiry,
          destination_gc: item.destination_gc,
          items: item.items,
          pkgs: item.pkgs,
          articles: item.articles,
          final_mt: item.final_mt,
          dispatch_status: item.dispatch_status || 'PENDING',
          trip_status: item.trip_status || 'RUNNING',
          created_by: prev.currentUser.display_name,
          created_at: new Date().toISOString()
        };
      });

      return {
        ...prev,
        trips: [...newTrips, ...prev.trips]
      };
    });
  };

  const bulkImportParties = (imported: Partial<Party>[]) => {
    setState(prev => {
      let maxId = prev.parties.reduce((max, p) => (p.id > max ? p.id : max), 0);
      const newParties: Party[] = imported.map(item => {
        maxId += 1;
        return {
          id: maxId,
          party_name: item.party_name || 'Unnamed Party',
          contact: item.contact || '',
          gst: item.gst || '',
          status: item.status || 'ACTIVE',
          created_at: new Date().toISOString()
        };
      });
      return {
        ...prev,
        parties: [...prev.parties, ...newParties]
      };
    });
  };

  const bulkImportPlaces = (imported: Partial<Place>[]) => {
    setState(prev => {
      let maxId = prev.places.reduce((max, p) => (p.id > max ? p.id : max), 0);
      const newPlaces: Place[] = imported.map(item => {
        maxId += 1;
        return {
          id: maxId,
          place_name: item.place_name || '',
          state_code: (item.state_code || 'IN').toUpperCase(),
          created_at: new Date().toISOString()
        };
      });
      return {
        ...prev,
        places: [...prev.places, ...newPlaces]
      };
    });
  };

  const bulkImportBrokers = (imported: Partial<Broker>[]) => {
    setState(prev => {
      let maxId = prev.brokers.reduce((max, b) => (b.id > max ? b.id : max), 0);
      const newBrokers: Broker[] = imported.map(item => {
        maxId += 1;
        return {
          id: maxId,
          broker_name: item.broker_name || '',
          primary_acc_no: item.primary_acc_no || '',
          ifsc: (item.ifsc || '').toUpperCase(),
          secondary_acc_no: item.secondary_acc_no || '',
          secondary_ifsc: (item.secondary_ifsc || '').toUpperCase(),
          contact_no: item.contact_no || '',
          status: item.status || 'ACTIVE',
          created_at: new Date().toISOString()
        };
      });
      return {
        ...prev,
        brokers: [...prev.brokers, ...newBrokers]
      };
    });
  };

  const resetAllData = () => {
    const fresh: TMSState = {
      theme: state.theme,
      currentUser: initialUsers[0],
      isAuthenticated: true,
      users: initialUsers,
      parties: initialParties,
      places: initialPlaces,
      brokers: initialBrokers,
      cards: initialCards,
      salesOrders: initialSalesOrders,
      trips: initialTrips,
      moneyFreights: initialMoneyFreights,
      unloadings: initialUnloadings,
      profits: initialProfits,
      accounts: initialAccounts
    };
    setState(fresh);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      localStorage.setItem(AUTH_KEY, JSON.stringify({ userId: initialUsers[0].id, username: initialUsers[0].username }));
    } catch (e) {
      console.error('Error resetting TMS data:', e);
    }
  };

  return {
    state,
    setTheme,
    setCurrentUser,
    login,
    logout,
    saveSalesOrder,
    deleteSalesOrder,
    saveTrip,
    saveDispatch,
    saveMoneyFreight,
    deleteMoneyFreight,
    saveUnloading,
    saveProfit,
    saveAdvancePayment,
    saveBalancePayment,
    saveParty,
    deleteParty,
    savePlace,
    deletePlace,
    saveBroker,
    deleteBroker,
    saveCard,
    deleteCard,
    saveUser,
    deleteUser,
    bulkImportSalesOrders,
    bulkImportTrips,
    bulkImportParties,
    bulkImportPlaces,
    bulkImportBrokers,
    resetAllData
  };
}
