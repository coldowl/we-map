use crate::scoring::{evaluate_guess, GuessResult};

#[tauri::command]
pub fn calculate_distance(
    guess_lat: f64,
    guess_lon: f64,
    actual_lat: f64,
    actual_lon: f64,
) -> GuessResult {
    evaluate_guess(guess_lat, guess_lon, actual_lat, actual_lon)
}

#[tauri::command]
pub fn get_mapillary_token() -> String {
    // TODO: Read from persistent settings store
    std::env::var("MAPILLARY_TOKEN").unwrap_or_default()
}
