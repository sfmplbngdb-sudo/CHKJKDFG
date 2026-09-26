import { User } from '../types';

/**
  * Role Capabilities:
  * - SUPERADMIN: ID "SFMPL". Full power including Create, Edit, Delete, User Management (Add/Edit/Delete users).
  * - ADMIN: Full operational power like Superadmin (Create Sales Orders, Allocate Lorries,
  *          Generate GC & Dispatches, Process Money Freight, Record Unloading & Profit,
  *          Issue Advance & Balance Bank Payments, Export Reports),
  *          BUT leaving (excluding) Edit and Delete options.
  * - USER: Basic view and standard data entry.
  */

export const canEditRecord = (user: User | null | undefined): boolean => {
  return user?.role === 'SUPERADMIN';
};

export const canDeleteRecord = (user: User | null | undefined): boolean => {
  return user?.role === 'SUPERADMIN';
};

export const canManageUsers = (user: User | null | undefined): boolean => {
  return user?.role === 'SUPERADMIN';
};

export const canCreateRecord = (user: User | null | undefined): boolean => {
  return user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';
};
