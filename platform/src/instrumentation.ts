/**
 * Runs once when the Node.js server starts (Next.js instrumentation hook).
 *
 * Hostinger's runtime log shows only what is written with console.log (its runner
 * sets LSNODE_CONSOLE_LOG). Anything on stderr, including a crash, is invisible
 * there. When that variable is present, errors are mirrored to stdout so they
 * show up in hPanel → Node.js → Runtime logs. Elsewhere this does nothing.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.LSNODE_CONSOLE_LOG) return;

  const describe = (value: unknown) =>
    value instanceof Error ? `${value.name}: ${value.message}\n${value.stack ?? ""}` : String(value);

  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    originalError(...args);
    console.log("[error]", ...args.map(describe));
  };

  process.on("uncaughtException", (error) => {
    console.log("[uncaughtException]", describe(error));
  });
  process.on("unhandledRejection", (reason) => {
    console.log("[unhandledRejection]", describe(reason));
  });

  console.log(`[startup] node ${process.version}, pid ${process.pid}, env ${process.env.NODE_ENV}`);
}
