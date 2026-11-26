const supabase = require('../db/supabase');

// Guards a route with Supabase JWT auth.
// Set REQUIRE_AUTH=true in .env to enforce it; leave unset to bypass in demo mode.
async function requireAuth(req, res, next) {
  if (process.env.REQUIRE_AUTH !== 'true') return next();

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header (Bearer token required)' });
  }

  const token = header.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
}

module.exports = { requireAuth };
