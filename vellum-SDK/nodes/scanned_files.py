from typing import Any

from vellum.workflows.nodes.displayable import FinalOutputNode
from vellum.workflows.state import BaseState

from .vuln_scanner import VulnScanner


class ScannedFiles(FinalOutputNode[BaseState, Any]):
    class Outputs(FinalOutputNode.Outputs):
        value = VulnScanner.Outputs.json
