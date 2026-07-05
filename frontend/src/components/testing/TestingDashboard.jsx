import { useState, useEffect } from 'react';
import { Play, CheckCircle, XCircle, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const TestingDashboard = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [testResults, setTestResults] = useState({
    unit: { passed: 0, failed: 0, total: 0 },
    integration: { passed: 0, failed: 0, total: 0 },
    e2e: { passed: 0, failed: 0, total: 0 }
  });
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);

  useEffect(() => {
    fetchTestResults();
  }, []);

  const fetchTestResults = async () => {
    try {
      const response = await api.get('/testing/results');
      setTestResults(response.data.results || testResults);
      setLastRun(response.data.lastRun);
    } catch (error) {
      console.error('Failed to fetch test results:', error);
    }
  };

  const runTests = async (type) => {
    setRunning(true);
    try {
      const response = await api.post(`/testing/run/${type}`);
      setTestResults(response.data.results);
      setLastRun(new Date());
      toast.success(`${type} tests completed`);
    } catch (error) {
      toast.error(`Failed to run ${type} tests`);
    } finally {
      setRunning(false);
    }
  };

  const runAllTests = async () => {
    setRunning(true);
    try {
      await Promise.all([
        runTests('unit'),
        runTests('integration'),
        runTests('e2e')
      ]);
      toast.success('All tests completed');
    } catch (error) {
      toast.error('Some tests failed');
    } finally {
      setRunning(false);
    }
  };

  const totalTests = testResults.unit.total + testResults.integration.total + testResults.e2e.total;
  const totalPassed = testResults.unit.passed + testResults.integration.passed + testResults.e2e.passed;
  const totalFailed = testResults.unit.failed + testResults.integration.failed + testResults.e2e.failed;
  const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Testing Dashboard</h2>
        <button
          onClick={runAllTests}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 disabled:bg-[var(--color-surface)]"
        >
          <Play size={16} />
          {running ? 'Running...' : 'Run All Tests'}
        </button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--color-textSecondary)] mb-2">
            <TrendingUp size={16} />
            <span className="text-sm">Total Tests</span>
          </div>
          <div className="text-2xl font-bold">{totalTests}</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle size={16} />
            <span className="text-sm">Passed</span>
          </div>
          <div className="text-2xl font-bold">{totalPassed}</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <XCircle size={16} />
            <span className="text-sm">Failed</span>
          </div>
          <div className="text-2xl font-bold">{totalFailed}</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--color-primary)]-600 mb-2">
            <TrendingUp size={16} />
            <span className="text-sm">Pass Rate</span>
          </div>
          <div className="text-2xl font-bold">{passRate}%</div>
        </div>
      </div>

      {/* Test Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--color-surface)] border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Unit Tests</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-[var(--color-textSecondary)]">Total</span>
              <span className="font-medium">{testResults.unit.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">Passed</span>
              <span className="font-medium">{testResults.unit.passed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-600">Failed</span>
              <span className="font-medium">{testResults.unit.failed}</span>
            </div>
            <button
              onClick={() => runTests('unit')}
              disabled={running}
              className="w-full py-2 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface)] disabled:bg-[var(--color-surface)]"
            >
              Run Unit Tests
            </button>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Integration Tests</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-[var(--color-textSecondary)]">Total</span>
              <span className="font-medium">{testResults.integration.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">Passed</span>
              <span className="font-medium">{testResults.integration.passed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-600">Failed</span>
              <span className="font-medium">{testResults.integration.failed}</span>
            </div>
            <button
              onClick={() => runTests('integration')}
              disabled={running}
              className="w-full py-2 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface)] disabled:bg-[var(--color-surface)]"
            >
              Run Integration Tests
            </button>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] border rounded-lg p-6">
          <h3 className="font-semibold mb-4">E2E Tests</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-[var(--color-textSecondary)]">Total</span>
              <span className="font-medium">{testResults.e2e.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">Passed</span>
              <span className="font-medium">{testResults.e2e.passed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-600">Failed</span>
              <span className="font-medium">{testResults.e2e.failed}</span>
            </div>
            <button
              onClick={() => runTests('e2e')}
              disabled={running}
              className="w-full py-2 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface)] disabled:bg-[var(--color-surface)]"
            >
              Run E2E Tests
            </button>
          </div>
        </div>
      </div>

      {/* Last Run Info */}
      {lastRun && (
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--color-textSecondary)]">
            <Clock size={16} />
            <span>Last run: {new Date(lastRun).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestingDashboard;
