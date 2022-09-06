import {areThereAnyNewOrMissingHashes, updateLastHashes } from './hash_checks.module.js';
import { applyConfiguration } from './yaml.configurations.module.js';
import {make_select_column, make_select_row, make_select_cell} from './registers.selection.module.js';
export function add_node_id_headers(table_header_row, yukon_state) {
    const current_avatars = yukon_state.current_avatars;
    current_avatars.forEach(function (avatar) {
        let table_header_cell = document.createElement('th');
        table_header_cell.innerHTML = avatar.node_id;
        table_header_cell.title = avatar.name;
        table_header_cell.classList.add("node_id_header");
        table_header_cell.setAttribute("data-node_id", avatar.node_id);
        table_header_row.appendChild(table_header_cell);
        if (yukon_state.settings.showAlotOfButtons) {
            // Add a button to table_header_cell for downloading the table column
            let btnExportConfig = document.createElement('button');
            btnExportConfig.innerHTML = 'Export';
            // Attach an event listener on the button click event
            btnExportConfig.addEventListener('mousedown', function (event) {
                event.stopPropagation();
                yukon_state.addLocalMessage("Exporting registers of " + avatar.node_id);
                //const result = window.chooseFileSystemEntries({ type: "save-file" });
                // Export all but only for this avatar, dried up code
                export_all_selected_registers(avatar.node_id);
            });
            table_header_cell.appendChild(btnExportConfig);
            let btnApplyImportedConfig = document.createElement('button');
            btnApplyImportedConfig.innerHTML = 'Apply imported config';
            btnApplyImportedConfig.addEventListener('mousedown', function (event) {
                event.stopPropagation();
                const current_config = yukon_state.available_configurations[selected_config];
                if (current_config) {
                    applyConfiguration(current_config, parseInt(avatar.node_id));
                } else {
                    console.log("No configuration selected");
                }
            });
            table_header_cell.appendChild(btnApplyImportedConfig);
            let btnSelectColumn = document.createElement('button');
            btnSelectColumn.innerHTML = 'Select column';
            btnSelectColumn.addEventListener('mousedown', make_select_column(avatar.node_id));
            table_header_cell.appendChild(btnSelectColumn);
        }
        table_header_cell.onmousedown = make_select_column(avatar.node_id);
        table_header_cell.onmouseover = make_select_column(avatar.node_id, true);
    });
}
export function make_empty_table_header_row_cell(table_header_row, yukon_state) {
    var empty_table_header_row_cell = document.createElement('th');
    if (yukon_state.settings.showAlotOfButtons) {
        // Add a button into the empty table header row cell
        var button = document.createElement('button');
        button.innerHTML = 'Apply sel. conf to all nodes';
        button.onclick = function () {
            if (yukon_state.selections.selected_config != null && yukon_state.available_configurations[yukon_state.selections.selected_config] != null) {
                applyConfiguration(yukon_state.available_configurations[yukon_state.selections.selected_config]);
            }
        }
        empty_table_header_row_cell.appendChild(button);
        var button = document.createElement('button');
        button.innerHTML = 'Save all of configuration';
        button.onclick = function () {
            export_all_selected_registers(null, true)
        }
        empty_table_header_row_cell.appendChild(button);
    }
    table_header_row.appendChild(empty_table_header_row_cell);
}
export function addContentForRegisterName(register_name, filter_keyword_inclusive, registers_table_body, yukon_state) {
    if (filter_keyword_inclusive != "" && !register_name.includes(filter_keyword_inclusive)) {
        return;
    }
    let table_register_row = document.createElement('tr');
    registers_table_body.appendChild(table_register_row);
    function make_header_cell() {
        let table_header_cell = document.createElement('th');
        // REGISTER NAME HERE
        table_header_cell.innerHTML = register_name;
        // Make table_header_cell have sticky position
        // Add class left-side-table-header
        table_header_cell.classList.add('left-side-table-header');
        table_header_cell.onmousedown = make_select_row(register_name);
        table_header_cell.onmouseover = make_select_row(register_name, true);
        if (yukon_state.settings.showAlotOfButtons) {
            let btnSelectRow = document.createElement('button');
            btnSelectRow.innerHTML = 'Select row';
            // Attach an event listener on the button click event
            btnSelectRow.onmousedown = make_select_row(register_name);
            table_header_cell.appendChild(btnSelectRow);
        }

        table_register_row.appendChild(table_header_cell);
    }
    make_header_cell();

    addContentForCells(register_name, table_register_row, yukon_state);
    // Add table cells for each avatar, containing the value of the register from register_name

    if (yukon_state.current_avatars.length >= yukon_state.settings.showDoubleRowHeadersFromCount) {
        make_header_cell();
    }
}
export function addContentForCells(register_name, table_register_row, yukon_state) {
    yukon_state.current_avatars.forEach(function (avatar) {
        // ALL THE REGISTER VALUES HERE
        const table_cell = document.createElement('td');
        table_register_row.appendChild(table_cell);
        // Add a table_cell class to table_cell
        table_cell.classList.add('no-padding');
        // Set an attribute on td to store the register name
        table_cell.setAttribute('id', "cell_" + avatar.node_id + "_" + register_name);
        table_cell.setAttribute("register_name", register_name);
        table_cell.setAttribute("node_id", avatar.node_id);
        table_cell.title = "Register name: " + register_name;
        let register_value = avatar.registers_exploded_values[register_name];
        // Here we check if the register value is a byte string and then we convert it to hex
        let inputFieldReference = null;
        if (register_value == null) {
            table_cell.setAttribute("no_value", "true");
            table_cell.classList.add("no-value");
            // table_cell.style.backgroundColor = colors["no_value"];
            table_cell.title = "This register doesn't exist for this node";
            return;
        }
        let type_string = Object.keys(register_value)[0];
        let value = Object.values(register_value)[0].value;
        let isOnlyValueInArray = false;
        // If value is an array
        if (Array.isArray(value)) {
            // If the length of the array value is 1 then display the value without brackets
            let text_input = document.createElement('div');
            inputFieldReference = text_input;
            if (value.length == 1) {
                isOnlyValueInArray = true;
                inputFieldReference.innerHTML = value[0];
            } else {
                inputFieldReference.innerHTML = JSON.stringify(value);
            }
            // When the text input is clicked
        } else if (type_string.includes("natural")) {
            // Create a number input field
            let number_input_field = document.createElement('div');
            inputFieldReference = number_input_field;
            if (register_value == 65535) {
                number_input_field.style.backgroundColor = '#ee0e0e';
            }
            inputFieldReference.innerHTML = value;
        } else if (type_string === "string") {
            let text_input = document.createElement('div');
            inputFieldReference = text_input;
            inputFieldReference.innerHTML = value;
            // When the text input is clicked
        } else {
            let text_input = document.createElement('div');
            inputFieldReference = text_input;
            inputFieldReference.disabled = 'true';
            inputFieldReference.style.backgroundColor = '#ee0e0e !important';
            inputFieldReference.innerHTML = "Unhandled: " + value;
        }
        table_cell.appendChild(inputFieldReference);
        function styleLabel(label) {
            label.style.height = '0px';
            label.style.position = 'absolute';
            label.style.bottom = '13px';
            label.style.fontSize = '10px';
            // label.style.color = '#000000';
            label.style.backgroundColor = 'transparent !important';
            label.style.padding = '0px';
            label.style.margin = '1px';
            label.style.border = '0px';
            label.style.borderRadius = '0px';
            label.style.display = 'inline';
            label.style.width = 'calc(100% - 4px)';
            label.style.fontFamily = 'monospace';
            label.style.whiteSpace = 'nowrap';
            label.style["pointer-events"] = 'none';
            // label.style.zIndex = '-1';
            // label.onmouseover = function(event) {
            //     event.stopPropagation();
            // }
        }
        // Create a new 10% height label in inputFieldReference and place it in the bottom right corner of the input field
        {
            // For displaying the value
            const label = document.createElement('label');
            styleLabel(label);
            label.style.textAlign = 'right';
            label.style.fontFamily = 'monospace';
            label.style.zIndex = '1';
            table_cell.style.position = 'relative';
            label.style.right = '2px';
            label.style.left = '2px';
            let dimensionality = "";
            if (Array.isArray(value)) {
                dimensionality = "[" + value.length + "]";
            }
            label.innerHTML = type_string + dimensionality;
            table_cell.insertBefore(label, inputFieldReference);
        }
        {
            // For displaying the mutability and persistence
            const explodedRegister = avatar.registers_exploded_values[register_name];
            const isMutable = explodedRegister["_meta_"].mutable;
            const isPersistent = explodedRegister["_meta_"].persistent;
            const label = document.createElement('label');
            styleLabel(label);
            label.style.textAlign = 'left';
            label.style.verticalAlign = 'bottom';
            label.style.right = '2px';
            label.style.left = '2px';
            label.style.zIndex = '1';
            table_cell.style.position = 'relative'; ``
            label.innerHTML = "";
            if (isMutable) {
                label.innerHTML += "M";
                table_cell.setAttribute("mutable", "true");
            }
            if (isPersistent) {
                label.innerHTML += "P";
                table_cell.setAttribute("persistent", "true");
            }
            table_cell.insertBefore(label, inputFieldReference);
        }
        // Set the height of inputFieldReference to match the height of the table cell
        inputFieldReference.setAttribute("spellcheck", "false");
        inputFieldReference.setAttribute("register_name", register_name);
        inputFieldReference.setAttribute("node_id", avatar.node_id);
        inputFieldReference.classList.add('input');
        inputFieldReference.style["pointer-events"] = 'none'; // This is to make sure that the table_cell can receive events
        table_cell.classList.add('table-cell');
        table_cell.onmouseover = make_select_cell(avatar, register_name, true, yukon_state);
        // inputFieldReference.onmousedown = make_select_cell(avatar, register_name);
        var lastClick = null;
        table_cell.addEventListener('mousedown', function (event) {
            // Check if the mouse button was left click
            if (event.button !== 0) {
                return;
            }
            if (lastClick && new Date() - lastClick < 500 && table_cell.getAttribute("mutable") == "true"
                && shouldDoubleClickPromptToSetValue) {
                // Make a dialog box to enter the new value
                var new_value = prompt("Enter new value for " + register_name + ":", value);
                // If the user entered a value
                if (new_value != null) {
                    // Update the value in the table
                    // text_input.value = new_value;
                    // Update the value in the server
                    update_register_value(register_name, new_value, avatar.node_id);
                    // Run update_tables every second, do that only for the next 4 seconds
                    let interval1 = setInterval(() => update_tables(true), 1000);
                    setTimeout(() => clearInterval(interval1), 4000);
                } else {
                    yukon_state.addLocalMessage("No value entered");
                }
            } else if (lastClick && new Date() - lastClick < 500 && table_cell.getAttribute("mutable") == "true" &&
                shouldDoubleClickOpenModal
            ) {
                showCellValue(avatar.node_id, register_name);
            } else {
                make_select_cell(avatar, register_name, null, yukon_state)(event)
            }
            lastClick = new Date();
        });
        // Create a text input element in the table cell
    });
}
export function create_registers_table(_filter_keyword_inclusive, yukon_state) {
    // Clear the table
    const filter_keyword_inclusive = _filter_keyword_inclusive || iRegistersFilter.value;
    var registers_table = document.querySelector('#registers_table')
    registers_table.innerHTML = '';
    var registers_table_body = document.createElement('tbody');
    registers_table.appendChild(registers_table_body);
    var registers_table_header = document.createElement('thead');
    registers_table.appendChild(registers_table_header);
    // Add the table headers
    var table_header_row = document.createElement('tr');

    make_empty_table_header_row_cell(table_header_row, yukon_state);

    add_node_id_headers(table_header_row, yukon_state);
    if (yukon_state.current_avatars.length >= yukon_state.settings.showDoubleRowHeadersFromCount) {
        make_empty_table_header_row_cell()
    }
    registers_table_header.appendChild(table_header_row);
    // Combine all register names from avatar.registers into an array
    var register_names = [];
    yukon_state.current_avatars.forEach(function (avatar) {
        avatar.registers.forEach(function (register) {
            if (register != "" && !register_names.includes(register)) {
                register_names.push(register);
            }
        });
    });
    register_names.sort();

    register_names.forEach(function (register_name) {
        addContentForRegisterName(register_name, filter_keyword_inclusive, registers_table_body, yukon_state);
    });

    updateRegistersTableColors(yukon_state);
}
export function update_tables(override) {
    if (override || areThereAnyNewOrMissingHashes("hash", yukon_state)) {
        create_registers_table(null, yukon_state);
    }
    updateLastHashes("hash", yukon_state);
}

export function updateRegistersTableColors(yukon_state) {
    var registers_table = document.querySelector('#registers_table')
    // For all table cells in registers_table, if the cell has the attribute node_id set to node_id then color it red if the node is selected or white if not
    let needsRefresh = false;
    for (var i = 1; i < registers_table.rows.length; i++) {
        for (var j = 1; j < registers_table.rows[i].cells.length; j++) {
            const table_cell = registers_table.rows[i].cells[j]
            let register_name = table_cell.getAttribute("id")
            if (register_name == null) {
                continue; // Must be the header cell at the end
            }
            // Remove the string "register_" from the register_name
            register_name = register_name.substring(9);
            const node_id = table_cell.getAttribute("node_id");
            const is_register_selected = yukon_state.selections.selected_registers[[node_id, register_name]];
            const is_column_selected = yukon_state.selections.selected_columns[node_id];
            const is_row_selected = yukon_state.selections.selected_rows[register_name];
            const temp_node = yukon_state.recently_reread_registers[node_id];
            const is_recently_reread = temp_node && temp_node[register_name] === true;
            if (!table_cell) {
                continue;
            }
            if (!register_name) {
                console.warn("No register name found in table cell " + i + "," + j)
                continue;
            }
            if (is_register_selected || is_column_selected || is_row_selected) {
                table_cell.classList.add("selected-cell");
            } else {
                // Remove the class "selected_element" from the input element if it has it
                table_cell.classList.remove("selected-cell");
            }
            if (is_register_selected) {
                table_cell.classList.add("selected-cell");
                if (is_recently_reread) {
                    table_cell.classList.add("recently_reread_register");
                    needsRefresh = true;
                }
            } else if (is_row_selected) {
                table_cell.style.backgroundColor = colors["selected_row"];
                if (is_column_selected) {
                    table_cell.classList.add("selected_row_and_column");
                }
            } else if (is_column_selected) {
                table_cell.classList.add("selected_column");
            } else {
                table_cell.classList.remove("selected-cell");
            }
            if (is_recently_reread) {
                table_cell.classList.add("recently_reread_register");
                needsRefresh = true;
            } else {
                table_cell.classList.remove("recently_reread_register");
            }
        }
    }
    if (needsRefresh) {
        if (yukon_state.updateRegistersTableColorsAgainTimer != null) {
            clearTimeout(yukon_state.updateRegistersTableColorsAgainTimer);
        }
        yukon_state.updateRegistersTableColorsAgainTimer = setTimeout(yukon_state.updateRegistersTableColors, 1000);
    }
}