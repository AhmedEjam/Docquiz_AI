import React, { useState } from 'react';
import { AI_PROVIDERS, getDefaultProviderConfig } from '../../config/aiProviders';

export default function AIConfigPanel({ title, config, setConfig }) {
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [testMsg, setTestMsg] = useState('');

  const handleTestConnection = async () => {
    setTestStatus('loading');
    setTestMsg('');
    try {
      const baseUrl = config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl;
      const headers = {};
      if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;
      
      const res = await fetch(`${baseUrl}/models`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      const count = data.data?.length || 0;
      setTestStatus('ok');
      setTestMsg(`Connected successfully (${count} models found)`);
    } catch (err) {
      setTestStatus('error');
      setTestMsg(`Connection failed: ${err.message}`);
    }
  };

  const handleProviderChange = (e) => {
    const pId = e.target.value;
    const provider = AI_PROVIDERS.find(p => p.id === pId);
    if (!provider) return;

    // Reset config when provider changes to defaults
    setConfig({
      providerId: provider.id,
      baseUrl: provider.defaultBaseUrl,
      apiKey: config.apiKey, // Keep api key in case they switch back and forth, or maybe clear it? Better to keep it, but they might send it elsewhere. Actually, let's keep it.
      model: provider.defaultModel
    });
  };

  const currentProvider = AI_PROVIDERS.find(p => p.id === config.providerId) || AI_PROVIDERS[0];

  return (
    <div className="bg-background-secondary p-4 border border-border-tertiary rounded-lg space-y-4">
      <h3 className="text-sm font-medium border-b border-border-tertiary pb-2">{title || 'AI Configuration'}</h3>

      <div className="space-y-3">
        {/* Provider Select */}
        <div>
          <label className="block text-[10px] font-medium text-text-secondary uppercase mb-1">Provider</label>
          <select 
            value={config.providerId} 
            onChange={handleProviderChange}
            className="w-full p-2 bg-background-primary border border-border-tertiary rounded text-xs focus:outline-none focus:border-border-info"
          >
            {AI_PROVIDERS.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Base URL */}
        <div>
          <label className="block text-[10px] font-medium text-text-secondary uppercase mb-1">API Base URL</label>
          <input 
            type="text" 
            value={config.baseUrl} 
            onChange={e => setConfig({ baseUrl: e.target.value })}
            className="w-full p-2 bg-background-primary border border-border-tertiary rounded text-xs focus:outline-none focus:border-border-info font-mono text-[10px]"
          />
        </div>

        {/* API Key */}
        {currentProvider.requiresKey && (
          <div>
            <label className="block text-[10px] font-medium text-text-secondary uppercase mb-1">API Key</label>
            <div className="relative">
              <input 
                type={showKey ? "text" : "password"} 
                value={config.apiKey} 
                onChange={e => setConfig({ apiKey: e.target.value })}
                placeholder={`Enter ${currentProvider.name} API Key`}
                className="w-full p-2 pr-10 bg-background-primary border border-border-tertiary rounded text-xs focus:outline-none focus:border-border-info font-mono text-[10px]"
              />
              <button 
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-secondary hover:text-text-primary px-1"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-[9px] text-text-secondary mt-1">Stored locally in your browser.</p>
          </div>
        )}

        {/* Model Name */}
        <div>
          <label className="block text-[10px] font-medium text-text-secondary uppercase mb-1">Model Name</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={config.model} 
              onChange={e => setConfig({ model: e.target.value })}
              placeholder={currentProvider.defaultModel}
              className="w-full p-2 bg-background-primary border border-border-tertiary rounded text-xs focus:outline-none focus:border-border-info font-mono text-[10px]"
            />
            <button 
              onClick={handleTestConnection}
              disabled={testStatus === 'loading'}
              className="px-3 py-1 bg-background-primary border border-border-tertiary text-xs rounded hover:bg-background-secondary whitespace-nowrap"
            >
              Test
            </button>
          </div>
          {testStatus && (
            <div className={`text-[10px] mt-2 font-medium ${testStatus === 'ok' ? 'text-green-600' : testStatus === 'error' ? 'text-red-600' : 'text-text-secondary'}`}>
              {testStatus === 'loading' ? 'Testing...' : testMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
