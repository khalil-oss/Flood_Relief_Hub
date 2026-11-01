import { useState, useEffect } from 'react';
import { 
  User, 
  Building2, 
  Briefcase, 
  AlertCircle, 
  Users,
  LogOut,
  Truck,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { campsApi } from '../api/camps.api';
import { dispatchesApi } from '../api/dispatches.api';
import { needsApi } from '../api/needs.api';
import { formatNumber, formatDate } from '../utils/formatting';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import EmptyState from '../components/ui/EmptyState';

const SKILL_ICONS = {
  Medical: '🩺',
  Logistics: '📦',
  Cooking: '🍳',
  Driving: '🚛',
  Counselling: '💬',
};

const VolunteerDashboard = () => {
  const { volunteerRecord, logout, isVolunteer, user } = useAuth();
  const [camp, setCamp] = useState(null);
  const [recentDispatches, setRecentDispatches] = useState([]);
  const [campNeeds, setCampNeeds] = useState([]);
  const [_loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (!isVolunteer || !volunteerRecord) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch assigned camp if volunteer has camp_id
        if (volunteerRecord.camp_id) {
          const [campRes, dispatchesRes, needsRes] = await Promise.all([
            campsApi.getById(volunteerRecord.camp_id),
            dispatchesApi.getByCamp(volunteerRecord.camp_id),
            needsApi.getByCamp(volunteerRecord.camp_id),
          ]);
          
          if (campRes.data) {
            setCamp(campRes.data);
          }
          
          // Filter recent dispatches (last 5)
          const allDispatches = dispatchesRes.data || [];
          const sortedDispatches = [...allDispatches]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);
          setRecentDispatches(sortedDispatches);
          
          // Filter needs for this camp
          setCampNeeds(needsRes.data || []);
        }
      } catch (err) {
        console.error('Failed to load volunteer dashboard:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [volunteerRecord, isVolunteer]);

  const getStatusBadge = (status) => {
    const variants = {
      Active: 'success',
      Full: 'warning',
      Closed: 'neutral',
      Pending: 'warning',
      'In Transit': 'info',
      Delivered: 'success',
      Cancelled: 'neutral',
    };
    return <Badge variant={variants[status] || 'neutral'}>{status}</Badge>;
  };

  if (!isVolunteer) {
    return (
      <div className="text-center py-12">
        <Shield className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-surface-900 mb-2">Access Denied</h2>
        <p className="text-surface-500 mb-4">This page is only accessible to volunteers.</p>
        <Button onClick={() => window.location.href = '/dashboard'}>Go to Admin Dashboard</Button>
      </div>
    );
  }

  if (!volunteerRecord) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-surface-900 mb-2">Volunteer Record Not Found</h2>
        <p className="text-surface-500 mb-4">Unable to load your volunteer profile. Please contact your coordinator.</p>
        <Button variant="secondary" onClick={logout}>Sign Out</Button>
      </div>
    );
  }

const skillIcon = SKILL_ICONS[volunteerRecord.skill] || '👤';
  const campName = camp?.name || 'Not Assigned';
  const campDistrict = camp?.district || '-';

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <User className="w-6 h-6 text-primary-600" />
            My Dashboard
          </h1>
          <p className="page-subtitle">Welcome back, {volunteerRecord.name}</p>
        </div>
        <Button variant="secondary" onClick={logout} icon={<LogOut className="w-4 h-4" />}>
          Sign Out
        </Button>
      </div>

      {activeTab === 'dashboard' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="kpi-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="kpi-label">My Profile</p>
                  <p className="kpi-value text-base">{volunteerRecord.name}</p>
                  <p className="kpi-subtitle">Volunteer ID: {volunteerRecord.id}</p>
                </div>
                <div className="kpi-icon bg-primary-100 text-primary-600 text-3xl">
                  {skillIcon}
                </div>
              </div>
            </Card>

            <Card className="kpi-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="kpi-label">My Skill</p>
                  <p className="kpi-value text-base">{volunteerRecord.skill}</p>
                  <p className="kpi-subtitle">Specialization</p>
                </div>
                <div className="kpi-icon bg-green-100 text-green-600">
                  <Briefcase className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card className="kpi-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="kpi-label">Assigned Camp</p>
                  <p className="kpi-value text-base">{campName}</p>
                  <p className="kpi-subtitle">{campDistrict} District</p>
                </div>
                <div className={`kpi-icon ${camp?.status === 'Active' ? 'bg-green-100 text-green-600' : camp?.status === 'Full' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                  <Building2 className="w-6 h-6" />
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-surface-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary-600" />
                  My Assignment
                </h2>
              </CardHeader>
              <CardBody>
                {camp ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-surface-500">Camp Name</p>
                        <p className="font-medium text-surface-900">{camp.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-surface-500">District</p>
                        <p className="font-medium text-surface-900">{camp.district}</p>
                      </div>
                      <div>
                        <p className="text-sm text-surface-500">Status</p>
                        <p className="font-medium text-surface-900">{getStatusBadge(camp.status)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-surface-500">Capacity</p>
                        <p className="font-medium text-surface-900">{formatNumber(camp.capacity)} families</p>
                      </div>
                      <div>
                        <p className="text-sm text-surface-500">Current Families</p>
                        <p className="font-medium text-surface-900">{formatNumber(camp.current_families)} families</p>
                      </div>
                      <div>
                        <p className="text-sm text-surface-500">Utilization</p>
                        <p className="font-medium text-surface-900">
                          {camp.capacity > 0
                            ? Math.round((camp.current_families / camp.capacity) * 100) + '%'
                            : '0%'}
                        </p>
                      </div>
                    </div>

                    {campNeeds.length > 0 && (
                      <div className="pt-4 border-t border-surface-200">
                        <h3 className="font-medium text-surface-900 mb-3">Camp Needs ({campNeeds.length})</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {campNeeds.slice(0, 10).map(need => (
                            <div key={need.id} className="p-3 bg-surface-50 rounded-lg flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge variant="info">{need.priority}</Badge>
                                <span className="font-medium text-surface-900">{need.item_name || 'Item'}</span>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-surface-600">Required: {formatNumber(need.required_quantity)}</span>
                                <span className="text-primary-600 font-medium">Fulfilled: {formatNumber(need.fulfilled_quantity)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-16 h-16 text-surface-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-surface-900 mb-2">Not Currently Assigned</h3>
                    <p className="text-surface-500 mb-4">You are not currently assigned to a camp. Please contact your coordinator for assignment.</p>
                    <div className="text-sm text-surface-400">
                      Your skill: <span className="font-medium text-primary-600">{volunteerRecord.skill}</span>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

          </div>
        </>
      )}

      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-surface-900 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-600" />
              My Profile
            </h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-surface-500">Name</p>
                  <p className="font-medium text-surface-900 text-lg">{volunteerRecord.name}</p>
                </div>
                <div>
                  <p className="text-sm text-surface-500">Email</p>
                  <p className="font-medium text-surface-900">{volunteerRecord.email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-surface-500">Skill</p>
                  <p className="font-medium text-surface-900">{volunteerRecord.skill}</p>
                </div>
                <div>
                  <p className="text-sm text-surface-500">Volunteer ID</p>
                  <p className="font-medium text-surface-900 font-mono">{volunteerRecord.id}</p>
                </div>
                <div>
                  <p className="text-sm text-surface-500">Assigned Camp</p>
                  <p className="font-medium text-surface-900">{campName}</p>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-32 h-32 rounded-2xl bg-primary-100 flex items-center justify-center text-6xl">
                  {skillIcon}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {activeTab === 'camp' && camp && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-surface-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary-600" />
              My Assigned Camp Details
            </h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-surface-500">Camp Name</p>
                  <p className="font-medium text-surface-900">{camp.name}</p>
                </div>
                <div>
                  <p className="text-sm text-surface-500">District</p>
                  <p className="font-medium text-surface-900">{camp.district}</p>
                </div>
                <div>
                  <p className="text-sm text-surface-500">Status</p>
                  <p className="font-medium text-surface-900">{getStatusBadge(camp.status)}</p>
                </div>
                <div>
                  <p className="text-sm text-surface-500">Capacity</p>
                  <p className="font-medium text-surface-900">{formatNumber(camp.capacity)} families</p>
                </div>
                <div>
                  <p className="text-sm text-surface-500">Current Families</p>
                  <p className="font-medium text-surface-900">{formatNumber(camp.current_families)} families</p>
                </div>
                <div>
                  <p className="text-sm text-surface-500">Utilization</p>
                  <p className="font-medium text-surface-900">
                    {camp.capacity > 0
                      ? Math.round((camp.current_families / camp.capacity) * 100) + '%'
                      : '0%'}
                  </p>
                </div>
              </div>

              {campNeeds.length > 0 && (
                <div className="pt-4 border-t border-surface-200">
                  <h3 className="font-medium text-surface-900 mb-3">Camp Needs ({campNeeds.length})</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {campNeeds.map(need => (
                      <div key={need.id} className="p-3 bg-surface-50 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="info">{need.priority}</Badge>
                          <span className="font-medium text-surface-900">{need.item_name || 'Item'}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-surface-600">Required: {formatNumber(need.required_quantity)}</span>
                          <span className="text-primary-600 font-medium">Fulfilled: {formatNumber(need.fulfilled_quantity)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recentDispatches.length > 0 && (
                <div className="pt-4 border-t border-surface-200">
                  <h3 className="font-medium text-surface-900 mb-3">Recent Dispatches ({recentDispatches.length})</h3>
                  <Table
                    data={recentDispatches}
                    keyField="id"
                    columns={[
                      { key: 'id', header: 'ID', render: (v) => <span className="font-mono text-xs">{v.slice(-8)}</span> },
                      { key: 'need_id', header: 'Item', render: () => <span className="text-surface-600">Dispatch Item</span> },
                      { key: 'quantity', header: 'Qty', render: (v) => formatNumber(v) },
                      { key: 'status', header: 'Status', render: getStatusBadge },
                      { key: 'created_at', header: 'Date', render: (v) => formatDate(v) },
                    ]}
                    emptyMessage="No recent dispatches"
                  />
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

export default VolunteerDashboard;