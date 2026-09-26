import React, { useState } from 'react';
import { useTMSStore } from './store/useTMSStore';
import { themes } from './utils/theme';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { SalesOrderView } from './components/SalesOrderView';
import { VehicleAllocationView } from './components/VehicleAllocationView';
import { DispatchDocView } from './components/DispatchDocView';
import { MoneyFreightView } from './components/MoneyFreightView';
import { UnloadingView } from './components/UnloadingView';
import { ProfitReportView } from './components/ProfitReportView';
import { AccountView } from './components/AccountView';
import { ReportsHubView } from './components/ReportsHubView';
import { MastersView } from './components/MastersView';
import { MasterReportView } from './components/MasterReportView';
import { ExcelImportModal, ImportModuleType } from './components/ExcelImportModal';
import { LoginModal } from './components/LoginModal';
import { SalesOrder, TripDispatch, MoneyFreight } from './types';

export const App: React.FC = () => {
  const store = useTMSStore();
  const { theme, currentUser, users, salesOrders, trips, moneyFreights, accounts } = store.state;
  const themeStyles = themes[theme] || themes.navy;

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Workflow state passed between modules
  const [targetSOForAlloc, setTargetSOForAlloc] = useState<SalesOrder | null>(null);
  const [isOpenAllocModal, setIsOpenAllocModal] = useState(false);

  const [targetTripForDoc, setTargetTripForDoc] = useState<TripDispatch | null>(null);
  const [isOpenDocModal, setIsOpenDocModal] = useState(false);

  const [targetTripForMF, setTargetTripForMF] = useState<TripDispatch | null>(null);
  const [isOpenMFModal, setIsOpenMFModal] = useState(false);

  const [targetMFForUnloading, setTargetMFForUnloading] = useState<MoneyFreight | null>(null);
  const [isOpenUnloadingModal, setIsOpenUnloadingModal] = useState(false);

  const [targetMFForProfit, setTargetMFForProfit] = useState<MoneyFreight | null>(null);
  const [isOpenProfitModal, setIsOpenProfitModal] = useState(false);

  const [isOpenSOModal, setIsOpenSOModal] = useState(false);

  // Excel Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importModule, setImportModule] = useState<ImportModuleType>('sales-orders');

  const openImport = (module: ImportModuleType = 'sales-orders') => {
    setImportModule(module);
    setIsImportModalOpen(true);
  };

  // Counts for sidebar badges
  const pendingOrders = salesOrders.filter(s => !s.allocated && s.converted === 'YES').length;
  const pendingTrips = trips.filter(t => t.dispatch_status === 'PENDING').length;
  const pendingMF = trips.filter(t => t.dispatch_status === 'DISPATCHED' && !moneyFreights.some(m => m.so_id === t.so_id)).length;
  const pendingAccounts = accounts.filter(a => a.overall_status !== 'COMPLETED').length;

  // Inter-module routing helpers
  const handleAllocateVehicle = (so: SalesOrder) => {
    setTargetSOForAlloc(so);
    setActiveTab('trip-allocation');
    setIsOpenAllocModal(true);
  };

  const handleProceedToDispatch = (trip: TripDispatch) => {
    setTargetTripForDoc(trip);
    setActiveTab('dispatch');
    setIsOpenDocModal(true);
  };

  const handleCreateMF = (trip: TripDispatch) => {
    setTargetTripForMF(trip);
    setActiveTab('money-freight');
    setIsOpenMFModal(true);
  };

  const handleProceedToUnloading = (mf: MoneyFreight) => {
    setTargetMFForUnloading(mf);
    setActiveTab('unloading');
    setIsOpenUnloadingModal(true);
  };

  const handleProceedToProfit = (mf: MoneyFreight) => {
    setTargetMFForProfit(mf);
    setActiveTab('profit');
    setIsOpenProfitModal(true);
  };

  return (
    <div className={`flex min-h-screen ${themeStyles.appBg} transition-colors duration-200`}>
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        themeStyles={themeStyles}
        counts={{
          pendingOrders,
          pendingTrips,
          pendingMF,
          pendingAccounts
        }}
        isOpen={isMobileNavOpen}
        setIsOpen={setIsMobileNavOpen}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          activeTab={activeTab}
          theme={theme}
          setTheme={store.setTheme}
          currentUser={currentUser}
          users={users}
          setCurrentUser={store.setCurrentUser}
          onLogout={store.logout}
          themeStyles={themeStyles}
          onOpenMobileMenu={() => setIsMobileNavOpen(true)}
          onResetData={store.resetAllData}
          onOpenImport={() => openImport(
            activeTab === 'trip-allocation' ? 'trips' :
            activeTab === 'parties' ? 'parties' :
            activeTab === 'places' ? 'places' :
            activeTab === 'brokers' ? 'brokers' : 'sales-orders'
          )}
          store={store}
          onNavigate={setActiveTab}
        />

        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              store={store}
              themeStyles={themeStyles}
              onNavigate={setActiveTab}
              onOpenCreateSO={() => {
                setActiveTab('sales-orders');
                setIsOpenSOModal(true);
              }}
            />
          )}

          {activeTab === 'master-report' && (
            <MasterReportView
              store={store}
              themeStyles={themeStyles}
            />
          )}

          {activeTab === 'sales-orders' && (
            <SalesOrderView
              store={store}
              themeStyles={themeStyles}
              onAllocateVehicle={handleAllocateVehicle}
              isOpenModal={isOpenSOModal}
              setIsOpenModal={setIsOpenSOModal}
            />
          )}

          {/* Vehicle Allocation - Stage 1 */}
          {activeTab === 'trip-allocation' && (
            <VehicleAllocationView
              store={store}
              themeStyles={themeStyles}
              onProceedToDispatch={handleProceedToDispatch}
              allocatedSOForModal={targetSOForAlloc}
              isOpenAllocModal={isOpenAllocModal}
              setIsOpenAllocModal={setIsOpenAllocModal}
              onOpenImport={() => openImport('trips')}
            />
          )}

          {/* Dispatch & Documentation - Stage 2 */}
          {activeTab === 'dispatch' && (
            <DispatchDocView
              store={store}
              themeStyles={themeStyles}
              onCreateMF={handleCreateMF}
              selectedTripForDoc={targetTripForDoc}
              isOpenDocModal={isOpenDocModal}
              setIsOpenDocModal={setIsOpenDocModal}
            />
          )}

          {/* Money Freight (MF) - Stage 3 */}
          {activeTab === 'money-freight' && (
            <MoneyFreightView
              store={store}
              themeStyles={themeStyles}
              onProceedToUnloading={handleProceedToUnloading}
              onProceedToProfit={handleProceedToProfit}
              isOpenModal={isOpenMFModal}
              setIsOpenModal={setIsOpenMFModal}
              selectedTripForMF={targetTripForMF}
            />
          )}

          {/* Unloading Master - Stage 4 */}
          {activeTab === 'unloading' && (
            <UnloadingView
              store={store}
              themeStyles={themeStyles}
              onProceedToProfit={handleProceedToProfit}
              isOpenModal={isOpenUnloadingModal}
              setIsOpenModal={setIsOpenUnloadingModal}
              selectedMFForUnloading={targetMFForUnloading}
            />
          )}

          {/* Profit & Margin - Stage 5 */}
          {activeTab === 'profit' && (
            <ProfitReportView
              store={store}
              themeStyles={themeStyles}
              isOpenModal={isOpenProfitModal}
              setIsOpenModal={setIsOpenProfitModal}
              selectedMFForProfit={targetMFForProfit}
            />
          )}

          {/* Transporter Settlements - Stage 6 */}
          {activeTab === 'account' && (
            <AccountView store={store} themeStyles={themeStyles} />
          )}

          {/* Complete Transport Reports Hub */}
          {activeTab === 'reports' && (
            <ReportsHubView store={store} themeStyles={themeStyles} />
          )}

          {/* System Masters */}
          {['parties', 'places', 'brokers', 'cards', 'users'].includes(activeTab) && (
            <MastersView
              store={store}
              themeStyles={themeStyles}
              subType={activeTab as any}
            />
          )}
        </main>
      </div>

      {/* Universal Excel & CSV Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        themeStyles={themeStyles}
        store={store}
        defaultModule={importModule}
      />

      {/* Authentication Login Screen */}
      {!store.state.isAuthenticated && (
        <LoginModal
          onLogin={store.login}
          themeStyles={themeStyles}
        />
      )}
    </div>
  );
};

export default App;
