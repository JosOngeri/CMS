import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Download, RefreshCw, Bell, Home, Smartphone } from 'lucide-react';

const PWAInstaller = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check if PWA is installed
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);

    // Check online status
    setIsOnline(navigator.onLine);
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));

    // Listen for beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">PWA Features</h2>

      {/* PWA Status */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Smartphone className="text-[var(--color-primary)]-600" size={24} />
            <h3 className="font-semibold">PWA Status</h3>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <div className="flex items-center gap-1 text-green-600">
                <Wifi size={16} />
                <span>Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-600">
                <WifiOff size={16} />
                <span>Offline</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[var(--color-background)] p-4 rounded-lg">
            <div className="text-sm text-[var(--color-textSecondary)] mb-1">Installed</div>
            <div className="font-semibold">{isInstalled ? 'Yes' : 'No'}</div>
          </div>
          <div className="bg-[var(--color-background)] p-4 rounded-lg">
            <div className="text-sm text-[var(--color-textSecondary)] mb-1">Service Worker</div>
            <div className="font-semibold">Active</div>
          </div>
        </div>

        {!isInstalled && deferredPrompt && (
          <button
            onClick={handleInstall}
            className="w-full py-3 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 flex items-center justify-center gap-2"
          >
            <Download size={20} />
            Install App
          </button>
        )}
      </div>

      {/* Offline Capabilities */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="text-purple-600" size={20} />
          <h3 className="font-semibold">Offline Capabilities</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-[var(--color-background)] rounded-lg">
            <span>Offline data sync</span>
            <span className="text-green-600">Enabled</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-[var(--color-background)] rounded-lg">
            <span>Background sync</span>
            <span className="text-green-600">Enabled</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-[var(--color-background)] rounded-lg">
            <span>Push notifications</span>
            <span className="text-green-600">Enabled</span>
          </div>
        </div>
      </div>

      {/* Cache Management */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw size={20} />
          <h3 className="font-semibold">Cache Management</h3>
        </div>
        <button
          onClick={() => {
            if ('caches' in window) {
              caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
              });
            }
          }}
          className="px-4 py-2 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface)]"
        >
          Clear Cache
        </button>
      </div>
    </div>
  );
};

export default PWAInstaller;
