const metrics = [
  {label: 'Total customers', value: '—', note: 'Customer records will appear here', icon: '♙'},
  {label: 'Milk collected today', value: '— L', note: 'Morning + evening collection', icon: '◉'},
  {label: 'Total fat', value: '—', note: 'Daily fat total', icon: '◇'},
  {label: 'Today’s amount', value: '₹ —', note: 'Calculated using saved rate', icon: '₹'},
];

const shortcuts = [
  {title: 'Milk collection', description: 'Enter morning and evening milk and fat readings', symbol: '+'},
  {title: 'Customers', description: 'View customers, contact details and history', symbol: '♙'},
  {title: 'Billing & reports', description: 'Review monthly bills and collection reports', symbol: '▤'},
  {title: 'Milk rates', description: 'Manage rates by month and year', symbol: '₹'},
];

export default function DashboardPage() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#home"><span className="brand-mark">FM</span><span>Future<span className="brand-light">OfMilkBook</span></span></a>
        <p className="nav-label">WORKSPACE</p>
        <a className="nav-item active" href="#home">▦ <span>Dashboard</span></a>
        <a className="nav-item" href="#customers">♙ <span>Customers</span></a>
        <a className="nav-item" href="#collection">◉ <span>Milk collection</span></a>
        <a className="nav-item" href="#billing">₹ <span>Billing</span></a>
        <a className="nav-item" href="#reports">▤ <span>Reports</span></a>
        <a className="nav-item" href="#rates">◇ <span>Milk rates</span></a>
        <div className="sidebar-bottom"><div className="sync-indicator"/><div><strong>Cloud sync planned</strong><small>Connect your account to sync data</small></div></div>
      </aside>

      <section className="main-area" id="home">
        <header className="topbar"><div><span className="mobile-brand">FutureOfMilkBook</span><span className="breadcrumb">Workspace / Dashboard</span></div><div className="profile"><span className="profile-avatar">FM</span><span><strong>My Dairy</strong><small>Owner account</small></span></div></header>
        <div className="page-content">
          <div className="welcome-row"><div><p className="overline">DAIRY OVERVIEW</p><h1>Good day 👋</h1><p className="muted">Here’s what’s happening with your dairy.</p></div><span className="date-chip">Today · Live data after setup</span></div>

          <section className="hero"><div><span className="hero-tag">YOUR DAIRY, CONNECTED</span><h2>Manage your dairy<br/>from anywhere.</h2><p>Use your phone app or any web browser. Your business data will stay in sync through one secure account.</p><span className="hero-note">Mobile app + Web dashboard + Shared cloud data</span></div><div className="hero-art" aria-hidden="true"><div className="art-circle">✦</div><div className="art-card"><span>DAILY COLLECTION</span><strong>Milk · Fat · Billing</strong><div className="art-bars"><i/><i/><i/><i/><i/><i/><i/></div></div></div></section>

          <div className="section-heading"><div><h2>Overview</h2><p className="muted">Your key dairy numbers</p></div><span className="period-chip">Today</span></div>
          <section className="metric-grid">{metrics.map((metric) => <article className="metric-card" key={metric.label}><div className="metric-top"><span>{metric.label}</span><span className="metric-icon">{metric.icon}</span></div><strong>{metric.value}</strong><small>{metric.note}</small></article>)}</section>

          <div className="section-heading"><div><h2>Quick access</h2><p className="muted">Your everyday tools</p></div></div>
          <section className="shortcut-grid">{shortcuts.map((item) => <a className="shortcut" href="#setup" key={item.title}><span className="shortcut-icon">{item.symbol}</span><span className="shortcut-copy"><strong>{item.title}</strong><small>{item.description}</small></span><span className="arrow">↗</span></a>)}</section>
          <p className="notice" id="setup"><strong>Development preview:</strong> This website is the first responsive UI foundation. Sign-in, live database records, customer operations and cloud synchronization will be connected after the original MilkBook data model is audited.</p>
          <footer>FUTUREOFMILKBOOK <span>·</span> ONE DAIRY ACCOUNT, EVERY DEVICE</footer>
        </div>
      </section>
    </main>
  );
}
