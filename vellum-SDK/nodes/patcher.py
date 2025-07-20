from vellum import (
    ChatMessagePromptBlock,
    PlainTextPromptBlock,
    PromptParameters,
    PromptSettings,
    RichTextPromptBlock,
    VariablePromptBlock,
)
from vellum.workflows.nodes.displayable import InlinePromptNode

from .vuln_scanner import VulnScanner


class Patcher(InlinePromptNode):
    ml_model = "o4-mini"
    blocks = [
        ChatMessagePromptBlock(
            chat_role="SYSTEM",
            blocks=[
                RichTextPromptBlock(
                    blocks=[
                        PlainTextPromptBlock(
                            text="""\
You are a senior security engineer. For each vulnerability identified, generate secure code fixes.\r
\r
FIXING GUIDELINES:\r

SQL Injection: Use parameterized queries/prepared statements\r
NoSQL Injection: Use proper query builders, avoid $where with user input\r
Code Injection: Never use exec/eval with user input, use safe alternatives\r
Command Injection: Use subprocess with shell=False, validate inputs\r
Authentication: Implement proper session management, hash passwords\r
Input Validation: Add sanitization, use allowlists, validate data types
High Level Issues: Proper handling of tokens and roles, etc. 

Requirements:\r
\r
Provide complete, working code replacements\r
Maintain original functionality while fixing security issues\r
Add security comments explaining the fix\r
Follow language-specific security best practices

Vulnerabilities to fix: \
"""
                        ),
                        VariablePromptBlock(input_variable="FileRisk"),
                    ]
                )
            ],
        ),
    ]
    prompt_inputs = {
        "FileRisk": VulnScanner.Outputs.json,
    }
    parameters = PromptParameters(
        stop=[],
        temperature=None,
        max_tokens=32768,
        top_p=None,
        top_k=None,
        frequency_penalty=None,
        presence_penalty=None,
        logit_bias={},
        custom_parameters={
            "json_mode": True,
            "json_schema": {
                "name": "Fixes",
                "schema": {
                    "type": "object",
                    "title": "Security Fix Generator Output",
                    "description": "Output schema for the security fix generation block",
                    "properties": {
                        "fixes": {
                            "type": "array",
                            "description": "List of generated security fixes for detected vulnerabilities",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "file_path": {
                                        "type": "string",
                                        "description": "Path to the file being fixed",
                                    },
                                    "vulnerability_type": {
                                        "type": "string",
                                        "enum": [
                                            "SQL_INJECTION",
                                            "NOSQL_INJECTION",
                                            "CODE_INJECTION",
                                            "COMMAND_INJECTION",
                                            "XSS",
                                            "CSRF",
                                            "AUTHENTICATION_BYPASS",
                                            "AUTHORIZATION_FAILURE",
                                            "INFORMATION_DISCLOSURE",
                                            "HARDCODED_CREDENTIALS",
                                            "INSECURE_DESERIALIZATION",
                                            "PATH_TRAVERSAL",
                                            "WEAK_CRYPTOGRAPHY",
                                            "INSECURE_CONFIGURATION",
                                            "INPUT_VALIDATION_FAILURE",
                                            "SESSION_MANAGEMENT_FLAW",
                                            "PRIVILEGE_ESCALATION",
                                            "BUFFER_OVERFLOW",
                                            "RACE_CONDITION",
                                            "OTHER",
                                        ],
                                        "description": "Type of vulnerability being fixed",
                                    },
                                    "fixed_code": {
                                        "type": "string",
                                        "description": "The entire file containing the fix",
                                    },
                                    "explanation": {
                                        "type": "string",
                                        "description": "Detailed explanation of snippet that was changed and why",
                                    },
                                    "security_notes": {
                                        "type": "string",
                                        "description": "Additional security considerations and best practices",
                                    },
                                    "fix_confidence": {
                                        "type": "string",
                                        "enum": [
                                            "HIGH",
                                            "MEDIUM",
                                            "LOW",
                                        ],
                                        "description": "Confidence level in the proposed fix",
                                    },
                                    "breaking_changes": {
                                        "type": "boolean",
                                        "description": "Whether this fix introduces breaking changes",
                                    },
                                    "additional_imports": {
                                        "type": "array",
                                        "description": "New import statements or dependencies required",
                                        "items": {
                                            "type": "string",
                                        },
                                    },
                                    "alternative_solutions": {
                                        "type": "array",
                                        "description": "Alternative approaches to fix the vulnerability",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "approach": {
                                                    "type": "string",
                                                    "description": "Description of alternative approach",
                                                },
                                                "pros": {
                                                    "type": "array",
                                                    "description": "Advantages of this approach",
                                                    "items": {
                                                        "type": "string",
                                                    },
                                                },
                                                "cons": {
                                                    "type": "array",
                                                    "description": "Disadvantages of this approach",
                                                    "items": {
                                                        "type": "string",
                                                    },
                                                },
                                            },
                                            "required": [
                                                "approach",
                                                "pros",
                                                "cons",
                                            ],
                                        },
                                    },
                                    "configuration_changes": {
                                        "type": "array",
                                        "description": "Required configuration or environment changes",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "file": {
                                                    "type": "string",
                                                    "description": "Configuration file to modify",
                                                },
                                                "change": {
                                                    "type": "string",
                                                    "description": "Description of required change",
                                                },
                                                "example": {
                                                    "type": "string",
                                                    "description": "Example configuration snippet",
                                                },
                                            },
                                            "required": [
                                                "file",
                                                "change",
                                            ],
                                        },
                                    },
                                    "testing_recommendations": {
                                        "type": "array",
                                        "description": "Recommended tests to verify the fix",
                                        "items": {
                                            "type": "string",
                                        },
                                    },
                                },
                                "required": [
                                    "file_path",
                                    "vulnerability_type",
                                    "fixed_code",
                                    "explanation",
                                    "security_notes",
                                    "fix_confidence",
                                ],
                            },
                        },
                        "fix_summary": {
                            "type": "object",
                            "description": "Summary of all generated fixes",
                            "properties": {
                                "total_fixes": {
                                    "type": "integer",
                                    "minimum": 0,
                                    "description": "Total number of fixes generated",
                                },
                                "files_modified": {
                                    "type": "integer",
                                    "minimum": 0,
                                    "description": "Number of files that will be modified",
                                },
                                "priority_order": {
                                    "type": "array",
                                    "description": "Recommended order to implement fixes (by file path)",
                                    "items": {
                                        "type": "string",
                                    },
                                },
                                "estimated_fix_time": {
                                    "type": "string",
                                    "description": "Estimated time to implement all fixes",
                                },
                                "high_confidence_fixes": {
                                    "type": "integer",
                                    "minimum": 0,
                                    "description": "Number of high confidence fixes",
                                },
                                "medium_confidence_fixes": {
                                    "type": "integer",
                                    "minimum": 0,
                                    "description": "Number of medium confidence fixes",
                                },
                                "low_confidence_fixes": {
                                    "type": "integer",
                                    "minimum": 0,
                                    "description": "Number of low confidence fixes",
                                },
                                "breaking_changes_count": {
                                    "type": "integer",
                                    "minimum": 0,
                                    "description": "Number of fixes that introduce breaking changes",
                                },
                            },
                            "required": [
                                "total_fixes",
                                "files_modified",
                                "high_confidence_fixes",
                                "medium_confidence_fixes",
                                "low_confidence_fixes",
                                "breaking_changes_count",
                            ],
                        },
                        "implementation_guide": {
                            "type": "object",
                            "description": "Guide for implementing the security fixes",
                            "properties": {
                                "prerequisites": {
                                    "type": "array",
                                    "description": "Prerequisites before implementing fixes",
                                    "items": {
                                        "type": "string",
                                    },
                                },
                                "rollback_plan": {
                                    "type": "string",
                                    "description": "Instructions for rolling back changes if needed",
                                },
                                "deployment_steps": {
                                    "type": "array",
                                    "description": "Step-by-step deployment instructions",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "step": {
                                                "type": "integer",
                                                "description": "Step number",
                                            },
                                            "action": {
                                                "type": "string",
                                                "description": "Action to perform",
                                            },
                                            "command": {
                                                "type": "string",
                                                "description": "Command to run (if applicable)",
                                            },
                                            "verification": {
                                                "type": "string",
                                                "description": "How to verify this step completed successfully",
                                            },
                                        },
                                        "required": [
                                            "step",
                                            "action",
                                        ],
                                    },
                                },
                                "monitoring_recommendations": {
                                    "type": "array",
                                    "description": "What to monitor after implementing fixes",
                                    "items": {
                                        "type": "string",
                                    },
                                },
                            },
                        },
                    },
                    "required": [
                        "fixes",
                        "fix_summary",
                    ],
                },
            },
            "reasoning_effort": "medium",
        },
    )
    settings = PromptSettings(stream_enabled=True)
