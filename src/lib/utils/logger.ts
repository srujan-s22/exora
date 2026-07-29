/**
 * Structured logger utility.
 * Renders lightweight, colorized human-readable console entries in local development,
 * and structured JSON strings in production environments for indexing.
 */
export const logger = {
  info(message: string, meta?: any) {
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({ level: 'info', timestamp: new Date().toISOString(), message, ...meta }));
    } else {
      console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
    }
  },
  
  warn(message: string, meta?: any) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(JSON.stringify({ level: 'warn', timestamp: new Date().toISOString(), message, ...meta }));
    } else {
      console.warn(`[WARN] ⚠️ ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
    }
  },
  
  error(message: string, error?: any, meta?: any) {
    const errorDetails = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack } 
      : error;
      
    if (process.env.NODE_ENV === 'production') {
      console.error(JSON.stringify({ 
        level: 'error', 
        timestamp: new Date().toISOString(), 
        message, 
        error: errorDetails, 
        ...meta 
      }));
    } else {
      console.error(`[ERROR] ❌ ${message}`, errorDetails || '', meta ? JSON.stringify(meta, null, 2) : '');
    }
  },
  security(message: string, meta?: any) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(JSON.stringify({ level: 'SECURITY', timestamp: new Date().toISOString(), message, ...meta }));
    } else {
      console.warn(`[SECURITY] 🛡️ ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
    }
  },

  critical(message: string, error?: any, meta?: any) {
    const errorDetails = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack } 
      : error;

    if (process.env.NODE_ENV === 'production') {
      console.error(JSON.stringify({ 
        level: 'CRITICAL', 
        timestamp: new Date().toISOString(), 
        message, 
        error: errorDetails, 
        ...meta 
      }));
    } else {
      console.error(`[CRITICAL] 🚨 ${message}`, errorDetails || '', meta ? JSON.stringify(meta, null, 2) : '');
    }
  }
};
export default logger;
