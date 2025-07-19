const express = require('express');
const axios = require('axios');
const router = express.Router();

/**
 * Vellum AI Workflow Integration
 * Base URL and configuration
 */
const VELLUM_BASE_URL = process.env.VELLUM_API_URL || 'https://api.vellum.ai';
const VELLUM_API_KEY = process.env.VELLUM_API_KEY;

/**
 * Process files through Vellum workflow
 * Takes JSON data with "files" and processes it through the workflow
 * @param {Array} files - Array of file objects with path and content
 * @param {string} workflowId - Vellum workflow deployment ID
 * @param {object} additionalInputs - Additional inputs for the workflow
 * @returns {Promise} - Workflow execution result
 */
async function processFilesWithVellum(files, workflowId, additionalInputs = {}) {
  try {
    if (!VELLUM_API_KEY) {
      throw new Error('Vellum API key not configured');
    }

    if (!files || !Array.isArray(files)) {
      throw new Error('Files must be provided as an array');
    }

    if (!workflowId) {
      throw new Error('Workflow ID is required');
    }

    // Prepare the input data for Vellum workflow
    const workflowInputs = {
      files: files,
      fileCount: files.length,
      timestamp: new Date().toISOString(),
      ...additionalInputs
    };

    console.log(`🚀 Processing ${files.length} files through Vellum workflow: ${workflowId}`);

    const vellumResponse = await axios.post(
      `${VELLUM_BASE_URL}/v1/workflow-deployments/${workflowId}/execute`,
      {
        inputs: workflowInputs,
        metadata: {
          source: 'file-processor',
          fileCount: files.length,
          executedAt: new Date().toISOString()
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${VELLUM_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 second timeout for file processing
      }
    );

    return {
      success: true,
      data: vellumResponse.data,
      executionId: vellumResponse.data.execution_id,
      processedFiles: files.length
    };

  } catch (error) {
    console.error('Vellum workflow processing error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = processFilesWithVellum;