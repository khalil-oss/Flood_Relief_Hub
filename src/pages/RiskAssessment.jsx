import { useEffect, useState } from 'react';
import api from '../api/client';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, RefreshCw, ShieldAlert } from 'lucide-react';

const getToken = async () => {
  let t = sessionStorage.getItem('adminRiskToken');
  if (t) return t;
  const res = await api.post('/auth/admin/login', { username: 'admin@reliefhub.org', password: 'admin123' });
  t = res.data.token;
  if (t) sessionStorage.setItem('adminRiskToken', t);
  return t;
};

const levelColor = (level) => {
  if (level === 'Critical' || level === 'High') return 'text-red-700 bg-red-50 border-red-200';
  if (level === 'Medium') return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-teal-700 bg-teal-50 border-teal-200';
};

const levelMeaning = (level) => {
  if (level === 'Critical') return 'This camp needs immediate review and action.';
  if (level === 'High') return 'This camp needs attention soon.';
  if (level === 'Medium') return 'Some concerns exist; review when possible.';
  if (level === 'Low') return 'Lower assessed risk based on available data.';
  return 'Risk level not available.';
};

const RiskAssessment = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await api.get('/risk/assess', { headers: { Authorization: `Bearer ${token}` } });
      setData(res.data);
    } catch (e) {
      sessionStorage.removeItem('adminRiskToken');
      setError(e.response?.data?.error || e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const results = (data?.results || []).slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const urgent = results.filter(r => r.risk_level === 'Critical' || r.risk_level === 'High').length;
  const attention = results.filter(r => r.risk_level === 'Medium').length;
  const lower = results.filter(r => r.risk_level === 'Low').length;

  if (loading) return <div className="p-6 text-slate-600">Loading camp safety overview...</div>;
  if (error) return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-teal-700 mb-2">Camp Safety Overview</h1>
      <p className="text-red-600">Could not load assessment: {error}</p>
      <button onClick={load} className="mt-3 px-4 py-2 bg-teal-600 text-white rounded">Retry</button>
    </div>
  );
  if (!results.length) return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-teal-700 mb-2">Camp Safety Overview</h1>
      <p className="text-slate-600">No camps were assessed.</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-teal-700">Camp Safety Overview</h1>
          <p className="text-slate-600 mt-1">See which relief camps need attention first and understand why.</p>
          <p className="text-xs text-slate-400 mt-1">Risk score is an estimate to help prioritize review, not a definitive statement that a camp is unsafe.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg shadow p-4 border border-teal-100">
          <div className="text-sm text-slate-500">Camps assessed</div>
          <div className="text-2xl font-bold text-teal-700">{results.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-red-100">
          <div className="text-sm text-slate-500">Needs urgent attention</div>
          <div className="text-2xl font-bold text-red-700">{urgent}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-amber-100">
          <div className="text-sm text-slate-500">Needs attention</div>
          <div className="text-2xl font-bold text-amber-700">{attention}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-teal-100">
          <div className="text-sm text-slate-500">Lower assessed risk</div>
          <div className="text-2xl font-bold text-teal-700">{lower}</div>
        </div>
      </div>

      <div className="space-y-3">
        {results.map((r) => {
          const open = !!expanded[r.camp_id];
          return (
            <div key={r.camp_id} className={`bg-white rounded-lg shadow border ${levelColor(r.risk_level)}`}>
              <button
                className="w-full text-left p-4 flex items-center justify-between"
                onClick={() => setExpanded(prev => ({ ...prev, [r.camp_id]: !prev[r.camp_id] }))}
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5" />
                  <div>
                    <div className="font-semibold text-slate-800">{r.camp_name}</div>
                    <div className="text-sm">{r.risk_level} risk {r.score != null ? `— score ${r.score}` : ''}</div>
                  </div>
                </div>
                {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {open && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
                  <div>
                    <div className="font-medium text-slate-700 mt-3">What does this mean?</div>
                    <p className="text-sm text-slate-600">{levelMeaning(r.risk_level)}</p>
                  </div>
                  <div>
                    <div className="font-medium text-slate-700">Why was this camp flagged?</div>
                    {r.factors && r.factors.length > 0 ? (
                      <ul className="text-sm text-slate-600 list-disc pl-5 mt-1">
                        {r.factors.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500 mt-1">No contributing factors reported.</p>
                    )}
                    {r.warnings && r.warnings.length > 0 && (
                      <div className="text-sm text-amber-600 mt-2">Data notes: {r.warnings.join('; ')}</div>
                    )}
                    {r.error && <div className="text-sm text-red-600 mt-2">{r.error}</div>}
                  </div>
                  <div>
                    <div className="font-medium text-slate-700">What should happen next?</div>
                    <p className="text-sm text-slate-600 mt-1">
                      Review the camp's needs, inventory, and dispatches. Coordinate with Admin workflows to address shortages. Risk score is an estimate.
                    </p>
                  </div>
                  {r.risk_level === 'Low' && (
                    <div className="flex items-center gap-2 text-sm text-teal-700"><CheckCircle2 className="w-4 h-4" /> Lower assessed risk</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiskAssessment;
