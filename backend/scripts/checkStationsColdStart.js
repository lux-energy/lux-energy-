const { performance } = require('node:perf_hooks');

const thresholdMs = Number(process.env.STATIONS_SLOW_THRESHOLD_MS || 3000);
const timeoutMs = Number(process.env.STATIONS_CHECK_TIMEOUT_MS || 10000);
const target = new URL(process.env.STATIONS_API_URL || 'http://127.0.0.1:5000/api/stations');
const isLocal = ['localhost', '127.0.0.1', '::1'].includes(target.hostname);

if (!['http:', 'https:'].includes(target.protocol)) {
  throw new Error('STATIONS_API_URL must use HTTP or HTTPS.');
}
if (target.username || target.password) {
  throw new Error('Do not include credentials in STATIONS_API_URL.');
}
if (!Number.isFinite(thresholdMs) || thresholdMs <= 0) {
  throw new Error('STATIONS_SLOW_THRESHOLD_MS must be a positive number.');
}
if (!isLocal && process.env.STAGING_API_ORIGIN !== target.origin) {
  throw new Error('For a non-local check, set STAGING_API_ORIGIN to the confirmed isolated staging origin.');
}

const run = async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(target, { signal: controller.signal });
    await response.arrayBuffer();
    const durationMs = Math.round(performance.now() - startedAt);
    const result = {
      endpoint: `${target.origin}${target.pathname}`,
      status: response.status,
      durationMs,
      thresholdMs,
      slow: durationMs > thresholdMs
    };

    console.log(JSON.stringify(result));
    if (!response.ok) {
      console.error(`Stations API returned HTTP ${response.status}.`);
      process.exitCode = 1;
    } else if (result.slow) {
      console.error(`Stations API exceeded the ${thresholdMs} ms cold-start threshold.`);
      process.exitCode = 2;
    }
  } catch (error) {
    console.error(`Stations API check failed: ${error.name === 'AbortError' ? `timed out after ${timeoutMs} ms` : error.message}`);
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
  }
};

run();
