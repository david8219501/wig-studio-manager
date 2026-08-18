import { useState } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import Dashboard from './pages/Dashboard/Dashboard';
import Clients from './pages/Clients/Clients';
import Inventory from './pages/Inventory/Inventory';
import Calculators from './pages/Calculators/Calculators';
import Sales from './pages/Sales/Sales';
import Expenses from './pages/Expenses/Expenses';
import Reports from './pages/Reports/Reports';
import Settings from './pages/Settings/Settings';
import './App.css';

function App() {
  // ניהול המצב של העמוד הנוכחי - ברירת המחדל היא לוח הבקרה
  const [activePage, setActivePage] = useState('dashboard');

  // פונקציה שמחזירה את הרכיב המתאים לפי ה-id שנבחר בסיידבר
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'clients':
        return <Clients />;
      case 'inventory':
        return <Inventory />;
      case 'calculators':
        return <Calculators />;
      case 'sales':
        return <Sales />;
      case 'expenses':
        return <Expenses />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      {/* הסיידבר מקבל את העמוד הפעיל ואת פונקציית הניווט שמעדכנת את ה-State */}
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      
      <main className="main-content">
        <header className="top-bar">
          <h1>מערכת ניהול - Esti Wigs</h1>
        </header>
        
        <div className="content-area">
          {/* כאן מוצג ה-Component של העמוד שנבחר בזמן אמת */}
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;