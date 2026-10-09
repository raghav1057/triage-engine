import React, { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { ChevronDown, AlertCircle, TrendingUp, Mail } from 'lucide-react';

// ---- MOCK DATA - Edit this to test the dashboard ----
const MOCK_EMAILS = [
  { id: 1, sender: 'customer@acme.com', subject: 'Checkout page crashes', category: 'bug', sentiment: 'angry', priority: 1, summary: 'User unable to complete checkout', timestamp: new Date(Date.now() - 2*60*60000) },
  { id: 2, sender: 'support@example.com', subject: 'Feature request', category: 'praise', sentiment: 'happy', priority: 10, summary: 'Loves the new dashboard', timestamp: new Date(Date.now() - 5*60*60000) },
  { id: 3, sender: 'user@corp.io', subject: 'Login not working', category: 'bug', sentiment: 'frustrated', priority: 2, summary: '500 error on login endpoint', timestamp: new Date(Date.now() - 1*60*60000) },
  { id: 4, sender: 'beta@test.com', subject: 'Slow performance', category: 'complaint', sentiment: 'frustrated', priority: 6, summary: 'Dashboard loads in 10+ seconds', timestamp: new Date(Date.now() - 3*60*60000) },
  { id: 5, sender: 'internal@company.com', subject: 'PDF export broken', category: 'bug', sentiment: 'angry', priority: 2, summary: 'Export button returns blank PDF', timestamp: new Date(Date.now() - 4*60*60000) },
  { id: 6, sender: 'feedback@user.net', subject: 'Great service', category: 'praise', sentiment: 'happy', priority: 10, summary: 'Excellent customer support', timestamp: new Date(Date.now() - 6*60*60000) },
  { id: 7, sender: 'issue@dev.org', subject: 'Mobile UI glitch', category: 'complaint', sentiment: 'worried', priority: 7, summary: 'Buttons misaligned on iPhone', timestamp: new Date(Date.now() - 7*60*60000) },
  { id: 8, sender: 'ops@team.com', subject: 'Data sync delay', category: 'complaint', sentiment: 'neutral', priority: 8, summary: 'Sync takes 5 minutes', timestamp: new Date(Date.now() - 8*60*60000) },
];

// ---- COLOR SCHEME ----
const COLORS = {
  bug: '#ef4444',
  complaint: '#f59e0b',
  other: '#8b5cf6',
  praise: '#10b981',
  angry: '#dc2626',
  frustrated: '#f97316',
  worried: '#eab308',
  neutral: '#6b7280',
  happy: '#06b6d4'
};

const PRIORITY_COLORS = {
  1: '#dc2626', 2: '#ef4444', 3: '#fb923c', 4: '#fbbf24',
  5: '#60a5fa', 6: '#93c5fd', 7: '#bfdbfe', 8: '#dbeafe', 9: '#e0e7ff', 10: '#f3e8ff'
};

// ---- KPI CARD COMPONENT ----
const KPICard = ({ title, value, icon: Icon, trend, color }) => (
  <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold text-white mt-2">{value}</p>
        {trend && <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1"><TrendingUp size={14} /> {trend}</p>}
      </div>
      <Icon className="text-slate-600" size={28} />
    </div>
  </div>
);

// ---- EMAIL TABLE COMPONENT ----
const EmailTable = ({ emails, sortBy, setSortBy }) => {
  const sorted = [...emails].sort((a, b) => {
    if (sortBy === 'priority') return a.priority - b.priority;
    if (sortBy === 'timestamp') return b.timestamp - a.timestamp;
    return 0;
  });

  const getPriorityLabel = (p) => p <= 2 ? 'Critical' : p <= 4 ? 'High' : p <= 7 ? 'Medium' : 'Low';

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300">From</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300">Subject</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300">Category</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300">Sentiment</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 cursor-pointer hover:text-white" onClick={() => setSortBy(sortBy === 'priority' ? 'timestamp' : 'priority')}>
                Priority {sortBy === 'priority' && '↓'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {sorted.map(email => (
              <tr key={email.id} className="hover:bg-slate-700/50 transition">
                <td className="px-6 py-4 text-sm text-slate-300 truncate">{email.sender}</td>
                <td className="px-6 py-4 text-sm text-white truncate">{email.subject}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: COLORS[email.category] + '20', color: COLORS[email.category] }}>
                    {email.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: COLORS[email.sentiment] + '20', color: COLORS[email.sentiment] }}>
                    {email.sentiment}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-semibold" style={{ color: PRIORITY_COLORS[email.priority] }}>
                  P{email.priority} ({getPriorityLabel(email.priority)})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---- MAIN DASHBOARD ----
export default function Dashboard() {
  const [emails, setEmails] = useState(MOCK_EMAILS);
  const [sortBy, setSortBy] = useState('priority');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState({ sender: '', subject: '', category: 'bug', sentiment: 'neutral', priority: 5 });

  // Calculate stats
  const stats = useMemo(() => {
    const totalEmails = emails.length;
    const criticalIssues = emails.filter(e => e.priority <= 2).length;
    const avgPriority = (emails.reduce((sum, e) => sum + e.priority, 0) / emails.length).toFixed(1);
    const alertsSent = emails.length;
    
    const categoryData = [
      { name: 'Bug', value: emails.filter(e => e.category === 'bug').length, fill: COLORS.bug },
      { name: 'Complaint', value: emails.filter(e => e.category === 'complaint').length, fill: COLORS.complaint },
      { name: 'Other', value: emails.filter(e => e.category === 'other').length, fill: COLORS.other },
      { name: 'Praise', value: emails.filter(e => e.category === 'praise').length, fill: COLORS.praise }
    ];

    const sentimentData = [
      { name: 'Angry', value: emails.filter(e => e.sentiment === 'angry').length, fill: COLORS.angry },
      { name: 'Frustrated', value: emails.filter(e => e.sentiment === 'frustrated').length, fill: COLORS.frustrated },
      { name: 'Worried', value: emails.filter(e => e.sentiment === 'worried').length, fill: COLORS.worried },
      { name: 'Neutral', value: emails.filter(e => e.sentiment === 'neutral').length, fill: COLORS.neutral },
      { name: 'Happy', value: emails.filter(e => e.sentiment === 'happy').length, fill: COLORS.happy }
    ];

    return { totalEmails, criticalIssues, avgPriority, alertsSent, categoryData, sentimentData };
  }, [emails]);

  const handleAddEmail = () => {
    if (newEmail.sender && newEmail.subject) {
      setEmails([...emails, {
        id: emails.length + 1,
        ...newEmail,
        priority: parseInt(newEmail.priority),
        timestamp: new Date()
      }]);
      setNewEmail({ sender: '', subject: '', category: 'bug', sentiment: 'neutral', priority: 5 });
      setShowAddForm(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Triage Engine Dashboard</h1>
        <p className="text-slate-400">Real-time email classification & prioritization</p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard title="Total Emails" value={stats.totalEmails} icon={Mail} trend="↑ 12% this week" color="blue" />
        <KPICard title="Critical Issues" value={stats.criticalIssues} icon={AlertCircle} trend="Needs attention" color="red" />
        <KPICard title="Avg Priority" value={stats.avgPriority} icon={TrendingUp} trend="Lower is better" color="purple" />
        <KPICard title="Alerts Sent" value={stats.alertsSent} icon={Mail} trend="All processed" color="green" />
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* CATEGORY PIE */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Category Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={stats.categoryData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} dataKey="value">
                {stats.categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* SENTIMENT BAR */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Sentiment Breakdown</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.sentimentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                {stats.sentimentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ADD EMAIL FORM */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Add Test Email</h2>
          <button onClick={() => setShowAddForm(!showAddForm)} className="text-slate-400 hover:text-white transition">
            <ChevronDown size={20} className={showAddForm ? 'rotate-180' : ''} />
          </button>
        </div>
        {showAddForm && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="email" placeholder="Sender email" value={newEmail.sender} onChange={(e) => setNewEmail({ ...newEmail, sender: e.target.value })} className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500" />
            <input type="text" placeholder="Subject" value={newEmail.subject} onChange={(e) => setNewEmail({ ...newEmail, subject: e.target.value })} className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500" />
            <select value={newEmail.category} onChange={(e) => setNewEmail({ ...newEmail, category: e.target.value })} className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500">
              <option value="bug">Bug</option>
              <option value="complaint">Complaint</option>
              <option value="other">Other</option>
              <option value="praise">Praise</option>
            </select>
            <select value={newEmail.sentiment} onChange={(e) => setNewEmail({ ...newEmail, sentiment: e.target.value })} className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500">
              <option value="angry">Angry</option>
              <option value="frustrated">Frustrated</option>
              <option value="worried">Worried</option>
              <option value="neutral">Neutral</option>
              <option value="happy">Happy</option>
            </select>
            <input type="number" min="1" max="10" placeholder="Priority (1-10)" value={newEmail.priority} onChange={(e) => setNewEmail({ ...newEmail, priority: e.target.value })} className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500" />
            <button onClick={handleAddEmail} className="bg-blue-600 hover:bg-blue-700 rounded px-4 py-2 font-semibold transition">Add Email</button>
          </div>
        )}
      </div>

      {/* EMAIL TABLE */}
      <EmailTable emails={emails} sortBy={sortBy} setSortBy={setSortBy} />

      {/* FOOTER */}
      <p className="text-slate-500 text-xs mt-8 text-center">Mock data for demo. In production, connects to Google Sheets API for live updates.</p>
    </div>
  );
}