import React, { useState } from 'react';
import { Settings, Save, ExternalLink } from 'lucide-react';

interface WebhookSettingsProps {
  webhookUrl: string;
  onWebhookUrlChange: (url: string) => void;
}

export const WebhookSettings: React.FC<WebhookSettingsProps> = ({
  webhookUrl,
  onWebhookUrlChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempUrl, setTempUrl] = useState(webhookUrl);

  const handleSave = () => {
    onWebhookUrlChange(tempUrl);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempUrl(webhookUrl);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Settings size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Webhook Configuration</h3>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="webhook-url" className="block text-sm font-medium text-gray-700 mb-2">
              n8n Webhook URL
            </label>
            <input
              id="webhook-url"
              type="url"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              placeholder="https://your-n8n-instance.com/webhook/consultation"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Save size={16} />
              <span>Save</span>
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Current webhook URL:</p>
          {webhookUrl ? (
            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
              <ExternalLink size={16} className="text-gray-500 flex-shrink-0" />
              <p className="text-sm font-mono text-gray-800 break-all">{webhookUrl}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No webhook URL configured</p>
          )}
        </div>
      )}
    </div>
  );
};