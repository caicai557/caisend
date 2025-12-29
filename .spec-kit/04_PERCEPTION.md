# Hybrid Perception Engine

## 1. Multi-Modal Sensing

The system must not rely on a single source of truth.

* **L1 (Fiber)**: Direct memory read of React Fiber tree (Teact).
* **L2 (DOM)**: MutationObserver on specific nodes (Fallback).
* **L3 (Vision)**: Local OCR (Emergency Fallback).

## 2. The Console Bridge V2

* **Mechanism**: Rust injects JS that overrides `console.debug`.
* **Transport**: Data is serialized to **MessagePack** (binary) in JS, then hex-encoded or sent as byte array to Rust.
* **Why**: 10x faster than JSON; supports binary data types naturally.
