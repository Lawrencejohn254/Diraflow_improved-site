#!/usr/bin/env node
/*
 * Diraflow admin portal -> SmartHR-style redesign (Node version, no Python needed).
 *
 * Usage:   node apply_redesign.mjs public/_legacy/admin.html
 * Output:  admin.redesigned.html next to the input (original is never modified).
 * Only presentation changes; all JS logic, ids and onclick handlers are kept.
 */
import fs from "node:fs";
import path from "node:path";

const MARK = "/* DIRAFLOW-REDESIGN */";

const ICONS = {
  dashboard: "<rect x='3' y='3' width='7' height='7' rx='1.5'/><rect x='14' y='3' width='7' height='7' rx='1.5'/><rect x='3' y='14' width='7' height='7' rx='1.5'/><rect x='14' y='14' width='7' height='7' rx='1.5'/>",
  applications: "<path d='M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z'/><path d='M14 3v6h6M8 13h8M8 17h5'/>",
  talent: "<circle cx='9' cy='8' r='3.5'/><path d='M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6'/><path d='M16 4.5a3.5 3.5 0 0 1 0 7M18 14.3c2 .7 3.5 2.5 3.5 5.7'/>",
  pipeline: "<rect x='3' y='3' width='18' height='18' rx='2'/><path d='M9 3v18M15 3v12'/>",
  tasks: "<rect x='3' y='3' width='18' height='18' rx='3'/><path d='m8 12 3 3 5-6'/>",
  leave: "<circle cx='12' cy='12' r='4'/><path d='M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'/>",
  calendar: "<rect x='3' y='5' width='18' height='16' rx='2'/><path d='M16 3v4M8 3v4M3 10h18'/>",
  insights: "<path d='M4 20V10M10 20V4M16 20v-7M22 20H2'/>",
  members: "<circle cx='12' cy='8' r='4'/><path d='M4 21c0-4 3.6-7 8-7s8 3 8 7'/>",
  assignments: "<rect x='3' y='7' width='18' height='13' rx='2'/><path d='M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18'/>",
  activity: "<path d='M22 12h-4l-3 9L9 3l-3 9H2'/>",
  reports: "<path d='M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z'/><path d='M8 17v-3M12 17v-6M16 17v-4'/>",
  security: "<path d='M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6z'/>",
  syshealth: "<rect x='3' y='4' width='18' height='7' rx='2'/><rect x='3' y='13' width='18' height='7' rx='2'/><path d='M7 7.5h.01M7 16.5h.01'/>",
};
const ORDER = {
  dashboard: 5,
  applications: 11, talent: 12, pipeline: 13,
  tasks: 21, leave: 22, calendar: 23, insights: 24,
  members: 31, assignments: 32, activity: 33,
  reports: 34, security: 35, syshealth: 36,
};

function iconCss() {
  return Object.entries(ICONS).map(([key, inner]) => {
    const svg =
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' " +
      "stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" + inner + "</svg>";
    const uri = "data:image/svg+xml," + encodeURIComponent(svg).replace(/%3D/g, "=").replace(/%2F/g, "/").replace(/%3A/g, ":").replace(/%27/g, "'").replace(/%2C/g, ",");
    return `#tab-btn-${key}{--ic:url("${uri}");order:${ORDER[key]};}`;
  }).join("\n");
}

const CSS = MARK + String.raw`
:root{
  --primary:#F26522; --primary-dim:#FEEEE6;
  --teal:#0F4C5C; --teal-dim:#E3EEF0;
  --bg:#F7F8FA; --bg2:#F1F3F6; --border:#E8EBF0; --fg:#1F2937; --fg2:#6B7280;
  --radius:8px; --radius-lg:12px; --sbw:252px;
  --shadow:0 1px 2px rgba(16,24,40,.04),0 1px 3px rgba(16,24,40,.04);
}
[data-theme="dark"]{ --primary-dim:#3A2518; --teal-dim:#16333A; --bg:#0F1115; --bg2:#161920; }
body{ font-family:'Plus Jakarta Sans','Sora',sans-serif; background:var(--bg); }

/* SIDEBAR (the old tab bar) */
.tabs-bar{
  position:fixed; top:0; left:0; bottom:0; width:var(--sbw); z-index:60;
  display:flex; flex-direction:column; gap:2px; padding:1rem .85rem;
  background:var(--card); border-right:1px solid var(--border); border-bottom:0;
  overflow-x:hidden; overflow-y:auto; transition:transform .25s ease;
}
.sb-brand{ order:0; display:flex; align-items:center; gap:.6rem; padding:.25rem .5rem 1.1rem; }
.sb-brand img{ width:34px; height:34px; border-radius:9px; object-fit:cover; }
.sb-brand span{ font-weight:800; font-size:1.15rem; letter-spacing:-.01em; }
.sb-brand em{ font-style:normal; font-size:.62rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase;
  color:var(--primary); background:var(--primary-dim); padding:.15rem .4rem; border-radius:5px; }
.sb-label{ font-size:.66rem; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:var(--subtle);
  padding:.9rem .75rem .35rem; }
.sb-label.rec{order:10} .sb-label.ws{order:20} .sb-label.admin{order:30}
.tabs-bar:has(#tab-btn-members[style*="none"]) .sb-label.admin{ display:none; }

.tab-btn{
  display:block; width:100%; text-align:left; border:0; border-radius:8px;
  padding:.62rem .8rem; font-size:.84rem; font-weight:600; color:var(--fg2);
}
.tab-btn::before{
  content:""; display:inline-block; width:18px; height:18px; margin-right:.75rem; vertical-align:-4px;
  background:currentColor; -webkit-mask:var(--ic) center/contain no-repeat; mask:var(--ic) center/contain no-repeat;
}
.tab-btn:hover{ background:var(--bg2); color:var(--fg); }
.tab-btn.active{ background:var(--primary-dim); color:var(--primary); font-weight:700; box-shadow:inset 3px 0 0 var(--primary); }

.clock-status-display{
  order:90; margin:auto 0 0; width:100%; padding:.75rem .9rem; border:1px solid var(--border);
  border-radius:10px; background:var(--bg2); justify-content:space-between; font-size:.78rem;
}

/* TOPBAR */
.topbar{ margin-left:var(--sbw); height:68px; padding:0 1.75rem; background:var(--card); border-bottom:1px solid var(--border); }
.menu-toggle{ display:none; background:none; border:1px solid var(--border); border-radius:8px; width:36px; height:36px;
  font-size:1.1rem; cursor:pointer; color:var(--fg); margin-right:.5rem; align-items:center; justify-content:center; }
.page-title{ font-size:1.15rem; font-weight:800; line-height:1.2; }
.page-crumb{ font-size:.74rem; color:var(--fg2); margin-top:2px; }
#global-search-wrap input{ background:var(--bg2) !important; border-color:transparent !important; border-radius:8px !important; padding:.55rem .9rem !important; }
#global-search-wrap input:focus{ outline:none; border-color:var(--primary) !important; background:var(--card) !important; }
.btn-logout, .bell-btn, .avatar-btn{ background:var(--card); border-radius:8px; }
.bell-btn, .avatar-btn{ border-radius:50%; }
.btn-logout{ height:34px; }

/* CONTENT */
.main{ margin-left:var(--sbw); max-width:none; padding:1.5rem 1.75rem 3rem; }
#announcements-banner-wrap{ margin:1rem 0 0 var(--sbw) !important; max-width:none !important; padding:0 1.75rem !important; }

.stat-card,.table-wrap,.chart-card,.profile-card,.profile-header,.project-card,.more-filters-row,.profile-tabs{
  border-radius:var(--radius-lg); box-shadow:var(--shadow); border-color:var(--border);
}
.stat-card{ padding-right:3.4rem; }
.stat-card::before{ left:auto; top:1rem; right:1rem; bottom:auto; width:34px; height:34px; border-radius:50%;
  background:var(--stat-dim,var(--primary-dim)); }
.stat-card::after{ content:""; position:absolute; top:calc(1rem + 12px); right:calc(1rem + 12px); width:10px; height:10px;
  border-radius:50%; background:var(--stat-color,var(--primary)); }
.stat-card .stat-num{ color:var(--fg); font-size:1.65rem; }
.stat-card .stat-label{ color:var(--fg2); font-weight:600; }

.section-header h2,.chart-card h3{ position:relative; padding-left:.85rem; }
.section-header h2::before,.chart-card h3::before{ content:""; position:absolute; left:0; top:12%; bottom:12%; width:3px;
  border-radius:2px; background:var(--primary); }

thead th{ background:var(--bg2); text-transform:none; letter-spacing:0; font-size:.78rem; color:var(--fg); font-weight:700; }
tbody tr.clickable:hover{ background:var(--bg2); }
.filter-select,.filter-input{ height:38px; border-radius:8px; }
.btn-primary,.btn-save{ background:var(--primary); border-radius:8px; }
.btn-primary:hover,.btn-save:hover{ background:#D9541A; }
.btn-refresh,.btn-secondary,.btn-filters-toggle{ border-radius:8px; }
.bulk-toolbar{ background:var(--teal); border-radius:10px; }
.s-submitted,.s-in-pool{ background:var(--teal-dim); color:var(--teal); }
.profile-tab-btn.active{ background:var(--primary); }
.modal{ border-radius:14px; }
.login-card,.verify-card{ border-radius:16px; box-shadow:0 10px 30px rgba(16,24,40,.08); }
#login-screen,#signup-screen,#forgot-screen,#reset-screen,#verify-screen{ background:linear-gradient(160deg,var(--primary-dim),var(--bg) 55%); }

/* MOBILE / TABLET: drawer sidebar */
.sb-backdrop{ display:none; position:fixed; inset:0; background:rgba(17,24,39,.45); z-index:55; }
@media (max-width:900px){
  .tabs-bar{ top:0; transform:translateX(-100%); width:min(82vw,290px); }
  body.sb-open .tabs-bar{ transform:none; box-shadow:0 0 40px rgba(0,0,0,.25); }
  body.sb-open .sb-backdrop{ display:block; }
  .topbar,.main{ margin-left:0; }
  .topbar{ padding:.6rem .85rem; height:auto; }
  .main{ padding:1rem .85rem 3rem; }
  #announcements-banner-wrap{ margin-left:0 !important; padding:0 .85rem !important; }
  .menu-toggle{ display:inline-flex; }
  .page-crumb{ display:none; }
}

.sb-label.main{order:4}

/* DASHBOARD */
.dash-grid{ display:grid; gap:1.25rem; margin-bottom:1.25rem; }
.dash-g-2-1{ grid-template-columns:2fr 1fr; }
.dash-g-1-1{ grid-template-columns:1fr 1fr; }
.dash-g-3{ grid-template-columns:repeat(3,1fr); }
@media (max-width:1150px){ .dash-g-2-1,.dash-g-1-1,.dash-g-3{ grid-template-columns:1fr; } }
.dash-card{ background:var(--card); border:1px solid var(--border); border-radius:var(--radius-lg); box-shadow:var(--shadow); padding:1.1rem 1.25rem; min-width:0; }
.dash-card-h{ display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; gap:.5rem; }
.dash-card-h h3{ position:relative; padding-left:.8rem; font-size:.95rem; font-weight:700; }
.dash-card-h h3::before{ content:""; position:absolute; left:0; top:12%; bottom:12%; width:3px; border-radius:2px; background:var(--primary); }
.dash-link{ color:var(--primary); font-size:.78rem; font-weight:700; cursor:pointer; white-space:nowrap; }
.dash-link:hover{ text-decoration:underline; }
.dash-canvas{ position:relative; height:230px; }
.dash-sub{ font-size:.74rem; color:var(--fg2); margin-top:.45rem; }
.dash-chip{ display:inline-block; font-size:.7rem; font-weight:700; padding:.15rem .5rem; border-radius:20px; background:var(--green-dim); color:var(--green); margin-top:.45rem; }
.dash-chip.warn{ background:var(--red-dim); color:var(--red); }
.dash-chip.neutral{ background:var(--bg2); color:var(--fg2); }
.dash-mini{ display:grid; grid-template-columns:repeat(3,1fr); gap:.75rem; margin-bottom:1.1rem; text-align:center; }
.dash-mini b{ display:block; font-size:1.35rem; font-weight:800; }
.dash-mini span{ font-size:.75rem; color:var(--fg2); }
.dash-seg{ display:flex; height:14px; border-radius:7px; overflow:hidden; gap:2px; background:var(--bg2); }
.dash-seg span{ display:block; height:100%; }
.dash-legend{ display:grid; grid-template-columns:repeat(3,1fr); gap:.9rem 1rem; margin-top:1.1rem; }
.dash-legend .dl-k{ font-size:.75rem; color:var(--fg2); display:flex; align-items:center; gap:.4rem; }
.dash-legend .dl-v{ font-weight:700; font-size:1.05rem; margin-top:.15rem; }
.dash-dot{ width:8px; height:8px; border-radius:2px; display:inline-block; flex-shrink:0; }
.dash-row{ display:flex; align-items:center; gap:.75rem; padding:.6rem .7rem; border-radius:10px; background:var(--bg); margin-bottom:.55rem; cursor:pointer; }
.dash-row:hover{ background:var(--bg2); }
.dash-row .dr-main{ flex:1; min-width:0; }
.dr-name{ font-weight:600; font-size:.85rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dr-sub{ font-size:.75rem; color:var(--fg2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dash-up{ border-left:3px solid var(--primary); padding:.65rem .85rem; background:var(--bg); border-radius:8px; margin-bottom:.6rem; cursor:pointer; }
.dash-up:hover{ background:var(--bg2); }
.dash-empty{ color:var(--fg2); font-size:.8125rem; padding:1.25rem 0; text-align:center; }
.dash-actions{ display:flex; gap:.4rem; }
.dash-btn{ border:1px solid var(--primary); border-radius:6px; padding:.3rem .65rem; font-size:.72rem; font-weight:700; cursor:pointer; font-family:inherit; background:var(--card); color:var(--primary); }
.dash-btn.ok{ background:var(--primary); color:#fff; }
/*ICONS*/
`;

const SIDEBAR_HTML =
  '<div class="sb-backdrop" onclick="toggleSidebar()"></div>\n  <div class="tabs-bar">\n' +
  '    <div class="sb-brand"><img src="/assets/logo.jpg" alt="Diraflow"><span>Diraflow</span><em>Admin</em></div>\n' +
  '    <div class="sb-label main">Overview</div>\n' +
  '    <button class="tab-btn" id="tab-btn-dashboard" onclick="switchTab(\'dashboard\')">Dashboard</button>\n' +
  '    <div class="sb-label rec">Recruitment</div>\n' +
  '    <div class="sb-label ws">Workspace</div>\n' +
  '    <div class="sb-label admin">Administration</div>';

const TOPBAR_LEFT =
  '<div class="topbar-left">\n' +
  '      <button class="menu-toggle" onclick="toggleSidebar()" aria-label="Menu">&#9776;</button>\n' +
  '      <div><div class="page-title" id="page-title">Applications</div>' +
  '<div class="page-crumb" id="page-crumb">Home &rsaquo; Recruitment &rsaquo; Applications</div></div>\n' +
  "    </div>";

const DASH_PANEL =
  '<div class="tab-panel" id="panel-dashboard">\n' +
  '      <div class="section-header"><h2 id="dash-greeting">Dashboard</h2>' +
  '<button class="btn-refresh" onclick="loadDashboard(true)">&#8635; Refresh</button></div>\n' +
  '      <div id="dash-loading"><span class="spinner"></span></div>\n' +
  '      <div id="dash-root" style="display:none;"></div>\n' +
  '    </div>\n    ';

const JS = "// DIRAFLOW-REDESIGN" + String.raw`
  const PAGE_META = {
    dashboard:['Dashboard','Overview'], applications:['Applications','Recruitment'], talent:['Talent Pool','Recruitment'], pipeline:['Pipeline','Recruitment'],
    tasks:['Tasks','Workspace'], leave:['Leave','Workspace'], calendar:['Calendar','Workspace'], insights:['Insights','Workspace'],
    members:['Members','Administration'], assignments:['Assignments','Administration'], activity:['Activity','Administration'],
    reports:['Reports','Administration'], security:['Security','Administration'], syshealth:['System Health','Administration']
  };
  function updatePageTitle(name) {
    const m = PAGE_META[name]; if (!m) return;
    const t = document.getElementById('page-title'), c = document.getElementById('page-crumb');
    if (t) t.textContent = m[0];
    if (c) c.textContent = 'Home \u203A ' + m[1] + ' \u203A ' + m[0];
  }
  function toggleSidebar() { document.body.classList.toggle('sb-open'); }
  // Wrap the original switchTab so every existing caller (tabs, notifications, search) keeps working.
  const _origSwitchTab = switchTab;
  switchTab = function (name) {
    _origSwitchTab(name);
    updatePageTitle(name);
    if (name === 'dashboard' && window.loadDashboard) window.loadDashboard();
    document.body.classList.remove('sb-open');
    window.scrollTo({ top: 0 });
  };
`;

/*
 * Dashboard runtime. This is a normal function so it can use template literals freely;
 * the patcher injects its source text into admin.html and runs it in the page.
 * It only READS data already used by the portal and reuses the portal's own actions.
 */
function dashboardRuntime() {
  const DASH_CHARTS = ['chart-dash-trend', 'chart-dash-time', 'chart-dash-talent', 'chart-dash-country'];
  let dashSessions = [], dashUpcoming = [], dashLoading = false;
  const D = id => document.getElementById(id);
  const isAdminUser = () => !!currentMember && currentMember.role === 'admin';

  async function loadDashboard(force) {
    if (dashLoading) return;
    dashLoading = true;
    D('dash-loading').style.display = 'block';
    D('dash-root').style.display = 'none';
    try {
      // Team list first (admins need inactive/pending members too), then everything else in parallel.
      if (isAdminUser()) { if (force || !loadedTabs.members) await loadTeamMembers(); }
      else if (allTeamMembers.length === 0) await loadTeamMembersForDropdowns();

      const jobs = [];
      if (force || !loadedTabs.applications) jobs.push(loadApplications());
      if (force || !loadedTabs.talent) jobs.push(loadTalentPool());
      if (force || !loadedTabs.leave) jobs.push(loadLeaveRequests());
      if (force || !loadedTabs.tasks) jobs.push(loadTasks());
      await Promise.allSettled(jobs);

      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const [sRes, cRes] = await Promise.all([
        sb.from('activity_sessions').select('*').gte('login_at', since),
        sb.from('calendar_events').select('*').gte('start_at', new Date().toISOString()).order('start_at').limit(8)
      ]);
      dashSessions = sRes.data || [];
      dashUpcoming = cRes.data || [];
      renderDashboard();
    } catch (e) {
      console.error('Dashboard load failed:', e);
      D('dash-root').innerHTML = '<div class="dash-empty">Could not load the dashboard. Try Refresh.</div>';
    } finally {
      dashLoading = false;
      D('dash-loading').style.display = 'none';
      D('dash-root').style.display = 'block';
    }
  }

  function renderDashboard() {
    DASH_CHARTS.forEach(id => { if (insightsCharts[id]) { insightsCharts[id].destroy(); delete insightsCharts[id]; } });

    const admin = isAdminUser();
    const apps = activeApplications();
    const now = Date.now();
    const newThisWeek = apps.filter(a => a.submitted_at && now - new Date(a.submitted_at).getTime() < 7 * 86400000).length;
    const pending = apps.filter(a => ['Submitted', 'Under Review'].includes(a.status));
    const overdue = pending.filter(a => (daysWaitingFor(a) || 0) >= 10).length;
    const shortlisted = allTalentPool.filter(t => t.status === 'Shortlisted').length;
    const myTasks = allTasks.filter(t => t.assignee_id === currentUser.id && !t.completed)
      .sort((a, b) => new Date(a.due_at || 8.64e15) - new Date(b.due_at || 8.64e15));
    const myOverdue = myTasks.filter(t => t.due_at && new Date(t.due_at) < new Date()).length;
    const kpis = computeInsightsKPIs(apps);

    const h = new Date().getHours();
    D('dash-greeting').textContent =
      (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + ', ' + (currentMember.email || '').split('@')[0];

    const kpi = (color, dim, num, label, chip) =>
      `<div class="stat-card" style="--stat-color:${color}; --stat-dim:${dim};"><div class="stat-num">${num}</div><div class="stat-label">${label}</div>${chip || ''}</div>`;
    const kpiRow = '<div class="stats-row">' +
      kpi('var(--primary)', 'var(--primary-dim)', apps.length, 'Total applications',
        `<span class="dash-chip ${newThisWeek ? '' : 'neutral'}">+${newThisWeek} this week</span>`) +
      kpi('var(--teal)', 'var(--teal-dim)', allTalentPool.length, 'Talent pool',
        `<span class="dash-chip neutral">${shortlisted} shortlisted</span>`) +
      kpi('var(--orange)', 'var(--orange-dim)', pending.length, 'Awaiting review',
        `<span class="dash-chip ${overdue ? 'warn' : ''}">${overdue ? overdue + ' overdue' : 'On track'}</span>`) +
      kpi('var(--green)', 'var(--green-dim)', kpis.passRate != null ? kpis.passRate + '%' : '—', 'Pass rate',
        `<span class="dash-chip neutral">${kpis.avgHiringDays != null ? kpis.avgHiringDays.toFixed(1) + 'd to decision' : 'No decisions yet'}</span>`) +
      kpi('var(--purple)', 'var(--purple-dim)', myTasks.length, 'My open tasks',
        `<span class="dash-chip ${myOverdue ? 'warn' : 'neutral'}">${myOverdue ? myOverdue + ' overdue' : 'None overdue'}</span>`) +
      '</div>';

    // Recruitment statistics (segmented bar + legend)
    const stages = [['Submitted', '#0F4C5C'], ['Under Review', '#F26522'], ['Interview Required', '#F5B50A'],
      ['Passed', '#10B981'], ['Accepted', '#34D399'], ['Failed', '#EF4444']];
    const counts = stages.map(([s]) => apps.filter(a => a.status === s).length);
    const total = apps.length || 1;
    const seg = stages.map(([s, c], i) => counts[i] ? `<span title="${s}" style="width:${(counts[i] / total) * 100}%; background:${c};"></span>` : '').join('');
    const legend = stages.map(([s, c], i) =>
      `<div><div class="dl-k"><i class="dash-dot" style="background:${c};"></i>${s}</div><div class="dl-v">${counts[i]} <span style="font-weight:500;color:var(--fg2);font-size:.75rem;">· ${Math.round((counts[i] / total) * 100)}%</span></div></div>`).join('');
    const recruitCard = `
      <div class="dash-card">
        <div class="dash-card-h"><h3>Recruitment statistics</h3><a class="dash-link" onclick="switchTab('pipeline')">Open pipeline</a></div>
        <div class="dash-mini">
          <div><b>${apps.length}</b><span>Applicants</span></div>
          <div><b>${counts[4]}</b><span>Accepted</span></div>
          <div><b>${kpis.avgHiringDays != null ? kpis.avgHiringDays.toFixed(1) + 'd' : '—'}</b><span>Avg time to decision</span></div>
        </div>
        <div class="dash-seg">${seg}</div>
        <div class="dash-legend">${legend}</div>
      </div>`;

    // Needs attention (longest waiting applications)
    const attention = pending.slice().sort((a, b) => (daysWaitingFor(b) || 0) - (daysWaitingFor(a) || 0)).slice(0, 5);
    const attentionCard = `
      <div class="dash-card">
        <div class="dash-card-h"><h3>Needs attention</h3><a class="dash-link" onclick="switchTab('applications')">View all</a></div>
        ${attention.length ? attention.map(a => `
          <div class="dash-row" onclick="dashOpenApp('${a.id}')">
            <span class="row-avatar">${initialsOf(a.full_name)}</span>
            <div class="dr-main"><div class="dr-name">${esc(a.full_name)}</div><div class="dr-sub">${esc(a.position || '')} · ${esc(reviewerLabel(a.assigned_reviewer_id))}</div></div>
            ${slaBadge(daysWaitingFor(a))}
          </div>`).join('') : '<div class="dash-empty">Nothing is waiting for review.</div>'}
      </div>`;

    // Upcoming (interviews + calendar events)
    const upcoming = [
      ...apps.filter(a => a.interview_at && new Date(a.interview_at) >= new Date())
        .map(a => ({ at: a.interview_at, title: 'Interview: ' + a.full_name, sub: a.position || '', go: `dashOpenApp('${a.id}')` })),
      ...dashUpcoming.map(e => ({ at: e.start_at, title: e.title, sub: e.event_type || '', go: `switchTab('calendar')` }))
    ].sort((a, b) => new Date(a.at) - new Date(b.at)).slice(0, 5);
    const upcomingCard = `
      <div class="dash-card">
        <div class="dash-card-h"><h3>Upcoming</h3><a class="dash-link" onclick="switchTab('calendar')">Calendar</a></div>
        ${upcoming.length ? upcoming.map(u => `
          <div class="dash-up" onclick="${u.go}">
            <div class="dr-name">${esc(u.title)}</div>
            <div class="dr-sub">${fmtDateTime(u.at)}${u.sub ? ' · ' + esc(u.sub) : ''}</div>
          </div>`).join('') : '<div class="dash-empty">No upcoming interviews or events.</div>'}
      </div>`;

    const trendCard = `<div class="dash-card"><div class="dash-card-h"><h3>Applications &amp; talent pool, last 8 weeks</h3></div><div class="dash-canvas"><canvas id="chart-dash-trend"></canvas></div></div>`;
    const totalHours = dashSessions.reduce((t, s) => t + (s.active_seconds || 0) + (s.idle_seconds || 0) + (s.break_seconds || 0), 0) / 3600;
    const timeCard = `<div class="dash-card"><div class="dash-card-h"><h3>${admin ? 'Team' : 'My'} time logged</h3><span class="dash-chip neutral" style="margin:0;">${totalHours.toFixed(1)}h / 7 days</span></div><div class="dash-canvas"><canvas id="chart-dash-time"></canvas></div></div>`;
    const talentCard = `<div class="dash-card"><div class="dash-card-h"><h3>Talent pool status</h3><a class="dash-link" onclick="switchTab('talent')">View all</a></div><div class="dash-canvas"><canvas id="chart-dash-talent"></canvas></div></div>`;
    const countryCard = `<div class="dash-card"><div class="dash-card-h"><h3>Top countries (applications)</h3></div><div class="dash-canvas"><canvas id="chart-dash-country"></canvas></div></div>`;

    // Pending approvals (admin) and my tasks (everyone)
    let approvalsCard = '';
    if (admin) {
      const pm = allTeamMembers.filter(m => m.request_status === 'pending').map(m => `
        <div class="dash-row" style="cursor:default;">
          <span class="row-avatar">${initialsOf(m.email)}</span>
          <div class="dr-main"><div class="dr-name">${esc(m.email)}</div><div class="dr-sub">Account request · ${esc(m.role)}</div></div>
          <div class="dash-actions"><button class="dash-btn ok" onclick="dashApproveMember('${m.id}')">Approve</button><button class="dash-btn" onclick="dashRejectMember('${m.id}')">Decline</button></div>
        </div>`);
      const pl = allLeaveRequests.filter(r => r.status === 'Pending').map(r => {
        const who = allTeamMembers.find(m => m.id === r.team_member_id);
        return `
        <div class="dash-row" style="cursor:default;">
          <span class="row-avatar">${initialsOf(who ? who.email : '?')}</span>
          <div class="dr-main"><div class="dr-name">${esc(who ? who.email : 'Member')}</div><div class="dr-sub">${esc(r.leave_type)} · ${fmtDateShort(r.start_date)} – ${fmtDateShort(r.end_date)}</div></div>
          <div class="dash-actions"><button class="dash-btn ok" onclick="dashLeave('${r.id}','Approved')">Approve</button><button class="dash-btn" onclick="dashLeave('${r.id}','Rejected')">Decline</button></div>
        </div>`;
      });
      const rows = [...pm, ...pl];
      approvalsCard = `
        <div class="dash-card">
          <div class="dash-card-h"><h3>Pending approvals</h3><span class="dash-chip ${rows.length ? 'warn' : 'neutral'}" style="margin:0;">${rows.length}</span></div>
          ${rows.length ? rows.slice(0, 6).join('') : '<div class="dash-empty">No pending requests.</div>'}
        </div>`;
    }
    const tasksCard = `
      <div class="dash-card">
        <div class="dash-card-h"><h3>My open tasks</h3><a class="dash-link" onclick="switchTab('tasks')">View all</a></div>
        ${myTasks.length ? myTasks.slice(0, 6).map(t => `
          <div class="dash-row" style="cursor:default;">
            <input type="checkbox" onchange="dashToggleTask('${t.id}', this.checked)">
            <div class="dr-main"><div class="dr-name">${esc(t.title)}</div><div class="dr-sub" style="${t.due_at && new Date(t.due_at) < new Date() ? 'color:var(--red);' : ''}">${t.due_at ? 'Due ' + fmtDateTime(t.due_at) : 'No due date'}</div></div>
          </div>`).join('') : '<div class="dash-empty">You have no open tasks.</div>'}
      </div>`;

    D('dash-root').innerHTML = kpiRow +
      `<div class="dash-grid dash-g-2-1">${recruitCard}${attentionCard}</div>` +
      `<div class="dash-grid dash-g-2-1">${trendCard}${upcomingCard}</div>` +
      `<div class="dash-grid dash-g-3">${timeCard}${talentCard}${countryCard}</div>` +
      `<div class="dash-grid ${admin ? 'dash-g-1-1' : ''}">${approvalsCard}${tasksCard}</div>`;

    if (typeof Chart === 'undefined') return;

    // Trend: last 8 weeks
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const end = new Date(); end.setHours(23, 59, 59, 999); end.setDate(end.getDate() - i * 7);
      const start = new Date(end); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
      weeks.push({ label: `${start.getDate()}/${start.getMonth() + 1}`, start, end });
    }
    const inWeek = (iso, w) => { if (!iso) return false; const d = new Date(iso); return d >= w.start && d <= w.end; };
    upsertChart('chart-dash-trend', 'bar', {
      labels: weeks.map(w => w.label),
      datasets: [
        { label: 'Applications', data: weeks.map(w => apps.filter(a => inWeek(a.submitted_at, w)).length), backgroundColor: '#F26522', borderRadius: 6 },
        { label: 'Talent pool', data: weeks.map(w => allTalentPool.filter(t => inWeek(t.submitted_at, w)).length), backgroundColor: '#0F4C5C', borderRadius: 6 }
      ]
    }, { plugins: { legend: { display: true, position: 'bottom' } } });

    // Time logged: last 7 days, stacked
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push({ key: dayKey(d), label: d.toLocaleDateString('en-GB', { weekday: 'short' }) });
    }
    const hoursOn = (key, field) => dashSessions.filter(s => dayKey(s.login_at) === key).reduce((t, s) => t + (s[field] || 0), 0) / 3600;
    upsertChart('chart-dash-time', 'bar', {
      labels: days.map(d => d.label),
      datasets: [
        { label: 'Active (h)', data: days.map(d => hoursOn(d.key, 'active_seconds')), backgroundColor: '#F26522', borderRadius: 4, stack: 's' },
        { label: 'Idle (h)', data: days.map(d => hoursOn(d.key, 'idle_seconds')), backgroundColor: '#F5B50A', borderRadius: 4, stack: 's' },
        { label: 'Break (h)', data: days.map(d => hoursOn(d.key, 'break_seconds')), backgroundColor: '#0F4C5C', borderRadius: 4, stack: 's' }
      ]
    }, { scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: '#E5E7EB' } } }, plugins: { legend: { display: true, position: 'bottom' } } });

    // Talent pool status
    const order = ['In pool', 'Shortlisted', 'Contacted', 'Assigned', 'Inactive'];
    const colors = { 'In pool': '#0F4C5C', Shortlisted: '#10B981', Contacted: '#F5B50A', Assigned: '#F26522', Inactive: '#EF4444' };
    const tc = {}; allTalentPool.forEach(t => { const s = t.status || 'In pool'; tc[s] = (tc[s] || 0) + 1; });
    const tl = order.filter(s => tc[s]);
    upsertChart('chart-dash-talent', 'doughnut', { labels: tl, datasets: [{ data: tl.map(s => tc[s]), backgroundColor: tl.map(s => colors[s]) }] });

    // Top countries
    const cc = {}; apps.forEach(a => { const c = a.country || 'Unknown'; cc[c] = (cc[c] || 0) + 1; });
    const top = Object.entries(cc).sort((a, b) => b[1] - a[1]).slice(0, 5);
    upsertChart('chart-dash-country', 'bar', {
      labels: top.map(e => e[0]),
      datasets: [{ label: 'Applications', data: top.map(e => e[1]), backgroundColor: '#F26522', borderRadius: 6 }]
    }, { indexAxis: 'y' });
  }

  // Globals used by inline onclick handlers; each reuses the portal's existing action, then refreshes.
  window.loadDashboard = loadDashboard;
  window.renderDashboard = renderDashboard;
  window.dashOpenApp = id => { switchTab('applications'); setTimeout(() => openAppPanel(id), 150); };
  window.dashApproveMember = async id => { await approveMember(id); renderDashboard(); };
  window.dashRejectMember = async id => { await rejectMember(id); renderDashboard(); };
  window.dashLeave = async (id, decision) => { await reviewLeaveRequest(id, decision); renderDashboard(); };
  window.dashToggleTask = async (id, done) => { await toggleTaskComplete(id, done); renderDashboard(); };
}

const JS_DASH = "\n;(" + dashboardRuntime.toString() + ")();\n";

function mustReplace(html, oldStr, newStr) {
  const i = html.indexOf(oldStr);
  if (i === -1) {
    console.error("Anchor not found, file differs from expected: " + JSON.stringify(oldStr.slice(0, 70)));
    process.exit(1);
  }
  return html.slice(0, i) + newStr + html.slice(i + oldStr.length);
}

const arg = process.argv[2];
if (!arg) {
  console.error("usage: node apply_redesign.mjs path/to/admin.html");
  process.exit(1);
}
let html = fs.readFileSync(arg, "utf8");
if (html.includes(MARK)) {
  console.error("Already redesigned (marker found). Nothing to do.");
  process.exit(1);
}

// 1. font
html = mustReplace(
  html,
  "family=Sora:wght@300;400;500;600;700;800&family=DM+Mono",
  "family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Sora:wght@300;400;500;600;700;800&family=DM+Mono"
);
html = html.split("family: 'Sora'").join("family: 'Plus Jakarta Sans'");

// 2. palette (blue -> orange), including hard-coded chart colours in JS
for (const [o, n] of [["#2563EB", "#F26522"], ["#E8EFFD", "#FEEEE6"], ["#1E2A4A", "#3A2518"], ["#1d4ed8", "#D9541A"]]) {
  html = html.split(o).join(n);
}
html = html.replace(
  /const CHART_PALETTE = \[.*?\];/,
  "const CHART_PALETTE = ['#F26522','#0F4C5C','#F5B50A','#10B981','#EF4444','#8B5CF6','#6B7280'];"
);

// 3. CSS
html = mustReplace(html, "</style>", CSS.replace("/*ICONS*/", iconCss()) + "\n</style>");

// 4. markup: sidebar + topbar title
html = mustReplace(html, '<div class="tabs-bar">', SIDEBAR_HTML);
const before = html;
html = html.replace(/<div class="topbar-left">[\s\S]*?<\/div>/, () => TOPBAR_LEFT);
if (html === before) {
  console.error("Could not find the .topbar-left block");
  process.exit(1);
}

// 4b. Dashboard panel (inserted before the Applications panel)
html = mustReplace(html, '<div class="tab-panel active" id="panel-applications">', DASH_PANEL + '<div class="tab-panel active" id="panel-applications">');

// 5. JS (inserted just before the final boot call so switchTab already exists)
const idx = html.lastIndexOf("init();");
if (idx === -1) {
  console.error("Could not find the boot init(); call");
  process.exit(1);
}
html = html.slice(0, idx) + JS_DASH + JS + "\n  updatePageTitle('dashboard');\n  " + html.slice(idx);

// 6. Make the Dashboard the landing tab after sign-in
const landing = /(applyRoleSessionTimeout\(\);\s*)switchTab\('applications'\);/;
if (landing.test(html)) html = html.replace(landing, "$1switchTab('dashboard');");
else console.warn("Note: could not find the post-login switchTab call; the Dashboard is in the sidebar but Applications stays the landing tab.");

const out = path.join(path.dirname(arg), "admin.redesigned.html");
fs.writeFileSync(out, html, "utf8");
console.log("OK -> " + out);
