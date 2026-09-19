// The website has no dark mode; the admin is forced to "light" (see
// UNFOLD["THEME"] in settings.py). The theme toggle is hidden, but Alpine's
// $persist plugin may have already stored an "auto"/"dark" choice under
// this key from before THEME was set. Clear it (rather than overwriting
// with a raw string) so Alpine's persist plugin falls back to the
// server-provided default and re-persists it in its own JSON-encoded
// format -- writing a plain string here previously broke JSON.parse inside
// Alpine's persist plugin, which crashed Alpine's init and left the whole
// page hidden behind its loading cloak.
try {
  localStorage.removeItem("adminTheme");
} catch {
  // localStorage unavailable (private browsing, etc.) -- nothing to reset.
}
