const { ops } = globalThis.Deno.core;

function returnValue(value) {
  ops.custom_op_return_value(globalThis.Pow.taskId, JSON.stringify(value));
}

function documentDir() {
  return ops.custom_op_document_dir();
}

globalThis.Pow = { returnValue, documentDir };
