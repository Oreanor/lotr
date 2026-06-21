// Runtime check + actions that only make sense in the Tauri desktop build.
// In the web build `window.isTauri` is undefined, so `isDesktop` is false and
// the desktop-only UI (e.g. the Exit menu item) stays hidden.
export const isDesktop = typeof window !== "undefined" && Boolean((window as { isTauri?: boolean }).isTauri);

// Close the app window. Closing the last window quits the app. Dynamically
// imported so the web bundle never pulls in the Tauri API.
export async function exitApp() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().close();
}
