import { useState } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle, Users, Calendar, Clock, Target, DollarSign, FileText, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const CampaignWizard = ({ onComplete, onCancel }) => {
  const { api } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [campaignData, setCampaignData] = useState({
    name: '',
    templateId: '',
    targetAudience: 'all',
    targetSegments: [],
    scheduledDate: '',
    scheduledTime: '',
    budget: 0,
    enableABTest: false,
    variantContent: ''
  });

  const steps = [
    { id: 1, title: 'Basic Info', icon: FileText },
    { id: 2, title: 'Targeting', icon: Users },
    { id: 3, title: 'Schedule', icon: Calendar },
    { id: 4, title: 'Budget', icon: DollarSign },
    { id: 5, title: 'Review', icon: CheckCircle }
  ];

  const handleNext = () => {
    if (step < steps.length) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      const response = await api.post('/sms/campaigns', campaignData);
      toast.success('Campaign created successfully');
      onComplete(response.data.campaign);
    } catch (error) {
      toast.error('Failed to create campaign');
    }
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Create Campaign</h2>
        <button onClick={onCancel} className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]">Cancel</button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((s, idx) => (
          <div key={s.id} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              step === s.id ? 'bg-[var(--color-primary)]-600 text-white' :
              step > s.id ? 'bg-[var(--color-surface)] text-[var(--color-textSecondary)]' :
              'bg-green-600 text-white'
            }`}>
              {step > s.id ? <CheckCircle size={20} /> : <s.icon size={20} />}
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-16 h-1 mx-2 ${
                step > s.id ? 'bg-green-600' : 'bg-[var(--color-surface)]'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="mb-6">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText size={20} />
              Basic Information
            </h3>
            <div>
              <label className="block text-sm font-medium mb-2">Campaign Name</label>
              <input
                type="text"
                value={campaignData.name}
                onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="Enter campaign name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Template</label>
              <select
                value={campaignData.templateId}
                onChange={(e) => setCampaignData({ ...campaignData, templateId: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Select a template...</option>
                <option value="1">Welcome Message</option>
                <option value="2">Event Reminder</option>
                <option value="3">Weekly Announcement</option>
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users size={20} />
              Target Audience
            </h3>
            <div>
              <label className="block text-sm font-medium mb-2">Audience Type</label>
              <select
                value={campaignData.targetAudience}
                onChange={(e) => setCampaignData({ ...campaignData, targetAudience: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="all">All Members</option>
                <option value="active">Active Members</option>
                <option value="new">New Members</option>
                <option value="inactive">Inactive Members</option>
                <option value="custom">Custom Segments</option>
              </select>
            </div>
            {campaignData.targetAudience === 'custom' && (
              <div>
                <label className="block text-sm font-medium mb-2">Select Segments</label>
                <div className="space-y-2">
                  {['Sabbath School', 'Youth Ministry', 'Music Ministry', 'Community Outreach'].map(segment => (
                    <label key={segment} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={campaignData.targetSegments.includes(segment)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCampaignData({
                              ...campaignData,
                              targetSegments: [...campaignData.targetSegments, segment]
                            });
                          } else {
                            setCampaignData({
                              ...campaignData,
                              targetSegments: campaignData.targetSegments.filter(s => s !== segment)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span>{segment}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar size={20} />
              Schedule
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={campaignData.scheduledDate}
                  onChange={(e) => setCampaignData({ ...campaignData, scheduledDate: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Time</label>
                <input
                  type="time"
                  value={campaignData.scheduledTime}
                  onChange={(e) => setCampaignData({ ...campaignData, scheduledTime: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-[var(--color-primary)]-50 rounded-lg">
              <Clock size={16} className="text-[var(--color-primary)]-600" />
              <span className="text-sm text-[var(--color-primary)]-700">Best send time: 10:00 AM - 12:00 PM (based on analytics)</span>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign size={20} />
              Budget
            </h3>
            <div>
              <label className="block text-sm font-medium mb-2">Total Budget (KES)</label>
              <input
                type="number"
                value={campaignData.budget}
                onChange={(e) => setCampaignData({ ...campaignData, budget: parseFloat(e.target.value) })}
                className="w-full p-2 border rounded-lg"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Estimated Cost</label>
              <div className="p-3 bg-[var(--color-background)] rounded-lg">
                <div className="text-sm text-[var(--color-textSecondary)]">Based on recipient count and message length</div>
                <div className="text-2xl font-bold">KES {(campaignData.budget * 0.45).toFixed(2)}</div>
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={campaignData.enableABTest}
                onChange={(e) => setCampaignData({ ...campaignData, enableABTest: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Enable A/B Testing</span>
            </label>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle size={20} />
              Review & Launch
            </h3>
            <div className="bg-[var(--color-background)] rounded-lg p-4 space-y-3">
              <div>
                <div className="text-sm text-[var(--color-textSecondary)]">Campaign Name</div>
                <div className="font-medium">{campaignData.name}</div>
              </div>
              <div>
                <div className="text-sm text-[var(--color-textSecondary)]">Target Audience</div>
                <div className="font-medium">{campaignData.targetAudience}</div>
              </div>
              <div>
                <div className="text-sm text-[var(--color-textSecondary)]">Schedule</div>
                <div className="font-medium">{campaignData.scheduledDate} at {campaignData.scheduledTime}</div>
              </div>
              <div>
                <div className="text-sm text-[var(--color-textSecondary)]">Budget</div>
                <div className="font-medium">KES {campaignData.budget}</div>
              </div>
              {campaignData.enableABTest && (
                <div className="flex items-center gap-2 text-purple-600">
                  <Sparkles size={16} />
                  <span className="text-sm">A/B Testing Enabled</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-[var(--color-background)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        {step === steps.length ? (
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
          >
            <CheckCircle size={16} />
            Create Campaign
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
          >
            Next
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default CampaignWizard;
