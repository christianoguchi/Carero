export type Staff = {
  id: string;
  name: string;
  role: 'Manager' | 'Support Worker' | 'Senior Support Worker' | 'Volunteer';
  skills: string[];
  availability: string[];
  preferred_users: string[];
  notes: string;
  status: 'available' | 'sick' | 'on-leave';
  support_level_max: number;
  emergency_contact?: string;
  phone?: string;
  shift_limits?: number;
  color_tag?: string;
  avatar_url?: string;
  created_at: string;
};

export type ServiceUser = {
  id: string;
  name: string;
  support_level: number;
  notes: string;
  preferred_staff: string[];
  required_ratio: string;
  alerts: string[];
  sensory_notes: string;
  behaviour_notes: string;
  required_skills?: string[];
  transport_notes?: string;
  medication_reminders?: string[];
  avatar_url?: string;
  created_at: string;
};

export type Assignment = {
  id: string;
  staff_id: string;
  service_user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  notes?: string;
  created_at: string;
};

export type Absence = {
  id: string;
  staff_id: string;
  start_date: string; // yyyy-MM-dd, inclusive
  end_date: string;   // yyyy-MM-dd, inclusive
  reason: 'sick' | 'leave' | 'other';
  notes?: string;
  created_at: string;
};

export type CoverRequest = {
  id: string;
  service_user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'open' | 'filled' | 'cancelled';
  filled_by: string | null;
  filled_at: string | null;
  created_at: string;
};

export type CoverOffer = {
  id: string;
  request_id: string;
  staff_id: string;
  token: string;
  response: 'accepted' | 'declined' | null;
  responded_at: string | null;
  created_at: string;
};

export type DailyRota = {
  id: string;
  date: string;
  daily_notes: string;
  transport_alerts: string[];
  medication_reminders: string[];
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      staff: {
        Row: Staff;
        Insert: Omit<Staff, 'id' | 'created_at'>;
        Update: Partial<Omit<Staff, 'id' | 'created_at'>>;
      };
      service_users: {
        Row: ServiceUser;
        Insert: Omit<ServiceUser, 'id' | 'created_at'>;
        Update: Partial<Omit<ServiceUser, 'id' | 'created_at'>>;
      };
      assignments: {
        Row: Assignment;
        Insert: Omit<Assignment, 'id' | 'created_at'>;
        Update: Partial<Omit<Assignment, 'id' | 'created_at'>>;
      };
      absences: {
        Row: Absence;
        Insert: Omit<Absence, 'id' | 'created_at'>;
        Update: Partial<Omit<Absence, 'id' | 'created_at'>>;
      };
      daily_rotas: {
        Row: DailyRota;
        Insert: Omit<DailyRota, 'id' | 'created_at'>;
        Update: Partial<Omit<DailyRota, 'id' | 'created_at'>>;
      };
    };
  };
};
