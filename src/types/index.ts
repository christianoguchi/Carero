import {
  Staff as DBStaff,
  ServiceUser as DBServiceUser,
  Assignment as DBAssignment,
  Absence as DBAbsence,
  CoverRequest as DBCoverRequest,
  CoverOffer as DBCoverOffer,
} from './supabase';

export type Role = DBStaff['role'];

export interface Staff extends DBStaff {}

export interface ServiceUser extends DBServiceUser {}

export interface Assignment extends DBAssignment {}

export interface Absence extends DBAbsence {}

export interface CoverRequest extends DBCoverRequest {}

export interface CoverOffer extends DBCoverOffer {}

export interface Settings {
  centre_name: string;
  default_shift_start: string; // HH:mm
  default_shift_end: string;   // HH:mm
}

export interface DailyRota {
  date: string;
  assignments: Assignment[];
  dailyNotes: string;
  transportAlerts: string[];
  medicationReminders: string[];
}
