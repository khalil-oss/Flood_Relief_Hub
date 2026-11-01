import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { volunteersApi } from '../api/volunteers.api';
import api from '../api/client';

const AuthContext = createContext(null);

const DEMO_USERS = {
  admin: {
    id: 'user-admin',
    name: 'Relief Coordinator',
    email: 'admin@reliefhub.org',
    role: 'admin',
    password: 'admin123',
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [volunteerRecord, setVolunteerRecord] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('reliefhub_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        // If volunteer, fetch full record
        if (parsed.role === 'volunteer' && parsed.volunteerId) {
          fetchVolunteerRecord(parsed.volunteerId);
        }
      } catch {
        localStorage.removeItem('reliefhub_user');
      }
    }
    setLoading(false);
  }, []);

  const fetchVolunteerRecord = useCallback(async (volunteerId) => {
    if (!volunteerId) {
      setVolunteerRecord(null);
      return null;
    }
    try {
      const res = await volunteersApi.getById(volunteerId);
      setVolunteerRecord(res.data);
      return res.data;
    } catch (err) {
      console.error('Failed to fetch volunteer record:', err);
      setVolunteerRecord(null);
      return null;
    }
  }, []);

  const login = useCallback(async (email, password, role) => {
    let matchedUser = null;
    
    if (role === 'admin') {
      // Admin uses DEMO_USERS
      const u = DEMO_USERS.admin;
      if (u.email === email && u.password === password) {
        matchedUser = { ...u };
        delete matchedUser.password;
      }
    } else if (role === 'volunteer') {
      // Volunteer uses backend API
      try {
        const res = await api.post('/auth/volunteer/login', { email, password });
        const { volunteer, camp, token } = res.data;
        matchedUser = {
          id: volunteer.id,
          name: volunteer.name,
          email: volunteer.email,
          role: 'volunteer',
          volunteerId: volunteer.id,
          campId: volunteer.camp_id,
          campName: camp?.name,
          campDistrict: camp?.district,
          campStatus: camp?.status,
          token
        };
      } catch (err) {
        if (err.response?.status === 401) {
          throw new Error('Invalid credentials');
        } else if (err.response?.status === 403) {
          throw new Error(err.response.data.error || 'Volunteer not eligible to log in');
        } else {
          throw new Error('Login failed. Please try again.');
        }
      }
    }
    
    if (!matchedUser) {
      throw new Error('Invalid credentials');
    }
    
    localStorage.setItem('reliefhub_user', JSON.stringify(matchedUser));
    setUser(matchedUser);
    
    // Fetch volunteer record if user is a volunteer
    if (matchedUser.role === 'volunteer' && matchedUser.volunteerId) {
      await fetchVolunteerRecord(matchedUser.volunteerId);
    } else {
      setVolunteerRecord(null);
    }
    
    return matchedUser;
  }, [fetchVolunteerRecord]);

  const logout = useCallback(() => {
    localStorage.removeItem('reliefhub_user');
    setUser(null);
    setVolunteerRecord(null);
  }, []);

  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    
    const permissions = {
      admin: ['*'],
      volunteer: [
        'camps.view',
        'camps.view_details',
        'needs.view',
        'needs.view_details',
        'dispatches.view',
        'dispatches.view_details',
        'dashboard.view',
      ],
    };
    
    const userPermissions = permissions[user.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  }, [user]);

  const isAdmin = user?.role === 'admin';
  const isVolunteer = user?.role === 'volunteer';

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      volunteerRecord,
      login, 
      logout, 
      hasPermission, 
      isAdmin,
      isVolunteer,
      fetchVolunteerRecord,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};