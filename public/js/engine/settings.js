async function onChangeLanguage(event) {
  let lang = event.target.value;

  await ajaxRequest('/', [{ key: 'clang', value: lang }]);
  window.location.reload();
}