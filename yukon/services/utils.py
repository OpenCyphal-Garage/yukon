import dataclasses
import importlib
import inspect
import os
import random
import sys
import typing
from pathlib import Path
from queue import Queue, Empty
import logging
from typing import TypeVar

import pycyphal

import yukon

logger = logging.getLogger(__name__)


def quit_application(state: "yukon.domain.god_state.GodState") -> None:
    state.gui.gui_running = False
    state.dronecan_traffic_queues.input_queue.put_nowait(None)
    state.dronecan_traffic_queues.output_queue.put_nowait(None)
    state.queues.god_queue.put_nowait(None)


def add_path_to_cyphal_path(path: str) -> None:
    normalized_path = Path(path).resolve()
    if not normalized_path:
        return
    cyphal_path = os.environ.get("CYPHAL_PATH", None)
    if cyphal_path:
        normalized_cyphal_paths = [str(Path(path).resolve()) for path in cyphal_path]
        if str(normalized_path) not in normalized_cyphal_paths:
            os.environ["CYPHAL_PATH"] = f"{cyphal_path}{os.pathsep}{str(normalized_path)}"


def add_path_to_sys_path(path: str) -> None:
    normalized_sys_paths = [str(Path(path).resolve()) for path in sys.path]
    normalized_path = Path(path).resolve()
    if str(normalized_path) not in normalized_sys_paths:
        process_dsdl_path(Path(normalized_path))
        sys.path.append(str(normalized_path))
        logger.debug("Added %r to sys.path", normalized_path)


@dataclasses.dataclass
class Datatype:
    is_fixed_id: bool
    name: str
    class_reference: typing.Any

    def __hash__(self) -> int:
        return hash(self.name)


def get_all_datatypes(path: Path) -> typing.List[Datatype]:
    """The path is to a folder like .compiled which contains dsdl packages"""
    all_init_files = list(path.glob("**/__init__.py"))
    # List the parent directories of every __init__.py file
    init_file_packages = [init_file.parent for init_file in all_init_files]
    # Going to check contents of each file and see if it has any line which does not begin with a #
    # If it it does then we just ignore it
    init_files_with_aliases = []
    for init_file in all_init_files:
        has_aliases = False
        with open(init_file, "r") as file:
            for line in file:
                # If the line starts with # or is empty
                if line.startswith("#") or line.strip() == "":
                    continue
                else:
                    has_aliases = True
                    init_files_with_aliases.append(init_file)
                    break

    all_classes = []
    for init_file in init_files_with_aliases:
        all_classes.extend(scan_package_look_for_classes(path, init_file.relative_to(path).parent))

    all_classes = list(set(all_classes))
    # relative_paths_to_packages = [package.relative_to(path) for package in init_file_packages]
    # package_contents = [a for package in init_file_packages for a in list(package.glob("**/*.py"))]
    # # Relative paths to every py file in every package
    # # Remove __init__.py files
    # relative_package_contents = [py_file for py_file in package_contents if py_file.name != "__init__.py"]
    # # Remove the .py extension
    # relative_package_contents = [py_file.with_suffix("").relative_to(path) for py_file in relative_package_contents]
    # all_classes = []
    # # Convert to a list of strings
    # relative_package_contents = [
    #     {
    #         "file_full_path": str(py_file.absolute()),
    #         "full_relative_name": str(py_file).replace("\\", "."),
    #         "just_name": py_file.name,
    #     }
    #     for py_file in relative_package_contents
    # ]
    # for content in relative_package_contents:
    #     all_classes.extend(scan_package_look_for_classes(content["file_full_path"]))
    # # Deduplicate datatypes
    # return_object["variable_id_messages"] = list(set(return_object["variable_id_messages"]))

    return all_classes


def scan_package_look_for_classes(package_root, package_path):
    if isinstance(package_path, str):
        package_path = Path(package_path)
    if isinstance(package_root, str):
        package_root = Path(package_root)
    classes = []
    add_path_to_sys_path(str(package_root))
    proper_module_path = str(package_path).replace("\\", ".")
    try:
        package = importlib.import_module(proper_module_path)
    except:
        return []
    # pycyphal.util.import_submodules(package)
    # sys.path.remove(str(package_folder.absolute()))

    queue: Queue = Queue()
    queue.put((package, None))  # No previous class
    counter = 0
    try:
        while True:
            counter += 1
            module_or_class, previous_module_or_class = queue.get_nowait()
            # Get all modules and classes that are seen in the imported module
            elements = inspect.getmembers(module_or_class, lambda x: inspect.ismodule(x) or inspect.isclass(x))
            for element in elements:
                if element[1].__name__ == "object" or element[1].__name__ == "type":
                    continue
                queue.put((element[1], module_or_class))  # Previous class was module_or_class
            if inspect.isclass(module_or_class):
                _class = module_or_class
                if not hasattr(module_or_class, "_deserialize_") and not hasattr(module_or_class, "_serialize_"):
                    continue
                try:
                    model = pycyphal.dsdl.get_model(_class)
                except Exception:
                    logger.exception("Failed to get model for %s", _class)
                    continue
                if hasattr(_class, "_FIXED_PORT_ID_") or hasattr(_class, "_serialize_"):
                    classes.append(Datatype(hasattr(_class, "_FIXED_PORT_ID_"), model.full_name, _class))
                # if :
                #     desired_class_name = _class.__name__
                #     return_object["fixed_id_messages"][str(_class._FIXED_PORT_ID_)] = {
                #         "short_name": desired_class_name,
                #         "full_name": model.full_name,
                #     }
                # elif hasattr(_class, "_serialize_"):
                #     return_object["variable_id_messages"].append(model.full_name)
    except Empty:
        pass
    return classes


def get_datatype_return_dto(all_classes: typing.List[Datatype]):
    return_object: typing.Any = {
        "fixed_id_messages": {},
        "variable_id_messages": [],
    }
    for datatype in all_classes:
        if datatype.is_fixed_id:
            return_object["fixed_id_messages"][str(datatype.class_reference._FIXED_PORT_ID_)] = {
                "short_name": datatype.class_reference.__name__,
                "full_name": datatype.name,
            }
        else:
            return_object["variable_id_messages"].append(datatype.name)
    return return_object


def get_datatypes_from_packages_directory_path(path: Path) -> typing.Any:
    """The path is to a folder like .compiled which contains dsdl packages"""
    return_object: typing.Any = {
        "fixed_id_messages": {},
        "variable_id_messages": [],
    }
    # init_files = list(path.glob("**/__init__.py"))
    # # List the parent directories of every __init__.py file
    # init_file_packages = [init_file.parent for init_file in init_files]
    # relative_paths_to_packages = [package.relative_to(path) for package in init_file_packages]
    # package_contents = [a for package in init_file_packages for a in list(package.glob("**/*.py"))]
    # # Relative paths to every py file in every package
    # # Remove __init__.py files
    # relative_package_contents = [py_file for py_file in package_contents if py_file.name != "__init__.py"]
    # # Remove the .py extension
    # relative_package_contents = [py_file.with_suffix("").relative_to(path) for py_file in relative_package_contents]
    # # Convert to a list of strings
    # relative_package_contents = [str(py_file).replace("\\", ".") for py_file in relative_package_contents]

    for package_folder_str in list(next(os.walk(path))[1]):
        package_folder = (path / package_folder_str).absolute()
        add_path_to_sys_path(str(package_folder.absolute()))
        package = importlib.import_module(package_folder.name)
        # pycyphal.util.import_submodules(package)
        # sys.path.remove(str(package_folder.absolute()))

        queue: Queue = Queue()
        queue.put((package, None))  # No previous class
        counter = 0
        try:
            while True:
                counter += 1
                module_or_class, previous_module_or_class = queue.get_nowait()
                elements = inspect.getmembers(module_or_class, lambda x: inspect.ismodule(x) or inspect.isclass(x))
                for element in elements:
                    if element[1].__name__ == "object" or element[1].__name__ == "type":
                        continue
                    queue.put((element[1], module_or_class))  # Previous class was module_or_class
                if inspect.isclass(module_or_class):
                    _class = module_or_class
                    if not hasattr(module_or_class, "_deserialize_") and not hasattr(module_or_class, "_serialize_"):
                        continue
                    try:
                        model = pycyphal.dsdl.get_model(_class)
                    except Exception:
                        logger.exception("Failed to get model for %s", _class)
                        continue
                    if hasattr(_class, "_FIXED_PORT_ID_"):
                        desired_class_name = _class.__name__
                        return_object["fixed_id_messages"][str(_class._FIXED_PORT_ID_)] = {
                            "short_name": desired_class_name,
                            "full_name": model.full_name,
                        }
                    elif hasattr(_class, "_serialize_"):
                        return_object["variable_id_messages"].append(model.full_name)
        except Empty:
            pass
    # Deduplicate datatypes
    return_object["variable_id_messages"] = list(set(return_object["variable_id_messages"]))
    return return_object


def process_dsdl_path(path: Path) -> None:
    pass
    # for package_folder_str in list(next(os.walk(path))[1]):
    #     package_folder = (path / package_folder_str).absolute()
    #     sys.path.append(str(package_folder.absolute()))
    #     try:
    #         package = importlib.import_module(package_folder.name)
    #         pycyphal.util.import_submodules(package)
    #     except Exception:
    #         logger.warning("Failed to import %s", package_folder.name)
    #     finally:
    #         sys.path.remove(str(package_folder.absolute()))


# These are for calculating the tolerance for the MonotonicClusteringSynchronizer
T = TypeVar("T")


def tolerance_from_key_delta(old: T, new: T) -> T:
    return (new - old) * 0.5  # type: ignore


def clamp(lo_hi: tuple[T, T], val: T) -> T:
    lo, hi = lo_hi
    return min(max(lo, val), hi)  # type: ignore
