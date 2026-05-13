import { Staff as DBStaff, ServiceUser as DBServiceUser, Assignment as DBAssignment } from './supabase';

export type Role = DBStaff['role'];

export interface Staff extends DBStaff {}

export interface ServiceUser extends DBServiceUser {}

export interface Assignment extends DBAssignment {}

export interface DailyRota {
  date: string;
  assignments: Assignment[];
  dailyNotes: string;
  transportAlerts: string[];
  medicationReminders: string[];
}
