from uuid import UUID

from vellum_ee.workflows.display.editor import NodeDisplayData, NodeDisplayPosition
from vellum_ee.workflows.display.nodes import BaseTemplatingNodeDisplay
from vellum_ee.workflows.display.nodes.types import NodeOutputDisplay, PortDisplayOverrides

from ...nodes.file_list import FileList


class FileListDisplay(BaseTemplatingNodeDisplay[FileList]):
    label = "FileList"
    node_id = UUID("abb1264e-59e4-45d7-a413-d27ed2b653d8")
    target_handle_id = UUID("2c9112d7-332e-4df6-baef-a081e6712a9d")
    node_input_ids_by_name = {
        "inputs.fileTree": UUID("f0a25ad1-d313-4d6b-9cb7-f42703f99861"),
        "template": UUID("6c15f54d-109c-473c-80d3-b1c74f1b4dd9"),
    }
    output_display = {
        FileList.Outputs.result: NodeOutputDisplay(id=UUID("cd597e30-1fa0-4752-b7f0-f19af021a0fc"), name="result")
    }
    port_displays = {FileList.Ports.default: PortDisplayOverrides(id=UUID("343a014a-d845-4c77-9277-0f7d1f8256c3"))}
    display_data = NodeDisplayData(
        position=NodeDisplayPosition(x=1741.343748459347, y=313.4047655080733), width=554, height=594
    )
