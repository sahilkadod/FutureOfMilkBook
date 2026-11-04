'use client';

import {useEffect, useMemo, useState} from 'react';
import type {ChangeEvent, FormEvent, ReactNode} from 'react';
import {calculateMilkTotals} from '../../../src/domain/milkCalculations';

type Customer = {id: string; name: string; phone: string; address: string};
type Entry = {
  id: string;
  customerId: string;
  date: string;
  morningLitres: number;
  morningFat: number;
  eveningLitres: number;
  eveningFat: number;
};
type Rate = {customerId: string; month: string; rate: number};
type MilkBookData = {customers: Customer[]; entries: Entry[]; rates: Rate[]};
type MilkBookUser = {id: string; name: string; phone: string};
type Section = 'dashboard' | 'customers' | 'collection' | 'billing' | 'rates';

type ApiCustomer = {_id?: string; id?: string; name?: string; phone?: string; address?: string};
type ApiMilkEntry = {_id?: string; customerId?: string | {_id?: string}; date?: string; morningLiter?: number; morningFat?: number; eveningLiter?: number; eveningFat?: number};
type ApiRate = {_id?: string; customerId?: string | {_id?: string}; month?: number | string; year?: number | string; rate?: number};

const STORAGE_KEY = 'future-of-milkbook.web.v1';
const navigation: {id: Section; label: string; icon: string}[] = [
  {id: 'dashboard', label: 'Dashboard', icon: '▦'},
  {id: 'customers', label: 'Customers', icon: '♙'},
  {id: 'collection', label: 'Milk collection', icon: '◉'},
  {id: 'billing', label: 'Billing', icon: '₹'},
  {id: 'rates', label: 'Milk rates', icon: '◇'},
];

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function currentMonth(date = new Date()) {
  return localDate(date).slice(0, 7);
}

function money(amount: number) {
  return new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 2}).format(amount);
}

function formatLongDate(value: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {day: 'numeric', month: 'short', year: 'numeric'}).format(new Date(`${value}T12:00:00`));
}

function emptyData(): MilkBookData {
  return {customers: [], entries: [], rates: []};
}

function accountStorageKey(userId: string) {
  return `${STORAGE_KEY}.${encodeURIComponent(userId)}`;
}

async function dataRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/data/${path}`, {...init, cache: 'no-store', headers: {'Content-Type': 'application/json', ...init?.headers}});
  const result = await response.json().catch(() => ({})) as T & {error?: string; message?: string};
  if (!response.ok) throw new Error(result.error || result.message || 'Could not sync MilkBook data.');
  return result;
}

async function fetchSharedData(months: string[], customerIds?: string[]): Promise<MilkBookData> {
  const customersResponse = await dataRequest<ApiCustomer[]>('customers');
  const customers = customersResponse.map(customer => ({
    id: String(customer._id ?? customer.id),
    name: customer.name ?? '',
    phone: customer.phone ?? '',
    address: customer.address ?? '',
  }));
  const customersToFetch = customerIds ? customers.filter(customer => customerIds.includes(customer.id)) : customers;
  const customerData = await Promise.all(customersToFetch.map(async customer => {
    const results = await Promise.all(months.map(async selected => {
      const [year, month] = selected.split('-');
      const query = `customerId=${encodeURIComponent(customer.id)}&month=${month}&year=${year}`;
      const [milk, rates] = await Promise.all([
        dataRequest<ApiMilkEntry[]>(`milk?${query}`),
        dataRequest<ApiRate[]>(`rates?${query}`),
      ]);
      return {
        entries: milk.map(entry => ({
          id: String(entry._id ?? `${customer.id}-${entry.date}`),
          customerId: customer.id,
          date: entry.date ?? '',
          morningLitres: Number(entry.morningLiter) || 0,
          morningFat: Number(entry.morningFat) || 0,
          eveningLitres: Number(entry.eveningLiter) || 0,
          eveningFat: Number(entry.eveningFat) || 0,
        })),
        rates: rates.map(rate => ({customerId: customer.id, month: selected, rate: Number(rate.rate) || 0})),
      };
    }));
    return {entries: results.flatMap(item => item.entries), rates: results.flatMap(item => item.rates)};
  }));
  return {
    customers,
    entries: customerData.flatMap(item => item.entries),
    rates: customerData.flatMap(item => item.rates),
  };
}

function readAccountData(userId: string): MilkBookData {
  try {
    const saved = window.localStorage.getItem(accountStorageKey(userId));
    if (!saved) return emptyData();
    const parsed = JSON.parse(saved) as Partial<MilkBookData>;
    return {
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      rates: Array.isArray(parsed.rates) ? parsed.rates : [],
    };
  } catch {
    return emptyData();
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<MilkBookData>(emptyData);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<MilkBookUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loginForm, setLoginForm] = useState({phone: '', password: ''});
  const [section, setSection] = useState<Section>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [entryDate, setEntryDate] = useState(localDate);
  const [entryValues, setEntryValues] = useState({morningLitres: '', morningFat: '', eveningLitres: '', eveningFat: ''});
  const [rateValue, setRateValue] = useState('');
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerForm, setCustomerForm] = useState({name: '', phone: '', address: ''});
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth', {cache: 'no-store'})
      .then(async response => {
        if (!response.ok) throw new Error('Could not check your MilkBook session.');
        return response.json() as Promise<{user: MilkBookUser | null}>;
      })
      .then(session => {
        if (cancelled) return;
        const activeUser = session.user;
        setUser(activeUser);
        setData(activeUser ? readAccountData(activeUser.id) : emptyData());
        setReady(true);
        setAuthReady(true);
        if (activeUser) void refreshSharedData(activeUser.id);
      })
      .catch(() => {
        if (cancelled) return;
        setAuthError('Could not check your sign-in session. You can try signing in again.');
        setData(emptyData());
        setReady(true);
        setAuthReady(true);
      });
    return () => {cancelled = true;};
  }, []);

  async function refreshSharedData(userId: string, months = [...new Set([selectedMonth, currentMonth()])], customerIds?: string[]) {
    try {
      const latest = await fetchSharedData(months, customerIds);
      const monthSet = new Set(months);
      const customerSet = customerIds ? new Set(customerIds) : null;
      setData(current => ({
        customers: latest.customers,
        entries: [...current.entries.filter(entry => !(monthSet.has(entry.date.slice(0, 7)) && (!customerSet || customerSet.has(entry.customerId)))), ...latest.entries],
        rates: [...current.rates.filter(rate => !(monthSet.has(rate.month) && (!customerSet || customerSet.has(rate.customerId)))), ...latest.rates],
      }));
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? `${error.message} Showing the last saved browser copy.` : 'Sync failed. Showing the last saved browser copy.');
      return false;
    }
  }

  useEffect(() => {
    if (!user) return;
    const refreshSelectedIfVisible = () => {
      if (document.visibilityState === 'visible' && selectedCustomerId) {
        void refreshSharedData(user.id, [...new Set([selectedMonth, currentMonth()])], [selectedCustomerId]);
      }
    };
    const refreshEverythingIfVisible = () => {
      if (document.visibilityState === 'visible') void refreshSharedData(user.id);
    };
    const timer = window.setInterval(refreshSelectedIfVisible, 15000);
    window.addEventListener('focus', refreshEverythingIfVisible);
    document.addEventListener('visibilitychange', refreshEverythingIfVisible);
    refreshSelectedIfVisible();
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshEverythingIfVisible);
      document.removeEventListener('visibilitychange', refreshEverythingIfVisible);
    };
  }, [user, selectedMonth, selectedCustomerId]);

  useEffect(() => {
    if (ready && user) window.localStorage.setItem(accountStorageKey(user.id), JSON.stringify(data));
  }, [data, ready, user]);

  useEffect(() => {
    if (!selectedCustomerId && data.customers.length) setSelectedCustomerId(data.customers[0].id);
    if (selectedCustomerId && !data.customers.some(customer => customer.id === selectedCustomerId)) {
      setSelectedCustomerId(data.customers[0]?.id ?? '');
    }
  }, [data.customers, selectedCustomerId]);

  useEffect(() => {
    const entry = data.entries.find(item => item.customerId === selectedCustomerId && item.date === entryDate);
    setEntryValues({
      morningLitres: entry?.morningLitres ? String(entry.morningLitres) : '',
      morningFat: entry?.morningFat ? String(entry.morningFat) : '',
      eveningLitres: entry?.eveningLitres ? String(entry.eveningLitres) : '',
      eveningFat: entry?.eveningFat ? String(entry.eveningFat) : '',
    });
  }, [data.entries, entryDate, selectedCustomerId]);

  useEffect(() => {
    const rate = data.rates.find(item => item.customerId === selectedCustomerId && item.month === selectedMonth);
    setRateValue(rate?.rate ? String(rate.rate) : '');
  }, [data.rates, selectedCustomerId, selectedMonth]);

  const today = localDate();
  const todayEntries = useMemo(() => data.entries.filter(entry => entry.date === today), [data.entries, today]);
  const todayTotals = useMemo(() => calculateMilkTotals(todayEntries, 0), [todayEntries]);
  const todayAmount = useMemo(() => todayEntries.reduce((sum, entry) => {
    const rate = data.rates.find(item => item.customerId === entry.customerId && item.month === today.slice(0, 7))?.rate ?? 0;
    return sum + entry.morningLitres * entry.morningFat * rate + entry.eveningLitres * entry.eveningFat * rate;
  }, 0), [todayEntries, data.rates, today]);
  const monthEntries = useMemo(() => data.entries.filter(entry => entry.date.startsWith(selectedMonth)), [data.entries, selectedMonth]);
  const billEntries = useMemo(
    () => monthEntries.filter(entry => entry.customerId === selectedCustomerId).sort((a, b) => a.date.localeCompare(b.date)),
    [monthEntries, selectedCustomerId],
  );
  const selectedRate = data.rates.find(item => item.customerId === selectedCustomerId && item.month === selectedMonth)?.rate ?? 0;
  const bill = useMemo(() => calculateMilkTotals(billEntries, selectedRate), [billEntries, selectedRate]);
  const customerName = data.customers.find(customer => customer.id === selectedCustomerId)?.name ?? 'Select a customer';
  const sectionLabel = navigation.find(item => item.id === section)?.label ?? 'Dashboard';

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(loginForm),
      });
      const result = await response.json() as {user?: MilkBookUser; error?: string};
      if (!response.ok || !result.user) throw new Error(result.error || 'Sign in failed. Try again.');
      setUser(result.user);
      setData(readAccountData(result.user.id));
      setSelectedCustomerId('');
      setSection('dashboard');
      setReady(true);
      setAuthReady(true);
      setLoginForm(current => ({...current, password: ''}));
      await refreshSharedData(result.user.id);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign in failed. Try again.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function signOut() {
    try {
      const response = await fetch('/api/auth', {method: 'DELETE'});
      if (!response.ok) throw new Error('The browser could not end your session. Please try again.');
    } catch {
      setNotice('Could not complete sign out. Please try again.');
      return;
    }
    setUser(null);
    setData(emptyData());
    setSelectedCustomerId('');
    setReady(true);
    setAuthError('');
    setNotice('');
    setLoginForm({phone: '', password: ''});
  }

  function updateEntryValue(key: keyof typeof entryValues, value: string) {
    if (value === '' || /^\d*(\.\d*)?$/.test(value)) setEntryValues(current => ({...current, [key]: value}));
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = customerForm.name.trim();
    if (!name) return;
    try {
      if (editingCustomerId) {
        await dataRequest(`customers/${encodeURIComponent(editingCustomerId)}`, {method: 'PUT', body: JSON.stringify({...customerForm, name})});
        setNotice('Customer updated and synced.');
      } else {
        const created = await dataRequest<ApiCustomer>('customers', {method: 'POST', body: JSON.stringify({...customerForm, name})});
        if (!created._id && !created.id) throw new Error('MilkBook did not return the new customer ID.');
        const customer = {id: String(created._id ?? created.id), ...customerForm, name};
        setData(current => ({...current, customers: [...current.customers, customer]}));
        setSelectedCustomerId(customer.id);
        setNotice('Customer added and synced.');
      }
      if (user) await refreshSharedData(user.id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not sync customer.');
      return;
    }
    setCustomerForm({name: '', phone: '', address: ''});
    setEditingCustomerId(null);
    setShowCustomerForm(false);
  }

  function editCustomer(customer: Customer) {
    setCustomerForm({name: customer.name, phone: customer.phone, address: customer.address});
    setEditingCustomerId(customer.id);
    setShowCustomerForm(true);
  }

  async function removeCustomer(customer: Customer) {
    if (!window.confirm(`Delete ${customer.name} and their local milk records and rates?`)) return;
    try {
      await dataRequest(`customers/${encodeURIComponent(customer.id)}`, {method: 'DELETE'});
      if (user) await refreshSharedData(user.id);
      setNotice('Customer deleted and synced.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not delete customer.');
    }
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCustomerId || !entryDate) return;
    const values = {
      morningLitres: Number(entryValues.morningLitres) || 0,
      morningFat: Number(entryValues.morningFat) || 0,
      eveningLitres: Number(entryValues.eveningLitres) || 0,
      eveningFat: Number(entryValues.eveningFat) || 0,
    };
    if (values.morningLitres < 0 || values.morningFat < 0 || values.eveningLitres < 0 || values.eveningFat < 0) return;
    const existing = data.entries.find(item => item.customerId === selectedCustomerId && item.date === entryDate);
    const payload = {customerId: selectedCustomerId, date: entryDate, morningLiter: values.morningLitres, morningFat: values.morningFat, eveningLiter: values.eveningLitres, eveningFat: values.eveningFat};
    try {
      await dataRequest(existing ? `milk/${encodeURIComponent(existing.id)}` : 'milk', {method: existing ? 'PUT' : 'POST', body: JSON.stringify(existing ? {...payload, customerId: undefined} : payload)});
      if (user) await refreshSharedData(user.id, [...new Set([entryDate.slice(0, 7), currentMonth()])]);
      setNotice(`Milk entry saved and synced for ${formatLongDate(entryDate)}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not sync milk entry.');
    }
  }

  async function saveRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCustomerId) return;
    const rate = Number(rateValue);
    if (!Number.isFinite(rate) || rate < 0) return;
    const [year, month] = selectedMonth.split('-').map(Number);
    try {
      await dataRequest('rates', {method: 'POST', body: JSON.stringify({customerId: selectedCustomerId, month, year, rate})});
      if (user) await refreshSharedData(user.id);
      setNotice(`Rate saved and synced for ${customerName} · ${selectedMonth}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not sync rate.');
    }
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify({version: 1, exportedAt: new Date().toISOString(), ...data}, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `milkbook-backup-${today}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Browser data backup downloaded.');
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Partial<MilkBookData>;
      if (!Array.isArray(parsed.customers) || !Array.isArray(parsed.entries) || !Array.isArray(parsed.rates)) {
        throw new Error('Backup fields are missing.');
      }
      setData({customers: parsed.customers as Customer[], entries: parsed.entries as Entry[], rates: parsed.rates as Rate[]});
      setNotice('Backup restored in this browser.');
    } catch {
      setNotice('That file is not a valid MilkBook JSON backup.');
    }
    event.target.value = '';
  }

  if (!authReady) {
    return <main className="auth-screen"><section className="auth-card"><span className="brand-mark">MB</span><p className="auth-kicker">MILKBOOK ACCOUNT</p><h1>Checking your session…</h1><p className="muted">One moment while we securely load your account.</p></section></main>;
  }

  if (!user) {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <a className="brand auth-brand" href="#login"><span className="brand-mark">MB</span><span>Milk<span className="brand-light">Book</span></span></a>
          <p className="auth-kicker">MILKBOOK ACCOUNT</p>
          <h1>Welcome back</h1>
          <p className="auth-subtitle">Sign in to open your dairy workspace.</p>
          <form className="auth-form" onSubmit={event => void signIn(event)}>
            <Field label="Phone number" value={loginForm.phone} onChange={value => setLoginForm(current => ({...current, phone: value}))} required inputMode="tel" placeholder="Enter your phone number" />
            <Field label="Password" type="password" value={loginForm.password} onChange={value => setLoginForm(current => ({...current, password: value}))} required placeholder="Enter your password" />
            {authError && <p className="auth-error" role="alert">{authError}</p>}
            <button className="button button-primary auth-submit" type="submit" disabled={authLoading}>{authLoading ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <p className="auth-footnote">Sign in with the same MilkBook account you use on Android. Customer, milk, and rate changes sync through your MilkBook account.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <a className="brand" href="#home" onClick={event => {event.preventDefault(); setSection('dashboard');}}>
          <span className="brand-mark">MB</span><span>Milk<span className="brand-light">Book</span></span>
        </a>
        <p className="nav-label">WORKSPACE</p>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(item => (
            <button key={item.id} className={`nav-item ${section === item.id ? 'active' : ''}`} onClick={() => setSection(item.id)}>
              <span aria-hidden="true">{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom"><span className="sync-indicator local-indicator"/><div><strong>Signed in as {user.name || user.phone}</strong><small>Shared MilkBook account · browser cache</small></div></div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div><span className="mobile-brand">MilkBook</span><span className="breadcrumb">Workspace / {sectionLabel}</span></div>
          <div className="topbar-actions">
            <label className="button button-quiet backup-restore">Restore backup<input type="file" accept="application/json,.json" onChange={event => void importBackup(event)} /></label>
            <button className="button button-quiet" onClick={exportBackup}>Download backup</button>
            <span className="profile"><span className="profile-avatar">{(user.name || user.phone || 'MB').slice(0, 1).toUpperCase()}</span><span><strong>{user.name || 'My Dairy'}</strong><small>{user.phone}</small></span></span>
            <button className="button button-quiet signout-button" onClick={() => void signOut()}>Sign out</button>
          </div>
        </header>

        <nav className="mobile-nav" aria-label="Main navigation">
          {navigation.map(item => <button key={item.id} aria-label={item.label} title={item.label} className={section === item.id ? 'active' : ''} onClick={() => setSection(item.id)}><span>{item.icon}</span><small>{item.label}</small></button>)}
        </nav>

        <div className="page-content">
          {notice && <div className="toast" role="status"><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice('')}>×</button></div>}
          {!ready ? <div className="loading-card">Loading your MilkBook data…</div> : null}

          {ready && section === 'dashboard' && (
            <>
              <div className="welcome-row"><div><p className="overline">DAIRY OVERVIEW</p><h1>Good day 👋</h1><p className="muted">Your MilkBook records at a glance.</p></div><span className="date-chip">{formatLongDate(today)}</span></div>
              <section className="hero"><div><span className="hero-tag">MILKBOOK WORKSPACE</span><h2>Every collection,<br/>clear and accounted for.</h2><p>Manage customers, record both daily sessions, set rates, and review monthly bills.</p><span className="hero-note">Offline on this device · {data.customers.length} {data.customers.length === 1 ? 'customer' : 'customers'}</span></div><div className="hero-art" aria-hidden="true"><div className="art-circle">✦</div><div className="art-card"><span>TODAY’S COLLECTION</span><strong>{todayTotals.totalMilk.toFixed(1)} litres · {money(todayAmount)}</strong><div className="art-bars"><i/><i/><i/><i/><i/><i/><i/></div></div></div></section>
              <div className="section-heading"><div><h2>Today’s overview</h2><p className="muted">Morning and evening collection totals</p></div><span className="period-chip">Today</span></div>
              <section className="metric-grid">
                <Metric label="Customers" value={String(data.customers.length)} note="In this browser" icon="♙" />
                <Metric label="Milk collected" value={`${todayTotals.totalMilk.toFixed(1)} L`} note="Morning + evening" icon="◉" />
                <Metric label="Total fat" value={todayTotals.totalFat.toFixed(1)} note="Entered session readings" icon="◇" />
                <Metric label="Milk amount" value={money(todayAmount)} note="Uses each customer’s saved rate" icon="₹" />
              </section>
              <div className="section-heading"><div><h2>Quick actions</h2><p className="muted">Open a MilkBook tool</p></div></div>
              <section className="shortcut-grid">
                <Shortcut icon="＋" title="Milk collection" description="Record morning and evening milk and fat" onClick={() => setSection('collection')} />
                <Shortcut icon="♙" title="Customers" description="Add people and review their details" onClick={() => setSection('customers')} />
                <Shortcut icon="▤" title="Billing & reports" description="See monthly sessions and customer totals" onClick={() => setSection('billing')} />
                <Shortcut icon="₹" title="Milk rates" description="Set a rate for each customer and month" onClick={() => setSection('rates')} />
              </section>
              <p className="notice"><strong>Shared MilkBook data:</strong> Changes sync through your account. This browser keeps a local cache for quicker loading; backup restore imports records into this browser only.</p>
            </>
          )}

          {ready && section === 'customers' && (
            <>
              <PageHeading eyebrow="CUSTOMER BOOK" title="Customers" subtitle="Customer details and their milk history." action={<button className="button button-primary" onClick={() => {setEditingCustomerId(null); setCustomerForm({name: '', phone: '', address: ''}); setShowCustomerForm(show => !show);}}>＋ Add customer</button>} />
              {showCustomerForm && <section className="panel form-panel"><div className="panel-heading"><div><h2>{editingCustomerId ? 'Edit customer' : 'New customer'}</h2><p className="muted">Name is required. Phone and address are optional.</p></div><button className="icon-button" onClick={() => setShowCustomerForm(false)} aria-label="Close form">×</button></div><form className="form-grid" onSubmit={saveCustomer}><Field label="Customer name" value={customerForm.name} onChange={value => setCustomerForm(current => ({...current, name: value}))} required placeholder="e.g. Ramesh Patel" /><Field label="Phone number" value={customerForm.phone} onChange={value => setCustomerForm(current => ({...current, phone: value}))} inputMode="tel" placeholder="Optional" /><Field label="Address" value={customerForm.address} onChange={value => setCustomerForm(current => ({...current, address: value}))} placeholder="Village or address" /><div className="form-actions"><button className="button button-primary" type="submit">{editingCustomerId ? 'Save changes' : 'Add customer'}</button><button className="button button-quiet" type="button" onClick={() => setShowCustomerForm(false)}>Cancel</button></div></form></section>}
              {data.customers.length === 0 ? <EmptyState icon="♙" title="No customers yet" description="Add your first customer to start recording milk collection." action={<button className="button button-primary" onClick={() => setShowCustomerForm(true)}>Add first customer</button>} /> : <section className="panel table-panel"><div className="panel-heading"><div><h2>Customer list</h2><p className="muted">{data.customers.length} {data.customers.length === 1 ? 'customer' : 'customers'}</p></div></div><div className="table-scroll"><table><thead><tr><th>Customer</th><th>Phone</th><th>Address</th><th>This month</th><th aria-label="Actions"/></tr></thead><tbody>{data.customers.map(customer => {const total = calculateMilkTotals(data.entries.filter(entry => entry.customerId === customer.id && entry.date.startsWith(currentMonth())), 0); return <tr key={customer.id}><td><button className="customer-link" onClick={() => {setSelectedCustomerId(customer.id); setSection('billing');}}><span className="customer-avatar">{customer.name.slice(0, 1).toUpperCase()}</span><strong>{customer.name}</strong></button></td><td>{customer.phone || '—'}</td><td>{customer.address || '—'}</td><td>{total.totalMilk.toFixed(1)} L</td><td className="row-actions"><button className="text-button" onClick={() => editCustomer(customer)}>Edit</button><button className="text-button danger" onClick={() => removeCustomer(customer)}>Delete</button></td></tr>;})}</tbody></table></div></section>}
            </>
          )}

          {ready && section === 'collection' && (
            <>
              <PageHeading eyebrow="DAILY RECORD" title="Milk collection" subtitle="One entry per customer per day, with morning and evening sessions." />
              <section className="panel entry-panel"><div className="panel-heading"><div><h2>Daily milk entry</h2><p className="muted">Save or update this customer’s record for the selected date.</p></div></div>
                {data.customers.length === 0 ? <EmptyInline message="Add a customer before recording milk." action={<button className="button button-primary" onClick={() => setSection('customers')}>Go to customers</button>} /> : <form onSubmit={saveEntry}>
                  <div className="form-grid entry-meta"><SelectField label="Customer" value={selectedCustomerId} onChange={setSelectedCustomerId} options={data.customers.map(customer => ({value: customer.id, label: customer.name}))} /><Field label="Collection date" type="date" value={entryDate} onChange={setEntryDate} required /></div>
                  <div className="session-grid">
                    <SessionCard title="Morning session" icon="☀" litreValue={entryValues.morningLitres} fatValue={entryValues.morningFat} onLitres={value => updateEntryValue('morningLitres', value)} onFat={value => updateEntryValue('morningFat', value)} />
                    <SessionCard title="Evening session" icon="☾" litreValue={entryValues.eveningLitres} fatValue={entryValues.eveningFat} onLitres={value => updateEntryValue('eveningLitres', value)} onFat={value => updateEntryValue('eveningFat', value)} />
                  </div>
                  <div className="entry-footer"><p className="muted">Amount is calculated later from each session’s litres × fat × rate.</p><button className="button button-primary" type="submit">Save milk entry</button></div>
                </form>}
              </section>
              <section className="panel table-panel"><div className="panel-heading"><div><h2>Recent entries</h2><p className="muted">Most recent records from this browser</p></div></div>{data.entries.length === 0 ? <EmptyInline message="Saved milk entries will appear here." /> : <div className="table-scroll"><table><thead><tr><th>Date</th><th>Customer</th><th>Morning</th><th>Evening</th><th>Total</th></tr></thead><tbody>{[...data.entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map(entry => <tr key={entry.id}><td>{formatLongDate(entry.date)}</td><td>{data.customers.find(customer => customer.id === entry.customerId)?.name ?? 'Deleted customer'}</td><td>{entry.morningLitres || '—'} L · {entry.morningFat || '—'} F</td><td>{entry.eveningLitres || '—'} L · {entry.eveningFat || '—'} F</td><td>{(entry.morningLitres + entry.eveningLitres).toFixed(1)} L</td></tr>)}</tbody></table></div>}</section>
            </>
          )}

          {ready && section === 'billing' && (
            <>
              <PageHeading eyebrow="MONTHLY STATEMENT" title="Billing & reports" subtitle="Review customer sessions and calculate the monthly amount." />
              <section className="panel filter-panel"><SelectField label="Customer" value={selectedCustomerId} onChange={setSelectedCustomerId} options={data.customers.map(customer => ({value: customer.id, label: customer.name}))} emptyLabel="No customers" /><Field label="Billing month" type="month" value={selectedMonth} onChange={setSelectedMonth} required /><div className="rate-summary"><span>Saved rate</span><strong>{money(selectedRate)} <small>/ fat unit</small></strong><button className="text-button" onClick={() => setSection('rates')}>Edit rate</button></div></section>
              {data.customers.length === 0 ? <EmptyState icon="₹" title="Billing starts with customers" description="Add a customer, record milk, and set a monthly rate to see a bill." action={<button className="button button-primary" onClick={() => setSection('customers')}>Add customer</button>} /> : <>
                <section className="bill-summary"><Metric label="Total milk" value={`${bill.totalMilk.toFixed(1)} L`} note={`${billEntries.length} recorded ${billEntries.length === 1 ? 'day' : 'days'}`} icon="◉" /><Metric label="Total fat" value={bill.totalFat.toFixed(1)} note="Sum of entered session readings" icon="◇" /><Metric label="Average fat" value={bill.averageFat.toFixed(2)} note="Display only" icon="≈" /><Metric label="Total amount" value={money(bill.amount)} note="Sum of session amounts" icon="₹" /></section>
                <section className="panel table-panel bill-panel"><div className="panel-heading"><div><h2>{customerName}</h2><p className="muted">Statement for {selectedMonth}</p></div><button className="button button-quiet" onClick={() => window.print()}>Print bill</button></div>{billEntries.length === 0 ? <EmptyInline message="No milk entries for this customer and month." action={<button className="button button-primary" onClick={() => {setEntryDate(`${selectedMonth}-01`); setSection('collection');}}>Add an entry</button>} /> : <div className="table-scroll"><table><thead><tr><th>Date</th><th>Morning litres</th><th>Morning fat</th><th>Evening litres</th><th>Evening fat</th><th>Day amount</th></tr></thead><tbody>{billEntries.map(entry => {const rate = selectedRate; const amount = entry.morningLitres * entry.morningFat * rate + entry.eveningLitres * entry.eveningFat * rate; return <tr key={entry.id}><td>{formatLongDate(entry.date)}</td><td>{entry.morningLitres || '—'}</td><td>{entry.morningFat || '—'}</td><td>{entry.eveningLitres || '—'}</td><td>{entry.eveningFat || '—'}</td><td><strong>{money(amount)}</strong></td></tr>;})}</tbody><tfoot><tr><td>Total</td><td>{billEntries.reduce((sum, entry) => sum + entry.morningLitres, 0).toFixed(1)}</td><td>{billEntries.reduce((sum, entry) => sum + entry.morningFat, 0).toFixed(1)}</td><td>{billEntries.reduce((sum, entry) => sum + entry.eveningLitres, 0).toFixed(1)}</td><td>{billEntries.reduce((sum, entry) => sum + entry.eveningFat, 0).toFixed(1)}</td><td>{money(bill.amount)}</td></tr></tfoot></table></div>}<p className="bill-rule">Bill rule: each session’s litres × fat × {money(selectedRate)} rate, added together.</p></section>
              </>}
            </>
          )}

          {ready && section === 'rates' && (
            <>
              <PageHeading eyebrow="MONTHLY PRICING" title="Milk rates" subtitle="Rates are saved per customer and month, as in the MilkBook app." />
              <section className="panel rate-panel"><div className="panel-heading"><div><h2>Set customer rate</h2><p className="muted">The saved rate is used for both morning and evening sessions.</p></div></div>{data.customers.length === 0 ? <EmptyInline message="Add a customer before setting a rate." action={<button className="button button-primary" onClick={() => setSection('customers')}>Go to customers</button>} /> : <form className="rate-form" onSubmit={saveRate}><SelectField label="Customer" value={selectedCustomerId} onChange={setSelectedCustomerId} options={data.customers.map(customer => ({value: customer.id, label: customer.name}))} /><Field label="Month" type="month" value={selectedMonth} onChange={setSelectedMonth} required /><Field label="Rate per fat unit (₹)" type="number" value={rateValue} onChange={setRateValue} min="0" step="0.01" required placeholder="e.g. 8.40" /><button className="button button-primary" type="submit">Save rate</button></form>}</section>
              <section className="panel table-panel"><div className="panel-heading"><div><h2>Saved rates</h2><p className="muted">Customer-specific pricing history</p></div></div>{data.rates.length === 0 ? <EmptyInline message="Rates you save will appear here." /> : <div className="table-scroll"><table><thead><tr><th>Customer</th><th>Month</th><th>Rate per fat unit</th></tr></thead><tbody>{[...data.rates].sort((a, b) => b.month.localeCompare(a.month)).map(rate => <tr key={`${rate.customerId}-${rate.month}`}><td>{data.customers.find(customer => customer.id === rate.customerId)?.name ?? 'Deleted customer'}</td><td>{rate.month}</td><td>{money(rate.rate)}</td></tr>)}</tbody></table></div>}</section>
            </>
          )}
          <footer>MILKBOOK <span>·</span> LOCAL WORKSPACE</footer>
        </div>
      </section>
    </main>
  );
}

function Metric({label, value, note, icon}: {label: string; value: string; note: string; icon: string}) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><strong>{value}</strong><small>{note}</small></article>;
}

function PageHeading({eyebrow, title, subtitle, action}: {eyebrow: string; title: string; subtitle: string; action?: ReactNode}) {
  return <div className="page-heading"><div><p className="overline">{eyebrow}</p><h1>{title}</h1><p className="muted">{subtitle}</p></div>{action}</div>;
}

function Field({label, value, onChange, type = 'text', placeholder, required, inputMode, min, step}: {
  label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean;
  inputMode?: 'text' | 'tel' | 'decimal' | 'numeric'; min?: string; step?: string;
}) {
  return <label className="field"><span>{label}</span><input type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} required={required} inputMode={inputMode} min={min} step={step} /></label>;
}

function SelectField({label, value, onChange, options, emptyLabel = 'Select customer'}: {
  label: string; value: string; onChange: (value: string) => void; options: {value: string; label: string}[]; emptyLabel?: string;
}) {
  return <label className="field"><span>{label}</span><select value={value} onChange={event => onChange(event.target.value)} disabled={options.length === 0}><option value="">{emptyLabel}</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function SessionCard({title, icon, litreValue, fatValue, onLitres, onFat}: {
  title: string; icon: string; litreValue: string; fatValue: string; onLitres: (value: string) => void; onFat: (value: string) => void;
}) {
  return <div className="session-card"><h3><span>{icon}</span>{title}</h3><div className="session-fields"><Field label="Milk (litres)" type="number" value={litreValue} onChange={onLitres} min="0" step="0.1" placeholder="0.0" /><Field label="Fat" type="number" value={fatValue} onChange={onFat} min="0" step="0.1" placeholder="0.0" /></div></div>;
}

function Shortcut({icon, title, description, onClick}: {icon: string; title: string; description: string; onClick: () => void}) {
  return <button className="shortcut" onClick={onClick}><span className="shortcut-icon">{icon}</span><span className="shortcut-copy"><strong>{title}</strong><small>{description}</small></span><span className="arrow">→</span></button>;
}

function EmptyState({icon, title, description, action}: {icon: string; title: string; description: string; action: ReactNode}) {
  return <section className="empty-state"><span className="empty-icon">{icon}</span><h2>{title}</h2><p>{description}</p>{action}</section>;
}

function EmptyInline({message, action}: {message: string; action?: ReactNode}) {
  return <div className="empty-inline"><p>{message}</p>{action}</div>;
}
