const supabaseUrl = 'https://jlqelkrfeksixxfkulwf.supabase.co';
const supabaseAnonKey = 'sb_publishable_tG7DDMyStV7t-zrEbRKtrA_hFnPJQIb';

// Initialize Supabase Client
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

let activeDeptCode = '';
let activeDeptName = '';
let activeReports = [];

// Initialize Lucide Icons
lucide.createIcons();

function selectDepartment(code, name, colorTheme) {
  activeDeptCode = code;
  activeDeptName = name;

  // Toggle Screens
  document.getElementById('selection-screen').classList.add('hidden');
  document.getElementById('dashboard-screen').classList.remove('hidden');

  // Update Badge Name
  const badgeEl = document.getElementById('active-dept-name');
  badgeEl.innerText = name;
  badgeEl.className = 'active-badge ' + colorTheme;

  // Fetch Reports
  fetchDeptReports();
}

function exitDashboard() {
  activeDeptCode = '';
  activeDeptName = '';
  activeReports = [];

  document.getElementById('dashboard-screen').classList.add('hidden');
  document.getElementById('selection-screen').classList.remove('hidden');
}

async function fetchDeptReports() {
  showLoading(true);
  try {
    const { data, error } = await supabaseClient
      .from('citizen_reports')
      .select('*')
      .eq('routed_department', activeDeptCode)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    activeReports = data || [];
    renderDashboard();
  } catch (err) {
    console.error('[Supabase] Error fetching reports:', err);
    alert('Failed to retrieve incident reports: ' + err.message);
  } finally {
    showLoading(false);
  }
}

function renderDashboard() {
  // Update stats counts
  const totalCount = activeReports.length;
  const activeCount = activeReports.filter(r => r.status !== 'RESOLVED').length;
  const resolvedCount = activeReports.filter(r => r.status === 'RESOLVED').length;

  document.getElementById('stats-total').innerText = totalCount;
  document.getElementById('stats-active').innerText = activeCount;
  document.getElementById('stats-resolved').innerText = resolvedCount;

  const listEl = document.getElementById('reports-list');
  const emptyEl = document.getElementById('reports-empty');
  listEl.innerHTML = '';

  if (totalCount === 0) {
    emptyEl.classList.remove('hidden');
    return;
  } else {
    emptyEl.classList.add('hidden');
  }

  activeReports.forEach(report => {
    const isResolved = report.status === 'RESOLVED';
    const cardEl = document.createElement('div');
    cardEl.className = 'report-card';
    
    // Priority badge
    const prio = report.routing_priority || 'NORMAL';
    const prioClass = 'prio-' + prio.toLowerCase();

    // Date parsing
    const dateStr = report.timestamp ? new Date(report.timestamp).toLocaleString() : 'Just now';

    cardEl.innerHTML = `
      <div class="report-top">
        <div class="report-info">
          <h4>${report.title || 'Civic Safety Issue'}</h4>
          <p class="report-desc">${report.description || 'No description provided.'}</p>
          <div class="badge-row">
            <span class="badge ${prioClass}">Priority: ${prio}</span>
            <span class="badge ${isResolved ? 'status-resolved' : 'status-pending'}">
              ${isResolved ? '✓ Resolved' : '⚡ Active Alert'}
            </span>
          </div>
        </div>

        ${report.video_url ? `
          <div class="video-preview-box">
            <video src="${report.video_url}" controls playsinline muted></video>
          </div>
        ` : ''}
      </div>

      <div class="report-bottom">
        <div class="meta-group">
          <span><strong>Category:</strong> ${report.category || 'General'}</span>
          <span>•</span>
          <span><strong>📍 Location:</strong> ${report.lat?.toFixed(5)}, ${report.lng?.toFixed(5)}</span>
          <span>•</span>
          <span><strong>⏱️</strong> ${dateStr}</span>
        </div>

        ${!isResolved ? `
          <button class="btn-resolve-issue" onclick="resolveReport('${report.id}')">
            <i data-lucide="check"></i> Mark Resolved
          </button>
        ` : `
          <span style="font-size: 11px; font-weight: 800; color: #10b981; display: inline-flex; align-items: center; gap: 4px;">
            ✓ Completed & Closed
          </span>
        `}
      </div>
    `;

    listEl.appendChild(cardEl);
  });

  lucide.createIcons();
}

async function resolveReport(id) {
  try {
    const { error } = await supabaseClient
      .from('citizen_reports')
      .update({ status: 'RESOLVED' })
      .eq('id', id);

    if (error) throw error;

    // Update local state
    activeReports = activeReports.map(r => r.id === id ? { ...r, status: 'RESOLVED' } : r);
    renderDashboard();
  } catch (err) {
    console.error('[Supabase] Error marking as resolved:', err);
    alert('Failed to resolve report: ' + err.message);
  }
}

function showLoading(show) {
  const loadingEl = document.getElementById('reports-loading');
  if (show) {
    loadingEl.classList.remove('hidden');
    document.getElementById('reports-list').classList.add('hidden');
  } else {
    loadingEl.classList.add('hidden');
    document.getElementById('reports-list').classList.remove('hidden');
  }
}
