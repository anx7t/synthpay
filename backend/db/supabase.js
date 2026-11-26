const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ── Realtime broadcast ────────────────────────────────────────────────────────
// A single persistent channel is reused across all requests.
// The frontend subscribes to 'task-updates' and listens for 'task_updated' events.

let _channel = null;
let _ready = false;

function getChannel() {
  if (!_channel) {
    _channel = supabase.channel('task-updates');
    _channel.subscribe((status) => {
      _ready = status === 'SUBSCRIBED';
    });
  }
  return _channel;
}

async function broadcastTaskUpdate(task) {
  const ch = getChannel();
  if (!_ready) return; // skip if channel not subscribed yet (first few ms after startup)
  try {
    await ch.send({ type: 'broadcast', event: 'task_updated', payload: { task } });
  } catch {
    // Non-fatal — Realtime failures never block the HTTP response
  }
}

// Kick off the channel subscription at startup so it is ready before the first request
getChannel();

module.exports = supabase;
module.exports.broadcastTaskUpdate = broadcastTaskUpdate;
