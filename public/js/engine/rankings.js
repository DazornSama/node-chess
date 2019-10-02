const Rankings = {
  /**
   * Initializes settings panel
   */
  init: async function () {
    this.setupList();
    let userList = await ajaxRequest('/users/top100');

    let container = document.getElementById('rankings').querySelector('.rows');
    
    if(!container.SimpleBar) {
      // Instantiates a new SimpleBar object for container
      new SimpleBar(container);
    }
    
    if(userList.isOk) {
      container.SimpleBar.getContentElement().innerHTML = '';
      
      for(let i = 0; i < 100; i++) {
        let user = userList.content[i];

        let row = getTemplate('template-rankings-row');
        row.querySelector('.row-position').innerText = i + 1;
        row.querySelector('.row-username').innerText = user ? user.username : '???';
        row.querySelector('.row-points').innerHTML = '<img src="images/trophy.png"> ' + (user ? user.points : '?');

        if(i < 3) {
          row.classList.add('medal');
        }

        if(user) {
          if(user.tag === userData.tag) {
            row.classList.add('me');
          }
        }

        container.SimpleBar.getContentElement().append(row);
      }
    }
  },

  /**
   * Adapt rankings list on orientation change
   */
  setupList: function() {
    setTimeout(() => {
      let body = document.getElementById('rankings').querySelector('.rows');
      body.style.height = (document.getElementById('rankings').clientHeight - 100) + 'px';
    }, 100);
  }
}