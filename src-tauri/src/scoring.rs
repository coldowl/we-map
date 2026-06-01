use serde::Serialize;

const EARTH_RADIUS_KM: f64 = 6371.0;
const MAX_SCORE: u32 = 5000;
const DECAY_FACTOR: f64 = 2000.0;

#[derive(Debug, Clone, Serialize)]
pub struct GuessResult {
    pub distance_km: f64,
    pub score: u32,
}

/// Calculate the Haversine distance between two points in kilometers.
pub fn haversine_distance(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let to_radians = |deg: f64| deg * std::f64::consts::PI / 180.0;

    let dlat = to_radians(lat2 - lat1);
    let dlon = to_radians(lon2 - lon1);

    let a = (dlat / 2.0).sin().powi(2)
        + to_radians(lat1).cos() * to_radians(lat2).cos() * (dlon / 2.0).sin().powi(2);

    let c = 2.0 * a.sqrt().asin();

    EARTH_RADIUS_KM * c
}

/// Calculate score from distance using exponential decay.
/// Maximum score is 5000 at 0 km, decaying to 0 at large distances.
pub fn calculate_score(distance_km: f64) -> u32 {
    if distance_km <= 0.0 {
        return MAX_SCORE;
    }
    let score = (MAX_SCORE as f64) * (-distance_km / DECAY_FACTOR).exp();
    score.round() as u32
}

/// Evaluate a guess against the actual coordinates.
pub fn evaluate_guess(
    guess_lat: f64,
    guess_lon: f64,
    actual_lat: f64,
    actual_lon: f64,
) -> GuessResult {
    let distance = haversine_distance(guess_lat, guess_lon, actual_lat, actual_lon);
    let score = calculate_score(distance);
    GuessResult {
        distance_km: (distance * 100.0).round() / 100.0,
        score,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_same_point() {
        let result = haversine_distance(48.8566, 2.3522, 48.8566, 2.3522);
        assert!((result - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_known_distance() {
        // Paris to London: ~343 km
        let result = haversine_distance(48.8566, 2.3522, 51.5074, -0.1278);
        assert!((result - 343.0).abs() < 5.0);
    }

    #[test]
    fn test_score_at_zero() {
        assert_eq!(calculate_score(0.0), 5000);
    }

    #[test]
    fn test_score_decay() {
        let score = calculate_score(100.0);
        assert!(score > 4000 && score < 5000);
    }

    #[test]
    fn test_evaluate_guess() {
        let result = evaluate_guess(48.8566, 2.3522, 48.8566, 2.3522);
        assert_eq!(result.score, 5000);
        assert!(result.distance_km < 0.1);
    }
}
