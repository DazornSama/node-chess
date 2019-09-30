const Profile = {
  /**
   * Initializes settings panel
   */
  init: async function () {
    let points = userData.points ? userData.points : 0;
    
    document.getElementById('user-points').innerText = points;
  },

  /**
   * Handler for "change" language select event
   * @param {Event} event DOM "change" event
   */
  onChangeLanguage: async function (event) {
    // Gets target value
    let lang = event.target.value;

    // Requests the langauge change to the server
    await ajaxRequest('/', [{ key: 'clang', value: lang }]);
    // Reloads the poge
    window.location.reload();
  }
}