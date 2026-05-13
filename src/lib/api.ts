import { Staff, ServiceUser, Assignment, DailyRota } from '@/types';
import { mockStaff, mockServiceUsers } from './mockData';

// Mock API calls that simulate Supabase interaction
export const api = {
  staff: {
    list: async (): Promise<Staff[]> => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockStaff;
    },
    update: async (id: string, data: Partial<Staff>): Promise<void> => {
      console.log(`Updating staff ${id}`, data);
    },
    delete: async (id: string): Promise<void> => {
      console.log(`Deleting staff ${id}`);
    }
  },
  users: {
    list: async (): Promise<ServiceUser[]> => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockServiceUsers;
    },
    update: async (id: string, data: Partial<ServiceUser>): Promise<void> => {
      console.log(`Updating user ${id}`, data);
    }
  },
  assignments: {
    listByDate: async (date: string): Promise<Assignment[]> => {
      return []; // Return empty or mock based on date
    },
    upsert: async (assignment: Omit<Assignment, 'id' | 'created_at'>): Promise<Assignment> => {
      const newAssignment = {
        ...assignment,
        id: `a-${Date.now()}`,
        created_at: new Date().toISOString()
      };
      console.log('Upserting assignment', newAssignment);
      return newAssignment;
    },
    delete: async (id: string): Promise<void> => {
      console.log(`Deleting assignment ${id}`);
    }
  }
};
