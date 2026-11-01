import api from '../api/client';
import { dispatchesApi } from '../api/dispatches.api';
import { needsApi } from '../api/needs.api';

const pendingOperations = new Set();

const generateOperationKey = (type, id) => `${type}-${id}`;

const isOperationPending = (type, id) => {
  return pendingOperations.has(generateOperationKey(type, id));
};

const setOperationPending = (type, id, pending) => {
  const key = generateOperationKey(type, id);
  if (pending) {
    pendingOperations.add(key);
  } else {
    pendingOperations.delete(key);
  }
};

export const dispatchService = {
  async createDispatch(dispatchData) {
    const opKey = `create-dispatch-${dispatchData.need_id}-${dispatchData.quantity}`;
    if (isOperationPending('create', opKey)) {
      throw new Error('Dispatch creation already in progress');
    }
    setOperationPending('create', opKey, true);
    
    try {
      // Frontend validation for better UX
      const [needRes, dispatchesRes] = await Promise.all([
        needsApi.getById(dispatchData.need_id),
        dispatchesApi.getByNeed(dispatchData.need_id),
      ]);
      
      const need = needRes.data;
      const required = Number(need.required_quantity) || 0;
      const fulfilled = Number(need.fulfilled_quantity) || 0;
      const existingDispatches = dispatchesRes.data;
      const activeDispatchQty = existingDispatches
        .filter(d => ['Pending', 'In Transit'].includes(d.status))
        .reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
      
      const remainingDemand = Math.max(required - fulfilled - activeDispatchQty, 0);
      const requestedQty = Number(dispatchData.quantity);
      
      if (requestedQty > remainingDemand) {
        throw new Error(`Dispatch quantity (${requestedQty}) exceeds remaining unmet demand (${remainingDemand})`);
      }
      
      // Call backend - it handles validation, stock deduction, and creation
      const newDispatch = {
        ...dispatchData,
        id: `dispatch-${Date.now()}`,
        status: 'Pending',
        created_at: new Date().toISOString(),
      };
      
      const dispatchRes = await dispatchesApi.create(newDispatch);
      return dispatchRes.data;
    } finally {
      setOperationPending('create', opKey, false);
    }
  },

  async updateDispatchStatus(dispatchId, newStatus) {
    const opKey = `update-${dispatchId}-${newStatus}`;
    if (isOperationPending('update', opKey)) {
      throw new Error('Status update already in progress');
    }
    setOperationPending('update', opKey, true);
    
    try {
      // Call backend status endpoint - it handles all transitions, stock, and fulfillment
      const res = await api.patch(`/dispatches/${dispatchId}/status`, { status: newStatus });
      return res.data;
    } finally {
      setOperationPending('update', opKey, false);
    }
  },

  async cancelDispatch(dispatchId) {
    return this.updateDispatchStatus(dispatchId, 'Cancelled');
  },

  async markInTransit(dispatchId) {
    return this.updateDispatchStatus(dispatchId, 'In Transit');
  },

  async markDelivered(dispatchId) {
    return this.updateDispatchStatus(dispatchId, 'Delivered');
  },
};