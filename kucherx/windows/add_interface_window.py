import asyncio
import time

from pycyphal.transport.can.media import Media
from pycyphal.transport.can.media.pythoncan import PythonCANMedia
from serial.tools import list_ports

from domain.interface import Interface
from domain.kucherx_state import KucherXState
from domain.window_style_state import WindowStyleState

from pycyphal.transport.can import CANTransport

import re


def update_list_of_comports(dpg, combobox):
    ports = list_ports.comports()
    dpg.configure_item(combobox, items=ports)


def make_add_interface_window(dpg, state: KucherXState, logger, wss: WindowStyleState, interface_added_callback):
    with dpg.window(label="Configure interface", width=560, height=540, no_close=False) as new_interface_window_id:
        interface: Interface = Interface()
        input_field_width = 490
        dpg.add_text("Maximum transmission unit (MTU)")
        tfMTU = None
        time_modified = time.time()

        def new_text_entered():
            nonlocal time_modified, tfMTU, dpg
            if time.time() - time_modified > 0.06:
                current_value = dpg.get_value(tfMTU)
                new_value = re.sub("\\D", "", current_value)
                print("New value " + new_value)
                time_modified = time.time()
                dpg.set_value(tfMTU, new_value)

        tfMTU = dpg.add_input_text(default_value="8", width=input_field_width, callback=new_text_entered)

        def combobox_callback(sender, app_data):
            # state.settings.UAVCAN__CAN__IFACE = "slcan:" + str(app_data).split()[0]
            dpg.configure_item(new_interface_window_id, label=app_data)
            interface.iface = "slcan:" + str(app_data).split()[0]

        combobox = None
        combobox_action_group = None
        interface_combobox_text = None
        tb_candump_path = None
        slcan_group = None
        candump_group = None
        checked = False
        combobox_options = ["slcan", "candump"]
        groups = None

        dpg.add_text("The kind of connection")

        def connection_method_selected(sender, item_selected: str):
            nonlocal groups
            for group in groups:
                dpg.hide_item(group)
            if item_selected == "slcan":
                dpg.show_item(slcan_group)
            elif item_selected == "candump":
                dpg.show_item(candump_group)

        def toggle_tb():
            nonlocal checked
            if checked:
                checked = False
                dpg.hide_item(tb_candump_path)
                dpg.show_item(interface_combobox_text)
                dpg.show_item(combobox)
                dpg.show_item(combobox_action_group)
            else:
                checked = True
                dpg.show_item(tb_candump_path)
                dpg.hide_item(interface_combobox_text)
                dpg.hide_item(combobox)
                dpg.hide_item(combobox_action_group)

        combobox_connection_method = dpg.add_combo(
            default_value="Select connection method", width=input_field_width, callback=connection_method_selected,
            items=combobox_options
        )

        def clear_combobox():
            dpg.configure_item(combobox, items=[])
            dpg.configure_item(combobox, default_value="")

        def update_combobox():
            update_list_of_comports(dpg, combobox)

        with dpg.group(horizontal=False) as slcan_group:
            interface_combobox_text = dpg.add_text("Interface")
            combobox = dpg.add_combo(
                default_value="Select an interface", width=input_field_width, callback=combobox_callback
            )
            with dpg.group(horizontal=True) as combobox_action_group:
                dpg.add_button(label="Refresh", callback=update_combobox)
                dpg.add_button(label="Clear", callback=clear_combobox)
        with dpg.group(horizontal=False) as candump_group:
            interface_combobox_text = dpg.add_text("Candump path")
            combobox = None
            tb_candump_path = dpg.add_input_text(default_value="candump:path", width=input_field_width)
            with dpg.group(horizontal=False) as combobox_action_group:
                dpg.add_button(label="Look for .candump files around KucherX", callback=lambda: dpg.show_item(combobox))
                dpg.add_button(label="Just type paste in the path of a candump", callback=lambda: dpg.hide_item(combobox))
            combobox = dpg.add_combo(
                default_value="Candump files found", width=input_field_width, callback=combobox_callback
            )
            dpg.hide_item(combobox)

        groups = [slcan_group, candump_group]
        connection_method_selected(None, "slcan")

        dpg.add_text("Arbitration bitrate")
        tfArbRate = dpg.add_input_text(default_value="1000000", width=input_field_width)
        dpg.add_text("Data bitrate")
        tfDatarate = dpg.add_input_text(default_value="1000000", width=input_field_width)

        def finalize():
            interface.mtu = int(dpg.get_value(tfMTU))
            interface.rate_arb = int(dpg.get_value(tfArbRate))
            interface.rate_data = int(dpg.get_value(tfDatarate))
            interface_added_callback(interface)

        dpg.add_button(label="Add interface", callback=finalize)

        update_combobox()
