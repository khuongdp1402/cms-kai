import { describe, it, expect } from 'vitest';
import { SafeUrlChecker } from '../../src/security/safe-url.js';

describe('SafeUrlChecker', () => {
  it('identifies private IPv4 addresses accurately', () => {
    expect(SafeUrlChecker.isPrivateIp('127.0.0.1')).toBe(true);
    expect(SafeUrlChecker.isPrivateIp('10.0.0.5')).toBe(true);
    expect(SafeUrlChecker.isPrivateIp('192.168.1.1')).toBe(true);
    expect(SafeUrlChecker.isPrivateIp('172.16.0.1')).toBe(true);
    expect(SafeUrlChecker.isPrivateIp('172.31.255.255')).toBe(true);
    expect(SafeUrlChecker.isPrivateIp('169.254.169.254')).toBe(true);

    expect(SafeUrlChecker.isPrivateIp('8.8.8.8')).toBe(false);
    expect(SafeUrlChecker.isPrivateIp('1.1.1.1')).toBe(false);
  });

  it('identifies private IPv6 addresses', () => {
    expect(SafeUrlChecker.isPrivateIp('::1')).toBe(true);
    expect(SafeUrlChecker.isPrivateIp('fe80::1')).toBe(true);
    expect(SafeUrlChecker.isPrivateIp('fc00::1')).toBe(true);
  });
});
