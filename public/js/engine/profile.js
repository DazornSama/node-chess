const Profile = {
  /**
   * Initializes settings panel
   */
  init: async function () {
    this.setupList();
    let gameStats = await ajaxRequest('/user/' + userData.tag.replace('#', '') + '/games/stats');

    let container = document.getElementById('profile').querySelector('.user-info');
    if(!container.SimpleBar) {
      // Instantiates a new SimpleBar object for container
      new SimpleBar(container);
    }

    if(gameStats.isOk) {
      document.getElementById('user-game-total').innerText = gameStats.content.total + ' ' + i18n('index.profile.games_total_text');
      document.getElementById('user-game-won').innerText = gameStats.content.won + ' ' + i18n('index.profile.games_won_text');
      document.getElementById('user-game-lost').innerText = gameStats.content.lost + ' ' + i18n('index.profile.games_lost_text');;
      document.getElementById('user-points-record').innerText = gameStats.content.points.record;
      document.getElementById('user-points-now').innerText = gameStats.content.points.now;
    }
  },

  /**
   * Adapt rankings list on orientation change
   */
  setupList: function() {
    setTimeout(() => {
      let body = document.getElementById('profile').querySelector('.user-info');
      body.style.height = (document.getElementById('profile').clientHeight - 100) + 'px';
    }, 100);
  }
}