# Get the path to the root directory of the repository by taking the folder of current file and going two directories up
from pathlib import Path
import subprocess
from subprocess import Popen
import os
import sys

root = Path(__file__).parent.parent.parent

# Add .compiled and yukon to PYTHONPATH
sys.path.append(str((root / ".compiled").absolute()))
sys.path.append(str((root / "yukon").absolute()))
sys.path.append(str(root.absolute()))

# If the system is Windows then path separator is ;, otherwise it is :
path_separator = ";" if os.name == "nt" else ":"

os.environ["PYTHONPATH"] = (
    str(root / ".compiled") + path_separator + str(root / "yukon") + path_separator + str(root.absolute())
)
os.environ["IS_BROWSER_BASED"] = "1"
os.environ["IS_SANITY_TEST"] = "1"

run_demos_path = root / "demos" / "run_demos.py"
print(run_demos_path.absolute())
# Run the python script at run_demos_path in the background
python_exe = ""
if os.name == "nt":
    python_exe = "venv\\Scripts\\python.exe"
else:
    python_exe = "./venv/bin/python"
p = Popen(f"{python_exe} {str(run_demos_path.absolute())}", shell=True, env=os.environ)

# Run the yukon __main__.py script and save its exit code
arguments = [python_exe, str(root / "yukon" / "__main__.py")]
exit_code = subprocess.run(arguments, env=os.environ).returncode  # pylint: disable=subprocess-run-check
p.close()
if exit_code != 0:
    print("Yukon sanity test failed")
    sys.exit(exit_code)
else:
    print("Yukon sanity test passed")
    sys.exit(0)
