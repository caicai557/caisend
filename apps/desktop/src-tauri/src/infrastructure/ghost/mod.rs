pub mod biomechanics;
pub mod circadian;

pub trait GhostProtocol {
    fn should_act(&self) -> bool;
    fn get_delay(&self) -> std::time::Duration;
}
