import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

const App = () => {
  return (
    <div className="min-h-screen bg-logistics-base text-logistics-text flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Logistics OS</h1>
        <p className="text-slate-400">Frontend Design System Initialized</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-logistics-safe rounded-lg text-base font-bold">SAFE</div>
          <div className="p-4 bg-logistics-warning rounded-lg text-base font-bold">WARN</div>
          <div className="p-4 bg-logistics-critical rounded-lg text-base font-bold">CRIT</div>
        </div>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
