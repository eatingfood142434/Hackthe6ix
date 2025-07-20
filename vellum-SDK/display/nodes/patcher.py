from uuid import UUID

from vellum_ee.workflows.display.editor import NodeDisplayData, NodeDisplayPosition
from vellum_ee.workflows.display.nodes import BaseInlinePromptNodeDisplay
from vellum_ee.workflows.display.nodes.types import NodeOutputDisplay, PortDisplayOverrides

from ...nodes.patcher import Patcher


class PatcherDisplay(BaseInlinePromptNodeDisplay[Patcher]):
    label = "Patcher"
    node_id = UUID("2bbd4367-e76d-47d0-a4b9-14fe2f1ad256")
    output_id = UUID("7e8aa568-4962-474f-a706-ea0c030e83ef")
    array_output_id = UUID("92646e5a-bf11-43e0-86db-d3ba484a291e")
    target_handle_id = UUID("1307addc-4b81-4ffa-a188-dabecebb5521")
    node_input_ids_by_name = {"prompt_inputs.FileRisk": UUID("e24ceafe-618d-4133-b946-ec2bf76aeb97")}
    attribute_ids_by_name = {"ml_model": UUID("c3f5ffde-75e1-46e3-8e46-c520efaf7833")}
    output_display = {
        Patcher.Outputs.text: NodeOutputDisplay(id=UUID("7e8aa568-4962-474f-a706-ea0c030e83ef"), name="text"),
        Patcher.Outputs.results: NodeOutputDisplay(id=UUID("92646e5a-bf11-43e0-86db-d3ba484a291e"), name="results"),
        Patcher.Outputs.json: NodeOutputDisplay(id=UUID("ef4b4637-086b-4901-b40a-ab72749064fc"), name="json"),
    }
    port_displays = {Patcher.Ports.default: PortDisplayOverrides(id=UUID("a6d36303-c1c9-4454-b67f-f9767a8334d7"))}
    display_data = NodeDisplayData(
        position=NodeDisplayPosition(x=2948.5335407611165, y=192.43908708361312), width=554, height=500
    )
