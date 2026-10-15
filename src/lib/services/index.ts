/**
 * TIP CRM - Data Access Layer (Supabase / PostgreSQL)
 *
 * Unified export point for all typed CRM services, database readiness checks,
 * and data mapping utilities.
 */

export * from './types';
export * from './databaseHealth.service';
export * from './people.service';
export * from './organizations.service';
export * from './programs.service';
export * from './events.service';
export * from './tasks.service';
export * from './funding.service';
export * from './documents.service';
export * from './auditLogs.service';
export * from './users.service';
export * from './accessRequests.service';
