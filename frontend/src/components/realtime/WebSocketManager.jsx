import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Users, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const WebSocketManager = () => {
  const { api } = useAuth();
  const { error: toastError } = useToast();
  const [connected, setConnected] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [roomsResponse, statsResponse] = await Promise.all([
        api.get('/api/chat/rooms').catch(() => ({ data: { data: [] } })),
        api.get('/api/dashboard/stats').catch(() => ({ data: { data: {} } }))
      ]);

      const fetchedRooms = roomsResponse.data?.data || [];
      const stats = statsResponse.data?.data || {};

      setRooms(fetchedRooms.map(room => room.name || room.id || 'Unknown'));
      setActiveUsers(stats.activeUsers || 0);
      setConnected(true);
    } catch (error) {
      setConnected(false);
      toastError('Failed to load real-time connection data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">WebSocket Manager</h2>

      <div className="bg-[var(--color-surface)] border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {connected ? (
              <Wifi className="text-green-600" size={24} />
            ) : (
              <WifiOff className="text-red-600" size={24} />
            )}
            <div>
              <div className="font-semibold">{connected ? 'Connected' : 'Disconnected'}</div>
              <div className="text-sm text-[var(--color-textSecondary)]">Real-time connection status</div>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border rounded-lg hover:bg-[var(--color-background)] disabled:opacity-50"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-[var(--color-background)] p-4 rounded-lg">
            <div className="flex items-center gap-2 text-[var(--color-textSecondary)] mb-2">
              <Users size={16} />
              <span className="text-sm">Active Users</span>
            </div>
            <div className="text-2xl font-bold">{activeUsers}</div>
          </div>
          <div className="bg-[var(--color-background)] p-4 rounded-lg">
            <div className="flex items-center gap-2 text-[var(--color-textSecondary)] mb-2">
              <MessageSquare size={16} />
              <span className="text-sm">Active Rooms</span>
            </div>
            <div className="text-2xl font-bold">{rooms.length}</div>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-semibold mb-2">Active Rooms</h3>
          <div className="space-y-2">
            {rooms.length > 0 ? rooms.map((room, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-background)] rounded-lg">
                <span className="font-medium">{room}</span>
                <span className="text-sm text-green-600">Active</span>
              </div>
            )) : (
              <p className="text-[var(--color-textSecondary)]">No active rooms found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebSocketManager;
