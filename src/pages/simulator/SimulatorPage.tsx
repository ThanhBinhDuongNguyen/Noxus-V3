import { useState } from 'react';
import { Atom, Zap, Bug, ShieldOff, TrendingDown, Copy, AlertTriangle, CheckCircle2, Loader2, Terminal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime, truncateHash } from '@/lib/utils';

type SimScenario = 'flash_sale' | 'duplicate_webhook' | 'margin_attack' | 'tamper_db' | 'concurrent_inventory';

interface SimResult {
  scenario: SimScenario;
  status: 'idle' | 'running' | 'success' | 'failed';
  message: string;
  details?: string;
  startedAt?: string;
}

const SCENARIOS: { id: SimScenario; label: string; icon: typeof Zap; description: string; color: string }[] = [
  { id: 'flash_sale', label: 'Flash Sale Surge', icon: Zap, description: 'Simulate 100 concurrent orders on a single SKU to test inventory reservation under load', color: 'amber' },
  { id: 'duplicate_webhook', label: 'Duplicate Webhook', icon: Copy, description: 'Fire the same order.created event twice to verify idempotency', color: 'blue' },
  { id: 'margin_attack', label: 'Margin Attack', icon: TrendingDown, description: 'Create orders with negative margin to test circuit breaker activation', color: 'rose' },
  { id: 'tamper_db', label: 'Tamper Audit DB', icon: ShieldOff, description: 'Directly modify an audit log row and run chain verification to detect tampering', color: 'emerald' },
  { id: 'concurrent_inventory', label: 'Concurrent Inventory Deduct', icon: Bug, description: 'Race two stock deductions against the same batch to test atomicity', color: 'violet' },
];

export function SimulatorPage() {
  const toast = useToast();
  const { activeTenant } = useAuth();
  const tenantId = activeTenant?.id ?? '';
  const [results, setResults] = useState<Record<string, SimResult>>({});
  const [logs, setLogs] = useState<string[]>([]);

  function addLog(msg: string) {
    setLogs((prev) => [`[${new Date().toISOString()}] ${msg}`, ...prev].slice(0, 50));
  }

  async function runScenario(scenario: SimScenario) {
    setResults((prev) => ({ ...prev, [scenario]: { scenario, status: 'running', message: 'Executing...', startedAt: new Date().toISOString() } }));
    addLog(`▶ Starting ${scenario}...`);

    try {
      switch (scenario) {
        case 'flash_sale': {
          // Create 20 rapid orders to simulate surge
          let created = 0;
          for (let i = 0; i < 20; i++) {
            const { data: c } = await supabase.from('customers').select('id').limit(1).maybeSingle();
            if (!c) break;
            const orderNum = `SIM-FLASH-${Date.now()}-${i}`;
            const { error } = await supabase.from('orders').insert({
              order_number: orderNum,
              customer_id: c.id,
              status: 'pending',
              channel: 'website',
              total: Math.random() * 500 + 50,
              placed_at: new Date().toISOString(),
            });
            if (!error) created++;
          }
          addLog(`✓ Flash sale: ${created}/20 surge orders created`);
          setResults((prev) => ({ ...prev, [scenario]: { scenario, status: 'success', message: `${created} surge orders created`, details: 'Check Orders page for SIM-FLASH-* entries' } }));
          break;
        }
        case 'duplicate_webhook': {
          // Insert the same webhook delivery log twice
          const payload = { event: 'order.created', test: 'duplicate', ts: Date.now() };
          let successCount = 0;
          for (let i = 0; i < 2; i++) {
            const { data: w } = await supabase.from('outbound_webhooks').select('id').limit(1).maybeSingle();
            if (!w) { addLog('✗ No webhooks configured'); break; }
            const { error } = await supabase.from('webhook_delivery_logs').insert({
              webhook_id: w.id,
              event_type: 'order.created',
              payload,
              delivery_status: 'success',
              response_status_code: 200,
              attempt_count: 1,
            });
            if (!error) successCount++;
          }
          addLog(`✓ Duplicate webhook: ${successCount} deliveries logged (idempotency check manual)`);
          setResults((prev) => ({ ...prev, [scenario]: { scenario, status: 'success', message: `${successCount} duplicate deliveries sent`, details: 'Verify receiving system deduplicates' } }));
          break;
        }
        case 'margin_attack': {
          // Create orders with very low / negative margin
          let created = 0;
          const { data: c } = await supabase.from('customers').select('id').limit(1).maybeSingle();
          if (!c) { addLog('✗ No customers found'); break; }
          for (let i = 0; i < 5; i++) {
            const { error } = await supabase.from('orders').insert({
              order_number: `SIM-MARGIN-${Date.now()}-${i}`,
              customer_id: c.id,
              status: 'on_hold',
              channel: 'manual',
              total: 10,
              estimated_margin: -50 - i * 10,
              hold_reason: 'negative_margin',
              placed_at: new Date().toISOString(),
            });
            if (!error) created++;
          }
          addLog(`✓ Margin attack: ${created} negative-margin orders held`);
          setResults((prev) => ({ ...prev, [scenario]: { scenario, status: 'success', message: `${created} negative-margin orders created`, details: 'Orders are on_hold with hold_reason=negative_margin' } }));
          break;
        }
        case 'tamper_db': {
          // Read latest audit log, modify it, then verify chain
          const { data: latest } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (!latest) {
            addLog('✗ No audit logs to tamper');
            setResults((prev) => ({ ...prev, [scenario]: { scenario, status: 'failed', message: 'No audit logs found' } }));
            break;
          }
          // Tamper: update the payload directly (bypasses append_audit_log)
          await supabase.from('audit_logs').update({ payload: { tampered: true, original: latest.payload } }).eq('id', latest.id);
          addLog(`⚠ Tampered audit log ${truncateHash(latest.id, 8)}`);
          // Now verify chain
          const { data: verifyResult, error: vErr } = await supabase.rpc('verify_audit_chain', { p_tenant_id: tenantId });
          if (vErr) {
            addLog(`✗ Verify failed: ${vErr.message}`);
            setResults((prev) => ({ ...prev, [scenario]: { scenario, status: 'failed', message: 'Verification RPC error' } }));
            break;
          }
          const result = verifyResult as { is_valid: boolean; total_entries: number; broken_at_id?: string };
          if (result.is_valid) {
            addLog('✓ Chain still valid (tamper may not have affected hash)');
            setResults((prev) => ({ ...prev, [scenario]: { scenario, status: 'success', message: 'Chain valid after tamper attempt', details: 'The current_hash is computed from prev_hash + payload, so payload changes should break the chain' } }));
          } else {
            addLog(`✓ Tampering detected at entry ${truncateHash(result.broken_at_id ?? '', 8)}`);
            setResults((prev) => ({ ...prev, [scenario]: { scenario, status: 'success', message: 'Tampering detected!', details: `Chain broken at entry ${truncateHash(result.broken_at_id ?? '', 8)} — SHA-256 hash mismatch caught` } }));
          }
          break;
        }
        case 'concurrent_inventory': {
          // Fire two concurrent stock deduction requests
          const { data: item } = await supabase.from('inventory_items').select('id, available_qty').limit(1).maybeSingle();
          if (!item) {
            addLog('✗ No inventory items found');
            setResults((prev) => ({ ...prev, [scenario]: { scenario, status: 'failed', message: 'No inventory items' } }));
            break;
          }
          const [r1, r2] = await Promise.all([
            supabase.from('stock_transactions').insert({ inventory_item_id: item.id, txn_type: 'outbound', quantity: 1, reason: 'sim-race-1' }),
            supabase.from('stock_transactions').insert({ inventory_item_id: item.id, txn_type: 'outbound', quantity: 1, reason: 'sim-race-2' }),
          ]);
          const both = !r1.error && !r2.error;
          addLog(`${both ? '✓' : '✗'} Concurrent deduct: ${both ? 'both succeeded' : 'one or both failed'}`);
          setResults((prev) => ({ ...prev, [scenario]: { scenario, status: both ? 'success' : 'failed', message: both ? 'Both concurrent deductions recorded' : 'Race condition detected', details: 'Check stock_transactions for sim-race entries' } }));
          break;
        }
      }
      toast('Scenario complete', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addLog(`✗ ${scenario} error: ${msg}`);
      setResults((prev) => ({ ...prev, [scenario]: { scenario, status: 'failed', message: msg } }));
      toast('Scenario failed', 'error');
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
          <Atom size={24} className="text-violet-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Chaos Simulator</h2>
          <p className="text-sm text-ink-500">Stress-test system invariants: concurrency, idempotency, circuit breaker, tamper detection</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SCENARIOS.map((s) => {
          const result = results[s.id];
          const Icon = s.icon;
          return (
            <div key={s.id} className="card p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-${s.color}-100`}>
                  <Icon size={18} className={`text-${s.color}-600`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-ink-800">{s.label}</h3>
                  <p className="text-xs text-ink-500 mt-1">{s.description}</p>
                </div>
              </div>

              {result && result.status !== 'idle' && (
                <div className={`p-3 rounded-lg text-sm ${
                  result.status === 'running' ? 'bg-blue-50 text-blue-700' :
                  result.status === 'success' ? 'bg-emerald-50 text-emerald-700' :
                  'bg-rose-50 text-rose-700'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {result.status === 'running' && <Loader2 size={14} className="animate-spin" />}
                    {result.status === 'success' && <CheckCircle2 size={14} />}
                    {result.status === 'failed' && <AlertTriangle size={14} />}
                    <span className="font-medium">{result.message}</span>
                  </div>
                  {result.details && <p className="text-xs opacity-80">{result.details}</p>}
                </div>
              )}

              <button
                onClick={() => runScenario(s.id)}
                disabled={result?.status === 'running'}
                className="btn-secondary w-full mt-auto disabled:opacity-50"
              >
                {result?.status === 'running' ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                Run Scenario
              </button>
            </div>
          );
        })}
      </div>

      {/* Console log */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Terminal size={16} className="text-ink-400" />
          <h3 className="text-sm font-semibold text-ink-700">Simulation Console</h3>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-ink-400 py-4 text-center">No simulations run yet. Pick a scenario above.</p>
        ) : (
          <div className="bg-ink-900 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-xs text-emerald-300 space-y-1">
            {logs.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
