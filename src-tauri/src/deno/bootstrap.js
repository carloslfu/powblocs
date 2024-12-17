const { ops } = globalThis.Deno.core;

function returnValue(value) {
  ops.custom_op_return_value(globalThis.Pow.taskId, JSON.stringify(value));
}

function send(eventName, data) {
  ops.custom_op_send(globalThis.Pow.taskId, eventName, JSON.stringify(data));
}

function registerAction(actionName, action) {
  if (globalThis.Pow.actionName === actionName) {
    action(globalThis.Pow.actionData);

    globalThis.Pow.actionHandled = true;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function dirPath(dirName) {
  return ops.custom_op_dir_path(dirName);
}

globalThis.Pow = {
  returnValue,
  dirPath,
  send,
  registerAction,
  sleep,
  actionHandled: false,
};
