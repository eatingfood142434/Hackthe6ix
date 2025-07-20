from typing import Any

from vellum.workflows.nodes.displayable import FinalOutputNode
from vellum.workflows.state import BaseState

from .patcher import Patcher


class Results(FinalOutputNode[BaseState, Any]):
    class Outputs(FinalOutputNode.Outputs):
        value = Patcher.Outputs.json
