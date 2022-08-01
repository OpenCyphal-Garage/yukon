import logging
import platform
import typing
from pathlib import Path

from kucherx.domain.UID import UID


def make_process_dpi_aware(logger: logging.Logger) -> None:
    if platform.system() == "Windows":
        import ctypes

        try:
            result = ctypes.windll.shcore.SetProcessDpiAwareness(2)  # type: ignore
        except Exception:
            logger.info("Running on a windows version 8.0 or less")
            result = ctypes.windll.user32.SetProcessDPIAware()  # type: ignore
        # https://docs.microsoft.com/en-us/windows/win32/api/shellscalingapi/nf-shellscalingapi-setprocessdpiawareness
        match result:
            case None:
                logger.warning("DPI awareness did not have a return value")
            case 0:
                logger.warning("DPI awareness set successfully")
            case 1:
                logger.warning("The value passed in for DPI awareness is not valid.")
            case 2:
                logger.warning(
                    "E_ACCESSDENIED. The DPI awareness is already set, either by calling this API previously"
                    " or through the application (.exe) manifest. "
                )


def is_high_dpi_screen(logger: logging.Logger) -> bool:
    make_process_dpi_aware(logger)
    try:
        import tkinter

        root = tkinter.Tk()
        dpi = root.winfo_fpixels("1i")
        logger.warning("DPI is " + str(dpi) + " on screen " + root.winfo_screen())
        root.destroy()
        return dpi > 100
    except ImportError:
        logger.warn("Unable to import TKinter, it is missing from Python. Can't tell if the screen is high dpi.")
        return False


def configure_font_and_scale(dpg: typing.Any, logger: logging.Logger, resources: Path) -> UID:
    desired_font_size = 20
    default_font = None
    if is_high_dpi_screen(logger) and platform.system() == "Windows":
        dpg.set_global_font_scale(0.8)
        desired_font_size = 40

    # add a font registry
    with dpg.font_registry():
        # first argument ids the path to the .ttf or .otf file
        default_font = dpg.add_font(file=resources / "Roboto/Roboto-Regular.ttf", size=desired_font_size)
    return default_font
