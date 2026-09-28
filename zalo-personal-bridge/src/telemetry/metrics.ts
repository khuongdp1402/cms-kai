import client from 'prom-client';

client.collectDefaultMetrics({ prefix: 'zalo_bridge_' });

export const metrics = {
  sessions: new client.Gauge({
    name: 'zalo_bridge_sessions',
    help: 'Current active Zalo sessions by state',
    labelNames: ['state'],
  }),
  leaseAcquires: new client.Counter({
    name: 'zalo_bridge_lease_acquire_total',
    help: 'Total lease acquire attempts by outcome',
    labelNames: ['outcome'],
  }),
  inboundTotal: new client.Counter({
    name: 'zalo_bridge_inbound_total',
    help: 'Total inbound events received',
    labelNames: ['kind', 'outcome'],
  }),
  outboundTotal: new client.Counter({
    name: 'zalo_bridge_outbound_total',
    help: 'Total outbound deliveries processed',
    labelNames: ['kind', 'outcome'],
  }),
  deliveryLatency: new client.Histogram({
    name: 'zalo_bridge_delivery_latency_seconds',
    help: 'Delivery latency in seconds',
    labelNames: ['direction'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  }),
  registry: client.register,
};
