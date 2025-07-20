from vellum import (
    ChatMessagePromptBlock,
    PlainTextPromptBlock,
    PromptParameters,
    PromptSettings,
    RichTextPromptBlock,
    VariablePromptBlock,
)
from vellum.workflows.nodes.displayable import InlinePromptNode

from .file_list import FileList


class VulnScanner(InlinePromptNode):
    ml_model = "o4-mini"
    blocks = [
        ChatMessagePromptBlock(
            chat_role="USER",
            blocks=[
                RichTextPromptBlock(
                    blocks=[
                        PlainTextPromptBlock(
                            text="""\
You are a security-focused file analyzer. Given a list of files from a repository, classify each file by: 
 
1. **Security Risk Level**: HIGH, MEDIUM, LOW, IGNORE 
2. **File Type**: WEB_APP, API, CONFIG, DATABASE, FRONTEND, OTHER 
3. **Language**: Python, JavaScript, PHP, SQL, etc. 
 
Focus on files that typically contain vulnerabilities: 
- Web application files (.py, .js, .php) 
- Configuration files (.env, .yml, .json) 
- Database files (.sql, .db) 
- Template files (.html with server-side code) 

Understand what each piece of code does on the entire codebase and find any higher-level vulnerabilities as well. These vulnerabilities may occur from interactions from multiple files:
- Incorrect authorization handling
- Improper role checking
 
IGNORE: Images, static assets, documentation, compiled binaries 
 
Input: 
\
"""
                        ),
                        VariablePromptBlock(input_variable="fileList"),
                    ]
                )
            ],
        ),
    ]
    prompt_inputs = {
        "fileList": FileList.Outputs.result,
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
                "name": "Scanner",
                "schema": {
                    "type": "object",
                    "title": "File Classification Output",
                    "description": "Output schema for the file classification and filtering block",
                    "properties": {
                        "high_risk_files": {
                            "type": "array",
                            "description": "Files with high security risk that require immediate analysis",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {
                                        "type": "string",
                                        "description": "File name",
                                    },
                                    "path": {
                                        "type": "string",
                                        "description": "Full file path",
                                    },
                                    "parent_folder": {
                                        "type": "string",
                                        "description": "Parent directory",
                                    },
                                    "file_type": {
                                        "type": "string",
                                        "enum": [
                                            "WEB_APP",
                                            "API",
                                            "CONFIG",
                                            "DATABASE",
                                            "FRONTEND",
                                            "OTHER",
                                        ],
                                        "description": "Categorized file type",
                                    },
                                    "language": {
                                        "type": "string",
                                        "description": "Programming language detected",
                                    },
                                    "risk_reason": {
                                        "type": "string",
                                        "description": "Why this file is classified as high risk",
                                    },
                                },
                                "required": [
                                    "name",
                                    "path",
                                    "parent_folder",
                                    "file_type",
                                    "language",
                                    "risk_reason",
                                ],
                            },
                        },
                        "medium_risk_files": {
                            "type": "array",
                            "description": "Files with medium security risk",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {
                                        "type": "string",
                                        "description": "File name",
                                    },
                                    "path": {
                                        "type": "string",
                                        "description": "Full file path",
                                    },
                                    "parent_folder": {
                                        "type": "string",
                                        "description": "Parent directory",
                                    },
                                    "file_type": {
                                        "type": "string",
                                        "enum": [
                                            "WEB_APP",
                                            "API",
                                            "CONFIG",
                                            "DATABASE",
                                            "FRONTEND",
                                            "OTHER",
                                        ],
                                        "description": "Categorized file type",
                                    },
                                    "language": {
                                        "type": "string",
                                        "description": "Programming language detected",
                                    },
                                    "risk_reason": {
                                        "type": "string",
                                        "description": "Why this file is classified as medium risk",
                                    },
                                },
                                "required": [
                                    "name",
                                    "path",
                                    "parent_folder",
                                    "file_type",
                                    "language",
                                    "risk_reason",
                                ],
                            },
                        },
                        "low_risk_files": {
                            "type": "array",
                            "description": "Files with low security risk",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {
                                        "type": "string",
                                        "description": "File name",
                                    },
                                    "path": {
                                        "type": "string",
                                        "description": "Full file path",
                                    },
                                    "parent_folder": {
                                        "type": "string",
                                        "description": "Parent directory",
                                    },
                                    "file_type": {
                                        "type": "string",
                                        "enum": [
                                            "WEB_APP",
                                            "API",
                                            "CONFIG",
                                            "DATABASE",
                                            "FRONTEND",
                                            "OTHER",
                                        ],
                                        "description": "Categorized file type",
                                    },
                                    "language": {
                                        "type": "string",
                                        "description": "Programming language detected",
                                    },
                                    "risk_reason": {
                                        "type": "string",
                                        "description": "Why this file is classified as low risk",
                                    },
                                },
                                "required": [
                                    "name",
                                    "path",
                                    "parent_folder",
                                    "file_type",
                                    "language",
                                    "risk_reason",
                                ],
                            },
                        },
                        "ignored_files": {
                            "type": "array",
                            "description": "Files that were ignored (images, binaries, etc.)",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {
                                        "type": "string",
                                        "description": "File name",
                                    },
                                    "path": {
                                        "type": "string",
                                        "description": "Full file path",
                                    },
                                    "ignore_reason": {
                                        "type": "string",
                                        "description": "Why this file was ignored",
                                    },
                                },
                                "required": [
                                    "name",
                                    "path",
                                    "ignore_reason",
                                ],
                            },
                        },
                        "classification_summary": {
                            "type": "object",
                            "description": "Summary of file classification results",
                            "properties": {
                                "total_files": {
                                    "type": "integer",
                                    "description": "Total number of files processed",
                                },
                                "high_risk_count": {
                                    "type": "integer",
                                    "description": "Number of high risk files",
                                },
                                "medium_risk_count": {
                                    "type": "integer",
                                    "description": "Number of medium risk files",
                                },
                                "low_risk_count": {
                                    "type": "integer",
                                    "description": "Number of low risk files",
                                },
                                "ignored_count": {
                                    "type": "integer",
                                    "description": "Number of ignored files",
                                },
                            },
                            "required": [
                                "total_files",
                                "high_risk_count",
                                "medium_risk_count",
                                "low_risk_count",
                                "ignored_count",
                            ],
                        },
                    },
                    "required": [
                        "high_risk_files",
                        "medium_risk_files",
                        "low_risk_files",
                        "ignored_files",
                        "classification_summary",
                    ],
                },
            },
            "reasoning_effort": "low",
        },
    )
    settings = PromptSettings(stream_enabled=True)
