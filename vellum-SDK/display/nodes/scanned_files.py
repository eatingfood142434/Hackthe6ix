from uuid import UUID

from vellum_ee.workflows.display.editor import NodeDisplayData, NodeDisplayPosition
from vellum_ee.workflows.display.nodes import BaseFinalOutputNodeDisplay
from vellum_ee.workflows.display.nodes.types import NodeOutputDisplay

from ...nodes.scanned_files import ScannedFiles


class ScannedFilesDisplay(BaseFinalOutputNodeDisplay[ScannedFiles]):
    label = "Scanned Files"
    node_id = UUID("4dc4ac32-75e5-4a95-a53d-e2d8de9930f1")
    target_handle_id = UUID("109402c4-6d69-40d2-a8c3-5ce2d988d092")
    output_name = "scanned-files"
    output_display = {
        ScannedFiles.Outputs.value: NodeOutputDisplay(id=UUID("b688c094-5fc8-4c07-9877-ec29fbb57585"), name="value")
    }
    display_data = NodeDisplayData(
        position=NodeDisplayPosition(x=2949.483381126267, y=681.1404696510956), width=522, height=497
    )
