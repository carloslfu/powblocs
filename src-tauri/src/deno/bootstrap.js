import { return_value } from "ext:core/ops";

function returnValue(value) {
  return_value(JSON.stringify(value));
}

globalThis.RuntimeExtension = { returnValue };
