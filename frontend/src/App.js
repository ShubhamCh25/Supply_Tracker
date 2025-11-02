import React, { useState } from 'react';
import './App.css';
import { ConnectionStatus } from './Constants';
import RoleSelection from './RoleSelection';
import ManufacturerDashboard from './ManufacturerDashboard';
import CustomerDashboard from './CustomerDashboard';

function App() {
  const [loading, setLoading] = useState(false); // 👈 1. RE-ADDED LOADING STATE
  const [account, setAccount] = useState('');
  const [contracts, setContracts] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [role, setRole] = useState('');

  if (!role) {
    return (
      <RoleSelection
        role={role}
        setRole={setRole}
        account={account}
        setAccount={setAccount}
        setContracts={setContracts}
        connectionStatus={connectionStatus}
        setConnectionStatus={setConnectionStatus}
        // NOTE: RoleSelection likely handles its own connection loading, 
        // but if it uses global loading, pass these:
        loading={loading}
        setLoading={setLoading}
      />
    );
  }

  if (role === 'manufacturer') {
    return (
      <ManufacturerDashboard
        account={account}
        contracts={contracts}
        connectionStatus={connectionStatus}
        setRole={setRole}
        // NOTE: Passing loading state is good practice
        loading={loading}
        setLoading={setLoading}
      />
    );
  }

  if (role === 'customer') {
    return (
      <CustomerDashboard
        account={account}
        contracts={contracts}
        connectionStatus={connectionStatus}
        setRole={setRole}
        loading={loading}       
        setLoading={setLoading} 
      />
    );
  }

  return null;
}

export default App;