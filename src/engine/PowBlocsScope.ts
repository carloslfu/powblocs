export const PowBlocsScope = {
  runAction: (actionName: string, input: any) => {
    console.log("runAction", actionName, input);
  },
  useEvent: (eventName: string, callback: (data: any) => void) => {
    console.log("useEvent", eventName, callback);
  },
  useActionResult: (actionName: string, callback: (data: any) => void) => {
    console.log("useActionResult", actionName, callback);
  },
};
