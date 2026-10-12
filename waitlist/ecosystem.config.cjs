module.exports = { apps: [{
  name: 'lexari-waitlist',
  script: 'server.js',
  cwd: '/opt/lexari-waitlist',
  node_args: '--env-file=/etc/lexari-waitlist/admin.env --disable-warning=ExperimentalWarning',
  env: { PORT: '3220', HOST: '127.0.0.1', DB_PATH: '/var/lib/lexari-waitlist/waitlist.db', PUBLIC_URL: 'https://waitlist.lexari.ai', PRIVY_APP_ID: 'cmusfhplr019q0clb78qy382j' },
  max_memory_restart: '200M',
}] };
