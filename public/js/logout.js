/**
 * Handler for "onload" document event
 */
async function onLoad() {
  // Removes user session object from sessionStorage
  sessionStorage.removeItem('user_session');
  // Changes current window location to website root
  window.location.href = '../';
}