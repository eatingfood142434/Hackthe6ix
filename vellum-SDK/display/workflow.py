from uuid import UUID

from vellum_ee.workflows.display.base import (
    EdgeDisplay,
    EntrypointDisplay,
    WorkflowDisplayData,
    WorkflowDisplayDataViewport,
    WorkflowInputsDisplay,
    WorkflowMetaDisplay,
    WorkflowOutputDisplay,
)
from vellum_ee.workflows.display.editor import NodeDisplayData, NodeDisplayPosition
from vellum_ee.workflows.display.workflows import BaseWorkflowDisplay

from ..inputs import Inputs
from ..nodes.file_list import FileList
from ..nodes.patcher import Patcher
from ..nodes.results import Results
from ..nodes.scanned_files import ScannedFiles
from ..nodes.vuln_scanner import VulnScanner
from ..workflow import Workflow


class WorkflowDisplay(BaseWorkflowDisplay[Workflow]):
    workflow_display = WorkflowMetaDisplay(
        entrypoint_node_id=UUID("ee97bed4-2bdf-4d21-aff8-643878e1ec79"),
        entrypoint_node_source_handle_id=UUID("403d42b2-6d86-4f4c-ab6c-a0b56150394d"),
        entrypoint_node_display=NodeDisplayData(position=NodeDisplayPosition(x=1560, y=330), width=124, height=48),
        display_data=WorkflowDisplayData(
            viewport=WorkflowDisplayDataViewport(x=-614.203782722883, y=30.678680396614283, zoom=0.42929729661723276)
        ),
    )
    inputs_display = {
        Inputs.fileTree: WorkflowInputsDisplay(
            id=UUID("7bec3bd4-c59d-43f1-acbe-5369d986913f"), name="fileTree", color="navy"
        )
    }
    entrypoint_displays = {
        FileList: EntrypointDisplay(
            id=UUID("ee97bed4-2bdf-4d21-aff8-643878e1ec79"),
            edge_display=EdgeDisplay(id=UUID("26f28651-139c-48c7-89d3-fb80322e8152")),
        )
    }
    edge_displays = {
        (FileList.Ports.default, VulnScanner): EdgeDisplay(id=UUID("28584e95-9acd-481a-8179-b10042079f99")),
        (VulnScanner.Ports.default, Patcher): EdgeDisplay(id=UUID("3d10ed54-84a4-4be8-afef-cdc698b1fde6")),
        (VulnScanner.Ports.default, ScannedFiles): EdgeDisplay(id=UUID("f2a6ef44-142f-4973-abf9-1e3c45e2f06b")),
        (Patcher.Ports.default, Results): EdgeDisplay(id=UUID("4ce4c8e3-b914-4946-af5b-523ce3f1dbe4")),
    }
    output_displays = {
        Workflow.Outputs.scanned_files: WorkflowOutputDisplay(
            id=UUID("b688c094-5fc8-4c07-9877-ec29fbb57585"), name="scanned-files"
        ),
        Workflow.Outputs.results: WorkflowOutputDisplay(
            id=UUID("e1d9a969-4041-46e6-8cb2-11f0726f2a14"), name="results"
        ),
    }
