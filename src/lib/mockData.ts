import { Staff, ServiceUser } from "@/types";

const now = new Date().toISOString();

export const mockStaff: Staff[] = [
  {
    id: 's1',
    name: 'Sarah Jenkins',
    role: 'Senior Support Worker',
    skills: ['First Aid', 'MAPA', 'Epilepsy Training'],
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    preferred_users: ['u1', 'u3'],
    notes: 'Very experienced with high-intensity support.',
    status: 'available',
    support_level_max: 3,
    created_at: now
  },
  {
    id: 's2',
    name: 'Mark Thompson',
    role: 'Support Worker',
    skills: ['First Aid', 'Food Hygiene'],
    availability: ['Monday', 'Tuesday', 'Wednesday'],
    preferred_users: ['u2'],
    notes: 'Great at outdoor activities.',
    status: 'available',
    support_level_max: 2,
    created_at: now
  },
  {
    id: 's3',
    name: 'Julie Berry',
    role: 'Support Worker',
    skills: ['First Aid', 'Makaton'],
    availability: ['Wednesday', 'Thursday', 'Friday'],
    preferred_users: ['u1'],
    notes: 'Excellent communication skills.',
    status: 'available',
    support_level_max: 2,
    created_at: now
  }
];

export const mockServiceUsers: ServiceUser[] = [
  {
    id: 'u1',
    name: 'Alex Rivera',
    support_level: 3,
    notes: 'Requires constant supervision.',
    preferred_staff: ['s1', 's3'],
    required_ratio: '1:1',
    alerts: ['Nut Allergy'],
    sensory_notes: 'Sensitive to loud noises.',
    behaviour_notes: 'Can become anxious in crowds.',
    created_at: now
  },
  {
    id: 'u2',
    name: 'Jamie Smith',
    support_level: 1,
    notes: 'Very independent, loves drawing.',
    preferred_staff: ['s2'],
    required_ratio: '1:3',
    alerts: [],
    sensory_notes: 'Loves bright colours.',
    behaviour_notes: 'Very social.',
    created_at: now
  },
  {
    id: 'u3',
    name: 'Sam Wilson',
    support_level: 2,
    notes: 'Loves routine and structure.',
    preferred_staff: ['s1'],
    required_ratio: '1:1',
    alerts: ['Epilepsy'],
    sensory_notes: 'Prefers quiet spaces.',
    behaviour_notes: 'Needs clear transitions between activities.',
    created_at: now
  }
];
