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
      throw new Error('Server error');
    }
  } catch (err) {
    console.error('[Routing Service] Failed to reach routing service, using simulated routing fallback:', err);
    // Determine a department based on simple keyword heuristics
    const descLower = (description || '').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    const text = `${titleLower} ${descLower}`;
    
    let department = 'SANITATION';
    let priority = 'NORMAL';
    let reason = 'Routed via keyword heuristic scanning.';
    
    if (text.includes('fire') || text.includes('smoke') || text.includes('hazard') || text.includes('collapse')) {
      department = 'FIRE';
      priority = 'HIGH';
      reason = 'Identified potential fire/safety hazard keywords.';
    } else if (text.includes('accident') || text.includes('hospital') || text.includes('medical') || text.includes('injured')) {
      department = 'HEALTH';
      priority = 'HIGH';
      reason = 'Identified medical/road emergency keywords.';
    } else if (text.includes('robbery') || text.includes('theft') || text.includes('assault') || text.includes('fight') || text.includes('suspicious')) {
      department = 'POLICE';
      priority = 'HIGH';
      reason = 'Identified law enforcement/security alert keywords.';
    } else if (text.includes('flood') || text.includes('water') || text.includes('landslide')) {
      department = 'DISASTER';
      priority = 'HIGH';
      reason = 'Identified disaster management keywords.';
    }
    
    return {
      department,
      priority,
      routing_reason: reason,
      escalation_required: false
    };
  }
}
