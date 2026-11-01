import { donationsApi } from '../api/donations.api';

const pendingDonations = new Set();

export const donationsService = {
  async createDonation(donationData) {
    const opKey = `create-${donationData.type}-${donationData.item_id || 'cash'}-${donationData.amount_or_quantity}`;
    if (pendingDonations.has(opKey)) {
      throw new Error('Donation creation already in progress');
    }
    pendingDonations.add(opKey);
    
    try {
      const newDonation = {
        ...donationData,
        id: `donation-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      
      // The backend already increases inventory stock exactly once for
      // In-Kind donations (POST /donations). Do not patch it again here or
      // the same donation would be counted twice.
      const res = await donationsApi.create(newDonation);

      return res.data;
    } finally {
      pendingDonations.delete(opKey);
    }
  },
};