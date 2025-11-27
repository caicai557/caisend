use anyhow::Result;
use serde::{Deserialize, Serialize};

pub fn serialize_msgpack<T: Serialize>(value: &T) -> Result<Vec<u8>> {
    rmp_serde::to_vec(value).map_err(|e| anyhow::anyhow!("Serialization failed: {}", e))
}

pub fn deserialize_msgpack<'a, T: Deserialize<'a>>(bytes: &'a [u8]) -> Result<T> {
    rmp_serde::from_slice(bytes).map_err(|e| anyhow::anyhow!("Deserialization failed: {}", e))
}
