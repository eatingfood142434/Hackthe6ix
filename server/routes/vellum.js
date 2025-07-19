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
 * Execute Vellum workflow
 * POST /api/vellum/execute
 */
router.post('/execute', async (req, res) => {
  try {
    const { workflowId, inputs, metadata } = req.body;

    if (!workflowId) {
      return res.status(400).json({
        success: false,
        error: 'workflowId is required'
      });
    }

    if (!VELLUM_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Vellum API key not configured'
      });
    }

    const vellumResponse = await axios.post(
      `${VELLUM_BASE_URL}/v1/workflow-deployments/${workflowId}/execute`,
      {
        inputs: inputs || {},
        metadata: metadata || {}
      },
      {
        headers: {
          'Authorization': `Bearer ${VELLUM_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    res.json({
      success: true,
      data: vellumResponse.data,
      executionId: vellumResponse.data.execution_id
    });

  } catch (error) {
    console.error('Vellum API Error:', error.response?.data || error.message);
    
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: error.response.data?.message || 'Vellum API error',
        details: error.response.data
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to execute Vellum workflow',
      message: error.message
    });
  }
});

/**
 * Get workflow execution status
 * GET /api/vellum/execution/:executionId
 */
router.get('/execution/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;

    if (!VELLUM_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Vellum API key not configured'
      });
    }

    const vellumResponse = await axios.get(
      `${VELLUM_BASE_URL}/v1/workflow-executions/${executionId}`,
      {
        headers: {
          'Authorization': `Bearer ${VELLUM_API_KEY}`
        }
      }
    );

    res.json({
      success: true,
      data: vellumResponse.data
    });

  } catch (error) {
    console.error('Vellum API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get execution status',
      message: error.message
    });
  }
});

/**
 * List available workflows
 * GET /api/vellum/workflows
 */
router.get('/workflows', async (req, res) => {
  try {
    if (!VELLUM_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Vellum API key not configured'
      });
    }

    const vellumResponse = await axios.get(
      `${VELLUM_BASE_URL}/v1/workflow-deployments`,
      {
        headers: {
          'Authorization': `Bearer ${VELLUM_API_KEY}`
        }
      }
    );

    res.json({
      success: true,
      data: vellumResponse.data
    });

  } catch (error) {
    console.error('Vellum API Error:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflows',
      message: error.message
    });
  }
});

module.exports = router;
