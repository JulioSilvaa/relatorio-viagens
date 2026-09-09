type Level = 'info' | 'warn' | 'error';

interface LogMeta {
  [key: string]: unknown;
}

function write(level: Level, message: string, meta?: LogMeta): void {
  const line = JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...meta });
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (message: string, meta?: LogMeta) => write('info', message, meta),
  warn: (message: string, meta?: LogMeta) => write('warn', message, meta),
  error: (message: string, meta?: LogMeta) => write('error', message, meta),
};
