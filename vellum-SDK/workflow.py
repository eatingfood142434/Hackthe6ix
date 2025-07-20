from vellum.workflows import BaseWorkflow
from vellum.workflows.state import BaseState

from .inputs import Inputs
from .nodes.file_list import FileList
from .nodes.patcher import Patcher
from .nodes.results import Results
from .nodes.scanned_files import ScannedFiles
from .nodes.vuln_scanner import VulnScanner


class Workflow(BaseWorkflow[Inputs, BaseState]):
    graph = (
        FileList
        >> VulnScanner
        >> {
            Patcher >> Results,
            ScannedFiles,
        }
    )

    class Outputs(BaseWorkflow.Outputs):
        scanned_files = ScannedFiles.Outputs.value
        results = Results.Outputs.value
