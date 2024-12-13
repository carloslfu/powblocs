async function generateFibonacciWithYi() {
  // Step 1: Get available models
  const tagsResponse = await fetch("http://localhost:11434/api/tags");
  const tagsData = await tagsResponse.json();

  // Step 2: Find Yi model
  let yiModel = "";
  for (const model of tagsData.models) {
    if (model.name.includes("yi") || model.name.includes("yi-coder")) {
      yiModel = model.name;
      break;
    }
  }

  if (!yiModel) {
    throw new Error("No Yi model found");
  }

  console.log("yiModel", yiModel);

  // Step 3: Generate Fibonacci implementation
  const generateResponse = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: yiModel,
      stream: false,
      prompt:
        "Generate a JavaScript function that calculates the Fibonacci sequence. Include only the code, no explanations.",
    }),
  });

  const generateData = await generateResponse.json();
  const result = generateData.response;
}

await generateFibonacciWithYi();
