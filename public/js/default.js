async function ajaxRequest(uri, params, body) {
  return new Promise((res, rej) => {
    let req = new XMLHttpRequest();
    let url = window.location.origin + uri;
    let method = body ? 'POST' : 'GET';
    let json;

    if(!params) {
      params = [];
    }

    for(let i = 0; i < params.length; i++) {
      if(i === 0) {
        params += '?';
      }

      url += params[i].key + '=' + params[i].value;

      if(params[i + 1]) {
        url += '&';
      }
    }

    req.onreadystatechange = function() {
      if(this.readyState === 4 && this.status === 200) {
        res(JSON.parse(this.response));
      }
    }
      
    req.open(method, url);

    if(body) {
      req.setRequestHeader('Content-Type', 'application/json');
      json = JSON.stringify(body);
    }

    req.send(json);
  });
}