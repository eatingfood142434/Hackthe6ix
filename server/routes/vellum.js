// npm install vellum-ai --save
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { VellumClient, Vellum } = require("vellum-ai");

// create your API key here: https://app.vellum.ai/api-keys#keys
const vellum = new VellumClient({
  apiKey: process.env.VELLUM_API_KEY,
});

// Main async function to execute the workflow
async function executeVellumWorkflow(githubResponse) {
  // configurable parameters
  const workflowDeploymentName = "patchy";
  const releaseTag = "LATEST";
  const inputs = [
    {
      type: "JSON",
      name: "fileTree",
      value: githubResponse,
    }
  ];
  const request = {
    workflowDeploymentName,
    releaseTag,
    inputs,
  };
  try {
    // execute the workflow
    const result = await vellum.executeWorkflow(request);

    if (result.data.state === "REJECTED") {
      throw new Error(result.data.error.message);
    }

    console.log(result.data.outputs);
    return result.data.outputs;
  } catch (error) {
    console.error("Error executing Vellum workflow:", error);
    throw error;
  }
}

// Export for use in other modules
module.exports = { executeVellumWorkflow };
