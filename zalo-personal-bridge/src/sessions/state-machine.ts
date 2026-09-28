import { IntegrationStatus } from '../contracts/status-v1.js';

export class IntegrationStateMachine {
  private static validTransitions: Record<IntegrationStatus, IntegrationStatus[]> = {
    disabled: ['needs_qr', 'connecting'],
    needs_qr: ['qr_pending', 'disabled'],
    qr_pending: ['awaiting_confirmation', 'connecting', 'needs_qr', 'disabled'],
    awaiting_confirmation: ['connecting', 'needs_qr', 'disabled'],
    connecting: ['connected', 'degraded', 'reconnecting', 'reauth_required', 'needs_qr', 'disabled'],
    connected: ['degraded', 'reconnecting', 'reauth_required', 'stopping', 'disabled'],
    degraded: ['connected', 'reconnecting', 'reauth_required', 'stopping', 'disabled'],
    reconnecting: ['connected', 'degraded', 'reauth_required', 'stopping', 'disabled'],
    reauth_required: ['needs_qr', 'qr_pending', 'disabled'],
    stopping: ['disabled', 'needs_qr'],
  };

  static canTransition(from: IntegrationStatus, to: IntegrationStatus): boolean {
    if (from === to) return true;
    const allowed = this.validTransitions[from] || [];
    return allowed.includes(to);
  }

  static assertTransition(from: IntegrationStatus, to: IntegrationStatus): void {
    if (!this.canTransition(from, to)) {
      throw new Error(`Invalid integration state transition from '${from}' to '${to}'`);
    }
  }
}
