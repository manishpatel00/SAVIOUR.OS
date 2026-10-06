import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../server';
import http from 'http';

describe('Saviour AI Server Endpoints & Reliability Tests', { timeout: 15000 }, () => {
  let server: http.Server;
  let testPort: number;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      // Pick dynamic port for testing
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        testPort = address.port;
        baseUrl = `http://127.0.0.1:${testPort}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('GET /api/health returns 200 and healthy status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('online');
    expect(data.service).toBe('Saviour AI Autonomous Sentinel Protocol');
  });

  it('GET /favicon.ico returns 200 or 204 without 404 error', async () => {
    const res = await fetch(`${baseUrl}/favicon.ico`);
    expect([200, 204]).toContain(res.status);
    expect(res.status).not.toBe(404);
  });

  it('POST /api/gemini/breakdown returns structured breakdown list', async () => {
    const res = await fetch(`${baseUrl}/api/gemini/breakdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Complete AI Hackathon project' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.breakdown).toBeDefined();
    expect(Array.isArray(data.breakdown)).toBe(true);
    expect(data.breakdown.length).toBeGreaterThan(0);
  });

  it('POST /api/gemini/mitigate handles extension requests and action plans', async () => {
    const res = await fetch(`${baseUrl}/api/gemini/mitigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Q3 Financial Audit',
        dueDate: '2026-10-07T12:00:00Z',
        type: 'extension_request',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.mitigationText).toBeDefined();
    expect(typeof data.mitigationText).toBe('string');
  });

  it('POST /api/gemini/chat returns conversational advice with action suggestions', async () => {
    const res = await fetch(`${baseUrl}/api/gemini/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ sender: 'user', text: 'Help me prioritize my overdue bills' }],
        currentTasks: [],
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBeDefined();
    expect(Array.isArray(data.actions)).toBe(true);
  });

  it('POST /api/gemini/auto-schedule resolves calendar collisions', async () => {
    const res = await fetch(`${baseUrl}/api/gemini/auto-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentTasks: [] }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBeDefined();
  });

  it('POST /api/gemini/triage provides immediate emergency recovery plan', async () => {
    const res = await fetch(`${baseUrl}/api/gemini/triage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Missed Tax Filing',
        description: 'Deadline passed 2 hours ago',
        category: 'Finance',
        dueDate: '2026-10-06T10:00:00Z',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.severity).toBeDefined();
    expect(Array.isArray(data.recoveryPlan)).toBe(true);
    expect(data.damageControlEmail).toBeDefined();
  });

  it('POST /api/email/reminder validates required parameters', async () => {
    const res = await fetch(`${baseUrl}/api/email/reminder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
