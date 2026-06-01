mod scoring;
mod commands;

use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_store::Builder::default().build())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // 系统托盘
      let show_hide = MenuItem::with_id(app, "show_hide", "显示/隐藏窗口", true, None::<&str>)?;
      let pin = MenuItem::with_id(app, "pin", "钉住窗口", true, None::<&str>)?;
      let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[
        &show_hide,
        &pin,
        &PredefinedMenuItem::separator(app)?,
        &quit,
      ])?;

      let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("We-Map")
        .menu(&menu)
        .on_menu_event(move |app, event| {
          match event.id.as_ref() {
            "show_hide" => {
              if let Some(window) = app.get_webview_window("main") {
                if window.is_visible().unwrap_or(false) {
                  let _ = window.hide();
                } else {
                  let _ = window.show();
                  let _ = window.set_focus();
                }
              }
            }
            "pin" => {
              if let Some(window) = app.get_webview_window("main") {
                let is_pinned = window.is_always_on_top().unwrap_or(false);
                let _ = window.set_always_on_top(!is_pinned);
              }
            }
            "quit" => {
              app.exit(0);
            }
            _ => {}
          }
        })
        .on_tray_icon_event(|tray, event| {
          if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
          } = event {
            if let Some(window) = tray.app_handle().get_webview_window("main") {
              if window.is_visible().unwrap_or(false) {
                let _ = window.hide();
              } else {
                let _ = window.show();
                let _ = window.set_focus();
              }
            }
          }
        })
        .build(app)?;

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::calculate_distance,
      commands::get_mapillary_token,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
