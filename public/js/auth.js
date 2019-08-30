async function onLoad() {
  document.getElementById('submit-login-form').addEventListener('click', onLogin);
  document.getElementById('submit-signup-form').addEventListener('click', onSignup);

  let session = sessionStorage.getItem('user_session');
  if(session)
  {
    let data = JSON.parse(session);
    let res = await ajaxRequest('/auth/validate', [], { id: data.id, hash: data.hash });

    if(res.isOk) {
      window.location.reload();
    }
  }
}

async function onLogin(event) {
  event.preventDefault();
  
  let form = document.getElementById('login-form');
  let username = form.querySelector('input[name="username"]').value;
  let password = form.querySelector('input[name="password"]').value;

  if(!username || !password) {
    form.querySelector('.validation-error').innerText = 'Please, fill out all the fields';
  }
  else {
    form.querySelector('.validation-error').innerText = '';

    let res = await ajaxRequest('/auth/login', [], { username: username, password: password });
    
    if(!res.isOk) {
      form.querySelector('.validation-error').innerText = res.content;
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
}

async function onSignup(event) {
  event.preventDefault();

  let form = document.getElementById('signup-form');
  let username = form.querySelector('input[name="username"]').value;
  let password = form.querySelector('input[name="password"]').value;
  let confirmPassword = form.querySelector('input[name="c-password"]').value;

  if(!username || !password || !confirmPassword) {
    form.querySelector('.validation-error').innerText = 'Please, fill out all the fields';
  }
  else if(password !== confirmPassword) {
    form.querySelector('.validation-error').innerText = 'The passwords does not match!';
  }
  else {
    form.querySelector('.validation-error').innerText = '';

    let res = await ajaxRequest('/auth/signup', [], { username: username, password: password });
    
    if(!res.isOk) {
      form.querySelector('.validation-error').innerText = res.content;
    }
    else
    {
      alert('User created!\nNow you can login');
    }
  }
}

function changeForm(form) {
  let loginButton = document.getElementById('select-login-form');
  let signupButton = document.getElementById('select-signup-form');
  let loginForm = document.getElementById('login-form');
  let signupForm = document.getElementById('signup-form');

  if(form === 'login') {
    deselectElements([ signupButton, signupForm ]);
    selectElements([ loginButton, loginForm ]);
  }
  else {
    deselectElements([ loginButton, loginForm ]);
    selectElements([ signupButton, signupForm ]);
  }
}

function selectElements(elements) {
  for(let i = 0; i < elements.length; i++) {
    elements[i].classList.add('selected');
  }
}

function deselectElements(elements) {
  for(let i = 0; i < elements.length; i++) {
    elements[i].classList.remove('selected');
  }
}