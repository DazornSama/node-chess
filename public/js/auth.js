async function onLoad() {
  document.querySelector('input[name="username"]').addEventListener('keyup', inputValidation);
  document.querySelector('input[name="username"]').addEventListener('blur', inputValidation);

  document.querySelector('input[name="password"]').addEventListener('keypress', fastLogin);
  document.querySelector('input[name="password"]').addEventListener('keyup', inputValidation);
  document.querySelector('input[name="password"]').addEventListener('blur', inputValidation);

  document.getElementById('submit-signup').addEventListener('click', onSignup);
  document.getElementById('submit-login').addEventListener('click', onLogin);

  let session = sessionStorage.getItem('user_session');
  if(session)
  {
    let data = JSON.parse(session);
    let res = await ajaxRequest('/auth/validate', [], { id: data.id, hash: data.hash });

    if(res.isOk) {
      window.location.reload();
    }
  }

  pageLoaded();
}

async function inputValidation(event) {
  let value = event.target.value;
  let validation = true;

  event.target.parentNode.classList.remove('error');

  if(!value) {
    event.target.parentNode.classList.add('error');
    validation = false;
  }

  document.getElementById('submit-signup').disabled = !validation;
  document.getElementById('submit-login').disabled = !validation;
}

function fastLogin(event) {
  if(event.charCode === 13 || event.keyCode === 13) {
    let delegate = {
      target: document.getElementById('submit-login')
    };

    onLogin(delegate);
  }
}

async function onLogin(event) {
  let username = document.querySelector('input[name="username"]').value;
  let password = document.querySelector('input[name="password"]').value;

  document.getElementById('submit-signup').disabled = true;
  event.target.classList.add('loading');

  let res = await ajaxRequest('/auth/login', [], { username: username, password: password });
  
  event.target.classList.remove('loading');
  document.getElementById('submit-signup').disabled = false;

  if(!res.isOk) {
    feedbackUser('error', i18n(res.content));
  }
  else
  {
    let user = {
      id: res.content._id,
      hash: res.content.hash
    };

    sessionStorage.setItem('user_session', JSON.stringify(user));
    window.location.reload();
  }
}

async function onSignup(event) {
  let username = document.querySelector('input[name="username"]').value;
  let password = document.querySelector('input[name="password"]').value;

  if(!password) {
    document.querySelector('input[name="password"]').parentNode.classList.add('error');
    feedbackUser('alert', i18n('auth.signup_password_not_empty_feedback'));
    return;
  }

  document.getElementById('submit-login').disabled = true;
  event.target.classList.add('loading');

  let res = await ajaxRequest('/auth/signup', [], { username: username, password: password });

  event.target.classList.remove('loading');
  document.getElementById('submit-login').disabled = false;

  if(!res.isOk) {
    feedbackUser('error', i18n(res.content));
  }
  else
  {
    feedbackUser('success', i18n('auth.signup_success_feedback'));
  }
}