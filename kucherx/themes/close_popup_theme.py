def get_close_popup_theme(dpg):
    with dpg.theme() as close_popup_theme:
        with dpg.theme_component(dpg.mvAll):
            dpg.add_theme_style(dpg.mvStyleVar_FrameRounding, 5, category=dpg.mvThemeCat_Core)
    return close_popup_theme
