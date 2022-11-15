import logging
import threading

from yukon.services.CentralizedAllocator import CentralizedAllocator
from yukon.services.FileServer import FileServer
from yukon.services.flash_dronecan_firmware_with_cyphal_firmware import run_dronecan_firmware_updater

logger = logging.getLogger(__name__)


def set_dronecan_handlers(state: "yukon.domain.god_state.GodState"):
    is_dronecan_firmware_path_available = (
        state.settings["DroneCAN firmware substitution"]["Substitute firmware path"]["value"] != ""
    )
    s1 = state.settings.get("DroneCAN firmware substitution")
    if s1:
        s2 = s1.get("Enabled")

        def _handle_setting_change(should_be_running: bool) -> None:
            logger.info("DroneCAN firmware substitution is now " + ("enabled" if should_be_running else "disabled"))
            if state.dronecan.is_running:
                if not should_be_running:
                    state.dronecan.is_running = False
                    state.dronecan.thread.join()
                    state.dronecan.file_server = None
                    state.dronecan.thread = None
                    state.dronecan.node_monitor = None
                    state.dronecan.driver = None
                    state.dronecan.allocator = None
            elif not state.dronecan.is_running:
                if should_be_running:
                    state.dronecan.thread = threading.Thread(target=run_dronecan_firmware_updater, args=(state,))

        s2.connect(_handle_setting_change)


def set_file_server_handler(state: "yukon.domain.god_state.GodState") -> None:
    def _handle_path_change(new_value: str) -> None:
        logger.info("File server path changed to " + new_value)
        state.file_server_path = new_value

    def _handle_enabled_change(should_be_enabled: bool):
        is_already_running = state.cyphal.file_server is not None
        if is_already_running:
            if not should_be_enabled:
                state.cyphal.file_server.close()
                state.cyphal.file_server = None
        else:
            if should_be_enabled:
                state.cyphal.file_server = FileServer(
                    state.cyphal.local_node, [state.settings["Firmware updates"]["File path"]["value"]]
                )
                logger.info("File server started on path " + state.settings["Firmware updates"]["File path"]["value"])
                state.cyphal.file_server.start()

    state.settings["File server"]["Path"].connect(_handle_path_change)
    state.settings["Firmware updates"]["Enabled"].connect(_handle_enabled_change)


def set_allocator_handler(state: "yukon.domain.god_state.GodState") -> None:
    def _handle_mode_change(new_mode: str):
        if new_mode == "Automatic" and not state.cyphal.centralized_allocator.running and state.cyphal.local_node.id:
            logger.info("Allocator is now running")
            state.cyphal.centralized_allocator = CentralizedAllocator(state.cyphal.local_node)
        elif new_mode == "Manual" and state.cyphal.centralized_allocator.running:
            logger.info("Allocator is now stopped")
            state.cyphal.centralized_allocator.close()
            state.cyphal.centralized_allocator = None

    state.settings["Node allocation"]["chosen_value"].connect(_handle_mode_change)


def set_handlers_for_configuration_changes(state: "yukon.domain.god_state.GodState") -> None:
    set_dronecan_handlers(state)
    set_file_server_handler(state)
