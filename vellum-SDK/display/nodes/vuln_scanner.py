from uuid import UUID

from vellum_ee.workflows.display.editor import NodeDisplayData, NodeDisplayPosition
from vellum_ee.workflows.display.nodes import BaseInlinePromptNodeDisplay
from vellum_ee.workflows.display.nodes.types import NodeOutputDisplay, PortDisplayOverrides

from ...nodes.vuln_scanner import VulnScanner


class VulnScannerDisplay(BaseInlinePromptNodeDisplay[VulnScanner]):
    label = "Vuln Scanner"
    node_id = UUID("aefd58e7-6713-480f-8486-67f87a3da4e4")
    output_id = UUID("e9ef100f-fa6b-44d7-a241-a203189e0cbd")
    array_output_id = UUID("66decc68-5dcb-4b61-8a70-1b89e0a4d49a")
    target_handle_id = UUID("05a2ba1b-abb7-44c8-96e7-60ce35d6a390")
    node_input_ids_by_name = {"prompt_inputs.fileList": UUID("85056102-0920-46bd-a3fd-e84e31964010")}
    attribute_ids_by_name = {"ml_model": UUID("b19efebb-973a-495e-b1a3-ebba5982edf8")}
    output_display = {
        VulnScanner.Outputs.text: NodeOutputDisplay(id=UUID("e9ef100f-fa6b-44d7-a241-a203189e0cbd"), name="text"),
        VulnScanner.Outputs.results: NodeOutputDisplay(id=UUID("66decc68-5dcb-4b61-8a70-1b89e0a4d49a"), name="results"),
        VulnScanner.Outputs.json: NodeOutputDisplay(id=UUID("f0a718ec-6c20-4c50-bd5c-19d73ec6757a"), name="json"),
    }
    port_displays = {VulnScanner.Ports.default: PortDisplayOverrides(id=UUID("c23764d7-9466-44a0-8201-a1e4269b5339"))}
    display_data = NodeDisplayData(
        position=NodeDisplayPosition(x=2302.4195126987356, y=394.11531880245286), width=554, height=539
    )
