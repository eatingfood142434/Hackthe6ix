from vellum.workflows.nodes.displayable import TemplatingNode
from vellum.workflows.state import BaseState
from vellum.workflows.types.core import Json

from ..inputs import Inputs


class FileList(TemplatingNode[BaseState, Json]):
    template = """\
{% if fileTree.data and fileTree.data.files %}
[
{% for file in fileTree.data.files %}
  {% set path_parts = file.path.split(\'/\') %}
  {% set parent_folder = \'\' %}
  {% if path_parts|length > 1 %}
    {% set parent_folder = path_parts[:-1]|join(\'/\') %}
  {% else %}
    {% set parent_folder = \'Root\' %}
  {% endif %}
  {
      \"name\": {{ file.name | tojson }},
      \"path\": {{ file.path | tojson }},
      \"parent_folder\": {{ parent_folder | tojson }},
      \"content\": {{ file.content | tojson }}
  }{% if not loop.last %},{% endif %}
{% endfor %}
]
{% else %}
[]
{% endif %}\
"""
    inputs = {
        "fileTree": Inputs.fileTree,
    }
