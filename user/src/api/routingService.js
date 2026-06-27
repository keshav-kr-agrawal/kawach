/**
 * Department Routing Service
 * Calls the Classifier microservice /route endpoint to classify incidents.
 */

export async function routeReport(title, description, category) {
  const apiUrl = import.meta.env.VITE_CLASSIFIER_API_URL || 'http://localhost:8001/classify';
  const routeUrl = apiUrl.replace('/classify', '/route');
  
  console.log('[Routing Service] Dispatching to URL:', routeUrl);
  
  try {
    const response = await fetch(routeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title || 'Untitled Incident',
        description: description || 'No details provided.',
        category: category || 'General Alert'
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[Routing Service] Response:', data);
      return data;
    } else {
      const errText = await response.text();
      console.warn('[Routing Service] Server returned error:', errText);
      return null;
    }
  } catch (err) {
    console.error('[Routing Service] Failed to reach routing service:', err);
    return null;
  }
}
