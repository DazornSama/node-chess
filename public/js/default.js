// Adds "mouseover" event listener to feedback messages container
document.getElementById('page-feedback-messages').addEventListener('mouseover', onMouseOverFeedbackMessage);

/**
 * Handler for "mouseover" feedback message event
 * @param {Event} event DOM "mouseover" event
 */
function onMouseOverFeedbackMessage(event) {
  // Search element with "box" class in parents
  let node = searchForNodeInParent(event.target, 'box');
  // Condition to check if element exists
  if(node) {
    // Removes feedback message
    removeFeedbackUser(node);
  }
}

/**
 * Creates a new feedback message and show it to user.
 * If "onConfirm" or "onAbort" are valorized, it appends two buttons to message
 * @param {String} type Message type [success|alert|error|info]
 * @param {String} content Message content (could be HTML)
 * @param {Function} onConfirm Callback function in case of confirm
 * @param {Function} onAbort Callback function in case of abort
 */
function feedbackUser(type, content, onConfirm, onAbort) {
  // Gets the requested message template
  let template = getTemplate('template-feedback-' + type);
  // Fills it with the message content
  template.querySelector('.box-body').innerHTML = content;
  // Makes message visible
  template.style.display = 'block';

  // Condition to check if "onAbort" exists
  if(onAbort) {
    let args = onAbort.args ? onAbort.args : [];
    // Adds "click" event listener to message's "abort" button
    template.querySelector('.box-footer .button.abort').addEventListener('click', () => {
      // Calls callback function
      onAbort.callback(false, args);
      
      // Removes "keep" class from message
      template.classList.remove('keep');
      // Removes feedback message
      removeFeedbackUser(template);
    });
  }

  // Condition to check if "onConfirm" exists
  if(onConfirm) {
    let args = onConfirm.args ? onConfirm.args : [];
    // Adds "click" event listener to message's "confirm" button
    template.querySelector('.box-footer .button.confirm').addEventListener('click', () => {
      // Calls callback function
      onConfirm.callback(true, args);
      
      // Removes "keep" class from message
      template.classList.remove('keep');
      // Removes feedback message
      removeFeedbackUser(template);
    });

    // Condition to check if message's "abort" button needs to have a default behaviour
    if(!onAbort) {
      // Adds "click" event listener to message's "abort" button
      template.querySelector('.box-footer .button.abort').addEventListener('click', () => {
        // Removes "keep" class from message
        template.classList.remove('keep');
        // Removes feedback message
        removeFeedbackUser(template)
      });
    }
  }

  // Appends the message to messages container
  document.getElementById('page-feedback-messages').prepend(template);

  setTimeout(() => {
    // Removes feedback message after 3 seconds
    removeFeedbackUser(template);
  }, 3000);
}

/**
 * Removes a feedack message from page
 * @param {Element} element Feedback message's DOM element
 */
function removeFeedbackUser(element) {
  // Condition to check if element needs to remain visible
  if(element.classList.contains('keep')) {
    return;
  }

  // Adds "hiding" class to element
  element.classList.add('hiding');

  setTimeout(() => {
    // Removes element after 0,25 seconds
    element.remove();
  }, 250);
}

/**
 * Sets as invisible the page infinite loader
 */
function pageLoaded() {
  // Adds class "loaded" to page infinite loader
  document.getElementById('page-infinite-loader').classList.add('loaded');
}

/**
 * Makes an AJAX request to specified URI.
 * @param {String} uri Unique identifier of the resource to request
 * @param {Object} params Object (key, value) of url's query parameters
 * @param {Object} body Object of request body
 * @return Response content
 */
async function ajaxRequest(uri, params, body) {
  // Sets a promise as return type
  return new Promise((res, rej) => {
    // Instantiates an xmlHttpRequest object
    let req = new XMLHttpRequest();
    // Builds the resource complete url
    let url = window.location.origin + uri;
    // Chooses the request REST method
    let method = body ? 'POST' : 'GET';
    let json;

    // Condition to check if input paratamers exists
    if(!params) {
      params = [];
    }

    // Cycle throught all input parameters
    for(let i = 0; i < params.length; i++) {
      // Condition to check if is first cycle
      if(i === 0) {
        // Adds to url the query parameters starting character
        url += '?';
      }

      // Adds to url the current parameter key and value
      url += params[i].key + '=' + params[i].value;

      // Condition to check if exists another parameter after the current
      if(params[i + 1]) {
        // Adds to url the query parameters concatenation character
        url += '&';
      }
    }

    // Defines the handler function for the request state changes
    req.onreadystatechange = function() {
      // Condition to check if request has been ended and response "status" is 200
      if(this.readyState === 4 && this.status === 200) {
        let result;

        // Exceptions handler to catch a "parsing" error
        try {
          // Parses response body as JSON object
          result = JSON.parse(this.response);
        }
        catch(err) {
          // Takes plain response body
          result = this.response;
        }

        // Resolves the waiting promise
        res(result);
      }
    }
    
    // Intializes the request header
    req.open(method, url);

    // Condition to check if body exists
    if(body) {
      // Sets "contentType" request header to JSON format
      req.setRequestHeader('Content-Type', 'application/json');
      // Parses the body object to a JSON string
      json = JSON.stringify(body);
    }

    // Sends the request
    req.send(json);
  });
}

/**
 * Searches in element's parents recursively.
 * Stops when founded an element with specified selector or zero parents
 * @param {Element} element DOM element
 * @param {String} selector CSS selector
 * @return {Element} DOM element
 */
function searchForNodeInParent(element, selector) {
  let result;

  let classes = [];
  // Condition to check if element has at least one class
  if(element.classList) {
    // Cycle throught all element's classes
    for(let i = 0; i < element.classList.length; i++) {
      classes.push(element.classList[i]);
    }
  }

  // Condition to check if classes contains the specified selector or "id" or "nodeName" are equals to the specified selector
  if(classes.includes(selector) || element.id === selector || element.nodeName === selector) {
    result = element;
  }
  // Condition to check if exists an element's parent element
  else if(element.parentNode) {
    // Calls recursively itself
    result = searchForNodeInParent(element.parentNode, selector);
  }

  return result;
}

/**
 * Gets the template with specified "id"
 * @param {String} id Template's id attribute
 * @return {Element} DOM element of template
 */
function getTemplate(id) {
  // Gets template's DOM element
  let template = document.getElementById(id).cloneNode(true);
  // Removes id attribute
  template.id = '';

  return template;
}

/**
 * Returns current time formatted as "hh:mm"
 * @return {String} Time formatted
 */
function getNewMessageTime() {
  // Gets current datetime value
  let now = new Date();
  // Gets hours
  let hh = now.getHours();
  // Gets minutes
  let mm = now.getMinutes();

  // Condition to check if hours are less than 10
  if(hh < 10) {
    hh = '0' + hh;
  }

  // Condition to check if minutes are less than 10
  if(mm < 10) {
    mm = '0' + mm;
  }

  return hh + ':' + mm;
}

/**
 * Gets current language translation of the specified "path"
 * @param {String} path Translation's text JSON path
 * @return {String} Translated text
 */
function i18n(path) {
  // Splits input path by the "dot" characted
  let steps = path.split('.');
  // Gets the current language object
  let translation = i18nData[steps[0]];

  // Cycle throught all path parts, avoiding first one
  for(let i = 1; i < steps.length; i++) {
    translation = translation[steps[i]];
  }

  return translation;
}

/**
 * Check if current device is a mobile one or not
 */
function isMobile() {
  return /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) 
    || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4));
}