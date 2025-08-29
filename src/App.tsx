import React, { useState, useEffect } from 'react';
import { Stethoscope } from 'lucide-react';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { RecordingControls } from './components/RecordingControls';
import { Timer } from './components/Timer';
import { StatusMessage } from './components/StatusMessage';
import { WebhookSettings } from './components/WebhookSettings';
import { AudioVisualizer } from './components/AudioVisualizer';
import { sendToWebhook } from './services/webhookService';

function App() {
  const {
    recordingState,
    duration,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    error: recordingError,
  } = useAudioRecorder();

  const [webhookUrl, setWebhookUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  // Load webhook URL from localStorage
  useEffect(() => {
    const savedUrl = localStorage.getItem('webhook-url');
    if (savedUrl) {
      setWebhookUrl(savedUrl);
    }
  }, []);

  // Save webhook URL to localStorage
  const handleWebhookUrlChange = (url: string) => {
    setWebhookUrl(url);
    localStorage.setItem('webhook-url', url);
  };

  const handleStopRecording = async () => {
    if (!webhookUrl.trim()) {
      setUploadStatus({
        type: 'error',
        message: 'Please configure the webhook URL before recording.',
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadStatus({ type: null, message: '' });

      const audioBlob = await stopRecording();
      
      if (!audioBlob) {
        throw new Error('Failed to generate audio recording');
      }

      await sendToWebhook(audioBlob, duration, webhookUrl);
      
      setUploadStatus({
        type: 'success',
        message: 'Recording sent successfully to n8n webhook.',
      });

      // Clear success message after 5 seconds
      setTimeout(() => {
        setUploadStatus({ type: null, message: '' });
      }, 5000);

    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: 'Failed to send recording. Please check your connection and try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Stethoscope size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Medical Voice Recorder</h1>
              <p className="text-sm text-gray-600">Professional consultation recording system</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Recording Section */}
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Voice Recording</h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                Click the button below to start recording your medical consultation. 
                You can pause and resume as needed during the session.
              </p>
            </div>

            {/* Timer */}
            <Timer duration={duration} isActive={recordingState === 'recording'} />

            {/* Audio Visualizer */}
            <AudioVisualizer recordingState={recordingState} />

            {/* Recording Controls */}
            <RecordingControls
              recordingState={recordingState}
              onStart={startRecording}
              onPause={pauseRecording}
              onResume={resumeRecording}
              onStop={handleStopRecording}
              disabled={isUploading}
            />

            {/* Status Messages */}
            <div className="space-y-3">
              {recordingError && (
                <StatusMessage type="error" message={recordingError} />
              )}
              
              {isUploading && (
                <StatusMessage type="loading" message="Sending recording to n8n webhook..." />
              )}
              
              {uploadStatus.type && (
                <StatusMessage type={uploadStatus.type} message={uploadStatus.message} />
              )}
            </div>
          </div>

          {/* Settings Section */}
          <div className="space-y-8">
            <WebhookSettings
              webhookUrl={webhookUrl}
              onWebhookUrlChange={handleWebhookUrlChange}
            />

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Use</h3>
              <ol className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start space-x-2">
                  <span className="font-semibold">1.</span>
                  <span>Configure your n8n webhook URL in the settings panel</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="font-semibold">2.</span>
                  <span>Click "Start Recording" to begin the consultation</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="font-semibold">3.</span>
                  <span>Use pause/resume controls as needed during the session</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="font-semibold">4.</span>
                  <span>Click "Stop & Send" to automatically transmit to your workflow</span>
                </li>
              </ol>
            </div>

            {/* Technical Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical Details</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• High-quality audio recording with noise suppression</li>
                <li>• WebM format with Opus codec for optimal compression</li>
                <li>• Base64 encoded transmission for webhook compatibility</li>
                <li>• Automatic metadata inclusion (duration, timestamp)</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;