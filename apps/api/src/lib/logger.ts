type LogFields = Record<string, unknown>;

function format(scope: string, message: string, fields?: LogFields): string {
  const suffix = fields && Object.keys(fields).length > 0 ? ` ${JSON.stringify(fields)}` : '';
  return `[sync:${scope}] ${message}${suffix}`;
}

export function createSyncLogger(scope: string) {
  return {
    info(message: string, fields?: LogFields): void {
      console.log(format(scope, message, fields));
    },
    warn(message: string, fields?: LogFields): void {
      console.warn(format(scope, message, fields));
    },
    error(message: string, fields?: LogFields): void {
      console.error(format(scope, message, fields));
    },
  };
}
