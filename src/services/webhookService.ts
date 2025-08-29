interface WebhookPayload {
  audioData: string; // base64 encoded audio
  duration: number;
  timestamp: string;
  mimeType: string;
}

export const sendToWebhook = async (audioBlob: Blob, duration: number, webhookUrl: string): Promise<boolean> => {
  try {
    // Convert blob to base64
    const arrayBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
    const base64Audio = btoa(binaryString);

    const payload: WebhookPayload = {
      audioData: base64Audio,
      duration,
      timestamp: new Date().toISOString(),
      mimeType: audioBlob.type,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Failed to send recording to webhook:', error);
    throw error;
  }
};