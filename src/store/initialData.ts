import { User, Party, Place, Broker, Card, SalesOrder, TripDispatch, MoneyFreight, AccountRecord, Profit, Unloading } from '../types';

export const initialUsers: User[] = [
  {
    id: 1,
    username: 'SFMPL',
    password: 'sfmpl@1991',
    display_name: 'SFMPL Super Admin',
    role: 'SUPERADMIN',
    status: 'ACTIVE',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    username: 'admin',
    password: 'admin123',
    display_name: 'Operations Admin',
    role: 'ADMIN',
    status: 'ACTIVE',
    created_at: '2024-01-02T00:00:00Z'
  }
];

// Production Clean State — Demo Entries Removed
export const initialParties: Party[] = [];
export const initialPlaces: Place[] = [];
export const initialBrokers: Broker[] = [];
export const initialCards: Card[] = [];
export const initialSalesOrders: SalesOrder[] = [];
export const initialTrips: TripDispatch[] = [];
export const initialMoneyFreights: MoneyFreight[] = [];
export const initialUnloadings: Unloading[] = [];
export const initialProfits: Profit[] = [];
export const initialAccounts: AccountRecord[] = [];
