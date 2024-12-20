const { ops } = globalThis.Deno.core;

function returnValue(value) {
  ops.custom_op_return_value(globalThis.Pow.taskId, JSON.stringify(value));
}

function send(eventName, data) {
  ops.custom_op_send(globalThis.Pow.taskId, eventName, JSON.stringify(data));
}

const actionMap = {};

function registerAction(actionName, action) {
  actionMap[actionName] = action;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function dirPath(dirName) {
  return ops.custom_op_dir_path(dirName);
}

function callAction(actionName, input) {
  if (actionMap[actionName]) {
    actionMap[actionName](input);
  }
}

function _evaluateActions() {
  if (actionMap[globalThis.Pow.actionName]) {
    actionMap[globalThis.Pow.actionName](globalThis.Pow.actionData);

    globalThis.Pow._actionHandled = true;
  }
}

globalThis.Pow = {
  returnValue,
  dirPath,
  send,
  registerAction,
  sleep,
  _actionHandled: false,
  callAction,
  _evaluateActions,
};
