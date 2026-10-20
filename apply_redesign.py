#!/usr/bin/env python3
"""
Diraflow admin portal -> SmartHR-style redesign.

Usage:
    python apply_redesign.py public/_legacy/admin.html
Writes admin.redesigned.html next to the input (the original is never modified).

What it changes (presentation only; every JS function, id and onclick is kept):
  * top tab bar            -> fixed left sidebar with icons + section labels
  * topbar                 -> page title + breadcrumb, search, actions
  * palette                -> orange #F26522 + deep teal #0F4C5C, soft cards
  * mobile                 -> sidebar becomes a slide-in drawer (hamburger)
  * charts                 -> new palette and font
"""
import re
import sys
import urllib.parse
from pathlib import Path

MARK = "/* DIRAFLOW-REDESIGN */"

ICONS = {
    "applications": "<path d='M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z'/><path d='M14 3v6h6M8 13h8M8 17h5'/>",
    "talent":       "<circle cx='9' cy='8' r='3.5'/><path d='M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6'/><path d='M16 4.5a3.5 3.5 0 0 1 0 7M18 14.3c2 .7 3.5 2.5 3.5 5.7'/>",
    "pipeline":     "<rect x='3' y='3' width='18' height='18' rx='2'/><path d='M9 3v18M15 3v12'/>",
    "tasks":        "<rect x='3' y='3' width='18' height='18' rx='3'/><path d='m8 12 3 3 5-6'/>",
    "leave":        "<circle cx='12' cy='12' r='4'/><path d='M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'/>",
    "calendar":     "<rect x='3' y='5' width='18' height='16' rx='2'/><path d='M16 3v4M8 3v4M3 10h18'/>",
    "insights":     "<path d='M4 20V10M10 20V4M16 20v-7M22 20H2'/>",
    "members":      "<circle cx='12' cy='8' r='4'/><path d='M4 21c0-4 3.6-7 8-7s8 3 8 7'/>",
    "assignments":  "<rect x='3' y='7' width='18' height='13' rx='2'/><path d='M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18'/>",
    "activity":     "<path d='M22 12h-4l-3 9L9 3l-3 9H2'/>",
    "reports":      "<path d='M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z'/><path d='M8 17v-3M12 17v-6M16 17v-4'/>",
    "security":     "<path d='M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6z'/>",
    "syshealth":    "<rect x='3' y='4' width='18' height='7' rx='2'/><rect x='3' y='13' width='18' height='7' rx='2'/><path d='M7 7.5h.01M7 16.5h.01'/>",
}
ORDER = {  # sidebar order (labels use 10 / 20 / 30)
    "applications": 11, "talent": 12, "pipeline": 13,
    "tasks": 21, "leave": 22, "calendar": 23, "insights": 24,
    "members": 31, "assignments": 32, "activity": 33,
    "reports": 34, "security": 35, "syshealth": 36,
}


def icon_css():
    rules = []
    for key, inner in ICONS.items():
        svg = ("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' "
               "stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" + inner + "</svg>")
        uri = "data:image/svg+xml," + urllib.parse.quote(svg, safe="/:='.,")
        rules.append(f'#tab-btn-{key}{{--ic:url("{uri}");order:{ORDER[key]};}}')
    return "\n".join(rules)


CSS = MARK + r"""
:root{
  --primary:#F26522; --primary-dim:#FEEEE6;
  --teal:#0F4C5C; --teal-dim:#E3EEF0;
  --bg:#F7F8FA; --bg2:#F1F3F6; --border:#E8EBF0; --fg:#1F2937; --fg2:#6B7280;
  --radius:8px; --radius-lg:12px; --sbw:252px;
  --shadow:0 1px 2px rgba(16,24,40,.04),0 1px 3px rgba(16,24,40,.04);
}
[data-theme="dark"]{ --primary-dim:#3A2518; --teal-dim:#16333A; --bg:#0F1115; --bg2:#161920; }
body{ font-family:'Plus Jakarta Sans','Sora',sans-serif; background:var(--bg); }

/* ───────── SIDEBAR (the old tab bar) ───────── */
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

/* ───────── TOPBAR ───────── */
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

/* ───────── CONTENT ───────── */
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

/* ───────── MOBILE / TABLET: drawer sidebar ───────── */
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
/*ICONS*/
"""

SIDEBAR_HTML = (
    '<div class="sb-backdrop" onclick="toggleSidebar()"></div>\n  <div class="tabs-bar">\n'
    '    <div class="sb-brand"><img src="/assets/logo.jpg" alt="Diraflow"><span>Diraflow</span><em>Admin</em></div>\n'
    '    <div class="sb-label rec">Recruitment</div>\n'
    '    <div class="sb-label ws">Workspace</div>\n'
    '    <div class="sb-label admin">Administration</div>'
)

TOPBAR_LEFT = (
    '<div class="topbar-left">\n'
    '      <button class="menu-toggle" onclick="toggleSidebar()" aria-label="Menu">&#9776;</button>\n'
    '      <div><div class="page-title" id="page-title">Applications</div>'
    '<div class="page-crumb" id="page-crumb">Home &rsaquo; Recruitment &rsaquo; Applications</div></div>\n'
    '    </div>'
)

JS = MARK.replace("/*", "//").replace("*/", "") + r"""
  const PAGE_META = {
    applications:['Applications','Recruitment'], talent:['Talent Pool','Recruitment'], pipeline:['Pipeline','Recruitment'],
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
    document.body.classList.remove('sb-open');
    window.scrollTo({ top: 0 });
  };
"""


def must_replace(html, old, new, count=1):
    if old not in html:
        sys.exit(f"Anchor not found, file differs from expected: {old[:70]!r}")
    return html.replace(old, new, count)


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: python apply_redesign.py path/to/admin.html")
    src = Path(sys.argv[1])
    html = src.read_text(encoding="utf-8")
    if MARK in html:
        sys.exit("Already redesigned (marker found). Nothing to do.")

    # 1. font
    html = must_replace(html, "family=Sora:wght@300;400;500;600;700;800&family=DM+Mono",
                        "family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Sora:wght@300;400;500;600;700;800&family=DM+Mono")
    html = html.replace("family: 'Sora'", "family: 'Plus Jakarta Sans'")

    # 2. palette (blue -> orange), including the hard-coded chart colours in JS
    for old, new in (("#2563EB", "#F26522"), ("#E8EFFD", "#FEEEE6"), ("#1E2A4A", "#3A2518"), ("#1d4ed8", "#D9541A")):
        html = html.replace(old, new)
    html = re.sub(r"const CHART_PALETTE = \[.*?\];",
                  "const CHART_PALETTE = ['#F26522','#0F4C5C','#F5B50A','#10B981','#EF4444','#8B5CF6','#6B7280'];", html, count=1)

    # 3. CSS
    html = must_replace(html, "</style>", CSS.replace("/*ICONS*/", icon_css()) + "\n</style>")

    # 4. markup: sidebar + topbar title
    html = must_replace(html, '<div class="tabs-bar">', SIDEBAR_HTML)
    html, n = re.subn(r'<div class="topbar-left">.*?</div>', lambda m: TOPBAR_LEFT, html, count=1, flags=re.S)
    if n != 1:
        sys.exit("Could not find the .topbar-left block")

    # 5. JS (inserted just before the final boot call so switchTab already exists)
    idx = html.rfind("init();")
    if idx == -1:
        sys.exit("Could not find the boot init(); call")
    html = html[:idx] + JS + "\n  updatePageTitle('applications');\n  " + html[idx:]

    out = src.with_name("admin.redesigned.html")
    out.write_text(html, encoding="utf-8")
    print(f"OK -> {out}")


if __name__ == "__main__":
    main()
