const { VellumClient } = require('vellum-ai');
const fs = require('fs');
const path = require('path');

/**
 * Vellum Workflow Integration
 * Connects to existing Vellum workflows and processes JSON inputs
 */
class VellumWorkflowRunner {
    constructor(options = {}) {
        // Initialize Vellum client with API key
        this.apiKey = options.apiKey || process.env.VELLUM_API_KEY;
        
        if (!this.apiKey) {
            throw new Error('Vellum API key is required. Set VELLUM_API_KEY environment variable or pass apiKey in options.');
        }
        
        this.client = new VellumClient({
            apiKey: this.apiKey
        });
        
        this.outputDir = options.outputDir || path.join(__dirname, 'vellum_results');
        this.ensureOutputDirectory();
    }

    /**
     * Ensure output directory exists
     */
    ensureOutputDirectory() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Execute a Vellum workflow with JSON input
     * @param {string} workflowDeploymentId - The deployment ID of your Vellum workflow
     * @param {object} input - JSON input data for the workflow
     * @param {object} options - Additional options
     */
    async executeWorkflow(workflowDeploymentId, input, options = {}) {
        try {
            console.log('🚀 Starting Vellum workflow execution...');
            console.log(`📋 Workflow ID: ${workflowDeploymentId}`);
            console.log(`📥 Input:`, JSON.stringify(input, null, 2));
            
            // Execute the workflow
            const response = await this.client.executeWorkflow({
                workflowDeploymentId: workflowDeploymentId,
                inputs: input,
                // Optional parameters
                externalId: options.externalId || `execution_${Date.now()}`,
                releaseTag: options.releaseTag || 'LATEST'
            });
            
            console.log('✅ Workflow execution completed');
            
            // Process the response
            const result = {
                executionId: response.id,
                state: response.state,
                outputs: response.outputs,
                metadata: {
                    workflowDeploymentId,
                    executedAt: new Date().toISOString(),
                    executionTime: response.executionTime,
                    externalId: options.externalId
                },
                rawResponse: response
            };
            
            // Save results to file
            if (options.saveResults !== false) {
                await this.saveResults(result, workflowDeploymentId);
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Workflow execution failed:', error.message);
            throw new Error(`Vellum workflow execution failed: ${error.message}`);
        }
    }

    /**
     * Execute workflow and stream results (for long-running workflows)
     * @param {string} workflowDeploymentId - The deployment ID of your Vellum workflow
     * @param {object} input - JSON input data for the workflow
     * @param {function} onUpdate - Callback function for streaming updates
     * @param {object} options - Additional options
     */
    async executeWorkflowStream(workflowDeploymentId, input, onUpdate, options = {}) {
        try {
            console.log('🌊 Starting streaming Vellum workflow execution...');
            console.log(`📋 Workflow ID: ${workflowDeploymentId}`);
            
            const stream = await this.client.executeWorkflowStream({
                workflowDeploymentId: workflowDeploymentId,
                inputs: input,
                externalId: options.externalId || `stream_execution_${Date.now()}`,
                releaseTag: options.releaseTag || 'LATEST'
            });
            
            const results = [];
            
            // Process streaming responses
            for await (const chunk of stream) {
                console.log('📦 Received chunk:', chunk.type);
                results.push(chunk);
                
                // Call the update callback if provided
                if (onUpdate && typeof onUpdate === 'function') {
                    onUpdate(chunk);
                }
            }
            
            console.log('✅ Streaming workflow execution completed');
            
            const finalResult = {
                executionId: results[results.length - 1]?.id,
                chunks: results,
                metadata: {
                    workflowDeploymentId,
                    executedAt: new Date().toISOString(),
                    totalChunks: results.length,
                    externalId: options.externalId
                }
            };
            
            // Save streaming results
            if (options.saveResults !== false) {
                await this.saveResults(finalResult, workflowDeploymentId, 'stream');
            }
            
            return finalResult;
            
        } catch (error) {
            console.error('❌ Streaming workflow execution failed:', error.message);
            throw new Error(`Vellum streaming workflow execution failed: ${error.message}`);
        }
    }

    /**
     * Get workflow deployment information
     * @param {string} workflowDeploymentId - The deployment ID
     */
    async getWorkflowInfo(workflowDeploymentId) {
        try {
            console.log(`📋 Fetching workflow information for: ${workflowDeploymentId}`);
            
            const deployment = await this.client.deployments.retrieve(workflowDeploymentId);
            
            return {
                id: deployment.id,
                name: deployment.name,
                label: deployment.label,
                status: deployment.status,
                createdAt: deployment.createdAt,
                lastDeployedAt: deployment.lastDeployedAt,
                inputVariables: deployment.inputVariables,
                outputVariables: deployment.outputVariables
            };
            
        } catch (error) {
            console.error('❌ Failed to get workflow info:', error.message);
            throw new Error(`Failed to get workflow info: ${error.message}`);
        }
    }

    /**
     * Save execution results to file
     * @param {object} result - The execution result
     * @param {string} workflowId - The workflow deployment ID
     * @param {string} type - Type of execution ('normal' or 'stream')
     */
    async saveResults(result, workflowId, type = 'normal') {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `vellum-${type}-${workflowId}-${timestamp}.json`;
            const filepath = path.join(this.outputDir, filename);
            
            fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
            console.log(`💾 Results saved to: ${filepath}`);
            
            return filepath;
        } catch (error) {
            console.warn('⚠️ Failed to save results:', error.message);
        }
    }

    /**
     * Load input from JSON file
     * @param {string} filePath - Path to JSON input file
     */
    loadInputFromFile(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                throw new Error(`Input file not found: ${filePath}`);
            }
            
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            throw new Error(`Failed to load input file: ${error.message}`);
        }
    }

    /**
     * Validate input against workflow requirements
     * @param {object} input - Input data to validate
     * @param {string} workflowDeploymentId - Workflow deployment ID
     */
    async validateInput(input, workflowDeploymentId) {
        try {
            const workflowInfo = await this.getWorkflowInfo(workflowDeploymentId);
            const requiredInputs = workflowInfo.inputVariables || [];
            
            const missingInputs = [];
            const providedKeys = Object.keys(input);
            
            for (const requiredInput of requiredInputs) {
                if (requiredInput.required && !providedKeys.includes(requiredInput.key)) {
                    missingInputs.push(requiredInput.key);
                }
            }
            
            if (missingInputs.length > 0) {
                throw new Error(`Missing required inputs: ${missingInputs.join(', ')}`);
            }
            
            console.log('✅ Input validation passed');
            return true;
            
        } catch (error) {
            console.error('❌ Input validation failed:', error.message);
            throw error;
        }
    }
}

/**
 * CLI interface for running Vellum workflows
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        console.log('Vellum Workflow Runner');
        console.log('');
        console.log('Usage:');
        console.log('  node vellum.js <workflow_deployment_id> <input_json_or_file>');
        console.log('  node vellum.js --info <workflow_deployment_id>');
        console.log('');
        console.log('Examples:');
        console.log('  node vellum.js wkflw_12345 \'{"text": "Hello World"}\' ');
        console.log('  node vellum.js wkflw_12345 ./input.json');
        console.log('  node vellum.js --info wkflw_12345');
        console.log('');
        console.log('Environment Variables:');
        console.log('  VELLUM_API_KEY - Your Vellum API key (required)');
        console.log('');
        console.log('Input JSON format example:');
        console.log('  {');
        console.log('    "text": "Analyze this code for vulnerabilities",');
        console.log('    "code": "function vulnerable() { eval(userInput); }",');
        console.log('    "language": "javascript"');
        console.log('  }');
        return;
    }
    
    try {
        const runner = new VellumWorkflowRunner();
        
        // Handle --info command
        if (args[0] === '--info') {
            if (args.length < 2) {
                console.error('❌ Please provide a workflow deployment ID');
                process.exit(1);
            }
            
            const workflowId = args[1];
            const info = await runner.getWorkflowInfo(workflowId);
            
            console.log('\n📋 Workflow Information:');
            console.log(`Name: ${info.name}`);
            console.log(`ID: ${info.id}`);
            console.log(`Status: ${info.status}`);
            console.log(`Created: ${new Date(info.createdAt).toLocaleString()}`);
            
            if (info.inputVariables && info.inputVariables.length > 0) {
                console.log('\n📥 Input Variables:');
                info.inputVariables.forEach(input => {
                    console.log(`  • ${input.key} (${input.type}) ${input.required ? '[Required]' : '[Optional]'}`);
                });
            }
            
            if (info.outputVariables && info.outputVariables.length > 0) {
                console.log('\n📤 Output Variables:');
                info.outputVariables.forEach(output => {
                    console.log(`  • ${output.key} (${output.type})`);
                });
            }
            
            return;
        }
        
        // Handle workflow execution
        if (args.length < 2) {
            console.error('❌ Please provide workflow deployment ID and input');
            console.error('Usage: node vellum.js <workflow_deployment_id> <input_json_or_file>');
            process.exit(1);
        }
        
        const workflowId = args[0];
        const inputArg = args[1];
        
        // Determine if input is a file path or JSON string
        let input;
        if (fs.existsSync(inputArg)) {
            console.log(`📁 Loading input from file: ${inputArg}`);
            input = runner.loadInputFromFile(inputArg);
        } else {
            console.log('📝 Parsing input as JSON string');
            input = JSON.parse(inputArg);
        }
        
        // Validate input
        await runner.validateInput(input, workflowId);
        
        // Execute workflow
        const result = await runner.executeWorkflow(workflowId, input);
        
        // Display results
        console.log('\n🎉 Workflow Execution Results:');
        console.log(`Execution ID: ${result.executionId}`);
        console.log(`State: ${result.state}`);
        console.log('\n📤 Outputs:');
        console.log(JSON.stringify(result.outputs, null, 2));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.message.includes('API key')) {
            console.log('\n💡 Make sure to set your VELLUM_API_KEY environment variable:');
            console.log('$env:VELLUM_API_KEY = "your-api-key-here"');
        }
        
        process.exit(1);
    }
}

// Export for use as module
module.exports = {
    VellumWorkflowRunner,
    main
};

// Run CLI if executed directly
if (require.main === module) {
    main().catch(console.error);
}