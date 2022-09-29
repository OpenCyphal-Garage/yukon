import logging
import threading
import typing
from dataclasses import dataclass, field
from pathlib import Path
from queue import Queue
from typing import Optional, Any, Callable, Dict

from pycyphal.application.node_tracker import NodeTracker

import pycyphal
from pycyphal.application import Node
from pycyphal.transport.redundant import RedundantTransport

from yukon.domain.reread_registers_request import RereadRegistersRequest
from yukon.domain.apply_configuration_request import ApplyConfigurationRequest
from yukon.domain.message import Message
from yukon.domain.allocation_request import AllocationRequest
from yukon.domain.HWID import HWID
from yukon.domain.attach_transport_request import AttachTransportRequest
from yukon.domain.UID import UID
from yukon.domain.avatar import Avatar
from yukon.domain.interface import Interface
from yukon.domain.note_state import NodeState
from yukon.domain.update_register_request import UpdateRegisterRequest

logger = logging.getLogger(__name__)


def none_factory() -> None:
    return None


@dataclass
class QueuesState:
    """A class that holds all queues used by the god state."""

    message_queue_counter: int = 0
    messages: Queue[Message] = field(default_factory=Queue)
    attach_transport_response: Queue[str] = field(default_factory=Queue)
    attach_transport: Queue[AttachTransportRequest] = field(default_factory=Queue)
    detach_transport: Queue[int] = field(default_factory=Queue)
    update_registers: Queue[UpdateRegisterRequest] = field(default_factory=Queue)
    apply_configuration: Queue[ApplyConfigurationRequest] = field(default_factory=Queue)
    reread_registers: Queue[RereadRegistersRequest] = field(default_factory=Queue)
    detach_transport_response: Queue[str] = field(default_factory=Queue)


@dataclass
class GuiState:
    """A class that holds all GUI references used by the god state."""

    gui_running: bool = True
    last_poll_received: float = 0.0
    message_severity: str = "DEBUG"


@dataclass
class AllocationState:
    allocation_requests_by_hwid: Dict[HWID, AllocationRequest] = field(default_factory=dict)
    allocated_nodes: Dict[HWID, Node] = field(default_factory=dict)


@dataclass
class CyphalState:
    """A class that holds all cyphal references used by the god state."""

    pseudo_transport: Optional[RedundantTransport] = field(default_factory=none_factory)
    tracer: Optional[pycyphal.transport.Tracer] = field(default_factory=none_factory)
    tracker: Optional[NodeTracker] = field(default_factory=none_factory)
    local_node: Optional[Node] = field(default_factory=none_factory)
    add_transport: Optional[Callable[[Interface], None]] = field(default_factory=none_factory)
    known_node_states: list[NodeState] = field(default_factory=list)
    allocation_subscriber: Optional[pycyphal.presentation.Subscriber] = field(default_factory=none_factory)
    transports_list: typing.List[Interface] = field(default_factory=list)
    inferior_transports_by_interface_hashes: Dict[int, Interface] = field(default_factory=dict)
    already_used_transport_interfaces: Dict[str, int] = field(default_factory=dict)


@dataclass
class AvatarState:
    hide_yakut_avatar: bool = False
    avatars_by_node_id: Dict[int, Avatar] = field(default_factory=dict)
    avatars_by_hw_id: Dict[int, Avatar] = field(default_factory=dict)
    avatars_lock: threading.RLock = field(default_factory=threading.RLock)
    current_graph_lock: threading.RLock = field(default_factory=threading.RLock)
    disappeared_nodes: Dict[int, bool] = field(default_factory=dict)


class GodState:
    def __init__(self) -> None:
        self.queues = QueuesState()
        self.gui = GuiState()
        self.cyphal = CyphalState()
        self.avatar = AvatarState()
        self.allocation = AllocationState()
        self.api = None
