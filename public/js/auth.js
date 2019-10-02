/**
 * Handler for "onload" document event
 */
async function onLoad() {
  // Gets "username" input dom object
  let inputUsername = document.querySelector('input[name="username"]');
  // Gets "password" input dom object
  let inputPassword = document.querySelector('input[name="password"]');
  
  // Adds input-validation event listeners to "username" input
  inputUsername.addEventListener('keyup', inputValidation);
  inputUsername.addEventListener('blur', inputValidation);

  // Adds input-validation event listeners to "password" input
  inputPassword.addEventListener('keypress', fastLogin);
  inputPassword.addEventListener('keyup', inputValidation);
  inputPassword.addEventListener('blur', inputValidation);

  // Adds click event listeners to "signup" and "login" buttons
  document.getElementById('submit-signup').addEventListener('click', onSignup);
  document.getElementById('submit-login').addEventListener('click', onLogin);

  // Condition to check if exists a session item in sessionStorage
  let session = isMobile() ? localStorage.getItem('user_session') : sessionStorage.getItem('user_session');
  if(session)
  {
    // Parses session item data as JSON object
    let data = JSON.parse(session);
    // Requests an auto-login from server
    let res = await ajaxRequest('/auth/validate', [], { id: data.id, hash: data.hash });

    // Condition to check if server response is without errors
    if(res.isOk) {
      // Reloads the page
      window.location.reload();
    }
  }

  // Page is entirely loaded and usable by user
  pageLoaded();
}

/**
 * Handler for "keyup" and "blur" input-validation event
 * @param {Event} event DOM "keyup" or "blur" event
 */
async function inputValidation(event) {
  // Gets event target (input) value
  let value = event.target.value;
  let validation = true;

  // Removes "error" class from target parent
  event.target.parentNode.classList.remove('error');

  // Condition to check if value exists
  if(!value) {
    // Adds "error" class to target parent
    event.target.parentNode.classList.add('error');
    validation = false;
  }

  // Enables/disables "signup" or "login" buttons depending on validation result
  document.getElementById('submit-signup').disabled = !validation;
  document.getElementById('submit-login').disabled = !validation;
}

/**
 * Handler for "keypress" fast-login event
 * @param {Event} event DOM "keypress" event
 */
function fastLogin(event) {
  // Condition to check if "enter" key was pressed
  if(event.charCode === 13 || event.keyCode === 13) {
    // Builds a DOM "click" event
    let delegate = new CustomEvent('click', { detail: { target: document.getElementById('submit-login') } });
    // Forces "login" event to be executed
    onLogin(delegate);
  }
}

/**
 * Handler for "click" login event
 * @param {Event} event DOM "click" event
 */
async function onLogin(event) {
  let target = event.target ? event.target : event.detail.target;

  // Gets "username" input value
  let username = document.querySelector('input[name="username"]').value;
  // Gets "password" input value
  let password = document.querySelector('input[name="password"]').value;

  // Disabled "signup" button
  document.getElementById('submit-signup').disabled = true;
  // Adds "loading" class to event target
  target.classList.add('loading');

  // Requests credentials authorization from server
  let res = await ajaxRequest('/auth/login', [], { username: username, password: password });
  
  // Removes "loading" class from event target
  target.classList.remove('loading');
  // Enables "signup" button
  document.getElementById('submit-signup').disabled = false;

  // Condition to check if server response is without errors
  if(!res.isOk) {
    // Notify the user with an error message
    feedbackUser('error', i18n(res.content));
  }
  else
  {
    // Creates user session object
    let user = {
      id: res.content._id,
      hash: res.content.hash
    };

    // Condition to check if device is mobile
    if(isMobile()) {
      // Sets an item in localStorage for user session
      localStorage.setItem('user_session', JSON.stringify(user));
    }
    else {
      // Sets an item in sessionStorage for user session
      sessionStorage.setItem('user_session', JSON.stringify(user));
    }
    // Reloads the page
    window.location.reload();
  }
}

/**
 * Handler for "click" signup event
 * @param {Event} event DOM "click" event
 */
async function onSignup(event) {
  // Gets "username" input value
  let username = document.querySelector('input[name="username"]').value;
  // Gets "password" input value
  let password = document.querySelector('input[name="password"]').value;

  // Condition to check if password value exists
  if(!password) {
    // Adds "error" class to password input parent
    document.querySelector('input[name="password"]').parentNode.classList.add('error');
    // Notify the user with an alert message
    feedbackUser('alert', i18n('auth.signup_password_not_empty_feedback'));
    return;
  }

  // Disabled "login" button
  document.getElementById('submit-login').disabled = true;
  // Adds "loading" class to event target
  event.target.classList.add('loading');

  // Requests credentials uniquity and account creation from server
  let res = await ajaxRequest('/auth/signup', [], { username: username, password: password });

  // Removes "loading" class from event target
  event.target.classList.remove('loading');
  // Enables "login" button
  document.getElementById('submit-login').disabled = false;

  // Condition to check if server response is without errors
  if(!res.isOk) {
    // Notify the user with an error message
    feedbackUser('error', i18n(res.content));
  }
  else
  {
    // Notify the user with a success message
    feedbackUser('success', i18n('auth.signup_success_feedback'));
    let delegate = new CustomEvent('click', { detail: { target: document.getElementById('submit-login') } });
    // Forces "login" event to be executed
    onLogin(delegate);
  }
}