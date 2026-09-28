import { describe, it, expect } from 'vitest';
import { IntegrationStateMachine } from '../../src/sessions/state-machine.js';

describe('IntegrationStateMachine', () => {
  it('allows valid transitions', () => {
    expect(IntegrationStateMachine.canTransition('needs_qr', 'qr_pending')).toBe(true);
    expect(IntegrationStateMachine.canTransition('qr_pending', 'connecting')).toBe(true);
    expect(IntegrationStateMachine.canTransition('connecting', 'connected')).toBe(true);
    expect(IntegrationStateMachine.canTransition('connected', 'reconnecting')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(IntegrationStateMachine.canTransition('needs_qr', 'connected')).toBe(false);
    expect(IntegrationStateMachine.canTransition('stopping', 'connected')).toBe(false);
  });
});
