const { ops } = globalThis.Deno.core;

function returnValue(value) {
  ops.custom_op_return_value(globalThis.Pow.taskId, JSON.stringify(value));
}

function documentDir() {
  return ops.custom_op_document_dir();
}

function send(eventName, data) {
  ops.custom_op_send(globalThis.Pow.taskId, eventName, JSON.stringify(data));
}

function registerAction(actionName, action) {
  if (globalThis.Pow.actionName === actionName) {
    action(globalThis.Pow.actionData);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

globalThis.Pow = { returnValue, documentDir, send, registerAction, sleep };
