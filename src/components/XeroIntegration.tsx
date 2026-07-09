import React, { useState, useEffect } from 'react';
import { Quote } from '../types';
import { getXeroInstance, convertQuoteToXero } from '../utils/xeroIntegration';
import { X, ExternalLink, Settings, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface XeroIntegrationProps {
  quote: Quote;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (xeroQuoteId: string) => void;
}

export const XeroIntegration: React.FC<XeroIntegrationProps> = ({
  quote,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [xeroInstance] = useState(() => getXeroInstance());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tenants, setTenants] = useState<Array<{ tenantId: string; tenantName: string }>>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [unitAmount, setUnitAmount] = useState<number>(100);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    clientId: '',
    clientSecret: ''
  });

  useEffect(() => {
    if (isOpen) {
      checkAuthStatus();
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = () => {
    const xeroConfig = xeroInstance.getConfig();
    setConfig({
      clientId: xeroConfig.clientId || '',
      clientSecret: xeroConfig.clientSecret || ''
    });
  };

  const checkAuthStatus = async () => {
    setIsAuthenticated(xeroInstance.isAuthenticated());
    
    if (xeroInstance.isAuthenticated()) {
      try {
        const tenantList = await xeroInstance.getTenants();
        setTenants(tenantList);
        
        const currentConfig = xeroInstance.getConfig();
        if (currentConfig.tenantId) {
          setSelectedTenant(currentConfig.tenantId);
        }
      } catch (error) {
        setError('Failed to load Xero organizations. Please re-authenticate.');
        setIsAuthenticated(false);
      }
    }
  };

  const handleAuthenticate = () => {
    if (!config.clientId || !config.clientSecret) {
      setError('Please configure your Xero API credentials first.');
      setShowConfig(true);
      return;
    }

    // Update the Xero instance with new config
    const xeroConfig = xeroInstance.getConfig();
    xeroConfig.clientId = config.clientId;
    xeroConfig.clientSecret = config.clientSecret;
    localStorage.setItem('xero-config', JSON.stringify(xeroConfig));

    // Redirect to Xero authorization
    const authUrl = xeroInstance.getAuthorizationUrl();
    window.open(authUrl, '_blank', 'width=600,height=600');
    
    // Listen for the callback
    const checkCallback = setInterval(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code) {
        clearInterval(checkCallback);
        handleAuthCallback(code);
      }
    }, 1000);

    // Clear interval after 5 minutes
    setTimeout(() => clearInterval(checkCallback), 5 * 60 * 1000);
  };

  const handleAuthCallback = async (code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await xeroInstance.exchangeCodeForTokens(code);
      await checkAuthStatus();
      setSuccess('Successfully connected to Xero!');
    } catch (error) {
      setError(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTenantSelect = (tenantId: string) => {
    setSelectedTenant(tenantId);
    xeroInstance.setTenantId(tenantId);
  };

  const handleSendToXero = async () => {
    if (!selectedTenant) {
      setError('Please select a Xero organization first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const xeroQuote = convertQuoteToXero(quote, unitAmount);
      const result = await xeroInstance.createQuote(xeroQuote);
      
      setSuccess(`Quote successfully created in Xero! Quote ID: ${result.QuoteID}`);
      
      if (onSuccess) {
        onSuccess(result.QuoteID);
      }
    } catch (error) {
      setError(`Failed to send quote to Xero: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = () => {
    const xeroConfig = xeroInstance.getConfig();
    xeroConfig.clientId = config.clientId;
    xeroConfig.clientSecret = config.clientSecret;
    localStorage.setItem('xero-config', JSON.stringify(xeroConfig));
    setShowConfig(false);
    setSuccess('Configuration saved successfully!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[var(--ink)] rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">X</span>
            </div>
            <h2 className="text-xl font-semibold">Send Quote to Xero</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title="Configure Xero API"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Configuration Panel */}
          {showConfig && (
            <div className="bg-[var(--surface-overlay)] p-4 rounded-lg space-y-4">
              <h3 className="font-medium text-[var(--text-primary)]">Xero API Configuration</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={config.clientId}
                    onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                    placeholder="Your Xero app Client ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Client Secret
                  </label>
                  <input
                    type="password"
                    value={config.clientSecret}
                    onChange={(e) => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                    placeholder="Your Xero app Client Secret"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveConfig}
                    className="px-4 py-2 bg-[var(--ink)] text-[var(--cream)] rounded-lg hover:bg-[var(--accent)] transition-colors"
                  >
                    Save Configuration
                  </button>
                  <a
                    href="https://developer.xero.com/app/manage"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-overlay)] transition-colors"
                  >
                    <ExternalLink size={16} />
                    Xero Developer Portal
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Authentication Status */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--surface-overlay)]">
            {isAuthenticated ? (
              <>
                <CheckCircle className="text-[var(--accent)]" size={24} />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Connected to Xero</p>
                  <p className="text-sm text-[var(--accent)]">Ready to send quotes</p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="text-[var(--text-secondary)]" size={24} />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Not connected to Xero</p>
                  <p className="text-sm text-[var(--text-secondary)]">Authentication required</p>
                </div>
                <button
                  onClick={handleAuthenticate}
                  disabled={isLoading}
                  className="ml-auto px-4 py-2 bg-[var(--ink)] text-[var(--cream)] rounded-lg hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader className="animate-spin" size={16} /> : 'Connect to Xero'}
                </button>
              </>
            )}
          </div>

          {/* Tenant Selection */}
          {isAuthenticated && tenants.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Select Xero Organization
              </label>
              <select
                value={selectedTenant}
                onChange={(e) => handleTenantSelect(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              >
                <option value="" className="bg-[var(--surface)] text-[var(--text-primary)]">Select an organization...</option>
                {tenants.map(tenant => (
                  <option key={tenant.tenantId} value={tenant.tenantId} className="bg-[var(--surface)] text-[var(--text-primary)]">
                    {tenant.tenantName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quote Preview */}
          <div className="border border-[var(--border)] rounded-lg p-4">
            <h3 className="font-medium text-[var(--text-primary)] mb-3">Quote Preview</h3>
            <div className="space-y-2 text-sm">
              <div><strong>Client:</strong> {quote.clientName}</div>
              <div><strong>Address:</strong> {quote.address}</div>
              <div><strong>Mobile:</strong> {quote.mobile}</div>
              <div><strong>Scheduled:</strong> {new Date(quote.scheduledDate).toLocaleDateString()} at {quote.scheduledTime}</div>
              <div>
                <strong>Services:</strong>
                <ul className="mt-1 ml-4 list-disc">
                  {quote.jobDescription.map((item, index) => (
                    <li key={index}>{item.description}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Unit Amount Configuration */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Default Unit Amount (per service)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">$</span>
              <input
                type="number"
                value={unitAmount || ''}
                onChange={(e) => setUnitAmount(parseFloat(e.target.value) || 0)}
                className="w-32 px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                min="0"
                step="0.01"
              />
              <span className="text-sm text-[var(--text-muted)]">
                Total estimate: ${(unitAmount * quote.jobDescription.length).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="p-4 bg-[rgba(179,67,61,0.08)] border border-[rgba(179,67,61,0.25)] rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-[var(--danger)]" size={20} />
                <p className="text-[var(--danger)]">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="p-4 bg-[var(--accent-soft)] border border-[var(--accent-soft-strong)] rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-[var(--accent)]" size={20} />
                <p className="text-[var(--accent)]">{success}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-overlay)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSendToXero}
              disabled={!isAuthenticated || !selectedTenant || isLoading}
              className="flex-1 px-4 py-2 bg-[var(--ink)] text-[var(--cream)] rounded-lg hover:bg-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  Sending...
                </>
              ) : (
                'Send to Xero'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};