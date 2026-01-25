export async function sendChatMessage({ userId, sessionId, messages, botType = 'general' }) {
  if (!userId) throw new Error('Missing userId');

  const res = await fetch(`/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      session_id: sessionId || null,
      bot_type: botType,
      messages: Array.isArray(messages) ? messages : []
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI chat failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return res.json();
}

export async function fetchSavedSuggestions(sessionId) {
  if (!sessionId) throw new Error('Missing sessionId');

  const res = await fetch(`/api/ai/chat/${sessionId}/suggestions`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Fetch suggestions failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return res.json();
}
