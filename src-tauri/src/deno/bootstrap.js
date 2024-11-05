import { return_value } from "ext:core/ops";

function returnValue(value) {
  return_value(value);
}

globalThis.RuntimeExtension = { returnValue };
