// Krypta CLI terminal page — full in-browser terminal with JWT-authenticated API commands.
'use client';

import React, { useEffect, useRef, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Terminal, X } from 'lucide-react';

import { getWorkspaces, getSecrets, createSecret, deleteSecret, revealSecret } from '../../../../../lib/api';
import { useAuthStore } from '../../../../../lib/store';
import { EnvironmentType } from '../../../../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

type OutputType = 'success' | 'error' | 'info' | 'muted' | 'primary';

interface OutputLine {
  id: string;
  text: string;
  type: OutputType;
  isPrompt?: boolean; // the echoed user input line
}

interface ParsedCommand {
  command: string;
  args: string[];
  flags: { env?: string };
}

// ─── Command parser ────────────────────────────────────────────────────────────

function parseCommand(input: string): ParsedCommand {
  // Tokenise respecting quoted strings
  const tokens: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if ((ch === '"' || ch === "'") && !inQuote) {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === quoteChar && inQuote) {
      inQuote = false;
      quoteChar = '';
    } else if (ch === ' ' && !inQuote) {
      if (current) { tokens.push(current); current = ''; }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);

  if (tokens.length === 0) return { command: '', args: [], flags: {} };

  const command = tokens[0].toLowerCase();
  const flags: { env?: string } = {};
  const args: string[] = [];

  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i] === '--env' && tokens[i + 1]) {
      flags.env = tokens[i + 1].toLowerCase();
      i++; // skip next token (the value)
    } else if (!tokens[i].startsWith('--')) {
      args.push(tokens[i]);
    }
  }

  return { command, args, flags };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_ENVS: EnvironmentType[] = ['development', 'testing', 'production'];
const uid = () => Math.random().toString(36).slice(2);

function line(text: string, type: OutputType = 'primary'): OutputLine {
  return { id: uid(), text, type };
}

function promptLine(text: string): OutputLine {
  return { id: uid(), text, type: 'muted', isPrompt: true };
}

// ─── Welcome banner ────────────────────────────────────────────────────────────

function buildWelcomeBanner(workspaceName: string, email: string, role: string): OutputLine[] {
  const name = workspaceName || 'Unknown Workspace';
  const rightPad = (s: string, len: number) => s + ' '.repeat(Math.max(0, len - s.length));
  const inner = 43;
  return [
    line('┌' + '─'.repeat(inner) + '┐', 'info'),
    line('│  ' + rightPad(`Krypta CLI — ${name}`, inner - 2) + '│', 'info'),
    line('│  ' + rightPad(`Logged in as: ${email}`, inner - 2) + '│', 'info'),
    line('│  ' + rightPad(`Role: ${role.toUpperCase()}`, inner - 2) + '│', 'info'),
    line("│  Type 'help' to see available commands  │", 'info'),
    line('└' + '─'.repeat(inner) + '┘', 'info'),
    line('', 'primary'),
  ];
}

// ─── Help output ──────────────────────────────────────────────────────────────

function buildHelpLines(): OutputLine[] {
  return [
    line('Command                                   Description', 'info'),
    line('─────────────────────────────────────── ──────────────────────────────', 'info'),
    line('  secrets --env <environment>             List all secrets', 'primary'),
    line('  get <KEY> --env <environment>           Get a specific secret value', 'primary'),
    line('  set <KEY> <value> --env <env>           Create or update a secret', 'primary'),
    line('  delete <KEY> --env <env>                Delete a secret (admin only)', 'primary'),
    line('  whoami                                  Show current user info', 'primary'),
    line('  clear                                   Clear the terminal', 'primary'),
    line('', 'primary'),
    line('  Available environments: development, testing, production', 'info'),
    line('', 'primary'),
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CLIPage({ params }: PageProps) {
  const router = useRouter();
  const { id: workspaceId } = use(params);
  const { email, role } = useAuthStore();

  const [workspaceName, setWorkspaceName] = useState('');
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  // deleteConfirm stores { key, env } while awaiting yes/no from the user
  const [deleteConfirm, setDeleteConfirm] = useState<{ key: string; env: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Init: load workspace name and show banner ──────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const workspaces = await getWorkspaces();
        const ws = workspaces.find((w) => w.id === workspaceId);
        const name = ws?.name ?? 'Unknown Workspace';
        setWorkspaceName(name);

        const resolvedEmail = email || localStorage.getItem('krypta_email') || 'unknown@krypta.com';
        const resolvedRole = role || localStorage.getItem('krypta_role') || 'unknown';

        setOutput(buildWelcomeBanner(name, resolvedEmail, resolvedRole));
      } catch {
        setOutput([line('✗ Failed to load workspace info', 'error'), line('', 'primary')]);
      }
    };
    init();
    // Focus input on mount
    inputRef.current?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output, loading]);

  // ── Append helper ──────────────────────────────────────────────────────────
  const append = useCallback((lines: OutputLine[]) => {
    setOutput((prev) => [...prev, ...lines]);
  }, []);

  // ── Command handlers ───────────────────────────────────────────────────────

  const resolvedEmail = email || (typeof window !== 'undefined' ? localStorage.getItem('krypta_email') : '') || 'unknown';
  const resolvedRole = role || (typeof window !== 'undefined' ? localStorage.getItem('krypta_role') : '') || 'unknown';

  const handleHelp = () => append(buildHelpLines());

  const handleWhoami = () => {
    append([
      line(`Logged in as: ${resolvedEmail}`, 'primary'),
      line(`Role: ${resolvedRole.toUpperCase()}`, 'primary'),
      line(`Workspace: ${workspaceName}`, 'primary'),
      line('', 'primary'),
    ]);
  };

  const handleSecrets = async (env: EnvironmentType, defaulted: boolean) => {
    // Intern RBAC check
    if (resolvedRole === 'intern' && env !== 'development') {
      append([
        line(`✗ Access denied: interns can only access development secrets`, 'error'),
        line('', 'primary'),
      ]);
      return;
    }

    setLoading(true);
    try {
      const secrets = await getSecrets(workspaceId, env);
      const lines: OutputLine[] = [];

      if (defaulted) lines.push(line(`(using default environment: development)`, 'muted'));

      lines.push(line(`KEY                    VALUE         VERSION   UPDATED BY`, 'info'));
      lines.push(line('─'.repeat(62), 'info'));

      if (secrets.length === 0) {
        lines.push(line(`  No secrets found in ${env}.`, 'muted'));
      } else {
        for (const s of secrets) {
          const key = s.secret_key.padEnd(22);
          const val = '••••••••'.padEnd(14);
          const ver = `v${s.version}`.padEnd(10);
          const by = s.updated_by ?? 'system';
          lines.push(line(`  ${key}${val}${ver}${by}`, 'primary'));
        }
      }
      lines.push(line('', 'primary'));
      append(lines);
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Failed to fetch secrets';
      if (err?.response?.status === 403) {
        append([line(`✗ Access denied: ${msg}`, 'error'), line('', 'primary')]);
      } else {
        append([line(`✗ ${msg}`, 'error'), line('', 'primary')]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGet = async (key: string, env: EnvironmentType, defaulted: boolean) => {
    if (!key) {
      append([
        line('✗ Missing argument. Usage: get <KEY> --env <environment>', 'error'),
        line('', 'primary'),
      ]);
      return;
    }

    // Intern RBAC check
    if (resolvedRole === 'intern' && env !== 'development') {
      append([
        line(`✗ Access denied: your role cannot access ${env} secrets`, 'error'),
        line('', 'primary'),
      ]);
      return;
    }

    setLoading(true);
    try {
      const secrets = await getSecrets(workspaceId, env);
      const secret = secrets.find((s) => s.secret_key === key);

      if (!secret) {
        append([
          line(`✗ Secret ${key} not found in ${env}`, 'error'),
          line('', 'primary'),
        ]);
        return;
      }

      const revealed = await revealSecret(workspaceId, secret.id);
      const lines: OutputLine[] = [];
      if (defaulted) lines.push(line(`(using default environment: development)`, 'muted'));
      lines.push(line(`${key}=${revealed.secret_value}`, 'success'));
      lines.push(line('', 'primary'));
      append(lines);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        append([line(`✗ Access denied: your role cannot access ${env} secrets`, 'error'), line('', 'primary')]);
      } else {
        const msg = err?.response?.data?.detail ?? 'Failed to get secret';
        append([line(`✗ ${msg}`, 'error'), line('', 'primary')]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSet = async (key: string, value: string, env: EnvironmentType, defaulted: boolean) => {
    if (!key || !value) {
      append([
        line('✗ Missing argument. Usage: set <KEY> <value> --env <environment>', 'error'),
        line('', 'primary'),
      ]);
      return;
    }

    // Intern RBAC check
    if (resolvedRole === 'intern' && env !== 'development') {
      append([
        line(`✗ Access denied: your role cannot create ${env} secrets`, 'error'),
        line('', 'primary'),
      ]);
      return;
    }

    setLoading(true);
    try {
      const created = await createSecret(workspaceId, env, key, value);
      const lines: OutputLine[] = [];
      if (defaulted) lines.push(line(`(using default environment: development)`, 'muted'));
      lines.push(line(`✓ Secret ${key} saved (v${created.version})`, 'success'));
      lines.push(line('', 'primary'));
      append(lines);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        append([line(`✗ Access denied: your role cannot create ${env} secrets`, 'error'), line('', 'primary')]);
      } else {
        const msg = err?.response?.data?.detail ?? 'Failed to set secret';
        append([line(`✗ ${msg}`, 'error'), line('', 'primary')]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirmed = async (key: string, env: EnvironmentType) => {
    setLoading(true);
    try {
      const secrets = await getSecrets(workspaceId, env);
      const secret = secrets.find((s) => s.secret_key === key);
      if (!secret) {
        append([line(`✗ Secret ${key} not found in ${env}`, 'error'), line('', 'primary')]);
        return;
      }
      await deleteSecret(workspaceId, secret.id);
      append([line(`✓ Secret ${key} deleted`, 'success'), line('', 'primary')]);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        append([line('✗ Access denied: only admins can delete secrets', 'error'), line('', 'primary')]);
      } else {
        const msg = err?.response?.data?.detail ?? 'Failed to delete secret';
        append([line(`✗ ${msg}`, 'error'), line('', 'primary')]);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    // Echo the prompt line
    append([promptLine(`krypta $ ${trimmed}`)]);

    // Save to history
    setHistory((prev) => {
      const next = [trimmed, ...prev.filter((h) => h !== trimmed)].slice(0, 50);
      return next;
    });
    setHistoryIndex(-1);
    setInputValue('');

    // ── Special case: awaiting delete confirmation ────────────────────────────
    if (deleteConfirm) {
      const answer = trimmed.toLowerCase();
      if (answer === 'yes' || answer === 'y') {
        setDeleteConfirm(null);
        await handleDeleteConfirmed(deleteConfirm.key, deleteConfirm.env as EnvironmentType);
      } else {
        setDeleteConfirm(null);
        append([line('Deletion cancelled.', 'muted'), line('', 'primary')]);
      }
      return;
    }

    const parsed = parseCommand(trimmed);

    // ── clear ────────────────────────────────────────────────────────────────
    if (parsed.command === 'clear') {
      const resolvedEmailNow = email || localStorage.getItem('krypta_email') || 'unknown@krypta.com';
      const resolvedRoleNow = role || localStorage.getItem('krypta_role') || 'unknown';
      setOutput(buildWelcomeBanner(workspaceName, resolvedEmailNow, resolvedRoleNow));
      return;
    }

    // ── help ─────────────────────────────────────────────────────────────────
    if (parsed.command === 'help') {
      handleHelp();
      return;
    }

    // ── whoami ───────────────────────────────────────────────────────────────
    if (parsed.command === 'whoami') {
      handleWhoami();
      return;
    }

    // ── Resolve env (default: development) ───────────────────────────────────
    const rawEnv = parsed.flags.env;
    const defaulted = !rawEnv;
    const env: EnvironmentType = (rawEnv && VALID_ENVS.includes(rawEnv as EnvironmentType))
      ? (rawEnv as EnvironmentType)
      : 'development';

    if (rawEnv && !VALID_ENVS.includes(rawEnv as EnvironmentType)) {
      append([
        line(`✗ Unknown environment: '${rawEnv}'. Available: development, testing, production`, 'error'),
        line('', 'primary'),
      ]);
      return;
    }

    // ── secrets ───────────────────────────────────────────────────────────────
    if (parsed.command === 'secrets') {
      await handleSecrets(env, defaulted);
      return;
    }

    // ── get ───────────────────────────────────────────────────────────────────
    if (parsed.command === 'get') {
      await handleGet(parsed.args[0] ?? '', env, defaulted);
      return;
    }

    // ── set ───────────────────────────────────────────────────────────────────
    if (parsed.command === 'set') {
      await handleSet(parsed.args[0] ?? '', parsed.args[1] ?? '', env, defaulted);
      return;
    }

    // ── delete ────────────────────────────────────────────────────────────────
    if (parsed.command === 'delete') {
      if (resolvedRole !== 'admin') {
        append([line('✗ Access denied: only admins can delete secrets', 'error'), line('', 'primary')]);
        return;
      }
      const key = parsed.args[0];
      if (!key) {
        append([line('✗ Missing argument. Usage: delete <KEY> --env <environment>', 'error'), line('', 'primary')]);
        return;
      }
      setDeleteConfirm({ key, env });
      append([
        line(`Are you sure you want to delete ${key} from ${env}? (yes/no):`, 'info'),
      ]);
      return;
    }

    // ── unknown ───────────────────────────────────────────────────────────────
    append([
      line(`✗ Unknown command: '${parsed.command}'`, 'error'),
      line("  Type 'help' to see available commands", 'muted'),
      line('', 'primary'),
    ]);
  };

  // ── Key handler ────────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(inputValue);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIndex = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(nextIndex);
      setInputValue(history[nextIndex] ?? '');
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(nextIndex);
      setInputValue(nextIndex === -1 ? '' : (history[nextIndex] ?? ''));
      return;
    }
  };

  // ── Output line colours ────────────────────────────────────────────────────
  const typeToColor: Record<OutputType, string> = {
    success: '#1d9e75',
    error: '#d85a30',
    info: '#7f77dd',
    muted: '#555555',
    primary: '#f1f1f1',
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col"
      style={{ height: '100vh', backgroundColor: '#0a0c10', cursor: 'text' }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          height: '48px',
          borderBottom: '0.5px solid #2a2d35',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
          backgroundColor: '#0a0c10',
        }}
      >
        {/* Left: icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={15} color="#7f77dd" />
          <span
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: '13px',
              fontWeight: 600,
              color: '#7f77dd',
              letterSpacing: '0.02em',
            }}
          >
            Krypta CLI
          </span>
        </div>

        {/* Right: workspace name + clear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {workspaceName && (
            <span
              style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: '11px',
                color: '#555',
              }}
            >
              {workspaceName}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const resolvedEmailNow = email || localStorage.getItem('krypta_email') || 'unknown';
              const resolvedRoleNow = role || localStorage.getItem('krypta_role') || 'unknown';
              setOutput(buildWelcomeBanner(workspaceName, resolvedEmailNow, resolvedRoleNow));
              setDeleteConfirm(null);
              inputRef.current?.focus();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 10px',
              borderRadius: '5px',
              border: '0.5px solid #2a2d35',
              backgroundColor: '#1a1d26',
              color: '#888',
              fontFamily: 'ui-monospace, monospace',
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#f1f1f1')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#888')}
          >
            <X size={11} />
            Clear
          </button>
        </div>
      </div>

      {/* ── Output area ─────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 24px 8px 24px',
          scrollbarWidth: 'none', // Firefox
        }}
        // Hide WebKit scrollbar via inline style (globals.css already handles it)
      >
        {output.map((o) => (
          <div
            key={o.id}
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '13px',
              lineHeight: '1.6',
              color: o.isPrompt ? '#555' : typeToColor[o.type],
              whiteSpace: 'pre',
              userSelect: 'text',
            }}
          >
            {o.isPrompt ? (
              <>
                <span style={{ color: '#7f77dd' }}>krypta</span>
                <span style={{ color: '#555' }}>
                  {o.text.replace('krypta $ ', ' $ ')}
                </span>
              </>
            ) : (
              o.text
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: '13px',
              lineHeight: '1.6',
              color: '#555',
            }}
          >
            ...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input line ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 24px 14px 24px',
          borderTop: '0.5px solid #2a2d35',
          flexShrink: 0,
          backgroundColor: '#0a0c10',
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Prompt label */}
        <span
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: '13px',
            color: '#7f77dd',
            whiteSpace: 'nowrap',
            marginRight: '8px',
            userSelect: 'none',
          }}
        >
          {deleteConfirm ? '(yes/no):' : 'krypta $'}
        </span>

        {/* Text input */}
        <input
          ref={inputRef}
          autoFocus
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#f1f1f1',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '13px',
            lineHeight: '1.6',
            caretColor: '#7f77dd',
            opacity: loading ? 0.5 : 1,
          }}
        />
      </div>

      {/* Blinking cursor CSS — scoped via style tag */}
      <style>{`
        @keyframes krypta-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        input[type="text"] {
          caret-color: #7f77dd;
        }
      `}</style>
    </div>
  );
}
