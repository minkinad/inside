import type { LoggerService } from '@nestjs/common';

export class JsonLogger implements LoggerService {
  private write(
    level: string,
    message: unknown,
    context?: string,
    trace?: string,
  ) {
    const line = {
      time: new Date().toISOString(),
      level,
      context,
      message: String(message),
      ...(trace ? { trace } : {}),
    };
    (level === 'error' ? process.stderr : process.stdout).write(
      `${JSON.stringify(line)}\n`,
    );
  }
  log(message: unknown, context?: string) {
    this.write('info', message, context);
  }
  error(message: unknown, trace?: string, context?: string) {
    this.write('error', message, context, trace);
  }
  warn(message: unknown, context?: string) {
    this.write('warn', message, context);
  }
  debug(message: unknown, context?: string) {
    this.write('debug', message, context);
  }
  verbose(message: unknown, context?: string) {
    this.write('trace', message, context);
  }
}
