import { describe, expect, test } from 'vitest';
import { parsePayload, type HookPayload } from '../parser';

describe('parsePayload', () => {
  test('valid JSON with session_id is parsed', () => {
    const p = parsePayload('{"session_id":"abc123","hook_event_name":"Stop"}');
    expect(p.sessionId).toBe('abc123');
  });

  test('missing session_id falls back to "default"', () => {
    const p = parsePayload('{}');
    expect(p.sessionId).toBe('default');
  });

  test('invalid JSON returns empty payload with default session id', () => {
    const p = parsePayload('not-json');
    expect(p.sessionId).toBe('default');
  });

  test('empty string returns empty payload', () => {
    const p = parsePayload('');
    expect(p.sessionId).toBe('default');
  });

  test('tool_response with success:false is flagged as a tool failure', () => {
    const p = parsePayload('{"session_id":"s","tool_response":{"success":false}}');
    expect(p.toolFailed).toBe(true);
  });

  test('tool_response with non-zero exitCode is flagged as a tool failure', () => {
    const p = parsePayload('{"session_id":"s","tool_response":{"exitCode":1}}');
    expect(p.toolFailed).toBe(true);
  });

  test('tool_response with success:true is not a failure', () => {
    const p = parsePayload('{"session_id":"s","tool_response":{"success":true}}');
    expect(p.toolFailed).toBe(false);
  });

  test('missing tool_response is not a failure', () => {
    const p = parsePayload('{"session_id":"s"}');
    expect(p.toolFailed).toBe(false);
  });

  test('notification with message containing "deny" sets userDenied', () => {
    const p = parsePayload('{"session_id":"s","message":"User denied tool execution"}');
    expect(p.userDenied).toBe(true);
  });

  test('notification without a deny-like message does not set userDenied', () => {
    const p = parsePayload('{"session_id":"s","message":"Claude is waiting"}');
    expect(p.userDenied).toBe(false);
  });

  test('returned shape matches HookPayload', () => {
    const p: HookPayload = parsePayload('{"session_id":"xyz"}');
    expect(p).toMatchObject({ sessionId: 'xyz', toolFailed: false, userDenied: false });
  });
});
