import { useState } from 'react';
import { Plus, Trash2, ArrowRight, Save, Play, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const ApprovalWorkflowDesigner = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [workflow, setWorkflow] = useState({
    name: '',
    description: '',
    steps: [
      { id: 1, type: 'approval', role: 'Department Head', condition: null },
      { id: 2, type: 'approval', role: 'Pastor', condition: null }
    ]
  });
  const [saving, setSaving] = useState(false);

  const addStep = () => {
    const newStep = {
      id: workflow.steps.length + 1,
      type: 'approval',
      role: 'Super Admin',
      condition: null
    };
    setWorkflow({ ...workflow, steps: [...workflow.steps, newStep] });
  };

  const removeStep = (stepId) => {
    setWorkflow({
      ...workflow,
      steps: workflow.steps.filter(step => step.id !== stepId)
    });
  };

  const updateStep = (stepId, field, value) => {
    setWorkflow({
      ...workflow,
      steps: workflow.steps.map(step =>
        step.id === stepId ? { ...step, [field]: value } : step
      )
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/approvals/workflows', workflow);
      toast.success('Workflow saved successfully');
    } catch (error) {
      toast.error('Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Workflow Designer</h2>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 disabled:bg-[var(--color-surface)]"
            aria-label="Save workflow"
            aria-busy={saving}
          >
            <Save size={20} aria-hidden="true" />
            {saving ? 'Saving...' : 'Save Workflow'}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700" aria-label="Test workflow">
            <Play size={20} aria-hidden="true" />
            Test Workflow
          </button>
        </div>
      </div>

      {/* Workflow Details */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="workflow-name">Workflow Name</label>
          <input
            id="workflow-name"
            type="text"
            value={workflow.name}
            onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
            placeholder="Enter workflow name"
            className="w-full p-2 border rounded-lg"
            aria-label="Workflow name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="workflow-description">Description</label>
          <textarea
            id="workflow-description"
            value={workflow.description}
            onChange={(e) => setWorkflow({ ...workflow, description: e.target.value })}
            placeholder="Describe the workflow purpose"
            className="w-full p-2 border rounded-lg h-24 resize-none"
            aria-label="Workflow description"
          />
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Approval Steps</h3>
        {workflow.steps.map((step, index) => (
          <div key={step.id} className="bg-[var(--color-surface)] border rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600 rounded-full flex items-center justify-center font-bold" aria-label={`Step ${index + 1}`}>
                {index + 1}
              </div>
              {index < workflow.steps.length - 1 && (
                <ArrowRight className="text-[var(--color-textSecondary)]" size={20} aria-hidden="true" />
              )}
              <div className="flex-1 grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" htmlFor={`step-type-${step.id}`}>Step Type</label>
                  <select
                    id={`step-type-${step.id}`}
                    value={step.type}
                    onChange={(e) => updateStep(step.id, 'type', e.target.value)}
                    className="w-full p-2 border rounded-lg"
                    aria-label={`Step ${index + 1} type`}
                  >
                    <option value="approval">Approval</option>
                    <option value="notification">Notification</option>
                    <option value="condition">Condition</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" htmlFor={`step-role-${step.id}`}>Role</label>
                  <select
                    id={`step-role-${step.id}`}
                    value={step.role}
                    onChange={(e) => updateStep(step.id, 'role', e.target.value)}
                    className="w-full p-2 border rounded-lg"
                    aria-label={`Step ${index + 1} role`}
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Pastor">Pastor</option>
                    <option value="Department Head">Department Head</option>
                    <option value="Treasurer">Treasurer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" htmlFor={`step-condition-${step.id}`}>Condition (Optional)</label>
                  <input
                    id={`step-condition-${step.id}`}
                    type="text"
                    value={step.condition || ''}
                    onChange={(e) => updateStep(step.id, 'condition', e.target.value)}
                    placeholder="e.g., amount > 10000"
                    className="w-full p-2 border rounded-lg"
                    aria-label={`Step ${index + 1} condition`}
                  />
                </div>
              </div>
              <button
                onClick={() => removeStep(step.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
                aria-label={`Remove step ${index + 1}`}
              >
                <Trash2 size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={addStep}
          className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)]-500 hover:text-[var(--color-primary)]-500"
          aria-label="Add new workflow step"
        >
          <Plus size={20} aria-hidden="true" />
          Add Step
        </button>
      </div>

      {/* Workflow Settings */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings size={20} aria-hidden="true" />
          <h3 className="font-semibold">Workflow Settings</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="workflow-timeout">Timeout (hours)</label>
            <input
              id="workflow-timeout"
              type="number"
              defaultValue="24"
              className="w-full p-2 border rounded-lg"
              aria-label="Workflow timeout in hours"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="workflow-escalation">Escalation Role</label>
            <select id="workflow-escalation" className="w-full p-2 border rounded-lg" aria-label="Workflow escalation role">
              <option value="">No escalation</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Pastor">Pastor</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalWorkflowDesigner;
