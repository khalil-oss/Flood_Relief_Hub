import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Truck,
  Send,
  CheckCircle,
  XCircle,
  MoreVertical,
  Loader2
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { dispatchesApi } from '../api/dispatches.api';
import { campsApi } from '../api/camps.api';
import { needsApi } from '../api/needs.api';
import { inventoryApi } from '../api/inventory.api';
import { validateDispatch } from '../utils/validation';
import { calculateAvailableStock, calculateRemainingDemand, calculateFulfillmentPercentage } from '../utils/calculations';
import { formatNumber, formatDate, formatPercentage, getStatusBadgeClass } from '../utils/formatting';
import { dispatchService } from '../services/dispatch.service';
import { Card, CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import EmptyState from '../components/ui/EmptyState';

const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending' },
  { value: 'In Transit', label: 'In Transit' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const Dispatches = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dispatches, setDispatches] = useState([]);
  const [camps, setCamps] = useState([]);
  const [needs, setNeeds] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [campFilter, setCampFilter] = useState(searchParams.get('camp') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [creatingDispatch, setCreatingDispatch] = useState(false);
  const [formData, setFormData] = useState({
    camp_id: searchParams.get('camp') || '',
    need_id: '',
    quantity: '',
    status: 'Pending',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedNeed, setSelectedNeed] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [availableStock, setAvailableStock] = useState(0);
  const [remainingDemand, setRemainingDemand] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [statusLoadingIds, setStatusLoadingIds] = useState(new Set());

  const campParam = searchParams.get('camp');

  const openCreateDispatch = useCallback(() => {
    setCreatingDispatch(true);
    setFormData(prev => ({ ...prev, camp_id: formData.camp_id || campFilter || '', need_id: '', quantity: '', status: 'Pending' }));
    setFormErrors({});
    setSelectedNeed(null);
    setSelectedItem(null);
    setAvailableStock(0);
    setRemainingDemand(0);
    setModalOpen(true);
  }, [formData.camp_id, campFilter]);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-open modal when on /dispatches/new with camp param
  useEffect(() => {
    const isNewRoute = window.location.pathname === '/dispatches/new';
    if (isNewRoute && campParam && !modalOpen) {
      openCreateDispatch();
    }
  }, [campParam, modalOpen, openCreateDispatch]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dispatchesRes, campsRes, needsRes, inventoryRes] = await Promise.all([
        dispatchesApi.getAll(),
        campsApi.getAll(),
        needsApi.getAll(),
        inventoryApi.getAll(),
      ]);
      
      setDispatches(dispatchesRes.data);
      setCamps(campsRes.data.filter(c => c.status !== 'Closed'));
      setNeeds(needsRes.data);
      setInventory(inventoryRes.data);
    } catch (err) {
      console.error('Failed to fetch dispatches:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDispatches = dispatches.filter(dispatch => {
    const camp = camps.find(c => c.id === dispatch.camp_id);
    const need = needs.find(n => n.id === dispatch.need_id);
    const item = need ? inventory.find(i => i.id === need.inventory_item_id) : null;
    const matchesSearch = camp?.name.toLowerCase().includes(search.toLowerCase()) ||
      item?.name.toLowerCase().includes(search.toLowerCase());
    const matchesCamp = !campFilter || dispatch.camp_id === campFilter;
    const matchesStatus = !statusFilter || dispatch.status === statusFilter;
    return matchesSearch && matchesCamp && matchesStatus;
  });

  const handleCampChange = (campId) => {
    setFormData(prev => ({ ...prev, camp_id: campId, need_id: '' }));
    setSelectedNeed(null);
    setSelectedItem(null);
    setAvailableStock(0);
    setRemainingDemand(0);
  };

  const handleNeedChange = (needId) => {
    const need = needs.find(n => n.id === needId);
    setFormData(prev => ({ ...prev, need_id: needId }));
    
    if (need) {
      setSelectedNeed(need);
      const item = inventory.find(i => i.id === need.inventory_item_id);
      setSelectedItem(item || null);
      
      if (item) {
        const stock = calculateAvailableStock(item);
        setAvailableStock(stock);
      }
      
      const demand = calculateRemainingDemand(need, dispatches);
      setRemainingDemand(demand);
    } else {
      setSelectedNeed(null);
      setSelectedItem(null);
      setAvailableStock(0);
      setRemainingDemand(0);
    }
  };

  const eligibleNeeds = needs.filter(n => 
    n.camp_id === formData.camp_id && 
    calculateRemainingDemand(n, dispatches) > 0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateDispatch(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }
    
    const quantity = Number(formData.quantity);
    if (quantity > availableStock) {
      setFormErrors({ quantity: `Quantity exceeds available stock (${availableStock})` });
      return;
    }
    if (quantity > remainingDemand) {
      setFormErrors({ quantity: `Quantity exceeds remaining demand (${remainingDemand})` });
      return;
    }
    
    setSubmitting(true);
    try {
      await dispatchService.createDispatch({
        camp_id: formData.camp_id,
        need_id: formData.need_id,
        quantity: Number(formData.quantity),
        status: 'Pending',
      });
      setModalOpen(false);
      setCreatingDispatch(false);
      setSearchParams({});
      fetchData();
    } catch (err) {
      console.error('Failed to create dispatch:', err);
      setFormErrors({ submit: err.message || 'Failed to create dispatch. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (dispatchId, newStatus) => {
    setStatusLoadingIds(prev => new Set(prev).add(dispatchId));
    try {
      await dispatchService.updateDispatchStatus(dispatchId, newStatus);
      fetchData();
    } catch (err) {
      console.error('Failed to update dispatch status:', err);
      alert(err.message || 'Failed to update status');
    } finally {
      setStatusLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(dispatchId);
        return next;
      });
    }
  };

  const confirmDelete = (dispatch) => {
    if (dispatch.status === 'Delivered') {
      alert('Cannot delete a delivered dispatch. Use the reversal workflow if needed.');
      return;
    }
    setDeleteConfirm(dispatch);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.status === 'Cancelled') {
        // Stock was already restored on cancellation, so remove the record.
        await dispatchesApi.delete(deleteConfirm.id);
      } else {
        // Pending / In Transit: cancelling restores the reserved stock.
        await dispatchService.cancelDispatch(deleteConfirm.id);
      }
      fetchData();
    } catch (err) {
      console.error('Failed to delete dispatch:', err);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const getStatusBadge = (status) => (
    <Badge variant={getStatusBadgeClass(status)}>{status}</Badge>
  );

  const getStatusWorkflow = (status) => {
    const steps = ['Pending', 'In Transit', 'Delivered'];
    return steps.map((step, index) => (
      <div key={step} className="flex items-center">
        <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-colors ${
          steps.indexOf(status) >= index 
            ? (step === status ? 'bg-primary-600 text-white' : 'bg-primary-200 text-primary-800') 
            : 'bg-slate-200 text-slate-400'
        }`}>
          {step === 'Pending' && <Truck className="w-4 h-4" />}
          {step === 'In Transit' && <Send className="w-4 h-4" />}
          {step === 'Delivered' && <CheckCircle className="w-4 h-4" />}
        </div>
        {index < steps.length - 1 && (
          <div className={`w-8 h-0.5 mx-1 ${
            steps.indexOf(status) > index ? 'bg-primary-300' : 'bg-slate-200'
          }`} />
        )}
      </div>
    ));
  };

  const ActionMenu = ({ dispatch, onAction, loadingIds }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const actions = [];
    if (dispatch.status === 'Pending') {
      actions.push(
        { key: 'in-transit', label: 'Mark In Transit', icon: <Send className="w-4 h-4" />, variant: 'primary', status: 'In Transit' },
        { key: 'cancel', label: 'Cancel Dispatch', icon: <XCircle className="w-4 h-4" />, variant: 'danger', status: 'Cancelled' }
      );
    } else if (dispatch.status === 'In Transit') {
      actions.push(
        { key: 'delivered', label: 'Mark Delivered', icon: <CheckCircle className="w-4 h-4" />, variant: 'success', status: 'Delivered' },
        { key: 'cancel', label: 'Cancel Dispatch', icon: <XCircle className="w-4 h-4" />, variant: 'danger', status: 'Cancelled' }
      );
    }
    // Cancelled dispatches cannot be re-opened: the backend restores their
    // stock on cancellation, so re-activating one would double-count stock.
    // They can only be removed with "Delete Dispatch" below.

    const isLoading = loadingIds.has(dispatch.id);

    return (
      <div ref={menuRef} className="relative inline-block">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Dispatch actions"
          aria-expanded={isOpen}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-primary-600" /> : <MoreVertical className="w-5 h-5" />}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 animate-slide-in">
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Current Status</p>
              <div className="flex items-center gap-2 mt-1">
                {getStatusWorkflow(dispatch.status)}
              </div>
            </div>
            {actions.map(action => (
              <button
                key={action.key}
                onClick={() => { onAction(dispatch.id, action.status); setIsOpen(false); }}
                disabled={isLoading}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
                  action.variant === 'primary' ? 'text-primary-700 hover:bg-primary-50' :
                  action.variant === 'success' ? 'text-green-700 hover:bg-green-50' :
                  action.variant === 'danger' ? 'text-red-700 hover:bg-red-50' :
                  'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
            <div className="border-t border-slate-100 pt-1">
              <button
                onClick={() => { setIsOpen(false); confirmDelete(dispatch); }}
                disabled={isLoading || dispatch.status === 'Delivered'}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Dispatch</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary-600" />
            Dispatches
          </h1>
          <p className="page-subtitle">Manage supply dispatches to relief camps</p>
        </div>
        <Button onClick={openCreateDispatch} icon={<Plus className="w-4 h-4" />}>
          Create Dispatch
        </Button>
      </div>

      <Card>
        <CardBody className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="search"
                placeholder="Search by camp or item..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-10"
                aria-label="Search dispatches"
              />
            </div>
            <Select
              value={campFilter}
              onChange={e => setCampFilter(e.target.value)}
              options={[{ value: '', label: 'All Camps' }, ...camps.map(c => ({ value: c.id, label: c.name }))]}
              className="w-56"
            />
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              options={[{ value: '', label: 'All Statuses' }, ...STATUS_OPTIONS]}
              className="w-40"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mx-auto" />
            </div>
          ) : filteredDispatches.length === 0 ? (
            <EmptyState
              className="py-12"
              icon={<Truck className="w-12 h-12 text-slate-300" />}
              title={search || campFilter || statusFilter ? 'No dispatches found' : 'No dispatches yet'}
              description={search || campFilter || statusFilter 
                ? 'Try adjusting your search or filters'
                : 'Create your first dispatch to get started'}
              action={!search && !campFilter && !statusFilter ? (
                <Button onClick={openCreateDispatch} icon={<Plus className="w-4 h-4" />}>
                  Create Dispatch
                </Button>
              ) : null}
            />
          ) : (
            <Table
              data={filteredDispatches}
              keyField="id"
              columns={[
                { key: 'id', header: 'ID', render: (v) => <span className="font-mono text-xs">{v.slice(-8)}</span> },
                { key: 'camp_id', header: 'Camp', render: (v) => {
                  const camp = camps.find(c => c.id === v);
                  return camp ? (
                    <Link to={`/camps/${v}`} className="text-primary-600 hover:text-primary-700">{camp.name}</Link>
                  ) : 'Unknown';
                }},
                { key: 'need_id', header: 'Item', render: (v, row) => {
                  const need = needs.find(n => n.id === v);
                  if (!need) return 'Unknown';
                  const item = inventory.find(i => i.id === need.inventory_item_id);
                  return item ? item.name : 'Unknown';
                }},
                { key: 'quantity', header: 'Qty', render: (v) => formatNumber(v) },
                { key: 'status', header: 'Status', render: getStatusBadge },
                { key: 'created_at', header: 'Created', render: (v) => formatDate(v) },
                { key: 'delivered_at', header: 'Delivered', render: (v) => v ? formatDate(v) : '-' },
              ]}
              renderRowActions={(row) => (
                <ActionMenu 
                  dispatch={row} 
                  onAction={handleStatusChange} 
                  loadingIds={statusLoadingIds} 
                />
              )}
              emptyMessage="No dispatches found"
            />
          )}
        </CardBody>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setCreatingDispatch(false); setSearchParams({}); }}
        title={creatingDispatch ? 'Create New Dispatch' : 'Edit Dispatch'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setModalOpen(false); setCreatingDispatch(false); setSearchParams({}); }}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting} disabled={!creatingDispatch}>
              {creatingDispatch ? 'Create Dispatch' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Camp"
            value={formData.camp_id}
            onChange={e => handleCampChange(e.target.value)}
            options={camps.map(c => ({ value: c.id, label: `${c.name} (${c.district})` }))}
            error={formErrors.camp_id}
            placeholder="Select camp"
            required
          />
          
          <Select
            label="Need"
            value={formData.need_id}
            onChange={e => handleNeedChange(e.target.value)}
            options={eligibleNeeds.map(n => {
              const item = inventory.find(i => i.id === n.inventory_item_id);
              const demand = calculateRemainingDemand(n, dispatches);
              return { 
                value: n.id, 
                label: `${item?.name || 'Unknown'} (Remaining: ${demand}, Priority: ${n.priority})` 
              };
            })}
            error={formErrors.need_id}
            placeholder="Select need"
            required
            disabled={eligibleNeeds.length === 0}
          />
          
          {selectedNeed && selectedItem && (
            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
              <h4 className="font-medium text-slate-900">Dispatch Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Item:</span>
                  <span className="font-medium ml-2">{selectedItem.name}</span>
                </div>
                <div>
                  <span className="text-slate-500">Category:</span>
                  <span className="font-medium ml-2">{selectedItem.category}</span>
                </div>
                <div>
                  <span className="text-slate-500">Available Stock:</span>
                  <span className="font-medium ml-2 text-green-600">{formatNumber(availableStock)} {selectedItem.unit}</span>
                </div>
                <div>
                  <span className="text-slate-500">Remaining Demand:</span>
                  <span className="font-medium ml-2 text-red-600">{formatNumber(remainingDemand)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Required:</span>
                  <span className="font-medium ml-2">{formatNumber(selectedNeed.required_quantity)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Fulfilled:</span>
                  <span className="font-medium ml-2">{formatNumber(selectedNeed.fulfilled_quantity)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Fulfillment:</span>
                  <span className="font-medium ml-2">
                    {formatPercentage(calculateFulfillmentPercentage(Number(selectedNeed.required_quantity), Number(selectedNeed.fulfilled_quantity)))}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {eligibleNeeds.length === 0 && formData.camp_id && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
              No eligible needs for this camp. All needs are fulfilled or no needs exist.
            </div>
          )}
          
          <Input
            label="Dispatch Quantity"
            type="number"
            value={formData.quantity}
            onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
            error={formErrors.quantity}
            placeholder="Enter quantity"
            required
            min="1"
            max={Math.max(availableStock, remainingDemand)}
            disabled={!selectedNeed}
          />
          
          {formErrors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
              {formErrors.submit}
            </div>
          )}
        </form>
      </Modal>

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Cancel Dispatch"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Confirm Cancel</Button>
          </>
        }
      >
        <p className="text-slate-600">
          Are you sure you want to cancel this dispatch? This will restore the reserved stock to inventory.
        </p>
        <p className="text-sm text-slate-500 mt-2">
          Dispatch ID: <span className="font-mono">{deleteConfirm?.id?.slice(-8)}</span>
        </p>
      </Modal>
    </div>
  );
};

export default Dispatches;