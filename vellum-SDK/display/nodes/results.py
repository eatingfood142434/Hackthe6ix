from uuid import UUID

from vellum_ee.workflows.display.editor import NodeDisplayData, NodeDisplayPosition
from vellum_ee.workflows.display.nodes import BaseFinalOutputNodeDisplay
from vellum_ee.workflows.display.nodes.types import NodeOutputDisplay

from ...nodes.results import Results


class ResultsDisplay(BaseFinalOutputNodeDisplay[Results]):
    label = "Results"
    node_id = UUID("654e00c1-6510-4861-a69c-de45be7c4db1")
    target_handle_id = UUID("924e3ede-f370-4396-802d-ea547b2077a2")
    output_name = "results"
    output_display = {
        Results.Outputs.value: NodeOutputDisplay(id=UUID("e1d9a969-4041-46e6-8cb2-11f0726f2a14"), name="value")
    }
    display_data = NodeDisplayData(
        position=NodeDisplayPosition(x=3623.620754536665, y=286.54588641797375), width=522, height=457
    )
