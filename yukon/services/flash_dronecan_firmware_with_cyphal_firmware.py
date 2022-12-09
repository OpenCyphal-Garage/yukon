# pip install dronecan

import os
import queue
import sys
import time
from pathlib import Path
import logging

import typing
import dronecan.app.node_monitor
from dronecan.driver.common import AbstractDriver, CANFrame
from dronecan.node import Node

from yukon.domain.god_state import GodState

from dronecan import make_node, UAVCANException, make_driver
from dronecan.app.dynamic_node_id import CentralizedServer
from dronecan.app.file_server import FileServer
from dronecan.app.node_monitor import NodeMonitor
from dronecan import uavcan

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class GoodDriver(AbstractDriver):
    def __init__(self, state: GodState):
        self.state = state

    def send(
        self,
        message_id: int,
        message: bytearray,
        extended: bool,
        ts_monotonic: typing.Optional[float] = None,
        ts_real: typing.Optional[float] = None,
        canfd: bool = False,
    ) -> None:
        frame = CANFrame(message_id, message, extended, canfd=canfd)
        logger.debug("Sending CAN frame: %r", frame)
        self.state.dronecan_traffic_queues.output_queue.put_nowait(frame)

    def receive(self, timeout: typing.Optional[float] = 0.0) -> typing.Optional[CANFrame]:
        deadline: typing.Optional[float] = None
        if timeout == 0 or timeout is None:
            deadline = 0
        else:
            deadline = time.monotonic() + timeout
        while not self.state.dronecan_traffic_queues.input_queue.empty():
            try:
                if deadline is None:
                    get_timeout = None
                elif deadline == 0:
                    # TODO this is a workaround. Zero timeout causes the IPC queue to ALWAYS throw queue.Empty!
                    get_timeout = 1e-3
                else:
                    # TODO this is a workaround. Zero timeout causes the IPC queue to ALWAYS throw queue.Empty!
                    get_timeout = max(1e-3, deadline - time.monotonic())
                received_frame = self.state.dronecan_traffic_queues.input_queue.get(timeout=get_timeout)
                logger.debug("Received CAN frame: %r", received_frame)
                return received_frame
            except queue.Empty:
                return None
        return None


def run_dronecan_firmware_updater(state: GodState, file_name: str) -> None:
    logger.debug("Starting DroneCAN firmware updater")
    state.dronecan.allocator = None
    state.dronecan.node_monitor = None
    try:
        state.dronecan.driver = GoodDriver(state)
        state.dronecan.node = Node(state.dronecan.driver, node_id=123)
        logger.debug("Node %r created", state.dronecan.node)
        # Add the current directory to the paths list
        state.dronecan.file_server = FileServer(state.dronecan.node, ["/"])  # This is secure!
        state.dronecan.node_monitor = NodeMonitor(state.dronecan.node)
        # It is NOT necessary to specify the database storage.
        # If it is not specified, the allocation table will be kept in memory, thus it will not be persistent.
        state.dronecan.allocator = CentralizedServer(
            state.dronecan.node, state.dronecan.node_monitor, database_storage=Path(os.getcwd()) / "allocation.db"
        )

        def node_update(event: "dronecan.app.node_monitor.NodeMonitor.UpdateEvent") -> None:
            if event.event_id == event.EVENT_ID_NEW:
                req = uavcan.protocol.file.BeginFirmwareUpdate.Request()
                req.image_file_remote_path.path = state.settings["DroneCAN firmware substitution"][
                    "Substitute firmware path"
                ]
                logging.debug("Sending %r to %r", req, event.entry.node_id)
                state.dronecan.node.request(req, event.entry.node_id, lambda e: None)

        state.dronecan.node_monitor.add_update_handler(node_update)
        state.dronecan.is_running = True
        # The allocator and the node monitor will be running in the background, requiring no additional attention
        # When they are no longer needed, they should be finalized by calling close():
        while True:
            try:
                state.dronecan.node.spin()  # Spin forever or until an exception is thrown
            except UAVCANException as ex:
                if "Toggle bit value" not in str(ex):
                    print("Node error:", ex)
    except Exception as ex:
        logger.debug("DroneCAN firmware updater failed: %r", ex)
        if state.dronecan.allocator:
            state.dronecan.allocator.close()
        if state.dronecan.node_monitor:
            state.dronecan.node_monitor.close()


# if __name__ == "__main__":
#     multiprocessing.freeze_support()
#     print("sys.argv", sys.argv)
#     main(*sys.argv)
